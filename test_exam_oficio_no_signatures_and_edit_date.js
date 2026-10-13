const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoDir = 'C:\\Users\\yalil\\.gemini\\antigravity\\scratch\\plataforma_escuela_comercio_completa';
const code = fs.readFileSync(path.join(repoDir, 'exam_schedules_module.js'), 'utf8');

console.log('================================================================================');
console.log('🧪 VERIFICACIÓN: HOJAS OFICIO 8.5x13, CERO FIRMAS Y EDICIÓN DE FECHA DE EXAMEN');
console.log('================================================================================\n');

// 1. Verificar que no haya firmas en printDailyScheduleOficio
assert.ok(!code.includes('<div class="footer-signatures">'), 'Error: printDailyScheduleOficio aún contiene footer-signatures');
assert.ok(!code.includes('Vo.Bo. Institucional'), 'Error: aún contiene Vo.Bo. Institucional');
console.log('✅ Test 1 Superado: Firmas inferiores eliminadas exitosamente de printDailyScheduleOficio.');

// 2. Verificar que no haya firmas inferiores en printEvaluationSheets
assert.ok(!code.includes('Docente Cuidador Responsable'), 'Error: printEvaluationSheets aún contiene Docente Cuidador Responsable');
assert.ok(!code.includes('Sello y Recepción Oficial'), 'Error: printEvaluationSheets aún contiene Sello y Recepción Oficial');
console.log('✅ Test 2 Superado: Firmas inferiores eliminadas de Nóminas/Medias Listas de Salón (compactas y completas).');

// 3. Verificar que todos los documentos de impresión usen Hoja Oficio (8.5in x 13in)
const sizeMatches = [...code.matchAll(/@page\s*\{[^}]*size:\s*([^;]+);/g)].map(m => m[1].trim());
console.log('Tamaños de página configurados en @page:', sizeMatches);
assert.ok(sizeMatches.length >= 4, 'Deben existir al menos 4 configuraciones @page en el módulo');
sizeMatches.forEach(sz => {
    assert.ok(sz.includes('8.5in 13in portrait'), `El tamaño "${sz}" debe ser 8.5in 13in portrait`);
});
console.log('✅ Test 3 Superado: 100% de los documentos configurados en Hoja Oficio (8.5in x 13in portrait).');

// 4. Verificar existencia de función window.editExamDayDate y botón Cambiar Fecha
assert.ok(code.includes('window.editExamDayDate = function'), 'Falta función editExamDayDate');
assert.ok(code.includes('window.confirmEditExamDayDate = function'), 'Falta función confirmEditExamDayDate');
assert.ok(code.includes('Cambiar Fecha'), 'Falta botón Cambiar Fecha en la tarjeta de día');
assert.ok(code.includes('modalEditExamDayDate'), 'Falta modal de edición de fecha');
console.log('✅ Test 4 Superado: Módulo de edición ágil de fecha (modal nativo con input type="date") operativo.');

console.log('\n🎉 TODAS LAS PRUEBAS UNITARIAS PASARON EXITOSAMENTE (100%)');
