/**
 * tests/test_attendance_multicycle_and_scholarship_pct.js
 *
 * Verifica:
 * 1. Aislamiento perpetuo de asistencia entre ciclos (2026 vs 2027 vs 2028) sin mezcla de alumnos ni registros.
 * 2. Protección del histórico 2026 en sanitizeAttendanceCalendarAndWeekends cuando el ciclo activo es 2027/2028.
 * 3. Porcentaje de asistencia a la fecha (getStudentAttendancePercentageToDate) para Bolsas de Estudio y Becas.
 * 4. Sincronización puntual en Firebase sin sobrescribir studentPermissions concurrentes.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("🧪 Iniciando Test Suite: Asistencia Multi-Ciclo, Rendimiento y % para Becas/Bolsas...");

global.window = global;
global.window.location = { pathname: '/', href: 'http://localhost/', search: '' };
global.window.addEventListener = () => {};
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
};
global.showToast = () => {};
global.saveStateToLocalStorage = () => {};
global.escapeHtml = s => String(s || '');

const syncedNodes = [];
global.EnccoCloudSync = {
    syncNode: async (node, data) => { syncedNodes.push(node); return true; },
    patchNode: async (node, data) => { syncedNodes.push('patch:' + node); return true; }
};

eval(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8'));

(async () => {
    Object.assign(STATE, {
        activeCycle: '2027',
        historicalViewingCycle: null,
        viewingHistoricalCycle: null,
        currentRole: 'admin',
        currentUser: { id: 'usr-aux-01', name: 'Admin', role: 'admin' },
        gradesList: [
            { id: 'grd-4a', code: '4to A', name: '4to Perito Contador', section: 'Sección A' },
            { id: 'grd-4e', code: '4to E', name: '4to Perito Contador', section: 'Sección E' }
        ],
        students: [
            { id: 'stu-2026-only', carne: '2026-4A-001', personalCode: 'P2026A', name: 'Estudiante Solo 2026', grade: '4to Perito Contador', gradeCode: '4to A', section: 'Sección A', cycle: '2026', status: 'Activo', active: true },
            { id: 'stu-2027-beca', carne: '2027-4E-001', personalCode: 'P2027E', name: 'Estudiante Beca 2027', grade: '4to Perito Contador', gradeCode: '4to E', section: 'Sección E', cycle: '2027', status: 'Activo', active: true }
        ],
        attendanceRecords: {
            // 17 de abril 2026 es VIERNES hábil (en 2027 el 17 de abril es SÁBADO)
            '2026_M4_4to A_pen-4to-a-338': {
                'stu-2026-only': { '15': 'P', '16': 'P', '17': 'P' }
            },
            // Registros 2027 para estudiante de 4to E (días hábiles de febrero 2027: 1=L, 2=M, 3=Mi, 4=J, 5=V, 8=L, 9=M, 10=Mi, 11=J, 12=V)
            '2027_M2_4to E_pen-4to-e-338': {
                'stu-2027-beca': {
                    '1': 'P', '2': 'P', '3': 'P', '4': 'P', '5': 'J',
                    '8': 'P', '9': 'T', '10': 'P', '11': 'A', '12': 'S'
                }
            },
            // Registro 2028 para confirmar que 2028 no se mezcla con 2027 ni 2026
            '2028_M2_4to E_pen-4to-e-338': {
                'stu-2027-beca': { '1': 'A', '2': 'A', '3': 'A', '4': 'A' }
            }
        },
        attendancePermissionsMeta: {},
        studentPermissions: []
    });

    // 1. Aislamiento de estudiantes por ciclo en getAttendanceStudents
    console.log("\n➡️  Prueba 1: Aislamiento de estudiantes por ciclo en getAttendanceStudents...");
    const list4A_2027 = getAttendanceStudents('4to A');
    assert.strictEqual(list4A_2027.length, 0, "4to A en 2027 no debe mostrar alumnos de 2026 aunque esté vacía");
    const list4E_2027 = getAttendanceStudents('4to E');
    assert.strictEqual(list4E_2027.length, 1, "4to E en 2027 debe mostrar su alumno inscrito de 2027");
    console.log("  ✅ Prueba 1 Superada: Cero mezcla de alumnos entre 2026 y 2027.");

    // 2. Protección del histórico 2026 en sanitizeAttendanceCalendarAndWeekends
    console.log("\n➡️  Prueba 2: sanitizeAttendanceCalendarAndWeekends respeta el año real de cada clave...");
    STATE.activeCycle = '2027';
    sanitizeAttendanceCalendarAndWeekends();
    assert.strictEqual(
        STATE.attendanceRecords['2026_M4_4to A_pen-4to-a-338']['stu-2026-only']['17'],
        'P',
        "El viernes 17 de abril de 2026 NO debe borrarse cuando el ciclo activo es 2027 (donde el 17 de abril es sábado)"
    );
    console.log("  ✅ Prueba 2 Superada: Registros históricos 2026 intactos al operar en 2027.");

    // 3. Aislamiento de consolidación mensual por ciclo
    console.log("\n➡️  Prueba 3: getConsolidatedAttendanceMonthData aísla 2026, 2027 y 2028...");
    STATE.activeCycle = '2027';
    const cons4A_M4_2027 = getConsolidatedAttendanceMonthData('4to A', 4, 'pen-4to-a-338');
    assert.strictEqual(cons4A_M4_2027['stu-2026-only'], undefined, "Consolidado abril 2027 no debe contener registros de abril 2026");

    const cons4E_M2_2027 = getConsolidatedAttendanceMonthData('4to E', 2, 'pen-4to-e-338');
    assert.strictEqual(cons4E_M2_2027['stu-2027-beca']['1'], 'P', "Consolidado febrero 2027 debe preservar 'P' y no mezclarse con 'A' de 2028");
    console.log("  ✅ Prueba 3 Superada: Consolidado mensual estrictamente aislado por ciclo.");

    // 4. Porcentaje de asistencia a la fecha para Bolsas de Estudio y Becas
    console.log("\n➡️  Prueba 4: getStudentAttendancePercentageToDate (Bolsas de Estudio y Becas)...");
    assert.strictEqual(typeof getStudentAttendancePercentageToDate, 'function', "getStudentAttendancePercentageToDate debe existir");

    // En 2027: 6 P + 1 T + 1 J = 8 asistidos, 1 A = 9 computables (1 S no computa en contra) => 8/9 = 88.9% (Apto Beca)
    const pct2027 = getStudentAttendancePercentageToDate('stu-2027-beca', '2027');
    assert.strictEqual(pct2027.cycle, '2027');
    assert.strictEqual(pct2027.present, 6);
    assert.strictEqual(pct2027.tardy, 1);
    assert.strictEqual(pct2027.justified, 1);
    assert.strictEqual(pct2027.absent, 1);
    assert.strictEqual(pct2027.suspended, 1);
    assert.strictEqual(pct2027.computableDays, 9);
    assert.strictEqual(pct2027.attendedDays, 8);
    assert.strictEqual(pct2027.percentage, 88.9, `Se esperaba 88.9% y se obtuvo ${pct2027.percentage}%`);
    assert.strictEqual(pct2027.scholarshipStatus, 'apto');

    // En 2028: 4 A de 4 días computables (0% -> Riesgo Beca), sin contaminar 2027
    const pct2028 = getStudentAttendancePercentageToDate('stu-2027-beca', '2028');
    assert.strictEqual(pct2028.percentage, 0);
    assert.strictEqual(pct2028.scholarshipStatus, 'riesgo');

    // En 2026: stu-2027-beca no tiene registros => null / sin_registros
    const pct2026Empty = getStudentAttendancePercentageToDate('stu-2027-beca', '2026');
    assert.strictEqual(pct2026Empty.percentage, null);
    assert.strictEqual(pct2026Empty.scholarshipStatus, 'sin_registros');
    console.log("  ✅ Prueba 4 Superada: Porcentaje a la fecha exacto (88.9% en 2027, 0% en 2028, sin registros en 2026).");

    // 5. Sincronización puntual de asistencia sin pisar studentPermissions
    console.log("\n➡️  Prueba 5: _syncAttendanceToFirebaseBackground no sobrescribe permisos en toma puntual...");
    syncedNodes.length = 0;
    const origSyncNode = EnccoCloudSync.syncNode;
    EnccoCloudSync.syncNode = async (node, data) => { syncedNodes.push(node); return true; };
    await _syncAttendanceToFirebaseBackground('2027_M2_4to E_pen-4to-e-338');
    EnccoCloudSync.syncNode = origSyncNode;
    assert.ok(syncedNodes.includes('attendanceRecords/2027_M2_4to E_pen-4to-e-338'), "Debe sincronizar el nodo específico de la cátedra");
    assert.ok(!syncedNodes.includes('studentPermissions'), "NO debe sobrescribir studentPermissions durante una toma de asistencia puntual");
    assert.ok(!syncedNodes.includes('attendancePermissionsMeta'), "NO debe sobrescribir attendancePermissionsMeta durante una toma puntual");
    console.log("  ✅ Prueba 5 Superada: Sincronización puntual atómica y segura.");

    console.log("\n🎯 ¡TODAS LAS PRUEBAS DE ASISTENCIA MULTI-CICLO Y % PARA BECAS PASARON AL 100%!\n");
    process.exit(0);
})().catch(err => {
    console.error("❌ Error en prueba de asistencia:", err);
    process.exit(1);
});
