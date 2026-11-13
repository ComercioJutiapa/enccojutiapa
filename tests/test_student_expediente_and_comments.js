const fs = require('fs');
const assert = require('assert');

console.log("=== INICIANDO VALIDACIÓN DEL EXPEDIENTE DE ESTUDIANTES Y COMENTARIOS ===");

// 1. Validar plataforma.html
const htmlContent = fs.readFileSync('plataforma.html', 'utf8');

// A. Validar Chip / Badge interactivo en cabecera de la ficha (Opción 1)
assert(htmlContent.includes('id="profExpedienteHeaderBadge"'), "Debe existir #profExpedienteHeaderBadge en la cabecera del perfil");
assert(htmlContent.includes("switchStudentProfileTab('expediente')"), "El badge de cabecera debe invocar switchStudentProfileTab('expediente')");
assert(htmlContent.includes('id="profExpedienteBadgeText"'), "Debe existir #profExpedienteBadgeText");

// B. Validar Pestaña 6 en la barra de navegación de la ficha
assert(htmlContent.includes('id="profTabBtn-expediente"'), "Debe existir el botón de pestaña #profTabBtn-expediente");
assert(htmlContent.includes('id="profExpedienteTabCount"'), "Debe existir el contador de pestaña #profExpedienteTabCount");
assert(htmlContent.includes('6. Expediente y Documentos'), "La pestaña debe titularse '6. Expediente y Documentos'");

// C. Validar Contenedor de la Pestaña 6 y sus secciones
assert(htmlContent.includes('id="profTab-expediente"'), "Debe existir el contenedor #profTab-expediente");
assert(htmlContent.includes('id="profExpedienteProgressBar"'), "Debe existir la barra de progreso #profExpedienteProgressBar");
assert(htmlContent.includes('id="profExpedienteProgressPercent"'), "Debe existir el porcentaje #profExpedienteProgressPercent");
assert(htmlContent.includes('id="profExpedienteProgressRatio"'), "Debe existir el ratio #profExpedienteProgressRatio");
assert(htmlContent.includes('id="profExpedienteDocsGrid"'), "Debe existir el grid de documentos #profExpedienteDocsGrid");
assert(htmlContent.includes('id="profExpedienteGeneralNotes"'), "Debe existir el textarea de notas generales #profExpedienteGeneralNotes");
assert(htmlContent.includes('id="profExpNewCommentText"'), "Debe existir el textarea para nuevo comentario #profExpNewCommentText");
assert(htmlContent.includes('id="profExpedienteCommentsList"'), "Debe existir la lista de comentarios #profExpedienteCommentsList");
assert(htmlContent.includes('quickMarkAllExpedienteDocs'), "Debe existir la acción rápida quickMarkAllExpedienteDocs");
assert(htmlContent.includes('printStudentExpedienteRecord'), "Debe existir la función de impresión printStudentExpedienteRecord");

console.log("✓ Estructura visual e interactiva en plataforma.html verificada con éxito.");

// 2. Validar lógica y modelos en app.js
const appJsContent = fs.readFileSync('app.js', 'utf8');

// A. Validar la lista oficial de los 6 documentos
assert(appJsContent.includes('certificados_primaria'), "Debe incluir certificados_primaria");
assert(appJsContent.includes('diploma_primaria'), "Debe incluir diploma_primaria");
assert(appJsContent.includes('certificados_basico'), "Debe incluir certificados_basico");
assert(appJsContent.includes('diploma_basico'), "Debe incluir diploma_basico");
assert(appJsContent.includes('partida_nacimiento'), "Debe incluir partida_nacimiento");
assert(appJsContent.includes('dpi_encargado'), "Debe incluir dpi_encargado");

// B. Validar funciones de gestión del expediente
assert(appJsContent.includes('function getStudentExpedienteSafe'), "Debe incluir getStudentExpedienteSafe");
assert(appJsContent.includes('function calculateStudentExpedienteMetrics'), "Debe incluir calculateStudentExpedienteMetrics");
assert(appJsContent.includes('function updateStudentExpedienteHeaderBadge'), "Debe incluir updateStudentExpedienteHeaderBadge");
assert(appJsContent.includes('function renderStudentExpedienteTab'), "Debe incluir renderStudentExpedienteTab");
assert(appJsContent.includes('function onExpedienteDocFieldChange'), "Debe incluir onExpedienteDocFieldChange");
assert(appJsContent.includes('function onExpedienteGeneralNotesChange'), "Debe incluir onExpedienteGeneralNotesChange");
assert(appJsContent.includes('function addStudentExpedienteComment'), "Debe incluir addStudentExpedienteComment");
assert(appJsContent.includes('function deleteStudentExpedienteComment'), "Debe incluir deleteStudentExpedienteComment");
assert(appJsContent.includes('function quickMarkAllExpedienteDocs'), "Debe incluir quickMarkAllExpedienteDocs");
assert(appJsContent.includes('function printStudentExpedienteRecord'), "Debe incluir printStudentExpedienteRecord");

// C. Validar integración en switchStudentProfileTab y openStudentProfileModal
assert(appJsContent.includes("tabKey === 'expediente'"), "switchStudentProfileTab debe soportar tabKey === 'expediente'");
assert(appJsContent.includes("updateStudentExpedienteHeaderBadge(student)"), "openStudentProfileModal debe actualizar el badge de expediente");

console.log("✓ Funciones y hooks en app.js verificados con éxito.");

// 3. Simular lógica de datos y pruebas de unidad de no pérdida de datos
// Mock básico del entorno
const mockStudent = {
    id: "stu_test_101",
    firstName: "Carlos",
    lastName: "Gómez López",
    carne: "ENCCO-2026-050",
    grade: "Cuarto Perito Contador",
    section: "A",
    status: "Activo",
    grades: { "MAT": { b1: 85, b2: 90 } } // Datos académicos que NUNCA deben perderse
};

// Extraer las funciones directamente de app.js usando un contexto simulado
const vm = require('vm');
const context = {
    STATE: {
        students: [mockStudent],
        selectedStudentId: "stu_test_101",
        currentRole: "secretaria",
        currentUser: { name: "Licda. Carmen Morales", username: "secretaria" },
        activeCycle: "2026"
    },
    document: {
        getElementById: () => null,
        querySelectorAll: () => []
    },
    escapeHtml: (str) => String(str || ''),
    showToast: () => {},
    saveStateToLocalStorage: () => {},
    window: {}
};
vm.createContext(context);

// Cargar definición de OFFICIAL_EXPEDIENTE_DOCS, getStudentExpedienteSafe, calculateStudentExpedienteMetrics, etc.
const startIdx = appJsContent.indexOf('const OFFICIAL_EXPEDIENTE_DOCS =');
const endIdx = appJsContent.indexOf('// Attach to window for global inline accessibility');
assert(startIdx !== -1 && endIdx !== -1, "Debe encontrar el bloque del módulo expediente en app.js");
const scriptCode = appJsContent.substring(startIdx, endIdx);
vm.runInContext(scriptCode, context);

// Test 3.1: getStudentExpedienteSafe inicializa estructura virtual completa sin alterar notas ni perfil
const expInit = context.getStudentExpedienteSafe(mockStudent);
assert.strictEqual(typeof expInit, 'object');
assert.strictEqual(typeof expInit.docs, 'object');
assert.strictEqual(Object.keys(expInit.docs).length, 6, "Debe tener 6 documentos oficiales");
assert.strictEqual(mockStudent.grades["MAT"].b1, 85, "Las calificaciones no deben alterarse");
assert.strictEqual(mockStudent.carne, "ENCCO-2026-050", "El carné del estudiante debe mantenerse");

// Test 3.2: Métricas en estado inicial (0 entregados -> sin_expediente, 0%)
let metrics = context.calculateStudentExpedienteMetrics(mockStudent);
assert.strictEqual(metrics.deliveredCount, 0, "Inicialmente debe haber 0 entregados");
assert.strictEqual(metrics.totalRequired, 6, "Total requerido debe ser 6");
assert.strictEqual(metrics.completeness, 0, "Completeness debe ser 0%");
assert.strictEqual(metrics.status, 'sin_expediente', "Estado debe ser sin_expediente");

// Test 3.3: Marcar 3 documentos como entregados -> incompleto (50%)
expInit.docs['certificados_primaria'].status = 'entregado';
expInit.docs['diploma_primaria'].status = 'entregado';
expInit.docs['partida_nacimiento'].status = 'entregado';
metrics = context.calculateStudentExpedienteMetrics(mockStudent);
assert.strictEqual(metrics.deliveredCount, 3);
assert.strictEqual(metrics.completeness, 50);
assert.strictEqual(metrics.status, 'incompleto');

// Test 3.4: Marcar todos como entregados -> completo (100%)
expInit.docs['certificados_basico'].status = 'entregado';
expInit.docs['diploma_basico'].status = 'entregado';
expInit.docs['dpi_encargado'].status = 'entregado';
metrics = context.calculateStudentExpedienteMetrics(mockStudent);
assert.strictEqual(metrics.deliveredCount, 6);
assert.strictEqual(metrics.completeness, 100);
assert.strictEqual(metrics.status, 'completo');

// Test 3.5: Caso especial con documento 'no_aplica' (ej: estudiante extranjero o caso especial)
expInit.docs['diploma_basico'].status = 'no_aplica';
metrics = context.calculateStudentExpedienteMetrics(mockStudent);
assert.strictEqual(metrics.totalRequired, 5, "Total requerido debe ajustarse dinámicamente a 5");
assert.strictEqual(metrics.deliveredCount, 5);
assert.strictEqual(metrics.completeness, 100, "5 de 5 debe ser 100%");
assert.strictEqual(metrics.status, 'completo');

// Test 3.6: Agregar comentarios a la bitácora
const comment = {
    id: 'c_test_1',
    text: 'Se recibió diploma original de 6to primaria y partida de nacimiento RENAP.',
    author: 'Licda. Carmen Morales',
    role: 'Secretaría',
    timestamp: Date.now(),
    date: '13/11/2026, 14:20'
};
expInit.commentsHistory.push(comment);
assert.strictEqual(expInit.commentsHistory.length, 1);
assert.strictEqual(expInit.commentsHistory[0].text, 'Se recibió diploma original de 6to primaria y partida de nacimiento RENAP.');

// Test 3.7: Notas generales
expInit.generalNotes = 'Prórroga concedida por Dirección hasta el 15 de marzo de 2026.';
assert.strictEqual(mockStudent.expediente.generalNotes, 'Prórroga concedida por Dirección hasta el 15 de marzo de 2026.');

// Test 3.8: Sanitización para Firestore
const sanitizeFn = vm.runInContext(`(${appJsContent.match(/function sanitizePayloadForFirestore[\s\S]*?\n\}/)[0]})`, context);
const sanitized = sanitizeFn(mockStudent);
assert.strictEqual(typeof sanitized.expediente, 'object');
assert.strictEqual(sanitized.expediente.commentsHistory.length, 1);
assert.strictEqual(sanitized.expediente.docs['certificados_primaria'].status, 'entregado');
assert.strictEqual(sanitized.grades["MAT"].b1, 85);

console.log("✓ Todas las pruebas lógicas, métricas, no pérdida de datos y sanitización completadas exitosamente.");
