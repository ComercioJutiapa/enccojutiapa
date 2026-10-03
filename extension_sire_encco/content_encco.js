// content_encco.js - Script inyectado en la plataforma ENCCO Jutiapa
console.log("🏛️ [ENCCO Extensión] Receptor de datos SIRE conectado");

function fillEnrollmentForm(data) {
    if (!data) return;

    // Asegurar navegación al módulo de inscripción
    if (typeof window.navigateTo === 'function') {
        window.navigateTo('enrollment');
    } else {
        const navBtn = document.querySelector('[data-view="enrollment"]');
        if (navBtn) navBtn.click();
    }

    setTimeout(() => {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el && val !== undefined && val !== null && val !== '') {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };

        setVal('studentFormFirstName', data.firstName);
        setVal('studentFormLastName', data.lastName);
        setVal('studentFormPersonalCode', (data.personalCode || '').toUpperCase());
        setVal('studentFormCui', data.cui);
        setVal('studentFormBirthDate', data.birthDate);
        setVal('studentFormPhone', data.phone);
        setVal('studentFormAddress', data.address);
        setVal('studentFormGuardianName', data.guardianName);
        setVal('studentFormGuardianDpi', data.guardianDpi);
        setVal('studentFormGuardianPhone1', data.guardianPhone);

        // Género
        if (data.gender) {
            const gLower = data.gender.toLowerCase();
            const gSelect = document.getElementById('studentFormGender');
            if (gSelect) {
                if (gLower.includes('m') || gLower.includes('masc')) gSelect.value = 'Masculino';
                else if (gLower.includes('f') || gLower.includes('fem')) gSelect.value = 'Femenino';
                gSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // Calcular edad
        if (typeof window.calculateStudentAge === 'function') {
            window.calculateStudentAge();
        }

        // Sincronizar barra de búsqueda rápida
        const qInput = document.getElementById('quickSireSearchCode');
        if (qInput && data.personalCode) {
            qInput.value = data.personalCode.toUpperCase();
        }

        // Banner de éxito en el formulario
        const banner = document.getElementById('quickSireSearchResultBanner');
        if (banner) {
            banner.style.display = 'block';
            banner.style.background = '#f0fdf4';
            banner.style.border = '1.5px solid #86efac';
            banner.style.color = '#15803d';
            banner.innerHTML = `
                <div style="font-weight:800; display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-cloud-arrow-down"></i> Ficha Sincronizada desde Portal SIRE MINEDUC
                </div>
                <div style="font-size:0.80rem; margin-top:3px;">
                    <strong>${data.firstName} ${data.lastName}</strong> | Código: <code>${data.personalCode}</code><br>
                    <span style="color:#0369a1; font-weight:700;">Verifique el grado/sección asignado y presione "Guardar Inscripción".</span>
                </div>
            `;
        }

        if (typeof window.showToast === 'function') {
            window.showToast(`✅ Expediente de ${data.firstName || data.personalCode} importado desde SIRE.`, 'success');
        }

        // Desplazar al formulario
        const formEl = document.getElementById('mainEnrollmentForm');
        if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    }, 300);
}

// Escuchar mensaje en vivo
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'AUTOFILL_ENROLLMENT') {
        fillEnrollmentForm(request.data);
        sendResponse({ success: true, message: 'Formulario llenado con éxito' });
    }
});

// Comprobar si hay una transferencia pendiente guardada en storage (ej. si la pestaña recién se abrió)
chrome.storage.local.get(['pendingAutofill'], (result) => {
    if (result && result.pendingAutofill) {
        fillEnrollmentForm(result.pendingAutofill);
        chrome.storage.local.remove('pendingAutofill');
    }
});
