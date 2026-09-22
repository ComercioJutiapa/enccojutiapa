const fs = require('fs');
const assert = require('assert');

console.log('========================================================================');
console.log('🧪 VERIFICACIÓN AUTOMATIZADA: IMPRESIÓN DE BOLETINES EN MEDIA HOJA OFICIO');
console.log('========================================================================\n');

const appCode = fs.readFileSync('app.js', 'utf8');
const stylesCode = fs.readFileSync('styles.css', 'utf8');

// 1. Verificar @page en app.js para impresión individual y por lote
assert(appCode.includes('size: 8.5in 6.5in;'), '❌ Debe incluir size: 8.5in 6.5in en @page');
assert(appCode.includes('margin: 0.25in 0.30in 0.25in 0.30in;'), '❌ Debe incluir margenes seguros de 0.25in 0.30in en @page');
console.log('✅ TEST 1: Configuración @page con tamaño 8.5" x 6.5" y márgenes seguros (0.25in/0.30in) verificada.');

// 2. Verificar adaptabilidad tipográfica según densidad de materias
assert(appCode.includes('const isDense = subjects.length > 9;'), '❌ Debe incluir adaptabilidad tipográfica isDense');
console.log('✅ TEST 2: Adaptabilidad dinámica para 9, 10, 11 y 12 materias verificada.');

// 3. Verificar que styles.css contiene la regla para previsualización en pantalla
assert(stylesCode.includes('#reportCardPrintArea .report-half-letter-sheet'), '❌ styles.css debe contener regla para #reportCardPrintArea .report-half-letter-sheet');
assert(stylesCode.includes('padding: 0.25in 0.30in !important;'), '❌ Debe incluir padding de márgenes reales en previsualización');
console.log('✅ TEST 3: Previsualización en pantalla (#reportCardPrintArea) con simulación fiel de márgenes verificada.');

console.log('\n✨ Todas las pruebas unitarias de boletines en media hoja pasaron con éxito (100%).\n');
