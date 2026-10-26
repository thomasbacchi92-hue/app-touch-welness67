/* Impostazioni/logic_firma.js - Gestione Connessione Tablet e Modelli Privacy */

window.firmaModule = (function() {
    let currentCode = "";
    let modelliLocal = {};

    function init() {
        if(!window.twStructId) return;
        
        // Carica Impostazioni Generali Firma
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/settings/firma`).once('value').then(snap => {
            const data = snap.val() || {};
            if(data.code) { 
                currentCode = data.code; 
                updateLinkDisplay(); 
            }
            
            const toggleAnteprima = document.getElementById('toggleAnteprimaFirma');
            if(toggleAnteprima) {
                toggleAnteprima.checked = (data.anteprimaApp !== false);
            }
        });

        // Ascolta Modelli Privacy
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/settings/firma/modelli`).on('value', snap => {
            modelliLocal = snap.val() || {}; 
            renderModelliList();
        });
    }

    function saveAnteprimaSettings() {
        const isChecked = document.getElementById('toggleAnteprimaFirma').checked;
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/settings/firma/anteprimaApp`).set(isChecked).then(() => {
            if(window.showToast) window.showToast(isChecked ? "Anteprima in Agenda ATTIVATA." : "Anteprima in Agenda DISATTIVATA.");
        });
    }

    function generaNuovoLink() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; 
        let code = 'TW-';
        for(let i=0; i<6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        currentCode = code; 
        updateLinkDisplay(); 
        if(window.showToast) window.showToast("Codice generato. Clicca Salva Connessione.");
    }

    function updateLinkDisplay() {
        if(!currentCode) return;
        const baseUrl = window.location.href.split('Impostazioni/')[0];
        const displayEl = document.getElementById('shortLinkDisplay');
        if(displayEl) displayEl.value = baseUrl + 'Firma.html?code=' + currentCode;
    }

    function copyLink() {
        const link = document.getElementById('shortLinkDisplay')?.value;
        if(link) {
            navigator.clipboard.writeText(link).then(() => {
                if(window.showToast) window.showToast("Link copiato negli appunti!");
            });
        }
    }

    function salvaConnessione() {
        if(!currentCode) {
            if(window.showToast) window.showToast("Genera prima un link!", true);
            return;
        }
        const sId = window.twStructId; 
        const updates = {};
        
        updates[`MASTER_ADMIN_DB/structures_data/${sId}/settings/firma/code`] = currentCode;
        updates[`MASTER_ADMIN_DB/firma_links/${currentCode}`] = sId;
        
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${sId}/settings/firma/code`).once('value').then(snap => {
            const oldCode = snap.val();
            if(oldCode && oldCode !== currentCode) {
                updates[`MASTER_ADMIN_DB/firma_links/${oldCode}`] = null;
            }
            firebase.database().ref().update(updates).then(() => {
                if(window.showToast) window.showToast("Connessione Tablet salvata correttamente!");
            });
        });
    }

    function renderModelliList() {
        const container = document.getElementById('modelliListContainer'); 
        if(!container) return;
        container.innerHTML = "";
        
        const keys = Object.keys(modelliLocal);
        if(keys.length === 0) { 
            container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:30px; border:1px dashed var(--border-line); border-radius:8px; color:var(--text-muted); font-size:13px;">Nessun modello personalizzato creato. Verrà usato quello di base.</div>`; 
            return; 
        }
        
        keys.forEach(k => {
            const mod = modelliLocal[k]; 
            const isDef = mod.isDefault;
            const defClass = isDef ? 'is-default' : '';
            const defBadge = isDef ? '<span class="modello-badge">PREDEFINITO</span>' : '';
            const starClass = isDef ? 'btn-star' : 'btn-star inactive';
            
            const html = `
                <div class="modello-item ${defClass}">
                    <div class="modello-header">
                        <div class="modello-title">${mod.titolo}</div>
                        ${defBadge}
                    </div>
                    <div class="modello-actions">
                        <button class="action-btn-sm ${starClass}" onclick="window.firmaModule.setModelloDefault('${k}')" title="Imposta Predefinito"><i class="material-icons-round" style="font-size:16px;">star</i></button>
                        <button class="action-btn-sm btn-edit" onclick="window.firmaModule.openModelloModal('${k}')" title="Modifica"><i class="material-icons-round" style="font-size:16px;">edit</i></button>
                        <button class="action-btn-sm btn-del" onclick="window.firmaModule.openDelModelloModal('${k}')" title="Elimina"><i class="material-icons-round" style="font-size:16px;">delete</i></button>
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
    }

    function openModelloModal(id = null) {
        document.getElementById('modalModello').style.display = 'flex';
        if(id && modelliLocal[id]) {
            document.getElementById('modalModelloTitleLabel').innerHTML = '<i class="material-icons-round">edit_document</i> Modifica Modello';
            document.getElementById('modelloId').value = id;
            document.getElementById('modelloTitolo').value = modelliLocal[id].titolo;
            document.getElementById('modelloCorpo').value = modelliLocal[id].corpo;
        } else {
            document.getElementById('modalModelloTitleLabel').innerHTML = '<i class="material-icons-round">note_add</i> Nuovo Modello';
            document.getElementById('modelloId').value = ""; 
            document.getElementById('modelloTitolo').value = "";
            document.getElementById('modelloCorpo').value = `<h2 style="color: #0f172a; border-bottom: 2px solid #a855f7; padding-bottom: 10px; text-align: center; text-transform: uppercase;">Consenso Informato</h2>\n<p style="font-size: 16px;">Il sottoscritto [CLIENTE], in data [DATA], in relazione al servizio di [SERVIZIO], dichiara:</p>\n<div style="background: #f1f5f9; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;"><b style="color: #ef4444; font-size:14px;">QUADRO CLINICO:</b><br>[PATOLOGIE]</div>\n<div style="display: flex; gap: 10px; margin-top: 20px;">[CHECK] <span>Acconsento al trattamento dei dati personali.</span></div>`;
        }
    }

    function closeModelloModal() { 
        document.getElementById('modalModello').style.display = 'none'; 
    }
    
    function saveModello() {
        const idInput = document.getElementById('modelloId').value;
        const titolo = document.getElementById('modelloTitolo').value.trim();
        const corpo = document.getElementById('modelloCorpo').value.trim();
        
        if(!titolo || !corpo) {
            if(window.showToast) window.showToast("Compila Titolo e Testo del documento", true);
            return;
        }
        
        const id = idInput ? idInput : firebase.database().ref().child('dummy').push().key;
        let isDef = Object.keys(modelliLocal).length === 0 ? true : (idInput && modelliLocal[idInput] ? modelliLocal[idInput].isDefault : false);
        
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/settings/firma/modelli/${id}`).set({ 
            titolo: titolo, 
            corpo: corpo, 
            isDefault: isDef 
        }).then(() => { 
            closeModelloModal(); 
            if(window.showToast) window.showToast("Modello salvato correttamente!"); 
        });
    }
    
    function setModelloDefault(id) {
        const updates = {}; 
        Object.keys(modelliLocal).forEach(k => {
            updates[`MASTER_ADMIN_DB/structures_data/${window.twStructId}/settings/firma/modelli/${k}/isDefault`] = (k === id);
        });
        firebase.database().ref().update(updates).then(() => {
            if(window.showToast) window.showToast("Modello predefinito aggiornato.");
        });
    }

    function openDelModelloModal(id) { 
        document.getElementById('delModelloId').value = id; 
        document.getElementById('modalDelModello').style.display = 'flex'; 
    }
    
    function eseguiDeleteModello() {
        const id = document.getElementById('delModelloId').value;
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/settings/firma/modelli/${id}`).remove().then(() => {
            document.getElementById('modalDelModello').style.display = 'none';
            if(window.showToast) window.showToast("Modello eliminato.");
            if(modelliLocal[id] && modelliLocal[id].isDefault) { 
                const rm = Object.keys(modelliLocal).filter(k => k !== id); 
                if(rm.length > 0) setModelloDefault(rm[0]); 
            }
        });
    }

    return { 
        init, saveAnteprimaSettings, generaNuovoLink, copyLink, salvaConnessione, 
        openModelloModal, closeModelloModal, saveModello, openDelModelloModal, eseguiDeleteModello, setModelloDefault 
    };
})();

document.addEventListener('DOMContentLoaded', () => { window.firmaModule.init(); });