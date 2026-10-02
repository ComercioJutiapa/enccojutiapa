const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
}

async function main() {
    console.log("=== 1. LISTADO DE ARCHIVOS EN E:\\III BIMESTRE ===");
    const allFiles = getAllFiles('E:\\III BIMESTRE');
    console.log(`Total archivos encontrados en E:\\III BIMESTRE: ${allFiles.length}`);
    
    const excelFiles = allFiles.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    console.log(`Total archivos Excel: ${excelFiles.length}`);

    const filtered = excelFiles.filter(f => {
        const name = path.basename(f);
        // Filtramos 4to y 5to
        return /4|5|cuarto|quinto/i.test(name) || /4|5|cuarto|quinto/i.test(path.dirname(f));
    });

    console.log(`\nArchivos de 4to y 5to grado identificados: ${filtered.length}`);
    filtered.forEach(f => {
        const folder = path.basename(path.dirname(f));
        const file = path.basename(f);
        console.log(`- [${folder}] ${file}`);
    });

    console.log("\n=== 2. DESCARGANDO PENSUM Y ESTUDIANTES DE RTDB ===");
    const [pensum, students] = await Promise.all([
        fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/pensum.json'),
        fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json')
    ]);

    const activeStudents = (students || []).filter(s => s && s.id);
    console.log(`Total estudiantes en BD: ${activeStudents.length}`);
    
    const cuartoStudents = activeStudents.filter(s => /4|cuarto/i.test(s.grade || s.gradeLabel || s.gradeCode || ''));
    const quintoStudents = activeStudents.filter(s => /5|quinto/i.test(s.grade || s.gradeLabel || s.gradeCode || ''));
    console.log(`- Estudiantes de 4to: ${cuartoStudents.length}`);
    console.log(`- Estudiantes de 5to: ${quintoStudents.length}`);

    console.log(`\nTotal cátedras en pensum: ${(pensum || []).length}`);
    const pensum4to5to = (pensum || []).filter(p => /4|5|cuarto|quinto/i.test(p.grade || p.gradeCode || ''));
    console.log(`Cátedras de 4to y 5to: ${pensum4to5to.length}`);
    pensum4to5to.forEach(p => {
        console.log(`  * ID: ${p.id} | Grado: ${p.grade || p.gradeCode} | Sec: ${p.section} | Materia: ${p.subject} | Docente: ${p.teacher}`);
    });
}

main().catch(console.error);
