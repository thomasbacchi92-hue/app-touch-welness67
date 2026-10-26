/* Piscina/Piscina_Logic.js - Monitor Semaforico Assoluto (Taglio Temporale per Pausa SPA) */

window.showBlueToast = function(msg, isError = false) {
    const x = document.getElementById("toastBlue");
    const txt = document.getElementById("toastMsg");
    if(x) {
        txt.innerText = msg;
        x.style.background = isError ? "var(--red)" : "var(--toast-blue, #2563eb)";
        x.style.display = "flex";
        setTimeout(() => { x.style.display = "none"; }, 3000);
    }
};

window.tToMin = function(timeStr) {
    if(!timeStr || typeof timeStr !== 'string') return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + m;
};

window.mToT = function(m) { 
    return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; 
};

window.getDayOfWeek = function(dateString) {
    let d = new Date(dateString).getDay();
    return d === 0 ? 7 : d;
};

window.applyFieldVisibility = function() {
    if (!window.dbOrari) return;
    const c = window.dbOrari.campi || { pax: true, cog: true, note: true };
    const r = window.dbOrari.regole || { preset: 'Piscina' };
    
    const gPax = document.getElementById('groupPax');
    const gCog = document.getElementById('groupCog');
    const gNote = document.getElementById('groupNote');
    
    if(gPax) gPax.style.display = c.pax ? 'flex' : 'none';
    if(gCog) gCog.style.display = c.cog ? 'flex' : 'none';
    if(gNote) gNote.style.display = c.note ? 'flex' : 'none';

    const pArea = document.getElementById('pArea');
    if(pArea && !document.getElementById('pId').value) {
        pArea.value = r.preset;
    }
};

// Generatore degli slot: Salta fisicamente la fascia della pausa
window.generateDynamicSlots = function(dateStr) {
    if (!window.dbOrari) return [];
    const dayIdx = getDayOfWeek(dateStr);
    const orariP = window.dbOrari.piscina[dayIdx];
    const orariS = window.dbOrari.spa[dayIdx];
    
    let slotsSet = new Set();
    
    const addSlots = (orari) => {
        if(!orari || !orari.active) return;
        
        const start = tToMin(orari.m_in);
        const end = tToMin(orari.m_out);
        const pStart = orari.pausa_active ? tToMin(orari.p_in) : 0;
        const pEnd = orari.pausa_active ? tToMin(orari.p_out) : 0;

        for(let i = start; i < end; i += 60) {
            // Se lo slot cade all'interno della pausa, viene ignorato e non creato
            if (orari.pausa_active && i >= pStart && i < pEnd) {
                continue;
            }
            slotsSet.add(mToT(Math.floor(i/60)*60));
        }
    };
    
    addSlots(orariP); 
    addSlots(orariS);
    
    return Array.from(slotsSet).sort((a,b) => tToMin(a) - tToMin(b));
};

window.loadPoolData = function() {
    const d = document.getElementById("mainDate") ? document.getElementById("mainDate").value : new Date().toISOString().split('T')[0];
    const list = window.poolData && Array.isArray(window.poolData[d]) ? window.poolData[d] : [];
    
    list.sort((a,b) => (a.ora || "").localeCompare(b.ora || ""));
    const grid = document.getElementById("poolGrid");
    
    if(grid) {
        grid.innerHTML = "";
        if (list.length > 0) {
            list.forEach(item => {
                let badgeStyle = "background:rgba(2,132,199,0.1); color:#0284c7; border:1px solid rgba(2,132,199,0.3);";
                let areaShort = "PIS";
                if (item.area === "SPA") {
                    badgeStyle = "background:rgba(219,39,119,0.1); color:#db2777; border:1px solid rgba(219,39,119,0.3);";
                    areaShort = "SPA";
                } else if (item.area === "Esterni") {
                    badgeStyle = "background:rgba(22,163,74,0.1); color:#16a34a; border:1px solid rgba(22,163,74,0.3);";
                    areaShort = "EST";
                }

                const checkClass = item.checked ? "checked" : "";
                const checkIcon = item.checked ? "check_circle" : "login";
                const displayNote = item.note ? item.note : '';

                const rowHtml = `
                    <div class="app-row" id="row_${item.id}" data-cam="${item.cam}">
                        <div class="row-info">
                            <span class="row-time">${item.ora}</span>
                            <span class="row-badge" style="${badgeStyle}">${areaShort}</span>
                            <span class="row-text" title="${displayNote}">C.${item.cam} ${item.cog ? '- '+item.cog : ''}</span>
                            <span class="row-sub">${item.pers}px</span>
                        </div>
                        <div class="row-actions">
                            <button class="btn-mini check ${checkClass}" onclick="window.toggleCheckIn('${item.id}')" title="Check-in"><i class="material-icons-round" style="font-size:14px;">${checkIcon}</i></button>
                            <button class="btn-mini edit" onclick="window.editEntry('${item.id}')" title="Modifica"><i class="material-icons-round" style="font-size:14px;">edit</i></button>
                            <button class="btn-mini del" onclick="window.deleteEntry('${item.id}')" title="Elimina"><i class="material-icons-round" style="font-size:14px;">close</i></button>
                        </div>
                    </div>
                `;
                grid.innerHTML += rowHtml;
            });
        }
    }

    const slotTable = document.getElementById("slotTable");
    if(slotTable) {
        slotTable.innerHTML = "";
        const dynamicSlots = generateDynamicSlots(d);

        if (dynamicSlots.length === 0) {
            slotTable.innerHTML = "<tr><td colspan='5' style='padding:40px; color:var(--red); text-align:center;'>Nessun orario impostato</td></tr>";
            return;
        }

        const sogliaAtt = (window.dbOrari && window.dbOrari.regole && window.dbOrari.regole.soglia_att) ? parseInt(window.dbOrari.regole.soglia_att) : 0;
        const sogliaFull = (window.dbOrari && window.dbOrari.regole && window.dbOrari.regole.soglia_full) ? parseInt(window.dbOrari.regole.soglia_full) : 0;
        
        const dayIdx = getDayOfWeek(d);
        const oPisc = window.dbOrari.piscina[dayIdx] || {};
        const oSpa = window.dbOrari.spa[dayIdx] || {};

        dynamicSlots.forEach(slot => {
            const slotStart = tToMin(slot);
            const slotEnd = slotStart + 60; 
            
            let isPiscinaPaused = !oPisc.active || (oPisc.pausa_active && slotStart >= tToMin(oPisc.p_in) && slotStart < tToMin(oPisc.p_out));
            let isSpaPaused = !oSpa.active || (oSpa.pausa_active && slotStart >= tToMin(oSpa.p_in) && slotStart < tToMin(oSpa.p_out));

            // Failsafe: Se per qualche motivo entrambi i servizi sono in pausa ma lo slot è stato generato, lo skippa.
            if (isPiscinaPaused && isSpaPaused) return;

            let pPisc = 0, pSpa = 0, pTot = 0, pCheck = 0;

            list.forEach(item => {
                const nPers = Number(item.pers); 
                if (isNaN(nPers) || nPers <= 0) return;

                const entryStart = tToMin(item.ora);
                const entryEnd = entryStart + 120; // 2H
                const overlap = Math.max(entryStart, slotStart) < Math.min(entryEnd, slotEnd);

                if (overlap) {
                    pTot += nPers;
                    if (item.area === "SPA") pSpa += nPers;
                    else if (item.area === "Piscina") pPisc += nPers;
                    if (item.checked === true) pCheck += nPers;
                }
            });

            let rowClass = "empty-row";
            if (sogliaFull > 0 && pTot >= sogliaFull) rowClass = "limit-red";
            else if (sogliaAtt > 0 && pTot >= sogliaAtt) rowClass = "limit-yellow";
            else if (pTot > 0) rowClass = "active-row";

            let tdCheckClass = (pCheck > 0 && (rowClass === "active-row" || rowClass === "empty-row")) ? "check-active" : "";
            
            // Se un servizio è chiuso/in pausa mentre l'altro lavora, mostra "CHIUSA" solo nella sua cella.
            let valPisc = isPiscinaPaused ? `<span style="font-size:10px; color:var(--text-muted); font-weight:normal;">CHIUSA</span>` : (pPisc > 0 ? pPisc : '-');
            let valSpa = isSpaPaused ? `<span style="font-size:10px; color:var(--text-muted); font-weight:normal;">CHIUSA</span>` : (pSpa > 0 ? pSpa : '-');

            slotTable.innerHTML += `
                <tr class="${rowClass}">
                    <td style="flex:0.8;">${slot}</td>
                    <td>${valPisc}</td>
                    <td>${valSpa}</td>
                    <td style="font-size:16px;">${pTot > 0 ? pTot : '-'}</td>
                    <td class="${tdCheckClass}">${pCheck > 0 ? pCheck : '-'}</td>
                </tr>
            `;
        });
    }
};

window.render = function() {
    if(typeof window.loadPoolData === 'function') window.loadPoolData();
};

window.searchRoom = function() {
    const camInput = document.getElementById("searchCam");
    const cam = camInput.value.trim();
    if(!cam) { showBlueToast("Digita un numero di camera per cercare", true); return; }

    const d = document.getElementById("mainDate").value;
    const list = window.poolData[d] || [];
    const found = list.filter(x => x.cam == cam);
    
    const modal = document.getElementById("actionModal");
    const title = document.getElementById("modalTitle");
    const msg = document.getElementById("modalMsg");
    const btns = document.getElementById("modalBtns");
    
    btns.innerHTML = "";
    
    if(found.length > 0) {
        title.innerText = `CAMERA ${cam}`;
        msg.innerText = `Trovati ${found.length} ingressi per oggi.`;
        found.forEach(item => {
            const status = item.checked ? "GIA' DENTRO" : "FAI CHECK-IN";
            const color = item.checked ? "rgba(255,255,255,0.1)" : "var(--green)";
            const textColor = item.checked ? "var(--text-muted)" : "#fff";
            btns.innerHTML += `
                <div style="border:1px solid var(--border-line); padding:10px; border-radius:8px; margin-bottom:8px; background:rgba(0,0,0,0.2); text-align:left; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:12px; font-weight:bold; color:var(--text-main);">${item.ora} - ${item.area}</div>
                        <div style="font-size:10px; color:var(--text-muted);">${item.pers} Pax</div>
                    </div>
                    <button class="btn-save" style="background:${color}; color:${textColor}; padding: 0 10px; height: 32px;" 
                            onclick="window.forceCheckIn('${item.id}')">${status}</button>
                </div>
            `;
        });
        btns.innerHTML += `<button class="btn-save btn-outline" style="width:100%; margin-top:10px;" onclick="window.closeModal()">ANNULLA</button>`;
        btns.innerHTML += `<button class="btn-save" style="background:var(--accent); color:#000; width:100%; margin-top:5px;" onclick="window.prefillNew('${cam}')">AGGIUNGI NUOVO ORARIO</button>`;
    } else {
        title.innerText = `CAMERA ${cam}`;
        msg.innerText = `Nessun ingresso registrato oggi per questa camera.`;
        btns.innerHTML = `
            <button class="btn-save btn-outline" style="width:100%; margin-bottom:5px;" onclick="window.closeModal()">ANNULLA</button>
            <button class="btn-save" style="background:var(--accent); color:#000; width:100%;" onclick="window.prefillNew('${cam}')">CREA NUOVO INGRESSO</button>
        `;
    }
    
    modal.style.display = "flex";
    camInput.value = ""; 
};

window.editEntry = function(id) {
    const d = document.getElementById("mainDate").value;
    const item = (window.poolData[d] || []).find(x => x.id === id);
    if(!item) return;

    document.getElementById("pId").value = item.id;
    document.getElementById("pOra").value = item.ora;
    document.getElementById("pCam").value = item.cam;
    if(document.getElementById("pCog")) document.getElementById("pCog").value = item.cog || "";
    if(document.getElementById("pPers")) document.getElementById("pPers").value = item.pers || "2";
    if(document.getElementById("pNote")) document.getElementById("pNote").value = item.note || "";
    document.getElementById("pArea").value = item.area;

    const btn = document.getElementById("btnSave");
    document.getElementById("btnSaveText").innerText = "AGGIORNA";
    btn.style.background = "var(--gold)";
    btn.style.color = "#000";
    document.getElementById("btnCancel").style.display = "flex";
};

window.resetForm = function() {
    document.getElementById("pId").value = "";
    document.getElementById("pCam").value = "";
    if(document.getElementById("pCog")) document.getElementById("pCog").value = "";
    if(document.getElementById("pNote")) document.getElementById("pNote").value = "";
    if(document.getElementById("pPers")) document.getElementById("pPers").value = "2";
    
    const now = new Date();
    document.getElementById("pOra").value = now.toTimeString().split(' ')[0].substring(0,5);

    if (window.dbOrari && window.dbOrari.regole) {
        document.getElementById("pArea").value = window.dbOrari.regole.preset || "Piscina";
    }

    const btn = document.getElementById("btnSave");
    document.getElementById("btnSaveText").innerText = "INSERISCI";
    btn.style.background = "#2563eb";
    btn.style.color = "#ffffff";
    document.getElementById("btnCancel").style.display = "none";
};

window.addEntry = function() {
    const d = document.getElementById("mainDate").value;
    const id = document.getElementById("pId").value;
    const ora = document.getElementById("pOra").value;
    const cam = document.getElementById("pCam").value;
    
    if(!ora || !cam) { showBlueToast("Ora e Camera sono campi obbligatori!", true); return; }

    if (!window.poolData[d]) window.poolData[d] = [];

    let isChecked = false;
    if(id) {
        const existing = window.poolData[d].find(x => x.id === id);
        if(existing) isChecked = existing.checked;
    }

    const entry = {
        id: id ? id : "P" + Date.now(),
        ora: ora,
        cam: cam,
        cog: document.getElementById("pCog") ? document.getElementById("pCog").value : "",
        pers: document.getElementById("pPers") ? (parseInt(document.getElementById("pPers").value) || 0) : 2,
        area: document.getElementById("pArea").value,
        note: document.getElementById("pNote") ? document.getElementById("pNote").value : "",
        checked: isChecked
    };

    if(id) {
        window.poolData[d] = window.poolData[d].filter(x => x.id !== id);
        window.poolData[d].push(entry);
        if(typeof window.savePoolEntry === 'function') window.savePoolEntry(d, null, true);
        showBlueToast("Aggiornamento Eseguito!");
    } else {
        if(typeof window.savePoolEntry === 'function') window.savePoolEntry(d, entry, false);
        showBlueToast("Ingresso Salvato!");
    }
    window.resetForm();
};

window.toggleCheckIn = function(id) {
    const d = document.getElementById("mainDate").value;
    if(!window.poolData[d]) return;
    const item = window.poolData[d].find(x => x.id === id);
    if(item) { 
        item.checked = !item.checked; 
        if(typeof window.savePoolEntry === 'function') window.savePoolEntry(d, null, true);
    }
};

window.deleteEntry = function(id) { 
    const requireConfirm = (window.dbOrari && window.dbOrari.regole && window.dbOrari.regole.confirm_del !== undefined) ? window.dbOrari.regole.confirm_del : true;
    
    if(requireConfirm) {
        if(!confirm("Sicuro di voler eliminare definitivamente questo ingresso?")) return;
    }

    const d = document.getElementById("mainDate").value; 
    if(typeof window.removePoolEntry === 'function') window.removePoolEntry(d, id); 
    if(document.getElementById("pId").value === id) window.resetForm();
    showBlueToast("Ingresso Eliminato", true);
};

window.forceCheckIn = function(id) { window.toggleCheckIn(id); window.closeModal(); showBlueToast("Check-in Effettuato"); };
window.prefillNew = function(cam) { window.resetForm(); document.getElementById("pCam").value = cam; document.getElementById("pPers")?.focus(); window.closeModal(); };
window.closeModal = function() { const m = document.getElementById("actionModal"); if(m) m.style.display = "none"; };