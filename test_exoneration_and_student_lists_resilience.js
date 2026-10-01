// =============================================================================
// PRUEBAS DE RESILIENCIA Y BLINDAJE ATÓMICO: EXONERACIONES Y LISTAS DE ESTUDIANTES
// =============================================================================
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("================================================================================");
console.log("🧪 INICIANDO TEST: RESILIENCIA DE LISTAS Y EXONERACIONES ATÓMICAS");
console.log("================================================================================");

const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// -----------------------------------------------------------------------------
// TEST 1: Verificar deduplicateStudentsCollection con entrada tipo Objeto y Array
// -----------------------------------------------------------------------------
console.log("\n▶ [TEST 1] Verificando que deduplicateStudentsCollection tolere Objetos de Firebase...");
const testObjInput = {
    "0": { id: "st-01", name: "Estudiante Uno", grade: "4to Perito Contador", section: "A", status: "Activo" },
    "1": { id: "st-02", name: "Estudiante Dos", grade: "4to Perito Contador", section: "A", status: "Activo" }
};
const testArrInput = [
    { id: "st-01", name: "Estudiante Uno", grade: "4to Perito Contador", section: "A", status: "Activo" },
    { id: "st-02", name: "Estudiante Dos", grade: "4to Perito Contador", section: "A", status: "Activo" }
];

// Extraer deduplicateStudentsCollection de app.js o evaluarla
const deduplicateMatch = appJsContent.match(/function deduplicateStudentsCollection\s*\([\s\S]*?^}/m);
assert(deduplicateMatch, "deduplicateStudentsCollection debe existir en app.js");

const evalDeduplicate = new Function(`
    ${deduplicateMatch[0]}
    return deduplicateStudentsCollection;
`)();

const resFromObj = evalDeduplicate(testObjInput);
assert(Array.isArray(resFromObj), "El resultado de deduplicateStudentsCollection con objeto debe ser un Array");
assert.strictEqual(resFromObj.length, 2, "Debe contener 2 estudiantes extraídos del objeto");

const resFromArr = evalDeduplicate(testArrInput);
assert(Array.isArray(resFromArr), "El resultado de deduplicateStudentsCollection con array debe ser un Array");
assert.strictEqual(resFromArr.length, 2, "Debe contener 2 estudiantes");
console.log("  ✅ Test 1 Superado: deduplicateStudentsCollection recupera nóminas aun si Firebase las serializa como Objeto.");

// -----------------------------------------------------------------------------
// TEST 2: Verificar que el listener SSE de RTDB maneje 'students' como Objeto
// -----------------------------------------------------------------------------
console.log("\n▶ [TEST 2] Verificando protección del listener RTDB para 'students'...");
assert(appJsContent.includes("Object.values(nodeData)"), "El listener de students debe soportar Object.values(nodeData)");
assert(appJsContent.includes("typeof loadAttendanceList === 'function'"), "El listener de students debe invocar loadAttendanceList");
assert(appJsContent.includes("typeof renderExoneracionesLogView === 'function'"), "El listener de students debe invocar renderExoneracionesLogView");
console.log("  ✅ Test 2 Superado: El listener SSE de RTDB normaliza objetos a arrays y sincroniza asistencia y exoneraciones.");

// -----------------------------------------------------------------------------
// TEST 3: Simular guardado y borrado de exoneración sin corromper el status del alumno
// -----------------------------------------------------------------------------
console.log("\n▶ [TEST 3] Verificando guardado y eliminación de exoneración con identidad protegida...");

// Simular entorno global básico para ejecutar saveAcademicExoneration
const mockStudent = {
    id: "stu-sire-123",
    name: "JUAN PEREZ",
    personalCode: "E195FVT",
    carne: "2026-001",
    grade: "4to Perito Contador",
    section: "A",
    status: "Activo",
    statusSire: "INSCRITO",
    active: true,
    academicExceptions: [],
    exoneraciones: []
};

const mockSTATE = {
    students: [mockStudent],
    exoneraciones: {},
    currentUser: { role: 'secretaria', name: 'Secretaria ENCCO' },
    lastModified: 0,
    currentAcademicFilter: { grade: '4to Perito Contador', section: 'A' }
};

let renderStudentsTableCalled = false;
let loadAttendanceListCalled = false;
let renderExoneracionesLogViewCalled = false;
let saveStateCalled = false;
let patchNodeCalls = [];

global.window = {
    STATE: mockSTATE,
    currentRole: 'secretaria',
    currentUser: { role: 'secretaria', name: 'Secretaria ENCCO' }
};

const mockEnv = {
    STATE: mockSTATE,
    saveStateToLocalStorage: () => { saveStateCalled = true; },
    renderAcademicExonerationsList: () => {},
    renderStudentProfileGrades: () => {},
    loadHonorRoll: () => {},
    loadTeacherGradebook: () => {},
    renderStudentsTable: () => { renderStudentsTableCalled = true; },
    renderExoneracionesLogView: () => { renderExoneracionesLogViewCalled = true; },
    loadAttendanceList: () => { loadAttendanceListCalled = true; },
    renderDashboard: () => {},
    showToast: () => {},
    EnccoCloudSync: {
        patchNode: (path, data) => {
            patchNodeCalls.push({ path, data });
            return Promise.resolve();
        }
    },
    document: {
        getElementById: () => null
    },
    withTimeout: (prom) => prom
};

// Simular saveAcademicExoneration
const saveExFnMatch = appJsContent.match(/async function saveAcademicExoneration\s*\([\s\S]*?^}/m);
assert(saveExFnMatch, "saveAcademicExoneration debe existir en app.js");

// Extraer y probar deleteAcademicExoneration también
const deleteExFnMatch = appJsContent.match(/async function deleteAcademicExoneration\s*\([\s\S]*?^}/m);
assert(deleteExFnMatch, "deleteAcademicExoneration debe existir en app.js");

const testContext = `
    const STATE = mockEnv.STATE;
    const saveStateToLocalStorage = mockEnv.saveStateToLocalStorage;
    const renderAcademicExonerationsList = mockEnv.renderAcademicExonerationsList;
    const renderStudentProfileGrades = mockEnv.renderStudentProfileGrades;
    const loadHonorRoll = mockEnv.loadHonorRoll;
    const loadTeacherGradebook = mockEnv.loadTeacherGradebook;
    const renderStudentsTable = mockEnv.renderStudentsTable;
    const renderExoneracionesLogView = mockEnv.renderExoneracionesLogView;
    const loadAttendanceList = mockEnv.loadAttendanceList;
    const renderDashboard = mockEnv.renderDashboard;
    const showToast = mockEnv.showToast;
    const EnccoCloudSync = mockEnv.EnccoCloudSync;
    const document = mockEnv.document;
    const withTimeout = mockEnv.withTimeout;

    ${saveExFnMatch[0]}
    ${deleteExFnMatch[0]}

    return { saveAcademicExoneration, deleteAcademicExoneration };
`;

const runner = new Function('mockEnv', testContext)(mockEnv);

(async () => {
    // 1. Guardar vía payload directo (como envía ui.js o formularios programáticos)
    await runner.saveAcademicExoneration({
        studentId: "stu-sire-123",
        subject: "Contabilidad General",
        bimestre: "1",
        type: "Exonerado",
        reason: "Certamen Nacional de Contabilidad"
    });

    assert.strictEqual(mockStudent.academicExceptions.length, 1, "Debe tener 1 excepción académica");
    assert.strictEqual(mockStudent.exoneraciones.length, 1, "Debe tener 1 exoneración en espejo");
    assert.strictEqual(mockStudent.status, "Activo", "El estado del estudiante no debe cambiar de Activo");
    assert.strictEqual(mockStudent.active, true, "El flag active debe ser true");
    assert(renderStudentsTableCalled, "renderStudentsTable debió llamarse");
    assert(loadAttendanceListCalled, "loadAttendanceList debió llamarse");
    assert(renderExoneracionesLogViewCalled, "renderExoneracionesLogView debió llamarse");

    // Verificar que nunca se hizo patchNode a "students/<string_id>"
    const corruptingPatch = patchNodeCalls.find(p => p.path === `students/${mockStudent.id}`);
    assert(!corruptingPatch, "NO debe hacerse patchNode a students/<id> para no desestructurar el array en Firebase");

    const indexPatch = patchNodeCalls.find(p => p.path === "students/0");
    assert(indexPatch, "Debe hacerse patchNode usando el índice entero del estudiante en el array");

    const exoneracionPatch = patchNodeCalls.find(p => p.path.startsWith("exoneraciones/"));
    assert(exoneracionPatch, "Debe persistirse en el nodo dedicado 'exoneraciones/'");

    console.log("  ✅ Test 3 Superado: Exoneración guardada atómicamente sin alterar 'Activo' ni corromper RTDB.");

    // -----------------------------------------------------------------------------
    // TEST 4: Probar borrado de exoneración
    // -----------------------------------------------------------------------------
    console.log("\n▶ [TEST 4] Verificando eliminación de exoneración y refresco de interfaz...");
    renderStudentsTableCalled = false;
    loadAttendanceListCalled = false;

    await runner.deleteAcademicExoneration("stu-sire-123", 0);

    assert.strictEqual(mockStudent.academicExceptions.length, 0, "academicExceptions debe estar vacío");
    assert.strictEqual(mockStudent.exoneraciones.length, 0, "exoneraciones debe estar vacío");
    assert.strictEqual(mockStudent.status, "Activo", "El estudiante sigue Activo");
    assert(renderStudentsTableCalled, "renderStudentsTable debió refrescarse al eliminar");
    assert(loadAttendanceListCalled, "loadAttendanceList debió refrescarse al eliminar");
    console.log("  ✅ Test 4 Superado: Eliminación atómica verificada con refresco total de interfaces.");

    // -----------------------------------------------------------------------------
    // TEST 5: Verificación del modelo de ponderación (40% Zona / 60% Evaluación)
    // -----------------------------------------------------------------------------
    console.log("\n▶ [TEST 5] Verificando inmutabilidad del modelo de ponderación (40% Zona / 60% Evaluación)...");
    assert(appJsContent.includes("zonaMax: 40"), "La zona institucional debe ser de 40 puntos");
    assert(appJsContent.includes("examMax: 60"), "La evaluación institucional debe ser de 60 puntos");
    assert(!appJsContent.includes("zonaMax: 70"), "No deben existir ponderaciones antiguas de 70");
    assert(!appJsContent.includes("examMax: 30"), "No deben existir ponderaciones antiguas de 30");
    console.log("  ✅ Test 5 Superado: Modelo oficial 40% Zona / 60% Evaluación 100% íntegro.");

    console.log("\n================================================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE RESILIENCIA Y BLINDAJE DE LISTAS PASARON AL 100%");
    console.log("================================================================================");
})();
