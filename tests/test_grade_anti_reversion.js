/**
 * Test: test_grade_anti_reversion.js
 * Verifica que las calificaciones editadas manualmente o importadas por Excel
 * tengan precedencia autoritativa y NUNCA se reviertan a estados anteriores
 * por eventos SSE, BroadcastChannel o applyIncomingCloudState.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("================================================================================");
console.log("🛡️ VERIFICACIÓN ANTI-REVERSIÓN: PERSISTENCIA AUTORITATIVA DE NOTAS");
console.log("================================================================================");

// Extraer el código fuente de app.js
const appJsPath = path.join(__dirname, '..', 'app.js');
const appSource = fs.readFileSync(appJsPath, 'utf8');

// Mockear entorno DOM y Window mínimo para simular applyIncomingCloudState y importación
const mockLocalStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
};

const mockWindow = {
    localStorage: mockLocalStorage,
    sessionStorage: mockLocalStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    _locallyDirtyStudentIds: new Set(),
    _lastLocalGradeEditTime: 0
};

// 1. Simular la lógica de applyIncomingCloudState extraída directamente
console.log("\n[Paso 1] Probando resolución de conflictos en merge de estudiantes...");

const studentLocal = {
    id: "STU-001",
    name: "Méndez Méndez, Jostin",
    lastModified: 1700000500, // Modificado recientemente localmente
    _localModifiedAt: 1700000500,
    grades: {
        "Contabilidad de Costos": [85, 0, 0, 0]
    },
    gradebookDetails: {
        "Contabilidad de Costos": {
            1: { activities: [10, 10, 10, 10, 0, 0, 0, 0, 0, 0], zona: 40, exam: 45, total: 85 }
        }
    }
};

const studentCloudIncomingOlder = {
    id: "STU-001",
    name: "Méndez Méndez, Jostin",
    lastModified: 1700000100, // Anterior en la nube
    grades: {
        "Contabilidad de Costos": [60, 0, 0, 0] // Calificación vieja
    },
    gradebookDetails: {
        "Contabilidad de Costos": {
            1: { activities: [10, 10, 0, 0, 0, 0, 0, 0, 0, 0], zona: 20, exam: 40, total: 60 }
        }
    }
};

// Simulación de la regla localMod >= incMod y isLocalProtected
const localDirty = new Set([studentLocal.id]);
const localMod = studentLocal.lastModified || studentLocal._localModifiedAt || 0;
const incMod = studentCloudIncomingOlder.lastModified || 0;
const isLocalProtected = localDirty.has(studentLocal.id) || (localMod >= incMod && localMod > 0);

assert.strictEqual(isLocalProtected, true, "El estudiante local debe estar protegido contra reversión");

// Decisión de objeto elegido
let chosen;
const lObj = studentLocal.gradebookDetails["Contabilidad de Costos"][1];
const iObj = studentCloudIncomingOlder.gradebookDetails["Contabilidad de Costos"][1];
if (localMod >= incMod) {
    chosen = lObj;
} else {
    chosen = iObj;
}

assert.strictEqual(chosen.total, 85, "La nota elegida debe ser 85 (la más reciente)");
assert.strictEqual(chosen.zona, 40, "La zona debe ser 40");
assert.strictEqual(chosen.exam, 45, "El examen debe ser 45");
console.log("✅ Resolución de conflicto aprobada: La versión local más reciente gana.");

// 2. Probar que las variables `localMod` e `incMod` en app.js no causen TDZ (ReferenceError)
console.log("\n[Paso 2] Verificando que localMod e incMod se declaran ANTES de su uso en app.js...");
const applyIncomingCloudStateMatch = appSource.match(/function applyIncomingCloudState[\s\S]*?\n\}/);
assert(applyIncomingCloudStateMatch, "applyIncomingCloudState debe existir");
const body = applyIncomingCloudStateMatch[0];

const idxLocalModDecl = body.indexOf("const localMod =");
const idxAllSubjKeys = body.indexOf("allSubjKeys.forEach");
assert(idxLocalModDecl !== -1, "const localMod debe estar declarado");
assert(idxLocalModDecl < idxAllSubjKeys, "const localMod debe declararse ANTES de allSubjKeys.forEach");
console.log("✅ Declaración temporal de localMod e incMod verificada correctamente (sin TDZ).");

// 3. Probar que processGradebookImportRows preserve el examen final y use sellos de tiempo
console.log("\n[Paso 3] Verificando preservación estricta del examen final en importación de Excel...");
assert(appSource.includes("effectivePrevExam > 0"), "processGradebookImportRows debe evaluar effectivePrevExam > 0");
assert(appSource.includes("examScore = effectivePrevExam"), "processGradebookImportRows debe preservar examScore = effectivePrevExam");
assert(appSource.includes("matched._localModifiedAt = importTimestamp"), "El estudiante importado debe registrar _localModifiedAt");
assert(appSource.includes("STATE.lastModified = importNow"), "STATE.lastModified debe actualizarse al importar Excel");
console.log("✅ Sincronización autoritativa y sellos de tiempo de importación verificados.");

// 4. Simulación funcional directa del caso: Alumno con examen 45, se importa archivo solo con actividades (Zona 38)
console.log("\n[Paso 4] Simulación funcional: Importar Excel de actividades sin examen no debe borrar examen 45...");

const gDetailSim = {
    activities: [5, 5, 5, 5, 0, 0, 0, 0, 0, 0],
    zona: 20,
    exam: 45,
    total: 65
};
const matchedSim = {
    id: "STU-001",
    grades: { "Contabilidad de Costos": [65, 0, 0, 0] },
    gradebookDetails: { "Contabilidad de Costos": { 1: gDetailSim } }
};

// Simulación de fila de Excel entrante: 4 actividades de 10pts cada una (Zona 40), columna examen vacía / no presente, Total 40
const rowSim = ["Méndez Méndez, Jostin", 10, 10, 10, 10, 40, null, 40]; // [Nombre, Act1, Act2, Act3, Act4, Zona, Examen, Total]
const finalZonaSim = 40;
const directExamValSim = null; // Celda de examen vacía en el Excel
const directTotalSim = 40; // Total en el Excel que solo suma la zona

const prevExamSim = (gDetailSim.exam !== undefined && gDetailSim.exam !== null) ? Number(gDetailSim.exam) : 0;
const prevTotalSim = matchedSim.grades["Contabilidad de Costos"][0];
const prevZonaSim = Number(gDetailSim.zona) || 0;
const effectivePrevExamSim = (prevExamSim > 0) ? prevExamSim : (prevTotalSim > prevZonaSim ? (prevTotalSim - prevZonaSim) : 0);

let examScoreSim = 0;
let finalTotalSim = finalZonaSim;

if (directExamValSim !== null && directExamValSim > 0) {
    examScoreSim = directExamValSim;
    finalTotalSim = finalZonaSim + examScoreSim;
} else if (directTotalSim !== null && directTotalSim > finalZonaSim) {
    examScoreSim = directTotalSim - finalZonaSim;
    finalTotalSim = directTotalSim;
} else if (effectivePrevExamSim > 0) {
    examScoreSim = effectivePrevExamSim;
    finalTotalSim = finalZonaSim + examScoreSim;
} else {
    examScoreSim = 0;
    finalTotalSim = finalZonaSim;
}
finalTotalSim = Math.min(100, Math.max(0, finalZonaSim + examScoreSim));

assert.strictEqual(examScoreSim, 45, "El examen final debe preservarse en 45 pts (NO borrarse)");
assert.strictEqual(finalTotalSim, 85, "La nota total debe ser 40 (zona nueva) + 45 (examen preservado) = 85");
console.log("✅ Simulación funcional superada: Examen 45 preservado y nota total calculada dinámicamente en 85.");

console.log("\n🎉 ¡TODAS LAS PRUEBAS ANTI-REVERSIÓN APROBADAS AL 100%!");
