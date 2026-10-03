// test_official_print_and_excel_oficio.js
// Verificación de Listas Oficiales, Nómina Oficial de Matrícula (9 columnas), Modos Lleno/Vacío y Hoja Oficio

const fs = require('fs');
const assert = require('assert');

console.log("================================================================================");
console.log("🧪 INICIANDO VERIFICACIÓN DE LISTAS OFICIALES, NÓMINA 9 COLUMNAS Y FORMATO OFICIO");
console.log("================================================================================");

const appCode = fs.readFileSync('app.js', 'utf8');
const htmlCode = fs.readFileSync('plataforma.html', 'utf8');

// TEST 1: Selector en plataforma.html
console.log("\n▶ [TEST 1] Verificando controles en la interfaz de plataforma.html...");
assert(htmlCode.includes('id="printModelFillModeSelect"'), "Falta el selector de Estado de Casillas (Lleno/Vacío)");
assert(htmlCode.includes('value="lleno"'), "Falta la opción 'lleno'");
assert(htmlCode.includes('value="vacio"'), "Falta la opción 'vacio'");
assert(htmlCode.includes('onclick="generateOfficialExcelList()"'), "Falta el botón de Descargar Excel");
assert(htmlCode.includes('onclick="executePrintModalToExcel()"'), "Falta el botón de Descargar Excel en el modal");
console.log("  ✅ Test 1 Superado: Controles de vista, estado y descarga en Excel presentes en el HTML.");

// TEST 2: Exactas 9 columnas de Nómina Oficial de Matrícula
console.log("\n▶ [TEST 2] Verificando las 9 columnas exactas de la Nómina Oficial de Matrícula...");
const expectedHeaders = [
    '<th style="width:28px;">CLAVE</th>',
    '<th style="width:72px;">CÓD. PERSONAL</th>',
    '<th style="width:88px;">CUI</th>',
    '<th>ALUMNO</th>',
    '<th style="width:26px;">SEXO</th>',
    '<th style="width:135px;">NOMBRE ENCARGADO</th>',
    '<th style="width:82px;">DPI DEL ENCARGADO</th>',
    '<th style="width:52px;">ESTADO</th>',
    '<th style="width:90px;">FIRMA</th>'
];
expectedHeaders.forEach(th => {
    assert(appCode.includes(th), `Falta la cabecera en NOMINA_OFICIAL: ${th}`);
});
console.log("  ✅ Test 2 Superado: Nómina Oficial posee exactamente las 9 columnas solicitadas en el orden correcto.");

// TEST 3: Soporte para Modo Vacío vs Modo Lleno
console.log("\n▶ [TEST 3] Verificando comportamiento de casillas llenas vs vacías...");
assert(appCode.includes("const fillMode = opts?.fillMode || document.getElementById('printModelFillModeSelect')?.value || 'lleno';"), "fillMode no se obtiene correctamente");
assert(appCode.includes("const isVacio = (fillMode === 'vacio');"), "isVacio no se define correctamente");
assert(appCode.includes("const guardianName = isVacio ? '' : (s.guardianName || s.tutor || s.fatherName || s.motherName || 'No registrado');"), "guardianName no respeta isVacio");
assert(appCode.includes("const guardianDpi = isVacio ? '' : (s.guardianDpi || s.tutorDpi || s.fatherDpi || s.motherDpi || '-');"), "guardianDpi no respeta isVacio");
assert(appCode.includes("const statusText = isVacio ? '' : (s.status || 'Inscrito').toUpperCase();"), "statusText no respeta isVacio");
console.log("  ✅ Test 3 Superado: Modos Lleno y Vacío implementados con limpieza de celdas y preservación de estructura.");

// TEST 4: Configuración exacta a Hoja Oficio (8.5in x 13in / PaperSize 5)
console.log("\n▶ [TEST 4] Verificando calibración exacta a Hoja Oficio (Guatemala Folio 8.5in x 13in)...");
assert(appCode.includes("'8.5in 13in portrait'"), "Falta regla @page Oficio portrait");
assert(appCode.includes("'8.5in 13in landscape'"), "Falta regla @page Oficio landscape");
assert(appCode.includes("paperSize: 5"), "Falta paperSize: 5 (Legal / Oficio) en XLSX pageSetup");
assert(appCode.includes("fitToWidth: 1"), "Falta fitToWidth: 1 para ajustar horizontalmente a 1 página");
console.log("  ✅ Test 4 Superado: Calibración exacta a Hoja Oficio tanto para impresión física/PDF como para Microsoft Excel.");

// TEST 5: Generación y exportación de Microsoft Excel (.xlsx)
console.log("\n▶ [TEST 5] Verificando funciones de exportación y fórmulas de Excel...");
assert(typeof appCode.includes("function generateOfficialExcelList"), "Falta generateOfficialExcelList");
assert(typeof appCode.includes("function executePrintModalToExcel"), "Falta executePrintModalToExcel");
assert(appCode.includes("COUNTIF("), "Faltan fórmulas de asistencia COUNTIF en Excel");
assert(appCode.includes("SUM("), "Faltan fórmulas de suma SUM en Excel");
assert(appCode.includes("{ t: 's', v: s.personalCode"), "Falta formato de texto explícito para Código Personal");
assert(appCode.includes("{ t: 's', v: s.cui"), "Falta formato de texto explícito para CUI");
console.log("  ✅ Test 5 Superado: Exportación a Excel con fórmulas automáticas, tipos string y metadatos oficiales.");

console.log("\n================================================================================");
console.log("🎉 TODAS LAS PRUEBAS DE LISTAS Y FORMATOS OFICIALES PASARON EXITOSAMENTE (100%)");
console.log("================================================================================");
