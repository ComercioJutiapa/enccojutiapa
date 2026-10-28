const https = require('https');
const fs = require('fs');

const html = fs.readFileSync('datos-sire.html', 'utf8');
const lines = html.split('\n');

// Extraer resolveCourseSireCode (line 2364) y getStudentSubjectScore (line 2549)
const resolveLines = lines.slice(2363, 2428).join('\n');
const scoreLines = lines.slice(2548, 2680).join('\n');

const fnScope = new Function(`
    ${resolveLines}
    ${scoreLines}
    return { resolveCourseSireCode, getStudentSubjectScore };
`);
const { getStudentSubjectScore, resolveCourseSireCode } = fnScope();

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function run() {
    console.log('Testing Seminario scores from /encc_school_state/students.json...');
    const enccStudents = await fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json');
    const s6 = enccStudents.filter(s => s && s.grade && s.grade.includes('6'));
    console.log('Total 6to students:', s6.length);

    let okCount = 0;
    const samples = [];
    for (const student of s6) {
        const score = getStudentSubjectScore(student, 'Seminario sobre Problemas Socioeconómicos de Guatemala', 'FINAL', '365');
        if (score && score > 0) {
            okCount++;
            if (samples.length < 5) samples.push({ name: student.name, score });
        }
    }
    console.log(`Seminario scores present: ${okCount}/${s6.length}`);
    console.log('Sample students:', JSON.stringify(samples, null, 2));

    console.log('\nTesting Seminario scores from /students.json...');
    const rootStudents = await fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/students.json');
    const s6Root = rootStudents.filter(s => s && s.grade && s.grade.includes('6'));
    let okRootCount = 0;
    for (const student of s6Root) {
        const score = getStudentSubjectScore(student, 'Seminario sobre Problemas Socioeconómicos de Guatemala', 'FINAL', '365');
        if (score && score > 0) okRootCount++;
    }
    console.log(`Root Seminario scores present: ${okRootCount}/${s6Root.length}`);

    if (okCount === 128 && okRootCount === 128) {
        console.log('\nSUCCESS! All 128 6to Perito Contador students have their Seminario score properly retrieved in both endpoints!');
    } else {
        console.error('\nFAILURE: Missing Seminario scores!');
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Error running test:', err);
    process.exit(1);
});
