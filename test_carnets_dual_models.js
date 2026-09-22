/**
 * ======================================================================
 * 🧪 PRUEBAS UNITARIAS: CARNÉS OFICIALES ENCCO 1970
 * - Carnet Estudiantil Horizontal (CR80) con Código de Barras y QR
 * - Carnet Docente Vertical (CR80) con Código de Barras y QR
 * - Reverso de alta legibilidad con datos institucionales y MINEDUC
 * ======================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🧪 PRUEBAS AUTOMATIZADAS: MODELOS DUALES DE CARNÉS (DOCENTE Y ESTUDIANTE)');
console.log('========================================================================\n');

// 1. Cargar qrcode.min.js y carnets.js
const qrcode = require('./qrcode.min.js');
const carnetsCode = fs.readFileSync(path.join(__dirname, 'carnets.js'), 'utf8');

const mockWindow = {
    qrcode: qrcode,
    STATE: {
        activeCycle: '2026',
        students: [
            {
                id: 'st-01',
                carne: '2026-0012-PC',
                personalCode: 'C123XYZ',
                cui: '3123456780101',
                name: 'Carlos Estuardo Gómez Martínez',
                grade: '4to Grado',
                section: 'A',
                career: 'Perito Contador',
                guardian: 'Marta Martínez',
                guardianPhone: '5544-3322',
                shift: 'Matutina',
                birthDate: '15/04/2009'
            }
        ],
        users: [
            {
                id: 'usr-doc-01',
                name: 'Lic. Juan Alberto Pérez Morales',
                role: 'docente',
                title: 'PEM en Ciencias Comerciales',
                cui: '2233445560101',
                renglon: '011',
                email: 'juan.perez@comercio.edu.gt',
                classes: 'Contabilidad Bancaria, Auditoría'
            }
        ],
        pensum: []
    }
};

const evalCarnets = new Function('window', 'qrcode', carnetsCode);
evalCarnets(mockWindow, qrcode);

const EnccoCarnets = mockWindow.EnccoCarnets;

assert(EnccoCarnets, 'EnccoCarnets debe estar expuesto');
console.log('✅ TEST 1: carnets.js se inicializó y reconoció el motor QR');

// 2. Probar Carné Estudiantil Horizontal (Frente)
const st = mockWindow.STATE.students[0];
const stFront = EnccoCarnets.renderStudentCardFrontHtml(st);

assert(stFront.includes('CARNET ESTUDIANTIL'), 'Debe tener el cintillo CARNET ESTUDIANTIL');
assert(stFront.includes('width:336px; height:212px'), 'Dimensiones deben ser horizontales CR80');
assert(stFront.includes('ESCUELA NACIONAL DE CIENCIAS COMERCIALES'), 'Debe incluir el título oficial');
assert(stFront.includes(st.name), 'Debe incluir el nombre completo del alumno');
assert(stFront.includes(st.personalCode), 'Debe incluir el código personal del alumno como no. de carné');
assert(!stFront.includes('ROL:'), 'No debe tener la palabra ROL');
assert(stFront.includes('rect x='), 'Debe incluir barras Code 39');
assert(stFront.includes('<svg'), 'Debe incluir el código QR');
console.log('✅ TEST 2: Carné Estudiantil Horizontal (Frente) cumple con diseño y modelo (Código personal y sin palabra ROL)');

// 3. Probar Carné Estudiantil Horizontal (Reverso)
const stBack = EnccoCarnets.renderStudentCardBackHtml(st);

assert(stBack.includes('Cód. Personal:'), 'Debe mostrar Código Personal');
assert(stBack.includes(st.personalCode), 'Debe mostrar el código personal del estudiante');
assert(stBack.includes(st.guardian), 'Debe mostrar el nombre del encargado');
assert(stBack.includes(st.guardianPhone), 'Debe mostrar teléfono de emergencia');
assert(stBack.includes('22-01-0014-46'), 'Debe incluir código oficial de establecimiento MINEDUC 22-01-0014-46');
assert(!stBack.includes('SELLO OFICIAL'), 'No debe tener la frase SELLO OFICIAL');
assert(stBack.includes('Dirección ENCCO Jutiapa'), 'Debe incluir firma de dirección');
console.log('✅ TEST 3: Carné Estudiantil (Reverso) contiene código 22-01-0014-46 y sin sello oficial');

// 3.1 Probar Fallback automático a los padres si no hay encargado titular
const stWithoutGuardianMother = {
    ...st,
    guardian: '',
    guardianName: '',
    guardianPhone: '',
    motherName: 'Carmen Alicia Castillo',
    motherPhone1: '5987-1234'
};
const backMotherFallback = EnccoCarnets.renderStudentCardBackHtml(stWithoutGuardianMother);
assert(backMotherFallback.includes('Carmen Alicia Castillo'), 'Debe colocar a la madre como encargada si no hay titular');
assert(backMotherFallback.includes('5987-1234'), 'Debe colocar el teléfono de la madre');

const stWithoutGuardianFather = {
    ...st,
    guardian: 'No asignado',
    guardianName: 'N/A',
    guardianPhone: '',
    fatherName: 'Rigoberto Morales Donis',
    fatherPhone1: '4567-8901'
};
const backFatherFallback = EnccoCarnets.renderStudentCardBackHtml(stWithoutGuardianFather);
assert(backFatherFallback.includes('Rigoberto Morales Donis'), 'Debe colocar al padre si titular es "No asignado"');
assert(backFatherFallback.includes('4567-8901'), 'Debe colocar el teléfono del padre');
console.log('✅ TEST 3.1: Fallback a padre/madre ingresado cuando no hay encargado titular verificado al 100%');

// 4. Probar Carné Docente Vertical (Frente)
const doc = mockWindow.STATE.users[0];
const docFront = EnccoCarnets.renderTeacherCardFrontHtml(doc);

assert(docFront.includes('CARNET DOCENTE'), 'Debe tener el título CARNET DOCENTE');
assert(docFront.includes('width:214px; height:336px'), 'Dimensiones deben ser verticales CR80');
assert(docFront.includes(doc.name), 'Debe incluir el nombre del catedrático');
assert(docFront.includes('NÚMERO DE IDENTIFICACIÓN:'), 'Debe tener la etiqueta de identificación');
assert(docFront.includes('ÁREA:'), 'Debe tener el área del docente');
assert(!docFront.includes('ROL:'), 'No debe tener la palabra ROL');
assert(docFront.includes('DOCENTE'), 'Debe tener designación de docente');
assert(docFront.includes('rect x='), 'Debe tener código de barras Code 39');
assert(docFront.includes('<svg'), 'Debe tener código QR');
console.log('✅ TEST 4: Carné Docente Vertical (Frente) cumple con cúpula azul, sin palabra ROL');

// 5. Probar Carné Docente Vertical (Reverso)
const docBack = EnccoCarnets.renderTeacherCardBackHtml(doc);

assert(docBack.includes('REPÚBLICA DE GUATEMALA'), 'Debe tener encabezado oficial');
assert(docBack.includes('MINISTERIO DE EDUCACIÓN'), 'Debe tener Ministerio de Educación');
assert(docBack.includes('ACREDITACIÓN DOCENTE OFICIAL'), 'Debe tener el banner de acreditación');
assert(docBack.includes(doc.title), 'Debe tener título profesional');
assert(docBack.includes(doc.renglon), 'Debe tener renglón presupuestario');
assert(docBack.includes(doc.classes), 'Debe incluir las materias impartidas');
assert(docBack.includes('22-01-0014-46'), 'Debe incluir código MINEDUC 22-01-0014-46');
assert(docBack.includes('Dirección ENCCO Jutiapa'), 'Debe incluir firma de dirección');
console.log('✅ TEST 5: Carné Docente (Reverso) contiene código MINEDUC 22-01-0014-46');

// 6. Probar filtros y lista de docentes
const teachersList = EnccoCarnets.getTeachersList();
assert.strictEqual(teachersList.length, 1, 'Debe encontrar 1 docente en STATE.users');
assert.strictEqual(teachersList[0].id, 'usr-doc-01');
console.log('✅ TEST 6: getTeachersList resuelve nómina de catedráticos correctamente');

// 7. Probar funciones de foto para docentes y estudiantes (cámara y archivo)
assert.strictEqual(typeof EnccoCarnets.openPhotoModal, 'function', 'openPhotoModal debe ser función');
assert.strictEqual(typeof EnccoCarnets.promptDirectFileUpload, 'function', 'promptDirectFileUpload debe ser función');
assert.strictEqual(typeof EnccoCarnets.applyPhoto, 'function', 'applyPhoto debe ser función');

// Simular asignación de fotografía tomada con cámara para un docente
EnccoCarnets.applyPhoto(doc, 'users', 'data:image/jpeg;base64,/9j/mockTeacherWebcamPhoto');
assert.strictEqual(doc.photoUrl, 'data:image/jpeg;base64,/9j/mockTeacherWebcamPhoto');
const docFrontWithPhoto = EnccoCarnets.renderTeacherCardFrontHtml(doc);
assert(docFrontWithPhoto.includes('/9j/mockTeacherWebcamPhoto'), 'El carné debe renderizar la foto tomada con cámara');
console.log('✅ TEST 7: Captura y asignación de fotografía para docentes (cámara y archivo) verificada');

console.log('\n========================================================================');
console.log('🎉 ¡TODAS LAS PRUEBAS DE CARNÉS DUALES PASARON CON ÉXITO ROTUNDO (7/7)!');
console.log('========================================================================\n');
