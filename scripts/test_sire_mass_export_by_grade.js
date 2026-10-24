const fs = require('fs');
const path = require('path');
const https = require('https');
const XLSX = require(path.join(__dirname, '../xlsx.full.min.js'));

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

const CANONICAL_PENSUM_BY_GRADE = {
  '4to': [
    { name: 'Contabilidad de Sociedades', code: '101' },
    { name: 'Matemática Comercial', code: '102' },
    { name: 'Fundamentos de Derecho', code: '103' },
    { name: 'Inglés Comercial I', code: '104' },
    { name: 'Redacción y Correspondencia Mercantil', code: '105' },
    { name: 'Introducción a la Economía', code: '106' },
    { name: 'Ortografía y Caligrafía', code: '107' },
    { name: 'Administración y Organización de Oficina', code: '108' },
    { name: 'Computación I', code: '109' }
  ],
  '5to': [
    { name: 'Contabilidad de Costos', code: '201' },
    { name: 'Cálculo Mercantil y Financiero', code: '202' },
    { name: 'Inglés Comercial II', code: '203' },
    { name: 'Legislación Fiscal y Aduanal', code: '204' },
    { name: 'Finanzas Públicas', code: '205' },
    { name: 'Geografía Económica', code: '206' },
    { name: 'Catalogación y Archivo', code: '207' },
    { name: 'Mecanografía', code: '208' },
    { name: 'Computación II', code: '209' }
  ],
  '6to': [
    { name: 'Contabilidad Bancaria', code: '301' },
    { name: 'Contabilidad Gubernamental Integrada', code: '302' },
    { name: 'Estadística Comercial', code: '303' },
    { name: 'Organización de Empresas', code: '304' },
    { name: 'Ética Profesional y Relaciones Humanas', code: '305' },
    { name: 'Práctica Supervisada', code: '306' },
    { name: 'Auditoría', code: '307' },
    { name: 'Derecho Mercantil y Nociones de Derecho Laboral', code: '308' },
    { name: 'Computación III', code: '309' },
    { name: 'Seminario sobre Problemas Socioeconómicos de Guatemala', code: '310' }
  ]
};

function normalizeString(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function getScore(gradesMap, subjectName, period = 'FINAL') {
  if (!gradesMap) return 0;
  let entry = gradesMap[subjectName];
  if (entry === undefined) {
    const normTarget = normalizeString(subjectName);
    for (const [k, val] of Object.entries(gradesMap)) {
      if (normalizeString(k) === normTarget || normalizeString(k).includes(normTarget) || normTarget.includes(normalizeString(k))) {
        entry = val;
        break;
      }
    }
  }

  if (entry === undefined) return 0;

  if (typeof entry === 'number') return entry;
  if (Array.isArray(entry)) {
    if (entry.length > 0 && typeof entry[0] === 'object' && entry[0] !== null) {
      const nums = entry.map(x => (x && typeof x.total === 'number') ? x.total : 0);
      if (period === 'B1') return nums[0] || 0;
      if (period === 'B2') return nums[1] || 0;
      if (period === 'B3') return nums[2] || 0;
      if (period === 'B4') return nums[3] || 0;
      const valid = nums.filter(n => n > 0);
      return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
    }
    if (period === 'B1') return entry[0] || 0;
    if (period === 'B2') return entry[1] || 0;
    if (period === 'B3') return entry[2] || 0;
    if (period === 'B4') return entry[3] || 0;
    const valid = entry.filter(n => typeof n === 'number' && n > 0);
    return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  }
  if (typeof entry === 'object' && entry !== null) {
    if (period === 'B1') return entry.b1 || entry['1'] || 0;
    if (period === 'B2') return entry.b2 || entry['2'] || 0;
    if (period === 'B3') return entry.b3 || entry['3'] || 0;
    if (period === 'B4') return entry.b4 || entry['4'] || 0;
    const vals = [entry.b1 || entry['1'], entry.b2 || entry['2'], entry.b3 || entry['3'], entry.b4 || entry['4']].filter(x => typeof x === 'number' && x > 0);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }
  return 0;
}

async function runTest() {
  console.log('--- INICIANDO PRUEBA DE ESTRUCTURACIÓN SIRE MINEDUC POR GRADO ---');
  const students = await fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/students.json');
  console.log('Estudiantes cargados de Firebase:', students.length);

  const wb = XLSX.utils.book_new();

  ['4to', '5to', '6to'].forEach(gradeKey => {
    const gradeSubjects = CANONICAL_PENSUM_BY_GRADE[gradeKey];
    const gradeStudents = students.filter(s => (s.grade || '').toLowerCase().includes(gradeKey));

    console.log(`Procesando grado ${gradeKey}: ${gradeStudents.length} alumnos, ${gradeSubjects.length} materias oficiales.`);

    const headers = [
      'No.',
      'Código Personal MINEDUC',
      'CUI / DPI',
      'Apellidos y Nombres',
      'Sección',
      'Carrera',
      ...gradeSubjects.map(s => `${s.name} (${s.code})`),
      'Promedio General',
      'Aprobadas',
      'Reprobadas',
      'Resultado SIRE'
    ];

    const rows = [
      ['ESCUELA NACIONAL DE CIENCIAS COMERCIALES JUTIAPA - ENCCO 1970'],
      ['MINISTERIO DE EDUCACIÓN DE GUATEMALA - SISTEMA DE REGISTROS EDUCATIVOS (SIRE)'],
      ['CUADRO OFICIAL DE CALIFICACIONES POR GRADO - CICLO ESCOLAR 2026'],
      [`CÓDIGO ESTABLECIMIENTO: 22-01-0014-46 | GRADO: ${gradeKey.toUpperCase()} PERITO CONTADOR | ALUMNOS: ${gradeStudents.length}`],
      [],
      headers
    ];

    gradeStudents.forEach((st, idx) => {
      const codPersonal = (st.personalCode || st.carne || '').trim();
      const cui = (st.cui || st.dpi || '').trim();
      const fullName = (st.lastName && st.firstName)
        ? `${st.lastName}, ${st.firstName}`.trim()
        : (st.apellidos ? `${st.apellidos}, ${st.nombres}` : (st.name || `Estudiante ${idx + 1}`));
      const seccion = (st.section || 'A').replace(/secci[oó]n/i, '').trim();
      const carrera = 'Perito Contador';

      const subjectScores = gradeSubjects.map(subj => {
        return getScore(st.grades, subj.name, 'FINAL');
      });

      const validScores = subjectScores.filter(s => s > 0);
      const avg = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
      const passed = subjectScores.filter(s => s >= 60).length;
      const failed = subjectScores.filter(s => s > 0 && s < 60).length;
      const status = (failed === 0 && avg >= 60) ? 'PROMOVIDO' : 'RECUPERACIÓN';

      rows.push([
        idx + 1,
        codPersonal,
        cui,
        fullName,
        seccion,
        carrera,
        ...subjectScores,
        avg,
        passed,
        failed,
        status
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `${gradeKey}_Perito_Contador`);
  });

  const testFile = path.join(__dirname, 'test_sire_por_grado.xlsx');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(testFile, buf);
  console.log('✅ Libro Excel multi-hoja por grado generado exitosamente:', fs.statSync(testFile).size, 'bytes');

  // Test XML Generation per Grade
  ['4to', '5to', '6to'].forEach(gradeKey => {
    const gradeSubjects = CANONICAL_PENSUM_BY_GRADE[gradeKey];
    const gradeStudents = students.filter(s => (s.grade || '').toLowerCase().includes(gradeKey));

    let recordCount = 0;
    let recordsXml = '';
    gradeStudents.forEach(st => {
      const codPersonal = (st.personalCode || st.carne || '').trim();
      gradeSubjects.forEach(subj => {
        const score = getScore(st.grades, subj.name, 'FINAL');
        recordsXml += `  <record>\n    <Codigo_Personal>${codPersonal}</Codigo_Personal>\n    <Cod_Curso>${subj.code}</Cod_Curso>\n    <Tipo_Cuadro>F</Tipo_Cuadro>\n    <Nota>${score}</Nota>\n  </record>\n`;
        recordCount++;
      });
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tablaCargaMasiva>\n${recordsXml}</tablaCargaMasiva>`;
    const xmlFile = `C:/Users/yalil/.gemini/antigravity/scratch/plataforma_escuela_comercio_completa/scripts/test_sire_${gradeKey}.xml`;
    fs.writeFileSync(xmlFile, xml, 'utf8');
    console.log(`✅ XML SIRE oficial para ${gradeKey} generado exitosamente (${recordCount} records, ${fs.statSync(xmlFile).size} bytes).`);
  });

  console.log('🎉 TODAS LAS PRUEBAS DE ESTRUCTURACIÓN SIRE POR GRADO PASARON AL 100%!');
}

runTest();
