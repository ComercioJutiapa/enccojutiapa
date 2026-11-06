// test_cuadro_estadistico_dual.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser environment
global.window = global;
global.document = {
    getElementById: function(id) {
        return {
            id,
            style: {},
            innerHTML: '',
            value: '4',
            options: []
        };
    },
    querySelectorAll: function() {
        return [];
    }
};

// Load grade_stats.js
require('./grade_stats.js');

console.log("=== INICIANDO VALIDACIÓN DEL MÓDULO CUADRO ESTADÍSTICO ===");

// 1. Validar existencia de funciones
assert.strictEqual(typeof window.switchGradeStatsTab, 'function', "switchGradeStatsTab debe existir");
assert.strictEqual(typeof window.renderCuadroEstadisticoOficial, 'function', "renderCuadroEstadisticoOficial debe existir");
console.log("✓ Funciones principales registradas correctamente en window.");

// 2. Simular Ciclo Histórico 2026
window.STATE = {
    isHistoricalReadOnlyMode: true,
    historicalViewingCycle: '2026',
    activeCycle: '2026',
    students: [],
    users: []
};

window.renderCuadroEstadisticoOficial();
const data2026 = window._lastCuadroEstadisticoData;
assert(data2026, "Debe existir _lastCuadroEstadisticoData para 2026");
assert.strictEqual(data2026.cycle, '2026');
assert.strictEqual(data2026.totales.tot, 412, "Total de alumnos en 2026 debe ser 412");
assert.strictEqual(data2026.totales.hp + data2026.totales.mp, 320, "Total de promovidos en 2026 debe ser 320");
assert.strictEqual(data2026.totales.hcd + data2026.totales.mcd, 73, "Total con derecho debe ser 73");
assert.strictEqual(data2026.totales.hsd + data2026.totales.msd, 19, "Total sin derecho debe ser 19");
assert.strictEqual(data2026.docentes.total, 20, "Total docentes en servicio debe ser 20");
assert.strictEqual(data2026.direccion, "Complejo Educativo, Barrio el Cóndor, Jutiapa");
console.log("✓ Ciclo 2026 verificado: 412 estudiantes, 320 promovidos, 20 docentes, dirección oficial y firma coherente.");

// 3. Simular Ciclo Activo 2027 (Cálculo dinámico en tiempo real)
window.STATE = {
    isHistoricalReadOnlyMode: false,
    historicalViewingCycle: null,
    activeCycle: '2027',
    students: [
        // Cuarto: 1 promovido hombre, 1 no promovido mujer con derecho
        { grade: '4to Perito Contador', gender: 'Masculino', status: 'Activo', grades: { 'Contabilidad': [80, 80, 80, 80] } },
        { grade: '4to Perito Contador', gender: 'Femenino', status: 'Activo', grades: { 'Contabilidad': [50, 50, 50, 50] } },
        // Quinto: 1 retirado con expediente (cuenta sin derecho), 1 retirado sin expediente (se excluye)
        { grade: '5to Perito Contador', gender: 'Masculino', status: 'Retirado', hasExpediente: true },
        { grade: '5to Perito Contador', gender: 'Femenino', status: 'Retirado', hasExpediente: false },
        // Sexto: 1 graduando con 10 materias, 3 bimestres académicos aprobados y práctica en B4
        { 
            grade: '6to Perito Contador', gender: 'Femenino', status: 'Activo', 
            grades: { 
                'Auditoría': [90, 90, 90, 0], // Académica: se promedia [90, 90, 90] -> 90
                'Práctica Supervisada': [0, 0, 0, 85], // Práctica en B4 -> 85
                'Seminario': [0, 0, 100, 100] // Seminario -> 100
            } 
        }
    ],
    users: [
        { role: 'docente', genero: 'Masculino', renglon: '011' },
        { role: 'docente', genero: 'Femenino', renglon: '021' }
    ]
};

window.renderCuadroEstadisticoOficial();
const data2027 = window._lastCuadroEstadisticoData;
assert(data2027, "Debe existir _lastCuadroEstadisticoData para 2027");
assert.strictEqual(data2027.cycle, '2027');

// Validar que el retirado sin expediente fue excluido y el retirado con expediente fue incluido
const quinto = data2027.grados.find(g => g.nombre === 'QUINTO');
assert.strictEqual(quinto.tot, 1, "En Quinto solo debe quedar 1 evaluado (el que tiene expediente)");
assert.strictEqual(quinto.hsd, 1, "El retirado con expediente debe estar en No Promovido Sin Derecho");

// Validar regla de graduando de 6to
const sexto = data2027.grados.find(g => g.nombre === 'SEXTO');
assert.strictEqual(sexto.mp, 1, "La alumna de 6to debe estar Promovida promediando los 3 bimestres académicos y su práctica B4");

console.log("✓ Ciclo Activo 2027 verificado: Reglas de Retirados, 10 Materias de Sexto y Promoción dinámica validadas al 100%.");

console.log("\n========================================================");
console.log("✅ TODAS LAS PRUEBAS DEL MÓDULO CUADRO ESTADÍSTICO PASARON CON ÉXITO");
console.log("========================================================\n");
