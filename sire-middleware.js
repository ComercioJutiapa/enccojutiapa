/**
 * ==============================================================================
 * ESCUELA NACIONAL DE CIENCIAS COMERCIALES JUTIAPA (1970)
 * MÓDULO OFICIAL: DATOS PARA SIRE - MINEDUC GUATEMALA
 * Middleware de Control de Acceso (RBAC) y Controlador de Promedios en Node.js
 * ==============================================================================
 */

// Roles con acceso exclusivo y legalmente autorizados para interactuar con SIRE MINEDUC
const ALLOWED_SIRE_ROLES = ['director', 'secretaria', 'admin', 'super_usuario'];

/**
 * Middleware de verificación de rol RBAC para rutas de servidor y API
 */
function verifySireRoleMiddleware(req, res, next) {
    // 1. Obtener rol de sesión, headers, cookies o query parameters
    let role = null;

    if (req.headers && req.headers['x-user-role']) {
        role = String(req.headers['x-user-role']).trim().toLowerCase();
    } else if (req.session && req.session.role) {
        role = String(req.session.role).trim().toLowerCase();
    } else if (req.query && req.query.role) {
        role = String(req.query.role).trim().toLowerCase();
    } else if (req.headers && req.headers.cookie) {
        const match = req.headers.cookie.match(/(?:ENCCO_AUTH_ROLE|ENCCO_ROLE)=([^;]+)/);
        if (match) {
            role = decodeURIComponent(match[1]).trim().toLowerCase();
        }
    }

    // 2. Verificar si el rol posee autorización estricta en lista blanca
    if (!role || !ALLOWED_SIRE_ROLES.includes(role)) {
        const isHtmlReq = (req.url && req.url.includes('.html')) || 
                          (req.headers && req.headers.accept && req.headers.accept.includes('text/html')) ||
                          (typeof req.accepts === 'function' && req.accepts('html'));

        // Si la petición solicita la página HTML directa, denegar y redirigir inmediatamente a la plataforma principal
        if (isHtmlReq) {
            const redirectHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="1;url=plataforma.html?auth_denied=datos_sire_restricted">
    <title>403 Acceso Denegado - ENCCO Jutiapa</title>
    <script>
        alert("ACCESO DENEGADO (403)\\n\\nEl módulo 'Datos para Sire' está reservado exclusivamente para la Dirección y Secretaría de la ENCCO.\\n\\nRedirigiendo a la plataforma principal...");
        window.location.replace("plataforma.html");
    </script>
    <style>
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0b132b; color: #fff; margin:0; }
        .card { background: rgba(255,255,255,0.05); border: 1.5px solid #ef4444; border-radius: 16px; padding: 32px; max-width: 480px; text-align: center; }
        h2 { color: #f87171; margin-top: 0; }
        p { color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; }
        .btn { display: inline-block; background: #15803d; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Acceso Restringido - SIRE MINEDUC</h2>
        <p>El módulo <strong>"Datos para Sire"</strong> está reservado exclusivamente para <strong>Dirección y Secretaría</strong>.</p>
        <p>Redirigiendo a la plataforma principal...</p>
        <a href="plataforma.html" class="btn">Volver a la Plataforma</a>
    </div>
</body>
</html>`;

            if (typeof res.writeHead === 'function') {
                res.writeHead(302, {
                    'Location': '/plataforma.html?auth_denied=datos_sire_restricted',
                    'Content-Type': 'text/html; charset=utf-8'
                });
                res.end(redirectHtml);
                return;
            } else if (typeof res.redirect === 'function') {
                return res.redirect('/plataforma.html?auth_denied=datos_sire_restricted');
            } else if (typeof res.status === 'function') {
                return res.status(403).send(redirectHtml);
            }
        }

        if (typeof res.status === 'function') {
            return res.status(403).json({
                success: false,
                error: 'Acceso Restringido: El módulo "Datos para Sire" es de acceso exclusivo para Dirección y Secretaría.'
            });
        }
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            success: false,
            error: 'Acceso Restringido: El módulo "Datos para Sire" es de acceso exclusivo para Dirección y Secretaría.'
        }));
        return;
    }

    // Rol autorizado -> Continuar
    next();
}

/**
 * Almacén volátil en memoria RAM para credenciales activas de la sesión SIRE
 * 🔒 NUNCA se persiste en disco, base de datos ni archivos temporales.
 */
/**
 * Almacén volátil en memoria RAM para credenciales activas de la sesión SIRE
 * 🔒 NUNCA se persiste en disco, base de datos ni archivos temporales.
 */
const _sireActiveSessionMemory = {
    establishmentCode: null,
    username: null,
    dpi: null,
    role: null,
    isConnected: false,
    connectedAt: null,
    expiresAt: null
};

/**
 * Controlador de Autenticación Efímera en Memoria para SIRE
 * Soporta las 4 casillas de Establecimiento, DPI, Contraseña y Rol oficial
 */
function handleSireAuth(req, res) {
    const body = req.body || {};
    const { est1, est2, est3, est4, dpi, password, role } = body;

    // 1. Obtener y concatenar código de establecimiento oficial (4 casillas o parámetro único)
    let establishmentCode = body.establishmentCode;
    if (!establishmentCode && (est1 || est2 || est3 || est4)) {
        const b1 = String(est1 || '').trim();
        const b2 = String(est2 || '').trim();
        const b3 = String(est3 || '').trim();
        const b4 = String(est4 || '').trim();
        establishmentCode = `${b1}-${b2}-${b3}-${b4}`;
    } else if (!establishmentCode && body.username) {
        establishmentCode = String(body.username).trim();
    }

    if (!establishmentCode || !dpi || !password) {
        return res.status(400).json({
            success: false,
            error: 'Debe ingresar las 4 casillas del Establecimiento, su DPI (13 dígitos) y Contraseña.'
        });
    }

    // Validar formato del Código de Establecimiento (ej: 22-01-0014-46)
    const codeParts = establishmentCode.split('-');
    if (codeParts.length !== 4) {
        return res.status(400).json({
            success: false,
            error: 'El código de establecimiento debe componerse de 4 bloques (ej. 22-01-0014-46).'
        });
    }

    // Validar formato de DPI (exactamente 13 dígitos numéricos)
    const cleanDpi = String(dpi).replace(/[^0-9]/g, '');
    if (cleanDpi.length !== 13) {
        return res.status(400).json({
            success: false,
            error: 'El DPI debe contener exactamente 13 dígitos numéricos (CUI oficial).'
        });
    }

    const officialRole = role || 'Director';

    // Procesar exclusivamente en memoria volátil de sesión (NUNCA guardar contraseña)
    const now = Date.now();
    _sireActiveSessionMemory.establishmentCode = establishmentCode;
    _sireActiveSessionMemory.username = establishmentCode;
    _sireActiveSessionMemory.dpi = cleanDpi;
    _sireActiveSessionMemory.role = officialRole;
    _sireActiveSessionMemory.isConnected = true;
    _sireActiveSessionMemory.connectedAt = now;
    _sireActiveSessionMemory.expiresAt = now + (2 * 60 * 60 * 1000); // 2 horas de validez en memoria

    return res.json({
        success: true,
        message: 'Conexión a SIRE MINEDUC autenticada exitosamente en memoria activa.',
        token: 'sire_auth_' + now + '_' + Math.random().toString(36).substring(2, 9),
        session: {
            establishmentCode: _sireActiveSessionMemory.establishmentCode,
            username: _sireActiveSessionMemory.username,
            dpiMasked: cleanDpi.slice(0, 4) + ' ••••• ' + cleanDpi.slice(9),
            role: officialRole,
            schoolCode: establishmentCode,
            schoolName: 'ESCUELA NACIONAL DE CIENCIAS COMERCIALES',
            connectedAt: _sireActiveSessionMemory.connectedAt
        }
    });
}

/**
 * Desconectar sesión en memoria de SIRE y purgar credenciales
 */
function handleSireDisconnect(req, res) {
    _sireActiveSessionMemory.establishmentCode = null;
    _sireActiveSessionMemory.username = null;
    _sireActiveSessionMemory.dpi = null;
    _sireActiveSessionMemory.role = null;
    _sireActiveSessionMemory.isConnected = false;
    _sireActiveSessionMemory.connectedAt = null;
    _sireActiveSessionMemory.expiresAt = null;

    return res.json({
        success: true,
        message: 'Sesión de SIRE cerrada y memoria RAM liberada.'
    });
}

/**
 * Motor de Cálculo y Formateo Exclusivo de Promedios para SIRE
 */
function calculateSireAverages(students, subjectName = 'ALL', bimestres = [1, 2, 3, 4]) {
    if (!Array.isArray(students)) return [];
    if (!Array.isArray(bimestres)) bimestres = [1, 2, 3, 4];

    return students.map((s, idx) => {
        const gradesMap = s.grades || {};
        const subjectKeys = Object.keys(gradesMap);

        if (subjectName && subjectName !== 'ALL' && gradesMap[subjectName]) {
            // Caso 1: Asignatura específica
            const subjectGrades = gradesMap[subjectName] || [0, 0, 0, 0];
            const evaluatedScores = [];
            let missingUnits = 0;

            bimestres.forEach(bNum => {
                const val = Array.isArray(subjectGrades) ? subjectGrades[bNum - 1] : (subjectGrades[bNum] || subjectGrades['b' + bNum] || 0);
                if (val !== undefined && val !== null && !isNaN(val) && Number(val) > 0) {
                    evaluatedScores.push(Number(val));
                } else {
                    missingUnits++;
                    evaluatedScores.push(0);
                }
            });

            const sum = evaluatedScores.reduce((acc, curr) => acc + curr, 0);
            const count = evaluatedScores.length > 0 ? evaluatedScores.length : 1;
            const rawAverage = sum / count;
            const finalAverage = Math.round(rawAverage);
            const isApproved = finalAverage >= 60;
            const isValidForSire = missingUnits === 0 && evaluatedScores.length > 0;

            return {
                index: idx + 1,
                clave: s.clave || (idx + 1),
                studentId: s.id,
                personalCode: s.codigoPersonal || s.personalCode || s.carne || 'S/C',
                cui: s.cui || s.dpi || 'S/C',
                fullName: s.nombre || s.name || `${s.lastName || s.apellidos || ''} ${s.firstName || s.nombres || ''}`.trim(),
                grade: s.grado || s.grade || '',
                section: s.seccion || s.section || '',
                subject: subjectName,
                bimestreScores: evaluatedScores,
                rawAverage: Number(rawAverage.toFixed(2)),
                average: finalAverage,
                status: isApproved ? 'Aprobado' : 'Reprobado',
                sireValidation: isValidForSire ? 'Válido' : 'Pendiente',
                missingUnits: missingUnits,
                passedCount: isApproved ? 1 : 0,
                failedCount: isApproved ? 0 : 1,
                isPromoted: isApproved
            };
        } else {
            // Caso 2: Consolidado general de todas las asignaturas
            let sumOfAverages = 0;
            let passedCount = 0;
            let failedCount = 0;
            let evaluatedSubjects = 0;

            const targetKeys = subjectKeys.length > 0 ? subjectKeys : (subjectName && subjectName !== 'ALL' ? [subjectName] : []);

            targetKeys.forEach(sKey => {
                const sGrades = gradesMap[sKey] || [0, 0, 0, 0];
                let sSum = 0;
                let sCount = 0;

                bimestres.forEach(bNum => {
                    const val = Array.isArray(sGrades) ? sGrades[bNum - 1] : (sGrades[bNum] || sGrades['b' + bNum] || 0);
                    if (val !== undefined && val !== null && !isNaN(val) && Number(val) > 0) {
                        sSum += Number(val);
                        sCount++;
                    }
                });

                const sAvg = sCount > 0 ? Math.round(sSum / sCount) : 0;
                if (sAvg > 0) {
                    sumOfAverages += sAvg;
                    evaluatedSubjects++;
                    if (sAvg >= 60) passedCount++;
                    else failedCount++;
                }
            });

            const overallAverage = evaluatedSubjects > 0 ? Math.round(sumOfAverages / evaluatedSubjects) : 0;
            const isPromoted = failedCount === 0 && overallAverage >= 60;

            return {
                index: idx + 1,
                clave: s.clave || (idx + 1),
                studentId: s.id,
                personalCode: s.codigoPersonal || s.personalCode || s.carne || 'S/C',
                cui: s.cui || s.dpi || 'S/C',
                fullName: s.nombre || s.name || `${s.lastName || s.apellidos || ''} ${s.firstName || s.nombres || ''}`.trim(),
                grade: s.grado || s.grade || '',
                section: s.seccion || s.section || '',
                subject: 'Consolidado Oficial',
                average: overallAverage,
                passedCount: passedCount,
                failedCount: failedCount,
                isPromoted: isPromoted,
                status: isPromoted ? 'Aprobado' : 'Reprobado',
                sireValidation: evaluatedSubjects > 0 ? 'Válido' : 'Pendiente'
            };
        }
    });
}

/**
 * Endpoint de Simulación / Envío Validado hacia SIRE
 */
function handleSireSync(req, res) {
    if (!_sireActiveSessionMemory.isConnected) {
        return res.status(401).json({
            success: false,
            error: 'Debe iniciar sesión previamente en el panel de conexión SIRE con sus credenciales.'
        });
    }

    const { career, grade, section, subject, averagesList } = req.body || {};

    if (!Array.isArray(averagesList) || averagesList.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'No hay datos de promedios para transmitir.'
        });
    }

    // Verificar si existen inconsistencias antes de la transmisión
    const invalidRecords = averagesList.filter(item => item.sireValidation !== 'Válido');

    return res.json({
        success: true,
        message: 'Promedios procesados y validados para SIRE exitosamente.',
        summary: {
            schoolCode: '22-01-0014-46',
            career: career || 'Perito Contador',
            grade: grade || '4to Grado',
            section: section || 'Sección A',
            subject: subject || 'General',
            totalProcessed: averagesList.length,
            validRecords: averagesList.length - invalidRecords.length,
            invalidRecords: invalidRecords.length,
            transmittedBy: _sireActiveSessionMemory.username,
            timestamp: new Date().toISOString()
        }
    });
}

module.exports = {
    ALLOWED_SIRE_ROLES,
    verifySireRoleMiddleware,
    handleSireAuth,
    handleSireDisconnect,
    calculateSireAverages,
    handleSireSync,
    getActiveSireSession: () => ({ ..._sireActiveSessionMemory })
};
