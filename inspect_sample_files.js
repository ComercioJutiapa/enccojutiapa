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
const samples = allExcel.filter(f => {
    const b = path.basename(f);
    return b.includes('Alex') || b.includes('Julissa') || b.includes('Noé') || b.includes('Elda') || b.includes('Paola');
}).slice(0, 5);

samples.forEach(f => {
    console.log('\n======================================================');
    console.log('FILE:', f);
    try {
        const buf = fs.readFileSync(f);
        const wb = XLSX.read(buf, { type: 'buffer' });
        console.log('Sheets:', wb.SheetNames);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        console.log('Total rows:', data.length);
        console.log('Header/Sample rows:');
        data.slice(0, 15).forEach((r, idx) => {
            if (r && r.length > 0) {
                console.log(`[R${idx}]`, JSON.stringify(r.slice(0, 16)));
            }
        });
    } catch(err) {
        console.error('Error reading:', f, err.message);
    }
});
