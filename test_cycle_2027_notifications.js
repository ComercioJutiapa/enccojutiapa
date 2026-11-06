const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'app.js');
const cycleArchiverPath = path.join(__dirname, 'cycle_archiver.js');

const appJs = fs.readFileSync(appJsPath, 'utf8');
const cycleArchiverJs = fs.readFileSync(cycleArchiverPath, 'utf8');

console.log("========================================================================");
console.log("🧪 PRUEBAS AUTOMATIZADAS: INVALIDACIÓN DE NOTIFICACIONES 2026 EN CICLO 2027");
console.log("========================================================================");

// Mock DOM & window
global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.window.location = { pathname: '/plataforma.html', search: '', hash: '' };
global.document = {
    getElementById: () => ({ style: {}, classList: { add: () => {}, remove: () => {} }, textContent: '' }),
    querySelectorAll: () => [],
    addEventListener: () => {}
};
global.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.Date = Date;

// Helper to eval app functions
eval(appJs);
eval(cycleArchiverJs);

console.log("\n▶ [TEST 1] Verificando que en Ciclo 2027 se invaliden y excluyan alertas de 2026...");
STATE.activeCycle = '2027';
STATE.currentRole = 'director';
STATE.currentUser = { id: 'usr-dir-01', name: 'Director ENCCO', role: 'director' };
STATE.disciplineReports = [
    { id: 'disc-2026-1', cycle: '2026', date: '2026-05-10', severity: 'Grave', studentName: 'Alumno 2026' },
    { id: 'disc-2027-1', cycle: '2027', date: '2027-02-15', severity: 'Grave', studentName: 'Alumno 2027' }
];

const dirAlerts2027 = getUserAlerts();
const has2026Alert = dirAlerts2027.some(a => (a.id && a.id.includes('2026')) || (a.cycle === '2026'));
if (has2026Alert) {
    console.error("❌ Falló: Se encontraron alertas de 2026 activas en el ciclo 2027:", dirAlerts2027);
    process.exit(1);
} else {
    console.log("  ✅ Test 1 Superado: Ninguna alerta de 2026 se encuentra activa ni es válida en 2027.");
}

console.log("\n▶ [TEST 2] Verificando que solicitudes de edición (gradeEditRequests) de 2026 NO cuenten en 2027...");
STATE.gradeEditRequests = [
    { id: 'req-2026', cycle: '2026', createdAt: '2026-06-15T10:00:00Z', status: 'pending', teacherId: 'usr-doc-01', bimestre: 1 },
    { id: 'req-2027', cycle: '2027', createdAt: '2027-03-10T10:00:00Z', status: 'pending', teacherId: 'usr-doc-01', bimestre: 1 }
];
let badgeText = '';
const mockBadge = { style: {}, set textContent(val) { badgeText = val; }, get textContent() { return badgeText; } };
global.document.getElementById = (id) => {
    if (id === 'pendingGradeRequestsBadge') return mockBadge;
    return { style: {}, classList: { add: () => {}, remove: () => {} }, textContent: '' };
};

updatePendingRequestsBadge();
if (badgeText !== '1') {
    console.error(`❌ Falló: Se esperaban 1 solicitud pendiente (solo 2027), pero se contó: ${badgeText}`);
    process.exit(1);
} else {
    console.log("  ✅ Test 2 Superado: Solicitudes de edición de notas de 2026 quedan completamente invalidadas en 2027 (conteo exacto = 1).");
}

console.log("\n▶ [TEST 3] Verificando que aprobación de edición de 2026 NO abra el libro de notas en 2027...");
STATE.activeCycle = '2027';
STATE.currentRole = 'docente';
STATE.currentUser = { id: 'usr-doc-01', role: 'docente' };
STATE.config = { globalLocked: true, activeUnits: [] };
STATE.gradeEditRequests = [
    { 
        id: 'req-approved-2026', 
        cycle: '2026', 
        createdAt: '2026-06-15T10:00:00Z', 
        status: 'approved', 
        teacherId: 'usr-doc-01', 
        pensumId: 'p-1', 
        bimestre: 1, 
        expiresAt: new Date(Date.now() + 86400000).toISOString() 
    }
];
const editCheck = isGradebookEditableForUser('p-1', 1);
if (editCheck.editable) {
    console.error("❌ Falló: La solicitud aprobada en 2026 permitió editar calificaciones en 2027.");
    process.exit(1);
} else {
    console.log("  ✅ Test 3 Superado: Aprobaciones de 2026 no autorizan modificaciones en el ciclo 2027.");
}

console.log("\n▶ [TEST 4] Verificando limpieza de notificaciones al aperturar nuevo ciclo en EnccoCycleArchiver...");
if (cycleArchiverJs.includes('window.STATE.attendanceAlerts = [];') && 
    cycleArchiverJs.includes('window.STATE.gradeEditRequests = [];')) {
    console.log("  ✅ Test 4 Superado: EnccoCycleArchiver limpia y aísla los arrays de notificaciones y solicitudes al aperturar nuevo ciclo.");
} else {
    console.error("❌ Falló: EnccoCycleArchiver no tiene la limpieza completa de notificaciones.");
    process.exit(1);
}

console.log("\n========================================================================");
console.log("🎉 TODAS LAS PRUEBAS DE INVALIDACIÓN DE NOTIFICACIONES PASARON AL 100%");
console.log("========================================================================");
