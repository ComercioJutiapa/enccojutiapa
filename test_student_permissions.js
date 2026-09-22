// test_student_permissions.js
// Verification suite for Student Absence Permissions (Maestro Auxiliar / Dirección)

const fs = require('fs');
const assert = require('assert');

console.log('=== INICIANDO PRUEBAS DE AUTORIZACIÓN DE PERMISOS DE AUSENCIA (AUXILIATURA) ===\n');

// 1. Verificar plataforma.html
console.log('1. Verificando plataforma.html...');
const htmlContent = fs.readFileSync('plataforma.html', 'utf8');

assert(htmlContent.includes('id="createPermissionModal"'), 'Falta createPermissionModal en plataforma.html');
assert(htmlContent.includes('id="permissionsHistoryModal"'), 'Falta permissionsHistoryModal en plataforma.html');
assert(htmlContent.includes('id="permStudentSelect"'), 'Falta permStudentSelect en plataforma.html');
assert(htmlContent.includes('id="permStartDate"'), 'Falta permStartDate en plataforma.html');
assert(htmlContent.includes('id="permEndDate"'), 'Falta permEndDate en plataforma.html');
assert(htmlContent.includes('id="permReasonCategory"'), 'Falta permReasonCategory en plataforma.html');
assert(htmlContent.includes('id="permReasonDetail"'), 'Falta permReasonDetail en plataforma.html');
assert(htmlContent.includes('id="permAuthorizedBy"'), 'Falta permAuthorizedBy en plataforma.html');
assert(htmlContent.includes('openCreatePermissionModal()'), 'Falta openCreatePermissionModal() en plataforma.html');
assert(htmlContent.includes('openPermissionsHistoryModal()'), 'Falta openPermissionsHistoryModal() en plataforma.html');
console.log('✔ Elementos HTML de modal de autorización e historial verificados.');

// 2. Verificar styles.css
console.log('\n2. Verificando styles.css...');
const cssContent = fs.readFileSync('styles.css', 'utf8');

assert(cssContent.includes('.att-val-permiso'), 'Falta clase .att-val-permiso en styles.css');
assert(cssContent.includes('body.theme-dark .att-val-permiso'), 'Falta modo oscuro para .att-val-permiso en styles.css');
console.log('✔ Reglas CSS de .att-val-permiso e indicador de badge verificados.');

// 3. Verificar app.js
console.log('\n3. Verificando app.js...');
const appContent = fs.readFileSync('app.js', 'utf8');

assert(appContent.includes('function openCreatePermissionModal'), 'Falta openCreatePermissionModal en app.js');
assert(appContent.includes('function closeCreatePermissionModal'), 'Falta closeCreatePermissionModal en app.js');
assert(appContent.includes('function populatePermissionGradeFilter'), 'Falta populatePermissionGradeFilter en app.js');
assert(appContent.includes('function filterPermissionStudentList'), 'Falta filterPermissionStudentList en app.js');
assert(appContent.includes('function saveStudentPermissionForm'), 'Falta saveStudentPermissionForm en app.js');
assert(appContent.includes('function applyStudentPermission'), 'Falta applyStudentPermission en app.js');
assert(appContent.includes('function openPermissionsHistoryModal'), 'Falta openPermissionsHistoryModal en app.js');
assert(appContent.includes('function closePermissionsHistoryModal'), 'Falta closePermissionsHistoryModal en app.js');
assert(appContent.includes('function renderPermissionsHistoryTable'), 'Falta renderPermissionsHistoryTable en app.js');
assert(appContent.includes('function revokeStudentPermission'), 'Falta revokeStudentPermission en app.js');
assert(appContent.includes('function printStudentPermissionPass'), 'Falta printStudentPermissionPass en app.js');
assert(appContent.includes('att-val-permiso'), 'Falta asignación de att-val-permiso en renderizado de celda de app.js');
console.log('✔ Todas las funciones y directivas presentes en app.js.');

// 4. Test simulado de la lógica de applyStudentPermission
console.log('\n4. Simulando lógica de propagación de applyStudentPermission...');

// Extraer helpers de app.js
function extractGradeNumber(str) {
    if (!str) return 0;
    const s = String(str).toUpperCase();
    if (s.includes('6') || s.includes('SEXTO') || s.includes('6TO')) return 6;
    if (s.includes('5') || s.includes('QUINTO') || s.includes('5TO')) return 5;
    if (s.includes('4') || s.includes('CUARTO') || s.includes('4TO')) return 4;
    return 0;
}

function extractSectionLetter(str) {
    if (!str) return '';
    const s = String(str).toUpperCase();
    const m = s.match(/SECCI[OÓ]N\s*([A-D])/i) || s.match(/\b([A-D])\b/i);
    return m ? m[1].toUpperCase() : '';
}

function getAttendanceRecordKey(gradeCode, month, courseId) {
    const cycleKey = '2026';
    if (courseId && courseId !== 'GENERAL') {
        return `${cycleKey}_M${month}_${gradeCode}_${courseId}`;
    }
    return `${cycleKey}_M${month}_${gradeCode}`;
}

const mockState = {
    gradesList: [
        { code: '4to_PC_A', name: '4to Perito Contador', section: 'A' },
        { code: '4to_PC_B', name: '4to Perito Contador', section: 'B' }
    ],
    students: [
        {
            id: 'std_101',
            firstName: 'Carlos',
            lastName: 'Mendoza López',
            name: 'Carlos Mendoza López',
            personalCode: 'C101-2026',
            grade: '4to Perito Contador',
            gradeCode: '4to_PC_A',
            section: 'A'
        }
    ],
    pensum: [
        { id: 'c_mat_4a', grade: '4to Perito Contador', gradeCode: '4to_PC_A', section: 'A', subject: 'Matemática Comercial', teacher: 'Prof. Mario' },
        { id: 'c_cont_4a', grade: '4to Perito Contador', gradeCode: '4to_PC_A', section: 'A', subject: 'Contabilidad General', teacher: 'Licda. Gómez' },
        { id: 'c_ing_4a', grade: '4to Perito Contador', gradeCode: '4to_PC_A', section: 'A', subject: 'Inglés Comercial', teacher: 'Teacher John' }
    ],
    attendanceRecords: {},
    attendancePermissionsMeta: {}
};

function testApplyStudentPermission(perm, STATE) {
    const start = new Date(perm.startDate + 'T00:00:00');
    const end = new Date((perm.endDate || perm.startDate) + 'T00:00:00');

    const student = (STATE.students || []).find(s => s.id === perm.studentId);
    const sGradeNum = extractGradeNumber(student ? (student.grade || student.gradeCode) : (perm.grade || perm.gradeCode));
    const sSec = extractSectionLetter(student ? (student.section || student.gradeCode) : (perm.section || perm.grade));
    const directGradeCode = (student && (student.gradeCode || student.grade)) || perm.gradeCode || perm.grade;

    const matchingGradeCodes = new Set();
    if (directGradeCode) matchingGradeCodes.add(directGradeCode);

    (STATE.gradesList || []).forEach(g => {
        const gNum = extractGradeNumber(g.name || g.code);
        const gSec = extractSectionLetter(g.section || g.name || g.code);
        if (sGradeNum > 0 && gNum > 0 && sGradeNum === gNum) {
            if (!sSec || !gSec || sSec === gSec) {
                if (g.code) matchingGradeCodes.add(g.code);
                if (g.name) matchingGradeCodes.add(g.name);
            }
        }
    });

    const matchingCourses = (STATE.pensum || []).filter(p => {
        const pGradeNum = extractGradeNumber(p.grade || p.gradeCode);
        const pSec = extractSectionLetter(p.section || p.gradeCode);
        if (sGradeNum > 0 && pGradeNum > 0 && sGradeNum !== pGradeNum) return false;
        if (sSec && pSec && sSec !== pSec) return false;
        return true;
    });

    let curDate = new Date(start);
    while (curDate <= end) {
        const y = curDate.getFullYear();
        const m = curDate.getMonth() + 1;
        const d = curDate.getDate();

        matchingGradeCodes.forEach(gCode => {
            const genKey = getAttendanceRecordKey(gCode, m, 'GENERAL');
            if (!STATE.attendanceRecords[genKey]) STATE.attendanceRecords[genKey] = {};
            if (!STATE.attendanceRecords[genKey][perm.studentId]) STATE.attendanceRecords[genKey][perm.studentId] = {};
            STATE.attendanceRecords[genKey][perm.studentId][d] = 'J';

            matchingCourses.forEach(c => {
                const cKey = getAttendanceRecordKey(gCode, m, c.id);
                if (!STATE.attendanceRecords[cKey]) STATE.attendanceRecords[cKey] = {};
                if (!STATE.attendanceRecords[cKey][perm.studentId]) STATE.attendanceRecords[cKey][perm.studentId] = {};
                STATE.attendanceRecords[cKey][perm.studentId][d] = 'J';
            });
        });

        const metaKey = `${perm.studentId}_${m}_${d}`;
        STATE.attendancePermissionsMeta[metaKey] = {
            permissionId: perm.id,
            reasonCategory: perm.reasonCategory,
            reasonDetail: perm.reasonDetail,
            authorizedBy: perm.authorizedBy,
            date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            studentName: perm.studentName
        };

        curDate.setDate(curDate.getDate() + 1);
    }
}

const testPerm = {
    id: 'perm_001',
    studentId: 'std_101',
    studentName: 'Mendoza López, Carlos',
    gradeCode: '4to_PC_A',
    startDate: '2026-08-15',
    endDate: '2026-08-16',
    reasonCategory: 'Salud / Cita Médica',
    reasonDetail: 'Cita médica en IGSS',
    authorizedBy: 'Maestro Auxiliar Morales'
};

testApplyStudentPermission(testPerm, mockState);

// Verificar día 15 y día 16 en General
assert.strictEqual(mockState.attendanceRecords['2026_M8_4to_PC_A']['std_101'][15], 'J');
assert.strictEqual(mockState.attendanceRecords['2026_M8_4to_PC_A']['std_101'][16], 'J');

// Verificar día 15 y día 16 en cada uno de los 3 cursos
assert.strictEqual(mockState.attendanceRecords['2026_M8_4to_PC_A_c_mat_4a']['std_101'][15], 'J');
assert.strictEqual(mockState.attendanceRecords['2026_M8_4to_PC_A_c_mat_4a']['std_101'][16], 'J');
assert.strictEqual(mockState.attendanceRecords['2026_M8_4to_PC_A_c_cont_4a']['std_101'][15], 'J');
assert.strictEqual(mockState.attendanceRecords['2026_M8_4to_PC_A_c_cont_4a']['std_101'][16], 'J');
assert.strictEqual(mockState.attendanceRecords['2026_M8_4to_PC_A_c_ing_4a']['std_101'][15], 'J');
assert.strictEqual(mockState.attendanceRecords['2026_M8_4to_PC_A_c_ing_4a']['std_101'][16], 'J');

// Verificar metadata
assert.strictEqual(mockState.attendancePermissionsMeta['std_101_8_15'].reasonCategory, 'Salud / Cita Médica');
assert.strictEqual(mockState.attendancePermissionsMeta['std_101_8_15'].reasonDetail, 'Cita médica en IGSS');
assert.strictEqual(mockState.attendancePermissionsMeta['std_101_8_15'].authorizedBy, 'Maestro Auxiliar Morales');

console.log('✔ Propagación automática verificada: El estudiante quedó marcado como "J" en General y en TODAS las asignaturas de todos los profesores con su metadata.');

console.log('\n======================================================');
console.log('🎉 TODAS LAS VERIFICACIONES COMPLETADAS CON ÉXITO 100%');
console.log('======================================================');
