const fs = require('fs');
const path = require('path');
const XLSX = require('./xlsx.full.min.js');

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

const allExcel = getAllFiles('E:\\III BIMESTRE').filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

// Filter only 4to and 5to files
const targetFiles = allExcel.filter(f => {
    const name = path.basename(f);
    // Ignore 6to files
    if (/\b6\b|6to|sexto|6\s*[a-d]/i.test(name)) return false;
    // Must match 4 or 5
    return /\b4\b|4to|cuarto|4\s*[a-d]|\b5\b|5to|quinto|5\s*[a-d]/i.test(name) ||
           /\b4\b|4to|cuarto|\b5\b|5to|quinto/i.test(path.dirname(f));
});

console.log(`Total target files for 4to & 5to: ${targetFiles.length}`);

const report = [];

targetFiles.forEach(f => {
    const folder = path.basename(path.dirname(f));
    const filename = path.basename(f);
    try {
        const buf = fs.readFileSync(f);
        const wb = XLSX.read(buf, { type: 'buffer' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Extract metadata from header
        let materia = '';
        let docente = '';
        let grado = '';
        let seccion = '';
        let bimestre = '';

        if (data[1]) {
            materia = data[1][1] || '';
            grado = data[1][6] !== undefined ? data[1][6] : '';
            seccion = data[1][8] || '';
            bimestre = data[1][10] !== undefined ? data[1][10] : '';
        }
        if (data[2]) {
            docente = data[2][1] || '';
        }

        // Count student rows
        let studentCount = 0;
        let emptyOrRetirado = 0;
        for (let r = 6; r < data.length; r++) {
            const row = data[r];
            if (!row || !row[1] || typeof row[1] !== 'string') continue;
            const name = row[1].trim();
            if (!name || name.toLowerCase().includes('promedio') || name.toLowerCase().includes('cuadro')) continue;
            studentCount++;
            const total = row[11];
            if (total === null || total === undefined || total === '' || String(row[13] || '').toLowerCase().includes('retirado')) {
                emptyOrRetirado++;
            }
        }

        report.push({
            folder,
            filename,
            sheetName,
            materia,
            docente,
            grado,
            seccion,
            bimestre,
            studentCount,
            emptyOrRetirado,
            fullPath: f
        });
    } catch(e) {
        report.push({
            folder,
            filename,
            error: e.message,
            fullPath: f
        });
    }
});

console.table(report.map(r => ({
    DocenteDir: r.folder,
    Archivo: r.filename,
    Materia: r.materia,
    Grado: r.grado,
    Sec: r.seccion,
    Bim: r.bimestre,
    Alumnos: r.studentCount
})));

fs.writeFileSync('target_files_report.json', JSON.stringify(report, null, 2), 'utf-8');
console.log('Report saved to target_files_report.json');
