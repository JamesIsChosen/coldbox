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
$script:Phase        = 'initialising'
$script:FailurePhase = $null

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

    # Capture untracked paths before deciding cleanliness so a refused preflight
    # can still report them. Explicit -uall makes this independent of
    # status.showUntrackedFiles and other display configuration.
    $script:PreUntracked = @(Get-GitLines @('ls-files','--others','--exclude-standard'))
    $status = Get-GitOut @('status','--porcelain=v1','-uall')
    if ($status) {
        throw "Working tree is not clean. Tracked or untracked changes belong to you or a previous run and will not be absorbed. Commit, stash, or discard them yourself, then re-run.`n$status"
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

function Invoke-RollbackGit {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string[]] $Arguments
    )

    $display = "git $($Arguments -join ' ')"
    $previousPreference = $ErrorActionPreference
    try {
        # Windows PowerShell 5.1 wraps native stderr as ErrorRecord objects.
        # Rollback success is determined by Git's process exit code, not by the
        # mere presence of stderr such as "Already on '<branch>'".
        $ErrorActionPreference = 'Continue'
        $output = & git @Arguments 2>&1 | Out-String
        $code = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($output.Trim()) {
        [void] $script:Transcript.AppendLine($output.TrimEnd())
    }
    [void] $script:Transcript.AppendLine("-- rollback git exit $code")
    Write-Log "rollback `$ $display -> exit $code" $(if ($code -eq 0) { 'INFO' } else { 'ERROR' })

    if ($code -ne 0) {
        throw "Rollback command failed with exit ${code}: $display"
    }

    [pscustomobject]@{
        Output = $output
        ExitCode = $code
    }
}

function Invoke-Rollback {
    Write-Log '=== ROLLBACK ===' 'WARN'
    try {
        # Restore the original branch first if a runner step moved elsewhere.
        # -f intentionally discards only tracked working-tree changes made by
        # the failed runner; preflight guarantees there was no pre-existing
        # dirty tracked state to preserve.
        $currentBranch = (Invoke-RollbackGit -Arguments @('rev-parse','--abbrev-ref','HEAD')).Output.Trim()
        if ($currentBranch -ne $script:BeforeBranch) {
            [void](Invoke-RollbackGit -Arguments @('checkout','-f',$script:BeforeBranch))
        }

        [void](Invoke-RollbackGit -Arguments @('reset','--hard',$script:PreTag))

        # Remove ONLY untracked files this runner introduced.
        $nowUntracked = @(Get-GitLines @('ls-files','--others','--exclude-standard'))
        foreach ($f in $nowUntracked) {
            if ($script:PreUntracked -notcontains $f) {
                Write-Log "removing runner-created untracked file: $f"
                Remove-Item -LiteralPath $f -Force -Recurse -ErrorAction SilentlyContinue
            }
        }

        $afterBranch = (Invoke-RollbackGit -Arguments @('rev-parse','--abbrev-ref','HEAD')).Output.Trim()
        $afterHead = (Invoke-RollbackGit -Arguments @('rev-parse','HEAD')).Output.Trim()
        $afterStatus = (Invoke-RollbackGit -Arguments @('status','--porcelain=v1','-uall')).Output.Trim()

        if ($afterBranch -ne $script:BeforeBranch) {
            throw "Rollback branch verification failed. Expected '$($script:BeforeBranch)', found '$afterBranch'."
        }
        if ($afterHead -ne $script:BeforeHead) {
            throw "Rollback HEAD verification failed. Expected '$($script:BeforeHead)', found '$afterHead'."
        }
        if ($afterStatus) {
            throw "Rollback tree verification failed; repository is not clean.`n$afterStatus"
        }

        $script:RolledBack = $true
        Write-Log "Rolled back to $script:BeforeHead on $script:BeforeBranch. Tree is clean." 'WARN'
    }
    catch {
        $script:RolledBack = $false
        Write-Log "ROLLBACK FAILED: $($_.Exception.Message)" 'ERROR'
        Write-Log "Tree may be inconsistent. Recover manually with: git checkout -f $script:BeforeBranch; git reset --hard $script:PreTag" 'ERROR'
        Write-Log 'Do not run another runner until this is resolved.' 'ERROR'
    }
}
# ----------------------------------------------------------------- secret scan
function Get-SecretScannerPath {
    $scanner = Join-Path $RepoPath 'scripts\runner\secret-scan.ps1'
    if (-not (Test-Path -LiteralPath $scanner -PathType Leaf)) {
        throw 'Secret scanner helper is missing; refusing to build an unscanned bundle.'
    }
    return $scanner
}

# Bundle-construction subprocesses are not normal runner STEPS, but they need
# the same PowerShell 5.1 stderr treatment and explicit exit-code checking.
function Invoke-BundleNative {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string] $Exe,
        [Parameter(Mandatory=$true)][string[]] $Arguments
    )

    $display = "$Exe $($Arguments -join ' ')"
    $previousPreference = $ErrorActionPreference
    $output = ''
    $code = $null
    $invokeFailure = $null

    try {
        $ErrorActionPreference = 'Continue'
        try {
            $output = & $Exe @Arguments 2>&1 | Out-String
            $code = $LASTEXITCODE
        }
        catch {
            $invokeFailure = $_.Exception.Message
        }
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($output.Trim()) {
        [void] $script:Transcript.AppendLine($output.TrimEnd())
    }

    if ($invokeFailure) {
        [void] $script:Transcript.AppendLine("-- bundle command could not start")
        throw "Bundle command could not start: $display :: $invokeFailure"
    }

    [void] $script:Transcript.AppendLine("-- bundle command exit $code")
    Write-Log "bundle `$ $display -> exit $code" $(if ($code -eq 0) { 'INFO' } else { 'ERROR' })

    if ($code -ne 0) {
        throw "Bundle command failed with exit ${code}: $display"
    }

    [pscustomobject]@{
        Output = $output
        ExitCode = $code
    }
}

# --------------------------------------------------------------------- bundle

function New-Bundle {
    $zip = $null
    $bundleComplete = $false

    try {
        if (-not (Test-Path -LiteralPath $OutDir)) {
            New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
        }
        $zip = Join-Path $OutDir "coldbox-runner-$RunnerId.zip"

        # A rerun with the same id must never leave an old output looking like
        # the result of this run if construction later fails.
        if (Test-Path -LiteralPath $zip) {
            Remove-Item -LiteralPath $zip -Force
        }

        if (Test-Path -LiteralPath $script:Stage) {
            Remove-Item -LiteralPath $script:Stage -Recurse -Force
        }
        New-Item -ItemType Directory -Path $script:Stage -Force | Out-Null
        New-Item -ItemType Directory -Path (Join-Path $script:Stage 'evidence') -Force | Out-Null

        # Discovery is a required payload when requested. Archive/extraction
        # failures are bundle-construction failures, never a PASS-without-repo.
        if ($Discovery) {
            $repoDir = Join-Path $script:Stage 'repo'
            New-Item -ItemType Directory -Path $repoDir -Force | Out-Null
            $tar = Join-Path $script:Stage 'repo.tar'

            [void](Invoke-BundleNative -Exe 'git' -Arguments @('archive','--format=tar','-o',$tar,'HEAD'))
            if (-not (Test-Path -LiteralPath $tar -PathType Leaf)) {
                throw 'git archive exited 0 but did not create repo.tar.'
            }

            [void](Invoke-BundleNative -Exe 'tar' -Arguments @('-xf',$tar,'-C',$repoDir))
            Remove-Item -LiteralPath $tar -Force

            $firstRepoFile = Get-ChildItem -LiteralPath $repoDir -Recurse -File -ErrorAction SilentlyContinue |
                Select-Object -First 1
            if (-not $firstRepoFile) {
                throw 'Discovery extraction completed but repo/ contains no tracked files.'
            }

            . (Get-SecretScannerPath)
            $screenedRepo = Protect-ColdboxDiscoverySnapshot -Root $repoDir -RepoPath $RepoPath
            $unexpectedCount = @($screenedRepo.UnexpectedFindings).Count
            if ($screenedRepo.RedactedFindingCount -gt 0 -or $unexpectedCount -gt 0) {
                $screeningLines = @(
                    'Tracked discovery-copy screening completed.'
                    'Only explicit known-public fixture paths may be sanitized; source files are never modified.'
                    "redactedFindingCount: $($screenedRepo.RedactedFindingCount)"
                    "unexpectedFindingCount: $unexpectedCount"
                    'redacted path/category:'
                ) + @($screenedRepo.RedactedFindings) + @(
                    'unexpected path/category left untouched for final fail-closed scan:'
                ) + @($screenedRepo.UnexpectedFindings)

                Set-Content -LiteralPath (Join-Path $script:Stage 'repo-screening-report.txt') `
                    -Value ($screeningLines -join "`n") -Encoding UTF8

                Write-Log "Discovery fixture screening: $($screenedRepo.RedactedFindingCount) allowlisted finding(s) sanitized; $unexpectedCount unexpected finding(s) left untouched."
                if ($unexpectedCount -gt 0) {
                    Write-Log 'Unexpected tracked secret-shaped content remains; final bundle scan must redact/fail closed.' 'WARN'
                }
            }
        }

        $afterBranch = Get-GitOrNa @('rev-parse','--abbrev-ref','HEAD')
        $afterHead   = Get-GitOrNa @('rev-parse','HEAD')

        [pscustomobject]@{
            runnerId       = $RunnerId
            verdict        = $script:Verdict
            failurePhase   = $script:FailurePhase
            utc            = (Get-Date).ToUniversalTime().ToString('o')
            repoPath       = $RepoPath
            expectedBranch = $ExpectedBranch
            expectedHead   = $ExpectedHead
            beforeBranch   = $script:BeforeBranch
            beforeHead     = $script:BeforeHead
            afterBranch    = $afterBranch
            afterHead      = $afterHead
            rolledBack     = $script:RolledBack
            preTag         = $(if ($script:NetCreated) { $script:PreTag } else { $null })
            # Successful mutable runs always start with this empty. A refused
            # preflight can still report the untracked paths that caused refusal.
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
            '--- status --porcelain=v1 -uall ---'
            Get-GitOrNa @('status','--porcelain=v1','-uall')
            ''
            '--- log --oneline -20 ---'
            Get-GitOrNa @('log','--oneline','-20')
            ''
            '--- branch -vv ---'
            Get-GitOrNa @('branch','-vv')
        ) -join "`n"
        Set-Content -LiteralPath (Join-Path $script:Stage 'git-state.txt') -Value $gitState -Encoding UTF8

        if ($script:BeforeHead -ne 'unknown') {
            try {
                $patch = & git diff "$script:BeforeHead..HEAD" 2>&1 | Out-String
                if ($patch.Trim()) {
                    Set-Content -LiteralPath (Join-Path $script:Stage 'changes.patch') -Value $patch -Encoding UTF8
                }
            } catch { Write-Log "could not produce changes.patch: $($_.Exception.Message)" 'WARN' }
        }

        if (Test-Path (Join-Path $RepoPath 'build\coldbox.html')) {
            $b = Get-Item (Join-Path $RepoPath 'build\coldbox.html')
            $h = (Get-FileHash -LiteralPath $b.FullName -Algorithm SHA256).Hash
            Set-Content -LiteralPath (Join-Path $script:Stage 'evidence\build.txt') `
                        -Value "bytes: $($b.Length)`nsha256: $h" -Encoding UTF8
        }

        . (Get-SecretScannerPath)

        $published = Publish-ColdboxScannedBundle -Root $script:Stage -RepoPath $RepoPath -ZipPath $zip
        $bundleComplete = $true

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
    finally {
        # Publish-ColdboxScannedBundle cleans its own Root, but construction can
        # fail before the publisher is entered. Cover the entire lifecycle here.
        if (Test-Path -LiteralPath $script:Stage) {
            Remove-Item -LiteralPath $script:Stage -Recurse -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path -LiteralPath $script:Stage) {
            throw "Bundle staging cleanup failed: $script:Stage"
        }

        # A construction failure must not leave a partial or stale output ZIP.
        if (-not $bundleComplete -and $zip -and (Test-Path -LiteralPath $zip)) {
            Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
        }
        if (-not $bundleComplete -and $zip -and (Test-Path -LiteralPath $zip)) {
            throw "Partial bundle cleanup failed: $zip"
        }
    }
}

# ----------------------------------------------------------------------- main

try {
    $script:Phase = 'preflight'
    Invoke-Preflight

    $script:Phase = 'safety-net'
    New-SafetyNet

    $script:Phase = 'steps'

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
    $script:Phase = 'bundle'
    Write-Log '=== STEPS PASSED; BUILDING BUNDLE ==='
}
catch {
    $script:Verdict = 'FAIL'
    $script:FailurePhase = $script:Phase
    Write-Log "FAILURE during $($script:FailurePhase): $($_.Exception.Message)" 'ERROR'

    if ($script:NetCreated) {
        Invoke-Rollback
    }
    else {
        Write-Log "Failed during $($script:FailurePhase) before mutation; no rollback required, tree untouched." 'WARN'
    }
}

try {
    $script:Phase = 'bundle'
    New-Bundle
}
catch {
    $script:Verdict = 'FAIL'
    $script:FailurePhase = 'bundle-construction'
    Write-Host "BUNDLE FAILED: $($_.Exception.Message)" -ForegroundColor Red

    # Bundle construction is part of the atomic runner transaction. If STEPS
    # succeeded and mutated the checkout before construction failed, restore
    # the exact pre-run branch/HEAD/tree before returning failure. A prior step
    # failure may already have rolled back; do not run rollback twice.
    if ($script:NetCreated -and -not $script:RolledBack) {
        Write-Log 'Bundle construction failed after the safety net; rolling back step mutations.' 'WARN'
        Invoke-Rollback
    }

    if ($script:NetCreated -and -not $script:RolledBack) {
        Write-Host "BUNDLE FAILURE ROLLBACK FAILED. Recover manually with: git checkout -f $script:BeforeBranch; git reset --hard $script:PreTag" -ForegroundColor Red
    }
    exit 1
}

if ($script:Verdict -ne 'PASS') { exit 1 }
Write-Log '=== RUNNER PASSED ==='
exit 0
