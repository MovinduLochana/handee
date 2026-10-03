# Handee Platform - Automated Performance & Load Testing Runner Wrapper
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

Write-Host "Running Handee Automated Performance & Load Test Suite (Target: $Target)..." -ForegroundColor Cyan

if ($ApiUrl) { $env:API_URL = $ApiUrl }
if ($AiUrl) { $env:AI_URL = $AiUrl }

node tests/performance/run-load-test.mjs --target $Target.ToLower()
