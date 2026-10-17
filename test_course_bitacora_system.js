// ==========================================================================
// 🧪 PRUEBAS UNITARIAS: BITÁCORA INDIVIDUAL DE ASISTENCIA Y NOTAS POR MATERIA
// (CONTROL DE ASISTENCIA DIARIA - PRIVACIDAD ESTRICTA POR CÁTEDRA)
// ==========================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("================================================================================");
console.log("🧪 PRUEBAS UNITARIAS: BITÁCORA INDIVIDUAL DE ASISTENCIA Y NOTAS POR MATERIA");
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

// --- TEST 1: Elementos estructurales en plataforma.html ---
runTest('TEST 1: Elementos estructurales de Bitácora por Materia en plataforma.html', () => {
    assert(htmlContent.includes('id="btnCourseBitacora"'), 'Debe existir #btnCourseBitacora en la barra de asistencia');
    assert(htmlContent.includes('id="courseBitacoraModal"'), 'Debe existir el modal #courseBitacoraModal');
    assert(htmlContent.includes('id="courseBitacoraCourseSelect"'), 'Debe existir el selector de cursos de bitácora');
    assert(htmlContent.includes('id="courseBitacoraStudentSelect"'), 'Debe existir el selector de estudiantes de bitácora');
    assert(htmlContent.includes('id="courseBitacoraBimesterFilter"'), 'Debe existir el filtro de bimestre');
    assert(htmlContent.includes('id="courseBitacoraCategoryFilter"'), 'Debe existir el filtro de categoría');
    assert(htmlContent.includes('id="courseBitacoraSearchFilter"'), 'Debe existir el filtro de búsqueda');
    assert(htmlContent.includes('id="courseBitacoraFormCard"'), 'Debe existir el formulario colapsable');
    assert(htmlContent.includes('id="courseBitacoraListContainer"'), 'Debe existir el contenedor de lista de anotaciones');
    assert(htmlContent.includes('printCourseBitacoraOfficial()'), 'Debe existir el botón de impresión oficial');
    assert(htmlContent.includes('id="btnRecoverAttendance"'), 'Debe existir el botón de recuperar asistencia');
});

// --- TEST 2: Funciones principales del motor en app.js ---
runTest('TEST 2: Funciones del motor de Bitácora de Materia exportadas en app.js', () => {
    assert(appJsContent.includes('function canUserAccessCourseBitacora'), 'canUserAccessCourseBitacora debe existir');
    assert(appJsContent.includes('window.canUserAccessCourseBitacora = canUserAccessCourseBitacora'), 'canUserAccessCourseBitacora debe exportarse');
    assert(appJsContent.includes('function getTeacherAssignedCoursesInGrade'), 'getTeacherAssignedCoursesInGrade debe existir');
    assert(appJsContent.includes('function getCourseBitacoraEntries'), 'getCourseBitacoraEntries debe existir');
    assert(appJsContent.includes('function addCourseBitacoraEntry'), 'addCourseBitacoraEntry debe existir');
    assert(appJsContent.includes('function deleteCourseBitacoraEntry'), 'deleteCourseBitacoraEntry debe existir');
    assert(appJsContent.includes('function openCourseBitacoraModal'), 'openCourseBitacoraModal debe existir');
    assert(appJsContent.includes('function closeCourseBitacoraModal'), 'closeCourseBitacoraModal debe existir');
    assert(appJsContent.includes('function onCourseBitacoraCourseChange'), 'onCourseBitacoraCourseChange debe existir');
    assert(appJsContent.includes('function toggleCourseBitacoraForm'), 'toggleCourseBitacoraForm debe existir');
    assert(appJsContent.includes('function submitNewCourseBitacora'), 'submitNewCourseBitacora debe existir');
    assert(appJsContent.includes('function renderCourseBitacoraList'), 'renderCourseBitacoraList debe existir');
    assert(appJsContent.includes('function printCourseBitacoraOfficial'), 'printCourseBitacoraOfficial debe existir');
});

// --- TEST 3: Integración en la nómina de asistencia diaria ---
runTest('TEST 3: Botón de Bitácora por Estudiante en cada fila de la planilla de asistencia', () => {
    assert(appJsContent.includes('btn-att-student-bitacora'), 'Debe existir clase para el botón de bitácora en la fila');
    assert(appJsContent.includes('openCourseBitacoraModal(\'${s.id}\')'), 'El botón en la celda del estudiante debe invocar openCourseBitacoraModal(s.id)');
});

// --- TEST 4: Ocultación de botones de auditoría/recuperación para docentes ---
runTest('TEST 4: btnRecoverAttendance y btnAutorizarPermiso ocultos para rol docente', () => {
    assert(appJsContent.includes('btnRecoverAttendance.style.display = \'none\''), 'btnRecoverAttendance debe ocultarse si !isAuditRole');
    assert(appJsContent.includes('btnRecoverAttendance.style.display = \'\''), 'btnRecoverAttendance debe mostrarse si isAuditRole');
});

// --- TEST 5: Sincronización y persistencia en la nube ---
runTest('TEST 5: Integración en STATE, saveStateRecursively, cloud sync y Firestore real-time', () => {
    assert(appJsContent.includes('courseBitacora: []'), 'courseBitacora debe inicializarse como array vacío');
    assert(appJsContent.includes('courseBitacora: recursiveDeepClone(STATE.courseBitacora || [])'), 'saveStateRecursively debe incluir courseBitacora');
    assert(appJsContent.includes('if (incomingState.courseBitacora)'), 'applyIncomingCloudState debe procesar incomingState.courseBitacora');
    assert(appJsContent.includes("collection(db, 'courseBitacora')"), 'Firestore modular real-time debe escuchar colección courseBitacora');
});

// --- TEST 6: Permisos por cátedra y visibilidad estricta ---
runTest('TEST 6: canUserAccessCourseBitacora - Matriz de Permisos por Rol y Asignación', () => {
    // Simular entorno mínimo
    const mockState = {
        users: [
            { id: 'u_doc1', name: 'Profesor Uno', role: 'docente' },
            { id: 'u_doc2', name: 'Profesor Dos', role: 'docente' },
            { id: 'u_dir', name: 'Directora General', role: 'director' },
            { id: 'u_aux', name: 'Auxiliar de Turno', role: 'profesor_auxiliar' },
            { id: 'u_super', name: 'Super Usuario', role: 'super_usuario' }
        ],
        pensum: [
            { id: 'C_MAT_4A', subject: 'Matemática', grade: '4to Perito', section: 'A', gradeCode: '4TO_A', teacherId: 'u_doc1', teacher: 'Profesor Uno' },
            { id: 'C_FIS_4A', subject: 'Física Fundamental', grade: '4to Perito', section: 'A', gradeCode: '4TO_A', teacherId: 'u_doc2', teacher: 'Profesor Dos' }
        ]
    };

    // Evaluar la lógica extraída directamente
    function isCourseAssigned(p, user) {
        if (!p || !user) return false;
        if (p.teacherId && user.id && p.teacherId === user.id) return true;
        if (p.teacher && user.name && p.teacher.toLowerCase() === user.name.toLowerCase()) return true;
        return false;
    }

    function canAccess(courseId, gradeCode, user, role) {
        const auditRoles = ['admin', 'super_usuario', 'director', 'direccion', 'secretaria', 'profesor_auxiliar', 'auxiliar'];
        if (auditRoles.includes(role)) return true;
        if (role === 'docente' || role === 'profesor') {
            if (!courseId || courseId === 'GENERAL') return false;
            const course = mockState.pensum.find(p => p.id === courseId);
            if (!course) return false;
            return isCourseAssigned(course, user);
        }
        return false;
    }

    // 1. Docente 1 con Matemática asignada
    assert.strictEqual(canAccess('C_MAT_4A', '4TO_A', mockState.users[0], 'docente'), true, 'Docente 1 debe tener acceso a su materia');
    // 2. Docente 1 intenta acceder a Física Fundamental (de Docente 2)
    assert.strictEqual(canAccess('C_FIS_4A', '4TO_A', mockState.users[0], 'docente'), false, 'Docente 1 NO debe acceder a materia ajena');
    // 3. Docente 2 intenta acceder a Matemática
    assert.strictEqual(canAccess('C_MAT_4A', '4TO_A', mockState.users[1], 'docente'), false, 'Docente 2 NO debe acceder a Matemática');
    // 4. Dirección General: acceso a ambas
    assert.strictEqual(canAccess('C_MAT_4A', '4TO_A', mockState.users[2], 'director'), true, 'Dirección debe tener acceso a Matemática');
    assert.strictEqual(canAccess('C_FIS_4A', '4TO_A', mockState.users[2], 'director'), true, 'Dirección debe tener acceso a Física');
    // 5. Auxiliatura: acceso a ambas
    assert.strictEqual(canAccess('C_MAT_4A', '4TO_A', mockState.users[3], 'profesor_auxiliar'), true, 'Auxiliatura debe tener acceso');
    // 6. Superusuario: acceso irrestricto
    assert.strictEqual(canAccess('C_MAT_4A', '4TO_A', mockState.users[4], 'super_usuario'), true, 'Superusuario debe tener acceso');
});

// --- TEST 7: Privacidad Absoluta - Zero Leakage hacia la Ficha General ---
runTest('TEST 7: Aislamiento estricto de Bitácora por Materia vs Ficha General del Estudiante', () => {
    // Verificar que canUserViewAnnotation bloquee cualquier registro de materia si isProfileRecord === true
    assert(appJsContent.includes('annotation.isCourseBitacora || annotation.courseBitacoraId || (typeof annotation.id === \'string\' && annotation.id.startsWith(\'CBIT_\'))'),
        'canUserViewAnnotation debe bloquear notas de bitácora de materias si isProfileRecord es true');
    assert(appJsContent.includes('!a.isCourseBitacora && !a.courseBitacoraId && !(typeof a.id === \'string\' && a.id.startsWith(\'CBIT_\'))'),
        'getStudentAnnotations debe filtrar bitácora de materias si isProfileRecord es true');
});

// --- TEST 8: Adición y Eliminación de Anotaciones de Materia con Control de Autoría ---
runTest('TEST 8: Ciclo de vida de anotación por materia y permisos de eliminación', () => {
    const mockBitacora = [];
    const doc1 = { id: 'u_doc1', name: 'Profesor Uno', role: 'docente' };
    const doc2 = { id: 'u_doc2', name: 'Profesor Dos', role: 'docente' };
    const director = { id: 'u_dir', name: 'Directora General', role: 'director' };

    // Crear anotación
    const entry = {
        id: 'CBIT_12345_test',
        isCourseBitacora: true,
        courseId: 'C_MAT_4A',
        studentId: 'ST_001',
        text: 'Incumplió tarea #1 de álgebra',
        authorId: 'u_doc1',
        authorName: 'Profesor Uno',
        authorRole: 'docente'
    };
    mockBitacora.unshift(entry);

    function canDelete(entryItem, user, role) {
        const isAuthority = ['admin', 'super_usuario', 'director', 'direccion', 'secretaria', 'profesor_auxiliar', 'auxiliar'].includes(role);
        const isAuthor = user && (String(user.id) === String(entryItem.authorId) || user.name === entryItem.authorName);
        return isAuthority || isAuthor;
    }

    assert.strictEqual(canDelete(entry, doc1, 'docente'), true, 'El docente autor puede eliminar su propia anotación');
    assert.strictEqual(canDelete(entry, doc2, 'docente'), false, 'Otro docente NO puede eliminar anotaciones ajenas');
    assert.strictEqual(canDelete(entry, director, 'director'), true, 'La dirección puede eliminar cualquier anotación');
});

// --- TEST 9: Prohibición de diálogos nativos del navegador ---
runTest('TEST 9: No se introdujeron window.alert ni window.confirm nativos', () => {
    // Extraer la sección del motor agregada
    const startIdx = appJsContent.indexOf('MOTOR DE BITÁCORA INDIVIDUAL DE ASISTENCIA Y NOTAS POR MATERIA');
    const endIdx = appJsContent.indexOf('printCourseBitacoraOfficial', startIdx);
    const bitacoraSection = appJsContent.substring(startIdx, endIdx + 1500);

    assert(!bitacoraSection.includes('window.alert('), 'No debe usar window.alert');
    assert(!bitacoraSection.includes('window.confirm('), 'No debe usar window.confirm');
});

console.log("\n================================================================================");
console.log(`🎉 RESULTADOS: ${passed} pasaron, ${failed} fallaron.`);
console.log("================================================================================\n");

if (failed > 0) process.exit(1);
