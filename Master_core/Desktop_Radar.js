/* Master_core/Desktop_Radar.js - Motore di Ricerca Desktop (Range Date, Fasce Orarie e Autocomplete) */

window.rCalMonth = new Date().getMonth();
window.rCalYear = new Date().getFullYear();
window.rStartDate = null;
window.rEndDate = null;
window.rClickCount = 0;

window.addEventListener('DOMContentLoaded', () => {
    sysInjectSearchModal();
    sysInjectRadarCalendar();
});

function sysInjectSearchModal() {
    if(!document.getElementById('searchEngineModal')) {
        const searchModalHtml = `
        <div id="searchEngineModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:4000; align-items:center; justify-content:center; backdrop-filter:blur(4px); padding:15px;" onclick="if(event.target===this) this.style.display='none'">
            <div class="modal-box large-modal" style="background:var(--bg-panel); padding:0; border-radius:16px; max-width:900px; width:95%; border:1px solid var(--border-line); box-shadow:0 10px 40px rgba(0,0,0,0.8); max-height:85vh; display:flex; flex-direction:column; overflow:hidden;">
                
                <div style="background:linear-gradient(135deg, var(--bg-panel) 0%, rgba(56, 189, 248, 0.1) 100%); padding:20px 25px; border-bottom:1px solid var(--border-line); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                    <div>
                        <h2 style="margin:0; color:var(--accent); font-size:20px; text-transform:uppercase; display:flex; align-items:center; gap:10px;">
                            <i class="material-icons-round" style="font-size:28px;">radar</i> MOTORE DI RICERCA RAPIDA
                        </h2>
                        <div style="font-size:11px; color:var(--text-muted); margin-top:5px; font-weight:bold; letter-spacing:0.5px;">TROVA IL PRIMO SLOT LIBERO INCROCIANDO ORARI E OPERATORI</div>
                    </div>
                    <button type="button" style="font-size:28px; border:none; background:transparent; color:var(--text-muted); cursor:pointer; transition:0.2s;" onclick="document.getElementById('searchEngineModal').style.display='none'" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text-muted)'"><i class="material-icons-round">close</i></button>
                </div>

                <div style="padding:25px; display:flex; flex-direction:column; gap:20px; flex:1; overflow-y:auto; background:var(--bg-body);">
                    
                    <div style="background:var(--bg-panel); padding:20px; border-radius:12px; border:1px solid var(--border-line); display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:20px; flex-shrink:0;">
                        
                        <!-- CALENDARIO A RANGE -->
                        <div style="display:flex; flex-direction:column;">
                            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:8px; display:block; text-transform:uppercase;">Periodo di Ricerca</label>
                            <div style="width:100%; height:45px; background:var(--bg-body); border:1px solid var(--border-line); border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:0.2s;" onclick="sysOpenRadarCalendar()" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border-line)'">
                                <i class="material-icons-round" style="color:var(--accent); font-size:18px; margin-right:8px;">date_range</i>
                                <div id="radarDateDisplay" style="font-weight:bold; font-size:13px; color:var(--text-main); pointer-events:none;">Seleziona Date</div>
                            </div>
                        </div>

                        <!-- AUTOCOMPLETE SERVIZIO -->
                        <div style="position:relative; display:flex; flex-direction:column;">
                            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:8px; display:block; text-transform:uppercase;">Trattamento Rapido</label>
                            <div style="display:flex; align-items:center; background:var(--bg-body); border:1px solid var(--border-line); border-radius:8px; padding:0 12px; transition:0.2s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border-line)'">
                                <i class="material-icons-round" style="color:var(--text-muted); font-size:18px;">spa</i>
                                <input type="text" id="sServSearch" placeholder="Es. Massaggio Relax..." onkeyup="sysHandleServSearch(this.value)" style="border:none; outline:none; background:transparent; color:var(--text-main); padding:13px 8px; width:100%; font-size:13px; font-weight:bold; font-family:inherit;">
                            </div>
                            <input type="hidden" id="sDur" value="30">
                            <div id="sServSuggestions" style="display:none; position:absolute; top:70px; left:0; width:100%; max-height:200px; overflow-y:auto; background:var(--bg-panel); border:1px solid var(--border-line); border-radius:8px; z-index:5000; box-shadow:0 15px 40px rgba(0,0,0,0.6);"></div>
                        </div>

                        <!-- FASCE ORARIE -->
                        <div style="display:flex; flex-direction:column;">
                            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:8px; display:block; text-transform:uppercase;">Fascia Oraria</label>
                            <select id="sFascia" class="form-input" style="width:100%; padding:12px; height:45px; background:var(--bg-body); font-weight:bold;">
                                <option value="mattina">Mattina (06:00 - 12:00)</option>
                                <option value="pomeriggio">Pomeriggio (12:00 - 17:00)</option>
                                <option value="sera">Sera (17:00 - 00:00)</option>
                            </select>
                        </div>
                        
                        <div style="display:flex; flex-direction:column;">
                            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:8px; display:block; text-transform:uppercase;">Genere Op.</label>
                            <select id="sGender" class="form-input" style="width:100%; padding:12px; height:45px; background:var(--bg-body); font-weight:bold;">
                                <option value="">Indifferente (M/F)</option>
                                <option value="F">Solo Femminile</option>
                                <option value="M">Solo Maschile</option>
                            </select>
                        </div>
                        
                        <div style="display:flex; flex-direction:column; grid-column: 1 / -1;">
                            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:8px; display:block; text-transform:uppercase;">Operatore Specifico</label>
                            <select id="sOpSearch" class="form-input" style="width:100%; padding:12px; height:45px; background:var(--bg-body); font-weight:bold;"><option value="">Qualsiasi Operatore Disponibile</option></select>
                        </div>

                    </div>
                    
                    <button class="btn-save" style="margin:0; padding:15px; font-size:14px;" onclick="sysExecuteSearch()">
                        <i class="material-icons-round">manage_search</i> AVVIA SCANSIONE ALGORITMICA
                    </button>
                    
                    <div id="searchResults" style="flex:1; display:flex; flex-direction:column; gap:10px;">
                        <div style="text-align:center; padding:50px; color:var(--text-muted); border:2px dashed var(--border-line); border-radius:12px; background:rgba(0,0,0,0.2);">
                            <i class="material-icons-round" style="font-size:48px; color:var(--accent); opacity:0.5; margin-bottom:10px;">satellite_alt</i>
                            <div style="font-weight:bold; font-size:14px;">Imposta i parametri e avvia la scansione.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', searchModalHtml);
    }

    if(!document.getElementById('cabinChoiceModal')) {
        const cabinChoiceHtml = `
        <div id="cabinChoiceModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:4500; align-items:center; justify-content:center; padding:15px;" onclick="if(event.target===this) this.style.display='none'">
            <div class="modal-box" style="background:var(--bg-panel); padding:25px; border-radius:16px; width:100%; max-width:400px; border:1px solid var(--accent); box-shadow:0 0 30px rgba(56, 189, 248, 0.2);">
                <h3 id="cabinChoiceTimeLabel" style="color:var(--accent); margin-top:0; border-bottom:1px solid var(--border-line); padding-bottom:10px; font-size:16px; text-transform:uppercase;"><i class="material-icons-round" style="vertical-align:middle;">meeting_room</i> Assegna Cabina Libera</h3>
                <div id="cabinChoiceList" style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px; max-height:300px; overflow-y:auto; padding-right:5px;"></div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-save btn-outline" style="flex:1;" onclick="document.getElementById('cabinChoiceModal').style.display='none'">ANNULLA</button>
                    <button class="btn-save" style="flex:1;" onclick="sysConfirmCabinAndSearch()">CONFERMA</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', cabinChoiceHtml);
    }
}

// ==================== CALENDARIO A RANGE DESKTOP ====================
function sysInjectRadarCalendar() {
    if(document.getElementById('radarCalendarModal')) return;
    const modal = document.createElement('div');
    modal.id = "radarCalendarModal";
    modal.className = "modal-overlay";
    modal.style.cssText = "display:none; z-index:10005;";
    modal.onclick = function(e) { if(e.target === this) sysCloseRadarCalendar(); };
    modal.innerHTML = `
        <div class="modal-box" style="padding:0; overflow:hidden; max-width:350px; border:1px solid var(--border-line); box-shadow:0 15px 50px rgba(0,0,0,0.8);">
            <div style="background:var(--bg-panel); border-bottom:1px solid var(--border-line); padding:20px 15px; display:flex; justify-content:space-between; align-items:center;">
                <button onclick="sysChangeRadarMonth(-1)" style="background:transparent; border:none; color:var(--text-main); cursor:pointer; padding:5px;"><i class="material-icons-round" style="font-size:24px;">chevron_left</i></button>
                <div id="rCalMonthYear" style="font-weight:900; color:var(--accent); font-size:15px; text-transform:uppercase;"></div>
                <button onclick="sysChangeRadarMonth(1)" style="background:transparent; border:none; color:var(--text-main); cursor:pointer; padding:5px;"><i class="material-icons-round" style="font-size:24px;">chevron_right</i></button>
            </div>
            <div style="padding:15px; background:var(--bg-body);">
                <div style="text-align:center; font-size:11px; color:var(--text-muted); margin-bottom:15px; font-weight:bold;">1° Tocco: INIZIO | 2° Tocco: FINE</div>
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:5px; text-align:center; font-size:10px; font-weight:bold; color:var(--text-muted); margin-bottom:10px; text-transform:uppercase;">
                    <div>Lun</div><div>Mar</div><div>Mer</div><div>Gio</div><div>Ven</div><div>Sab</div><div>Dom</div>
                </div>
                <div id="rCalDaysGrid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:5px;"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.sysOpenRadarCalendar = function() {
    window.rClickCount = 0;
    const mId = document.getElementById("mDate") || document.getElementById("mainDate");
    
    if(mId && mId.value) {
        window.rStartDate = mId.value;
        window.rEndDate = mId.value;
        window.rClickCount = 2;
        const d = new Date(mId.value);
        window.rCalMonth = d.getMonth();
        window.rCalYear = d.getFullYear();
    } else {
        const n = new Date();
        window.rStartDate = n.toISOString().split('T')[0];
        window.rEndDate = window.rStartDate;
        window.rClickCount = 2;
        window.rCalMonth = n.getMonth();
        window.rCalYear = n.getFullYear();
    }
    
    sysUpdateRadarDateDisplay();
    document.getElementById('radarCalendarModal').style.display = 'flex';
    sysRenderRadarCalendar();
};

window.sysCloseRadarCalendar = function() {
    document.getElementById('radarCalendarModal').style.display = 'none';
};

window.sysChangeRadarMonth = function(delta) {
    window.rCalMonth += delta;
    if(window.rCalMonth > 11) { window.rCalMonth = 0; window.rCalYear++; }
    else if(window.rCalMonth < 0) { window.rCalMonth = 11; window.rCalYear--; }
    sysRenderRadarCalendar();
};

window.sysRenderRadarCalendar = function() {
    const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    document.getElementById("rCalMonthYear").innerText = monthNames[window.rCalMonth] + " " + window.rCalYear;
    
    let firstDay = new Date(window.rCalYear, window.rCalMonth, 1).getDay();
    if(firstDay === 0) firstDay = 7; 
    const daysInMonth = new Date(window.rCalYear, window.rCalMonth + 1, 0).getDate();
    
    const grid = document.getElementById("rCalDaysGrid");
    grid.innerHTML = "";
    
    const todayStr = new Date().toISOString().split('T')[0];

    for(let i=1; i<firstDay; i++) { grid.innerHTML += `<div></div>`; }
    
    for(let i=1; i<=daysInMonth; i++) {
        const dateStr = window.rCalYear + "-" + String(window.rCalMonth+1).padStart(2,'0') + "-" + String(i).padStart(2,'0');
        
        const isStart = (dateStr === window.rStartDate);
        const isEnd = (dateStr === window.rEndDate);
        const inRange = (window.rStartDate && window.rEndDate && dateStr > window.rStartDate && dateStr < window.rEndDate);
        
        const baseStyle = "padding:12px 5px; border-radius:8px; text-align:center; font-weight:bold; cursor:pointer; font-size:13px; transition:0.2s;";
        let currentStyle = "color:var(--text-main); background:var(--bg-panel); border:1px solid var(--border-line);";
        
        if(isStart || isEnd) {
            currentStyle = "color:#fff; background:var(--accent); border:none; box-shadow:0 4px 10px rgba(56,189,248,0.5);";
        } else if(inRange) {
            currentStyle = "color:var(--text-main); background:rgba(56,189,248,0.2); border:1px dashed rgba(56,189,248,0.5);";
        } else if(dateStr === todayStr) {
            currentStyle = "color:var(--accent); background:rgba(56,189,248,0.05); border:1px solid var(--accent);";
        }
        
        grid.innerHTML += `<div style="${baseStyle} ${currentStyle}" onclick="sysSelectRadarDate('${dateStr}')">${i}</div>`;
    }
};

window.sysSelectRadarDate = function(dStr) {
    if(window.rClickCount === 0 || window.rClickCount === 2) {
        window.rStartDate = dStr;
        window.rEndDate = null;
        window.rClickCount = 1;
    } else if(window.rClickCount === 1) {
        if(dStr < window.rStartDate) {
            window.rEndDate = window.rStartDate;
            window.rStartDate = dStr;
        } else {
            window.rEndDate = dStr;
        }
        window.rClickCount = 2;
        sysUpdateRadarDateDisplay();
        setTimeout(sysCloseRadarCalendar, 300);
    }
    sysRenderRadarCalendar();
};

window.sysUpdateRadarDateDisplay = function() {
    const disp = document.getElementById("radarDateDisplay");
    if(!disp) return;
    if(window.rStartDate && window.rEndDate) {
        if(window.rStartDate === window.rEndDate) {
            disp.innerText = window.rStartDate.split('-').reverse().join('/');
        } else {
            disp.innerText = window.rStartDate.split('-').reverse().join('/') + " ➔ " + window.rEndDate.split('-').reverse().join('/');
        }
    } else if (window.rStartDate) {
        disp.innerText = window.rStartDate.split('-').reverse().join('/') + " ➔ ...";
    }
};

// ==================== AUTOCOMPLETE SERVIZIO DESKTOP ====================
window.sysHandleServSearch = function(val) {
    const sug = document.getElementById("sServSuggestions");
    if(!val || String(val).length < 2) { sug.style.display = 'none'; return; }
    
    const rawList = (window.db && window.db.servizi) ? window.db.servizi : [];
    const servList = Array.isArray(rawList) ? rawList : Object.values(rawList);
    const query = val.toLowerCase().trim();
    
    const matches = servList.filter(s => s && s.nome && s.nome.toLowerCase().includes(query));
    
    if(matches.length > 0) {
        sug.innerHTML = matches.map(s => { 
            const safeName = s.nome.replace(/'/g, "&apos;");
            const dur = parseInt(s.durata) || 30;
            return `
                <div style="padding:15px; border-bottom:1px solid var(--border-line); display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="sysSelectRadarServ('${safeName}', ${dur})">
                    <b style="color:var(--text-main); font-size:12px; text-transform:uppercase;">${s.nome}</b>
                    <span style="font-size:11px; font-weight:bold; color:var(--accent); background:rgba(56, 189, 248, 0.1); padding:4px 8px; border-radius:6px;">${dur} MIN</span>
                </div>`;
        }).join('');
        sug.style.display = 'block';
    } else {
        sug.style.display = 'none';
    }
};

window.sysSelectRadarServ = function(nome, durata) {
    document.getElementById("sServSearch").value = nome;
    document.getElementById("sDur").value = durata;
    document.getElementById("sServSuggestions").style.display = 'none';
};

// ==================== MOTORE DI RICERCA DESKTOP ====================
window.sysOpenSearchEngine = function(isMove) {
    window.searchContextAppId = isMove ? document.getElementById("mId").value : null;
    if(isMove && typeof window.sysCloseSidebar === 'function') window.sysCloseSidebar(null, true);
    
    let baseDate = new Date().toISOString().split('T')[0];
    const mainDateEl = document.getElementById("mainDate");
    const dEl = document.getElementById("aDate");
    if (dEl && dEl.value) baseDate = dEl.value;
    else if (mainDateEl && mainDateEl.value) baseDate = mainDateEl.value;

    window.rStartDate = baseDate; 
    window.rEndDate = baseDate; 
    window.rClickCount = 2;
    sysUpdateRadarDateDisplay();

    const selOp = document.getElementById("sOpSearch");
    if(selOp && window.allUsersData) {
        selOp.innerHTML = '<option value="">Qualsiasi Operatore Disponibile</option>';
        Object.values(window.allUsersData).forEach(u => {
            const isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true || u.deleted === true);
            if(String(u.structureId) === String(window.twStructId) && !isGhost) {
                selOp.innerHTML += `<option value="${u.nick}">${u.name} ${u.surname||''} (${u.nick})</option>`;
            }
        });
    }

    const modal = document.getElementById('searchEngineModal');
    if(modal) {
        modal.style.display = 'flex';
        document.getElementById('searchResults').innerHTML = '';
    }
};

window.sysExecuteSearch = function() {
    if(!window.rStartDate || !window.rEndDate) { if(typeof window.showToast==='function') window.showToast("Seleziona il periodo di ricerca."); return; }
    
    const fascia = document.getElementById("sFascia").value;
    const dur = parseInt(document.getElementById("sDur").value) || 30;
    const reqGender = document.getElementById("sGender").value;
    const reqOp = document.getElementById("sOpSearch").value;
    
    let startMin = 0; let endMin = 0;
    if(fascia === 'mattina') { startMin = 360; endMin = 720; }
    else if(fascia === 'pomeriggio') { startMin = 720; endMin = 1020; }
    else if(fascia === 'sera') { startMin = 1020; endMin = 1440; } 
    
    const resBox = document.getElementById('searchResults');
    if(!resBox) return;
    
    resBox.innerHTML = "<div style='text-align:center; padding:40px;'><i class='material-icons-round' style='animation: spin 1s linear infinite; font-size:40px; color:var(--accent); margin-bottom:10px;'>autorenew</i><br><b style='color:var(--text-muted);'>Scansione Algoritmica Multiday...</b></div>";

    let activeCabins = [];
    if (window.db && window.db.settings && window.db.settings.cabine_config) {
        let config = Array.isArray(window.db.settings.cabine_config) ? window.db.settings.cabine_config : Object.values(window.db.settings.cabine_config);
        config.forEach((cab, idx) => {
            if (cab.attiva !== false && cab.attiva !== "false") activeCabins.push({ id: idx + 1, data: cab });
        });
    } else {
        const num = (window.db && window.db.settings && window.db.settings.agenda && window.db.settings.agenda.num_cabine) ? parseInt(window.db.settings.agenda.num_cabine) : 5;
        for(let i=1; i<=num; i++) activeCabins.push({ id: i, data: { attiva: true } });
    }

    let hasPausa = false; let pStart = 0; let pEnd = 0;
    if (window.db && window.db.settings && window.db.settings.agenda && window.db.settings.agenda.pausa_active) {
        hasPausa = true;
        pStart = window.tToM(window.db.settings.agenda.pausa_start || "13:00");
        pEnd = window.tToM(window.db.settings.agenda.pausa_end || "15:00");
    }
    
    let availableOps = window.allUsersData ? Object.values(window.allUsersData).filter(u => {
        const isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true || u.deleted === true);
        if(String(u.structureId) !== String(window.twStructId) || isGhost) return false;
        if(reqOp && u.nick !== reqOp) return false;
        if(reqGender && u.gender !== reqGender && u.sesso !== reqGender) return false;
        return true;
    }) : [];

    let resultsByDate = {};
    let currDate = new Date(window.rStartDate);
    let endDateObj = new Date(window.rEndDate);
    
    while(currDate <= endDateObj) {
        const currDStr = currDate.toISOString().split('T')[0];
        let dayApps = (window.db && window.db.app && window.db.app[currDStr]) ? window.normalizeFbArray(window.db.app[currDStr]) : [];
        let dayBlocchi = (window.db && window.db.blocchi && window.db.blocchi[currDStr]) ? Object.values(window.db.blocchi[currDStr]).filter(b => b !== null) : [];
        
        activeCabins.forEach(cabObj => {
            let c = cabObj.id;
            let cStart = window.tToM(cabObj.data.orari ? cabObj.data.orari.start : "09:00");
            let cEnd = window.tToM(cabObj.data.orari ? cabObj.data.orari.end : "20:00");

            for(let t = startMin; t <= (endMin - dur); t += 10) {
                if (t < cStart || (t + dur) > cEnd) continue; 
                if (hasPausa && (t < pEnd && (t + dur) > pStart)) continue;
                
                let collision = dayApps.some(a => {
                    if(parseInt(a.cab) !== c) return false;
                    if(window.searchContextAppId && String(a.id) === String(window.searchContextAppId)) return false;
                    const aStart = window.tToM(a.ora);
                    const aEnd = aStart + (parseInt(a.dur) || 30) + 10;
                    return (t < aEnd && (t + dur + 10) > aStart);
                }) || dayBlocchi.some(b => {
                    if(parseInt(b.cab) !== c) return false;
                    const bStart = window.tToM(b.ora);
                    const bEnd = bStart + (parseInt(b.dur) || 60);
                    return (t < bEnd && (t + dur + 10) > bStart);
                });
                
                if(!collision) {
                    let validOpsForSlot = availableOps.filter(op => {
                        return !dayApps.some(a => {
                            if(window.searchContextAppId && String(a.id) === String(window.searchContextAppId)) return false;
                            if((a.op || '').toLowerCase() !== op.nick.toLowerCase()) return false;
                            const aStart = window.tToM(a.ora);
                            const aEnd = aStart + (parseInt(a.dur) || 30) + 10;
                            return (t < aEnd && (t + dur + 10) > aStart);
                        });
                    });

                    if(validOpsForSlot.length > 0) {
                        if(!resultsByDate[currDStr]) resultsByDate[currDStr] = [];
                        
                        let existingTime = resultsByDate[currDStr].find(r => r.time === window.mToT(t));
                        if(existingTime) {
                            if(!existingTime.cabs.includes(c)) existingTime.cabs.push(c);
                        } else {
                            resultsByDate[currDStr].push({ time: window.mToT(t), cabs: [c], ops: validOpsForSlot });
                        }
                    }
                }
            }
        });
        currDate.setDate(currDate.getDate() + 1);
    }

    if(Object.keys(resultsByDate).length === 0) { 
        resBox.innerHTML = "<div style='text-align:center; color:var(--red); padding:40px;'><i class='material-icons-round' style='font-size:48px; opacity:0.5; margin-bottom:10px;'>event_busy</i><br><b style='font-size:16px;'>Nessuno slot disponibile.</b><br><span style='font-size:12px; color:var(--text-muted);'>Prova a cambiare fascia oraria o operatore.</span></div>"; 
        return; 
    }

    let h = "<div style='display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:15px;'>";
    
    Object.keys(resultsByDate).sort().forEach(dStr => {
        const dObj = new Date(dStr);
        const dForm = dObj.toLocaleDateString('it-IT', {weekday: 'long', day: '2-digit', month: 'long'}).toUpperCase();
        
        // Ordina gli orari
        resultsByDate[dStr].sort((a,b) => window.tToM(a.time) - window.tToM(b.time));

        h += `<div style="background:var(--bg-panel); border:1px solid var(--border-line); border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                <div style="background:rgba(56, 189, 248, 0.1); border-bottom:1px solid var(--border-line); padding:10px 15px; font-weight:900; color:var(--accent); font-size:12px; display:flex; align-items:center; gap:8px;">
                    <i class="material-icons-round" style="font-size:16px;">event</i> ${dForm}
                </div>
                <div style="display:flex; flex-direction:column; max-height:300px; overflow-y:auto;">`;
        
        resultsByDate[dStr].forEach((r, idx) => {
            const cabStr = encodeURIComponent(JSON.stringify(r.cabs));
            const bBorder = (idx < resultsByDate[dStr].length - 1) ? 'border-bottom:1px dashed var(--border-line);' : '';
            h += `
                <div style="padding:15px; display:flex; justify-content:space-between; align-items:center; ${bBorder} transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="background:var(--bg-body); border:1px solid var(--border-line); color:var(--text-main); width:45px; height:45px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.2);">
                            ${r.time}
                        </div>
                        <div style="font-size:11px; color:var(--text-muted); font-weight:bold; text-transform:uppercase;">
                            <span style="color:var(--gold); display:block; margin-bottom:2px;"><i class="material-icons-round" style="font-size:12px; vertical-align:middle;">meeting_room</i> ${r.cabs.length} Cab. Libere</span>
                            <span style="color:var(--green);"><i class="material-icons-round" style="font-size:12px; vertical-align:middle;">check_circle</i> Slot Verificato</span>
                        </div>
                    </div>
                    <button class="btn-save" style="width:auto; margin:0; padding:8px 15px; font-size:11px;" onclick="sysAssignFoundSlot('${dStr}', '${r.time}', ${dur}, '${cabStr}')">SCEGLI</button>
                </div>`;
        });
        h += `</div></div>`;
    });
    h += "</div>";
    resBox.innerHTML = h;
};

window.sysAssignFoundSlot = function(date, time, dur, cabStr) {
    const groupData = JSON.parse(decodeURIComponent(cabStr));
    const listUI = document.getElementById('cabinChoiceList');
    if(!listUI) return;
    
    listUI.innerHTML = "";
    const lbl = document.getElementById('cabinChoiceTimeLabel');
    if(lbl) lbl.innerText = `Cabine libere alle ore ${time}`;
    
    listUI.innerHTML += `
        <label style="display:flex; align-items:center; gap:10px; background:rgba(56, 189, 248, 0.05); border:1px solid var(--accent); border-radius:8px; padding:12px 15px; cursor:pointer; transition:0.2s;">
            <input type="radio" name="radarCabRadio" value="indifferente" checked style="accent-color:var(--accent); width:16px; height:16px;">
            <div>
                <b style="color:var(--accent); font-size:13px; text-transform:uppercase;">Qualsiasi Libera</b>
            </div>
        </label>
    `;

    groupData.forEach(cab => {
        listUI.innerHTML += `
            <label style="display:flex; align-items:center; gap:10px; background:var(--bg-body); border:1px solid var(--border-line); border-radius:8px; padding:12px 15px; cursor:pointer; transition:0.2s;" onmouseover="this.style.borderColor='var(--text-main)'" onmouseout="this.style.borderColor='var(--border-line)'">
                <input type="radio" name="radarCabRadio" value="${cab}" style="accent-color:var(--accent); width:16px; height:16px;">
                <div>
                    <b style="color:var(--text-main); font-size:13px;">Cabina ${cab}</b>
                </div>
            </label>
        `;
    });
    
    window.tempAssignTime = time;
    window.tempAssignDate = date;
    window.tempAssignDur = dur;
    const cabModal = document.getElementById('cabinChoiceModal');
    if(cabModal) cabModal.style.display = 'flex';
};

window.sysConfirmCabinAndSearch = function() {
    const time = window.tempAssignTime;
    const date = window.tempAssignDate;
    const dur = window.tempAssignDur;
    
    let selectedCab = null;
    let radios = document.getElementsByName("radarCabRadio");
    for(let i=0; i<radios.length; i++) { if(radios[i].checked) { selectedCab = radios[i].value; break; } }
    
    if(selectedCab === "indifferente") {
        const firstAvail = document.querySelector('input[name="radarCabRadio"]:not([value="indifferente"])');
        if(firstAvail) selectedCab = firstAvail.value;
    }

    if(!selectedCab) { if(typeof window.showToast==='function') window.showToast("Seleziona una cabina."); return; }

    const cabModal = document.getElementById('cabinChoiceModal');
    if(cabModal) cabModal.style.display = 'none';
    const searchModal = document.getElementById('searchEngineModal');
    if(searchModal) searchModal.style.display = 'none';

    const servName = document.getElementById("sServSearch").value || "";

    setTimeout(() => {
        if(window.searchContextAppId) {
            const appId = window.searchContextAppId;
            const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${date}`);
            appRoot.once('value').then(snap => {
                let apps = typeof window.normalizeFbArray === 'function' ? window.normalizeFbArray(snap.val()) : [];
                const idx = apps.findIndex(x => x.id === appId);
                if(idx > -1) {
                    apps[idx].ora = time;
                    apps[idx].cab = parseInt(selectedCab);
                    appRoot.set(apps).then(() => {
                        if(typeof window.showToast==='function') window.showToast("Spostamento Rapido Eseguito!");
                        if(typeof window.render === 'function') window.render();
                        window.searchContextAppId = null;
                    });
                }
            });
        } else {
            const mainDateEl = document.getElementById("mainDate");
            if(mainDateEl && mainDateEl.value !== date) {
                mainDateEl.value = date;
                if(typeof window.sysUpdateFakeDate === 'function') window.sysUpdateFakeDate();
                if(typeof window.render === 'function') window.render();
            }
            
            if(typeof window.sysOpenSlot === 'function') {
                window.sysOpenSlot(time, selectedCab);
                setTimeout(() => {
                    const dEl = document.getElementById("aDur");
                    if(dEl) dEl.value = dur;
                    
                    const reqOp = document.getElementById("sOpSearch") ? document.getElementById("sOpSearch").value : "";
                    if(reqOp && document.getElementById("aOp")) document.getElementById("aOp").value = reqOp;
                    
                    if(servName && document.getElementById("aServ")) {
                        document.getElementById("aServ").value = servName;
                        if(typeof window.sysRenderServiceBox === 'function') window.sysRenderServiceBox();
                    }
                }, 150);
            } else {
                const path = window.location.pathname.toLowerCase();
                const base = (path.includes('/funzioni')) ? '../' : './';
                if(typeof window.showToast==='function') window.showToast(`Posto trovato. Torna in Agenda per prenotare.`);
                setTimeout(() => { window.location.href = base + 'index.html'; }, 1000);
            }
        }
    }, 100);
};

window.tToM = function(t) { if(!t) return 0; const p = String(t).split(':'); return (parseInt(p[0])||0)*60 + (parseInt(p[1])||0); };
window.mToT = function(m) { return String(Math.floor(m/60)).padStart(2,'0') + ":" + String(m%60).padStart(2,'0'); };