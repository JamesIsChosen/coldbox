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
    [string] $RepoPath       = 'C:\Users\semaj\Projects\coldbox',
    [string] $RunnerId       = 'REPLACE-ME',          # e.g. p0.17-01
    [string] $ExpectedBranch = 'REPLACE-ME',
    [string] $ExpectedHead   = 'REPLACE-ME',          # full or short SHA
    [switch] $Discovery,                              # include repo/ archive
    [string] $OutDir         = (Join-Path $HOME 'Downloads')
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
    $output = & $Exe @Arguments 2>&1 | Out-String
    $code   = $LASTEXITCODE
    if ($output.Trim()) { [void] $script:Transcript.AppendLine($output.TrimEnd()) }
    [void] $script:Transcript.AppendLine("-- exit $code")
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
    if ($ExpectedBranch -ne 'REPLACE-ME' -and $branch -ne $ExpectedBranch) {
        throw "Branch drift. Expected '$ExpectedBranch', found '$branch'. The agent's assumed state is stale - report this rather than forcing it."
    }

    $head = Get-GitOut @('rev-parse','HEAD')
    if ($ExpectedHead -ne 'REPLACE-ME' -and -not $head.StartsWith($ExpectedHead)) {
        throw "HEAD drift. Expected '$ExpectedHead', found '$head'. The agent's assumed state is stale - report this rather than forcing it."
    }

    $script:BeforeBranch = $branch
    $script:BeforeHead   = $head
    $script:PreUntracked = Get-GitLines @('ls-files','--others','--exclude-standard')

    try   { $script:NodeVersion = (& node --version 2>&1 | Out-String).Trim() }
    catch { $script:NodeVersion = 'not found' }
    if (-not $script:NodeVersion) { $script:NodeVersion = 'not found' }
    $pinned = if (Test-Path .nvmrc) { (Get-Content .nvmrc -Raw).Trim() } else { '(unpinned)' }
    if ($script:NodeVersion -notlike "*$pinned*") {
        Write-Log "Node $($script:NodeVersion) does not match pinned $pinned. Build evidence is weaker; recorded in manifest." 'WARN'
    }

    Write-Log "branch=$branch head=$head node=$($script:NodeVersion)"
    Write-Log 'Preflight OK.'
}

# -------------------------------------------------------------- safety + undo

function New-SafetyNet {
    Write-Log "=== SAFETY NET: tagging $script:PreTag ==="
    & git tag -f $script:PreTag HEAD 2>&1 | Out-Null
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

function Invoke-SecretScan {
    param([Parameter(Mandatory)][string] $Root)

    Write-Log '=== SECRET SCAN ==='
    $findings   = New-Object System.Collections.Generic.List[string]
    $badGlobs   = '*.cbx','*.cbx.bak','*.cbw','*.key','*.pem','*.asc','*.sig','.env','.env.*'
    $keyPrefix  = 'xprv','yprv','zprv','tprv','uprv','vprv'

    foreach ($g in $badGlobs) {
        Get-ChildItem -LiteralPath $Root -Recurse -File -Filter $g -ErrorAction SilentlyContinue |
            ForEach-Object { $findings.Add("forbidden file: $($_.FullName.Substring($Root.Length))") }
    }
    if (Test-Path (Join-Path $Root 'secrets')) { $findings.Add('forbidden directory: secrets/') }

    # Extended-key prefixes and mnemonic-shaped runs, in text files only.
    Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Length -lt 2MB -and $_.Extension -notin '.png','.jpg','.jpeg','.gif','.ico','.pdf','.zip','.wasm','.woff','.woff2','.tgz' } |
        ForEach-Object {
            $rel  = $_.FullName.Substring($Root.Length)
            $text = try { Get-Content -LiteralPath $_.FullName -Raw -ErrorAction Stop } catch { $null }
            if ($null -eq $text) { return }
            foreach ($p in $keyPrefix) {
                if ($text -cmatch "\b$p[0-9A-HJ-NP-Za-km-z]{50,}") { $findings.Add("extended private key shape in $rel"); break }
            }
            # Single line only. \s would match newlines in .NET regex, so a
            # word-per-line file (a BIP-39 wordlist, a glossary) would false
            # positive and abort every bundle. A written-out mnemonic is on one
            # line; use [ \t] so this stays true.
            if ($text -cmatch '(?m)^[ \t]*(?:[a-z]{3,8}[ \t]+){11,23}[a-z]{3,8}[ \t]*$') {
                $findings.Add("mnemonic-shaped word run (12-24 words, one line) in $rel")
            }
        }

    $report = if ($findings.Count -eq 0) {
        "CLEAN - no vault, key, or mnemonic-shaped content found in the bundle staging area."
    } else {
        "FAILED - " + $findings.Count + " finding(s). Paths only; matched content is deliberately not printed.`n" +
        ($findings -join "`n")
    }
    Set-Content -LiteralPath (Join-Path $Root 'scan-report.txt') -Value $report -Encoding UTF8
    Write-Log $report.Split("`n")[0]

    if ($findings.Count -gt 0) {
        throw "Secret scan failed - bundle NOT written. Fail closed per AGENTS.md 3."
    }
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
        preTag         = $script:PreTag
        nodeVersion    = $script:NodeVersion
        culture        = (Get-Culture).Name
        timezone       = [System.TimeZoneInfo]::Local.Id
        discovery      = [bool] $Discovery
        psVersion      = $PSVersionTable.PSVersion.ToString()
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

    # What this runner changed, relative to its own starting point.
    try {
        $patch = & git diff "$script:BeforeHead..HEAD" 2>&1 | Out-String
        if ($patch.Trim()) {
            Set-Content -LiteralPath (Join-Path $script:Stage 'changes.patch') -Value $patch -Encoding UTF8
        }
    } catch { Write-Log "could not produce changes.patch: $($_.Exception.Message)" 'WARN' }

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

    Invoke-SecretScan -Root $script:Stage

    if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
    $zip = Join-Path $OutDir "coldbox-runner-$RunnerId.zip"
    if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
    Compress-Archive -Path (Join-Path $script:Stage '*') -DestinationPath $zip -CompressionLevel Optimal
    Remove-Item -LiteralPath $script:Stage -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host ''
    Write-Host "  Bundle: $zip"
    Write-Host "  Verdict: $script:Verdict"
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
