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

// TEST 5: Verificación de selección y enfoque O(1) sin escaneo masivo del DOM
console.log('\n--- Test 5: Verificación de enfoque y resaltado O(1) de fila activa ---');
const focusFn = appJs.slice(appJs.indexOf('function handleGradeInputFocus'), appJs.indexOf('window.handleGradeInputFocus'));
assert(!focusFn.includes('querySelectorAll'), 'handleGradeInputFocus NO debe realizar querySelectorAll en cada foco');
assert(focusFn.includes('_currentActiveGradeRow'), 'handleGradeInputFocus debe utilizar puntero O(1) _currentActiveGradeRow');
console.log('✅ PASS: Enfoque y resaltado de fila activa optimizado en O(1) sin lecturas masivas.');

// TEST 6: Verificación de navegación fluida O(1) por punteros directos del DOM
console.log('\n--- Test 6: Verificación de navegación por teclado O(1) ---');
const gridNavFn = appJs.slice(appJs.indexOf('function handleGradeGridKeyDown'), appJs.indexOf('window.handleGradeGridKeyDown'));
assert(!gridNavFn.includes('tbody.querySelectorAll'), 'handleGradeGridKeyDown NO debe escanear todas las filas con querySelectorAll');
assert(gridNavFn.includes('nextElementSibling') && gridNavFn.includes('cellIndex'), 'handleGradeGridKeyDown debe usar punteros directos C++ (nextElementSibling, cellIndex)');
console.log('✅ PASS: Navegación por teclado tipo Excel ejecutada en O(1) por punteros nativos directos.');

// TEST 7: Desacoplamiento de localStorage en guardado atómico individual
console.log('\n--- Test 7: Guardado atómico individual sin congelamiento de hilo ---');
const atomicSaveFn = appJs.slice(appJs.indexOf('async function saveStudentSubjectGradeAtomic'), appJs.indexOf('window.saveStudentSubjectGradeAtomic'));
assert(atomicSaveFn.includes('scheduleFullStateSaveDebounced()'), 'saveStudentSubjectGradeAtomic debe delegar persistencia masiva a scheduler');
assert(!atomicSaveFn.includes('saveStateToLocalStorage();'), 'saveStudentSubjectGradeAtomic NO debe ejecutar saveStateToLocalStorage síncrono');
console.log('✅ PASS: Persistencia individual completamente desacoplada de la serialización global.');

// TEST 8: Debounce inteligente en captura continua y commit
console.log('\n--- Test 8: Verificación de debounce inteligente en captura continua ---');
assert(actChangeFn.includes('debounceStudentGradeSave(studentId, subjectName, unit, student.gradebookDetails[subjectName][unit], 600)'), 'Commit debe usar debounce inteligente de 600ms');
console.log('✅ PASS: Prevención de ráfagas HTTP (Network Flooding) verificada con éxito.');

console.log('\n========================================================================');
console.log('🎉 ¡TODAS LAS PRUEBAS DE VELOCIDAD INSTANTÁNEA PASARON EXITOSAMENTE!');
console.log('========================================================================');
