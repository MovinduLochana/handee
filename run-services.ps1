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
    [switch]$Stop,

    [Parameter()]
    [ValidateSet("Local", "Cloud")]
    [string]$Target = "Local",

    [Parameter()]
    [switch]$CloudDb
)

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot
$PidFile = Join-Path $RootDir ".handee-pids.json"

# -----------------------------------------------------------------------------
# Stop Mode
# -----------------------------------------------------------------------------
if ($Stop) {
    Write-Host "`n[Handee] Stopping all Handee services..." -ForegroundColor Yellow

    # 1. Kill tracked process trees from PID file
    if (Test-Path $PidFile) {
        try {
            $savedPids = Get-Content $PidFile -Raw | ConvertFrom-Json
            if ($savedPids) {
                foreach ($p in $savedPids) {
                    if ($p -and (Get-Process -Id $p -ErrorAction SilentlyContinue)) {
                        Write-Host "  Stopping spawned window and child processes (PID: $p)..." -ForegroundColor DarkGray
                        taskkill.exe /F /T /PID $p 2>$null | Out-Null
                    }
                }
            }
        } catch {
            Write-Warning "Failed to parse $PidFile : $_"
        }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }

    # 2. Terminate any console window titled "Handee - *"
    Get-Process | Where-Object { $_.MainWindowTitle -like "Handee - *" } | ForEach-Object {
        Write-Host "  Closing console window '$($_.MainWindowTitle)' (PID: $($_.Id))..." -ForegroundColor DarkGray
        taskkill.exe /F /T /PID $_.Id 2>$null | Out-Null
    }

    # 3. Terminate any processes holding platform ports: 5057 (Web API), 5000 (Mobile API), 8000 (AI Agent), 5173 (React Web)
    $TargetPorts = @(5057, 5000, 8000, 5173)
    foreach ($port in $TargetPorts) {
        $pidsToKill = @()
        try {
            $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
            if ($conns) {
                $pidsToKill += ($conns | Select-Object -ExpandProperty OwningProcess -Unique)
            }
        } catch {}

        # Fallback parsing via netstat
        if (-not $pidsToKill) {
            $netstatMatches = netstat -ano | Select-String ":$port\s+.*LISTENING\s+(\d+)"
            foreach ($match in $netstatMatches) {
                if ($match.Matches.Groups[1].Value) {
                    $pidsToKill += [int]$match.Matches.Groups[1].Value
                }
            }
        }

        foreach ($procId in ($pidsToKill | Select-Object -Unique)) {
            if ($procId -gt 4) {
                Write-Host "  Freeing port $port by stopping process tree (PID: $procId)..." -ForegroundColor DarkGray
                taskkill.exe /F /T /PID $procId 2>$null | Out-Null
            }
        }
    }

    # 4. Cleanup any orphan processes by image name
    Get-Process -Name "handee.API", "Handee.Api" -ErrorAction SilentlyContinue | ForEach-Object {
        taskkill.exe /F /T /PID $_.Id 2>$null | Out-Null
    }

    Write-Host "[Handee] All background services and console windows stopped.`n" -ForegroundColor Green
    exit 0
}

# -----------------------------------------------------------------------------
# Determine Services To Run
# -----------------------------------------------------------------------------
$RunBackend = $true
$RunAi      = $true
$RunWeb     = $false
$RunMobile  = $false

if ($BackendAndAiOnly) {
    $ProfileName = "1. Backend & AI Workflow Only"
    $RunWeb      = $false
    $RunMobile   = $false
}
elseif ($BackendAiAndMobileOnly) {
    $ProfileName = "2. Backend, AI Workflow & Mobile"
    $RunWeb      = $false
    $RunMobile   = $true
}
elseif ($BackendAiAndWebOnly) {
    $ProfileName = "3. Backend, AI Workflow & Web"
    $RunWeb      = $true
    $RunMobile   = $false
}
else {
    $ProfileName = "4. All Services (Backend, AI, Web, Mobile)"
    $RunWeb      = $true
    $RunMobile   = $true
}

Clear-Host
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "           HANDEE PLATFORM SERVICE RUNNER                        " -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Selected Profile : $ProfileName" -ForegroundColor Yellow
Write-Host " Target Topology  : $Target (Web & Mobile -> $Target Backend)" -ForegroundColor $(if ($Target -eq "Local") { "Green" } else { "Magenta" })
if ($CloudDb) {
    Write-Host " Database Override: Neon Cloud PostgreSQL forced via -CloudDb" -ForegroundColor Magenta
}
Write-Host " Working Directory: $RootDir" -ForegroundColor DarkGray
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan

# Terminate any lingering backend process to prevent .exe file locking during dotnet build
Get-Process -Name "handee.API", "Handee.Api" -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

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

# Track PIDs of newly spawned service windows
$SpawnedPids = @()

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
    $proc = Start-Process $shellExe -ArgumentList "-NoExit", "-EncodedCommand", $encodedCommand -WorkingDirectory $WorkingDirectory -PassThru
    return $proc.Id
}

# -----------------------------------------------------------------------------
# 1. Start AI Agent Subsystem (FastAPI + LangGraph)
# -----------------------------------------------------------------------------
if ($RunAi) {
    Write-Host "[1/4] Launching AI Agent Subsystem (LangGraph / FastAPI on :8000)..." -ForegroundColor Green
    $AgentsDir = Join-Path $RootDir "agents"
    $AiCmd = "python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload"
    $pid1 = Start-ServiceWindow -Title "Handee - AI Agent Service (Port 8000)" -WorkingDirectory $AgentsDir -CommandText $AiCmd -Color "Magenta"
    if ($pid1) { $SpawnedPids += $pid1 }
}

# -----------------------------------------------------------------------------
# 2. Start ASP.NET Core Web API Backend
# -----------------------------------------------------------------------------
if ($RunBackend) {
    $useCloudDbFlag = ($CloudDb -or $Target -eq "Cloud")
    $dbModeText = if ($useCloudDbFlag) { "CLOUD DB (Neon)" } else { "LOCAL DB (PostgreSQL)" }
    Write-Host "[2/4] Launching ASP.NET Core Backend (Ports 5057 & 5000) [$dbModeText]..." -ForegroundColor Green
    $BackendDir = Join-Path $RootDir "src\backend\Handee.Api"
    $envPrefix = if ($useCloudDbFlag) { "`$env:USE_CLOUD_DB='true'; " } else { "`$env:USE_CLOUD_DB='false'; " }
    $BackendCmd = "$envPrefix dotnet run --urls `"http://0.0.0.0:5057;http://0.0.0.0:5000`""
    $pid2 = Start-ServiceWindow -Title "Handee - Backend API [$dbModeText] (Ports 5057 & 5000)" -WorkingDirectory $BackendDir -CommandText $BackendCmd -Color "Cyan"
    if ($pid2) { $SpawnedPids += $pid2 }
}

# -----------------------------------------------------------------------------
# 3. Start React Web Portal (Vite)
# -----------------------------------------------------------------------------
if ($RunWeb) {
    $webScript = if ($Target -eq "Cloud") { "npm run dev:cloud" } else { "npm run dev:local" }
    $webTargetText = if ($Target -eq "Cloud") { "CLOUD AZURE (https://sefproject...)" } else { "LOCAL (http://localhost:5057)" }
    Write-Host "[3/4] Launching React Web Portal (Vite on :5173) [Target: $webTargetText]..." -ForegroundColor Green
    $WebDir = Join-Path $RootDir "web"
    $WebCmd = $webScript
    $pid3 = Start-ServiceWindow -Title "Handee - React Web Portal [TARGET: $Target]" -WorkingDirectory $WebDir -CommandText $WebCmd -Color "Yellow"
    if ($pid3) { $SpawnedPids += $pid3 }
}

# -----------------------------------------------------------------------------
# 4. Start Flutter Mobile App
# -----------------------------------------------------------------------------
if ($RunMobile) {
    $flutterLocalArg = if ($Target -eq "Cloud") { "--dart-define=USE_LOCAL=false" } else { "--dart-define=USE_LOCAL=true" }
    $mobileTargetText = if ($Target -eq "Cloud") { "CLOUD AZURE (https://sefproject...)" } else { "LOCAL (http://10.0.2.2:5057)" }
    Write-Host "[4/4] Launching Flutter Mobile App [Target: $mobileTargetText]..." -ForegroundColor Green
    $AppDir = Join-Path $RootDir "app"
    $MobileCmd = "flutter run $flutterLocalArg"
    $pid4 = Start-ServiceWindow -Title "Handee - Flutter Mobile App [TARGET: $Target]" -WorkingDirectory $AppDir -CommandText $MobileCmd -Color "Blue"
    if ($pid4) { $SpawnedPids += $pid4 }
}

# Persist PIDs for clean -Stop execution
if ($SpawnedPids) {
    $SpawnedPids | ConvertTo-Json | Set-Content $PidFile
}

# -----------------------------------------------------------------------------
# Dashboard Summary
# -----------------------------------------------------------------------------
Start-Sleep -Seconds 1
Write-Host "`n-----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "               ACTIVE SERVICES DASHBOARD                         " -ForegroundColor White
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " Topology Target Mode : $Target" -ForegroundColor $(if ($Target -eq "Local") { "Green" } else { "Magenta" })

if ($RunBackend) {
    $backendDb = if ($CloudDb -or $Target -eq "Cloud") { "Cloud Neon PostgreSQL (neondb)" } else { "Local PostgreSQL (HandeeDb:5432)" }
    Write-Host "  [ASP.NET Core Backend]   http://localhost:5057  (Web endpoint)" -ForegroundColor Green
    Write-Host "                           http://localhost:5000  (Mobile emulator endpoint)" -ForegroundColor DarkGreen
    Write-Host "                           Active Database: $backendDb" -ForegroundColor DarkCyan
    Write-Host "                           Diagnostics    : http://localhost:5057/api/system/info" -ForegroundColor DarkGray
    Write-Host "                           OpenAPI Spec   : http://localhost:5057/openapi/v1.json" -ForegroundColor DarkGray
}

if ($RunAi) {
    Write-Host "  [AI Agent Subsystem]     http://localhost:8000  (Internal service)" -ForegroundColor Magenta
    Write-Host "                           Health : http://localhost:8000/health" -ForegroundColor DarkMagenta
    Write-Host "                           Swagger: http://localhost:8000/docs" -ForegroundColor DarkMagenta
}

if ($RunWeb) {
    $webTargetUrl = if ($Target -eq "Cloud") { "https://sefproject-g3cmczhth2cygqgh.southeastasia-01.azurewebsites.net" } else { "http://localhost:5057" }
    Write-Host "  [React Web Portal]       http://localhost:5173  -> talks to: $webTargetUrl" -ForegroundColor Yellow
}

if ($RunMobile) {
    $mobileTargetUrl = if ($Target -eq "Cloud") { "https://sefproject-g3cmczhth2cygqgh.southeastasia-01.azurewebsites.net" } else { "http://10.0.2.2:5057 (Android) / http://localhost:5057" }
    Write-Host "  [Flutter Mobile App]     Running via Flutter    -> talks to: $mobileTargetUrl" -ForegroundColor Cyan
}

Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host " Note: Each service runs in its own window for live logs & hot reload." -ForegroundColor DarkGray
Write-Host " Configuration shortcuts:" -ForegroundColor DarkGray
Write-Host "   .\run-services.ps1               -> All services connected LOCALLY" -ForegroundColor White
Write-Host "   .\run-services.ps1 -Target Cloud  -> Web & Mobile connect to DEPLOYED AZURE" -ForegroundColor White
Write-Host "   .\run-services.ps1 -CloudDb       -> Local backend connects to Neon Cloud DB" -ForegroundColor White
Write-Host "   .\run-services.ps1 -Stop          -> Stop all services`n" -ForegroundColor White
