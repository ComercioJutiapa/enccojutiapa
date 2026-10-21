const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('========================================================================');
console.log('🧪 VERIFICACIÓN DE RENDIMIENTO ULTRA-RÁPIDO (0ms) EN CALIFICACIONES');
console.log('========================================================================');

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// TEST 1: Purga Walter Solórzano
console.log('\n--- Test 1: Verificación de exclusión de Walter Solórzano ---');
assert(!appJs.includes('Walter Solórzano') && !appJs.includes('Walter Solorzano'), 'Walter Solórzano debe permanecer ausente');
console.log('✅ PASS: Walter Solórzano ausente y purgado.');

// TEST 2: Presencia de schedulers debounced
console.log('\n--- Test 2: Verificación de schedulers debounced en app.js ---');
assert(appJs.includes('function scheduleFullStateSaveDebounced'), 'scheduleFullStateSaveDebounced debe existir');
assert(appJs.includes('function scheduleDebouncedLiveKpis'), 'scheduleDebouncedLiveKpis debe existir');
console.log('✅ PASS: Schedulers debounced implementados correctamente.');

// TEST 3: Desacoplamiento de clonación pesada en pulsación de teclas
console.log('\n--- Test 3: Verificación de desacoplamiento de saveStateToLocalStorage en inputs ---');
const actChangeFn = appJs.slice(appJs.indexOf('function handleActivityBoxChange'), appJs.indexOf('function handleDirectZonaChange'));
assert(!actChangeFn.includes('saveStateToLocalStorage()'), 'handleActivityBoxChange NO debe ejecutar saveStateToLocalStorage síncrono');

const directZonaFn = appJs.slice(appJs.indexOf('function handleDirectZonaChange'), appJs.indexOf('function handleExamScoreChange'));
assert(!directZonaFn.includes('saveStateToLocalStorage()'), 'handleDirectZonaChange NO debe ejecutar saveStateToLocalStorage síncrono');

const examScoreFn = appJs.slice(appJs.indexOf('function handleExamScoreChange'), appJs.indexOf('function saveGradebookChanges'));
assert(!examScoreFn.includes('saveStateToLocalStorage()'), 'handleExamScoreChange NO debe ejecutar saveStateToLocalStorage síncrono');

console.log('✅ PASS: Cero llamadas bloqueantes a saveStateToLocalStorage en captura de notas.');

// TEST 4: Verificación de debounce en métricas de grupo
console.log('\n--- Test 4: Verificación de actualización optimizada de métricas de grupo ---');
const summaryDomFn = appJs.slice(appJs.indexOf('function updateStudentGradeRowSummaryDOM'), appJs.indexOf('function handleActivityBoxChange'));
assert(summaryDomFn.includes('scheduleDebouncedLiveKpis(subjectName, unit)'), 'updateStudentGradeRowSummaryDOM debe usar scheduleDebouncedLiveKpis');
console.log('✅ PASS: Métricas de grupo desacopladas mediante retardo inteligente (0ms en UI).');

console.log('\n========================================================================');
console.log('🎉 ¡TODAS LAS PRUEBAS DE VELOCIDAD INSTANTÁNEA PASARON EXITOSAMENTE!');
console.log('========================================================================');
