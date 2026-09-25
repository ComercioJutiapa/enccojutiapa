/**
 * test_reports_honor_stats_sidebar_visibility.js
 * 
 * Verifica que los 3 módulos críticos estén visibles en el sidebar y no ocultos:
 * 1. Boletín de Calificaciones (reports)
 * 2. Cuadros de Honor (honor-roll)
 * 3. Promedios y Estadísticas / Estadísticas por Grado (grade-stats)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 PRUEBAS: VISIBILIDAD DE BOLETÍN, CUADRO DE HONOR Y ESTADÍSTICAS');
console.log('================================================================\n');

const html = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// TEST 1: Elementos del sidebar en plataforma.html
console.log('▶ [TEST 1] Verificando presencia en el sidebar de plataforma.html...');

assert(html.includes('data-view="honor-roll"'), 'Debe existir enlace a Cuadros de Honor (honor-roll)');
assert(html.includes('data-view="reports"'), 'Debe existir enlace a Boletín de Calificaciones (reports)');
assert(html.includes('data-view="grade-stats"'), 'Debe existir enlace a Promedios y Estadísticas (grade-stats)');

assert(html.includes('REPORTES Y CUADRO DE HONOR'), 'Debe existir el encabezado REPORTES Y CUADRO DE HONOR');
assert(html.includes('Boletín de Calificaciones'), 'Debe mostrar el texto exacto Boletín de Calificaciones');
assert(html.includes('Cuadros de Honor'), 'Debe mostrar el texto exacto Cuadros de Honor');
assert(html.includes('Promedios y Estadísticas'), 'Debe mostrar el texto exacto Promedios y Estadísticas');

console.log('  ✅ Test 1 Superado: Los 3 módulos están presentes de forma directa en el sidebar.');

// TEST 2: No están dentro de grupos colapsables que los oculten
console.log('\n▶ [TEST 2] Verificando que no estén encerrados en acordeones colapsables...');
const reportsIndex = html.indexOf('data-view="reports"');
const honorIndex = html.indexOf('data-view="honor-roll"');
const statsIndex = html.indexOf('data-view="grade-stats"');

const snippet = html.substring(Math.min(reportsIndex, honorIndex, statsIndex) - 200, Math.max(reportsIndex, honorIndex, statsIndex) + 300);
assert(!snippet.includes('nav-group-items'), 'No deben estar dentro de nav-group-items colapsables.');
assert(!snippet.includes('navGroup-reports'), 'No debe existir contenedor navGroup-reports colapsable.');

console.log('  ✅ Test 2 Superado: Los módulos están en la estructura original sin colapsarse.');

// TEST 3: RBAC en app.js no oculta grade-stats para docentes y personal escolar
console.log('\n▶ [TEST 3] Verificando permisos en app.js para docentes y auxiliares...');

assert(app.includes("allowedStats = ['director', 'direccion', 'secretaria', 'admin', 'super_usuario', 'docente', 'catedratico', 'profesor_auxiliar', 'auxiliar', 'auxiliatura']"),
  'allowedStats en app.js debe incluir docente y profesor_auxiliar para grade-stats');

console.log('  ✅ Test 3 Superado: grade-stats accesible para docentes y autoridades sin ser bloqueado.');

console.log('\n================================================================');
console.log('🎉 TODAS LAS VERIFICACIONES DE VISIBILIDAD PASARON AL 100%');
console.log('================================================================\n');
