const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("=== INICIANDO VALIDACIÓN DE CONGRUENCIA DE BIMESTRES EN PLANTILLAS Y LISTAS EXCEL ===");

const htmlPath = path.join(__dirname, 'plataforma.html');
const appPath = path.join(__dirname, 'app.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const appContent = fs.readFileSync(appPath, 'utf8');

console.log("1. Verificando que ningún selector de bimestre tenga 'selected' estático o forzado a Bimestre 2 en plataforma.html...");

// Verificar selectores críticos
const printModelMatch = htmlContent.match(/<select[^>]*id=["']printModelBimestreSelect["'][^>]*>([\s\S]*?)<\/select>/i);
assert(printModelMatch, "Debe existir #printModelBimestreSelect en plataforma.html");
assert(!printModelMatch[1].includes('selected'), "#printModelBimestreSelect no debe tener ningún option con 'selected' fijo");

const gradebookSelectMatch = htmlContent.match(/<select[^>]*id=["']gradebookBimestreSelect["'][^>]*>([\s\S]*?)<\/select>/i);
assert(gradebookSelectMatch, "Debe existir #gradebookBimestreSelect en plataforma.html");
assert(!gradebookSelectMatch[1].includes('selected'), "#gradebookBimestreSelect no debe tener ningún option con 'selected' fijo");

const coursePrintMatch = htmlContent.match(/<select[^>]*id=["']coursePrintBimestreSelect["'][^>]*>([\s\S]*?)<\/select>/i);
assert(coursePrintMatch, "Debe existir #coursePrintBimestreSelect en plataforma.html");
assert(!coursePrintMatch[1].includes('selected'), "#coursePrintBimestreSelect no debe tener ningún option con 'selected' fijo");

const exonFormMatch = htmlContent.match(/<select[^>]*id=["']exonFormBimestre["'][^>]*>([\s\S]*?)<\/select>/i);
assert(exonFormMatch, "Debe existir #exonFormBimestre en plataforma.html");
assert(!exonFormMatch[1].includes('selected'), "#exonFormBimestre no debe tener ningún option con 'selected' fijo");

console.log("✔ Todos los selectores de bimestre HTML inician neutros sin forzar Bimestre 2.");

console.log("2. Verificando sincronización de selectores de impresión en app.js...");

// Sincronización en applyBimestreAndLockConfig
assert(appContent.includes("pBimSel.value = String(curBim);"), "applyBimestreAndLockConfig debe sincronizar printModelBimestreSelect con el bimestre activo");
assert(appContent.includes("cpBimSel.value = String(curBim);"), "applyBimestreAndLockConfig debe sincronizar coursePrintBimestreSelect con el bimestre activo");

// Sincronización en loadLockStatus
assert(appContent.includes("pBim.value = String(activeBim);"), "loadLockStatus debe sincronizar printModelBimestreSelect");
assert(appContent.includes("cpBim.value = String(activeBim);"), "loadLockStatus debe sincronizar coursePrintBimestreSelect");

// Sincronización en updatePrintModelSelects
assert(appContent.includes("printBimSelect.value = String(activeB);"), "updatePrintModelSelects debe sincronizar printModelBimestreSelect");

console.log("✔ Sincronización en app.js para selectores de impresión y plantillas confirmada.");

console.log("3. Verificando que downloadStudentTemplate maneje y preserve el bimestre correspondiente...");

assert(appContent.includes("function downloadStudentTemplate(targetBim = null)"), "downloadStudentTemplate debe aceptar targetBim");
assert(appContent.includes("const activeBim = targetBim ||"), "downloadStudentTemplate debe priorizar el targetBim recibido");
assert(appContent.includes("plantilla_oficial_estudiantes_encc_B"), "downloadStudentTemplate debe formatear el nombre de archivo con el bimestre correspondiente");

console.log("✔ downloadStudentTemplate respeta y preserva el bimestre objetivo.");

console.log("4. Verificando que las funciones de impresión y listas oficiales respeten el bimestre seleccionado...");

// openCoursePrintModal
assert(appContent.includes("const activeGradebookBim = document.getElementById('gradebookBimestreSelect')?.value;"), "openCoursePrintModal debe consultar gradebookBimestreSelect");

// openPrintForCourse
assert(appContent.includes("bimestreNum: (document.getElementById('gradebookBimestreSelect')?.value || STATE.config?.activeBimestre || 1).toString()"), "openPrintForCourse debe respetar gradebookBimestreSelect");

// generateOfficialExcelList
assert(appContent.includes("_B${bNum}_"), "generateOfficialExcelList debe incluir el identificador de bimestre en el nombre de archivo");

console.log("✔ Todas las funciones de exportación y listas Excel preservan el bimestre correspondiente.");

console.log("\n================================================================================");
console.log("✅ TODAS LAS VALIDACIONES DE CONGRUENCIA DE BIMESTRE EN EXCEL PASARON CON ÉXITO");
console.log("================================================================================\n");
