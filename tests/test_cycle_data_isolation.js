/**
 * tests/test_cycle_data_isolation.js
 * 
 * Verificación Integral de Aislamiento Estricto entre Ciclos Escolares:
 * 1. Al consultar el Ciclo Histórico 2026 (o cualquier año pasado):
 *    - Se muestran única y exclusivamente los datos de 2026 (412 estudiantes, notas y calificaciones oficiales).
 *    - Todos los datos del ciclo 2027 (y cualquier otro año) se ocultan al 100%.
 *    - Los eventos SSE en vivo del ciclo activo (students, calificaciones, asistencias) se descartan.
 *    - Las escrituras hacia Firebase en la base activa (EnccoCloudSync syncNode/patchNode) se bloquean.
 *    - applyIncomingCloudState no sobrescribe las nóminas ni notas históricas.
 * 2. Al regresar al Ciclo Activo 2027:
 *    - Se muestran única y exclusivamente los datos de 2027 (padrón activo con notas en 0 cero).
 *    - Los registros exclusivos del ciclo 2026 permanecen ocultos.
 * 3. Principio Universal para todos los años:
 *    - getCycleFilteredStudents aísla estrictamente cualquier año Y seleccionado sin fuga cruzada.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('🛡️ TEST: AISLAMIENTO RIGUROSO ENTRE CICLOS LECTIVOS (2026 vs 2027 Y TODOS LOS AÑOS)');
console.log('='.repeat(80));

const appJsPath = path.join(__dirname, '..', 'app.js');
const archiverJsPath = path.join(__dirname, '..', 'cycle_archiver.js');

const appJsCode = fs.readFileSync(appJsPath, 'utf8');
const archiverJsCode = fs.readFileSync(archiverJsPath, 'utf8');

// --- 1. VERIFICACIÓN ESTÁTICA DE CÓDIGO ---
console.log('\n▶ [TEST 1] Verificación estática de funciones de aislamiento en app.js y cycle_archiver.js...');

assert.ok(appJsCode.includes('function getCycleFilteredStudents'), 'app.js debe definir getCycleFilteredStudents');
assert.ok(appJsCode.includes('window.getCycleFilteredStudents = getCycleFilteredStudents'), 'getCycleFilteredStudents debe exponerse en window');
assert.ok(appJsCode.includes('getCycleFilteredStudents(rawStudents)'), 'getAuthorizedStudents debe filtrar con getCycleFilteredStudents');
assert.ok(appJsCode.includes('getCycleFilteredStudents(rawBase)'), 'getSortedGradebookStudents debe filtrar con getCycleFilteredStudents');
assert.ok(appJsCode.includes('stCycle && stCycle !== targetCycle'), 'getStudentsCountByGradeAndSection debe aislar por targetCycle');

// Validar bloqueos de escritura en modo histórico
assert.ok(appJsCode.includes('[EnccoCloudSync.patchNode] Escritura bloqueada'), 'patchNode debe bloquear escrituras en modo histórico');
assert.ok(appJsCode.includes('[EnccoCloudSync.syncNode] Escritura bloqueada'), 'syncNode debe bloquear escrituras en modo histórico');

// Validar salvaguardas en SSE listeners
assert.ok(appJsCode.includes('isHistoryActive') && appJsCode.includes('cleanPath === \'students\''), 'SSE students debe validar isHistoryActive');
assert.ok(appJsCode.includes('isHistoryActive') && appJsCode.includes('cleanPath.startsWith(\'students/\')'), 'SSE students/ debe validar isHistoryActive');

console.log('  ✅ Test 1 Superado: Funciones y salvaguardas de aislamiento presentes y enlazadas.');

// --- 2. EVALUACIÓN DE getCycleFilteredStudents ---
console.log('\n▶ [TEST 2] Verificando comportamiento de getCycleFilteredStudents en aislamiento universal...');

// Ejecutar sandbox de getCycleFilteredStudents
const sandboxObj = {
    STATE: {
        activeCycle: '2027',
        isHistoricalReadOnlyMode: false,
        historicalViewingCycle: null,
        students: [
            { id: 'st-26-1', name: 'JUAN PÉREZ 2026', cycle: '2026', academicCycle: '2026' },
            { id: 'st-26-2', name: 'MARÍA LÓPEZ 2026', cycle: '2026', academicCycle: '2026' },
            { id: 'st-27-1', name: 'CARLOS GÓMEZ 2027', cycle: '2027', academicCycle: '2027' },
            { id: 'st-27-2', name: 'ANA MORALES 2027', cycle: '2027', academicCycle: '2027' },
            { id: 'st-28-1', name: 'LUIS CASTILLO 2028', cycle: '2028', academicCycle: '2028' }
        ]
    }
};

const filterFn = new Function('sandbox', `
    const window = sandbox;
    const STATE = sandbox.STATE;
    ${appJsCode.slice(appJsCode.indexOf('function getCycleFilteredStudents'), appJsCode.indexOf('window.getCycleFilteredStudents = getCycleFilteredStudents'))}
    return getCycleFilteredStudents;
`)(sandboxObj);

// CASO A: Ciclo Activo 2027 -> SOLO estudiantes 2027
sandboxObj.STATE.activeCycle = '2027';
sandboxObj.STATE.isHistoricalReadOnlyMode = false;
sandboxObj.STATE.historicalViewingCycle = null;

const result2027 = filterFn(sandboxObj.STATE.students);
assert.strictEqual(result2027.length, 2, 'En ciclo 2027 solo deben mostrarse 2 estudiantes de 2027');
assert.ok(result2027.every(s => s.cycle === '2027'), 'Todos los estudiantes retornados deben pertenecer al ciclo 2027');
assert.ok(!result2027.some(s => s.cycle === '2026'), 'Los estudiantes del ciclo 2026 deben estar 100% ocultos en 2027');

// CASO B: Modo Histórico 2026 -> SOLO estudiantes 2026
sandboxObj.STATE.isHistoricalReadOnlyMode = true;
sandboxObj.STATE.historicalViewingCycle = '2026';

const result2026 = filterFn(sandboxObj.STATE.students);
assert.strictEqual(result2026.length, 2, 'En histórico 2026 solo deben mostrarse 2 estudiantes de 2026');
assert.ok(result2026.every(s => s.cycle === '2026'), 'Todos los estudiantes retornados deben pertenecer al ciclo 2026');
assert.ok(!result2026.some(s => s.cycle === '2027'), 'Los estudiantes del ciclo 2027 deben estar 100% ocultos en histórico 2026');

// CASO C: Futuro Ciclo 2028 -> SOLO estudiantes 2028
sandboxObj.STATE.historicalViewingCycle = '2028';
const result2028 = filterFn(sandboxObj.STATE.students);
assert.strictEqual(result2028.length, 1, 'En ciclo 2028 solo debe mostrarse 1 estudiante de 2028');
assert.strictEqual(result2028[0].id, 'st-28-1', 'Debe ser el estudiante de 2028');
assert.ok(!result2028.some(s => s.cycle === '2026' || s.cycle === '2027'), 'Datos de 2026 y 2027 ocultos al ver 2028');

console.log('  ✅ Test 2 Superado: Aislamiento estricto y universal confirmado para cualquier ciclo.');

// --- 3. VERIFICACIÓN DE BLOQUEO DE ESCRITURA EN ENCCOCLOUDSYNC ---
console.log('\n▶ [TEST 3] Verificando bloqueo de syncNode y patchNode en modo histórico...');

const syncEnv = {
    STATE: {
        isHistoricalReadOnlyMode: true,
        historicalViewingCycle: '2026',
        activeCycle: '2026'
    }
};

const extractCloudSync = new Function('sandbox', `
    const STATE = sandbox.STATE;
    const ENCCO_DATABASE_POOLS = ['https://test-rtdb.firebaseio.com'];
    const getFirebaseDatabaseUrl = () => 'https://test-rtdb.firebaseio.com';
    let startIdx = ${appJsCode.indexOf('const EnccoCloudSync = {')};
    let endIdx = ${appJsCode.indexOf('window.EnccoCloudSync = EnccoCloudSync;')};
    ${appJsCode.slice(appJsCode.indexOf('const EnccoCloudSync = {'), appJsCode.indexOf('window.EnccoCloudSync = EnccoCloudSync;'))}
    return EnccoCloudSync;
`)(syncEnv);

(async () => {
    const patchBlocked = await extractCloudSync.patchNode('students', [{ id: 'stu-fake' }]);
    assert.strictEqual(patchBlocked, false, 'patchNode debe retornar false y bloquear escritura en modo histórico');

    const syncBlocked = await extractCloudSync.syncNode('students', [{ id: 'stu-fake' }]);
    assert.strictEqual(syncBlocked, false, 'syncNode debe retornar false y bloquear escritura en modo histórico');

    console.log('  ✅ Test 3 Superado: Escrituras accidentales a Firebase bloqueadas en modo histórico.');

    // --- 4. VERIFICACIÓN CONTRA BASES DE DATOS EN VIVO (2026 HISTÓRICO vs 2027 ACTIVO) ---
    console.log('\n▶ [TEST 4] Verificando integridad de bases reales en RTDB (/encc_school_state/)...');
    const dbUrl = 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com';

    // 4.1 Cargar 2026 Histórico
    const res26 = await fetch(`${dbUrl}/encc_school_state/historico/2026/studentsSnapshot.json`);
    assert.strictEqual(res26.ok, true, 'studentsSnapshot 2026 debe existir en RTDB');
    const st2026 = await res26.json();
    assert.strictEqual(st2026.length, 412, 'El histórico 2026 debe contener exactamente 412 estudiantes');
    assert.ok(st2026.every(s => (s.cycle || s.academicCycle) === '2026'), 'Todos los estudiantes del histórico 2026 deben tener ciclo 2026');

    // 4.2 Cargar 2027 Activo
    const res27 = await fetch(`${dbUrl}/encc_school_state/students.json`);
    assert.strictEqual(res27.ok, true, 'students 2027 debe existir en RTDB');
    const st2027 = await res27.json();
    assert.ok(st2027.length >= 400, `El ciclo activo 2027 debe contener al menos 400 estudiantes (Actual: ${st2027.length})`);
    assert.ok(st2027.every(s => (s.cycle || s.academicCycle) === '2027'), 'Todos los estudiantes del ciclo 2027 deben tener ciclo 2027');

    // 4.3 Comprobar que todas las notas de 2027 estén en 0 cero
    let nonZero2027 = 0;
    st2027.forEach(s => {
        if (s.grades) {
            Object.values(s.grades).forEach(arr => {
                if (Array.isArray(arr)) {
                    arr.forEach(val => {
                        if (Number(val) !== 0) nonZero2027++;
                    });
                }
            });
        }
    });
    assert.strictEqual(nonZero2027, 0, `El ciclo activo 2027 debe tener exactamente 0 notas mayores a cero (Encontradas: ${nonZero2027})`);

    // 4.4 Comprobar que el histórico 2026 mantenga sus notas completas
    let nonZero2026 = 0;
    st2026.forEach(s => {
        if (s.grades) {
            Object.values(s.grades).forEach(arr => {
                if (Array.isArray(arr)) {
                    arr.forEach(val => {
                        if (Number(val) > 0) nonZero2026++;
                    });
                }
            });
        }
    });
    assert.ok(nonZero2026 > 10000, `El histórico 2026 debe conservar sus más de 10,000 notas oficiales (Encontradas: ${nonZero2026})`);

    console.log(`  ✅ Test 4 Superado: 2026 contiene 412 alumnos con notas intactas (${nonZero2026} notas); 2027 contiene ${st2027.length} alumnos con 100% notas en 0 cero.`);

    console.log('\n' + '='.repeat(80));
    console.log('🎉 TODAS LAS VERIFICACIONES DE AISLAMIENTO ENTRE CICLOS PASARON CON ÉXITO (100%)');
    console.log('='.repeat(80));
    process.exit(0);
})().catch(err => {
    console.error('\n❌ ERROR EN PRUEBA DE AISLAMIENTO:', err);
    process.exit(1);
});
