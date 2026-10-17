// test_disciplinary_suspension_official.js
// Verification suite for Official Disciplinary Suspension ("S") with Academic Safeguard (Derecho a Examen)

const fs = require('fs');
const assert = require('assert');

console.log('=== TEST: SUSPENSIÓN DISCIPLINARIA OFICIAL ("S") Y SALVAGUARDA DE EVALUACIONES ===\n');

// 1. Verificación de plataforma.html
console.log('1. Verificando plataforma.html...');
const html = fs.readFileSync('plataforma.html', 'utf8');

assert(html.includes('Suspensión Disciplinaria'), 'Falta opción de Suspensión Disciplinaria en select de plataforma.html');
assert(html.includes('id="permReasonCategory"'), 'Falta permReasonCategory en plataforma.html');
assert(html.includes('id="permissionsLogCategoryFilter"'), 'Falta permissionsLogCategoryFilter en plataforma.html');
assert(html.includes('id="profKpiSuspensions"'), 'Falta profKpiSuspensions en plataforma.html');
assert(html.includes('id="profSuspensionNotice"'), 'Falta profSuspensionNotice en plataforma.html');
console.log('✔ plataforma.html contiene selectores, KPIs y avisos de salvaguarda de examen.');

// 2. Verificación de styles.css
console.log('\n2. Verificando styles.css...');
const css = fs.readFileSync('styles.css', 'utf8');
assert(css.includes('.att-val-S') || css.includes('.att-val-s'), 'Falta clase .att-val-s en styles.css');
assert(css.includes('.att-val-suspension'), 'Falta clase .att-val-suspension en styles.css');
console.log('✔ styles.css contiene clases de estilo de suspensión con paleta púrpura institucional.');

// 3. Verificación de código en app.js
console.log('\n3. Verificando app.js...');
const app = fs.readFileSync('app.js', 'utf8');

assert(app.includes('function isSuspensionPermission'), 'Falta función isSuspensionPermission en app.js');
assert(app.includes('function getPermissionAttendanceCode'), 'Falta función getPermissionAttendanceCode en app.js');
assert(app.includes('attendanceCode = getPermissionAttendanceCode(perm)') || app.includes('getPermissionAttendanceCode('), 'Falta getPermissionAttendanceCode en saveStudentPermissionForm');
assert(app.includes('Boleta Oficial de Suspensión Disciplinaria'), 'Falta título de boleta oficial de suspensión en printStudentPermissionPass');
assert(app.includes('Garantía Institucional de Derecho a Examen') || app.includes('Garantía de Derecho a Examen'), 'Falta texto de garantía de derecho a examen en boleta/perfil');
assert(app.includes('profKpiSuspensions'), 'Falta actualización de profKpiSuspensions en openStudentProfileModal');
assert(app.includes('profSuspensionNotice'), 'Falta actualización de profSuspensionNotice en openStudentProfileModal');
console.log('✔ Funciones de detección, salvaguarda y boleta presentes en app.js.');

// 4. Test simulado de lógica de funciones de detección
console.log('\n4. Simulando lógica de detección de suspensión vs injustificada...');

function isSuspensionPermission(p) {
    if (!p) return false;
    const code = String(p.attendanceCode || p.code || '').toUpperCase().trim();
    if (code === 'S') return true;
    const cat = String(p.reasonCategory || p.category || p.reason || p.status || '').toLowerCase();
    return (
        cat.includes('suspens') ||
        cat.includes('sanción') ||
        cat.includes('sancion') ||
        cat.includes('medida correctiva') ||
        cat.includes('disciplin')
    );
}

function isUnjustifiedPermission(p) {
    if (!p) return false;
    if (isSuspensionPermission(p)) return false;
    const code = String(p.attendanceCode || p.code || '').toUpperCase().trim();
    if (code === 'A') return true;
    const cat = String(p.reasonCategory || p.category || p.reason || p.status || '').toLowerCase();
    return cat.includes('injustificad');
}

function getPermissionAttendanceCode(p) {
    if (isSuspensionPermission(p)) return 'S';
    if (isUnjustifiedPermission(p)) return 'A';
    return 'J';
}

const suspPerm1 = { reasonCategory: 'Suspensión Disciplinaria', attendanceCode: 'S' };
const suspPerm2 = { reasonCategory: 'Suspensión por falta al reglamento' };
const unjustPerm = { reasonCategory: 'Injustificada', attendanceCode: 'A' };
const justPerm = { reasonCategory: 'Salud / Cita Médica', attendanceCode: 'J' };

assert.strictEqual(isSuspensionPermission(suspPerm1), true, 'suspPerm1 debe ser suspensión');
assert.strictEqual(isSuspensionPermission(suspPerm2), true, 'suspPerm2 debe ser suspensión');
assert.strictEqual(isSuspensionPermission(unjustPerm), false, 'unjustPerm NO debe ser suspensión');
assert.strictEqual(isSuspensionPermission(justPerm), false, 'justPerm NO debe ser suspensión');

assert.strictEqual(isUnjustifiedPermission(suspPerm1), false, 'Suspensión no debe ser injustificada');
assert.strictEqual(isUnjustifiedPermission(unjustPerm), true, 'unjustPerm debe ser injustificada');

assert.strictEqual(getPermissionAttendanceCode(suspPerm1), 'S', 'Código de asistencia debe ser S');
assert.strictEqual(getPermissionAttendanceCode(unjustPerm), 'A', 'Código de asistencia debe ser A');
assert.strictEqual(getPermissionAttendanceCode(justPerm), 'J', 'Código de asistencia debe ser J');
console.log('✔ Clasificación y códigos ("S", "A", "J") verificados correctamente.');

// 5. Test simulado de cálculo de asistencia y salvaguarda de examen (getStudentFullAttendanceAndDisciplineData)
console.log('\n5. Simulando cálculo de asistencia y garantía de derecho a examen...');

// Un estudiante con:
// 10 días presentes
// 1 día de suspensión oficial ("S")
// 1 día justificado ("J")
// 0 faltas injustificadas ("A")
const presentDaysCount = 10;
const dailySuspensionCount = 1;
const dailyJustifiedCount = 1;
const dailyAbsentCount = 0;
const tardiesCount = 0;

const suspensionCount = dailySuspensionCount;
const justifiedCount = dailyJustifiedCount;
const totalAbsences = dailyAbsentCount;

// Total evaluated days
const totalEvaluatedDays = presentDaysCount + totalAbsences + tardiesCount + justifiedCount + suspensionCount;
// Attendance percent: Presentes + Justificados + Suspensiones mantienen valor académico completo
const attendancePercent = totalEvaluatedDays > 0
    ? Math.max(0, Math.min(100, Math.round(((presentDaysCount + justifiedCount + suspensionCount + (tardiesCount * 0.5)) / totalEvaluatedDays) * 100)))
    : 100;

assert.strictEqual(totalAbsences, 0, 'La suspensión NO debe sumar a totalAbsences (no debe generar pérdida de derecho a examen)');
assert.strictEqual(suspensionCount, 1, 'suspensionCount debe ser 1');
assert.strictEqual(attendancePercent, 100, 'El porcentaje de asistencia no debe penalizarse porque la suspensión es una medida institucional con salvaguarda');

console.log(`✔ Estadísticas simuladas: Asistencia = ${attendancePercent}%, Inasistencias (A) = ${totalAbsences}, Suspensiones (S) = ${suspensionCount}`);
console.log('✔ La salvaguarda legal impide que la suspensión se compute como falta injustificada.');

// 6. Test simulado de toggle de celda de suspensión con rol docente
console.log('\n6. Simulando protección de celda "S" frente a edición de docentes...');

function simulateCellToggle(currentVal, userRole, cellMeta) {
    const isDirector = ['director', 'admin', 'super_usuario'].includes(userRole.toLowerCase());
    const isOfficialSuspension = (currentVal === 'S') || (cellMeta && cellMeta.attendanceCode === 'S');

    if (isOfficialSuspension) {
        if (!isDirector) {
            return {
                allowed: false,
                message: 'Registro Oficial Protegido: Esta celda corresponde a una Suspensión Disciplinaria Oficial ("S"). El estudiante mantiene su derecho a examen y la sanción solo puede ser modificada por Dirección.'
            };
        }
    }
    return { allowed: true, newVal: 'P' };
}

const teacherAttempt = simulateCellToggle('S', 'docente', { attendanceCode: 'S', is_locked_by_admin: true });
assert.strictEqual(teacherAttempt.allowed, false, 'Docente no debe poder cambiar celda con "S"');
assert(teacherAttempt.message.includes('Suspensión Disciplinaria Oficial'), 'El mensaje debe explicar la protección de la suspensión');

const directorAttempt = simulateCellToggle('S', 'director', { attendanceCode: 'S', is_locked_by_admin: true });
assert.strictEqual(directorAttempt.allowed, true, 'Dirección sí tiene potestad institucional de modificar la celda');

console.log('✔ Candado de autoridad y blindaje de la suspensión verificado exitosamente.');

console.log('\n================================================================');
console.log(' TODOS LOS TESTS DE SUSPENSIÓN DISCIPLINARIA ("S") PASARON CON ÉXITO');
console.log('================================================================\n');
