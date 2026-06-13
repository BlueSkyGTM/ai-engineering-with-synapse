# run.ps1 — Load .env and dispatch a Stage pipeline
#
# Usage:
#   .\run.ps1 stage02              # full Stage 02 (pending rows)
#   .\run.ps1 stage02 --retry-failed
#   .\run.ps1 stage02 --sample 5
#   .\run.ps1 stage02 --dry-run
#   .\run.ps1 stage03              # full Stage 03
#   .\run.ps1 stage03 --sample 5
#   .\run.ps1 stage04              # full Stage 04
#   .\run.ps1 status               # show manifest counts for all stages
#   .\run.ps1 check                # print loaded API key (masked)

param(
    [Parameter(Position=0)]
    [string]$Command = "status",
    [Parameter(ValueFromRemainingArguments)]
    [string[]]$PassThru
)

# Load .env
if (Test-Path .env) {
    Get-Content .env | Where-Object { $_ -notmatch '^\s*#' -and $_ -match '=' } | ForEach-Object {
        $k, $v = $_ -split '=', 2
        [System.Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim())
    }
    Write-Host "[run.ps1] .env loaded" -ForegroundColor DarkGray
} else {
    Write-Error ".env not found — create it with ZHIPUAI_API_KEY=..."
    exit 1
}

switch ($Command) {
    "stage02" {
        python3 skills/operator-kit/dispatch-stage02.py @PassThru
    }
    "stage03" {
        python3 skills/operator-kit/dispatch-stage03.py @PassThru
    }
    "stage04" {
        python3 skills/operator-kit/dispatch-stage04.py @PassThru
    }
    "status" {
        python3 -c @"
import json, pathlib
for stage, path in [
    ('Stage 02', 'stages/02-lesson-injection/output/manifest.json'),
    ('Stage 03', 'stages/03-exercise-design/output/manifest.json'),
    ('Stage 04', 'stages/04-quiz-recall/output/manifest.json'),
]:
    p = pathlib.Path(path)
    if not p.exists():
        print(f'{stage}: no manifest yet')
        continue
    rows = json.loads(p.read_text(encoding='utf-8'))
    from collections import Counter
    c = Counter(r['status'] for r in rows)
    total = len(rows)
    print(f'{stage}: {c.get(\"done\",0)} done / {c.get(\"failed\",0)} failed / {c.get(\"pending\",0)} pending  ({total} total)')
"@
    }
    "check" {
        $key = $env:ZHIPUAI_API_KEY
        if ($key) {
            $masked = $key.Substring(0, [Math]::Min(8, $key.Length)) + "..."
            Write-Host "ZHIPUAI_API_KEY: $masked" -ForegroundColor Green
        } else {
            Write-Host "ZHIPUAI_API_KEY: NOT SET" -ForegroundColor Red
        }
    }
    default {
        Write-Host "Unknown command: $Command"
        Write-Host "Available: stage02, stage03, stage04, status, check"
    }
}
