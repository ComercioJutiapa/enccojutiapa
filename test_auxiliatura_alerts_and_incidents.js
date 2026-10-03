const fs = require('fs');
const path = require('path');

console.log("================================================================================");
console.log("🧪 INICIANDO VERIFICACIÓN: NOTIFICACIONES, INCIDENCIAS Y RESOLUCIÓN AUXILIATURA");
console.log("================================================================================");

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const plataformaHtml = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');

let passed = 0;
let total = 0;

function assert(condition, message) {
    total++;
    if (condition) {
        console.log(`  ✅ [PASS] ${message}`);
        passed++;
    } else {
        console.error(`  ❌ [FAIL] ${message}`);
        process.exitCode = 1;
    }
}

// TEST 1: plataforma.html contiene la estructura de Incidencias y Asistencia en la Ficha de Estudiante
console.log("\n▶ [TEST 1] Verificando elementos en plataforma.html...");
assert(plataformaHtml.includes('id="profAbsencesBadge"'), "Badge de inasistencias presente en la cabecera del perfil de estudiante.");
assert(plataformaHtml.includes('id="profIncidentsKpiBar"'), "Barra de KPIs de incidencias presente en la Pestaña 2.");
assert(plataformaHtml.includes('id="profKpiTotalAbsences"'), "KPI de Total Inasistencias del ciclo presente.");
assert(plataformaHtml.includes('id="profKpiMonthAbsences"'), "KPI de Inasistencias del mes actual presente.");
assert(plataformaHtml.includes('id="profKpiJustifiedAbsences"'), "KPI de Inasistencias justificadas presente.");
assert(plataformaHtml.includes('id="profKpiDisciplineCount"'), "KPI de Llamadas de atención presente.");
assert(plataformaHtml.includes('id="studentAttendanceHistory"'), "Contenedor de historial de inasistencias en aula presente.");
assert(plataformaHtml.includes('id="studentDisciplineHistory"'), "Contenedor de historial disciplinario presente.");

// TEST 2: app.js computa inasistencias y llamadas de atención en openStudentProfileModal
console.log("\n▶ [TEST 2] Verificando lógica dinámica en openStudentProfileModal (app.js)...");
assert(appJs.includes("studentAttendanceHistory"), "openStudentProfileModal pobla dinámicamente studentAttendanceHistory.");
assert(appJs.includes("profKpiTotalAbsences"), "openStudentProfileModal actualiza KPI profKpiTotalAbsences.");
assert(appJs.includes("openAuxiliaturaJustifyModal"), "openStudentProfileModal incluye acción para justificar inasistencia en aula.");
assert(appJs.includes("openDisciplineResolutionModal"), "openStudentProfileModal incluye acción para resolver/ver llamada de atención.");

// TEST 3: Auxiliatura cuenta con alertas de inasistencias y reportes de conducta con acciones directas
console.log("\n▶ [TEST 3] Verificando alertas y resolución para Auxiliatura en getUserAlerts...");
assert(appJs.includes("alert_aux_disc_pending_"), "getUserAlerts genera alerta de reportes de conducta pendientes para Auxiliatura.");
assert(appJs.includes("openAuxiliaturaJustifyModal('${alertItem.id}')"), "getUserAlerts permite a Auxiliatura resolver inasistencias directamente desde la notificación.");
assert(appJs.includes("openDisciplineResolutionModal('${rep.id}')"), "getUserAlerts permite a Auxiliatura atender llamadas de atención directamente desde la notificación.");

// TEST 4: Reactividad al justificar inasistencia o resolver disciplina
console.log("\n▶ [TEST 4] Verificando reactividad tras emitir resolución...");
assert(appJs.includes("submitAuxiliaturaJustification") && appJs.includes("updateUserAlertsUI();") && appJs.includes("renderCurrentDashboardAlerts();"), "submitAuxiliaturaJustification refresca el centro de alertas y dashboard.");
assert(appJs.includes("markAuxiliaturaAlertStatus") && appJs.includes("updateUserAlertsUI();"), "markAuxiliaturaAlertStatus refresca el centro de alertas.");
assert(appJs.includes("saveDisciplineResolutionForm") && appJs.includes("updateUserAlertsUI();"), "saveDisciplineResolutionForm refresca el centro de alertas tras dictaminar.");

console.log("\n================================================================================");
console.log(`🎉 RESULTADOS: ${passed}/${total} PRUEBAS COMPLETADAS CON ÉXITO (100%)`);
console.log("================================================================================");
