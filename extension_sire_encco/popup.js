// popup.js - Lógica de control para la interfaz emergente
let currentStudent = null;

document.addEventListener('DOMContentLoaded', async () => {
    const pageStatus = document.getElementById('pageStatus');
    const btnExtract = document.getElementById('btnExtract');
    const btnSend = document.getElementById('btnSend');
    const btnCopy = document.getElementById('btnCopy');
    const previewContainer = document.getElementById('previewContainer');

    // 1. Detectar pestaña activa
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab ? (tab.url || '') : '';

    if (url.includes('sire.mineduc.gob.gt')) {
        pageStatus.className = 'status-badge status-sire';
        pageStatus.innerHTML = '<span>🔵</span> Pestaña SIRE MINEDUC activa';
    } else if (url.includes('comerciojutiapa.github.io') || url.includes('localhost') || url.includes('127.0.0.1')) {
        pageStatus.className = 'status-badge status-encco';
        pageStatus.innerHTML = '<span>🟢</span> Plataforma ENCCO activa';
    } else {
        pageStatus.className = 'status-badge status-other';
        pageStatus.innerHTML = '<span>⚠️</span> Pestaña externa. Abra el SIRE';
    }

    // 2. Cargar último estudiante en memoria si existe
    chrome.storage.local.get(['lastSireStudent'], (result) => {
        if (result && result.lastSireStudent) {
            renderStudentPreview(result.lastSireStudent);
        }
    });

    // 3. Botón Extraer
    btnExtract.addEventListener('click', async () => {
        if (!url.includes('sire.mineduc.gob.gt')) {
            // Intentar buscar pestaña de SIRE en segundo plano
            const sireTabs = await chrome.tabs.query({ url: "*://sire.mineduc.gob.gt/*" });
            if (sireTabs.length === 0) {
                alert('⚠️ No hay ninguna pestaña del portal SIRE abierta.\nPor favor abra sire.mineduc.gob.gt e inicie sesión.');
                return;
            }
            // Usar la primera pestaña de SIRE
            chrome.tabs.sendMessage(sireTabs[0].id, { action: 'EXTRACT_FROM_SIRE' }, (response) => {
                if (response && response.data) {
                    onStudentExtracted(response.data);
                } else {
                    alert('No se pudo extraer información. Asegúrese de tener el expediente del alumno abierto en el SIRE.');
                }
            });
            return;
        }

        chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_FROM_SIRE' }, (response) => {
            if (response && response.data) {
                onStudentExtracted(response.data);
            } else {
                alert('No se pudo extraer la información del alumno.\nAsegúrese de tener visible la ficha en pantalla.');
            }
        });
    });

    // 4. Botón Enviar a Plataforma
    btnSend.addEventListener('click', () => {
        if (!currentStudent) return;
        chrome.runtime.sendMessage({
            action: 'SEND_TO_ENCCO',
            data: currentStudent
        }, (res) => {
            btnSend.innerText = '✅ ¡Ficha Enviada!';
            setTimeout(() => {
                btnSend.innerHTML = '🚀 Enviar a Plataforma ENCCO';
            }, 2500);
        });
    });

    // 5. Botón Copiar
    btnCopy.addEventListener('click', () => {
        if (!currentStudent) return;
        const text = JSON.stringify(currentStudent, null, 2);
        navigator.clipboard.writeText(text).then(() => {
            btnCopy.innerText = '✅ ¡Copiado al Portapapeles!';
            setTimeout(() => {
                btnCopy.innerHTML = '📋 Copiar Ficha al Portapapeles';
            }, 2000);
        });
    });

    function onStudentExtracted(data) {
        currentStudent = data;
        chrome.storage.local.set({ lastSireStudent: data });
        renderStudentPreview(data);
    }

    function renderStudentPreview(data) {
        currentStudent = data;
        btnSend.style.display = 'flex';
        btnCopy.style.display = 'flex';

        const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Estudiante';
        previewContainer.innerHTML = `
            <div class="preview-item">
                <span>Alumno:</span>
                <strong>${fullName}</strong>
            </div>
            <div class="preview-item">
                <span>Código Personal:</span>
                <strong style="color:#0f5127; font-family:monospace;">${data.personalCode || 'No detectado'}</strong>
            </div>
            <div class="preview-item">
                <span>CUI:</span>
                <span>${data.cui || 'No detectado'}</span>
            </div>
            <div class="preview-item">
                <span>Fecha Nacimiento:</span>
                <span>${data.birthDate || 'No detectado'}</span>
            </div>
            <div class="preview-item">
                <span>Encargado:</span>
                <span>${data.guardianName || 'No detectado'}</span>
            </div>
        `;
    }
});
