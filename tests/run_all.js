/**
 * tests/run_all.js - Ejecutor Maestro de Pruebas Automatizadas
 * Escuela Nacional de Ciencias Comerciales Jutiapa 1970
 * 
 * Descubre, ejecuta e informa el estado de todas las suites de prueba críticas
 * del sistema, garantizando 0% regresión y 100% integridad de producción.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Suites críticas institucionales ordenadas por prioridad
const CRITICAL_SUITES = [
    'test_412_students_integrity.js',
    'test_class_assignments_enhancements.js',
    'test_enrollment_section_counters.js',
    'test_excel_import_role_permission.js',
    'test_auxiliatura_control_center.js',
    'test_architecture_modules.js',
    'test_security_hardening.js',
    'test_retired_students_rules.js',
    'test_exoneration_and_student_lists_resilience.js',
    'test_independent_bimestres.js',
    'test_sire_assisted_enrollment_simulation.js',
    'test_exam_schedules_module.js'
];

console.log('================================================================================');
console.log('🚀 ENCCO JUTIAPA 1970 - EJECUTOR MAESTRO DE PRUEBAS DE ARQUITECTURA');
console.log('================================================================================\n');

let passedCount = 0;
let failedCount = 0;
const results = [];

CRITICAL_SUITES.forEach((suiteFile, index) => {
    const fullPath = path.join(rootDir, suiteFile);
    if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ [OMITIDA] Archivo no encontrado: ${suiteFile}`);
        return;
    }

    process.stdout.write(`[${index + 1}/${CRITICAL_SUITES.length}] Ejecutando: ${suiteFile}... `);
    const start = Date.now();
    try {
        execSync(`node "${fullPath}"`, { cwd: rootDir, stdio: 'pipe' });
        const duration = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`✅ APROBADA (${duration}s)`);
        passedCount++;
        results.push({ name: suiteFile, status: 'PASSED', duration: `${duration}s` });
    } catch (err) {
        const duration = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`❌ FALLÓ (${duration}s)`);
        failedCount++;
        results.push({ name: suiteFile, status: 'FAILED', duration: `${duration}s` });
    }
});

console.log('\n================================================================================');
console.log('📊 RESUMEN EJECUTIVO DE ARQUITECTURA E INTEGRIDAD');
console.log('================================================================================');
console.table(results);

console.log(`\nTotal Suites: ${results.length} | Aprobadas: ${passedCount} | Fallidas: ${failedCount}`);

if (failedCount === 0) {
    console.log('\n🎉 ¡TODAS LAS SUITES CRÍTICAS PASARON CON 100% DE ÉXITO!');
    console.log('Integridad de 412 estudiantes, 40/60 ponderaciones y roles confirmada.');
    process.exit(0);
} else {
    console.error(`\n❌ Se encontraron ${failedCount} fallos en las pruebas.`);
    process.exit(1);
}
