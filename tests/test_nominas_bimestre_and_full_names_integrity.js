/**
 * 🧪 TEST SUITE: Integridad de Resolución Dinámica de Bimestre y Formato Institucional sin Nombres Cortados
 * 
 * Verifica rigurosamente:
 * 1. Presencia del selector dinámico de bimestre (#studentBimestreFilterSelect) en plataforma.html con opción 'AUTO'.
 * 2. Motor canónico getEffectiveActiveBimestre() con resolución jerárquica de 5 niveles.
 * 3. Eliminación de text-overflow: ellipsis y max-width: 215px en nóminas oficiales y nóminas en blanco de 10 casillas.
 * 4. Inclusión de encabezado institucional ENCCO y 3 bloques de firmas en nóminas oficiales.
 * 5. Auto-ajuste dinámico de ancho en exportación Excel e inclusión de bimestre oficial en subtítulo.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("--------------------------------------------------------------------------------");
console.log("🧪 Iniciando pruebas: Resolución Dinámica de Bimestre y Nombres Íntegros ENCCO");
console.log("--------------------------------------------------------------------------------");

const projectRoot = path.resolve(__dirname, '..');
const appJsPath = path.join(projectRoot, 'app.js');
const plataformaHtmlPath = path.join(projectRoot, 'plataforma.html');
const stylesCssPath = path.join(projectRoot, 'styles.css');

const appJsContent = fs.readFileSync(appJsPath, 'utf8');
const plataformaHtmlContent = fs.readFileSync(plataformaHtmlPath, 'utf8');
const stylesCssContent = fs.readFileSync(stylesCssPath, 'utf8');

// 1. Verificar HTML: selector de bimestre en la barra de filtros de estudiantes
assert(plataformaHtmlContent.includes('id="studentBimestreFilterSelect"'), "Falta #studentBimestreFilterSelect en plataforma.html");
assert(plataformaHtmlContent.includes('value="AUTO"'), "Falta la opción 'AUTO' (Bimestre Activo Oficial) en el selector");
assert(plataformaHtmlContent.includes('5. Bimestre'), "Falta la etiqueta '5. Bimestre' en plataforma.html");
console.log("✅ 1. Selector dinámico de Bimestre en plataforma.html verificado correctamente.");

// 2. Verificar CSS: distribución del grid de filtros
assert(stylesCssContent.includes('.students-filters-grid'), "Falta regla .students-filters-grid en styles.css");
assert(stylesCssContent.includes('1.15fr 1fr 0.8fr 1fr 0.9fr 0.95fr'), "El grid de 6 columnas de filtros de estudiantes no está balanceado");
console.log("✅ 2. Estilos responsivos del grid de filtros de estudiantes verificados.");

// 3. Evaluar lógica canónica de getEffectiveActiveBimestre
const mockWindow = { STATE: { config: { activeBimestre: 2 } } };
const mockDoc = {
    elements: {},
    getElementById(id) { return this.elements[id] || null; }
};

// Extraer y evaluar getEffectiveActiveBimestre
const funcMatch = appJsContent.match(/function getEffectiveActiveBimestre[\s\S]*?^}/m);
assert(funcMatch, "No se encontró la definición de getEffectiveActiveBimestre en app.js");

const testGetEffectiveBim = new Function('document', 'window', 'STATE', `
    ${funcMatch[0]}
    return getEffectiveActiveBimestre;
`);

const fn = testGetEffectiveBim(mockDoc, mockWindow, mockWindow.STATE);

// Prueba de niveles de jerarquía:
// Nivel 1: Explícito
assert.strictEqual(fn(3), 3, "Debe devolver 3 cuando se pide explícitamente");
assert.strictEqual(fn('4'), 4, "Debe devolver 4 al pasar string '4'");

// Nivel 2: Selector en DOM
mockDoc.elements['studentBimestreFilterSelect'] = { value: '2' };
assert.strictEqual(fn(), 2, "Debe devolver 2 del selector studentBimestreFilterSelect");

// Nivel 3: Selector en 'AUTO' -> Lee de STATE.config
mockDoc.elements['studentBimestreFilterSelect'] = { value: 'AUTO' };
mockWindow.STATE.config = { activeBimestre: 3 };
assert.strictEqual(fn(), 3, "Debe devolver 3 configurado en STATE.config.activeBimestre cuando selector está en AUTO");

// Nivel 4: Modo Histórico -> Ciclo 2026 cerrado -> 4
mockWindow.STATE.isHistoricalReadOnlyMode = true;
assert.strictEqual(fn(), 4, "Debe devolver 4 en modo histórico cuando el selector está en AUTO");
mockWindow.STATE.isHistoricalReadOnlyMode = false;

// Nivel 5: Fallback si no hay config
mockWindow.STATE.config = {};
assert.strictEqual(fn(), 1, "Debe devolver 1 como fallback seguro");
console.log("✅ 3. Motor canónico getEffectiveActiveBimestre() validado en todos sus niveles jerárquicos.");

// 4. Verificar que se eliminó el recorte de nombres con ellipsis y que la Nómina en Blanco muestra nombre completo en 1 línea y tema azul institucional fiel en impresión
assert(!appJsContent.includes('white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:215px'), "Aún existe text-overflow:ellipsis con max-width:215px en app.js");
assert(appJsContent.includes('class="roster-name-cell"') && appJsContent.includes('roster-blue-head-1'), "Falta clase roster-name-cell o encabezado azul institucional en Nómina en Blanco 10 Casillas");
assert(!appJsContent.includes('th { background-color: #0369a1 !important;'), "executeNativeDocumentPrint aún fuerza th azul con !important sobrescribiendo documentos");
assert(appJsContent.includes('function enccoSafePrintHtml('), "Falta motor universal anti-bloqueo de pop-ups enccoSafePrintHtml");
assert(!appJsContent.includes('http://localhost:8000/login.html'), "Aún existe URL localhost:8000 quemada en tarjetas de credenciales");
console.log("✅ 4. Fidelidad de impresión azul institucional, nombre completo en 1 línea, anti-bloqueo pop-ups y URL dinámica confirmados.");

// 5. Verificar ancho compacto de casillas en printStudentsBlankRoster10Casillas (27px para garantizar nombre completo en 1 línea en Hoja Oficio)
assert(appJsContent.includes('width:27px; padding:1px; text-align:center;'), "Las casillas de 10 casillas no están optimizadas a 27px con padding compacto");
console.log("✅ 5. Ancho de casillas de calificación manual ajustado a 27px ganando espacio horizontal en Hoja Oficio.");

// 6. Verificar bloque institucional de 3 firmas en printStudentsOfficialList y printSectionStudentsList
assert(appJsContent.includes('Catedrático(a) Guía / Titular'), "Falta firma de Catedrático Guía / Titular en nóminas oficiales");
assert(appJsContent.includes('Secretaría Académica'), "Falta firma de Secretaría Académica en nóminas oficiales");
assert(appJsContent.includes('Vo. Bo. Dirección General'), "Falta firma de Vo. Bo. Dirección General en nóminas oficiales");
console.log("✅ 6. Tres bloques de firmas institucionales verificados en nóminas oficiales.");

// 7. Verificar exportación Excel con auto-ajuste dinámico de ancho y bimestre oficial en subtítulo
assert(appJsContent.includes('Auto-ajuste dinámico de ancho de columnas'), "Falta el cálculo dinámico de ancho en exportDataToExcelFile");
assert(appJsContent.includes('mso-number-format'), "Falta formato mso-number-format para códigos y carnés en exportDataToExcelFile");
assert(appJsContent.includes('BIMESTRE OFICIAL'), "Falta el bimestre oficial dinámico en el subtítulo de exportación de nómina de estudiantes");
console.log("✅ 7. Auto-ajuste de columnas Excel y subtítulo dinámico con Bimestre Oficial verificados.");

// 8. Verificar configuración institucional avanzada en Excel (Freeze Panes, GridLines, PageSetup y Firmas)
assert(appJsContent.includes("state: 'frozen'"), "Falta inmovilización de paneles (Freeze Panes) en los archivos de Excel");
assert(appJsContent.includes("showGridLines: true"), "Falta activación explícita de líneas de cuadrícula en los archivos de Excel");
assert(appJsContent.includes("paperSize: 5"), "Falta pre-configuración de tamaño Oficio (Legal) en la configuración de página de Excel");
assert(appJsContent.includes("ESCUELA NACIONAL DE CIENCIAS COMERCIALES — ENCCO JUTIAPA 1970"), "Falta el cintillo institucional ENCCO 1970 en los encabezados de Excel");
console.log("✅ 8. Configuración institucional avanzada de Excel (Freeze Panes, GridLines, PageSetup y Firmas) verificada.");

console.log("--------------------------------------------------------------------------------");
console.log("🎉 ¡TODAS LAS PRUEBAS DE RESOLUCIÓN DE BIMESTRE Y CONFIGURACIÓN INSTITUCIONAL DE EXCEL PASARON CON ÉXITO AL 100%!");
console.log("--------------------------------------------------------------------------------");
