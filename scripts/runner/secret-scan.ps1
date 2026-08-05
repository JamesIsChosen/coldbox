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
        foreach ($match in [regex]::Matches($line, '(?<![A-Za-z])[a-z]+(?![A-Za-z])')) {
            $word = $match.Value
            if ($WordSet.Contains($word)) {
                $runLength++
                if ($runLength -ge 12) { return $true }
            } else {
                $runLength = 0
            }
        }
    }
    return $false
}
function Redact-ColdboxMnemonicRuns {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][AllowEmptyString()][string]$Text,
        [Parameter(Mandatory=$true)][System.Collections.Generic.HashSet[string]]$WordSet
    )

    $normalized = $Text.Replace("`r`n","`n").Replace("`r","`n")
    $redactedRunCount = 0
    $outLines = @()

    foreach ($line in ($normalized -split "`n")) {
        $matches = @([regex]::Matches($line, '(?<![A-Za-z])[a-z]+(?![A-Za-z])'))
        $spans = @()
        $runStart = -1
        $runEnd = -1
        $runLength = 0

        foreach ($match in $matches) {
            if ($WordSet.Contains($match.Value)) {
                if ($runLength -eq 0) { $runStart = $match.Index }
                $runLength++
                $runEnd = $match.Index + $match.Length
            } else {
                if ($runLength -ge 12) {
                    $spans += [pscustomobject]@{ Start=$runStart; End=$runEnd }
                }
                $runStart = -1
                $runEnd = -1
                $runLength = 0
            }
        }
        if ($runLength -ge 12) {
            $spans += [pscustomobject]@{ Start=$runStart; End=$runEnd }
        }

        $updatedLine = $line
        foreach ($span in @($spans | Sort-Object Start -Descending)) {
            $updatedLine = $updatedLine.Substring(0,$span.Start) +
                '[BIP39-FIXTURE-REDACTED]' +
                $updatedLine.Substring($span.End)
            $redactedRunCount++
        }
        $outLines += $updatedLine
    }

    [pscustomobject]@{
        Text = ($outLines -join "`n")
        RedactedRunCount = $redactedRunCount
    }
}

function Protect-ColdboxDiscoverySnapshot {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Root,
        [Parameter(Mandatory=$true)][string]$RepoPath
    )

    $wordSet = Get-ColdboxBip39EnglishWordSet -RepoPath $RepoPath
    $binaryExtensions = @('.png','.jpg','.jpeg','.gif','.ico','.pdf','.zip','.wasm','.woff','.woff2','.tgz')
    $redactedPaths = @()
    $runCount = 0

    Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue |
        ForEach-Object {
            if ($binaryExtensions -contains $_.Extension.ToLowerInvariant()) { return }
            $raw = try { [IO.File]::ReadAllText($_.FullName) } catch { return }
            if (-not (Test-ColdboxMnemonicShape -Text $raw -WordSet $wordSet)) { return }

            $result = Redact-ColdboxMnemonicRuns -Text $raw -WordSet $wordSet
            if ($result.RedactedRunCount -lt 1) {
                throw 'Discovery mnemonic detector and sanitizer disagreed; refusing to emit a discovery bundle.'
            }

            [IO.File]::WriteAllText(
                $_.FullName,
                $result.Text,
                (New-Object Text.UTF8Encoding($false))
            )

            if (Test-ColdboxMnemonicShape -Text ([IO.File]::ReadAllText($_.FullName)) -WordSet $wordSet) {
                throw 'Discovery mnemonic sanitization left a detectable mnemonic-shaped run.'
            }

            $rel = $_.FullName.Substring($Root.Length).TrimStart('\','/').Replace('\','/')
            $redactedPaths += $rel
            $runCount += $result.RedactedRunCount
        }

    [pscustomobject]@{
        RedactedPaths = @($redactedPaths)
        RedactedRunCount = $runCount
    }
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
        # Never copy the original manifest after a scan finding: the finding may
        # be inside manifest.json itself. Emit a fixed, content-free diagnostic
        # manifest so the rejected payload cannot re-enter through metadata.
        [ordered]@{
            bundleRedacted        = $true
            scanClean             = $false
            findingCount          = $scan.FindingCount
            skippedBinaryCount    = $scan.SkippedCount
            originalManifestOmitted = $true
        } | ConvertTo-Json -Depth 4 |
            Set-Content -LiteralPath (Join-Path $redactedRoot 'manifest.json') -Encoding UTF8

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