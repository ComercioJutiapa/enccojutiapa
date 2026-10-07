/**
 * test_attendance_course_isolation.js
 * 
 * Validación de Arquitectura de Asistencia Individual por Cátedra:
 * "en el caso de la asistencia recuerda que no estan vinculadas, deben ser individuales para cada clase cuando la toma el docente"
 * 
 * Verifica:
 * 1. La asistencia tomada por un docente en el Curso 1 (P, A, J, T) NO afecta, no se vincula ni se refleja en el Curso 2.
 * 2. Las justificaciones de aula 'J' tomadas por un docente en el Curso 1 NO se interpretan como permisos institucionales universales.
 * 3. En el Curso 2, el alumno con 'J' del Curso 1 puede ser marcado normalmente y no es considerado justificado.
 * 4. ÚNICAMENTE los permisos oficiales emitidos por Auxiliatura / Dirección / Secretaría aplican universalmente con escudo/bloqueo institucional.
 * 5. Reversión o modificación en una cátedra no afecta a las demás.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================================');
console.log('🧪 PRUEBAS: AISLAMIENTO ESTRICTO DE ASISTENCIA POR CÁTEDRA / DOCENTE');
console.log('================================================================================\n');

// 1. Cargar código fuente de app.js en entorno sandbox
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

const mockStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};

const mockWindow = {
    location: { 
        origin: 'https://comerciojutiapa.edu.gt', 
        href: 'https://comerciojutiapa.edu.gt/plataforma.html', 
        pathname: '/plataforma.html', 
        search: '', 
        hash: '',
        replace: () => {},
        assign: () => {},
        reload: () => {}
    },
    sessionStorage: mockStorage,
    localStorage: mockStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
    confirm: () => true,
    prompt: () => "1",
    alert: () => {},
    navigator: { userAgent: 'NodeTest', vibrate: () => {} },
    open: () => ({ document: { write: () => {}, close: () => {} }, print: () => {} }),
    clearTimeout: () => {},
    setTimeout: (fn, ms) => { return 1; },
    setInterval: () => 1,
    clearInterval: () => {},
    requestAnimationFrame: (cb) => {},
    showToast: () => {},
    console: console,
    STATE: {
        activeCycle: '2026',
        currentRole: 'docente',
        currentUser: { id: 'prof-contab', name: 'Prof. Contabilidad', role: 'docente' },
        gradesList: [
            { code: '6PC_A', name: '6to Perito Contador A', section: 'A', career: 'Perito Contador' }
        ],
        pensum: [
            { id: 'pen-6a-contab', subject: 'Contabilidad Bancaria', gradeCode: '6PC_A', section: 'A', teacher: 'Prof. Contabilidad', teacherId: 'prof-contab' },
            { id: 'pen-6a-meca', subject: 'Mecanografía Computarizada', gradeCode: '6PC_A', section: 'A', teacher: 'Prof. Mecanografía', teacherId: 'prof-meca' }
        ],
        students: [
            { id: 's-01', firstName: 'Juan', lastName: 'Pérez', status: 'Inscrito', gradeCode: '6PC_A', section: 'A' },
            { id: 's-02', firstName: 'María', lastName: 'López', status: 'Inscrito', gradeCode: '6PC_A', section: 'A' },
            { id: 's-03', firstName: 'Carlos', lastName: 'Gómez', status: 'Inscrito', gradeCode: '6PC_A', section: 'A' },
            { id: 's-04', firstName: 'Ana', lastName: 'Martínez', status: 'Inscrito', gradeCode: '6PC_A', section: 'A' },
            { id: 's-05', firstName: 'Pedro', lastName: 'Ramírez', status: 'Inscrito', gradeCode: '6PC_A', section: 'A' }
        ],
        attendanceRecords: {},
        attendancePermissionsMeta: {},
        studentPermissions: []
    }
};

const createMockElem = (tag = 'div') => ({
    tagName: tag.toUpperCase(),
    style: {},
    className: '',
    value: '',
    options: [],
    dataset: {},
    innerHTML: '',
    textContent: '',
    setAttribute: () => {},
    getAttribute: () => '',
    removeAttribute: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    focus: () => {},
    appendChild: (el) => el,
    remove: () => {},
    closest: () => null,
    scrollIntoView: () => {},
    scrollTo: () => {},
    querySelectorAll: () => [],
    querySelector: () => null
});

const todayDate = new Date();
const testYear = todayDate.getFullYear();
const testMonth = todayDate.getMonth() + 1;
const testDay = todayDate.getDate();

const domMock = {
    createElement: createMockElem,
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: (id) => {
        if (id === 'attendanceGradeSelect') return { value: '6PC_A', options: [{ value: '6PC_A' }], innerHTML: '<option value="6PC_A">6to PC A</option>', querySelectorAll: () => [] };
        if (id === 'attendanceMonthSelect') return { value: String(testMonth), options: [{ value: String(testMonth), text: 'Mes' }], innerHTML: `<option value="${testMonth}">Mes</option>`, selectedIndex: 0, querySelectorAll: () => [] };
        if (id === 'attendanceCourseSelect') return { value: mockWindow.currentActiveCourse || 'pen-6a-contab', options: [], innerHTML: '', querySelectorAll: () => [] };
        return createMockElem();
    },
    querySelector: () => createMockElem(),
    querySelectorAll: () => []
};

mockWindow.document = domMock;
global.window = mockWindow;
global.document = domMock;
global.localStorage = mockStorage;
global.sessionStorage = mockStorage;
global.navigator = mockWindow.navigator;
global.STATE = mockWindow.STATE;

const context = vm.createContext({
    window: mockWindow,
    document: domMock,
    localStorage: mockStorage,
    sessionStorage: mockStorage,
    navigator: mockWindow.navigator,
    STATE: mockWindow.STATE,
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Date: Date,
    Set: Set,
    Map: Map,
    Array: Array,
    Object: Object,
    parseInt: parseInt,
    String: String,
    RegExp: RegExp,
    clearTimeout: () => {},
    setTimeout: (fn, ms) => 1,
    setInterval: () => 1,
    clearInterval: () => {},
    location: mockWindow.location,
    confirm: () => true,
    prompt: () => "1",
    alert: () => {},
    showToast: () => {}
});

vm.runInContext(appCode, context);

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
    totalTests++;
    try {
        fn();
        console.log(`  ✅ PASÓ: ${name}`);
        passedTests++;
    } catch (e) {
        console.error(`  ❌ FALLÓ: ${name}`);
        console.error(e);
        process.exit(1);
    }
}

// -----------------------------------------------------------------------------
// TEST 1: Claves de registro de asistencia independientes por cátedra
// -----------------------------------------------------------------------------
runTest('getAttendanceRecordKey genera claves estrictamente aisladas para cada curso', () => {
    const keyContab = context.getAttendanceRecordKey('6PC_A', testMonth, 'pen-6a-contab');
    const keyMeca = context.getAttendanceRecordKey('6PC_A', testMonth, 'pen-6a-meca');
    const keyGen = context.getAttendanceRecordKey('6PC_A', testMonth, 'GENERAL');

    assert.strictEqual(keyContab, `${testYear}_M${testMonth}_6PC_A_pen-6a-contab`);
    assert.strictEqual(keyMeca, `${testYear}_M${testMonth}_6PC_A_pen-6a-meca`);
    assert.strictEqual(keyGen, `${testYear}_M${testMonth}_6PC_A`);
    assert.notStrictEqual(keyContab, keyMeca, 'Las claves de Contabilidad y Mecanografía deben ser distintas');
});

// -----------------------------------------------------------------------------
// TEST 2: Toma de asistencia en Curso 1 (Contabilidad) no aparece en Curso 2 (Mecanografía)
// -----------------------------------------------------------------------------
runTest('Marcar asistencia en Contabilidad no altera Mecanografía', () => {
    mockWindow.currentActiveCourse = 'pen-6a-contab';
    mockWindow.STATE.currentRole = 'docente';
    mockWindow.STATE.currentUser = { id: 'prof-contab', name: 'Prof. Contabilidad', role: 'docente' };

    // Docente de Contabilidad marca para hoy:
    // s-01: 'P' (Presente)
    // s-02: 'A' (Ausente)
    // s-03: 'J' (Justificado por el docente de Contabilidad)
    // s-04: 'T' (Tardanza)
    context.toggleAttendanceCell('s-01', testDay, 'P');
    context.toggleAttendanceCell('s-02', testDay, 'A');
    context.toggleAttendanceCell('s-03', testDay, 'J');
    context.toggleAttendanceCell('s-04', testDay, 'T');

    // Consultar datos consolidados para Contabilidad
    const dataContab = context.getConsolidatedAttendanceMonthData('6PC_A', testMonth, 'pen-6a-contab');
    assert.strictEqual(dataContab['s-01'][testDay], 'P', 's-01 debe ser P en Contabilidad');
    assert.strictEqual(dataContab['s-02'][testDay], 'A', 's-02 debe ser A en Contabilidad');
    assert.strictEqual(dataContab['s-03'][testDay], 'J', 's-03 debe ser J en Contabilidad');
    assert.strictEqual(dataContab['s-04'][testDay], 'T', 's-04 debe ser T en Contabilidad');

    // Consultar datos consolidados para Mecanografía
    const dataMeca = context.getConsolidatedAttendanceMonthData('6PC_A', testMonth, 'pen-6a-meca');
    assert.strictEqual(dataMeca['s-01']?.[testDay], undefined, 's-01 NO debe tener registro en Mecanografía');
    assert.strictEqual(dataMeca['s-02']?.[testDay], undefined, 's-02 NO debe tener registro en Mecanografía');
    assert.strictEqual(dataMeca['s-03']?.[testDay], undefined, 's-03 NO debe estar justificado en Mecanografía');
    assert.strictEqual(dataMeca['s-04']?.[testDay], undefined, 's-04 NO debe tener registro en Mecanografía');
});

// -----------------------------------------------------------------------------
// TEST 3: Justificación de aula de docente no se considera permiso oficial universal
// -----------------------------------------------------------------------------
runTest('Justificación de aula de docente no genera permiso institucional global', () => {
    // getStudentPermissionForDay no debe retornar el permiso de aula de s-03
    const perm = context.getStudentPermissionForDay('s-03', testYear, testMonth, testDay);
    assert.strictEqual(perm, null, 'getStudentPermissionForDay debe retornar null para justificaciones de docente');

    // La metadata global no debe tener contaminación de docente
    const globalMeta = mockWindow.STATE.attendancePermissionsMeta[`s-03_${testMonth}_${testDay}`];
    assert.strictEqual(globalMeta, undefined, 'No debe existir metadata de docente en la clave global de permisos');

    // La metadata scoped al curso sí debe existir
    const scopedMeta = mockWindow.STATE.attendancePermissionsMeta[`s-03_${testMonth}_${testDay}_pen-6a-contab`];
    assert(scopedMeta !== undefined, 'La metadata debe existir con scope de curso');
    assert.strictEqual(scopedMeta.origin_role, 'docente');
    assert.strictEqual(scopedMeta.is_locked_by_admin, false);
});

// -----------------------------------------------------------------------------
// TEST 4: Marcar todos presentes en Curso 2 no preserva 'J' del Curso 1
// -----------------------------------------------------------------------------
runTest('markAllPresentToday en Curso 2 asigna P a todos sin heredar J del Curso 1', () => {
    mockWindow.currentActiveCourse = 'pen-6a-meca';
    mockWindow.STATE.currentRole = 'docente';
    mockWindow.STATE.currentUser = { id: 'prof-meca', name: 'Prof. Mecanografía', role: 'docente' };

    // Ejecutamos markAllPresentToday en Mecanografía
    context.markAllPresentToday();

    const keyMeca = context.getAttendanceRecordKey('6PC_A', testMonth, 'pen-6a-meca');
    const recsMeca = mockWindow.STATE.attendanceRecords[keyMeca];

    assert.strictEqual(recsMeca['s-03'][testDay], 'P', 's-03 debe recibir P en Mecanografía, no J de Contabilidad');
    assert.strictEqual(recsMeca['s-01'][testDay], 'P', 's-01 debe recibir P en Mecanografía');
});

// -----------------------------------------------------------------------------
// TEST 5: Permiso oficial de Auxiliatura sí aplica a todas las clases y se bloquea
// -----------------------------------------------------------------------------
runTest('Permiso oficial de Auxiliatura es universal y se propaga con blindaje a todas las clases', () => {
    const todayStr = `${testYear}-${String(testMonth).padStart(2, '0')}-${String(testDay).padStart(2, '0')}`;

    // Auxiliatura registra permiso oficial para s-05
    const officialPerm = {
        id: 'perm-aux-001',
        studentId: 's-05',
        startDate: todayStr,
        endDate: todayStr,
        reasonCategory: 'Médico',
        reasonDetail: 'Cita médica en IGSS con constancia adjunta',
        authorizedBy: 'Auxiliatura General',
        origin_role: 'profesor_auxiliar',
        status: 'autorizado'
    };

    context.applyStudentPermission(officialPerm);

    // Verificar en getStudentPermissionForDay
    const foundPerm = context.getStudentPermissionForDay('s-05', testYear, testMonth, testDay);
    assert(foundPerm !== null, 'Permiso oficial de Auxiliatura debe ser encontrado');
    assert.strictEqual(foundPerm.is_locked_by_admin, true);
    assert.strictEqual(foundPerm.origin_role, 'profesor_auxiliar');

    // Verificar en datos consolidados de Contabilidad y Mecanografía
    const dataContab = context.getConsolidatedAttendanceMonthData('6PC_A', testMonth, 'pen-6a-contab');
    const dataMeca = context.getConsolidatedAttendanceMonthData('6PC_A', testMonth, 'pen-6a-meca');

    assert.strictEqual(dataContab['s-05'][testDay], 'J', 's-05 debe estar J en Contabilidad');
    assert.strictEqual(dataMeca['s-05'][testDay], 'J', 's-05 debe estar J en Mecanografía');

    // Intentar alterar la celda como docente sin confirmación de auditoría
    mockWindow.STATE.currentRole = 'docente';
    mockWindow.currentActiveCourse = 'pen-6a-contab';
    
    // Al intentar toggle de celda justificada oficialmente siendo docente, no debe cambiar
    context.toggleAttendanceCell('s-05', testDay);
    const dataAfter = context.getConsolidatedAttendanceMonthData('6PC_A', testMonth, 'pen-6a-contab');
    assert.strictEqual(dataAfter['s-05'][testDay], 'J', 'La celda debe permanecer J inmutable ante edición de docente');
});

// -----------------------------------------------------------------------------
// TEST 6: Reversión de permiso oficial limpia 'J' sin alterar registros individuales
// -----------------------------------------------------------------------------
runTest('Revocación de permiso oficial limpia la justificación universal preservando marcas de clase', () => {
    const todayStr = `${testYear}-${String(testMonth).padStart(2, '0')}-${String(testDay).padStart(2, '0')}`;

    // Revocar permiso de s-05
    context.removeStudentPermissionDatesFromAttendance({
        id: 'perm-aux-001',
        studentId: 's-05',
        startDate: todayStr,
        endDate: todayStr
    });

    const dataContab = context.getConsolidatedAttendanceMonthData('6PC_A', testMonth, 'pen-6a-contab');
    const dataMeca = context.getConsolidatedAttendanceMonthData('6PC_A', testMonth, 'pen-6a-meca');

    // Ninguno debe conservar la 'J' institucional tras revocar el permiso
    assert.notStrictEqual(dataContab['s-05']?.[testDay], 'J', 's-05 no debe tener J en Contabilidad tras revocar');
    assert.notStrictEqual(dataMeca['s-05']?.[testDay], 'J', 's-05 no debe tener J en Mecanografía tras revocar');

    // Cada curso mantiene su registro individual original:
    // Contabilidad: s-05 nunca fue marcado por el docente -> undefined
    assert.strictEqual(dataContab['s-05']?.[testDay], undefined, 's-05 no tiene registro previo en Contabilidad');
    // Mecanografía: s-05 fue marcado presente en markAllPresentToday -> conserva su 'P' individual
    assert.strictEqual(dataMeca['s-05']?.[testDay], 'P', 's-05 conserva su P individual previamente marcado en Mecanografía');

    // Verificar que las marcas previas de Contabilidad en hoy sigan 100% intactas
    assert.strictEqual(dataContab['s-01'][testDay], 'P', 's-01 mantiene su P individual en Contabilidad');
    assert.strictEqual(dataContab['s-02'][testDay], 'A', 's-02 mantiene su A individual en Contabilidad');
    assert.strictEqual(dataContab['s-03'][testDay], 'J', 's-03 mantiene su J de aula individual en Contabilidad');
    assert.strictEqual(dataContab['s-04'][testDay], 'T', 's-04 mantiene su T individual en Contabilidad');
});

console.log('\n================================================================================');
console.log(`📊 RESULTADO: ${passedTests}/${totalTests} pruebas pasaron exitosamente (100%).`);
console.log('🎉 Aislamiento estricto de asistencia por cátedra e integridad institucional verificados.');
console.log('================================================================================');
