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
        generateStudentAvatarSvg(name, width = 78, height = 94) {
            const parts = (name || 'Estudiante').trim().split(/\s+/);
            const initials = ((parts[0] ? parts[0][0] : 'E') + (parts[1] ? parts[1][0] : '')).toUpperCase();
            return `
                <svg width="${width}" height="${height}" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%; display:block;">
                    <defs>
                        <linearGradient id="gradSt_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#15803d" />
                            <stop offset="100%" stop-color="#0f5127" />
                        </linearGradient>
                    </defs>
                    <rect width="80" height="96" fill="#f8fafc" />
                    <circle cx="40" cy="38" r="18" fill="url(#gradSt_${initials})" />
                    <path d="M 16 88 C 16 64, 28 58, 40 58 C 52 58, 64 64, 64 88 Z" fill="url(#gradSt_${initials})" />
                    <text x="40" y="44" font-family="'Outfit', sans-serif" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle">${initials}</text>
                </svg>
            `;
        },

        /**
         * Genera un avatar vectorial para docente cuando no tiene foto
         */
        generateTeacherAvatarSvg(name, width = 84, height = 102) {
            const parts = (name || 'Docente').trim().split(/\s+/);
            const initials = ((parts[0] ? parts[0][0] : 'D') + (parts[1] ? parts[1][0] : '')).toUpperCase();
            return `
                <svg width="${width}" height="${height}" viewBox="0 0 84 102" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%; display:block;">
                    <defs>
                        <linearGradient id="gradDoc_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#0d47a1" />
                            <stop offset="100%" stop-color="#1e3a8a" />
                        </linearGradient>
                    </defs>
                    <rect width="84" height="102" fill="#f8fafc" />
                    <circle cx="42" cy="40" r="19" fill="url(#gradDoc_${initials})" />
                    <path d="M 16 94 C 16 68, 28 62, 42 62 C 56 62, 68 68, 68 94 Z" fill="url(#gradDoc_${initials})" />
                    <text x="42" y="46" font-family="'Outfit', sans-serif" font-size="15" font-weight="900" fill="#fde047" text-anchor="middle">${initials}</text>
                </svg>
            `;
        },

        /* ======================================================================
         * 🎓 1. MODELO CARNET ESTUDIANTIL (HORIZONTAL - CR80)
         * ====================================================================== */

        /**
         * Frente del carné estudiantil horizontal
         */
        renderStudentCardFrontHtml(student) {
            const cycle = student.academicCycle || (window.STATE && window.STATE.activeCycle) || '2026';
            const name = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Estudiante';
            const carne = student.carne || student.personalCode || 'ENCCO-2026';
            const grade = student.grade || 'Grado no asignado';
            const section = student.section || 'A';
            const career = student.career || 'Perito Contador';

            const barcodeSvg = this.generateBarcodeSvg(carne, 22);
            const qrText = `ENCCO:ESTUDIANTE|CARNE:${carne}|COD:${student.personalCode || ''}|NOM:${name}|CICLO:${cycle}`;
            const qrSvg = this.generateQrSvg(qrText, 32);

            const photoEl = student.photoUrl
                ? `<img src="${student.photoUrl}" alt="${name}" style="width:100%; height:100%; object-fit:cover; display:block;">`
                : this.generateStudentAvatarSvg(name, 78, 94);

            return `
                <div class="encco-carnet-card encco-carnet-student encco-carnet-front" style="width:336px; height:212px; background:#ffffff; border-radius:12px; border:1.5px solid #cbd5e1; box-shadow:0 6px 16px rgba(0,0,0,0.1); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; display:flex; flex-direction:column; box-sizing:border-box; justify-content:space-between; text-align:left;">
                    
                    <!-- MARCA DE AGUA INSTITUCIONAL DE FONDO -->
                    <div style="position:absolute; right:-20px; bottom:25px; width:170px; height:170px; opacity:0.045; pointer-events:none; z-index:0; background:url('logo.png') no-repeat center/contain;"></div>

                    <!-- ENCABEZADO INSTITUCIONAL HORIZONTAL -->
                    <div style="position:relative; z-index:2; padding:6px 8px 3px 8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <img src="logo.png" style="width:34px; height:34px; object-fit:contain; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.25)); flex-shrink:0;" alt="Logo ENCCO">
                            <div style="flex:1; line-height:1.15; text-align:center;">
                                <span style="font-family:'Outfit', sans-serif; font-size:0.65rem; font-weight:900; color:#0f5127; letter-spacing:0.3px; display:block; text-transform:uppercase;">ESCUELA NACIONAL DE CIENCIAS COMERCIALES</span>
                                <span style="font-family:'Outfit', sans-serif; font-size:0.56rem; font-weight:800; color:#15803d; letter-spacing:0.8px; display:block;">JUTIAPA 1970</span>
                                <div style="display:flex; justify-content:center; gap:4px; font-size:0.36rem; color:#ea580c; line-height:1; margin-top:2px;">
                                    <span>◆</span><span style="color:#15803d;">◆</span><span style="color:#0284c7;">◆</span><span style="color:#ea580c;">◆</span><span style="color:#15803d;">◆</span>
                                </div>
                            </div>
                        </div>

                        <!-- CINTILLO AZUL INSTITUCIONAL -->
                        <div style="background:linear-gradient(90deg, #1565c0 0%, #0d47a1 100%); color:#ffffff; font-family:'Outfit', sans-serif; font-size:0.72rem; font-weight:900; letter-spacing:1px; text-transform:uppercase; text-align:center; padding:3px 0; margin-top:3px; border-radius:3px; box-shadow:0 1px 3px rgba(13,71,161,0.25);">
                            CARNET ESTUDIANTIL
                        </div>
                    </div>

                    <!-- CUERPO PRINCIPAL (FOTO CON MARCO DORADO Y DATOS) -->
                    <div style="display:flex; padding:0 10px 4px 10px; gap:10px; align-items:center; flex:1; position:relative; z-index:2;">
                        
                        <!-- MARCO DORADO REFINADO DE LA FOTO -->
                        <div style="width:78px; height:94px; flex-shrink:0; border:2.5px solid #d4af37; outline:1px solid #b45309; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.18); overflow:hidden; background:#f8fafc; display:flex; align-items:center; justify-content:center;">
                            ${photoEl}
                        </div>

                        <!-- BLOQUE DE DATOS DEL ALUMNO -->
                        <div style="flex:1; line-height:1.2; overflow:hidden;">
                            <div style="font-size:0.52rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.3px;">NOMBRE COMPLETO:</div>
                            <div style="font-size:0.72rem; font-weight:900; color:#0f172a; text-transform:uppercase; line-height:1.15; max-height:2.3em; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; margin-bottom:3px;" title="${name}">
                                ${name}
                            </div>
                            
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; font-size:0.58rem;">
                                <div><span style="color:#64748b; font-weight:800;">CARNÉ NO:</span> <strong style="color:#0f5127; font-weight:900;">${carne}</strong></div>
                                <div><span style="color:#64748b; font-weight:800;">CICLO:</span> <strong style="color:#0f172a; font-weight:900;">[${cycle}]</strong></div>
                            </div>
                            
                            <div style="font-size:0.56rem; color:#475569; font-weight:800; margin-bottom:3px;">
                                ROL: <strong style="color:#1565c0; font-weight:900;">ESTUDIANTE</strong>
                            </div>

                            <div style="font-size:0.54rem; font-weight:800; color:#166534; background:#f0fdf4; border:1px solid #bbf7d0; padding:1px 5px; border-radius:4px; display:inline-block; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                ${grade} "${section}" • ${career}
                            </div>
                        </div>
                    </div>

                    <!-- CONTENEDOR INFERIOR RESERVADO (BARCODE + QR HÍBRIDO) -->
                    <div style="background:#ffffff; border:1.2px solid #cbd5e1; border-radius:8px; margin:0 8px 6px 8px; padding:2px 8px; display:flex; align-items:center; justify-content:space-between; gap:6px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.03); position:relative; z-index:2;">
                        <div style="flex:1; text-align:center; overflow:hidden;">
                            <div style="width:90%; margin:0 auto;">
                                ${barcodeSvg}
                            </div>
                            <div style="font-size:0.46rem; font-family:monospace; color:#475569; font-weight:700; letter-spacing:1px; margin-top:1px;">
                                ${carne}
                            </div>
                        </div>
                        <div style="flex-shrink:0; border-left:1px solid #e2e8f0; padding-left:6px; display:flex; align-items:center; justify-content:center;" title="Escanear con Celular">
                            ${qrSvg}
                        </div>
                    </div>

                </div>
            `;
        },

        /**
         * Reverso del carné estudiantil horizontal (ultra legible)
         */
        renderStudentCardBackHtml(student) {
            const cycle = student.academicCycle || (window.STATE && window.STATE.activeCycle) || '2026';
            const carne = student.carne || student.personalCode || 'ENCCO-2026';
            const personalCode = student.personalCode || 'No asignado';
            const cui = student.cui || 'No registrado';
            const grade = student.grade || 'Grado no asignado';
            const section = student.section || 'A';
            const career = student.career || 'Perito Contador';
            const shift = student.shift || student.jornada || 'Matutina';
            const birthDate = student.birthDate || student.fechaNacimiento || '';
            const guardian = student.guardian || student.guardianName || student.motherName || student.fatherName || 'Padre de Familia';
            const guardianPhone = student.guardianPhone || student.motherPhone || student.fatherPhone || student.phone || student.telefono || 'No reg.';

            const qrTextBack = `https://comerciojutiapa.github.io/enccojutiapa/?verify=student&carne=${encodeURIComponent(carne)}&cycle=${cycle}`;
            const qrSvgBack = this.generateQrSvg(qrTextBack, 30);

            return `
                <div class="encco-carnet-card encco-carnet-student encco-carnet-back" style="width:336px; height:212px; background:#ffffff; border-radius:12px; border:1.5px solid #cbd5e1; box-shadow:0 6px 16px rgba(0,0,0,0.1); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; display:flex; flex-direction:column; box-sizing:border-box; padding:8px 12px; justify-content:space-between; text-align:left;">
                    
                    <!-- ENCABEZADO MINEDUC REVERSO -->
                    <div style="border-bottom:1.5px solid #0f5127; padding-bottom:3px; text-align:center;">
                        <span style="font-family:'Outfit', sans-serif; font-size:0.64rem; font-weight:900; color:#0f5127; text-transform:uppercase; letter-spacing:0.3px; display:block;">
                            ESCUELA NACIONAL DE CIENCIAS COMERCIALES
                        </span>
                        <span style="font-size:0.50rem; color:#475569; font-weight:600;">
                            Jutiapa, Guatemala | MINEDUC Código: <strong>22-01-0038-46</strong> | Ciclo ${cycle}
                        </span>
                    </div>

                    <!-- TABLA DE DATOS DEL ALUMNO DE ALTA LEGIBILIDAD -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.54rem; color:#1e293b; line-height:1.25; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:4px 8px;">
                        <div>
                            <div><strong style="color:#0f5127;">Cód. Personal:</strong> <span style="font-weight:700;">${personalCode}</span></div>
                            <div><strong style="color:#0f5127;">CUI / DPI:</strong> <span>${cui}</span></div>
                            <div><strong style="color:#0f5127;">Jornada:</strong> <span>${shift}</span></div>
                            <div><strong style="color:#0f5127;">Nacimiento:</strong> <span>${birthDate || 'No reg.'}</span></div>
                        </div>
                        <div>
                            <div><strong style="color:#0f5127;">Grado:</strong> <span>${grade} "${section}"</span></div>
                            <div><strong style="color:#0f5127;">Carrera:</strong> <span>${career}</span></div>
                            <div><strong style="color:#0f5127;">Encargado:</strong> <span style="font-weight:600;">${guardian}</span></div>
                            <div><strong style="color:#0f5127;">Emergencia:</strong> <span style="font-weight:700; color:#b91c1c;">${guardianPhone}</span></div>
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
                                <div style="font-size:0.50rem; font-weight:800; color:#0f5127;">SELLO OFICIAL</div>
                                <div style="font-size:0.44rem; color:#64748b;">Validez: Ciclo ${cycle}</div>
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
         * Frente del carné docente vertical
         */
        renderTeacherCardFrontHtml(teacher) {
            const cycle = (window.STATE && window.STATE.activeCycle) || '2026';
            const name = teacher.name || 'Catedrático Titular';
            const teacherId = teacher.id || 'usr-doc-01';
            const dpi = teacher.cui || teacher.dpi || teacher.id || 'No registrado';
            const title = teacher.title || 'PEM / Catedrático';
            const renglon = teacher.renglon || '011';

            // Deducir asignaturas impartidas desde STATE.pensum si existen
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
            const qrText = `ENCCO:DOCENTE|ID:${teacherId}|NOM:${name}|DPI:${dpi}|CICLO:${cycle}`;
            const qrSvg = this.generateQrSvg(qrText, 28);

            const photoEl = teacher.photoUrl
                ? `<img src="${teacher.photoUrl}" alt="${name}" style="width:100%; height:100%; object-fit:cover; display:block;">`
                : this.generateTeacherAvatarSvg(name, 84, 102);

            return `
                <div class="encco-carnet-card encco-carnet-teacher encco-carnet-front" style="width:214px; height:336px; background:#ffffff; border-radius:14px; border:1.5px solid #cbd5e1; box-shadow:0 6px 16px rgba(0,0,0,0.1); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; display:flex; flex-direction:column; box-sizing:border-box; justify-content:space-between; text-align:center;">
                    
                    <!-- MARCA DE AGUA INSTITUCIONAL DE FONDO -->
                    <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:160px; height:160px; opacity:0.04; pointer-events:none; z-index:0; background:url('logo.png') no-repeat center/contain;"></div>

                    <!-- CÚPULA AZUL SUPERIOR CON ESCUDO ENCCO -->
                    <div style="background:linear-gradient(180deg, #0d47a1 0%, #1565c0 100%); padding:10px 8px 6px 8px; position:relative; z-index:2; border-bottom:3px solid #15803d;">
                        <img src="logo.png" style="width:36px; height:36px; object-fit:contain; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35)); margin:0 auto; display:block;" alt="Logo ENCCO">
                        <div style="font-family:'Outfit', sans-serif; font-size:0.50rem; font-weight:800; color:#e2e8f0; text-transform:uppercase; letter-spacing:0.6px; margin-top:2px;">
                            ENCCO JUTIAPA 1970
                        </div>
                    </div>

                    <!-- TÍTULO OFICIAL CARNET DOCENTE -->
                    <div style="font-family:'Outfit', sans-serif; font-size:0.82rem; font-weight:900; color:#ea580c; letter-spacing:1.5px; text-transform:uppercase; margin-top:6px; position:relative; z-index:2;">
                        CARNET DOCENTE
                    </div>

                    <!-- FOTO CENTRAL CON MARCO DORADO REFINADO -->
                    <div style="width:84px; height:102px; margin:4px auto 4px auto; border:2.5px solid #d4af37; outline:1px solid #b45309; border-radius:8px; box-shadow:0 3px 8px rgba(0,0,0,0.18); overflow:hidden; background:#f8fafc; display:flex; align-items:center; justify-content:center; flex-shrink:0; position:relative; z-index:2;">
                        ${photoEl}
                    </div>

                    <!-- BLOQUE DE DATOS CENTRADO DEL DOCENTE -->
                    <div style="padding:0 8px; line-height:1.2; flex:1; position:relative; z-index:2;">
                        <div style="font-size:0.50rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.4px;">NOMBRE:</div>
                        <div style="font-size:0.72rem; font-weight:900; color:#0f172a; text-transform:uppercase; max-height:2.4em; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; margin-bottom:3px; padding:0 4px;" title="${name}">
                            ${name}
                        </div>
                        
                        <div style="font-size:0.48rem; font-weight:800; color:#64748b; text-transform:uppercase;">NÚMERO DE IDENTIFICACIÓN:</div>
                        <div style="font-size:0.62rem; font-weight:800; color:#1e293b; margin-bottom:3px;">
                            ${dpi}
                        </div>
                        
                        <div style="font-size:0.48rem; font-weight:800; color:#64748b; text-transform:uppercase;">ÁREA:</div>
                        <div style="font-size:0.58rem; font-weight:800; color:#0f5127; margin-bottom:3px; max-height:2.2em; overflow:hidden; text-overflow:ellipsis; padding:0 6px;" title="${teacherArea}">
                            ${teacherArea}
                        </div>
                        
                        <div style="font-size:0.52rem; font-weight:900; color:#0d47a1; text-transform:uppercase; letter-spacing:0.5px;">
                            ROL: DOCENTE [${renglon}]
                        </div>
                        <div style="font-size:0.46rem; font-weight:700; color:#64748b;">
                            CICLO ${cycle}
                        </div>
                    </div>

                    <!-- CONTENEDOR INFERIOR RESERVADO (BARCODE + QR) -->
                    <div style="background:#ffffff; border:1.2px solid #cbd5e1; border-radius:8px; margin:2px 8px 4px 8px; padding:2px 6px; display:flex; align-items:center; justify-content:space-between; gap:4px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.03); position:relative; z-index:2;">
                        <div style="flex:1; text-align:center; overflow:hidden;">
                            <div style="width:85%; margin:0 auto;">
                                ${barcodeSvg}
                            </div>
                            <div style="font-size:0.44rem; font-family:monospace; color:#475569; font-weight:700; letter-spacing:0.5px; margin-top:1px;">
                                ${teacherId}
                            </div>
                        </div>
                        <div style="flex-shrink:0; border-left:1px solid #e2e8f0; padding-left:4px; display:flex; align-items:center; justify-content:center;" title="Escanear con Celular">
                            ${qrSvg}
                        </div>
                    </div>

                    <!-- BASE INFERIOR CON CURVAS VERDE Y AZUL -->
                    <div style="height:8px; background:linear-gradient(90deg, #0d47a1 0%, #15803d 50%, #0d47a1 100%); border-radius:0 0 12px 12px; position:relative; z-index:2;"></div>

                </div>
            `;
        },

        /**
         * Reverso del carné docente vertical (ultra legible)
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
                <div class="encco-carnet-card encco-carnet-teacher encco-carnet-back" style="width:214px; height:336px; background:#ffffff; border-radius:14px; border:1.5px solid #cbd5e1; box-shadow:0 6px 16px rgba(0,0,0,0.1); overflow:hidden; position:relative; font-family:'Plus Jakarta Sans', sans-serif; display:flex; flex-direction:column; box-sizing:border-box; padding:10px 12px; justify-content:space-between; text-align:center;">
                    
                    <!-- ENCABEZADO INSTITUCIONAL VERTICAL -->
                    <div style="border-bottom:1.5px solid #0f5127; padding-bottom:4px;">
                        <span style="font-family:'Outfit', sans-serif; font-size:0.60rem; font-weight:900; color:#0f5127; text-transform:uppercase; letter-spacing:0.3px; display:block;">
                            REPÚBLICA DE GUATEMALA
                        </span>
                        <span style="font-family:'Outfit', sans-serif; font-size:0.54rem; font-weight:800; color:#15803d; text-transform:uppercase; display:block;">
                            MINISTERIO DE EDUCACIÓN
                        </span>
                        <span style="font-size:0.48rem; color:#475569; font-weight:600; display:block;">
                            ENCCO Jutiapa 1970 | Código: <strong>22-01-0038-46</strong>
                        </span>
                        <span style="font-size:0.48rem; color:#1e40af; font-weight:800; background:#eff6ff; padding:1px 6px; border-radius:3px; display:inline-block; margin-top:2px;">
                            ACREDITACIÓN DOCENTE OFICIAL
                        </span>
                    </div>

                    <!-- FICHA DE DATOS DEL CATEDRÁTICO -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px; font-size:0.52rem; color:#1e293b; text-align:left; line-height:1.3;">
                        <div><strong style="color:#0f5127;">Catedrático:</strong> <span style="font-weight:700;">${name}</span></div>
                        <div><strong style="color:#0f5127;">DPI / ID:</strong> <span>${dpi}</span></div>
                        <div><strong style="color:#0f5127;">Renglón:</strong> <span>${renglon}</span></div>
                        <div><strong style="color:#0f5127;">Título:</strong> <span>${title}</span></div>
                        <div><strong style="color:#0f5127;">Asignaturas:</strong> <span style="font-weight:600; color:#0f172a;">${teacherSubjects}</span></div>
                        <div><strong style="color:#0f5127;">Correo:</strong> <span>${email}</span></div>
                        <div><strong style="color:#0f5127;">Vigencia:</strong> <span style="font-weight:800; color:#15803d;">Ciclo Escolar ${cycle}</span></div>
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
         * Cargar fotografía para estudiante o docente
         */
        promptUploadPhoto(id, type = 'student') {
            let entity = null;
            let listNode = '';

            if (type === 'teacher') {
                const teachers = this.getTeachersList();
                entity = teachers.find(t => t.id === id);
                listNode = 'users';
            } else {
                const students = (window.STATE && Array.isArray(window.STATE.students)) ? window.STATE.students : [];
                entity = students.find(s => s.id === id);
                listNode = 'students';
            }

            if (!entity) return;

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 2.5 * 1024 * 1024) {
                    alert('La fotografía debe ser menor a 2.5 MB.');
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(evt) {
                    entity.photoUrl = evt.target.result;
                    if (typeof window.saveStateToLocalStorage === 'function') {
                        window.saveStateToLocalStorage();
                    }
                    if (typeof window.EnccoCloudSync !== 'undefined' && window.EnccoCloudSync.syncNode) {
                        window.EnccoCloudSync.syncNode(listNode, window.STATE[listNode]);
                    }
                    renderCarnetsView();
                    if (typeof window.showToast === 'function') {
                        window.showToast(`Fotografía actualizada para ${entity.name}.`, 'success');
                    }
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
                                <div style="display:flex; gap:6px; margin-top:2px;">
                                    <button type="button" class="btn btn-xs btn-outline-secondary" onclick="EnccoCarnets.toggleCardSide('${cardId}', '${isDoc ? 'teacher' : 'student'}')" style="font-size:0.72rem; font-weight:700;">
                                        <i class="fa-solid fa-arrows-rotate"></i> Voltear
                                    </button>
                                    <button type="button" class="btn btn-xs btn-outline-primary" onclick="EnccoCarnets.printSingleCard('${cardId}', '${isDoc ? 'teacher' : 'student'}')" style="font-size:0.72rem; font-weight:700;">
                                        <i class="fa-solid fa-print"></i> Imprimir
                                    </button>
                                    <button type="button" class="btn btn-xs btn-outline-success" onclick="EnccoCarnets.promptUploadPhoto('${cardId}', '${isDoc ? 'teacher' : 'student'}')" style="font-size:0.72rem; font-weight:700;">
                                        <i class="fa-solid fa-camera"></i> Foto
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
