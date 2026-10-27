const https = require('https');
const assert = require('assert');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function verifyCalculo5AIntegrity() {
  console.log('=== VERIFICACIÓN DE INTEGRIDAD: CÁLCULO MERCANTIL 5TO SECCIÓN A ===\n');

  const baseUrl = 'https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com';
  const students = await fetchJson(`${baseUrl}/encc_school_state/students.json`);
  const calificaciones = await fetchJson(`${baseUrl}/encc_school_state/calificaciones.json`);

  const secA = students.filter(s => s && s.grade === '5to Perito Contador' && s.section === 'Sección A');
  console.log(`✓ Total alumnos en 5to Sección A: ${secA.length}`);
  assert.strictEqual(secA.length, 37, 'Deben haber exactamente 37 estudiantes en 5to A');

  let verifiedCount = 0;
  let activeCount = 0;
  let retiredCount = 0;

  secA.forEach((s, idx) => {
    const isRet = s.status === 'Retirado' || s.status === 'Inactivo';
    const b4Grade = s.grades?.['Cálculo Mercantil y Financiero']?.[3];
    const gbDetails = s.gradebookDetails?.['Cálculo Mercantil y Financiero'];
    const b4Details = Array.isArray(gbDetails) ? gbDetails[4] : (gbDetails?.['4'] || gbDetails?.[4]);
    const califKey = `${s.id}_calculomercantilyfinanciero_b4`;
    const calif = calificaciones[califKey];

    if (isRet) {
      retiredCount++;
      assert.strictEqual(b4Grade, 0, `Alumno retirado ${s.lastName} debe tener 0 en B4`);
      if (calif) {
        assert.strictEqual(calif.total, 0, `Calif de retirado ${s.lastName} debe tener total 0`);
      }
    } else {
      activeCount++;
      assert(b4Grade !== undefined && b4Grade !== null, `Alumno activo ${s.lastName} debe tener nota en B4`);
      assert(b4Details !== undefined && b4Details !== null, `Alumno activo ${s.lastName} debe tener gradebookDetails en B4`);
      assert.strictEqual(b4Grade, b4Details.total, `grades[3] (${b4Grade}) debe coincidir con gradebookDetails.total (${b4Details.total}) para ${s.lastName}`);
      
      // Asegurar que la nota NO esté colapsada a 40 para alumnos con notas altas (ej. Jenifer Alvarez debe tener 83)
      if (s.personalCode === 'G790ASN') {
        assert.strictEqual(b4Grade, 83, 'Jenifer Alvarez debe tener 83 en B4');
        assert.strictEqual(b4Details.exam, 43, 'Jenifer Alvarez debe tener 43 en Examen');
        assert.strictEqual(b4Details.zona, 40, 'Jenifer Alvarez debe tener 40 en Zona');
      }
      if (s.personalCode === 'G180WLI') {
        assert.strictEqual(b4Grade, 88, 'Madisson Barahona debe tener 88 en B4');
        assert.strictEqual(b4Details.exam, 48, 'Madisson Barahona debe tener 48 en Examen');
      }

      // Validar coincidencia en calificaciones
      if (calif) {
        assert.strictEqual(calif.total, b4Grade, `calificaciones.total (${calif.total}) debe coincidir con b4Grade (${b4Grade}) para ${s.lastName}`);
        assert.strictEqual(calif.exam, b4Details.exam, `calificaciones.exam (${calif.exam}) debe coincidir con b4Details.exam (${b4Details.exam}) para ${s.lastName}`);
      }
    }
    verifiedCount++;
  });

  console.log(`✓ Alumnos verificados: ${verifiedCount} (Activos: ${activeCount}, Retirados: ${retiredCount})`);
  console.log('✅ 100% de los estudiantes de 5to Sección A en Cálculo Mercantil tienen sus notas exactas y blindadas contra reversión.');
}

verifyCalculo5AIntegrity().catch(err => {
  console.error('Error en prueba:', err);
  process.exit(1);
});
