// test_permission_date_sync_attendance.js
// Verification suite for Automatic Attendance Synchronization on Student Permission Date Changes

const fs = require('fs');
const assert = require('assert');

console.log('================================================================================');
console.log('🧪 VERIFICACIÓN: SINCRONIZACIÓN AUTOMÁTICA DE ASISTENCIA ANTE CAMBIO DE FECHAS');
console.log('================================================================================\n');

// Mock browser environment for node testing
global.window = global;
global.document = {
    getElementById: (id) => null
};
global.confirm = () => true;
global.showToast = () => {};
global._attendanceSaveTimeout = null;
global.saveStateToLocalStorage = () => {};

let syncCalls = [];
global.EnccoCloudSync = {
    syncNode: (node, data) => {
        syncCalls.push({ node, data });
    }
};

// Minimal STATE fixture
global.STATE = {
    activeCycle: '2026',
    currentUser: { id: 'usr-dir', role: 'director', username: 'director' },
    currentRole: 'director',
    students: [
        {
            id: 'std-test-1',
            personalCode: 'COD-1001',
            carne: 'CAR-1001',
            firstName: 'Carlos',
            lastName: 'Mendoza',
            grade: '4to A',
            gradeCode: '4to A',
            section: 'A'
        },
        {
            id: 'std-test-2',
            personalCode: 'COD-1002',
            carne: 'CAR-1002',
            firstName: 'Ana',
            lastName: 'Gómez',
            grade: '4to A',
            gradeCode: '4to A',
            section: 'A'
        }
    ],
    gradesList: [
        { id: 'grd-4a', code: '4to A', name: '4to Perito Contador', section: 'Sección A' }
    ],
    pensum: [
        { id: 'crs-cont-1', name: 'Contabilidad General', grade: '4to A', section: 'A' },
        { id: 'crs-mat-1', name: 'Matemática Comercial', grade: '4to A', section: 'A' }
    ],
    studentPermissions: [],
    attendanceRecords: {},
    attendancePermissionsMeta: {}
};

// Load app code to test actual functions
const appCode = fs.readFileSync('app.js', 'utf8');

// Extract and eval required helper and permission functions
function extractFunction(name) {
    const fnRegex = new RegExp(`function ${name}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}(?=\\s*(?:window\\.${name}|function|const|let|var|\\/\\/))`);
    const match = appCode.match(fnRegex);
    if (!match) {
        throw new Error(`Function ${name} not found in app.js`);
    }
    return match[0];
}

eval(extractFunction('getAttendanceRecordKey'));
eval(extractFunction('extractGradeNumber'));
eval(extractFunction('extractSectionLetter'));
eval(extractFunction('formatStudentDisplayName'));
eval(extractFunction('isDirectorOrSuperAdmin'));
eval(extractFunction('saveAttendanceRecords'));
eval(extractFunction('applyStudentPermission'));
eval(extractFunction('removeStudentPermissionDatesFromAttendance'));
eval(extractFunction('revokeStudentPermission'));

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ ${name}: ${e.message}`);
        failed++;
    }
}

// Key helpers
const genKey = getAttendanceRecordKey('4to A', 8, 'GENERAL');
const crs1Key = getAttendanceRecordKey('4to A', 8, 'crs-cont-1');
const crs2Key = getAttendanceRecordKey('4to A', 8, 'crs-mat-1');

// Setup initial pre-existing attendance data to verify non-regression and no-data-loss
STATE.attendanceRecords[genKey] = {
    'std-test-1': {
        1: 'P', // Day 1: Presente (Docente ingresó)
        2: 'A', // Day 2: Ausente (Docente ingresó)
        25: 'T' // Day 25: Tarde (Docente ingresó)
    },
    'std-test-2': {
        1: 'P',
        10: 'P',
        11: 'P'
    }
};

STATE.attendanceRecords[crs1Key] = {
    'std-test-1': { 1: 'P', 2: 'A', 25: 'T' },
    'std-test-2': { 1: 'P', 10: 'P', 11: 'P' }
};

STATE.attendanceRecords[crs2Key] = {
    'std-test-1': { 1: 'P', 2: 'A', 25: 'T' },
    'std-test-2': { 1: 'P', 10: 'P', 11: 'P' }
};

// TEST 1: Creación de permiso inicial (10 al 12 de Agosto)
test('Creación: applyStudentPermission marca J y metadata del 10 al 12 en General y todas las clases', () => {
    const perm = {
        id: 'perm-001',
        studentId: 'std-test-1',
        studentName: 'Mendoza, Carlos',
        personalCode: 'COD-1001',
        grade: '4to A',
        gradeCode: '4to A',
        section: 'A',
        startDate: '2026-08-10',
        endDate: '2026-08-12',
        reasonCategory: 'Salud',
        reasonDetail: 'Cita médica dental',
        authorizedBy: 'Auxiliatura'
    };
    STATE.studentPermissions.push(perm);
    applyStudentPermission(perm);

    // Verificar días 10, 11, 12 marcados como 'J'
    [10, 11, 12].forEach(day => {
        assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][day], 'J', `Día ${day} debe ser 'J' en General`);
        assert.strictEqual(STATE.attendanceRecords[crs1Key]['std-test-1'][day], 'J', `Día ${day} debe ser 'J' en Curso 1`);
        assert.strictEqual(STATE.attendanceRecords[crs2Key]['std-test-1'][day], 'J', `Día ${day} debe ser 'J' en Curso 2`);
        assert(STATE.attendancePermissionsMeta[`std-test-1_8_${day}`], `Metadata debe existir para día ${day}`);
    });

    // Verificar datos previos intactos (sin pérdida de datos)
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][1], 'P', 'Día 1 de std 1 debe seguir siendo P');
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][2], 'A', 'Día 2 de std 1 debe seguir siendo A');
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][25], 'T', 'Día 25 de std 1 debe seguir siendo T');
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-2'][10], 'P', 'Std 2 día 10 debe seguir siendo P intacto');
});

// TEST 2: Modificación de fechas (Dirección o Auxiliatura cambia fechas: se traslada a 12 al 15 de Agosto)
test('Modificación: Desplazamiento de rango (10-12 -> 12-15) remueve J del 10 y 11, y aplica J en 13, 14, 15', () => {
    const perm = STATE.studentPermissions.find(p => p.id === 'perm-001');
    const oldStart = perm.startDate; // 2026-08-10
    const oldEnd = perm.endDate;     // 2026-08-12
    const newStart = '2026-08-12';
    const newEnd = '2026-08-15';

    // Ejecutar remoción de fechas obsoletas
    removeStudentPermissionDatesFromAttendance(perm, oldStart, oldEnd, newStart, newEnd);

    // Días 10 y 11 ya no están en el nuevo rango: deben haberse limpiado de la asistencia
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][10], undefined, 'Día 10 debe haberse limpiado');
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][11], undefined, 'Día 11 debe haberse limpiado');
    assert.strictEqual(STATE.attendancePermissionsMeta['std-test-1_8_10'], undefined, 'Metadata día 10 debe eliminarse');
    assert.strictEqual(STATE.attendancePermissionsMeta['std-test-1_8_11'], undefined, 'Metadata día 11 debe eliminarse');

    // Actualizar permiso y re-aplicar
    perm.startDate = newStart;
    perm.endDate = newEnd;
    applyStudentPermission(perm);

    // Días 12, 13, 14, 15 deben ser 'J'
    [12, 13, 14, 15].forEach(day => {
        assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][day], 'J', `Día ${day} debe ser 'J' en General`);
        assert.strictEqual(STATE.attendanceRecords[crs1Key]['std-test-1'][day], 'J', `Día ${day} debe ser 'J' en Curso 1`);
        assert.strictEqual(STATE.attendanceRecords[crs2Key]['std-test-1'][day], 'J', `Día ${day} debe ser 'J' en Curso 2`);
        assert(STATE.attendancePermissionsMeta[`std-test-1_8_${day}`], `Metadata debe existir para día ${day}`);
    });

    // Verificación de datos de otros días y otros alumnos: totalmente preservados
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][1], 'P', 'Día 1 no debe haber cambiado');
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][2], 'A', 'Día 2 no debe haber cambiado');
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][25], 'T', 'Día 25 no debe haber cambiado');
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-2'][10], 'P', 'Std 2 día 10 no debe ser afectado');
});

// TEST 3: Reducción de rango a un solo día (12-15 -> 12 de Agosto solamente)
test('Modificación: Reducción a un solo día (12 al 12) remueve J de 13, 14, 15', () => {
    const perm = STATE.studentPermissions.find(p => p.id === 'perm-001');
    const oldStart = perm.startDate; // 2026-08-12
    const oldEnd = perm.endDate;     // 2026-08-15
    const newStart = '2026-08-12';
    const newEnd = '2026-08-12';

    removeStudentPermissionDatesFromAttendance(perm, oldStart, oldEnd, newStart, newEnd);
    perm.startDate = newStart;
    perm.endDate = newEnd;
    applyStudentPermission(perm);

    // Día 12 sigue siendo J
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][12], 'J', 'Día 12 debe permanecer en J');
    // Días 13, 14, 15 se removieron
    [13, 14, 15].forEach(day => {
        assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][day], undefined, `Día ${day} debe haberse limpiado`);
        assert.strictEqual(STATE.attendanceRecords[crs1Key]['std-test-1'][day], undefined, `Día ${day} debe haberse limpiado en Curso 1`);
        assert.strictEqual(STATE.attendancePermissionsMeta[`std-test-1_8_${day}`], undefined, `Metadata día ${day} debe eliminarse`);
    });
});

// TEST 4: Anulación de permiso (Revoke) por Dirección General
test('Anulación: revokeStudentPermission remueve J de todas las asistencias y limpia metadata sin perder otros datos', () => {
    syncCalls = [];
    revokeStudentPermission('perm-001');

    // Verificar que el permiso fue removido de STATE.studentPermissions
    assert(!STATE.studentPermissions.some(p => p.id === 'perm-001'), 'El permiso debe estar fuera de studentPermissions');

    // Verificar que el día 12 fue limpiado
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][12], undefined, 'Día 12 debe haberse limpiado al anular');
    assert.strictEqual(STATE.attendanceRecords[crs1Key]['std-test-1'][12], undefined, 'Día 12 debe haberse limpiado en Curso 1');
    assert.strictEqual(STATE.attendancePermissionsMeta['std-test-1_8_12'], undefined, 'Metadata debe estar limpia');

    // Verificar datos no relacionados preservados
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][1], 'P', 'Día 1 docente conservado');
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][2], 'A', 'Día 2 docente conservado');
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-1'][25], 'T', 'Día 25 docente conservado');
    assert.strictEqual(STATE.attendanceRecords[genKey]['std-test-2'][10], 'P', 'Std 2 intacto');

    // Sincronización en la nube llamada para attendanceRecords
    assert(syncCalls.some(c => c.node === 'attendanceRecords'), 'Debe sincronizar attendanceRecords en la nube');
    assert(syncCalls.some(c => c.node === 'studentPermissions'), 'Debe sincronizar studentPermissions en la nube');
});

// TEST 5: Sincronización multi-alias (studentId, personalCode, carne)
test('Multi-alias: removeStudentPermissionDatesFromAttendance limpia tanto si los registros usan carne como id', () => {
    // Simulamos que un curso registró la asistencia usando el personalCode o carné en vez del id
    STATE.attendanceRecords[crs1Key]['CAR-1001'] = { 18: 'J' };
    STATE.attendancePermissionsMeta['CAR-1001_8_18'] = { permissionId: 'perm-alias-test' };

    const permAlias = {
        id: 'perm-alias-test',
        studentId: 'std-test-1',
        carne: 'CAR-1001',
        personalCode: 'COD-1001',
        grade: '4to A',
        gradeCode: '4to A',
        section: 'A',
        startDate: '2026-08-18',
        endDate: '2026-08-18'
    };

    removeStudentPermissionDatesFromAttendance(permAlias, '2026-08-18', '2026-08-18', null, null);

    assert.strictEqual(STATE.attendanceRecords[crs1Key]['CAR-1001'][18], undefined, 'Debe haber limpiado la J del registro con carne');
    assert.strictEqual(STATE.attendancePermissionsMeta['CAR-1001_8_18'], undefined, 'Debe haber limpiado la metadata con carne');
});

console.log(`\n================================================================================`);
console.log(`🎉 RESULTADOS: ${passed} pasaron, ${failed} fallaron.`);
console.log(`================================================================================\n`);

if (failed > 0) {
    process.exit(1);
}
