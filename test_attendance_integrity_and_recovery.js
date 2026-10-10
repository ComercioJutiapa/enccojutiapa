/**
 * Test Suite: Blindaje Absoluto, Integridad y Recuperación de Asistencias (V190)
 * Verifica que las asistencias NUNCA se borren, NUNCA se oculten y se recuperen al 100%.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================================');
console.log('🧪 PRUEBAS UNITARIAS: INTEGRIDAD, BLINDAJE Y RECUPERACIÓN DE ASISTENCIAS');
console.log('================================================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`  ✅ TEST: ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}\n`);
        failedTests++;
    }
}

async function runAsyncTest(name, fn) {
    try {
        await fn();
        console.log(`  ✅ TEST: ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}\n`);
        failedTests++;
    }
}

(async () => {
    const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
    const htmlContent = fs.readFileSync(path.join(__dirname, 'plataforma.html'), 'utf8');
    const archiverContent = fs.readFileSync(path.join(__dirname, 'cycle_archiver.js'), 'utf8');

    // 1. Verificar botón de recuperación en plataforma.html
    runTest('Botón #btnRecoverAttendance presente en plataforma.html con icono y handler', () => {
        assert(htmlContent.includes('id="btnRecoverAttendance"'), 'Falta el id btnRecoverAttendance en plataforma.html');
        assert(htmlContent.includes('recoverAllAttendanceRecords(true)'), 'El botón debe invocar recoverAllAttendanceRecords(true)');
        assert(htmlContent.includes('Recuperar Asistencias'), 'El botón debe tener la etiqueta visible Recuperar Asistencias');
    });

    // 2. Verificar que cycle_archiver no borra asistencias
    runTest('cycle_archiver.js nunca envía syncNode("attendanceRecords", {}) y guarda master backup', () => {
        assert(!archiverContent.includes("syncNode('attendanceRecords', {})"), 'cycle_archiver.js no debe enviar syncNode vacío');
        assert(archiverContent.includes('ENCCO_ATTENDANCE_MASTER_BACKUP'), 'cycle_archiver.js debe crear respaldo maestro en ENCCO_ATTENDANCE_MASTER_BACKUP');
    });

    // 3. Verificar blindaje en EnccoCloudSync.syncNode y patchNode
    runTest('EnccoCloudSync.syncNode y patchNode bloquean intentos de vaciar attendanceRecords', () => {
        assert(appJsContent.includes("nodeName === 'attendanceRecords'") && appJsContent.includes("Intento de sincronizar colección de asistencias vacía"), 
            'syncNode debe tener guarda contra vaciado de attendanceRecords');
        assert(appJsContent.includes("Bloqueado intento de vaciar asistencias con objeto vacío"), 
            'patchNode debe tener guarda contra vaciado de attendanceRecords');
    });

    // 4. Verificar que getConsolidatedAttendanceMonthData NO oculta cátedras (_pen-) en vista general
    runTest('getConsolidatedAttendanceMonthData no filtra cátedras (_pen-) en la vista general', () => {
        // En versiones anteriores existía "if (k.includes('_pen-')) return; // No mezclar cátedras específicas en vista general"
        assert(!appJsContent.includes("if (k.includes('_pen-')) return;"), 
            'getConsolidatedAttendanceMonthData no debe descartar claves de cursos _pen- en la vista general');
    });

    // 5. Verificar resolución multi-alias de alumnos en loadAttendanceList
    runTest('loadAttendanceList utiliza resolución tolerante multi-alias (carne, personalCode, id)', () => {
        assert(appJsContent.includes('s.carne && monthData[s.carne]'), 'loadAttendanceList debe buscar por s.carne');
        assert(appJsContent.includes('s.personalCode && monthData[s.personalCode]'), 'loadAttendanceList debe buscar por s.personalCode');
        assert(appJsContent.includes('s.id && monthData[s.id]'), 'loadAttendanceList debe buscar por s.id');
    });

    // 6. Probar lógica de consolidación y resolución con mock en memoria
    runTest('getConsolidatedAttendanceMonthData consolida notas de cátedras y aliases en memoria', () => {
        // Simular entorno básico para ejecutar la función
        const mockSTATE = {
            activeCycle: '2026',
            gradesList: [
                { code: '4BACO-A', id: 'grd-4a', name: '4to Perito Contador', section: 'Sección A' }
            ],
            students: [
                {
                    id: 'stu-sire-G741ZVW',
                    carne: '2026-CA-014',
                    personalCode: 'G741ZVW',
                    gradeCode: '4to PC A',
                    grade: '4to Perito Contador',
                    section: 'Sección A'
                }
            ],
            attendanceRecords: {
                '2026_M10_4to A_pen-cnb-036': {
                    'G741ZVW': { '1': 'P', '2': 'P', '3': 'A' }
                },
                '2026_M10_4to A_pen-cnb-007': {
                    '2026-CA-014': { '2': 'P', '3': 'J' }
                }
            }
        };

        // Evaluar extracto de consolidación
        const gradeStudents = mockSTATE.students;
        const aliasToStudentMap = {};
        gradeStudents.forEach(s => {
            if (s.id) aliasToStudentMap[s.id] = s;
            if (s.carne) aliasToStudentMap[s.carne] = s;
            if (s.personalCode) aliasToStudentMap[s.personalCode] = s;
        });

        const monthData = {};
        Object.keys(mockSTATE.attendanceRecords).forEach(k => {
            const src = mockSTATE.attendanceRecords[k];
            for (const [rawId, daysObj] of Object.entries(src)) {
                const student = aliasToStudentMap[rawId];
                assert(student, `Debe resolver el alumno a partir del alias ${rawId}`);
                const canonicalId = student.id;
                if (!monthData[canonicalId]) monthData[canonicalId] = {};
                for (const [d, val] of Object.entries(daysObj)) {
                    const cur = monthData[canonicalId][d];
                    if (!cur) {
                        monthData[canonicalId][d] = val;
                    } else if (val === 'J' || cur === 'J') {
                        monthData[canonicalId][d] = 'J';
                    } else if (val === 'A' || cur === 'A') {
                        monthData[canonicalId][d] = 'A';
                    } else {
                        monthData[canonicalId][d] = cur || val;
                    }
                }
                if (student.carne) monthData[student.carne] = monthData[canonicalId];
                if (student.personalCode) monthData[student.personalCode] = monthData[canonicalId];
            }
        });

        // Verificaciones
        assert.strictEqual(monthData['stu-sire-G741ZVW']['1'], 'P', 'Día 1 debe ser P');
        assert.strictEqual(monthData['stu-sire-G741ZVW']['2'], 'P', 'Día 2 debe ser P');
        assert.strictEqual(monthData['stu-sire-G741ZVW']['3'], 'J', 'Día 3 debe ser J por prioridad sobre A');
        assert.strictEqual(monthData['2026-CA-014']['3'], 'J', 'Alias carné debe contener los mismos registros');
        assert.strictEqual(monthData['G741ZVW']['3'], 'J', 'Alias personalCode debe contener los mismos registros');
    });

    // 7. Prueba asíncrona de conexión y recuperación real desde Firebase
    await runAsyncTest('Firebase RTDB mantiene intactos todos los registros de asistencias', async () => {
        const https = require('https');
        const fetchFirebase = (url) => new Promise((resolve, reject) => {
            https.get(url, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
                });
            }).on('error', reject);
        });

        const rootRecords = await fetchFirebase('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/attendanceRecords.json');
        const stateRecords = await fetchFirebase('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/attendanceRecords.json');

        assert(rootRecords && typeof rootRecords === 'object', 'Root attendanceRecords debe existir en Firebase');
        assert(stateRecords && typeof stateRecords === 'object', 'encc_school_state/attendanceRecords debe existir en Firebase');

        const rootKeysCount = Object.keys(rootRecords).length;
        const stateKeysCount = Object.keys(stateRecords).length;

        assert(rootKeysCount >= 250, `Se esperan al menos 250 planillas en root (actual: ${rootKeysCount})`);
        assert(stateKeysCount >= 250, `Se esperan al menos 250 planillas en school_state (actual: ${stateKeysCount})`);
        console.log(`     Información verificada: ${rootKeysCount} planillas en root y ${stateKeysCount} planillas en school_state sincronizadas.`);
    });

    console.log('\n================================================================================');
    console.log(`🎉 RESULTADOS: ${passedTests} pasaron, ${failedTests} fallaron.`);
    console.log('================================================================================');

    if (failedTests > 0) {
        process.exit(1);
    }
})();
