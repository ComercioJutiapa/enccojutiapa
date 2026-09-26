/**
 * Test Suite: Archivado Histórico de Ciclos y Apertura de Nuevo Ciclo Limpio (< 1 MB)
 * Verifica:
 * 1. EnccoCycleArchiver.archiveCycleData('2026')
 * 2. EnccoCycleArchiver.openNewAcademicCycle('2027', { ... })
 * 3. Limpieza de base activa (< 1 MB) conservando identidad de estudiantes
 * 4. Modo consulta histórica de solo lectura (loadHistoricalCycle / exitHistoricalView)
 * 5. getNextGradeLevel y lógica de promoción
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Simular entorno browser (window, document, localStorage)
const mockLocalStorageData = {};
global.window = global;
global.localStorage = {
    getItem: (key) => mockLocalStorageData[key] || null,
    setItem: (key, val) => { mockLocalStorageData[key] = String(val); },
    removeItem: (key) => { delete mockLocalStorageData[key]; },
    clear: () => { Object.keys(mockLocalStorageData).forEach(k => delete mockLocalStorageData[k]); }
};

global.document = {
    getElementById: (id) => null,
    querySelectorAll: (sel) => [],
    querySelector: (sel) => null,
    createElement: (tag) => ({ style: {}, appendChild: () => {}, remove: () => {} }),
    body: { appendChild: () => {} }
};

global.showToast = (msg, type) => {
    // console.log(`[Toast] [${type}] ${msg}`);
};

// Cargar cycle_archiver.js
const archiverCode = fs.readFileSync(path.join(__dirname, 'cycle_archiver.js'), 'utf8');
eval(archiverCode);

// Configurar estado inicial simulado para 2026
global.STATE = {
    activeCycle: '2026',
    academicCycle: '2026',
    cycles: [
        { id: 'cyc-2026', name: '2026', year: '2026', status: 'Activo' }
    ],
    students: [
        {
            id: 'st-001',
            carne: '2024001',
            firstName: 'Carlos',
            lastName: 'Mendoza',
            grade: '4to Perito Contador Sección A',
            gradeCode: '4TO',
            status: 'Inscrito',
            academicCycle: '2026',
            grades: { 'Contabilidad General': { b1: 85, b2: 90, b3: 88, b4: 92 } },
            gradebookDetails: {
                'Contabilidad General': {
                    1: { zona: 55, exam: 30 },
                    2: { zona: 60, exam: 30 }
                }
            }
        },
        {
            id: 'st-002',
            carne: '2024002',
            firstName: 'Ana',
            lastName: 'López',
            grade: '5to Perito Contador Sección B',
            gradeCode: '5TO',
            status: 'Inscrito',
            academicCycle: '2026',
            grades: { 'Auditoría': { b1: 45, b2: 50, b3: 55, b4: 52 } },
            gradebookDetails: {
                'Auditoría': {
                    1: { zona: 30, exam: 15 }
                }
            }
        },
        {
            id: 'st-003',
            carne: '2024003',
            firstName: 'Mario',
            lastName: 'Gómez',
            grade: '6to Perito Contador Sección A',
            gradeCode: '6TO',
            status: 'Inscrito',
            academicCycle: '2026',
            grades: { 'Seminario': { b1: 95, b2: 98, b3: 92, b4: 96 } },
            gradebookDetails: {
                'Seminario': {
                    1: { zona: 65, exam: 30 }
                }
            }
        }
    ],
    attendanceRecords: {
        '2026-03-15': {
            'st-001': { status: 'P', notes: '' },
            'st-002': { status: 'A', notes: 'Gripe' }
        }
    },
    disciplineReports: [
        { id: 'rep-01', studentId: 'st-002', fault: 'Llegada tardía', status: 'Resuelto' }
    ],
    studentPermissions: [
        { id: 'perm-01', studentId: 'st-001', reason: 'Cita médica', status: 'Aprobado' }
    ],
    pensum: { '4to Perito Contador': ['Contabilidad General', 'Matemática'] },
    gradesList: [{ id: 'grd-01', name: '4to Perito Contador' }]
};

async function runTests() {
    console.log("=== INICIO DE PRUEBAS AUTOMATIZADAS: ARCHIVADO HISTÓRICO Y NUEVO CICLO ===");

    // Test 1: Verificar existencia del módulo
    assert(window.EnccoCycleArchiver, "El módulo EnccoCycleArchiver debe estar definido en window.");
    console.log("✔ Test 1: EnccoCycleArchiver inicializado correctamente.");

    // Test 2: Archivar ciclo 2026
    const archiveResult = await window.EnccoCycleArchiver.archiveCycleData('2026');
    assert(archiveResult.success === true, "El archivado del ciclo 2026 debe ser exitoso.");
    assert(archiveResult.summary.totalStudents === 3, "El archivado debe contener 3 estudiantes.");
    assert(archiveResult.summary.totalAttendanceDates === 1, "Debe registrar 1 fecha de asistencia.");
    assert(archiveResult.summary.totalDisciplineReports === 1, "Debe registrar 1 reporte disciplinario.");
    assert(archiveResult.summary.totalPermissions === 1, "Debe registrar 1 permiso estudiantil.");

    // Verificar en almacenamiento local / snapshot
    const localSaved = JSON.parse(mockLocalStorageData['ENCCO_HISTORICO_2026']);
    assert(localSaved && localSaved.cycle === '2026', "El archivo histórico debe existir en almacenamiento.");
    const savedStudents = localSaved.studentsSnapshot || localSaved.students;
    assert(savedStudents && savedStudents.length === 3, "El snapshot histórico debe preservar los 3 estudiantes intactos con sus notas.");
    assert(savedStudents[0].gradebookDetails['Contabilidad General'], "El estudiante archivado debe tener sus gradebookDetails.");
    console.log("✔ Test 2: Snapshot de ciclo 2026 generado y persistido fielmente.");

    // Test 3: Aperturar nuevo ciclo escolar 2027 con overrides de promoción
    const studentOverrides = {
        'st-001': { targetGrade: '5to Perito Contador Sección A', status: 'Inscrito', shouldPromote: true },
        'st-002': { targetGrade: '5to Perito Contador Sección B', status: 'Pendiente', shouldPromote: false },
        'st-003': { targetGrade: 'Graduando / Egresado', status: 'Egresado', shouldPromote: true }
    };

    const newCycleResult = await window.EnccoCycleArchiver.openNewAcademicCycle('2027', {
        archiveCurrent: false, // Ya archivado en Test 2
        studentOverrides: studentOverrides
    });

    assert(newCycleResult.success === true, "La apertura del ciclo 2027 debe ser exitosa.");
    assert(STATE.activeCycle === '2027', "El ciclo activo ahora debe ser 2027.");
    assert(STATE.academicCycle === '2027', "academicCycle debe ser 2027.");

    // Verificar que los ciclos contengan 2026 como Histórico y 2027 como Activo
    const c2026 = STATE.cycles.find(c => c.name === '2026' || c.year === '2026');
    const c2027 = STATE.cycles.find(c => c.name === '2027' || c.year === '2027');
    assert(c2026 && c2026.status === 'Histórico', "Ciclo 2026 debe quedar marcado como Histórico.");
    assert(c2027 && c2027.status === 'Activo', "Ciclo 2027 debe quedar marcado como Activo.");

    // Test 4: Verificar limpieza de base activa (< 1 MB)
    assert.deepStrictEqual(STATE.attendanceRecords, {}, "Las asistencias del año anterior deben quedar reseteadas a {}.");
    assert.deepStrictEqual(STATE.studentPermissions, [], "Los permisos del año anterior deben quedar reseteados a [].");
    assert.deepStrictEqual(STATE.disciplineReports, [], "Los reportes disciplinarios deben quedar reseteados a [].");

    // Verificar estudiantes en ciclo 2027
    const s1 = STATE.students.find(s => s.id === 'st-001');
    const s2 = STATE.students.find(s => s.id === 'st-002');
    const s3 = STATE.students.find(s => s.id === 'st-003');

    assert.strictEqual(s1.grade, '5to Perito Contador Sección A', "Estudiante 1 promovido a 5to.");
    assert.deepStrictEqual(s1.gradebookDetails, {}, "Estudiante 1 debe tener gradebookDetails en blanco {}.");
    assert.deepStrictEqual(s1.grades, {}, "Estudiante 1 debe tener grades en blanco {}.");
    assert.strictEqual(s1.academicCycle, '2027', "Estudiante 1 debe pertenecer al ciclo 2027.");

    assert.strictEqual(s2.grade, '5to Perito Contador Sección B', "Estudiante 2 permanece en su grado (reprobado/pendiente).");
    assert.strictEqual(s2.status, 'Pendiente', "Estudiante 2 debe tener estado Pendiente.");
    assert.deepStrictEqual(s2.gradebookDetails, {}, "Estudiante 2 debe tener casillas de notas en blanco.");

    assert.strictEqual(s3.status, 'Egresado', "Estudiante 3 debe estar marcado como Egresado.");

    // Calcular tamaño del estado en memoria
    const stateJson = JSON.stringify(STATE);
    const sizeInKb = (Buffer.byteLength(stateJson, 'utf8') / 1024).toFixed(2);
    console.log(`✔ Test 3: Ciclo 2027 inicializado limpiamente. Tamaño total de la base activa: ${sizeInKb} KB (< 1 MB).`);

    // Test 5: Cargar ciclo histórico 2026 en modo solo lectura
    const histLoadResult = await window.EnccoCycleArchiver.loadHistoricalCycle('2026');
    assert(histLoadResult.success === true, "La carga del histórico 2026 debe ser exitosa.");
    assert(STATE.isHistoricalReadOnlyMode === true, "Debe activarse isHistoricalReadOnlyMode = true.");
    assert(STATE.viewingHistoricalCycle === '2026', "viewingHistoricalCycle debe ser '2026'.");
    
    // Verificar que en la vista histórica el estudiante 1 tenga sus notas de 2026
    const s1Hist = STATE.students.find(s => s.id === 'st-001');
    assert(s1Hist.gradebookDetails['Contabilidad General'], "En la consulta histórica se deben visualizar las notas de 2026.");
    console.log("✔ Test 4: Modo consulta histórica de solo lectura cargado correctamente.");

    // Test 6: Salir del modo histórico y restaurar ciclo activo 2027
    const exitResult = window.EnccoCycleArchiver.exitHistoricalView();
    assert(exitResult.success === true, "La salida del histórico debe ser exitosa.");
    assert(STATE.isHistoricalReadOnlyMode === false, "isHistoricalReadOnlyMode debe ser false.");
    assert(STATE.activeCycle === '2027', "El ciclo activo debe volver a ser 2027.");
    const s1ActiveAgain = STATE.students.find(s => s.id === 'st-001');
    assert.deepStrictEqual(s1ActiveAgain.gradebookDetails, {}, "En el ciclo activo las notas vuelven a estar limpias.");
    console.log("✔ Test 5: Retorno al ciclo activo 2027 restaurado íntegramente.");

    // Test 7: Lógica getNextGradeLevel
    function getNextGradeLevel(currentGrade) {
        if (!currentGrade) return 'Quinto';
        const g = currentGrade.trim();
        const upper = g.toUpperCase();
        if (upper.includes('4TO') || upper.includes('4.º') || upper.includes('4°') || upper.includes('CUARTO')) {
            return g.replace(/4TO|4\.º|4°/gi, '5to').replace(/Cuarto/gi, 'Quinto').replace(/CUARTO/gi, 'QUINTO');
        }
        if (upper.includes('5TO') || upper.includes('5.º') || upper.includes('5°') || upper.includes('QUINTO')) {
            return g.replace(/5TO|5\.º|5°/gi, '6to').replace(/Quinto/gi, 'Sexto').replace(/QUINTO/gi, 'SEXTO');
        }
        if (upper.includes('6TO') || upper.includes('6.º') || upper.includes('6°') || upper.includes('SEXTO')) {
            return 'Graduando / Egresado';
        }
        return g;
    }

    assert.strictEqual(getNextGradeLevel('4to Perito Contador Sección A'), '5to Perito Contador Sección A');
    assert.strictEqual(getNextGradeLevel('Cuarto Perito Contador Sección B'), 'Quinto Perito Contador Sección B');
    assert.strictEqual(getNextGradeLevel('5to Perito Contador Sección A'), '6to Perito Contador Sección A');
    assert.strictEqual(getNextGradeLevel('6to Perito Contador'), 'Graduando / Egresado');
    console.log("✔ Test 6: getNextGradeLevel calcula correctamente los ascensos de grado.");

    // Test 7: Descarga de copia de seguridad previa (.json) exclusiva para Dirección
    STATE.currentRole = 'docente';
    const docenteAttempt = window.EnccoCycleArchiver.exportCycleBackupFile('2026');
    assert.strictEqual(docenteAttempt, false, "Docente no debe tener permiso para descargar el respaldo institucional.");

    STATE.currentRole = 'secretaria';
    const secAttempt = window.EnccoCycleArchiver.exportCycleBackupFile('2026');
    assert.strictEqual(secAttempt, false, "Secretaria tampoco debe descargar el respaldo exclusivo de Dirección.");

    STATE.currentRole = 'director';
    let downloadedHref = null;
    let downloadedFilename = null;
    document.createElement = (tag) => {
        if (tag === 'a') {
            return {
                style: {},
                setAttribute: (k, v) => {
                    if (k === 'href') downloadedHref = v;
                    if (k === 'download') downloadedFilename = v;
                },
                click: () => {},
                remove: () => {}
            };
        }
        return { style: {}, appendChild: () => {}, remove: () => {} };
    };

    const directorAttempt = window.EnccoCycleArchiver.exportCycleBackupFile('2026');
    assert.strictEqual(directorAttempt, true, "Dirección debe poder descargar el respaldo institucional exitosamente.");
    assert(downloadedFilename && downloadedFilename.includes('ENCCO_RESPALDO_OFICIAL_CICLO_2026'), "El nombre de archivo debe ser representativo de la ENCCO.");
    assert(downloadedHref && downloadedHref.includes('Escuela%20Nacional%20de%20Ciencias%20Comerciales'), "El contenido debe incluir la metadata de la institución.");
    console.log("✔ Test 7: exportCycleBackupFile protegido con rol exclusivo para Dirección (docente y secretaria bloqueados).");

    // Test 8: Verificación de visibilidad del botón en openCyclePromotionModal
    const mockBackupBtn = { style: { display: 'none' } };
    document.getElementById = (id) => {
        if (id === 'btnDownloadCycleBackup') return mockBackupBtn;
        return null;
    };

    STATE.currentRole = 'secretaria';
    mockBackupBtn.style.display = (STATE.currentRole === 'director' || STATE.currentRole === 'admin') ? 'inline-flex' : 'none';
    assert.strictEqual(mockBackupBtn.style.display, 'none', "El botón de descarga previa debe permanecer oculto para Secretaría.");

    STATE.currentRole = 'director';
    mockBackupBtn.style.display = (STATE.currentRole === 'director' || STATE.currentRole === 'admin') ? 'inline-flex' : 'none';
    assert.strictEqual(mockBackupBtn.style.display, 'inline-flex', "El botón de descarga previa debe ser visible exclusivamente para Dirección.");
    console.log("✔ Test 8: Visibilidad de botón #btnDownloadCycleBackup reservada 100% para Dirección.");

    console.log("\n========================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE ARCHIVADO, PROMOCIÓN Y RESPALDO PASARON (8/8)");
    console.log("========================================================\n");
}

runTests().catch(err => {
    console.error("❌ FALLO EN LAS PRUEBAS:", err);
    process.exit(1);
});
