/**
 * tests/test_student_docs_audit_and_cui.js
 * Prueba automatizada de la Auditoría Dinámica de Documentos de Expediente y CUI (RENAP).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('🧪 Iniciando Test Suite: Auditoría Dinámica de Documentos de Expediente y CUI...\n');

const rootDir = path.join(__dirname, '..');
const auditCode = fs.readFileSync(path.join(rootDir, 'student_docs_audit.js'), 'utf8');
const htmlCode = fs.readFileSync(path.join(rootDir, 'plataforma.html'), 'utf8');

// 1. Sintaxis e integración en plataforma.html
new vm.Script(auditCode, { filename: 'student_docs_audit.js' });
assert(htmlCode.includes('id="btnToggleDocsAuditPanel"'), 'Botón Auditoría Docs y CUI presente en plataforma.html');
assert(htmlCode.includes('id="studentDocsAuditPanel"'), 'Contenedor studentDocsAuditPanel presente en plataforma.html');
assert(htmlCode.includes('src="student_docs_audit.js'), 'Script student_docs_audit.js cargado en plataforma.html');
console.log('  ✅ 1. Sintaxis e integración en plataforma.html verificadas.');

// 2. Sandbox de ejecución con estudiantes multiciclo y casos de CUI/Documentos
const domMap = {
    studentDocsAuditPanel: { innerHTML: '', style: { display: 'none' } },
    btnToggleDocsAuditPanel: { innerHTML: '', style: {} }
};
let lastPrintedTitle = '';
let lastPrintedHtml = '';
let lastPrintedOrient = '';

let injectedStyleText = '';
const mockDocument = {
    head: {
        appendChild(el) { if (el && el.textContent) injectedStyleText += el.textContent; }
    },
    createElement(tag) { return { tag, id: '', textContent: '' }; },
    getElementById(id) { return domMap[id] || null; },
    querySelector() { return { style: {} }; }
};

const OFFICIAL_DOCS = [
    { key: 'certificados_primaria', title: 'Certificados de 1ero a 6to Primaria' },
    { key: 'diploma_primaria', title: 'Diploma Oficial de 6to Primaria' },
    { key: 'certificados_basico', title: 'Certificados de 1ero a 3ero Básico' },
    { key: 'diploma_basico', title: 'Diploma Oficial de 3ero Básico' },
    { key: 'partida_nacimiento', title: 'Certificación de Nacimiento / Pasaporte' },
    { key: 'dpi_encargado', title: 'Copia de DPI Encargado / Pasaporte' }
];

const fullDocsDelivered = {};
OFFICIAL_DOCS.forEach(d => { fullDocsDelivered[d.key] = { status: 'entregado' }; });

const mockWindow = {
    document: mockDocument,
    OFFICIAL_EXPEDIENTE_DOCS: OFFICIAL_DOCS,
    calculateStudentExpedienteMetrics(st) {
        const docs = (st.expediente && st.expediente.docs) || {};
        let del = 0;
        OFFICIAL_DOCS.forEach(d => { if (docs[d.key] && docs[d.key].status === 'entregado') del++; });
        return { deliveredCount: del, totalRequired: 6, status: del === 6 ? 'completo' : 'incompleto', percent: Math.round((del / 6) * 100) };
    },
    renderAndShowPrintDocument(title, html, orient) {
        lastPrintedTitle = title;
        lastPrintedHtml = html;
        lastPrintedOrient = orient;
    },
    STATE: {
        activeCycle: '2027',
        students: [
            // Alumno completo 2027
            { id: 'st-ok', cycle: '2027', name: 'PÉREZ ANA', grade: '4to Perito Contador', section: 'A', gradeCode: '4A', status: 'Activo', cui: '2987654321012', personalCode: 'A123BCD', expediente: { docs: fullDocsDelivered } },
            // Alumno sin CUI y sin documentos 2027
            { id: 'st-nocui', cycle: '2027', name: 'LÓPEZ CARLOS', grade: '4to Perito Contador', section: 'A', gradeCode: '4A', status: 'Activo', cui: '', personalCode: '', expediente: { docs: {} } },
            // Alumno con CUI incompleto (11 dígitos) 2027
            { id: 'st-badcui', cycle: '2027', name: 'GÓMEZ LUIS', grade: '4to Perito Contador', section: 'A', gradeCode: '4A', status: 'Activo', cui: '12345678901', personalCode: 'B456EFG', expediente: { docs: { partida_nacimiento: { status: 'entregado' } } } },
            // Dos alumnos con CUI duplicado en 2027
            { id: 'st-dup1', cycle: '2027', name: 'RUIZ MARÍA', grade: '5to Perito Contador', section: 'B', gradeCode: '5B', status: 'Activo', cui: '3111222333444', personalCode: 'C789HIJ', expediente: { docs: fullDocsDelivered } },
            { id: 'st-dup2', cycle: '2027', name: 'RUIZ PEDRO', grade: '5to Perito Contador', section: 'B', gradeCode: '5B', status: 'Activo', cui: '3111222333444', personalCode: 'D012KLM', expediente: { docs: fullDocsDelivered } },
            // Alumno 2026 (NO debe mezclarse en 2027)
            { id: 'st-2026', cycle: '2026', name: 'HISTÓRICO 2026', grade: '4to Perito Contador', section: 'A', gradeCode: '4A', status: 'Activo', cui: '9999888877771', personalCode: 'H2026', expediente: { docs: {} } },
            // Egresado (NO debe aparecer)
            { id: 'st-egr', cycle: '2027', name: 'GRADUADO', grade: '6to Perito Contador', section: 'A', gradeCode: 'EGRESADO', status: 'Egresado', cui: '9999888877772', personalCode: 'E2026', expediente: { docs: {} } }
        ]
    }
};
mockWindow.window = mockWindow;

const ctx = vm.createContext({ window: mockWindow, document: mockDocument, console, Map, Set, Date, Array, Object, String, Number, Math, encodeURIComponent, setTimeout });
vm.runInContext(auditCode, ctx);

// 3. Validaciones de CUI RENAP
assert.strictEqual(mockWindow.validateStudentCuiForAudit('2987654321012').status, 'valid');
assert.strictEqual(mockWindow.validateStudentCuiForAudit('').status, 'missing');
assert.strictEqual(mockWindow.validateStudentCuiForAudit('12345678901').status, 'invalid');
assert.strictEqual(mockWindow.validateStudentCuiForAudit('0000000000000').status, 'invalid');
assert.strictEqual(mockWindow.validateStudentCuiForAudit('298765432101A').status, 'invalid');
assert.strictEqual(mockWindow.validateStudentCuiForAudit('3111222333444', new Set(['3111222333444'])).status, 'duplicate');
console.log('  ✅ 2. Validación de CUI RENAP (válido, faltante, incompleto, letras, repetidos, duplicado) aprobada.');

// 4. Dataset multiciclo y KPIs
const ds = mockWindow.buildStudentDocsAuditDataset();
assert.strictEqual(ds.activeCycle, '2027');
assert.strictEqual(ds.kpis.total, 5, 'Debe incluir solo los 5 estudiantes activos de 2027 (excluyendo 2026 y Egresado)');
assert.strictEqual(ds.kpis.completeDocsCount, 3, '3 estudiantes con 6/6 documentos completos');
assert.strictEqual(ds.kpis.incompleteDocsCount, 2, '2 estudiantes con documentos incompletos');
assert.strictEqual(ds.kpis.cuiBadCount, 2, '2 estudiantes con CUI faltante o incompleto');
assert.strictEqual(ds.kpis.cuiDupCount, 2, '2 estudiantes con CUI duplicado');
assert.strictEqual(ds.kpis.noCodeCount, 1, '1 estudiante sin Código Personal');
console.log('  ✅ 3. Aislamiento multiciclo 2027 y KPIs documentales exactos.');

// 5. Filtros rápidos y filtro por documento faltante
mockWindow.setStudentDocsAuditFilter('cui_dup');
assert.strictEqual(mockWindow.buildStudentDocsAuditDataset().rows.length, 2, 'Filtro cui_dup retorna 2 alumnos');
mockWindow.setStudentDocsAuditFilter('all');
mockWindow.setStudentDocsAuditMissingDoc('dpi_encargado');
assert.strictEqual(mockWindow.buildStudentDocsAuditDataset().rows.length, 2, 'Filtro por DPI Encargado faltante retorna 2 alumnos');
mockWindow.setStudentDocsAuditMissingDoc('ALL');
console.log('  ✅ 4. Filtros rápidos (CUI duplicados y documento específico faltante) verificados.');

// 6. Renderizado de panel responsivo (escritorio, tablet y móvil) e Impresión en Azul Institucional Oficio Horizontal
mockWindow.toggleStudentDocsAuditPanel(true);
assert(domMap.studentDocsAuditPanel.innerHTML.includes('Auditoría de Documentos de Expediente y CUI'), 'Panel renderizado correctamente');
assert(domMap.studentDocsAuditPanel.innerHTML.includes('class="col-id"') && domMap.studentDocsAuditPanel.innerHTML.includes('docs-audit-cards'), 'Incluye columnas compactas sin desborde y tarjetas táctiles para pantallas verticales');
assert(injectedStyleText.includes('table-layout: fixed') && injectedStyleText.includes('@media (max-width: 1150px)') && injectedStyleText.includes('@media (max-width: 900px)'), 'Reglas CSS responsivas (100% ajuste sin corte horizontal, tablet y móvil) inyectadas correctamente');
mockWindow.printStudentDocsAuditReport();
assert.strictEqual(lastPrintedOrient, 'landscape', 'Reporte impreso en orientación horizontal');
assert(lastPrintedHtml.includes('8.5in 13in landscape') && lastPrintedHtml.includes('#0369a1'), 'Impresión en Hoja Oficio 8.5x13 y Azul Institucional');
console.log('  ✅ 5. Renderizado responsivo (ventana, tablet, móvil) e impresión Azul Institucional Oficio verificados.');

// 7. Verificar guardado atómico sin timeout en saveStudentProfileForm y sincronización de documentos
const appCode = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
assert(appCode.includes("function _syncStudentExpedienteAtomicToRtdb(student, nowTime)"), 'Debe existir helper atómico _syncStudentExpedienteAtomicToRtdb');
assert(appCode.includes("EnccoCloudSync.patchNode('students/' + studentIndex, studentAtomicPatch)"), 'saveStudentProfileForm debe usar patchNode atómico por estudiante (~2 KB) en vez de subir todos los alumnos');
assert(appCode.includes("modular.auth && modular.auth.currentUser"), 'saveStudentProfileForm debe condicionar setDoc en Firestore a sesión Auth activa');
assert(appCode.includes("window.renderStudentDocsAuditPanel()"), 'saveStudentProfileForm debe refrescar el panel de Auditoría Docs y CUI cuando esté abierto');
console.log('  ✅ 6. Guardado atómico en RTDB (patchNode), guarda de Firestore Auth y refresco automático de Auditoría verificados.');

console.log('\n🎯 ¡TODAS LAS PRUEBAS DE AUDITORÍA DE DOCUMENTOS Y CUI PASARON AL 100%!');
