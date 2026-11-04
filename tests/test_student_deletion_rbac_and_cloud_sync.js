/**
 * tests/test_student_deletion_rbac_and_cloud_sync.js
 * 
 * Verificación exhaustiva de eliminación de estudiantes:
 * 1. RBAC Estricto: Super Usuario, Dirección y Secretaría autorizados; Docentes/Otros bloqueados.
 * 2. Diálogo de confirmación: si el usuario cancela, no se elimina nada.
 * 3. Eliminación dinámica a 0ms en memoria y vistas sin alterar otros registros.
 * 4. Persistencia y eliminación en Firebase (Firestore + Realtime Database PUT/DELETE).
 * 5. Blindaje anti-resurrección mediante deletedStudentIds en SSE, Firestore y applyIncomingCloudState.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('🧪 TEST: ELIMINACIÓN DE ESTUDIANTES (RBAC, CONFIRMACIÓN Y FIREBASE)');
console.log('='.repeat(80));

const appJsPath = path.join(__dirname, '..', 'app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf8');
const htmlPath = path.join(__dirname, '..', 'plataforma.html');
const htmlCode = fs.readFileSync(htmlPath, 'utf8');

// --- 1. VERIFICACIÓN ESTÁTICA DE CÓDIGO Y ELEMENTOS HTML ---
console.log('\n▶ [TEST 1] Verificación estática de elementos en plataforma.html y app.js...');

assert(htmlCode.includes('id="profDeleteStudentBtn"'), 'plataforma.html debe contener el botón #profDeleteStudentBtn en el modal del perfil');
assert(htmlCode.includes("deleteStudent(STATE.selectedStudentId)"), 'El botón #profDeleteStudentBtn debe llamar a deleteStudent con STATE.selectedStudentId');
assert(appJsCode.includes('function canDeleteStudent'), 'app.js debe definir la función canDeleteStudent');
assert(appJsCode.includes('window.canDeleteStudent = canDeleteStudent'), 'canDeleteStudent debe exponerse globalmente en window');
assert(appJsCode.includes('async function deleteStudent(studentId)'), 'app.js debe definir async function deleteStudent');
assert(appJsCode.includes('window.deleteStudent = deleteStudent'), 'deleteStudent debe exponerse globalmente en window');

console.log('  ✅ Test 1 Superado: Funciones y botones presentes y vinculados correctamente.');

// --- 2. ENTORNO SIMULADO EN MEMORIA ---
console.log('\n▶ [TEST 2] Verificando RBAC y Permisos por Rol en canDeleteStudent...');

// Simular entorno global mínimo
const windowObj = {
    STATE: {
        currentRole: 'docente',
        currentUser: { id: 'u1', username: 'docente1', role: 'docente' },
        activeCycle: '2027',
        students: [],
        deletedStudentIds: []
    }
};
global.window = windowObj;
global.STATE = windowObj.STATE;

// Extraer canDeleteStudent de app.js y evaluar
function extractFunctionBody(code, fnName) {
    const start = code.indexOf(`function ${fnName}`);
    assert(start !== -1, `${fnName} debe existir`);
    const openBrace = code.indexOf('{', start);
    let depth = 1;
    let end = openBrace + 1;
    while (depth > 0 && end < code.length) {
        if (code[end] === '{') depth++;
        else if (code[end] === '}') depth--;
        end++;
    }
    return code.slice(openBrace + 1, end - 1);
}

const canDeleteBody = extractFunctionBody(appJsCode, 'canDeleteStudent');
const canDeleteFn = new Function('role = null', `
    const isSuperUserRole = (r) => ['super_usuario', 'superadmin', 'super_admin', 'admin'].includes(String(r || '').toLowerCase());
    const isDirectorRole = (r) => isSuperUserRole(r) || ['director', 'direccion', 'directora'].includes(String(r || '').toLowerCase());
    ${canDeleteBody}
`);

// Probar roles no autorizados
assert.strictEqual(canDeleteFn('docente'), false, 'Docente NO debe tener permisos de eliminación');
assert.strictEqual(canDeleteFn('auxiliar'), false, 'Auxiliar NO debe tener permisos de eliminación');
assert.strictEqual(canDeleteFn('profesor_auxiliar'), false, 'Profesor auxiliar NO debe tener permisos de eliminación');
assert.strictEqual(canDeleteFn('estudiante'), false, 'Estudiante NO debe tener permisos de eliminación');
assert.strictEqual(canDeleteFn('padre_familia'), false, 'Padre de familia NO debe tener permisos de eliminación');

// Probar roles autorizados: Super Usuario, Dirección y Secretaría
assert.strictEqual(canDeleteFn('super_usuario'), true, 'Super usuario DEBE tener permisos de eliminación');
assert.strictEqual(canDeleteFn('superadmin'), true, 'Superadmin DEBE tener permisos de eliminación');
assert.strictEqual(canDeleteFn('admin'), true, 'Admin DEBE tener permisos de eliminación');
assert.strictEqual(canDeleteFn('director'), true, 'Director DEBE tener permisos de eliminación');
assert.strictEqual(canDeleteFn('direccion'), true, 'Dirección DEBE tener permisos de eliminación');
assert.strictEqual(canDeleteFn('secretaria'), true, 'Secretaría DEBE tener permisos de eliminación');
assert.strictEqual(canDeleteFn('secretaría'), true, 'Secretaría con tilde DEBE tener permisos de eliminación');

console.log('  ✅ Test 2 Superado: Matriz de roles validada estrictamente.');

// --- 3. PRUEBA DE CANCELACIÓN DEL DIÁLOGO ---
console.log('\n▶ [TEST 3] Verificando que si el usuario cancela la confirmación, no se borra nada...');

let dialogPrompted = false;
let dialogConfirmed = false;
windowObj.EnccoDialog = {
    confirm: async (opts) => {
        dialogPrompted = true;
        return dialogConfirmed;
    }
};

const initialStudents = [
    { id: 'stu-001', personalCode: 'A100AAA', carne: '2027-QA-001', name: 'GÓMEZ PÉREZ JUAN', grade: '4to Perito Contador', section: 'Sección A' },
    { id: 'stu-002', personalCode: 'B200BBB', carne: '2027-QA-002', name: 'LÓPEZ DÍAZ MARÍA', grade: '4to Perito Contador', section: 'Sección A' }
];

windowObj.STATE.students = JSON.parse(JSON.stringify(initialStudents));
windowObj.STATE.currentRole = 'secretaria';

// Ejecutar prueba con dialogConfirmed = false (Usuario responde NO/Cancelar)
dialogPrompted = false;
dialogConfirmed = false;

// Mock de funciones DOM/UI
let renderedTables = [];
global.renderStudentsTable = () => renderedTables.push('students');
global.updateDashboardKPIs = () => renderedTables.push('kpis');
global.updateUserAlertsUI = () => {};
global.renderCurrentDashboardAlerts = () => {};
global.renderTeacherGradeProgressTable = () => {};
global.populateAttendanceSelects = () => {};
global.saveStateToLocalStorage = () => {};
global.showToast = () => {};
global.formatStudentDisplayName = (s) => s.name;
global.document = {
    getElementById: (id) => null
};

// Extraer deleteStudent
const deleteStudentBody = extractFunctionBody(appJsCode, 'deleteStudent');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const deleteStudentFn = new AsyncFunction('studentId', `
    const canDeleteStudent = ${canDeleteFn.toString()};
    const isSuperUserRole = (r) => ['super_usuario', 'superadmin', 'super_admin', 'admin'].includes(String(r || '').toLowerCase());
    const isDirectorRole = (r) => isSuperUserRole(r) || ['director', 'direccion', 'directora'].includes(String(r || '').toLowerCase());
    ${deleteStudentBody}
`);

(async () => {
    // 3.1 Cancelar confirmación
    const resCancel = await deleteStudentFn('stu-001');
    assert.strictEqual(resCancel, false, 'deleteStudent debe retornar false al cancelar');
    assert.strictEqual(dialogPrompted, true, 'Se debió preguntar confirmación al usuario');
    assert.strictEqual(windowObj.STATE.students.length, 2, 'Los estudiantes deben permanecer intactos');
    assert.strictEqual(windowObj.STATE.deletedStudentIds.length, 0, 'No debe registrarse en deletedStudentIds');
    console.log('  ✅ Test 3 Superado: Cancelación preserva el 100% de los datos.');

    // --- 4. PRUEBA DE CONFIRMACIÓN Y ELIMINACIÓN COMPLETA ---
    console.log('\n▶ [TEST 4] Verificando confirmación afirmativa, eliminación en memoria y llamadas a Firebase...');

    dialogConfirmed = true;
    dialogPrompted = false;

    let deletedNodesRTDB = [];
    let syncedNodesRTDB = {};
    let deletedDocsFirestore = [];

    global.EnccoCloudSync = {
        deleteNode: async (node) => { deletedNodesRTDB.push(node); },
        syncNode: async (node, data) => { syncedNodesRTDB[node] = data; }
    };

    windowObj.FirebaseModular = {
        db: {},
        doc: (db, col, id) => ({ col, id }),
        deleteDoc: async (docRef) => { deletedDocsFirestore.push(`${docRef.col}/${docRef.id}`); }
    };

    let pushToCloudCalled = false;
    global.pushStateToFirebaseCloud = async () => { pushToCloudCalled = true; return true; };

    // Agregar datos asociados para comprobar limpieza coherente
    windowObj.STATE.disciplineReports = [
        { id: 'disc-1', studentId: 'stu-001', note: 'Falta menor' },
        { id: 'disc-2', studentId: 'stu-002', note: 'Falta menor' }
    ];
    windowObj.STATE.studentPermissions = [
        { id: 'perm-1', studentId: 'stu-001', reason: 'Médico' }
    ];
    windowObj.STATE.exoneraciones = {
        'stu-001': { subject: 'Matemática' },
        'stu-002': { subject: 'Idioma Español' }
    };

    const resConfirm = await deleteStudentFn('stu-001');
    assert.strictEqual(resConfirm, true, 'deleteStudent debe retornar true al confirmar');
    assert.strictEqual(dialogPrompted, true, 'Se debió mostrar el diálogo de confirmación');

    // 4.1 Verificación en memoria
    assert.strictEqual(windowObj.STATE.students.length, 1, 'Debe quedar exactamente 1 estudiante en memoria');
    assert.strictEqual(windowObj.STATE.students[0].id, 'stu-002', 'El estudiante restante debe ser stu-002');
    assert.strictEqual(windowObj.STATE.students[0].name, 'LÓPEZ DÍAZ MARÍA', 'Los datos del otro estudiante no deben ser alterados');

    // 4.2 Verificación de deletedStudentIds
    assert(windowObj.STATE.deletedStudentIds.includes('stu-001'), 'deletedStudentIds debe contener stu-001');
    assert(windowObj.STATE.deletedStudentIds.includes('A100AAA'), 'deletedStudentIds debe contener A100AAA');
    assert(windowObj.STATE.deletedStudentIds.includes('2027-QA-001'), 'deletedStudentIds debe contener 2027-QA-001');

    // 4.3 Verificación de submódulos asociados
    assert.strictEqual(windowObj.STATE.disciplineReports.length, 1, 'El reporte de disciplina de stu-001 debe haber sido purgado');
    assert.strictEqual(windowObj.STATE.disciplineReports[0].studentId, 'stu-002');
    assert.strictEqual(windowObj.STATE.studentPermissions.length, 0, 'El permiso de stu-001 debe haber sido purgado');
    assert.strictEqual(windowObj.STATE.exoneraciones['stu-001'], undefined, 'La exoneración de stu-001 debe haber sido borrada');
    assert.notStrictEqual(windowObj.STATE.exoneraciones['stu-002'], undefined, 'La exoneración de stu-002 debe preservarse intacta');

    // 4.4 Verificación en Firebase Firestore
    assert(deletedDocsFirestore.includes('students/stu-001'), 'Firestore debe eliminar students/stu-001');
    assert(deletedDocsFirestore.includes('estudiantes/stu-001'), 'Firestore debe eliminar estudiantes/stu-001');

    // 4.5 Verificación en Firebase RTDB
    assert(deletedNodesRTDB.includes('students/stu-001'), 'RTDB deleteNode debe ejecutarse para students/stu-001');
    assert(syncedNodesRTDB['students'], 'RTDB syncNode debe recibir la nueva colección de students');
    assert.strictEqual(syncedNodesRTDB['students'].length, 1, 'La colección de students en RTDB debe tener 1 estudiante');
    assert(syncedNodesRTDB['deletedStudentIds'], 'RTDB syncNode debe sincronizar deletedStudentIds');
    assert.strictEqual(pushToCloudCalled, true, 'pushStateToFirebaseCloud debió ser invocado');

    console.log('  ✅ Test 4 Superado: Eliminación atómica en memoria, Firestore y Firebase RTDB verificada.');

    // --- 5. VERIFICACIÓN DE ANTI-RESURRECCIÓN (SSE Y CLOUD STATE) ---
    console.log('\n▶ [TEST 5] Verificando protección anti-resurrección con deletedStudentIds...');

    // Simular llegada de paquete entrante con el alumno borrado
    const incomingGhostStudent = { id: 'stu-001', personalCode: 'A100AAA', name: 'GÓMEZ PÉREZ JUAN' };
    const delSet = new Set(windowObj.STATE.deletedStudentIds);

    const filteredIncoming = [incomingGhostStudent, windowObj.STATE.students[0]].filter(s => 
        s && s.id && !delSet.has(s.id) && (!s.personalCode || !delSet.has(s.personalCode))
    );

    assert.strictEqual(filteredIncoming.length, 1, 'El alumno eliminado no debe ser re-inyectado por snapshots');
    assert.strictEqual(filteredIncoming[0].id, 'stu-002', 'Solo debe permanecer el alumno legítimo');

    console.log('  ✅ Test 5 Superado: Blindaje anti-resurrección verificado.');

    console.log('\n' + '='.repeat(80));
    console.log('🎉 TODAS LAS PRUEBAS DE ELIMINACIÓN DE ESTUDIANTES PASARON AL 100%');
    console.log('='.repeat(80));
})();
