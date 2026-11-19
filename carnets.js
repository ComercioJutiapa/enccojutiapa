/**
 * ======================================================================
 * 🪪 ENCCO OFFICIAL ID CARDS MODULE (carnets.js)
 * Escuela Nacional de Ciencias Comerciales - ENCCO Jutiapa 1970
 * ----------------------------------------------------------------------
 * Copyright (c) 2026 Nehemias Salguero. Jutiapa, Guatemala.
 * Todos los derechos reservados. All Rights Reserved.
 *
 * Desarrollado por: Nehemias Salguero
 * Ubicación: Jutiapa, Guatemala
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
        visibleLimit: 24,
        _searchDebounceTimer: null,

        /**
         * Devuelve el ciclo escolar activo o visualizado (aislamiento 2026 / 2027 / 2028...)
         */
        getActiveCycle() {
            const st = window.STATE || {};
            return String(st.historicalViewingCycle || st.viewingHistoricalCycle || st.activeCycle || new Date().getFullYear() || '2026').trim();
        },

        /**
         * Devuelve la URL base oficial activa (preparada automáticamente para futuro dominio .edu / .edu.gt)
         */
        getPublicBaseUrl() {
            try {
                if (typeof window !== 'undefined' && window.location && window.location.origin && /^https?:/i.test(window.location.origin)) {
                    const host = (window.location.hostname || '').toLowerCase();
                    if (host.endsWith('.edu.gt') || host.endsWith('.edu') || host === 'comerciojutiapa.github.io') {
                        const basePath = window.location.pathname.replace(/\/[^\/]*$/, '/');
                        return `${window.location.origin}${basePath}`;
                    }
                }
            } catch (e) {}
            return 'https://comerciojutiapa.github.io/enccojutiapa/';
        },

        /**
         * Normaliza cualquier valor de sección ("Sección E", "Sec. E", "E") a su letra canónica ("E")
         */
        formatCleanSection(rawSection) {
            if (!rawSection) return 'A';
            if (typeof window.getCleanSectionLetter === 'function') {
                const l = window.getCleanSectionLetter(rawSection);
                if (l) return l;
            }
            const clean = String(rawSection).replace(/^secci[oó]n\s*/i, '').replace(/^sec\.?\s*/i, '').replace(/["']/g, '').trim().toUpperCase();
            return clean ? clean.slice(0, 2) : 'A';
        },

        /**
         * Obtiene los estudiantes estrictamente filtrados por el ciclo escolar activo (sin mezclar ciclos ni egresados)
         */
        getCycleStudentsList() {
            const raw = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
            const cycle = this.getActiveCycle();
            if (typeof window.getCycleFilteredStudents === 'function') {
                return window.getCycleFilteredStudents(raw, cycle);
            }
            return raw.filter(s => {
                if (!s) return false;
                const stLower = String(s.status || '').toLowerCase().trim();
                if (stLower === 'egresado') return false;
                const sCycle = String(s.cycle || s.academicCycle || '').trim();
                return !sCycle || sCycle === cycle;
            });
        },

        loadMoreCards() {
            this.visibleLimit += 24;
            updateCarnetsGridOnly();
        },

        onFilterChange(resetLimit = true) {
            if (resetLimit) this.visibleLimit = 24;
            updateCarnetsGridOnly();
        },

        onSearchInput() {
            if (this._searchDebounceTimer) clearTimeout(this._searchDebounceTimer);
            this._searchDebounceTimer = setTimeout(() => {
                this.visibleLimit = 24;
                updateCarnetsGridOnly();
            }, 150);
        },

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
         * Frente del carné estudiantil horizontal (Diseño Premium CR80 ENCCO 1970)
         */
        renderStudentCardFrontHtml(student) {
            const cycle = this.getActiveCycle();
            const name = (typeof formatStudentDisplayName === 'function' ? formatStudentDisplayName(student, 'lastFirst') : null) || student.name || `${student.lastName || student.apellidos || ''}, ${student.firstName || student.nombres || ''}`.trim() || 'Estudiante';
            const personalCode = (student.personalCode || student.codigoPersonal || '').trim().toUpperCase();
            const carneNo = (student.carne || '').trim();
            const primaryCode = personalCode || carneNo || `ENCCO-${cycle}`;
            const grade = student.grade || student.gradeLabel || '4to Perito Contador';
            const secLetter = this.formatCleanSection(student.section || student.gradeCode || 'A');
            const shift = student.shift || student.jornada || 'Matutina';

            const barcodeSvg = this.generateBarcodeSvg(primaryCode, 21);
            const baseUrl = this.getPublicBaseUrl();
            const qrText = `${baseUrl}?verify=student&code=${encodeURIComponent(primaryCode)}&cycle=${encodeURIComponent(cycle)}`;
            const qrSvg = this.generateQrSvg(qrText, 31);

            const photoInner = student.photoUrl || student.photo
                ? `<img src="${student.photoUrl || student.photo}" alt="${name}" style="width:100%; height:100%; object-fit:cover; display:block;">`
                : this.generateStudentAvatarSvg(name, 74, 94);

            return `
                <div class="encco-carnet-card encco-carnet-student encco-carnet-front" style="width:336px; height:212px; background:linear-gradient(155deg, #ffffff 0%, #f8fafc 68%, #f1f5f9 100%); border-radius:13px; border:1.5px solid #cbd5e1; box-shadow:0 10px 24px rgba(11,44,102,0.16), 0 2px 6px rgba(0,0,0,0.06); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; box-sizing:border-box; text-align:left; user-select:none;">
                    
                    <!-- FONDO DE SEGURIDAD GUILLOCHÉ VECTORIAL + MARCA DE AGUA -->
                    <div style="position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden; opacity:0.065;">
                        <svg width="100%" height="100%" viewBox="0 0 336 212" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="guillocheStudent_${student.id || 'def'}" width="38" height="38" patternUnits="userSpaceOnUse">
                                    <path d="M 0,19 Q 9.5,0 19,19 T 38,19" fill="none" stroke="#0b2c66" stroke-width="0.6"/>
                                    <path d="M 0,19 Q 9.5,38 19,19 T 38,19" fill="none" stroke="#006837" stroke-width="0.6"/>
                                    <circle cx="19" cy="19" r="13" fill="none" stroke="#d4af37" stroke-width="0.55" stroke-dasharray="2,2"/>
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#guillocheStudent_${student.id || 'def'})"/>
                        </svg>
                    </div>

                    <!-- CINTAS POLIGONALES EJECUTIVAS (AZUL MARINO, ESMERALDA, DORADO CHAMPÁN Y NARANJA) -->
                    <svg style="position:absolute; top:0; left:0; width:114px; height:86px; pointer-events:none; z-index:1;" viewBox="0 0 114 86">
                        <defs>
                            <linearGradient id="enccoNavyGrad_${student.id || 'def'}" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#071e47"/>
                                <stop offset="100%" stop-color="#0b3b8c"/>
                            </linearGradient>
                            <linearGradient id="enccoGoldGrad_${student.id || 'def'}" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#f3d87d"/>
                                <stop offset="50%" stop-color="#d4af37"/>
                                <stop offset="100%" stop-color="#a8811c"/>
                            </linearGradient>
                        </defs>
                        <path d="M 0,0 L 89,0 C 85,26 67,56 0,70 Z" fill="url(#enccoNavyGrad_${student.id || 'def'})" />
                        <path d="M 89,0 C 85,26 67,56 0,70 L 0,75 C 71,61 89,28 94,0 Z" fill="#006837" />
                        <path d="M 94,0 C 89,28 71,61 0,75 L 0,79 C 75,65 93,30 99,0 Z" fill="url(#enccoGoldGrad_${student.id || 'def'})" />
                        <path d="M 99,0 C 93,30 75,65 0,79 L 0,82.5 C 78,68 96,32 103,0 Z" fill="#ea580c" />
                    </svg>

                    <!-- ESCUDO OFICIAL ENCCO SUPERIOR IZQUIERDO -->
                    <div style="position:absolute; top:6px; left:8px; width:34px; height:40px; z-index:4; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
                        <img src="logo.png" style="width:100%; height:100%; object-fit:contain; display:block;" alt="Escudo ENCCO">
                    </div>

                    <!-- ENCABEZADO INSTITUCIONAL -->
                    <div style="margin-left:58px; padding:5px 8px 0 0; text-align:center; position:relative; z-index:2;">
                        <div style="font-family:'Outfit', sans-serif; font-size:0.61rem; font-weight:900; color:#0b2c66; letter-spacing:0.35px; line-height:1.15; text-transform:uppercase;">
                            ESCUELA NACIONAL DE CIENCIAS COMERCIALES
                        </div>
                        <div style="font-family:'Outfit', sans-serif; font-size:0.50rem; font-weight:800; color:#006837; letter-spacing:0.9px; line-height:1.15; margin-top:1px;">
                            JUTIAPA 1970 <span style="color:#d4af37;">◆</span> GUATEMALA
                        </div>
                    </div>

                    <!-- CINTA HORIZONTAL PREMIUM CON FILETE DORADO -->
                    <div style="position:relative; z-index:2; background:linear-gradient(90deg, #0b2c66 0%, #0e4a9e 58%, #006837 100%); color:#ffffff; font-family:'Outfit', sans-serif; font-size:0.71rem; font-weight:900; letter-spacing:1.5px; text-transform:uppercase; padding:3px 10px 3px 94px; margin-top:4px; border-bottom:1.5px solid #d4af37; box-shadow:0 2px 6px rgba(11,44,102,0.22); display:flex; align-items:center; justify-content:space-between;">
                        <span>CARNET ESTUDIANTIL</span>
                        <span style="font-size:0.45rem; background:linear-gradient(135deg,#f3d87d,#d4af37); color:#0b2c66; font-weight:900; padding:1px 6px; border-radius:3px; letter-spacing:0.8px;">CICLO ${cycle}</span>
                    </div>

                    <!-- FOTO CON MARCO METÁLICO DORADO-PLATINO -->
                    <div style="position:absolute; left:12px; top:45px; width:74px; height:94px; z-index:4; cursor:pointer; border-radius:7px; padding:2px; background:linear-gradient(135deg, #f3d87d 0%, #d4af37 45%, #cbd5e1 100%); box-shadow:0 4px 10px rgba(11,44,102,0.22);" onclick="EnccoCarnets.openPhotoModal('${student.id}', 'student')" title="Haga clic para tomar o cambiar la fotografía">
                        <div id="carnetPhotoFrame_${student.id}" style="width:100%; height:100%; border-radius:5px; overflow:hidden; background:#ffffff; border:1px solid #ffffff;">
                            ${photoInner}
                        </div>
                    </div>

                    <!-- CHIP METÁLICO DORADO-PLATINO -->
                    <div style="position:absolute; left:92px; top:55px; width:17px; height:13px; z-index:2; border-radius:3px; background:linear-gradient(135deg, #fef3c7 0%, #d4af37 55%, #e2e8f0 100%); border:0.7px solid #b48a1e; display:flex; align-items:center; justify-content:center; opacity:0.92;" title="Chip de Seguridad Institucional">
                        <svg width="13" height="9" viewBox="0 0 14 10" fill="none">
                            <rect x="1" y="1" width="12" height="8" rx="1.5" stroke="#78580e" stroke-width="0.55"/>
                            <line x1="1" y1="5" x2="13" y2="5" stroke="#78580e" stroke-width="0.55"/>
                            <line x1="5" y1="1" x2="5" y2="9" stroke="#78580e" stroke-width="0.55"/>
                            <line x1="9" y1="1" x2="9" y2="9" stroke="#78580e" stroke-width="0.55"/>
                        </svg>
                    </div>

                    <!-- SELLO HOLOGRÁFICO DISCRETO -->
                    <div style="position:absolute; right:10px; top:54px; z-index:2; font-size:0.42rem; font-weight:900; color:#0b2c66; background:linear-gradient(135deg, rgba(243,216,125,0.35), rgba(186,230,253,0.45)); border:0.8px solid rgba(212,175,55,0.65); border-radius:999px; padding:1.5px 6px; letter-spacing:0.6px; text-transform:uppercase;">
                        ✦ ENCCO 1970
                    </div>

                    <!-- BLOQUE DE DATOS DEL ALUMNO -->
                    <div style="position:absolute; left:95px; top:70px; right:10px; z-index:3; line-height:1.18;">
                        <div style="font-size:0.45rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.55px;">ESTUDIANTE</div>
                        <div style="font-size:0.67rem; font-weight:900; color:#0f172a; text-transform:uppercase; line-height:1.14; max-height:2.28em; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; margin-bottom:3px;" title="${name}">
                            ${name}
                        </div>
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; gap:4px;">
                            <div style="white-space:nowrap;">
                                <span style="font-size:0.45rem; font-weight:800; color:#64748b; text-transform:uppercase;">${personalCode ? 'CÓD. MINEDUC:' : 'CARNÉ:'}</span>
                                <span style="font-size:0.62rem; font-weight:900; color:#0b2c66; font-family:'Outfit',monospace; margin-left:2px;">${primaryCode}</span>
                            </div>
                            <div style="font-size:0.44rem; font-weight:800; color:#006837; background:#ecfdf5; border:0.8px solid #86efac; border-radius:4px; padding:1px 5px; white-space:nowrap;">
                                ${shift.toUpperCase()}
                            </div>
                        </div>
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; border:1px solid #e2e8f0; border-left:2.5px solid #006837; border-radius:4px; padding:2px 6px;">
                            <div style="font-size:0.50rem; font-weight:800; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:155px;" title="${grade} • Sección ${secLetter}">
                                ${grade} <span style="color:#006837;">• Sec. ${secLetter}</span>
                            </div>
                            <div style="font-size:0.46rem; font-weight:900; color:#ea580c; text-transform:uppercase; letter-spacing:0.5px;">
                                ACTIVO
                            </div>
                        </div>
                    </div>

                    <!-- CONTENEDOR INFERIOR BLANCO DE ALTA PRECISIÓN (CÓDIGO DE BARRAS + QR) -->
                    <div style="position:absolute; left:10px; right:10px; bottom:9px; height:42px; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:2px 8px; display:flex; align-items:center; justify-content:space-between; gap:6px; box-shadow:0 2px 6px rgba(15,23,42,0.06); z-index:3;">
                        <div style="flex:1; text-align:center; overflow:hidden;">
                            <div style="width:92%; margin:0 auto;">
                                ${barcodeSvg}
                            </div>
                            <div style="font-size:0.46rem; font-family:monospace; color:#0f172a; font-weight:800; letter-spacing:1.1px; margin-top:1px;">
                                ${primaryCode}
                            </div>
                        </div>
                        <div style="flex-shrink:0; border-left:1px solid #e2e8f0; padding-left:6px; display:flex; flex-direction:column; align-items:center; justify-content:center;" title="Escanear para validar credencial oficial">
                            ${qrSvg}
                            <span style="font-size:0.35rem; color:#0b2c66; font-weight:800; letter-spacing:0.5px; margin-top:1px;">VERIFICAR</span>
                        </div>
                    </div>

                    <!-- REMATE INFERIOR DIAGONAL EJECUTIVO -->
                    <svg style="position:absolute; bottom:0; left:0; width:100%; height:6px; pointer-events:none; z-index:1;" viewBox="0 0 336 6" preserveAspectRatio="none">
                        <polygon points="0,0 155,0 148,6 0,6" fill="#0b2c66" />
                        <polygon points="150,0 225,0 218,6 143,6" fill="#006837" />
                        <polygon points="220,0 280,0 273,6 213,6" fill="#d4af37" />
                        <polygon points="275,0 336,0 336,6 268,6" fill="#ea580c" />
                    </svg>

                </div>
            `;
        },

        /**
         * Resuelve el nombre y teléfono del encargado o padre de familia para el carné.
         * Si no hay encargado titular, coloca el de algún padre ingresado (Madre o Padre).
         */
        resolveStudentGuardian(student) {
            if (!student) return { name: 'Padre de Familia', phone: 'No reg.' };
            if (typeof window.getStudentAssignedGuardianInfo === 'function') {
                const info = window.getStudentAssignedGuardianInfo(student);
                if (info && info.isAssigned) {
                    return {
                        name: info.name,
                        phone: info.phoneDisplay
                    };
                }
            }

            const clean = (val) => {
                if (!val || typeof val !== 'string') return '';
                const trimmed = val.trim();
                const lower = trimmed.toLowerCase();
                if (['', 'n/a', 'na', 'no asignado', 'no registrado', 'no registra', 'ninguno', '-', '--', 'null', 'undefined'].includes(lower)) {
                    return '';
                }
                return trimmed;
            };

            // 1. Encargado / Tutor titular
            const titularName = clean(student.guardianName) || clean(student.guardian) || clean(student.tutor) || clean(student.encargado);
            const titularPhone = clean(student.guardianPhone1) || clean(student.guardianPhone) || clean(student.guardianPhone2) || clean(student.tutorPhone);

            if (titularName) {
                return {
                    name: titularName,
                    phone: titularPhone || clean(student.phone) || clean(student.telefono) || 'No reg.'
                };
            }

            // 2. Si no hay encargado titular, colocar el de algún padre ingresado
            const motherName = clean(student.motherName) || clean(student.madre);
            const motherPhone = clean(student.motherPhone1) || clean(student.motherPhone) || clean(student.motherPhone2);

            const fatherName = clean(student.fatherName) || clean(student.padre);
            const fatherPhone = clean(student.fatherPhone1) || clean(student.fatherPhone) || clean(student.fatherPhone2);

            // Si ambos padres están registrados, priorizar el que tenga teléfono disponible
            if (motherName && fatherName) {
                if (motherPhone && !fatherPhone) {
                    return { name: motherName, phone: motherPhone };
                }
                if (fatherPhone && !motherPhone) {
                    return { name: fatherName, phone: fatherPhone };
                }
                return { name: motherName, phone: motherPhone || fatherPhone || clean(student.phone) || clean(student.telefono) || 'No reg.' };
            }

            if (motherName) {
                return {
                    name: motherName,
                    phone: motherPhone || clean(student.phone) || clean(student.telefono) || 'No reg.'
                };
            }

            if (fatherName) {
                return {
                    name: fatherName,
                    phone: fatherPhone || clean(student.phone) || clean(student.telefono) || 'No reg.'
                };
            }

            // 3. Fallback general si no hay ningún dato familiar
            return {
                name: 'Padre de Familia',
                phone: clean(student.phone) || clean(student.telefono) || 'No reg.'
            };
        },

        /**
         * Reverso del carné estudiantil horizontal (Diseño Editorial Premium CR80)
         */
        renderStudentCardBackHtml(student) {
            const cycle = this.getActiveCycle();
            const personalCode = (student.personalCode || student.codigoPersonal || '').trim().toUpperCase() || 'No asignado';
            const carne = (student.carne || '').trim() || personalCode;
            const primaryCode = (student.personalCode || student.codigoPersonal || student.carne || `ENCCO-${cycle}`).trim().toUpperCase();
            const cui = student.cui || 'No registrado';
            const grade = student.grade || student.gradeLabel || 'Perito Contador';
            const secLetter = this.formatCleanSection(student.section || student.gradeCode || 'A');
            const career = student.career || 'Perito Contador';
            const shift = student.shift || student.jornada || 'Matutina';
            const birthDate = student.birthDate || student.fechaNacimiento || '';
            
            const guardianData = this.resolveStudentGuardian(student);
            const guardian = guardianData.name;
            const guardianPhone = guardianData.phone;

            const baseUrl = this.getPublicBaseUrl();
            const qrTextBack = `${baseUrl}?verify=student&code=${encodeURIComponent(primaryCode)}&cycle=${encodeURIComponent(cycle)}`;
            const qrSvgBack = this.generateQrSvg(qrTextBack, 30);

            return `
                <div class="encco-carnet-card encco-carnet-student encco-carnet-back" style="width:336px; height:212px; background:linear-gradient(155deg, #ffffff 0%, #f8fafc 100%); border-radius:13px; border:1.5px solid #cbd5e1; box-shadow:0 10px 24px rgba(11,44,102,0.16), 0 2px 6px rgba(0,0,0,0.06); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; display:flex; flex-direction:column; box-sizing:border-box; padding:8px 12px; justify-content:space-between; text-align:left; user-select:none;">
                    
                    <!-- LÍNEA SUPERIOR DECORATIVA METÁLICA (AZUL, ESMERALDA, DORADO Y NARANJA) -->
                    <div style="position:absolute; top:0; left:0; width:100%; height:3.5px; background:linear-gradient(90deg, #0b2c66 0%, #006837 40%, #d4af37 72%, #ea580c 100%);"></div>

                    <!-- ENCABEZADO MINEDUC REVERSO -->
                    <div style="border-bottom:1.5px solid #006837; padding-bottom:3px; text-align:center; margin-top:2px;">
                        <span style="font-family:'Outfit', sans-serif; font-size:0.62rem; font-weight:900; color:#0b2c66; text-transform:uppercase; letter-spacing:0.4px; display:block;">
                            ESCUELA NACIONAL DE CIENCIAS COMERCIALES
                        </span>
                        <div style="font-size:0.47rem; color:#475569; font-weight:700; display:flex; align-items:center; justify-content:center; gap:4px; margin-top:1px;">
                            <span>Jutiapa, Guatemala</span>
                            <span style="color:#d4af37;">◆</span>
                            <span>Cód. MINEDUC: <strong style="color:#0b2c66; background:#e0f2fe; padding:0.5px 5px; border-radius:3px; border:0.8px solid #bae6fd;">22-01-0014-46</strong></span>
                            <span style="color:#d4af37;">◆</span>
                            <span style="color:#006837; font-weight:800;">Ciclo ${cycle}</span>
                        </div>
                    </div>

                    <!-- FICHA DE DATOS DEL ALUMNO DE ALTA LEGIBILIDAD -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.52rem; color:#0f172a; line-height:1.30; background:#ffffff; border:1px solid #e2e8f0; border-radius:7px; padding:5px 8px; box-shadow:0 1px 3px rgba(15,23,42,0.03);">
                        <div>
                            <div><strong style="color:#0b2c66;">Cód. Personal:</strong> <span style="font-weight:800; color:#0f172a; font-family:'Outfit',monospace;">${personalCode}</span></div>
                            <div><strong style="color:#006837;">Carné Inst.:</strong> <span style="font-weight:700;">${carne}</span></div>
                            <div><strong style="color:#006837;">CUI / DPI:</strong> <span style="font-weight:700;">${cui}</span></div>
                            <div><strong style="color:#006837;">Jornada:</strong> <span>${shift}${birthDate ? ` | Nac: ${birthDate}` : ''}</span></div>
                        </div>
                        <div>
                            <div><strong style="color:#006837;">Grado:</strong> <span style="font-weight:700;">${grade} • Sec. ${secLetter}</span></div>
                            <div><strong style="color:#006837;">Carrera:</strong> <span>${career}</span></div>
                            <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${guardian}"><strong style="color:#006837;">Encargado:</strong> <span style="font-weight:700;">${guardian}</span></div>
                            <div><strong style="color:#ea580c;">Emergencia:</strong> <span style="font-weight:800; color:#c2410c; background:#fff7ed; border:0.7px solid #fdba74; padding:0 4px; border-radius:3px;">${guardianPhone}</span></div>
                        </div>
                    </div>

                    <!-- NORMATIVA INSTITUCIONAL OFICIAL -->
                    <div style="font-size:0.45rem; color:#475569; line-height:1.22; background:#ffffff; border-left:2.5px solid #d4af37; padding-left:5px;">
                        • <strong>Identificación Oficial:</strong> Acredita al portador como alumno regular inscrito en el Ciclo ${cycle}.<br>
                        • <strong>Uso:</strong> Obligatorio para ingreso, asistencia digital, biblioteca y evaluaciones.<br>
                        • <strong>Extravío:</strong> Reportar inmediatamente en Dirección. Documento personal e intransferible.
                    </div>

                    <!-- FIRMA DE DIRECCIÓN, SELLO Y QR DE VERIFICACIÓN -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid #e2e8f0; padding-top:3px;">
                        <div style="text-align:center; width:112px;">
                            <img src="firma_director_sello.png" style="height:24px; object-fit:contain; display:block; margin:0 auto;" onerror="this.style.display='none'">
                            <div style="border-top:1px solid #0b2c66; padding-top:1px; font-size:0.46rem; font-weight:800; color:#0b2c66;">
                                Dirección ENCCO Jutiapa
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <div style="text-align:right;">
                                <div style="font-size:0.48rem; color:#0b2c66; font-weight:800;">Vigencia: Ciclo ${cycle}</div>
                                <div style="font-size:0.40rem; color:#006837; font-weight:800; letter-spacing:0.3px;">✦ VERIFICADO MINEDUC</div>
                            </div>
                            <div style="width:30px; height:30px; border:1px solid #d4af37; border-radius:5px; padding:1px; background:#ffffff;" title="QR de Verificación Oficial">
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
            const cycle = this.getActiveCycle();
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
            const baseUrl = this.getPublicBaseUrl();
            const qrText = `${baseUrl}?verify=teacher&id=${encodeURIComponent(teacherId)}&cycle=${encodeURIComponent(cycle)}`;
            const qrSvg = this.generateQrSvg(qrText, 28);

            const photoInner = teacher.photoUrl || teacher.photo
                ? `<img src="${teacher.photoUrl || teacher.photo}" alt="${name}" style="width:100%; height:100%; object-fit:cover; display:block;">`
                : this.generateTeacherAvatarSvg(name, 80, 100);

            return `
                <div class="encco-carnet-card encco-carnet-teacher encco-carnet-front" style="width:214px; height:336px; background:#ffffff; border-radius:14px; border:1.5px solid #cbd5e1; box-shadow:0 6px 18px rgba(0,0,0,0.12); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; box-sizing:border-box; text-align:center; user-select:none;">
                    
                    <!-- FONDO DE SEGURIDAD GUILLOCHÉ SUTIL -->
                    <div style="position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden; opacity:0.06;">
                        <svg width="100%" height="100%" viewBox="0 0 214 336" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="guillocheTeacher_${teacher.id || 'def'}" width="30" height="30" patternUnits="userSpaceOnUse">
                                    <circle cx="15" cy="15" r="12" fill="none" stroke="#003882" stroke-width="0.5"/>
                                    <path d="M 0,15 Q 7.5,0 15,15 T 30,15" fill="none" stroke="#007a3d" stroke-width="0.5"/>
                                    <path d="M 15,0 Q 30,7.5 15,15 T 15,30" fill="none" stroke="#ea580c" stroke-width="0.3"/>
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#guillocheTeacher_${teacher.id || 'def'})"/>
                        </svg>
                    </div>

                    <!-- CÚPULA ARQUEADA MULTICOLOR Y PLATEADA SUPERIOR -->
                    <svg style="position:absolute; top:0; left:0; width:214px; height:78px; pointer-events:none; z-index:1;" viewBox="0 0 214 78">
                        <path d="M 0,0 L 214,0 L 214,46 C 160,58 54,58 0,46 Z" fill="#003882" />
                        <path d="M 0,46 C 54,58 160,58 214,46 L 214,52 C 160,64 54,64 0,52 Z" fill="#007a3d" />
                        <path d="M 0,52 C 54,64 160,64 214,52 L 214,55 C 160,67 54,67 0,55 Z" fill="#cbd5e1" />
                        <path d="M 0,55 C 54,67 160,67 214,55 L 214,58 C 160,70 54,70 0,58 Z" fill="#ea580c" />
                    </svg>

                    <!-- ESCUDO OFICIAL ENCCO SUPERIOR CENTRADO -->
                    <div style="position:absolute; top:6px; left:50%; transform:translateX(-50%); width:40px; height:46px; z-index:4; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
                        <img src="logo.png" style="width:100%; height:100%; object-fit:contain; display:block;" alt="Escudo ENCCO">
                    </div>

                    <!-- TÍTULO OFICIAL CARNET DOCENTE -->
                    <div style="position:absolute; top:58px; left:0; right:0; text-align:center; font-family:'Outfit', sans-serif; font-size:0.86rem; font-weight:900; color:#ea580c; letter-spacing:1.6px; text-transform:uppercase; z-index:2; text-shadow:0 1px 2px rgba(255,255,255,0.8);">
                        CARNET DOCENTE
                    </div>

                    <!-- CHEVRONS GEOMÉTRICOS LATERALES MODERNOS (AZUL, VERDE, NARANJA Y PLATEADO) -->
                    <svg style="position:absolute; left:0; top:98px; width:12px; height:68px; pointer-events:none; z-index:1;" viewBox="0 0 12 68">
                        <polygon points="0,0 8,10 8,58 0,68" fill="#003882" />
                        <polygon points="8,10 10,13 10,55 8,58" fill="#007a3d" />
                        <polygon points="10,13 12,16 12,52 10,55" fill="#ea580c" />
                    </svg>
                    <svg style="position:absolute; right:0; top:98px; width:12px; height:68px; pointer-events:none; z-index:1;" viewBox="0 0 12 68">
                        <polygon points="12,0 4,10 4,58 12,68" fill="#003882" />
                        <polygon points="4,10 2,13 2,55 4,58" fill="#007a3d" />
                        <polygon points="2,13 0,16 0,52 2,55" fill="#ea580c" />
                    </svg>

                    <!-- FOTO CENTRAL CON MARCO PLATEADO PLATINO BISELADO (NOTCHED CORNERS) -->
                    <div style="position:absolute; top:82px; left:50%; transform:translateX(-50%); width:80px; height:100px; z-index:4; cursor:pointer;" onclick="EnccoCarnets.openPhotoModal('${teacher.id}', 'teacher')" title="Haga clic para tomar o cambiar la fotografía">
                        <div class="encco-gold-frame-outer" style="width:100%; height:100%;">
                            <div class="encco-gold-frame-middle">
                                <div class="encco-gold-frame-inner" id="carnetPhotoFrame_${teacher.id}">
                                    ${photoInner}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- BLOQUE DE DATOS CENTRADO DEL DOCENTE -->
                    <div style="position:absolute; top:188px; left:8px; right:8px; text-align:center; z-index:3; line-height:1.2;">
                        <div style="font-size:0.46rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.4px;">NOMBRE:</div>
                        <div style="font-size:0.64rem; font-weight:900; color:#0f172a; text-transform:uppercase; max-height:2.3em; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; margin-bottom:2px; padding:0 4px;" title="${name}">
                            ${name}
                        </div>
                        
                        <div style="font-size:0.44rem; font-weight:800; color:#64748b; text-transform:uppercase;">NÚMERO DE IDENTIFICACIÓN:</div>
                        <div style="font-size:0.58rem; font-weight:900; color:#003882; font-family:'Outfit',monospace; margin-bottom:2px;">
                            ${dpi}
                        </div>
                        
                        <div style="font-size:0.44rem; font-weight:800; color:#64748b; text-transform:uppercase;">ÁREA:</div>
                        <div style="font-size:0.54rem; font-weight:800; color:#007a3d; margin-bottom:3px; max-height:1.8em; overflow:hidden; text-overflow:ellipsis; padding:0 4px;" title="${teacherArea}">
                            ${teacherArea}
                        </div>
                        
                        <div style="display:inline-block; background:linear-gradient(90deg, #eff6ff 0%, #f0fdf4 100%); border:1px solid #cbd5e1; border-radius:5px; padding:1.5px 8px;">
                            <span style="font-size:0.52rem; font-weight:900; color:#003882; text-transform:uppercase; letter-spacing:0.5px;">DOCENTE</span>
                            <span style="font-size:0.46rem; color:#ea580c; font-weight:800; margin-left:3px;">[${renglon}]</span>
                        </div>
                    </div>

                    <!-- CONTENEDOR INFERIOR BLANCO RESERVADO (CÓDIGO DE BARRAS + QR + MARCO PLATEADO) -->
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

                    <!-- BASE INFERIOR MULTICOLOR (AZUL, VERDE, PLATEADO Y NARANJA) -->
                    <svg style="position:absolute; bottom:0; left:0; width:100%; height:9px; pointer-events:none; z-index:1;" viewBox="0 0 214 9" preserveAspectRatio="none">
                        <polygon points="0,0 214,0 214,2 0,2" fill="#cbd5e1" />
                        <path d="M 0,2 L 214,2 L 214,5 C 214,8 210,9 204,9 L 10,9 C 4,9 0,8 0,5 Z" fill="#007a3d" />
                        <polygon points="0,0 8,0 0,9" fill="#003882" />
                        <polygon points="214,0 206,0 214,9" fill="#ea580c" />
                    </svg>

                </div>
            `;
        },

        /**
         * Reverso del carné docente vertical (ultra legible con datos completos de acreditación)
         */
        renderTeacherCardBackHtml(teacher) {
            const cycle = this.getActiveCycle();
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

            const baseUrl = this.getPublicBaseUrl();
            const qrTextBack = `${baseUrl}?verify=teacher&id=${encodeURIComponent(teacherId)}&cycle=${encodeURIComponent(cycle)}`;
            const qrSvgBack = this.generateQrSvg(qrTextBack, 32);

            return `
                <div class="encco-carnet-card encco-carnet-teacher encco-carnet-back" style="width:214px; height:336px; background:#ffffff; border-radius:14px; border:1.5px solid #cbd5e1; box-shadow:0 6px 18px rgba(0,0,0,0.12); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; display:flex; flex-direction:column; box-sizing:border-box; padding:10px 12px; justify-content:space-between; text-align:center; user-select:none;">
                    
                    <!-- LÍNEA SUPERIOR DECORATIVA TRICOLOR Y PLATEADA -->
                    <div style="position:absolute; top:0; left:0; width:100%; height:3px; background:linear-gradient(90deg, #003882 0%, #007a3d 35%, #cbd5e1 65%, #ea580c 100%);"></div>

                    <!-- ENCABEZADO INSTITUCIONAL VERTICAL -->
                    <div style="border-bottom:1.5px solid #007a3d; padding-bottom:4px; margin-top:2px;">
                        <span style="font-family:'Outfit', sans-serif; font-size:0.60rem; font-weight:900; color:#003882; text-transform:uppercase; letter-spacing:0.3px; display:block;">
                            REPÚBLICA DE GUATEMALA
                        </span>
                        <span style="font-family:'Outfit', sans-serif; font-size:0.54rem; font-weight:800; color:#007a3d; text-transform:uppercase; display:block;">
                            MINISTERIO DE EDUCACIÓN
                        </span>
                        <span style="font-size:0.48rem; color:#475569; font-weight:600; display:block;">
                            ENCCO Jutiapa 1970 | Código: <strong style="color:#003882; background:#e0f2fe; padding:0.5px 4px; border-radius:3px;">22-01-0014-46</strong>
                        </span>
                        <span style="font-size:0.48rem; color:#003882; font-weight:800; background:linear-gradient(90deg, #eff6ff, #f8fafc); border:0.8px solid #cbd5e1; padding:1.5px 8px; border-radius:3px; display:inline-block; margin-top:2px; letter-spacing:0.3px;">
                            ACREDITACIÓN DOCENTE OFICIAL
                        </span>
                    </div>

                    <!-- FICHA DE DATOS DEL CATEDRÁTICO -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px; font-size:0.52rem; color:#0f172a; text-align:left; line-height:1.3;">
                        <div><strong style="color:#003882;">Catedrático:</strong> <span style="font-weight:700;">${name}</span></div>
                        <div><strong style="color:#007a3d;">DPI / ID:</strong> <span>${dpi}</span></div>
                        <div><strong style="color:#007a3d;">Renglón:</strong> <span>${renglon}</span></div>
                        <div><strong style="color:#007a3d;">Título:</strong> <span>${title}</span></div>
                        <div><strong style="color:#007a3d;">Asignaturas:</strong> <span style="font-weight:600; color:#0f172a;">${teacherSubjects}</span></div>
                        <div><strong style="color:#007a3d;">Correo:</strong> <span>${email}</span></div>
                        <div><strong style="color:#ea580c;">Vigencia:</strong> <span style="font-weight:800; color:#007a3d;">Ciclo Escolar ${cycle}</span></div>
                    </div>

                    <!-- CLÁUSULA DE VALIDEZ -->
                    <div style="font-size:0.46rem; color:#64748b; line-height:1.2; text-align:justify; padding:0 2px; border-left:2px solid #003882; padding-left:4px;">
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
                            <div style="width:30px; height:30px; border:1px solid #cbd5e1; border-radius:4px; padding:1px; background:#ffffff;" title="QR de Validación">
                                ${qrSvgBack}
                            </div>
                            <span style="font-size:0.40rem; color:#007a3d; font-weight:800; letter-spacing:0.5px;">VERIFICACIÓN</span>
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
                if (!u || u.active === false) return false;
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
        webcamFacingMode: 'user', // 'user' | 'environment'

        /**
         * Ajusta, recorta y optimiza cualquier imagen (incluso archivos de 10-50MB)
         * para cumplir estrictamente con la formalidad y proporciones oficiales del carnet (4:5 vertical, 360x450px).
         * @param {File|Blob|string|HTMLImageElement|HTMLVideoElement} source
         * @returns {Promise<string>} Data URL en formato JPEG optimizado (~35-65 KB)
         */
        async processImageToCarnetFormat(source) {
            return new Promise((resolve, reject) => {
                const targetWidth = 360;
                const targetHeight = 450;
                const targetRatio = targetWidth / targetHeight; // 0.8 (4:5 formal)

                const processDimensions = (srcW, srcH, drawFn) => {
                    try {
                        if (!srcW || !srcH) {
                            return reject(new Error('Dimensiones de imagen inválidas'));
                        }

                        const srcRatio = srcW / srcH;
                        let cropW, cropH, cropX, cropY;

                        if (srcRatio > targetRatio) {
                            // La imagen es apaisada/horizontal -> Recortar laterales centrados
                            cropH = srcH;
                            cropW = Math.round(srcH * targetRatio);
                            cropX = Math.round((srcW - cropW) / 2);
                            cropY = 0;
                        } else {
                            // La imagen es más alta -> Recortar con sesgo al tercio superior para encuadrar el rostro
                            cropW = srcW;
                            cropH = Math.round(srcW / targetRatio);
                            cropX = 0;
                            const excessY = srcH - cropH;
                            // 20% del exceso arriba para dar aire a la cabeza sin cortarla
                            cropY = Math.max(0, Math.min(Math.round(excessY * 0.20), excessY));
                        }

                        let canvas;
                        if (typeof document !== 'undefined') {
                            canvas = document.createElement('canvas');
                        } else {
                            // Entorno de prueba Node sin DOM
                            return resolve(typeof source === 'string' ? source : 'data:image/jpeg;base64,/9j/mockProcessedPhoto');
                        }

                        canvas.width = targetWidth;
                        canvas.height = targetHeight;
                        const ctx = canvas.getContext('2d');

                        // Fondo blanco institucional de respaldo
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, targetWidth, targetHeight);

                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';

                        drawFn(ctx, cropX, cropY, cropW, cropH, 0, 0, targetWidth, targetHeight);

                        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
                        resolve(dataUrl);
                    } catch (err) {
                        reject(err);
                    }
                };

                // 1. Si es elemento de video en vivo
                if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) {
                    const srcW = source.videoWidth || 640;
                    const srcH = source.videoHeight || 480;
                    return processDimensions(srcW, srcH, (ctx, sx, sy, sw, sh, dx, dy, dw, dh) => {
                        ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
                    });
                }

                // 2. Si es imagen ya cargada
                if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
                    if (source.complete) {
                        const srcW = source.naturalWidth || source.width;
                        const srcH = source.naturalHeight || source.height;
                        return processDimensions(srcW, srcH, (ctx, sx, sy, sw, sh, dx, dy, dw, dh) => {
                            ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
                        });
                    }
                }

                // 3. Si es dataUrl en texto
                if (typeof source === 'string' && source.startsWith('data:')) {
                    if (typeof Image === 'undefined') {
                        return resolve(source);
                    }
                    const img = new Image();
                    img.onload = () => {
                        const srcW = img.naturalWidth || img.width;
                        const srcH = img.naturalHeight || img.height;
                        processDimensions(srcW, srcH, (ctx, sx, sy, sw, sh, dx, dy, dw, dh) => {
                            ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
                        });
                    };
                    img.onerror = (e) => reject(e);
                    img.src = source;
                    return;
                }

                // 4. Si es archivo local (File / Blob) - sin importar el tamaño
                if (typeof Blob !== 'undefined' && source instanceof Blob) {
                    // Si el navegador soporta createImageBitmap (rápido y no satura memoria con fotos pesadas)
                    if (typeof window !== 'undefined' && window.createImageBitmap) {
                        window.createImageBitmap(source)
                            .then(bmp => {
                                const srcW = bmp.width;
                                const srcH = bmp.height;
                                processDimensions(srcW, srcH, (ctx, sx, sy, sw, sh, dx, dy, dw, dh) => {
                                    ctx.drawImage(bmp, sx, sy, sw, sh, dx, dy, dw, dh);
                                });
                            })
                            .catch(() => {
                                // Fallback a FileReader
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    const img = new Image();
                                    img.onload = () => {
                                        const srcW = img.naturalWidth || img.width;
                                        const srcH = img.naturalHeight || img.height;
                                        processDimensions(srcW, srcH, (ctx, sx, sy, sw, sh, dx, dy, dw, dh) => {
                                            ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
                                        });
                                    };
                                    img.onerror = (err) => reject(err);
                                    img.src = e.target.result;
                                };
                                reader.onerror = (err) => reject(err);
                                reader.readAsDataURL(source);
                            });
                    } else if (typeof FileReader !== 'undefined') {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const img = new Image();
                            img.onload = () => {
                                const srcW = img.naturalWidth || img.width;
                                const srcH = img.naturalHeight || img.height;
                                processDimensions(srcW, srcH, (ctx, sx, sy, sw, sh, dx, dy, dw, dh) => {
                                    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
                                });
                            };
                            img.onerror = (err) => reject(err);
                            img.src = e.target.result;
                        };
                        reader.onerror = (err) => reject(err);
                        reader.readAsDataURL(source);
                    } else {
                        resolve('data:image/jpeg;base64,/9j/mockProcessedPhoto');
                    }
                    return;
                }

                // Fallback si no coincide ningún tipo
                resolve(typeof source === 'string' ? source : 'data:image/jpeg;base64,/9j/mockProcessedPhoto');
            });
        },

        /**
         * Asegura la existencia del modal interactivo de fotografía en el DOM
         */
        ensurePhotoModalInDom() {
            if (typeof document === 'undefined') return;
            if (document.getElementById('modalCarnetPhoto')) return;

            const modalHtml = `
                <div class="modal-overlay" id="modalCarnetPhoto" style="display:none; position:fixed; inset:0; z-index:999999; background:rgba(15,23,42,0.75); backdrop-filter:blur(4px); align-items:center; justify-content:center; padding:15px;" onclick="if(event.target===this) EnccoCarnets.closePhotoModal()">
                    <div class="modal-container" style="max-width:500px; width:100%; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); display:flex; flex-direction:column; font-family:'Plus Jakarta Sans', sans-serif;">
                        
                        <!-- ENCABEZADO DEL MODAL -->
                        <div style="background:linear-gradient(135deg, #0f5127, #15803d); color:#ffffff; padding:12px 18px; display:flex; justify-content:space-between; align-items:center;">
                            <h3 style="margin:0; font-size:1.02rem; font-weight:800; display:flex; align-items:center; gap:8px; color:#ffffff;">
                                <i class="fa-solid fa-camera-rotate"></i> Fotografía Oficial del Carné
                            </h3>
                            <button type="button" onclick="EnccoCarnets.closePhotoModal()" style="background:none; border:none; color:#ffffff; font-size:1.3rem; line-height:1; cursor:pointer;" title="Cerrar">&times;</button>
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

                            <!-- SELECTOR DE MODO (CÁMARA WEB, CÁMARA NATIVA O ARCHIVO) -->
                            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:14px;">
                                <button type="button" id="carnetTabBtnCamera" class="btn btn-primary btn-sm" onclick="EnccoCarnets.startWebcamMode()" style="font-weight:700; display:flex; align-items:center; justify-content:center; gap:5px; font-size:0.78rem;">
                                    <i class="fa-solid fa-video"></i> Cámara Web
                                </button>
                                <label class="btn btn-warning btn-sm" style="font-weight:800; display:flex; align-items:center; justify-content:center; gap:5px; font-size:0.78rem; cursor:pointer; margin:0; background:#f59e0b; color:#ffffff; border:none; box-shadow:0 1px 4px rgba(245,158,11,0.3);" title="Tomar foto directa con la cámara nativa del teléfono, tableta o laptop">
                                    <i class="fa-solid fa-camera"></i> Cámara Nativa
                                    <input type="file" accept="image/*" capture="user" style="display:none;" onchange="EnccoCarnets.handleLocalFileSelected(event)">
                                </label>
                                <button type="button" id="carnetTabBtnFile" class="btn btn-outline-secondary btn-sm" onclick="EnccoCarnets.startFileMode()" style="font-weight:700; display:flex; align-items:center; justify-content:center; gap:5px; font-size:0.78rem;">
                                    <i class="fa-solid fa-upload"></i> Subir Archivo
                                </button>
                            </div>

                            <!-- CONTENEDOR DE CÁMARA WEB EN VIVO -->
                            <div id="carnetWebcamBox" style="display:none; text-align:center; background:#0f172a; border-radius:10px; padding:10px; position:relative; overflow:hidden;">
                                <!-- SELECTOR DINÁMICO DE DISPOSITIVOS DE CÁMARA (SI HAY MÁS DE 1 CONECTADA) -->
                                <div id="carnetCameraSelectRow" style="display:none; margin-bottom:8px; text-align:left;">
                                    <label style="font-size:0.72rem; color:#94a3b8; font-weight:700; display:block; margin-bottom:2px;">
                                        <i class="fa-solid fa-video"></i> Seleccionar Cámara Conectada:
                                    </label>
                                    <select id="carnetCameraDeviceSelect" class="form-control form-control-sm" onchange="EnccoCarnets.onCameraDeviceChanged(this.value)" style="font-size:0.75rem; background:#1e293b; color:#ffffff; border-color:#475569; height:30px; font-weight:700;">
                                    </select>
                                </div>

                                <div style="position:relative; display:inline-block; width:100%; max-width:320px; overflow:hidden; border-radius:8px;">
                                    <video id="carnetWebcamVideo" autoplay playsinline muted style="width:100%; max-height:260px; object-fit:cover; border-radius:8px; border:2px solid #22c55e; display:block; background:#000;"></video>
                                    <canvas id="carnetWebcamCanvas" style="display:none;"></canvas>
                                    
                                    <!-- GUÍA OVALADA PARA ENCUADRE DE ROSTRO FORMAL -->
                                    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:130px; height:165px; border:2.5px dashed rgba(254,240,138,0.85); border-radius:50%; pointer-events:none; box-shadow:0 0 0 9999px rgba(15,23,42,0.25);"></div>
                                    <div style="position:absolute; bottom:6px; left:0; right:0; text-align:center; color:#fef08a; font-size:0.68rem; font-weight:800; text-shadow:0 1px 3px rgba(0,0,0,0.8); pointer-events:none;">
                                        Encuadre el rostro de frente
                                    </div>
                                </div>
                                
                                <div style="margin-top:10px; display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
                                    <button type="button" class="btn btn-warning btn-sm" onclick="EnccoCarnets.captureWebcamPhoto()" style="font-weight:800; background:#eab308; color:#0f172a; border:none; padding:6px 16px;">
                                        <i class="fa-solid fa-camera"></i> Capturar Fotografía
                                    </button>
                                    <button type="button" class="btn btn-outline-light btn-sm" onclick="EnccoCarnets.toggleCameraFacing()" style="font-weight:700; padding:6px 12px;" title="Cambiar cámara frontal / trasera">
                                        <i class="fa-solid fa-camera-rotate"></i> Cambiar Cámara
                                    </button>
                                </div>

                                <!-- AVISO DE DIAGNÓSTICO Y ACCESO ALTERNATIVO SI FALLA LA CÁMARA DIRECTA -->
                                <div id="carnetCamNotice" style="display:none; margin-top:10px; padding:10px 14px; background:#fffbeb; border:1.5px solid #fde68a; border-radius:8px; color:#92400e; font-size:0.75rem; text-align:left; line-height:1.4;">
                                    <div id="carnetCamNoticeText" style="margin-bottom:8px;"></div>
                                    <div style="text-align:center;">
                                        <label class="btn btn-warning btn-sm" style="font-weight:800; background:#f59e0b; color:#ffffff; border:none; cursor:pointer; padding:6px 14px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(245,158,11,0.3);">
                                            <i class="fa-solid fa-camera"></i> Tomar con Cámara del Dispositivo (Nativa)
                                            <input type="file" accept="image/*" capture="user" style="display:none;" onchange="EnccoCarnets.handleLocalFileSelected(event)">
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- CONTENEDOR DE SUBIDA DE ARCHIVO (CON DRAG & DROP Y AJUSTE DE CUALQUIER TAMAÑO) -->
                            <div id="carnetFileBox" style="display:none; border:2px dashed #cbd5e1; border-radius:10px; padding:25px 15px; text-align:center; background:#f8fafc; transition:all 0.2s ease;"
                                ondragover="event.preventDefault(); this.style.borderColor='#16a34a'; this.style.background='#f0fdf4';"
                                ondragleave="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc';"
                                ondrop="event.preventDefault(); this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; if(event.dataTransfer.files && event.dataTransfer.files[0]) EnccoCarnets.processAndShowFile(event.dataTransfer.files[0]);">
                                <i class="fa-solid fa-cloud-arrow-up" style="font-size:2.4rem; color:#0284c7; margin-bottom:8px; display:block;"></i>
                                <label class="btn btn-outline-primary btn-sm" style="font-weight:700; cursor:pointer; margin:0 auto 6px auto; display:inline-block;">
                                    <i class="fa-solid fa-folder-open"></i> Seleccionar Imagen (Cualquier tamaño)
                                    <input type="file" id="carnetLocalFileInput" accept="image/*" style="display:none;" onchange="EnccoCarnets.handleLocalFileSelected(event)">
                                </label>
                                <p style="font-size:0.75rem; color:#64748b; margin:0;">
                                    Arrastre una fotografía o selecciónela. Se ajustará y optimizará automáticamente a la formalidad del carné.
                                </p>
                            </div>

                            <!-- PREVIEW DE LA FOTO FORMAL AJUSTADA -->
                            <div id="carnetCapturedPreviewBox" style="display:none; text-align:center; margin-top:12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px;">
                                <div style="font-size:0.78rem; font-weight:800; color:#166534; margin-bottom:6px;">
                                    <i class="fa-solid fa-circle-check"></i> Fotografía formal encuadrada (360×450 px):
                                </div>
                                <div style="display:inline-block; padding:3px; background:linear-gradient(135deg, #fce881, #d4af37, #8a6508); border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.15); margin-bottom:8px;">
                                    <img id="carnetCapturedImg" src="" alt="Preview" style="width:100px; height:125px; object-fit:cover; border-radius:6px; display:block;">
                                </div>
                                <div style="font-size:0.72rem; color:#475569; margin-bottom:8px;">
                                    Ajustada automáticamente al formato y formalidad oficial del carné.
                                </div>
                                <div style="display:flex; justify-content:center; gap:8px;">
                                    <button type="button" class="btn btn-success btn-sm" onclick="EnccoCarnets.saveCapturedPhoto()" style="font-weight:800; background:#15803d; border-color:#15803d;">
                                        <i class="fa-solid fa-floppy-disk"></i> Confirmar y Asignar al Carné
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="EnccoCarnets.retryPhoto()" style="font-weight:700;">
                                        <i class="fa-solid fa-arrow-rotate-left"></i> Cambiar
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
                : `ESTUDIANTE REGULAR [${entity.carne || entity.personalCode || 'ENCCO'}]`;

            if (avatarEl) {
                avatarEl.innerHTML = entity.photoUrl 
                    ? `<img src="${entity.photoUrl}" style="width:100%; height:100%; object-fit:cover;">` 
                    : (type === 'teacher' ? this.generateTeacherAvatarSvg(entity.name, 44, 44) : this.generateStudentAvatarSvg(entity.name, 44, 44));
            }

            // Ocultar previsualizaciones previas
            const prevBox = document.getElementById('carnetCapturedPreviewBox');
            if (prevBox) prevBox.style.display = 'none';

            const modal = document.getElementById('modalCarnetPhoto');
            if (modal) {
                modal.classList.add('active');
                modal.style.setProperty('display', 'flex', 'important');
                modal.style.display = 'flex';
                modal.style.visibility = 'visible';
                modal.style.opacity = '1';
                modal.style.pointerEvents = 'auto';
            }

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
         * Alterna entre cámara frontal y trasera en dispositivos móviles/tablets
         */
        toggleCameraFacing() {
            this.webcamFacingMode = (this.webcamFacingMode === 'user') ? 'environment' : 'user';
            this.stopWebcam();
            this.initWebcamStream();
            if (typeof window.showToast === 'function') {
                window.showToast(`Cámara cambiada a: ${this.webcamFacingMode === 'user' ? 'Frontal' : 'Trasera'}`, 'info');
            }
        },

        /**
         * Manejador al cambiar de cámara en el selector desplegable
         */
        async onCameraDeviceChanged(deviceId) {
            this.selectedVideoDeviceId = deviceId;
            this.stopWebcam();
            await this.initWebcamStream();
        },

        /**
         * Inicia el stream de video de la cámara web (frontal o trasera, con fallback seguro y diagnóstico)
         */
        async initWebcamStream() {
            const video = document.getElementById('carnetWebcamVideo');
            const notice = document.getElementById('carnetCamNotice');
            if (notice) notice.style.display = 'none';

            // 1. Detener cualquier stream anterior en este modal
            this.stopWebcam();

            // 2. Detener streams que pudieran estar bloqueando el hardware de la cámara en otras partes de la página
            if (typeof window !== 'undefined') {
                if (window._attendanceCameraStream) {
                    try { window._attendanceCameraStream.getTracks().forEach(t => t.stop()); window._attendanceCameraStream = null; } catch(e) {}
                }
                if (window.STATE && window.STATE.webcamStream) {
                    try { window.STATE.webcamStream.getTracks().forEach(t => t.stop()); window.STATE.webcamStream = null; } catch(e) {}
                }
            }

            if (!video) return;

            // 3. Detección temprana de protocolo local file:///
            const isFileOrigin = (typeof location !== 'undefined' && location.protocol === 'file:');
            if (isFileOrigin) {
                console.warn('Protocolo local file:/// detectado. Chrome/Edge restringen el acceso a cámara web en vivo sin servidor seguro.');
                this.showWebcamError(
                    '<strong>Protocolo Local detectado (file:///):</strong> Google Chrome y Microsoft Edge bloquean el encendido de cámaras web directas cuando la página se abre como archivo local.<br><br>' +
                    '👉 <strong>Solución Inmediata:</strong> Utilice el botón <strong>"Tomar con Cámara del Dispositivo (Nativa)"</strong> o <strong>"Subir Archivo"</strong> para capturar y auto-recortar la foto formal al 100%, o abra la plataforma mediante un servidor local (http://localhost:5500 o similar).'
                );
                return;
            }

            // 4. Verificar si el navegador soporta getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('getUserMedia no soportado directamente en este contexto.');
                this.showWebcamError('Su navegador o conexión no permite cámara web en vivo directa. Utilice el botón "Tomar con Cámara del Dispositivo (Nativa)" para capturar la fotografía directamente.');
                return;
            }

            // 5. Enumerar dispositivos de video disponibles (si hay más de una cámara instalada)
            if (navigator.mediaDevices.enumerateDevices) {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevices = devices.filter(d => d.kind === 'videoinput');
                    const camSelect = document.getElementById('carnetCameraDeviceSelect');
                    const selectRow = document.getElementById('carnetCameraSelectRow');
                    if (camSelect && videoDevices.length > 1) {
                        let opts = '';
                        videoDevices.forEach((vd, idx) => {
                            const label = vd.label || `Cámara ${idx + 1}`;
                            opts += `<option value="${vd.deviceId}">${label}</option>`;
                        });
                        camSelect.innerHTML = opts;
                        if (this.selectedVideoDeviceId) {
                            camSelect.value = this.selectedVideoDeviceId;
                        }
                        if (selectRow) selectRow.style.display = 'block';
                    } else if (selectRow) {
                        selectRow.style.display = 'none';
                    }
                } catch(devErr) {
                    console.log('Aviso al enumerar cámaras:', devErr);
                }
            }

            // 6. Intentar con diferentes niveles de restricciones (de mayor a menor exigencia)
            const constraintLevels = [];

            // Nivel 1: Dispositivo seleccionado específicamente por el usuario
            if (this.selectedVideoDeviceId) {
                constraintLevels.push({
                    video: {
                        deviceId: { exact: this.selectedVideoDeviceId },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                });
                constraintLevels.push({
                    video: { deviceId: { exact: this.selectedVideoDeviceId } },
                    audio: false
                });
            }

            // Nivel 2: Con orientación ideal (ideal no causa OverconstrainedError en webcams USB)
            constraintLevels.push({
                video: {
                    facingMode: { ideal: this.webcamFacingMode || 'user' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            // Nivel 3: Solo orientación ideal
            constraintLevels.push({
                video: {
                    facingMode: { ideal: this.webcamFacingMode || 'user' }
                },
                audio: false
            });

            // Nivel 4: Video genérico sin ninguna restricción (máxima compatibilidad)
            constraintLevels.push({
                video: true,
                audio: false
            });

            let stream = null;
            let lastError = null;

            for (const constraints of constraintLevels) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                    if (stream) break;
                } catch (e) {
                    lastError = e;
                    console.log('Intento de cámara con constraints falló, probando nivel más flexible...', constraints, e.name);
                }
            }

            if (stream) {
                this.webcamStream = stream;
                video.srcObject = stream;
                video.setAttribute('playsinline', 'true');
                video.setAttribute('muted', 'true');
                video.muted = true;

                // Esperar a que los metadatos estén listos para reproducir
                video.onloadedmetadata = () => {
                    video.play().catch(e => console.log('Autoplay play warning:', e));
                };
                video.play().catch(e => console.log('Video direct play warning:', e));
            } else {
                console.warn('Todos los niveles de getUserMedia fallaron:', lastError);
                let userMsg = 'No se pudo encender la cámara.';
                if (lastError) {
                    if (lastError.name === 'NotAllowedError' || lastError.name === 'PermissionDeniedError') {
                        userMsg = '<strong>Permiso de cámara bloqueado:</strong> El navegador o la configuración de privacidad de Windows tiene bloqueado el acceso a la cámara.<br>Haga clic en el ícono del candado 🔒 en la barra de direcciones y permita la cámara, o utilice el botón de abajo para capturar la foto directamente.';
                    } else if (lastError.name === 'NotReadableError' || lastError.name === 'TrackStartError') {
                        userMsg = '<strong>Cámara en uso:</strong> La cámara web está siendo utilizada por otra aplicación (Zoom, Teams, Meet, OBS) o pestaña. Ciérrela para liberarla o utilice el botón de abajo.';
                    } else if (lastError.name === 'NotFoundError' || lastError.name === 'DevicesNotFoundError') {
                        userMsg = '<strong>Cámara no detectada:</strong> No se detectó ninguna cámara web física conectada. Utilice la cámara de su teléfono o suba un archivo con el botón de abajo.';
                    } else if (lastError.name === 'OverconstrainedError') {
                        userMsg = 'La resolución de la cámara no es compatible con el modo solicitado. Utilice el botón de captura nativa abajo.';
                    } else {
                        userMsg = `No se pudo encender la cámara (${lastError.name || 'error'}). Utilice el botón abajo para capturar la foto con la cámara de su dispositivo.`;
                    }
                }
                this.showWebcamError(userMsg);
            }
        },

        /**
         * Muestra mensaje explicativo y botón de acción en caso de fallo de cámara
         */
        showWebcamError(message) {
            const notice = document.getElementById('carnetCamNotice');
            const noticeText = document.getElementById('carnetCamNoticeText');
            if (notice && noticeText) {
                noticeText.innerHTML = `<strong><i class="fa-solid fa-triangle-exclamation"></i> Aviso:</strong> ${message}`;
                notice.style.display = 'block';
            }
            if (typeof window.showToast === 'function') {
                window.showToast("Revise el aviso de la cámara o use la Cámara del Dispositivo.", 'warning');
            }
        },

        /**
         * Captura la fotografía de la cámara web, recortando y ajustando formalmente a 4:5
         */
        async captureWebcamPhoto() {
            const video = document.getElementById('carnetWebcamVideo');
            if (!video || !this.webcamStream) {
                if (typeof window.showToast === 'function') {
                    window.showToast('La cámara no está activa. Intente encenderla o usar el botón de abajo.', 'warning');
                }
                return;
            }

            if (!video.videoWidth || !video.videoHeight) {
                if (typeof window.showToast === 'function') {
                    window.showToast('Aguarde un instante a que el video inicialice...', 'info');
                }
                setTimeout(() => this.captureWebcamPhoto(), 300);
                return;
            }

            try {
                const dataUrl = await this.processImageToCarnetFormat(video);
                this.showCapturedPreview(dataUrl);
                this.stopWebcam();
            } catch (err) {
                console.error('Error al capturar de cámara:', err);
                if (typeof window.showToast === 'function') {
                    window.showToast('Error al procesar la captura de la cámara.', 'danger');
                }
            }
        },

        /**
         * Maneja archivo local seleccionado desde input (sin límite de tamaño, autoajustado)
         */
        async handleLocalFileSelected(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            this.processAndShowFile(file);
        },

        /**
         * Procesa y muestra en previsualización cualquier archivo de imagen (sin importar su tamaño)
         */
        async processAndShowFile(file) {
            if (!file) return;

            const previewBox = document.getElementById('carnetCapturedPreviewBox');
            if (previewBox) {
                previewBox.style.display = 'block';
                const img = document.getElementById('carnetCapturedImg');
                if (img) img.style.opacity = '0.5';
            }

            if (typeof window.showToast === 'function') {
                window.showToast('Ajustando fotografía para carné formal...', 'info');
            }

            try {
                const dataUrl = await this.processImageToCarnetFormat(file);
                this.showCapturedPreview(dataUrl);
                if (typeof window.showToast === 'function') {
                    window.showToast('Fotografía formal ajustada y lista para confirmar.', 'success');
                }
            } catch (err) {
                console.error('Error procesando archivo:', err);
                if (window.EnccoDialog && typeof window.EnccoDialog.alert === 'function') {
                    window.EnccoDialog.alert({ title: 'Error de Imagen', message: 'No se pudo procesar la imagen seleccionada.', type: 'danger' });
                } else if (typeof window.showToast === 'function') {
                    window.showToast('Error al procesar la imagen seleccionada.', 'danger');
                }
            }
        },

        /**
         * Reintenta o cambia la fotografía seleccionada
         */
        retryPhoto() {
            const previewBox = document.getElementById('carnetCapturedPreviewBox');
            if (previewBox) previewBox.style.display = 'none';

            const camBox = document.getElementById('carnetWebcamBox');
            if (camBox && camBox.style.display !== 'none') {
                this.initWebcamStream();
            }
        },

        /**
         * Muestra previsualización formal antes de confirmar
         */
        showCapturedPreview(dataUrl) {
            const box = document.getElementById('carnetCapturedPreviewBox');
            const img = document.getElementById('carnetCapturedImg');
            if (box && img) {
                img.src = dataUrl;
                img.style.opacity = '1';
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
            entity.photo = photoDataUrl;

            // Actualizar referencia en STATE si existe
            if (typeof window !== 'undefined' && window.STATE && listNode && Array.isArray(window.STATE[listNode])) {
                const targetInState = window.STATE[listNode].find(x => x.id === entity.id);
                if (targetInState) {
                    targetInState.photoUrl = photoDataUrl;
                    targetInState.photo = photoDataUrl;
                }
            }

            if (typeof window !== 'undefined' && typeof window.saveStateToLocalStorage === 'function') {
                window.saveStateToLocalStorage();
            }
            if (typeof window !== 'undefined' && typeof window.EnccoCloudSync !== 'undefined' && window.EnccoCloudSync.syncNode && window.STATE) {
                window.EnccoCloudSync.syncNode(listNode, window.STATE[listNode]);
            }

            // Actualizar DOM del carnet específico de forma inmediata si está renderizado
            if (typeof document !== 'undefined') {
                const cardBox = document.getElementById(`carnetCardBox_${entity.id}`);
                if (cardBox) {
                    const isDoc = (listNode === 'users');
                    cardBox.innerHTML = isDoc 
                        ? this.renderTeacherCardFrontHtml(entity) 
                        : this.renderStudentCardFrontHtml(entity);
                }

                const photoFrame = document.getElementById(`carnetPhotoFrame_${entity.id}`);
                if (photoFrame) {
                    photoFrame.innerHTML = `<img src="${photoDataUrl}" alt="${entity.name || ''}" style="width:100%; height:100%; object-fit:cover; display:block;">`;
                }

                // Si el perfil del estudiante está abierto en pantalla, actualizar su foto
                const profImg = document.getElementById('profilePhotoImg');
                if (profImg && window.STATE && window.STATE.selectedStudentId === entity.id) {
                    profImg.src = photoDataUrl;
                }
            }

            if (typeof renderCarnetsView === 'function' && typeof document !== 'undefined' && document.getElementById('carnetsGridView')) {
                renderCarnetsView();
            }

            if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
                window.showToast(`✅ Fotografía de ${entity.name || 'titular'} guardada y asignada al carné con éxito.`, 'success');
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
            if (modal) {
                modal.classList.remove('active');
                modal.style.setProperty('display', 'none', 'important');
                modal.style.display = 'none';
                modal.style.visibility = 'hidden';
                modal.style.opacity = '0';
                modal.style.pointerEvents = 'none';
            }
            this.currentPhotoEntity = null;
        },

        /**
         * Carga directa de archivo o activación de foto
         */
        promptUploadPhoto(id, type = 'student') {
            this.openPhotoModal(id, type, 'choice');
        },

        /**
         * Acceso directo a selector de archivos con autoajuste de cualquier tamaño
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
            input.onchange = async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                if (typeof window.showToast === 'function') {
                    window.showToast('Ajustando fotografía para carné formal...', 'info');
                }

                try {
                    const dataUrl = await this.processImageToCarnetFormat(file);
                    this.applyPhoto(entity, listNode, dataUrl);
                } catch (err) {
                    console.error('Error procesando imagen directa:', err);
                    if (window.EnccoDialog && typeof window.EnccoDialog.alert === 'function') {
                        window.EnccoDialog.alert({ title: 'Error de Imagen', message: 'No se pudo procesar la imagen.', type: 'danger' });
                    } else if (typeof window.showToast === 'function') {
                        window.showToast('Error al procesar la imagen.', 'danger');
                    }
                }
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
                if (student.status === 'Retirado' || student.status === 'Inactivo') {
                    const stName = (typeof formatStudentDisplayName === 'function' ? formatStudentDisplayName(student, 'lastFirst') : (student.name || ''));
                    if (window.EnccoDialog && typeof window.EnccoDialog.alert === 'function') {
                        window.EnccoDialog.alert({ title: 'Impresión Bloqueada', message: `El estudiante "${stName}" se encuentra RETIRADO. No se emiten carnés institucionales para alumnos retirados.`, type: 'warning' });
                    } else if (typeof showToast === 'function') {
                        showToast(`🔒 Impresión de Carné Bloqueada: El estudiante "${stName}" se encuentra RETIRADO.`, 'warning');
                    }
                    return;
                }
                frontHtml = this.renderStudentCardFrontHtml(student);
                backHtml = this.renderStudentCardBackHtml(student);
                title = `Carné Estudiantil - ${(typeof formatStudentDisplayName === 'function' ? formatStudentDisplayName(student, 'lastFirst') : (student.name || ''))}`;
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
                                background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 25%, #94a3b8 50%, #f1f5f9 75%, #64748b 100%) !important;
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
                                background: linear-gradient(135deg, #003882 0%, #007a3d 50%, #ea580c 100%) !important;
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
                    if (window.EnccoDialog && typeof window.EnccoDialog.alert === 'function') {
                        window.EnccoDialog.alert({ title: 'Impresión de Carnés', message: 'No hay docentes para imprimir según los filtros seleccionados.', type: 'warning' });
                    } else if (typeof showToast === 'function') {
                        showToast('No hay docentes para imprimir según los filtros.', 'warning');
                    }
                    return;
                }

                title = `Impresión Masiva de Carnés Docentes (${itemsToPrint.length}) - ENCCO Jutiapa`;
                cardsHtml = itemsToPrint.map(t => `
                    <div class="print-carnet-item" style="box-sizing:border-box; border:1px dashed #cbd5e1; padding:3px; border-radius:10px; display:inline-block; margin:3px; page-break-inside:avoid;">
                        ${this.renderTeacherCardFrontHtml(t)}
                    </div>
                `).join('');

            } else {
                const allStudents = this.getCycleStudentsList();
                const carFilter = document.getElementById('carnetsCareerFilter')?.value || 'ALL';
                const grdFilter = document.getElementById('carnetsGradeFilter')?.value || 'ALL';
                const secFilter = document.getElementById('carnetsSectionFilter')?.value || 'ALL';
                const photoFilter = document.getElementById('carnetsPhotoFilter')?.value || 'ALL';
                const searchVal = (document.getElementById('carnetsSearchInput')?.value || '').trim().toLowerCase();

                itemsToPrint = allStudents.filter(st => {
                    if (!st) return false;
                    // 🛑 Excluir estrictamente a estudiantes Retirados, Inactivos o Egresados de la impresión masiva de carnés
                    const stStatus = String(st.status || '').toLowerCase().trim();
                    if (stStatus === 'retirado' || stStatus === 'inactivo' || stStatus === 'egresado') return false;
                    const carMatch = (carFilter === 'ALL' || !carFilter || (st.career || '').toLowerCase() === carFilter.toLowerCase());
                    const grdMatch = (grdFilter === 'ALL' || !grdFilter || (st.grade || '').toLowerCase() === grdFilter.toLowerCase());
                    const stSecLetter = this.formatCleanSection(st.section || st.gradeCode || '');
                    const secMatch = (secFilter === 'ALL' || !secFilter || stSecLetter === this.formatCleanSection(secFilter));
                    if (!carMatch || !grdMatch || !secMatch) return false;
                    const hasPhoto = Boolean(st.photoUrl || st.photo);
                    if (photoFilter === 'WITH_PHOTO' && !hasPhoto) return false;
                    if (photoFilter === 'WITHOUT_PHOTO' && hasPhoto) return false;
                    if (searchVal) {
                        const sName = (typeof formatStudentDisplayName === 'function' ? formatStudentDisplayName(st, 'lastFirst') : (st.name || `${st.lastName || ''} ${st.firstName || ''}`)).toLowerCase();
                        const sCarne = (st.carne || '').toLowerCase();
                        const sCode = (st.personalCode || '').toLowerCase();
                        if (!sName.includes(searchVal) && !sCarne.includes(searchVal) && !sCode.includes(searchVal)) return false;
                    }
                    return true;
                });

                itemsToPrint.sort((a, b) => {
                    const nameA = typeof formatStudentDisplayName === 'function' ? formatStudentDisplayName(a, 'lastFirst') : (a.lastName || a.name || '');
                    const nameB = typeof formatStudentDisplayName === 'function' ? formatStudentDisplayName(b, 'lastFirst') : (b.lastName || b.name || '');
                    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
                });

                if (itemsToPrint.length === 0) {
                    if (window.EnccoDialog && typeof window.EnccoDialog.alert === 'function') {
                        window.EnccoDialog.alert({ title: 'Impresión de Carnés', message: 'No hay estudiantes seleccionados para imprimir según los filtros aplicados.', type: 'warning' });
                    } else if (typeof showToast === 'function') {
                        showToast('No hay estudiantes seleccionados para imprimir.', 'warning');
                    }
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
                                background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 25%, #94a3b8 50%, #f1f5f9 75%, #64748b 100%) !important;
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
                                background: linear-gradient(135deg, #003882 0%, #007a3d 50%, #ea580c 100%) !important;
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
                        <div style="text-align:center; margin-top:10px; padding-top:6px; border-top:1px solid #e2e8f0; font-size:9px; color:#64748b;">
                            Sistema de Emisión de Carnés Institucionales ENCCO • © 2026 <strong>Nehemias Salguero</strong>, Jutiapa, Guatemala. Todos los derechos reservados.
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
    function getFilteredCarnetsEntities() {
        const isTeachers = (EnccoCarnets.activeTab === 'teachers');
        if (isTeachers) {
            const teachers = EnccoCarnets.getTeachersList();
            const docRenglonFilter = document.getElementById('carnetsTeacherRenglonFilter')?.value || 'ALL';
            const docSearchVal = (document.getElementById('carnetsTeacherSearchInput')?.value || '').trim().toLowerCase();
            return teachers.filter(t => {
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
        }

        const allStudents = EnccoCarnets.getCycleStudentsList();
        const carFilter = document.getElementById('carnetsCareerFilter')?.value || 'ALL';
        const grdFilter = document.getElementById('carnetsGradeFilter')?.value || 'ALL';
        const secFilter = document.getElementById('carnetsSectionFilter')?.value || 'ALL';
        const photoFilter = document.getElementById('carnetsPhotoFilter')?.value || 'ALL';
        const stSearchVal = (document.getElementById('carnetsSearchInput')?.value || '').trim().toLowerCase();

        const filteredStudents = allStudents.filter(st => {
            if (!st) return false;
            const carMatch = (carFilter === 'ALL' || !carFilter || (st.career || '').toLowerCase() === carFilter.toLowerCase());
            const grdMatch = (grdFilter === 'ALL' || !grdFilter || (st.grade || '').toLowerCase() === grdFilter.toLowerCase());
            const stSecLetter = EnccoCarnets.formatCleanSection(st.section || st.gradeCode || '');
            const secMatch = (secFilter === 'ALL' || !secFilter || stSecLetter === EnccoCarnets.formatCleanSection(secFilter));
            if (!carMatch || !grdMatch || !secMatch) return false;
            const hasPhoto = Boolean(st.photoUrl || st.photo);
            if (photoFilter === 'WITH_PHOTO' && !hasPhoto) return false;
            if (photoFilter === 'WITHOUT_PHOTO' && hasPhoto) return false;
            if (stSearchVal) {
                const sName = (typeof formatStudentDisplayName === 'function' ? formatStudentDisplayName(st, 'lastFirst') : (st.name || `${st.lastName || ''} ${st.firstName || ''}`)).toLowerCase();
                const sCarne = (st.carne || '').toLowerCase();
                const sCode = (st.personalCode || '').toLowerCase();
                if (!sName.includes(stSearchVal) && !sCarne.includes(stSearchVal) && !sCode.includes(stSearchVal)) return false;
            }
            return true;
        });

        filteredStudents.sort((a, b) => {
            const nameA = typeof formatStudentDisplayName === 'function' ? formatStudentDisplayName(a, 'lastFirst') : (a.lastName || a.name || '');
            const nameB = typeof formatStudentDisplayName === 'function' ? formatStudentDisplayName(b, 'lastFirst') : (b.lastName || b.name || '');
            return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
        });

        return filteredStudents;
    }

    function updateCarnetsGridOnly() {
        const gridEl = document.getElementById('carnetsGridContainer');
        if (!gridEl) return;

        const isTeachers = (EnccoCarnets.activeTab === 'teachers');
        const list = getFilteredCarnetsEntities();
        const totalFiltered = list.length;
        const limit = EnccoCarnets.visibleLimit || 24;
        const visibleList = list.slice(0, limit);
        const remaining = Math.max(0, totalFiltered - visibleList.length);

        const missingPhotosCount = list.filter(e => e && !(e.photoUrl || e.photo) && e.status !== 'Retirado' && e.status !== 'Inactivo').length;

        const countLabel = document.getElementById('carnetsActiveCountLabel');
        if (countLabel) {
            countLabel.innerHTML = `Mostrando <strong>${visibleList.length}</strong> de <strong>${totalFiltered}</strong> ${isTeachers ? 'docentes' : 'estudiantes'} (${isTeachers ? 'Formato Vertical' : 'Formato Horizontal CR80'})`;
        }

        const photoBadge = document.getElementById('carnetsPhotoMissingBadge');
        if (photoBadge) {
            photoBadge.innerHTML = missingPhotosCount > 0
                ? `<span style="font-size:0.74rem; font-weight:700; color:#b45309; background:#fef3c7; border:1px solid #fcd34d; border-radius:999px; padding:2px 10px;"><i class="fa-solid fa-camera-retro"></i> ${missingPhotosCount} sin fotografía</span>`
                : `<span style="font-size:0.74rem; font-weight:700; color:#15803d; background:#dcfce7; border:1px solid #86efac; border-radius:999px; padding:2px 10px;"><i class="fa-solid fa-circle-check"></i> 100% con fotografía</span>`;
        }

        const batchBtn = document.getElementById('carnetsBatchPrintBtn');
        if (batchBtn) {
            const printableCount = isTeachers
                ? totalFiltered
                : list.filter(st => st && st.status !== 'Retirado' && st.status !== 'Inactivo' && st.status !== 'Egresado').length;
            batchBtn.innerHTML = `<i class="fa-solid fa-print"></i> Imprimir Lote (${printableCount} Carnés)`;
        }

        if (totalFiltered === 0) {
            gridEl.innerHTML = `
                <div style="grid-column:1 / -1; text-align:center; padding:50px 20px; background:#ffffff; border-radius:12px; border:1.5px dashed #cbd5e1; width:100%;">
                    <i class="fa-solid fa-id-card-clip" style="font-size:2.4rem; color:#94a3b8; display:block; margin-bottom:10px;"></i>
                    <h4 style="margin:0; color:#334155;">No se encontraron registros para los filtros seleccionados</h4>
                    <p style="margin:4px 0 0 0; color:#64748b; font-size:0.82rem;">Modifique los términos de búsqueda o los selectores de filtro.</p>
                </div>
            `;
            return;
        }

        gridEl.innerHTML = visibleList.map(entity => {
            const isDoc = isTeachers;
            const cardId = entity.id;
            const isRetired = !isDoc && (entity.status === 'Retirado' || entity.status === 'Inactivo');
            const cardHtml = isDoc
                ? EnccoCarnets.renderTeacherCardFrontHtml(entity)
                : EnccoCarnets.renderStudentCardFrontHtml(entity);

            return `
                <div class="carnet-preview-wrapper" style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                    <div id="carnetCardBox_${cardId}">
                        ${cardHtml}
                    </div>
                    ${isRetired ? `
                        <div style="font-size:0.70rem; font-weight:800; color:#b91c1c; background:#fee2e2; border:1px solid #fca5a5; padding:2px 8px; border-radius:4px;">
                            <i class="fa-solid fa-user-slash"></i> ESTUDIANTE RETIRADO
                        </div>
                    ` : ''}
                    
                    <!-- BOTONES DE ACCIÓN INDIVIDUAL -->
                    <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:4px; margin-top:2px;">
                        <button type="button" class="btn btn-xs btn-outline-secondary" onclick="EnccoCarnets.toggleCardSide('${cardId}', '${isDoc ? 'teacher' : 'student'}')" style="font-size:0.70rem; font-weight:700; padding:2px 7px;" title="Alternar entre Frente y Reverso">
                            <i class="fa-solid fa-arrows-rotate"></i> Voltear
                        </button>
                        ${isRetired ? `
                            <button type="button" class="btn btn-xs btn-outline-danger" disabled style="font-size:0.70rem; font-weight:700; padding:2px 7px; opacity:0.65; cursor:not-allowed;" title="Estudiante Retirado - No se emite carné institucional">
                                <i class="fa-solid fa-ban"></i> Retirado
                            </button>
                        ` : `
                            <button type="button" class="btn btn-xs btn-outline-primary" onclick="EnccoCarnets.printSingleCard('${cardId}', '${isDoc ? 'teacher' : 'student'}')" style="font-size:0.70rem; font-weight:700; padding:2px 7px;" title="Imprimir carné individual">
                                <i class="fa-solid fa-print"></i> Imprimir
                            </button>
                        `}
                        <button type="button" class="btn btn-xs btn-outline-warning" onclick="EnccoCarnets.openPhotoModal('${cardId}', '${isDoc ? 'teacher' : 'student'}', 'camera')" style="font-size:0.70rem; font-weight:700; padding:2px 7px; color:#b45309; border-color:#f59e0b;" title="Tomar foto con cámara web en vivo">
                            <i class="fa-solid fa-camera"></i> Cámara
                        </button>
                        <button type="button" class="btn btn-xs btn-outline-success" onclick="EnccoCarnets.promptDirectFileUpload('${cardId}', '${isDoc ? 'teacher' : 'student'}')" style="font-size:0.70rem; font-weight:700; padding:2px 7px;" title="Cargar fotografía desde archivo local">
                            <i class="fa-solid fa-upload"></i> Archivo
                        </button>
                    </div>
                </div>
            `;
        }).join('') + (remaining > 0 ? `
            <div style="grid-column:1 / -1; text-align:center; padding:16px 0;">
                <button type="button" class="btn btn-outline-primary" onclick="EnccoCarnets.loadMoreCards()" style="font-weight:800; padding:8px 22px; border-radius:999px;">
                    <i class="fa-solid fa-angles-down"></i> Mostrar más carnés (${remaining} restantes)
                </button>
            </div>
        ` : '');
    }

    function renderCarnetsView() {
        if (typeof document === 'undefined') return;
        const container = document.getElementById('view-carnets');
        if (!container) return;

        const isTeachers = (EnccoCarnets.activeTab === 'teachers');
        const cycle = EnccoCarnets.getActiveCycle();
        const allStudents = EnccoCarnets.getCycleStudentsList();
        const teachers = EnccoCarnets.getTeachersList();

        // Conservar valores previos de filtros si existen
        const carFilter = document.getElementById('carnetsCareerFilter')?.value || 'ALL';
        const grdFilter = document.getElementById('carnetsGradeFilter')?.value || 'ALL';
        const secFilter = document.getElementById('carnetsSectionFilter')?.value || 'ALL';
        const photoFilter = document.getElementById('carnetsPhotoFilter')?.value || 'ALL';
        const stSearchVal = (document.getElementById('carnetsSearchInput')?.value || '').trim();

        const docRenglonFilter = document.getElementById('carnetsTeacherRenglonFilter')?.value || 'ALL';
        const docSearchVal = (document.getElementById('carnetsTeacherSearchInput')?.value || '').trim();

        // Opciones únicas para estudiantes ordenadas pedagógicamente (con letras de sección limpias sin duplicar "Sección")
        const careers = [...new Set(allStudents.map(s => s.career).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        const grades = [...new Set(allStudents.map(s => s.grade).filter(Boolean))].sort((a, b) => {
            const wa = typeof window.getGradeWeight === 'function' ? window.getGradeWeight(a) : 99;
            const wb = typeof window.getGradeWeight === 'function' ? window.getGradeWeight(b) : 99;
            return wa - wb || a.localeCompare(b);
        });
        const sections = [...new Set(allStudents.map(s => EnccoCarnets.formatCleanSection(s.section || s.gradeCode)).filter(Boolean))].sort((a, b) => a.localeCompare(b));

        container.innerHTML = `
            <div class="carnets-container" style="padding:10px 0;">
                
                <!-- ENCABEZADO DE SECCIÓN -->
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
                    <div>
                        <h2 style="margin:0; font-size:1.45rem; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:10px;">
                            <i class="fa-solid fa-id-card" style="color:var(--brand-green);"></i>
                            Emisión Oficial de Credenciales y Carnés Institucionales
                            <span class="badge" style="background:linear-gradient(135deg,#0b2c66,#006837); color:#f3d87d; font-size:0.74rem; padding:4px 10px; border-radius:999px; font-weight:800;">Ciclo ${cycle}</span>
                        </h2>
                        <p style="margin:4px 0 0 0; font-size:0.85rem; color:#64748b;">
                            Modelos oficiales ENCCO 1970 (CR80 Premium): Carnet Estudiantil (Horizontal) y Carnet Docente (Vertical) con Código de Barras y QR.
                        </p>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button type="button" id="carnetsBatchPrintBtn" class="btn btn-primary" onclick="EnccoCarnets.printFilteredBatch()" style="background:linear-gradient(135deg,#0b2c66,#006837); border:none; font-weight:800; box-shadow:0 3px 10px rgba(11,44,102,0.28);">
                            <i class="fa-solid fa-print"></i> Imprimir Lote
                        </button>
                    </div>
                </div>

                <!-- SELECTOR DE PESTAÑAS: ESTUDIANTES (HORIZONTAL) VS DOCENTES (VERTICAL) -->
                <div style="display:flex; gap:8px; border-bottom:2.5px solid #e2e8f0; margin-bottom:16px;">
                    <button type="button" class="btn btn-sm ${!isTeachers ? 'btn-primary' : 'btn-secondary'}" onclick="EnccoCarnets.visibleLimit=24; EnccoCarnets.switchTab('students')" style="font-weight:800; border-radius:8px 8px 0 0; padding:8px 18px; font-size:0.86rem; display:flex; align-items:center; gap:8px; ${!isTeachers ? 'background:#006837; border-color:#006837; color:#fff;' : 'background:#f1f5f9; color:#475569; border:none;'}">
                        <i class="fa-solid fa-user-graduate"></i> Carnés Estudiantiles (Horizontal)
                        <span class="badge" style="background:${!isTeachers ? '#ffffff' : '#cbd5e1'}; color:${!isTeachers ? '#006837' : '#334155'}; margin-left:4px;">${allStudents.length}</span>
                    </button>
                    <button type="button" class="btn btn-sm ${isTeachers ? 'btn-primary' : 'btn-secondary'}" onclick="EnccoCarnets.visibleLimit=24; EnccoCarnets.switchTab('teachers')" style="font-weight:800; border-radius:8px 8px 0 0; padding:8px 18px; font-size:0.86rem; display:flex; align-items:center; gap:8px; ${isTeachers ? 'background:#0b2c66; border-color:#0b2c66; color:#fff;' : 'background:#f1f5f9; color:#475569; border:none;'}">
                        <i class="fa-solid fa-chalkboard-user"></i> Carnés Docentes (Vertical)
                        <span class="badge" style="background:${isTeachers ? '#ffffff' : '#cbd5e1'}; color:${isTeachers ? '#0b2c66' : '#334155'}; margin-left:4px;">${teachers.length}</span>
                    </button>
                </div>

                <!-- BARRA DE FILTROS PERSISTENTE (SIN PÉRDIDA DE FOCO AL ESCRIBIR) -->
                ${!isTeachers ? `
                    <div style="background:#ffffff; border-radius:12px; padding:12px 16px; border:1.5px solid #e2e8f0; margin-bottom:16px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
                        <div style="flex:1; min-width:210px;">
                            <input type="text" id="carnetsSearchInput" class="form-control" placeholder="Buscar por alumno, carné o código personal..." value="${stSearchVal}" oninput="EnccoCarnets.onSearchInput()" style="font-size:0.84rem;">
                        </div>
                        <div style="min-width:135px;">
                            <select id="carnetsCareerFilter" class="form-control" onchange="EnccoCarnets.onFilterChange(true)" style="font-size:0.84rem; font-weight:600;">
                                <option value="ALL">-- Todas las Carreras --</option>
                                ${careers.map(c => `<option value="${c}" ${carFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                        <div style="min-width:130px;">
                            <select id="carnetsGradeFilter" class="form-control" onchange="EnccoCarnets.onFilterChange(true)" style="font-size:0.84rem; font-weight:600;">
                                <option value="ALL">-- Todos los Grados --</option>
                                ${grades.map(g => `<option value="${g}" ${grdFilter === g ? 'selected' : ''}>${g}</option>`).join('')}
                            </select>
                        </div>
                        <div style="min-width:115px;">
                            <select id="carnetsSectionFilter" class="form-control" onchange="EnccoCarnets.onFilterChange(true)" style="font-size:0.84rem; font-weight:600;">
                                <option value="ALL">-- Sección --</option>
                                ${sections.map(s => `<option value="${s}" ${secFilter === s ? 'selected' : ''}>Sección ${s}</option>`).join('')}
                            </select>
                        </div>
                        <div style="min-width:135px;">
                            <select id="carnetsPhotoFilter" class="form-control" onchange="EnccoCarnets.onFilterChange(true)" style="font-size:0.84rem; font-weight:600;">
                                <option value="ALL" ${photoFilter === 'ALL' ? 'selected' : ''}>📷 Todas las Fotos</option>
                                <option value="WITH_PHOTO" ${photoFilter === 'WITH_PHOTO' ? 'selected' : ''}>✅ Con Fotografía</option>
                                <option value="WITHOUT_PHOTO" ${photoFilter === 'WITHOUT_PHOTO' ? 'selected' : ''}>⚠️ Sin Fotografía</option>
                            </select>
                        </div>
                    </div>
                ` : `
                    <div style="background:#ffffff; border-radius:12px; padding:12px 16px; border:1.5px solid #e2e8f0; margin-bottom:16px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
                        <div style="flex:1; min-width:240px;">
                            <input type="text" id="carnetsTeacherSearchInput" class="form-control" placeholder="Buscar por nombre de catedrático, título o ID..." value="${docSearchVal}" oninput="EnccoCarnets.onSearchInput()" style="font-size:0.84rem;">
                        </div>
                        <div style="min-width:160px;">
                            <select id="carnetsTeacherRenglonFilter" class="form-control" onchange="EnccoCarnets.onFilterChange(true)" style="font-size:0.84rem; font-weight:600;">
                                <option value="ALL">-- Todos los Renglones --</option>
                                <option value="011" ${docRenglonFilter === '011' ? 'selected' : ''}>Renglón 011 (Presupuestado)</option>
                                <option value="021" ${docRenglonFilter === '021' ? 'selected' : ''}>Renglón 021 (Contrato)</option>
                            </select>
                        </div>
                    </div>
                `}

                <!-- CONTADOR Y ESTADO DE FOTOGRAFÍAS -->
                <div style="margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        <span id="carnetsActiveCountLabel" style="font-size:0.86rem; color:#475569; font-weight:700;"></span>
                        <span id="carnetsPhotoMissingBadge"></span>
                    </div>
                    <span style="font-size:0.75rem; color:#64748b; font-weight:600;">
                        <i class="fa-solid fa-circle-info"></i> Código de Barras (pistola) y QR dinámico (celular) integrados.
                    </span>
                </div>

                <!-- GRILLA DE PREVISUALIZACIÓN DE CARNÉS -->
                <div id="carnetsGridContainer" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(${isTeachers ? '230px' : '340px'}, 1fr)); gap:18px; justify-items:center;"></div>

            </div>
        `;

        updateCarnetsGridOnly();
    }

    // Exponer EnccoCarnets, helper de fotos y renderCarnetsView globalmente
    window.EnccoCarnets = EnccoCarnets;
    window.renderCarnetsView = renderCarnetsView;
    window.openPhotoModal = (id, type = 'student', defaultMode = 'choice') => EnccoCarnets.openPhotoModal(id, type, defaultMode);
    window.processImageFileToCarnetFormat = (source) => EnccoCarnets.processImageToCarnetFormat(source);

})(typeof window !== 'undefined' ? window : global);
