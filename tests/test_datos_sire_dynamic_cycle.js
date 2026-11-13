const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- TEST: DATOS SIRE DYNAMIC CYCLE & READ-ONLY INTEGRITY ---');

const datosSirePath = path.join(__dirname, '..', 'datos-sire.html');
const appJsPath = path.join(__dirname, '..', 'app.js');

const sireHtml = fs.readFileSync(datosSirePath, 'utf8');
const appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. Verify app.js passes cycle param when navigating to datos-sire
console.log('Test 1: app.js navigates with dynamic cycle param...');
assert(appJs.includes("viewName === 'datos-sire'"), 'Should handle datos-sire viewName');
assert(appJs.includes("var targetUrl = 'datos-sire.html' + (curCycle ? ('?cycle=' + encodeURIComponent(curCycle)) : '');"), 'Should construct targetUrl with cycle parameter');
console.log('  -> PASS: app.js forwards viewing or active cycle to datos-sire.html');

// 2. Verify read-only: no write operations (POST, PUT, PATCH, DELETE) in datos-sire.html
console.log('Test 2: Ensure strictly read-only HTTP calls in datos-sire.html...');
assert(!sireHtml.includes("method: 'POST'"), 'No POST method allowed in datos-sire.html');
assert(!sireHtml.includes("method: 'PUT'"), 'No PUT method allowed in datos-sire.html');
assert(!sireHtml.includes("method: 'PATCH'"), 'No PATCH method allowed in datos-sire.html');
assert(!sireHtml.includes("method: 'DELETE'"), 'No DELETE method allowed in datos-sire.html');
assert(!sireHtml.includes('setDoc('), 'No Firestore setDoc allowed in datos-sire.html');
assert(!sireHtml.includes('addDoc('), 'No Firestore addDoc allowed in datos-sire.html');
assert(!sireHtml.includes('deleteDoc('), 'No Firestore deleteDoc allowed in datos-sire.html');
console.log('  -> PASS: datos-sire.html is 100% read-only');

// 3. Verify UI contains the interactive cycle selector and badge
console.log('Test 3: Checking cycle selector and badge in KPI bar...');
assert(sireHtml.includes('id="sireCycleSelect"'), 'Must have select element with id sireCycleSelect');
assert(sireHtml.includes('onchange="onSireCycleChange(this.value)"'), 'Must have onchange handler calling onSireCycleChange');
assert(sireHtml.includes('id="sireCycleBadge"'), 'Must have badge element with id sireCycleBadge');
assert(sireHtml.includes('id="printCycleSpan"'), 'Must have printCycleSpan in official print header');
console.log('  -> PASS: Cycle selector, status badge and print header present');

// 4. Verify helper functions and cycle routing logic
console.log('Test 4: Checking cycle helper functions...');
assert(sireHtml.includes('window.getCurrentSireCycle = function()'), 'Must define window.getCurrentSireCycle');
assert(sireHtml.includes('function updateSireCycleSelectorUI()'), 'Must define updateSireCycleSelectorUI');
assert(sireHtml.includes('async function onSireCycleChange(newCycle)'), 'Must define onSireCycleChange');
assert(sireHtml.includes('/encc_school_state/historico/'), 'Must route historical requests to /encc_school_state/historico/');
assert(sireHtml.includes('/encc_school_state/students.json'), 'Must route active cycle requests to /encc_school_state/students.json');
console.log('  -> PASS: Cycle discovery and dynamic routing present');

// 5. Verify exports use dynamic cycle instead of hardcoded 2026
console.log('Test 5: Checking dynamic cycle in all export routines...');
assert(sireHtml.includes("XLSX.writeFile(wb, 'SIRE_MINEDUC_ENCCO_Calificaciones_Por_Grado_' + getCurrentSireCycle() + '.xlsx');"), 'Grade Excel export must use getCurrentSireCycle()');
assert(sireHtml.includes("XLSX.writeFile(wb, 'SIRE_MINEDUC_ENCCO_Calificaciones_Por_12_Secciones_' + getCurrentSireCycle() + '.xlsx');"), 'Section Excel export must use getCurrentSireCycle()');
assert(sireHtml.includes("XLSX.writeFile(wb, 'SIRE_MINEDUC_ENCCO_Padron_Matricula_Por_Grado_' + getCurrentSireCycle() + '.xlsx');"), 'Enrollment Excel export must use getCurrentSireCycle()');
assert(sireHtml.includes("XLSX.writeFile(wb, 'SIRE_MINEDUC_Plantilla_Tabular_' + fileSuffix + '_' + period + '_' + getCurrentSireCycle() + '.xlsx');"), 'Tabular Excel export must use getCurrentSireCycle()');
assert(sireHtml.includes("a.download = 'SIRE_MINEDUC_Cuadro_' + gKey + '_Perito_Contador_' + period + '_' + getCurrentSireCycle() + '.xml';"), 'Grade XML download must use getCurrentSireCycle()');
assert(sireHtml.includes("a.download = 'SIRE_MINEDUC_Cuadro_' + targetGrade + '_Sec_' + targetSection + '_' + period + '_' + getCurrentSireCycle() + '.xml';"), 'Section XML download must use getCurrentSireCycle()');
assert(sireHtml.includes("XLSX.writeFile(wb, \"ENCCO_Datos_Para_Sire_Promedios_\" + getCurrentSireCycle() + \".xlsx\");"), 'Summary Excel export must use getCurrentSireCycle()');
console.log('  -> PASS: All export file names and headers use dynamic cycle');

// 6. Live network fetch simulation test
console.log('Test 6: Live network simulation of student retrieval per cycle...');
(async () => {
    // Test active cycle fetch
    const activeRes = await fetch('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json?shallow=true').then(r => r.json());
    const activeCount = Object.keys(activeRes || {}).length;
    assert.strictEqual(activeCount, 344, 'Active cycle (2027) should have 344 students');

    // Test historical cycle 2026 fetch
    const histRes = await fetch('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/historico/2026/studentsSnapshot.json?shallow=true').then(r => r.json());
    const histCount = Object.keys(histRes || {}).length;
    assert.strictEqual(histCount, 412, 'Historical cycle 2026 should have 412 students');

    console.log(`  -> PASS: Active cycle: ${activeCount} students | Historical 2026: ${histCount} students`);
    console.log('\nALL 6 DATOS SIRE DYNAMIC CYCLE TESTS PASSED SUCCESSFULLY! ✅');
})();
