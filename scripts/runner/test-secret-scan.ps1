#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$RepoPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scanner = Join-Path $RepoPath 'scripts\runner\secret-scan.ps1'
if (-not (Test-Path -LiteralPath $scanner -PathType Leaf)) {
    throw 'secret-scan.ps1 is missing.'
}
. $scanner

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Get-ZipEntryNames {
    param([string]$Path)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($Path)
    try {
        return @($archive.Entries | ForEach-Object { $_.FullName.Replace('\','/') })
    } finally {
        $archive.Dispose()
    }
}

function Get-ZipEntryText {
    param([string]$Path, [string]$EntryName)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $entry = @($archive.Entries | Where-Object { $_.FullName.Replace('\','/') -eq $EntryName })
        if ($entry.Count -ne 1) { throw "Expected exactly one zip entry named $EntryName." }
        $reader = New-Object IO.StreamReader($entry[0].Open())
        try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
    } finally {
        $archive.Dispose()
    }
}

$wordSet = Get-ColdboxBip39EnglishWordSet -RepoPath $RepoPath
Assert-True ($wordSet.Count -eq 2048) 'Expected exactly 2048 English BIP-39 words.'
Write-Host 'PASS: vendored English BIP-39 wordlist parsed to 2048 unique words.'

$protocolPath = Join-Path $RepoPath 'test\protocol.test.js'
$protocol = [IO.File]::ReadAllText($protocolPath)
Assert-True (Test-ColdboxMnemonicShape -Text $protocol -WordSet $wordSet) 'The repository protocol test vector was not detected.'
Write-Host 'PASS: repository protocol.test.js is detected as the positive control without printing matched content.'

$root = Join-Path ([IO.Path]::GetTempPath()) ('coldbox-secret-scan-selftest-' + [guid]::NewGuid().ToString('N'))
$zip = "$root.zip"
$cleanRoot = "$root-clean"
$cleanZip = "$cleanRoot.zip"

try {
    New-Item -ItemType Directory -Path $root -Force | Out-Null
    '{"runnerId":"secret-scan-selftest","verdict":"TEST"}' |
        Set-Content -LiteralPath (Join-Path $root 'manifest.json') -Encoding UTF8

    $crlfProtocol = $protocol.Replace("`r`n","`n").Replace("`r","`n").Replace("`n","`r`n")
    $builder = New-Object Text.StringBuilder
    while ($builder.Length -le 2200000) {
        [void]$builder.Append('padding-token ')
    }
    [void]$builder.Append("`r`n")
    [void]$builder.Append($crlfProtocol)
    [IO.File]::WriteAllText(
        (Join-Path $root 'payload-over-2mb.txt'),
        $builder.ToString(),
        (New-Object Text.UTF8Encoding($false))
    )

    $large = Get-Item -LiteralPath (Join-Path $root 'payload-over-2mb.txt')
    Assert-True ($large.Length -gt 2MB) 'Large CRLF fixture did not exceed 2 MiB.'

    $result = Publish-ColdboxScannedBundle -Root $root -RepoPath $RepoPath -ZipPath $zip
    Assert-True (-not $result.Clean) 'Large CRLF mnemonic fixture unexpectedly scanned clean.'
    Assert-True $result.Redacted 'Secret-shaped bundle was not redacted.'

    $entries = Get-ZipEntryNames -Path $zip
    Assert-True ($entries.Count -eq 2) 'Redacted bundle must contain exactly two entries.'
    Assert-True ($entries -contains 'manifest.json') 'Redacted bundle is missing manifest.json.'
    Assert-True ($entries -contains 'scan-report.txt') 'Redacted bundle is missing scan-report.txt.'
    Assert-True (-not ($entries -contains 'payload-over-2mb.txt')) 'Redacted bundle leaked the payload.'
    Write-Host 'PASS: CRLF text larger than 2 MiB is scanned and secret-shaped content yields manifest + scan-report only.'

    # A scan finding can originate in manifest.json itself. The redacted bundle
    # must not copy that original manifest back into the upload.
    New-Item -ItemType Directory -Path $root -Force | Out-Null
    ([ordered]@{ runnerId='secret-scan-manifest-selftest'; note=$protocol } | ConvertTo-Json -Depth 3) |
        Set-Content -LiteralPath (Join-Path $root 'manifest.json') -Encoding UTF8
    $manifestResult = Publish-ColdboxScannedBundle -Root $root -RepoPath $RepoPath -ZipPath $zip
    Assert-True (-not $manifestResult.Clean) 'Mnemonic-shaped manifest unexpectedly scanned clean.'
    Assert-True $manifestResult.Redacted 'Mnemonic-shaped manifest did not produce a redacted bundle.'
    $redactedManifest = Get-ZipEntryText -Path $zip -EntryName 'manifest.json' | ConvertFrom-Json
    Assert-True ($null -eq $redactedManifest.PSObject.Properties['note']) 'Redacted manifest retained an original unsafe field.'
    Assert-True ($redactedManifest.bundleRedacted -eq $true) 'Redacted manifest is missing bundleRedacted=true.'
    Assert-True ($redactedManifest.scanClean -eq $false) 'Redacted manifest is missing scanClean=false.'
    Assert-True ($redactedManifest.originalManifestOmitted -eq $true) 'Redacted manifest does not record original-manifest omission.'
    Write-Host 'PASS: a finding inside manifest.json cannot re-enter through the redacted manifest.'

    # Discovery uses the scanner as a sanitizer on the staged tracked snapshot.
    # The repository positive-control file must remain detectable at source but
    # the staged discovery copy must be safe to upload.
    $discoveryStage = Join-Path ([IO.Path]::GetTempPath()) ('coldbox-secret-scan-discovery-selftest-' + [guid]::NewGuid().ToString('N'))
    $discoveryZip = "$discoveryStage.zip"
    try {
        $repoCopy = Join-Path $discoveryStage 'repo\test'
        New-Item -ItemType Directory -Path $repoCopy -Force | Out-Null
        Copy-Item -LiteralPath $protocolPath -Destination (Join-Path $repoCopy 'protocol.test.js')
        '{"runnerId":"discovery-sanitize-selftest","verdict":"TEST"}' |
            Set-Content -LiteralPath (Join-Path $discoveryStage 'manifest.json') -Encoding UTF8

        $sourceHashBefore = (Get-FileHash -LiteralPath $protocolPath -Algorithm SHA256).Hash
        $screened = Protect-ColdboxDiscoverySnapshot -Root (Join-Path $discoveryStage 'repo') -RepoPath $RepoPath
        Assert-True ($screened.RedactedRunCount -ge 1) 'Discovery sanitizer did not redact the positive-control mnemonic run.'
        Assert-True ($screened.RedactedPaths -contains 'test/protocol.test.js') 'Discovery sanitizer did not report the positive-control path.'
        $sourceHashAfter = (Get-FileHash -LiteralPath $protocolPath -Algorithm SHA256).Hash
        Assert-True ($sourceHashAfter -eq $sourceHashBefore) 'Discovery sanitizer modified the source checkout.'

        $stagedProtocol = [IO.File]::ReadAllText((Join-Path $repoCopy 'protocol.test.js'))
        Assert-True (-not (Test-ColdboxMnemonicShape -Text $stagedProtocol -WordSet $wordSet)) 'Sanitized discovery copy still contains a detectable mnemonic run.'
        Assert-True ($stagedProtocol.Contains('[BIP39-FIXTURE-REDACTED]')) 'Sanitized discovery copy is missing the explicit redaction marker.'

        $publishDiscovery = Publish-ColdboxScannedBundle -Root $discoveryStage -RepoPath $RepoPath -ZipPath $discoveryZip
        Assert-True $publishDiscovery.Clean 'Sanitized discovery bundle did not pass the final secret scan.'
        Assert-True (-not $publishDiscovery.Redacted) 'Sanitized discovery bundle was unexpectedly reduced to a redacted diagnostic bundle.'
        Write-Host 'PASS: tracked positive-control mnemonic is detected at source, sanitized only in the discovery copy, and the final discovery payload remains usable.'
    }
    finally {
        if (Test-Path -LiteralPath $discoveryStage) {
            Remove-Item -LiteralPath $discoveryStage -Recurse -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path -LiteralPath $discoveryZip) {
            Remove-Item -LiteralPath $discoveryZip -Force -ErrorAction SilentlyContinue
        }
    }

    New-Item -ItemType Directory -Path $cleanRoot -Force | Out-Null
    '{"runnerId":"secret-scan-clean-selftest","verdict":"TEST"}' |
        Set-Content -LiteralPath (Join-Path $cleanRoot 'manifest.json') -Encoding UTF8
    'harmless scanner fixture' |
        Set-Content -LiteralPath (Join-Path $cleanRoot 'note.txt') -Encoding UTF8

    $cleanResult = Publish-ColdboxScannedBundle -Root $cleanRoot -RepoPath $RepoPath -ZipPath $cleanZip
    Assert-True $cleanResult.Clean 'Harmless fixture did not scan clean.'
    Assert-True (-not $cleanResult.Redacted) 'Harmless fixture was unexpectedly redacted.'
    $cleanEntries = Get-ZipEntryNames -Path $cleanZip
    Assert-True ($cleanEntries -contains 'manifest.json') 'Clean bundle is missing manifest.json.'
    Assert-True ($cleanEntries -contains 'note.txt') 'Clean bundle is missing harmless payload.'
    Assert-True ($cleanEntries -contains 'scan-report.txt') 'Clean bundle is missing scan-report.txt.'
    Write-Host 'PASS: clean bundle retains ordinary payload plus scan-report.'
}
finally {
    foreach ($p in @($root,$cleanRoot)) {
        if (Test-Path -LiteralPath $p) {
            Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    foreach ($p in @($zip,$cleanZip)) {
        if (Test-Path -LiteralPath $p) {
            Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host 'PASS: secret scanner regression suite complete.'