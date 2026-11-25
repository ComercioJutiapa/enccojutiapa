#!/usr/bin/env node
/**
 * ============================================================================
 * 🔐 MIGRADOR ATÓMICO DE CORREO INSTITUCIONAL — ENCCO JUTIAPA
 * ----------------------------------------------------------------------------
 * Actualiza el correo electrónico de un usuario de forma atómica en las 5 capas
 * sin perder su UID, contraseña ni permisos:
 *   1. Google Firebase Authentication (Identity Toolkit accounts:update)
 *   2. RTDB /authorized_uids/<uid>/email
 *   3. Cloud Firestore authorized_uids/<uid>
 *   4. RTDB /encc_school_state/users (registro del usuario)
 *   5. Cloud Firestore users/<id>
 *
 * Uso (modo simulación seguro por defecto — NO modifica nada):
 *   node scripts/migrate_user_email.js --old correo.viejo@gmail.com --new correo.nuevo@mineduc.edu.gt
 *
 * Uso para aplicar cambios reales:
 *   node scripts/migrate_user_email.js --old correo.viejo@gmail.com --new correo.nuevo@mineduc.edu.gt --apply
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { execSync } = require('child_process');

const PROJECT_ID = 'encco-jutiapa-live-2026';
const WORKSPACE = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { oldEmail: '', newEmail: '', apply: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--old' && argv[i + 1]) args.oldEmail = String(argv[++i]).trim().toLowerCase();
    else if (argv[i] === '--new' && argv[i + 1]) args.newEmail = String(argv[++i]).trim().toLowerCase();
    else if (argv[i] === '--apply') args.apply = true;
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
  }
  return args;
}

function getAccessToken() {
  try {
    execSync(`firebase.cmd database:get /encc_school_state/activeCycle --project ${PROJECT_ID}`, {
      cwd: WORKSPACE,
      stdio: 'pipe'
    });
  } catch (_) {}
  const cfgPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (!cfg || !cfg.tokens || !cfg.tokens.access_token) {
    throw new Error('No se encontró access_token activo de Firebase CLI. Ejecute `firebase login`.');
  }
  return cfg.tokens.access_token;
}

function httpJson(url, method, token, bodyObj) {
  return new Promise((resolve, reject) => {
    const data = bodyObj !== undefined ? JSON.stringify(bodyObj) : null;
    const req = https.request(url, {
      method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (_) {}
        resolve({ status: res.statusCode, body: parsed || body });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const args = parseArgs(process.argv);
  if (args.help || !args.oldEmail || !args.newEmail || !args.oldEmail.includes('@') || !args.newEmail.includes('@')) {
    console.log('Uso:');
    console.log('  node scripts/migrate_user_email.js --old <correo_actual> --new <correo_nuevo> [--apply]');
    console.log('Por defecto corre en modo simulación (dry-run) sin modificar Firebase.');
    process.exit(args.help ? 0 : 1);
  }
  if (args.oldEmail === args.newEmail) {
    console.error('❌ El correo actual y el correo nuevo son idénticos.');
    process.exit(1);
  }

  const token = getAccessToken();
  const rtdbBase = `https://${PROJECT_ID}-default-rtdb.firebaseio.com`;
  const fsBase = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

  // 1. Buscar usuario en Firebase Auth
  const authRes = await httpJson(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
    'POST',
    token,
    { email: [args.oldEmail] }
  );
  const authUser = authRes.status === 200 && authRes.body && Array.isArray(authRes.body.users) ? authRes.body.users[0] : null;
  if (!authUser || !authUser.localId) {
    console.error(`❌ No se encontró el correo ${args.oldEmail} en Firebase Auth.`);
    process.exit(1);
  }
  const uid = authUser.localId;

  // Verificar que el correo nuevo no esté ya ocupado en Firebase Auth
  const conflictRes = await httpJson(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
    'POST',
    token,
    { email: [args.newEmail] }
  );
  if (conflictRes.status === 200 && conflictRes.body && Array.isArray(conflictRes.body.users) && conflictRes.body.users.length > 0) {
    console.error(`❌ El correo destino ${args.newEmail} ya existe en Firebase Auth (UID: ${conflictRes.body.users[0].localId}).`);
    process.exit(1);
  }

  // 2. Cargar /encc_school_state/users y /authorized_uids/<uid>
  const [usersRes, allowRes] = await Promise.all([
    httpJson(`${rtdbBase}/encc_school_state/users.json`, 'GET', token),
    httpJson(`${rtdbBase}/authorized_uids/${uid}.json`, 'GET', token)
  ]);
  const users = Array.isArray(usersRes.body) ? usersRes.body : [];
  const userIdx = users.findIndex(u => u && String(u.email || '').trim().toLowerCase() === args.oldEmail);
  const userRecord = userIdx >= 0 ? users[userIdx] : null;
  const allowRecord = allowRes.body && typeof allowRes.body === 'object' ? allowRes.body : null;

  console.log('====================================================================');
  console.log(args.apply ? '🚀 MODO APLICACIÓN REAL (--apply)' : '🧪 MODO SIMULACIÓN (DRY-RUN — SIN CAMBIOS)');
  console.log('====================================================================');
  console.log(`UID Firebase Auth : ${uid}`);
  console.log(`Correo actual     : ${args.oldEmail}`);
  console.log(`Correo nuevo      : ${args.newEmail}`);
  console.log(`Usuario en RTDB   : ${userRecord ? `${userRecord.id} (${userRecord.name}, rol: ${userRecord.role})` : 'NO ENCONTRADO'}`);
  console.log(`En authorized_uids: ${allowRecord ? `active=${allowRecord.active}, role=${allowRecord.role}` : 'NO ENCONTRADO'}`);

  if (!args.apply) {
    console.log('\n✅ Simulación completada sin errores. Agregue --apply para ejecutar la migración real.');
    process.exit(0);
  }

  // Aplicar en las 5 capas de forma ordenada
  const updAuth = await httpJson(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
    'POST',
    token,
    { localId: uid, email: args.newEmail }
  );
  if (updAuth.status < 200 || updAuth.status >= 300) {
    throw new Error('Error actualizando Firebase Auth: HTTP ' + updAuth.status + ' ' + JSON.stringify(updAuth.body));
  }
  console.log('✅ 1/5 Firebase Auth actualizado (UID y contraseña preservados).');

  const nowIso = new Date().toISOString();
  const nextAllow = {
    ...(allowRecord || { role: (userRecord && userRecord.role) || 'docente', active: true }),
    email: args.newEmail,
    emailMigratedAt: nowIso
  };
  await httpJson(`${rtdbBase}/authorized_uids/${uid}.json`, 'PUT', token, nextAllow);
  console.log('✅ 2/5 RTDB /authorized_uids actualizado.');

  await httpJson(`${fsBase}/authorized_uids/${uid}?updateMask.fieldPaths=email&updateMask.fieldPaths=role&updateMask.fieldPaths=active`, 'PATCH', token, {
    fields: {
      email: { stringValue: args.newEmail },
      role: { stringValue: String(nextAllow.role || 'docente') },
      active: { booleanValue: nextAllow.active !== false }
    }
  });
  console.log('✅ 3/5 Cloud Firestore authorized_uids actualizado.');

  if (userRecord && userIdx >= 0) {
    users[userIdx].email = args.newEmail;
    await httpJson(`${rtdbBase}/encc_school_state/users/${userIdx}/email.json`, 'PUT', token, args.newEmail);
    await httpJson(`${rtdbBase}/encc_school_state/lastModified.json`, 'PUT', token, Date.now());
    console.log(`✅ 4/5 RTDB /encc_school_state/users/${userIdx}/email actualizado atómicamente.`);

    await httpJson(`${fsBase}/users/${encodeURIComponent(userRecord.id)}?updateMask.fieldPaths=email`, 'PATCH', token, {
      fields: { email: { stringValue: args.newEmail } }
    });
    console.log(`✅ 5/5 Cloud Firestore users/${userRecord.id} actualizado.`);
  } else {
    console.log('⚠️ 4-5/5 No existía registro en /encc_school_state/users para este correo (solo se actualizó Auth y allowlist).');
  }

  console.log('\n🎉 Migración atómica completada sin pérdida de acceso. Recuerde actualizar el alias en firebase_auth_bridge.js si aplica.');
})();
