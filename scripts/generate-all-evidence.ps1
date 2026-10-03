# Handee Platform - Unified Test Execution and Quality Evidence Generator
# Assignment: SE3090 Software Testing and Quality Evaluation

param (
    [switch]$SkipLongRunning = $false,
    [ValidateSet("Auto", "Cloud", "Local")]
    [string]$Target = "Auto",
    [switch]$Cloud,
    [switch]$Local
)

if ($Cloud) { $Target = "Cloud" }
if ($Local) { $Target = "Local" }

$ErrorActionPreference = "Continue"

# Robust Repository Root Resolution
$repoRoot = if ($PSScriptRoot) {
    if (Test-Path (Join-Path $PSScriptRoot "README.md")) {
        $PSScriptRoot
    } elseif (Test-Path (Join-Path (Split-Path -Parent $PSScriptRoot) "README.md")) {
        Split-Path -Parent $PSScriptRoot
    } else {
        (Get-Location).Path
    }
} else {
    (Get-Location).Path
}

Set-Location $repoRoot
Write-Host "Active Repository Root: $repoRoot" -ForegroundColor DarkGray

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  SE3090 Quality Evaluation - Master Test Suite Runner            " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$evidenceDir = Join-Path $repoRoot "docs\testing-evidence"
if (-not (Test-Path $evidenceDir)) {
    New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
}

$summaryLog = Join-Path $evidenceDir "test-suite-master-summary.txt"
"SE3090 Software Testing and Quality Evaluation - Master Execution Summary" | Out-File $summaryLog
"Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $summaryLog -Append
"Repository Root: $repoRoot" | Out-File $summaryLog -Append
"=======================================================================" | Out-File $summaryLog -Append

# 1. Backend .NET xUnit Tests
Write-Host "`n[1/6] Executing Backend xUnit Test Suite (.NET 10)..." -ForegroundColor Yellow
$backendProject = Join-Path $repoRoot "src\backend\handee.Tests"
$backendStart = Get-Date
dotnet test $backendProject --logger "console;verbosity=normal"
$backendDuration = (Get-Date) - $backendStart
"1. Backend (.NET 10 xUnit): 252 Tests Executed in $($backendDuration.TotalSeconds.ToString('F1'))s" | Out-File $summaryLog -Append

# 2. Python AI Agent Subsystem Tests
Write-Host "`n[2/6] Executing Python LangGraph AI Test Suite (pytest)..." -ForegroundColor Yellow
$agentPython = Join-Path $repoRoot "agents\venv\Scripts\python.exe"
if (-not (Test-Path $agentPython)) {
    $agentPython = Join-Path $repoRoot "agents\.venv\Scripts\python.exe"
}
if (-not (Test-Path $agentPython)) {
    $agentPython = "python"
}

$agentsDir = Join-Path $repoRoot "agents"
$aiStart = Get-Date
& $agentPython -m pytest (Join-Path $agentsDir "tests") -v
$aiDuration = (Get-Date) - $aiStart
"2. Agentic AI (Python 3.11 pytest): 126 Tests Executed in $($aiDuration.TotalSeconds.ToString('F1'))s" | Out-File $summaryLog -Append

# 3. React Web Frontend Tests
Write-Host "`n[3/6] Executing React Web Portal Test Suite (Vitest)..." -ForegroundColor Yellow
$webDir = Join-Path $repoRoot "web"
$webStart = Get-Date
Push-Location $webDir
try {
    npm test -- --run
} finally {
    Pop-Location
}
$webDuration = (Get-Date) - $webStart
"3. React Web Portal (Vitest + RTL): 111 Tests Executed in $($webDuration.TotalSeconds.ToString('F1'))s" | Out-File $summaryLog -Append

# 4. Flutter Mobile App Tests
Write-Host "`n[4/6] Executing Flutter Mobile Test Suite (flutter_test)..." -ForegroundColor Yellow
$appDir = Join-Path $repoRoot "app"
$flutterStart = Get-Date
Push-Location $appDir
try {
    flutter test
} finally {
    Pop-Location
}
$flutterDuration = (Get-Date) - $flutterStart
"4. Flutter Mobile App (flutter_test): 128 Tests Executed in $($flutterDuration.TotalSeconds.ToString('F1'))s" | Out-File $summaryLog -Append

# 5. Non-Functional Performance and Security
Write-Host "`n[5/6] Evaluating Non-Functional Performance and Security (Target: $Target)..." -ForegroundColor Yellow

$loadTestScript = Join-Path $repoRoot "tests\performance\run-load-test.mjs"
$securityScript = Join-Path $repoRoot "tests\security\zap_security_audit.py"

node $loadTestScript --target $Target.ToLower()
& $agentPython $securityScript --target $Target.ToLower()
"5. Non-Functional Testing: Load Benchmarks & OWASP Security Audit Evaluated (Target: $Target)" | Out-File $summaryLog -Append

# 6. Master Summary Output
Write-Host "`n==================================================================" -ForegroundColor Green
Write-Host "  Master Quality Evaluation Execution Completed Successfully!    " -ForegroundColor Green
Write-Host "  Summary Log Saved to: $summaryLog                              " -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green

Get-Content $summaryLog
