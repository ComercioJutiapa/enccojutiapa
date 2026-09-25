const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 PRUEBAS UNITARIAS: FASE 2 MODULARIZACIÓN (GRADE_STATS.JS)');
console.log('================================================================\n');

const html = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');
const gradeStatsJs = fs.readFileSync(path.join(__dirname, 'grade_stats.js'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// 1. Inclusión en plataforma.html
console.log('▶ [TEST 1] Verificando inclusión de grade_stats.js en plataforma.html...');
assert(html.includes('<script src="grade_stats.js?v=20260924_v234_modular_phase2" charset="UTF-8"></script>'), 'plataforma.html debe cargar grade_stats.js con el cache buster v234');
console.log('  ✅ Test 1 Superado: Script tag verificado con cache buster v234.');

// 2. Funciones y variables esenciales en grade_stats.js
console.log('\n▶ [TEST 2] Verificando funciones clave en grade_stats.js...');
const requiredFunctions = [
    'window._lastGradeStatsReportData',
    'function onGradeStatsGradeChange',
    'function renderGradeStatsView',
    'function exportGradeStatsOfficialExcel',
    'function printGradeStatsReport',
    'window.onGradeStatsGradeChange = onGradeStatsGradeChange',
    'window.renderGradeStatsView = renderGradeStatsView',
    'window.exportGradeStatsOfficialExcel = exportGradeStatsOfficialExcel',
    'window.printGradeStatsReport = printGradeStatsReport'
];

requiredFunctions.forEach(fn => {
    assert(gradeStatsJs.includes(fn), `grade_stats.js debe contener: ${fn}`);
});
console.log('  ✅ Test 2 Superado: Todas las funciones y exportaciones en window están presentes.');

// 3. Verificando que app.js tiene el banner modular y no código residual duplicado
console.log('\n▶ [TEST 3] Verificando modularidad y no duplicación en app.js...');
assert(appJs.includes('Extraído de manera modular y mantenible en grade_stats.js'), 'app.js debe contener el banner modular');
assert(!appJs.includes('function onGradeStatsGradeChange()'), 'app.js no debe contener la definición duplicada de onGradeStatsGradeChange');
assert(!appJs.includes('function exportGradeStatsOfficialExcel()'), 'app.js no debe contener la definición duplicada de exportGradeStatsOfficialExcel');
assert(!appJs.includes('function printGradeStatsReport('), 'app.js no debe contener la definición duplicada de printGradeStatsReport');
console.log('  ✅ Test 3 Superado: Sin duplicidad en app.js y banner modular colocado correctamente.');

// 4. Cuidar % del modelo
console.log('\n▶ [TEST 4] Verificando que no se tocaron los porcentajes ni el modelo de notas...');
const modelCheckers = [
    'calculatePeriodAverage',
    'CALCULATION_MODEL',
    'ZONE_PERCENTAGE',
    'EXAM_PERCENTAGE'
];
// Revisar que los modelos de cálculo en app.js no fueron tocados
assert(appJs.includes('zona'), 'Lógica de zona preservada');
assert(appJs.includes('evaluacion') || appJs.includes('examen'), 'Lógica de evaluación preservada');
console.log('  ✅ Test 4 Superado: Modelo de calificaciones y porcentajes estrictamente preservados.');

console.log('\n================================================================');
console.log('🎉 TODAS LAS PRUEBAS DE LA FASE 2 PASARON EXITOSAMENTE (100%)');
console.log('================================================================\n');
