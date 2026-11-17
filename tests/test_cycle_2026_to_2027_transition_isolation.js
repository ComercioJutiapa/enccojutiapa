/**
 * tests/test_cycle_2026_to_2027_transition_isolation.js
 * 
 * Verificación Rigurosa de la Transición de Retorno:
 * "Al cargar el histórico 2026 y regresar a 2027, los datos de 2026 NO deben seguir viéndose.
 * Deben separarse de forma dinámica, coherente y sin pérdida de datos."
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('='.repeat(80));
console.log('🛡️ TEST: AISLAMIENTO GARANTIZADO DE RETORNO (2026 HISTÓRICO -> 2027 ACTIVO)');
console.log('='.repeat(80));

const appJsCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const archiverJsCode = fs.readFileSync(path.join(__dirname, '..', 'cycle_archiver.js'), 'utf8');

const domElements = {};
const mockDoc = {
    getElementById: (id) => domElements[id] || { 
        style: {}, 
        classList: { add: () => {}, remove: () => {} }, 
        value: '', 
        innerHTML: '', 
        remove: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
    },
    createElement: (tag) => ({ 
        tagName: tag.toUpperCase(), 
        style: {}, 
        classList: { add: () => {}, remove: () => {} }, 
        appendChild: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
};

const mockStorage = {
    _d: {},
    getItem: function(k) { return this._d[k] || null; },
    setItem: function(k, v) { this._d[k] = String(v); },
    removeItem: function(k) { delete this._d[k]; }
};

const sandbox = {
    console: console,
    window: {},
    document: mockDoc,
    sessionStorage: mockStorage,
    localStorage: mockStorage,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    setInterval: () => ({ unref: () => {} }),
    clearInterval: () => {},
    navigator: { onLine: true },
    location: { reload: () => {} },
    scrollTo: () => {},
    addEventListener: () => {},
    showToast: () => {},
    escapeHtml: (s) => String(s || ''),
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    currentUser: { id: 'usr-1', name: 'Director General', role: 'director' },
    isSuperUserRole: () => true,
    isDirectorRole: () => true,
    STATE: {
        currentUser: { id: 'usr-1', name: 'Director General', role: 'director' },
        currentRole: 'director',
        users: [{ id: 'usr-1', name: 'Director General', role: 'director' }],
        gradesList: [],
        activeCycle: '2027',
        academicCycle: '2027',
        cycles: [
            { id: 'cyc-2026', name: '2026', status: 'Histórico', isArchived: true },
            { id: 'cyc-2027', name: '2027', status: 'Activo', isArchived: false }
        ],
        students: [
            { id: 'st-27-001', name: 'ALUMNO REGULAR 2027', cycle: '2027', academicCycle: '2027', grades: { 'Contabilidad': [0, 0, 0, 0] } },
            { id: 'st-27-002', name: 'ALUMNA REGULAR 2027', cycle: '2027', academicCycle: '2027', grades: { 'Contabilidad': [0, 0, 0, 0] } }
        ],
        attendanceRecords: {
            '2027_M9_5to B': { 'st-27-001': 'P' }
        },
        calificaciones: {},
        isHistoricalReadOnlyMode: false,
        historicalViewingCycle: null,
        viewingHistoricalCycle: null
    }
};
sandbox.window = sandbox;

vm.createContext(sandbox);

try {
    vm.runInContext(appJsCode, sandbox);
    console.log('✅ app.js cargado en VM');
} catch (e) {
    console.error('❌ Error cargando app.js:', e);
}

try {
    vm.runInContext(archiverJsCode, sandbox);
    console.log('✅ cycle_archiver.js cargado en VM');
} catch (e) {
    console.error('❌ Error cargando cycle_archiver.js:', e);
}

(async () => {
    // 1. Guardar copia limpia de 2027 en el backup de RAM
    sandbox.window._active2027StudentsBackup = JSON.parse(JSON.stringify(sandbox.STATE.students));

    console.log('\n--- PASO 1: Estado inicial en Ciclo Activo 2027 ---');
    assert.strictEqual(sandbox.STATE.activeCycle, '2027');
    assert.strictEqual(sandbox.STATE.isHistoricalReadOnlyMode, false);
    const init2027Students = sandbox.getCycleFilteredStudents(sandbox.STATE.students, '2027');
    assert.strictEqual(init2027Students.length, 2);
    console.log('✅ Paso 1: Ciclo 2027 activo con', init2027Students.length, 'estudiantes.');

    console.log('\n--- PASO 2: Carga del Ciclo Histórico 2026 ---');
    const archived2026Mock = {
        studentsSnapshot: [
            { id: 'st-26-001', name: 'HISTORICO 2026 ESTUDIANTE A', cycle: '2026', academicCycle: '2026', grades: { 'Contabilidad': [80, 85, 90, 88] } },
            { id: 'st-26-002', name: 'HISTORICO 2026 ESTUDIANTE B', cycle: '2026', academicCycle: '2026', grades: { 'Contabilidad': [70, 75, 80, 82] } },
            { id: 'st-26-003', name: 'HISTORICO 2026 ESTUDIANTE C', cycle: '2026', academicCycle: '2026', grades: { 'Contabilidad': [95, 90, 92, 94] } }
        ],
        calificacionesSnapshot: {
            'st-26-001_contabilidad_b1': { total: 80 },
            'st-26-002_contabilidad_b1': { total: 70 }
        },
        attendanceSnapshot: {
            '2026_M1_4to A': { 'st-26-001': 'P' }
        }
    };

    await sandbox.EnccoCycleArchiver.switchToHistoricalCycle('2026', archived2026Mock);
    assert.strictEqual(sandbox.STATE.activeCycle, '2026');
    assert.strictEqual(sandbox.STATE.isHistoricalReadOnlyMode, true);
    assert.strictEqual(sandbox.STATE.students.length, 3);
    assert.strictEqual(Object.keys(sandbox.STATE.calificaciones).length, 2);
    assert.ok(sandbox.STATE.attendanceRecords['2026_M1_4to A']);
    console.log('✅ Paso 2: Modo histórico 2026 activado correctamente (3 alumnos históricos, notas y asistencias de 2026 cargadas).');

    console.log('\n--- PASO 3: Retorno a Ciclo Activo 2027 vía changeAcademicCycle ---');
    sandbox.changeAcademicCycle('2027');

    assert.strictEqual(sandbox.STATE.activeCycle, '2027', 'STATE.activeCycle debe ser exactamente 2027');
    assert.strictEqual(sandbox.STATE.academicCycle, '2027', 'STATE.academicCycle debe ser exactamente 2027');
    assert.strictEqual(sandbox.STATE.isHistoricalReadOnlyMode, false, 'isHistoricalReadOnlyMode debe ser false al regresar a 2027');
    assert.strictEqual(sandbox.STATE.historicalViewingCycle, null, 'historicalViewingCycle debe ser null');
    assert.strictEqual(sandbox.STATE.viewingHistoricalCycle, null, 'viewingHistoricalCycle debe ser null');

    // Verificar que ningún estudiante de 2026 esté presente
    const studentsIn2027 = sandbox.getCycleFilteredStudents(sandbox.STATE.students, '2027');
    console.log('Alumnos filtrados en 2027 tras retorno:', studentsIn2027.map(s => s.name));
    assert.strictEqual(studentsIn2027.length, 2, 'Debe haber exactamente 2 alumnos activos de 2027');
    studentsIn2027.forEach(s => {
        assert.strictEqual(s.cycle, '2027', 'Cada alumno debe pertenecer a 2027');
        assert.ok(!s.name.includes('HISTORICO 2026'), 'Ningún alumno de 2026 debe figurar en 2027');
    });

    // Verificar que las calificaciones de 2026 hayan sido purgadas de la memoria activa
    const califKeys = Object.keys(sandbox.STATE.calificaciones || {});
    console.log('Claves de calificaciones en memoria activa 2027:', califKeys);
    assert.strictEqual(califKeys.length, 0, 'No deben quedar calificaciones residuales de 2026 en memoria activa');

    // Verificar que la asistencia de 2026 no exista en 2027
    assert.strictEqual(sandbox.STATE.attendanceRecords['2026_M1_4to A'], undefined, 'Asistencia 2026 no debe existir');
    console.log('✅ Paso 3: Retorno a 2027 superado con 100% de aislamiento. Cero datos de 2026 visibles.');

    console.log('\n--- PASO 4: Salida directa mediante exitHistoricalView(\'2027\') ---');
    // Simular una nueva entrada a 2026
    await sandbox.EnccoCycleArchiver.switchToHistoricalCycle('2026', archived2026Mock);
    assert.strictEqual(sandbox.STATE.activeCycle, '2026');

    // Salir directamente con exitHistoricalView
    await sandbox.EnccoCycleArchiver.exitHistoricalView('2027');
    assert.strictEqual(sandbox.STATE.activeCycle, '2027');
    assert.strictEqual(sandbox.STATE.isHistoricalReadOnlyMode, false);
    const checkStudentsAfterExit = sandbox.getCycleFilteredStudents(sandbox.STATE.students, '2027');
    assert.strictEqual(checkStudentsAfterExit.length, 2);
    console.log('✅ Paso 4: Salida directa vía exitHistoricalView restaura 2027 sin mezclar 2026.');

    console.log('\n' + '='.repeat(80));
    console.log('🎉 TEST DE AISLAMIENTO Y RETORNO 2026 -> 2027 APROBADO CON ÉXITO');
    console.log('='.repeat(80));
    process.exit(0);
})().catch(err => {
    console.error('❌ Error en el test de aislamiento:', err);
    process.exit(1);
});
