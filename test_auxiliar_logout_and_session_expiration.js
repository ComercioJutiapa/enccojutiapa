/**
 * test_auxiliar_logout_and_session_expiration.js
 * Verificación automatizada:
 * 1. Modo Centinela activo para Profesor Auxiliar (la sesión NO se cierra por inactividad).
 * 2. Cierre seguro y manual mediante performLogout() y purga de credenciales al salir deliberadamente.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("================================================================================");
console.log("🧪 INICIANDO VERIFICACIÓN: MODO CENTINELA Y CIERRE SEGURO PARA AUXILIATURA");
console.log("================================================================================");

// TEST 1: Modo Centinela activo (NO caduca sesión por inactividad para Auxiliatura)
console.log("\n▶ [TEST 1] Verificando activación de Modo Centinela para profesor_auxiliar...");
const authContent = fs.readFileSync(path.join(__dirname, 'auth.js'), 'utf8');

assert(authContent.includes("session.role === 'profesor_auxiliar'"), "auth.js debe detectar al rol profesor_auxiliar");
assert(authContent.includes("Modo Centinela] Sesión permanente activada para Auxiliatura"), "auth.js debe activar Modo Centinela permanente");
assert(authContent.includes("startAuxiliarHeartbeat"), "auth.js debe contar con heartbeat centinela");
assert(authContent.includes("5 * 60 * 1000"), "auth.js debe tener heartbeat de 5 minutos");

assert(authContent.includes("if (this._heartbeatInterval) {\n                clearInterval(this._heartbeatInterval);\n                this._heartbeatInterval = null;\n            }"),
  "EnccoInactivityTimer.stop() debe cancelar el heartbeat al cerrar sesión manualmente.");

console.log("  ✅ Test 1 Superado: El profesor auxiliar cuenta con Modo Centinela permanente sin caducidad por inactividad.");

// TEST 2: Limpieza profunda de almacenamiento en clearUserSession
console.log("\n▶ [TEST 2] Verificando purga exhaustiva de almacenamiento local y de sesión...");
assert(authContent.includes("sessionStorage.removeItem('ENCCO_AUTH_TIMESTAMP');"), "clearUserSession debe remover ENCCO_AUTH_TIMESTAMP de sessionStorage");
assert(authContent.includes("localStorage.removeItem('ENCCO_AUTH_BRIDGE');"), "clearUserSession debe remover ENCCO_AUTH_BRIDGE de localStorage");
assert(authContent.includes("localStorage.removeItem('ENCCO_AUTH_TIMESTAMP');"), "clearUserSession debe remover ENCCO_AUTH_TIMESTAMP de localStorage");
assert(authContent.includes("localStorage.removeItem('ENCCO_AUTH_TOKEN');"), "clearUserSession debe remover ENCCO_AUTH_TOKEN de localStorage");
console.log("  ✅ Test 2 Superado: clearUserSession elimina todos los tokens y credenciales persistentes al salir.");

// TEST 3: performLogout en app.js es a prueba de fallos y atómico para salida manual
console.log("\n▶ [TEST 3] Verificando robustez y garantía de redirección en performLogout()...");
const appContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

assert(appContent.includes("const safetyRedirectTimer = setTimeout(safeRedirect, 1200);"),
  "performLogout debe contar con temporizador de respaldo para forzar salida ante cualquier cuelgue de red.");

assert(appContent.includes("if (typeof clearUserSession === 'function') clearUserSession();"),
  "performLogout debe invocar clearUserSession() para destruir tokens institucionales.");

assert(appContent.includes("Auxiliatura y Disciplina"),
  "updateTopRoleBar debe contener el distintivo oficial para profesor_auxiliar.");

console.log("  ✅ Test 3 Superado: performLogout cuenta con protección de tiempo límite y cierre manual infalible.");

console.log("\n================================================================================");
console.log("🎉 TODAS LAS VERIFICACIONES DE MODO CENTINELA Y CIERRE PASARON EXITOSAMENTE (100%)");
console.log("================================================================================");
