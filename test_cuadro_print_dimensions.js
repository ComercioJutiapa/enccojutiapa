const fs = require('fs');
const assert = require('assert');

console.log("=== INICIANDO VALIDACIÓN DE AJUSTE A HOJA CARTA HORIZONTAL, FIRMA Y NOMBRE INSTITUCIONAL ===");

const gradeStats = fs.readFileSync('grade_stats.js', 'utf8');
const stylesCss = fs.readFileSync('styles.css', 'utf8');

// 1. Validar @page { size: letter landscape; margin: 4mm 6mm; } en printCuadroEstadisticoOficial
assert(gradeStats.includes('size: letter landscape'), "Debe incluir size: letter landscape en grade_stats.js");
assert(gradeStats.includes('margin: 4mm 6mm'), "Debe incluir márgenes 4mm 6mm en grade_stats.js");
assert(gradeStats.includes('display: flex') && gradeStats.includes('align-items: center') && gradeStats.includes('justify-content: center'), "Debe centrar vertical y horizontalmente en grade_stats.js");
assert(gradeStats.includes('max-width: 268mm'), "Debe usar ancho de hoja carta horizontal ~268mm en grade_stats.js");
assert(gradeStats.includes('page-break-inside: avoid !important'), "Debe evitar saltos de página");

// 2. Validar toolbar de zoom interactivo en renderCuadroEstadisticoOficial
assert(gradeStats.includes('setCuadroZoom'), "Debe incluir función setCuadroZoom para zoom interactivo");
assert(gradeStats.includes('printCuadroEstadisticoOficial'), "Debe incluir botón de impresión directa");
assert(gradeStats.includes('110% Ampliado'), "Debe incluir opción 110% Ampliado por defecto");

// 3. Validar espacio para la firma
assert(gradeStats.includes('sig-space'), "Debe incluir clase sig-space para espacio vertical de firma en impresión");
assert(gradeStats.includes('height:52px;') || gradeStats.includes('height: 52px;'), "Debe tener altura de al menos 50px para firma física");

// 4. Validar que se quitó la palabra ENCCO del nombre de establecimiento del Cuadro
assert(!gradeStats.includes("CIENCIAS COMERCIALES (ENCCO)"), "No debe incluir (ENCCO) en el nombre del establecimiento");
assert(gradeStats.includes("establecimiento: 'ESCUELA NACIONAL DE CIENCIAS COMERCIALES'"), "Debe tener el nombre institucional sin la palabra ENCCO");

// 5. Validar estilos en styles.css
assert(stylesCss.includes('size: letter landscape !important;'), "Debe incluir size: letter landscape !important en styles.css");
assert(stylesCss.includes('margin: 4mm 6mm !important;'), "Debe incluir margin: 4mm 6mm !important en styles.css");
assert(stylesCss.includes('max-width: 268mm !important;'), "Debe incluir max-width: 268mm !important en styles.css");
assert(stylesCss.includes('max-width: 1240px;'), "Debe incluir max-width: 1240px para vista en pantalla ampliada en styles.css");

console.log("✓ Todos los criterios de Hoja Carta Horizontal, Espacio de Firma y Nombre Institucional están verificados al 100%.");
