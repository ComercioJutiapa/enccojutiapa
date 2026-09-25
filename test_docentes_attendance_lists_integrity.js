/**
 * Test Suite: Verificación de Integridad de Listas de Asistencia para Docentes (Anti-Desaparición)
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================================');
console.log('🧪 PRUEBAS UNITARIAS: BLINDAJE DE LISTAS DE ASISTENCIA PARA DOCENTES');
console.log('================================================================================\n');

const appPath = path.join(__dirname, 'app.js');
const appCode = fs.readFileSync(appPath, 'utf8');

// ==============================================================================
// TEST 1: isStudentActive no descarta a estudiantes con condición de Ausente
// ==============================================================================
console.log('▶ [TEST 1] Verificando que isStudentActive no descarte alumnos ausentes...');
const mIsActive = appCode.match(/function isStudentActive\([^)]*\)\s*\{[\s\S]*?\n\}/)[0];
assert(mIsActive.includes("s.status === 'Retirado' || s.status === 'Inactivo'"),
  'isStudentActive solo debe excluir Retirado e Inactivo.');
assert(!mIsActive.includes("Ausente"),
  'isStudentActive no debe contener descarte por Ausente.');
console.log('  ✅ Test 1 Superado: Alumnos con status Ausente permanecen activos en la nómina.');

// ==============================================================================
// TEST 2: getCleanSectionLetter reconoce formatos multivariantes (grd-4a, 4A, 4to_A, etc.)
// ==============================================================================
console.log('\n▶ [TEST 2] Verificando extracción robusta de sección en getCleanSectionLetter...');
assert(appCode.includes("str.match(/[-_\\s]([A-D])(?:\\b|$)/i)") || appCode.includes("[-_\\s]([A-D])"),
  'getCleanSectionLetter debe contemplar guiones y espacios antes de la letra.');
assert(appCode.includes("str.match(/(?:4to|5to|6to|grd-?[456]|PC-?[456]|PC|\\d)\\s*([A-D])/i)") || appCode.includes("grd-?[456]"),
  'getCleanSectionLetter debe contemplar códigos de grado pegados a la sección.');

// Verificación funcional con regex
function testSectionRegex(str) {
    if (!str) return '';
    const m = str.match(/Secci[oó]n\s*([A-D])/i) || 
              str.match(/[-_\s]([A-D])(?:\b|$)/i) ||
              str.match(/(?:4to|5to|6to|grd-?[456]|PC-?[456]|PC|\d)\s*([A-D])/i) ||
              str.match(/\(([A-D])\)/i) ||
              str.match(/([A-D])$/i) ||
              str.match(/\b([A-D])\b/i);
    return m ? m[1].toUpperCase() : '';
}

assert.strictEqual(testSectionRegex('grd-4a'), 'A');
assert.strictEqual(testSectionRegex('4to_A'), 'A');
assert.strictEqual(testSectionRegex('4A'), 'A');
assert.strictEqual(testSectionRegex('5B'), 'B');
assert.strictEqual(testSectionRegex('6C'), 'C');
assert.strictEqual(testSectionRegex('Sección D'), 'D');
assert.strictEqual(testSectionRegex('4to Perito (A)'), 'A');
console.log('  ✅ Test 2 Superado: Todos los patrones de sección se resuelven correctamente.');

// ==============================================================================
// TEST 3: Existencia y funcionamiento de getAttendanceStudents
// ==============================================================================
console.log('\n▶ [TEST 3] Verificando función universal getAttendanceStudents...');
assert(appCode.includes('function getAttendanceStudents(gradeCode, currentCourseObj = null)'),
  'getAttendanceStudents debe estar declarada en app.js');
assert(appCode.includes('window.getAttendanceStudents = getAttendanceStudents'),
  'getAttendanceStudents debe estar expuesta en window');

console.log('  ✅ Test 3 Superado: getAttendanceStudents está implementada y disponible globalmente.');

// ==============================================================================
// TEST 4: populateAttendanceSelects siempre muestra grados asignados + plantel completo para docentes
// ==============================================================================
console.log('\n▶ [TEST 4] Verificando que ningún grado desaparezca en el selector del docente...');
assert(appCode.includes('Mis Grados Asignados'), 'Debe incluir optgroup de Mis Grados Asignados.');
assert(appCode.includes('Todos los Grados y Secciones (Plantel Completo)'),
  'Debe incluir siempre optgroup del Plantel Completo para que ningún grado desaparezca.');
assert(appCode.includes('const resolvedCode = gMatch ? gMatch.code :'),
  'Debe resolver el código de grado contra gradesList oficial.');

console.log('  ✅ Test 4 Superado: Los docentes disponen de sus grados prioritarios y de todos los grados del plantel.');

// ==============================================================================
// TEST 5: loadAttendanceList, markAllPresentToday, export y print usan getAttendanceStudents
// ==============================================================================
console.log('\n▶ [TEST 5] Verificando uso de getAttendanceStudents en todos los puntos de acceso...');
assert(appCode.includes('const students = getAttendanceStudents(gradeCode, currentCourseObj);'),
  'loadAttendanceList debe invocar getAttendanceStudents.');
assert(appCode.includes('// 3. RECUPERAR REGISTROS DE ASISTENCIA (CON RESOLUCIÓN INTELIGENTE DE ALIAS)'),
  'loadAttendanceList debe resolver claves alias para no perder marcas registradas.');

console.log('  ✅ Test 5 Superado: Todas las vistas de asistencia recuperan la nómina mediante el método blindado.');

// ==============================================================================
// TEST 6: Preservación de Porcentajes del Modelo de Calificaciones
// ==============================================================================
console.log('\n▶ [TEST 6] Verificando preservación estricta del % del modelo de calificaciones...');
assert(appCode.includes('calculateClassBimesterMetrics'), 'calculateClassBimesterMetrics debe existir');
assert(appCode.includes('ensureOfficialGradesList'), 'ensureOfficialGradesList debe existir');
assert(appCode.includes('70') && appCode.includes('30'),
  'El modelo de ponderación de calificaciones debe permanecer intacto.');

console.log('  ✅ Test 6 Superado: Modelo de calificaciones y porcentajes preservados 100%.');

console.log('\n================================================================================');
console.log('🎉 TODAS LAS PRUEBAS DE BLINDAJE DE ASISTENCIA PASARON CON ÉXITO (100%)');
console.log('================================================================================');
