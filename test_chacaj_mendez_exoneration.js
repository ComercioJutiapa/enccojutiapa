// test_chacaj_mendez_exoneration.js
const https = require('https');
const assert = require('assert');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function run() {
    console.log("=== INICIANDO VALIDACIÓN DE EXONERACIÓN: CHACAJ VS MÉNDEZ ===");

    const students = await fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/students.json');
    const enccStudents = await fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json');

    [
        { name: 'Root (/students.json)', list: students },
        { name: 'Encc (/encc_school_state/students.json)', list: enccStudents }
    ].forEach(({ name, list }) => {
        console.log(`\nVerificando en: ${name}...`);

        const chacaj = list.find(s => s.personalCode === 'F373XHG' || s.carne === '2026-QA-008');
        assert(chacaj, "Emerson Adolfo Chacaj López debe existir en la lista");
        console.log(`  ✓ Estudiante encontrado: ${chacaj.name} (${chacaj.carne})`);

        const hasChacajExon = (Array.isArray(chacaj.exoneraciones) && chacaj.exoneraciones.length > 0) ||
                              (Array.isArray(chacaj.academicExceptions) && chacaj.academicExceptions.length > 0) ||
                              chacaj.isExonerated === true || chacaj.exonerado === true;

        assert.strictEqual(hasChacajExon, false, "Chacaj López, Emerson Adolfo NO debe tener ninguna exoneración activa");
        console.log("  ✓ Confirmado: Emerson Adolfo Chacaj López NO está exonerado.");

        const mendez = list.find(s => s.personalCode === 'H652EZI' || s.carne === '2026-QA-031');
        assert(mendez, "Méndez Méndez, Justin Enilson debe existir en la lista");
        console.log(`  ✓ Estudiante encontrado: ${mendez.name} (${mendez.carne})`);

        const hasMendezExon = (Array.isArray(mendez.exoneraciones) && mendez.exoneraciones.length > 0) ||
                              (Array.isArray(mendez.academicExceptions) && mendez.academicExceptions.length > 0) ||
                              mendez.isExonerated === true;

        assert.strictEqual(hasMendezExon, true, "Méndez Méndez, Justin Enilson DEBE tener exoneración activa");
        
        const exon = (mendez.exoneraciones || mendez.academicExceptions || [])[0];
        assert(exon, "El objeto de exoneración debe existir");
        assert.strictEqual(String(exon.bimestre), '4', "La exoneración debe ser para el Bimestre 4");
        assert.strictEqual(exon.studentId, 'stu-sire-H652EZI', "El studentId de la exoneración debe ser stu-sire-H652EZI");
        assert.strictEqual(exon.personalCode, 'H652EZI', "El personalCode de la exoneración debe ser H652EZI");
        console.log(`  ✓ Confirmado: Justin Enilson Méndez Méndez está exonerado en Bimestre ${exon.bimestre} (${exon.reason})`);
    });

    console.log("\n========================================================");
    console.log("✅ TODAS LAS PRUEBAS DE EXONERACIÓN PASARON CON ÉXITO (100%)");
    console.log("========================================================\n");
}

run().catch(err => {
    console.error("❌ ERROR EN PRUEBAS:", err);
    process.exit(1);
});
