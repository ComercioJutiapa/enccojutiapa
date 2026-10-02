const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch(e) { reject(e); }
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

const cleanStr = s => (s || '').toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');

async function main() {
    const pensum = await fetchJson('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/pensum.json');
    const p45 = pensum.filter(x => /4|5|cuarto|quinto/i.test(x.grade || x.gradeCode || ''));

    const allExcel = getAllFiles('E:\\III BIMESTRE').filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    const targetExcel = allExcel.filter(f => {
        const name = path.basename(f);
        if (/\b6\b|6to|sexto|6\s*[a-d]/i.test(name)) return false;
        return /\b4\b|4to|cuarto|\b5\b|5to|quinto/i.test(name) ||
               /\b4\b|4to|cuarto|\b5\b|5to|quinto/i.test(path.dirname(f));
    });

    const fileMeta = targetExcel.map(f => {
        const rel = path.relative('E:\\III BIMESTRE', f);
        const folder = path.basename(path.dirname(f));
        const filename = path.basename(f);
        
        // Extract grade, section, subject from filename
        let grade = '';
        let sec = '';
        const gMatch = filename.match(/\b([45])\b|([45])\s*°?\s*([A-D])|([45])to/i);
        if (gMatch) {
            grade = gMatch[1] || gMatch[2] || gMatch[4] || '';
        }
        const sMatch = filename.match(/\b([45])\s*°?\s*([A-D])\b|\b([A-D])\b/i);
        if (sMatch) {
            sec = sMatch[2] || sMatch[3] || '';
        }

        return {
            fullPath: f,
            rel,
            folder,
            filename,
            grade,
            sec: sec.toUpperCase(),
            mtime: fs.statSync(f).mtimeMs
        };
    });

    console.log(`PENSUM TOTAL CÁTEDRAS (4to y 5to): ${p45.length}`);
    console.log(`TOTAL ARCHIVOS EXCEL (4to y 5to): ${fileMeta.length}`);

    const mapping = [];

    p45.forEach(p => {
        const pGradeNum = (p.grade || p.gradeCode || '').match(/(\d+)/)?.[1] || '';
        const pSecLet = (p.section || p.gradeCode || '').replace(/sección/i, '').match(/([A-D])/i)?.[1]?.toUpperCase() || '';
        const pSubject = p.subject;
        const pTeacher = p.teacher;

        // Match candidates
        const matches = fileMeta.filter(f => {
            // Must match grade
            if (f.grade && f.grade !== pGradeNum) return false;
            // Must match section
            if (f.sec && f.sec !== pSecLet) return false;

            // Match subject keywords or teacher
            const fnClean = cleanStr(f.filename);
            const folClean = cleanStr(f.folder);
            const subjClean = cleanStr(pSubject);
            const teachClean = cleanStr(pTeacher);

            // Check if teacher folder or teacher name matches
            const teachTokens = pTeacher.toLowerCase().split(' ').filter(x => x.length > 3);
            const teacherMatch = teachTokens.some(t => folClean.includes(cleanStr(t)) || fnClean.includes(cleanStr(t)));

            // Check subject match
            // Subject keywords:
            // "Computación" -> "compu"
            // "Matemática Comercial" -> "matematica"
            // "Contabilidad de Costos" -> "costos"
            // "Contabilidad de Sociedades" -> "sociedades"
            // "Cálculo Mercantil y Financiero" -> "calculo"
            // "Inglés Comercial I / II" -> "ingles"
            // "Legislación Fiscal y Aduanera" -> "legislacion"
            // "Finanzas Públicas" -> "finanzas"
            // "Geografía Económica" -> "geografia"
            // "Catalogación y Archivo" -> "archivo"
            // "Mecanografía" -> "meca"
            // "Fundamentos de Derecho" -> "fundamentos"
            // "Administración y Organización de Empresas" -> "admon" / "organizacion" / "administracion"
            // "Redacción y Correspondencia Mercantil" -> "redaccion" / "correspon"
            // "Introducción a la Economía" -> "economia"
            // "Caligrafía y Ortografía" -> "caligrafia" / "ortografia"

            let subjMatch = false;
            if (subjClean.includes('computacion') && (fnClean.includes('compu') || fnClean.includes('computacion'))) subjMatch = true;
            else if (subjClean.includes('matematica') && fnClean.includes('matematica')) subjMatch = true;
            else if (subjClean.includes('costos') && fnClean.includes('costos')) subjMatch = true;
            else if (subjClean.includes('sociedades') && fnClean.includes('sociedades')) subjMatch = true;
            else if (subjClean.includes('calculo') && fnClean.includes('calculo')) subjMatch = true;
            else if (subjClean.includes('ingles') && (fnClean.includes('ingles') || fnClean.includes('ing'))) subjMatch = true;
            else if (subjClean.includes('legislacion') && fnClean.includes('legislacion')) subjMatch = true;
            else if (subjClean.includes('finanzas') && fnClean.includes('finanzas')) subjMatch = true;
            else if (subjClean.includes('geografia') && fnClean.includes('geografia')) subjMatch = true;
            else if (subjClean.includes('archivo') && (fnClean.includes('archivo') || fnClean.includes('catalogacion'))) subjMatch = true;
            else if (subjClean.includes('mecanografia') && (fnClean.includes('meca') || fnClean.includes('mecanografia'))) subjMatch = true;
            else if (subjClean.includes('fundamentos') && fnClean.includes('fundamentos')) subjMatch = true;
            else if (subjClean.includes('administracion') && (fnClean.includes('admon') || fnClean.includes('organizacion') || fnClean.includes('administracion'))) subjMatch = true;
            else if (subjClean.includes('redaccion') && (fnClean.includes('correspon') || fnClean.includes('redaccion'))) subjMatch = true;
            else if (subjClean.includes('economia') && fnClean.includes('economia')) subjMatch = true;
            else if (subjClean.includes('caligrafia') && (fnClean.includes('caligrafia') || fnClean.includes('ortografia'))) subjMatch = true;

            return subjMatch && (teacherMatch || !f.folder);
        });

        mapping.push({
            pensumId: p.id,
            grade: pGradeNum,
            sec: pSecLet,
            subject: pSubject,
            teacher: pTeacher,
            matchedFiles: matches.map(m => m.rel),
            count: matches.length
        });
    });

    console.log('\n=== RESULTADOS DE COINCIDENCIA PENSUM <-> ARCHIVOS ===');
    const matched = mapping.filter(m => m.count >= 1);
    const unmatched = mapping.filter(m => m.count === 0);
    const multi = mapping.filter(m => m.count > 1);

    console.log(`Coincidentes: ${matched.length} / ${p45.length}`);
    console.log(`Sin archivo: ${unmatched.length}`);
    console.log(`Con múltiples versiones/archivos: ${multi.length}`);

    if (unmatched.length > 0) {
        console.log('\n--- CÁTEDRAS SIN ARCHIVO ENCONTRADO AUTOMÁTICAMENTE ---');
        unmatched.forEach(u => {
            console.log(`[${u.pensumId}] ${u.grade}° ${u.sec} - ${u.subject} (Docente: ${u.teacher})`);
        });
    }

    if (multi.length > 0) {
        console.log('\n--- CÁTEDRAS CON MÚLTIPLES ARCHIVOS ---');
        multi.forEach(m => {
            console.log(`[${m.pensumId}] ${m.grade}° ${m.sec} - ${m.subject}:`);
            m.matchedFiles.forEach(f => console.log(`   - ${f}`));
        });
    }

    fs.writeFileSync('pensum_file_matches.json', JSON.stringify(mapping, null, 2), 'utf-8');
}

main().catch(console.error);
