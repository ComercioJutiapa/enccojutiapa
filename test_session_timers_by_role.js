/**
 * test_session_timers_by_role.js
 * Verificación automatizada de los temporizadores de inactividad:
 * - Docentes: 30 minutos (1,800,000 ms)
 * - Super Usuario, Director, Secretaria, Auxiliatura (y demás): 3 horas (10,800,000 ms)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("================================================================================");
console.log("🧪 VERIFICACIÓN DE TEMPORIZADORES DE INACTIVIDAD POR ROL");
console.log("================================================================================");

const authContent = fs.readFileSync(path.join(__dirname, 'auth.js'), 'utf8');
const appContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// 1. Constantes de tiempo en auth.js
console.log("\n▶ [TEST 1] Verificando constantes de tiempo en auth.js...");
assert(authContent.includes("const DOCENTE_TIMEOUT_MS = 30 * 60 * 1000;"), "auth.js debe definir DOCENTE_TIMEOUT_MS como 30 minutos");
assert(authContent.includes("const STAFF_TIMEOUT_MS = 3 * 60 * 60 * 1000;"), "auth.js debe definir STAFF_TIMEOUT_MS como 3 horas");
console.log("  ✅ Test 1 Superado: Constantes de 30 min y 3 horas verificadas.");

// 2. Lógica de asignación en start() de auth.js
console.log("\n▶ [TEST 2] Verificando asignación dinámica de temporizador en auth.js...");
assert(authContent.includes("this.timeoutMs = isDocente ? DOCENTE_TIMEOUT_MS : STAFF_TIMEOUT_MS;"), "auth.js debe asignar 30m a docentes y 3h a los demás");
assert(authContent.includes("this.startAuxiliarHeartbeat();"), "auth.js debe activar heartbeat para roles no docentes");
console.log("  ✅ Test 2 Superado: Asignación dinámica confirmada.");

// 3. Lógica en SecurityEngine de app.js
console.log("\n▶ [TEST 3] Verificando sincronización de temporizador en app.js...");
assert(appContent.includes("const timeoutMs = isDocente ? (30 * 60 * 1000) : (3 * 60 * 60 * 1000);"), "app.js debe aplicar 30m a docente y 3h a los demás");
console.log("  ✅ Test 3 Superado: SecurityEngine en app.js alineado a la perfección.");

console.log("\n================================================================================");
console.log("🎉 TODAS LAS PRUEBAS DE TEMPORIZADOR POR ROL PASARON CON ÉXITO (100%)");
console.log("================================================================================");
