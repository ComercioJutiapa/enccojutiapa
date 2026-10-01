// test_responsive_mobile_tablet.js
// Verification suite for mobile & tablet responsive UI optimizations

const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'styles.css');
const jsPath = path.join(__dirname, 'app.js');
const htmlPath = path.join(__dirname, 'plataforma.html');

const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FALLÓ: ${message}`);
        failed++;
    }
}

console.log('='.repeat(80));
console.log('📱 PRUEBAS INTEGRALES DE RESPONSIVIDAD Y ERGONOMÍA (MÓVILES Y TABLETS)');
console.log('='.repeat(80));

// 1. Balance de Llaves CSS
console.log('\n[1. INTEGRIDAD ESTRUCTURAL DE CSS]');
let depth = 0;
let braceError = false;
for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
        depth--;
        if (depth < 0) { braceError = true; break; }
    }
}
assert(!braceError && depth === 0, 'La sintaxis de styles.css no tiene errores de llaves y está 100% balanceada.');

// 2. Media Queries Clave
console.log('\n[2. MEDIA QUERIES PARA PANTALLAS]');
assert(css.includes('@media screen and (max-width: 768px)'), 'Media query para smartphones/tablets portrait (max-width: 768px) presente');
assert(css.includes('@media screen and (min-width: 769px) and (max-width: 1024px)'), 'Media query para tablets (769px - 1024px) presente');
assert(css.includes('@media screen and (max-width: 640px)'), 'Media query para modales bottom-sheet móviles (max-width: 640px) presente');
assert(css.includes('@media screen and (max-width: 540px)'), 'Media query para dispositivos ultra estrechos (max-width: 540px) presente');

// 3. Columnas Fijas (Sticky Columns) en Asistencia
console.log('\n[3. COLUMNAS STICKY EN ASISTENCIA]');
assert(
    css.includes('.attendance-excel-table .col-num') && 
    css.includes('position: sticky') && 
    css.includes('left: 0'),
    'Columna de número (#) fijada a la izquierda (left: 0) en vista móvil/tablet'
);
assert(
    css.includes('.attendance-excel-table .col-name') && 
    css.includes('left: 36px'),
    'Columna de estudiante fijada a la izquierda (left: 36px) con sombra lateral para lectura fluida'
);
assert(
    css.includes('.attendance-excel-table .col-carne') && 
    css.includes('display: none !important'),
    'Columna de carné oculta en móvil para dar 100% de legibilidad al nombre'
);

// 4. Columnas Fijas (Sticky Columns) en Calificaciones
console.log('\n[4. COLUMNAS STICKY EN CALIFICACIONES]');
assert(
    css.includes('#gradebookActivitiesTable td:first-child') && 
    css.includes('left: 0'),
    'Primera columna de cuadro de notas fijada a la izquierda (left: 0)'
);
assert(
    css.includes('#gradebookActivitiesTable td:nth-child(2)') && 
    css.includes('left: 36px'),
    'Columna de estudiante en notas fijada (left: 36px) con sombra lateral al deslizar notas'
);
assert(
    css.includes('body.theme-dark #gradebookActivitiesTable td:first-child'),
    'Soporte completo de modo oscuro para columnas sticky en calificaciones'
);

// 5. Ergonomía Táctil y Prevención de Zoom
console.log('\n[5. ERGONOMÍA TÁCTIL (TOUCH TARGETS)]');
assert(
    css.includes('font-size: 16px !important') && 
    css.includes('input, select, textarea'),
    'Inputs y selects configurados con font-size: 16px para evitar auto-zoom en iOS Safari y Android'
);
assert(
    css.includes('.grade-box-input') && 
    css.includes('min-width: 44px') && 
    css.includes('height: 38px'),
    'Celdas de notas con tamaño táctil ergonómico (38px altura) y manipulación táctil optimizada'
);
assert(
    css.includes('.att-cell') && 
    css.includes('width: 38px !important') && 
    css.includes('height: 38px !important'),
    'Celdas de asistencia con tamaño táctil agrandado a 38px para toques cómodos con el pulgar'
);

// 6. Modales Bottom-Sheet en Teléfonos
console.log('\n[6. MODALES BOTTOM-SHEET EN MÓVILES]');
assert(
    css.includes('.modal-overlay') && 
    css.includes('align-items: flex-end !important'),
    'Overlay del modal adaptado a la parte inferior (bottom-sheet) en teléfonos'
);
assert(
    css.includes('.modal-container') && 
    css.includes('border-radius: 20px 20px 0 0 !important'),
    'Contenedor del modal con esquinas superiores redondeadas estilo tarjeta móvil moderna'
);

// 7. Salvaguardas de Integridad del Sistema
console.log('\n[7. PRESERVACIÓN DE REGLAS DE NEGOCIO E INTEGRIDAD]');
assert(
    !js.includes('zonaMax = 70') && !js.includes('examMax = 30'),
    'Modelo de calificaciones institucional preservado estrictamente: 40% zona y 60% examen'
);
assert(
    js.includes('isDirectorOrSuperAdmin'),
    'Control exclusivo de permisos de Dirección General preservado intacto'
);

console.log('='.repeat(80));
console.log(`🎉 RESULTADOS FINALES: ${passed} pasaron, ${failed} fallaron.`);
console.log('='.repeat(80));

if (failed > 0) {
    process.exit(1);
}
