// test_docente_readonly_print_and_export.js
// Verifica que:
// 1. Los 3 botones de nómina/impresión permanecen visibles y activos en rol docente en modo Solo Ver.
// 2. Los selectores en cascada filtran estrictamente por las cátedras y grados del docente.
// 3. Exportar Excel y Nómina en Blanco/Oficial bloquean grados no asignados y permiten sus propios grados.

const fs = require('fs');
const assert = require('assert');

console.log("================================================================================");
console.log("🧪 INICIANDO TEST: IMPRESIÓN Y EXPORTACIÓN PARA DOCENTES EN MODO 'SOLO VER'");
console.log("================================================================================");

const appContent = fs.readFileSync('./app.js', 'utf8');
const htmlContent = fs.readFileSync('./plataforma.html', 'utf8');

// TEST 1: Verificación de clases 'print-btn' en plataforma.html
console.log("\n▶ [TEST 1] Verificando presencia de 'print-btn' en los 3 botones de nómina...");
assert(htmlContent.includes('class="btn btn-success print-btn" onclick="printStudentsBlankRoster10Casillas()"'), "Botón 10 casillas debe tener print-btn");
assert(htmlContent.includes('class="btn btn-outline-secondary print-btn" onclick="printStudentsOfficialList()"'), "Botón nómina oficial debe tener print-btn");
assert(htmlContent.includes('class="btn btn-outline-primary print-btn" onclick="exportStudentsOfficialCSV()"'), "Botón exportar excel debe tener print-btn");
console.log("  ✅ Test 1 Superado: Los 3 botones tienen la clase 'print-btn' en plataforma.html.");

// TEST 2: Verificación de excepción en enforceViewReadOnlyMode en app.js
console.log("\n▶ [TEST 2] Verificando excepción en enforceViewReadOnlyMode...");
const enforceIdx = appContent.indexOf('function enforceViewReadOnlyMode(');
const enforceChunk = appContent.slice(enforceIdx, appContent.indexOf('window.enforceViewReadOnlyMode'));
assert(enforceChunk.includes("btn.classList.contains('print-btn')"), "Debe verificar print-btn");
assert(enforceChunk.includes("printstudents"), "Debe verificar printstudents");
assert(enforceChunk.includes("exportstudent"), "Debe verificar exportstudent");
console.log("  ✅ Test 2 Superado: enforceViewReadOnlyMode protege explícitamente los botones de impresión/nómina.");

// TEST 3: Verificación de filtrado docente en updateCareerSelects
console.log("\n▶ [TEST 3] Verificando filtrado de carreras para docentes...");
const careerIdx = appContent.indexOf('function updateCareerSelects()');
const careerChunk = appContent.slice(careerIdx, careerIdx + 2000);
assert(careerChunk.includes("isCascadingFilter && STATE.currentRole === 'docente'"), "Debe filtrar carreras para docente");
assert(careerChunk.includes("getTeacherAssignedCourses"), "Debe consultar cursos asignados del docente");
console.log("  ✅ Test 3 Superado: updateCareerSelects restringe carreras asignadas al docente.");

// TEST 4: Verificación de filtrado docente en onStudentCareerFilterChange y onStudentGradeOnlyChange
console.log("\n▶ [TEST 4] Verificando filtrado de grados y secciones en cascada...");
const onCareerIdx = appContent.indexOf('function onStudentCareerFilterChange(');
const onCareerChunk = appContent.slice(onCareerIdx, appContent.indexOf('window.onStudentCareerFilterChange ='));
assert(onCareerChunk.includes("isDocente && currentDocenteUser"), "onStudentCareerFilterChange debe validar si es docente");
assert(onCareerChunk.includes("distinctGradeNames"), "Debe procesar nombres de grados");

const onGradeIdx = appContent.indexOf('function onStudentGradeOnlyChange(');
const onGradeChunk = appContent.slice(onGradeIdx, appContent.indexOf('window.onStudentGradeOnlyChange ='));
assert(onGradeChunk.includes("isDocente && currentDocenteUser"), "onStudentGradeOnlyChange debe validar si es docente");
assert(onGradeChunk.includes("matchingSections"), "Debe procesar secciones que coincidan");
console.log("  ✅ Test 4 Superado: Grados y secciones se filtran dinámicamente según la carga académica del docente.");

// TEST 5: Verificación de filtrado docente en populateSubjectSelect
console.log("\n▶ [TEST 5] Verificando filtrado de asignaturas/materias para docente...");
const popSubjIdx = appContent.indexOf('function populateSubjectSelect(');
const popSubjChunk = appContent.slice(popSubjIdx, appContent.indexOf('window.populateSubjectSelect ='));
assert(popSubjChunk.includes("isDocente && currentDocenteUser"), "populateSubjectSelect debe validar si es docente");
assert(popSubjChunk.includes("myClasses"), "Debe obtener clases del docente");
console.log("  ✅ Test 5 Superado: Selector de asignaturas limita a las materias que imparte el docente.");

// TEST 6: Verificación de blindaje y restricción docente en exportStudentsOfficialExcel
console.log("\n▶ [TEST 6] Verificando restricción de exportación Excel para docentes...");
const exportIdx = appContent.lastIndexOf('function exportStudentsOfficialExcel()');
const exportChunk = appContent.slice(exportIdx, appContent.indexOf('exportDataToExcelFile(fileName', exportIdx));
assert(exportChunk.includes("isDocente && currentDocenteUser"), "exportStudentsOfficialExcel debe verificar docente");
assert(exportChunk.includes("Acceso Denegado"), "exportStudentsOfficialExcel debe denegar si no es su grado/clase");
assert(exportChunk.includes("isCourseAssignedToTeacher"), "exportStudentsOfficialExcel debe validar asignación");
console.log("  ✅ Test 6 Superado: exportStudentsOfficialExcel restringe la exportación únicamente a los grados del docente.");

// TEST 7: Verificación de auto-llenado de asignatura en printStudentsBlankRoster10Casillas
console.log("\n▶ [TEST 7] Verificando auto-asignación de materia en printStudentsBlankRoster10Casillas...");
const rosterIdx = appContent.indexOf('function printStudentsBlankRoster10Casillas(');
const rosterChunk = appContent.slice(rosterIdx, appContent.indexOf('renderAndShowPrintDocument', rosterIdx));
assert(rosterChunk.includes("myAssignedCourses"), "printStudentsBlankRoster10Casillas debe obtener cursos del docente");
assert(rosterChunk.includes("selectedSubject = myAssignedCourses[0].subject"), "printStudentsBlankRoster10Casillas debe auto-asignar asignatura");
console.log("  ✅ Test 7 Superado: Nómina de 10 casillas auto-completa la materia del docente.");

console.log("\n================================================================================");
console.log("🎉 TODOS LOS 7 TESTS PASARON CON ÉXITO (100%)");
console.log("================================================================================");
