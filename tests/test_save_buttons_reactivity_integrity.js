/**
 * tests/test_save_buttons_reactivity_integrity.js
 * Auditoría automatizada de botones de guardado, reactividad 0ms, anti-reversión y cero pérdida de datos.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const appJsPath = path.resolve(__dirname, '..', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

console.log('🧪 Iniciando prueba de integridad de botones de guardado (Save Buttons Audit)...');

// 1. Verificar que saveGradebookChanges no bloquee _isSavingGradebookInProgress en retornos tempranos
const saveGbMatch = appJsContent.match(/async function saveGradebookChanges\(e\)\s*\{([\s\S]*?)window\.saveGradebookChanges = saveGradebookChanges;/);
assert(saveGbMatch, 'saveGradebookChanges debe existir');
const saveGbBody = saveGbMatch[1];
const firstLockIdx = saveGbBody.indexOf('_isSavingGradebookInProgress = true;');
const subjectCheckIdx = saveGbBody.indexOf('if (!subjectName)');
assert(firstLockIdx > subjectCheckIdx, '_isSavingGradebookInProgress = true debe establecerse DESPUÉS de las validaciones tempranas para nunca bloquear el botón de Guardar Calificaciones');
assert(saveGbBody.includes('renderStudentsTable()') && saveGbBody.includes('renderBoletasTable()'), 'saveGradebookChanges debe refrescar reactivamente renderStudentsTable y renderBoletasTable');
assert(saveGbBody.includes('#gradebookActivitiesTableBody tr[data-student-id]') && saveGbBody.includes('#gradebookSummaryTableBody tr[data-student-id]'), 'saveGradebookChanges debe cosechar inputs activos del DOM preservando 40/60');

// 2. Verificar que debounceStudentGradeSave y flushAllPendingGradeSaves usen delimitador seguro |||
assert(appJsContent.includes('const timerKey = `${studentId}|||${subjectName}|||${unit}`;'), 'debounceStudentGradeSave y flushStudentGradeSave deben usar delimitador seguro |||');
assert(appJsContent.includes("timerKey.includes('|||') ? timerKey.split('|||')"), 'flushAllPendingGradeSaves debe separar timerKey con |||');

// 3. Verificar que renderGradeEditRequestsTable envuelva req.id en comillas simples en onclick
assert(appJsContent.includes("approveGradeEditRequest(\\'' + req.id + '\\')"), 'approveGradeEditRequest en renderGradeEditRequestsTable debe tener comillas simples en req.id');
assert(appJsContent.includes("rejectGradeEditRequest(\\'' + req.id + '\\')"), 'rejectGradeEditRequest en renderGradeEditRequestsTable debe tener comillas simples en req.id');
assert(appJsContent.includes("revokeGradeEditRequest(\\'' + req.id + '\\')"), 'revokeGradeEditRequest en renderGradeEditRequestsTable debe tener comillas simples en req.id');

// 4. Verificar guardado optimista (0ms) en saveStudentProfileForm, saveCycleForm, saveQuickGuideTeacher, saveGradeForm, saveDisciplineForm, saveDisciplineResolutionForm, saveStudentPermissionForm
const checkLocalStorageInFn = (fnName) => {
    const regex = new RegExp(`function ${fnName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?saveStateToLocalStorage\\(\\)`, 'm');
    assert(regex.test(appJsContent), `${fnName} debe invocar saveStateToLocalStorage() para garantizar cero pérdida de datos`);
};

[
    'saveStudentForm',
    'saveStudentProfileForm',
    'saveAcademicExoneration',
    'saveSchoolHeaderConfig',
    'confirmStudentImport',
    'submitGradeEditRequest',
    'saveCycleForm',
    'saveGradebookChanges',
    'saveAttendanceRecords',
    'saveStudentPermissionForm',
    'saveDisciplineForm',
    'saveDisciplineResolutionForm',
    'saveQuickGuideTeacher',
    'saveGradeForm'
].forEach(checkLocalStorageInFn);

// 5. Verificar protección _locallyDirtyStudentIds en saveStudentForm, saveStudentProfileForm, saveAcademicExoneration y confirmStudentImport
['saveStudentForm', 'saveStudentProfileForm', 'saveAcademicExoneration', 'confirmStudentImport'].forEach(fnName => {
    const startIdx = appJsContent.indexOf(`function ${fnName}`);
    assert(startIdx !== -1, `Función ${fnName} debe existir`);
    const slice = appJsContent.slice(startIdx, startIdx + 12000);
    assert(slice.includes('_locallyDirtyStudentIds'), `${fnName} debe proteger al estudiante en window._locallyDirtyStudentIds contra ecos de onSnapshot`);
});

// 6. Verificar delegación universal en initGlobalSaveDelegation
const delegationIdx = appJsContent.indexOf('function initGlobalSaveDelegation()');
assert(delegationIdx !== -1, 'initGlobalSaveDelegation debe existir');
const delegationSlice = appJsContent.slice(delegationIdx, delegationIdx + 12000);
assert(delegationSlice.includes('saveStudentPermissionForm'), 'initGlobalSaveDelegation debe registrar saveStudentPermissionForm');
assert(delegationSlice.includes('confirmStudentImport'), 'initGlobalSaveDelegation debe registrar confirmStudentImport');
assert(delegationSlice.includes("e.key === 's' || e.key === 'S'"), 'initGlobalSaveDelegation debe soportar atajo Ctrl+S');

console.log('✅ Prueba de integridad y reactividad de todos los botones de guardado APROBADA.');
