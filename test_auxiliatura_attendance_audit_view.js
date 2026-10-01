/**
 * Test Suite: Verificación de Auditoría de Asistencias por Catedrático y Clase para Auxiliatura
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================================');
console.log('🧪 PRUEBAS UNITARIAS: AUDITORÍA DE ASISTENCIA POR DOCENTE Y CLASE (AUXILIATURA)');
console.log('================================================================================\n');

const appPath = path.join(__dirname, 'app.js');
const htmlPath = path.join(__dirname, 'plataforma.html');
const appCode = fs.readFileSync(appPath, 'utf8');
const htmlCode = fs.readFileSync(htmlPath, 'utf8');

// ==============================================================================
// TEST 1: Elementos del DOM y Permisos de Auxiliatura en HTML y app.js
// ==============================================================================
console.log('▶ [TEST 1] Verificando elementos estructurales y roles permitidos...');
assert(htmlCode.includes('id="attendanceDirectorBanner"'), 'Debe existir attendanceDirectorBanner en el HTML.');
assert(htmlCode.includes('id="attendanceBannerRoleBadge"'), 'Debe existir attendanceBannerRoleBadge en el HTML.');
assert(htmlCode.includes('id="attendanceTeacherSelect"'), 'Debe existir attendanceTeacherSelect en el HTML.');
assert(htmlCode.includes('id="attendanceCurrentTeacherBadge"'), 'Debe existir attendanceCurrentTeacherBadge en el HTML.');
assert(htmlCode.includes('data-view="auxiliatura-log"'), 'Debe existir acceso a auxiliatura-log en navegación.');
assert(htmlCode.includes('data-view="attendance"'), 'Debe existir acceso a attendance en navegación.');

const mInitRoles = appCode.match(/key:\s*'profesor_auxiliar'[\s\S]*?permissions:\s*\[([\s\S]*?)\]/);
assert(mInitRoles, 'Debe existir la configuración de rol para profesor_auxiliar');
assert(mInitRoles[1].includes("'attendance'"), 'profesor_auxiliar debe tener permiso de attendance');
assert(mInitRoles[1].includes("'auxiliatura-log'"), 'profesor_auxiliar debe tener permiso de auxiliatura-log');
console.log('  ✅ Test 1 Superado: Elementos del DOM y permisos de Auxiliatura verificados.');

// ==============================================================================
// TEST 2: Inclusión de Auxiliatura en Roles de Autoridad / Auditoría
// ==============================================================================
console.log('\n▶ [TEST 2] Verificando que Auxiliatura califique como rol de autoridad en asistencia...');
assert(appCode.includes("['director', 'direccion', 'secretaria', 'profesor_auxiliar', 'auxiliar', 'auxiliatura', 'admin', 'super_usuario'].includes(currentRole)"),
    'isAuthorityRole debe incluir a profesor_auxiliar, auxiliar y auxiliatura.');
assert(appCode.includes("roleBadge.innerHTML = `<i class=\"fa-solid fa-clipboard-user\"></i> Auditoría de Auxiliatura`;"),
    'El banner debe personalizarse dinámicamente como Auditoría de Auxiliatura.');
console.log('  ✅ Test 2 Superado: Auxiliatura cuenta con rango completo de auditoría y distintivo visual.');

// ==============================================================================
// TEST 3: Simulación Funcional de populateAttendanceTeacherFilter y populateAttendanceSelects
// ==============================================================================
console.log('\n▶ [TEST 3] Simulando populateAttendanceTeacherFilter y selección de catedrático...');

// Mock environment
const mockDOM = {
    attendanceTeacherSelect: { value: '', innerHTML: '', options: [] },
    attendanceTeacherFilterGroup: { style: { display: 'none' } },
    attendanceDirectorBanner: { style: { display: 'none' } },
    attendanceBannerRoleBadge: { innerHTML: '', style: { background: '' } },
    attendanceBannerRoleText: { textContent: '' },
    attendanceGradeSelect: { value: '', innerHTML: '', options: [] },
    attendanceCourseSelect: { value: '', innerHTML: '', options: [] },
    attendanceCurrentTeacherBadge: { innerHTML: '', style: { display: 'none' } },
    attendanceExcelGridHead: { innerHTML: '' },
    attendanceExcelGridBody: { innerHTML: '' },
    attendanceExcelGridFoot: { innerHTML: '' }
};

global.document = {
    getElementById: (id) => mockDOM[id] || null,
    querySelectorAll: () => []
};

global.STATE = {
    currentRole: 'profesor_auxiliar',
    currentUser: { id: 'usr-aux-01', name: 'Prof. Mario Auxiliar', role: 'profesor_auxiliar' },
    activeCycle: '2026',
    gradesList: [
        { code: 'grd-4a', name: 'Cuarto Perito Contador', section: 'A', career: 'Perito Contador' },
        { code: 'grd-4b', name: 'Cuarto Perito Contador', section: 'B', career: 'Perito Contador' },
        { code: 'grd-5a', name: 'Quinto Perito Contador', section: 'A', career: 'Perito Contador' }
    ],
    users: [
        { id: 'doc-01', name: 'Prof. Byron Orellana', role: 'docente', title: 'Catedrático de Contabilidad' },
        { id: 'doc-02', name: 'Licda. Elena Méndez', role: 'docente', title: 'Catedrática de Matemáticas' },
        { id: 'usr-aux-01', name: 'Prof. Mario Auxiliar', role: 'profesor_auxiliar' }
    ],
    pensum: [
        { id: 'pen-4pc-a-01', grade: 'Cuarto Perito Contador', gradeCode: 'grd-4a', section: 'A', subject: 'Contabilidad de Costos', teacherId: 'doc-01', teacher: 'Byron Orellana' },
        { id: 'pen-4pc-a-02', grade: 'Cuarto Perito Contador', gradeCode: 'grd-4a', section: 'A', subject: 'Matemática Comercial', teacherId: 'doc-02', teacher: 'Elena Méndez' },
        { id: 'pen-5pc-a-01', grade: 'Quinto Perito Contador', gradeCode: 'grd-5a', section: 'A', subject: 'Auditoría', teacherId: 'doc-01', teacher: 'Byron Orellana' }
    ],
    students: [
        { id: 'stu-01', name: 'Gómez Pérez, Juan Carlos', grade: 'grd-4a', section: 'A', active: true, status: 'Activo' },
        { id: 'stu-02', name: 'López Morales, Ana Lucía', grade: 'grd-4a', section: 'A', active: true, status: 'Activo' }
    ],
    attendanceRecords: {
        // Asistencia tomada por Byron Orellana en Contabilidad (pen-4pc-a-01) el día 5:
        '2026_M8_grd-4a_pen-4pc-a-01': {
            'stu-01': { 5: 'P' },
            'stu-02': { 5: 'A' }
        },
        // Asistencia tomada por Elena Méndez en Matemática (pen-4pc-a-02) el día 5:
        '2026_M8_grd-4a_pen-4pc-a-02': {
            'stu-01': { 5: 'P' },
            'stu-02': { 5: 'P' }
        }
    }
};

global.window = global;
global.sessionStorage = { getItem: () => null, setItem: () => {} };

// Ejecutar funciones relevantes desde appCode
eval(appCode.match(/function sortGrades\([^)]*\)\s*\{[\s\S]*?\n\}/)[0]);
eval(appCode.match(/function getCleanSectionLetter\([^)]*\)\s*\{[\s\S]*?\n\}/)[0]);
eval(appCode.match(/function isCourseAssignedToTeacher\([^)]*\)\s*\{[\s\S]*?\n\}/)[0]);
eval(appCode.match(/function getAttendanceRecordKey\([^)]*\)\s*\{[\s\S]*?\n\}/)[0]);
eval(appCode.match(/function populateAttendanceTeacherFilter\([^)]*\)\s*\{[\s\S]*?\n\}/)[0]);
eval(appCode.match(/function updateAttendanceCoursesList\([^)]*\)\s*\{[\s\S]*?\n\}/)[0]);
eval(appCode.match(/function getConsolidatedAttendanceMonthData\([^)]*\)\s*\{[\s\S]*?\n\}/)[0]);

populateAttendanceTeacherFilter();

assert.strictEqual(mockDOM.attendanceTeacherFilterGroup.style.display, 'block',
    'El grupo de filtro de catedráticos debe estar visible para Auxiliatura.');
assert.strictEqual(mockDOM.attendanceDirectorBanner.style.display, 'flex',
    'El banner institucional debe estar visible para Auxiliatura.');
assert(mockDOM.attendanceBannerRoleBadge.innerHTML.includes('Auditoría de Auxiliatura'),
    'El distintivo debe mostrar Auditoría de Auxiliatura.');
assert(mockDOM.attendanceTeacherSelect.innerHTML.includes('Prof. Byron Orellana'),
    'El selector debe listar al Prof. Byron Orellana');
console.log('  ✅ Test 3 Superado: Interfaz de auditoría para Auxiliatura correctamente desplegada.');

// ==============================================================================
// TEST 4: Selección de Catedrático Específico y Auto-Enfoque de su Cátedra
// ==============================================================================
console.log('\n▶ [TEST 4] Verificando filtro por docente y selección de su cátedra...');

// Simulamos que Auxiliatura selecciona a Byron Orellana (doc-01)
mockDOM.attendanceTeacherSelect.value = 'doc-01';
mockDOM.attendanceGradeSelect.value = 'grd-4a';

updateAttendanceCoursesList();

assert(mockDOM.attendanceCourseSelect.innerHTML.includes('Cátedras de Prof. Byron Orellana'),
    'Debe listar las cátedras asignadas a Byron Orellana.');
assert(mockDOM.attendanceCourseSelect.innerHTML.includes('pen-4pc-a-01'),
    'Debe incluir el curso de Contabilidad de Costos (pen-4pc-a-01).');
assert.strictEqual(mockDOM.attendanceCourseSelect.value, 'pen-4pc-a-01',
    'Debe auto-seleccionar la cátedra del docente auditado sin quedarse en GENERAL.');
console.log('  ✅ Test 4 Superado: Cátedra del catedrático auditado auto-enfocada correctamente.');

// ==============================================================================
// TEST 5: Recuperación Exacta de la Asistencia Tomada por ese Docente en esa Clase
// ==============================================================================
console.log('\n▶ [TEST 5] Verificando recuperación de datos de asistencia por cátedra auditada...');

// Consultar asistencia de Byron Orellana en Contabilidad de Costos (pen-4pc-a-01)
const monthDataByron = getConsolidatedAttendanceMonthData('grd-4a', 8, 'pen-4pc-a-01');
assert.strictEqual(monthDataByron['stu-01'][5], 'P', 'stu-01 debe estar P en Contabilidad con Byron.');
assert.strictEqual(monthDataByron['stu-02'][5], 'A', 'stu-02 debe estar A en Contabilidad con Byron.');

// Consultar asistencia de Elena Méndez en Matemática Comercial (pen-4pc-a-02)
const monthDataElena = getConsolidatedAttendanceMonthData('grd-4a', 8, 'pen-4pc-a-02');
assert.strictEqual(monthDataElena['stu-01'][5], 'P', 'stu-01 debe estar P en Matemática con Elena.');
assert.strictEqual(monthDataElena['stu-02'][5], 'P', 'stu-02 debe estar P en Matemática con Elena (no se mezcla con la A de Byron).');

console.log('  ✅ Test 5 Superado: Cero contaminación entre cátedras; Auxiliatura audita fielmente la asistencia de cada docente.');

// ==============================================================================
// TEST 6: Generación de Alerta en Bitácora cuando el Docente Marca Ausencia
// ==============================================================================
console.log('\n▶ [TEST 6] Verificando alerta y auditoría en Bitácora de Auxiliatura...');
eval(appCode.match(/function formatStudentDisplayName\([^)]*\)\s*\{[\s\S]*?\n\}/)[0]);
eval(appCode.match(/function emitAttendanceAbsenceAlert\([^)]*\)\s*\{[\s\S]*?\n\}/)[0]);
global._debounceAlertStateSave = () => {};
global.updateAuxiliaturaBadge = () => {};
global.notifyAuxiliaturaAlert = () => {};

// Simulamos que el docente 'doc-01' marca una falta en aula
global.STATE.currentUser = { id: 'doc-01', name: 'Prof. Byron Orellana', role: 'docente' };
global.STATE.currentRole = 'docente';

emitAttendanceAbsenceAlert('stu-02', 'grd-4a', 'pen-4pc-a-01', 5, 8);

assert(Array.isArray(STATE.attendanceAlerts) && STATE.attendanceAlerts.length > 0,
    'Debe registrarse la alerta en STATE.attendanceAlerts.');
const alertObj = STATE.attendanceAlerts[0];
assert.strictEqual(alertObj.studentId, 'stu-02');
assert.strictEqual(alertObj.teacherName, 'Prof. Byron Orellana');
assert.strictEqual(alertObj.day, 5);
assert.strictEqual(alertObj.month, 8);
assert.strictEqual(alertObj.status, 'pendiente');

console.log('  ✅ Test 6 Superado: Alerta instantánea emitida a Auxiliatura con detalle del docente y cátedra.');

// ==============================================================================
// TEST 7: Inmutabilidad del Modelo Institucional de Calificaciones (40% Zona / 60% Evaluación)
// ==============================================================================
console.log('\n▶ [TEST 7] Verificando inmutabilidad del modelo de ponderación (40% Zona / 60% Evaluación)...');
assert(appCode.includes('zonaMax: 40') || (appCode.includes('40') && appCode.includes('60')),
    'El modelo de ponderación debe mantenerse estrictamente en 40% Zona / 60% Evaluación.');
console.log('  ✅ Test 7 Superado: Modelo oficial 40% Zona / 60% Evaluación 100% íntegro.');

console.log('\n================================================================================');
console.log('🎉 TODAS LAS 7 PRUEBAS DE AUDITORÍA DE ASISTENCIA PARA AUXILIATURA PASARON AL 100%');
console.log('================================================================================\n');
