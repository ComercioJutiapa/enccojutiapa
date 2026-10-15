const assert = require('assert');
const fs = require('fs');

console.log("=== INICIANDO TEST DE AUTORIDAD DE DIRECCIÓN Y SECRETARÍA EN ESTUDIANTES ===");

// 1. Simulación de entorno de ejecución en app.js
const appCode = fs.readFileSync('app.js', 'utf8');

// Extraer funciones clave del código fuente para validación estricta
const isStudentAuthorityRoleMatch = appCode.match(/function isStudentAuthorityRole\([\s\S]*?\n\}/);
if (!isStudentAuthorityRoleMatch) {
    throw new Error("No se encontró isStudentAuthorityRole en app.js");
}

eval(isStudentAuthorityRoleMatch[0]);

// Probar roles autorizados
assert.strictEqual(isStudentAuthorityRole('director'), true, 'director debe ser rol con autoridad');
assert.strictEqual(isStudentAuthorityRole('direccion'), true, 'direccion debe ser rol con autoridad');
assert.strictEqual(isStudentAuthorityRole('secretaria'), true, 'secretaria debe ser rol con autoridad');
assert.strictEqual(isStudentAuthorityRole('secretaria_general'), true, 'secretaria_general debe ser rol con autoridad');
assert.strictEqual(isStudentAuthorityRole('secretaria_auxiliar'), true, 'secretaria_auxiliar debe ser rol con autoridad');
assert.strictEqual(isStudentAuthorityRole('admin'), true, 'admin debe ser rol con autoridad');
assert.strictEqual(isStudentAuthorityRole('super_usuario'), true, 'super_usuario debe ser rol con autoridad');
assert.strictEqual(isStudentAuthorityRole('docente'), false, 'docente no debe ser autoridad administrativa');
assert.strictEqual(isStudentAuthorityRole('estudiante'), false, 'estudiante no debe ser autoridad administrativa');
console.log("  ✓ isStudentAuthorityRole valida correctamente todos los roles de Dirección y Secretaría.");

// 2. Probar deduplicación inteligente y exclusión
const checkDupMatch = appCode.match(/function checkStudentDuplicateEnrollment\([\s\S]*?\n\}/);
if (!checkDupMatch) {
    throw new Error("No se encontró checkStudentDuplicateEnrollment en app.js");
}

const mockState = {
    activeCycle: '2026',
    students: [
        {
            id: 'stu-sire-G482XGW',
            carne: '2026-QA-035',
            personalCode: 'G482XGW',
            cui: '2038166332201',
            firstName: 'ALICIA CAROLINA',
            lastName: 'RAMOS FLORIÁN',
            birthDate: '2009-03-30',
            grade: '5to Perito Contador',
            section: 'Sección A',
            cycle: '2026',
            status: 'Activo'
        },
        {
            id: 'stu-sire-E195FVT',
            carne: '2026-QD-025',
            personalCode: 'E195FVT',
            cui: '2038166332201', // Mismo CUI compartido o provisional
            firstName: 'DULCE MARÍA',
            lastName: 'RAMOS FLORIÁN',
            birthDate: '2008-05-15',
            grade: '5to Perito Contador',
            section: 'Sección D',
            cycle: '2026',
            status: 'Activo'
        }
    ]
};

global.STATE = mockState;
eval(checkDupMatch[0]);

// Prueba A: Editar a Alicia pasando su ID -> no debe reportar duplicado consigo misma
const dupSelf = checkStudentDuplicateEnrollment({
    personalCode: 'G482XGW',
    carne: '2026-QA-035',
    cui: '2038166332201',
    firstName: 'ALICIA CAROLINA',
    lastName: 'RAMOS FLORIÁN',
    cycle: '2026'
}, 'stu-sire-G482XGW');
assert.strictEqual(dupSelf, undefined, 'Editar al mismo estudiante no debe reportar duplicado');
console.log("  ✓ Edición del mismo estudiante no genera falsos positivos.");

// Prueba B: Dulce comparte CUI con Alicia pero sus nombres y códigos son distintos -> no debe bloquear a Dulce
const dupSibling = checkStudentDuplicateEnrollment({
    personalCode: 'E195FVT',
    carne: '2026-QD-025',
    cui: '2038166332201',
    firstName: 'DULCE MARÍA',
    lastName: 'RAMOS FLORIÁN',
    cycle: '2026'
}, 'stu-sire-E195FVT');
assert.strictEqual(dupSibling, undefined, 'Dulce con CUI similar no es bloqueada');
console.log("  ✓ Hermanos con CUI compartido/provisional no son bloqueados falsamente.");

// Prueba C: Intento de inscribir un nuevo estudiante con el mismo código personal de Alicia -> debe detectar duplicado
const dupReal = checkStudentDuplicateEnrollment({
    personalCode: 'G482XGW',
    firstName: 'OTRO',
    lastName: 'ALUMNO',
    cycle: '2026'
}, null);
assert.notStrictEqual(dupReal, undefined, 'Mismo código personal debe detectarse');
assert.strictEqual(dupReal.personalCode, 'G482XGW');
console.log("  ✓ Detección de duplicado real por Código Personal funciona exactamente.");

// 3. Probar que ensureSireOfficialStudents NO revierte cambios de Dirección/Secretaría
// Simular que Dirección cambió el estado de Dulce María a 'Retirado' y cambió a Alicia a 'Sección B'
mockState.students[1].status = 'Retirado';
mockState.students[1].active = false;
mockState.students[1].retireReason = 'Cambio de domicilio';
mockState.students[1].editedByAuthority = true;

mockState.students[0].section = 'Sección B';
mockState.students[0].gradeCode = '5to PC B';
mockState.students[0].gradeLabel = '5to Perito Contador (Sección B)';
mockState.students[0].editedByAuthority = true;

// Extraer ensureSireOfficialStudents y sus dependencias
global.deduplicateStudentsCollection = s => s;
global.getStudentAssignment = s => ({ grade: s.grade, section: s.section, gradeCode: s.gradeCode, fullLabel: s.gradeLabel });

const ensureSireMatch = appCode.match(/function ensureSireOfficialStudents\(\)[\s\S]*?\n\}\nwindow\.ensureSireOfficialStudents/);
if (!ensureSireMatch) {
    throw new Error("No se encontró ensureSireOfficialStudents en app.js");
}

const ensureSireCode = ensureSireMatch[0].replace('window.ensureSireOfficialStudents', '// done');
eval(ensureSireCode);

// Ejecutar auto-sanación de arranque
ensureSireOfficialStudents();

// Verificar que Dulce SIGUE siendo 'Retirado' (no fue sobreescrita a 'Activo')
assert.strictEqual(mockState.students[1].status, 'Retirado', 'El estado de Retirado asignado por Secretaría DEBE mantenerse intacto');
assert.strictEqual(mockState.students[1].active, false, 'active debe ser false para retirado');
console.log("  ✓ El retiro asignado por Secretaría a Dulce María se preserva al 100% (NO se revierte a Activo).");

// Verificar que Alicia SIGUE en 'Sección B' (no fue revertida a 'Sección A')
assert.strictEqual(mockState.students[0].section, 'Sección B', 'La sección reasignada por Dirección DEBE mantenerse intacta');
assert.strictEqual(mockState.students[0].gradeCode, '5to PC B', 'El gradeCode reasignado se preserva');
console.log("  ✓ La reasignación de sección por Dirección a Alicia Carolina se preserva al 100% (NO se revierte a Sección A).");

console.log("\n========================================================");
console.log("✅ TODAS LAS PRUEBAS DE AUTORIDAD Y CERO CONFLICTOS PASARON EXITOSAMENTE");
console.log("========================================================");
