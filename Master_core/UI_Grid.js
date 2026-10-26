/* Master_core/UI_Grid.js - Renderer Griglia, Taglia/Incolla Unificato e Gestore Pause */

window._timeCache = new Map();
window._turniCache = {}; 
window._isFetchingTurni = false;
window.twClipboard = null; 

window.tToM = function(t) { 
    if(!t || typeof t !== 'string') return 0; 
    if(window._timeCache.has(t)) return window._timeCache.get(t);
    const p = t.split(':'); 
    const mins = (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
    window._timeCache.set(t, mins);
    return mins;
};

window.mToT = function(m) { 
    const h = Math.floor(m/60); const mm = m%60; 
    return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; 
};

window.getSlots = function() { 
    let startM = 540; let endM = 1200; 
    if (window.db && window.db.settings && window.db.settings.agenda) {
        if (window.db.settings.agenda.start) startM = window.tToM(window.db.settings.agenda.start);
        if (window.db.settings.agenda.end) endM = window.tToM(window.db.settings.agenda.end);
    }
    if (startM >= endM) { startM = 540; endM = 1200; }
    
    let s = []; 
    for(let i = startM; i <= endM; i += 10) s.push(window.mToT(i)); 
    return s; 
};

window.sysFixTwinData = function(app) {
    if(app.isCouple && !app.linkedId) return { ...app, linkedId: "RECOVERED_" + app.id };
    return app;
};

window.normalizeFbArray = function(data) {
    if (!data) return [];
    const arr = Array.isArray(data) ? data : Object.values(data);
    return arr.filter(app => app !== null && app !== undefined && app.id).map(app => {
        let cleanApp = window.sysFixTwinData(app);
        if (!window._timeCache.has(cleanApp.ora)) {
            const parts = (cleanApp.ora || "00:00").split(':');
            window._timeCache.set(cleanApp.ora, (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10));
        }
        cleanApp.oraMin = window._timeCache.get(cleanApp.ora);
        cleanApp.durInt = parseInt(cleanApp.dur, 10) || 30;
        cleanApp.oraFine = cleanApp.oraMin + cleanApp.durInt;
        return cleanApp;
    });
};

window.sysDeltaUpdateDOM = function(appId, newOra, newCab) {
    window.render(); 
};

window.getMondayLocalIso = function(dStr) {
    const d = new Date(dStr);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
};

if (!document.getElementById('tw-cut-style')) {
    const style = document.createElement('style');
    style.id = 'tw-cut-style';
    style.innerHTML = `@keyframes pulseCut { 0% { opacity:0.7; } 50% { opacity:0.3; } 100% { opacity:0.7; } }`;
    document.head.appendChild(style);
}

window.render = function() {
    try {
        const grid = document.getElementById("mainGrid"); 
        if(!grid || grid.style.display === 'none') return;
        const d = document.getElementById("mainDate") ? document.getElementById("mainDate").value : null; 
        if(!d) return;

        const wKey = window.getMondayLocalIso(d);
        if(!window._turniCache[wKey] && !window._isFetchingTurni && window.twStructId) {
            window._isFetchingTurni = true;
            firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/turni/${wKey}`).once('value').then(snap => {
                window._turniCache[wKey] = snap.val() || {};
                window._isFetchingTurni = false;
                window.render(); 
            });
        }

        let dayApps = (window.db && window.db.app && window.db.app[d]) ? window.normalizeFbArray(window.db.app[d]) : [];
        let dayBlocchi = (window.db && window.db.blocchi && window.db.blocchi[d]) ? Object.values(window.db.blocchi[d]).filter(b => b !== null && b !== undefined) : [];
        
        let numCabine = parseInt(localStorage.getItem('tw_num_cabine'), 10) || 5; 
        let reqFrontOffice = 0; 
        let isYieldActive = true;
        let hasPausa = false;
        let pStart = 0;
        let pEnd = 0;
        
        if (window.db && window.db.settings && window.db.settings.agenda) {
            if (window.db.settings.agenda.num_cabine) {
                numCabine = parseInt(window.db.settings.agenda.num_cabine, 10);
                localStorage.setItem('tw_num_cabine', numCabine);
            }
            if (window.db.settings.agenda.front_office !== undefined) reqFrontOffice = parseInt(window.db.settings.agenda.front_office, 10);
            if (window.db.settings.agenda.yield_active !== undefined) isYieldActive = window.db.settings.agenda.yield_active;
            
            if (window.db.settings.agenda.pausa_active) {
                hasPausa = true;
                pStart = window.tToM(window.db.settings.agenda.pausa_start || "13:00");
                pEnd = window.tToM(window.db.settings.agenda.pausa_end || "15:00");
            }
        }

        let gfx = (window.db && window.db.settings && window.db.settings.grafica) ? window.db.settings.grafica : null;
        let baseBlockColor = (gfx && gfx.usa_preset === false && gfx.colori_servizio && gfx.colori_servizio['blocco_cabina']) ? gfx.colori_servizio['blocco_cabina'] : "#334155";
        
        const slots = window.getSlots();
        if(slots.length === 0) return; 

        const weekTurni = window._turniCache[wKey];
        const dayIdx = new Date(d).getDay() || 7;

        let h = "";
        for(let cabNum = 1; cabNum <= numCabine; cabNum++) {
            
            let cabName = `CABINA ${cabNum}`;
            if (window.db && window.db.settings && window.db.settings.cabine_config) {
                let oldCab = Object.values(window.db.settings.cabine_config)[cabNum - 1];
                if(oldCab && oldCab.nome) cabName = oldCab.nome;
            }

            h += `<div class="colonna" data-cab="${cabNum}" data-id="${cabNum}"><div class="col-head">${cabName}</div>`;
            
            slots.forEach(s => {
                const sMin = window.tToM(s);
                const slotAttrs = `data-ora="${s}" data-cab="${cabNum}"`;
                
                let isSlotLocked = false;
                
                if (hasPausa && sMin >= pStart && sMin < pEnd) {
                    isSlotLocked = true;
                }
                
                if (isYieldActive && !isSlotLocked) {
                    if (!weekTurni || window._isFetchingTurni || Object.keys(weekTurni).length === 0) {
                        isSlotLocked = false; 
                    } else {
                        let activeOps = 0;
                        Object.keys(weekTurni).forEach(opNick => {
                            const t = weekTurni[opNick][dayIdx];
                            if(t && t.active) {
                                const mIn = window.tToM(t.m_in);
                                const mOut = window.tToM(t.m_out);
                                if(sMin >= mIn && sMin < mOut) {
                                    activeOps++;
                                } else if(t.tipo === 'spezzato') {
                                    const pIn = window.tToM(t.p_in);
                                    const pOut = window.tToM(t.p_out);
                                    if(sMin >= pIn && sMin < pOut) activeOps++;
                                }
                            }
                        });
                        let maxCabineOperative = activeOps - reqFrontOffice;
                        if(maxCabineOperative < 0) maxCabineOperative = 0;
                        isSlotLocked = cabNum > maxCabineOperative;
                    }
                }

                let startApp = dayApps.find(x => parseInt(x.cab, 10) === cabNum && x.oraMin >= sMin && x.oraMin < (sMin + 10));
                let busyApp = dayApps.find(x => parseInt(x.cab, 10) === cabNum && sMin >= x.oraMin && sMin < (x.oraFine + 10) && !startApp);

                let startBlocco = dayBlocchi.find(x => parseInt(x.cab, 10) === cabNum && window.tToM(x.ora) >= sMin && window.tToM(x.ora) < (sMin + 10));
                let busyBlocco = dayBlocchi.find(x => parseInt(x.cab, 10) === cabNum && sMin >= window.tToM(x.ora) && sMin < (window.tToM(x.ora) + (parseInt(x.dur, 10) || 60)) && !startBlocco);

                if(startApp) {
                    const exactDur = startApp.durInt || 30;
                    let extraStyles = "";
                    let isCustomPainted = false;

                    let isCut = window.twClipboard && window.twClipboard.appId === startApp.id;
                    let cutStyles = isCut ? "opacity:0.6; border:2px dashed var(--gold) !important; animation: pulseCut 1.5s infinite; filter: grayscale(50%); z-index:1;" : "";

                    try {
                        let appColor = null;
                        if (gfx && gfx.usa_preset === false) {
                            if (gfx.criterio_attivo === 'servizio' && gfx.colori_servizio) {
                                let srvKey = startApp.servId || startApp.aServ || startApp.serv_id;
                                if (!srvKey && startApp.serv && window.db && window.db.servizi) {
                                    const serviziArr = Array.isArray(window.db.servizi) ? window.db.servizi : Object.values(window.db.servizi);
                                    for (const v of serviziArr) { if (v && v.nome === startApp.serv) { srvKey = v.id; break; } }
                                }
                                if (!srvKey) srvKey = startApp.serv; 
                                if (srvKey && gfx.colori_servizio[srvKey]) appColor = gfx.colori_servizio[srvKey];
                            } else if (gfx.criterio_attivo === 'durata' && gfx.colori_durata) {
                                if (gfx.colori_durata[`dur_${exactDur}`]) appColor = gfx.colori_durata[`dur_${exactDur}`];
                            }
                        }

                        if (gfx && gfx.sovrascrivi_stati) {
                            if (startApp.pagato && gfx.colori_stato && gfx.colori_stato.pagato) {
                                appColor = gfx.colori_stato.pagato;
                            } else if (startApp.eseguito && gfx.colori_stato && gfx.colori_stato.eseguito) {
                                appColor = gfx.colori_stato.eseguito;
                            }
                        }

                        if (appColor && appColor !== "default") {
                            extraStyles = `background-color: ${appColor} !important; color: #ffffff !important; border-left-color: rgba(255,255,255,0.4) !important; box-shadow: inset 4px 0 0 rgba(0,0,0,0.3) !important;`;
                            isCustomPainted = true;
                        }
                    } catch (colorErr) {}

                    const hCss = `height: calc(${((exactDur + 10) / 10) * 100}% - 4px); top: 2px; left: 2px; width: calc(100% - 4px); padding: 0; display: flex; flex-direction: column; overflow: hidden; position:absolute; ${extraStyles} ${cutStyles}`;
                    let priceText = `${parseFloat(startApp.price || 0).toFixed(2)}€`;
                    
                    let statusIcon = "";
                    if (startApp.pagato) statusIcon = `<i class="material-icons-round" style="font-size:12px; color:#10b981; vertical-align:middle; background:#fff; border-radius:50%; margin-left:4px; box-shadow:0 1px 2px rgba(0,0,0,0.2);" title="Pagato">check_circle</i>`;
                    else if (startApp.eseguito) statusIcon = `<i class="material-icons-round" style="font-size:12px; color:var(--purple); vertical-align:middle; background:#fff; border-radius:50%; margin-left:4px; box-shadow:0 1px 2px rgba(0,0,0,0.2);" title="Eseguito">done</i>`;

                    let extNote = startApp.note ? `<div style="flex:1; overflow-y:auto; background:rgba(255,255,255,0.85); border-left:2px solid var(--accent); padding:4px 6px; border-radius:4px; font-size:10px; font-style:italic; color:#0f172a; font-weight:800;">${startApp.note}</div>` : '';
                    let extPat = startApp.patologie ? `<div style="flex:1; overflow-y:auto; background:var(--bg-panel); border-left:2px solid var(--red); color:var(--red); padding:4px 6px; border-radius:4px; font-size:10px; font-weight:bold;">${startApp.patologie}</div>` : '';

                    let baseClass = "app-base " + (!isCustomPainted && startApp.pagato ? 'pagato-style' : (!isCustomPainted && startApp.eseguito ? 'eseguito-style' : ''));
                    
                    const safeName = (startApp.cog || 'Cliente').replace(/'/g, "\\'");

                    h += `<div class="time-row"><div class="time-lbl">${s}</div>
                          <div class="slot" ${slotAttrs}>
                            <div class="${baseClass}" style="${hCss}" draggable="${!isCut}" data-app-id="${startApp.id}" data-serv="${startApp.servId || startApp.serv}" data-dur="${exactDur}">
                                <div class="app-card-actions" style="position:absolute; top:4px; right:4px; display:flex; gap:4px; z-index:10; background:inherit; padding-left:4px; border-radius:0 0 0 6px;">
                                    <div data-action="crm" title="Profilo Cliente" onclick="event.stopPropagation(); if(window.sysOpenCRMProfileGrid) window.sysOpenCRMProfileGrid('${safeName}')" style="width:22px; height:22px; background:var(--purple); border-radius:6px; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.3); cursor:pointer;"><i class="material-icons-round" style="font-size:14px;">person</i></div>
                                    <div data-action="delete" title="Elimina" onclick="event.stopPropagation(); if(window.sysPromptDelete) window.sysPromptDelete('${startApp.id}', '${d}')" style="width:22px; height:22px; background:var(--red); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.3); cursor:pointer;"><i class="material-icons-round" style="font-size:14px;">close</i></div>
                                </div>
                                <div style="display:flex; flex-direction:column; height: ${(exactDur/(exactDur+10))*100}%; padding: 6px; box-sizing: border-box; overflow:hidden;">
                                    <div style="flex-shrink:0; padding-right:55px; margin-bottom:4px;">
                                        <b style="display:block; font-size:13px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px;">Cam ${startApp.cam || '?'} -${startApp.cog || 'N.D.'}</b>
                                        <div style="font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${startApp.serv || '-'} (${exactDur}m | ${priceText})${statusIcon}</div>
                                        <div style="font-size:10px; font-weight:bold; color:${isCustomPainted ? 'rgba(255,255,255,0.8)' : 'var(--gold)'}; margin-top:2px;">OP: ${startApp.op || '-'}</div>
                                    </div>
                                    <div style="flex:1; display:flex; flex-direction:column; gap:4px; overflow:hidden;">
                                        ${extNote}${extPat}
                                    </div>
                                </div>
                                <div style="height: ${(10/(exactDur+10))*100}%; background: repeating-linear-gradient(45deg, rgba(0,0,0,0.05), rgba(0,0,0,0.05) 5px, transparent 5px, transparent 10px); border-top: 1px dashed rgba(0,0,0,0.15); display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:bold; opacity:0.8;">+10m Pulizia</div>
                            </div>
                          </div></div>`;
                } else if(busyApp) { 
                    h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" ${slotAttrs}><div class="app-busy" data-id="${busyApp.id}"></div></div></div>`;
                } else if(startBlocco) {
                    const durVal = parseInt(startBlocco.dur, 10) || 60;
                    const offsetTop = window.tToM(startBlocco.ora) - sMin;
                    const hCss = `height: calc(${((durVal) / 10) * 100}% - 4px);`;
                    const topCss = offsetTop > 0 ? `top: calc(${(offsetTop/10)*100}% + 2px);` : `top: 2px;`;
                    
                    h += `<div class="time-row"><div class="time-lbl">${s}</div>
                          <div class="slot" ${slotAttrs}>
                            <div class="app-base blocco-cabina" style="${hCss} ${topCss} left: 2px; width: calc(100% - 4px); position: absolute; background-color:${baseBlockColor} !important; border-left: 5px solid #64748b !important; color: #f8fafc !important; padding: 8px 12px; z-index: 6; box-sizing: border-box;" data-app-id="${startBlocco.id}" draggable="true">
                                <div class="blocco-actions" style="position: absolute; top: 4px; right: 4px; display: flex; gap: 4px; z-index: 15;">
                                    <i class="material-icons-round del-btn" title="Elimina" onclick="event.stopPropagation(); window.cuscinetto.confirmDeleteBlock('${startBlocco.id}')" style="font-size: 14px; background: rgba(0,0,0,0.6); color: white; border-radius: 4px; padding: 3px; cursor: pointer;">delete</i>
                                </div>
                                <b style="display:block; font-size:12px; text-transform:uppercase; margin-bottom:2px; padding-right:28px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#fff;"><i class="material-icons-round" style="font-size:14px; vertical-align:middle; margin-right:4px;">block</i> ${startBlocco.note || 'Cuscinetto'}</b>
                                <span style="font-weight:bold; font-size:11px; color:#fff;" class="blocco-dur-label">${durVal}m</span>
                                <div class="resizer-bottom" onmousedown="event.stopPropagation(); window.cuscinetto.startResize(event, '${startBlocco.id}', ${durVal})" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 10px; cursor: ns-resize; background: rgba(255,255,255,0.08); border-top: 1px dashed rgba(148,163,184,0.6); z-index: 12; pointer-events: auto;"></div>
                            </div>
                          </div></div>`;
                } else if(busyBlocco) {
                    h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" ${slotAttrs}><div class="app-busy" data-id="${busyBlocco.id}"></div></div></div>`;
                } else if (isSlotLocked) {
                    h += `<div class="time-row"><div class="time-lbl">${s}</div>
                          <div class="slot cabina-chiusa-bg" ${slotAttrs} style="background: repeating-linear-gradient(45deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px) !important; pointer-events: none; border-bottom: 1px solid rgba(0,0,0,0.2) !important; position:relative;">
                          </div></div>`;
                } else { 
                    h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" ${slotAttrs}></div></div>`; 
                }
            });
            h += `</div>`;
        }
        
        grid.innerHTML = h;
        if(window.sysInitGridEventDelegation) window.sysInitGridEventDelegation();
        
        setTimeout(() => {
            const todayStr = new Date().toISOString().split('T')[0];
            if(d !== todayStr) return;
            const now = new Date(); 
            const minsSinceStart = ((now.getHours() * 60) + now.getMinutes()) - window.tToM(slots[0]);
            
            // FIX SCROLL: Il laser si spegne se l'ora supera la griglia generata
            const maxMins = slots.length * 10;
            let laser = document.getElementById("timeLaser");
            
            if (minsSinceStart >= 0 && minsSinceStart <= maxMins) {
                if (!laser) { laser = document.createElement("div"); laser.id = "timeLaser"; grid.appendChild(laser); }
                laser.style.cssText = "position:absolute; left:0; height:1px !important; background-color:var(--purple) !important; z-index:15; pointer-events:none; box-shadow:none !important; border:none !important;";
                laser.style.width = grid.scrollWidth > 0 ? grid.scrollWidth + "px" : "100%";
                laser.style.top = `${(minsSinceStart * 6) + 46}px`; 
                laser.style.display = 'block';
            } else if (laser) {
                laser.style.display = 'none';
            }
        }, 100);
        
    } catch(err) { console.error("Render error: ", err); }
};

window.sysCheckIfTodayAndCenter = function() {
    const dEl = document.getElementById("mainDate");
    const todayStr = new Date().toISOString().split('T')[0];
    if(!dEl || dEl.value !== todayStr) return;
    setTimeout(() => {
        const laser = document.getElementById("timeLaser");
        const grid = document.getElementById("mainGrid");
        if(laser && laser.style.display !== 'none' && grid) {
            const targetY = parseFloat(laser.style.top) - (grid.clientHeight / 2);
            grid.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
        }
    }, 400);
};

window.sysInitGridEventDelegation = function() {
    const grid = document.getElementById("mainGrid");
    if (!grid || grid.getAttribute('data-has-delegation') === 'true') return;
    
    grid.addEventListener('click', window.sysHandleGridClick);
    grid.addEventListener('contextmenu', function(e) { if (typeof window.sysOpenContextMenu === 'function') window.sysOpenContextMenu(e); });
    grid.addEventListener('dragstart', (e) => { 
        const appEl = e.target.closest('.app-base'); 
        if (appEl && appEl.getAttribute('draggable') === 'true') window.sysDragStart(e, appEl.getAttribute('data-app-id')); 
    });
    grid.addEventListener('dragend', window.sysDragEnd);
    grid.addEventListener('dragover', (e) => { if(e.target.closest('.slot')) window.sysAllowDrop(e); });
    grid.addEventListener('dragleave', (e) => { if(e.target.closest('.slot')) window.sysDragLeave(e); });
    grid.addEventListener('drop', (e) => { if(e.target.closest('.slot')) window.sysDrop(e); });
    
    grid.setAttribute('data-has-delegation', 'true');
};

/* --- MENU CONTESTUALE UNIFICATO (CUSCINETTO + TAGLIA/INCOLLA) --- */
window.sysOpenContextMenu = function(e) {
    e.preventDefault();
    
    let ctx = document.getElementById("tw-context-menu");
    if (!ctx) {
        ctx = document.createElement('div');
        ctx.id = "tw-context-menu";
        ctx.style.cssText = "position:fixed; background:var(--bg-panel); border:1px solid var(--border-line); border-radius:12px; box-shadow:0 15px 40px rgba(0,0,0,0.6); z-index:9999; display:none; flex-direction:column; overflow:hidden; min-width:200px;";
        document.body.appendChild(ctx);
        document.addEventListener('click', () => { ctx.style.display = 'none'; });
    }
    
    ctx.innerHTML = "";
    
    const appEl = e.target.closest('.app-base:not(.blocco-cabina)');
    const slotEl = e.target.closest('.slot');
    
    if (appEl) {
        const appId = appEl.getAttribute('data-app-id');
        const rawText = appEl.querySelector('b').innerText;
        const cog = rawText.includes('-') ? rawText.split('-')[1].trim() : "Cliente";
        
        ctx.innerHTML = `
            <div style="padding:12px 15px; cursor:pointer; color:var(--text-main); font-size:13px; font-weight:bold; display:flex; align-items:center; gap:10px; transition:0.2s;" onmouseover="this.style.background='rgba(251,191,36,0.1)'" onmouseout="this.style.background='transparent'" onclick="window.sysCutApp('${appId}', '${cog.replace(/'/g, "\\'")}')">
                <i class="material-icons-round" style="font-size:18px; color:var(--gold);">content_cut</i> TAGLIA APPUNTAMENTO
            </div>
        `;
    } 
    else if (slotEl && !slotEl.classList.contains('cabina-chiusa-bg')) {
        const ora = slotEl.getAttribute('data-ora');
        const cab = slotEl.getAttribute('data-cab');
        
        let pasteBtn = window.twClipboard ? `
            <button type="button" class="ctx-btn" style="background:transparent; border:none; padding:12px 15px; color:var(--text-main); text-align:left; cursor:pointer; font-size:13px; font-weight:bold; display:flex; align-items:center; gap:10px; transition:0.2s; width:100%; border-bottom:1px solid var(--border-line);" onclick="window.sysPasteApp('${ora}', '${cab}')">
                <i class="material-icons-round" style="font-size:18px; color:var(--green);">content_paste</i> INCOLLA: ${window.twClipboard.cog}
            </button>` : "";
            
        let cancelBtn = window.twClipboard ? `
            <button type="button" class="ctx-btn" style="background:transparent; border:none; padding:12px 15px; color:var(--red); text-align:left; cursor:pointer; font-size:13px; font-weight:bold; display:flex; align-items:center; gap:10px; transition:0.2s; width:100%; border-top:1px solid var(--border-line);" onclick="window.sysCancelCut()">
                <i class="material-icons-round" style="font-size:18px;">close</i> ANNULLA TAGLIO
            </button>` : "";

        ctx.innerHTML = `
            <div style="padding:10px 15px; background:rgba(0,0,0,0.2); border-bottom:1px solid var(--border-line); font-size:11px; font-weight:bold; color:var(--text-muted); text-transform:uppercase;">Cabina ${cab} - Ore ${ora}</div>
            ${pasteBtn}
            <button type="button" class="ctx-btn" style="background:transparent; border:none; padding:12px 15px; color:var(--text-main); text-align:left; cursor:pointer; font-size:13px; font-weight:bold; display:flex; align-items:center; gap:10px; transition:0.2s; width:100%; border-bottom:1px dashed var(--border-line);" onclick="document.getElementById('tw-context-menu').style.display='none'; if(window.cuscinetto) window.cuscinetto.createInstantBlock('${cab}', '${ora}');">
                <i class="material-icons-round" style="color:var(--gold);">block</i> Crea Cuscinetto
            </button>
            <button type="button" class="ctx-btn" style="background:transparent; border:none; padding:12px 15px; color:var(--text-main); text-align:left; cursor:pointer; font-size:13px; font-weight:bold; display:flex; align-items:center; gap:10px; transition:0.2s; width:100%;" onclick="document.getElementById('tw-context-menu').style.display='none'; if(typeof window.sysOpenSearchEngine === 'function') window.sysOpenSearchEngine(false);">
                <i class="material-icons-round" style="color:var(--accent);">radar</i> Ricerca Rapida
            </button>
            ${cancelBtn}
        `;
        
        ctx.querySelectorAll('.ctx-btn').forEach(b => {
            b.addEventListener('mouseover', () => b.style.background = 'rgba(56, 189, 248, 0.15)');
            b.addEventListener('mouseout', () => b.style.background = 'transparent');
        });
    } else {
        return; 
    }

    ctx.style.left = e.clientX + "px";
    ctx.style.top = e.clientY + "px";
    ctx.style.display = "flex";
};

window.sysCutApp = function(appId, cog) {
    window.twClipboard = { appId: appId, cog: cog };
    window.render(); 
    if(window.showToast) window.showToast("In memoria. Tasto destro su uno slot vuoto per Incollare.");
};

window.sysCancelCut = function() {
    window.twClipboard = null;
    window.render();
};

window.sysPasteApp = function(ora, cab) {
    if(!window.twClipboard) return;
    const appId = window.twClipboard.appId;
    window.twClipboard = null;
    if (window.sysValidateMove) window.sysValidateMove(appId, ora, cab);
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.twClipboard) window.sysCancelCut();
});

window.sysHandleGridClick = function(e) {
    const ctx = document.getElementById("tw-context-menu");
    if (ctx && ctx.style.display !== "none") ctx.style.display = "none";

    const target = e.target;
    if (target.closest('.app-card-actions') || target.closest('.blocco-actions') || target.closest('.resizer-bottom') || target.closest('.blocco-cabina')) return;

    e.stopPropagation();

    const appEl = target.closest('.app-base:not(.blocco-cabina)');
    if (appEl) { 
        if(typeof window.sysOpenEdit === 'function') window.sysOpenEdit(appEl.getAttribute('data-app-id')); 
        return; 
    }
    
    const busyEl = target.closest('.app-busy');
    if (busyEl && typeof window.sysOpenEdit === 'function') {
        const dId = busyEl.getAttribute('data-id');
        if (dId && !dId.startsWith('BLK_')) return window.sysOpenEdit(dId);
        return;
    }
    
    const slotEl = target.closest('.slot');
    if (slotEl && !slotEl.classList.contains('cabina-chiusa-bg')) {
        const ora = slotEl.getAttribute('data-ora');
        const col = slotEl.closest('.colonna');
        const cab = slotEl.getAttribute('data-cab') || (col ? col.getAttribute('data-cab') : 1);
        if(typeof window.sysOpenSlot === 'function') window.sysOpenSlot(ora, parseInt(cab, 10));
    }
};

window.sysDragStart = function(e, appId) { 
    const appEl = e.target.closest('.app-base');
    const isBlocco = appEl && appEl.classList.contains('blocco-cabina');
    window.isDraggingApp = true; window.draggedAppId = appId; window.draggedType = isBlocco ? 'blocco' : 'app';
    e.dataTransfer.setData("text/plain", appId); 
    
    let ghost = document.getElementById('tw-drag-ghost-cube');
    if(!ghost) {
        ghost = document.createElement('div'); ghost.id = 'tw-drag-ghost-cube';
        ghost.style.cssText = "width:30px; height:30px; background:var(--accent); border-radius:6px; border:2px solid #fff; position:absolute; top:-1000px; z-index:-10;";
        document.body.appendChild(ghost);
    }
    e.dataTransfer.setDragImage(ghost, 15, 15);
    setTimeout(() => { if(e.target) { e.target.classList.add('dragging'); e.target.style.opacity = "0.2"; } }, 10);
};

window.sysDragEnd = function(e) {
    window.isDraggingApp = false; window.draggedAppId = null; window.draggedType = null;
    if(e.target) { e.target.classList.remove('dragging'); e.target.style.opacity = "1"; }
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-over'));
};

window.sysAllowDrop = function(e) { 
    const slot = e.target.closest('.slot');
    if(!slot || slot.classList.contains('cabina-chiusa-bg')) return;
    e.preventDefault(); slot.classList.add('drag-over'); 
};
window.sysDragLeave = function(e) { if(e.target.closest('.slot')) e.target.closest('.slot').classList.remove('drag-over'); };

window.sysDrop = function(e) { 
    e.preventDefault(); window.isDraggingApp = false;
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-over'));
    const slot = e.target.closest('.slot'); 
    if(!slot) return;
    const appId = e.dataTransfer.getData("text/plain") || window.draggedAppId; 
    
    if(appId && slot.getAttribute('data-ora') && slot.getAttribute('data-cab')) {
        if((window.draggedType === 'blocco' || String(appId).startsWith('BLK_')) && window.cuscinetto) {
            window.cuscinetto.moveBlock(appId, slot.getAttribute('data-cab'), slot.getAttribute('data-ora'));
        } else if (window.sysValidateMove) {
            window.sysValidateMove(appId, slot.getAttribute('data-ora'), slot.getAttribute('data-cab'));
        }
    }
};

window.cuscinetto = {
    isResizing: false, resizeStartY: 0, resizeStartDur: 0, resizeBlockId: null,

    createInstantBlock: function(cab, ora) {
        const d = document.getElementById("mainDate") ? document.getElementById("mainDate").value : null;
        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
        if (!d || !safeStructId || !cab || !ora) return;

        const id = "BLK_" + Date.now();
        let dur = 30;
        if (window.db && window.db.settings && window.db.settings.agenda && window.db.settings.agenda.cuscinetto_min) {
            dur = parseInt(window.db.settings.agenda.cuscinetto_min, 10) || 30;
        }

        const newBlock = { id: id, cab: String(cab), ora: ora, dur: dur, note: "Cuscinetto" };

        if (!window.db) window.db = {};
        if (!window.db.blocchi) window.db.blocchi = {};
        if (!window.db.blocchi[d]) window.db.blocchi[d] = {};
        window.db.blocchi[d][id] = newBlock;
        window.render();

        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi/${d}/${id}`).set(newBlock).then(() => { 
            if(window.showToast) window.showToast(`Cuscinetto di ${dur}m creato!`); 
        });
    },

    confirmDeleteBlock: function(id) {
        const d = document.getElementById("mainDate") ? document.getElementById("mainDate").value : null;
        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
        if (!d || !safeStructId) return;

        if (window.db && window.db.blocchi && window.db.blocchi[d] && window.db.blocchi[d][id]) {
            delete window.db.blocchi[d][id];
            window.render();
        }
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi/${d}/${id}`).remove().then(() => { 
            if(window.showToast) window.showToast("Cuscinetto rimosso!"); 
        });
    },

    startResize: function(e, id, currentDur) {
        e.preventDefault(); e.stopPropagation();
        this.isResizing = true; this.resizeStartY = e.clientY; this.resizeStartDur = currentDur; this.resizeBlockId = id;
        document.body.classList.add('is-dragging-mode');
        document.addEventListener('mousemove', this.onResizeMove); 
        document.addEventListener('mouseup', this.onResizeEnd);
    },

    onResizeMove: function(e) {
        if (!window.cuscinetto.isResizing) return;
        const deltaY = e.clientY - window.cuscinetto.resizeStartY;
        let deltaMins = Math.round(deltaY / 60) * 10; 
        let newDur = window.cuscinetto.resizeStartDur + deltaMins; 
        if (newDur < 10) newDur = 10;
        
        const blockEl = document.querySelector(`.blocco-cabina[data-app-id="${window.cuscinetto.resizeBlockId}"]`);
        if(blockEl) { 
            blockEl.style.height = `calc(${(newDur / 10) * 100}% - 4px)`; 
            const label = blockEl.querySelector('.blocco-dur-label'); 
            if(label) label.innerText = `${newDur}m`; 
        }
    },

    onResizeEnd: function(e) {
        if (!window.cuscinetto.isResizing) return;
        window.cuscinetto.isResizing = false; 
        document.body.classList.remove('is-dragging-mode');
        document.removeEventListener('mousemove', window.cuscinetto.onResizeMove); 
        document.removeEventListener('mouseup', window.cuscinetto.onResizeEnd);
        
        const deltaY = e.clientY - window.cuscinetto.resizeStartY;
        let deltaMins = Math.round(deltaY / 60) * 10;
        let newDur = window.cuscinetto.resizeStartDur + deltaMins; 
        if (newDur < 10) newDur = 10;
        
        const d = document.getElementById("mainDate").value;
        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
        const bId = window.cuscinetto.resizeBlockId;

        if (window.db && window.db.blocchi && window.db.blocchi[d] && window.db.blocchi[d][bId]) {
            window.db.blocchi[d][bId].dur = newDur;
            window.render();
        }
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi/${d}/${bId}`).update({ dur: newDur });
    },

    moveBlock: function(blockId, newCab, newOra) {
        const d = document.getElementById("mainDate").value;
        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
        
        if (window.db && window.db.blocchi && window.db.blocchi[d] && window.db.blocchi[d][blockId]) {
            window.db.blocchi[d][blockId].cab = String(newCab);
            window.db.blocchi[d][blockId].ora = newOra;
            window.render();
        }
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi/${d}/${blockId}`).update({ cab: String(newCab), ora: newOra }).then(() => { 
            if(window.showToast) window.showToast("Cuscinetto Spostato!"); 
        });
    }
};