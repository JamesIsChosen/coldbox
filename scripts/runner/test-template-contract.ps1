#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string]$RepoPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition,[string]$Message)
    if (-not $Condition) { throw $Message }
}

function Invoke-Native {
    param(
        [Parameter(Mandatory=$true)][string]$Exe,
        [Parameter(Mandatory=$true)][AllowEmptyCollection()][string[]]$Arguments,
        [Parameter(Mandatory=$true)][string]$WorkingDirectory,
        [switch]$AllowFailure
    )
    $old = Get-Location
    try {
        Set-Location -LiteralPath $WorkingDirectory
        $oldPref = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            $output = & $Exe @Arguments 2>&1 | Out-String
            $code = $LASTEXITCODE
        }
        finally {
            $ErrorActionPreference = $oldPref
        }
    }
    finally {
        Set-Location -LiteralPath $old
    }
    if ($code -ne 0 -and -not $AllowFailure) {
        throw "$Exe $($Arguments -join ' ') failed with exit $code`n$output"
    }
    [pscustomobject]@{ Output=$output; ExitCode=$code }
}

function Get-Git {
    param([string]$Clone,[string[]]$Arguments,[switch]$AllowFailure)
    Invoke-Native -Exe $script:RealGit -Arguments $Arguments -WorkingDirectory $Clone -AllowFailure:$AllowFailure
}

function New-DisposableClone {
    param([string]$Name)
    $dest = Join-Path $script:Root $Name
    [void](Invoke-Native -Exe $script:RealGit -Arguments @(
        'clone','--no-hardlinks','--branch',$script:Branch,$RepoPath,$dest
    ) -WorkingDirectory $script:Root)
    $head = (Get-Git -Clone $dest -Arguments @('rev-parse','HEAD')).Output.Trim()
    Assert-True ($head -eq $script:Head) "Clone $Name HEAD mismatch: $head"
    $status = (Get-Git -Clone $dest -Arguments @('status','--porcelain=v1','-uall')).Output.Trim()
    Assert-True (-not $status) "Clone $Name is unexpectedly dirty."
    return $dest
}

function Open-Zip {
    param([string]$Path)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::OpenRead($Path)
}

function Read-ZipText {
    param([string]$ZipPath,[string]$EntryName)
    $archive = Open-Zip $ZipPath
    try {
        $entry = $archive.Entries | Where-Object {
            $_.FullName.Replace('\','/') -eq $EntryName
        } | Select-Object -First 1
        if (-not $entry) { throw "ZIP entry missing: $EntryName" }
        $stream = $entry.Open()
        try {
            $reader = New-Object IO.StreamReader($stream,[Text.Encoding]::UTF8,$true)
            try { $reader.ReadToEnd() }
            finally { $reader.Dispose() }
        }
        finally { $stream.Dispose() }
    }
    finally { $archive.Dispose() }
}

function Invoke-Template {
    param(
        [string]$Clone,
        [string]$RunnerId,
        [string]$OutDir,
        [switch]$Discovery,
        [string]$WrapperDir = $null,
        [hashtable]$ExtraEnvironment = @{},
        [string]$TemplatePath = $null
    )

    if (-not (Test-Path -LiteralPath $OutDir)) {
        New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
    }

    $template = if ($TemplatePath) { $TemplatePath } else { Join-Path $Clone 'scripts\runner\_template.ps1' }
    $args = @(
        '-NoProfile','-ExecutionPolicy','Bypass','-File',$template,
        '-RepoPath',$Clone,
        '-RunnerId',$RunnerId,
        '-ExpectedBranch',$script:Branch,
        '-ExpectedHead',$script:Head,
        '-OutDir',$OutDir
    )
    if ($Discovery) { $args += '-Discovery' }

    $savedPath = $env:PATH
    $saved = @{}
    try {
        if ($WrapperDir) { $env:PATH = "$WrapperDir;$savedPath" }
        foreach ($key in $ExtraEnvironment.Keys) {
            $saved[$key] = [Environment]::GetEnvironmentVariable($key,'Process')
            [Environment]::SetEnvironmentVariable($key,[string]$ExtraEnvironment[$key],'Process')
        }

        Invoke-Native -Exe 'powershell.exe' -Arguments $args -WorkingDirectory $Clone -AllowFailure
    }
    finally {
        $env:PATH = $savedPath
        foreach ($key in $ExtraEnvironment.Keys) {
            [Environment]::SetEnvironmentVariable($key,$saved[$key],'Process')
        }
    }
}

function New-DerivedTemplate {
    param(
        [Parameter(Mandatory=$true)][string]$SourceTemplate,
        [Parameter(Mandatory=$true)][string]$OutputTemplate,
        [Parameter(Mandatory=$true)][string]$StepBlock
    )

    $raw = [IO.File]::ReadAllText($SourceTemplate)
    $text = $raw.Replace("`r`n","`n").Replace("`r","`n")
    $startMarker = "    Invoke-Step 'git'  @('--version')"
    $start = $text.IndexOf($startMarker,[StringComparison]::Ordinal)
    if ($start -lt 0) { throw 'Derived template STEPS start marker not found.' }
    $endMarker = '    # ====================================================================='
    $end = $text.IndexOf($endMarker,$start + $startMarker.Length,[StringComparison]::Ordinal)
    if ($end -lt 0) { throw 'Derived template STEPS end marker not found.' }

    $updated = $text.Substring(0,$start) + $StepBlock.TrimEnd("`r","`n") + "`n`n" + $text.Substring($end)
    [IO.File]::WriteAllText($OutputTemplate,$updated,(New-Object Text.UTF8Encoding($false)))
}

function Assert-CleanScanBundle {
    param([string]$Zip)
    Assert-True (Test-Path -LiteralPath $Zip -PathType Leaf) "Expected bundle missing: $Zip"
    $scan = Read-ZipText -ZipPath $Zip -EntryName 'scan-report.txt'
    Assert-True ($scan -match '^CLEAN') "Bundle scan is not CLEAN: $Zip"
}

$script:Root = Join-Path ([IO.Path]::GetTempPath()) ('coldbox-template-contract-' + [guid]::NewGuid().ToString('N'))
$script:RealGit = (Get-Command git.exe -ErrorAction Stop).Source
$script:RealTar = (Get-Command tar.exe -ErrorAction Stop).Source

try {
    if (-not (Test-Path -LiteralPath $RepoPath)) { throw "Repo not found: $RepoPath" }
    $script:Branch = (Invoke-Native -Exe $script:RealGit -Arguments @('branch','--show-current') -WorkingDirectory $RepoPath).Output.Trim()
    $script:Head = (Invoke-Native -Exe $script:RealGit -Arguments @('rev-parse','HEAD') -WorkingDirectory $RepoPath).Output.Trim()
    $sourceStatus = (Invoke-Native -Exe $script:RealGit -Arguments @('status','--porcelain=v1','-uall') -WorkingDirectory $RepoPath).Output.Trim()
    Assert-True (-not $sourceStatus) 'Source repository must be clean before template-contract regression.'

    New-Item -ItemType Directory -Path $script:Root -Force | Out-Null

    # ---------------------------------------------------------------- N2
    # Explicit -uall must override status.showUntrackedFiles=no and refuse the
    # run before a safety tag or STEPS execute. The refused path must still be
    # persisted in the failure manifest.
    $preflightClone = New-DisposableClone 'preflight-hidden-untracked'
    [void](Get-Git -Clone $preflightClone -Arguments @('config','status.showUntrackedFiles','no'))
    $preexisting = Join-Path $preflightClone 'preexisting-reviewer-file.txt'
    [IO.File]::WriteAllText($preexisting,'pre-existing', (New-Object Text.UTF8Encoding($false)))

    $preflightId = 'contract-preflight-hidden-untracked'
    $preflightOut = Join-Path $script:Root 'out-preflight'
    $preflightRun = Invoke-Template -Clone $preflightClone -RunnerId $preflightId -OutDir $preflightOut
    Assert-True ($preflightRun.ExitCode -eq 1) "Hidden-untracked preflight exited $($preflightRun.ExitCode); expected 1."

    $preflightTag = Get-Git -Clone $preflightClone -Arguments @('show-ref','--verify','--quiet',"refs/tags/runner/$preflightId/pre") -AllowFailure
    Assert-True ($preflightTag.ExitCode -eq 1) 'Hidden-untracked preflight created a safety tag.'

    $preflightZip = Join-Path $preflightOut "coldbox-runner-$preflightId.zip"
    Assert-CleanScanBundle $preflightZip
    $preflightManifest = (Read-ZipText $preflightZip 'manifest.json') | ConvertFrom-Json
    $preflightTranscript = Read-ZipText $preflightZip 'transcript.txt'

    Assert-True ($preflightManifest.verdict -eq 'FAIL') 'Hidden-untracked preflight manifest was not FAIL.'
    Assert-True ($preflightManifest.failurePhase -eq 'preflight') "Hidden-untracked failurePhase was '$($preflightManifest.failurePhase)'."
    Assert-True ($null -eq $preflightManifest.preTag) 'Hidden-untracked preflight reported a recovery tag.'
    Assert-True (@($preflightManifest.preUntracked) -contains 'preexisting-reviewer-file.txt') 'Hidden-untracked path was not persisted in manifest.'
    Assert-True (Test-Path -LiteralPath $preexisting -PathType Leaf) 'Pre-existing untracked file was modified or removed.'
    $explicitDirty = (Get-Git -Clone $preflightClone -Arguments @('status','--porcelain=v1','-uall')).Output.Trim()
    Assert-True ($explicitDirty -match 'preexisting-reviewer-file\.txt') 'Explicit -uall status did not show preserved pre-existing path.'
    Assert-True ($preflightTranscript -match 'Failed during preflight before mutation') 'Preflight diagnostic did not identify the preflight phase.'
    Write-Host 'PASS: status.showUntrackedFiles=no cannot bypass clean-tree preflight; refused untracked paths are persisted as diagnostic evidence.'

    # ---------------------------------------------------------------- N5
    # A recovery-tag collision belongs to the safety-net phase, never preflight.
    $tagClone = New-DisposableClone 'safety-tag-collision'
    $tagId = 'contract-safety-tag-collision'
    $parent = (Get-Git -Clone $tagClone -Arguments @('rev-parse','HEAD^')).Output.Trim()
    [void](Get-Git -Clone $tagClone -Arguments @('tag',"runner/$tagId/pre",$parent))
    $tagBefore = (Get-Git -Clone $tagClone -Arguments @('rev-parse',"refs/tags/runner/$tagId/pre")).Output.Trim()

    $tagOut = Join-Path $script:Root 'out-tag-collision'
    $tagRun = Invoke-Template -Clone $tagClone -RunnerId $tagId -OutDir $tagOut
    Assert-True ($tagRun.ExitCode -eq 1) "Safety-tag collision exited $($tagRun.ExitCode); expected 1."
    $tagAfter = (Get-Git -Clone $tagClone -Arguments @('rev-parse',"refs/tags/runner/$tagId/pre")).Output.Trim()
    Assert-True ($tagAfter -eq $tagBefore) 'Safety-tag collision overwrote the existing recovery tag.'

    $tagZip = Join-Path $tagOut "coldbox-runner-$tagId.zip"
    Assert-CleanScanBundle $tagZip
    $tagManifest = (Read-ZipText $tagZip 'manifest.json') | ConvertFrom-Json
    $tagTranscript = Read-ZipText $tagZip 'transcript.txt'
    Assert-True ($tagManifest.verdict -eq 'FAIL') 'Safety-tag collision manifest was not FAIL.'
    Assert-True ($tagManifest.failurePhase -eq 'safety-net') "Safety-tag failurePhase was '$($tagManifest.failurePhase)'."
    Assert-True ($tagTranscript -match 'Failed during safety-net before mutation') 'Safety-tag diagnostic did not identify safety-net phase.'
    Assert-True ($tagTranscript -notmatch 'Failed during preflight') 'Safety-tag collision was incorrectly labeled as preflight.'
    Write-Host 'PASS: recovery-tag collision preserves the existing tag and is labeled as a safety-net failure.'

    # ---------------------------------------------------------------- N1 + atomicity
    # Mutate the disposable checkout after the safety net, then force only
    # git archive to fail. A discovery request must exit non-zero, clean
    # staging/output, AND roll the checkout back to exact branch/HEAD/clean tree.
    $archiveClone = New-DisposableClone 'archive-failure'
    $archiveWrapper = Join-Path $script:Root 'wrapper-git-archive'
    New-Item -ItemType Directory -Path $archiveWrapper -Force | Out-Null
    $archiveMarker = Join-Path $script:Root 'archive-wrapper-hit.txt'
    $gitCmd = @"
@echo off
if /I "%~1"=="archive" (
  >"%COLDBOX_GIT_ARCHIVE_MARKER%" echo archive-wrapper-hit
  >&2 echo forced git archive failure
  exit /b 17
)
"$script:RealGit" %*
exit /b %ERRORLEVEL%
"@
    [IO.File]::WriteAllText((Join-Path $archiveWrapper 'git.cmd'),$gitCmd,(New-Object Text.ASCIIEncoding))

    $archiveRunner = Join-Path $script:Root 'archive-failure-runner.ps1'
    $archiveSteps = @'
    Invoke-Step 'git.exe' @('checkout','-b','contract-archive-mutated')
    Invoke-Step 'cmd.exe' @('/d','/c','echo runner-owned>>CHANGELOG.md & echo runner-owned>runner-owned-archive.tmp & exit /b 0')
'@
    New-DerivedTemplate `
        -SourceTemplate (Join-Path $archiveClone 'scripts\runner\_template.ps1') `
        -OutputTemplate $archiveRunner `
        -StepBlock $archiveSteps

    $archiveChangelog = Join-Path $archiveClone 'CHANGELOG.md'
    $archiveChangelogHashBefore = (Get-FileHash -LiteralPath $archiveChangelog -Algorithm SHA256).Hash

    $archiveId = 'contract-archive-failure'
    $archiveOut = Join-Path $script:Root 'out-archive'
    New-Item -ItemType Directory -Path $archiveOut -Force | Out-Null
    $archiveZip = Join-Path $archiveOut "coldbox-runner-$archiveId.zip"
    [IO.File]::WriteAllText($archiveZip,'stale-output-must-not-survive',(New-Object Text.UTF8Encoding($false)))

    $archiveRun = Invoke-Template -Clone $archiveClone -RunnerId $archiveId -OutDir $archiveOut -Discovery `
        -WrapperDir $archiveWrapper -ExtraEnvironment @{ COLDBOX_GIT_ARCHIVE_MARKER=$archiveMarker } `
        -TemplatePath $archiveRunner

    Assert-True ($archiveRun.ExitCode -eq 1) "Forced git archive failure exited $($archiveRun.ExitCode); expected 1."
    Assert-True (Test-Path -LiteralPath $archiveMarker -PathType Leaf) 'Forced git archive wrapper was not reached.'
    Assert-True (-not (Test-Path -LiteralPath $archiveZip)) 'Forced git archive failure left a stale/partial ordinary ZIP.'
    $archiveStage = Join-Path ([IO.Path]::GetTempPath()) "coldbox-runner-$archiveId"
    Assert-True (-not (Test-Path -LiteralPath $archiveStage)) 'Forced git archive failure left staging behind.'
    Assert-True ($archiveRun.Output -match 'Bundle command failed with exit 17') 'Forced git archive failure did not propagate exit 17.'
    Assert-True ($archiveRun.Output -match 'BUNDLE FAILED') 'Forced git archive failure did not surface as bundle construction failure.'
    Assert-True ($archiveRun.Output -match 'rolling back step mutations') 'Bundle-construction failure did not enter atomic rollback.'

    $archiveBranch = (Get-Git -Clone $archiveClone -Arguments @('branch','--show-current')).Output.Trim()
    $archiveHead = (Get-Git -Clone $archiveClone -Arguments @('rev-parse','HEAD')).Output.Trim()
    $archiveStatus = (Get-Git -Clone $archiveClone -Arguments @('status','--porcelain=v1','-uall')).Output.Trim()
    Assert-True ($archiveBranch -eq $script:Branch) "Archive-failure rollback restored wrong branch: $archiveBranch"
    Assert-True ($archiveHead -eq $script:Head) "Archive-failure rollback restored wrong HEAD: $archiveHead"
    Assert-True (-not $archiveStatus) "Archive-failure rollback left a dirty tree: $archiveStatus"
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $archiveClone 'runner-owned-archive.tmp'))) 'Archive-failure rollback left runner-owned untracked content.'
    $archiveChangelogHashAfter = (Get-FileHash -LiteralPath $archiveChangelog -Algorithm SHA256).Hash
    Assert-True ($archiveChangelogHashAfter -eq $archiveChangelogHashBefore) 'Archive-failure rollback did not restore tracked CHANGELOG.md bytes.'
    Write-Host 'PASS: non-zero git archive fails discovery closed, cleans staging/output, and atomically restores tracked/untracked/branch/HEAD state.'

    # ---------------------------------------------------------------- N1 + N3
    # Let tar really populate repo/, then return 19. This proves cleanup covers
    # an exception after staging contains tracked files but before publication.
    $tarClone = New-DisposableClone 'tar-post-extraction-failure'
    $tarWrapper = Join-Path $script:Root 'wrapper-tar-post-extract'
    New-Item -ItemType Directory -Path $tarWrapper -Force | Out-Null
    $tarMarker = Join-Path $script:Root 'tar-extraction-completed.txt'
    $tarCmd = @"
@echo off
"$script:RealTar" %*
if not "%ERRORLEVEL%"=="0" exit /b %ERRORLEVEL%
>"%COLDBOX_TAR_WRAPPER_MARKER%" echo tar-real-extraction-completed
>&2 echo forced tar post-extraction failure
exit /b 19
"@
    [IO.File]::WriteAllText((Join-Path $tarWrapper 'tar.cmd'),$tarCmd,(New-Object Text.ASCIIEncoding))

    $tarId = 'contract-tar-post-extraction-failure'
    $tarOut = Join-Path $script:Root 'out-tar'
    New-Item -ItemType Directory -Path $tarOut -Force | Out-Null
    $tarZip = Join-Path $tarOut "coldbox-runner-$tarId.zip"
    [IO.File]::WriteAllText($tarZip,'stale-output-must-not-survive',(New-Object Text.UTF8Encoding($false)))

    $tarRun = Invoke-Template -Clone $tarClone -RunnerId $tarId -OutDir $tarOut -Discovery `
        -WrapperDir $tarWrapper -ExtraEnvironment @{ COLDBOX_TAR_WRAPPER_MARKER=$tarMarker }

    Assert-True ($tarRun.ExitCode -eq 1) "Forced tar post-extraction failure exited $($tarRun.ExitCode); expected 1."
    Assert-True (Test-Path -LiteralPath $tarMarker -PathType Leaf) 'Tar wrapper did not complete real extraction before forcing failure.'
    Assert-True (-not (Test-Path -LiteralPath $tarZip)) 'Forced tar failure left a stale/partial ordinary ZIP.'
    $tarStage = Join-Path ([IO.Path]::GetTempPath()) "coldbox-runner-$tarId"
    Assert-True (-not (Test-Path -LiteralPath $tarStage)) 'Forced post-extraction failure left populated staging behind.'
    Assert-True ($tarRun.Output -match 'Bundle command failed with exit 19') 'Forced tar failure did not propagate exit 19.'
    Assert-True ($tarRun.Output -match 'BUNDLE FAILED') 'Forced tar failure did not surface as bundle construction failure.'
    Write-Host 'PASS: post-extraction construction failure removes populated staging and partial/stale output before exiting non-zero.'

    Write-Host 'PASS: browser-runner template contract regression suite complete.'
}
finally {
    if (Test-Path -LiteralPath $script:Root) {
        Remove-Item -LiteralPath $script:Root -Recurse -Force -ErrorAction SilentlyContinue
    }
}
