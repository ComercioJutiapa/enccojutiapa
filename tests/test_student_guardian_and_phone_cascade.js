/**
 * tests/test_student_guardian_and_phone_cascade.js
 * 
 * Verificación exhaustiva de la regla institucional de asignación dinámica:
 * "En nóminas y expedientes de alumnos, en encargado/teléfono debe mostrar el que esté asignado,
 * ya sea encargado, madre o padre, de forma dinámica, coherente y sin pérdida de datos."
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('='.repeat(80));
console.log('🛡️ TEST: ASIGNACIÓN DINÁMICA DE ENCARGADO / TELÉFONO EN NÓMINAS Y EXPEDIENTES');
console.log('='.repeat(80));

// 1. Simulación de entorno Browser
const domElements = {};
const mockDocument = {
    getElementById: (id) => domElements[id] || null,
    createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        appendChild: () => {},
        setAttribute: () => {},
        addEventListener: () => {}
    }),
    querySelectorAll: () => [],
    querySelector: () => null
};

const sandbox = {
    console: console,
    window: {},
    document: mockDocument,
    STATE: {
        activeCycle: '2026',
        currentRole: 'director',
        students: [],
        gradesList: [],
        attendanceAlerts: []
    },
    escapeHtml: (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    canRoleUseWhatsApp: () => true,
    formatStudentDisplayName: (s, fmt) => `${s.lastName || ''}, ${s.firstName || s.name || ''}`.trim()
};
sandbox.window = sandbox;

const appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.createContext(sandbox);

// Cargar app.js en el sandbox (capturando cualquier dependencia)
try {
    vm.runInContext(appCode, sandbox);
    console.log('✅ app.js cargado exitosamente en el sandbox VM.');
} catch (err) {
    // Si falla por dependencias de Firebase/DOM no críticas, verificamos que getStudentAssignedGuardianInfo esté definido
    console.log('ℹ️ app.js cargó con advertencia de entorno (normal en VM):', err.message);
}

const getInfo = sandbox.getStudentAssignedGuardianInfo || sandbox.window.getStudentAssignedGuardianInfo;
assert(typeof getInfo === 'function', 'getStudentAssignedGuardianInfo debe estar definida en window / global');
console.log('✅ getStudentAssignedGuardianInfo existe y está disponible globalmente.');

// ============================================================================
// CASO 1: Alumno con Encargado / Tutor titular específico
// ============================================================================
console.log('\n--- CASO 1: Encargado Titular Específico ---');
const s1 = {
    id: 's1',
    firstName: 'Juan',
    lastName: 'Pérez',
    guardianName: 'Marta Gómez',
    guardianPhone1: '5544-1122',
    guardianRelationship: 'Tía',
    motherName: 'Rosa Pérez',
    motherPhone1: '7788-9900',
    fatherName: 'Carlos Pérez',
    fatherPhone1: '3322-1100'
};
const res1 = getInfo(s1);
console.log('Resultado Caso 1:', res1);
assert.strictEqual(res1.name, 'Marta Gómez');
assert.strictEqual(res1.phone, '5544-1122');
assert.strictEqual(res1.relationship, 'Tía');
assert.strictEqual(res1.source, 'guardian');
assert.strictEqual(res1.isAssigned, true);
console.log('✅ Caso 1 pasado: Se prioriza el tutor/encargado titular específico cuando existe.');

// ============================================================================
// CASO 2: Alumno solo con Madre registrada (sin tutor específico)
// ============================================================================
console.log('\n--- CASO 2: Solo Madre registrada ---');
const s2 = {
    id: 's2',
    firstName: 'Ana',
    lastName: 'García',
    motherName: 'Gloria Reyes',
    motherPhone1: '4455-6677',
    motherPhone2: '5566-7788',
    motherDpi: '2233 44556 2201'
};
const res2 = getInfo(s2);
console.log('Resultado Caso 2:', res2);
assert.strictEqual(res2.name, 'Gloria Reyes');
assert.strictEqual(res2.phone, '4455-6677');
assert.strictEqual(res2.relationship, 'Madre');
assert.strictEqual(res2.label, 'Madre');
assert.strictEqual(res2.source, 'mother');
assert.strictEqual(res2.isAssigned, true);
console.log('✅ Caso 2 pasado: Si no hay tutor externo, la Madre se asigna dinámicamente como encargada.');

// ============================================================================
// CASO 3: Alumno solo con Padre registrado (sin tutor específico)
// ============================================================================
console.log('\n--- CASO 3: Solo Padre registrado ---');
const s3 = {
    id: 's3',
    firstName: 'Luis',
    lastName: 'Morales',
    fatherName: 'Roberto Morales',
    fatherPhone1: '3344-5566',
    fatherDpi: '1122 33445 2201'
};
const res3 = getInfo(s3);
console.log('Resultado Caso 3:', res3);
assert.strictEqual(res3.name, 'Roberto Morales');
assert.strictEqual(res3.phone, '3344-5566');
assert.strictEqual(res3.relationship, 'Padre');
assert.strictEqual(res3.label, 'Padre');
assert.strictEqual(res3.source, 'father');
assert.strictEqual(res3.isAssigned, true);
console.log('✅ Caso 3 pasado: Si no hay tutor ni madre, el Padre se asigna dinámicamente como encargado.');

// ============================================================================
// CASO 4: Ambos padres registrados (sin tutor específico)
// ============================================================================
console.log('\n--- CASO 4A: Ambos padres, solo el Padre tiene teléfono ---');
const s4a = {
    id: 's4a',
    firstName: 'Pedro',
    lastName: 'Chacón',
    motherName: 'Carmen Lemus',
    fatherName: 'Julio Chacón',
    fatherPhone1: '4411-2233'
};
const res4a = getInfo(s4a);
console.log('Resultado Caso 4A:', res4a);
assert.strictEqual(res4a.name, 'Julio Chacón');
assert.strictEqual(res4a.phone, '4411-2233');
assert.strictEqual(res4a.relationship, 'Padre');
console.log('✅ Caso 4A pasado: Si solo el Padre tiene teléfono, se prioriza al Padre para contacto efectivo.');

console.log('\n--- CASO 4B: Ambos padres, ambos con teléfono ---');
const s4b = {
    id: 's4b',
    firstName: 'Sofía',
    lastName: 'López',
    motherName: 'María García',
    motherPhone1: '5522-3344',
    fatherName: 'Jorge López',
    fatherPhone1: '4433-2211'
};
const res4b = getInfo(s4b);
console.log('Resultado Caso 4B:', res4b);
assert.strictEqual(res4b.name, 'María García');
assert.strictEqual(res4b.phone, '5522-3344');
assert.strictEqual(res4b.secondaryPhone, '4433-2211');
assert.strictEqual(res4b.relationship, 'Madre');
console.log('✅ Caso 4B pasado: Con ambos padres y teléfonos, se asigna la Madre (norma MINEDUC) y Padre en secundario.');

// ============================================================================
// CASO 5: Alumno sin familiares pero con teléfono personal/emergencia
// ============================================================================
console.log('\n--- CASO 5: Sin familiares pero con teléfono de estudiante/emergencia ---');
const s5 = {
    id: 's5',
    firstName: 'Marcos',
    lastName: 'Díaz',
    phone: '5566-0099'
};
const res5 = getInfo(s5);
console.log('Resultado Caso 5:', res5);
assert.strictEqual(res5.name, 'No registrado');
assert.strictEqual(res5.phone, '5566-0099');
assert.strictEqual(res5.isAssigned, false);
console.log('✅ Caso 5 pasado: Mantiene el teléfono de contacto de emergencia/alumno como respaldo.');

// ============================================================================
// CASO 6: Alumno sin ningún dato (valores nulos o "No registrado")
// ============================================================================
console.log('\n--- CASO 6: Sin ningún dato ---');
const s6 = {
    id: 's6',
    firstName: 'Sin',
    lastName: 'Datos',
    tutor: 'No registrado',
    tutorPhone: 'Sin tel.'
};
const res6 = getInfo(s6);
console.log('Resultado Caso 6:', res6);
assert.strictEqual(res6.name, 'No registrado');
assert.strictEqual(res6.phoneDisplay, 'Sin tel.');
assert.strictEqual(res6.isAssigned, false);
console.log('✅ Caso 6 pasado: Maneja limpiamente cadenas como "No registrado" o "Sin tel." sin generar basura.');

// ============================================================================
// CASO 7: Integración con carnets.js
// ============================================================================
console.log('\n--- CASO 7: Integración con carnets.js ---');
const carnetsCode = fs.readFileSync(path.join(__dirname, '..', 'carnets.js'), 'utf8');
vm.runInContext(carnetsCode, sandbox);
assert(sandbox.EnccoCarnets && typeof sandbox.EnccoCarnets.resolveStudentGuardian === 'function', 'EnccoCarnets.resolveStudentGuardian debe existir');

const carnetRes = sandbox.EnccoCarnets.resolveStudentGuardian(s2);
console.log('Resultado carnets.js con Caso 2 (Solo Madre):', carnetRes);
assert.strictEqual(carnetRes.name, 'Gloria Reyes');
assert.strictEqual(carnetRes.phone, '4455-6677');
console.log('✅ Caso 7 pasado: carnets.js delega con exactitud a la cascada unificada.');

// ============================================================================
// CASO 8: Validación de openStudentWhatsAppChat con responsable asignado
// ============================================================================
console.log('\n--- CASO 8: Saludo y contacto WhatsApp dinámico con responsable ---');
sandbox.STATE.students = [s2];
let openedUrl = '';
sandbox.window.open = (url) => { openedUrl = url; };
sandbox.openStudentWhatsAppChat('s2');
console.log('URL de WhatsApp generada:', openedUrl);
assert(openedUrl.includes('50244556677'), 'La URL debe contener el teléfono de la madre con prefijo 502');
assert(openedUrl.includes('Madre'), 'El mensaje debe saludar a la Madre como encargada');
assert(openedUrl.includes('Gloria%20Reyes') || decodeURIComponent(openedUrl).includes('Gloria Reyes'), 'El mensaje debe incluir el nombre de la madre');
console.log('✅ Caso 8 pasado: WhatsApp se dirige dinámicamente al responsable legal asignado con saludo personalizado.');

console.log('\n' + '='.repeat(80));
console.log('🎉 TODOS LOS 8 TESTS DE ASIGNACIÓN DINÁMICA DE ENCARGADO / TELÉFONO PASARON');
console.log('='.repeat(80));
