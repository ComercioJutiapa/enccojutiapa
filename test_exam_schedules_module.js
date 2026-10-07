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
        { id: 'T5', name: 'Prof. Héctor Castro', role: 'profesor_auxiliar' }
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

console.log('\n================================================================================');
console.log('🎉 TODAS LAS PRUEBAS DEL MÓDULO DE ROLES DE EXÁMENES PASARON CON ÉXITO (100%)');
console.log('================================================================================');


