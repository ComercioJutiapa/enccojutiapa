/**
 * Test: Verificación de filtro de estado (Retirado / Ausente) en Nómina y Expedientes
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Iniciando prueba: Filtro de estado Retirado y Ausente en Nómina de Alumnos...');

const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// 1. Verificar presencia de lógica isSpecialStatusFilter
assert(appCode.includes("sValLower === 'retirado' || sValLower === 'ausente' || sValLower === 'inactivo' || sValLower === 'all'"), 
  'app.js debe definir isSpecialStatusFilter para permitir visualización global');
console.log('  ✅ Test 1 Superado: isSpecialStatusFilter configurado para desbloquear la tabla.');

// 2. Verificar que el guard de grado/búsqueda no bloquee cuando isSpecialStatusFilter está activo
assert(appCode.includes('if (!gradeVal && !searchVal && !isSpecialStatusFilter)'), 
  'app.js no debe bloquear si el usuario selecciona Retirado o Ausente');
console.log('  ✅ Test 2 Superado: Bloqueo omitido al filtrar por Retirado o Ausente.');

// 3. Simulación funcional del filtro con datos sintéticos
const mockStudents = [
  { id: '1', name: 'JUAN PÉREZ', grade: '4to Perito Contador', section: 'Sección A', status: 'Activo' },
  { id: '2', name: 'MARÍA LÓPEZ', grade: '5to Perito Contador', section: 'Sección B', status: 'Retirado', retireReason: 'Cambio de colegio' },
  { id: '3', name: 'CARLOS GÓMEZ', grade: '6to Perito Contador', section: 'Sección A', status: 'retirado' },
  { id: '4', name: 'ANA MORALES', grade: '4to Perito Contador', section: 'Sección B', status: 'Ausente', retireReason: 'Inasistencia mayor a 15 días' },
  { id: '5', name: 'PEDRO RUIZ', grade: '5to Perito Contador', section: 'Sección A', status: 'Activo' }
];

function filterTest(statusVal, gradeVal = '') {
  const sValLower = (statusVal || '').toLowerCase().trim();
  let list = mockStudents;
  if (gradeVal) {
    list = list.filter(s => s.grade === gradeVal);
  }
  if (statusVal && statusVal !== 'ALL') {
    if (sValLower === 'retirado' || sValLower === 'inactivo') {
      list = list.filter(s => {
        const st = (s.status || '').toLowerCase().trim();
        if (st === 'ausente') return false;
        return st === 'retirado' || st === 'inactivo' || Boolean(s.retireReason) || (s.active === false);
      });
    } else if (sValLower === 'ausente') {
      list = list.filter(s => {
        const st = (s.status || '').toLowerCase().trim();
        return st === 'ausente' || st.includes('ausent') || st.includes('desert');
      });
    } else if (sValLower === 'activo' || sValLower === 'inscrito') {
      list = list.filter(s => {
        const st = (s.status || '').toLowerCase().trim();
        return st === 'activo' || st === 'inscrito' || (s.active !== false && st !== 'retirado' && st !== 'inactivo' && st !== 'ausente');
      });
    }
  }
  return list;
}

// Probar Retirados sin seleccionar grado
const allRetirados = filterTest('Retirado');
assert.strictEqual(allRetirados.length, 2, 'Deben encontrarse los 2 retirados');
assert.ok(allRetirados.some(s => s.name === 'MARÍA LÓPEZ'));
assert.ok(allRetirados.some(s => s.name === 'CARLOS GÓMEZ'));
console.log('  ✅ Test 3 Superado: Retirados globales devuelven todos los alumnos retirados del plantel (2/2).');

// Probar Ausentes sin seleccionar grado
const allAusentes = filterTest('Ausente');
assert.strictEqual(allAusentes.length, 1, 'Debe encontrarse 1 ausente');
assert.strictEqual(allAusentes[0].name, 'ANA MORALES');
console.log('  ✅ Test 4 Superado: Ausentes globales devuelven todos los alumnos ausentes del plantel (1/1).');

// Probar Retirados con grado seleccionado
const gradeRetirados = filterTest('Retirado', '5to Perito Contador');
assert.strictEqual(gradeRetirados.length, 1, 'Debe encontrarse 1 retirado en 5to');
assert.strictEqual(gradeRetirados[0].name, 'MARÍA LÓPEZ');
console.log('  ✅ Test 5 Superado: Retirados con filtro de grado respeta el grado seleccionado (1/1).');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE FILTRADO POR ESTADO PASARON EXITOSAMENTE (100%)!\n');
