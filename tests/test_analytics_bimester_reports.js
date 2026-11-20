/**
 * tests/test_analytics_bimester_reports.js
 * Prueba automatizada de Gráficas por Bimestre y Reportes para Claustro Docente:
 * Hombres y Mujeres, Grado y Sección, Por Docentes, Por Cátedras, Responsividad e Impresión.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('🧪 Iniciando Test Suite: Analítica por Bimestre (H/M, Grado/Sección, Docentes, Cátedras)...\n');

const rootDir = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(rootDir, 'analytics_bimester_reports.js'), 'utf8');
const html = fs.readFileSync(path.join(rootDir, 'plataforma.html'), 'utf8');

new vm.Script(code, { filename: 'analytics_bimester_reports.js' });
assert(html.includes('src="analytics_bimester_reports.js'), 'analytics_bimester_reports.js cargado en plataforma.html');
console.log('  ✅ 1. Sintaxis e integración en plataforma.html verificadas.');

let injectedCss = '';
const domMap = { enccoAnalyticsBimesterHub: { innerHTML: '' } };
let lastPrint = { title: '', html: '', orient: '' };

const mockDocument = {
    head: { appendChild(el) { if (el && el.textContent) injectedCss += el.textContent; } },
    createElement(tag) { return { tag, id: '', textContent: '' }; },
    getElementById(id) { return domMap[id] || null; }
};

const mockWindow = {
    document: mockDocument,
    renderAndShowPrintDocument(title, htmlOut, orient) { lastPrint = { title, html: htmlOut, orient }; },
    STATE: {
        activeCycle: '2027',
        pensum: [
            { subject: 'Contabilidad de Sociedades', grade: '4to Perito Contador', section: 'A', teacher: 'Prof. Carlos Méndez' },
            { subject: 'Matemática Comercial', grade: '4to Perito Contador', section: 'A', teacher: 'Profa. Ana López' }
        ],
        students: [
            {
                id: 's1', cycle: '2027', name: 'PÉREZ JUAN', gender: 'Masculino', grade: '4to Perito Contador', section: 'A', status: 'Activo',
                grades: { 'Contabilidad de Sociedades': [80, 85, 0, 0], 'Matemática Comercial': [50, 55, 0, 0] }
            },
            {
                id: 's2', cycle: '2027', name: 'GÓMEZ MARÍA', gender: 'Femenino', grade: '4to Perito Contador', section: 'A', status: 'Activo',
                grades: { 'Contabilidad de Sociedades': [90, 95, 0, 0], 'Matemática Comercial': [70, 75, 0, 0] }
            },
            {
                id: 's2026', cycle: '2026', name: 'HISTÓRICO 2026', gender: 'Masculino', grade: '4to Perito Contador', section: 'A', status: 'Activo',
                grades: { 'Contabilidad de Sociedades': [10, 10, 10, 10] }
            }
        ]
    }
};
mockWindow.window = mockWindow;

const ctx = vm.createContext({ window: mockWindow, document: mockDocument, console, Map, Set, Date, Array, Object, String, Number, Math, parseInt, isNaN });
vm.runInContext(code, ctx);

// 2. Validar cálculos por Bimestre, Hombres/Mujeres, Secciones, Docentes y Cátedras
const ds = mockWindow.computeBimesterAnalytics('1');
assert.strictEqual(ds.cycle, '2027');
assert.strictEqual(ds.totalStudents, 2, 'Aislamiento multiciclo: solo 2 alumnos de 2027 (excluye 2026)');
assert.strictEqual(ds.gender.male.totalStudents, 1);
assert.strictEqual(ds.gender.female.totalStudents, 1);
assert.strictEqual(ds.gender.male.avg, 65, 'Promedio B1 Hombres = (80+50)/2 = 65');
assert.strictEqual(ds.gender.female.avg, 80, 'Promedio B1 Mujeres = (90+70)/2 = 80');
assert.strictEqual(ds.sections.length, 1);
assert.strictEqual(ds.teachers.length, 2);
assert.strictEqual(ds.subjects.length, 2);
assert(ds.bimesters[0].avg === 72.5 && ds.bimesters[1].avg === 77.5, 'Evolución B1 (72.5) -> B2 (77.5) calculada exactamente');
console.log('  ✅ 2. Desgloses por Bimestre, Hombres/Mujeres, Grado/Sección, Docentes y Cátedras exactos.');

// 3. Renderizado de las 5 pestañas + CSS responsivo
['bimesters', 'gender', 'sections', 'teachers', 'subjects'].forEach(tab => {
    mockWindow.setAnalyticsHubTab(tab);
    assert(domMap.enccoAnalyticsBimesterHub.innerHTML.length > 200, `Pestaña ${tab} renderizada`);
});
assert(injectedCss.includes('table-layout: fixed') && injectedCss.includes('@media (max-width: 900px)'), 'CSS responsivo (escritorio, tablet, móvil) verificado');
console.log('  ✅ 3. 5 pestañas visuales y CSS responsivo verificados.');

// 4. Reporte para Claustro Docente e Informe Individual por Docente
mockWindow.printClaustroDocentesAnalyticsReport();
assert(lastPrint.html.includes('INFORME DE MEJORA ESCOLAR') && lastPrint.html.includes('8.5in 13in portrait') && lastPrint.html.includes('<svg'), 'Informe de Claustro incluye gráficas SVG y Hoja Oficio Azul Institucional');

mockWindow.printIndividualTeacherAnalyticsReport('Profa. Ana López');
assert(lastPrint.html.includes('INFORME PEDAGÓGICO INDIVIDUAL POR DOCENTE') && lastPrint.html.includes('PÉREZ JUAN'), 'Informe individual docente incluye lista de estudiantes a reforzar');

mockWindow.printGuideTeacherSectionAnalyticsReport('4to Perito Contador (A)');
assert(lastPrint.html.includes('REPORTE DE TUTORÍA PARA MAESTRO GUÍA') && lastPrint.html.includes('4to Perito Contador (A)'), 'Reporte para Maestro Guía por sección verificado');
console.log('  ✅ 4. Los 3 reportes imprimibles (Claustro, Docente Individual y Maestro Guía) verificados.');

console.log('\n🎯 ¡TODAS LAS PRUEBAS DE ANALÍTICA POR BIMESTRE Y REPORTES DOCENTES PASARON AL 100%!');
