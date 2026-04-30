[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-CellValue {
  param(
    [Parameter(Mandatory = $true)]$Cell,
    [Parameter(Mandatory = $true)][string[]]$SharedStrings
  )

  $cellType = ''
  try { $cellType = [string]$Cell.t } catch { $cellType = '' }

  if ($cellType -eq 's') {
    try { return $SharedStrings[[int]$Cell.v] } catch { return '' }
  }

  if ($cellType -eq 'inlineStr') {
    try { return [string]$Cell.is.t } catch { return '' }
  }

  try { return [string]$Cell.v } catch { return '' }

  return ''
}

function Normalize-Blankish {
  param([string]$Value)
  $trimmed = [string]$Value
  $trimmed = $trimmed.Trim()
  if (-not $trimmed -or $trimmed.ToUpperInvariant() -eq 'NULL') {
    return ''
  }
  return $trimmed
}

function Normalize-Frequency {
  param([string]$Value)

  $normalized = (Normalize-Blankish $Value).ToLowerInvariant()
  if (-not $normalized) {
    return ''
  }

  $map = @{
    'every day in the morning' = 'Each morning'
    'every morning at 10am' = 'Each morning'
    'every morning before food' = 'Each morning'
    'every night' = 'Each night'
    'each day at 9pm' = 'Each night'
    'four times a day' = 'Four times daily'
    'three times a day' = 'Three times daily'
    'three times a day before meals' = 'Three times daily'
    'three times a day with meals' = 'Three times daily'
    'twice a day in the morning and at night' = 'Twice daily'
    'twice a day in the morning and at teatime' = 'Twice daily'
    'twice a day in the morning and at lunchtime' = 'Twice daily'
    'twice a day at 9am and 9pm' = 'Twice daily'
    'every 12 hours at 8am and 8pm' = 'Twelve hourly'
    'every 12 hours at 9am and 9pm' = 'Twelve hourly'
    'every 12 hours at 10am and 10pm' = 'Twelve hourly'
    'every 8 hours' = 'Eight hourly'
    'every 4 hours (6 times a day)' = 'Four hourly'
    'every 6 hours' = 'Six hourly'
    'every 3 hours' = 'Three hourly'
    'once a week at 6am' = 'Once weekly'
  }

  if ($map.ContainsKey($normalized)) {
    return $map[$normalized]
  }

  return (Normalize-Blankish $Value)
}

function Get-DerivedUnit {
  param([string]$Strength)

  $normalized = Normalize-Blankish $Strength
  if (-not $normalized) {
    return ''
  }

  $patterns = @(
    @{ Pattern = '(?i)\bmicrograms?\b'; Unit = 'micrograms' }
    @{ Pattern = '(?i)\bmcg\b'; Unit = 'micrograms' }
    @{ Pattern = '(?i)\bmg\b'; Unit = 'mg' }
    @{ Pattern = '(?i)\bg\b'; Unit = 'g' }
    @{ Pattern = '(?i)\bmmol\b'; Unit = 'mmol' }
    @{ Pattern = '(?i)\bunits?\b'; Unit = 'units' }
    @{ Pattern = '(?i)\bml\b'; Unit = 'mL' }
    @{ Pattern = '(?i)\btablets?\b'; Unit = 'tablet' }
    @{ Pattern = '(?i)\bcapsules?\b'; Unit = 'capsule' }
    @{ Pattern = '(?i)\bpuffs?\b'; Unit = 'puff' }
  )

  foreach ($entry in $patterns) {
    if ($normalized -match $entry.Pattern) {
      return $entry.Unit
    }
  }

  return ''
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

$resolvedInput = (Resolve-Path $InputPath).Path
$resolvedOutput = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)

$tempCopy = Join-Path ([System.IO.Path]::GetDirectoryName($resolvedOutput)) ([System.IO.Path]::GetRandomFileName() + '.xlsx')
Copy-Item -LiteralPath $resolvedInput -Destination $tempCopy -Force

try {
  $zip = [System.IO.Compression.ZipFile]::OpenRead($tempCopy)

  $sharedStrings = @()
  $sharedStringsEntry = $zip.GetEntry('xl/sharedStrings.xml')
  if ($sharedStringsEntry) {
    $reader = [System.IO.StreamReader]::new($sharedStringsEntry.Open())
    try {
      $sharedStringsXml = [xml]$reader.ReadToEnd()
    } finally {
      $reader.Close()
    }

    foreach ($si in $sharedStringsXml.sst.si) {
      if ($si.t) {
        if ($si.t -is [System.Xml.XmlElement]) {
          $sharedStrings += [string]$si.t.InnerText
        } else {
          $sharedStrings += [string]$si.t
        }
      } elseif ($si.r) {
        $parts = @()
        foreach ($run in $si.r) {
          if ($run.t) {
            if ($run.t -is [System.Xml.XmlElement]) {
              $parts += [string]$run.t.InnerText
            } else {
              $parts += [string]$run.t
            }
          }
        }
        $sharedStrings += ($parts -join '')
      } else {
        $sharedStrings += ''
      }
    }
  }

  $sheetEntry = $zip.GetEntry('xl/worksheets/sheet1.xml')
  $reader = [System.IO.StreamReader]::new($sheetEntry.Open())
  try {
    $sheetXml = [xml]$reader.ReadToEnd()
  } finally {
    $reader.Close()
  }

  $rows = @()
  foreach ($row in ($sheetXml.worksheet.sheetData.row | Select-Object -Skip 1)) {
    $cells = @{}
    foreach ($cell in $row.c) {
      $column = ([string]$cell.r) -replace '[0-9]', ''
      $cells[$column] = Get-CellValue -Cell $cell -SharedStrings $sharedStrings
    }

    $strength = Normalize-Blankish $cells['B']
    $rows += [pscustomobject]@{
      drug_name        = Normalize-Blankish $cells['A']
      strength         = $strength
      unit             = Get-DerivedUnit $strength
      form             = Normalize-Blankish $cells['D']
      default_route    = Normalize-Blankish $cells['E']
      aliases          = ''
      category         = ''
      usual_frequencies = Normalize-Frequency $cells['H']
      default_dose     = Normalize-Blankish $cells['I']
      max_dose         = Normalize-Blankish $cells['J']
      notes            = Normalize-Blankish $cells['K']
    }
  }

  $rows | Export-Csv -LiteralPath $resolvedOutput -NoTypeInformation -Encoding UTF8
} finally {
  if ($zip) {
    $zip.Dispose()
  }
  if (Test-Path $tempCopy) {
    Remove-Item -LiteralPath $tempCopy -Force
  }
}
