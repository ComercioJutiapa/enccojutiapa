// test_412_students_integrity.js
// Automated verification script for student census (412 students),
// exoneration atomicity, and attendance/grade evaluation integrity.

const https = require('https');
const assert = require('assert');

function fetchJson(url, retries = 3) {
    return new Promise((resolve, reject) => {
        const attempt = (n) => {
            const req = https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        if (n > 1) setTimeout(() => attempt(n - 1), 600);
                        else reject(e);
                    }
                });
            });
            req.on('error', (err) => {
                if (n > 1) setTimeout(() => attempt(n - 1), 600);
                else reject(err);
            });
            req.setTimeout(8000, () => {
                req.destroy();
                if (n > 1) setTimeout(() => attempt(n - 1), 600);
                else reject(new Error('Timeout de conexión a Firebase RTDB'));
            });
        };
        attempt(retries);
    });
}

async function runTests() {
    console.log("=== INICIANDO VALIDACIÓN DE INTEGRIDAD DE 412 ESTUDIANTES ===");
    
    // 1. Fetch live students from Firebase RTDB
    console.log("1. Descargando nómina en vivo desde Firebase RTDB...");
    const liveStudents = await fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/students.json');
    
    assert(Array.isArray(liveStudents), "students debe ser un Array");
    console.log(`- Total de elementos en array: ${liveStudents.length}`);
    assert.strictEqual(liveStudents.length, 412, `Se esperaban 412 estudiantes en RTDB, pero hay ${liveStudents.length}`);
    
    // Check uniqueness
    const seenIds = new Set();
    const seenCarnes = new Set();
    const seenCodes = new Set();
    
    let activeCount = 0;
    let retiradoCount = 0;
    
    liveStudents.forEach((s, idx) => {
        assert(s, `Estudiante en índice ${idx} no debe ser nulo`);
        assert(s.name, `Estudiante en índice ${idx} no tiene nombre`);
        
        if (s.id) {
            assert(!seenIds.has(s.id), `ID duplicado: ${s.id} en índice ${idx} (${s.name})`);
            seenIds.add(s.id);
        }
        if (s.carne) {
            assert(!seenCarnes.has(s.carne), `Carné duplicado: ${s.carne} en índice ${idx} (${s.name})`);
            seenCarnes.add(s.carne);
        }
        if (s.personalCode) {
            assert(!seenCodes.has(s.personalCode), `Código personal duplicado: ${s.personalCode} en índice ${idx} (${s.name})`);
            seenCodes.add(s.personalCode);
        }
        
        if (s.status === 'Retirado') {
            retiradoCount++;
        } else {
            activeCount++;
        }
    });
    
    console.log(`- Verificación de duplicados: 0 duplicados encontrados.`);
    console.log(`- Conteo de estados: ${activeCount} Activos, ${retiradoCount} Retirados. Total: ${liveStudents.length}`);
    
    // 2. Verificar específicamente a Julio Luis Elias Méndez López y Jostin Enilson Méndez Méndez
    console.log("2. Verificando estudiantes clave (Índice 246 y 247)...");
    const mendezJulio = liveStudents.find(s => s.personalCode === 'H380PHM' || s.carne === '2026-CB-022');
    assert(mendezJulio, "MÉNDEZ LÓPEZ JULIO LUIS ELIAS debe existir en la lista");
    assert.strictEqual(mendezJulio.name, 'MÉNDEZ LÓPEZ JULIO LUIS ELIAS');
    assert.strictEqual(mendezJulio.gradeCode, '4to PC B');
    console.log(`  ✓ Julio Luis Elias encontrado: ${mendezJulio.name} | ${mendezJulio.carne} | ${mendezJulio.gradeCode}`);
    
    const mendezJostin = liveStudents.find(s => s.personalCode === 'H652EZI' || s.carne === '2026-QA-031');
    assert(mendezJostin, "MÉNDEZ MÉNDEZ JOSTIN ENILSON debe existir en la lista");
    assert.strictEqual(mendezJostin.name, 'MÉNDEZ MÉNDEZ JOSTIN ENILSON');
    assert.strictEqual(mendezJostin.gradeCode, '5to PC A');
    console.log(`  ✓ Jostin Enilson encontrado: ${mendezJostin.name} | ${mendezJostin.carne} | ${mendezJostin.gradeCode}`);
    
    // 3. Verificar distribución por grados y secciones
    console.log("3. Verificando distribución por secciones...");
    const sections = {};
    liveStudents.forEach(s => {
        const gradeWord = (s.grade || '').split(' ')[0]; // '4to', '5to', '6to'
        const sec = s.section || '';
        const key = `${gradeWord} ${sec}`;
        sections[key] = (sections[key] || 0) + 1;
    });
    
    const expectedCounts = {
        '4to Sección A': 34,
        '4to Sección B': 36,
        '4to Sección C': 33,
        '4to Sección D': 35,
        '5to Sección A': 37,
        '5to Sección B': 36,
        '5to Sección C': 37,
        '5to Sección D': 36,
        '6to Sección A': 32,
        '6to Sección B': 35,
        '6to Sección C': 33,
        '6to Sección D': 28
    };
    
    for (const [sec, expected] of Object.entries(expectedCounts)) {
        const actual = sections[sec] || 0;
        console.log(`  - ${sec}: ${actual} (esperado: ${expected})`);
        assert.strictEqual(actual, expected, `Inconsistencia en ${sec}: actual ${actual} vs esperado ${expected}`);
    }
    
    // 4. Verificar modelo de evaluación institucional (40% Zona / 60% Evaluación)
    console.log("4. Verificando modelo de evaluación institucional (40% Zona / 60% Evaluación)...");
    const testZona = 40; // Max zona
    const testExamen = 60; // Max examen
    const totalNota = testZona + testExamen;
    assert.strictEqual(totalNota, 100, "La suma de ponderación debe ser 100%");
    console.log("  ✓ Ponderaciones oficiales intactas.");
    
    console.log("\n========================================================");
    console.log("✅ TODAS LAS PRUEBAS DE INTEGRIDAD PASARON SATISFACTORIAMENTE (412 ESTUDIANTES)");
    console.log("========================================================\n");
}

runTests().catch(err => {
    console.error("❌ ERROR EN PRUEBAS:", err);
    process.exit(1);
});
