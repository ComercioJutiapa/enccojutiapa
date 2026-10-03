// content_sire.js - Script inyectado en portal oficial SIRE MINEDUC (sire.mineduc.gob.gt)
console.log("🏛️ [ENCCO Extensión] Conector activo en portal SIRE MINEDUC");

function extractStudentFromSireDOM() {
    const student = {
        personalCode: '',
        cui: '',
        firstName: '',
        lastName: '',
        birthDate: '',
        gender: '',
        phone: '',
        address: '',
        guardianName: '',
        guardianDpi: '',
        guardianPhone: '',
        grade: '',
        section: ''
    };

    const inputs = Array.from(document.querySelectorAll('input, select, textarea, span, td, div'));

    function findValueByKeywords(keywords) {
        for (const el of inputs) {
            const labelText = (el.labels && el.labels[0]?.innerText) || 
                              el.placeholder || 
                              el.getAttribute('aria-label') || 
                              el.name || 
                              el.id || 
                              (el.previousElementSibling?.innerText) || '';
            const cleanLabel = labelText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            for (const kw of keywords) {
                if (cleanLabel.includes(kw.toLowerCase())) {
                    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                        return el.value?.trim();
                    } else if (el.innerText) {
                        return el.innerText.trim();
                    }
                }
            }
        }
        return '';
    }

    // Extracción de campos
    student.personalCode = findValueByKeywords(['codigo personal', 'cod. personal', 'cod personal', 'codigo_personal']) || '';
    student.cui = findValueByKeywords(['cui', 'dpi', 'documento unico', 'identificacion']) || '';
    
    // Nombres y Apellidos
    const primerNombre = findValueByKeywords(['primer nombre']) || '';
    const segundoNombre = findValueByKeywords(['segundo nombre']) || '';
    const primerApellido = findValueByKeywords(['primer apellido']) || '';
    const segundoApellido = findValueByKeywords(['segundo apellido']) || '';

    if (primerNombre || primerApellido) {
        student.firstName = [primerNombre, segundoNombre].filter(Boolean).join(' ');
        student.lastName = [primerApellido, segundoApellido].filter(Boolean).join(' ');
    } else {
        student.firstName = findValueByKeywords(['nombres']) || '';
        student.lastName = findValueByKeywords(['apellidos']) || '';
    }

    // Fecha de nacimiento y género
    student.birthDate = findValueByKeywords(['fecha nacimiento', 'fecha de nacimiento', 'f. nacimiento']) || '';
    student.gender = findValueByKeywords(['genero', 'sexo']) || '';

    // Encargado
    student.guardianName = findValueByKeywords(['nombre del padre', 'padre', 'madre', 'tutor', 'encargado']) || '';
    student.guardianDpi = findValueByKeywords(['dpi padre', 'dpi encargado', 'cui encargado', 'cui padre']) || '';
    student.guardianPhone = findValueByKeywords(['telefono', 'celular', 'tel.']) || '';
    student.address = findValueByKeywords(['direccion', 'domicilio']) || '';

    if (!student.personalCode) {
        const textContent = document.body.innerText || '';
        const codeMatch = textContent.match(/\b([A-Z0-9]{7,9})\b/);
        if (codeMatch) student.personalCode = codeMatch[1];
    }

    if (!student.cui) {
        const textContent = document.body.innerText || '';
        const cuiMatch = textContent.match(/\b\d{4}\s?\d{5}\s?\d{4}\b/);
        if (cuiMatch) student.cui = cuiMatch[0].replace(/\s+/g, '');
    }

    return student;
}

// Inyectar botón flotante discreto en el portal SIRE
function injectFloatingSireButton() {
    if (document.getElementById('encco-sire-floating-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'encco-sire-floating-btn';
    btn.innerHTML = `
        <div style="position:fixed; bottom:20px; right:20px; z-index:999999; background:linear-gradient(135deg, #0f2b5c, #059669); color:#ffffff; padding:10px 16px; border-radius:30px; box-shadow:0 8px 24px rgba(0,0,0,0.3); font-family:sans-serif; font-size:13px; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:8px; border:2px solid #38bdf8; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <span style="background:#ea580c; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px;">🎓</span>
            <span>Transferir a ENCCO</span>
        </div>
    `;

    btn.addEventListener('click', () => {
        const data = extractStudentFromSireDOM();
        if (!data.personalCode && !data.firstName) {
            alert('⚠️ No se detectó una ficha abierta de estudiante en esta pantalla del SIRE.\nAbra el expediente del alumno e intente de nuevo.');
            return;
        }

        chrome.runtime.sendMessage({
            action: 'SEND_TO_ENCCO',
            data: data
        }, (res) => {
            const notif = document.createElement('div');
            notif.style.cssText = "position:fixed; bottom:70px; right:20px; z-index:999999; background:#15803d; color:#fff; padding:10px 18px; border-radius:8px; font-family:sans-serif; font-size:13px; font-weight:bold; box-shadow:0 6px 18px rgba(0,0,0,0.25);";
            notif.innerHTML = `✅ Alumno capturado: ${data.firstName || data.personalCode}<br><small style="font-weight:normal;">Enviando a Plataforma ENCCO...</small>`;
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), 4000);
        });
    });

    document.body.appendChild(btn);
}

// =========================================================================
// OPCIÓN 3: ASISTENTE DE MATRÍCULA EN SIRE (RECIBE DATOS DESDE ENCCO)
// =========================================================================
function fillSireEnrollmentForm(data) {
    if (!data) return;

    console.log("🏛️ [ENCCO Extensión] Rellenando formulario ministerial en SIRE para:", data);

    const inputs = Array.from(document.querySelectorAll('input, select, textarea'));

    function fillMatchingInput(keywords, value) {
        if (!value) return false;
        for (const el of inputs) {
            const labelText = (el.labels && el.labels[0]?.innerText) || 
                              el.placeholder || 
                              el.getAttribute('aria-label') || 
                              el.name || 
                              el.id || 
                              (el.previousElementSibling?.innerText) || '';
            const clean = labelText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            for (const kw of keywords) {
                if (clean.includes(kw.toLowerCase())) {
                    el.value = value;
                    el.style.borderColor = '#16a34a';
                    el.style.backgroundColor = '#f0fdf4';
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
            }
        }
        return false;
    }

    // Llenar campos disponibles en SIRE
    fillMatchingInput(['codigo personal', 'cod personal', 'codigo_personal'], data.personalCode);
    fillMatchingInput(['cui', 'dpi', 'identificacion'], data.cui);
    fillMatchingInput(['nombres', 'primer nombre'], data.firstName || data.name);
    fillMatchingInput(['apellidos', 'primer apellido'], data.lastName);
    fillMatchingInput(['fecha nacimiento', 'f. nacimiento'], data.birthDate);
    fillMatchingInput(['telefono', 'celular'], data.phone);
    fillMatchingInput(['direccion', 'domicilio'], data.address);
    fillMatchingInput(['padre', 'madre', 'tutor', 'encargado'], data.guardianName);
    fillMatchingInput(['dpi encargado', 'dpi padre', 'cui encargado'], data.guardianDpi);

    // Banner de asistencia ministerial
    const existingBanner = document.getElementById('encco-sire-assistant-banner');
    if (existingBanner) existingBanner.remove();

    const banner = document.createElement('div');
    banner.id = 'encco-sire-assistant-banner';
    banner.innerHTML = `
        <div style="position:fixed; top:20px; right:20px; z-index:9999999; background:#ffffff; border:2px solid #16a34a; border-radius:12px; padding:16px 20px; box-shadow:0 12px 32px rgba(0,0,0,0.3); max-width:390px; font-family:-apple-system,BlinkMacSystemFont,sans-serif; animation:slideIn 0.3s ease;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                <span style="background:#15803d; color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:15px;">🏛️</span>
                <div>
                    <h4 style="margin:0; font-size:13px; font-weight:800; color:#0f2b5c;">ENCCO - Asistente de Matrícula SIRE</h4>
                    <span style="color:#15803d; font-size:11px; font-weight:700;">Inscripción Asistida en 1 Clic</span>
                </div>
            </div>
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px; font-size:12px; margin-bottom:12px; color:#14532d; line-height:1.4;">
                <strong>Estudiante:</strong> ${data.firstName} ${data.lastName}<br>
                <strong>Código Personal:</strong> <code style="font-weight:800; font-size:13px; color:#0f5127;">${data.personalCode || 'No registrado'}</code><br>
                <strong>CUI:</strong> ${data.cui || '-'}<br>
                <strong>Grado Asignado:</strong> ${data.grade || '-'}
            </div>
            <p style="font-size:11px; color:#334155; margin-bottom:12px; line-height:1.45;">
                ✅ <strong>Casillas completadas automáticamente.</strong><br>
                👉 Revise que los requisitos ministeriales estén correctos y presione el botón oficial <strong>"Confirmar Matrícula"</strong> en el SIRE para asentar la inscripción legal.
            </p>
            <button type="button" id="encco-sire-banner-close-btn" style="width:100%; background:#15803d; color:#ffffff; border:none; padding:9px; border-radius:7px; font-weight:800; font-size:12px; cursor:pointer;">
                Entendido, continuar en el SIRE
            </button>
        </div>
    `;

    document.body.appendChild(banner);
    document.getElementById('encco-sire-banner-close-btn')?.addEventListener('click', () => banner.remove());
}

// Iniciar inyección cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFloatingSireButton);
} else {
    injectFloatingSireButton();
}

// Escuchar solicitudes desde popup o background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'EXTRACT_FROM_SIRE') {
        const data = extractStudentFromSireDOM();
        sendResponse({ success: true, data: data });
    }
    if (msg.action === 'AUTOFILL_SIRE_ENROLLMENT') {
        fillSireEnrollmentForm(msg.data);
        sendResponse({ success: true, message: 'Formulario SIRE prellenado' });
    }
});

// Comprobar inscripción pendiente en SIRE
chrome.storage.local.get(['pendingSireEnrollment'], (result) => {
    if (result && result.pendingSireEnrollment) {
        fillSireEnrollmentForm(result.pendingSireEnrollment);
        chrome.storage.local.remove('pendingSireEnrollment');
    }
});
