/**
 * ======================================================================
 * 🏛️ ENCCO MINEDUC SIRE INTEGRATION MODULE (sire.js)
 * Escuela Nacional de Ciencias Comerciales - ENCCO Jutiapa 1970
 * ======================================================================
 * - Estructuración de alumnos con "Código Personal del Estudiante" obligatorio.
 * - Cálculo de Promedios Finales en tiempo real vinculado a Código Personal e ID.
 * - Generador oficial XML SIRE (<data-set> y <record>) conforme normativa MINEDUC.
 * - Códigos oficiales numéricos del CNB para cada asignatura.
 */

(function(window) {
    'use strict';

    // 1. CATÁLOGO OFICIAL DE CÓDIGOS NUMÉRICOS DE CURSOS MINEDUC
    const SIRE_COURSE_CODES = {
        "administracion y organizacion de empresas": "351",
        "administración y organización de empresas": "351",
        "calculo mercantil y financiero": "352",
        "cálculo mercantil y financiero": "352",
        "caligrafia y ortografia": "353",
        "caligrafía y ortografía": "353",
        "computacion i": "354",
        "computación i": "354",
        "computacion ii": "355",
        "computación ii": "355",
        "computacion iii": "356",
        "computación iii": "356",
        "contabilidad bancaria": "361",
        "contabilidad de costos": "362",
        "contabilidad de sociedades": "363",
        "contabilidad gubernamental integrada": "364",
        "derecho mercantil y legislacion laboral": "365",
        "derecho mercantil y legislación laboral": "365",
        "economia": "366",
        "economía": "366",
        "estadistica comercial": "357",
        "estadística comercial": "357",
        "etica profesional y relaciones humanas": "367",
        "ética profesional y relaciones humanas": "367",
        "finanzas publicas": "368",
        "finanzas públicas": "368",
        "fundamentos de derecho": "369",
        "geografia economica": "370",
        "geografía económica": "370",
        "ingles comercial i": "358",
        "inglés comercial i": "358",
        "ingles comercial ii": "359",
        "inglés comercial ii": "359",
        "ingles comercial iii": "360",
        "inglés comercial iii": "360",
        "introduccion a la economia": "366",
        "introducción a la economía": "366",
        "legislacion fiscal y aduanal": "371",
        "legislación fiscal y aduanal": "371",
        "matematica comercial": "372",
        "matemática comercial": "372",
        "organizacion de empresas": "351",
        "organización de empresas": "351",
        "practica supervisada": "373",
        "práctica supervisada": "373",
        "redaccion y correspondencia mercantil": "374",
        "redacción y correspondencia mercantil": "374",
        "seminario sobre problemas socioeconomicos de guatemala": "375",
        "seminario sobre problemas socioeconómicos de guatemala": "375"
    };

    function getSireCourseCode(subjName, defaultIdx = 1) {
        if (!subjName) return String(defaultIdx);
        const norm = subjName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const rawNorm = subjName.toLowerCase().trim();

        if (SIRE_COURSE_CODES[rawNorm]) return SIRE_COURSE_CODES[rawNorm];
        if (SIRE_COURSE_CODES[norm]) return SIRE_COURSE_CODES[norm];

        for (const [k, v] of Object.entries(SIRE_COURSE_CODES)) {
            const kNorm = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (norm.includes(kNorm) || kNorm.includes(norm)) return v;
        }

        // Buscar en pensum del sistema si tiene 'code' numérico asignado
        if (window.STATE && Array.isArray(window.STATE.pensum)) {
            const found = window.STATE.pensum.find(p => {
                if (!p) return false;
                const pSubj = (p.subject || p.subjectName || p.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return pSubj === norm;
            });
            if (found && found.code) {
                const digits = found.code.replace(/[^0-9]/g, '');
                if (digits) return digits;
            }
        }

        return String(defaultIdx);
    }

    // 2. VALIDACIÓN Y ESTRUCTURACIÓN DEL CÓDIGO PERSONAL DEL ESTUDIANTE
    function ensureStudentPersonalCode(student) {
        if (!student) return '';
        let code = (student.personalCode || student.codigoPersonal || '').toString().trim();
        if (!code) {
            // Extraer de carne si tiene patrón de código personal o CUI
            if (student.carne && student.carne.length >= 7) {
                code = student.carne.replace(/[^a-zA-Z0-9]/g, '');
            } else if (student.cui) {
                code = student.cui.toString().trim();
            } else {
                code = `ENCCO-${student.id || Math.floor(Math.random()*10000)}`;
            }
            student.personalCode = code;
        }
        return code;
    }

    // 3. CÁLCULO DE PROMEDIOS FINALES EN TIEMPO REAL VINCULADOS A CÓDIGO PERSONAL
    function calculateSireFinalGrades(student) {
        if (!student) return { personalCode: '', average: 0, subjects: {} };
        const personalCode = ensureStudentPersonalCode(student);
        const gradesMap = student.grades || {};
        const subjectsList = Object.keys(gradesMap);

        const calculatedSubjects = {};
        let sumAverages = 0;
        let countSubjects = 0;

        subjectsList.forEach((subj, idx) => {
            const g = gradesMap[subj];
            let validScores = [];
            let b1 = 0, b2 = 0, b3 = 0, b4 = 0;

            if (Array.isArray(g)) {
                b1 = parseInt(g[0]) || 0;
                b2 = parseInt(g[1]) || 0;
                b3 = parseInt(g[2]) || 0;
                b4 = parseInt(g[3]) || 0;
            } else if (typeof g === 'object' && g !== null) {
                b1 = parseInt(g.b1 || g['1']) || 0;
                b2 = parseInt(g.b2 || g['2']) || 0;
                b3 = parseInt(g.b3 || g['3']) || 0;
                b4 = parseInt(g.b4 || g['4']) || 0;
            }

            // Exoneraciones
            const exonB1 = (typeof window.isStudentSubjectExonerated === 'function') ? window.isStudentSubjectExonerated(student, subj, 1) : false;
            const exonB2 = (typeof window.isStudentSubjectExonerated === 'function') ? window.isStudentSubjectExonerated(student, subj, 2) : false;
            const exonB3 = (typeof window.isStudentSubjectExonerated === 'function') ? window.isStudentSubjectExonerated(student, subj, 3) : false;
            const exonB4 = (typeof window.isStudentSubjectExonerated === 'function') ? window.isStudentSubjectExonerated(student, subj, 4) : false;

            if (b1 > 0 && !exonB1) validScores.push(b1);
            if (b2 > 0 && !exonB2) validScores.push(b2);
            if (b3 > 0 && !exonB3) validScores.push(b3);
            if (b4 > 0 && !exonB4) validScores.push(b4);

            const subjectAverage = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
            const courseCode = getSireCourseCode(subj, idx + 1);

            calculatedSubjects[subj] = {
                courseCode: courseCode,
                b1: exonB1 ? 'EX' : b1,
                b2: exonB2 ? 'EX' : b2,
                b3: exonB3 ? 'EX' : b3,
                b4: exonB4 ? 'EX' : b4,
                promedioFinal: subjectAverage,
                resultado: subjectAverage >= 60 ? 'APROBADO' : (validScores.length > 0 ? 'REPROBADO' : 'PENDIENTE')
            };

            if (subjectAverage > 0) {
                sumAverages += subjectAverage;
                countSubjects++;
            }
        });

        const generalFinalAverage = countSubjects > 0 ? Math.round(sumAverages / countSubjects) : 0;

        return {
            studentId: student.id,
            personalCode: personalCode,
            studentName: student.name || `${student.lastName || ''} ${student.firstName || ''}`.trim(),
            generalFinalAverage: generalFinalAverage,
            status: generalFinalAverage >= 60 ? 'PROMOVIDO' : 'EN CURSO',
            subjects: calculatedSubjects
        };
    }

    // 4. GENERADOR OFICIAL DE XML SIRE (<data-set>)
    function escapeXml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function generateSireXmlDataSet(studentsList, period = 'FINAL') {
        let recordsXml = '';
        let recordCount = 0;
        const studentsToProcess = (studentsList && studentsList.length > 0) ? studentsList : (window.STATE && window.STATE.students ? window.STATE.students : []);

        studentsToProcess.forEach(st => {
            const codPersonal = ensureStudentPersonalCode(st);
            const sireData = calculateSireFinalGrades(st);
            const subjects = Object.keys(sireData.subjects);

            subjects.forEach((subj) => {
                const subInfo = sireData.subjects[subj];
                let score = 0;

                if (period === 'B1') score = subInfo.b1 === 'EX' ? 100 : (parseInt(subInfo.b1) || 0);
                else if (period === 'B2') score = subInfo.b2 === 'EX' ? 100 : (parseInt(subInfo.b2) || 0);
                else if (period === 'B3') score = subInfo.b3 === 'EX' ? 100 : (parseInt(subInfo.b3) || 0);
                else if (period === 'B4') score = subInfo.b4 === 'EX' ? 100 : (parseInt(subInfo.b4) || 0);
                else score = subInfo.promedioFinal;

                recordCount++;
                recordsXml += `  <record>\n` +
                              `    <codigo_personal>${escapeXml(codPersonal)}</codigo_personal>\n` +
                              `    <codigo_curso>${escapeXml(subInfo.courseCode)}</codigo_curso>\n` +
                              `    <calificacion>${escapeXml(score)}</calificacion>\n` +
                              `    <resultado>${score >= 60 ? 'APROBADO' : 'REPROBADO'}</resultado>\n` +
                              `  </record>\n`;
            });
        });

        const headerXml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
                          `<data-set xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n` +
                          `  <!-- ENCCO 1970 - Exportación Oficial SIRE MINEDUC - Generado: ${new Date().toISOString()} -->\n` +
                          `  <!-- Total de Registros de Calificaciones: ${recordCount} -->\n`;
        const footerXml = `</data-set>`;

        return headerXml + recordsXml + footerXml;
    }

    // Exportación Global
    const EnccoSire = {
        SIRE_COURSE_CODES,
        getSireCourseCode,
        ensureStudentPersonalCode,
        calculateSireFinalGrades,
        generateSireXmlDataSet
    };

    window.EnccoSire = EnccoSire;
    window.SIRE_COURSE_CODES = SIRE_COURSE_CODES;
    window.getSireCourseCode = getSireCourseCode;
    window.ensureStudentPersonalCode = ensureStudentPersonalCode;
    window.calculateSireFinalGrades = calculateSireFinalGrades;
    window.generateSireXmlDataSet = generateSireXmlDataSet;

})(typeof window !== 'undefined' ? window : global);
