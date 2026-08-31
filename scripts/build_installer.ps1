param(
  [switch]$RebuildBackend
)

$ErrorActionPreference = "Stop"

$mutexCreated = $false
$script:buildMutex = New-Object System.Threading.Mutex($true, "SIRF_ID_TAURI_BUILD", [ref]$mutexCreated)
if (-not $mutexCreated) {
  throw "Ek installer build pehle se chal raha hai. Dusra CMD/PowerShell build band karke dobara try karein."
}

$frontendDir = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $frontendDir
$backendDir = Join-Path $repoRoot "backend"

Write-Host "Preparing backend..."
Push-Location $backendDir
try {
  $backendExe = Join-Path $backendDir "dist\backend.exe"
  if ((Test-Path $backendExe) -and -not $RebuildBackend) {
    Write-Host "Using existing tested backend executable: $backendExe"
  } else {
    $backendToolsReady = (Test-Path ".\node_modules\.bin\esbuild.cmd") -and (Test-Path ".\node_modules\.bin\postject.cmd")
    if (-not $backendToolsReady) {
      & npm.cmd ci
      if ($LASTEXITCODE -ne 0) { throw "Backend npm dependency install failed." }
    } else {
      Write-Host "Backend dependencies already installed; skipping npm install."
    }
    & npm.cmd run build-exe
    if ($LASTEXITCODE -ne 0) { throw "Backend executable build failed." }
  }
} finally {
  Pop-Location
}

Write-Host "Building frontend..."
Push-Location $frontendDir
try {
  $frontendToolsReady = (Test-Path ".\node_modules\.bin\vite.cmd") -and (Test-Path ".\node_modules\.bin\tauri.cmd")
  if (-not $frontendToolsReady) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw "Frontend npm dependency install failed." }
  } else {
    Write-Host "Frontend dependencies already installed; skipping npm install."
  }
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
  & npm.cmd run copy-backend
  if ($LASTEXITCODE -ne 0) { throw "Backend resource copy failed." }
} finally {
  Pop-Location
}

$stagingRoot = Join-Path $repoRoot (".tauri-build-staging\" + [guid]::NewGuid().ToString("N"))
$stagingFrontend = Join-Path $stagingRoot "frontend"
$stagingTauri = Join-Path $stagingFrontend "src-tauri"
$outputDir = Join-Path $frontendDir "installer-output"

Write-Host "Building Tauri in isolated staging directory: $stagingRoot"
New-Item -ItemType Directory -Path $stagingTauri -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $frontendDir "dist") -Destination $stagingFrontend -Recurse -Force
foreach ($file in @("Cargo.toml", "Cargo.lock", "build.rs", "tauri.conf.json", "backend.exe")) {
  Copy-Item -LiteralPath (Join-Path $frontendDir "src-tauri\$file") -Destination $stagingTauri -Force
}
foreach ($directory in @("src", "icons")) {
  Copy-Item -LiteralPath (Join-Path $frontendDir "src-tauri\$directory") -Destination $stagingTauri -Recurse -Force
}

try {
  Push-Location $stagingFrontend
  try {
    $env:CARGO_BUILD_JOBS = "1"
    $tauriCli = Join-Path $frontendDir "node_modules\.bin\tauri.cmd"
    & $tauriCli build
    if ($LASTEXITCODE -ne 0) { throw "Tauri build failed." }
  } finally {
    Pop-Location
  }

  $bundleDir = Join-Path $stagingTauri "target\release\bundle\nsis"
  $installer = Get-ChildItem -Path $bundleDir -Filter "*.exe" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $installer) { throw "NSIS installer was not found in $bundleDir" }
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
  $finalInstaller = Join-Path $outputDir $installer.Name
  Copy-Item -LiteralPath $installer.FullName -Destination $finalInstaller -Force
} finally {
  if (Test-Path -LiteralPath $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "Installer ready: $finalInstaller"
