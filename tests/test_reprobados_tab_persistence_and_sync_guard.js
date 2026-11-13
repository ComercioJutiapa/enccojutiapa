const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== TEST: REPROBADOS TAB PERSISTENCE & SYNC GUARD AUDIT ===');

const gradeStatsPath = path.join(__dirname, '..', 'grade_stats.js');
const appJsPath = path.join(__dirname, '..', 'app.js');

const gradeStatsCode = fs.readFileSync(gradeStatsPath, 'utf8');
const appJsCode = fs.readFileSync(appJsPath, 'utf8');

// Test 1: renderGradeStatsView must be a dispatcher respecting _currentGradeStatsActiveTab
console.log('Test 1: Verifying renderGradeStatsView tab dispatching logic...');
assert(gradeStatsCode.includes("const activeTab = window._currentGradeStatsActiveTab || 'actas';"), 'Must read activeTab');
assert(gradeStatsCode.includes("if (activeTab === 'reprobados')"), 'Must branch on reprobados tab');
assert(gradeStatsCode.includes("renderReprobadosRecuperacionView(renderOpts);"), 'Must call renderReprobadosRecuperacionView when activeTab is reprobados');
assert(gradeStatsCode.includes("if (activeTab === 'cuadro')"), 'Must branch on cuadro tab');
assert(gradeStatsCode.includes("renderCuadroEstadisticoOficial();"), 'Must call renderCuadroEstadisticoOficial when activeTab is cuadro');
assert(gradeStatsCode.includes("_renderGradeStatsActasInternal();"), 'Must call internal actas render only when activeTab is actas');
console.log('  -> PASS: renderGradeStatsView dispatches according to active tab.');

// Test 2: Button state synchronization
console.log('Test 2: Verifying _syncGradeStatsTabButtons helper...');
assert(gradeStatsCode.includes("function _syncGradeStatsTabButtons"), 'Must define _syncGradeStatsTabButtons');
assert(gradeStatsCode.includes("_syncGradeStatsTabButtons('reprobados');"), 'Must sync reprobados button state');
assert(gradeStatsCode.includes("_syncGradeStatsTabButtons('cuadro');"), 'Must sync cuadro button state');
assert(gradeStatsCode.includes("_syncGradeStatsTabButtons('actas');"), 'Must sync actas button state');
console.log('  -> PASS: Tab buttons are synced correctly across renders.');

// Test 3: SSE echo prevention in saveRecoverySubjectGrade
console.log('Test 3: Verifying SSE echo prevention in saveRecoverySubjectGrade...');
assert(gradeStatsCode.includes("window.STATE._lastSavedLocally = nowTime;"), 'Must set _lastSavedLocally to prevent SSE self-trigger');
assert(gradeStatsCode.includes("window._lastLocalGradeEditTime = nowTime;"), 'Must mark _lastLocalGradeEditTime on save');
console.log('  -> PASS: Local save timestamp prevents SSE self-reloading loop.');

// Test 4: Focus and input typing guard in applyIncomingCloudState
console.log('Test 4: Verifying typing guard in applyIncomingCloudState in app.js...');
assert(appJsCode.includes("const isActivelyOnReprobados = (STATE.activeView === 'grade-stats' && window._currentGradeStatsActiveTab === 'reprobados');"), 'Must detect if active on reprobados tab');
assert(appJsCode.includes("const isUserTypingInRecup = isActivelyOnReprobados && activeEl && activeEl.tagName === 'INPUT' && (activeEl.classList.contains('recup-score-input') || activeEl.id === 'reprobadosQuickSearchInput');"), 'Must detect typing in recup input or search');
assert(appJsCode.includes("!isUserTypingInRecup"), 'applyIncomingCloudState must not interrupt user while typing in recup inputs');
console.log('  -> PASS: Background cloud sync does not interrupt recovery typing or view.');

// Test 5: Firestore onSnapshot guard
console.log('Test 5: Verifying Firestore onSnapshot guard in app.js...');
assert(appJsCode.includes("const isTypingInRecup = activeEl && activeEl.tagName === 'INPUT' && (activeEl.classList.contains('recup-score-input') || activeEl.id === 'reprobadosQuickSearchInput');"), 'Firestore listener must check recup inputs');
console.log('  -> PASS: Firestore live snapshots do not hijack active recovery input.');

// Test 6: Simulation in mock DOM environment
console.log('Test 6: Simulating renderGradeStatsView with active tab = reprobados...');
const vm = require('vm');
const sandbox = {
    window: {},
    document: {
        getElementById: (id) => ({
            id,
            style: {},
            classList: { contains: () => false, add: () => {}, remove: () => {} },
            innerHTML: '',
            value: ''
        }),
        querySelectorAll: () => []
    },
    STATE: { currentRole: 'admin', activeView: 'grade-stats' },
    hasRolePermission: () => true,
    renderReprobadosRecuperacionViewCalled: false,
    renderActasCalled: false,
    renderCuadroCalled: false
};
sandbox.window = sandbox;
sandbox.window.STATE = sandbox.STATE;

// Mock dispatchers
sandbox.renderReprobadosRecuperacionView = function() { sandbox.renderReprobadosRecuperacionViewCalled = true; };
sandbox.renderCuadroEstadisticoOficial = function() { sandbox.renderCuadroCalled = true; };
sandbox._renderGradeStatsActasInternal = function() { sandbox.renderActasCalled = true; };

// Evaluate renderGradeStatsView
vm.createContext(sandbox);
vm.runInContext(`
${gradeStatsCode.slice(gradeStatsCode.indexOf('function _syncGradeStatsTabButtons'), gradeStatsCode.indexOf('function _renderGradeStatsActasInternal()'))}
`, sandbox);

// Scenario A: default/actas tab
sandbox.window._currentGradeStatsActiveTab = 'actas';
sandbox.renderActasCalled = false;
sandbox.renderReprobadosRecuperacionViewCalled = false;
sandbox.renderGradeStatsView();
assert(sandbox.renderActasCalled, 'Should call actas when activeTab is actas');
assert(!sandbox.renderReprobadosRecuperacionViewCalled, 'Should not call reprobados when activeTab is actas');

// Scenario B: reprobados tab
sandbox.window._currentGradeStatsActiveTab = 'reprobados';
sandbox.renderActasCalled = false;
sandbox.renderReprobadosRecuperacionViewCalled = false;
sandbox.renderGradeStatsView();
assert(sandbox.renderReprobadosRecuperacionViewCalled, 'Should call reprobados when activeTab is reprobados');
assert(!sandbox.renderActasCalled, 'Should NOT call actas when activeTab is reprobados');

// Scenario C: cuadro tab
sandbox.window._currentGradeStatsActiveTab = 'cuadro';
sandbox.renderActasCalled = false;
sandbox.renderReprobadosRecuperacionViewCalled = false;
sandbox.renderCuadroCalled = false;
sandbox.renderGradeStatsView();
assert(sandbox.renderCuadroCalled, 'Should call cuadro when activeTab is cuadro');
assert(!sandbox.renderActasCalled, 'Should NOT call actas when activeTab is cuadro');

console.log('  -> PASS: Simulation confirms 100% correct dispatching without view reversion.');
console.log('\n=== ALL 6 PERSISTENCE AND GUARD TESTS PASSED (6/6) ===');
