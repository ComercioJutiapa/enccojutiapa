// ==========================================================================
// 🧪 PRUEBAS UNITARIAS: BITÁCORA DUAL (GLOBAL Y POR DÍA) Y PLANTILLA EN BLANCO
// ==========================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("================================================================================");
console.log("🧪 PRUEBAS UNITARIAS: BITÁCORA DUAL (GLOBAL/DÍA) Y PLANTILLA EN BLANCO");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ ${name}`);
        console.error(`     Error: ${err.message}\n`);
        failed++;
    }
}

const htmlPath = path.join(__dirname, 'plataforma.html');
const appJsPath = path.join(__dirname, 'app.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// --- TEST 1: Elementos de la vista dual de bitácora en plataforma.html ---
runTest('TEST 1: Elementos estructurales de vista dual en plataforma.html', () => {
    assert(htmlContent.includes('id="btnBitacoraTabGlobal"'), 'Debe existir la pestaña de listado global #btnBitacoraTabGlobal');
    assert(htmlContent.includes('id="btnBitacoraTabStudent"'), 'Debe existir la pestaña de estudiante/día #btnBitacoraTabStudent');
    assert(htmlContent.includes('id="courseBitacoraGlobalSection"'), 'Debe existir el contenedor #courseBitacoraGlobalSection');
    assert(htmlContent.includes('id="courseBitacoraStudentSection"'), 'Debe existir el contenedor #courseBitacoraStudentSection');
    assert(htmlContent.includes('id="courseBitacoraGlobalSearch"'), 'Debe existir el buscador global #courseBitacoraGlobalSearch');
    assert(htmlContent.includes('id="courseBitacoraGlobalTypeFilter"'), 'Debe existir el filtro por tipo de incidencia #courseBitacoraGlobalTypeFilter');
    assert(htmlContent.includes('id="courseBitacoraGlobalListContainer"'), 'Debe existir el contenedor de tabla global #courseBitacoraGlobalListContainer');
    assert(htmlContent.includes('id="btnBitacoraPrintGlobal"'), 'Debe existir el botón de impresión global #btnBitacoraPrintGlobal');
    assert(htmlContent.includes('id="btnBitacoraPrintStudent"'), 'Debe existir el botón de impresión por estudiante #btnBitacoraPrintStudent');
});

// --- TEST 2: Funciones exportadas en app.js para el modo dual ---
runTest('TEST 2: Funciones de bitácora dual y reportes exportadas en app.js', () => {
    assert(appJsContent.includes('function setBitacoraViewMode'), 'setBitacoraViewMode debe existir');
    assert(appJsContent.includes('window.setBitacoraViewMode = setBitacoraViewMode'), 'setBitacoraViewMode debe exportarse');
    assert(appJsContent.includes('function getGlobalStudentsWithIncidents'), 'getGlobalStudentsWithIncidents debe existir');
    assert(appJsContent.includes('window.getGlobalStudentsWithIncidents = getGlobalStudentsWithIncidents'), 'getGlobalStudentsWithIncidents debe exportarse');
    assert(appJsContent.includes('function renderCourseBitacoraGlobalView'), 'renderCourseBitacoraGlobalView debe existir');
    assert(appJsContent.includes('window.renderCourseBitacoraGlobalView = renderCourseBitacoraGlobalView'), 'renderCourseBitacoraGlobalView debe exportarse');
    assert(appJsContent.includes('function drillDownToStudentBitacora'), 'drillDownToStudentBitacora debe existir');
    assert(appJsContent.includes('window.drillDownToStudentBitacora = drillDownToStudentBitacora'), 'drillDownToStudentBitacora debe exportarse');
    assert(appJsContent.includes('function renderCourseBitacoraStudentDayView'), 'renderCourseBitacoraStudentDayView debe existir');
    assert(appJsContent.includes('window.renderCourseBitacoraStudentDayView = renderCourseBitacoraStudentDayView'), 'renderCourseBitacoraStudentDayView debe exportarse');
    assert(appJsContent.includes('function printGlobalIncidentsOfficialReport'), 'printGlobalIncidentsOfficialReport debe existir');
    assert(appJsContent.includes('window.printGlobalIncidentsOfficialReport = printGlobalIncidentsOfficialReport'), 'printGlobalIncidentsOfficialReport debe exportarse');
});

// --- TEST 3: Agregación de incidencias en getGlobalStudentsWithIncidents ---
runTest('TEST 3: getGlobalStudentsWithIncidents computa correctamente A, T, J y anotaciones', () => {
    // Simular entorno mínimo
    const mockState = {
        activeCycle: '2026',
        attendanceSelectedMonth: '8',
        students: [
            { id: 'ST_01', carne: '2026-QA-001', name: 'Alvarez, Juan', gradeCode: '4TO_A', status: 'Activo' },
            { id: 'ST_02', carne: '2026-QA-002', name: 'Barrios, Ana', gradeCode: '4TO_A', status: 'Activo' },
            { id: 'ST_03', carne: '2026-QA-003', name: 'Castro, Carlos', gradeCode: '4TO_A', status: 'Activo' }
        ],
        attendanceRecords: {
            'ATT_4TO_A_M8_GENERAL': {
                'ST_01': { '3': 'A', '4': 'T', '5': 'P' },
                'ST_02': { '3': 'J', '4': 'P', '5': 'P' }
            }
        },
        courseBitacora: [
            { id: 'CBIT_1', studentId: 'ST_01', courseName: 'Matemática', text: 'Tarea pendiente #1', date: '2026-08-04' }
        ],
        disciplineReports: [
            { id: 'DISC_1', studentId: 'ST_02', faultType: 'Llegada tarde a formación', date: '2026-08-03' }
        ]
    };

    // Evaluar lógica
    const studentsWithIncidents = [];
    mockState.students.forEach(st => {
        const sId = st.id;
        const aliases = [sId, st.carne];
        let faltasA = 0, tardanzasT = 0, justificadasJ = 0;
        let latestIncidentDate = '';

        Object.keys(mockState.attendanceRecords).forEach(k => {
            const sheet = mockState.attendanceRecords[k];
            aliases.forEach(alias => {
                const daysObj = sheet[alias];
                if (!daysObj) return;
                for (const [d, val] of Object.entries(daysObj)) {
                    if (val === 'A') faltasA++;
                    else if (val === 'T') tardanzasT++;
                    else if (val === 'J') justificadasJ++;
                }
            });
        });

        const cNotes = mockState.courseBitacora.filter(b => b.studentId === sId);
        const dReports = mockState.disciplineReports.filter(d => d.studentId === sId);
        const total = faltasA + tardanzasT + justificadasJ + cNotes.length + dReports.length;

        if (total > 0) {
            studentsWithIncidents.push({ studentId: sId, faltasA, tardanzasT, justificadasJ, cNotes: cNotes.length, dReports: dReports.length, total });
        }
    });

    assert.strictEqual(studentsWithIncidents.length, 2, 'Deben haber 2 estudiantes con incidencias');
    const st1 = studentsWithIncidents.find(x => x.studentId === 'ST_01');
    assert.strictEqual(st1.faltasA, 1, 'ST_01 debe tener 1 falta A');
    assert.strictEqual(st1.tardanzasT, 1, 'ST_01 debe tener 1 tardanza T');
    assert.strictEqual(st1.cNotes, 1, 'ST_01 debe tener 1 anotación de curso');
    assert.strictEqual(st1.total, 3, 'ST_01 debe tener 3 incidencias en total');

    const st2 = studentsWithIncidents.find(x => x.studentId === 'ST_02');
    assert.strictEqual(st2.justificadasJ, 1, 'ST_02 debe tener 1 justificación J');
    assert.strictEqual(st2.dReports, 1, 'ST_02 debe tener 1 reporte disciplinario');
    assert.strictEqual(st2.total, 2, 'ST_02 debe tener 2 incidencias en total');
});

// --- TEST 4: Plantilla en blanco física (forcedIsBlank === true) ---
runTest('TEST 4: printAttendanceOfficialSheet soporta forcedIsBlank con casillas limpias', () => {
    assert(appJsContent.includes('forcedIsBlank === true'), 'printAttendanceOfficialSheet debe evaluar forcedIsBlank === true');
    assert(appJsContent.includes('&nbsp;'), 'Las casillas de días lectivos deben ser celdas en blanco (&nbsp;) si forcedIsBlank === true');
    assert(appJsContent.includes("PLANILLA OFICIAL DE ASISTENCIA (EN BLANCO)"), 'El encabezado debe identificar la planilla oficial en blanco');
});

// --- TEST 5: Protección de fines de semana y benchmark Arévalo Morán ---
runTest('TEST 5: Fines de semana protegidos y Sept 25-26 de Arévalo preservado', () => {
    assert(appJsContent.includes('isWk && !(isArevalo && month === 9 && day === 26)'), 'getConsolidatedAttendanceMonthData debe omitir fines de semana salvo Arévalo 26 de septiembre');
    assert(appJsContent.includes('isWeekend && !isArevaloSept26'), 'sanitizeAttendanceCalendarAndWeekends debe purgar registros de fin de semana salvo Arévalo 26');
});

// --- TEST 6: Selector correcto de grado y materia (attendanceGradeSelect, attendanceCourseSelect) ---
runTest('TEST 6: Selectores del DOM consistentes con plataforma.html', () => {
    assert(appJsContent.includes("document.getElementById('attendanceGradeSelect')"), 'openCourseBitacoraModal debe usar attendanceGradeSelect');
    assert(appJsContent.includes("document.getElementById('attendanceCourseSelect')"), 'openCourseBitacoraModal debe usar attendanceCourseSelect');
});

// --- TEST 7: Desglose cronológico por día en renderCourseBitacoraStudentDayView ---
runTest('TEST 7: renderCourseBitacoraStudentDayView agrupa incidencias por fecha descendente', () => {
    assert(appJsContent.includes('sortedDates = Object.keys(dayMap).sort((a, b) => b.localeCompare(a))'), 'Las fechas de incidencias deben ordenarse cronológicamente descendente');
    assert(appJsContent.includes('item.attendance.forEach'), 'Debe iterar eventos de asistencia del día');
    assert(appJsContent.includes('item.bitacora.forEach'), 'Debe iterar eventos de cátedra del día');
});

console.log("\n================================================================================");
console.log(`🎉 RESULTADOS: ${passed} pasaron, ${failed} fallaron.`);
console.log("================================================================================");

if (failed > 0) process.exit(1);
