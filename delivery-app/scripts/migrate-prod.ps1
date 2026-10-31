# Aplica as migrations pendentes no banco do site (Supabase, São Paulo).
# Lê as conexões de .env.supabase-sp.local (fora do git) e nunca mostra a senha.
# Uso (PowerShell, na pasta delivery-app):  .\scripts\migrate-prod.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root '.env.supabase-sp.local'

function Read-EnvValue($key) {
  $line = Get-Content $envFile | Where-Object { $_ -match "^\s*$key=" } | Select-Object -First 1
  if (-not $line) { throw "$key não encontrada em $envFile" }
  return ($line -replace "^\s*$key=", '').Trim().Trim('"')
}

$password = [uri]::EscapeDataString((Read-EnvValue 'SUPABASE_DB_PASSWORD').Trim())
$direct = (Read-EnvValue 'DIRECT_URL').Replace('{SENHA}', $password)
$ca = [uri]::EscapeDataString((Join-Path $root 'certs\supabase-ca-2021.crt').Replace('\', '/'))
$env:DATABASE_URL = "$direct`?sslmode=require&sslcert=$ca&sslaccept=strict&connect_timeout=60"
$env:DIRECT_URL = $env:DATABASE_URL

Write-Host "Aplicando migrations no banco do site..." -ForegroundColor Cyan
Push-Location (Join-Path $root 'packages\db')
try { corepack pnpm@10.15.0 exec prisma migrate deploy } finally { Pop-Location }
