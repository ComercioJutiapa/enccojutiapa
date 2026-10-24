/**
 * ======================================================================
 * 🏛️ ENCCO MINEDUC SIRE INTEGRATION MODULE (sire.js)
 * Escuela Nacional de Ciencias Comerciales - ENCCO Jutiapa 1970
 * ----------------------------------------------------------------------
 * Copyright (c) 2026 Nehemias Salguero. Jutiapa, Guatemala.
 * Todos los derechos reservados. All Rights Reserved.
 *
 * Desarrollado por: Nehemias Salguero
 * Ubicación: Jutiapa, Guatemala
 * ======================================================================
 * - Estructuración de alumnos con "Código Personal del Estudiante" obligatorio.
 * - Cálculo de Promedios Finales en tiempo real vinculado a Código Personal e ID.
 * - Generador oficial XML SIRE (<data-set> y <record>) conforme normativa MINEDUC.
 * - Códigos oficiales numéricos del CNB para cada asignatura.
 */

(function(window) {
    'use strict';

    // 1. CATÁLOGO OFICIAL DE CÓDIGOS NUMÉRICOS DE CURSOS MINEDUC (ENCCO 22-01-0014-46)
    const SIRE_COURSE_CODES = {
        // 4to Perito Contador (338-346)
        "contabilidad de sociedades": "338",
        "contabilidad general": "338",
        "matematica comercial": "339",
        "matemática comercial": "339",
        "fundamentos de derecho": "340",
        "ingles comercial i": "341",
        "inglés comercial i": "341",
        "redaccion y correspondencia mercantil": "342",
        "redacción y correspondencia mercantil": "342",
        "redacción y correspondencia": "342",
        "redaccion y correspondencia": "342",
        "introduccion a la economia": "343",
        "introducción a la economía": "343",
        "economia": "343",
        "economía": "343",
        "ortografia y caligrafia": "344",
        "ortografía y caligrafía": "344",
        "caligrafia y ortografia": "344",
        "caligrafía y ortografía": "344",
        "administracion y organizacion de oficina": "345",
        "administración y organización de oficina": "345",
        "administracion y organizacion de empresas": "345",
        "administración y organización de empresas": "345",
        "computacion i": "346",
        "computación i": "346",

        // 5to Perito Contador (347-368)
        "contabilidad de costos": "347",
        "calculo mercantil y financiero": "348",
        "cálculo mercantil y financiero": "348",
        "ingles comercial ii": "349",
        "inglés comercial ii": "349",
        "geografia economica": "352",
        "geografía económica": "352",
        "mecanografia": "354",
        "mecanografía": "354",
        "computacion ii": "355",
        "computación ii": "355",
        "legislacion fiscal y aduanal": "366",
        "legislación fiscal y aduanal": "366",
        "legislacion fiscal y aduanera": "366",
        "legislación fiscal y aduanera": "366",
        "legislacion fiscal": "366",
        "legislación fiscal": "366",
        "finanzas publicas": "367",
        "finanzas públicas": "367",
        "catalogacion y archivo": "368",
        "catalogación y archivo": "368",

        // 6to Perito Contador (356-365, 550)
        "contabilidad bancaria": "356",
        "estadistica comercial": "357",
        "estadística comercial": "357",
        "organizacion de empresas": "359",
        "organización de empresas": "359",
        "organizacion de empresas y tecnicas de oficina": "359",
        "organización de empresas y técnicas de oficina": "359",
        "practica supervisada": "361",
        "práctica supervisada": "361",
        "auditoria": "362",
        "auditoría": "362",
        "derecho mercantil y nociones de derecho laboral": "363",
        "derecho mercantil y legislacion laboral": "363",
        "derecho mercantil y legislación laboral": "363",
        "derecho mercantil": "363",
        "computacion iii": "364",
        "computación iii": "364",
        "seminario sobre problemas socioeconomicos de guatemala": "365",
        "seminario sobre problemas socioeconómicos de guatemala": "365",
        "seminario": "365",
        "contabilidad gubernamental integrada": "369",
        "contabilidad gubernamental e integrada": "369",
        "contabilidad gubernamental": "369",
        "etica profesional y relaciones humanas": "550",
        "ética profesional y relaciones humanas": "550",
        "etica profesional": "550",
        "ética profesional": "550"
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
            studentName: (typeof formatStudentDisplayName === 'function' ? formatStudentDisplayName(student, 'lastFirst') : null) || (student.lastName && student.firstName ? `${student.lastName}, ${student.firstName}` : student.name) || 'Estudiante',
            generalFinalAverage: generalFinalAverage,
            status: generalFinalAverage >= 60 ? 'PROMOVIDO' : 'EN CURSO',
            subjects: calculatedSubjects
        };
    }

    // 4. GENERADOR OFICIAL DE XML SIRE (<tablaCargaMasiva>)
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
        const tipoCuadro = (period === 'FINAL') ? 'F' : (period && period.startsWith('B') ? period.replace('B', '') : 'F');

        studentsToProcess.forEach(st => {
            if (st.status === 'Retirado' || st.status === 'Inactivo') return;
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
                              `    <Codigo_Personal>${escapeXml(codPersonal)}</Codigo_Personal>\n` +
                              `    <Cod_Curso>${escapeXml(subInfo.courseCode)}</Cod_Curso>\n` +
                              `    <Tipo_Cuadro>${escapeXml(tipoCuadro)}</Tipo_Cuadro>\n` +
                              `    <Nota>${escapeXml(Math.round(score))}</Nota>\n` +
                              `  </record>\n`;
            });
        });

        const headerXml = `<?xml version="1.0" encoding="UTF-8"?>\r\n` +
                          `<tablaCargaMasiva>\r\n`;
        const footerXml = `</tablaCargaMasiva>`;

        return headerXml + recordsXml + footerXml;
    }

    // 5. BÚSQUEDA INTELIGENTE Y AUTO-LLENADO DE EXPEDIENTE POR CÓDIGO PERSONAL (SIRE)
    function searchAndAutoFillByPersonalCode(codeToSearch = null) {
        let code = (codeToSearch || 
                   document.getElementById('quickSireSearchCode')?.value || 
                   document.getElementById('studentFormPersonalCode')?.value || '').trim();

        if (!code) {
            if (window.EnccoDialog && typeof window.EnccoDialog.alert === 'function') {
                window.EnccoDialog.alert({ title: 'Búsqueda SIRE', message: 'Por favor ingrese un Código Personal o CUI para buscar.', type: 'warning' });
            } else if (typeof window.showToast === 'function') {
                window.showToast('Por favor ingrese un Código Personal o CUI para buscar.', 'warning');
            } else {
                console.warn('Por favor ingrese un Código Personal o CUI para buscar.');
            }
            const inputQuick = document.getElementById('quickSireSearchCode');
            if (inputQuick) inputQuick.focus();
            return null;
        }

        const normCode = code.toLowerCase().replace(/[^a-z0-9]/g, '');
        const studentsList = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];

        // Buscar por código personal, CUI, carné o ID
        const found = studentsList.find(st => {
            if (!st) return false;
            const pCode = (st.personalCode || st.codigoPersonal || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const cui = (st.cui || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const carne = (st.carne || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const id = (st.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');

            return (pCode && pCode === normCode) || 
                   (cui && cui === normCode) || 
                   (carne && carne === normCode) ||
                   (id && id === normCode);
        });

        const banner = document.getElementById('quickSireSearchResultBanner');

        if (found) {
            // Dividir nombres si no están desglosados
            let fName = (found.firstName || '').trim();
            let lName = (found.lastName || '').trim();
            if (!fName && !lName && found.name) {
                const parts = found.name.trim().split(/\s+/);
                if (parts.length >= 4) {
                    fName = parts.slice(0, 2).join(' ');
                    lName = parts.slice(2).join(' ');
                } else if (parts.length === 3) {
                    fName = parts[0];
                    lName = parts.slice(1).join(' ');
                } else {
                    fName = parts[0] || '';
                    lName = parts[1] || '';
                }
            }

            // Asignar a los campos del formulario
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el && val !== undefined && val !== null) el.value = val;
            };

            setVal('studentFormFirstName', fName);
            setVal('studentFormLastName', lName);
            setVal('studentFormPersonalCode', found.personalCode || found.codigoPersonal || code.toUpperCase());
            setVal('studentFormCui', found.cui || '');
            setVal('studentFormBirthDate', found.birthDate || '');
            if (typeof window.calculateStudentAge === 'function') window.calculateStudentAge();
            if (found.gender) setVal('studentFormGender', found.gender);
            setVal('studentFormPhone', found.phone || '');
            setVal('studentFormEmail', found.email || '');
            setVal('studentFormAddress', found.address || '');

            // Encargados
            setVal('studentFormGuardianName', found.guardianName || found.tutorName || '');
            setVal('studentFormGuardianPhone1', found.guardianPhone || found.tutorPhone || '');
            setVal('studentFormGuardianDpi', found.guardianDpi || found.tutorDpi || '');

            // Foto si existe
            if (found.photo) {
                const preview = document.getElementById('studentFormPhotoPreview');
                if (preview) preview.src = found.photo;
            }

            // Sugerencia inteligente de grado (Promoción de 4to -> 5to, 5to -> 6to)
            const gradeEl = document.getElementById('studentFormGrade');
            if (gradeEl && gradeEl.options) {
                const prevGrade = (found.grade || '').toString().trim();
                let nextGrade = prevGrade;
                if (prevGrade === '4') nextGrade = '5';
                else if (prevGrade === '5') nextGrade = '6';

                // Buscar opción que coincida con el grado sugerido
                for (let i = 0; i < gradeEl.options.length; i++) {
                    const opt = gradeEl.options[i];
                    if (opt.value && opt.value.startsWith(nextGrade)) {
                        gradeEl.selectedIndex = i;
                        break;
                    }
                }
            }

            // Sincronizar campo de búsqueda rápida
            const qInput = document.getElementById('quickSireSearchCode');
            if (qInput) qInput.value = (found.personalCode || found.codigoPersonal || code).toUpperCase();

            // Mostrar Banner de Éxito
            if (banner) {
                banner.style.display = 'block';
                banner.style.background = '#f0fdf4';
                banner.style.border = '1.5px solid #86efac';
                banner.style.color = '#15803d';
                banner.innerHTML = `
                    <div style="font-weight:800; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-circle-check"></i> Alumno Identificado en Archivo Escolar
                    </div>
                    <div style="font-size:0.80rem; margin-top:3px; line-height:1.35;">
                        <strong>${found.name || (fName + ' ' + lName)}</strong><br>
                        Código Personal: <span style="font-family:monospace; font-weight:800; color:#0f5127;">${found.personalCode || code}</span> | Cátedra previa: ${found.grade || ''}° "${found.section || ''}"<br>
                        <span style="color:#0369a1; font-weight:700;">Grado sugerido para nuevo ciclo: ${gradeEl ? (gradeEl.options[gradeEl.selectedIndex]?.text || '') : ''}</span>
                    </div>
                `;
            }

            if (typeof window.showToast === 'function') {
                window.showToast(`✅ Expediente cargado: ${found.name || fName}. Verifique el grado y guarde.`, 'success');
            }

            // Desplazar suavemente a los datos del formulario
            const formCard = document.getElementById('mainEnrollmentForm');
            if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

            return found;
        } else {
            // No encontrado en el archivo activo: preparar como registro nuevo
            const pCodeEl = document.getElementById('studentFormPersonalCode');
            if (pCodeEl) {
                pCodeEl.value = code.toUpperCase();
            }

            const qInput = document.getElementById('quickSireSearchCode');
            if (qInput) qInput.value = code.toUpperCase();

            if (banner) {
                banner.style.display = 'block';
                banner.style.background = '#fffbeb';
                banner.style.border = '1.5px solid #fde047';
                banner.style.color = '#854d0e';
                banner.innerHTML = `
                    <div style="font-weight:800; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-user-plus"></i> Código Personal Listo para Nuevo Registro
                    </div>
                    <div style="font-size:0.80rem; margin-top:3px; line-height:1.35;">
                        El código <span style="font-family:monospace; font-weight:800; color:#b45309;">${code.toUpperCase()}</span> fue asignado al formulario.<br>
                        Complete nombres, apellidos y asigne grado para guardarlo en la nómina.
                    </div>
                `;
            }

            const fNameEl = document.getElementById('studentFormFirstName');
            if (fNameEl) fNameEl.focus();

            if (typeof window.showToast === 'function') {
                window.showToast(`Código ${code.toUpperCase()} asignado. Complete los datos para matricular.`, 'info');
            }

            return null;
        }
    }

    // Exportación Global
    const EnccoSire = {
        SIRE_COURSE_CODES,
        getSireCourseCode,
        ensureStudentPersonalCode,
        calculateSireFinalGrades,
        generateSireXmlDataSet,
        searchAndAutoFillByPersonalCode
    };

    window.EnccoSire = EnccoSire;
    window.SIRE_COURSE_CODES = SIRE_COURSE_CODES;
    window.getSireCourseCode = getSireCourseCode;
    window.ensureStudentPersonalCode = ensureStudentPersonalCode;
    window.calculateSireFinalGrades = calculateSireFinalGrades;
    window.generateSireXmlDataSet = generateSireXmlDataSet;
    window.searchAndAutoFillByPersonalCode = searchAndAutoFillByPersonalCode;

})(typeof window !== 'undefined' ? window : global);
