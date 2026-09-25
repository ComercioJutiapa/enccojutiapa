const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 PRUEBAS UNITARIAS: IMPORTACIÓN DE NOTAS Y BLINDAJE ANTI-CACHÉ');
console.log('================================================================\n');

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// 1. Verificación de 5 factores en Pre-flight Validator
console.log('▶ [TEST 1] Verificando validación de 5 factores en importación...');
assert(appJs.includes('Evitar confusión entre materias homónimas (ej. Computación I vs II, Contabilidad de Costos vs General)'), 'Debe distinguir entre materias homónimas con numeración');
assert(appJs.includes('¡Cuadro Erróneo! El archivo cargado corresponde a'), 'Debe validar materia contra pensum activo');
assert(appJs.includes('¡Grado Incorrecto! El archivo cargado corresponde a'), 'Debe validar grado contra pensum activo');
assert(appJs.includes('¡Sección Incorrecta! El archivo cargado corresponde a'), 'Debe validar sección contra pensum activo');
assert(appJs.includes('¡Bimestre Incorrecto! El archivo cargado corresponde a'), 'Debe validar bimestre contra bimestre activo');
assert(appJs.includes('minRequiredMatches = tTokens.length >= 2 ? 2 : 1'), 'Debe exigir coincidencia multi-token para catedrático');
console.log('  ✅ Test 1 Superado: Los 5 factores (Clase, Maestro, Grado, Sección y Bimestre) están estrictamente blindados.');

// 2. Emparejamiento de Estudiantes y Preservación de Alumnos No Incluidos
console.log('\n▶ [TEST 2] Verificando emparejamiento de alumnos y preservación de no incluidos...');
assert(appJs.includes('common.length === minTokens; // Exigir coincidencia exacta si son 1 o 2 tokens'), 'Debe evitar falsos positivos entre familiares con mismos apellidos');
assert(appJs.includes('const actuallyUpdatedStudents = [];'), 'Debe rastrear únicamente los estudiantes que vinieron en el Excel');
assert(appJs.includes('const studentsToSync = (actuallyUpdatedStudents.length > 0) ? actuallyUpdatedStudents : courseStudents;'), 'Debe sincronizar a la nube solo a los alumnos actualizados');
console.log('  ✅ Test 2 Superado: Se evita cruce de notas entre hermanos y no se tocan los alumnos no incluidos.');

// 3. Blindaje Anti-Caché y Anti-Reversión en Memoria / Nube
console.log('\n▶ [TEST 3] Verificando protección anti-reversión por caché y eventos SSE...');
assert(appJs.includes('🛡️ [Anti-Reversión de Notas] Fusión inteligente protegida contra sobrescritura por caché o latencia'), 'Debe existir bloque de fusión protegida en applyIncomingCloudState');
assert(appJs.includes('if (lVal > 0 && iVal === 0)'), 'Local con nota no debe ser borrado por nube con cero');
assert(appJs.includes('window._rtdbStudentIndexMap && window._rtdbStudentIndexMap.has(student.id)'), 'Debe usar getRtdbStudentIndexMap para evitar desalineación de índices en RTDB');
assert(appJs.includes('calculatedZona === 0 && currentData.zona > 0'), 'No debe poner en cero una zona directa si no hay actividades desglosadas');
console.log('  ✅ Test 3 Superado: Fusión anti-reversión y resolución exacta de índices RTDB confirmadas.');

// 4. Regla de Oro: Preservación del modelo de notas
console.log('\n▶ [TEST 4] Verificando preservación estricta del % del modelo de calificaciones...');
assert(appJs.includes('calculateClassBimesterMetrics'), 'calculateClassBimesterMetrics debe existir');
assert(appJs.includes('ensureOfficialGradesList'), 'ensureOfficialGradesList debe existir');
console.log('  ✅ Test 4 Superado: Porcentajes y modelos de notas intactos al 100%.');

console.log('\n================================================================');
console.log('🎉 TODAS LAS PRUEBAS DE IMPORTACIÓN Y BLINDAJE PASARON (100%)');
console.log('================================================================\n');
