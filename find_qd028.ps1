# Buscar QD-028 en el nodo raiz /students
$data2 = Invoke-RestMethod -Uri 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/students.json' -Method GET
Write-Host "Tipo de dato en /students: $($data2.GetType().Name)"
Write-Host "Cantidad en /students: $($data2.Count)"

# Convertir a array si es PSObject
if ($data2 -is [System.Management.Automation.PSCustomObject]) {
    $arr = @($data2.PSObject.Properties.Value)
    Write-Host "Convertido a array: $($arr.Count) elementos"
    $found = $arr | Where-Object { $_.carne -eq '2026-QD-028' }
    if ($found) {
        Write-Host "ENCONTRADO en /students:"
        Write-Host "  id=$($found.id) nombre=$($found.firstName) $($found.lastName1) $($found.lastName2)"
        Write-Host "  carne=$($found.carne) grado=$($found.grade) seccion=$($found.section)"
    } else {
        Write-Host "NO encontrado QD-028 en /students"
    }
} else {
    $found = $data2 | Where-Object { $_.carne -eq '2026-QD-028' }
    if ($found) {
        Write-Host "ENCONTRADO: $($found | ConvertTo-Json -Compress)"
    } else {
        Write-Host "NO encontrado QD-028 en /students"
    }
}

# Tambien buscar en encc_school_state
$data3 = Invoke-RestMethod -Uri 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json' -Method GET
$found3 = $data3 | Where-Object { $null -ne $_ -and $_.carne -eq '2026-QD-028' }
if ($found3) {
    Write-Host "ENCONTRADO QD-028 en encc_school_state/students:"
    Write-Host "  $($found3 | ConvertTo-Json -Compress)"
} else {
    Write-Host "NO encontrado QD-028 en encc_school_state/students"
}
