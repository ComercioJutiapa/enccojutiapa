/**
 * ==============================================================================
 * 🧪 PRUEBA AUTOMATIZADA: EXCLUSIÓN PERPETUA DE GRADUADOS / EGRESADOS (2027, 2028, 2029+)
 * Verifica regla institucional multi-ciclo en Backend, Frontend y Nóminas:
 * 1. getCycleFilteredStudents() excluye egresados en 2027, 2028, 2029...
 * 2. getStudentCountByGradeAndSection() y openSectionStudentsModal() no cuentan egresados.
 * 3. printStudentsOfficialList(), printStudentsBlankRoster10Casillas() y printSectionStudentsList()
 *    excluyen egresados y muestran el ciclo dinámico (2027 / 2028).
 * 4. sanitizeCycle2027PristineState() depura egresados en cualquier ciclo >= 2027.
 * 5. EnccoCycleArchiver.openNewAcademicCycle('2028') archiva 2027 y excluye a sus graduandos de 2028.
 * ==============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🧪 PRUEBAS: EXCLUSIÓN PERPETUA DE EGRESADOS EN NÓMINAS (2027, 2028, 2029+)');
console.log('========================================================================\n');

const mockSession = {};
const mockLocal = {};
global.window = global;
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.location = { hash: '', href: 'http://localhost/plataforma.html', pathname: '/plataforma.html', origin: 'http://localhost', search: '' };
global.navigator = { onLine: true, userAgent: 'node-test' };
global.localStorage = {
    getItem: k => mockLocal[k] || null,
    setItem: (k, v) => { mockLocal[k] = String(v); },
    removeItem: k => { delete mockLocal[k]; },
    clear: () => { Object.keys(mockLocal).forEach(k => delete mockLocal[k]); }
};
global.sessionStorage = {
    getItem: k => mockSession[k] || null,
    setItem: (k, v) => { mockSession[k] = String(v); },
    removeItem: k => { delete mockSession[k]; },
    clear: () => { Object.keys(mockSession).forEach(k => delete mockSession[k]); }
};

const domValues = {
    gradeFilterSelect: { value: '6to PC A', style: {}, focus: () => {} }
};
const innerHtmlMap = {};
global.document = {
    getElementById: (id) => {
        if (domValues[id]) return domValues[id];
        if (!innerHtmlMap[id]) innerHtmlMap[id] = { value: '', textContent: '', innerHTML: '', style: { setProperty: () => {} }, classList: { add: () => {}, remove: () => {}, contains: () => false }, querySelector: () => null, querySelectorAll: () => [], insertBefore: () => {} };
        return innerHtmlMap[id];
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {}, remove: () => {}, click: () => {} }),
    body: { appendChild: () => {}, firstChild: null }
};

let lastPrintedTitle = '';
let lastPrintedHtml = '';
global.renderAndShowPrintDocument = (title, html) => {
    lastPrintedTitle = title;
    lastPrintedHtml = html;
};
global.showModalById = () => {};
global.hideModalById = () => {};
global.showToast = () => {};
global.fetch = async () => ({ ok: true, json: async () => ({}) });

const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const archiverCode = fs.readFileSync(path.join(__dirname, 'cycle_archiver.js'), 'utf8');
eval(appCode);
eval(archiverCode);

global.renderAndShowPrintDocument = (title, html) => {
    lastPrintedTitle = title;
    lastPrintedHtml = html;
};

async function runTests() {
    STATE.currentRole = 'director';
    STATE.currentUser = { id: 'usr-dir', name: 'Directora ENCCO', role: 'director' };
    STATE.schoolHeader = { schoolName: 'ENCCO Jutiapa', schoolCode: '22-01-0014-46', location: 'Jutiapa' };
    STATE.gradesList = [
        { id: 'g-4a', code: '4to PC A', name: '4to Perito Contador', section: 'Sección A', career: 'Perito Contador' },
        { id: 'g-5a', code: '5to PC A', name: '5to Perito Contador', section: 'Sección A', career: 'Perito Contador' },
        { id: 'g-6a', code: '6to PC A', name: '6to Perito Contador', section: 'Sección A', career: 'Perito Contador' }
    ];
    STATE.config = { activeBimestre: 1, bimestreActivoOficial: 1 };
    STATE.cycles = [
        { id: 'cyc-2026', name: '2026', year: '2026', status: 'Histórico', isArchived: true },
        { id: 'cyc-2027', name: '2027', year: '2027', status: 'Activo', isArchived: false }
    ];

    const sampleStudentsWithIntruder = [
        {
            id: 'stu-active-6a',
            carne: '2027-SA-001',
            firstName: 'María',
            lastName: 'Pérez',
            name: 'Pérez María',
            grade: '6to Perito Contador',
            gradeCode: '6to PC A',
            gradeLabel: '6to Perito Contador (Sección A)',
            section: 'Sección A',
            cycle: '2027',
            academicCycle: '2027',
            status: 'Activo'
        },
        {
            id: 'stu-grad-2026',
            carne: '2026-SA-099',
            firstName: 'Carlos',
            lastName: 'Egresado',
            name: 'Egresado Carlos',
            grade: 'Graduando / Egresado',
            gradeCode: 'EGRESADO',
            gradeLabel: 'Graduando / Egresado (Sección A)',
            section: 'Sección A',
            cycle: '2027',
            academicCycle: '2027',
            graduationCycle: '2026',
            status: 'Egresado'
        }
    ];

    // TEST 1: Regla multi-ciclo en getCycleFilteredStudents (2027, 2028, 2029)
    STATE.activeCycle = '2027';
    STATE.students = JSON.parse(JSON.stringify(sampleStudentsWithIntruder));
    const filtered2027 = getCycleFilteredStudents(STATE.students, '2027');
    assert.strictEqual(filtered2027.length, 1, 'En 2027 solo debe aparecer el alumno activo.');
    assert.strictEqual(filtered2027[0].id, 'stu-active-6a');

    const students2028WithGrad2027 = [
        { ...sampleStudentsWithIntruder[0], cycle: '2028', academicCycle: '2028' },
        { ...sampleStudentsWithIntruder[1], id: 'stu-grad-2027', cycle: '2028', academicCycle: '2028', graduationCycle: '2027' },
        { id: 'stu-with-grad-cycle-only', name: 'Graduado Silencioso', grade: '6to Perito Contador', section: 'Sección A', cycle: '2028', graduationCycle: '2027', status: 'Activo' }
    ];
    const filtered2028 = getCycleFilteredStudents(students2028WithGrad2027, '2028');
    assert.strictEqual(filtered2028.length, 1, 'En 2028 deben quedar excluidos tanto status=Egresado como graduationCycle=2027.');
    console.log('✅ Test 1 Superado: getCycleFilteredStudents excluye egresados en 2027, 2028 y ciclos futuros.');

    // TEST 2: Contadores de sección y nóminas impresas
    STATE.activeCycle = '2027';
    STATE.students = JSON.parse(JSON.stringify(sampleStudentsWithIntruder));
    const count6A = getStudentCountByGradeAndSection('6to PC A', '6to Perito Contador', 'Sección A');
    assert.strictEqual(count6A, 1, 'getStudentCountByGradeAndSection debe contar 1 alumno activo y 0 egresados.');

    printSectionStudentsList('6to PC A', 'Sección A');
    const htmlSection = innerHtmlMap['printDocumentContent'] ? innerHtmlMap['printDocumentContent'].innerHTML : lastPrintedHtml;
    assert(htmlSection.includes('CICLO 2027'), 'printSectionStudentsList debe mostrar dinámicamente CICLO 2027.');
    assert(!htmlSection.includes('Egresado Carlos'), 'printSectionStudentsList NO debe imprimir egresados.');

    printStudentsOfficialList('6to PC A');
    const htmlOfficial = innerHtmlMap['printDocumentContent'] ? innerHtmlMap['printDocumentContent'].innerHTML : lastPrintedHtml;
    assert(!htmlOfficial.includes('Egresado Carlos'), 'printStudentsOfficialList NO debe imprimir egresados.');

    printStudentsBlankRoster10Casillas('6to PC A', 'Auditoría');
    const htmlBlank = innerHtmlMap['printDocumentContent'] ? innerHtmlMap['printDocumentContent'].innerHTML : lastPrintedHtml;
    assert(!htmlBlank.includes('Egresado Carlos'), 'printStudentsBlankRoster10Casillas NO debe imprimir egresados.');
    console.log('✅ Test 2 Superado: Contadores y todas las nóminas impresas excluyen egresados y usan ciclo dinámico.');

    // TEST 3: sanitizeCycle2027PristineState opera también en 2028 y 2029
    STATE.activeCycle = '2028';
    STATE.isHistoricalReadOnlyMode = false;
    STATE.historicalViewingCycle = null;
    STATE.viewingHistoricalCycle = null;
    STATE.students = JSON.parse(JSON.stringify(students2028WithGrad2027));
    sanitizeCycle2027PristineState();
    assert.strictEqual(STATE.students.length, 1, 'sanitizeCycle2027PristineState debe purgar egresados intrusos incluso en 2028+.');
    console.log('✅ Test 3 Superado: Saneamiento automático en ciclos >= 2028 verificado.');

    // TEST 4: EnccoCycleArchiver transición 2027 -> 2028 excluye graduandos 2027 del nuevo ciclo 2028
    STATE.activeCycle = '2027';
    STATE.academicCycle = '2027';
    STATE.students = [
        { id: 'st-5to-2027', firstName: 'Ana', lastName: 'Cinco', grade: '5to Perito Contador', section: 'Sección A', cycle: '2027', academicCycle: '2027', status: 'Activo', grades: { 'Contabilidad de Costos': [80, 82, 85, 88] } },
        { id: 'st-6to-2027', firstName: 'Luis', lastName: 'Seis', grade: '6to Perito Contador', section: 'Sección A', cycle: '2027', academicCycle: '2027', status: 'Activo', grades: { 'Auditoría': [90, 92, 91, 95] } }
    ];
    const open2028Res = await EnccoCycleArchiver.openNewAcademicCycle('2028', {
        archiveCurrent: true,
        promoteStudents: true
    });
    assert.strictEqual(open2028Res.success, true, 'Apertura 2027 -> 2028 debe completarse.');
    assert.strictEqual(STATE.activeCycle, '2028');
    assert.strictEqual(STATE.students.length, 1, 'En 2028 solo debe quedar el alumno promovido de 5to a 6to.');
    assert.strictEqual(STATE.students[0].id, 'st-5to-2027');
    assert.strictEqual(STATE.students[0].grade, '6to Perito Contador');
    assert(STATE.graduatedStudentsByCycle['2027'] && STATE.graduatedStudentsByCycle['2027'].length === 1, 'Graduado de 6to 2027 debe resguardarse en graduatedStudentsByCycle["2027"].');

    // Al consultar el histórico 2027, Luis Seis sí debe aparecer con su nota en 6to 2027
    const hist2027Res = await EnccoCycleArchiver.loadHistoricalCycle('2027');
    assert.strictEqual(hist2027Res.success, true);
    assert.strictEqual(STATE.students.length, 2, 'En el modo histórico 2027 sí deben aparecer ambos alumnos (incluyendo al egresado en su 6to original).');
    console.log('✅ Test 4 Superado: Transición perpetua 2027 -> 2028 y consulta histórica intacta.');

    console.log('\n========================================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE EXCLUSIÓN PERPETUA DE GRADUADOS PASARON (4/4)');
    console.log('========================================================================');
}

runTests().then(() => process.exit(0)).catch(err => {
    console.error('❌ ERROR EN PRUEBA:', err);
    process.exit(1);
});
