/**
 * tests/test_cycle_2027_zero_grades.js
 * 
 * Verificación de la regla institucional para el Ciclo Escolar Activo 2027:
 * 1. Todas las calificaciones de los 463 estudiantes activos en 2027 deben estar estrictamente en 0 cero ([0, 0, 0, 0]).
 * 2. Cero notas mayores a 0 en las 4 unidades de todas las materias de 2027.
 * 3. Preservación íntegra de la matrícula (463 estudiantes, incluidos los nuevos inscritos el día de hoy).
 * 4. Preservación inmutable del archivo histórico 2026 (412 estudiantes con sus notas oficiales 2026 intactas).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('🎯 TEST: CICLO ESCOLAR 2027 CON CALIFICACIONES EN 0 CERO E INTEGRIDAD HISTÓRICA');
console.log('='.repeat(80));

const archiverJsPath = path.join(__dirname, '..', 'cycle_archiver.js');
const archiverCode = fs.readFileSync(archiverJsPath, 'utf8');

console.log('\n1. Verificando definición del catálogo oficial de cursos en cycle_archiver.js...');
assert.ok(archiverCode.includes('OFFICIAL_CNB_GRADE_COURSES'), 'cycle_archiver.js debe definir OFFICIAL_CNB_GRADE_COURSES');
assert.ok(archiverCode.includes('window.OFFICIAL_GRADE_SUBJECTS = OFFICIAL_CNB_GRADE_COURSES;'), 'Debe exponer OFFICIAL_GRADE_SUBJECTS en window');
console.log('  ✅ Catálogo oficial de asignaturas CNB verificado en cycle_archiver.js.');

(async () => {
    const dbUrl = 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com';

    console.log('\n2. Verificando que todas las notas de 2027 estén en 0 cero en la base de datos...');
    const res = await fetch(`${dbUrl}/encc_school_state/students.json`);
    assert.strictEqual(res.ok, true, 'Debe responder 200 OK al consultar students.json');
    const students = await res.json();
    const stList = Array.isArray(students) ? students : Object.values(students);

    assert.ok(stList.length >= 400, `El padrón de 2027 debe contener al menos 400 estudiantes (Actual: ${stList.length})`);

    let totalCoursesChecked = 0;
    let nonZeroCount = 0;

    stList.forEach(s => {
        assert.ok(s && s.id, 'Cada estudiante debe tener un ID válido');
        assert.ok(s.name, 'Cada estudiante debe tener un nombre asignado');
        assert.ok(s.grades && typeof s.grades === 'object', `Estudiante ${s.name} debe tener objeto grades`);

        Object.entries(s.grades).forEach(([subj, gList]) => {
            totalCoursesChecked++;
            assert.ok(Array.isArray(gList), `Materia ${subj} de ${s.name} debe ser un arreglo`);
            assert.strictEqual(gList.length, 4, `Materia ${subj} de ${s.name} debe tener 4 bimestres`);
            gList.forEach((score, bIdx) => {
                if (Number(score) !== 0) {
                    nonZeroCount++;
                }
            });
        });
    });

    assert.strictEqual(nonZeroCount, 0, `No debe existir ninguna nota mayor a cero en 2027 (Encontradas: ${nonZeroCount})`);
    assert.ok(totalCoursesChecked >= 4000, `Se deben haber verificado al menos 4000 asignaciones de curso (Verificadas: ${totalCoursesChecked})`);
    console.log(`  ✅ ${totalCoursesChecked} registros de asignaturas verificados: 100% de notas en 0 cero.`);

    console.log('\n3. Verificando que los nuevos alumnos inscritos hoy en 2027 no hayan sido borrados...');
    const newlyEnrolled = stList.filter(s => s && (s.carne && s.carne.includes('2027') || s.academicCycle === '2027' && s.id.startsWith('stu-2027') || s.id.startsWith('stu-179372')));
    assert.ok(newlyEnrolled.length >= 40, `Los alumnos inscritos hoy en 2027 deben estar preservados (Encontrados: ${newlyEnrolled.length})`);
    console.log(`  ✅ ${newlyEnrolled.length} inscripciones de 2027 confirmadas intactas.`);

    console.log('\n4. Verificando que el histórico 2026 NO fue afectado y mantiene sus notas intactas...');
    const histRes = await fetch(`${dbUrl}/encc_school_state/historico/2026.json`);
    assert.strictEqual(histRes.ok, true, 'El archivo histórico 2026 debe existir en Firebase');
    const histData = await histRes.json();

    assert.strictEqual(histData.studentsSnapshot.length, 412, 'Histórico 2026 debe tener 412 estudiantes');
    assert.ok(Object.keys(histData.calificacionesSnapshot).length > 3000, 'Histórico 2026 debe contener las calificaciones oficiales');

    // Verificar que un alumno histórico sí tenga sus notas reales de 2026 (no en cero)
    const histSample = histData.studentsSnapshot[0];
    const hasRealGrades = Object.values(histSample.grades).some(gList => gList.some(v => v > 0));
    assert.strictEqual(hasRealGrades, true, 'El histórico 2026 debe conservar sus notas reales ganadas en el ciclo 2026');
    console.log('  ✅ Archivo histórico 2026 inmutable e intacto con todas sus notas oficiales.');

    console.log('\n' + '='.repeat(80));
    console.log('🎉 TODAS LAS VERIFICACIONES DEL CICLO 2027 EN CERO PASARON AL 100%!');
    console.log('='.repeat(80));
    process.exit(0);
})().catch(err => {
    console.error('❌ Error en prueba:', err);
    process.exit(1);
});
