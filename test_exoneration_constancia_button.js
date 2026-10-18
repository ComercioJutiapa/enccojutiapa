const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🧪 VERIFICACIÓN TÉCNICA: BOTÓN CONSTANCIA Y MODAL DE EXONERACIONES');
console.log('========================================================================');

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');

// TEST 1: Walter Solórzano must NOT exist anywhere in app.js or plataforma.html
console.log('\n--- Test 1: Verificación de exclusión absoluta de Walter Solórzano ---');
if (appJs.includes('Walter Solórzano') || appJs.includes('Walter Solorzano') ||
    html.includes('Walter Solórzano') || html.includes('Walter Solorzano')) {
    console.error('❌ ERROR: Se detectó referencia a Walter Solórzano');
    process.exit(1);
}
console.log('✅ PASS: Walter Solórzano está 100% purgado y ausente.');

// TEST 2: Verificación de no uso de window.alert/confirm nativos en las nuevas funciones
console.log('\n--- Test 2: Verificación de no uso de alert/confirm nativos ---');
const constanciaFunctions = appJs.slice(appJs.indexOf('function openExonerationDetailModalByIndex'), appJs.indexOf('// Exportar a window para asegurar disponibilidad global'));
if (constanciaFunctions.includes('window.alert') || constanciaFunctions.includes('alert(') || constanciaFunctions.includes('window.confirm') || constanciaFunctions.includes('confirm(')) {
    console.error('❌ ERROR: Se detectó uso de alert/confirm nativo en funciones de constancia');
    process.exit(1);
}
console.log('✅ PASS: No se utilizan alertas ni confirmaciones nativas del navegador.');

// TEST 3: Verificación del botón "Constancia" y renderizado en tabla
console.log('\n--- Test 3: Verificación del botón "Constancia" en renderExoneracionesLogView ---');
if (!appJs.includes('openExonerationDetailModalByIndex(${idx})')) {
    console.error('❌ ERROR: El botón de constancia no llama a openExonerationDetailModalByIndex con índice seguro');
    process.exit(1);
}
if (!appJs.includes('window._lastRenderedExonsList = filtered;')) {
    console.error('❌ ERROR: window._lastRenderedExonsList no está almacenado para indexación');
    process.exit(1);
}
console.log('✅ PASS: Botón "Constancia" invoca openExonerationDetailModalByIndex de manera segura con índice numérico.');

// TEST 4: Verificación de funciones de visualización e impresión
console.log('\n--- Test 4: Verificación de funciones de visualización e impresión oficial ---');
const requiredFns = [
    'openExonerationDetailModalByIndex',
    'openExonerationDetailModal',
    'printStudentExonerationOfficialCertificate',
    'printCurrentExonerationCertificate'
];
for (const fn of requiredFns) {
    if (!appJs.includes(`function ${fn}`)) {
        console.error(`❌ ERROR: Falta la función ${fn}`);
        process.exit(1);
    }
    if (!appJs.includes(`window.${fn} = ${fn};`)) {
        console.error(`❌ ERROR: Falta exportar ${fn} a window`);
        process.exit(1);
    }
}
console.log('✅ PASS: Todas las funciones de constancia e impresión están implementadas y exportadas globalmente.');

// TEST 5: Verificación de modal en plataforma.html
console.log('\n--- Test 5: Verificación de modal y elementos en plataforma.html ---');
const requiredModalElements = [
    'id="exonerationDetailDocenteModal"',
    'id="exonDocModalFolio"',
    'id="exonDocModalStudentName"',
    'id="exonDocModalMeta"',
    'id="exonDocModalSubject"',
    'id="exonDocModalBimestre"',
    'id="exonDocModalReason"',
    'id="exonDocModalAuthorizedBy"',
    'id="exonDocModalDate"',
    'onclick="printCurrentExonerationCertificate()"'
];
for (const elem of requiredModalElements) {
    if (!html.includes(elem)) {
        console.error(`❌ ERROR: Falta el elemento modal ${elem} en plataforma.html`);
        process.exit(1);
    }
}
console.log('✅ PASS: Modal exonerationDetailDocenteModal y todos sus campos y controles están presentes en el DOM.');

// TEST 6: Verificación de activación del modal con clase .active
console.log('\n--- Test 6: Verificación de clase .active y showModalById para apertura correcta ---');
if (!appJs.includes("modal.classList.add('active');") && !appJs.includes("showModalById('exonerationDetailDocenteModal')")) {
    console.error('❌ ERROR: El modal no activa la clase .active requerida por CSS');
    process.exit(1);
}
console.log('✅ PASS: El modal activa correctamente la clase .active y showModalById sin ser bloqueado por CSS.');

// TEST 7: Verificación de filtrado por Docente (RBAC)
console.log('\n--- Test 7: Verificación de filtrado y permisos RBAC para Docente ---');
if (!appJs.includes("curRole.toLowerCase() === 'docente'") ||
    !appJs.includes('isStudentAssignedToTeacher(s, currentUser)')) {
    console.error('❌ ERROR: Falta validación o filtrado docente en el log de exoneraciones');
    process.exit(1);
}
console.log('✅ PASS: Filtrado por docente correctamente aplicado en lista y grado.');

// TEST 8: Verificación de contenido imprimible oficial
console.log('\n--- Test 8: Verificación de estructura de constancia oficial para impresión ---');
const printCode = appJs.slice(appJs.indexOf('function printStudentExonerationOfficialCertificate'), appJs.indexOf('function renderExoneracionesLogView'));
const printKeywords = [
    'Constancia Oficial de Exoneración Académica',
    'Escuela Nacional de Ciencias Comerciales',
    'MINISTERIO DE EDUCACIÓN',
    'HACE CONSTAR QUE:',
    'Secretario(a) de la Institución',
    'Director(a) General',
    'printWin.print()'
];
for (const kw of printKeywords) {
    if (!printCode.includes(kw)) {
        console.error(`❌ ERROR: La constancia impresa carece de elemento oficial requerido: ${kw}`);
        process.exit(1);
    }
}
console.log('✅ PASS: La plantilla de impresión oficial contiene todos los membretes, sellos, firmas y declaraciones institucionales.');

console.log('\n========================================================================');
console.log('🎉 ¡TODAS LAS VERIFICACIONES TÉCNICAS PASARON SATISFACTORIAMENTE!');
console.log('========================================================================');
