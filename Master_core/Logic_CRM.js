/* Master_core/Logic_CRM.js - Sincronizzazione CRM, Autocomplete, Gestione Nomi e Interfaccia Modal Agenda */

window.sysCheckCustomerInput = function() {
    const input = document.getElementById('aCog');
    const box = document.getElementById('cogSuggestions');
    if(!input || !box || !window.globalCustomers) return;

    const val = input.value.toLowerCase().trim();
    if(val.length < 2) { box.style.display = 'none'; return; }

    const matches = window.globalCustomers.filter(c => c.nome && c.nome.toLowerCase().includes(val)).slice(0, 5);
    if(matches.length === 0) { box.style.display = 'none'; return; }

    box.innerHTML = ''; box.style.display = 'block'; box.style.zIndex = '99999'; 

    matches.forEach(c => {
        const div = document.createElement('div');
        div.className = 'auto-item';
        div.innerHTML = `<div><b style="color:var(--accent); font-size:12px; text-transform:uppercase; display:block; margin-bottom:2px;">${c.nome}</b><span style="font-size:10px; color:var(--text-muted);">${c.tel || 'Nessun tel.'}</span></div>`;
        
        div.onclick = function() {
            input.value = c.nome;
            if(document.getElementById('aTel') && c.tel && c.tel !== 'N.D.') document.getElementById('aTel').value = c.tel;
            if(document.getElementById('aDataNascita') && c.dataNascita && c.dataNascita !== 'N.D.') document.getElementById('aDataNascita').value = c.dataNascita;
            if(document.getElementById('aCodCliente') && c.codCliente) document.getElementById('aCodCliente').value = c.codCliente;
            
            if(document.getElementById('aCam') && c.cam) document.getElementById('aCam').value = c.cam;
            if(document.getElementById('aPatologie') && c.patologie) {
                document.getElementById('aPatologie').value = c.patologie;
                if(document.getElementById('patologieWrapper')) document.getElementById('patologieWrapper').style.display = 'block';
                if(document.getElementById('btnShowPatologie')) document.getElementById('btnShowPatologie').style.display = 'none';
            }
            box.style.display = 'none';
        };
        box.appendChild(div);
    });
};

document.addEventListener('click', function(e) {
    if(!e.target.closest('#aCog') && !e.target.closest('#cogSuggestions')) {
        const box = document.getElementById('cogSuggestions');
        if(box) box.style.display = 'none';
    }
});

window.sysUpdateCRM = function(appObj, ignoreCamera, isEdit = false, actionParams = 'update') {
    if (!window.twStructId) return;
    const crmRef = firebase.database().ref('MASTER_ADMIN_DB/global_customers');
    const oldName = window._currentEditingOldName ? window._currentEditingOldName.toLowerCase() : "";
    const newName = (appObj.cog || "Ospite").toLowerCase();

    if (newName === "ospite" || newName === "n.d.") return;

    let targetId = null;
    let updateData = {
        nome: appObj.cog || "Ospite",
        tel: appObj.tel || "",
        dataNascita: appObj.dataNascita || "",
        note: appObj.note || "",
        patologie: appObj.patologie || "",
        structId: window.twStructId,
        last_update: new Date().toISOString()
    };
    if (!ignoreCamera) updateData.cam = appObj.cam || "";

    if (window.globalCustomers) {
        if (isEdit && actionParams === 'correction' && oldName) {
            const oldCustomer = window.globalCustomers.find(c => c.nome && c.nome.toLowerCase() === oldName);
            if (oldCustomer) targetId = oldCustomer.id;
        } else if (actionParams !== 'new') {
            const existingCustomer = window.globalCustomers.find(c => c.nome && c.nome.toLowerCase() === newName);
            if (existingCustomer) targetId = existingCustomer.id;
        }
    }

    if (targetId) {
        crmRef.child(targetId).update(updateData);
    } else {
        updateData.created_at = new Date().toISOString();
        crmRef.push(updateData);
    }
};

/* --- MOTORE DI INIEZIONE MODAL E LOGICA ANAGRAFICA PER AGENDA --- */

window.sysInjectCrmModal = function() {
    if(document.getElementById('customerProfileModal')) return;
    
    const html = `
    <div id="customerProfileModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; align-items:center; justify-content:center; background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); z-index:90000;" onclick="if(event.target===this) this.style.display='none'">
        <div class="modal-box" style="background:var(--bg-panel); border:1px solid var(--border-line); max-width: 850px; width: 95%; padding: 25px; text-align:left; border-radius:16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); max-height:90vh; display:flex; flex-direction:column;">
            
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border-line); padding-bottom: 15px; margin-bottom: 20px; flex-shrink:0;">
                <h2 style="margin:0; color:var(--accent); font-size:20px; display:flex; align-items:center; gap:10px;">
                    <i class="material-icons-round" style="font-size:28px;">account_circle</i>
                    <span id="cp_nome" style="text-transform:uppercase;">Cliente</span>
                </h2>
                <button style="font-size:28px; border:none; background:transparent; color:var(--text-muted); cursor:pointer; transition:0.2s;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text-muted)'" onclick="document.getElementById('customerProfileModal').style.display='none'"><i class="material-icons-round">close</i></button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; flex-shrink:0;">
                <div style="background:rgba(0,0,0,0.2); padding:15px; border-radius:12px; border-bottom:4px solid var(--gold); text-align:center;"><div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-bottom:5px; font-weight:bold;">Telefono</div><div id="cp_tel" style="font-size:16px; font-weight:900; color:var(--text-main)">-</div></div>
                <div style="background:rgba(0,0,0,0.2); padding:15px; border-radius:12px; border-bottom:4px solid var(--accent); text-align:center;"><div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-bottom:5px; font-weight:bold;">Data Nascita</div><div id="cp_dob" style="font-size:16px; font-weight:900; color:var(--text-main)">-</div></div>
                <div style="background:rgba(0,0,0,0.2); padding:15px; border-radius:12px; border-bottom:4px solid var(--green); text-align:center;"><div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-bottom:5px; font-weight:bold;">Spesa Totale SPA</div><div id="cp_spent" style="font-size:18px; font-weight:900; color:var(--green)">0.00 €</div></div>
            </div>
            
            <div style="display:flex; gap:10px; border-bottom:1px solid var(--border-line); margin-bottom:15px; flex-shrink:0;">
                <button id="tabBtn-history" style="background:transparent; border:none; color:var(--accent); border-bottom:3px solid var(--accent); padding:10px 15px; font-weight:bold; cursor:pointer; font-size:13px; text-transform:uppercase;" onclick="window.sysOpenProfileTab('history')"><i class="material-icons-round" style="font-size:16px; vertical-align:middle;">history</i> Storico</button>
                <button id="tabBtn-docs" style="background:transparent; border:none; color:var(--text-muted); border-bottom:3px solid transparent; padding:10px 15px; font-weight:bold; cursor:pointer; font-size:13px; text-transform:uppercase;" onclick="window.sysOpenProfileTab('docs')"><i class="material-icons-round" style="font-size:16px; vertical-align:middle;">verified_user</i> Documenti</button>
            </div>
            
            <div style="flex:1; overflow-y:auto; padding-right:5px; display:flex; flex-direction:column;">
                <div id="tab-history" style="display:block; flex:1;">
                    <div style="margin-bottom:20px;">
                        <label style="color:var(--accent); font-weight:900; font-size:11px; display:block; margin-bottom:8px;">NOTE CLIENTE (Condivise)</label>
                        <textarea id="cp_note" rows="2" style="font-size:13px; height:auto; min-height:60px; width:100%; box-sizing:border-box; padding:12px; border-radius:8px; border:1px solid var(--border-line); background:var(--bg-body); color:var(--text-main); outline:none; resize:none;" placeholder="Note generali..." onchange="window.sysSaveCustomerNote()"></textarea>
                    </div>
                    <div style="border:1px solid var(--border-line); border-radius:8px; background:var(--bg-body); overflow:hidden;">
                        <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
                            <thead style="background:var(--bg-panel);">
                                <tr>
                                    <th style="padding:10px; border-bottom:1px solid var(--border-line); color:var(--text-muted);">Data</th>
                                    <th style="padding:10px; border-bottom:1px solid var(--border-line); color:var(--text-muted);">Trattamento / Op.</th>
                                    <th style="padding:10px; border-bottom:1px solid var(--border-line); text-align:right; color:var(--text-muted);">Costo</th>
                                </tr>
                            </thead>
                            <tbody id="cp_history"></tbody>
                        </table>
                    </div>
                </div>
                
                <div id="tab-docs" style="display:none; flex:1;">
                    <div style="border:1px solid var(--border-line); border-radius:8px; background:var(--bg-body); overflow:hidden;">
                        <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
                            <thead style="background:var(--bg-panel);">
                                <tr>
                                    <th style="padding:10px; border-bottom:1px solid var(--border-line); color:var(--text-muted);">Data Firma</th>
                                    <th style="padding:10px; border-bottom:1px solid var(--border-line); color:var(--text-muted);">Documento</th>
                                    <th style="padding:10px; border-bottom:1px solid var(--border-line); text-align:right; color:var(--text-muted);">Apri</th>
                                </tr>
                            </thead>
                            <tbody id="cp_docs_table"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.sysOpenProfileTab = function(tabName) {
    document.getElementById('tab-history').style.display = tabName === 'history' ? 'block' : 'none';
    document.getElementById('tab-docs').style.display = tabName === 'docs' ? 'block' : 'none';
    
    document.getElementById('tabBtn-history').style.color = tabName === 'history' ? 'var(--accent)' : 'var(--text-muted)';
    document.getElementById('tabBtn-history').style.borderBottomColor = tabName === 'history' ? 'var(--accent)' : 'transparent';
    
    document.getElementById('tabBtn-docs').style.color = tabName === 'docs' ? 'var(--accent)' : 'var(--text-muted)';
    document.getElementById('tabBtn-docs').style.borderBottomColor = tabName === 'docs' ? 'var(--accent)' : 'transparent';
};

window.sysSaveCustomerNote = function() {
    const note = document.getElementById('cp_note').value;
    if(window.currentOpenCustId) {
        firebase.database().ref('MASTER_ADMIN_DB/global_customers').child(window.currentOpenCustId).update({ note: note });
        if(window.showToast) window.showToast("Note salvate!");
    }
};

window.sysOpenCRMProfileGrid = function(nomeClienteRaw) {
    window.sysInjectCrmModal();
    const nomeCliente = (nomeClienteRaw || "").toLowerCase().trim();
    
    let match = null;
    if(window.globalCustomers) {
        match = window.globalCustomers.find(c => c.nome && c.nome.toLowerCase() === nomeCliente);
    }
    
    document.getElementById('cp_nome').innerText = match ? match.nome : nomeClienteRaw;
    document.getElementById('cp_tel').innerText = match && match.tel ? match.tel : "-";
    document.getElementById('cp_dob').innerText = match && match.dataNascita ? match.dataNascita : "-";
    document.getElementById('cp_note').value = match && match.note ? match.note : "";
    window.currentOpenCustId = match ? match.id : null;

    if(window.showToast) window.showToast("Sincronizzazione storico in corso...", false);

    // Scarica l'intero storico appuntamenti per calcolare i totali senza dipendere dal file Anagrafica
    firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app`).once('value').then(snap => {
        const data = snap.val() || {};
        let cApps = [];
        let spesaTotale = 0;

        Object.keys(data).forEach(date => {
            const dayApps = Array.isArray(data[date]) ? data[date] : Object.values(data[date]);
            dayApps.forEach(a => {
                if(a && a.cog && a.cog.toLowerCase() === nomeCliente) {
                    cApps.push({...a, dataString: date});
                    if(a.pagato) spesaTotale += parseFloat(a.price || a.prezzo || 0);
                }
            });
        });

        cApps.sort((a, b) => new Date(b.dataString) - new Date(a.dataString));

        let histHtml = '';
        if(cApps.length === 0) { 
            histHtml = '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-muted);">Nessun trattamento registrato.</td></tr>'; 
        } else {
            cApps.forEach(a => {
                const price = parseFloat(a.price || a.prezzo || 0); 
                const dateParts = a.dataString.split('-'); 
                const dateIt = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : a.dataString;
                const stato = a.pagato ? '<span style="color:var(--green); font-size:9px; border:1px solid var(--green); padding:2px 4px; border-radius:4px;">PAGATO</span>' : '<span style="color:var(--red); font-size:9px; border:1px solid var(--red); padding:2px 4px; border-radius:4px;">DA PAGARE</span>';
                
                histHtml += `<tr>
                    <td style="font-weight:bold; color:var(--text-main);">${dateIt}</td>
                    <td><b style="display:block; color:var(--accent); text-transform:uppercase;">${a.serv || 'Trattamento'} (${a.dur || 30} min)</b><span style="font-size:10px; color:var(--gold);">OP: ${a.op || 'Non Assegnato'}</span></td>
                    <td style="text-align:right;"><b style="display:block; font-size:14px; color:var(--green); margin-bottom:2px;">${price.toFixed(2)} €</b>${stato}</td>
                </tr>`;
            });
        }
        document.getElementById('cp_history').innerHTML = histHtml;
        document.getElementById('cp_spent').innerText = spesaTotale.toFixed(2) + " €";

        // Rendering Documenti Privacy
        const docsTable = document.getElementById('cp_docs_table');
        docsTable.innerHTML = "";
        if(match && match.docs && Object.keys(match.docs).length > 0) {
            Object.entries(match.docs).forEach(([docId, doc]) => {
                docsTable.innerHTML += `
                <tr>
                    <td style="font-weight:bold;">${doc.dataInserimento || '-'}</td>
                    <td><b style="color:var(--text-main);">${doc.nomeDoc || 'Consenso Privacy'}</b></td>
                    <td style="text-align:right;">
                        <a href="${doc.link}" target="_blank" style="display:inline-flex; align-items:center; gap:4px; padding:6px 12px; background:rgba(56, 189, 248, 0.1); color:var(--accent); border:1px solid var(--accent); border-radius:6px; text-decoration:none; font-size:11px; font-weight:bold;">
                            <i class="material-icons-round" style="font-size:14px;">visibility</i> APRI PDF
                        </a>
                    </td>
                </tr>`;
            });
        } else { 
            docsTable.innerHTML = `<tr><td colspan='3' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun documento firmato.</td></tr>`; 
        }

        window.sysOpenProfileTab('history'); 
        document.getElementById('customerProfileModal').style.display = 'flex';
    });
};