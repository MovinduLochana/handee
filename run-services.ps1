<#
.SYNOPSIS
    Orchestration script to launch Handee micro-services and applications.

.DESCRIPTION
    Runs services across the Handee platform with flag-based selective profiles:
    1. Backend and AI workflow only:                 -BackendAndAiOnly     (or -Core)
    2. Backend, AI workflow and mobile only:         -BackendAiAndMobileOnly (or -Mobile)
    3. Backend, AI workflow and web only:            -BackendAiAndWebOnly    (or -Web)
    4. All services (Backend + AI + Web + Mobile):   -All                  (default)

.PARAMETER BackendAndAiOnly
    Runs only ASP.NET Core Web API and Python FastAPI LangGraph AI service.

.PARAMETER BackendAiAndMobileOnly
    Runs ASP.NET Core Web API, Python AI service, and the Flutter mobile application.

.PARAMETER BackendAiAndWebOnly
    Runs ASP.NET Core Web API, Python AI service, and the React Vite web portal.

.PARAMETER All
    Runs all platform services: Backend, AI workflow, React web portal, and Flutter mobile app.

.PARAMETER Stop
    Kills any running service processes started by this script.

.EXAMPLE
    .\run-services.ps1 -BackendAndAiOnly
    .\run-services.ps1 -Mobile
    .\run-services.ps1 -Web
    .\run-services.ps1 -All
    .\run-services.ps1 -Stop
#>

[CmdletBinding(DefaultParameterSetName = "All")]
param(
    [Parameter(ParameterSetName = "BackendAndAi")]
    [Alias("Core", "api-ai")]
    [switch]$BackendAndAiOnly,

    [Parameter(ParameterSetName = "Mobile")]
    [Alias("Mobile", "with-mobile")]
    [switch]$BackendAiAndMobileOnly,

    [Parameter(ParameterSetName = "Web")]
    [Alias("Web", "with-web")]
    [switch]$BackendAiAndWebOnly,

    [Parameter(ParameterSetName = "All")]
    [Alias("a")]
    [switch]$All,

    [Parameter(ParameterSetName = "Stop")]
    [Alias("kill")]
    [switch]$Stop
)

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot

# -----------------------------------------------------------------------------
# Stop Mode
# -----------------------------------------------------------------------------
if ($Stop) {
    Write-Host "`n[Handee] Stopping all Handee background services..." -ForegroundColor Yellow
    Get-Process -Name "Handee.Api", "uvicorn", "vite" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  Stopping $($_.ProcessName) (PID: $($_.Id))..." -ForegroundColor DarkGray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[Handee] All background services stopped.`n" -ForegroundColor Green
    exit 0
}

# -----------------------------------------------------------------------------
# Determine Services To Run
# -----------------------------------------------------------------------------
$RunBackend = $true
$RunAi = $true
$RunWeb = $false
$RunMobile = $false

if ($BackendAndAiOnly) {
    $ProfileName = "1. Backend & AI Workflow Only"
    $RunWeb = $false
    $RunMobile = $false
}
elseif ($BackendAiAndMobileOnly) {
    $ProfileName = "2. Backend, AI Workflow & Mobile"
    $RunWeb = $false
    $RunMobile = $true
}
elseif ($BackendAiAndWebOnly) {
    $ProfileName = "3. Backend, AI Workflow & Web"
    $RunWeb = $true
    $RunMobile = $false
}
else {
    $ProfileName = "4. All Services (Backend, AI, Web, Mobile)"
    $RunWeb = $true
    $RunMobile = $true
}

Clear-Host
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "           HANDEE PLATFORM SERVICE RUNNER                        " -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Selected Profile : $ProfileName" -ForegroundColor Yellow
Write-Host " Working Directory: $RootDir" -ForegroundColor DarkGray
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# Dependency Checks
# -----------------------------------------------------------------------------
function Test-CommandAvailable {
    param([string]$Cmd)
    return (Get-Command $Cmd -ErrorAction SilentlyContinue) -ne $null
}

if (-not (Test-CommandAvailable "dotnet")) {
    Write-Error ".NET SDK ('dotnet') not found in PATH. Please install .NET 9/10 SDK."
}
if (-not (Test-CommandAvailable "python")) {
    Write-Error "Python not found in PATH. Please install Python 3.11+."
}
if ($RunWeb -and -not (Test-CommandAvailable "npm")) {
    Write-Error "Node.js / npm not found in PATH. Required to run React web portal."
}
if ($RunMobile -and -not (Test-CommandAvailable "flutter")) {
    Write-Error "Flutter SDK not found in PATH. Required to run mobile application."
}

# Helper to launch a service in a separate PowerShell window with title
function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$WorkingDirectory,
        [string]$CommandText,
        [string]$Color = "Cyan"
    )

    $encodedCommand = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes(@"
`$host.UI.RawUI.WindowTitle = '$Title'
Write-Host '===================================================' -ForegroundColor $Color
Write-Host ' Starting: $Title' -ForegroundColor White
Write-Host ' Path    : $WorkingDirectory' -ForegroundColor DarkGray
Write-Host '===================================================' -ForegroundColor $Color
Set-Location '$WorkingDirectory'
$CommandText
"@))

    $shellExe = if (Test-CommandAvailable "pwsh") { "pwsh.exe" } else { "powershell.exe" }
    Start-Process $shellExe -ArgumentList "-NoExit", "-EncodedCommand", $encodedCommand -WorkingDirectory $WorkingDirectory
}

# -----------------------------------------------------------------------------
# 1. Start AI Agent Subsystem (FastAPI + LangGraph)
# -----------------------------------------------------------------------------
if ($RunAi) {
    Write-Host "[1/4] Launching AI Agent Subsystem (LangGraph / FastAPI on :8000)..." -ForegroundColor Green
    $AgentsDir = Join-Path $RootDir "agents"
    $AiCmd = "python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload"
    Start-ServiceWindow -Title "Handee - AI Agent Service (Port 8000)" -WorkingDirectory $AgentsDir -CommandText $AiCmd -Color "Magenta"
}

# -----------------------------------------------------------------------------
# 2. Start ASP.NET Core Web API Backend
# -----------------------------------------------------------------------------
if ($RunBackend) {
    Write-Host "[2/4] Launching ASP.NET Core Backend (Ports 5057, 5059 & 5009)..." -ForegroundColor Green
    $BackendDir = Join-Path $RootDir "src\backend\Handee.Api"
    $BackendCmd = "dotnet run --urls `"http://0.0.0.0:5057;http://0.0.0.0:5059;http://0.0.0.0:5009`""
    Start-ServiceWindow -Title "Handee - Backend API (Ports 5057 & 5059)" -WorkingDirectory $BackendDir -CommandText $BackendCmd -Color "Cyan"
}

# -----------------------------------------------------------------------------
# 3. Start React Web Portal (Vite)
# -----------------------------------------------------------------------------
if ($RunWeb) {
    Write-Host "[3/4] Launching React Web Portal (Vite on :5173)..." -ForegroundColor Green
    $WebDir = Join-Path $RootDir "web"
    $WebCmd = "npm run dev"
    Start-ServiceWindow -Title "Handee - React Web Portal (Port 5173)" -WorkingDirectory $WebDir -CommandText $WebCmd -Color "Yellow"
}

# -----------------------------------------------------------------------------
# 4. Start Flutter Mobile App
# -----------------------------------------------------------------------------
if ($RunMobile) {
    Write-Host "[4/4] Launching Flutter Mobile App..." -ForegroundColor Green
    $AppDir = Join-Path $RootDir "app"
    $MobileCmd = "flutter run"
    Start-ServiceWindow -Title "Handee - Flutter Mobile App" -WorkingDirectory $AppDir -CommandText $MobileCmd -Color "Blue"
}

# -----------------------------------------------------------------------------
# Dashboard Summary
# -----------------------------------------------------------------------------
Start-Sleep -Seconds 1
Write-Host "`n-----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "               ACTIVE SERVICES DASHBOARD                         " -ForegroundColor White
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan

if ($RunBackend) {
    Write-Host "  [ASP.NET Core Backend]   http://localhost:5057  (Web & API endpoint)" -ForegroundColor Green
    Write-Host "                           http://localhost:5059  (Alternate endpoint)" -ForegroundColor DarkGreen
    Write-Host "                           http://localhost:5009  (Mobile emulator alias 10.0.2.2)" -ForegroundColor DarkGreen
    Write-Host "                           OpenAPI: http://localhost:5057/openapi/v1.json" -ForegroundColor DarkGray
}

if ($RunAi) {
    Write-Host "  [AI Agent Subsystem]     http://localhost:8000  (Internal service)" -ForegroundColor Magenta
    Write-Host "                           Health : http://localhost:8000/health" -ForegroundColor DarkMagenta
    Write-Host "                           Swagger: http://localhost:8000/docs" -ForegroundColor DarkMagenta
}

if ($RunWeb) {
    Write-Host "  [React Web Portal]       http://localhost:5173" -ForegroundColor Yellow
}

if ($RunMobile) {
    Write-Host "  [Flutter Mobile App]     Running via Flutter tooling (live hot-reload)" -ForegroundColor Cyan
}

Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " Note: Each service runs in its own window for live logs & hot reload." -ForegroundColor DarkGray
Write-Host " To stop all services later, run:" -ForegroundColor DarkGray
Write-Host "   .\run-services.ps1 -Stop`n" -ForegroundColor White
