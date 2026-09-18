$data = Invoke-RestMethod -Uri 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json' -Method GET

# Ver indices 320-330 para contexto
Write-Host "=== Contexto indices 320-330 ==="
for ($i = 320; $i -le 330; $i++) {
    $s = $data[$i]
    if ($null -eq $s) { Write-Host "  [$i] NULL"; continue }
    Write-Host "  [$i] id=$($s.id) carne=$($s.carne) grado=$($s.grade) seccion=$($s.section) nombre=$($s.firstName) $($s.lastName1) $($s.lastName2)"
}

Write-Host ""
Write-Host "=== Quinto D - lista completa ==="
$seen = @{}
$idx = 0
for ($i = 0; $i -lt $data.Count; $i++) {
    $s = $data[$i]
    if ($null -eq $s) { continue }
    $id = $s.id
    if ($seen.ContainsKey($id)) { continue }
    $seen[$id] = $true
    $grade = [string]$s.grade
    $sec = [string]$s.section
    if (($grade -match '5|quinto|Quinto|QUINTO') -and ($sec -match 'D')) {
        $idx++
        Write-Host "  #$idx [$i] $($s.carne) - $($s.firstName) $($s.lastName1) $($s.lastName2)"
    }
}
