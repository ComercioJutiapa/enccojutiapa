/**
 * test_student_annotations_system.js
 * Verificación técnica y funcional del sistema universal de anotaciones
 * y administración de auxiliatura.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const htmlPath = path.join(__dirname, 'plataforma.html');
const jsPath = path.join(__dirname, 'app.js');

const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
const jsSrc = fs.readFileSync(jsPath, 'utf8');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ ${name}: ${e.message}`);
        failed++;
    }
}

console.log('================================================================================');
console.log('🧪 PRUEBAS UNITARIAS: SISTEMA UNIVERSAL DE ANOTACIONES Y AUXILIATURA');
console.log('================================================================================\n');

test('TEST 1: Elementos estructurales de Anotaciones en plataforma.html', () => {
    assert(htmlSrc.includes('id="studentAnnotationModal"'), 'Falta studentAnnotationModal en HTML');
    assert(htmlSrc.includes('id="profTabBtn-annotations"'), 'Falta profTabBtn-annotations en navegación de perfil');
    assert(htmlSrc.includes('id="profTab-annotations"'), 'Falta profTab-annotations en contenido de perfil');
    assert(htmlSrc.includes('id="profAnnotationsListContainer"'), 'Falta profAnnotationsListContainer');
    assert(htmlSrc.includes('openStudentAnnotationModal()'), 'Falta invocación en toolbar de asistencia');
});

test('TEST 2: Funciones principales del motor de anotaciones en app.js', () => {
    assert(jsSrc.includes('function getStudentAnnotations('), 'Falta getStudentAnnotations');
    assert(jsSrc.includes('function getStudentAnnotationsForDate('), 'Falta getStudentAnnotationsForDate');
    assert(jsSrc.includes('function addStudentAnnotation('), 'Falta addStudentAnnotation');
    assert(jsSrc.includes('function deleteStudentAnnotation('), 'Falta deleteStudentAnnotation');
    assert(jsSrc.includes('function openStudentAnnotationModal('), 'Falta openStudentAnnotationModal');
    assert(jsSrc.includes('function closeStudentAnnotationModal('), 'Falta closeStudentAnnotationModal');
    assert(jsSrc.includes('function saveQuickAnnotation('), 'Falta saveQuickAnnotation');
    assert(jsSrc.includes('function renderStudentProfileAnnotations('), 'Falta renderStudentProfileAnnotations');
});

test('TEST 3: Integración en Asistencia (Pin indicador 📌 y botón 💬)', () => {
    assert(jsSrc.includes('getStudentAnnotationsForDate'), 'Asistencia no consulta anotaciones por fecha');
    assert(jsSrc.includes('📌 Anotación:'), 'Asistencia no incluye texto de anotación en tooltip');
    assert(jsSrc.includes('openStudentAnnotationModal'), 'Fila de estudiante no incluye botón para abrir anotaciones');
});

test('TEST 4: Integración en Bitácora de Auxiliatura (Botón Anotar y visualización en fila)', () => {
    assert(jsSrc.includes('openStudentAnnotationModalForAlert'), 'Falta botón Anotar para alertas de inasistencia');
    assert(jsSrc.includes('alertAnnots'), 'Falta despliegue de anotaciones en la fila de la bitácora');
});

test('TEST 5: Persistencia en STATE y guardado seguro', () => {
    assert(jsSrc.includes('studentAnnotations: []'), 'STATE no inicializa studentAnnotations');
    assert(jsSrc.includes('studentAnnotations: recursiveDeepClone(STATE.studentAnnotations'), 'saveStateRecursively no clona studentAnnotations');
});

test('TEST 6: Modelo obligatorio de calificaciones preservado (40% zona / 60% examen)', () => {
    const defaultZonaMatch = jsSrc.match(/zonaMax:\s*40/);
    const defaultExamMatch = jsSrc.match(/examMax:\s*60/);
    assert(defaultZonaMatch, 'Debe mantenerse zonaMax: 40');
    assert(defaultExamMatch, 'Debe mantenerse examMax: 60');
    assert(!jsSrc.includes('70% de zona y 30%'), 'No debe existir referencia a 70/30');
});

test('TEST 7: Selector dinámico de estudiantes en el modal de anotaciones', () => {
    assert(htmlSrc.includes('id="annotStudentSelect"'), 'Falta annotStudentSelect en HTML');
    assert(htmlSrc.includes('id="annotStudentSearchFilter"'), 'Falta annotStudentSearchFilter en HTML');
    assert(htmlSrc.includes('id="annotStudentGradeFilter"'), 'Falta annotStudentGradeFilter en HTML');
    assert(jsSrc.includes('function populateAnnotationStudentDropdown('), 'Falta populateAnnotationStudentDropdown en app.js');
    assert(jsSrc.includes('function filterAnnotationStudentDropdown('), 'Falta filterAnnotationStudentDropdown en app.js');
    assert(jsSrc.includes('function onStudentAnnotationSelectChange('), 'Falta onStudentAnnotationSelectChange en app.js');
});

test('TEST 8: Matriz de Privacidad y Visibilidad (Auxiliatura, Dirección, Secretaría y Docente autor)', () => {
    assert(jsSrc.includes('function canUserViewAnnotation('), 'Falta función canUserViewAnnotation en app.js');

    // Extraer y evaluar canUserViewAnnotation en contexto simulado
    const vm = require('vm');
    const sandbox = {
        window: { STATE: {} },
        STATE: {}
    };
    vm.createContext(sandbox);

    // Ejecutar definición de canUserViewAnnotation
    const canUserViewMatch = jsSrc.match(/function canUserViewAnnotation[\s\S]*?window\.canUserViewAnnotation\s*=\s*canUserViewAnnotation;/);
    assert(canUserViewMatch, 'No se pudo extraer canUserViewAnnotation');
    vm.runInContext(canUserViewMatch[0], sandbox);

    const canView = sandbox.canUserViewAnnotation;
    const testAnn = {
        id: 'ANN_001',
        studentId: 'STU_1',
        text: 'Anotación pedagógica',
        authorId: 'doc_byron',
        authorUsername: 'borellana',
        authorName: 'Byron Orellana',
        authorRole: 'docente'
    };

    // 1. Director puede ver
    assert(canView(testAnn, { id: 'dir1', name: 'Director', role: 'director' }, 'director') === true, 'Director DEBE poder ver la anotación');
    // 2. Auxiliar puede ver
    assert(canView(testAnn, { id: 'aux1', name: 'Auxiliar', role: 'profesor_auxiliar' }, 'profesor_auxiliar') === true, 'Auxiliatura DEBE poder ver la anotación');
    // 3. Secretaría puede ver
    assert(canView(testAnn, { id: 'sec1', name: 'Secretaria', role: 'secretaria' }, 'secretaria') === true, 'Secretaría DEBE poder ver la anotación');
    // 4. Admin puede ver
    assert(canView(testAnn, { id: 'adm1', name: 'Admin', role: 'admin' }, 'admin') === true, 'Admin DEBE poder ver la anotación');
    // 5. El maestro que la colocó puede verla
    assert(canView(testAnn, { id: 'doc_byron', username: 'borellana', name: 'Byron Orellana', role: 'docente' }, 'docente') === true, 'El docente autor DEBE poder verla');
    // 6. OTRO maestro NO puede verla
    assert(canView(testAnn, { id: 'doc_other', username: 'jperez', name: 'Juan Pérez', role: 'docente' }, 'docente') === false, 'Otro docente NO debe poder ver la anotación de Byron');
    // 7. Estudiante NO puede verla
    assert(canView(testAnn, { id: 'STU_1', role: 'estudiante' }, 'estudiante') === false, 'Estudiante NO debe poder ver anotaciones');
});

test('TEST 9: Filtrado y resolución precisa de sección activa (isStudentInGrade y findGradeForStudent)', () => {
    assert(jsSrc.includes('function isStudentInGrade('), 'Falta función isStudentInGrade en app.js');
    assert(jsSrc.includes('function findGradeForStudent('), 'Falta función findGradeForStudent en app.js');

    const vm = require('vm');
    const sandbox = {
        window: {},
        STATE: {
            gradesList: [
                { id: 'grd-4a', code: 'grd-4a', name: '4to Perito Contador', section: 'A' },
                { id: 'grd-4b', code: 'grd-4b', name: '4to Perito Contador', section: 'B' },
                { id: 'grd-5a', code: 'grd-5a', name: '5to Perito Contador', section: 'A' },
                { id: 'grd-6c', code: 'grd-6c', name: '6to Perito Contador', section: 'C' }
            ]
        }
    };
    sandbox.window.STATE = sandbox.STATE;
    vm.createContext(sandbox);

    const isMatch = jsSrc.match(/function isStudentInGrade[\s\S]*?window\.isStudentInGrade\s*=\s*isStudentInGrade;/);
    const findMatch = jsSrc.match(/function findGradeForStudent[\s\S]*?window\.findGradeForStudent\s*=\s*findGradeForStudent;/);
    assert(isMatch, 'No se pudo extraer isStudentInGrade');
    assert(findMatch, 'No se pudo extraer findGradeForStudent');

    vm.runInContext(findMatch[0], sandbox);
    vm.runInContext(isMatch[0], sandbox);

    const student4B = { id: 'STU_4B', name: 'Carlos Gomez', grade: '4to Perito Contador B', gradeCode: '4to PC B', section: 'B' };
    const student4A = { id: 'STU_4A', name: 'Ana Lopez', grade: '4to Perito Contador A', gradeCode: '4to PC A', section: 'A' };
    const student5A = { id: 'STU_5A', name: 'Mario Diaz', grade: '5to Perito Contador', gradeCode: 'grd-5a', section: 'A' };

    // Verificación de resolución de grado
    const gradeRes4B = sandbox.findGradeForStudent(student4B);
    assert(gradeRes4B && gradeRes4B.code === 'grd-4b', 'findGradeForStudent debe resolver grd-4b para student4B');

    // Verificación de pertenencia a sección
    assert(sandbox.isStudentInGrade(student4B, 'grd-4b') === true, 'student4B debe pertenecer a grd-4b');
    assert(sandbox.isStudentInGrade(student4B, 'grd-4a') === false, 'student4B NO debe pertenecer a grd-4a');
    assert(sandbox.isStudentInGrade(student4A, 'grd-4a') === true, 'student4A debe pertenecer a grd-4a');
    assert(sandbox.isStudentInGrade(student5A, 'grd-5a') === true, 'student5A debe pertenecer a grd-5a');
    assert(sandbox.isStudentInGrade(student4B, 'ALL') === true, 'Cualquier estudiante pertenece a ALL');
});

test('TEST 10: Preselección de sección activa y filtro en modal de anotaciones', () => {
    assert(jsSrc.includes('populateAnnotationStudentDropdown(student.id, activeGradeCode)'), 'openStudentAnnotationModal debe enviar la sección activa');
    assert(jsSrc.includes('countLabel.textContent = `${filtered.length} estudiantes en ${secName}`'), 'Debe mostrar el conteo y nombre de la sección activa');
});

console.log('\n================================================================================');
console.log(`🎉 RESULTADOS: ${passed} pasaron, ${failed} fallaron.`);
console.log('================================================================================');

if (failed > 0) process.exit(1);

