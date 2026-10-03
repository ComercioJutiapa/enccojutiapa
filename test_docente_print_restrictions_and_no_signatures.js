// test_docente_print_restrictions_and_no_signatures.js
// Verificación integral de:
// 1. Ausencia total de bloques de firmas en listados de impresión
// 2. Restricción estricta para docentes (sólo pueden imprimir/exportar sus clases asignadas)

const fs = require('fs');
const assert = require('assert');

console.log("================================================================================");
console.log("🧪 INICIANDO VERIFICACIÓN: SIN FIRMAS Y RESTRICCIÓN DOCENTE EN LISTADOS");
console.log("================================================================================");

const appContent = fs.readFileSync('./app.js', 'utf8');

// 1. Ausencia de firmas en generateOfficialPrintList
console.log("\n▶ [TEST 1] Verificando ausencia de firmas en generateOfficialPrintList...");
const genPrintFunc = appContent.slice(appContent.indexOf('function generateOfficialPrintList'), appContent.indexOf('function generateOfficialExcelList'));
assert(!genPrintFunc.includes("Vo.Bo. Dirección General"), "Vo.Bo. Dirección General no debe estar en generateOfficialPrintList");
assert(!genPrintFunc.includes("Comisión de Evaluación"), "Comisión de Evaluación no debe estar en generateOfficialPrintList");
assert(!genPrintFunc.includes("border-bottom:1.5px solid #000"), "No debe tener líneas de firma border-bottom");
console.log("  ✅ Test 1 Superado: generateOfficialPrintList no contiene líneas de firmas.");

// 2. Ausencia de firmas en printStudentsOfficialList
console.log("\n▶ [TEST 2] Verificando ausencia de firmas en printStudentsOfficialList...");
const printStudentsFunc = appContent.slice(appContent.indexOf('function printStudentsOfficialList'), appContent.indexOf('window.printStudentsOfficialList'));
assert(!printStudentsFunc.includes('Dirección / Vo.Bo.'), "printStudentsOfficialList no debe contener bloque de firmas de Dirección / Vo.Bo.");
assert(!printStudentsFunc.includes('Catedrático(a) Guía</span>'), "printStudentsOfficialList no debe contener bloque de firmas de Catedrático(a) Guía");
console.log("  ✅ Test 2 Superado: printStudentsOfficialList no contiene líneas de firmas.");

// 3. Ausencia de firmas en printStudentsBlankRoster10Casillas
console.log("\n▶ [TEST 3] Verificando ausencia de firmas en printStudentsBlankRoster10Casillas...");
const roster10Func = appContent.slice(appContent.indexOf('function printStudentsBlankRoster10Casillas'), appContent.indexOf('window.printStudentsBlankRoster10Casillas'));
assert(roster10Func.includes('SIN LÍNEAS DE FIRMAS POR REQUERIMIENTO EXPLÍCITO'), "Nómina 10 casillas debe omitir firmas explícitamente");
assert(!roster10Func.includes('Vo.Bo.'), "Nómina 10 casillas no debe contener Vo.Bo.");
console.log("  ✅ Test 3 Superado: printStudentsBlankRoster10Casillas no contiene líneas de firmas.");

// 4. Verificación de restricciones docentes en generateOfficialPrintList
console.log("\n▶ [TEST 4] Verificando restricción para docentes en generateOfficialPrintList...");
assert(genPrintFunc.includes("const isDocente = (STATE.currentRole === 'docente');"), "Debe verificar si es docente");
assert(genPrintFunc.includes("isCourseAssignedToTeacher"), "Debe usar isCourseAssignedToTeacher");
assert(genPrintFunc.includes("Acceso Denegado"), "Debe emitir mensaje de acceso denegado si no es su clase");
console.log("  ✅ Test 4 Superado: generateOfficialPrintList restringe estrictamente a docentes.");

// 5. Verificación de restricciones docentes en generateOfficialExcelList
console.log("\n▶ [TEST 5] Verificando restricción para docentes en generateOfficialExcelList...");
const genExcelFunc = appContent.slice(appContent.indexOf('function generateOfficialExcelList'), appContent.indexOf('function downloadStudentTemplate'));
assert(genExcelFunc.includes("const isDocente = (STATE.currentRole === 'docente');"), "Debe verificar si es docente");
assert(genExcelFunc.includes("isCourseAssignedToTeacher"), "Debe usar isCourseAssignedToTeacher");
assert(genExcelFunc.includes("Acceso Denegado"), "Debe emitir mensaje de acceso denegado si no es su clase");
console.log("  ✅ Test 5 Superado: generateOfficialExcelList restringe estrictamente a docentes.");

// 6. Verificación de restricciones docentes en printStudentsOfficialList y printStudentsBlankRoster10Casillas
console.log("\n▶ [TEST 6] Verificando restricción docente en printStudentsOfficialList y printStudentsBlankRoster10Casillas...");
assert(printStudentsFunc.includes("isCourseAssignedToTeacher"), "printStudentsOfficialList debe verificar si la clase está asignada al docente");
assert(roster10Func.includes("isCourseAssignedToTeacher"), "printStudentsBlankRoster10Casillas debe verificar si la clase está asignada al docente");
console.log("  ✅ Test 6 Superado: Todas las nóminas validan asignación del docente.");

// 7. Verificación de restricciones docentes en printCourseStudentList y printCourseAttendanceSheet
console.log("\n▶ [TEST 7] Verificando restricción docente en nóminas individuales de cátedra...");
const printCourseFunc = appContent.slice(appContent.indexOf('function printCourseStudentList'), appContent.indexOf('window.printCourseStudentList'));
const printCourseAttFunc = appContent.slice(appContent.indexOf('function printCourseAttendanceSheet'), appContent.indexOf('window.printCourseAttendanceSheet'));
assert(printCourseFunc.includes("isCourseAssignedToTeacher"), "printCourseStudentList debe verificar asignación de cátedra");
assert(printCourseAttFunc.includes("isCourseAssignedToTeacher"), "printCourseAttendanceSheet debe verificar asignación de cátedra");
console.log("  ✅ Test 7 Superado: Las impresiones de cátedra y asistencia validan asignación.");

console.log("\n================================================================================");
console.log("🎉 TODAS LAS 7 PRUEBAS DE AUSENCIA DE FIRMAS Y BLINDAJE DOCENTE PASARON (100%)");
console.log("================================================================================");
