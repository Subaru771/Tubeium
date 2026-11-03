# Captures the actual bundled Tubeium HTML/CSS screens. These are UI-only captures:
# no account, YouTube network traffic, Electron backend, or sample user data.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$target = Join-Path $root 'docs\screenshots'
New-Item -ItemType Directory -Force -Path $target | Out-Null
$browserPaths = @(
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
)
$browser = $browserPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw 'Microsoft Edge or Google Chrome is required to capture UI screenshots.' }
$pages = @(
  @{ Page='settings'; Width=1440; Height=900 },
  @{ Page='downloads'; Width=1440; Height=900 },
  @{ Page='welcome'; Width=1200; Height=1000 }
)
foreach ($page in $pages) {
  $name = $page.Page
  $source = Join-Path $root "src\$name.html"
  if (-not (Test-Path $source)) { throw "Missing Tubeium UI page: $source" }
  $url = ([System.Uri]::new($source)).AbsoluteUri
  $output = Join-Path $target "$name.png"
  if (Test-Path $output) { Remove-Item $output -Force }
  $profile = Join-Path $env:TEMP "tubeium-screenshot-$name-$PID"
  try {
    $params = @(
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      "--window-size=$($page.Width),$($page.Height)",
      "--user-data-dir=`"$profile`"",
      "--screenshot=`"$output`"",
      '--virtual-time-budget=2500',
      "`"$url`""
    )
    $proc = Start-Process -FilePath $browser -ArgumentList $params -PassThru -Wait -NoNewWindow
    if (-not (Test-Path $output)) { throw "Browser did not create $output (exit $($proc.ExitCode))" }
    $length = (Get-Item $output).Length
    if ($length -lt 10000) { throw "UI screenshot unexpectedly small: $name ($length bytes)" }
    # Verify PNG file signature, not just filename/size.
    $bytes = [System.IO.File]::ReadAllBytes($output)
    if ($bytes[0] -ne 137 -or $bytes[1] -ne 80 -or $bytes[2] -ne 78 -or $bytes[3] -ne 71) {
      throw "Invalid PNG screenshot: $output"
    }
    Write-Host "Captured $name ($length bytes)"
  } finally {
    if (Test-Path $profile) { Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue }
  }
}
Write-Host 'Tubeium bundled UI screenshots generated (not runtime acceptance tests).'
