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

console.log('\n================================================================================');
console.log(`🎉 RESULTADOS: ${passed} pasaron, ${failed} fallaron.`);
console.log('================================================================================');

if (failed > 0) process.exit(1);
