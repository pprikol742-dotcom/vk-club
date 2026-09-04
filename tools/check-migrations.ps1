# Проверка папки миграций: дубли номеров, дыры, неправильные имена.
# Запуск:  powershell -ExecutionPolicy Bypass -File tools\check-migrations.ps1

$dir = "supabase\migrations"
if (-not (Test-Path $dir)) { Write-Host "Нет папки $dir" -ForegroundColor Red; exit }

$files = Get-ChildItem $dir -Filter *.sql | Sort-Object Name
Write-Host "`nВсего файлов: $($files.Count)`n" -ForegroundColor Cyan

$nums = @{}
foreach ($f in $files) {
    if ($f.Name -match '^(\d{3})_') {
        $n = [int]$Matches[1]
        if ($nums.ContainsKey($n)) { $nums[$n] += ,$f.Name } else { $nums[$n] = @($f.Name) }
        "{0,4}  {1}" -f $n, $f.Name | Write-Host
    } else {
        Write-Host "  ??  $($f.Name)   <- имя без номера" -ForegroundColor Yellow
    }
}

Write-Host "`n--- дубли номеров ---" -ForegroundColor Cyan
$dupes = $nums.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 }
if ($dupes) { $dupes | ForEach-Object { Write-Host "  $($_.Key): $($_.Value -join ', ')" -ForegroundColor Red } }
else { Write-Host "  нет" -ForegroundColor Green }

Write-Host "`n--- пропущенные номера ---" -ForegroundColor Cyan
if ($nums.Count) {
    $keys = $nums.Keys | Sort-Object
    $gaps = ($keys[0]..$keys[-1]) | Where-Object { -not $nums.ContainsKey($_) }
    if ($gaps) { Write-Host "  $($gaps -join ', ')" -ForegroundColor Yellow }
    else { Write-Host "  нет" -ForegroundColor Green }
}

Write-Host "`nГотово.`n" -ForegroundColor Cyan
