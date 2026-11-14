/**
 * tests/test_cycle_promotion_and_archiver.js
 * Suite de Verificación Integral del Motor de Cierre, Archivado Histórico y Apertura de Nuevo Ciclo Escolar
 * Valida los 4 pilares: DBA (aislamiento de datos), Backend (promoción canónica), Frontend (reactividad y Sección D) y Usuario Final (Expediente Histórico).
 * Ejecutado 100% en memoria aislada (sin alterar la base en vivo 2026).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================================');
console.log('🎓 TEST: MOTOR DE ARCHIVADO HISTÓRICO, PROMOCIÓN CANÓNICA Y CICLO ESCOLAR');
console.log('================================================================================\n');

const appJsPath = path.join(__dirname, '..', 'app.js');
const archiverJsPath = path.join(__dirname, '..', 'cycle_archiver.js');

const appCode = fs.readFileSync(appJsPath, 'utf8');
const archiverCode = fs.readFileSync(archiverJsPath, 'utf8');

// 1. Verificación estática de las mejoras en app.js
console.log('1. Verificando aislamiento de parches 2026 y soporte de Sección D en app.js...');
assert.ok(appCode.includes('function isCycle2026Context(student)'), 'Debe existir isCycle2026Context(student) en app.js');
assert.ok(appCode.includes('if (!isCycle2026Context(student)) return null;'), 'getOfficialBim1Details / Bim2 / Additional deben validar isCycle2026Context');
assert.ok(appCode.includes('function extractCleanPromotionSectionLetter(student)'), 'Debe existir extractCleanPromotionSectionLetter en app.js');
assert.ok(appCode.includes(`<option value="D" \${selectedSec === 'D' ? 'selected' : ''}>Sección D</option>`), 'El selector de sección destino en Promoción debe incluir Sección D');
assert.ok(appCode.includes('window._promotionOverridesDraft'), 'La tabla de promoción debe preservar selecciones en _promotionOverridesDraft al filtrar');
console.log('  ✅ Aislamiento 2026, Sección D y persistencia de filtros en modal verificados en app.js.');

// 2. Simulación en memoria de EnccoCycleArchiver (ciclo 2026 -> 2027 -> consulta histórica 2026 -> retorno a 2027)
console.log('2. Simulando ciclo completo en sandbox aislado (Archivado 2026 -> Promoción 2027 -> Consulta Histórica -> Retorno)...');

const localStore = {};
const putCalls = [];

const sandboxWindow = {
    localStorage: {
        getItem: (k) => localStore[k] || null,
        setItem: (k, v) => { localStore[k] = String(v); },
        removeItem: (k) => { delete localStore[k]; },
        key: (i) => Object.keys(localStore)[i] || null,
        get length() { return Object.keys(localStore).length; }
    },
    OFFICIAL_GRADE_SUBJECTS: {
        '4': ['Contabilidad de Sociedades', 'Matemática Comercial', 'Redacción y Correspondencia Mercantil'],
        '5': ['Contabilidad de Costos', 'Cálculo Mercantil y Financiero', 'Legislación Fiscal y Aduanera'],
        '6': ['Contabilidad Bancaria', 'Auditoría', 'Derecho Mercantil y Nociones de Derecho Laboral']
    },
    STATE: {
        activeCycle: '2026',
        academicCycle: '2026',
        currentRole: 'director',
        currentUser: { name: 'Licda. Francisca Alcira González Zepeda', role: 'director' },
        cycles: [
            { id: 'cyc-2026', name: '2026', year: '2026', status: 'Activo' }
        ],
        config: {
            bimestreActivoOficial: 4,
            activeBimestre: 4,
            lockedBimestres: { 1: true, 2: true, 3: true, 4: false }
        },
        students: [
            {
                id: 'stu-4c-01',
                personalCode: 'B199DJU',
                carne: '2026-CC-001',
                name: 'ARANA CORADO MELANY ANAHÍ',
                grade: '4to Perito Contador',
                section: 'Sección C',
                gradeCode: '4to C',
                status: 'Activo',
                active: true,
                grades: {
                    'Contabilidad de Sociedades': [60, 74, 82, 86]
                },
                gradebookDetails: {
                    'Contabilidad de Sociedades': {
                        '4': { zona: 56, exam: 30, total: 86 }
                    }
                },
                academicExceptions: [{ id: 'ex-1', bimestre: '2', type: 'EXONERADO' }]
            },
            {
                id: 'stu-5d-01',
                personalCode: 'E195FVT',
                carne: '2026-QD-025',
                name: 'RAMOS FLORIÁN DULCE MARÍA',
                grade: '5to Perito Contador',
                section: 'Sección D',
                gradeCode: '5to D',
                status: 'Activo',
                active: true,
                grades: {
                    'Contabilidad de Costos': [75, 80, 85, 90]
                },
                gradebookDetails: {}
            },
            {
                id: 'stu-6a-01',
                personalCode: 'S600GRAD',
                carne: '2026-SA-001',
                name: 'ALUMNO GRADUANDO SEXTO',
                grade: '6to Perito Contador',
                section: 'Sección A',
                gradeCode: '6to A',
                status: 'Activo',
                active: true,
                grades: {
                    'Auditoría': [80, 85, 90, 95]
                },
                gradebookDetails: {}
            },
            {
                id: 'stu-4a-rep',
                personalCode: 'R400REP',
                carne: '2026-CA-099',
                name: 'ALUMNO PENDIENTE RECUPERACION',
                grade: '4to Perito Contador',
                section: 'Sección A',
                gradeCode: '4to A',
                status: 'Activo',
                active: true,
                grades: {
                    'Contabilidad de Sociedades': [40, 45, 50, 48]
                },
                gradebookDetails: {}
            }
        ],
        pensum: [
            {
                id: 'pen-cnb-075',
                code: 'CNB-075',
                name: 'Contabilidad de Sociedades',
                grade: '4to Perito Contador',
                assignedTeacherId: 'usr-doc-11',
                teacher: 'Lic.MA. Wilder Porfirio Pérez López',
                gradingConfig: {
                    zonaWeight: 60,
                    examWeight: 40,
                    activitiesCount: 7,
                    activities: [{ name: 'Evalusción', maxScore: 10 }],
                    bimestres: { '4': { activitiesCount: 7 } }
                }
            }
        ],
        calificaciones: {
            '4to_Perito_Contador_Secci_n_C': {
                'Contabilidad_de_Sociedades': {
                    bimestre_4: { 'stu-4c-01': { total: 86 } }
                }
            }
        },
        gradingConfigs: {
            'pen-cnb-075__4to_C': { activitiesCount: 7 }
        },
        attendanceRecords: { '2026-10-15': { 'stu-4c-01': 'P' } },
        disciplineReports: [{ id: 'rep-1', studentId: 'stu-4c-01' }],
        studentPermissions: [{ id: 'perm-1', studentId: 'stu-4c-01' }],
        academicExonerations: [{ id: 'ex-1', studentId: 'stu-4c-01' }],
        exoneraciones: { 'ex-1': { id: 'ex-1' } },
        studentAnnotations: [{ id: 'ann-1', studentId: 'stu-4c-01', text: 'Excelente desempeño' }]
    }
};

global.window = sandboxWindow;
global.localStorage = sandboxWindow.localStorage;
global.fetch = async (url, opts) => {
    if (opts && opts.method === 'PUT') {
        putCalls.push({ url, body: JSON.parse(opts.body) });
        return { ok: true, json: async () => ({}) };
    }
    return { ok: false };
};

// Cargar cycle_archiver.js en el sandbox
eval(archiverCode);
const Archiver = sandboxWindow.EnccoCycleArchiver;
assert.ok(Archiver, 'EnccoCycleArchiver debe cargarse en window');

(async () => {
    // Probar apertura de ciclo 2027 con studentOverrides
    const overrides = {
        'stu-4c-01': { targetGrade: '5to Perito Contador', targetSection: 'C', status: 'Activo', shouldPromote: true },
        'stu-5d-01': { targetGrade: '6to Perito Contador', targetSection: 'D', status: 'Activo', shouldPromote: true },
        'stu-6a-01': { targetGrade: 'Graduando / Egresado', targetSection: 'A', status: 'Egresado', shouldPromote: true },
        'stu-4a-rep': { targetGrade: '4to Perito Contador', targetSection: 'A', status: 'Activo', academicPromotionStatus: 'Pendiente Recuperación', shouldPromote: false }
    };

    const res = await Archiver.openNewAcademicCycle('2027', {
        archiveCurrent: true,
        promoteStudents: false,
        studentOverrides: overrides
    });

    assert.strictEqual(res.success, true, 'openNewAcademicCycle debe retornar success: true');
    assert.strictEqual(res.stats.promotedCount, 2, 'Deben promoverse 2 estudiantes (4to->5to y 5to->6to)');
    assert.strictEqual(res.stats.graduatedCount, 1, 'Debe graduarse 1 estudiante de 6to');
    assert.strictEqual(res.stats.retainedCount, 1, 'Debe quedar 1 estudiante retenido / en recuperación');

    // Verificar que se archivó en /historico/2026.json y /encc_school_state/historico/2026.json
    assert.ok(putCalls.some(c => c.url.includes('/historico/2026.json')), 'Debe archivar en /historico/2026.json');
    assert.ok(putCalls.some(c => c.url.includes('/encc_school_state/historico/2026.json')), 'Debe archivar en /encc_school_state/historico/2026.json');

    // Verificar estado limpio en 2027
    assert.strictEqual(sandboxWindow.STATE.activeCycle, '2027', 'El ciclo activo debe ser 2027');
    assert.strictEqual(sandboxWindow.STATE.config.bimestreActivoOficial, 1, 'El bimestre activo debe reiniciarse a 1');
    assert.strictEqual(Object.keys(sandboxWindow.STATE.calificaciones).length, 0, 'STATE.calificaciones debe estar limpio en 2027');
    assert.strictEqual(Object.keys(sandboxWindow.STATE.gradingConfigs).length, 0, 'STATE.gradingConfigs debe estar limpio en 2027');

    // Verificar promoción canónica de Melany (4to C -> 5to C)
    const melany2027 = sandboxWindow.STATE.students.find(s => s.id === 'stu-4c-01');
    assert.strictEqual(melany2027.grade, '5to Perito Contador');
    assert.strictEqual(melany2027.section, 'Sección C');
    assert.strictEqual(melany2027.gradeCode, '5to C');
    assert.strictEqual(melany2027.academicCycle, '2027');
    assert.strictEqual(melany2027.academicExceptions.length, 0, 'Las exoneraciones de 2026 no deben arrastrarse a 2027');
    assert.deepStrictEqual(melany2027.grades['Contabilidad de Costos'], [0, 0, 0, 0], 'Debe inicializar los cursos de 5to en [0,0,0,0]');

    // Verificar promoción canónica de Dulce (5to D -> 6to D)
    const dulce2027 = sandboxWindow.STATE.students.find(s => s.id === 'stu-5d-01');
    assert.strictEqual(dulce2027.grade, '6to Perito Contador');
    assert.strictEqual(dulce2027.section, 'Sección D');
    assert.strictEqual(dulce2027.gradeCode, '6to D');
    assert.deepStrictEqual(dulce2027.grades['Auditoría'], [0, 0, 0, 0], 'Debe inicializar los cursos de 6to en [0,0,0,0]');

    // Verificar egreso de 6to A (resguardado en graduatedStudentsByCycle para exclusión perpetua)
    const gradsList = (sandboxWindow.STATE.graduatedStudentsByCycle && sandboxWindow.STATE.graduatedStudentsByCycle['2026']) || sandboxWindow.STATE.students || [];
    const grad2027 = gradsList.find(s => s.id === 'stu-6a-01');
    assert.strictEqual(grad2027.status, 'Egresado');
    assert.strictEqual(grad2027.active, false);
    assert.strictEqual(grad2027.graduationCycle, '2026');

    // Verificar que el docente asignado en Pensum se preservó pero la rúbrica volvió a 40/60 limpio
    const sociedadesCourse = sandboxWindow.STATE.pensum[0];
    assert.strictEqual(sociedadesCourse.assignedTeacherId, 'usr-doc-11', 'El docente asignado debe conservarse en el nuevo ciclo');
    assert.strictEqual(sociedadesCourse.gradingConfig.activities[0].name, 'Act. 1', 'Las cabeceras de actividades deben reiniciarse a Act. 1..10');
    console.log('  ✅ Promoción canónica a 2027 y limpieza de estado activo verificadas.');

    // 3. Probar Consulta Histórica (loadHistoricalCycle('2026')) y Retorno (exitHistoricalView())
    console.log('3. Probando Modo de Consulta Histórica (2026) y retorno reactivo a 2027...');
    const histRes = await Archiver.loadHistoricalCycle('2026');
    assert.strictEqual(histRes.success, true, 'loadHistoricalCycle(2026) debe ser exitoso');
    assert.strictEqual(sandboxWindow.STATE.isHistoricalReadOnlyMode, true);
    assert.strictEqual(sandboxWindow.STATE.activeCycle, '2026');

    const melanyHist = sandboxWindow.STATE.students.find(s => s.id === 'stu-4c-01');
    assert.strictEqual(melanyHist.grade, '4to Perito Contador', 'En modo histórico 2026 Melany debe verse en 4to Perito Contador');
    assert.deepStrictEqual(melanyHist.grades['Contabilidad de Sociedades'], [60, 74, 82, 86], 'En modo histórico 2026 las notas deben estar intactas');

    const exitRes = Archiver.exitHistoricalView();
    assert.strictEqual(exitRes.success, true, 'exitHistoricalView() debe retornar al ciclo activo');
    assert.strictEqual(sandboxWindow.STATE.isHistoricalReadOnlyMode, false);
    assert.strictEqual(sandboxWindow.STATE.activeCycle, '2027');
    assert.strictEqual(sandboxWindow.STATE.students.find(s => s.id === 'stu-4c-01').grade, '5to Perito Contador', 'Al salir del modo histórico, Melany vuelve a 5to Perito Contador en 2027');
    console.log('  ✅ Consulta histórica 2026 y retorno al ciclo activo 2027 verificados sin pérdida de datos.');

    // 4. Probar Récord Histórico en Expediente del Estudiante (loadStudentHistoricalRecord)
    console.log('4. Probando Récord Histórico por Estudiante (loadStudentHistoricalRecord con Array snapshot)...');
    const mockLoading = { style: { display: 'none' } };
    const mockContent = { innerHTML: '' };
    global.document = {
        getElementById: (id) => {
            if (id === 'profHistoricoLoading') return mockLoading;
            if (id === 'profHistoricoContent') return mockContent;
            return null;
        },
        querySelectorAll: () => []
    };

    await Archiver.loadStudentHistoricalRecord('stu-4c-01');
    assert.ok(mockContent.innerHTML.includes('Ciclo Escolar 2026'), 'El expediente histórico debe mostrar Ciclo Escolar 2026');
    assert.ok(mockContent.innerHTML.includes('Contabilidad de Sociedades'), 'El expediente histórico debe mostrar Contabilidad de Sociedades');
    assert.ok(mockContent.innerHTML.includes('75.5'), 'El expediente histórico debe calcular el promedio de [60, 74, 82, 86] = 75.5');
    console.log('  ✅ Expediente histórico individual verificado con soporte para Array y cálculo de promedios.');

    console.log('\n🎉 TODAS LAS PRUEBAS DEL MOTOR DE CICLO ESCOLAR Y PROMOCIÓN PASARON AL 100%!');
    process.exit(0);
})();
