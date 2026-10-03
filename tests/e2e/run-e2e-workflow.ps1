# Handee Platform - Automated E2E Cross-Component Workflow Execution
param (
    [ValidateSet("Auto", "Cloud", "Local")]
    [string]$Target = "Auto",
    [switch]$Cloud,
    [switch]$Local,
    [string]$EnvironmentFile = "",
    [string]$CollectionFile = "tests/postman/Handee_API_Complete_Test_Suite.postman_collection.json",
    [string]$ReportDir = "tests/e2e/reports"
)

if ($Cloud) { $Target = "Cloud" }
if ($Local) { $Target = "Local" }

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Handee E2E Cross-Component Workflow Execution (Newman CLI)   " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Resolve environment file based on Target
if (-not $EnvironmentFile) {
    if ($Target -eq "Cloud") {
        $EnvironmentFile = "tests/postman/Handee_Cloud.postman_environment.json"
        Write-Host "Target: CLOUD (Azure Web API)" -ForegroundColor Green
    } elseif ($Target -eq "Local") {
        $EnvironmentFile = "tests/postman/Handee_Local.postman_environment.json"
        Write-Host "Target: LOCAL (localhost:5057)" -ForegroundColor Yellow
    } else {
        # Auto detect
        $localOnline = $false
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", 5057)
            $localOnline = $true
            $tcp.Close()
        } catch {}

        if ($localOnline) {
            $EnvironmentFile = "tests/postman/Handee_Local.postman_environment.json"
            Write-Host "Target: AUTO -> Detected Local API online (localhost:5057)" -ForegroundColor Yellow
        } else {
            $EnvironmentFile = "tests/postman/Handee_Cloud.postman_environment.json"
            Write-Host "Target: AUTO -> Local API offline, using CLOUD (Azure Web API)" -ForegroundColor Green
        }
    }
}

if (-not (Test-Path $ReportDir)) {
    New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
}

$cliReport = Join-Path $ReportDir "newman-e2e-summary.txt"

Write-Host "`nExecuting Newman E2E Workflow Test Suite..." -ForegroundColor Yellow
Write-Host "Environment: $EnvironmentFile" -ForegroundColor DarkGray
npx --yes newman run $CollectionFile `
    -e $EnvironmentFile `
    --reporters cli `
    --bail false | Tee-Object -FilePath $cliReport

Write-Host "`n[E2E Complete] Test execution log saved to: $cliReport" -ForegroundColor Green

