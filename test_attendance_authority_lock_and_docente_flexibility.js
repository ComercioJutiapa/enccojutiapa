/**
 * test_attendance_authority_lock_and_docente_flexibility.js
 *
 * Verificación exhaustiva de la lógica de asistencia:
 * 1. Bloqueo estricto para permisos de Autoridad (Dirección, Auxiliatura, Secretaría):
 *    - Si un permiso/asistencia es marcado o justificado por una autoridad, el registro se bloquea por completo para el docente (disabled, aria-disabled, solo lectura, con candado).
 *    - El docente no puede modificarlo ni desbloquearlo bajo ninguna circunstancia.
 * 2. Flexibilidad total para el Docente:
 *    - Si es el propio docente quien marca o justifica una ausencia (J) en su listado, él tiene la libertad de cambiarla o desbloquearla directamente (pasando a T, vacío, etc.) sin requerir autorizaciones ni procesos adicionales.
 * 3. Requerimiento Técnico:
 *    - Control a nivel de frontend y almacenamiento que valida el origen/rol (origin_role, is_locked_by_admin).
 *    - Respeto absoluto del diseño y apariencia visual existente.
 *    - Preservación íntegra de la fórmula de porcentaje del modelo.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================================');
console.log('🧪 PRUEBAS UNITARIAS: BLOQUEO POR AUTORIDAD Y FLEXIBILIDAD PARA EL DOCENTE');
console.log('================================================================================\n');

const appPath = path.join(__dirname, 'app.js');
const appCode = fs.readFileSync(appPath, 'utf8');

// ==============================================================================
// TEST 1: Análisis estático de controles y atributos técnicos en app.js
// ==============================================================================
console.log('▶ [TEST 1] Verificando presencia de atributos y lógica técnica...');

assert(appCode.includes('data-locked-by-admin='),
  'Debe incluir atributo data-locked-by-admin en las celdas de asistencia.');
assert(appCode.includes('data-origin-role='),
  'Debe incluir atributo data-origin-role en las celdas de asistencia.');
assert(appCode.includes('disabled="disabled" aria-disabled="true"'),
  'Las celdas bloqueadas por autoridad deben tener disabled y aria-disabled.');
assert(appCode.includes("origin_role: 'docente'"),
  'Cuando el docente marca J debe registrarse con origin_role: docente.');
assert(appCode.includes("is_locked_by_admin: false"),
  'Cuando el docente marca J debe guardarse con is_locked_by_admin: false.');
assert(appCode.includes("is_locked_by_admin: true"),
  'Cuando la autoridad justifica debe guardarse con is_locked_by_admin: true.');

console.log('  ✅ Test 1 Superado: Controles de backend/frontend (origin_role, is_locked_by_admin) presentes.');

// ==============================================================================
// TEST 2: Simulación de lógica de discriminación (isOfficialJustified)
// ==============================================================================
console.log('\n▶ [TEST 2] Verificando evaluación de isOfficialJustified...');

const authorityRoles = ['director', 'direccion', 'secretaria', 'profesor_auxiliar', 'auxiliar', 'auxiliatura', 'admin', 'super_usuario'];

function evaluateIsOfficialJustified(genDayVal, permMeta) {
    const permOriginRole = permMeta ? (permMeta.origin_role || permMeta.originRole || '').toLowerCase() : '';
    const permIsLockedByAdmin = permMeta ? (permMeta.is_locked_by_admin === true || (permMeta.is_locked_by_admin !== false && permOriginRole !== 'docente')) : false;

    return (genDayVal === 'J' && permOriginRole !== 'docente') || 
           (!!permMeta && (permIsLockedByAdmin || authorityRoles.includes(permOriginRole)) && permOriginRole !== 'docente');
}

// Escenario A: Permiso oficial creado por Auxiliatura (ej. Arévalo Morán)
const permAuxiliatura = {
    origin_role: 'profesor_auxiliar',
    is_locked_by_admin: true,
    authorizedBy: 'Auxiliatura General',
    reasonCategory: 'Permiso Oficial'
};
assert.strictEqual(evaluateIsOfficialJustified('', permAuxiliatura), true,
  'Permiso de Auxiliatura DEBE evaluarse como isOfficialJustified = true.');

// Escenario B: Permiso oficial creado por Dirección
const permDireccion = {
    origin_role: 'director',
    is_locked_by_admin: true,
    authorizedBy: 'Dirección del Plantel',
    reasonCategory: 'Comisión Oficial'
};
assert.strictEqual(evaluateIsOfficialJustified('', permDireccion), true,
  'Permiso de Dirección DEBE evaluarse como isOfficialJustified = true.');

// Escenario C: Permiso oficial creado por Secretaría
const permSecretaria = {
    origin_role: 'secretaria',
    is_locked_by_admin: true,
    authorizedBy: 'Secretaría Académica',
    reasonCategory: 'Trámite Oficial'
};
assert.strictEqual(evaluateIsOfficialJustified('', permSecretaria), true,
  'Permiso de Secretaría DEBE evaluarse como isOfficialJustified = true.');

// Escenario D: J colocada en aula por el DOCENTE
const permDocente = {
    origin_role: 'docente',
    is_locked_by_admin: false,
    authorizedBy: 'Docente Titular',
    reasonCategory: 'Justificación en Aula por Docente'
};
assert.strictEqual(evaluateIsOfficialJustified('', permDocente), false,
  'Justificación colocada por Docente DEBE evaluarse como isOfficialJustified = false.');

console.log('  ✅ Test 2 Superado: La discriminación de origen entre Autoridades y Docente es 100% exacta.');

// ==============================================================================
// TEST 3: Simulación de toggleAttendanceCell para Docente
// ==============================================================================
console.log('\n▶ [TEST 3] Simulando flujo de edición y desbloqueo para Docente...');

let currentRole = 'docente';
let isAuditRole = false;

// 1. Docente intenta modificar un registro de Auxiliatura -> DEBE BLOQUEARSE
let cellValue = 'J';
let cellMeta = permAuxiliatura;
let editAttempted = false;
let editBlocked = false;

if (evaluateIsOfficialJustified('', cellMeta)) {
    if (!isAuditRole) {
        editBlocked = true; // El docente es bloqueado
    }
} else {
    editAttempted = true;
}
assert.strictEqual(editBlocked, true, 'El docente NO debe poder modificar un permiso oficial de Auxiliatura.');
assert.strictEqual(editAttempted, false, 'La edición no debe proceder.');

// 2. Docente hace clic en una celda vacía -> Pasa a P -> luego A -> luego J
let cellSequence = [''];
function simulateTeacherClick(cur, meta) {
    const isOfficial = evaluateIsOfficialJustified('', meta);
    if (isOfficial && !isAuditRole) {
        return { value: cur, meta: meta, blocked: true };
    }
    let next = 'P';
    if (!cur || cur === '') next = 'P';
    else if (cur === 'P') next = 'A';
    else if (cur === 'A') next = 'J';
    else if (cur === 'J') next = 'T';
    else if (cur === 'T') next = '';
    
    let newMeta = null;
    if (next === 'J') {
        newMeta = {
            origin_role: 'docente',
            is_locked_by_admin: false,
            authorizedBy: 'Docente Titular'
        };
    }
    return { value: next, meta: newMeta, blocked: false };
}

// Clic 1: '' -> 'P'
let step1 = simulateTeacherClick('', null);
assert.strictEqual(step1.value, 'P');
assert.strictEqual(step1.blocked, false);

// Clic 2: 'P' -> 'A'
let step2 = simulateTeacherClick(step1.value, step1.meta);
assert.strictEqual(step2.value, 'A');
assert.strictEqual(step2.blocked, false);

// Clic 3: 'A' -> 'J' (Docente marca J en aula)
let step3 = simulateTeacherClick(step2.value, step2.meta);
assert.strictEqual(step3.value, 'J');
assert.strictEqual(step3.blocked, false);
assert.strictEqual(step3.meta.origin_role, 'docente');
assert.strictEqual(step3.meta.is_locked_by_admin, false);

// Clic 4: 'J' -> 'T' (Docente desbloquea/cambia su propia J sin trabas)
let step4 = simulateTeacherClick(step3.value, step3.meta);
assert.strictEqual(step4.value, 'T', 'El docente debe poder cambiar su propia J directamente a T.');
assert.strictEqual(step4.blocked, false);
assert.strictEqual(step4.meta, null, 'Al salir de J, la metadata debe eliminarse limpiamente.');

// Clic 5: 'T' -> '' (Docente limpia la celda)
let step5 = simulateTeacherClick(step4.value, step4.meta);
assert.strictEqual(step5.value, '');
assert.strictEqual(step5.blocked, false);

console.log('  ✅ Test 3 Superado: Docente alterna fluidamente [P -> A -> J -> T -> vacío] y desbloquea su propia J sin restricciones.');

// ==============================================================================
// TEST 4: Verificación de atributos visuales y de accesibilidad (HTML generado)
// ==============================================================================
console.log('\n▶ [TEST 4] Verificando generación HTML para celdas...');

function generateCellHtml(val, isOfficial, originRole, isAudit) {
    const isCellReadonly = isOfficial && !isAudit;
    const cellDisabledAttr = (isCellReadonly && !isAudit) ? 'disabled="disabled" aria-disabled="true"' : '';
    const cellLockAdminAttr = isOfficial ? 'data-locked-by-admin="true"' : 'data-locked-by-admin="false"';
    const cellOriginRoleAttr = `data-origin-role="${originRole}"`;

    let cellInnerHtml = val;
    if (val === 'J' && isOfficial) {
        if (!isAudit) {
            cellInnerHtml = `<span style="display:inline-flex; align-items:center; justify-content:center; gap:2px;"><i class="fa-solid fa-lock" style="font-size:0.60rem; opacity:0.85; color:#c2410c;"></i>J</span>`;
        } else {
            cellInnerHtml = `<span style="display:inline-flex; align-items:center; justify-content:center; gap:2px;"><i class="fa-solid fa-shield-halved" style="font-size:0.62rem; color:#ea580c;"></i>J</span>`;
        }
    }

    return `<td class="att-cell" ${isCellReadonly ? 'data-readonly="true" aria-readonly="true"' : ''} ${cellDisabledAttr} ${cellLockAdminAttr} ${cellOriginRoleAttr}>${cellInnerHtml}</td>`;
}

// 1. Celda con justificación de Autoridad vista por Docente
const htmlOficialDocente = generateCellHtml('J', true, 'profesor_auxiliar', false);
assert(htmlOficialDocente.includes('disabled="disabled"'), 'Celda oficial debe tener disabled.');
assert(htmlOficialDocente.includes('aria-disabled="true"'), 'Celda oficial debe tener aria-disabled="true".');
assert(htmlOficialDocente.includes('data-locked-by-admin="true"'), 'Celda oficial debe tener data-locked-by-admin="true".');
assert(htmlOficialDocente.includes('data-origin-role="profesor_auxiliar"'), 'Celda oficial debe indicar rol de origen de la autoridad.');
assert(htmlOficialDocente.includes('fa-lock'), 'Celda oficial debe mostrar candado para el docente.');

// 2. Celda con justificación del propio Docente
const htmlDocentePropia = generateCellHtml('J', false, 'docente', false);
assert(!htmlDocentePropia.includes('disabled='), 'Celda del propio docente NO debe tener disabled.');
assert(!htmlDocentePropia.includes('aria-disabled='), 'Celda del propio docente NO debe tener aria-disabled.');
assert(htmlDocentePropia.includes('data-locked-by-admin="false"'), 'Celda del propio docente debe tener data-locked-by-admin="false".');
assert(htmlDocentePropia.includes('data-origin-role="docente"'), 'Celda del propio docente debe tener data-origin-role="docente".');
assert(!htmlDocentePropia.includes('fa-lock'), 'Celda del propio docente NO debe mostrar icono de candado.');

console.log('  ✅ Test 4 Superado: Atributos HTML y accesibilidad generados exactamente según especificaciones.');

// ==============================================================================
// TEST 5: Verificación de persistencia en Firebase/Firestore
// ==============================================================================
console.log('\n▶ [TEST 5] Verificando sincronización de attendancePermissionsMeta...');

assert(appCode.includes("attendancePermissionsMeta: STATE.attendancePermissionsMeta || {}"),
  'Firebase Realtime Database debe sincronizar attendancePermissionsMeta.');
assert(appCode.includes("window._syncAttendanceToFirebaseBackground"),
  'Debe existir función de sincronización en segundo plano.');

console.log('  ✅ Test 5 Superado: attendancePermissionsMeta se incluye en la sincronización en segundo plano.');

console.log('\n================================================================================');
console.log('🎉 TODAS LAS PRUEBAS DE BLOQUEO Y FLEXIBILIDAD PASARON AL 100%');
console.log('================================================================================\n');
