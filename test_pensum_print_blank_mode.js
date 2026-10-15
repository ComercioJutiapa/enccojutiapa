/**
 * ======================================================================
 * 🧪 PRUEBA AUTOMATIZADA: IMPRESIÓN DE PENSUM (OFICIAL Y VACÍO CON TODAS LAS SECCIONES)
 * - 1 Grado por Hoja (Letter Landscape)
 * - Llenado completo de hoja con encabezado, tabla, totales y firmas
 * - Modalidad Oficial (Con Docentes) y Modalidad Vacío (Para llenar a mano)
 * ======================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🧪 PRUEBAS AUTOMATIZADAS: IMPRESIÓN DE PENSUM VACÍO Y CON TODAS LAS SECCIONES');
console.log('========================================================================\n');

// 1. Cargar plataforma.html y app.js
const htmlContent = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// Test 1: Verificar que el modal de impresión existe en plataforma.html
assert(htmlContent.includes('id="pensumPrintOptionsModal"'), 'plataforma.html debe contener el modal pensumPrintOptionsModal');
assert(htmlContent.includes('id="pensumPrintGradeSelect"'), 'El modal debe contener el selector de grado pensumPrintGradeSelect');
assert(htmlContent.includes('id="pensumPrintModeBlank"'), 'El modal debe contener la opción pensumPrintModeBlank');
assert(htmlContent.includes('id="pensumPrintModeFull"'), 'El modal debe contener la opción pensumPrintModeFull');
assert(htmlContent.includes('openPensumPrintModal()'), 'El botón Imprimir Pensum debe abrir el modal con openPensumPrintModal()');
console.log('✅ TEST 1: Elementos del modal y disparador en plataforma.html verificados');

// Test 2: Simulación de ejecución de printPensumCurriculumReport
let capturedHtml = '';
const mockDocument = {
    createElement(tag) {
        if (tag === 'iframe') {
            return {
                style: {},
                contentWindow: {
                    document: {
                        open() {},
                        write(html) { capturedHtml = html; },
                        close() {}
                    },
                    focus() {},
                    print() {}
                }
            };
        }
        return { style: {}, appendChild() {} };
    },
    body: {
        appendChild() {},
        removeChild() {}
    },
    getElementById(id) {
        return null;
    }
};

const mockWindow = {
    document: mockDocument,
    STATE: {
        activeCycle: '2026',
        schoolHeader: {
            schoolName: 'Escuela Nacional de Ciencias Comerciales',
            location: 'Jutiapa, Guatemala'
        },
        gradesList: [
            { code: '4toA', name: '4to Perito', section: 'A', guideTeacher: 'Profa. Marta Martínez' },
            { code: '4toB', name: '4to Perito', section: 'B', guideTeacher: 'Prof. Carlos López' },
            { code: '4toC', name: '4to Perito', section: 'C', guideTeacher: 'Profa. Silvia Donis' },
            { code: '4toD', name: '4to Perito', section: 'D', guideTeacher: 'Prof. Juan Ramos' }
        ],
        pensumCatalog: [
            { id: 'c-01', name: 'Contabilidad General', code: 'CG4', grade: '4to', sortOrder: 1, periods: 5 },
            { id: 'c-02', name: 'Matemática Comercial', code: 'MC4', grade: '4to', sortOrder: 2, periods: 5 },
            { id: 'c-03', name: 'Legislación Fiscal', code: 'LF5', grade: '5to', sortOrder: 1, periods: 4 }
        ],
        pensum: [
            { grade: '4to', section: 'A', subject: 'Contabilidad General', teacher: 'Lic. Juan Alberto Pérez' }
        ]
    },
    escapeHtml(str) { return str || ''; },
    showToast() {}
};

// Extraer código relevante de Pensum desde app.js para prueba unitaria
const pensumCodeSnippet = `
${appCode.substring(appCode.indexOf('const PENSUM_GRADE_CONFIG ='), appCode.indexOf('function selectPensumGradeTab('))}
${appCode.substring(appCode.indexOf('function isAssignmentUnassigned('), appCode.indexOf('function updateAssignmentsKpis('))}
${appCode.substring(appCode.indexOf('function openPensumPrintModal('), appCode.indexOf('function renderPensumCatalogTable('))}
`;

const evalPensum = new Function('window', 'document', 'STATE', 'escapeHtml', 'showToast', `
    ${pensumCodeSnippet}
    window.printPensumCurriculumReport = printPensumCurriculumReport;
    window.openPensumPrintModal = openPensumPrintModal;
`);
evalPensum(mockWindow, mockDocument, mockWindow.STATE, mockWindow.escapeHtml, mockWindow.showToast);

// Test 3: Ejecutar impresión en MODALIDAD VACÍA (isBlank = true)
capturedHtml = '';
mockWindow.printPensumCurriculumReport('4to', true, { withSignatures: true });

assert(capturedHtml.includes('FORMATO OFICIAL DE DISTRIBUCIÓN DE PENSUM (EN BLANCO)'), 'Debe incluir el título de formato en blanco');
assert(capturedHtml.includes('22-01-0014-46'), 'Debe incluir el código oficial MINEDUC 22-01-0014-46');
assert(capturedHtml.includes('Sección "A"'), 'Debe incluir la columna de Sección A');
assert(capturedHtml.includes('Sección "B"'), 'Debe incluir la columna de Sección B');
assert(capturedHtml.includes('Sección "C"'), 'Debe incluir la columna de Sección C');
assert(capturedHtml.includes('Sección "D"'), 'Debe incluir la columna de Sección D');
assert(capturedHtml.includes('border-bottom:1px dashed #cbd5e1;'), 'Las celdas de las secciones en blanco deben tener línea base para escribir a mano');
assert(capturedHtml.includes('Comisión de Horarios y Pensum'), 'Debe contener la firma de Comisión de Horarios');
assert(capturedHtml.includes('Vo.Bo. Dirección ENCCO Jutiapa'), 'Debe contener el visto bueno de Dirección');
assert(capturedHtml.includes('pensum-print-page'), 'Debe estructurarse en contenedor de página');
assert(capturedHtml.includes('page-break-after: always'), 'Debe separar cada grado en su propia página');
console.log('✅ TEST 3: Impresión en Modalidad Vacía con todas las secciones y 1 grado por hoja verificada al 100%');

// Test 4: Ejecutar impresión en MODALIDAD CON DOCENTES (isBlank = false)
capturedHtml = '';
mockWindow.printPensumCurriculumReport('4to', false, { withSignatures: true });

assert(capturedHtml.includes('DISTRIBUCIÓN OFICIAL DE PENSUM POR SECCIONES Y CLAUSTRO DOCENTE'), 'Debe incluir el título oficial');
assert(capturedHtml.includes('Lic. Juan Alberto Pérez'), 'Debe mostrar el docente asignado en la sección A');
assert(capturedHtml.includes('Pendiente'), 'Debe mostrar Pendiente en secciones sin asignar');
console.log('✅ TEST 4: Impresión en Modalidad con Docentes Asignados verificada al 100%');

// Test 5: Ejecutar impresión de TODOS LOS GRADOS (1 grado por hoja)
capturedHtml = '';
mockWindow.printPensumCurriculumReport('all', true, { withSignatures: true });

const pageCount = (capturedHtml.match(/class="pensum-print-page"/g) || []).length;
assert.strictEqual(pageCount, 2, 'Debe generar exactamente una hoja por cada grado con materias registradas (4to y 5to)');
assert(capturedHtml.toUpperCase().includes('CUARTO PERITO'), 'Debe incluir la hoja de 4to');
assert(capturedHtml.toUpperCase().includes('QUINTO PERITO'), 'Debe incluir la hoja de 5to');
console.log('✅ TEST 5: Impresión de Malla Completa (1 grado por hoja independiente) verificada con éxito');

console.log('\n========================================================================');
console.log('🎉 ¡TODAS LAS PRUEBAS DE IMPRESIÓN DE PENSUM VACÍO PASARON AL 100% (5/5)!');
console.log('========================================================================');
