const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_BACKUPS = 3;

function getTimestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function run(cmd, cwd) {
    console.log(`> ${cmd}`);
    return execSync(cmd, { stdio: 'inherit', encoding: 'utf8', cwd });
}

function pruneOldBackups(backupDir, maxCount = MAX_BACKUPS) {
    if (!fs.existsSync(backupDir)) return;
    const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_encco_') && f.endsWith('.zip'))
        .map(f => {
            const fullPath = path.join(backupDir, f);
            return {
                name: f,
                path: fullPath,
                time: fs.statSync(fullPath).mtime.getTime()
            };
        })
        .sort((a, b) => b.time - a.time); // Ordenar de más reciente a más antiguo

    if (files.length > maxCount) {
        const toDelete = files.slice(maxCount);
        console.log(`\n🧹 Rotación automática de seguridad: se conservan los ${maxCount} respaldos más recientes.`);
        toDelete.forEach(item => {
            try {
                fs.unlinkSync(item.path);
                console.log(`   🗑️ Eliminado respaldo antiguo: ${item.name}`);
            } catch (err) {
                console.warn(`   ⚠️ No se pudo eliminar ${item.name}:`, err.message);
            }
        });
    }
}

function createBackupAndPush(commitMsg = 'Respaldo automático y sincronización') {
    const projectDir = 'C:\\Users\\yalil\\.gemini\\antigravity-ide\\scratch\\plataforma_escuela_comercio_completa';
    const timestamp = getTimestamp();
    const backupDir = path.join(projectDir, 'respaldos');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestampedZip = path.join(backupDir, `backup_encco_${timestamp}.zip`);
    const mainZip = path.join(projectDir, 'plataforma_escuela_comercio_completa.zip');

    console.log(`\n📦 [1/3] Generando copias de seguridad en formato ZIP...`);
    
    // Obtener lista de archivos del proyecto (excluyendo .git, respaldos y zips)
    const trackedFiles = execSync('git ls-files', { encoding: 'utf8', cwd: projectDir })
        .split(/\r?\n/)
        .map(f => f.trim())
        .filter(f => f && !f.endsWith('.zip') && !f.startsWith('respaldos/'));

    // Guardar lista temporal para empaquetar
    const listFile = path.join(projectDir, '.temp_filelist.txt');
    fs.writeFileSync(listFile, trackedFiles.join('\n'), 'utf8');

    try {
        // Empaquetar usando tar nativo de Windows
        run(`tar -a -c -f "${timestampedZip}" -T "${listFile}"`, projectDir);
        run(`tar -a -c -f "${mainZip}" -T "${listFile}"`, projectDir);
        console.log(`✅ Copia con marca de tiempo: ${timestampedZip}`);
        console.log(`✅ ZIP principal actualizado: ${mainZip}`);
    } finally {
        if (fs.existsSync(listFile)) fs.unlinkSync(listFile);
    }

    // Rotar para no superar el límite de 3 respaldos históricos
    pruneOldBackups(backupDir, MAX_BACKUPS);

    console.log(`\n🚀 [2/3] Preparando commit en Git...`);
    run(`git add .`, projectDir);
    
    // Verificar si hay cambios para commitear
    const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: projectDir }).trim();
    if (status) {
        const fullMsg = `[Backup ${timestamp}] ${commitMsg}`;
        run(`git commit -m "${fullMsg}"`, projectDir);
        console.log(`✅ Cambios confirmados en git: "${fullMsg}"`);
    } else {
        console.log(`ℹ️ No hay cambios pendientes de código en el árbol de trabajo.`);
    }

    console.log(`\n☁️ [3/3] Subiendo a repositorio oficial en GitHub...`);
    try {
        run(`git push origin main`, projectDir);
        console.log(`✅ ¡Sincronizado con éxito en GitHub (origin/main)!`);
    } catch (err) {
        console.error(`⚠️ Error al subir a GitHub:`, err.message);
        throw err;
    }

    console.log(`\n🎉 Proceso de seguridad completado (Máximo 3 respaldos guardados).\n`);
    return { timestamp, timestampedZip, mainZip };
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const msg = process.argv.slice(2).join(' ') || 'Actualización y respaldo de seguridad';
    createBackupAndPush(msg);
}

module.exports = { createBackupAndPush, pruneOldBackups, MAX_BACKUPS };
