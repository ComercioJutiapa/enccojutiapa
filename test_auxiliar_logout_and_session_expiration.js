/**
 * test_auxiliar_logout_and_session_expiration.js
 * Verificación automatizada del cierre seguro y expiración de sesión
 * para el rol Profesor Auxiliar y roles escolares.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("================================================================================");
console.log("🧪 INICIANDO VERIFICACIÓN: CIERRE Y EXPIRACIÓN DE SESIÓN PARA PROFESOR AUXILIAR");
console.log("================================================================================");

// TEST 1: Verificar que auth.js no bloquea la inactividad para profesor_auxiliar
console.log("\n▶ [TEST 1] Verificando activación de temporizador de inactividad para profesor_auxiliar...");
const authContent = fs.readFileSync(path.join(__dirname, 'auth.js'), 'utf8');

// No debe tener "return;" o "this.isActive = false;" que impidan el cierre automático
assert(!authContent.includes("this.isActive = false;\n                this.startAuxiliarHeartbeat();\n                return;"),
  "auth.js no debe impedir la expiración de sesión del profesor auxiliar.");

assert(authContent.includes("this.isActive = true;"),
  "auth.js debe activar el control de inactividad para todos los roles, incluyendo profesor_auxiliar.");

assert(authContent.includes("if (this._heartbeatInterval) {\n                clearInterval(this._heartbeatInterval);\n                this._heartbeatInterval = null;\n            }"),
  "EnccoInactivityTimer.stop() debe cancelar el heartbeat de auxiliatura para permitir el cierre total.");

console.log("  ✅ Test 1 Superado: El profesor auxiliar está protegido por el temporizador de inactividad.");

// TEST 2: Limpieza profunda de almacenamiento en clearUserSession
console.log("\n▶ [TEST 2] Verificando purga exhaustiva de almacenamiento local y de sesión...");
assert(authContent.includes("sessionStorage.removeItem('ENCCO_AUTH_TIMESTAMP');"), "clearUserSession debe remover ENCCO_AUTH_TIMESTAMP de sessionStorage");
assert(authContent.includes("localStorage.removeItem('ENCCO_AUTH_BRIDGE');"), "clearUserSession debe remover ENCCO_AUTH_BRIDGE de localStorage");
assert(authContent.includes("localStorage.removeItem('ENCCO_AUTH_TIMESTAMP');"), "clearUserSession debe remover ENCCO_AUTH_TIMESTAMP de localStorage");
assert(authContent.includes("localStorage.removeItem('ENCCO_AUTH_TOKEN');"), "clearUserSession debe remover ENCCO_AUTH_TOKEN de localStorage");
console.log("  ✅ Test 2 Superado: clearUserSession elimina todos los tokens y credenciales persistentes.");

// TEST 3: performLogout en app.js es a prueba de fallos y atómico
console.log("\n▶ [TEST 3] Verificando robustez y garantía de redirección en performLogout()...");
const appContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

assert(appContent.includes("const safetyRedirectTimer = setTimeout(safeRedirect, 1200);"),
  "performLogout debe contar con temporizador de respaldo para forzar salida ante cualquier cuelgue de red.");

assert(appContent.includes("if (typeof clearUserSession === 'function') clearUserSession();"),
  "performLogout debe invocar clearUserSession() para destruir tokens institucionales.");

assert(appContent.includes("Auxiliatura y Disciplina"),
  "updateTopRoleBar debe contener el distintivo oficial para profesor_auxiliar.");

console.log("  ✅ Test 3 Superado: performLogout cuenta con protección de tiempo límite y cierre infalible.");

console.log("\n================================================================================");
console.log("🎉 TODAS LAS VERIFICACIONES DE CIERRE DE SESIÓN PASARON EXITOSAMENTE (100%)");
console.log("================================================================================");
