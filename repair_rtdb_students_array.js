const https = require('https');

function request(url, method, body = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
                } catch(e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function run() {
    console.log("=== INICIANDO REPARACIÓN QUIRÚRGICA DE LA BASE DE DATOS RTDB ===");

    // 1. Obtener la exoneración guardada en stu-sire-H652EZI
    console.log("1. Leyendo datos de stu-sire-H652EZI...");
    const rRogue = await request('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students/stu-sire-H652EZI.json', 'GET');
    const rogueData = rRogue.body;
    console.log("Datos encontrados:", rogueData ? "OK" : "NO ENCONTRADO");
    const exceptions = (rogueData && rogueData.academicExceptions) || [];
    console.log("Excepciones encontradas:", exceptions.length);

    // 2. Leer estudiantes en los índices 246 y 247
    console.log("2. Leyendo estudiantes en índices 246 y 247...");
    const r246 = await request('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students/246.json', 'GET');
    const r247 = await request('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students/247.json', 'GET');

    // 3. Parchear índices con las excepciones académicas
    if (r246.body && exceptions.length > 0) {
        console.log("3.1 Actualizando índice 246:", r246.body.name);
        await request('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students/246/academicExceptions.json', 'PUT', exceptions);
        await request('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students/246/exoneraciones.json', 'PUT', exceptions);
    }
    if (r247.body && exceptions.length > 0) {
        console.log("3.2 Actualizando índice 247:", r247.body.name);
        await request('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students/247/academicExceptions.json', 'PUT', exceptions);
        await request('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students/247/exoneraciones.json', 'PUT', exceptions);
    }

    // 4. Guardar en nodo dedicado /exoneraciones
    if (exceptions.length > 0) {
        console.log("4. Guardando en nodo dedicado /exoneraciones...");
        for (const ex of exceptions) {
            const exId = ex.id || `exon_stu-sire-H652EZI_ALL_4`;
            await request(`https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/exoneraciones/${exId}.json`, 'PUT', ex);
            await request(`https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/exoneraciones/${exId}.json`, 'PUT', ex);
        }
    }

    // 5. ELIMINAR la clave rogue stu-sire-H652EZI de /students
    console.log("5. Eliminando clave desestructurante 'stu-sire-H652EZI' de /students...");
    const del1 = await request('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students/stu-sire-H652EZI.json', 'DELETE');
    console.log("Resultado eliminación en /encc_school_state/students/stu-sire-H652EZI:", del1.status);

    const del2 = await request('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/students/stu-sire-H652EZI.json', 'DELETE');
    console.log("Resultado eliminación en /students/stu-sire-H652EZI:", del2.status);

    // 6. Verificar si RTDB volvió a ser un Array
    console.log("6. Verificando estructura de /students en RTDB...");
    const check1 = await request('https://encco-jutiapa-live-2026-default-rtdb.firebaseio.com/encc_school_state/students.json', 'GET');
    console.log("Tipo de datos:", typeof check1.body, "Es Array:", Array.isArray(check1.body));
    if (Array.isArray(check1.body)) {
        console.log("🎉 ÉXITO: /students volvió a ser un Array con", check1.body.length, "estudiantes!");
    } else {
        console.log("Claves actuales:", Object.keys(check1.body).slice(-5));
    }
}

run().catch(console.error);
