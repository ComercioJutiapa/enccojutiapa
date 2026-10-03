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

    // 1. Estrategia por inputs de formulario
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

    // Si aún no tiene código personal, buscar patrones RegExp típicos de código MINEDUC (ej. 1 letra + 3 digitos + 3 letras: G790ASN o CUI de 13 dígitos)
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

// Iniciar inyección cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFloatingSireButton);
} else {
    injectFloatingSireButton();
}

// Escuchar solicitudes desde el popup de la extensión
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'EXTRACT_FROM_SIRE') {
        const data = extractStudentFromSireDOM();
        sendResponse({ success: true, data: data });
    }
});
