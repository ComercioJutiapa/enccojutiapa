// test_teacher_bitacora_privacy.js
// Verification test for dynamic teacher filtering and privacy restriction in Bitacora modal

const fs = require('fs');
const assert = require('assert');

console.log("=== INICIANDO TEST: RESTRICCIÓN DE MATERIA EN BITÁCORA POR DOCENTE ===");

// 1. Verificar contenido de app.js
const appJs = fs.readFileSync('app.js', 'utf8');

// Verificar que hasGlobalAccess restringe a super_usuario, admin, director, direccion, secretaria
assert(appJs.includes("hasGlobalAccess = ['super_usuario', 'admin', 'director', 'direccion', 'secretaria'].includes(currentRole)"), "app.js debe definir los roles con acceso global estricto");

// 2. Simular entorno DOM y lógica de filtrado
global.window = global;
global.document = {
    getElementById: function(id) {
        if (!this.elements) this.elements = {};
        if (!this.elements[id]) {
            this.elements[id] = {
                id: id,
                innerHTML: '',
                value: '',
                style: { setProperty: function() {} },
                classList: { add: function() {}, remove: function() {}, contains: function() { return false; } }
            };
        }
        return this.elements[id];
    }
};

global.showToast = function(msg, type) {
    global._lastToast = { msg, type };
};

// Cargar funciones directamente evaluadas desde app.js o simuladas fielmente
const pensumMock = [
    { id: 'pen-eco-01', subject: 'Introducción a la Economía', grade: '6to Perito A', gradeCode: '6_PERITO_A', teacher: 'Prof. Mario Estrada', teacherId: 'usr-doc-01' },
    { id: 'pen-mat-01', subject: 'Matemática Comercial', grade: '6to Perito A', gradeCode: '6_PERITO_A', teacher: 'Prof. Mario Estrada', teacherId: 'usr-doc-01' },
    { id: 'pen-con-01', subject: 'Contabilidad General', grade: '6to Perito A', gradeCode: '6_PERITO_A', teacher: 'Licda. Ana Morales', teacherId: 'usr-doc-02' },
    { id: 'pen-leg-01', subject: 'Legislación Fiscal', grade: '6to Perito B', gradeCode: '6_PERITO_B', teacher: 'Licda. Ana Morales', teacherId: 'usr-doc-02' }
];

global.STATE = {
    pensum: pensumMock,
    gradesList: [
        { code: '6_PERITO_A', name: '6to Perito A', section: 'A' },
        { code: '6_PERITO_B', name: '6to Perito B', section: 'B' }
    ],
    students: [
        { id: 'st-01', firstName: 'Katerin', lastName: 'Arévalo', gradeCode: '6_PERITO_A', carne: '2026-CB-003' }
    ]
};

// Extraer funciones relevantes desde app.js para probarlas tal cual
eval(appJs.match(/function getCleanSectionLetter[\s\S]*?\n\}/)[0]);
eval(appJs.match(/function isGradeMatch[\s\S]*?\n\}/)[0]);
eval(appJs.match(/function isSectionMatch[\s\S]*?\n\}/)[0]);
eval(appJs.match(/function isCourseAssignedToTeacher[\s\S]*?\n\}/)[0]);
eval(appJs.match(/function canUserAccessCourseBitacora[\s\S]*?\n\}/)[0]);
eval(appJs.match(/function getTeacherAssignedCoursesInGrade[\s\S]*?\n\}/)[0]);

console.log("✔ Funciones extraídas correctamente de app.js");

// TEST CASE 1: Docente 'Prof. Mario Estrada' (usr-doc-01) en 6to Perito A
const teacherUser = { id: 'usr-doc-01', name: 'Prof. Mario Estrada', role: 'docente' };
STATE.currentUser = teacherUser;
STATE.currentRole = 'docente';

const teacherCourses = getTeacherAssignedCoursesInGrade('6_PERITO_A', teacherUser);
console.log(`Docente Mario Estrada consulta 6to Perito A: ${teacherCourses.length} materias encontradas.`);
assert.strictEqual(teacherCourses.length, 2, "Mario Estrada solo debe ver sus 2 materias asignadas");
assert(teacherCourses.every(c => c.teacherId === 'usr-doc-01'), "Todas las materias deben pertenecer a Mario Estrada");
assert(!teacherCourses.some(c => c.id === 'pen-con-01'), "Mario Estrada NO debe ver Contabilidad General (de Ana Morales)");

// TEST CASE 2: Verificación de acceso por materia individual
assert.strictEqual(canUserAccessCourseBitacora('pen-eco-01', '6_PERITO_A', teacherUser, 'docente'), true, "Debe tener acceso a su materia asignada (Economía)");
assert.strictEqual(canUserAccessCourseBitacora('pen-con-01', '6_PERITO_A', teacherUser, 'docente'), false, "Debe tener DENEGADO el acceso a Contabilidad (materia ajena)");

// TEST CASE 3: Rol Superusuario / Dirección / Secretaría (Acceso Global)
const directorUser = { id: 'usr-dir-01', name: 'Dirección General', role: 'director' };
STATE.currentUser = directorUser;
STATE.currentRole = 'director';

const directorCourses = getTeacherAssignedCoursesInGrade('6_PERITO_A', directorUser);
console.log(`Dirección consulta 6to Perito A: ${directorCourses.length} materias encontradas.`);
assert.strictEqual(directorCourses.length, 3, "Dirección debe tener acceso global a todas las materias del grado");
assert.strictEqual(canUserAccessCourseBitacora('pen-con-01', '6_PERITO_A', directorUser, 'director'), true, "Dirección debe poder acceder a cualquier cátedra");
assert.strictEqual(canUserAccessCourseBitacora('pen-eco-01', '6_PERITO_A', directorUser, 'director'), true, "Dirección debe poder acceder a cualquier cátedra");

const superUser = { id: 'usr-super-01', name: 'Super Admin', role: 'super_usuario' };
STATE.currentUser = superUser;
STATE.currentRole = 'super_usuario';
const superCourses = getTeacherAssignedCoursesInGrade('6_PERITO_A', superUser);
assert.strictEqual(superCourses.length, 3, "Superusuario debe tener acceso global a todas las materias");

const secUser = { id: 'usr-sec-01', name: 'Secretaría', role: 'secretaria' };
STATE.currentUser = secUser;
STATE.currentRole = 'secretaria';
const secCourses = getTeacherAssignedCoursesInGrade('6_PERITO_A', secUser);
assert.strictEqual(secCourses.length, 3, "Secretaría debe tener acceso global a todas las materias");

console.log("================================================================");
console.log(" TODOS LOS TESTS DE PRIVACIDAD Y FILTRADO PASARON EXITOSAMENTE ");
console.log("================================================================");
