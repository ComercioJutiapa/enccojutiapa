/**
 * tests/test_scholarships_and_ficha_docs.js
 * Suite de pruebas para el Módulo de Becas y Bolsas de Estudio (Multiciclo)
 * y la visualización de Beca + Documentos Faltantes en la Ficha Integral.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('🧪 Iniciando Test Suite: Becas y Bolsas de Estudio + Documentos Faltantes en Ficha Integral...\n');

const rootDir = path.join(__dirname, '..');
const schCode = fs.readFileSync(path.join(rootDir, 'scholarships_module.js'), 'utf8');
const htmlCode = fs.readFileSync(path.join(rootDir, 'plataforma.html'), 'utf8');
const appCode = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');

// 1. Sintaxis e integración estructural
new vm.Script(schCode, { filename: 'scholarships_module.js' });
assert(htmlCode.includes('data-view="scholarships"'), 'Enlace de menú lateral para Becas y Bolsas presente');
assert(htmlCode.includes('id="view-scholarships"'), 'Contenedor #view-scholarships presente');
assert(htmlCode.includes('id="profScholarshipHeaderBadge"'), 'Insignia de Beca en encabezado de Ficha del Estudiante presente');
assert(htmlCode.includes('id="profScholarshipAndDocsSummaryBox"'), 'Bloque Beca + Documentos Faltantes en Ficha del Estudiante presente');
assert(htmlCode.includes('src="scholarships_module.js'), 'Script scholarships_module.js referenciado en plataforma.html');
assert(appCode.includes("case 'scholarships':"), 'Enrutador renderCurrentView configurado para scholarships');
assert(appCode.includes('6. Estado de Expediente y Documentos Faltantes'), 'Ficha Integral impresa incluye Sección 6 de Documentos Faltantes');
console.log('  ✅ 1. Sintaxis e integración en plataforma.html y app.js verificadas.');

// 2. Sandbox de ejecución
let injectedCss = '';
const domMap = {
    'view-scholarships': { innerHTML: '' },
    'profScholarshipHeaderBadge': { innerHTML: '', style: { display: 'none' } },
    'profScholarshipAndDocsSummaryBox': { innerHTML: '' }
};
let lastPrint = { title: '', html: '', orient: '' };

const mockDocument = {
    head: { appendChild(el) { if (el && el.textContent) injectedCss += el.textContent; } },
    body: { appendChild() {} },
    createElement(tag) { return { tag, id: '', textContent: '', style: {} }; },
    getElementById(id) { return domMap[id] || null; }
};

const mockWindow = {
    document: mockDocument,
    OFFICIAL_EXPEDIENTE_DOCS: [
        { key: 'certificados_primaria', title: 'Certificados de 1ero a 6to Primaria' },
        { key: 'diploma_primaria', title: 'Diploma Oficial de 6to Primaria' },
        { key: 'certificados_basico', title: 'Certificados de 1ero a 3ero Básico' },
        { key: 'diploma_basico', title: 'Diploma Oficial de 3ero Básico' },
        { key: 'partida_nacimiento', title: 'Certificación de Nacimiento / Pasaporte' },
        { key: 'dpi_encargado', title: 'Copia de DPI Encargado / Pasaporte' }
    ],
    calculateStudentExpedienteMetrics(st) {
        const docs = (st.expediente && st.expediente.docs) || {};
        const delivered = Object.values(docs).filter(d => d && d.status === 'entregado').length;
        return { deliveredCount: delivered, totalRequired: 6, status: delivered === 6 ? 'completo' : 'incompleto', percent: Math.round((delivered / 6) * 100) };
    },
    getStudentAttendancePercentageToDate(stuId) {
        return stuId === 's1'
            ? { percentage: 94.0, attendedDays: 47, totalRecordedDays: 50 }
            : { percentage: 72.0, attendedDays: 36, totalRecordedDays: 50 };
    },
    renderAndShowPrintDocument(title, html, orient) {
        lastPrint = { title, html, orient };
    },
    STATE: {
        activeCycle: '2027',
        activeView: 'scholarships',
        currentRole: 'secretaria',
        currentUser: { name: 'Secretaría ENCCO' },
        students: [
            {
                id: 's1', cycle: '2027', name: 'PÉREZ ANA', grade: '4to Perito Contador', section: 'A', gradeCode: '4A',
                status: 'Activo', cui: '2987654321012', personalCode: 'A123BCD',
                grades: { C1: { b1: 88, b2: 92 } },
                expediente: { docs: { partida_nacimiento: { status: 'entregado' } } }
            },
            {
                id: 's2', cycle: '2027', name: 'LÓPEZ CARLOS', grade: '5to Perito Contador', section: 'B', gradeCode: '5B',
                status: 'Activo', cui: '3111222333444', personalCode: 'B456EFG',
                grades: { C1: { b1: 70 } },
                expediente: { docs: {} }
            },
            {
                id: 's2026', cycle: '2026', name: 'HISTÓRICO 2026', grade: '4to Perito Contador', section: 'A', gradeCode: '4A',
                status: 'Activo', cui: '9999888877771', personalCode: 'H2026',
                scholarshipsByCycle: { '2026': { active: true, type: 'Bolsa de Estudio MINEDUC', status: 'Activa' } }
            }
        ]
    }
};
mockWindow.window = mockWindow;

const ctx = vm.createContext({ window: mockWindow, document: mockDocument, console, Set, Date, Array, Object, String, Number, Math, encodeURIComponent, isNaN });
vm.runInContext(schCode, ctx);

// 3. RBAC
assert.strictEqual(mockWindow.canManageScholarships('secretaria'), true);
assert.strictEqual(mockWindow.canManageScholarships('director'), true);
assert.strictEqual(mockWindow.canManageScholarships('docente'), false, 'Docente no debe poder modificar becas');
console.log('  ✅ 2. Control de permisos RBAC verificado.');

// 4. Guardar becas en 2027 y validar aislamiento multiciclo (2026 no se mezcla con 2027)
assert.strictEqual(mockWindow.saveStudentScholarshipForCycle('s1', { type: 'Bolsa de Estudio MINEDUC', program: 'MINEDUC Jutiapa', agreementRef: 'AC-2027-01', status: 'Activa' }), true);
assert.strictEqual(mockWindow.saveStudentScholarshipForCycle('s2', { type: 'Beca Municipal / Gubernamental', program: 'Muni Jutiapa', status: 'Activa' }), true);

const ds = mockWindow.buildScholarshipsDataset();
assert.strictEqual(ds.activeCycle, '2027');
assert.strictEqual(ds.kpis.total, 2, 'Solo los 2 becados de 2027 (excluye becado de 2026)');
assert.strictEqual(ds.kpis.bolsas, 1, '1 Bolsa de Estudio');
assert.strictEqual(ds.kpis.otrasBecas, 1, '1 Beca Municipal');
assert.strictEqual(ds.kpis.attOk, 1, 's1 cumple asistencia >= 85% (94%)');
assert.strictEqual(ds.kpis.attRisk, 1, 's2 en riesgo asistencia < 85% (72%)');
console.log('  ✅ 3. Persistencia multiciclo, aislamiento 2026/2027 y KPIs de asistencia verificados.');

// 5. Renderizado responsivo + Ficha del Estudiante (Beca + Documentos Faltantes)
mockWindow.renderScholarshipsView();
assert(domMap['view-scholarships'].innerHTML.includes('PÉREZ ANA') && domMap['view-scholarships'].innerHTML.includes('94%'), 'Vista principal renderiza becados y % de asistencia');
assert(injectedCss.includes('table-layout: fixed') && injectedCss.includes('@media (max-width: 900px)'), 'CSS responsivo (escritorio, tablet, móvil) inyectado');

mockWindow.renderStudentProfileScholarshipAndDocsSummary(mockWindow.STATE.students[0]);
assert(domMap['profScholarshipHeaderBadge'].style.display === 'inline-flex', 'Insignia de beca visible en encabezado de Ficha');
assert(domMap['profScholarshipAndDocsSummaryBox'].innerHTML.includes('Bolsa de Estudio MINEDUC') && domMap['profScholarshipAndDocsSummaryBox'].innerHTML.includes('Documentos Faltantes (5)'), 'Bloque de Ficha muestra Beca + lista exacta de 5 documentos faltantes');
console.log('  ✅ 4. Renderizado responsivo y bloque Beca + Documentos Faltantes en Ficha verificados.');

// 6. Impresión Azul Institucional Oficio + Constancia Individual
mockWindow.printScholarshipsOfficialRoster();
assert.strictEqual(lastPrint.orient, 'landscape');
assert(lastPrint.html.includes('8.5in 13in landscape') && lastPrint.html.includes('#0369a1'), 'Nómina oficial en Hoja Oficio y Azul Institucional');

mockWindow.printStudentScholarshipCertificate('s1');
assert.strictEqual(lastPrint.orient, 'portrait');
assert(lastPrint.html.includes('CONSTANCIA DE ASISTENCIA Y RENDIMIENTO PARA BECA') && lastPrint.html.includes('94%'), 'Constancia individual incluye % de asistencia a la fecha');
console.log('  ✅ 5. Impresión oficial de nómina y constancia individual de beca verificadas.');

// 7. Verificar integración dinámica en Roles y Permisos (SYSTEM_MODULES_LIST, normalizePermKey, canManageScholarships, sidebar sin data-allowed fijo)
assert(appCode.includes("key: 'scholarships', name: 'Becas y Bolsas de Estudio'"), 'Becas y Bolsas de Estudio debe estar registrado en SYSTEM_MODULES_LIST');
assert(appCode.includes("k === 'scholarships' || k === 'becas'"), 'normalizePermKey debe reconocer scholarships/becas/bolsas');
assert(htmlCode.includes('data-view="scholarships" data-perm="scholarships" onclick='), 'Sidebar debe depender dinámicamente de data-perm="scholarships" sin data-allowed fijo');
mockWindow.canRoleModify = (mod, role) => mod === 'scholarships' && role === 'custom_becas_role';
mockWindow.hasRolePermission = (mod, role) => mod === 'scholarships' && (role === 'custom_becas_role' || role === 'docente');
assert.strictEqual(mockWindow.canManageScholarships('custom_becas_role'), true, 'Rol personalizado con permiso edit debe poder gestionar becas');
assert.strictEqual(mockWindow.canManageScholarships('docente'), false, 'Docente con permiso solo view no puede editar becas');
assert.strictEqual(mockWindow.canViewScholarships('docente'), true, 'Docente con permiso view sí puede consultar becas');
assert.strictEqual(mockWindow.canViewScholarships('estudiante'), false, 'Rol sin permiso no puede ver becas');
console.log('  ✅ 6. Integración dinámica en Roles y Permisos (3 niveles + roles personalizados) verificada.');

console.log('\n🎯 ¡TODAS LAS PRUEBAS DE BECAS, BOLSAS DE ESTUDIO Y FICHA INTEGRAL PASARON AL 100%!');
