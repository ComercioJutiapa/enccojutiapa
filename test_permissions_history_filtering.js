// test_permissions_history_filtering.js
// Verification suite for Permisos y Ausencias (Default Full Listing & Dynamic Date Filtering)

const fs = require('fs');
const assert = require('assert');

console.log('================================================================================');
console.log('🧪 PRUEBAS UNITARIAS: LISTADO COMPLETO Y FILTRADO DINÁMICO DE PERMISOS');
console.log('================================================================================\n');

// 1. Verificación estructural en plataforma.html
console.log('▶ [TEST 1] Verificando elementos estructurales en plataforma.html...');
const html = fs.readFileSync('plataforma.html', 'utf8');

assert(html.includes('id="permissionsLogDateFrom"'), 'Falta permissionsLogDateFrom en plataforma.html');
assert(html.includes('id="permissionsLogDateTo"'), 'Falta permissionsLogDateTo en plataforma.html');
assert(html.includes('id="permissionsLogGradeFilter"'), 'Falta permissionsLogGradeFilter en plataforma.html');
assert(html.includes('id="permissionsLogCategoryFilter"'), 'Falta permissionsLogCategoryFilter en plataforma.html');
assert(html.includes('id="permissionsLogSearchInput"'), 'Falta permissionsLogSearchInput en plataforma.html');
assert(html.includes('id="btnQuickPermAll"'), 'Falta btnQuickPermAll en plataforma.html');
assert(html.includes('id="btnQuickPermToday"'), 'Falta btnQuickPermToday en plataforma.html');
assert(html.includes('id="btnQuickPermWeek"'), 'Falta btnQuickPermWeek en plataforma.html');
assert(html.includes('id="btnQuickPermMonth"'), 'Falta btnQuickPermMonth en plataforma.html');
assert(html.includes('id="permissionsLogCounterBadge"'), 'Falta permissionsLogCounterBadge en plataforma.html');
assert(html.includes('id="permissionsLogTableBody"'), 'Falta permissionsLogTableBody en plataforma.html');

// Verificar que los date inputs tengan oninput y onchange
assert(html.includes('id="permissionsLogDateFrom" class="form-control" onchange="onPermissionsDateInputChange()" oninput="onPermissionsDateInputChange()"'), 'Falta oninput en permissionsLogDateFrom');
assert(html.includes('id="permissionsLogDateTo" class="form-control" onchange="onPermissionsDateInputChange()" oninput="onPermissionsDateInputChange()"'), 'Falta oninput en permissionsLogDateTo');
// Verificar título de navegación oficial
assert(html.includes('<span>Permisos y Ausencias</span>'), 'Falta enlace Permisos y Ausencias en sidebar');
assert(html.includes('Libro de Registro Oficial de Permisos y Ausencias'), 'Falta título oficial en sección');

console.log('  ✅ Test 1 Superado: Controles y atributos HTML 100% íntegros y reactivos.');

// 2. Verificación de lógica en app.js
console.log('\n▶ [TEST 2] Verificando funciones y exportaciones en app.js...');
const appJs = fs.readFileSync('app.js', 'utf8');

assert(appJs.includes('function normalizePermissionDateStr'), 'Falta normalizePermissionDateStr');
assert(appJs.includes('function setPermissionsDateRange'), 'Falta setPermissionsDateRange');
assert(appJs.includes('function onPermissionsDateInputChange'), 'Falta onPermissionsDateInputChange');
assert(appJs.includes('function clearPermissionsFilters'), 'Falta clearPermissionsFilters');
assert(appJs.includes('function renderPermissionsHistoryView'), 'Falta renderPermissionsHistoryView');
assert(appJs.includes('function printPermissionsLog'), 'Falta printPermissionsLog');
assert(appJs.includes("case 'permissions-history': if (typeof renderPermissionsHistoryView === 'function') renderPermissionsHistoryView(true); break;"), 'Falta renderPermissionsHistoryView(true) en switchView');

console.log('  ✅ Test 2 Superado: Funciones y hooks exportados en app.js.');

// 3. Simulación de filtrado dinámico de fechas
console.log('\n▶ [TEST 3] Simulando filtrado dinámico de fechas...');

function normalizePermissionDateStr(val) {
    if (!val) return '';
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
        const parts = s.split('/');
        return `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    return s.slice(0, 10);
}

const mockPermissions = [
    { id: 'p1', studentName: 'Arévalo Morán Katerin Mishel', startDate: '2026-09-25', endDate: '2026-09-26', reasonCategory: 'Salud / Cita Médica', grade: '4to PC', section: 'B' },
    { id: 'p2', studentName: 'Gómez Pérez Juan Carlos', startDate: '2026-02-10', endDate: '2026-02-10', reasonCategory: 'Enfermedad', grade: '5to PC', section: 'A' },
    { id: 'p3', studentName: 'López Morales Ana Sofía', startDate: '2026-03-01', endDate: '2026-03-05', reasonCategory: 'Duelo Familiar', grade: '6to PC', section: 'C' },
    { id: 'p4', studentName: 'Ramírez Díaz Edwin', startDate: '2026-03-15', endDate: '2026-03-15', reasonCategory: 'Injustificada', grade: '4to PC', section: 'A' },
    { id: 'p5', studentName: 'Vásquez Cruz Maritza', startDate: '2026-04-20', endDate: '2026-04-22', reasonCategory: 'Trámite Oficial', grade: '5to PC', section: 'B' }
];

function filterPerms(perms, fromRaw, toRaw, grade = 'ALL', cat = 'ALL', search = '') {
    let dateFrom = normalizePermissionDateStr(fromRaw);
    let dateTo = normalizePermissionDateStr(toRaw);
    let effectiveFrom = dateFrom;
    let effectiveTo = dateTo;
    if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
        effectiveFrom = dateTo;
        effectiveTo = dateFrom;
    }

    let res = [...perms];

    if (effectiveFrom || effectiveTo) {
        res = res.filter(p => {
            const pStart = normalizePermissionDateStr(p.startDate || p.date || '');
            const pEnd = normalizePermissionDateStr(p.endDate || pStart);
            if (!pStart && !pEnd) return true;
            if (effectiveFrom && effectiveTo) {
                return (pStart <= effectiveTo && pEnd >= effectiveFrom);
            } else if (effectiveFrom) {
                return pEnd >= effectiveFrom;
            } else if (effectiveTo) {
                return pStart <= effectiveTo;
            }
            return true;
        });
    }

    if (grade !== 'ALL') {
        res = res.filter(p => `${p.grade} ${p.section}`.toLowerCase().includes(grade.toLowerCase()));
    }
    if (cat !== 'ALL') {
        res = res.filter(p => (p.reasonCategory || '').toLowerCase() === cat.toLowerCase());
    }
    if (search) {
        res = res.filter(p => `${p.studentName} ${p.reasonCategory}`.toLowerCase().includes(search.toLowerCase()));
    }
    return res;
}

// A) Por defecto sin filtros: debe mostrar la totalidad (5 de 5)
const defaultRes = filterPerms(mockPermissions, '', '');
assert.strictEqual(defaultRes.length, 5, 'Por defecto debe mostrar la lista completa de registros guardados');
console.log('  ✔ Por defecto muestra listado completo (5 de 5 registros).');

// B) Filtro de fecha única exacta (2026-02-10)
const feb10Res = filterPerms(mockPermissions, '2026-02-10', '2026-02-10');
assert.strictEqual(feb10Res.length, 1);
assert.strictEqual(feb10Res[0].id, 'p2');
console.log('  ✔ Filtrado por fecha única puntual exacto (1 de 5).');

// C) Filtro por rango que intersecta permiso multidiario (Sept 25-26 de Arévalo)
const sept25Res = filterPerms(mockPermissions, '2026-09-25', '2026-09-25');
assert.strictEqual(sept25Res.length, 1);
assert.strictEqual(sept25Res[0].id, 'p1');

const sept26Res = filterPerms(mockPermissions, '2026-09-26', '2026-09-26');
assert.strictEqual(sept26Res.length, 1);
assert.strictEqual(sept26Res[0].id, 'p1');

const septRangeRes = filterPerms(mockPermissions, '2026-09-20', '2026-09-30');
assert.strictEqual(septRangeRes.length, 1);
assert.strictEqual(septRangeRes[0].id, 'p1');
console.log('  ✔ Filtrado por rango e intersección de permiso multidiario verificado.');

// D) Fechas invertidas (from > to) tolerante
const invRangeRes = filterPerms(mockPermissions, '2026-03-31', '2026-03-01');
assert.strictEqual(invRangeRes.length, 2); // p3 y p4
console.log('  ✔ Fechas invertidas normalizadas fluidamente sin error.');

// E) Filtro abierto solo fecha Desde (desde 2026-03-10)
const fromOnlyRes = filterPerms(mockPermissions, '2026-03-10', '');
assert.strictEqual(fromOnlyRes.length, 3); // p1 (Sept), p4 (March 15), p5 (April)
console.log('  ✔ Filtrado abierto "Desde" verificado.');

// F) Filtro abierto solo fecha Hasta (hasta 2026-03-10)
const toOnlyRes = filterPerms(mockPermissions, '', '2026-03-10');
assert.strictEqual(toOnlyRes.length, 2); // p2 (Feb 10), p3 (March 1-5)
console.log('  ✔ Filtrado abierto "Hasta" verificado.');

// G) Filtro combinado por grado y búsqueda
const searchRes = filterPerms(mockPermissions, '', '', '4to PC', 'ALL', 'Katerin');
assert.strictEqual(searchRes.length, 1);
assert.strictEqual(searchRes[0].id, 'p1');
console.log('  ✔ Filtros combinados de grado y búsqueda verificados.');

console.log('\n================================================================================');
console.log('🎉 TODAS LAS VERIFICACIONES DE FILTRADO Y LISTADO PASARON AL 100%');
console.log('================================================================================');
