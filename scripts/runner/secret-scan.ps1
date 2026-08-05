#Requires -Version 5.1
Set-StrictMode -Version Latest

function Get-ColdboxBip39EnglishWordSet {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$RepoPath)

    $archive = Join-Path $RepoPath 'vendor\npm\@scure\bip39\2.2.0\package.tgz'
    if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) {
        throw 'Vendored @scure/bip39 2.2.0 archive is unavailable.'
    }

    $source = & tar -xOf $archive 'package/wordlists/english.js' 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0 -or -not $source) {
        throw 'Could not read the vendored English BIP-39 wordlist.'
    }

    $start = $source.IndexOf('abandon', [StringComparison]::Ordinal)
    $end = $source.LastIndexOf('zoo', [StringComparison]::Ordinal)
    if ($start -lt 0 -or $end -lt $start) {
        throw 'Vendored English BIP-39 wordlist markers are invalid.'
    }

    $slice = $source.Substring($start, ($end - $start) + 3)
    $words = @(
        [regex]::Matches($slice, '(?<![A-Za-z])[a-z]+(?![A-Za-z])') |
            ForEach-Object { $_.Value }
    )

    if ($words.Count -ne 2048 -or $words[0] -cne 'abandon' -or $words[2047] -cne 'zoo') {
        throw 'Vendored English BIP-39 wordlist did not parse to exactly 2048 words.'
    }

    $set = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)
    foreach ($word in $words) {
        if (-not $set.Add($word)) {
            throw 'Vendored English BIP-39 wordlist contains a duplicate word.'
        }
    }
    return ,$set
}

function Test-ColdboxMnemonicShape {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][AllowEmptyString()][string]$Text,
        [Parameter(Mandatory=$true)][System.Collections.Generic.HashSet[string]]$WordSet
    )

    $normalized = $Text.Replace("`r`n", "`n").Replace("`r", "`n")
    foreach ($line in ($normalized -split "`n")) {
        $runLength = 0
        foreach ($token in ($line -split '[ \t]+')) {
            if (-not $token) { continue }
            $word = [regex]::Replace($token, '^[^a-z]+|[^a-z]+$', '')
            if ($word -cmatch '^[a-z]+$' -and $WordSet.Contains($word)) {
                $runLength++
                if ($runLength -ge 12) { return $true }
            } else {
                $runLength = 0
            }
        }
    }
    return $false
}

function Invoke-ColdboxSecretScan {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Root,
        [Parameter(Mandatory=$true)][string]$RepoPath
    )

    $findings = @()
    $skipped = @()
    $badGlobs = @('*.cbx','*.cbx.bak','*.cbw','*.key','*.pem','*.asc','*.sig','.env','.env.*')
    $keyPrefix = @('xprv','yprv','zprv','tprv','uprv','vprv')
    $binaryExtensions = @('.png','.jpg','.jpeg','.gif','.ico','.pdf','.zip','.wasm','.woff','.woff2','.tgz')

    foreach ($g in $badGlobs) {
        Get-ChildItem -LiteralPath $Root -Recurse -File -Filter $g -ErrorAction SilentlyContinue |
            ForEach-Object {
                $rel = $_.FullName.Substring($Root.Length).TrimStart('\','/')
                $findings += "forbidden file: $rel"
            }
    }

    Get-ChildItem -LiteralPath $Root -Recurse -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -ceq 'secrets' } |
        ForEach-Object {
            $rel = $_.FullName.Substring($Root.Length).TrimStart('\','/')
            $findings += "forbidden directory: $rel"
        }

    $wordSet = $null
    try {
        $wordSet = Get-ColdboxBip39EnglishWordSet -RepoPath $RepoPath
    } catch {
        $findings += 'BIP-39 wordlist unavailable; mnemonic scan could not be established'
    }

    Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue |
        ForEach-Object {
            $rel = $_.FullName.Substring($Root.Length).TrimStart('\','/')
            $ext = $_.Extension.ToLowerInvariant()
            if ($binaryExtensions -contains $ext) {
                $skipped += "binary extension skipped: $rel"
                return
            }

            try {
                $text = [IO.File]::ReadAllText($_.FullName)
            } catch {
                $findings += "unreadable candidate text file: $rel"
                return
            }

            foreach ($p in $keyPrefix) {
                if ($text -cmatch "\b$p[0-9A-HJ-NP-Za-km-z]{50,}") {
                    $findings += "extended private key shape in $rel"
                    break
                }
            }

            if ($null -ne $wordSet -and (Test-ColdboxMnemonicShape -Text $text -WordSet $wordSet)) {
                $findings += "BIP-39 mnemonic-shaped word run in $rel"
            }
        }

    $lines = @()
    if ($findings.Count -eq 0) {
        $lines += 'CLEAN - no vault, private-key, or BIP-39 mnemonic-shaped content found in candidate text.'
    } else {
        $lines += "FAILED - $($findings.Count) finding(s). Paths only; matched content is deliberately not printed."
        $lines += $findings
    }

    if ($skipped.Count -gt 0) {
        $lines += "SKIPPED-BINARY - $($skipped.Count) file(s) excluded by documented binary extension:"
        $lines += $skipped
    } else {
        $lines += 'SKIPPED-BINARY - 0 files.'
    }

    [IO.File]::WriteAllText(
        (Join-Path $Root 'scan-report.txt'),
        (($lines -join "`n") + "`n"),
        (New-Object Text.UTF8Encoding($false))
    )

    [pscustomobject]@{
        Clean = ($findings.Count -eq 0)
        FindingCount = $findings.Count
        SkippedCount = $skipped.Count
    }
}

function Publish-ColdboxScannedBundle {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Root,
        [Parameter(Mandatory=$true)][string]$RepoPath,
        [Parameter(Mandatory=$true)][string]$ZipPath
    )

    $redactedRoot = "$Root-redacted"
    if (Test-Path -LiteralPath $redactedRoot) {
        Remove-Item -LiteralPath $redactedRoot -Recurse -Force
    }

    try {
        $scan = Invoke-ColdboxSecretScan -Root $Root -RepoPath $RepoPath

        if (Test-Path -LiteralPath $ZipPath) {
            Remove-Item -LiteralPath $ZipPath -Force
        }

        if ($scan.Clean) {
            Compress-Archive -Path (Join-Path $Root '*') -DestinationPath $ZipPath -CompressionLevel Optimal
            return [pscustomobject]@{
                Clean = $true
                Redacted = $false
                FindingCount = 0
                SkippedCount = $scan.SkippedCount
            }
        }

        New-Item -ItemType Directory -Path $redactedRoot -Force | Out-Null
        $manifestPath = Join-Path $Root 'manifest.json'
        if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
            throw 'Cannot emit a redacted bundle because manifest.json is missing.'
        }

        try {
            $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
            if ($manifest.PSObject.Properties['bundleRedacted']) {
                $manifest.bundleRedacted = $true
            } else {
                $manifest | Add-Member -NotePropertyName bundleRedacted -NotePropertyValue $true
            }
            if ($manifest.PSObject.Properties['scanClean']) {
                $manifest.scanClean = $false
            } else {
                $manifest | Add-Member -NotePropertyName scanClean -NotePropertyValue $false
            }
            $manifest | ConvertTo-Json -Depth 8 |
                Set-Content -LiteralPath (Join-Path $redactedRoot 'manifest.json') -Encoding UTF8
        } catch {
            throw 'Could not prepare the redacted manifest.'
        }

        Copy-Item -LiteralPath (Join-Path $Root 'scan-report.txt') -Destination (Join-Path $redactedRoot 'scan-report.txt')
        Compress-Archive -Path (Join-Path $redactedRoot '*') -DestinationPath $ZipPath -CompressionLevel Optimal

        return [pscustomobject]@{
            Clean = $false
            Redacted = $true
            FindingCount = $scan.FindingCount
            SkippedCount = $scan.SkippedCount
        }
    } finally {
        if (Test-Path -LiteralPath $Root) {
            Remove-Item -LiteralPath $Root -Recurse -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path -LiteralPath $redactedRoot) {
            Remove-Item -LiteralPath $redactedRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}