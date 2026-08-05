#Requires -Version 5.1
<#
    Coldbox browser-runner template.

    Contract, rationale, and the verification-independence rule:
      docs/05-development/browser-runner-flow.md

    An agent copies this file, fills in EXPECTED STATE and STEPS, and hands it
    to the human with a launch command. Everything else stays as written.

    Guarantees:
      - Aborts before touching anything if the tree is not exactly as expected
      - Either fully applies, or fully reverts to the pre-run commit
      - Never absorbs uncommitted work it did not create
      - Never deletes .git/index.lock
      - Emits a bundle whether it succeeds or fails
      - Fails closed if anything secret-shaped would enter the bundle
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)] [ValidateNotNullOrEmpty()] [string] $RepoPath,
    [Parameter(Mandatory=$true)] [ValidateNotNullOrEmpty()] [string] $RunnerId,
    [Parameter(Mandatory=$true)] [ValidateNotNullOrEmpty()] [string] $ExpectedBranch,
    [Parameter(Mandatory=$true)] [ValidatePattern('^[0-9a-fA-F]{40}$')] [string] $ExpectedHead,
    [switch] $Discovery,                              # include repo/ archive
    # $HOME is not always the Windows profile - it can be inherited from a host
    # process, which sends bundles somewhere surprising. Prefer USERPROFILE.
    [string] $OutDir         = (Join-Path ($(if ($env:USERPROFILE) { $env:USERPROFILE } else { $HOME })) 'Downloads')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------- scaffolding

$script:Transcript = New-Object System.Text.StringBuilder
$script:Verdict    = 'UNKNOWN'
$script:RolledBack = $false
$script:PreTag     = "runner/$RunnerId/pre"
$script:Stage      = Join-Path ([System.IO.Path]::GetTempPath()) "coldbox-runner-$RunnerId"

# Initialised here so StrictMode does not fault in New-Bundle when preflight
# aborts before these are discovered.
$script:BeforeBranch = 'unknown'
$script:BeforeHead   = 'unknown'
$script:PreUntracked = @()
$script:NodeVersion  = 'unknown'
$script:NodePin      = $null
$script:NodePinSource = $null
$script:Steps        = @()
$script:NetCreated   = $false

function Write-Log {
    param([string] $Text, [string] $Level = 'INFO')
    $line = '[{0}] {1,-5} {2}' -f (Get-Date).ToUniversalTime().ToString('HH:mm:ss'), $Level, $Text
    Write-Host $line
    [void] $script:Transcript.AppendLine($line)
}

# Runs an external command, captures output + exit code, throws on failure.
# Never uses $? after a pipeline - see AGENTS.md 6a.
function Invoke-Step {
    param(
        [Parameter(Mandatory)] [string]   $Exe,
        [Parameter(Mandatory)] [string[]] $Arguments,
        [switch] $AllowFailure
    )
    $display = "$Exe $($Arguments -join ' ')"
    Write-Log "`$ $display"

    # Windows PowerShell 5.1 can turn native stderr redirected with 2>&1 into a
    # terminating NativeCommandError when the script-wide preference is Stop.
    # Temporarily use Continue for the native invocation, then restore Stop and
    # decide success solely from the captured native exit code.
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & $Exe @Arguments 2>&1 | Out-String
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($output.Trim()) { [void] $script:Transcript.AppendLine($output.TrimEnd()) }
    [void] $script:Transcript.AppendLine("-- exit $code")
    $script:Steps += [pscustomobject]@{ command = $display; exitCode = $code }
    Write-Log "exit $code" $(if ($code -eq 0) { 'INFO' } else { 'ERROR' })
    if ($code -ne 0 -and -not $AllowFailure) {
        throw "Command failed with exit ${code}: $display"
    }
    [pscustomobject]@{ Output = $output; ExitCode = $code }
}

function Get-GitOut {
    param([Parameter(Mandatory)][string[]] $Arguments)
    $out = & git @Arguments 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed: $out" }
    $out.Trim()
}

# Same, but never throws - for building the report after a failure, where a
# throw would lose the bundle. 'try' is a statement in PowerShell and cannot be
# parenthesised into an expression, so this exists to be callable inline.
function Get-GitOrNa {
    param([Parameter(Mandatory)][string[]] $Arguments)
    try { Get-GitOut -Arguments $Arguments } catch { 'n/a' }
}

# Splits git output into a clean array of lines. Kept as a function because
# `Get-GitOut @(...) -split "..."` binds -split as a PARAMETER rather than
# applying the operator - PowerShell 5.1 parses it that way and fails.
function Get-GitLines {
    param([Parameter(Mandatory)][string[]] $Arguments)
    $raw = Get-GitOut -Arguments $Arguments
    if (-not $raw) { return @() }
    @($raw -split "`r?`n" | Where-Object { $_.Trim() })
}

# ------------------------------------------------------------------ preflight

function Invoke-Preflight {
    Write-Log '=== PREFLIGHT (read-only) ==='

    if (-not (Test-Path -LiteralPath $RepoPath)) { throw "Repo path not found: $RepoPath" }
    Set-Location -LiteralPath $RepoPath

    if ((Get-GitOut @('rev-parse','--is-inside-work-tree')) -ne 'true') {
        throw "Not a git work tree: $RepoPath"
    }

    # Never delete this - another process may be mid-write (AGENTS.md 6a).
    $lock = Join-Path $RepoPath '.git\index.lock'
    if (Test-Path -LiteralPath $lock) {
        throw "index.lock present. Another git process may be running. Aborting without touching anything. Do not delete it manually."
    }

    $status = Get-GitOut @('status','--porcelain')
    if ($status) {
        throw "Working tree is not clean. Uncommitted changes belong to you or a previous run and will not be absorbed. Commit, stash, or discard them yourself, then re-run.`n$status"
    }

    $branch = Get-GitOut @('rev-parse','--abbrev-ref','HEAD')
    if ($branch -ne $ExpectedBranch) {
        throw "Branch drift. Expected '$ExpectedBranch', found '$branch'. The agent's assumed state is stale - report this rather than forcing it."
    }

    $head = Get-GitOut @('rev-parse','HEAD')
    if ($head -ne $ExpectedHead.ToLowerInvariant()) {
        throw "HEAD drift. Expected '$ExpectedHead', found '$head'. The agent's assumed state is stale - report this rather than forcing it."
    }

    $script:BeforeBranch = $branch
    $script:BeforeHead   = $head
    $script:PreUntracked = Get-GitLines @('ls-files','--others','--exclude-standard')

    try   { $script:NodeVersion = (& node --version 2>&1 | Out-String).Trim() }
    catch { $script:NodeVersion = 'not found' }
    if (-not $script:NodeVersion) { $script:NodeVersion = 'not found' }

    if (Test-Path .nvmrc) {
        $script:NodePin = (Get-Content .nvmrc -Raw).Trim().TrimStart('v')
        $script:NodePinSource = '.nvmrc'
    } elseif (Test-Path package.json) {
        try {
            $package = Get-Content package.json -Raw | ConvertFrom-Json
            if ($package.engines -and $package.engines.node) {
                $script:NodePin = [string] $package.engines.node
                $script:NodePinSource = 'package.json engines.node'
            }
        } catch {
            Write-Log "Could not read package.json Node engine: $($_.Exception.Message)" 'WARN'
        }
    }

    if ($script:NodePin) {
        $actualNode = $script:NodeVersion.TrimStart('v')
        if ($actualNode -ne $script:NodePin) {
            Write-Log "Node $($script:NodeVersion) does not match pinned $($script:NodePin) from $($script:NodePinSource). Build evidence is weaker; recorded in manifest." 'WARN'
        }
    }

    Write-Log "branch=$branch head=$head node=$($script:NodeVersion)"
    Write-Log 'Preflight OK.'
}

# -------------------------------------------------------------- safety + undo

function New-SafetyNet {
    Write-Log "=== SAFETY NET: tagging $script:PreTag ==="
    & git show-ref --verify --quiet "refs/tags/$script:PreTag"
    if ($LASTEXITCODE -eq 0) {
        throw "Safety tag already exists: $script:PreTag. Choose a new RunnerId; existing recovery refs are never overwritten."
    }
    & git tag $script:PreTag HEAD 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the pre-run tag. Refusing to mutate without a recovery point.' }
    $script:NetCreated = $true
    Write-Log "Recoverable at any time with: git reset --hard $script:PreTag"
}

function Invoke-Rollback {
    Write-Log '=== ROLLBACK ===' 'WARN'
    try {
        & git reset --hard $script:PreTag 2>&1 | Out-String | ForEach-Object { Write-Log $_.TrimEnd() }
        if ($LASTEXITCODE -ne 0) { throw 'git reset failed' }

        # Remove ONLY untracked files this runner introduced.
        $nowUntracked = Get-GitLines @('ls-files','--others','--exclude-standard')
        foreach ($f in $nowUntracked) {
            if ($script:PreUntracked -notcontains $f) {
                Write-Log "removing runner-created untracked file: $f"
                Remove-Item -LiteralPath $f -Force -Recurse -ErrorAction SilentlyContinue
            }
        }

        & git checkout $script:BeforeBranch 2>&1 | Out-Null
        $script:RolledBack = $true
        Write-Log "Rolled back to $script:BeforeHead on $script:BeforeBranch. Tree is clean." 'WARN'
    }
    catch {
        Write-Log "ROLLBACK FAILED: $($_.Exception.Message)" 'ERROR'
        Write-Log "Tree may be inconsistent. Recover manually with: git reset --hard $script:PreTag" 'ERROR'
        Write-Log 'Do not run another runner until this is resolved.' 'ERROR'
    }
}

# ----------------------------------------------------------------- secret scan
function Import-SecretScanner {
    $scanner = Join-Path $RepoPath 'scripts\runner\secret-scan.ps1'
    if (-not (Test-Path -LiteralPath $scanner -PathType Leaf)) {
        throw 'Secret scanner helper is missing; refusing to build an unscanned bundle.'
    }
    . $scanner
}
# --------------------------------------------------------------------- bundle

function New-Bundle {
    if (Test-Path -LiteralPath $script:Stage) { Remove-Item -LiteralPath $script:Stage -Recurse -Force }
    New-Item -ItemType Directory -Path $script:Stage -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $script:Stage 'evidence') -Force | Out-Null

    $afterBranch = Get-GitOrNa @('rev-parse','--abbrev-ref','HEAD')
    $afterHead   = Get-GitOrNa @('rev-parse','HEAD')

    [pscustomobject]@{
        runnerId       = $RunnerId
        verdict        = $script:Verdict
        utc            = (Get-Date).ToUniversalTime().ToString('o')
        repoPath       = $RepoPath
        expectedBranch = $ExpectedBranch
        expectedHead   = $ExpectedHead
        beforeBranch   = $script:BeforeBranch
        beforeHead     = $script:BeforeHead
        afterBranch    = $afterBranch
        afterHead      = $afterHead
        rolledBack     = $script:RolledBack
        # Only report a recovery tag that actually exists. A preflight abort
        # creates none, and naming one would send the reader to a ref that is
        # not there.
        preTag         = $(if ($script:NetCreated) { $script:PreTag } else { $null })
        preUntracked   = @($script:PreUntracked)
        nodeVersion    = $script:NodeVersion
        nodePin        = $script:NodePin
        nodePinSource  = $script:NodePinSource
        culture        = (Get-Culture).Name
        timezone       = [System.TimeZoneInfo]::Local.Id
        discovery      = [bool] $Discovery
        psVersion      = $PSVersionTable.PSVersion.ToString()
        steps          = @($script:Steps)
    } | ConvertTo-Json -Depth 4 |
        Set-Content -LiteralPath (Join-Path $script:Stage 'manifest.json') -Encoding UTF8

    Set-Content -LiteralPath (Join-Path $script:Stage 'transcript.txt') `
                -Value $script:Transcript.ToString() -Encoding UTF8

    $gitState = @(
        '--- status --porcelain ---'
        Get-GitOrNa @('status','--porcelain')
        ''
        '--- log --oneline -20 ---'
        Get-GitOrNa @('log','--oneline','-20')
        ''
        '--- branch -vv ---'
        Get-GitOrNa @('branch','-vv')
    ) -join "`n"
    Set-Content -LiteralPath (Join-Path $script:Stage 'git-state.txt') -Value $gitState -Encoding UTF8

    # What this runner changed, relative to its own starting point. Skipped
    # when preflight aborted, since there is no starting point to diff from and
    # attempting it only emits a confusing 'ambiguous argument' warning.
    if ($script:BeforeHead -ne 'unknown') {
        try {
            $patch = & git diff "$script:BeforeHead..HEAD" 2>&1 | Out-String
            if ($patch.Trim()) {
                Set-Content -LiteralPath (Join-Path $script:Stage 'changes.patch') -Value $patch -Encoding UTF8
            }
        } catch { Write-Log "could not produce changes.patch: $($_.Exception.Message)" 'WARN' }
    }

    # Discovery only: tracked content, never a directory copy (see flow doc 5).
    if ($Discovery) {
        $repoDir = Join-Path $script:Stage 'repo'
        New-Item -ItemType Directory -Path $repoDir -Force | Out-Null
        $tar = Join-Path $script:Stage 'repo.tar'
        & git archive --format=tar -o $tar HEAD 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            & tar -xf $tar -C $repoDir 2>&1 | Out-Null
            Remove-Item -LiteralPath $tar -Force
        } else {
            Write-Log 'git archive failed; discovery bundle will omit repo/' 'WARN'
        }
    }

    if (Test-Path (Join-Path $RepoPath 'build\coldbox.html')) {
        $b = Get-Item (Join-Path $RepoPath 'build\coldbox.html')
        $h = (Get-FileHash -LiteralPath $b.FullName -Algorithm SHA256).Hash
        Set-Content -LiteralPath (Join-Path $script:Stage 'evidence\build.txt') `
                    -Value "bytes: $($b.Length)`nsha256: $h" -Encoding UTF8
    }

    Import-SecretScanner

    if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
    $zip = Join-Path $OutDir "coldbox-runner-$RunnerId.zip"
    $published = Publish-ColdboxScannedBundle -Root $script:Stage -RepoPath $RepoPath -ZipPath $zip

    if ($published.Redacted) {
        Write-Log "Secret scan found $($published.FindingCount) finding(s); unsafe payload omitted. Bundle contains manifest + scan-report only." 'WARN'
    } else {
        Write-Log "Secret scan CLEAN; skipped binary paths recorded: $($published.SkippedCount)."
    }

    Write-Host ''
    Write-Host "  Bundle: $zip"
    Write-Host "  Verdict: $script:Verdict"
    Write-Host "  Redacted: $($published.Redacted)"
    Write-Host '  Upload that zip back to the chat.'
    Write-Host ''
}
# ----------------------------------------------------------------------- main

try {
    Invoke-Preflight
    New-SafetyNet

    # =====================================================================
    # STEPS - the agent replaces this block. Everything above and below is
    # fixed. Use Invoke-Step so exit codes are checked and captured.
    # =====================================================================

    Invoke-Step 'git'  @('--version')
    # Invoke-Step 'npm' @('ci','--no-audit','--no-fund')
    # Invoke-Step 'npm' @('run','lint')
    # Invoke-Step 'npm' @('test')
    # Invoke-Step 'npm' @('run','build')

    # =====================================================================

    $script:Verdict = 'PASS'
    Write-Log '=== RUNNER PASSED ==='
}
catch {
    $script:Verdict = 'FAIL'
    Write-Log "FAILURE: $($_.Exception.Message)" 'ERROR'
    # Roll back only if we got far enough to create the safety net. A preflight
    # abort mutates nothing, so there is deliberately nothing to undo.
    if ($script:NetCreated) { Invoke-Rollback }
    else { Write-Log 'Failed during preflight - nothing was mutated, tree untouched.' 'WARN' }
}
finally {
    try { New-Bundle }
    catch { Write-Host "BUNDLE FAILED: $($_.Exception.Message)" -ForegroundColor Red }
}

if ($script:Verdict -ne 'PASS') { exit 1 }
exit 0
