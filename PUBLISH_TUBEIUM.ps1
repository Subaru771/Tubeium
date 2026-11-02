$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$repo = 'Subaru771/Tubeium'
$url = 'https://github.com/' + $repo + '.git'
function Fail([string]$message) { throw $message }
function Invoke-Git([string[]]$arguments) {
  & git @arguments
  if ($LASTEXITCODE -ne 0) { Fail "Git operation failed: git $($arguments -join ' ')" }
}
Write-Host 'Tubeium v4.5.4 - publish source to GitHub' -ForegroundColor Cyan
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Fail 'Git is not installed. Install Git for Windows from https://git-scm.com/download/win and run this script again.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Fail 'npm is required to generate the genuine dependency lockfile. Install Node.js and run again.'
}
$pkg = Get-Content -Raw -LiteralPath './package.json' | ConvertFrom-Json
if ($pkg.name -ne 'tubeium' -or $pkg.version -ne '4.5.4') { Fail 'Unexpected package. Only publish the matching Tubeium v4.5.4 source.' }
if (-not (Test-Path './package-lock.json')) {
  Write-Host 'Generating genuine package-lock.json using npm...' -ForegroundColor Yellow
  & npm install --package-lock-only --ignore-scripts --no-audit --no-fund
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path './package-lock.json')) { Fail 'Could not generate npm lockfile; repository has not been published.' }
}
& npm run verify:dependencies
if ($LASTEXITCODE -ne 0) { Fail 'Dependency verification failed. Nothing was pushed.' }
$license = Get-Content -Raw -LiteralPath './LICENSE'
if ($license -match 'provisional copyright notice') {
  Write-Host ''
  Write-Host 'LICENSING NOTICE: The existing LICENSE is all-rights-reserved.' -ForegroundColor Yellow
  Write-Host 'A public repository is NOT open source until you choose and publish a suitable license.'
  $answer = Read-Host 'Publish the source publicly with the CURRENT license for now? Type PUBLISH to approve'
  if ($answer -cne 'PUBLISH') { Fail 'Publication stopped. Decide the license and retry.' }
}
if (-not (Test-Path './.git')) {
  & git init -b main
  if ($LASTEXITCODE -ne 0) {
    Invoke-Git -arguments @('init')
    Invoke-Git -arguments @('checkout','-B','main')
  }
}
$usr = & git config user.name
if (-not $usr) { Fail 'Git author not configured. Run: git config --global user.name "Your Name"' }
$mail = & git config user.email
if (-not $mail) { Fail 'Git email not configured. Run: git config --global user.email "you@example.com" (prefer a GitHub noreply address).' }
Invoke-Git -arguments @('add','.')
$staged = @(& git diff --cached --name-only)
$forbidden = @($staged | Where-Object { $_ -match '(?i)(^|/)(node_modules|dist)/|\.env($|\.)|cookies\.txt$|session-export|cookie-export|\.pfx$|\.p12$|\.pem$|_credentials\.json$' })
if ($forbidden.Count -gt 0) { Fail "Possible secrets or builds are staged: $($forbidden -join ', '); nothing was pushed." }
if ($staged.Count -gt 0) { Invoke-Git -arguments @('commit','-m','Prepare Tubeium v4.5.4 Windows beta source') }
$remotes = @(& git remote)
if ($remotes -notcontains 'origin') { Invoke-Git -arguments @('remote','add','origin',$url) }
else {
  $current = (& git remote get-url origin).Trim()
  if ($current -ne $url -and $current -ne ('git@github.com:' + $repo + '.git')) { Fail 'Existing origin points to a different repository. Refusing to overwrite it.' }
}
Write-Host ''
Write-Host "Target: https://github.com/$repo" -ForegroundColor Cyan
if (Get-Command gh -ErrorAction SilentlyContinue) {
  & gh auth status *> $null
  if ($LASTEXITCODE -eq 0) {
    & gh repo view $repo --json name *> $null
    if ($LASTEXITCODE -ne 0) {
      Write-Host 'Repository does not exist. Creating PUBLIC repository...' -ForegroundColor Yellow
      $confirm = Read-Host 'Type CREATE to create the public GitHub repository'
      if ($confirm -cne 'CREATE') { Fail 'Publication cancelled.' }
      & gh repo create $repo --public --description 'A customizable, unofficial YouTube desktop client for Windows' --disable-wiki
      if ($LASTEXITCODE -ne 0) { Fail 'GitHub repository creation failed. Try https://github.com/new' }
    }
  }
}
Write-Host 'If the repository does not exist yet, create it now at https://github.com/new' -ForegroundColor Yellow
Write-Host 'Owner: Subaru771, Name: Tubeium, Public; do NOT initialize with a README or license.'
$ready = Read-Host 'After the empty repository exists, type PUSH to upload the source'
if ($ready -cne 'PUSH') { Fail 'Publication cancelled before push.' }
Invoke-Git -arguments @('push','-u','origin','main')
Write-Host "Source uploaded: https://github.com/$repo" -ForegroundColor Green
Write-Host 'Next: verify GitHub Actions and create an explicitly labelled beta release. Do not publish as stable yet.'
