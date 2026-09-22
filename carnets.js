/**
 * ======================================================================
 * 🪪 ENCCO OFFICIAL STUDENT ID CARDS MODULE (carnets.js)
 * Escuela Nacional de Ciencias Comerciales - ENCCO Jutiapa 1970
 * ======================================================================
 * - Generador masivo de credenciales/carnés estudiantiles en tamaño CR80.
 * - Código de barras Code 39 y Código QR vectorial nativo.
 * - Anverso (frente con datos y foto) y Reverso (normativa y firma de Dirección).
 * - Maquetación de impresión optimizada: 8 carnés por hoja tamaño Carta con guías de corte.
 */

(function(window) {
    'use strict';

    const CODE39_MAP = {
        '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
        '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
        '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
        'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
        'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
        'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
        'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
        'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
        'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
        '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
        '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
    };

    const EnccoCarnets = {

        /**
         * Genera un código de barras Code 39 en formato SVG nativo sin librerías externas
         */
        generateBarcodeSvg(text, height = 36) {
            const raw = String(text || 'ENCCO-000').toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '');
            const cleanText = '*' + raw + '*';
            let x = 4;
            const narrow = 1.1;
            const wide = 2.6;
            let rects = '';

            for (let i = 0; i < cleanText.length; i++) {
                const char = cleanText[i];
                const pattern = CODE39_MAP[char] || CODE39_MAP['-'];
                for (let b = 0; b < 9; b++) {
                    const isBar = (b % 2 === 0);
                    const isWide = (pattern[b] === '1');
                    const w = isWide ? wide : narrow;
                    if (isBar) {
                        rects += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${height}" fill="#0f172a"/>`;
                    }
                    x += w;
                }
                x += narrow; // Espacio entre caracteres
            }
            const totalWidth = Math.ceil(x + 4);
            return `<svg width="100%" height="${height}" viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
        },

        /**
         * Genera un avatar vectorial estilizado si el alumno no tiene foto cargada
         */
        generateStudentAvatarSvg(name, size = 90) {
            const parts = (name || 'E').trim().split(/\s+/);
            const initials = ((parts[0] ? parts[0][0] : 'E') + (parts[1] ? parts[1][0] : '')).toUpperCase();
            return `
                <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="border-radius:10px; background:#f1f5f9; border:2px solid #cbd5e1;">
                    <defs>
                        <linearGradient id="gradAvatar_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#15803d" />
                            <stop offset="100%" stop-color="#0f5127" />
                        </linearGradient>
                    </defs>
                    <rect width="100" height="100" fill="url(#gradAvatar_${initials})" />
                    <circle cx="50" cy="38" r="18" fill="#ffffff" opacity="0.9" />
                    <path d="M 22 86 C 22 66, 36 60, 50 60 C 64 60, 78 66, 78 86 Z" fill="#ffffff" opacity="0.9" />
                    <text x="50" y="94" font-family="'Outfit', sans-serif" font-size="16" font-weight="900" fill="#fef08a" text-anchor="middle">${initials}</text>
                </svg>
            `;
        },

        /**
         * Genera el HTML del frente (anverso) del carné institucional en tamaño CR80
         */
        renderCardFrontHtml(student) {
            const cycle = student.academicCycle || (window.STATE && window.STATE.activeCycle) || '2026';
            const name = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Estudiante';
            const carne = student.carne || student.personalCode || 'ENCCO-2026';
            const personalCode = student.personalCode || 'No registrado';
            const cui = student.cui || 'No registrado';
            const grade = student.grade || 'Grado no asignado';
            const section = student.section || 'A';
            const career = student.career || 'Ciencias Comerciales';
            const barcodeSvg = this.generateBarcodeSvg(carne, 30);
            const avatarSvg = student.photoUrl 
                ? `<img src="${student.photoUrl}" alt="${name}" style="width:82px; height:82px; object-fit:cover; border-radius:10px; border:2px solid #15803d; box-shadow:0 2px 5px rgba(0,0,0,0.15);">` 
                : this.generateStudentAvatarSvg(name, 82);

            return `
                <div class="encco-carnet-card encco-carnet-front" style="width:336px; height:212px; background:#ffffff; border-radius:14px; border:1.5px solid #0f5127; box-shadow:0 6px 16px rgba(0,0,0,0.1); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; display:flex; flex-direction:column; box-sizing:border-box;">
                    
                    <!-- CINTILLO SUPERIOR INSTITUCIONAL -->
                    <div style="background:linear-gradient(90deg, #0f5127 0%, #15803d 70%, #166534 100%); color:#ffffff; padding:6px 10px; display:flex; align-items:center; gap:8px; border-bottom:2px solid #eab308;">
                        <img src="logo.png" style="width:28px; height:28px; object-fit:contain; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));" alt="Logo">
                        <div style="line-height:1.15; flex:1;">
                            <span style="font-family:'Outfit', sans-serif; font-size:0.76rem; font-weight:900; letter-spacing:0.4px; display:block; color:#ffffff;">ENCCO JUTIAPA 1970</span>
                            <span style="font-size:0.56rem; font-weight:600; color:#bbf7d0; text-transform:uppercase; letter-spacing:0.2px;">Escuela Nacional de Ciencias Comerciales</span>
                        </div>
                        <div style="text-align:right;">
                            <span style="background:#eab308; color:#0f172a; font-size:0.58rem; font-weight:900; padding:2px 6px; border-radius:4px; display:inline-block;">CICLO ${cycle}</span>
                        </div>
                    </div>

                    <!-- CUERPO DEL CARNÉ (FOTO Y DATOS) -->
                    <div style="padding:8px 10px; display:flex; gap:10px; flex:1; align-items:center;">
                        <div style="flex-shrink:0; text-align:center;">
                            ${avatarSvg}
                            <span style="display:block; font-size:0.52rem; font-weight:800; color:#15803d; margin-top:3px; text-transform:uppercase;">ESTUDIANTE REGULAR</span>
                        </div>
                        <div style="flex:1; line-height:1.22; overflow:hidden;">
                            <div style="font-size:0.75rem; font-weight:900; color:#0f172a; text-transform:uppercase; max-height:2.4em; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; margin-bottom:3px;" title="${name}">
                                ${name}
                            </div>
                            
                            <div style="font-size:0.62rem; color:#334155; margin-bottom:2px;">
                                <strong style="color:#0f5127;">Carné:</strong> <span style="font-weight:800; color:#1e293b;">${carne}</span>
                            </div>
                            <div style="font-size:0.62rem; color:#334155; margin-bottom:2px;">
                                <strong style="color:#0f5127;">Cód. Personal:</strong> <span style="font-weight:700;">${personalCode}</span>
                            </div>
                            <div style="font-size:0.60rem; color:#334155; margin-bottom:2px;">
                                <strong style="color:#0f5127;">CUI:</strong> <span>${cui}</span>
                            </div>
                            <div style="font-size:0.60rem; color:#15803d; font-weight:800; background:#f0fdf4; padding:2px 4px; border-radius:4px; display:inline-block; margin-top:2px;">
                                ${grade} "${section}" | ${career}
                            </div>
                        </div>
                    </div>

                    <!-- CÓDIGO DE BARRAS INFERIOR -->
                    <div style="background:#f8fafc; padding:3px 10px 4px 10px; border-top:1px solid #e2e8f0; text-align:center;">
                        <div style="width:75%; margin:0 auto;">
                            ${barcodeSvg}
                        </div>
                        <div style="font-size:0.52rem; color:#64748b; font-family:monospace; letter-spacing:1px; margin-top:1px;">
                            ${carne}
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Genera el HTML del reverso del carné institucional
         */
        renderCardBackHtml(student) {
            const cycle = student.academicCycle || (window.STATE && window.STATE.activeCycle) || '2026';
            const carne = student.carne || student.personalCode || 'ENCCO-2026';

            return `
                <div class="encco-carnet-card encco-carnet-back" style="width:336px; height:212px; background:#ffffff; border-radius:14px; border:1.5px solid #0f5127; box-shadow:0 6px 16px rgba(0,0,0,0.1); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; display:flex; flex-direction:column; box-sizing:border-box; padding:10px 14px;">
                    
                    <div style="text-align:center; border-bottom:1.5px solid #e2e8f0; padding-bottom:4px; margin-bottom:6px;">
                        <span style="font-family:'Outfit', sans-serif; font-size:0.66rem; font-weight:900; color:#0f5127; text-transform:uppercase; letter-spacing:0.3px; display:block;">
                            ESCUELA NACIONAL DE CIENCIAS COMERCIALES
                        </span>
                        <span style="font-size:0.54rem; color:#64748b;">Jutiapa, Guatemala | Ministerio de Educación</span>
                    </div>

                    <div style="font-size:0.56rem; color:#334155; line-height:1.4; flex:1;">
                        <p style="margin:0 0 4px 0;">
                            <strong>1. Identificación Oficial:</strong> Este documento acredita a su portador como alumno(a) formalmente inscrito en la institución para el Ciclo Escolar <strong>${cycle}</strong>.
                        </p>
                        <p style="margin:0 0 4px 0;">
                            <strong>2. Uso Obligatorio:</strong> Indispensable para ingresar a las instalaciones, trámites en Secretaría, préstamos en Biblioteca y evaluaciones bimestrales.
                        </p>
                        <p style="margin:0;">
                            <strong>3. Extravío:</strong> Reportar inmediatamente en Dirección. En caso de encontrarlo, favor devolverlo en la sede de la ENCCO, Jutiapa.
                        </p>
                    </div>

                    <!-- FIRMA DE DIRECCIÓN Y CÓDIGO DE VALIDACIÓN -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid #e2e8f0; padding-top:6px; margin-top:4px;">
                        <div style="text-align:center; width:130px;">
                            <img src="firma_director_sello.png" style="height:32px; object-fit:contain; display:block; margin:0 auto;" onerror="this.style.display='none'">
                            <div style="border-top:1px solid #0f172a; padding-top:2px; font-size:0.52rem; font-weight:800; color:#0f172a;">
                                Dirección ENCCO Jutiapa
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.54rem; font-weight:800; color:#0f5127;">SELLO INSTITUCIONAL</div>
                            <div style="font-size:0.48rem; color:#64748b;">Validez: Ciclo ${cycle}</div>
                            <div style="font-size:0.46rem; color:#94a3b8; font-family:monospace;">ID: ${carne}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    };

    // 2. RENDERIZADO DE LA VISTA DE GESTIÓN DE CARNÉS
    function renderCarnetsView() {
        const container = document.getElementById('view-carnets');
        if (!container) return;

        const allStudents = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
        const pensum = (window.STATE && Array.isArray(window.STATE.pensum)) ? window.STATE.pensum : [];
        const gradesList = (window.STATE && Array.isArray(window.STATE.gradesList)) ? window.STATE.gradesList : [];

        // Filtros
        const carFilter = document.getElementById('carnetsCareerFilter')?.value || 'ALL';
        const grdFilter = document.getElementById('carnetsGradeFilter')?.value || 'ALL';
        const secFilter = document.getElementById('carnetsSectionFilter')?.value || 'ALL';
        const searchVal = (document.getElementById('carnetsSearchInput')?.value || '').trim().toLowerCase();

        // Opciones únicas para los selectores
        const careers = [...new Set(allStudents.map(s => s.career).filter(Boolean))];
        const grades = [...new Set(allStudents.map(s => s.grade).filter(Boolean))];
        const sections = [...new Set(allStudents.map(s => s.section).filter(Boolean))];

        const filteredStudents = allStudents.filter(st => {
            if (!st) return false;
            const stCar = (st.career || '').trim();
            const stGrd = (st.grade || '').trim();
            const stSec = (st.section || '').trim();

            const carMatch = (carFilter === 'ALL' || !carFilter || stCar.toLowerCase() === carFilter.toLowerCase());
            const grdMatch = (grdFilter === 'ALL' || !grdFilter || stGrd.toLowerCase() === grdFilter.toLowerCase());
            const secMatch = (secFilter === 'ALL' || !secFilter || stSec.toLowerCase() === secFilter.toLowerCase());

            if (!carMatch || !grdMatch || !secMatch) return false;

            if (searchVal) {
                const sName = (st.name || `${st.firstName || ''} ${st.lastName || ''}`).toLowerCase();
                const sCarne = (st.carne || '').toLowerCase();
                const sCode = (st.personalCode || '').toLowerCase();
                if (!sName.includes(searchVal) && !sCarne.includes(searchVal) && !sCode.includes(searchVal)) {
                    return false;
                }
            }
            return true;
        });

        container.innerHTML = `
            <div class="carnets-container" style="padding:10px 0;">
                
                <!-- ENCABEZADO DE SECCIÓN -->
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
                    <div>
                        <h2 style="margin:0; font-size:1.45rem; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:10px;">
                            <i class="fa-solid fa-id-card" style="color:var(--brand-green);"></i>
                            Generador e Impresión Oficial de Carnés Estudiantiles
                        </h2>
                        <p style="margin:4px 0 0 0; font-size:0.85rem; color:#64748b;">
                            Credenciales con código de barras Code 39, datos oficiales MINEDUC y maquetación de 8 carnés por hoja Carta.
                        </p>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button type="button" class="btn btn-primary" onclick="EnccoCarnets.printFilteredBatch()" style="background:#15803d; font-weight:800; box-shadow:0 3px 8px rgba(21,128,61,0.3);">
                            <i class="fa-solid fa-print"></i> Imprimir Lote (${filteredStudents.length} Carnés)
                        </button>
                    </div>
                </div>

                <!-- BARRA DE FILTROS Y CONTROL -->
                <div style="background:#ffffff; border-radius:12px; padding:14px 18px; border:1.5px solid #e2e8f0; margin-bottom:20px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
                    <div style="flex:1; min-width:220px;">
                        <input type="text" id="carnetsSearchInput" class="form-control" placeholder="Buscar por alumno, carné o código personal..." value="${searchVal}" oninput="renderCarnetsView()" style="font-size:0.85rem;">
                    </div>
                    <div style="min-width:140px;">
                        <select id="carnetsCareerFilter" class="form-control" onchange="renderCarnetsView()" style="font-size:0.85rem; font-weight:600;">
                            <option value="ALL">-- Todas las Carreras --</option>
                            ${careers.map(c => `<option value="${c}" ${carFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div style="min-width:130px;">
                        <select id="carnetsGradeFilter" class="form-control" onchange="renderCarnetsView()" style="font-size:0.85rem; font-weight:600;">
                            <option value="ALL">-- Todos los Grados --</option>
                            ${grades.map(g => `<option value="${g}" ${grdFilter === g ? 'selected' : ''}>${g}</option>`).join('')}
                        </select>
                    </div>
                    <div style="min-width:110px;">
                        <select id="carnetsSectionFilter" class="form-control" onchange="renderCarnetsView()" style="font-size:0.85rem; font-weight:600;">
                            <option value="ALL">-- Sección --</option>
                            ${sections.map(s => `<option value="${s}" ${secFilter === s ? 'selected' : ''}>Sección "${s}"</option>`).join('')}
                        </select>
                    </div>
                </div>

                <!-- CONTADOR DE RESULTADOS -->
                <div style="margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.86rem; color:#475569; font-weight:700;">
                        Mostrando <strong>${filteredStudents.length}</strong> de ${allStudents.length} estudiantes registrados
                    </span>
                    <span style="font-size:0.75rem; color:#64748b; font-weight:600;">
                        <i class="fa-solid fa-circle-info"></i> Puedes alternar entre el frente y reverso de cada carné con el botón "Voltear".
                    </span>
                </div>

                <!-- GRILLA DE PREVISUALIZACIÓN DE CARNÉS -->
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:18px; justify-items:center;">
                    ${filteredStudents.length === 0 ? `
                        <div style="grid-column:1 / -1; text-align:center; padding:50px 20px; background:#ffffff; border-radius:12px; border:1.5px dashed #cbd5e1; width:100%;">
                            <i class="fa-solid fa-id-card-clip" style="font-size:2.4rem; color:#94a3b8; display:block; margin-bottom:10px;"></i>
                            <h4 style="margin:0; color:#334155;">No se encontraron estudiantes para los filtros indicados</h4>
                            <p style="margin:4px 0 0 0; color:#64748b; font-size:0.82rem;">Modifique los criterios de búsqueda o seleccione otra carrera/sección.</p>
                        </div>
                    ` : filteredStudents.map((st, idx) => `
                        <div class="carnet-preview-wrapper" style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                            <div id="carnetCardBox_${st.id}">
                                ${EnccoCarnets.renderCardFrontHtml(st)}
                            </div>
                            
                            <!-- BOTONES DE ACCIÓN INDIVIDUAL -->
                            <div style="display:flex; gap:6px; margin-top:2px;">
                                <button type="button" class="btn btn-xs btn-outline-secondary" onclick="EnccoCarnets.toggleCardSide('${st.id}')" style="font-size:0.72rem; font-weight:700;">
                                    <i class="fa-solid fa-arrows-rotate"></i> Voltear Reverso
                                </button>
                                <button type="button" class="btn btn-xs btn-outline-primary" onclick="EnccoCarnets.printSingleCard('${st.id}')" style="font-size:0.72rem; font-weight:700;">
                                    <i class="fa-solid fa-print"></i> Imprimir
                                </button>
                                <button type="button" class="btn btn-xs btn-outline-success" onclick="EnccoCarnets.promptUploadPhoto('${st.id}')" style="font-size:0.72rem; font-weight:700;">
                                    <i class="fa-solid fa-camera"></i> Foto
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

            </div>
        `;
    }

    // 3. ALTERNAR ENTRE FRENTE Y REVERSO EN VISTA PREVIA
    EnccoCarnets.toggleCardSide = function(studentId) {
        const box = document.getElementById(`carnetCardBox_${studentId}`);
        if (!box) return;

        const student = (window.STATE && window.STATE.students) ? window.STATE.students.find(s => s.id === studentId) : null;
        if (!student) return;

        const isShowingFront = box.querySelector('.encco-carnet-front') !== null;
        if (isShowingFront) {
            box.innerHTML = EnccoCarnets.renderCardBackHtml(student);
        } else {
            box.innerHTML = EnccoCarnets.renderCardFrontHtml(student);
        }
    };

    // 4. CARGAR FOTO DEL ESTUDIANTE (Base64 / LocalStorage / Firebase)
    EnccoCarnets.promptUploadPhoto = function(studentId) {
        const student = (window.STATE && window.STATE.students) ? window.STATE.students.find(s => s.id === studentId) : null;
        if (!student) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                alert('La imagen es demasiado grande. Seleccione una fotografía de hasta 2 MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(evt) {
                student.photoUrl = evt.target.result;
                if (typeof window.saveStateToLocalStorage === 'function') {
                    window.saveStateToLocalStorage();
                }
                if (typeof window.EnccoCloudSync !== 'undefined' && window.EnccoCloudSync.syncNode) {
                    window.EnccoCloudSync.syncNode('students', window.STATE.students);
                }
                renderCarnetsView();
                if (typeof window.showToast === 'function') {
                    window.showToast(`Fotografía actualizada exitosamente para ${student.name}.`, 'success');
                }
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    // 5. IMPRESIÓN INDIVIDUAL DE UN CARNÉ
    EnccoCarnets.printSingleCard = function(studentId) {
        const student = (window.STATE && window.STATE.students) ? window.STATE.students.find(s => s.id === studentId) : null;
        if (!student) return;

        const frontHtml = EnccoCarnets.renderCardFrontHtml(student);
        const backHtml = EnccoCarnets.renderCardBackHtml(student);

        const printWin = window.open('', '_blank', 'width=850,height=650');
        printWin.document.write(`
            <html>
                <head>
                    <title>Carné Oficial - ${student.name}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 30px; display:flex; gap:25px; align-items:center; justify-content:center; background:#f8fafc; }
                        @media print {
                            body { background:#fff; padding: 0; }
                            .print-card-wrapper { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-card-wrapper" style="display:flex; gap:20px; flex-wrap:wrap; justify-content:center;">
                        <div>
                            <div style="font-size:10px; font-weight:700; color:#64748b; margin-bottom:4px; text-align:center;">FRENTE (ANVERSO)</div>
                            ${frontHtml}
                        </div>
                        <div>
                            <div style="font-size:10px; font-weight:700; color:#64748b; margin-bottom:4px; text-align:center;">REVERSO</div>
                            ${backHtml}
                        </div>
                    </div>
                    <script>
                        window.onload = function() { window.print(); };
                    </script>
                </body>
            </html>
        `);
        printWin.document.close();
    };

    // 6. IMPRESIÓN MASIVA EN HOJAS TAMAÑO CARTA (8 CARNÉS POR PÁGINA)
    EnccoCarnets.printFilteredBatch = function() {
        const allStudents = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
        const carFilter = document.getElementById('carnetsCareerFilter')?.value || 'ALL';
        const grdFilter = document.getElementById('carnetsGradeFilter')?.value || 'ALL';
        const secFilter = document.getElementById('carnetsSectionFilter')?.value || 'ALL';
        const searchVal = (document.getElementById('carnetsSearchInput')?.value || '').trim().toLowerCase();

        const studentsToPrint = allStudents.filter(st => {
            if (!st) return false;
            const carMatch = (carFilter === 'ALL' || !carFilter || (st.career || '').toLowerCase() === carFilter.toLowerCase());
            const grdMatch = (grdFilter === 'ALL' || !grdFilter || (st.grade || '').toLowerCase() === grdFilter.toLowerCase());
            const secMatch = (secFilter === 'ALL' || !secFilter || (st.section || '').toLowerCase() === secFilter.toLowerCase());
            if (!carMatch || !grdMatch || !secMatch) return false;
            if (searchVal) {
                const sName = (st.name || `${st.firstName || ''} ${st.lastName || ''}`).toLowerCase();
                const sCarne = (st.carne || '').toLowerCase();
                if (!sName.includes(searchVal) && !sCarne.includes(searchVal)) return false;
            }
            return true;
        });

        if (studentsToPrint.length === 0) {
            alert('No hay estudiantes seleccionados para imprimir.');
            return;
        }

        const cardsHtml = studentsToPrint.map(st => `
            <div class="print-carnet-item" style="box-sizing:border-box; border:1px dashed #cbd5e1; padding:4px; border-radius:10px; display:inline-block; margin:4px; page-break-inside:avoid;">
                ${EnccoCarnets.renderCardFrontHtml(st)}
            </div>
        `).join('');

        const printWin = window.open('', '_blank', 'width=1050,height=800');
        printWin.document.write(`
            <html>
                <head>
                    <title>Impresión Masiva de Carnés - ENCCO Jutiapa</title>
                    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
                    <style>
                        @page {
                            size: letter portrait;
                            margin: 8mm;
                        }
                        body {
                            font-family: 'Plus Jakarta Sans', sans-serif;
                            margin: 0;
                            padding: 0;
                            background: #fff;
                        }
                        .carnets-sheet-grid {
                            display: flex;
                            flex-wrap: wrap;
                            justify-content: center;
                            gap: 4mm;
                            align-items: center;
                        }
                        .print-carnet-item {
                            page-break-inside: avoid;
                        }
                    </style>
                </head>
                <body>
                    <div style="text-align:center; margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
                        <strong style="font-size:12px; color:#15803d;">HOJA DE IMPRESIÓN OFICIAL DE CARNÉS ESTUDIANTILES — ENCCO JUTIAPA 1970</strong>
                        <div style="font-size:10px; color:#64748b;">Total estudiantes: ${studentsToPrint.length} | Ciclo: ${(window.STATE && window.STATE.activeCycle) || '2026'}</div>
                    </div>
                    <div class="carnets-sheet-grid">
                        ${cardsHtml}
                    </div>
                    <script>
                        window.onload = function() { window.print(); };
                    </script>
                </body>
            </html>
        `);
        printWin.document.close();
    };

    window.EnccoCarnets = EnccoCarnets;
    window.renderCarnetsView = renderCarnetsView;

})(typeof window !== 'undefined' ? window : global);
