/**
 * ======================================================================
 * 🪪 ENCCO OFFICIAL ID CARDS MODULE (carnets.js)
 * Escuela Nacional de Ciencias Comerciales - ENCCO Jutiapa 1970
 * ======================================================================
 * - Generador oficial de carnés estudiantiles (HORIZONTAL) y docentes (VERTICAL)
 * - Tamaño oficial CR80 (85.6mm × 53.98mm / 3.375" × 2.125").
 * - Código de barras Code 39 y Código QR nativo en anverso y reverso.
 * - Anverso oficial según diseño institucional ENCCO 1970.
 * - Reverso de alta legibilidad con datos completos, firma de Dirección y sello.
 * - Maquetación de impresión masiva optimizada en hojas tamaño Carta con guías de corte.
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
        activeTab: 'students', // 'students' | 'teachers'

        /**
         * Obtiene la instancia o función de generación de QR
         */
        getQrProvider() {
            if (typeof window !== 'undefined' && window.qrcode) return window.qrcode;
            if (typeof qrcode !== 'undefined') return qrcode;
            if (typeof require === 'function') {
                try { return require('./qrcode.min.js'); } catch(e) { return null; }
            }
            return null;
        },

        /**
         * Genera un código de barras Code 39 en formato SVG nativo sin dependencias
         */
        generateBarcodeSvg(text, height = 24) {
            const raw = String(text || 'ENCCO-000').toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '');
            const cleanText = '*' + raw + '*';
            let x = 4;
            const narrow = 1.0;
            const wide = 2.4;
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
                x += narrow;
            }
            const totalWidth = Math.ceil(x + 4);
            return `<svg width="100%" height="${height}" viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
        },

        /**
         * Genera un código QR SVG nativo escalable
         */
        generateQrSvg(text, size = 32) {
            try {
                const qrFn = this.getQrProvider();
                if (qrFn) {
                    const qr = qrFn(0, 'M');
                    qr.addData(String(text || 'ENCCO-2026'));
                    qr.make();
                    const svgRaw = qr.createSvgTag({
                        cellSize: 2,
                        margin: 0,
                        scalable: true
                    });
                    return svgRaw.replace('<svg', `<svg width="${size}" height="${size}" style="display:block; margin:0 auto;"`);
                }
            } catch(e) {
                console.warn('EnccoCarnets: error generando QR SVG:', e);
            }
            return `<div style="width:${size}px; height:${size}px; border:1px dashed #94a3b8; display:flex; align-items:center; justify-content:center; font-size:7px; color:#64748b; background:#f8fafc;">QR</div>`;
        },

        /**
         * Genera un avatar vectorial para estudiante cuando no tiene foto
         */
        /**
         * Genera un avatar vectorial estilizado de estudiante formal (traje/uniforme) para cuando no hay foto
         */
        generateStudentAvatarSvg(name, width = 74, height = 94) {
            return `
                <svg width="100%" height="100%" viewBox="0 0 100 126" xmlns="http://www.w3.org/2000/svg" style="display:block; width:100%; height:100%;">
                    <rect width="100" height="126" fill="#f8fafc" />
                    <!-- Silueta de blazer formal oscuro -->
                    <path d="M 8 126 C 10 98 24 88 38 85 L 38 98 L 62 98 L 62 85 C 76 88 90 98 92 126 Z" fill="#1e293b" />
                    <!-- Camisa y cuello blanco formal -->
                    <polygon points="38,85 50,106 62,85" fill="#ffffff" />
                    <!-- Cuello -->
                    <rect x="43" y="68" width="14" height="20" fill="#e2bda3" />
                    <!-- Rostro tono cálido estilizado -->
                    <ellipse cx="50" cy="50" rx="17" ry="21" fill="#f0d5be" />
                    <!-- Peinado institucional -->
                    <path d="M 28 52 C 28 28 38 20 50 20 C 62 20 72 28 72 52 C 70 45 64 36 57 34 C 49 32 39 37 33 43 C 30 46 28 49 28 52 Z" fill="#2d1e14" />
                    <path d="M 30 50 C 29 62 28 76 34 85 C 36 77 34 62 34 54 Z" fill="#2d1e14" />
                    <path d="M 70 50 C 71 62 72 76 66 85 C 64 77 66 62 66 54 Z" fill="#2d1e14" />
                </svg>
            `;
        },

        /**
         * Genera un avatar vectorial estilizado de docente formal (traje ejecutivo) para cuando no hay foto
         */
        generateTeacherAvatarSvg(name, width = 80, height = 100) {
            return `
                <svg width="100%" height="100%" viewBox="0 0 100 126" xmlns="http://www.w3.org/2000/svg" style="display:block; width:100%; height:100%;">
                    <rect width="100" height="126" fill="#f8fafc" />
                    <!-- Silueta de traje ejecutivo oscuro -->
                    <path d="M 6 126 C 8 96 22 86 37 84 L 37 99 L 63 99 L 63 84 C 78 86 92 96 94 126 Z" fill="#0f172a" />
                    <!-- Solapa y camisa blanca formal -->
                    <polygon points="37,84 50,108 63,84" fill="#ffffff" />
                    <!-- Cuello -->
                    <rect x="43" y="67" width="14" height="21" fill="#dfba9f" />
                    <!-- Rostro tono profesional -->
                    <ellipse cx="50" cy="49" rx="17" ry="21" fill="#ecd0b8" />
                    <!-- Peinado docente estilizado -->
                    <path d="M 28 50 C 28 26 38 18 50 18 C 62 18 72 26 72 50 C 70 43 64 34 57 32 C 49 30 39 35 33 41 C 30 44 28 47 28 50 Z" fill="#1e1510" />
                    <path d="M 29 48 C 28 60 27 75 33 84 C 35 76 33 61 33 53 Z" fill="#1e1510" />
                    <path d="M 71 48 C 72 60 73 75 67 84 C 65 76 67 61 67 53 Z" fill="#1e1510" />
                </svg>
            `;
        },

        /* ======================================================================
         * 🎓 1. MODELO CARNET ESTUDIANTIL (HORIZONTAL - CR80)
         * ====================================================================== */

        /**
         * Frente del carné estudiantil horizontal (Recreación exacta del modelo oficial)
         */
        renderStudentCardFrontHtml(student) {
            const cycle = student.academicCycle || (window.STATE && window.STATE.activeCycle) || '2026';
            const name = student.name || `${student.firstName || student.nombres || ''} ${student.lastName || student.apellidos || ''}`.trim() || 'Estudiante';
            const carne = student.personalCode || student.carne || 'ENCCO-2026';
            const grade = student.grade || student.gradeLabel || '4TO PERITO';
            const section = student.section || 'A';

            const barcodeSvg = this.generateBarcodeSvg(carne, 22);
            const qrText = `https://comerciojutiapa.github.io/enccojutiapa/?carne=${encodeURIComponent(carne)}&student=${encodeURIComponent(name)}`;
            const qrSvg = this.generateQrSvg(qrText, 32);

            const photoInner = student.photoUrl || student.photo
                ? `<img src="${student.photoUrl || student.photo}" alt="${name}" style="width:100%; height:100%; object-fit:cover; display:block;">`
                : this.generateStudentAvatarSvg(name, 74, 94);

            return `
                <div class="encco-carnet-card encco-carnet-student encco-carnet-front" style="width:336px; height:212px; background:#ffffff; border-radius:12px; border:1.5px solid #cbd5e1; box-shadow:0 6px 18px rgba(0,0,0,0.12); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; box-sizing:border-box; text-align:left; user-select:none;">
                    
                    <!-- MARCA DE AGUA EDIFICIO INSTITUCIONAL SUTIL DE FONDO -->
                    <div style="position:absolute; right:10px; top:45px; width:200px; height:110px; opacity:0.045; pointer-events:none; z-index:0; background:radial-gradient(circle, rgba(0,64,152,0.15) 0%, rgba(255,255,255,0) 70%);">
                        <svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                            <rect x="10" y="30" width="180" height="60" rx="3" fill="#004098" opacity="0.3" />
                            <rect x="25" y="45" width="20" height="25" fill="#ffffff" />
                            <rect x="55" y="45" width="20" height="25" fill="#ffffff" />
                            <rect x="85" y="45" width="20" height="25" fill="#ffffff" />
                            <rect x="115" y="45" width="20" height="25" fill="#ffffff" />
                            <rect x="145" y="45" width="20" height="25" fill="#ffffff" />
                        </svg>
                    </div>

                    <!-- FORMA GEOMÉTRICA SUPERIOR IZQUIERDA (AZUL, VERDE Y NARANJA) -->
                    <svg style="position:absolute; top:0; left:0; width:90px; height:80px; pointer-events:none; z-index:1;" viewBox="0 0 90 80">
                        <path d="M 0,0 L 72,0 C 70,22 56,50 0,64 Z" fill="#004098" />
                        <path d="M 72,0 C 70,22 56,50 0,64 L 0,71 C 58,56 74,25 78,0 Z" fill="#007a3d" />
                        <path d="M 78,0 C 76,25 60,56 0,71 L 0,74 C 62,59 79,26 82,0 Z" fill="#ea580c" />
                    </svg>

                    <!-- ESCUDO OFICIAL ENCCO SUPERIOR IZQUIERDO -->
                    <div style="position:absolute; top:6px; left:8px; width:34px; height:40px; z-index:4; filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));">
                        <img src="logo.png" style="width:100%; height:100%; object-fit:contain; display:block;" alt="Escudo ENCCO">
                    </div>

                    <!-- ENCABEZADO INSTITUCIONAL DERECHA DEL ESCUDO -->
                    <div style="margin-left:60px; padding:6px 6px 0 0; text-align:center; position:relative; z-index:2;">
                        <div style="font-family:'Outfit', sans-serif; font-size:0.62rem; font-weight:900; color:#006837; letter-spacing:0.25px; line-height:1.15; text-transform:uppercase;">
                            ESCUELA NACIONAL DE CIENCIAS COMERCIALES
                        </div>
                        <div style="font-family:'Outfit', sans-serif; font-size:0.54rem; font-weight:900; color:#006837; letter-spacing:0.8px; line-height:1.15; margin-top:1px;">
                            JUTIAPA 1970
                        </div>
                        <div style="display:flex; align-items:center; justify-content:center; gap:3px; margin-top:2px;">
                            <span style="flex:1; height:1.2px; background:#006837; max-width:32px;"></span>
                            <span style="color:#ea580c; font-size:0.36rem; line-height:1;">◆</span>
                            <span style="color:#007a3d; font-size:0.36rem; line-height:1;">◆</span>
                            <span style="color:#ea580c; font-size:0.36rem; line-height:1;">◆</span>
                            <span style="color:#007a3d; font-size:0.36rem; line-height:1;">◆</span>
                            <span style="color:#ea580c; font-size:0.36rem; line-height:1;">◆</span>
                            <span style="flex:1; height:1.2px; background:#006837; max-width:32px;"></span>
                        </div>
                    </div>

                    <!-- CINTA AZUL REAL HORIZONTAL CARNET ESTUDIANTIL -->
                    <div style="position:relative; z-index:2; background:#004098; color:#ffffff; font-family:'Outfit', sans-serif; font-size:0.74rem; font-weight:900; letter-spacing:1.5px; text-transform:uppercase; padding:3.5px 10px 3.5px 92px; margin-top:4px; box-shadow:0 2px 4px rgba(0,64,152,0.25);">
                        CARNET ESTUDIANTIL
                    </div>

                    <!-- FOTO CON MARCO DORADO BISELADO (NOTCHED CORNERS) -->
                    <div style="position:absolute; left:12px; top:46px; width:74px; height:94px; z-index:4;">
                        <div class="encco-gold-frame-outer" style="width:100%; height:100%;">
                            <div class="encco-gold-frame-middle">
                                <div class="encco-gold-frame-inner">
                                    ${photoInner}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- BLOQUE DE DATOS DEL ALUMNO -->
                    <div style="position:absolute; left:96px; top:62px; right:12px; z-index:3; line-height:1.2;">
                        <div style="font-size:0.50rem; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.4px;">NOMBRE COMPLETO:</div>
                        <div style="font-size:0.68rem; font-weight:900; color:#000000; text-transform:uppercase; line-height:1.15; max-height:2.3em; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; margin-bottom:2px;" title="${name}">
                            ${name}
                        </div>
                        
                        <div style="font-size:0.50rem; font-weight:800; color:#0f172a; text-transform:uppercase;">CARNÉ NO:</div>
                        <div style="font-size:0.64rem; font-weight:900; color:#004098; margin-bottom:2px;">
                            ${carne}
                        </div>
                        
                        <div style="display:flex; justify-content:space-between; align-items:baseline;">
                            <div>
                                <span style="font-size:0.52rem; font-weight:800; color:#0f172a;">CICLO:</span> 
                                <strong style="font-size:0.62rem; font-weight:900; color:#000000;">[${cycle}]</strong>
                            </div>
                            <div>
                                <strong style="font-size:0.58rem; font-weight:900; color:#004098; text-transform:uppercase; letter-spacing:0.4px;">ESTUDIANTE</strong>
                            </div>
                        </div>
                    </div>

                    <!-- CONTENEDOR INFERIOR BLANCO RESERVADO (CÓDIGO DE BARRAS + QR) -->
                    <div style="position:absolute; left:10px; right:10px; bottom:10px; height:42px; background:#ffffff; border:1.2px solid #cbd5e1; border-radius:8px; padding:2px 8px; display:flex; align-items:center; justify-content:space-between; gap:6px; box-shadow:0 1px 3px rgba(0,0,0,0.05); z-index:3;">
                        <div style="flex:1; text-align:center; overflow:hidden;">
                            <div style="width:92%; margin:0 auto;">
                                ${barcodeSvg}
                            </div>
                            <div style="font-size:0.46rem; font-family:monospace; color:#334155; font-weight:800; letter-spacing:1px; margin-top:1px;">
                                ${carne}
                            </div>
                        </div>
                        <div style="flex-shrink:0; border-left:1px solid #e2e8f0; padding-left:6px; display:flex; align-items:center; justify-content:center;" title="Escanear con Celular">
                            ${qrSvg}
                        </div>
                    </div>

                    <!-- REMATE INFERIOR DIAGONAL (AZUL, VERDE Y NARANJA) -->
                    <svg style="position:absolute; bottom:0; left:0; width:100%; height:8px; pointer-events:none; z-index:1;" viewBox="0 0 336 8" preserveAspectRatio="none">
                        <polygon points="0,0 165,0 155,8 0,8" fill="#004098" />
                        <polygon points="158,0 215,0 205,8 148,8" fill="#007a3d" />
                        <polygon points="218,0 240,0 230,8 208,8" fill="#ea580c" />
                    </svg>

                </div>
            `;
        },

        /**
         * Reverso del carné estudiantil horizontal (ultra legible con datos completos)
         */
        renderStudentCardBackHtml(student) {
            const cycle = student.academicCycle || (window.STATE && window.STATE.activeCycle) || '2026';
            const carne = student.carne || student.personalCode || '2026-0001-PC';
            const personalCode = student.personalCode || 'No asignado';
            const cui = student.cui || 'No registrado';
            const grade = student.grade || student.gradeLabel || 'Grado no asignado';
            const section = student.section || 'A';
            const career = student.career || 'Perito Contador';
            const shift = student.shift || student.jornada || 'Matutina';
            const birthDate = student.birthDate || student.fechaNacimiento || '';
            const guardian = student.guardian || student.guardianName || student.motherName || student.fatherName || 'Padre de Familia';
            const guardianPhone = student.guardianPhone || student.motherPhone || student.fatherPhone || student.phone || student.telefono || 'No reg.';

            const qrTextBack = `https://comerciojutiapa.github.io/enccojutiapa/?verify=student&carne=${encodeURIComponent(carne)}&cycle=${cycle}`;
            const qrSvgBack = this.generateQrSvg(qrTextBack, 30);

            return `
                <div class="encco-carnet-card encco-carnet-student encco-carnet-back" style="width:336px; height:212px; background:#ffffff; border-radius:12px; border:1.5px solid #cbd5e1; box-shadow:0 6px 18px rgba(0,0,0,0.12); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; display:flex; flex-direction:column; box-sizing:border-box; padding:8px 12px; justify-content:space-between; text-align:left; user-select:none;">
                    
                    <!-- ENCABEZADO MINEDUC REVERSO -->
                    <div style="border-bottom:1.5px solid #006837; padding-bottom:3px; text-align:center;">
                        <span style="font-family:'Outfit', sans-serif; font-size:0.64rem; font-weight:900; color:#006837; text-transform:uppercase; letter-spacing:0.3px; display:block;">
                            ESCUELA NACIONAL DE CIENCIAS COMERCIALES
                        </span>
                        <span style="font-size:0.50rem; color:#475569; font-weight:700;">
                            Jutiapa, Guatemala | Código MINEDUC: <strong style="color:#0f172a;">22-01-0014-46</strong> | Ciclo ${cycle}
                        </span>
                    </div>

                    <!-- TABLA DE DATOS DEL ALUMNO DE ALTA LEGIBILIDAD -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.54rem; color:#0f172a; line-height:1.28; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:4px 8px;">
                        <div>
                            <div><strong style="color:#006837;">Cód. Personal:</strong> <span style="font-weight:800;">${personalCode}</span></div>
                            <div><strong style="color:#006837;">CUI / DPI:</strong> <span style="font-weight:700;">${cui}</span></div>
                            <div><strong style="color:#006837;">Jornada:</strong> <span>${shift}</span></div>
                            <div><strong style="color:#006837;">Nacimiento:</strong> <span>${birthDate || 'No reg.'}</span></div>
                        </div>
                        <div>
                            <div><strong style="color:#006837;">Grado:</strong> <span style="font-weight:700;">${grade} "${section}"</span></div>
                            <div><strong style="color:#006837;">Carrera:</strong> <span>${career}</span></div>
                            <div><strong style="color:#006837;">Encargado:</strong> <span style="font-weight:700;">${guardian}</span></div>
                            <div><strong style="color:#006837;">Emergencia:</strong> <span style="font-weight:800; color:#b91c1c;">${guardianPhone}</span></div>
                        </div>
                    </div>

                    <!-- NORMATIVA INSTITUCIONAL OFICIAL -->
                    <div style="font-size:0.48rem; color:#475569; line-height:1.22;">
                        • <strong>Identificación Oficial:</strong> Acredita al portador como alumno regular formalmente inscrito.<br>
                        • <strong>Uso:</strong> Obligatorio para ingreso a instalaciones, biblioteca, gestiones y evaluaciones.<br>
                        • <strong>Extravío:</strong> Reportar inmediatamente en Dirección. Este documento es personal e intransferible.
                    </div>

                    <!-- FIRMA DE DIRECCIÓN, SELLO Y QR DE VERIFICACIÓN -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid #e2e8f0; padding-top:3px;">
                        <div style="text-align:center; width:110px;">
                            <img src="firma_director_sello.png" style="height:25px; object-fit:contain; display:block; margin:0 auto;" onerror="this.style.display='none'">
                            <div style="border-top:1px solid #0f172a; padding-top:1px; font-size:0.46rem; font-weight:800; color:#0f172a;">
                                Dirección ENCCO Jutiapa
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <div style="text-align:right;">
                                <div style="font-size:0.48rem; color:#64748b; font-weight:700;">Vigencia: Ciclo ${cycle}</div>
                            </div>
                            <div style="width:30px; height:30px;" title="QR de Verificación">
                                ${qrSvgBack}
                            </div>
                        </div>
                    </div>

                </div>
            `;
        },

        /* ======================================================================
         * 👨‍🏫 2. MODELO CARNET DOCENTE (VERTICAL - CR80)
         * ====================================================================== */

        /**
         * Frente del carné docente vertical (Recreación exacta del modelo oficial)
         */
        renderTeacherCardFrontHtml(teacher) {
            const cycle = (window.STATE && window.STATE.activeCycle) || '2026';
            const name = teacher.name || 'Catedrático Titular';
            const teacherId = teacher.id || 'usr-doc-01';
            const dpi = teacher.cui || teacher.dpi || teacher.id || 'No registrado';
            const renglon = teacher.renglon || '011';

            let teacherArea = teacher.classes || '';
            if (!teacherArea && window.STATE && Array.isArray(window.STATE.pensum)) {
                const subs = window.STATE.pensum
                    .filter(p => (p.teacherId && p.teacherId === teacher.id) || (p.teacher && p.teacher.toLowerCase() === name.toLowerCase()))
                    .map(p => p.subject || p.name)
                    .slice(0, 2);
                if (subs.length > 0) teacherArea = subs.join(', ');
            }
            if (!teacherArea) teacherArea = 'Área Comercial / Contable';

            const barcodeSvg = this.generateBarcodeSvg(teacherId, 20);
            const qrText = `https://comerciojutiapa.github.io/enccojutiapa/?verify=teacher&id=${encodeURIComponent(teacherId)}&nom=${encodeURIComponent(name)}`;
            const qrSvg = this.generateQrSvg(qrText, 28);

            const photoInner = teacher.photoUrl || teacher.photo
                ? `<img src="${teacher.photoUrl || teacher.photo}" alt="${name}" style="width:100%; height:100%; object-fit:cover; display:block;">`
                : this.generateTeacherAvatarSvg(name, 80, 100);

            return `
                <div class="encco-carnet-card encco-carnet-teacher encco-carnet-front" style="width:214px; height:336px; background:#ffffff; border-radius:14px; border:1.5px solid #cbd5e1; box-shadow:0 6px 18px rgba(0,0,0,0.12); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; box-sizing:border-box; text-align:center; user-select:none;">
                    
                    <!-- MARCA DE AGUA EDIFICIO INSTITUCIONAL SUTIL DE FONDO -->
                    <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:170px; height:170px; opacity:0.04; pointer-events:none; z-index:0; background:radial-gradient(circle, rgba(0,64,152,0.15) 0%, rgba(255,255,255,0) 70%);">
                        <svg viewBox="0 0 170 170" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                            <rect x="15" y="45" width="140" height="80" rx="3" fill="#004098" opacity="0.3" />
                            <rect x="30" y="60" width="20" height="25" fill="#ffffff" />
                            <rect x="60" y="60" width="20" height="25" fill="#ffffff" />
                            <rect x="90" y="60" width="20" height="25" fill="#ffffff" />
                            <rect x="120" y="60" width="20" height="25" fill="#ffffff" />
                        </svg>
                    </div>

                    <!-- CÚPULA ARQUEADA AZUL REAL Y CURVA VERDE SUPERIOR -->
                    <svg style="position:absolute; top:0; left:0; width:214px; height:74px; pointer-events:none; z-index:1;" viewBox="0 0 214 74">
                        <path d="M 0,0 L 214,0 L 214,44 C 160,56 54,56 0,44 Z" fill="#004098" />
                        <path d="M 0,44 C 54,56 160,56 214,44 L 214,50 C 160,62 54,62 0,50 Z" fill="#007a3d" />
                    </svg>

                    <!-- ESCUDO OFICIAL ENCCO SUPERIOR CENTRADO -->
                    <div style="position:absolute; top:6px; left:50%; transform:translateX(-50%); width:42px; height:48px; z-index:4; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
                        <img src="logo.png" style="width:100%; height:100%; object-fit:contain; display:block;" alt="Escudo ENCCO">
                    </div>

                    <!-- TÍTULO OFICIAL CARNET DOCENTE (NARANJA PROMINENTE) -->
                    <div style="position:absolute; top:54px; left:0; right:0; text-align:center; font-family:'Outfit', sans-serif; font-size:0.86rem; font-weight:900; color:#ea580c; letter-spacing:1.6px; text-transform:uppercase; z-index:2;">
                        CARNET DOCENTE
                    </div>

                    <!-- CHEVRONS / BRACKETS GEOMÉTRICOS LATERALES (AZUL Y VERDE) -->
                    <svg style="position:absolute; left:0; top:94px; width:10px; height:68px; pointer-events:none; z-index:1;" viewBox="0 0 10 68">
                        <polygon points="0,0 7,10 7,58 0,68" fill="#004098" />
                        <polygon points="7,10 10,14 10,54 7,58" fill="#007a3d" />
                    </svg>
                    <svg style="position:absolute; right:0; top:94px; width:10px; height:68px; pointer-events:none; z-index:1;" viewBox="0 0 10 68">
                        <polygon points="10,0 3,10 3,58 10,68" fill="#004098" />
                        <polygon points="3,10 0,14 0,54 3,58" fill="#007a3d" />
                    </svg>

                    <!-- FOTO CENTRAL CON MARCO DORADO BISELADO (NOTCHED CORNERS) -->
                    <div style="position:absolute; top:80px; left:50%; transform:translateX(-50%); width:80px; height:100px; z-index:4;">
                        <div class="encco-gold-frame-outer" style="width:100%; height:100%;">
                            <div class="encco-gold-frame-middle">
                                <div class="encco-gold-frame-inner">
                                    ${photoInner}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- BLOQUE DE DATOS CENTRADO DEL DOCENTE -->
                    <div style="position:absolute; top:186px; left:8px; right:8px; text-align:center; z-index:3; line-height:1.2;">
                        <div style="font-size:0.46rem; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.4px;">NOMBRE:</div>
                        <div style="font-size:0.64rem; font-weight:900; color:#000000; text-transform:uppercase; max-height:2.3em; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; margin-bottom:2px; padding:0 4px;" title="${name}">
                            ${name}
                        </div>
                        
                        <div style="font-size:0.44rem; font-weight:800; color:#0f172a; text-transform:uppercase;">NÚMERO DE IDENTIFICACIÓN:</div>
                        <div style="font-size:0.58rem; font-weight:900; color:#004098; margin-bottom:2px;">
                            ${dpi}
                        </div>
                        
                        <div style="font-size:0.44rem; font-weight:800; color:#0f172a; text-transform:uppercase;">ÁREA:</div>
                        <div style="font-size:0.54rem; font-weight:800; color:#007a3d; margin-bottom:2px; max-height:1.8em; overflow:hidden; text-overflow:ellipsis; padding:0 4px;" title="${teacherArea}">
                            ${teacherArea}
                        </div>
                        
                        <div style="font-size:0.52rem; font-weight:900; color:#004098; text-transform:uppercase; letter-spacing:0.4px;">
                            DOCENTE <span style="font-size:0.44rem; color:#ea580c; font-weight:800;">[${renglon}]</span>
                        </div>
                    </div>

                    <!-- CONTENEDOR INFERIOR BLANCO RESERVADO (CÓDIGO DE BARRAS + QR) -->
                    <div style="position:absolute; left:8px; right:8px; bottom:12px; height:40px; background:#ffffff; border:1.2px solid #cbd5e1; border-radius:8px; padding:2px 6px; display:flex; align-items:center; justify-content:space-between; gap:4px; box-shadow:0 1px 3px rgba(0,0,0,0.05); z-index:3;">
                        <div style="flex:1; text-align:center; overflow:hidden;">
                            <div style="width:88%; margin:0 auto;">
                                ${barcodeSvg}
                            </div>
                            <div style="font-size:0.44rem; font-family:monospace; color:#334155; font-weight:800; letter-spacing:0.5px; margin-top:1px;">
                                ${teacherId}
                            </div>
                        </div>
                        <div style="flex-shrink:0; border-left:1px solid #e2e8f0; padding-left:4px; display:flex; align-items:center; justify-content:center;" title="Escanear con Celular">
                            ${qrSvg}
                        </div>
                    </div>

                    <!-- BASE INFERIOR VERDE ESMERALDA CON REMATES AZULES -->
                    <svg style="position:absolute; bottom:0; left:0; width:100%; height:9px; pointer-events:none; z-index:1;" viewBox="0 0 214 9" preserveAspectRatio="none">
                        <path d="M 0,2 L 214,2 L 214,5 C 214,8 210,9 204,9 L 10,9 C 4,9 0,8 0,5 Z" fill="#007a3d" />
                        <polygon points="0,0 8,0 0,9" fill="#004098" />
                        <polygon points="214,0 206,0 214,9" fill="#004098" />
                    </svg>

                </div>
            `;
        },

        /**
         * Reverso del carné docente vertical (ultra legible con datos completos de acreditación)
         */
        renderTeacherCardBackHtml(teacher) {
            const cycle = (window.STATE && window.STATE.activeCycle) || '2026';
            const name = teacher.name || 'Catedrático Titular';
            const teacherId = teacher.id || 'usr-doc-01';
            const dpi = teacher.cui || teacher.dpi || teacher.id || 'No registrado';
            const title = teacher.title || 'PEM en Ciencias Comerciales';
            const renglon = teacher.renglon || '011 Presupuestado';
            const email = teacher.email || 'docente@comercio.edu.gt';
            const phone = teacher.telefono || teacher.phone || 'No registrado';

            let teacherSubjects = teacher.classes || '';
            if (!teacherSubjects && window.STATE && Array.isArray(window.STATE.pensum)) {
                const subs = window.STATE.pensum
                    .filter(p => (p.teacherId && p.teacherId === teacher.id) || (p.teacher && p.teacher.toLowerCase() === name.toLowerCase()))
                    .map(p => p.subject || p.name)
                    .slice(0, 3);
                if (subs.length > 0) teacherSubjects = subs.join(', ');
            }
            if (!teacherSubjects) teacherSubjects = 'Ciencias Comerciales';

            const qrTextBack = `https://comerciojutiapa.github.io/enccojutiapa/?verify=teacher&id=${encodeURIComponent(teacherId)}&cycle=${cycle}`;
            const qrSvgBack = this.generateQrSvg(qrTextBack, 32);

            return `
                <div class="encco-carnet-card encco-carnet-teacher encco-carnet-back" style="width:214px; height:336px; background:#ffffff; border-radius:14px; border:1.5px solid #cbd5e1; box-shadow:0 6px 18px rgba(0,0,0,0.12); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; display:flex; flex-direction:column; box-sizing:border-box; padding:10px 12px; justify-content:space-between; text-align:center; user-select:none;">
                    
                    <!-- ENCABEZADO INSTITUCIONAL VERTICAL -->
                    <div style="border-bottom:1.5px solid #006837; padding-bottom:4px;">
                        <span style="font-family:'Outfit', sans-serif; font-size:0.60rem; font-weight:900; color:#006837; text-transform:uppercase; letter-spacing:0.3px; display:block;">
                            REPÚBLICA DE GUATEMALA
                        </span>
                        <span style="font-family:'Outfit', sans-serif; font-size:0.54rem; font-weight:800; color:#007a3d; text-transform:uppercase; display:block;">
                            MINISTERIO DE EDUCACIÓN
                        </span>
                        <span style="font-size:0.48rem; color:#475569; font-weight:600; display:block;">
                            ENCCO Jutiapa 1970 | Código: <strong style="color:#0f172a;">22-01-0014-46</strong>
                        </span>
                        <span style="font-size:0.48rem; color:#004098; font-weight:800; background:#eff6ff; padding:1px 6px; border-radius:3px; display:inline-block; margin-top:2px;">
                            ACREDITACIÓN DOCENTE OFICIAL
                        </span>
                    </div>

                    <!-- FICHA DE DATOS DEL CATEDRÁTICO -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px; font-size:0.52rem; color:#0f172a; text-align:left; line-height:1.3;">
                        <div><strong style="color:#006837;">Catedrático:</strong> <span style="font-weight:700;">${name}</span></div>
                        <div><strong style="color:#006837;">DPI / ID:</strong> <span>${dpi}</span></div>
                        <div><strong style="color:#006837;">Renglón:</strong> <span>${renglon}</span></div>
                        <div><strong style="color:#006837;">Título:</strong> <span>${title}</span></div>
                        <div><strong style="color:#006837;">Asignaturas:</strong> <span style="font-weight:600; color:#0f172a;">${teacherSubjects}</span></div>
                        <div><strong style="color:#006837;">Correo:</strong> <span>${email}</span></div>
                        <div><strong style="color:#006837;">Vigencia:</strong> <span style="font-weight:800; color:#007a3d;">Ciclo Escolar ${cycle}</span></div>
                    </div>

                    <!-- CLÁUSULA DE VALIDEZ -->
                    <div style="font-size:0.46rem; color:#64748b; line-height:1.2; text-align:justify; padding:0 2px;">
                        El titular de este documento es miembro acreditado del Claustro Docente de la Escuela Nacional de Ciencias Comerciales ENCCO Jutiapa. Válido para trámites oficiales, supervisiones y control de acceso.
                    </div>

                    <!-- FIRMA DE DIRECCIÓN, SELLO Y QR DE VERIFICACIÓN -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid #e2e8f0; padding-top:4px;">
                        <div style="text-align:center; width:95px;">
                            <img src="firma_director_sello.png" style="height:25px; object-fit:contain; display:block; margin:0 auto;" onerror="this.style.display='none'">
                            <div style="border-top:1px solid #0f172a; padding-top:1px; font-size:0.46rem; font-weight:800; color:#0f172a;">
                                Dirección ENCCO Jutiapa
                            </div>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                            <div style="width:30px; height:30px;" title="QR de Validación">
                                ${qrSvgBack}
                            </div>
                            <span style="font-size:0.40rem; color:#64748b; font-weight:700;">VERIFICACIÓN</span>
                        </div>
                    </div>

                </div>
            `;
        },

        /* ======================================================================
         * 🔄 COMPATIBILIDAD CON TESTS Y CONTROLADORES PREVIOS
         * ====================================================================== */
        renderCardFrontHtml(student) {
            return this.renderStudentCardFrontHtml(student);
        },
        renderCardBackHtml(student) {
            return this.renderStudentCardBackHtml(student);
        },

        /* ======================================================================
         * 🎛️ 3. ACCIONES INTERACTIVAS Y EVENTOS
         * ====================================================================== */

        /**
         * Alterna entre la pestaña de Estudiantes y Docentes
         */
        switchTab(tabName) {
            this.activeTab = (tabName === 'teachers') ? 'teachers' : 'students';
            renderCarnetsView();
        },

        /**
         * Alterna el lado (frente o reverso) de un carné individual
         */
        toggleCardSide(id, type = 'student') {
            const box = document.getElementById(`carnetCardBox_${id}`);
            if (!box) return;

            if (type === 'teacher') {
                const teachers = this.getTeachersList();
                const teacher = teachers.find(t => t.id === id);
                if (!teacher) return;
                const isShowingFront = box.querySelector('.encco-carnet-front') !== null;
                box.innerHTML = isShowingFront 
                    ? this.renderTeacherCardBackHtml(teacher) 
                    : this.renderTeacherCardFrontHtml(teacher);
            } else {
                const students = (window.STATE && window.STATE.students) ? window.STATE.students : [];
                const student = students.find(s => s.id === id);
                if (!student) return;
                const isShowingFront = box.querySelector('.encco-carnet-front') !== null;
                box.innerHTML = isShowingFront 
                    ? this.renderStudentCardBackHtml(student) 
                    : this.renderStudentCardFrontHtml(student);
            }
        },

        /**
         * Obtiene la nómina de docentes desde STATE.users
         */
        getTeachersList() {
            const users = (window.STATE && Array.isArray(window.STATE.users)) ? window.STATE.users : [];
            return users.filter(u => {
                if (!u) return false;
                if (u.role === 'docente' || u.role === 'profesor_auxiliar') return true;
                if (u.roles && (u.roles.includes('docente') || u.roles.includes('profesor_auxiliar'))) return true;
                if (u.id && String(u.id).startsWith('usr-doc-')) return true;
                return false;
            });
        },

        /**
         * Estado interno de la captura de fotografía
         */
        currentPhotoEntity: null,
        webcamStream: null,

        /**
         * Asegura la existencia del modal interactivo de fotografía en el DOM
         */
        ensurePhotoModalInDom() {
            if (typeof document === 'undefined') return;
            if (document.getElementById('modalCarnetPhoto')) return;

            const modalHtml = `
                <div class="modal-overlay" id="modalCarnetPhoto" style="display:none; position:fixed; inset:0; z-index:99999; background:rgba(15,23,42,0.75); backdrop-filter:blur(4px); align-items:center; justify-content:center; padding:15px;" onclick="if(event.target===this) EnccoCarnets.closePhotoModal()">
                    <div class="modal-container" style="max-width:500px; width:100%; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); display:flex; flex-direction:column; font-family:'Plus Jakarta Sans', sans-serif;">
                        
                        <!-- ENCABEZADO DEL MODAL -->
                        <div style="background:linear-gradient(135deg, #0f5127, #15803d); color:#ffffff; padding:12px 18px; display:flex; justify-content:space-between; align-items:center;">
                            <h3 style="margin:0; font-size:1.02rem; font-weight:800; display:flex; align-items:center; gap:8px; color:#ffffff;">
                                <i class="fa-solid fa-camera-rotate"></i> Actualizar Fotografía Oficial
                            </h3>
                            <button type="button" onclick="EnccoCarnets.closePhotoModal()" style="background:none; border:none; color:#ffffff; font-size:1.3rem; line-height:1; cursor:pointer;">&times;</button>
                        </div>

                        <!-- CUERPO DEL MODAL -->
                        <div style="padding:16px 20px; font-size:0.86rem;">
                            
                            <!-- INFORMACIÓN DEL TITULAR -->
                            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; margin-bottom:14px; display:flex; align-items:center; gap:10px;">
                                <div id="carnetPhotoCurrentAvatar" style="width:44px; height:44px; border-radius:8px; overflow:hidden; border:1.5px solid #d4af37; flex-shrink:0; background:#fff; display:flex; align-items:center; justify-content:center;">
                                    <!-- Avatar o foto actual -->
                                </div>
                                <div style="flex:1; overflow:hidden;">
                                    <div id="carnetPhotoEntityName" style="font-weight:900; color:#0f172a; font-size:0.88rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                        Titular
                                    </div>
                                    <div id="carnetPhotoEntityRole" style="font-size:0.72rem; color:#15803d; font-weight:700;">
                                        DOCENTE
                                    </div>
                                </div>
                            </div>

                            <!-- SELECTOR DE MODO (CÁMARA O ARCHIVO) -->
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
                                <button type="button" id="carnetTabBtnCamera" class="btn btn-primary btn-sm" onclick="EnccoCarnets.startWebcamMode()" style="font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;">
                                    <i class="fa-solid fa-camera"></i> Tomar con Cámara
                                </button>
                                <button type="button" id="carnetTabBtnFile" class="btn btn-outline-secondary btn-sm" onclick="EnccoCarnets.startFileMode()" style="font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;">
                                    <i class="fa-solid fa-upload"></i> Subir Archivo
                                </button>
                            </div>

                            <!-- CONTENEDOR DE CÁMARA WEB EN VIVO -->
                            <div id="carnetWebcamBox" style="display:none; text-align:center; background:#0f172a; border-radius:10px; padding:10px; position:relative; overflow:hidden;">
                                <video id="carnetWebcamVideo" autoplay playsinline style="width:100%; max-height:260px; object-fit:cover; border-radius:8px; border:2px solid #22c55e;"></video>
                                <canvas id="carnetWebcamCanvas" style="display:none;"></canvas>
                                
                                <!-- GUÍA OVALADA PARA ENCUADRE DE ROSTRO -->
                                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:130px; height:160px; border:2px dashed rgba(254,240,138,0.7); border-radius:50%; pointer-events:none;"></div>
                                
                                <div style="margin-top:10px; display:flex; justify-content:center; gap:8px;">
                                    <button type="button" class="btn btn-warning btn-sm" onclick="EnccoCarnets.captureWebcamPhoto()" style="font-weight:800; background:#eab308; color:#0f172a; border:none; padding:6px 14px;">
                                        <i class="fa-solid fa-camera"></i> Capturar Fotografía
                                    </button>
                                </div>
                            </div>

                            <!-- CONTENEDOR DE SUBIDA DE ARCHIVO -->
                            <div id="carnetFileBox" style="display:none; border:2px dashed #cbd5e1; border-radius:10px; padding:25px 15px; text-align:center; background:#f8fafc;">
                                <i class="fa-solid fa-cloud-arrow-up" style="font-size:2.2rem; color:#0284c7; margin-bottom:8px; display:block;"></i>
                                <label class="btn btn-outline-primary btn-sm" style="font-weight:700; cursor:pointer; margin:0 auto 6px auto; display:inline-block;">
                                    <i class="fa-solid fa-folder-open"></i> Seleccionar Imagen (.jpg, .png)
                                    <input type="file" id="carnetLocalFileInput" accept="image/*" style="display:none;" onchange="EnccoCarnets.handleLocalFileSelected(event)">
                                </label>
                                <p style="font-size:0.75rem; color:#64748b; margin:0;">O arrastre una fotografía directamente a este recuadro</p>
                            </div>

                            <!-- PREVIEW DE LA FOTO CAPTURADA / SELECCIONADA -->
                            <div id="carnetCapturedPreviewBox" style="display:none; text-align:center; margin-top:12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px;">
                                <div style="font-size:0.76rem; font-weight:800; color:#166534; margin-bottom:6px;">
                                    <i class="fa-solid fa-circle-check"></i> Fotografía lista para guardar:
                                </div>
                                <img id="carnetCapturedImg" src="" alt="Preview" style="width:90px; height:108px; object-fit:cover; border-radius:8px; border:2.5px solid #d4af37; box-shadow:0 3px 8px rgba(0,0,0,0.15); display:inline-block; margin-bottom:8px;">
                                <div style="display:flex; justify-content:center; gap:8px;">
                                    <button type="button" class="btn btn-success btn-sm" onclick="EnccoCarnets.saveCapturedPhoto()" style="font-weight:800; background:#15803d; border-color:#15803d;">
                                        <i class="fa-solid fa-floppy-disk"></i> Confirmar y Asignar al Carné
                                    </button>
                                </div>
                            </div>

                        </div>

                        <!-- PIE DEL MODAL -->
                        <div style="padding:10px 18px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end;">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="EnccoCarnets.closePhotoModal()">Cerrar</button>
                        </div>

                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        },

        /**
         * Abre el modal de fotografía para Docente o Estudiante
         */
        openPhotoModal(id, type = 'student', defaultMode = 'choice') {
            this.ensurePhotoModalInDom();

            let entity = null;
            let listNode = (type === 'teacher') ? 'users' : 'students';

            if (type === 'teacher') {
                entity = this.getTeachersList().find(t => t.id === id);
            } else {
                entity = (window.STATE && window.STATE.students) ? window.STATE.students.find(s => s.id === id) : null;
            }

            if (!entity) return;

            this.currentPhotoEntity = { id, type, listNode, entity };

            // Cargar datos en el modal
            const nameEl = document.getElementById('carnetPhotoEntityName');
            const roleEl = document.getElementById('carnetPhotoEntityRole');
            const avatarEl = document.getElementById('carnetPhotoCurrentAvatar');

            if (nameEl) nameEl.textContent = entity.name || 'Titular';
            if (roleEl) roleEl.textContent = (type === 'teacher') 
                ? `CATEDRÁTICO / DOCENTE [${entity.renglon || '011'}]` 
                : `ESTUDIANTE REGULAR [${entity.carne || 'ENCCO'}]`;

            if (avatarEl) {
                avatarEl.innerHTML = entity.photoUrl 
                    ? `<img src="${entity.photoUrl}" style="width:100%; height:100%; object-fit:cover;">` 
                    : (type === 'teacher' ? this.generateTeacherAvatarSvg(entity.name, 44, 44) : this.generateStudentAvatarSvg(entity.name, 44, 44));
            }

            // Ocultar previsualizaciones previas
            const prevBox = document.getElementById('carnetCapturedPreviewBox');
            if (prevBox) prevBox.style.display = 'none';

            const modal = document.getElementById('modalCarnetPhoto');
            if (modal) modal.style.display = 'flex';

            if (defaultMode === 'camera') {
                this.startWebcamMode();
            } else if (defaultMode === 'file') {
                this.startFileMode();
            } else {
                this.startWebcamMode();
            }
        },

        /**
         * Inicia el modo de cámara web en vivo
         */
        startWebcamMode() {
            const camBox = document.getElementById('carnetWebcamBox');
            const fileBox = document.getElementById('carnetFileBox');
            const btnCam = document.getElementById('carnetTabBtnCamera');
            const btnFile = document.getElementById('carnetTabBtnFile');

            if (camBox) camBox.style.display = 'block';
            if (fileBox) fileBox.style.display = 'none';
            if (btnCam) { btnCam.className = 'btn btn-primary btn-sm'; }
            if (btnFile) { btnFile.className = 'btn btn-outline-secondary btn-sm'; }

            this.initWebcamStream();
        },

        /**
         * Inicia el modo de subida de archivo
         */
        startFileMode() {
            this.stopWebcam();
            const camBox = document.getElementById('carnetWebcamBox');
            const fileBox = document.getElementById('carnetFileBox');
            const btnCam = document.getElementById('carnetTabBtnCamera');
            const btnFile = document.getElementById('carnetTabBtnFile');

            if (camBox) camBox.style.display = 'none';
            if (fileBox) fileBox.style.display = 'block';
            if (btnCam) { btnCam.className = 'btn btn-outline-secondary btn-sm'; }
            if (btnFile) { btnFile.className = 'btn btn-primary btn-sm'; }
        },

        /**
         * Inicia el stream de video de la cámara web
         */
        initWebcamStream() {
            const video = document.getElementById('carnetWebcamVideo');
            if (!video) return;

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 640 },
                        facingMode: 'user'
                    }
                }).then(stream => {
                    this.webcamStream = stream;
                    video.srcObject = stream;
                }).catch(err => {
                    console.warn('No se pudo iniciar cámara:', err);
                    if (typeof window.showToast === 'function') {
                        window.showToast('No se pudo acceder a la cámara web. Utilice la opción de subir archivo.', 'warning');
                    }
                    this.startFileMode();
                });
            } else {
                this.startFileMode();
            }
        },

        /**
         * Captura la fotografía de la cámara web con centrado y recorte de proporciones
         */
        captureWebcamPhoto() {
            const video = document.getElementById('carnetWebcamVideo');
            const canvas = document.getElementById('carnetWebcamCanvas');
            if (!video || !canvas || !this.webcamStream) return;

            const vW = video.videoWidth || 640;
            const vH = video.videoHeight || 480;
            const targetRatio = 0.8; // 4:5

            let sW, sH, sX, sY;
            if (vW / vH > targetRatio) {
                sH = vH;
                sW = vH * targetRatio;
                sX = (vW - sW) / 2;
                sY = 0;
            } else {
                sW = vW;
                sH = vW / targetRatio;
                sX = 0;
                sY = (vH - sH) / 2;
            }

            canvas.width = 320;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, sX, sY, sW, sH, 0, 0, 320, 400);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
            this.showCapturedPreview(dataUrl);
            this.stopWebcam();
        },

        /**
         * Maneja archivo local seleccionado desde input
         */
        handleLocalFileSelected(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            if (file.size > 3 * 1024 * 1024) {
                alert('La fotografía debe ser menor a 3 MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (evt) => {
                this.showCapturedPreview(evt.target.result);
            };
            reader.readAsDataURL(file);
        },

        /**
         * Muestra previsualización antes de confirmar
         */
        showCapturedPreview(dataUrl) {
            const box = document.getElementById('carnetCapturedPreviewBox');
            const img = document.getElementById('carnetCapturedImg');
            if (box && img) {
                img.src = dataUrl;
                box.style.display = 'block';
            }
        },

        /**
         * Guarda la fotografía en la entidad y sincroniza
         */
        saveCapturedPhoto() {
            const img = document.getElementById('carnetCapturedImg');
            if (!img || !img.src || !this.currentPhotoEntity) return;

            const { entity, listNode } = this.currentPhotoEntity;
            this.applyPhoto(entity, listNode, img.src);
            this.closePhotoModal();
        },

        /**
         * Aplica la foto, persiste en LocalStorage y sincroniza con Firebase
         */
        applyPhoto(entity, listNode, photoDataUrl) {
            entity.photoUrl = photoDataUrl;

            if (typeof window.saveStateToLocalStorage === 'function') {
                window.saveStateToLocalStorage();
            }
            if (typeof window.EnccoCloudSync !== 'undefined' && window.EnccoCloudSync.syncNode && window.STATE) {
                window.EnccoCloudSync.syncNode(listNode, window.STATE[listNode]);
            }

            renderCarnetsView();

            if (typeof window.showToast === 'function') {
                window.showToast(`✅ Fotografía de ${entity.name} actualizada y guardada con éxito.`, 'success');
            }
        },

        /**
         * Detiene la cámara web
         */
        stopWebcam() {
            if (this.webcamStream) {
                this.webcamStream.getTracks().forEach(track => track.stop());
                this.webcamStream = null;
            }
            const video = document.getElementById('carnetWebcamVideo');
            if (video) video.srcObject = null;
        },

        /**
         * Cierra el modal de fotografía y detiene hardware
         */
        closePhotoModal() {
            this.stopWebcam();
            const modal = document.getElementById('modalCarnetPhoto');
            if (modal) modal.style.display = 'none';
            this.currentPhotoEntity = null;
        },

        /**
         * Carga directa de archivo o activación de foto
         */
        promptUploadPhoto(id, type = 'student') {
            this.openPhotoModal(id, type, 'choice');
        },

        /**
         * Acceso directo a selector de archivos
         */
        promptDirectFileUpload(id, type = 'student') {
            let entity = null;
            let listNode = (type === 'teacher') ? 'users' : 'students';

            if (type === 'teacher') {
                entity = this.getTeachersList().find(t => t.id === id);
            } else {
                entity = (window.STATE && window.STATE.students) ? window.STATE.students.find(s => s.id === id) : null;
            }

            if (!entity) return;

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                if (file.size > 3 * 1024 * 1024) {
                    alert('La fotografía debe ser menor a 3 MB.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (evt) => {
                    this.applyPhoto(entity, listNode, evt.target.result);
                };
                reader.readAsDataURL(file);
            };
            input.click();
        },

        /**
         * Impresión individual de un carné (frente y reverso)
         */
        printSingleCard(id, type = 'student') {
            let frontHtml = '';
            let backHtml = '';
            let title = '';

            if (type === 'teacher') {
                const teacher = this.getTeachersList().find(t => t.id === id);
                if (!teacher) return;
                frontHtml = this.renderTeacherCardFrontHtml(teacher);
                backHtml = this.renderTeacherCardBackHtml(teacher);
                title = `Carné Docente - ${teacher.name}`;
            } else {
                const student = (window.STATE && window.STATE.students) ? window.STATE.students.find(s => s.id === id) : null;
                if (!student) return;
                frontHtml = this.renderStudentCardFrontHtml(student);
                backHtml = this.renderStudentCardBackHtml(student);
                title = `Carné Estudiantil - ${student.name}`;
            }

            const printWin = window.open('', '_blank', 'width=850,height=650');
            printWin.document.write(`
                <html>
                    <head>
                        <title>${title}</title>
                        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
                        <style>
                            body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 25px; display:flex; gap:20px; align-items:center; justify-content:center; background:#f8fafc; }
                            .encco-carnet-card { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
                            .encco-gold-frame-outer {
                                background: linear-gradient(135deg, #fce881 0%, #d4af37 25%, #8a6508 50%, #f3e5ab 75%, #b8860b 100%) !important;
                                clip-path: polygon(7px 0%, calc(100% - 7px) 0%, 100% 7px, 100% calc(100% - 7px), calc(100% - 7px) 100%, 7px 100%, 0% calc(100% - 7px), 0% 7px) !important;
                                padding: 2.5px !important;
                                box-sizing: border-box !important;
                                display: flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                            }
                            .encco-gold-frame-middle {
                                width: 100% !important;
                                height: 100% !important;
                                background: #ffffff !important;
                                clip-path: polygon(5.5px 0%, calc(100% - 5.5px) 0%, 100% 5.5px, 100% calc(100% - 5.5px), calc(100% - 5.5px) 100%, 5.5px 100%, 0% calc(100% - 5.5px), 0% 5.5px) !important;
                                padding: 1.5px !important;
                                box-sizing: border-box !important;
                                display: flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                            }
                            .encco-gold-frame-inner {
                                width: 100% !important;
                                height: 100% !important;
                                background: #f8fafc !important;
                                clip-path: polygon(4.5px 0%, calc(100% - 4.5px) 0%, 100% 4.5px, 100% calc(100% - 4.5px), calc(100% - 4.5px) 100%, 4.5px 100%, 0% calc(100% - 4.5px), 0% 4.5px) !important;
                                overflow: hidden !important;
                                display: flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                            }
                            .encco-gold-frame-inner img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
                            @media print {
                                body { background:#fff; padding: 0; }
                                .print-card-wrapper { page-break-inside: avoid; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="print-card-wrapper" style="display:flex; gap:20px; flex-wrap:wrap; justify-content:center;">
                            <div>
                                <div style="font-size:10px; font-weight:700; color:#64748b; margin-bottom:4px; text-align:center;">ANVERSO (FRENTE)</div>
                                ${frontHtml}
                            </div>
                            <div>
                                <div style="font-size:10px; font-weight:700; color:#64748b; margin-bottom:4px; text-align:center;">REVERSO (DATOS)</div>
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
        },

        /**
         * Impresión masiva en hojas tamaño Carta con guías de corte
         */
        printFilteredBatch() {
            const isTeachers = (this.activeTab === 'teachers');
            let itemsToPrint = [];
            let cardsHtml = '';
            let title = '';

            if (isTeachers) {
                const teachers = this.getTeachersList();
                const searchVal = (document.getElementById('carnetsTeacherSearchInput')?.value || '').trim().toLowerCase();
                const renglonFilter = document.getElementById('carnetsTeacherRenglonFilter')?.value || 'ALL';

                itemsToPrint = teachers.filter(t => {
                    if (!t) return false;
                    const matchR = (renglonFilter === 'ALL' || !renglonFilter || (t.renglon || '').toLowerCase() === renglonFilter.toLowerCase());
                    if (!matchR) return false;
                    if (searchVal) {
                        const sName = (t.name || '').toLowerCase();
                        const sTitle = (t.title || '').toLowerCase();
                        const sId = (t.id || '').toLowerCase();
                        if (!sName.includes(searchVal) && !sTitle.includes(searchVal) && !sId.includes(searchVal)) return false;
                    }
                    return true;
                });

                if (itemsToPrint.length === 0) {
                    alert('No hay docentes para imprimir según los filtros.');
                    return;
                }

                title = `Impresión Masiva de Carnés Docentes (${itemsToPrint.length}) - ENCCO Jutiapa`;
                cardsHtml = itemsToPrint.map(t => `
                    <div class="print-carnet-item" style="box-sizing:border-box; border:1px dashed #cbd5e1; padding:3px; border-radius:10px; display:inline-block; margin:3px; page-break-inside:avoid;">
                        ${this.renderTeacherCardFrontHtml(t)}
                    </div>
                `).join('');

            } else {
                const allStudents = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
                const carFilter = document.getElementById('carnetsCareerFilter')?.value || 'ALL';
                const grdFilter = document.getElementById('carnetsGradeFilter')?.value || 'ALL';
                const secFilter = document.getElementById('carnetsSectionFilter')?.value || 'ALL';
                const searchVal = (document.getElementById('carnetsSearchInput')?.value || '').trim().toLowerCase();

                itemsToPrint = allStudents.filter(st => {
                    if (!st) return false;
                    const carMatch = (carFilter === 'ALL' || !carFilter || (st.career || '').toLowerCase() === carFilter.toLowerCase());
                    const grdMatch = (grdFilter === 'ALL' || !grdFilter || (st.grade || '').toLowerCase() === grdFilter.toLowerCase());
                    const secMatch = (secFilter === 'ALL' || !secFilter || (st.section || '').toLowerCase() === secFilter.toLowerCase());
                    if (!carMatch || !grdMatch || !secMatch) return false;
                    if (searchVal) {
                        const sName = (st.name || `${st.firstName || ''} ${st.lastName || ''}`).toLowerCase();
                        const sCarne = (st.carne || '').toLowerCase();
                        const sCode = (st.personalCode || '').toLowerCase();
                        if (!sName.includes(searchVal) && !sCarne.includes(searchVal) && !sCode.includes(searchVal)) return false;
                    }
                    return true;
                });

                if (itemsToPrint.length === 0) {
                    alert('No hay estudiantes seleccionados para imprimir.');
                    return;
                }

                title = `Impresión Masiva de Carnés Estudiantiles (${itemsToPrint.length}) - ENCCO Jutiapa`;
                cardsHtml = itemsToPrint.map(st => `
                    <div class="print-carnet-item" style="box-sizing:border-box; border:1px dashed #cbd5e1; padding:3px; border-radius:10px; display:inline-block; margin:3px; page-break-inside:avoid;">
                        ${this.renderStudentCardFrontHtml(st)}
                    </div>
                `).join('');
            }

            const printWin = window.open('', '_blank', 'width=1050,height=800');
            printWin.document.write(`
                <html>
                    <head>
                        <title>${title}</title>
                        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
                        <style>
                            @page {
                                size: letter portrait;
                                margin: 6mm;
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
                                gap: 3mm;
                                align-items: center;
                            }
                            .print-carnet-item {
                                page-break-inside: avoid;
                            }
                            .encco-carnet-card { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
                            .encco-gold-frame-outer {
                                background: linear-gradient(135deg, #fce881 0%, #d4af37 25%, #8a6508 50%, #f3e5ab 75%, #b8860b 100%) !important;
                                clip-path: polygon(7px 0%, calc(100% - 7px) 0%, 100% 7px, 100% calc(100% - 7px), calc(100% - 7px) 100%, 7px 100%, 0% calc(100% - 7px), 0% 7px) !important;
                                padding: 2.5px !important;
                                box-sizing: border-box !important;
                                display: flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                            }
                            .encco-gold-frame-middle {
                                width: 100% !important;
                                height: 100% !important;
                                background: #ffffff !important;
                                clip-path: polygon(5.5px 0%, calc(100% - 5.5px) 0%, 100% 5.5px, 100% calc(100% - 5.5px), calc(100% - 5.5px) 100%, 5.5px 100%, 0% calc(100% - 5.5px), 0% 5.5px) !important;
                                padding: 1.5px !important;
                                box-sizing: border-box !important;
                                display: flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                            }
                            .encco-gold-frame-inner {
                                width: 100% !important;
                                height: 100% !important;
                                background: #f8fafc !important;
                                clip-path: polygon(4.5px 0%, calc(100% - 4.5px) 0%, 100% 4.5px, 100% calc(100% - 4.5px), calc(100% - 4.5px) 100%, 4.5px 100%, 0% calc(100% - 4.5px), 0% 4.5px) !important;
                                overflow: hidden !important;
                                display: flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                            }
                            .encco-gold-frame-inner img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
                        </style>
                    </head>
                    <body>
                        <div style="text-align:center; margin-bottom:8px; border-bottom:1.5px solid #0f5127; padding-bottom:4px;">
                            <strong style="font-size:12px; color:#15803d; font-family:'Outfit', sans-serif; text-transform:uppercase;">
                                HOJA DE IMPRESIÓN OFICIAL DE CARNÉS (${isTeachers ? 'DOCENTES VERTICALES' : 'ESTUDIANTILES HORIZONTALES'}) — ENCCO JUTIAPA 1970
                            </strong>
                            <div style="font-size:10px; color:#64748b;">
                                Total credenciales: ${itemsToPrint.length} | Ciclo Escolar: ${(window.STATE && window.STATE.activeCycle) || '2026'} | Tamaño CR80
                            </div>
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
        }
    };

    /* ======================================================================
     * 🖥️ 4. RENDERIZADO DE LA VISTA GENERAL DE CARNÉS
     * ====================================================================== */
    function renderCarnetsView() {
        if (typeof document === 'undefined') return;
        const container = document.getElementById('view-carnets');
        if (!container) return;

        const isTeachers = (EnccoCarnets.activeTab === 'teachers');
        const allStudents = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
        const teachers = EnccoCarnets.getTeachersList();

        // Filtros Estudiantes
        const carFilter = document.getElementById('carnetsCareerFilter')?.value || 'ALL';
        const grdFilter = document.getElementById('carnetsGradeFilter')?.value || 'ALL';
        const secFilter = document.getElementById('carnetsSectionFilter')?.value || 'ALL';
        const stSearchVal = (document.getElementById('carnetsSearchInput')?.value || '').trim().toLowerCase();

        // Filtros Docentes
        const docRenglonFilter = document.getElementById('carnetsTeacherRenglonFilter')?.value || 'ALL';
        const docSearchVal = (document.getElementById('carnetsTeacherSearchInput')?.value || '').trim().toLowerCase();

        // Opciones únicas para estudiantes
        const careers = [...new Set(allStudents.map(s => s.career).filter(Boolean))];
        const grades = [...new Set(allStudents.map(s => s.grade).filter(Boolean))];
        const sections = [...new Set(allStudents.map(s => s.section).filter(Boolean))];

        // Lista filtrada de estudiantes
        const filteredStudents = allStudents.filter(st => {
            if (!st) return false;
            const carMatch = (carFilter === 'ALL' || !carFilter || (st.career || '').toLowerCase() === carFilter.toLowerCase());
            const grdMatch = (grdFilter === 'ALL' || !grdFilter || (st.grade || '').toLowerCase() === grdFilter.toLowerCase());
            const secMatch = (secFilter === 'ALL' || !secFilter || (st.section || '').toLowerCase() === secFilter.toLowerCase());
            if (!carMatch || !grdMatch || !secMatch) return false;
            if (stSearchVal) {
                const sName = (st.name || `${st.firstName || ''} ${st.lastName || ''}`).toLowerCase();
                const sCarne = (st.carne || '').toLowerCase();
                const sCode = (st.personalCode || '').toLowerCase();
                if (!sName.includes(stSearchVal) && !sCarne.includes(stSearchVal) && !sCode.includes(stSearchVal)) return false;
            }
            return true;
        });

        // Lista filtrada de docentes
        const filteredTeachers = teachers.filter(t => {
            if (!t) return false;
            const rengMatch = (docRenglonFilter === 'ALL' || !docRenglonFilter || (t.renglon || '').toLowerCase() === docRenglonFilter.toLowerCase());
            if (!rengMatch) return false;
            if (docSearchVal) {
                const sName = (t.name || '').toLowerCase();
                const sTitle = (t.title || '').toLowerCase();
                const sId = (t.id || '').toLowerCase();
                if (!sName.includes(docSearchVal) && !sTitle.includes(docSearchVal) && !sId.includes(docSearchVal)) return false;
            }
            return true;
        });

        const activeCount = isTeachers ? filteredTeachers.length : filteredStudents.length;

        container.innerHTML = `
            <div class="carnets-container" style="padding:10px 0;">
                
                <!-- ENCABEZADO DE SECCIÓN -->
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
                    <div>
                        <h2 style="margin:0; font-size:1.45rem; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:10px;">
                            <i class="fa-solid fa-id-card" style="color:var(--brand-green);"></i>
                            Emisión Oficial de Credenciales y Carnés Institucionales
                        </h2>
                        <p style="margin:4px 0 0 0; font-size:0.85rem; color:#64748b;">
                            Modelos oficiales ENCCO 1970: Carnet Docente (Vertical) y Carnet Estudiantil (Horizontal) con Código de Barras y QR.
                        </p>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button type="button" class="btn btn-primary" onclick="EnccoCarnets.printFilteredBatch()" style="background:#15803d; font-weight:800; box-shadow:0 3px 8px rgba(21,128,61,0.3);">
                            <i class="fa-solid fa-print"></i> Imprimir Lote (${activeCount} Carnés)
                        </button>
                    </div>
                </div>

                <!-- SELECTOR DE PESTAÑAS: ESTUDIANTES (HORIZONTAL) VS DOCENTES (VERTICAL) -->
                <div style="display:flex; gap:8px; border-bottom:2.5px solid #e2e8f0; margin-bottom:16px;">
                    <button type="button" class="btn btn-sm ${!isTeachers ? 'btn-primary' : 'btn-secondary'}" onclick="EnccoCarnets.switchTab('students')" style="font-weight:800; border-radius:8px 8px 0 0; padding:8px 18px; font-size:0.86rem; display:flex; align-items:center; gap:8px; ${!isTeachers ? 'background:#0f5127; border-color:#0f5127; color:#fff;' : 'background:#f1f5f9; color:#475569; border:none;'}">
                        <i class="fa-solid fa-user-graduate"></i> Carnés Estudiantiles (Horizontal)
                        <span class="badge" style="background:${!isTeachers ? '#ffffff' : '#cbd5e1'}; color:${!isTeachers ? '#0f5127' : '#334155'}; margin-left:4px;">${allStudents.length}</span>
                    </button>
                    <button type="button" class="btn btn-sm ${isTeachers ? 'btn-primary' : 'btn-secondary'}" onclick="EnccoCarnets.switchTab('teachers')" style="font-weight:800; border-radius:8px 8px 0 0; padding:8px 18px; font-size:0.86rem; display:flex; align-items:center; gap:8px; ${isTeachers ? 'background:#0d47a1; border-color:#0d47a1; color:#fff;' : 'background:#f1f5f9; color:#475569; border:none;'}">
                        <i class="fa-solid fa-chalkboard-user"></i> Carnés Docentes (Vertical)
                        <span class="badge" style="background:${isTeachers ? '#ffffff' : '#cbd5e1'}; color:${isTeachers ? '#0d47a1' : '#334155'}; margin-left:4px;">${teachers.length}</span>
                    </button>
                </div>

                <!-- BARRA DE FILTROS DEPENDIENDO DE LA PESTAÑA ACTIVA -->
                ${!isTeachers ? `
                    <!-- FILTROS PARA ESTUDIANTES -->
                    <div style="background:#ffffff; border-radius:12px; padding:12px 16px; border:1.5px solid #e2e8f0; margin-bottom:18px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
                        <div style="flex:1; min-width:220px;">
                            <input type="text" id="carnetsSearchInput" class="form-control" placeholder="Buscar por alumno, carné o código personal..." value="${stSearchVal}" oninput="renderCarnetsView()" style="font-size:0.84rem;">
                        </div>
                        <div style="min-width:140px;">
                            <select id="carnetsCareerFilter" class="form-control" onchange="renderCarnetsView()" style="font-size:0.84rem; font-weight:600;">
                                <option value="ALL">-- Todas las Carreras --</option>
                                ${careers.map(c => `<option value="${c}" ${carFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                        <div style="min-width:130px;">
                            <select id="carnetsGradeFilter" class="form-control" onchange="renderCarnetsView()" style="font-size:0.84rem; font-weight:600;">
                                <option value="ALL">-- Todos los Grados --</option>
                                ${grades.map(g => `<option value="${g}" ${grdFilter === g ? 'selected' : ''}>${g}</option>`).join('')}
                            </select>
                        </div>
                        <div style="min-width:110px;">
                            <select id="carnetsSectionFilter" class="form-control" onchange="renderCarnetsView()" style="font-size:0.84rem; font-weight:600;">
                                <option value="ALL">-- Sección --</option>
                                ${sections.map(s => `<option value="${s}" ${secFilter === s ? 'selected' : ''}>Sección "${s}"</option>`).join('')}
                            </select>
                        </div>
                    </div>
                ` : `
                    <!-- FILTROS PARA DOCENTES -->
                    <div style="background:#ffffff; border-radius:12px; padding:12px 16px; border:1.5px solid #e2e8f0; margin-bottom:18px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
                        <div style="flex:1; min-width:240px;">
                            <input type="text" id="carnetsTeacherSearchInput" class="form-control" placeholder="Buscar por nombre de catedrático, título o ID..." value="${docSearchVal}" oninput="renderCarnetsView()" style="font-size:0.84rem;">
                        </div>
                        <div style="min-width:160px;">
                            <select id="carnetsTeacherRenglonFilter" class="form-control" onchange="renderCarnetsView()" style="font-size:0.84rem; font-weight:600;">
                                <option value="ALL">-- Todos los Renglones --</option>
                                <option value="011" ${docRenglonFilter === '011' ? 'selected' : ''}>Renglón 011 (Presupuestado)</option>
                                <option value="021" ${docRenglonFilter === '021' ? 'selected' : ''}>Renglón 021 (Contrato)</option>
                            </select>
                        </div>
                    </div>
                `}

                <!-- CONTADOR Y EXPLICACIÓN -->
                <div style="margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <span style="font-size:0.86rem; color:#475569; font-weight:700;">
                        Mostrando <strong>${activeCount}</strong> ${isTeachers ? 'docentes' : 'estudiantes'} (${isTeachers ? 'Formato Vertical' : 'Formato Horizontal'})
                    </span>
                    <span style="font-size:0.75rem; color:#64748b; font-weight:600;">
                        <i class="fa-solid fa-circle-info"></i> Código de Barras (para pistola) y Código QR (para cámara de celular) integrados.
                    </span>
                </div>

                <!-- GRILLA DE PREVISUALIZACIÓN DE CARNÉS -->
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(${isTeachers ? '230px' : '340px'}, 1fr)); gap:18px; justify-items:center;">
                    ${activeCount === 0 ? `
                        <div style="grid-column:1 / -1; text-align:center; padding:50px 20px; background:#ffffff; border-radius:12px; border:1.5px dashed #cbd5e1; width:100%;">
                            <i class="fa-solid fa-id-card-clip" style="font-size:2.4rem; color:#94a3b8; display:block; margin-bottom:10px;"></i>
                            <h4 style="margin:0; color:#334155;">No se encontraron registros para los filtros seleccionados</h4>
                            <p style="margin:4px 0 0 0; color:#64748b; font-size:0.82rem;">Modifique los términos de búsqueda o los selectores de filtro.</p>
                        </div>
                    ` : (isTeachers ? filteredTeachers : filteredStudents).map(entity => {
                        const isDoc = isTeachers;
                        const cardId = entity.id;
                        const cardHtml = isDoc 
                            ? EnccoCarnets.renderTeacherCardFrontHtml(entity) 
                            : EnccoCarnets.renderStudentCardFrontHtml(entity);

                        return `
                            <div class="carnet-preview-wrapper" style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                                <div id="carnetCardBox_${cardId}">
                                    ${cardHtml}
                                </div>
                                
                                <!-- BOTONES DE ACCIÓN INDIVIDUAL -->
                                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:4px; margin-top:2px;">
                                    <button type="button" class="btn btn-xs btn-outline-secondary" onclick="EnccoCarnets.toggleCardSide('${cardId}', '${isDoc ? 'teacher' : 'student'}')" style="font-size:0.70rem; font-weight:700; padding:2px 7px;" title="Alternar entre Frente y Reverso">
                                        <i class="fa-solid fa-arrows-rotate"></i> Voltear
                                    </button>
                                    <button type="button" class="btn btn-xs btn-outline-primary" onclick="EnccoCarnets.printSingleCard('${cardId}', '${isDoc ? 'teacher' : 'student'}')" style="font-size:0.70rem; font-weight:700; padding:2px 7px;" title="Imprimir carné individual">
                                        <i class="fa-solid fa-print"></i> Imprimir
                                    </button>
                                    <button type="button" class="btn btn-xs btn-outline-warning" onclick="EnccoCarnets.openPhotoModal('${cardId}', '${isDoc ? 'teacher' : 'student'}', 'camera')" style="font-size:0.70rem; font-weight:700; padding:2px 7px; color:#b45309; border-color:#f59e0b;" title="Tomar foto con cámara web en vivo">
                                        <i class="fa-solid fa-camera"></i> Cámara
                                    </button>
                                    <button type="button" class="btn btn-xs btn-outline-success" onclick="EnccoCarnets.promptDirectFileUpload('${cardId}', '${isDoc ? 'teacher' : 'student'}')" style="font-size:0.70rem; font-weight:700; padding:2px 7px;" title="Cargar fotografía desde archivo local">
                                        <i class="fa-solid fa-upload"></i> Archivo
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

            </div>
        `;
    }

    // Exponer EnccoCarnets y renderCarnetsView globalmente
    window.EnccoCarnets = EnccoCarnets;
    window.renderCarnetsView = renderCarnetsView;

})(typeof window !== 'undefined' ? window : global);
