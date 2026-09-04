# Приводит миграции к единому формату Supabase: ГГГГММДДЧЧММСС_имя.sql
# Порядок при этом становится настоящим хронологическим.
# Переименование делается через git mv, история файлов сохраняется.

$dir = "supabase\migrations"
if (-not (Test-Path $dir)) { Write-Host "Нет папки $dir" -ForegroundColor Red; return }

# старое имя -> новое имя
$plan = [ordered]@{
    "20260831000000_init.sql"            = "20260831000000_init.sql"
    "20260902000000_leaderboards.sql"    = "20260902000000_leaderboards.sql"
    "020_vkid_welcome_roles_bans.sql"    = "20260902010000_vkid_welcome_roles_bans.sql"
    "021_music_library.sql"              = "20260902020000_music_library.sql"
    "022_dj_queue_tracks.sql"            = "20260902030000_dj_queue_tracks.sql"
    "023_track_votes.sql"                = "20260902040000_track_votes.sql"
    "024_dj_can_vote.sql"                = "20260902050000_dj_can_vote.sql"
    "025_realtime_coins.sql"             = "20260902060000_realtime_coins.sql"
    "023_all_in_one.sql"                 = "20260904010000_covers_and_booth.sql"
}

Write-Host ""
Write-Host "=== ПЕРЕИМЕНОВАНИЕ ===" -ForegroundColor Cyan

foreach ($old in $plan.Keys) {
    $new = $plan[$old]
    $src = Join-Path $dir $old
    $dst = Join-Path $dir $new

    if (-not (Test-Path $src)) {
        Write-Host ("  пропуск   " + $old + "  (нет файла)") -ForegroundColor DarkGray
        continue
    }
    if ($old -eq $new) {
        Write-Host ("  как есть  " + $old) -ForegroundColor DarkGray
        continue
    }
    if (Test-Path $dst) {
        Write-Host ("  занято    " + $new) -ForegroundColor Yellow
        continue
    }

    git mv $src $dst 2>$null
    if ($LASTEXITCODE -ne 0) { Move-Item $src $dst }
    Write-Host ("  готово    " + $old + "  ->  " + $new) -ForegroundColor Green
}

# 021_club_cover целиком вошёл в свод, отдельный файл больше не нужен
$dup = Join-Path $dir "021_club_cover.sql"
if (Test-Path $dup) {
    git rm -q $dup 2>$null
    if ($LASTEXITCODE -ne 0) { Remove-Item $dup }
    Write-Host "  удалён    021_club_cover.sql  (вошёл в свод)" -ForegroundColor Green
}

# диагностика - не миграция, ей место в tools
$diag = Join-Path $dir "000_diagnostika.sql"
if (Test-Path $diag) {
    if (-not (Test-Path "tools")) { New-Item -ItemType Directory tools | Out-Null }
    git mv $diag "tools\diagnostika.sql" 2>$null
    if ($LASTEXITCODE -ne 0) { Move-Item $diag "tools\diagnostika.sql" -Force }
    Write-Host "  перенесён 000_diagnostika.sql  ->  tools\diagnostika.sql" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== ИТОГОВЫЙ ПОРЯДОК ===" -ForegroundColor Cyan
Get-ChildItem $dir -Filter *.sql | Sort-Object Name | ForEach-Object {
    Write-Host ("  " + $_.Name)
}

$bad = Get-ChildItem $dir -Filter *.sql | Where-Object { $_.Name -notmatch '^\d{14}_' }
Write-Host ""
if ($bad) {
    Write-Host "Не в формате даты:" -ForegroundColor Yellow
    $bad | ForEach-Object { Write-Host ("  " + $_.Name) -ForegroundColor Yellow }
} else {
    Write-Host "Все файлы в едином формате. Порядок правильный." -ForegroundColor Green
}
Write-Host ""
