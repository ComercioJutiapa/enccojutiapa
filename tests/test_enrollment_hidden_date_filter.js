const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const htmlCode = fs.readFileSync(path.join(rootDir, 'plataforma.html'), 'utf8');
const appCode = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');

console.log('🧪 Iniciando Test Suite: Fecha Oculta de Inscripción y Filtro Dinámico en Nómina...');

// 1. Verificar campo oculto en el formulario de Inscripción y controles responsivos de filtro en Nómina
assert(htmlCode.includes('<input type="hidden" id="studentEnrollmentDate">'), 'Debe existir <input type="hidden" id="studentEnrollmentDate"> en #mainEnrollmentForm');
assert(htmlCode.includes('id="studentEnrollDateModeSelect"'), 'Debe existir selector de filtro por fecha de inscripción en #view-students');
assert(htmlCode.includes('id="studentEnrollDateFrom"') && htmlCode.includes('id="studentEnrollDateTo"'), 'Deben existir inputs de fecha exacta / rango en #view-students');
// Verificar que NO se agregó una columna visible "Fecha de Inscripción" al thead de la tabla principal
const studentsTheadMatch = htmlCode.match(/<table class="custom-table horizontal-student-table">[\s\S]*?<thead>([\s\S]*?)<\/thead>/);
assert(studentsTheadMatch && !studentsTheadMatch[1].toLowerCase().includes('fecha de inscripci'), 'La fecha de inscripción debe mantenerse oculta (sin columna pública en la tabla)');
console.log('  ✅ 1. Campo oculto en formulario y filtro dinámico (sin exponer columna en tabla) verificados.');

// 2. Verificar preservación en saveStudentForm y reseteo en resetStudentFilters
assert(appCode.includes('enrollmentDate: preservedEnrollmentDate'), 'saveStudentForm debe preservar la fecha de inscripción original al editar');
assert(appCode.includes('enrollmentDate: hiddenEnrollDateVal || todayIsoDate'), 'saveStudentForm debe guardar enrollmentDate al crear nuevo estudiante');
assert(appCode.includes('if (enrollModeEl) enrollModeEl.value = \'ALL\';'), 'resetStudentFilters debe limpiar el filtro de fecha de inscripción');
console.log('  ✅ 2. Preservación en edición, asignación en alta y limpieza de filtros verificadas.');

// 3. Evaluar lógicamente getLocalIsoDateString, getStudentEnrollmentDateISO y matchesStudentEnrollmentDateFilter
const fnStart = appCode.indexOf('function getLocalIsoDateString(dateObj)');
const fnEnd = appCode.indexOf('function resetStudentFilters()');
assert(fnStart !== -1 && fnEnd !== -1 && fnEnd > fnStart, 'Deben existir las funciones de fecha de inscripción en app.js');

const ctx = { window: {}, document: { getElementById: () => null }, Date };
vm.createContext(ctx);
vm.runInContext(appCode.slice(fnStart, fnEnd), ctx);

const { getLocalIsoDateString, getStudentEnrollmentDateISO, matchesStudentEnrollmentDateFilter } = ctx.window;

const refNow = new Date(2026, 10, 23, 15, 30, 0); // 2026-11-23 local
assert.strictEqual(getLocalIsoDateString(refNow), '2026-11-23');

const stuDirect = { id: 's1', enrollmentDate: '2026-11-23' };
const stuLegacyEnrolledAt = { id: 's2', enrolledAt: '2026-11-18T16:00:00.000Z' };
const stuOldMonth = { id: 's3', enrolledAt: '2026-10-15T16:00:00.000Z' };
const stuPromoted = { id: 's4', promotedAt: '2026-11-05T16:00:00.000Z' };
const stuNoDate = { id: 's5' };

assert.strictEqual(getStudentEnrollmentDateISO(stuDirect), '2026-11-23');
assert.strictEqual(getStudentEnrollmentDateISO(stuLegacyEnrolledAt), '2026-11-18');
assert.strictEqual(getStudentEnrollmentDateISO(stuPromoted), '2026-11-05');
assert.strictEqual(getStudentEnrollmentDateISO(stuNoDate), '');

// TODAY
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuDirect, 'TODAY', '', '', refNow), true);
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuLegacyEnrolledAt, 'TODAY', '', '', refNow), false);
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuNoDate, 'TODAY', '', '', refNow), false);

// LAST_7 (2026-11-17 .. 2026-11-23)
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuDirect, 'LAST_7', '', '', refNow), true);
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuLegacyEnrolledAt, 'LAST_7', '', '', refNow), true);
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuPromoted, 'LAST_7', '', '', refNow), false);

// THIS_MONTH (2026-11)
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuDirect, 'THIS_MONTH', '', '', refNow), true);
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuPromoted, 'THIS_MONTH', '', '', refNow), true);
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuOldMonth, 'THIS_MONTH', '', '', refNow), false);

// EXACT
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuLegacyEnrolledAt, 'EXACT', '2026-11-18', '', refNow), true);
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuDirect, 'EXACT', '2026-11-18', '', refNow), false);

// RANGE
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuPromoted, 'RANGE', '2026-11-01', '2026-11-10', refNow), true);
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuLegacyEnrolledAt, 'RANGE', '2026-11-01', '2026-11-10', refNow), false);

// ALL (incluye incluso estudiantes históricos sin fecha)
assert.strictEqual(matchesStudentEnrollmentDateFilter(stuNoDate, 'ALL', '', '', refNow), true);

console.log('  ✅ 3. Lógica de resolución retrocompatible y filtros (HOY, 7 DÍAS, ESTE MES, EXACTA, RANGO, TODAS) aprobada.');
console.log('\n🎯 ¡TODAS LAS PRUEBAS DE FECHA OCULTA DE INSCRIPCIÓN PASARON AL 100%!');
