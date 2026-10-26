/* Master_core/Component_Services.js - Contenitore Isolato Scelta Servizi con Supporto Massaggi di Coppia */

window.addEventListener('DOMContentLoaded', () => {
    const oldModal = document.getElementById('desktopServiceSelectModal');
    if (oldModal) oldModal.remove();

    if (document.getElementById('tw-system-services-core')) return;

    const servicesHTML = `
        <div id="tw-system-services-core">
            <style>
                .serv-item { background: rgba(0,0,0,0.2); border: 1px solid var(--border-line); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px; cursor: pointer; color: var(--text-main); transition:all 0.2s ease; margin-bottom:6px; }
                .serv-item:hover { border-color: rgba(56,189,248,0.5); transform: translateY(-1px); }
                .serv-item.active { border-color: var(--accent); background: rgba(56,189,248,0.15); box-shadow: 0 4px 15px rgba(56,189,248,0.2); }
            </style>

            <div id="desktopServiceSelectModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; align-items:center; justify-content:center; z-index: 5500; background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);" onclick="if(event.target===this) this.style.display='none'">
                <div class="modal-box" style="max-width: 480px; width: 95%; background: var(--bg-panel); padding: 30px; border-radius: 16px; border: 1px solid var(--border-line); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); display:flex; flex-direction:column;">
                    <h3 style="margin:0 0 20px 0; color:var(--accent); font-size:18px; text-align:center; font-weight:900;">SELEZIONA TRATTAMENTO</h3>
                    
                    <div style="position:relative; margin-bottom:20px;">
                        <i class="material-icons-round" style="position:absolute; left:15px; top:12px; color:var(--text-muted);">search</i>
                        <input type="text" id="desktopSearchServiceInput" placeholder="Cerca trattamento rapido..." onkeyup="if(typeof window.sysFilterServices === 'function') window.sysFilterServices()" style="height: 48px; border: 1px solid var(--border-line); padding: 0 15px 0 45px; font-size: 14px; color: var(--text-main); background: rgba(0,0,0,0.2); border-radius: 10px; outline: none; width:100%; transition: 0.2s; box-sizing: border-box;">
                    </div>
                    
                    <div class="servizi-list-modal" id="desktopServiziUIList" style="display: flex; flex-direction: column; max-height: 45vh; overflow-y: auto; padding-right:5px; margin-bottom: 20px;"></div>
                    
                    <div style="display:flex; gap:12px;">
                        <button class="btn-save btn-outline" style="flex:1; border-color:transparent;" onclick="document.getElementById('desktopServiceSelectModal').style.display='none'">ANNULLA</button>
                        <button class="btn-save" style="flex:1; background:var(--green); color:#fff; border:none;" onclick="if(typeof window.sysConfirmServiceSelection === 'function') window.sysConfirmServiceSelection()">AGGIUNGI</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', servicesHTML);
});

window.sysOpenServiceSelector = function() {
    const listUI = document.getElementById('desktopServiziUIList'); 
    if(!listUI) return;
    listUI.innerHTML = ""; 
    if(document.getElementById('desktopSearchServiceInput')) document.getElementById('desktopSearchServiceInput').value = ""; 
    
    let rawList = window.db && window.db.servizi ? window.db.servizi : []; 
    let servList = Array.isArray(rawList) ? rawList : Object.values(rawList);
    servList = servList.filter(s => s && s.nome);
    
    if(servList.length === 0) { 
        listUI.innerHTML = "<div style='text-align:center; padding:30px; color:var(--text-muted); font-size:13px; background:rgba(0,0,0,0.2); border-radius:8px;'>Nessun servizio caricato nel Database.</div>"; 
    } else {
        servList.forEach((s, index) => {
            const sId = s.id || ('SV_TEMP_' + index); s.id = sId;
            const isCoupleSrv = (s.isCouple === true || s.isCouple === "true" || s.nome.toLowerCase().includes('coppia'));
            const coupleBadge = isCoupleSrv ? `<span style="background:rgba(168,85,247,0.2); color:var(--purple); border:1px solid var(--purple); padding:1px 6px; border-radius:4px; font-size:9px; margin-left:6px; font-weight:900;">COPPIA</span>` : '';
            const div = document.createElement('div'); 
            div.className = 'serv-item'; div.id = 'srvUI_' + sId; 
            div.setAttribute('data-name', s.nome.toLowerCase());
            div.innerHTML = `
                <div style="background:${isCoupleSrv ? 'rgba(168,85,247,0.15)' : 'rgba(56,189,248,0.1)'}; width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                    <i class="material-icons-round" style="color:${isCoupleSrv ? 'var(--purple)' : 'var(--accent)'}; font-size:20px;">${isCoupleSrv ? 'people' : 'spa'}</i>
                </div>
                <div class="serv-info" style="flex:1;">
                    <b style="display:block; font-size:14px; margin-bottom:3px;">${s.nome}${coupleBadge}</b>
                    <span style="color:var(--text-muted); font-size:11px; font-weight:bold;">${s.durata || 30} MINUTI <span style="margin:0 5px;">|</span> <span style="color:var(--green);">${parseFloat(s.prezzo || 0).toFixed(2)} €</span></span>
                </div>
            `;
            div.onclick = function() { window.sysTempSelectService(sId); }; 
            listUI.appendChild(div);
        });
    }
    window.tempSelectedServiceId = null; 
    const mod = document.getElementById('desktopServiceSelectModal');
    if(mod) mod.style.display = 'flex';
};

window.sysTempSelectService = function(id) { 
    document.querySelectorAll('#desktopServiziUIList .serv-item').forEach(x => { x.classList.remove('active'); }); 
    const el = document.getElementById('srvUI_' + id); 
    if(el) el.classList.add('active');
    
    const srvList = window.db && window.db.servizi ? (Array.isArray(window.db.servizi) ? window.db.servizi : Object.values(window.db.servizi)) : [];
    const s = srvList.find(x => x && x.id === id); 
    if(s) {
        const isCoupleSrv = (s.isCouple === true || s.isCouple === "true" || (s.nome && s.nome.toLowerCase().includes('coppia')));
        window.tempSelectedServiceId = { nome: s.nome, dur: s.durata, price: s.prezzo, isCouple: isCoupleSrv }; 
    }
};

window.sysConfirmServiceSelection = function() { 
    if(window.tempSelectedServiceId) { 
        if(document.getElementById('aServ')) document.getElementById('aServ').value = window.tempSelectedServiceId.nome; 
        if(document.getElementById('aDur')) document.getElementById('aDur').value = window.tempSelectedServiceId.dur; 
        if(document.getElementById('aBasePrice')) document.getElementById('aBasePrice').value = window.tempSelectedServiceId.price;
        
        // Gestione Automatica Massaggio di Coppia
        if (typeof window.sysToggleCoupleMode === 'function') {
            window.sysToggleCoupleMode(window.tempSelectedServiceId.isCouple === true);
        }

        if(typeof window.sysCalculatePrice === 'function') window.sysCalculatePrice(); 
        if(typeof window.sysPopulateOperators === 'function') window.sysPopulateOperators();
        const mod = document.getElementById('desktopServiceSelectModal');
        if(mod) mod.style.display = 'none'; 
        if(typeof window.sysRenderServiceBox === 'function') window.sysRenderServiceBox();
    } else {
        if(window.showErrorToast) window.showErrorToast("Devi selezionare un trattamento dalla lista!");
    }
};

window.sysFilterServices = function() { 
    const val = document.getElementById('desktopSearchServiceInput').value.toLowerCase(); 
    document.querySelectorAll('#desktopServiziUIList .serv-item').forEach(el => { 
        el.style.display = (el.getAttribute('data-name') || '').includes(val) ? 'flex' : 'none'; 
    }); 
};