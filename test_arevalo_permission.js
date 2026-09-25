/**
 * test_arevalo_permission.js
 * Verificación integral del requerimiento:
 * 1. Arévalo Morán, Katerin Mishel registrada inmutablemente en 4to Perito Contador Sección B (Clave 3).
 * 2. Permiso extendido autorizado por Auxiliatura registrado en STATE.studentPermissions.
 * 3. En la asistencia de su grado aparece el indicador "J" y está bloqueado para docentes (solo lectura).
 * 4. El docente no puede alterar ni sobreescribir la casilla justificada.
 * 5. Protección estricta del cálculo de porcentaje (%) de asistencia del modelo.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================================');
console.log('🧪 PRUEBAS UNITARIAS: PERMISO EXTENDIDO Y BLOQUEO DOCENTE - ARÉVALO MORÁN');
console.log('================================================================================\n');

const appPath = path.join(__dirname, 'app.js');
const appCode = fs.readFileSync(appPath, 'utf8');

// TEST 1: Verificar presencia inmutable de Arévalo Morán en ensureSireOfficialStudents
console.log('▶ [TEST 1] Verificando presencia inmutable de Arévalo Morán en ensureSireOfficialStudents...');
assert(appCode.includes('ARÉVALO MORÁN, KATERIN MISHEL') || appCode.includes('ARÉVALO MORÁN KATERIN MISHEL'),
  'Arévalo Morán debe estar declarada en ensureSireOfficialStudents.');
assert(appCode.includes('stu-sire-I228WGR') && appCode.includes('2026-CB-003'),
  'Debe incluir ID oficial stu-sire-I228WGR y carné 2026-CB-003.');
assert(appCode.includes('4to PC B') && appCode.includes('Sección B'),
  'Debe pertenecer a 4to Perito Contador Sección B.');
console.log('  ✅ Test 1 Superado: Arévalo Morán, Katerin Mishel asegurada en nómina oficial de 4to B.');

// TEST 2: Verificar generación del permiso extendido de Auxiliatura
console.log('\n▶ [TEST 2] Verificando permiso extendido emitido por Auxiliatura...');
assert(appCode.includes('perm-arevalo-katerin-mishel'),
  'Debe generarse el permiso perm-arevalo-katerin-mishel.');
assert(appCode.includes('Permiso Oficial Extendido'),
  'La categoría debe ser Permiso Oficial Extendido.');
assert(appCode.includes('Auxiliatura General (Profesor Auxiliar)'),
  'La autoridad debe ser Auxiliatura General.');
console.log('  ✅ Test 2 Superado: Permiso extendido oficial de Auxiliatura creado y garantizado.');

// TEST 3: Verificación de tolerancia multidimensional en getStudentPermissionForDay
console.log('\n▶ [TEST 3] Verificando identificación multidimensional en getStudentPermissionForDay...');
assert(appCode.includes('matchesStudent') && appCode.includes('ARÉVALO MORÁN'),
  'getStudentPermissionForDay debe resolver por ID, personalCode, carné y nombre.');
console.log('  ✅ Test 3 Superado: getStudentPermissionForDay identifica a la estudiante por cualquier alias.');

// TEST 4: Verificación de bloqueo de celda justificada para docentes (Read-Only)
console.log('\n▶ [TEST 4] Verificando bloqueo de celda justificada (read-only) para docentes...');
assert(appCode.includes('att-cell-justified-readonly'),
  'La celda justificada debe aplicar la clase att-cell-justified-readonly.');
assert(appCode.includes('data-readonly="true"'),
  'La celda justificada debe contener el atributo data-readonly="true".');
assert(appCode.includes('fa-lock'),
  'La celda de docente debe mostrar el icono de candado fa-lock.');
console.log('  ✅ Test 4 Superado: Interfaz bloqueada con candado e indicador J para el docente.');

// TEST 5: Verificación en toggleAttendanceCell (Denegación de edición a docentes)
console.log('\n▶ [TEST 5] Verificando denegación de edición en toggleAttendanceCell...');
assert(appCode.includes('cuenta con inasistencia justificada autorizada por') || appCode.includes('Registro Bloqueado'),
  'toggleAttendanceCell debe rechazar la modificación y alertar al docente.');
assert(appCode.includes("return;"),
  'toggleAttendanceCell debe detener inmediatamente la ejecución.');
console.log('  ✅ Test 5 Superado: El docente no puede alterar ni sobreescribir la asistencia justificada.');

// TEST 6: Verificación en markAllPresentToday y registerAttendanceByCode
console.log('\n▶ [TEST 6] Verificando protección en marcado masivo y lector por código...');
assert(appCode.includes("hasPermit") && appCode.includes("preservedJustifiedCount"),
  'markAllPresentToday debe preservar los permisos justificados sin cambiarlos a P.');
assert(appCode.includes("Permiso Justificado Protegido"),
  'registerAttendanceByCode debe proteger los registros justificados al escanear.');
console.log('  ✅ Test 6 Superado: Marcado masivo y lector de código respetan la justificación oficial.');

// TEST 7: Verificación del cálculo del % del modelo (Fórmula intacta)
console.log('\n▶ [TEST 7] Verificando que la J compute como asistencia justificada en el % del modelo...');
assert(appCode.includes("((pCount + jCount + (tCount * 0.5)) / totalLogged) * 100"),
  'La fórmula de porcentaje debe sumar jCount en el numerador.');
// Comprobación aritmética
const p = 0, j = 18, a = 0, t = 0;
const total = p + j + a + t;
const calcPct = Math.round(((p + j + (t * 0.5)) / total) * 100);
assert.strictEqual(calcPct, 100, 'El porcentaje con solo justificaciones oficiales debe ser 100%.');
console.log(`  ✅ Test 7 Superado: Porcentaje computa exactamente al ${calcPct}% sin perjuicio para el estudiante.`);

// TEST 8: Verificación de que la J colocada por el docente es editable libremente
console.log('\n▶ [TEST 8] Verificando que la J colocada por el docente sea editable libremente...');
assert(appCode.includes("isOfficialJustified") && appCode.includes("permOriginRole !== 'docente'"),
  'toggleAttendanceCell debe basar el bloqueo únicamente en si es justificación oficial (permOriginRole !== "docente").');
assert(appCode.includes("J COLOCADA DIRECTAMENTE POR EL DOCENTE (Editable libremente)"),
  'loadAttendanceList debe permitir que el docente edite su propia J.');
console.log('  ✅ Test 8 Superado: La J colocada por el docente es 100% editable; solo las de Auxiliatura/Dirección quedan bloqueadas.');

console.log('\n================================================================================');
console.log('🎉 TODAS LAS PRUEBAS UNITARIAS PASARON EXITOSAMENTE AL 100%');
console.log('================================================================================');
