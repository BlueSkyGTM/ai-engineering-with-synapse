# Fleet Engine Cortex: Seamless Orchestration Wrapper
# Usage: .\scripts\orchestrate.ps1 "YOUR CAMPAIGN MESSAGE HERE"
# This runs the full pipeline (Ahab → Nemo → Neptune) and auto-delivers to Google Sheets

param(
    [Parameter(Mandatory=$true)]
    [string]$Campaign
)

$ErrorActionPreference = "Stop"

# Set environment variables for seamless run
$env:SKIP_RAG = "true"
$env:DELIVER = "true"

Write-Host "═══════════════════════════════════════════════════════════════"  -ForegroundColor Cyan
Write-Host "  FLEET ENGINE: Seamless Orchestration" -ForegroundColor Cyan
Write-Host "  SKIP_RAG=$env:SKIP_RAG, DELIVER=$env:DELIVER" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════"  -ForegroundColor Cyan
Write-Host ""

Write-Host "Campaign:" -ForegroundColor Green
Write-Host "  $Campaign" -ForegroundColor White
Write-Host ""

# Change to the script's directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath\..

# Run the pipeline
$exitCode = & node run.js $Campaign

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════"  -ForegroundColor Cyan
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Pipeline completed successfully" -ForegroundColor Green
    Write-Host "  Leads delivered to Google Sheets" -ForegroundColor Green
} else {
    Write-Host "  ❌ Pipeline failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}
Write-Host "═══════════════════════════════════════════════════════════════"  -ForegroundColor Cyan

exit $LASTEXITCODE