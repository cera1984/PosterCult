$ErrorActionPreference = "Stop"

$Repo = (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Archive = "E:\POSTERZ"
$Python = Get-Command py -ErrorAction SilentlyContinue
$Git = Get-Command git -ErrorAction SilentlyContinue

if (-not $Python) {
  Write-Host "Python non trovato. Installa Python da https://www.python.org/downloads/" -ForegroundColor Red
  Read-Host "Premi Invio per chiudere"
  exit 1
}

if (-not $Git) {
  $GitCandidates = @(
    "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe",
    "$env:PROGRAMFILES\Git\cmd\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
  )
  $GitPath = $GitCandidates | ForEach-Object { Get-ChildItem -Path $_ -ErrorAction SilentlyContinue } | Select-Object -First 1 -ExpandProperty FullName
  if ($GitPath) { $Git = @{ Source = $GitPath } } else {
    Write-Host "Git non trovato. Apri GitHub Desktop almeno una volta oppure installa Git." -ForegroundColor Red
    Read-Host "Premi Invio per chiudere"
    exit 1
  }
}

if (-not (Test-Path -LiteralPath $Archive)) {
  Write-Host "Archivio non trovato: $Archive" -ForegroundColor Red
  Read-Host "Premi Invio per chiudere"
  exit 1
}

Set-Location -LiteralPath $Repo
Write-Host "Sincronizzo le immagini da $Archive ..." -ForegroundColor Cyan
& py "$Repo\generate_catalog.py" --archive $Archive --output $Repo
if ($LASTEXITCODE -ne 0) { throw "La generazione del catalogo è fallita." }

Write-Host "Preparo il commit ..." -ForegroundColor Cyan
& $Git.Source -C $Repo add -A
$changes = (& $Git.Source -C $Repo status --porcelain)
if (-not $changes) {
  Write-Host "Nessuna modifica: il sito è già aggiornato." -ForegroundColor Green
  Read-Host "Premi Invio per chiudere"
  exit 0
}

$message = "Aggiorna archivio poster $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
& $Git.Source -C $Repo commit -m $message
if ($LASTEXITCODE -ne 0) { throw "Il commit è fallito." }

Write-Host "Invio le modifiche a GitHub ..." -ForegroundColor Cyan
& $Git.Source -C $Repo push origin main
if ($LASTEXITCODE -ne 0) { throw "Il push è fallito. Apri GitHub Desktop e verifica l'accesso." }

Write-Host "Fatto. GitHub Pages aggiornerà il sito in circa 1-3 minuti." -ForegroundColor Green
Write-Host "https://cera1984.github.io/PosterCult/"
Read-Host "Premi Invio per chiudere"
