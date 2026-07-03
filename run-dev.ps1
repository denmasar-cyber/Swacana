$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Ensure dependencies are installed
if (!(Test-Path (Join-Path $projectRoot 'node_modules'))) {
  Write-Host 'node_modules not found. Running: npm install'
  cd $projectRoot
  npm install
}

# Try to set HOST/PORT for predictable local dev (Next uses PORT)
$env:PORT = $env:PORT

Write-Host 'Starting dev server: npm run dev'
cd $projectRoot
npm run dev

