/**
 * tests/test_recovery_passed_migration_2027.js
 *
 * Verifica la Opción 3 (Migración Directa con Selector de Sección y Confirmación Anti-Duplicidad)
 * para estudiantes que ganaron 100% de sus recuperaciones hacia el ciclo 2027:
 * 1. Control de permisos (solo Admin, Dirección y Secretaría pueden migrar).
 * 2. 4to -> 5to (con sección personalizada elegida) y 5to -> 6to en ciclo 2027, limpiando notas 2027 y preservando histórico 2026.
 * 3. 6to -> Graduando / Egresado (ciclo 2026), respetando regla perpetua de graduandos.
 * 4. Garantía estricta anti-duplicidad al reintentar migrar alumnos ya presentes en 2027.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("🧪 Iniciando Test Suite: Migración a 2027 de Alumnos que Ganaron Recuperación (Opción 3)...");

global.window = global;
global.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
};
global.showToast = () => {};
global.saveStateToLocalStorage = () => {};
global.escapeHtml = s => String(s || '');
global.window.EnccoDialog = { confirm: async () => true };

eval(fs.readFileSync(path.join(__dirname, '../grade_stats.js'), 'utf8'));

(async () => {
    global.STATE = {
        activeCycle: '2027',
        currentRole: 'docente',
        currentUser: { id: 'usr-doc-01', name: 'Docente', role: 'docente' },
        gradesList: [
            { id: 'grd-5a', code: '5to A', name: '5to Perito Contador', section: 'Sección A' },
            { id: 'grd-5b', code: '5to B', name: '5to Perito Contador', section: 'Sección B' },
            { id: 'grd-5c', code: '5to C', name: '5to Perito Contador', section: 'Sección C' },
            { id: 'grd-6a', code: '6to A', name: '6to Perito Contador', section: 'Sección A' },
            { id: 'grd-6b', code: '6to B', name: '6to Perito Contador', section: 'Sección B' }
        ],
        students: [
            {
                id: 'stu-rec-4b', carne: '2026-4B-010', personalCode: 'R4B001',
                name: 'López Pérez, María', grade: '4to Perito Contador', section: 'Sección B', gradeCode: '4to B',
                cycle: '2026', academicCycle: '2026', status: 'Activo', active: true,
                grades: { 'Contabilidad de Sociedades': [45, 50, 52, 55] },
                gradebookDetails: { 'Contabilidad de Sociedades': { 4: { exam: 30, activities: [25] } } }
            },
            {
                id: 'stu-rec-5a', carne: '2026-5A-012', personalCode: 'R5A002',
                name: 'Gómez Ruiz, Carlos', grade: '5to Perito Contador', section: 'Sección A', gradeCode: '5to A',
                cycle: '2026', academicCycle: '2026', status: 'Activo', active: true,
                grades: { 'Contabilidad de Costos': [50, 55, 58, 56] }
            },
            {
                id: 'stu-rec-6a', carne: '2026-6A-020', personalCode: 'R6A003',
                name: 'Morales Díaz, José', grade: '6to Perito Contador', section: 'Sección A', gradeCode: '6to A',
                cycle: '2026', academicCycle: '2026', status: 'Activo', active: true,
                grades: { 'Auditoría': [52, 54, 58, 55] }
            }
        ]
    };

    const recupCandidates = [
        { student: { id: 'stu-rec-4b', code: 'R4B001', name: 'López Pérez, María', grade: '4to Perito Contador', section: 'B' }, targetSection: 'C' }, // Reubicación explícita a 5to C
        { student: { id: 'stu-rec-5a', code: 'R5A002', name: 'Gómez Ruiz, Carlos', grade: '5to Perito Contador', section: 'A' }, targetSection: 'B' }, // Reubicación explícita a 6to B
        { student: { id: 'stu-rec-6a', code: 'R6A003', name: 'Morales Díaz, José', grade: '6to Perito Contador', section: 'A' }, targetSection: 'A' }  // Graduando 2026
    ];

    // 1. RBAC: Docente NO puede migrar
    console.log("\n➡️  Prueba 1: Control de permisos (Docente bloqueado, Dirección/Admin/Secretaría permitidos)...");
    assert.strictEqual(canMigrateRecoveryPassedStudents('docente'), false);
    assert.strictEqual(canMigrateRecoveryPassedStudents('auxiliar'), false);
    assert.strictEqual(canMigrateRecoveryPassedStudents('director'), true);
    assert.strictEqual(canMigrateRecoveryPassedStudents('secretaria'), true);
    assert.strictEqual(canMigrateRecoveryPassedStudents('admin'), true);
    const blockedRes = await executeRecoveryMigrationBatch(recupCandidates, '2026', '2027', { skipConfirm: true });
    assert.strictEqual(blockedRes.success, false, "Docente no debe poder ejecutar la migración");
    console.log("  ✅ Prueba 1 Superada: Permisos RBAC verificados.");

    // 2. Migración coherente con selección de sección + preservación histórica
    console.log("\n➡️  Prueba 2: Migración a 2027 (4to->5to C, 5to->6to B, 6to->Egresado 2026) preservando histórico...");
    STATE.currentRole = 'director';
    const res1 = await executeRecoveryMigrationBatch(recupCandidates, '2026', '2027', { skipConfirm: true });
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.migrated, 2, "2 estudiantes (4to y 5to) deben migrar a 2027");
    assert.strictEqual(res1.graduated, 1, "1 estudiante de 6to debe pasar a Egresado 2026");
    assert.strictEqual(res1.skippedDuplicates, 0);
    assert.strictEqual(STATE.students.length, 3, "Cero duplicados: longitud exacta de STATE.students sigue siendo 3");

    const s4 = STATE.students.find(s => s.id === 'stu-rec-4b');
    assert.strictEqual(s4.grade, '5to Perito Contador');
    assert.strictEqual(s4.section, 'Sección C', "Debe respetar la sección destino elegida (Sección C)");
    assert.strictEqual(s4.gradeCode, '5to C');
    assert.strictEqual(s4.cycle, '2027');
    assert.strictEqual(Object.keys(s4.grades).length, 0, "Notas de 2027 deben iniciar limpias");
    assert.ok(s4.historicalGrades['2026'] && s4.historicalGrades['2026']['Contabilidad de Sociedades'], "Histórico de notas 2026 debe preservarse intacto");
    assert.strictEqual(s4.academicPromotionStatus, 'Promovido por Recuperación 2026');

    const s5 = STATE.students.find(s => s.id === 'stu-rec-5a');
    assert.strictEqual(s5.grade, '6to Perito Contador');
    assert.strictEqual(s5.section, 'Sección B', "Debe respetar la sección destino elegida (Sección B)");
    assert.strictEqual(s5.gradeCode, '6to B');
    assert.strictEqual(s5.cycle, '2027');

    const s6 = STATE.students.find(s => s.id === 'stu-rec-6a');
    assert.strictEqual(s6.status, 'Egresado');
    assert.strictEqual(s6.gradeCode, 'EGRESADO');
    assert.strictEqual(s6.graduationCycle, '2026');
    assert.strictEqual(s6.cycle, '2026', "Graduando de 6to NO entra a listados activos 2027");
    assert.strictEqual(s6.active, false);
    console.log("  ✅ Prueba 2 Superada: Ascensos, secciones elegidas, graduando e histórico 2026 validados.");

    // 3. Garantía Anti-Duplicidad al reintentar migrar los mismos alumnos
    console.log("\n➡️  Prueba 3: Garantía estricta anti-duplicidad al re-ejecutar migración...");
    const res2 = await executeRecoveryMigrationBatch(recupCandidates, '2026', '2027', { skipConfirm: true });
    assert.strictEqual(res2.migrated, 0, "No debe volver a migrar alumnos ya presentes en 2027");
    assert.strictEqual(res2.graduated, 0, "No debe volver a graduar alumno ya egresado");
    assert.strictEqual(res2.skippedDuplicates, 3, "Debe omitir automáticamente los 3 registros ya migrados");
    assert.strictEqual(STATE.students.length, 3, "Cero duplicados en STATE.students");
    console.log("  ✅ Prueba 3 Superada: Anti-duplicidad 100% garantizada.");

    // 4. Persistencia de estado "Ya promovido en 2027" incluso al recargar el Ciclo 2026 (Modo Histórico)
    console.log("\n➡️  Prueba 4: Recarga en Ciclo 2026 (Modo Histórico) detecta promovidos existentes en 2027...");
    const live2027Snapshot = JSON.parse(JSON.stringify(STATE.students));
    // Agregar además un alumno inscrito manualmente en 2027 con otro ID pero mismo nombre
    live2027Snapshot.push({
        id: 'stu-manual-2027-99',
        name: 'RAMOS GARCÍA MARÍA FERNANDA',
        grade: '5to Perito Contador',
        section: 'Sección D',
        gradeCode: '5to D',
        cycle: '2027',
        academicCycle: '2027',
        status: 'Activo'
    });
    window._activeCycleStudentsBackupByCycle = { '2027': live2027Snapshot };
    window._liveTargetCycleStudentsCache = { '2027': live2027Snapshot };

    // Simular recarga en Modo Histórico 2026: STATE.students solo contiene el archivo 2026
    STATE.isHistoricalReadOnlyMode = true;
    STATE.activeCycle = '2026';
    STATE.students = [
        { id: 'stu-rec-4b', personalCode: 'R4B001', name: 'López Pérez, María', grade: '4to Perito Contador', section: 'Sección B', cycle: '2026', status: 'Activo' },
        { id: 'stu-hist-ramos', personalCode: 'X99999', name: 'RAMOS GARCIA MARIA FERNANDA', grade: '4to Perito Contador', section: 'Sección A', cycle: '2026', status: 'Activo' }
    ];

    const prev4b = getRecoveryMigrationPreviewForStudent({ id: 'stu-rec-4b', code: 'R4B001', name: 'López Pérez, María', grade: '4to Perito Contador', section: 'B' }, '2026', '2027');
    assert.strictEqual(prev4b.alreadyMigrated, true, "Alumno ya migrado a 2027 DEBE aparecer como ya promovido al recargar 2026");
    assert.strictEqual(prev4b.existingGradeLabel, '5to C', "Debe mostrar su grado y sección real en 2027 (5to C)");

    const prevManual = getRecoveryMigrationPreviewForStudent({ id: 'stu-hist-ramos', code: 'X99999', name: 'RAMOS GARCIA MARIA FERNANDA', grade: '4to Perito Contador', section: 'A' }, '2026', '2027');
    assert.strictEqual(prevManual.alreadyMigrated, true, "Alumno inscrito en 2027 con otro ID pero mismo nombre normalizado DEBE detectarse como ya promovido");
    assert.strictEqual(prevManual.existingGradeLabel, '5to D', "Debe mostrar su sección real en 2027 (5to D)");
    console.log("  ✅ Prueba 4 Superada: Recarga de Ciclo 2026 mantiene 100% sincronizado el estado de promovidos en 2027.");

    // 5. Graduandos de 6to: agregar a cohorte oficial de Egresados y detectar ya-egresados al recargar 2026
    console.log("\n➡️  Prueba 5: Graduandos de 6to se agregan a Egresados 2026 y se detectan aunque se recargue 2026...");
    assert(Array.isArray(STATE.graduatedStudentsByCycle['2026']), "Debe existir cohorte STATE.graduatedStudentsByCycle['2026']");
    assert(STATE.graduatedStudentsByCycle['2026'].some(e => e.id === 'stu-rec-6a' && e.status === 'Egresado'), "stu-rec-6a debe haber sido agregado a Egresados 2026");

    // Simular recarga 2026 donde stu-rec-6a aparece todavía como Activo en el snapshot 2026
    STATE.students.push({
        id: 'stu-rec-6a', personalCode: 'R6A003', name: 'Morales Díaz, José',
        grade: '6to Perito Contador', section: 'Sección A', cycle: '2026', status: 'Activo'
    });
    const prev6a = getRecoveryMigrationPreviewForStudent({ id: 'stu-rec-6a', code: 'R6A003', name: 'Morales Díaz, José', grade: '6to Perito Contador', section: 'A' }, '2026', '2027');
    assert.strictEqual(prev6a.isGraduando, true);
    assert.strictEqual(prev6a.alreadyMigrated, true, "Graduando de 6to ya presente en Egresados 2026 DEBE aparecer marcado como Ya en Egresados");
    assert.strictEqual(prev6a.existingGradeLabel, 'Egresado 2026');
    console.log("  ✅ Prueba 5 Superada: Cohorte oficial de Egresados 2026 sincronizada sin pérdida ni duplicidad.");

    console.log("\n🎯 ¡TODAS LAS PRUEBAS DE MIGRACIÓN DE RECUPERACIONES A 2027 PASARON AL 100%!\n");
    process.exit(0);
})().catch(err => {
    console.error("❌ Error en prueba de migración de recuperaciones:", err);
    process.exit(1);
});
