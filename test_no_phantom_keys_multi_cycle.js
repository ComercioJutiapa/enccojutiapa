const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP_DIR = __dirname;
const appCode = fs.readFileSync(path.join(APP_DIR, 'app.js'), 'utf8');
const archiverCode = fs.readFileSync(path.join(APP_DIR, 'cycle_archiver.js'), 'utf8');

function extractSlice(src, startMarker, endMarker) {
    const i = src.indexOf(startMarker);
    if (i < 0) throw new Error(`Missing start marker: ${startMarker}`);
    const j = src.indexOf(endMarker, i);
    if (j < 0) throw new Error(`Missing end marker: ${endMarker}`);
    return src.slice(i, j);
}

const sandbox = {
    window: {},
    document: { getElementById: () => null, querySelectorAll: () => [] },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    navigator: { onLine: false },
    STATE: {
        activeCycle: '2027',
        academicCycle: '2027',
        cycles: ['2026', '2027'],
        students: [],
        pensum: [],
        calificaciones: {},
        exoneraciones: {},
        gradingConfigs: {},
        config: { activeBimestre: 1, bimestreActivoOficial: 1 }
    },
    console, Math, Number, String, Array, Object, Set, Map, JSON, parseInt, parseFloat, isNaN, Date, Promise
};
sandbox.window.STATE = sandbox.STATE;
sandbox.window.getFirebaseDatabaseUrl = () => null;
sandbox.window.FirebaseModular = null;
sandbox.getGradingConfig = () => ({ zonaMax: 40, examMax: 60 });
sandbox.isStudentRetiredInBimestre = () => false;

const coursesBlock = extractSlice(appCode, 'const OFFICIAL_CANONICAL_COURSES = {', 'function isLegacyPredefinedActivityName(')
    .replace('const OFFICIAL_CANONICAL_COURSES =', 'var OFFICIAL_CANONICAL_COURSES =');
const normBlock = extractSlice(appCode, 'function sanitizeGradingConfigsInState(', 'async function initApp(');
const ensureBlock = extractSlice(appCode, 'function ensureStudentGradebookStructure(', 'function getStudentSubjectGrade(');
const atomicBlock = extractSlice(appCode, 'async function saveStudentSubjectGradeAtomic(', 'async function saveBulkStudentGradesAtomic(');

vm.runInNewContext([coursesBlock, normBlock, ensureBlock, atomicBlock, archiverCode].join('\n\n'), sandbox);
Object.assign(sandbox, sandbox.window);

(async () => {
    console.log('====================================================================');
    console.log('🧪 PRUEBAS ANTI-CLAVES FANTASMA MULTI-CICLO (2027, 2028, 2029+)');
    console.log('====================================================================');

    // Test 1: Roundtrip canónico exacto de las 28 materias oficiales
    [4, 5, 6].forEach(g => {
        sandbox.OFFICIAL_CANONICAL_COURSES[g].forEach(c => {
            assert.strictEqual(sandbox.resolveOfficialCanonicalSubject(c.name, g), c.name, `Roundtrip falló para ${g} ${c.name}`);
        });
    });
    console.log('✅ Test 1: Roundtrip canónico exacto de las 28 asignaturas oficiales (4to, 5to, 6to).');

    // Test 2: Bloqueo estricto de materias cruzadas entre grados o inexistentes
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Computación III', 4), null);
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Computación III', 5), null);
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Computación I', 5), null);
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Computación I', 6), null);
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Contabilidad General', 4), null);
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Contabilidad General', 5), null);
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Contabilidad General', 6), null);
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Organización de Empresas', 4), null);
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Práctica Supervisada', 5), null);
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Administración y Organización de Oficina', 4), 'Administración y Organización de Empresas');
    console.log('✅ Test 2: Bloqueo cruzado de grados y resolución de alias oficiales SIRE verificados.');

    // Test 3: Reparación de encoding roto (\ufffd) sin perder la calificación más alta (Math.max)
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Computaci\ufffd\ufffdn II', 5), 'Computación II');
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Catalogaci\ufffd\ufffdn y Archivo', 5), 'Catalogación y Archivo');
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('Matem\ufffd\ufffdtica Comercial', 4), 'Matemática Comercial');
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('C\ufffd\ufffdlculo Mercantil y Financiero', 5), 'Cálculo Mercantil y Financiero');
    assert.strictEqual(sandbox.resolveOfficialCanonicalSubject('MateriaDesconocida\ufffd\ufffd', 5), null);
    console.log('✅ Test 3: Reparación automática de caracteres corruptos (UTF-8 replacement) verificada.');

    // Test 4: Guards en ensureStudentGradebookStructure & saveStudentSubjectGradeAtomic
    const stu4 = { id: 'stu-test-4', name: 'ALUMNO PRUEBA 4TO', grade: '4to Perito Contador', section: 'Sección A', status: 'Activo', grades: {}, gradebookDetails: {} };
    const stu5 = {
        id: 'stu-test-5',
        name: 'ALUMNO PRUEBA 5TO',
        grade: '5to Perito Contador',
        section: 'Sección B',
        status: 'Activo',
        grades: {
            'Computación II': [96, 100, 90, 100],
            'Computaci\ufffd\ufffdn II': [96, 100, 90, 0],
            'Contabilidad General': [75, 0, 0, 0]
        },
        gradebookDetails: {
            'Computación II': { '1': { zona: 40, exam: 56, total: 96 }, '4': { zona: 40, exam: 60, total: 100 } },
            'Contabilidad General': { '1': { zona: 15, exam: 60, total: 75 } }
        }
    };
    sandbox.STATE.students = [stu4, stu5];
    sandbox.STATE.calificaciones = {
        'st-01_contabilidadgeneral_b1': { id: 'st-01_contabilidadgeneral_b1', estudianteId: 'st-01', claseNombre: 'Contabilidad General', total: 75 },
        'stu-test-5_computacioniii_b2': { id: 'stu-test-5_computacioniii_b2', estudianteId: 'stu-test-5', claseNombre: 'Computación III', total: 88 },
        'stu-test-5_computacionii_b4': { id: 'stu-test-5_computacionii_b4', estudianteId: 'stu-test-5', claseNombre: 'Computación II', total: 100 }
    };

    assert.strictEqual(sandbox.ensureStudentGradebookStructure(stu4, 'Computación III'), null);
    assert.strictEqual(stu4.grades['Computación III'], undefined);
    const savedBad = await sandbox.saveStudentSubjectGradeAtomic('stu-test-4', 'Computación III', 1, { zona: 30, exam: 50, total: 80 });
    assert.strictEqual(savedBad, false);
    assert.strictEqual(stu4.grades['Computación III'], undefined);
    assert.strictEqual(sandbox.ensureStudentGradebookStructure(stu4, 'Administración y Organización de Oficina'), 'Administración y Organización de Empresas');
    console.log('✅ Test 4: Rechazo en tiempo real de escritura fantasma en UI / guardado atómico verificado.');

    // Test 5: normalizeSchoolAcademicData limpia fantasmas + huérfanos manteniendo la nota máxima
    sandbox.normalizeSchoolAcademicData(sandbox.STATE);
    assert.strictEqual(stu5.grades['Contabilidad General'], undefined);
    assert.strictEqual(stu5.grades['Computaci\ufffd\ufffdn II'], undefined);
    assert.deepStrictEqual(Array.from(stu5.grades['Computación II']), [96, 100, 90, 100]);
    assert.strictEqual(sandbox.STATE.calificaciones['st-01_contabilidadgeneral_b1'], undefined);
    assert.strictEqual(sandbox.STATE.calificaciones['stu-test-5_computacioniii_b2'], undefined);
    assert.ok(sandbox.STATE.calificaciones['stu-test-5_computacionii_b4']);
    console.log('✅ Test 5: Normalización limpia claves fantasma, preserva Math.max y depura calificaciones huérfanas.');

    // Test 6: Transición multi-ciclo (2027 -> 2028) con EnccoCycleArchiver sin heredar claves del grado anterior
    await sandbox.window.EnccoCycleArchiver.openNewAcademicCycle('2028', { promoteStudents: true, archiveCurrent: false });
    sandbox.normalizeSchoolAcademicData(sandbox.STATE);
    const promoted4to5 = sandbox.STATE.students.find(s => s.id === 'stu-test-4');
    const promoted5to6 = sandbox.STATE.students.find(s => s.id === 'stu-test-5');
    assert.ok(promoted4to5.grade.includes('5to'));
    assert.strictEqual(promoted4to5.grades['Computación I'], undefined, 'No debe heredar materias de 4to al pasar a 5to');
    assert.ok(promoted4to5.grades['Computación II'] && promoted4to5.grades['Computación II'].length === 4);
    assert.ok(promoted5to6.grade.includes('6to'));
    assert.strictEqual(promoted5to6.grades['Computación II'], undefined, 'No debe heredar materias de 5to al pasar a 6to');
    assert.ok(promoted5to6.grades['Computación III'] && promoted5to6.grades['Computación III'].length === 4);
    assert.strictEqual(Object.keys(sandbox.STATE.calificaciones).length, 0);
    assert.strictEqual(Object.keys(sandbox.STATE.exoneraciones).length, 0);
    console.log('✅ Test 6: Transición de ciclo 2027 -> 2028 sin claves heredadas ni fantasmas verificada.');

    console.log('\n🎉 TODAS LAS PRUEBAS ANTI-CLAVES FANTASMA PASARON (6/6).');
})();
