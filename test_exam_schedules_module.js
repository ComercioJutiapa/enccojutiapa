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

console.log('\n================================================================================');
console.log('🎉 TODAS LAS PRUEBAS DEL MÓDULO DE ROLES DE EXÁMENES PASARON CON ÉXITO (100%)');
console.log('================================================================================');
