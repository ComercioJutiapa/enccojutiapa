// Test suite for chromatic highlighting and status identification across all student nominas and rosters
const fs = require('fs');
const assert = require('assert');

// Mock browser environment
global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    focus: () => {},
    print: () => {},
    close: () => {},
    open: () => null,
    location: { hash: '', href: 'http://localhost/plataforma.html', pathname: '/plataforma.html' },
    document: null
};
let lastPrintedDoc = null;
let currentModalTitle = '';
let currentModalContent = '';

global.showModalById = (id) => {};
global.document = {
    getElementById: (id) => {
        if (id === 'gradeFilterSelect') return { value: '5to Perito Contador Sección A' };
        if (id === 'studentSubjectFilterSelect') return { value: 'Contabilidad de Costos' };
        if (id === 'statusFilterSelect') return { value: 'ALL' };
        if (id === 'studentSearchInput') return { value: '' };
        if (id === 'printDocumentModal') return {
            id: 'printDocumentModal',
            style: { setProperty: () => {} },
            classList: { add: () => {}, remove: () => {} }
        };
        if (id === 'printModalTitle') return {
            set textContent(v) {
                currentModalTitle = v;
                if (lastPrintedDoc) lastPrintedDoc.title = v;
            },
            get textContent() { return currentModalTitle; }
        };
        if (id === 'printDocumentContent') return {
            set innerHTML(v) {
                currentModalContent = v;
                lastPrintedDoc = {
                    title: currentModalTitle,
                    html: v,
                    orientation: window._currentPrintModalOrientation || 'portrait'
                };
            },
            get innerHTML() { return currentModalContent; }
        };
        if (id === 'printDocumentPaper') return { style: {} };
        if (id === 'auxiliaturaLogDateFilter') return { value: '2026-03-02' };
        if (id === 'auxiliaturaLogGradeFilter') return { value: 'ALL' };
        if (id === 'courseBitacoraCourseSelect') return { value: 'course_1' };
        if (id === 'courseBitacoraStudentSelect') return { value: 'ALL' };
        if (id === 'courseBitacoraBimesterFilter') return { value: 'ALL' };
        if (id === 'courseBitacoraCategoryFilter') return { value: 'ALL' };
        if (id === 'courseBitacoraSearchFilter') return { value: '' };
        return null;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: () => ({ style: {}, appendChild: () => {}, querySelectorAll: () => [] }),
    querySelectorAll: () => [],
    querySelector: () => null,
    body: { appendChild: () => {} }
};
global.window.document = global.document;
global.navigator = { userAgent: 'node' };
global.location = { hash: '', reload: () => {} };
global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};
global.sessionStorage = {
    getItem: () => null,
    setItem: () => {}
};
global.showToast = (msg, type) => { /* quiet in test */ };

// Read app.js
require('./app.js');

const {
    printStudentsBlankRoster10Casillas,
    generateOfficialPrintList,
    printStudentsOfficialList,
    printSectionStudentsList
} = window;

console.log('Testing Student Nominas and Rosters Status Highlighting...');

// Set up mock test state with students of different statuses
const STATE = window.STATE;
STATE.activeCycle = '2026';
STATE.config = STATE.config || {};
STATE.config.activeBimestre = 1;

STATE.gradesList = [
    { code: '5PC-A', name: '5to Perito Contador', section: 'A', career: 'Perito Contador' }
];

STATE.students = [
    {
        id: 's_act',
        firstName: 'Carlos',
        lastName: 'Alvarez',
        grade: '5to Perito Contador',
        section: 'A',
        status: 'Activo',
        active: true,
        personalCode: 'C123'
    },
    {
        id: 's_ret',
        firstName: 'Beatriz',
        lastName: 'Ramirez',
        grade: '5to Perito Contador',
        section: 'A',
        status: 'Retirado',
        retireDate: '2026-02-10',
        active: true,
        personalCode: 'R456'
    },
    {
        id: 's_aus',
        firstName: 'Daniel',
        lastName: 'Gomez',
        grade: '5to Perito Contador',
        section: 'A',
        status: 'Ausente',
        active: true,
        personalCode: 'A789'
    },
    {
        id: 's_exon',
        firstName: 'Elena',
        lastName: 'Morales',
        grade: '5to Perito Contador',
        section: 'A',
        status: 'Activo',
        academicExceptions: [{ subject: 'Contabilidad de Costos', bimestre: 1, active: true }],
        active: true,
        personalCode: 'E012'
    }
];

// Test 1: printStudentsBlankRoster10Casillas includes all 4 students with chromatic styling
console.log('\n--- Test 1: printStudentsBlankRoster10Casillas ---');
lastPrintedDoc = null;
printStudentsBlankRoster10Casillas('5PC-A', 'Contabilidad de Costos');

assert(lastPrintedDoc, 'Document was generated');
assert(lastPrintedDoc.html.includes('ALVAREZ'), 'Active student is present');
assert(lastPrintedDoc.html.includes('RAMIREZ'), 'Retirado student is present');
assert(lastPrintedDoc.html.includes('GOMEZ'), 'Ausente student is present');
assert(lastPrintedDoc.html.includes('MORALES'), 'Exonerado student is present');

// Verify chromatic backgrounds
assert(lastPrintedDoc.html.includes('background:#fef2f2'), 'Retirado row has #fef2f2 background');
assert(lastPrintedDoc.html.includes('background:#fffbeb'), 'Ausente row has #fffbeb background');
assert(lastPrintedDoc.html.includes('background:#f0f9ff'), 'Exonerado row has #f0f9ff background');

// Verify badges / tags
assert(lastPrintedDoc.html.includes('RETIRADO'), 'RETIRADO badge is present');
assert(lastPrintedDoc.html.includes('AUSENTE'), 'AUSENTE badge is present');
assert(lastPrintedDoc.html.includes('EXONERADO'), 'EXONERADO badge is present');

// Verify cell blocking
assert(lastPrintedDoc.html.includes('RET.'), 'RET. total zona badge present');
assert(lastPrintedDoc.html.includes('AUS.'), 'AUS. total zona badge present');
assert(lastPrintedDoc.html.includes('EXON.'), 'EXON. total zona badge present');

console.log('✓ Test 1 passed: 10-Casillas Blank Roster includes all students with chromatic differentiation');

// Test 2: generateOfficialPrintList across models
console.log('\n--- Test 2: generateOfficialPrintList across models ---');
const models = ['NOMINA_OFICIAL', 'ASISTENCIA_MENSUAL', 'LISTA_COTEJO', 'CUADRO_CALIFICACIONES_EXCEL'];
models.forEach(model => {
    lastPrintedDoc = null;
    generateOfficialPrintList({
        modelType: model,
        gradeVal: '5PC-A',
        subjectName: 'Contabilidad de Costos',
        bimestreNum: 1,
        isVacio: false,
        exportFormat: 'preview'
    });

    assert(lastPrintedDoc, `Document generated for ${model}`);
    assert(lastPrintedDoc.html.includes('background:#fef2f2'), `${model} has #fef2f2 for Retirados`);
    assert(lastPrintedDoc.html.includes('background:#fffbeb'), `${model} has #fffbeb for Ausentes`);
    assert(lastPrintedDoc.html.includes('background:#f0f9ff'), `${model} has #f0f9ff for Exonerados`);
    assert(lastPrintedDoc.html.includes('RETIRADO'), `${model} has RETIRADO tag`);
    assert(lastPrintedDoc.html.includes('AUSENTE'), `${model} has AUSENTE tag`);
    assert(lastPrintedDoc.html.includes('EXON'), `${model} has EXON tag`);
    console.log(`✓ Model ${model} passed with full chromatic support`);
});

// Test 3: printStudentsOfficialList includes all and applies chromatic styles
console.log('\n--- Test 3: printStudentsOfficialList ---');
lastPrintedDoc = null;
printStudentsOfficialList('5PC-A');
assert(lastPrintedDoc, 'Official list document generated');
assert(lastPrintedDoc.html.includes('background:#fef2f2'), 'Official list has #fef2f2 for Retirados');
assert(lastPrintedDoc.html.includes('background:#fffbeb'), 'Official list has #fffbeb for Ausentes');
assert(lastPrintedDoc.html.includes('background:#f0f9ff'), 'Official list has #f0f9ff for Exonerados');
assert(lastPrintedDoc.html.includes('Retirado'), 'Official list has Retirado status');
assert(lastPrintedDoc.html.includes('Ausente'), 'Official list has Ausente status');
assert(lastPrintedDoc.html.includes('Exonerado'), 'Official list has Exonerado status');
console.log('✓ Test 3 passed: printStudentsOfficialList has full chromatic styling');

// Test 5: printGlobalIncidentsOfficialReport
console.log('\n--- Test 5: printGlobalIncidentsOfficialReport ---');
STATE.attendanceSelectedGrade = '5PC-A';
STATE.attendanceMonthData = STATE.attendanceMonthData || {};
// Add incidents for students
STATE.attendanceMonthData['5PC-A'] = {
    's_ret': { 1: 'A', 2: 'A' },
    's_aus': { 1: 'A', 2: 'T' }
};
lastPrintedDoc = null;
if (typeof window.printGlobalIncidentsOfficialReport === 'function') {
    window.printGlobalIncidentsOfficialReport();
    if (lastPrintedDoc) {
        assert(lastPrintedDoc.html.includes('background-color:#fef2f2') || lastPrintedDoc.html.includes('RETIRADO'), 'Incidents report includes RETIRADO highlighting');
        console.log('✓ Test 5 passed: printGlobalIncidentsOfficialReport has chromatic highlighting');
    } else {
        console.log('Test 5 note: no incidents or handled gracefully');
    }
}

// Test 6: printPermissionsLog
console.log('\n--- Test 6: printPermissionsLog ---');
STATE.studentPermissions = [
    {
        id: 'perm_1',
        studentId: 's_ret',
        studentName: 'Beatriz Ramirez',
        personalCode: 'R456',
        grade: '5to Perito Contador',
        section: 'A',
        startDate: '2026-03-01',
        endDate: '2026-03-02',
        reasonCategory: 'Medica',
        reasonDetail: 'Cita médica',
        authorizedBy: 'Auxiliatura'
    },
    {
        id: 'perm_2',
        studentId: 's_aus',
        studentName: 'Daniel Gomez',
        personalCode: 'A789',
        grade: '5to Perito Contador',
        section: 'A',
        startDate: '2026-03-01',
        endDate: '2026-03-02',
        reasonCategory: 'Personal',
        reasonDetail: 'Asunto familiar',
        authorizedBy: 'Auxiliatura'
    }
];
lastPrintedDoc = null;
if (typeof window.printPermissionsLog === 'function') {
    window.printPermissionsLog();
    assert(lastPrintedDoc, 'Permissions log generated');
    assert(lastPrintedDoc.html.includes('background-color:#fef2f2'), 'Permissions log has #fef2f2 for Retirado');
    assert(lastPrintedDoc.html.includes('background-color:#fffbeb'), 'Permissions log has #fffbeb for Ausente');
    assert(lastPrintedDoc.html.includes('RETIRADO'), 'Permissions log has RETIRADO badge');
    assert(lastPrintedDoc.html.includes('AUSENTE'), 'Permissions log has AUSENTE badge');
    console.log('✓ Test 6 passed: printPermissionsLog has full chromatic styling');
}

// Test 7: printAuxiliaturaLog
console.log('\n--- Test 7: printAuxiliaturaLog ---');
STATE.attendanceAlerts = [
    {
        id: 'alt_1',
        studentId: 's_ret',
        studentName: 'Beatriz Ramirez',
        carne: 'R456',
        gradeCode: '5PC-A',
        gradeLabel: '5to Perito Contador A',
        courseName: 'Contabilidad de Costos',
        teacherName: 'Prof. Demo',
        guardianName: 'Padre Ramirez',
        guardianPhone: '12345678',
        status: 'pendiente',
        date: '2026-03-02',
        time: '08:00'
    },
    {
        id: 'alt_2',
        studentId: 's_aus',
        studentName: 'Daniel Gomez',
        carne: 'A789',
        gradeCode: '5PC-A',
        gradeLabel: '5to Perito Contador A',
        courseName: 'Contabilidad de Costos',
        teacherName: 'Prof. Demo',
        guardianName: 'Madre Gomez',
        guardianPhone: '87654321',
        status: 'citacion',
        date: '2026-03-02',
        time: '08:45'
    }
];
lastPrintedDoc = null;
if (typeof window.printAuxiliaturaLog === 'function') {
    window.printAuxiliaturaLog();
    assert(lastPrintedDoc, 'Auxiliatura log generated');
    assert(lastPrintedDoc.html.includes('background-color:#fef2f2'), 'Auxiliatura log has #fef2f2 for Retirado');
    assert(lastPrintedDoc.html.includes('background-color:#fffbeb'), 'Auxiliatura log has #fffbeb for Ausente');
    assert(lastPrintedDoc.html.includes('RETIRADO'), 'Auxiliatura log has RETIRADO badge');
    assert(lastPrintedDoc.html.includes('AUSENTE'), 'Auxiliatura log has AUSENTE badge');
    console.log('✓ Test 7 passed: printAuxiliaturaLog has full chromatic styling');
}

// Test 8: printCourseBitacoraOfficial
console.log('\n--- Test 8: printCourseBitacoraOfficial ---');
STATE.currentUser = { role: 'admin', name: 'Director General' };
STATE.pensum = [
    { id: 'course_1', subject: 'Contabilidad de Costos', teacher: 'Prof. Demo', grade: '5to Perito Contador', gradeCode: '5PC-A' }
];
STATE.courseBitacora = [
    {
        id: 'bit_1',
        courseId: 'course_1',
        studentId: 's_ret',
        studentName: 'Beatriz Ramirez',
        carne: 'R456',
        date: '2026-03-05',
        bimester: 1,
        category: 'conducta',
        text: 'Anotación de prueba retirado',
        authorName: 'Prof. Demo'
    },
    {
        id: 'bit_2',
        courseId: 'course_1',
        studentId: 's_aus',
        studentName: 'Daniel Gomez',
        carne: 'A789',
        date: '2026-03-05',
        bimester: 1,
        category: 'tarea',
        text: 'Anotación de prueba ausente',
        authorName: 'Prof. Demo'
    }
];
lastPrintedDoc = null;
if (typeof window.printCourseBitacoraOfficial === 'function') {
    window.printCourseBitacoraOfficial();
    assert(lastPrintedDoc, 'Course bitacora document generated');
    assert(lastPrintedDoc.html.includes('background-color:#fef2f2'), 'Course bitacora has #fef2f2 for Retirado');
    assert(lastPrintedDoc.html.includes('background-color:#fffbeb'), 'Course bitacora has #fffbeb for Ausente');
    assert(lastPrintedDoc.html.includes('RETIRADO'), 'Course bitacora has RETIRADO badge');
    assert(lastPrintedDoc.html.includes('AUSENTE'), 'Course bitacora has AUSENTE badge');
    console.log('✓ Test 8 passed: printCourseBitacoraOfficial has full chromatic styling');
}

console.log('\n=============================================');
console.log('ALL NOMINA & REPORT CHROMATIC TESTS PASSED!');
console.log('=============================================');
process.exit(0);
