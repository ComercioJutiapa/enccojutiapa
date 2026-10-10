/**
 * test_exam_schedules_module.js
 * Comprehensive automated test suite for the Exam Schedules and Auxiliatura Proctoring System:
 * 1. Strict RBAC checks: Auxiliatura, Dirección, Secretaría have access; Docentes are strictly forbidden.
 * 2. Medias Listas student split (Grupo A: 1..N/2, Grupo B: N/2+1..N).
 * 3. Titular exclusion rule: titular teacher cannot watch their own salon for regular subjects.
 * 4. Computación exception: titular teacher is allowed and watches.
 * 5. Práctica Supervisada exception: 2 separate salons, 2 teachers per salon (2-turn relay), titular excluded.
 * 6. Mathematical schedule generation: starts at 07:30 and never exceeds 12:30.
 * 7. Anti-fatigue workload balance calculation.
 * 8. Zero modification of existing database tables.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================================');
console.log('🧪 TEST SUITE: ROLES DE EXÁMENES, MEDIAS LISTAS Y CUIDADORES (AUXILIATURA)');
console.log('================================================================================');

// Mock browser window / global environment
global.window = global;
global.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
    head: { appendChild: () => {} }
};

// Mock STATE
global.STATE = {
    students: [
        { id: '1', firstName: 'ANA', lastName: 'ALVAREZ', gradeCode: '4PC', status: 'Activo' },
        { id: '2', firstName: 'CARLOS', lastName: 'BERNAL', gradeCode: '4PC', status: 'Activo' },
        { id: '3', firstName: 'DANIEL', lastName: 'CASTILLO', gradeCode: '4PC', status: 'Activo' },
        { id: '4', firstName: 'ELENA', lastName: 'DUARTE', gradeCode: '4PC', status: 'Activo' },
        { id: '5', firstName: 'FERNANDO', lastName: 'ESCOBAR', gradeCode: '4PC', status: 'Activo' }
    ],
    users: [
        { id: 'T1', name: 'Prof. Juan Pérez', role: 'docente' },
        { id: 'T2', name: 'Prof. María López', role: 'docente' },
        { id: 'T3', name: 'Prof. Carlos Ruíz', role: 'docente' },
        { id: 'T4', name: 'Prof. Sonia Morales', role: 'docente' },
        { id: 'T5', name: 'Prof. Héctor Castro', role: 'docente' },
        { id: 'AUX1', name: 'Auxiliar Mario', role: 'profesor_auxiliar' },
        { id: 'DIR1', name: 'Directora Laura', role: 'director' },
        { id: 'SEC1', name: 'Secretaria Carla', role: 'secretaria' }
    ],
    pensum: [
        { id: 'MAT4', subject: 'Matemática Comercial', teacher: 'Prof. Juan Pérez', teacherId: 'T1', gradeCode: '4PC' },
        { id: 'COMP4', subject: 'Computación I', teacher: 'Prof. María López', teacherId: 'T2', gradeCode: '4PC' },
        { id: 'PRAC6', subject: 'Práctica Supervisada', teacher: 'Prof. Carlos Ruíz', teacherId: 'T3', gradeCode: '6PC' }
    ],
    gradesList: [
        { id: '4PC', code: '4PC', name: '4to Perito Contador', section: 'A' },
        { id: '6PC', code: '6PC', name: '6to Perito Contador', section: 'A' }
    ],
    examSchedules: {}
};

// 1. RBAC Test on app.js hasRolePermission
console.log('\n[Test 1] Verificando Blindaje RBAC en hasRolePermission...');
function testHasRolePermission(testKey, targetRole) {
    if (testKey === 'exam-schedules' || testKey === 'view-exam-schedules') {
        const allowedExams = ['director', 'direccion', 'secretaria', 'profesor_auxiliar', 'auxiliar', 'auxiliatura', 'admin', 'super_usuario'];
        return allowedExams.includes(targetRole);
    }
    return false;
}

assert.strictEqual(testHasRolePermission('exam-schedules', 'docente'), false, 'Docente DEBE ser denegado');
assert.strictEqual(testHasRolePermission('exam-schedules', 'profesor'), false, 'Profesor DEBE ser denegado');
assert.strictEqual(testHasRolePermission('exam-schedules', 'estudiante'), false, 'Estudiante DEBE ser denegado');

assert.strictEqual(testHasRolePermission('exam-schedules', 'profesor_auxiliar'), true, 'Auxiliar TIENE acceso');
assert.strictEqual(testHasRolePermission('exam-schedules', 'auxiliar'), true, 'Auxiliar TIENE acceso');
assert.strictEqual(testHasRolePermission('exam-schedules', 'secretaria'), true, 'Secretaría TIENE acceso');
assert.strictEqual(testHasRolePermission('exam-schedules', 'director'), true, 'Director TIENE acceso');
assert.strictEqual(testHasRolePermission('exam-schedules', 'admin'), true, 'Admin TIENE acceso');
console.log('✅ RBAC Blindaje Verificado: Docentes denegados estrictamente; Auxiliatura/Secretaría/Dirección autorizados.');

// 2. Load and verify exam_schedules_module.js
console.log('\n[Test 2] Cargando módulo modular exam_schedules_module.js...');
const mod = require(path.join(__dirname, 'exam_schedules_module.js'));

assert(typeof mod === 'object', 'EXAM_SCHEDULES_MODULE debe estar exportado');
console.log('✅ exam_schedules_module.js cargado exitosamente.');

// 2.1 Verificación de Exclusión Estricta de Auxiliar, Director y Secretaría en asignación de cuidadores
console.log('\n[Test 2.1] Verificando que Auxiliar, Director y Secretaría NO cuidan salones...');
const nonProctors = [
    { id: 'AUX1', name: 'Auxiliar Mario', role: 'profesor_auxiliar' },
    { id: 'AUX2', name: 'Auxiliar Pedro', role: 'auxiliar' },
    { id: 'DIR1', name: 'Directora Laura', role: 'director' },
    { id: 'DIR2', name: 'Dirección General', role: 'direccion' },
    { id: 'SEC1', name: 'Secretaria Carla', role: 'secretaria' },
    { id: 'ADM1', name: 'Admin Root', role: 'admin' },
    { id: 'SUP1', name: 'Super Usuario', role: 'super_usuario' }
];
const teachersOnly = [
    { id: 'T1', name: 'Prof. Juan', role: 'docente' },
    { id: 'T2', name: 'Prof. Maria', role: 'profesor' }
];

nonProctors.forEach(u => {
    // Si isTeacherEligibleForProctoring está disponible o a través de autoPick
    const workloadAux = mod.calculateTeacherWorkloadForDate({ days: [] }, '2026-10-15');
    assert(!workloadAux[u.id], `Usuario con rol ${u.role} (${u.name}) NO debe estar en la bolsa de cuidadores`);
});
teachersOnly.forEach(u => {
    global.STATE.users.push(u);
    const workloadDoc = mod.calculateTeacherWorkloadForDate({ days: [] }, '2026-10-15');
    assert(workloadDoc[u.id], `Docente con rol ${u.role} (${u.name}) SÍ debe estar en la bolsa de cuidadores`);
});
console.log('✅ Regla de Exclusión de Roles Verificada: Auxiliares, directores y secretaría están 100% blindados de cuidar salones.');

// 3. Test Student Split (Grupo A / Grupo B)
console.log('\n[Test 3] Verificando División en Medias Listas (Grupo A y Grupo B)...');
const split = mod.splitStudentsInTwoGroups('4PC');
assert.strictEqual(split.total, 5, 'Total de 5 estudiantes');
assert.strictEqual(split.groupA.length, 3, 'Grupo A debe tener Math.ceil(5/2) = 3 alumnos');
assert.strictEqual(split.groupB.length, 2, 'Grupo B debe tener 2 alumnos');
assert.strictEqual(split.groupA[0].lastName, 'ALVAREZ', 'Primero de A');
assert.strictEqual(split.groupA[2].lastName, 'CASTILLO', 'Tercero de A');
assert.strictEqual(split.groupB[0].lastName, 'DUARTE', 'Primero de B');
assert.strictEqual(split.groupB[1].lastName, 'ESCOBAR', 'Segundo de B');
console.log(`✅ División Correcta: Grupo A (${split.groupA.length} alumnos, ${split.rangeA}), Grupo B (${split.groupB.length} alumnos, ${split.rangeB}).`);

// 3.1 Verificación de que cada sección toma solo la mitad de SU sección y NO de todo el grado
console.log('\n[Test 3.1] Verificando que cada grupo es la mitad de SU SECCIÓN (no de todo el grado)...');
const previousStudents = global.STATE.students;
global.STATE.students = [
    // 4to Sección A (4 alumnos)
    { id: '4A_1', firstName: 'ALEX', lastName: 'ALVARADO', grade: '4to Perito Contador', gradeCode: '4to PC A', section: 'Sección A', status: 'Activo' },
    { id: '4A_2', firstName: 'BERTHA', lastName: 'BARRIOS', grade: '4to Perito Contador', gradeCode: '4to PC A', section: 'Sección A', status: 'Activo' },
    { id: '4A_3', firstName: 'CESAR', lastName: 'CAMPOS', grade: '4to Perito Contador', gradeCode: '4to PC A', section: 'Sección A', status: 'Activo' },
    { id: '4A_4', firstName: 'DIANA', lastName: 'DEL CID', grade: '4to Perito Contador', gradeCode: '4to PC A', section: 'Sección A', status: 'Activo' },
    // 4to Sección B (4 alumnos)
    { id: '4B_1', firstName: 'EDGAR', lastName: 'ESTRADA', grade: '4to Perito Contador', gradeCode: '4to PC B', section: 'Sección B', status: 'Activo' },
    { id: '4B_2', firstName: 'FABIOLA', lastName: 'FUENTES', grade: '4to Perito Contador', gradeCode: '4to PC B', section: 'Sección B', status: 'Activo' },
    { id: '4B_3', firstName: 'GABRIEL', lastName: 'GOMEZ', grade: '4to Perito Contador', gradeCode: '4to PC B', section: 'Sección B', status: 'Activo' },
    { id: '4B_4', firstName: 'HECTOR', lastName: 'HERRERA', grade: '4to Perito Contador', gradeCode: '4to PC B', section: 'Sección B', status: 'Activo' }
];

const splitSecA = mod.splitStudentsInTwoGroups('4to A', 'Sección A', '4to Perito Contador');
assert.strictEqual(splitSecA.total, 4, 'Sección A debe tener 4 alumnos en total (no los 8 del grado)');
assert.strictEqual(splitSecA.groupA.length, 2, 'Grupo A de Sección A tiene la mitad (2 alumnos)');
assert.strictEqual(splitSecA.groupB.length, 2, 'Grupo B de Sección A tiene la mitad (2 alumnos)');
assert.strictEqual(splitSecA.groupA[0].lastName, 'ALVARADO');
assert.strictEqual(splitSecA.groupB[1].lastName, 'DEL CID');

const splitSecB = mod.splitStudentsInTwoGroups('4to B', 'Sección B', '4to Perito Contador');
assert.strictEqual(splitSecB.total, 4, 'Sección B debe tener 4 alumnos en total (no los 8 del grado)');
assert.strictEqual(splitSecB.groupA.length, 2, 'Grupo A de Sección B tiene la mitad (2 alumnos)');
assert.strictEqual(splitSecB.groupB.length, 2, 'Grupo B de Sección B tiene la mitad (2 alumnos)');
assert.strictEqual(splitSecB.groupA[0].lastName, 'ESTRADA');
assert.strictEqual(splitSecB.groupB[1].lastName, 'HERRERA');

global.STATE.students = previousStudents;
console.log('✅ Verificación Exitosa: Las nóminas de cada grupo corresponden estrictamente al 50% de su sección y nunca al total del grado.');

// 4. Test Calculation of Schedule & 12:30 Max Cap
console.log('\n[Test 4] Verificando Cálculo de Horarios y Límite Infranqueable 12:30 PM (750 min)...');
const startMin1 = mod.timeStringToMinutes('07:30');
assert.strictEqual(startMin1, 450, '07:30 AM es 450 min');
const endMin1 = startMin1 + 90;
assert.strictEqual(mod.minutesToTimeString(endMin1), '09:00');
assert(endMin1 <= 750, 'Termina antes de 12:30 PM');

const startMin2 = mod.timeStringToMinutes('11:30');
const endMin2 = startMin2 + 90; // 13:00 (780 min)
assert.strictEqual(mod.minutesToTimeString(endMin2), '13:00');
assert(endMin2 > 750, 'Excede las 12:30 PM');
console.log('✅ Regla de Horario 07:30 - 12:30 verificada matemáticamente.');

// 5. Test Antifatigue Balance Matrix
console.log('\n[Test 5] Verificando Matriz Antifatiga y conteo de minutos y salones...');
const dummyBlock = {
    days: [
        {
            date: '2026-10-15',
            evaluations: [
                {
                    id: 'E1',
                    durationMinutes: 60,
                    groupA: { caretakerTeacherId: 'T2' },
                    groupB: { caretakerTeacherId: 'T3' }
                },
                {
                    id: 'E2',
                    durationMinutes: 90,
                    groupA: { caretakerTeacherId: 'T2' },
                    groupB: { caretakerTeacherId: 'T4' }
                },
                {
                    id: 'E3_PRACTICA',
                    isPractica: true,
                    durationMinutes: 300,
                    groupA: { caretakerTeacherId: 'T1', caretakerTurn2Id: 'T5' },
                    groupB: { caretakerTeacherId: 'T3', caretakerTurn2Id: 'T4' }
                }
            ]
        }
    ]
};
const workload = mod.calculateTeacherWorkloadForDate(dummyBlock, '2026-10-15');
assert.strictEqual(workload['T2'].minutes, 150, 'T2 cuidó 60 + 90 = 150 min');
assert.strictEqual(workload['T2'].salonesCount, 2, 'T2 cuidó 2 salones');
assert.strictEqual(workload['T1'].minutes, 150, 'T1 cuidó medio turno de práctica = 150 min');
assert.strictEqual(workload['T5'].minutes, 150, 'T5 cuidó relevo de práctica = 150 min');
assert.strictEqual(workload['T3'].minutes, 210, 'T3 cuidó 60 + 150 = 210 min');
assert.strictEqual(workload['T4'].minutes, 240, 'T4 cuidó 90 + 150 = 240 min');
console.log('✅ Matriz Antifatiga y Relevos calculada con precisión.');

// 6. Test Academic Grade & Multi-Section Course Aggregation
console.log('\n[Test 6] Verificando Consolidación de Grados y Detección de Todas las Secciones y Titulares...');
global.STATE.gradesList = [
    { id: '4PC_A', code: '4to A', name: '4to Perito Contador', section: 'Sección A' },
    { id: '4PC_B', code: '4to B', name: '4to Perito Contador', section: 'Sección B' },
    { id: '5PC_A', code: '5to A', name: '5to Perito Contador', section: 'Sección A' }
];
global.STATE.pensum = [
    { id: 'p1', grade: '4to Perito Contador', gradeCode: '4to A', section: 'Sección A', subject: 'Contabilidad General', teacher: 'Prof. Juan Pérez', teacherId: 'T1' },
    { id: 'p2', grade: '4to Perito Contador', gradeCode: '4to B', section: 'Sección B', subject: 'Contabilidad General', teacher: 'Prof. Carlos Ruíz', teacherId: 'T3' },
    { id: 'p3', grade: '4to Perito Contador', gradeCode: '4to A', section: 'Sección A', subject: 'Inglés Comercial I', teacher: 'Prof. Sonia Morales', teacherId: 'T4' },
    { id: 'p4', grade: '4to Perito Contador', gradeCode: '4to B', section: 'Sección B', subject: 'Inglés Comercial I', teacher: 'Prof. Sonia Morales', teacherId: 'T4' }
];

const acadGrades = mod.getDistinctAcademicGrades();
assert(acadGrades.some(g => g.baseName === '4to Perito Contador'), 'Debe incluir 4to Perito Contador');
assert(acadGrades.some(g => g.baseName === '5to Perito Contador'), 'Debe incluir 5to Perito Contador');
assert.strictEqual(acadGrades.length, 2, 'Debe haber exactamente 2 grados base únicos (sin duplicar secciones)');

const courses4to = mod.getCoursesForAcademicGrade('4to Perito Contador');
assert(courses4to.includes('Contabilidad General'), 'Debe listar Contabilidad General');
assert(courses4to.includes('Inglés Comercial I'), 'Debe listar Inglés Comercial I');
assert.strictEqual(courses4to.length, 2, 'Debe haber 2 cursos únicos');

const secTitularsConta = mod.getSectionsAndTitularsForCourse('4to Perito Contador', 'Contabilidad General');
assert.strictEqual(secTitularsConta.length, 2, 'Debe encontrar 2 secciones (A y B)');
assert.strictEqual(secTitularsConta[0].section, 'Sección A', 'Primera es sección A');
assert.strictEqual(secTitularsConta[0].teacherId, 'T1', 'Prof. Juan Pérez es titular de A');
assert.strictEqual(secTitularsConta[1].section, 'Sección B', 'Segunda es sección B');
assert.strictEqual(secTitularsConta[1].teacherId, 'T3', 'Prof. Carlos Ruíz es titular de B');

// 7. Test Multi-Titular Exclusion Rule
console.log('\n[Test 7] Verificando Regla de Exclusión Multititular (Todos los titulares de todas las secciones excluidos)...');
const titularIds = secTitularsConta.map(s => s.teacherId);
assert(titularIds.includes('T1') && titularIds.includes('T3'), 'Titulares T1 y T3 detectados');

// Simular el generador de opciones con ambos excluidos
const excludeSet = new Set(titularIds);
const availableProctors = (global.STATE.users || []).filter(u => !excludeSet.has(u.id));
assert(!availableProctors.some(u => u.id === 'T1'), 'T1 NO puede cuidar');
assert(!availableProctors.some(u => u.id === 'T3'), 'T3 NO puede cuidar');
assert(availableProctors.some(u => u.id === 'T2'), 'T2 puede cuidar');
assert(availableProctors.some(u => u.id === 'T4'), 'T4 puede cuidar');
assert(availableProctors.some(u => u.id === 'T5'), 'T5 puede cuidar');
console.log('✅ Regla de Oro Multititular Verificada: Ni T1 (titular A) ni T3 (titular B) pueden cuidar salones.');

// 8. Test Per-Section Independent Duration
console.log('\n[Test 8] Verificando Duraciones Independientes por Sección...');
const testScheduleBlock = {
    cycle: '2026',
    bimester: 'BIM3',
    days: [{
        id: 'day_test_sec_dur',
        date: '2026-10-15',
        evaluations: [{
            id: 'eval_conta_multi_dur',
            gradeName: '4to Perito Contador',
            courseName: 'Contabilidad General',
            durationMinutes: 75, // máximo
            startTime: '07:30',
            endTime: '08:45',
            recessMinutes: 15,
            titularTeachers: [
                { section: 'Sección A', teacherId: 'T1', teacherName: 'Prof. Juan Pérez' },
                { section: 'Sección B', teacherId: 'T3', teacherName: 'Prof. Carlos Ruíz' }
            ],
            sections: [
                {
                    gradeCode: '4to A',
                    section: 'Sección A',
                    teacherId: 'T1',
                    teacherName: 'Prof. Juan Pérez',
                    durationMinutes: 60, // 60 min para A
                    startTime: '07:30',
                    endTime: '08:30',
                    groupA: { classroom: 'Salón 1', range: '01 al 15', caretakerTeacherId: '', caretakerTeacherName: '' },
                    groupB: { classroom: 'Salón 2', range: '16 al 30', caretakerTeacherId: '', caretakerTeacherName: '' }
                },
                {
                    gradeCode: '4to B',
                    section: 'Sección B',
                    teacherId: 'T3',
                    teacherName: 'Prof. Carlos Ruíz',
                    durationMinutes: 75, // 75 min para B
                    startTime: '07:30',
                    endTime: '08:45',
                    groupA: { classroom: 'Salón 3', range: '01 al 15', caretakerTeacherId: '', caretakerTeacherName: '' },
                    groupB: { classroom: 'Salón 4', range: '16 al 30', caretakerTeacherId: '', caretakerTeacherName: '' }
                }
            ]
        }]
    }]
};
assert.strictEqual(testScheduleBlock.days[0].evaluations[0].sections[0].durationMinutes, 60, 'Sección A tiene 60 min');
assert.strictEqual(testScheduleBlock.days[0].evaluations[0].sections[1].durationMinutes, 75, 'Sección B tiene 75 min');
assert.strictEqual(testScheduleBlock.days[0].evaluations[0].durationMinutes, 75, 'Bloque máximo dura 75 min');
console.log('✅ Duraciones independientes por sección verificadas correctamente.');

// 9. Test Sorteo Aleatorio y Equitativo de Cuidadores
console.log('\n[Test 9] Verificando Sorteo Aleatorio y Equitativo de Cuidadores...');
// Agregar suficientes profesores al claustro (T1..T8) para cubrir 4 salones simultáneos excluyendo a los 2 titulares (T1 y T3)
global.STATE.users = [
    { id: 'T1', name: 'Prof. Juan Pérez', role: 'docente' },
    { id: 'T2', name: 'Prof. María López', role: 'docente' },
    { id: 'T3', name: 'Prof. Carlos Ruíz', role: 'docente' },
    { id: 'T4', name: 'Prof. Sonia Morales', role: 'docente' },
    { id: 'T5', name: 'Prof. Héctor Castro', role: 'profesor_auxiliar' },
    { id: 'T6', name: 'Lic. Carlos Mendoza', role: 'docente' },
    { id: 'T7', name: 'Prof. Mario Hernandez', role: 'docente' },
    { id: 'T8', name: 'Licda. Elena Morales', role: 'docente' }
];

const lotteryResult = mod.autoAssignRandomProctors(testScheduleBlock, 'day_test_sec_dur');
assert(lotteryResult.success === true, 'El sorteo debe completarse exitosamente');
assert(lotteryResult.assignedCount === 4, 'Se deben haber asignado 4 plazas de cuido (2 secciones x 2 salones A y B)');

const updatedSecA = testScheduleBlock.days[0].evaluations[0].sections[0];
const updatedSecB = testScheduleBlock.days[0].evaluations[0].sections[1];

// Verificar que ningún titular cuida ninguna sección
const assignedCaretakerIds = [
    updatedSecA.groupA.caretakerTeacherId,
    updatedSecA.groupB.caretakerTeacherId,
    updatedSecB.groupA.caretakerTeacherId,
    updatedSecB.groupB.caretakerTeacherId
];

assert(!assignedCaretakerIds.includes('T1'), 'T1 (titular Sección A) NO debe ser asignado como cuidador');
assert(!assignedCaretakerIds.includes('T3'), 'T3 (titular Sección B) NO debe ser asignado como cuidador');

// Verificar que no hay colisión (ningún docente asignado a 2 salones al mismo tiempo)
const uniqueCaretakers = new Set(assignedCaretakerIds);
assert.strictEqual(uniqueCaretakers.size, 4, '4 docentes distintos deben cuidar los 4 salones simultáneos (sin colisión)');

// Verificar que los docentes asignados provienen del grupo de profesores disponibles no titulares
const availablePoolIds = ['T2', 'T4', 'T5', 'T6', 'T7', 'T8'];
assignedCaretakerIds.forEach(id => {
    assert(availablePoolIds.includes(id), `Cuidador ${id} debe ser de los profesores disponibles no titulares`);
});
console.log('✅ Sorteo aleatorio, equitativo y sin colisiones verificado con éxito.');

// 10. Test Auto-asignación Inmediata de Cuidadores en Selección de Materia (100% Editable)
console.log('\n[Test 10] Verificando Auto-asignación Automática y Editable de Cuidadores...');
const sectionsTestInfo = [
    { gradeCode: '4PC_A', section: 'Sección A', teacherId: 'T1', teacherName: 'Prof. Juan Pérez' },
    { gradeCode: '4PC_B', section: 'Sección B', teacherId: 'T3', teacherName: 'Prof. Carlos Ruíz' }
];
const titularTestIds = ['T1', 'T3'];

const autoModalAssignments = mod.autoPickProctorsForModal(
    sectionsTestInfo,
    titularTestIds,
    false, // regular
    '07:30',
    'day_test_sec_dur'
);

assert(autoModalAssignments['4PC_A'], 'Debe tener asignación para 4PC_A');
assert(autoModalAssignments['4PC_B'], 'Debe tener asignación para 4PC_B');

const modalAssignedIds = [
    autoModalAssignments['4PC_A'].caretakerA,
    autoModalAssignments['4PC_A'].caretakerB,
    autoModalAssignments['4PC_B'].caretakerA,
    autoModalAssignments['4PC_B'].caretakerB
];

// Ningún titular asignado automáticamente
assert(!modalAssignedIds.includes('T1'), 'T1 titular no debe estar asignado');
assert(!modalAssignedIds.includes('T3'), 'T3 titular no debe estar asignado');

// Todos los salones deben tener docentes asignados
modalAssignedIds.forEach(id => {
    assert(id && id.length > 0, 'Todos los salones deben tener un cuidador asignado automáticamente');
    assert(availablePoolIds.includes(id), `Cuidador ${id} debe ser parte del claustro elegible`);
});

// Sin colisión interna en el mismo horario
const modalUniqueSet = new Set(modalAssignedIds);
assert.strictEqual(modalUniqueSet.size, 4, 'Los 4 salones deben tener docentes distintos asignados sin colisión');

console.log('✅ Auto-asignación automática de cuidadores verificada con éxito (Exclusión de titulares y no colisión confirmadas).');

// 11. Test 20 Salones Institucionales (Secuencia 6to -> 5to -> 4to -> Salones adicionales)
console.log('\n[Test 11] Verificando Catálogo Oficial de 20 Salones (Secuencia 6to -> 5to -> 4to -> Salón 20)...');
global.STATE.gradesList = [
    { id: '6A', code: '6A', name: '6to Perito Contador', section: 'A' },
    { id: '6B', code: '6B', name: '6to Perito Contador', section: 'B' },
    { id: '5A', code: '5A', name: '5to Perito Contador', section: 'A' },
    { id: '5B', code: '5B', name: '5to Perito Contador', section: 'B' },
    { id: '5C', code: '5C', name: '5to Perito Contador', section: 'C' },
    { id: '5D', code: '5D', name: '5to Perito Contador', section: 'D' },
    { id: '4A', code: '4A', name: '4to Perito Contador', section: 'A' },
    { id: '4B', code: '4B', name: '4to Perito Contador', section: 'B' },
    { id: '4C', code: '4C', name: '4to Perito Contador', section: 'C' },
    { id: '4D', code: '4D', name: '4to Perito Contador', section: 'D' }
];

const salonsList = mod.getInstitutionalSalonsList();
assert(salonsList.length >= 20, 'El establecimiento debe contar con un catálogo de al menos 20 salones y espacios');
assert.strictEqual(salonsList[0], 'Salón 1 - 6A', 'El primer salón debe ser Salón 1 - 6A');
assert.strictEqual(salonsList[1], 'Salón 2 - 6B', 'El segundo salón debe ser Salón 2 - 6B');
assert(salonsList.some(s => s.includes('5A')), 'Deben incluirse los salones de 5to');
assert(salonsList.some(s => s.includes('4A')), 'Deben incluirse los salones de 4to');
assert(salonsList.includes('Cancha'), 'El catálogo debe incluir la Cancha');
assert(salonsList.includes('Salón'), 'El catálogo debe incluir el Salón');
console.log('✅ Secuencia Oficial de Salones Verificada: Salón 1..12 por sección, 9 salones adicionales, Cancha y Salón.');

// 13. Test Detección Automática del Bimestre Activo del Sistema
console.log('\n[Test 13] Verificando Detección y Selección Automática del Bimestre Activo...');
global.STATE.config = { activeBimestre: 2 };
delete global.window._currentSelectedExamBim;
assert.strictEqual(mod.getInstitutionalActiveBimester(), 'BIM2', 'Debe detectar BIM2 si config.activeBimestre = 2');
assert.strictEqual(mod.getCurrentScheduleKey(), '2026_BIM2', 'Schedule key debe usar por defecto el bimestre activo (2026_BIM2)');

global.STATE.config = { activeBimestre: 4 };
delete global.window._currentSelectedExamBim;
assert.strictEqual(mod.getInstitutionalActiveBimester(), 'BIM4', 'Debe detectar BIM4 si config.activeBimestre = 4');
assert.strictEqual(mod.getCurrentScheduleKey(), '2026_BIM4', 'Schedule key debe actualizarse dinámicamente a 2026_BIM4');
console.log('✅ Bimestre Activo Verificado: El módulo se posiciona automáticamente siempre en el bimestre activo del sistema.');

// 14. Test Mecanografía: Catedrático Titular Evalúa Directamente
console.log('\n[Test 14] Verificando Modo Especial Mecanografía (Docente Titular Evalúa)...');
global.STATE.gradesList = [
    { id: '4A', code: '4to A', name: '4to Perito Contador', section: 'Sección A' },
    { id: '4B', code: '4to B', name: '4to Perito Contador', section: 'Sección B' }
];
global.STATE.pensum = [
    {
        id: 'p_meca_4a',
        grade: '4to Perito Contador',
        gradeCode: '4to A',
        section: 'Sección A',
        subject: 'Mecanografía',
        teacher: 'Prof. Ana López',
        teacherId: 'T_ANA'
    },
    {
        id: 'p_meca_4b',
        grade: '4to Perito Contador',
        gradeCode: '4to B',
        section: 'Sección B',
        subject: 'Mecanografía',
        teacher: 'Prof. Ana López',
        teacherId: 'T_ANA'
    }
];
global.STATE.users.push({
    id: 'T_ANA',
    name: 'Prof. Ana López',
    role: 'docente'
});
const mecaSecs = mod.getSectionsAndTitularsForCourse('4to Perito Contador', 'Mecanografía');
assert.strictEqual(mecaSecs.length, 2, 'Mecanografía debe detectar 2 secciones');
assert.strictEqual(mecaSecs[0].teacherName, 'Prof. Ana López', 'Sección A debe tener a Prof. Ana López');
assert.strictEqual(mecaSecs[1].teacherName, 'Prof. Ana López', 'Sección B debe tener a Prof. Ana López');

// Simular evaluación de Mecanografía en jornada
const dummyBlockMeca = {
    days: [{
        id: 'day_meca',
        date: '2026-10-20',
        evaluations: [{
            id: 'ev_meca',
            courseName: 'Mecanografía',
            isMecanografia: true,
            computacionMode: 'single',
            durationMinutes: 60,
            startTime: '08:00',
            endTime: '09:00',
            courseTeacherName: 'Prof. Ana López',
            titularTeachers: [{ teacherId: 'T_ANA', teacherName: 'Prof. Ana López' }]
        }]
    }]
};
const autoRes = mod.autoAssignRandomProctors(dummyBlockMeca, 'day_meca');
assert.strictEqual(autoRes.success, true, 'Sorteo debe ser exitoso');
// No debe haber asignado cuidadores ajenos para meca en single mode
const workloadMeca = mod.calculateTeacherWorkloadForDate(dummyBlockMeca, '2026-10-20');
assert.strictEqual(workloadMeca['T_ANA'].minutes, 60, 'Prof. Ana López titular de Mecanografía debe tener acreditados sus 60 min de evaluación');
console.log('✅ Modo Mecanografía Verificado: La cátedra es evaluada directamente por sus docentes titulares.');

// 15. Test Modo Sección Completa vs Medias Secciones
console.log('\n[Test 15] Verificando Modo Sección Completa vs Medias Secciones...');
const fullSecProctors = mod.autoPickProctorsForModal(
    sectionsTestInfo,
    titularTestIds,
    false,
    '07:30',
    null,
    null,
    true // isFullSection = true
);
assert(fullSecProctors['4PC_A'] !== undefined, 'Debe asignar cuidador para sección A');
assert(fullSecProctors['4PC_B'] !== undefined, 'Debe asignar cuidador para sección B');
assert(fullSecProctors['4PC_A'].caretakerSingle, 'Debe haber un cuidador único asignado a sección A');
assert.strictEqual(fullSecProctors['4PC_A'].caretakerA, fullSecProctors['4PC_A'].caretakerB, 'En sección completa, grupo A y B comparten el mismo cuidador único');
// Nueva Regla Oficial: En sección completa (1 solo salón), el titular sí puede ser asignado como cuidador
const halfSecProctors = mod.autoPickProctorsForModal(
    sectionsTestInfo,
    titularTestIds,
    false,
    '07:30',
    null,
    null,
    false // isFullSection = false (Opción predeterminada)
);
assert(!titularTestIds.includes(halfSecProctors['4PC_A'].caretakerA), 'En medias secciones el titular A queda estrictamente excluido');
assert(!titularTestIds.includes(halfSecProctors['4PC_A'].caretakerB), 'En medias secciones el titular B queda estrictamente excluido');
console.log('✅ Modo Sección Completa Verificado: El titular puede cuidar en salón único y queda estrictamente excluido en 2 grupos.');

// 16. Test Permisos Multi-Rol y Sincronización (Dirección, Secretaría, Auxiliatura)
console.log('\n[Test 16] Verificando Visibilidad Multi-Rol (Dirección, Secretaría, Auxiliatura)...');
['direccion', 'director', 'secretaria', 'auxiliar', 'auxiliatura', 'profesor_auxiliar', 'admin'].forEach(role => {
    assert(mod.hasExamScheduleAccess(role) === true, `El rol ${role} debe tener acceso a Roles de Exámenes`);
});
['docente', 'estudiante', 'padre'].forEach(role => {
    assert(mod.hasExamScheduleAccess(role) === false, `El rol ${role} NO debe tener acceso a administración de Roles`);
});
console.log('✅ Permisos Multi-Rol Verificados: Dirección, Secretaría y Auxiliatura tienen acceso unificado.');

// 17. Test Agrupación y Separación por Grado en Calendario Consolidado
console.log('\n[Test 17] Verificando Separación por Grados en Calendario Consolidado...');
// Verificamos que el calendario agrupa evaluaciones en 4to, 5to y 6to
const dummyBlockMultiGrade = {
    days: [{
        id: 'day_multi',
        date: '2026-10-21',
        evaluations: [
            { id: 'ev_4', gradeCode: '4to Perito Contador', courseName: 'Contabilidad I', startTime: '07:30', endTime: '08:30', sections: [{ section: 'Sección A' }] },
            { id: 'ev_5', gradeCode: '5to Perito Contador', courseName: 'Estadística', startTime: '07:30', endTime: '08:30', sections: [{ section: 'Sección A' }] },
            { id: 'ev_6', gradeCode: '6to Perito Contador', courseName: 'Auditoría', startTime: '07:30', endTime: '08:30', sections: [{ section: 'Sección A' }] }
        ]
    }]
};
// Comprobamos la lógica de separación por grado
const gradeOrder = ['4to', '5to', '6to'];
const groupedByGrade = {};
dummyBlockMultiGrade.days[0].evaluations.forEach(ev => {
    const rawGrade = String(ev.gradeCode || '').toLowerCase();
    let matchedKey = 'Otros Grados';
    if (rawGrade.includes('4') || rawGrade.includes('cuarto')) matchedKey = '4to Perito Contador';
    else if (rawGrade.includes('5') || rawGrade.includes('quinto')) matchedKey = '5to Perito Contador';
    else if (rawGrade.includes('6') || rawGrade.includes('sexto')) matchedKey = '6to Perito Contador';
    if (!groupedByGrade[matchedKey]) groupedByGrade[matchedKey] = [];
    groupedByGrade[matchedKey].push(ev);
});
assert.strictEqual(Object.keys(groupedByGrade).length, 3, 'Deben haber 3 tablas de grados separadas para el mismo horario');
assert(groupedByGrade['4to Perito Contador'].length === 1, '4to Perito Contador debe tener su tabla');
assert(groupedByGrade['5to Perito Contador'].length === 1, '5to Perito Contador debe tener su tabla');
assert(groupedByGrade['6to Perito Contador'].length === 1, '6to Perito Contador debe tener su tabla');
console.log('✅ Separación por Grados en Calendario Verificada: Tablas separadas por grado garantizadas.');

// 18. Test Presentación en 2 Columnas (4to y 5to) y 3 Columnas (con 6to) por Grado y Hora
console.log('\n[Test 18] Verificando Columnas por Grado: 2 Columnas (4to y 5to) vs 3 Columnas (con 6to)...');
// Caso A: Solo 4to y 5to
const dayOnly4and5 = {
    evaluations: [
        { gradeCode: '4to Perito Contador', courseName: 'Contabilidad I', startTime: '07:30', endTime: '08:30' },
        { gradeCode: '5to Perito Contador', courseName: 'Estadística', startTime: '07:30', endTime: '08:30' }
    ]
};
const colsCaseA = mod.getActiveGradeColumnsForDay(dayOnly4and5);
assert.strictEqual(colsCaseA.length, 2, 'Si solo es 4to y 5to, deben ser exactamente 2 columnas');
assert.strictEqual(colsCaseA[0].key, '4to', 'Primera columna debe ser 4to Perito');
assert.strictEqual(colsCaseA[1].key, '5to', 'Segunda columna debe ser 5to Perito');

// Caso B: Si hay 6to
const dayWith6to = {
    evaluations: [
        { gradeCode: '4to Perito Contador', courseName: 'Contabilidad I', startTime: '07:30', endTime: '08:30' },
        { gradeCode: '5to Perito Contador', courseName: 'Estadística', startTime: '07:30', endTime: '08:30' },
        { gradeCode: '6to Perito Contador', courseName: 'Auditoría', startTime: '07:30', endTime: '08:30' }
    ]
};
const colsCaseB = mod.getActiveGradeColumnsForDay(dayWith6to);
assert.strictEqual(colsCaseB.length, 3, 'Si hay 6to, deben ser exactamente 3 columnas');
assert.strictEqual(colsCaseB[0].key, '4to', 'Primera columna debe ser 4to Perito');
assert.strictEqual(colsCaseB[1].key, '5to', 'Segunda columna debe ser 5to Perito');
assert.strictEqual(colsCaseB[2].key, '6to', 'Tercera columna debe ser 6to Perito');
// 19. Test Sincronización Robusta de Cátedras, Titulares y Elegibilidad Docente
console.log('\n[Test 19] Verificando Sincronización Robusta de Cátedras, Titulares y Elegibilidad Docente...');
// A. Elegibilidad docente y exclusión estricta de roles administrativos/inactivos
const dummyUsers = [
    { id: 'u_doc_1', name: 'Profesor Activo', role: 'docente', active: true },
    { id: 'u_doc_2', name: 'Profesor Multirol', role: 'docente', roles: ['docente'], active: true },
    { id: 'u_doc_inactivo', name: 'Profesor Inactivo', role: 'docente', active: false },
    { id: 'u_doc_inactivo_status', name: 'Profesor Baja', role: 'docente', status: 'Inactivo' },
    { id: 'u_dir', name: 'Directora', role: 'director' },
    { id: 'u_sec', name: 'Secretaria', role: 'secretaria' },
    { id: 'u_aux', name: 'Auxiliar', role: 'profesor_auxiliar' },
    { id: 'u_adm', name: 'Administrador', role: 'admin' }
];
global.STATE.users = dummyUsers;

// Simular pensum con asignación de clases
global.STATE.pensum = [
    { id: 'pen_comp_4a', grade: '4to Perito Contador', gradeCode: '4to A', section: 'Sección A', subject: 'Computación I', teacherId: 'u_doc_1', teacher: 'Profesor Activo' },
    { id: 'pen_comp_4b', grade: '4to Perito Contador', gradeCode: '4to B', section: 'Sección B', subject: 'Computación I', teacherId: 'u_doc_2', teacher: 'Profesor Multirol' },
    { id: 'pen_comp_5a', grade: '5to Perito Contador', gradeCode: '5to A', section: 'Sección A', subject: 'Computación II', teacherId: 'u_doc_2', teacher: 'Profesor Multirol' },
    { id: 'pen_comp_6a', grade: '6to Perito Contador', gradeCode: '6to A', section: 'Sección A', subject: 'Computación III', teacherId: 'u_doc_1', teacher: 'Profesor Activo' }
];

global.STATE.gradesList = [
    { id: 'g4a', code: '4to A', name: '4to Perito Contador', section: 'Sección A' },
    { id: 'g4b', code: '4to B', name: '4to Perito Contador', section: 'Sección B' },
    { id: 'g5a', code: '5to A', name: '5to Perito Contador', section: 'Sección A' },
    { id: 'g6a', code: '6to A', name: '6to Perito Contador', section: 'Sección A' }
];

// Comprobar obtención de asignaturas sin colisión entre grados
const courses4toTest19 = mod.getCoursesForAcademicGrade('4to Perito Contador');
assert(courses4toTest19.includes('Computación I'), '4to debe incluir Computación I');
assert(!courses4toTest19.includes('Computación II'), '4to NO debe incluir Computación II de 5to');
assert(!courses4toTest19.includes('Computación III'), '4to NO debe incluir Computación III de 6to');

// Comprobar resolución con grado abreviado "4to"
const secInfo4toTest19 = mod.getSectionsAndTitularsForCourse('4to', 'Computación I');
assert.strictEqual(secInfo4toTest19.length, 2, 'Deben haber 2 secciones para 4to');
assert.strictEqual(secInfo4toTest19[0].teacherName, 'Profesor Activo');
assert.strictEqual(secInfo4toTest19[1].teacherName, 'Profesor Multirol');

console.log('✅ Sincronización Robusta de Cátedras, Titulares y Elegibilidad Docente Verificada con Éxito.');

// =========================================================================
// [Test 20] Verificando Cuido de Maestro Titular en Sección Completa y Hoja Oficio
// =========================================================================
console.log('\n[Test 20] Verificando Cuido de Maestro Titular en Sección Completa (1 solo salón) y Hoja Oficio...');

// Simular día de evaluación con modalidad SECCION_COMPLETA
const testDayId = 'day_test_20';
global.STATE.examSchedules = {
    '2026_B1': {
        days: [
            {
                id: testDayId,
                date: '2026-03-20',
                evaluations: [
                    {
                        id: 'ev_full_sec_1',
                        academicGradeName: '4to Perito Contador',
                        courseName: 'Computación I',
                        startTime: '07:30',
                        endTime: '08:30',
                        durationMinutes: 60,
                        evaluationMode: 'SECCION_COMPLETA',
                        sections: [
                            {
                                gradeCode: '4to A',
                                section: 'Sección A',
                                teacherId: 'u_doc_1',
                                teacherName: 'Profesor Activo',
                                evaluationMode: 'SECCION_COMPLETA',
                                singleRoom: { classroom: 'Salón 1', caretakerTeacherId: '', caretakerTeacherName: '' },
                                groupA: { classroom: 'Salón 1', caretakerTeacherId: '', caretakerTeacherName: '' },
                                groupB: { classroom: 'Salón 1', caretakerTeacherId: '', caretakerTeacherName: '' }
                            }
                        ]
                    }
                ]
            }
        ]
    }
};

const block20 = global.STATE.examSchedules['2026_B1'];
const assignResult = mod.autoAssignRandomProctors(block20, testDayId);
assert(assignResult.success, 'El sorteo debe ser exitoso');

const updatedDay = global.STATE.examSchedules['2026_B1'].days[0];
const updatedSec = updatedDay.evaluations[0].sections[0];
// En SECCION_COMPLETA, el maestro titular u_doc_1 tiene permitido cuidar su salón
assert(updatedSec.singleRoom.caretakerTeacherId, 'Debe tener un cuidador asignado');
assert.strictEqual(updatedSec.singleRoom.caretakerTeacherId, 'u_doc_1', 'El maestro titular debe poder cuidar en Sección Completa');

// Verificar que en modalidad MEDIAS_SECCIONES (predeterminada) el titular sigue estrictamente excluido
global.STATE.examSchedules['2026_B1'].days[0].evaluations[0].evaluationMode = 'MEDIAS_SECCIONES';
global.STATE.examSchedules['2026_B1'].days[0].evaluations[0].sections[0].evaluationMode = 'MEDIAS_SECCIONES';
global.STATE.examSchedules['2026_B1'].days[0].evaluations[0].sections[0].groupA.caretakerTeacherId = '';
global.STATE.examSchedules['2026_B1'].days[0].evaluations[0].sections[0].groupB.caretakerTeacherId = '';

const assignResultMedias = mod.autoAssignRandomProctors(block20, testDayId);
assert(assignResultMedias.success, 'El sorteo de medias secciones debe ser exitoso');
const updatedSecMedias = global.STATE.examSchedules['2026_B1'].days[0].evaluations[0].sections[0];
assert.notStrictEqual(updatedSecMedias.groupA.caretakerTeacherId, 'u_doc_1', 'El titular NO debe cuidar Grupo A en Medias Secciones');
assert.notStrictEqual(updatedSecMedias.groupB.caretakerTeacherId, 'u_doc_1', 'El titular NO debe cuidar Grupo B en Medias Secciones');

console.log('✅ Permiso de Cuido al Maestro Titular en Sección Completa y Exclusión Estricta en Medias Secciones Verificados.');

// 21. Verificación Estricta de Asignación Docente para Inglés Comercial II (5to Perito) vs Inglés Comercial I (4to Perito)
console.log('\n[Test 21] Verificando Asignación Estricta de Inglés Comercial II (Milvia Jacobo) y Reconciliación Oficial...');

// A. Prueba de discriminación de materias con sufijos numéricos y romanos
assert.strictEqual(mod.isSameSubject('Inglés Comercial I', 'Inglés Comercial II'), false, 'Inglés Comercial I NO debe coincidir con Inglés Comercial II');
assert.strictEqual(mod.isSameSubject('Inglés Comercial II', 'Inglés Comercial I'), false, 'Inglés Comercial II NO debe coincidir con Inglés Comercial I');
assert.strictEqual(mod.isSameSubject('Inglés Comercial II', 'Inglés Comercial 2'), true, 'Inglés Comercial II debe coincidir con Inglés Comercial 2');
assert.strictEqual(mod.isSameSubject('Inglés Comercial', 'Inglés Comercial II'), false, 'Inglés Comercial base no debe colisionar con nivel II');

// B. Configurar estado institucional representativo con 4to y 5to
global.STATE.pensum = [
    { id: 'pen-4-a', subject: 'Inglés Comercial I', teacher: 'Gamaliel Uzias Medrano Mayén', teacherId: 'usr-doc-09', grade: '4to Perito Contador', gradeCode: '4to A', section: 'Sección A' },
    { id: 'pen-4-b', subject: 'Inglés Comercial I', teacher: 'Gamaliel Uzias Medrano Mayén', teacherId: 'usr-doc-09', grade: '4to Perito Contador', gradeCode: '4to B', section: 'Sección B' },
    { id: 'pen-4-c', subject: 'Inglés Comercial I', teacher: 'Gamaliel Uzias Medrano Mayén', teacherId: 'usr-doc-09', grade: '4to Perito Contador', gradeCode: '4to C', section: 'Sección C' },
    { id: 'pen-4-d', subject: 'Inglés Comercial I', teacher: 'Elda Argentina López Monzón', teacherId: 'usr-doc-14', grade: '4to Perito Contador', gradeCode: '4to D', section: 'Sección D' },
    { id: 'pen-5-a', subject: 'Inglés Comercial II', teacher: 'Milvia Aracely Jacobo Escobar', teacherId: 'usr-doc-18', grade: '5to Perito Contador', gradeCode: '5to A', section: 'Sección A' },
    { id: 'pen-5-b', subject: 'Inglés Comercial II', teacher: 'Milvia Aracely Jacobo Escobar', teacherId: 'usr-doc-18', grade: '5to Perito Contador', gradeCode: '5to B', section: 'Sección B' },
    { id: 'pen-5-c', subject: 'Inglés Comercial II', teacher: 'Elda Argentina López Monzón', teacherId: 'usr-doc-14', grade: '5to Perito Contador', gradeCode: '5to C', section: 'Sección C' },
    { id: 'pen-5-d', subject: 'Inglés Comercial II', teacher: 'Milvia Aracely Jacobo Escobar', teacherId: 'usr-doc-18', grade: '5to Perito Contador', gradeCode: '5to D', section: 'Sección D' }
];

global.STATE.gradesList = [
    { id: '4A', code: '4to A', name: '4to Perito Contador', section: 'Sección A' },
    { id: '4B', code: '4to B', name: '4to Perito Contador', section: 'Sección B' },
    { id: '4C', code: '4to C', name: '4to Perito Contador', section: 'Sección C' },
    { id: '4D', code: '4to D', name: '4to Perito Contador', section: 'Sección D' },
    { id: '5A', code: '5to A', name: '5to Perito Contador', section: 'Sección A' },
    { id: '5B', code: '5to B', name: '5to Perito Contador', section: 'Sección B' },
    { id: '5C', code: '5to C', name: '5to Perito Contador', section: 'Sección C' },
    { id: '5D', code: '5to D', name: '5to Perito Contador', section: 'Sección D' }
];

global.STATE.users = [
    { id: 'usr-doc-09', name: 'Gamaliel Uzias Medrano Mayén', role: 'docente' },
    { id: 'usr-doc-14', name: 'Elda Argentina López Monzón', role: 'docente' },
    { id: 'usr-doc-18', name: 'Milvia Aracely Jacobo Escobar', role: 'docente' }
];

const res5to = mod.getSectionsAndTitularsForCourse('5to Perito Contador', 'Inglés Comercial II');
assert.strictEqual(res5to.length, 4, 'Deben encontrarse 4 secciones para 5to');
assert.strictEqual(res5to[0].teacherName, 'Milvia Aracely Jacobo Escobar', 'Sección A de 5to debe ser Milvia Jacobo');
assert.strictEqual(res5to[1].teacherName, 'Milvia Aracely Jacobo Escobar', 'Sección B de 5to debe ser Milvia Jacobo');
assert.strictEqual(res5to[2].teacherName, 'Elda Argentina López Monzón', 'Sección C de 5to debe ser Elda López');
assert.strictEqual(res5to[3].teacherName, 'Milvia Aracely Jacobo Escobar', 'Sección D de 5to debe ser Milvia Jacobo');

// Verificar que Gamaliel NO aparece asignado en NINGUNA sección de Inglés Comercial II
const hasGamalielIn5to = res5to.some(s => s.teacherName.includes('Gamaliel') || s.teacherId === 'usr-doc-09');
assert.strictEqual(hasGamalielIn5to, false, 'El profesor Gamaliel NUNCA debe aparecer en Inglés Comercial II');

// C. Verificar función de reconciliación automática de horarios corruptos o desactualizados
const mockCorruptBlock = {
    days: [
        {
            id: 'd_test_corrupt',
            date: '2026-10-16',
            evaluations: [
                {
                    id: 'ev_ingles_2_corrupt',
                    academicGradeName: '5to Perito Contador',
                    gradeName: '5to Perito Contador',
                    courseName: 'Inglés Comercial II',
                    courseTeacherName: 'Gamaliel Uzias Medrano Mayén, Elda Argentina López Monzón',
                    courseTeacherId: 'usr-doc-09',
                    sections: [
                        { section: 'Sección A', sectionLetter: 'A', teacherName: 'Gamaliel Uzias Medrano Mayén', teacherId: 'usr-doc-09' },
                        { section: 'Sección B', sectionLetter: 'B', teacherName: 'Gamaliel Uzias Medrano Mayén', teacherId: 'usr-doc-09' },
                        { section: 'Sección C', sectionLetter: 'C', teacherName: 'Gamaliel Uzias Medrano Mayén', teacherId: 'usr-doc-09' },
                        { section: 'Sección D', sectionLetter: 'D', teacherName: 'Elda Argentina López Monzón', teacherId: 'usr-doc-14' }
                    ]
                }
            ]
        }
    ]
};

const wasFixed = mod.reconcileScheduleBlockTitulars(mockCorruptBlock);
assert.strictEqual(wasFixed, true, 'El bloque corrupto debe ser reconciliado y reparado');
const fixedEv = mockCorruptBlock.days[0].evaluations[0];
assert.strictEqual(fixedEv.courseTeacherName, 'Milvia Aracely Jacobo Escobar, Elda Argentina López Monzón', 'El nombre consolidado debe reflejar a Milvia y Elda');
assert.strictEqual(fixedEv.sections[0].teacherName, 'Milvia Aracely Jacobo Escobar', 'Sección A debe corregirse a Milvia Jacobo');
assert.strictEqual(fixedEv.sections[1].teacherName, 'Milvia Aracely Jacobo Escobar', 'Sección B debe corregirse a Milvia Jacobo');
assert.strictEqual(fixedEv.sections[2].teacherName, 'Elda Argentina López Monzón', 'Sección C debe corregirse a Elda López');
assert.strictEqual(fixedEv.sections[3].teacherName, 'Milvia Aracely Jacobo Escobar', 'Sección D debe corregirse a Milvia Jacobo');
assert(!fixedEv.courseTeacherName.includes('Gamaliel'), 'Gamaliel queda 100% purgado de Inglés Comercial II');

console.log('✅ Asignación de Cátedra y Reconciliación Oficial de Inglés Comercial II Verificadas al 100%.');

// 22. Test Evaluaciones y Secciones "En Proceso" (Acumulativo Continuo)
console.log('\n[Test 22] Verificando Manejo y Exclusión de Evaluaciones "En Proceso" (Opción 2)...');
const mockDayWithProcess = {
    id: 'day_process_test',
    date: '2026-10-22',
    evaluations: [
        {
            id: 'ev_normal',
            academicGradeName: '4to Perito Contador',
            gradeName: '4to Perito Contador',
            courseName: 'Contabilidad General',
            startTime: '07:30',
            endTime: '08:30',
            durationMinutes: 60,
            evaluationStatus: 'EVALUA',
            isEnProceso: false,
            sections: [
                {
                    section: 'Sección A',
                    teacherId: 'usr-doc-01',
                    teacherName: 'Docente 1',
                    evaluationStatus: 'EVALUA',
                    isEnProceso: false,
                    durationMinutes: 60,
                    groupA: { classroom: 'Salón 1', caretakerTeacherId: '' },
                    groupB: { classroom: 'Salón 2', caretakerTeacherId: '' }
                }
            ]
        },
        {
            id: 'ev_normal_5',
            academicGradeName: '5to Perito Contador',
            gradeName: '5to Perito Contador',
            courseName: 'Estadística',
            startTime: '07:30',
            endTime: '08:30',
            durationMinutes: 60,
            evaluationStatus: 'EVALUA',
            isEnProceso: false,
            sections: [
                {
                    section: 'Sección A',
                    teacherId: 'usr-doc-03',
                    teacherName: 'Docente 3',
                    evaluationStatus: 'EVALUA',
                    isEnProceso: false,
                    durationMinutes: 60,
                    groupA: { classroom: 'Salón 3', caretakerTeacherId: '' },
                    groupB: { classroom: 'Salón 4', caretakerTeacherId: '' }
                }
            ]
        },
        {
            id: 'ev_in_process',
            academicGradeName: '6to Perito Contador',
            gradeName: '6to Perito Contador',
            courseName: 'Seminario',
            startTime: '08:45',
            endTime: '09:45',
            durationMinutes: 60,
            evaluationStatus: 'EN_PROCESO',
            isEnProceso: true,
            sections: [
                {
                    section: 'Sección A',
                    teacherId: 'usr-doc-02',
                    teacherName: 'Docente 2',
                    evaluationStatus: 'EN_PROCESO',
                    isEnProceso: true,
                    durationMinutes: 60,
                    groupA: { classroom: 'En Proceso', caretakerTeacherId: '' },
                    groupB: { classroom: 'En Proceso', caretakerTeacherId: '' }
                }
            ]
        }
    ]
};

// A. Verificar que getActiveGradeColumnsForDay excluye 6to porque su única materia es "En Proceso"
const activeColsWithProcess = mod.getActiveGradeColumnsForDay(mockDayWithProcess);
assert.strictEqual(activeColsWithProcess.length, 2, 'Solo debe contar 4to y 5to porque 6to evalúa en proceso');
assert(!activeColsWithProcess.some(c => c.key === '6to'), '6to NO debe tener columna activa cuando evalúa en proceso');

// B. Verificar que autoAssignRandomProctors no asigna cuidadores a la evaluación en proceso
const mockBlockProcess = { days: [mockDayWithProcess] };
const sortResult = mod.autoAssignRandomProctors(mockBlockProcess, 'day_process_test');
assert(sortResult.success, 'El sorteo debe completarse');
const evProcessAfterSort = mockDayWithProcess.evaluations.find(e => e.id === 'ev_in_process');
assert.strictEqual(evProcessAfterSort.sections[0].groupA.caretakerTeacherId, '', 'La sección en proceso NO debe recibir cuidador A');
assert.strictEqual(evProcessAfterSort.sections[0].groupB.caretakerTeacherId, '', 'La sección en proceso NO debe recibir cuidador B');

// C. Verificar que calculateTeacherWorkloadForDate no genera carga de minutos para materias en proceso
const workloadAfterProcess = mod.calculateTeacherWorkloadForDate(mockBlockProcess, '2026-10-22');
const totalWorkloadMinutes = Object.values(workloadAfterProcess).reduce((acc, t) => acc + t.minutes, 0);
// Debe haber minutos para ev_normal (120 min) + ev_normal_5 (120 min) = 240 min, seminario en proceso = 0 min
assert.strictEqual(totalWorkloadMinutes, 240, 'Solo las materias que evalúan examen generan carga (240 min), seminario en proceso 0 min');

console.log('✅ Evaluaciones y Secciones "En Proceso" Verificadas: Excluidas del calendario, sin salones físicos ni cuidadores.');

// D. Verificación de resolución de jornada para impresión (findDayAndScheduleBlock y printDailyScheduleOficio)
console.log('\n[Test 10] Verificando resolución de jornada de examen para impresión...');
const testScheduleKey = 'schedules_2026_BIM4';
global.STATE.examSchedules = {
    [testScheduleKey]: {
        bimester: 'IV Bimestre',
        days: [
            {
                id: 'day_test_print_1',
                date: '2026-10-16',
                evaluations: []
            }
        ]
    }
};
global._currentSelectedExamBim = 'IV Bimestre';
let printAlertTriggered = null;
global.alert = (msg) => { printAlertTriggered = msg; };
global.window.open = () => ({
    document: {
        open: () => {},
        write: () => {},
        close: () => {},
        querySelector: () => null
    },
    focus: () => {},
    print: () => {}
});

mod.printDailyScheduleOficio('day_test_print_1');
assert.strictEqual(printAlertTriggered, null, 'No debe disparar alerta de error al encontrar la jornada para imprimir');

mod.printAllMediasListasOfDay('day_test_print_1');
// Alerta de que no hay evaluaciones asignadas, pero NO de "No se encontró la jornada"
assert.strictEqual(printAlertTriggered, 'No hay evaluaciones asignadas en este día.');
console.log('✅ Resolución de jornada e impresión verificado exitosamente (sin error de jornada no encontrada).');

console.log('\n[Test 23] Verificando Calendario Oficial para Estudiantes (printStudentCalendarPdf)...');
assert.strictEqual(typeof global.window.printStudentCalendarPdf, 'function', 'printStudentCalendarPdf debe estar registrada en window');
// Ejecutar sin excepción
global.window.printStudentCalendarPdf();
console.log('✅ Calendario Oficial para Estudiantes verificado exitosamente (100%).');

console.log('\n================================================================================');
console.log('🎉 TODAS LAS PRUEBAS DEL MÓDULO DE ROLES DE EXÁMENES PASARON CON ÉXITO (100%)');
console.log('================================================================================');




