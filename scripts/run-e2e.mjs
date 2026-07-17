import { randomUUID } from 'node:crypto'
import { spawnSync, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const runId = `pawpaw-test-${Date.now()}-${randomUUID().slice(0, 8)}`
const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
const result = spawnSync(process.execPath, [cli, 'test'], {
  cwd: process.cwd(),
  env: { ...process.env, PAWPAW_TEST_RUN_ID: runId },
  stdio: 'inherit',
})

let cleanupFailed = false
if (process.platform === 'win32') {
  const root = process.cwd().replace(/'/g, "''")
  const script = [
    `$root = '${root}'`,
    "$targets = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like \"*$root*\" -and ($_.CommandLine -match 'next[\\\\/]dist[\\\\/]bin[\\\\/]next.*dev' -or $_.CommandLine -match 'start-server') }",
    '$targets | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }',
    'Start-Sleep -Milliseconds 300',
    "$remaining = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like \"*$root*\" -and ($_.CommandLine -match 'next[\\\\/]dist[\\\\/]bin[\\\\/]next.*dev' -or $_.CommandLine -match 'start-server') })",
    'Write-Output ("PAWPAW_SERVER_PROCESSES_POST=" + $remaining.Count)',
    'if ($remaining.Count -ne 0) { exit 1 }',
  ].join('; ')
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      cwd: process.cwd(), stdio: 'inherit',
    })
  } catch {
    cleanupFailed = true
  }
}

if (result.error) throw result.error
process.exitCode = cleanupFailed ? 1 : (result.status ?? 1)
