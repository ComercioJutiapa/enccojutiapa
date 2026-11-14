/**
 * tests/test_exam_schedules_multicycle_and_enhancements.js
 * 
 * Verificación exhaustiva de las mejoras del módulo Auxiliaturas de Exámenes:
 * 1. Arquitectura Multiciclo 100% Dinámica y Cero Pérdida de Datos:
 *    - Independencia total de bloques por ciclo lectivo (ej. 2026_BIM1, 2027_BIM1).
 *    - Consulta histórica de ciclos pasados sin sobreescritura ni alteración de datos.
 * 2. Detección Preventiva de Colisiones Físicas de Salones (Aulas):
 *    - Detección en tiempo real de doble ocupación de salón en franjas horarias coincidentes.
 * 3. Sustitución Rápida de Cuidador (1-Click Emergency Substitute):
 *    - Reasignación masiva de vigilancia por inasistencia sin alterar materias, titulares ni nóminas.
 * 4. Matriz Acumulada de Equidad Docente del Bimestre (Antifatiga Global):
 *    - Conteo acumulado multi-jornada de minutos y salones asignados por catedrático.
 * 5. Cero Huella en Disco Local (Zero Disk Footprint):
 *    - Almacenamiento en memoria volátil de sesión y sincronización directa con Firebase.
 * 6. Respeto a Roles Dinámicos:
 *    - Bloqueo de acceso y exclusión de cuidadores si el rol institucional está inactivo.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('='.repeat(80));
console.log('🛡️ TEST: AUXILIATURAS DE EXÁMENES MULTICICLOS, COLISIONES Y EQUIDAD GLOBAL');
console.log('='.repeat(80));

// 1. Mock de Entorno
class MockStorage {
    constructor() { this._store = {}; }
    getItem(k) { return this._store.hasOwnProperty(k) ? this._store[k] : null; }
    setItem(k, v) { this._store[k] = String(v); }
    removeItem(k) { delete this._store[k]; }
    clear() { this._store = {}; }
}

const mockLocalStorage = new MockStorage();
const mockSessionStorage = new MockStorage();

global.window = global;
global.localStorage = mockLocalStorage;
global.sessionStorage = mockSessionStorage;

global.document = {
    getElementById: (id) => ({
        id,
        style: {},
        innerHTML: '',
        value: '',
        checked: false,
        remove: () => {}
    }),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
    head: { appendChild: () => {} },
    body: { insertAdjacentHTML: () => {} }
};

global.STATE = {
    activeCycle: '2026',
    cycles: [
        { year: '2026', name: '2026' },
        { year: '2027', name: '2027' },
        { year: '2028', name: '2028' }
    ],
    rolesConfig: [
        { key: 'admin', active: true },
        { key: 'director', active: true },
        { key: 'secretaria', active: true },
        { key: 'profesor_auxiliar', active: true },
        { key: 'docente', active: true }
    ],
    users: [
        { id: 'T1', name: 'Prof. Mario Alvarado', role: 'docente', active: true },
        { id: 'T2', name: 'Profa. Rosa Mendez', role: 'docente', active: true },
        { id: 'T3', name: 'Prof. Carlos Ruíz', role: 'docente', active: true },
        { id: 'T4', name: 'Profa. Elena Gómez', role: 'docente', active: true },
        { id: 'AUX1', name: 'Auxiliar Juan', role: 'profesor_auxiliar', active: true },
        { id: 'DIR1', name: 'Directora Laura', role: 'director', active: true }
    ],
    examSchedules: {}
};

global.isRoleActive = function(roleKey) {
    if (!roleKey) return true;
    const rk = String(roleKey).trim().toLowerCase();
    if (rk === 'admin' || rk === 'director') return true;
    const r = (global.STATE.rolesConfig || []).find(x => x.key === rk);
    return r ? r.active !== false : true;
};

global.getPlatformActiveCycle = function() {
    return global.STATE.activeCycle || '2026';
};

// Cargar módulo
const mod = require(path.join(__dirname, '..', 'exam_schedules_module.js'));

// ----------------------------------------------------------------------
// CASO 1: Arquitectura Multiciclo 100% Dinámica (CERO Pérdida de Datos)
// ----------------------------------------------------------------------
console.log('\n--- CASO 1: Arquitectura Multiciclo 100% Dinámica y Aislamiento por Ciclo ---');

const cycles = mod.getAvailableExamCycles();
assert(cycles.includes('2026'), 'Debe incluir 2026');
assert(cycles.includes('2027'), 'Debe incluir 2027');
assert(cycles.includes('2028'), 'Debe incluir 2028');

// Clave de bloque por ciclo
const key2026 = mod.getCurrentScheduleKey('BIM1', '2026');
const key2027 = mod.getCurrentScheduleKey('BIM1', '2027');
assert.strictEqual(key2026, '2026_BIM1', 'Clave 2026 correcta');
assert.strictEqual(key2027, '2027_BIM1', 'Clave 2027 correcta');

// Sembrar datos de prueba en 2026
const allData = mod.getExamSchedulesData();
allData['2026_BIM1'] = {
    cycle: '2026',
    bimester: 'BIM1',
    days: [{ id: 'd_2026_1', date: '2026-03-15', evaluations: [] }]
};
allData['2027_BIM1'] = {
    cycle: '2027',
    bimester: 'BIM1',
    days: [{ id: 'd_2027_1', date: '2027-03-15', evaluations: [] }]
};

mod.saveExamSchedulesData(false);

// Verificar aislamiento e integridad estricta (no se sobreescriben)
const updatedData = mod.getExamSchedulesData();
assert.strictEqual(updatedData['2026_BIM1'].days[0].id, 'd_2026_1', 'Los exámenes de 2026 permanecen intactos');
assert.strictEqual(updatedData['2027_BIM1'].days[0].id, 'd_2027_1', 'Los exámenes de 2027 son totalmente independientes');
console.log('✅ Aislamiento multiciclo verificado: 2026 y 2027 coexisten de forma 100% independiente sin pérdida de datos.');

// ----------------------------------------------------------------------
// CASO 2: Detección Preventiva de Colisiones Físicas de Salones / Aulas
// ----------------------------------------------------------------------
console.log('\n--- CASO 2: Detección Preventiva de Colisiones Físicas de Salones ---');

// Día sin colisión (salones distintos en la misma hora)
const daySinColision = {
    id: 'day_clean',
    evaluations: [
        {
            id: 'ev1',
            startTime: '07:30',
            durationMinutes: 60,
            courseName: 'Matemática',
            academicGradeName: '4to PC',
            sections: [
                {
                    section: 'A',
                    groupA: { salon: 'Salón 1 - 4A', caretakerTeacherId: 'T1' },
                    groupB: { salon: 'Salón 2 - 4B', caretakerTeacherId: 'T2' }
                }
            ]
        },
        {
            id: 'ev2',
            startTime: '07:30',
            durationMinutes: 60,
            courseName: 'Contabilidad',
            academicGradeName: '5to PC',
            sections: [
                {
                    section: 'A',
                    groupA: { salon: 'Salón 5 - 5A', caretakerTeacherId: 'T3' },
                    groupB: { salon: 'Salón 6 - 5B', caretakerTeacherId: 'T4' }
                }
            ]
        }
    ]
};

const colClean = mod.detectClassroomCollisions(daySinColision);
assert.strictEqual(colClean.length, 0, 'No debe haber colisiones en salones diferentes');
console.log('✅ Salones independientes verificados sin falsas alarmas.');

// Día CON colisión (ambos asignados al mismo "Salón 1 - 4A" de 07:30 a 08:30)
const dayConColision = {
    id: 'day_conflict',
    evaluations: [
        {
            id: 'ev1',
            startTime: '07:30',
            durationMinutes: 60,
            courseName: 'Matemática',
            academicGradeName: '4to PC',
            sections: [
                {
                    section: 'A',
                    groupA: { salon: 'Salón 1 - 4A', caretakerTeacherId: 'T1' }
                }
            ]
        },
        {
            id: 'ev2',
            startTime: '07:30',
            durationMinutes: 60,
            courseName: 'Inglés',
            academicGradeName: '5to PC',
            sections: [
                {
                    section: 'A',
                    groupA: { salon: 'Salón 1 - 4A', caretakerTeacherId: 'T3' } // Mismo salón en la misma hora
                }
            ]
        }
    ]
};

const colDetected = mod.detectClassroomCollisions(dayConColision);
assert.strictEqual(colDetected.length, 1, 'Debe detectar exactamente 1 colisión física');
assert.strictEqual(colDetected[0].salon, 'Salón 1 - 4A', 'Identifica el salón en conflicto');
console.log(`✅ Colisión de aula detectada correctamente: ${colDetected[0].salon} asignado a dos clases a la vez.`);

// ----------------------------------------------------------------------
// CASO 3: Sustitución Rápida de Cuidador (1-Click Emergency Substitute)
// ----------------------------------------------------------------------
console.log('\n--- CASO 3: Sustitución Rápida de Cuidador por Emergencia ---');

const daySubst = {
    id: 'day_subst_test',
    evaluations: [
        {
            id: 'ev_sub1',
            courseName: 'Matemática',
            academicGradeName: '4to PC',
            sections: [
                {
                    section: 'A',
                    groupA: { salon: 'Salón 1', caretakerTeacherId: 'T1', caretakerTeacherName: 'Prof. Mario Alvarado' },
                    groupB: { salon: 'Salón 2', caretakerTeacherId: 'T2', caretakerTeacherName: 'Profa. Rosa Mendez' }
                }
            ]
        },
        {
            id: 'ev_sub2',
            courseName: 'Historia',
            academicGradeName: '4to PC',
            sections: [
                {
                    section: 'A',
                    groupA: { salon: 'Salón 3', caretakerTeacherId: 'T1', caretakerTeacherName: 'Prof. Mario Alvarado' }, // T1 cuida otro salón más tarde
                    groupB: { salon: 'Salón 4', caretakerTeacherId: 'T3', caretakerTeacherName: 'Prof. Carlos Ruíz' }
                }
            ]
        }
    ]
};

// Registrar el día en STATE para el helper de búsqueda
const activeKey = mod.getCurrentScheduleKey();
allData[activeKey] = { cycle: '2026', bimester: 'BIM3', days: [daySubst] };

// Simular DOM para el modal de sustitución
global.document.getElementById = (id) => {
    if (id === 'substituteOriginalTeacherId') return { value: 'T1' }; // Ausente
    if (id === 'substituteReplacementTeacherId') return { value: 'T4' }; // Suplente: Profa. Elena Gómez
    return { remove: () => {} };
};

// Ejecutar sustitución oficial
window.confirmSubstituteProctor('day_subst_test');

// Verificar que T1 fue sustituido por T4 en todos sus salones asignados
assert.strictEqual(daySubst.evaluations[0].sections[0].groupA.caretakerTeacherId, 'T4', 'Salón 1 transferido a T4');
assert.strictEqual(daySubst.evaluations[0].sections[0].groupA.caretakerTeacherName, 'Profa. Elena Gómez');
assert.strictEqual(daySubst.evaluations[1].sections[0].groupA.caretakerTeacherId, 'T4', 'Salón 3 transferido a T4');
assert.strictEqual(daySubst.evaluations[1].sections[0].groupA.caretakerTeacherName, 'Profa. Elena Gómez');
// T2 y T3 deben quedar 100% intactos
assert.strictEqual(daySubst.evaluations[0].sections[0].groupB.caretakerTeacherId, 'T2', 'T2 intacto');
assert.strictEqual(daySubst.evaluations[1].sections[0].groupB.caretakerTeacherId, 'T3', 'T3 intacto');
console.log('✅ Sustitución de emergencia ejecutada con éxito: transferidos los salones al docente suplente sin tocar a los demás.');

// ----------------------------------------------------------------------
// CASO 4: Matriz de Equidad Docente Acumulada del Bimestre (Antifatiga Global)
// ----------------------------------------------------------------------
console.log('\n--- CASO 4: Matriz Acumulada de Equidad Bimestral ---');

const blockBim = {
    bimester: 'BIM3',
    days: [
        {
            date: '2026-10-15',
            evaluations: [
                {
                    durationMinutes: 60,
                    groupA: { caretakerTeacherId: 'T2' },
                    groupB: { caretakerTeacherId: 'T3' }
                }
            ]
        },
        {
            date: '2026-10-16',
            evaluations: [
                {
                    durationMinutes: 90,
                    groupA: { caretakerTeacherId: 'T2' }, // T2 suma 60 + 90 = 150 min
                    groupB: { caretakerTeacherId: 'T4' }
                }
            ]
        }
    ]
};

const bimWorkload = mod.calculateBimesterWorkload(blockBim);
assert.strictEqual(bimWorkload['T2'].totalMinutes, 150, 'T2 debe acumular 150 minutos en el bimestre');
assert.strictEqual(bimWorkload['T2'].daysActiveCount, 2, 'T2 cuidó en 2 jornadas distintas');
assert.strictEqual(bimWorkload['T3'].totalMinutes, 60, 'T3 debe acumular 60 minutos');
assert.strictEqual(bimWorkload['T4'].totalMinutes, 90, 'T4 debe acumular 90 minutos');
console.log('✅ Matriz global bimestral acumulada con precisión matemática.');

// ----------------------------------------------------------------------
// CASO 5: Cero Huella en Disco Local (Zero Disk Footprint)
// ----------------------------------------------------------------------
console.log('\n--- CASO 5: Cero Huella en Disco Local (sessionStorage prioritario) ---');

mod.saveExamSchedulesData(false);
assert.strictEqual(mockLocalStorage.getItem('encco_exam_schedules'), null, 'localStorage DEBE permanecer purgado (Zero Disk Footprint)');
assert(mockSessionStorage.getItem('encco_exam_schedules_cache') !== null, 'sessionStorage contiene la copia volátil segura');
console.log('✅ Cero huella en disco confirmada: localStorage libre de residuos escolares.');

// ----------------------------------------------------------------------
// CASO 6: Respeto a Roles Dinámicos
// ----------------------------------------------------------------------
console.log('\n--- CASO 6: Roles Dinámicos y Control de Acceso ---');

// Auxiliar activo tiene acceso
assert.strictEqual(mod.hasExamScheduleAccess('profesor_auxiliar'), true, 'Auxiliar activo tiene acceso');

// Si se desactiva el rol auxiliar dinámicamente
const auxRole = global.STATE.rolesConfig.find(r => r.key === 'profesor_auxiliar');
auxRole.active = false;
assert.strictEqual(mod.hasExamScheduleAccess('profesor_auxiliar'), false, 'Auxiliar inactivo debe ser bloqueado');
auxRole.active = true; // Restaurar

// Si un docente tiene rol inactivo
const docUser = global.STATE.users.find(u => u.id === 'T1');
assert.strictEqual(mod.isTeacherEligibleForProctoring(docUser), true, 'Docente activo es elegible');
const docRole = global.STATE.rolesConfig.find(r => r.key === 'docente');
docRole.active = false;
assert.strictEqual(mod.isTeacherEligibleForProctoring(docUser), false, 'Docente con rol inactivo queda excluido de cuidar');
docRole.active = true; // Restaurar
console.log('✅ Coherencia con Roles Dinámicos: estados pausados son respetados en tiempo real.');

console.log('\n' + '='.repeat(80));
console.log('🎉 TODAS LAS PRUEBAS DE MEJORAS EN AUXILIATURAS DE EXÁMENES PASARON AL 100%');
console.log('='.repeat(80));
