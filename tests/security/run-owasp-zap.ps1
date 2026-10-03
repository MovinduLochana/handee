# PowerShell wrapper for automated security scan
param (
    [ValidateSet("Auto", "Cloud", "Local")]
    [string]$Target = "Auto",
    [switch]$Cloud,
    [switch]$Local,
    [string]$ApiUrl = "",
    [string]$AiUrl = ""
)

if ($Cloud) { $Target = "Cloud" }
if ($Local) { $Target = "Local" }

Write-Host "Running Handee Automated Security Vulnerability Audit (Target: $Target)..." -ForegroundColor Cyan

$pythonExe = "agents\venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "agents\.venv\Scripts\python.exe"
}
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

if ($ApiUrl) { $env:API_URL = $ApiUrl }
if ($AiUrl) { $env:AI_URL = $AiUrl }

& $pythonExe tests/security/zap_security_audit.py --target $Target.ToLower()
