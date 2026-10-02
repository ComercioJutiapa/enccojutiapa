// generate_carnets_preview.js
const fs = require('fs');
const path = require('path');
const qrcode = require('./qrcode.min.js');
const carnetsCode = fs.readFileSync(path.join(__dirname, 'carnets.js'), 'utf8');

const mockWindow = {
    qrcode: qrcode,
    STATE: {
        activeCycle: '2026',
        students: [
            {
                id: 'st-01',
                carne: '2026-0001-PC',
                personalCode: 'C123XYZ',
                cui: '3123456780101',
                name: 'Carlos Estuardo Gómez Martínez',
                grade: '4to Perito Contador',
                section: 'A',
                career: 'Perito Contador',
                guardian: 'Marta Martínez',
                guardianPhone: '5544-3322',
                shift: 'Matutina',
                birthDate: '15/04/2009'
            }
        ],
        users: [
            {
                id: 'usr-doc-01',
                name: 'Licda. María Elena Rodríguez Soto',
                role: 'docente',
                title: 'PEM en Ciencias Comerciales',
                cui: '2233445560101',
                renglon: '011',
                email: 'maria.rodriguez@comercio.edu.gt',
                classes: 'Contabilidad de Costos, Auditoría'
            }
        ],
        pensum: []
    }
};

const evalCarnets = new Function('window', 'qrcode', carnetsCode);
evalCarnets(mockWindow, qrcode);
const EnccoCarnets = mockWindow.EnccoCarnets;

const st = mockWindow.STATE.students[0];
const doc = mockWindow.STATE.users[0];

const stFront = EnccoCarnets.renderStudentCardFrontHtml(st);
const stBack = EnccoCarnets.renderStudentCardBackHtml(st);
const docFront = EnccoCarnets.renderTeacherCardFrontHtml(doc);
const docBack = EnccoCarnets.renderTeacherCardBackHtml(doc);

const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Preview Modelos Oficiales de Carnés ENCCO 1970</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <style>
        body {
            background: #f1f5f9;
            font-family: 'Plus Jakarta Sans', sans-serif;
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 30px;
        }
        .section-title {
            font-size: 1.2rem;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 2px solid #004098;
            padding-bottom: 6px;
            width: 100%;
            max-width: 800px;
            text-align: center;
        }
        .cards-row {
            display: flex;
            gap: 25px;
            flex-wrap: wrap;
            justify-content: center;
            align-items: flex-start;
        }
        .card-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }
        .card-label {
            font-size: 0.78rem;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <h1 style="font-family:'Outfit', sans-serif; color:#004098; margin:0;">Modelos Oficiales de Carnés ENCCO 1970</h1>
    <p style="color:#64748b; margin-top:-10px;">Recreación Fiel según el Diseño Institucional Aprobado</p>

    <div class="section-title">1. Carné Estudiantil (Horizontal - CR80)</div>
    <div class="cards-row">
        <div class="card-wrapper">
            <span class="card-label">Anverso (Frente)</span>
            ${stFront}
        </div>
        <div class="card-wrapper">
            <span class="card-label">Reverso (Datos & Acreditación)</span>
            ${stBack}
        </div>
    </div>

    <div class="section-title" style="margin-top:20px;">2. Carné Docente (Vertical - CR80)</div>
    <div class="cards-row">
        <div class="card-wrapper">
            <span class="card-label">Anverso (Frente)</span>
            ${docFront}
        </div>
        <div class="card-wrapper">
            <span class="card-label">Reverso (Datos & Acreditación)</span>
            ${docBack}
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync('preview_carnets.html', html, 'utf8');
console.log('preview_carnets.html generado exitosamente.');
