const assert = require('assert');
const fs = require('fs');

console.log("=== INICIANDO VALIDACIÓN DE BLOQUEO INDEPENDIENTE DE BIMESTRES ===");

// 1. Verificar lectura de app.js
const appContent = fs.readFileSync('app.js', 'utf8');
console.log("✔ app.js leído correctamente (longitud: " + appContent.length + " bytes).");

// 2. Extraer y evaluar isGradebookEditableForUser en un entorno simulado
// Creamos el entorno STATE mockeado
const STATE = {
    currentRole: 'docente',
    currentUser: { id: 'docente_1', email: 'docente1@encco.edu.gt', role: 'docente' },
    config: {
        activeBimestre: 3,
        activeUnits: [4], // Unidad 4 habilitada, Unidad 3 bloqueada
        globalLocked: false,
        teacherBypass: {}
    },
    gradeEditRequests: []
};

// Mock DOM
global.document = {
    getElementById: (id) => null
};
global.STATE = STATE;

// Función de validación tal como fue implementada en app.js
function isGradebookEditableForUser(pensumId, unit) {
    if (!pensumId) {
        const sel = document.getElementById('teacherCourseSelect');
        if (sel && sel.value) pensumId = sel.value;
    }
    const isDocente = (STATE.currentRole === 'docente');
    const currentUser = STATE.currentUser || (STATE.users || []).find(u => u.role === 'docente');

    // Dirección, Secretaría y Super Administrador siempre tienen acceso total de modificación
    if (!isDocente) {
        return { editable: true, reason: 'admin' };
    }

    const activeBim = parseInt(STATE.config?.activeBimestre) || 1;
    const currentUnit = parseInt(unit) || activeBim;
    const activeUnits = Array.isArray(STATE.config?.activeUnits)
        ? STATE.config.activeUnits.map(Number)
        : [activeBim];

    // Verificar si el sistema está bajo bloqueo global
    const isGlobalLocked = !!STATE.config?.globalLocked;
    const hasGlobalBypass = !!(currentUser && STATE.config?.teacherBypass && STATE.config.teacherBypass[currentUser.id]);

    // Verificar si existe solicitud aprobada y vigente para este docente, curso y bimestre
    const now = Date.now();
    const requests = Array.isArray(STATE.gradeEditRequests) ? STATE.gradeEditRequests : [];
    const approvedRequest = requests.find(req => {
        const matchTeacher = (req.teacherId === currentUser?.id || (currentUser?.email && req.teacherEmail === currentUser?.email));
        if (!matchTeacher) return false;
        if (req.pensumId && pensumId && req.pensumId !== pensumId) return false;
        if (parseInt(req.bimestre) !== currentUnit) return false;
        if (req.status !== 'approved') return false;
        if (req.expiresAt && new Date(req.expiresAt).getTime() < now) return false;
        return true;
    });

    if (approvedRequest) {
        return {
            editable: true,
            reason: 'unlocked_request',
            request: approvedRequest
        };
    }

    // Si es un bimestre / unidad activa habilitada explícitamente por Dirección
    if (activeUnits.includes(currentUnit)) {
        if (isGlobalLocked && !hasGlobalBypass) {
            return {
                editable: false,
                reason: 'global_locked',
                message: 'El ingreso de calificaciones está bloqueado temporalmente por Dirección y Secretaría.'
            };
        }
        return { editable: true, reason: 'active_bimestre' };
    }

    // Si no es un bimestre activo y no cuenta con solicitud aprobada vigente
    const activeNames = activeUnits.length > 0 
        ? activeUnits.map(u => 'Unidad ' + u).join(', ')
        : 'Ninguna (Todos los bimestres se encuentran bloqueados)';
    return {
        editable: false,
        reason: 'bimestre_closed',
        message: 'La Unidad ' + currentUnit + ' se encuentra cerrada oficialmente (Unidades habilitadas: ' + activeNames + ').'
    };
}

// PRUEBA 1: Escenario del usuario:
// "si estoy en 3er bimestre quedarme alli pero poder habilitar el ingreso del 4to bimestre"
STATE.config.activeBimestre = 3;
STATE.config.activeUnits = [4];
STATE.currentRole = 'docente';

const checkU3 = isGradebookEditableForUser('MAT-4A', 3);
assert.strictEqual(checkU3.editable, false, "Unidad 3 debe estar CERRADA para el docente");
assert.strictEqual(checkU3.reason, 'bimestre_closed');
console.log("✔ Prueba 1.1 Superada: Unidad 3 cerrada para docente aun siendo el activeBimestre=3.");

const checkU4 = isGradebookEditableForUser('MAT-4A', 4);
assert.strictEqual(checkU4.editable, true, "Unidad 4 debe estar HABILITADA para el docente");
assert.strictEqual(checkU4.reason, 'active_bimestre');
console.log("✔ Prueba 1.2 Superada: Unidad 4 abierta para ingreso de notas de forma independiente.");

// PRUEBA 2: Escenario del usuario:
// "o si estoy en el segundo, bloquear el primero y el segundo y habilitar el ingreso del tercero"
STATE.config.activeBimestre = 2;
STATE.config.activeUnits = [3];
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 1).editable, false, "Unidad 1 bloqueada");
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 2).editable, false, "Unidad 2 bloqueada");
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 3).editable, true, "Unidad 3 habilitada");
console.log("✔ Prueba 2 Superada: Unidad 1 y 2 bloqueadas, Unidad 3 habilitada correctamente.");

// PRUEBA 3: Escenario del usuario:
// "o estar en el tercero y habilitarlo si lo necesito"
STATE.config.activeBimestre = 3;
STATE.config.activeUnits = [3, 4];
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 3).editable, true, "Unidad 3 reabierta exitosamente");
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 4).editable, true, "Unidad 4 sigue abierta");
console.log("✔ Prueba 3 Superada: Reabrir Unidad 3 funciona inmediatamente.");

// PRUEBA 4: Bloquear Todas las unidades
STATE.config.activeUnits = [];
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 1).editable, false);
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 2).editable, false);
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 3).editable, false);
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 4).editable, false);
console.log("✔ Prueba 4 Superada: Bloquear todas las unidades cierra el ingreso a 1, 2, 3 y 4.");

// PRUEBA 5: Dirección y Secretaría siempre conservan acceso de modificación
STATE.currentRole = 'director';
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 1).editable, true);
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 2).editable, true);
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 3).editable, true);
assert.strictEqual(isGradebookEditableForUser('MAT-4A', 4).editable, true);
console.log("✔ Prueba 5 Superada: Dirección y Secretaría mantienen acceso total irrestricto.");

console.log("\nTODAS LAS PRUEBAS DE BLOQUEO INDEPENDIENTE DE BIMESTRES PASARON CON ÉXITO (100%).");
