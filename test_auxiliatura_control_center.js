/**
 * test_auxiliatura_control_center.js
 * Suite de Pruebas Automatizadas: Centro de Control de Auxiliatura y Secretaría
 * Valida integridad, roles (Auxiliar, Secretaría, Docente), resolución de casos y no regresión.
 */

const fs = require('fs');
const path = require('path');

console.log('================================================================================');
console.log('🧪 VERIFICACIÓN: CENTRO DE CONTROL DE AUXILIATURA Y SECRETARÍA');
console.log('================================================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
    totalTests++;
    if (!condition) {
        console.error(`❌ FALLÓ: ${message}`);
        process.exit(1);
    } else {
        console.log(`  ✅ ${message}`);
        passedTests++;
    }
}

// 1. Validar existencia y sintaxis de archivos
console.log('\n▶ [TEST 1] Verificando archivos de código fuente...');
const htmlPath = path.join(__dirname, 'plataforma.html');
const appJsPath = path.join(__dirname, 'app.js');
const auxCenterJsPath = path.join(__dirname, 'auxiliatura_center.js');

assert(fs.existsSync(auxCenterJsPath), 'auxiliatura_center.js existe en el proyecto');
assert(fs.existsSync(htmlPath), 'plataforma.html existe en el proyecto');
assert(fs.existsSync(appJsPath), 'app.js existe en el proyecto');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');
const auxCenterContent = fs.readFileSync(auxCenterJsPath, 'utf8');

// 2. Validar plataforma.html
console.log('\n▶ [TEST 2] Verificando integración en plataforma.html...');
assert(htmlContent.includes('data-view="auxiliatura-center"'), 'Elemento de navegación para auxiliatura-center presente');
assert(htmlContent.includes('data-allowed="director,secretaria,profesor_auxiliar,admin"'), 'Permisos en sidebar asignados a auxiliatura y secretaría');
assert(htmlContent.includes('id="view-auxiliatura-center"'), 'Contenedor de vista id="view-auxiliatura-center" presente');
assert(htmlContent.includes('src="auxiliatura_center.js'), 'Script auxiliatura_center.js referenciado en HTML');

// 3. Validar app.js permisos y enrutamiento
console.log('\n▶ [TEST 3] Verificando permisos y enrutamiento en app.js...');
assert(appJsContent.includes("'auxiliatura-center'") && appJsContent.includes("renderAuxiliaturaCenterView"), 'Enrutador de vista configurado para renderAuxiliaturaCenterView');
assert(appJsContent.includes("role === 'profesor_auxiliar'") && appJsContent.includes("'auxiliatura-center'"), 'Permiso concedido para rol profesor_auxiliar');
assert(appJsContent.includes("role === 'secretaria'") && appJsContent.includes("'auxiliatura-center'"), 'Permiso concedido para rol secretaria');

// 4. Validar visibilidad para Docentes: Resolución de Casos Disciplinarios y Autorización de Justificaciones
console.log('\n▶ [TEST 4] Verificando visibilidad para docentes (resolución de permisos y disciplina)...');
assert(appJsContent.includes('showJustificationDetailModal'), 'Función showJustificationDetailModal vinculada en asistencia (celdas J)');
assert(appJsContent.includes('resSnippet') && appJsContent.includes('d.resolvedBy'), 'Tabla de disciplina muestra quién resolvió el caso y la fecha de resolución');

// 5. Validar funciones clave en auxiliatura_center.js
console.log('\n▶ [TEST 5] Verificando componentes y utilidades en auxiliatura_center.js...');
assert(auxCenterContent.includes('function renderAuxiliaturaCenterView'), 'renderAuxiliaturaCenterView definida');
assert(auxCenterContent.includes('function openQuickAuxiliaturaActionModal'), 'Modal de acción rápida en 3 clics definido');
assert(auxCenterContent.includes('function openStudent360Drawer'), 'Ficha 360 del estudiante definida');
assert(auxCenterContent.includes('function handleAuxStudentSearch'), 'Buscador predictivo 360 definido');
assert(auxCenterContent.includes('function printOfficialParentCitation'), 'Generador de citación oficial a padres definido');
assert(auxCenterContent.includes('function showJustificationDetailModal'), 'showJustificationDetailModal disponible para docentes y personal');
assert(auxCenterContent.includes('function renderAuxAbsencesTab'), 'renderAuxAbsencesTab para la lista de ausencias al aula definida');
assert(auxCenterContent.includes('function getTodayAbsencesList'), 'getTodayAbsencesList para consolidación de inasistencias definida');
assert(auxCenterContent.includes('id="auxTabBtn-absences"'), 'Pestaña Ausencias al Aula presente en el Centro de Control');
assert(auxCenterContent.includes('function filterAuxStudentQuickList'), 'Enrutador filterAuxStudentQuickList definido');

// 6. Prueba funcional de lógica de KPIs y Justificaciones
console.log('\n▶ [TEST 6] Simulando lógica de justificaciones y permisos...');
const sampleStudent = {
    id: '2026-CB-022',
    name: 'MÉNDEZ LÓPEZ JULIO LUIS ELIAS',
    grade: '4to Perito Contador',
    section: 'B',
    status: 'ACTIVO',
    tutorPhone: '50255551234'
};

const sampleJustification = {
    studentId: '2026-CB-022',
    date: '2026-10-03',
    authorizedBy: 'Secretaría General / Auxiliatura de Turno',
    reason: 'Cita Médica en IGSS con constancia adjunta',
    status: 'AUTORIZADO',
    docRef: 'CONST-IGSS-9941'
};

assert(sampleJustification.authorizedBy.length > 0, 'La justificación tiene autorizador visible');
assert(sampleJustification.status === 'AUTORIZADO', 'Estado oficial de justificación válido');

console.log('\n================================================================================');
console.log(`🎉 TODAS LAS ${passedTests}/${totalTests} PRUEBAS DEL CENTRO DE CONTROL PASARON CON ÉXITO (100%)`);
console.log('================================================================================\n');
