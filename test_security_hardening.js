/**
 * test_security_hardening.js
 * Suite de Pruebas Automatizadas: Blindaje de Seguridad y Endurecimiento Institucional
 * ENCCO Jutiapa 1970
 */

const fs = require('fs');
const path = require('path');

console.log('================================================================================');
console.log('🛡️ VERIFICACIÓN DE SEGURIDAD Y BLINDAJE INSTITUCIONAL');
console.log('================================================================================');

let passed = 0;
let total = 0;

function assert(condition, message) {
    total++;
    if (!condition) {
        console.error(`❌ FALLÓ: ${message}`);
        process.exit(1);
    } else {
        console.log(`  ✅ ${message}`);
        passed++;
    }
}

// 1. Verificación de auth.js sin contraseñas en texto plano
console.log('\n▶ [TEST 1] Verificando eliminación de contraseñas planas en auth.js...');
const authPath = path.join(__dirname, 'auth.js');
const authContent = fs.readFileSync(authPath, 'utf8');

assert(!authContent.includes("password: 'C@rolina1'"), 'auth.js NO contiene contraseña de administrador en texto claro');
assert(!authContent.includes("password: 'Nehemias12'"), 'auth.js NO contiene contraseña de docente en texto claro');
assert(authContent.includes('ADMIN_PASS_HASH') && authContent.includes('DOCENTE_PASS_HASH'), 'auth.js utiliza hashes criptográficos protegidos');

// 2. Verificación de reglas Firebase RTDB
console.log('\n▶ [TEST 2] Verificando reglas de Firebase Realtime Database...');
const rtdbPath = path.join(__dirname, 'database.rules.json');
const rtdbContent = fs.readFileSync(rtdbPath, 'utf8');
const rtdbJson = JSON.parse(rtdbContent);

assert(rtdbJson.rules.encc_school_state.activityAuditLog['.write'] === '!data.exists() && newData.exists()', 'activityAuditLog en RTDB es estrictamente append-only (inmutable)');
assert(rtdbJson.rules['.write'] !== 'newData.exists()', 'Regla de escritura raíz en RTDB ya no es permisiva sin restricción');

// 3. Verificación de reglas Firestore
console.log('\n▶ [TEST 3] Verificando reglas de Cloud Firestore...');
const firestorePath = path.join(__dirname, 'firestore.rules');
const firestoreContent = fs.readFileSync(firestorePath, 'utf8');

assert(!firestoreContent.includes('|| true'), 'firestore.rules NO contiene la cláusula insegura "|| true"');
assert(firestoreContent.includes('isAuthenticated()') || firestoreContent.includes('request.auth != null'), 'firestore.rules exige autenticación para escrituras');

// 4. Verificación de Módulo Anti-XSS (DataRepository.security)
console.log('\n▶ [TEST 4] Verificando motor de sanitización Anti-XSS...');
global.STATE = { currentUser: { username: 'auditor', role: 'admin' }, activityAuditLog: [] };
const { DataRepository } = require('./db_repository.js');

assert(typeof DataRepository.security === 'object', 'DataRepository.security instanciado');
const dirtyInput = '<script>alert("XSS")</script><img src=x onerror=stealCookies()>';
const cleanEscaped = DataRepository.security.escapeHtml(dirtyInput);
assert(!cleanEscaped.includes('<script>') && cleanEscaped.includes('&lt;script&gt;'), 'escapeHtml neutraliza etiquetas <script>');
assert(cleanEscaped.includes('&quot;'), 'escapeHtml neutraliza comillas dobles');

// 5. Verificación de Registro Inmutable de Auditoría
console.log('\n▶ [TEST 5] Verificando registro inmutable de auditoría...');
assert(typeof DataRepository.audit === 'object', 'DataRepository.audit instanciado');
const auditEntry = DataRepository.audit.record('ACTA_DISCIPLINARIA_EMITIDA', { studentId: '2026-CB-022', motivo: 'Uso de teléfono' });

assert(auditEntry && auditEntry.id.startsWith('audit_'), 'Entrada de auditoría generada con ID único');
assert(auditEntry.action === 'ACTA_DISCIPLINARIA_EMITIDA', 'Acción registrada con precisión');
assert(auditEntry.user === 'auditor', 'Usuario auditor registrado en la traza');
assert(global.STATE.activityAuditLog.length > 0, 'Registro almacenado en activityAuditLog');

console.log(`\n================================================================================`);
console.log(`🎉 TODAS LAS ${passed}/${total} PRUEBAS DE SEGURIDAD PASARON CON ÉXITO (100%)`);
console.log(`================================================================================\n`);
