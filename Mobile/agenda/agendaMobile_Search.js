/* agenda/agendaMobile_Search.js - Radar Booking Engine (Range Date, Fasce Orarie e Autocomplete) */

window.rCalMonth = new Date().getMonth();
window.rCalYear = new Date().getFullYear();
window.rStartDate = null;
window.rEndDate = null;
window.rClickCount = 0;

document.addEventListener('DOMContentLoaded', function(){ 
    m_injectSearchModal(); 
    m_injectRadarCalendar();
});

function m_injectSearchModal() {
    if(document.getElementById("searchEngineModal")) return;
    var modal = document.createElement('div');
    modal.id = "searchEngineModal";
    modal.style.cssText = "display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:10000; flex-direction:column; justify-content:flex-end;";
    
    modal.innerHTML = `
        <div style="background:var(--bg-panel); width:100%; height:92vh; border-radius:20px 20px 0 0; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 -10px 40px rgba(0,0,0,0.8);">
            
            <div style="padding:20px; border-bottom:1px solid var(--border-line); display:flex; justify-content:space-between; align-items:center; flex-shrink:0; background:rgba(0,0,0,0.2);">
                <h3 style="margin:0; font-size:18px; color:var(--accent); display:flex; align-items:center; gap:8px;"><i class="material-icons-round" style="font-size:24px;">radar</i> Trova Disponibilità</h3>
                <i class="material-icons-round" style="font-size:28px; color:var(--text-muted); cursor:pointer;" onclick="document.getElementById('searchEngineModal').style.display='none'">close</i>
            </div>
            
            <div id="searchScrollArea" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; background:var(--bg-body);">
                
                <div style="padding:20px; display:flex; flex-direction:column; gap:20px; flex-shrink:0;">
                    
                    <!-- CALENDARIO A RANGE -->
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:8px; display:block; text-transform:uppercase;">Periodo di Ricerca</label>
                        <div style="width:100%; height:55px; background:var(--bg-panel); border:1px solid var(--border-line); border-radius:12px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.2);" onclick="m_openRadarCalendar()">
                            <i class="material-icons-round" style="color:var(--accent); font-size:20px; margin-right:10px;">date_range</i>
                            <div id="radarDateDisplay" style="font-weight:900; font-size:15px; color:var(--text-main); pointer-events:none; letter-spacing:0.5px;">Seleziona Date</div>
                        </div>
                    </div>

                    <!-- AUTOCOMPLETE SERVIZIO -->
                    <div style="position:relative;">
                        <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:8px; display:block; text-transform:uppercase;">Trattamento Rapido</label>
                        <div style="display:flex; align-items:center; background:var(--bg-panel); border:1px solid var(--border-line); border-radius:12px; padding:0 15px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.1);">
                            <i class="material-icons-round" style="color:var(--text-muted); font-size:20px;">spa</i>
                            <input type="text" id="sServSearch" placeholder="Cerca servizio..." onkeyup="m_handleServSearch(this.value)" style="border:none; outline:none; background:transparent; color:var(--text-main); padding:18px 10px; width:100%; font-weight:bold; font-size:14px; font-family:inherit;">
                        </div>
                        <input type="hidden" id="sDur" value="30">
                        <div id="sServSuggestions" style="display:none; position:absolute; top:85px; left:0; width:100%; max-height:220px; overflow-y:auto; background:var(--bg-panel); border:1px solid var(--border-line); border-radius:12px; z-index:5000; box-shadow:0 15px 40px rgba(0,0,0,0.6);"></div>
                    </div>

                    <!-- FASCE ORARIE E FILTRI -->
                    <div style="display:flex; gap:15px;">
                        <div style="flex:1">
                            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:8px; display:block; text-transform:uppercase;">Fascia Oraria</label>
                            <select id="sFascia" style="width:100%; padding:15px; background:var(--bg-panel); border-radius:12px; border:1px solid var(--border-line); font-weight:bold; color:var(--text-main); outline:none; font-family:inherit;">
                                <option value="mattina">Mattina (06:00 - 12:00)</option>
                                <option value="pomeriggio">Pomeriggio (12:00 - 17:00)</option>
                                <option value="sera">Sera (17:00 - 00:00)</option>
                            </select>
                        </div>
                        <div style="flex:1">
                            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:8px; display:block; text-transform:uppercase;">Genere Op.</label>
                            <select id="sGender" style="width:100%; padding:15px; background:var(--bg-panel); border-radius:12px; border:1px solid var(--border-line); font-weight:bold; color:var(--text-main); outline:none; font-family:inherit;">
                                <option value="">Indifferente</option>
                                <option value="M">Maschile</option>
                                <option value="F">Femminile</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:8px; display:block; text-transform:uppercase;">Operatore Specifico</label>
                        <select id="sOpSearch" style="width:100%; padding:15px; background:var(--bg-panel); border-radius:12px; border:1px solid var(--border-line); font-weight:bold; color:var(--text-main); outline:none; font-family:inherit;"><option value="">Qualsiasi</option></select>
                    </div>

                    <button class="btn-save" onclick="m_executeSearch()" style="margin-top:15px; padding:18px; font-size:14px; box-shadow:0 6px 20px rgba(56, 189, 248, 0.3);"><i class="material-icons-round">manage_search</i> AVVIA SCANSIONE</button>
                </div>
                
                <div id="searchResults" style="flex:1; padding:20px; background:var(--bg-body); border-top:1px dashed var(--border-line);"></div>
                
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    var cModal = document.createElement('div');
    cModal.id = "cabinChoiceModal";
    cModal.style.cssText = "display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:10001; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px);";
    document.body.appendChild(cModal);
}

// ==================== CALENDARIO A RANGE DEDICATO (RADAR) ====================
function m_injectRadarCalendar() {
    if(document.getElementById('radarCalendarModal')) return;
    var modal = document.createElement('div');
    modal.id = "radarCalendarModal";
    modal.className = "modal-overlay";
    modal.style.cssText = "display:none; z-index:10005;";
    modal.onclick = function(e) { if(e.target === this) m_closeRadarCalendar(); };
    modal.innerHTML = `
        <div class="modal-box" style="padding:0; overflow:hidden; max-width:340px; border:1px solid var(--border-line); box-shadow:0 15px 50px rgba(0,0,0,0.8);">
            <div style="background:var(--bg-panel); border-bottom:1px solid var(--border-line); padding:20px 15px; display:flex; justify-content:space-between; align-items:center;">
                <button onclick="m_changeRadarMonth(-1)" style="background:transparent; border:none; color:var(--text-main); cursor:pointer; padding:5px;"><i class="material-icons-round" style="font-size:24px;">chevron_left</i></button>
                <div id="rCalMonthYear" style="font-weight:900; color:var(--accent); font-size:16px; text-transform:uppercase;"></div>
                <button onclick="m_changeRadarMonth(1)" style="background:transparent; border:none; color:var(--text-main); cursor:pointer; padding:5px;"><i class="material-icons-round" style="font-size:24px;">chevron_right</i></button>
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

function m_openRadarCalendar() {
    window.rClickCount = 0;
    
    var dEl = document.getElementById("fDate");
    if(dEl && dEl.value) {
        window.rStartDate = dEl.value;
        window.rEndDate = dEl.value;
        window.rClickCount = 2;
        var d = new Date(dEl.value);
        window.rCalMonth = d.getMonth();
        window.rCalYear = d.getFullYear();
    } else {
        var n = new Date();
        window.rStartDate = n.toISOString().split('T')[0];
        window.rEndDate = window.rStartDate;
        window.rClickCount = 2;
        window.rCalMonth = n.getMonth();
        window.rCalYear = n.getFullYear();
    }
    
    m_updateRadarDateDisplay();
    document.getElementById('radarCalendarModal').style.display = 'flex';
    m_renderRadarCalendar();
}

function m_closeRadarCalendar() {
    document.getElementById('radarCalendarModal').style.display = 'none';
}

function m_changeRadarMonth(delta) {
    window.rCalMonth += delta;
    if(window.rCalMonth > 11) { window.rCalMonth = 0; window.rCalYear++; }
    else if(window.rCalMonth < 0) { window.rCalMonth = 11; window.rCalYear--; }
    m_renderRadarCalendar();
}

function m_renderRadarCalendar() {
    var monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    document.getElementById("rCalMonthYear").innerText = monthNames[window.rCalMonth] + " " + window.rCalYear;
    
    var firstDay = new Date(window.rCalYear, window.rCalMonth, 1).getDay();
    if(firstDay === 0) firstDay = 7; 
    var daysInMonth = new Date(window.rCalYear, window.rCalMonth + 1, 0).getDate();
    
    var grid = document.getElementById("rCalDaysGrid");
    grid.innerHTML = "";
    
    var todayStr = new Date().toISOString().split('T')[0];

    for(var i=1; i<firstDay; i++) { grid.innerHTML += `<div></div>`; }
    
    for(var i=1; i<=daysInMonth; i++) {
        var dateStr = window.rCalYear + "-" + String(window.rCalMonth+1).padStart(2,'0') + "-" + String(i).padStart(2,'0');
        
        var isStart = (dateStr === window.rStartDate);
        var isEnd = (dateStr === window.rEndDate);
        var inRange = (window.rStartDate && window.rEndDate && dateStr > window.rStartDate && dateStr < window.rEndDate);
        
        var baseStyle = "padding:12px 5px; border-radius:10px; text-align:center; font-weight:bold; cursor:pointer; font-size:14px; transition:0.2s;";
        var currentStyle = "color:var(--text-main); background:var(--bg-panel); border:1px solid var(--border-line);";
        
        if(isStart || isEnd) {
            currentStyle = "color:#fff; background:var(--accent); border:none; box-shadow:0 4px 10px rgba(56,189,248,0.5);";
        } else if(inRange) {
            currentStyle = "color:var(--text-main); background:rgba(56,189,248,0.2); border:1px dashed rgba(56,189,248,0.5);";
        } else if(dateStr === todayStr) {
            currentStyle = "color:var(--accent); background:rgba(56,189,248,0.05); border:1px solid var(--accent);";
        }
        
        grid.innerHTML += `<div style="${baseStyle} ${currentStyle}" onclick="m_selectRadarDate('${dateStr}')">${i}</div>`;
    }
}

function m_selectRadarDate(dStr) {
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
        m_updateRadarDateDisplay();
        setTimeout(m_closeRadarCalendar, 300);
    }
    m_renderRadarCalendar();
}

function m_updateRadarDateDisplay() {
    var disp = document.getElementById("radarDateDisplay");
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
}

// ==================== AUTOCOMPLETE SERVIZIO ====================
function m_handleServSearch(val) {
    var sug = document.getElementById("sServSuggestions");
    if(!val || String(val).length < 2) { sug.style.display = 'none'; return; }
    
    var rawList = (window.db && window.db.servizi) ? window.db.servizi : [];
    var servList = Array.isArray(rawList) ? rawList : Object.values(rawList);
    var query = val.toLowerCase().trim();
    
    var matches = servList.filter(function(s){ return s && s.nome && s.nome.toLowerCase().includes(query); });
    
    if(matches.length > 0) {
        sug.innerHTML = matches.map(function(s){ 
            var safeName = s.nome.replace(/'/g, "&apos;");
            var dur = parseInt(s.durata) || 30;
            return `
                <div style="padding:15px; border-bottom:1px solid var(--border-line); display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="m_selectRadarServ('${safeName}', ${dur})">
                    <b style="color:var(--text-main); font-size:13px; text-transform:uppercase;">${s.nome}</b>
                    <span style="font-size:11px; font-weight:bold; color:var(--accent); background:rgba(56, 189, 248, 0.1); padding:4px 8px; border-radius:6px;">${dur} MIN</span>
                </div>`;
        }).join('');
        sug.style.display = 'block';
    } else {
        sug.style.display = 'none';
    }
}

function m_selectRadarServ(nome, durata) {
    document.getElementById("sServSearch").value = nome;
    document.getElementById("sDur").value = durata;
    document.getElementById("sServSuggestions").style.display = 'none';
}

// ==================== MOTORE DI RICERCA ====================
function m_openSearchEngine(isMove) {
    window.searchContextAppId = isMove ? document.getElementById('fId').value : null;
    if(isMove && typeof m_closeForm === 'function') m_closeForm(null, true);
    
    var dEl = document.getElementById("fDate");
    if(dEl && dEl.value) {
        window.rStartDate = dEl.value; window.rEndDate = dEl.value; window.rClickCount = 2;
    } else {
        var n = new Date().toISOString().split('T')[0];
        window.rStartDate = n; window.rEndDate = n; window.rClickCount = 2;
    }
    m_updateRadarDateDisplay();

    var selOp = document.getElementById("sOpSearch");
    if(selOp && typeof firebase !== 'undefined') {
        selOp.innerHTML = '<option value="">Qualsiasi</option>';
        firebase.database().ref('MASTER_ADMIN_DB/users').once('value').then(function(snap){
            var allUsers = snap.val() || {};
            var sId = localStorage.getItem("tw_structure_id");
            var validOps = Object.values(allUsers).filter(function(u){ return String(u.structureId) === String(sId);});
            validOps.forEach(function(op){
                var n = op.nick || op.name || "Sconosciuto";
                selOp.innerHTML += `<option value="${n}">${n}</option>`;
            });
        });
    }

    document.getElementById('searchEngineModal').style.display = 'flex';
    document.getElementById('searchResults').innerHTML = '';
}

function m_executeSearch() {
    if(!window.rStartDate || !window.rEndDate) { if(typeof showToast==='function') showToast("Seleziona il periodo di ricerca."); return; }
    
    var fascia = document.getElementById("sFascia").value;
    var dur = parseInt(document.getElementById("sDur").value) || 30;
    var reqGender = document.getElementById("sGender").value;
    var reqOp = document.getElementById("sOpSearch").value;
    
    var startMin = 0; var endMin = 0;
    if(fascia === 'mattina') { startMin = 360; endMin = 720; }
    else if(fascia === 'pomeriggio') { startMin = 720; endMin = 1020; }
    else if(fascia === 'sera') { startMin = 1020; endMin = 1430; } 
    
    var resDiv = document.getElementById('searchResults');
    resDiv.innerHTML = "<div style='text-align:center; padding:40px;'><i class='material-icons-round' style='animation: spin 1s linear infinite; font-size:40px; color:var(--accent); margin-bottom:10px;'>autorenew</i><br><b style='color:var(--text-muted);'>Scansione Algoritmica...</b></div>";

    var nCab = (window.db && window.db.settings && window.db.settings.cabine) ? parseInt(window.db.settings.cabine) : 5;
    
    var hasPausa = false; var pStart = 0; var pEnd = 0;
    if(window.db.settings && window.db.settings.agenda && window.db.settings.agenda.pausa_active) {
        hasPausa = true;
        pStart = tToM(window.db.settings.agenda.pausa_start || "13:00");
        pEnd = tToM(window.db.settings.agenda.pausa_end || "15:00");
    }
    
    firebase.database().ref('MASTER_ADMIN_DB/users').once('value').then(function(snap){
        var allUsers = snap.val() || {};
        var sId = localStorage.getItem("tw_structure_id");
        var validOps = Object.values(allUsers).filter(function(u){ return String(u.structureId) === String(sId);});

        var matchingOps = validOps.filter(function(u){
            var n = u.nick || u.name;
            if(reqOp && n !== reqOp) return false;
            if(reqGender) {
                var sesso = (u.sesso || u.gender || "").toUpperCase();
                if(sesso !== reqGender && sesso.charAt(0) !== reqGender) return false;
            }
            return true;
        });

        var resultsByDate = {};
        
        var currDate = new Date(window.rStartDate);
        var endDateObj = new Date(window.rEndDate);
        
        while(currDate <= endDateObj) {
            var currDStr = currDate.toISOString().split('T')[0];
            var dayApps = (window.db && window.db.app && window.db.app[currDStr]) ? normalizeFbArray(window.db.app[currDStr]) : [];
            var dayBlocchi = (window.db && window.db.blocchi && window.db.blocchi[currDStr]) ? Object.values(window.db.blocchi[currDStr]).filter(b=>b!==null) : [];
            
            for(var m = startMin; m <= endMin - dur; m += 10) {
                if(hasPausa && (m < pEnd && (m+dur) > pStart)) continue;
                
                var isAnyOpFree = matchingOps.some(function(op){
                    var opName = op.nick || op.name;
                    var isOpBusy = dayApps.some(function(a){
                        if(window.searchContextAppId && String(a.id) === String(window.searchContextAppId)) return false;
                        if(String(a.op).toLowerCase().trim() !== String(opName).toLowerCase().trim()) return false;
                        var as = tToM(a.ora); var ae = as + (parseInt(a.dur)||30) + 10;
                        return (m < ae && (m+dur+10) > as);
                    });
                    return !isOpBusy;
                });

                if(!isAnyOpFree) continue;

                var freeCabs = [];
                for(var c=1; c<=nCab; c++) {
                    var cBusy = dayApps.some(function(a){ 
                        if(window.searchContextAppId && String(a.id) === String(window.searchContextAppId)) return false;
                        var as = tToM(a.ora); var ae = as + (parseInt(a.dur)||30) + 10; 
                        return parseInt(a.cab) === c && m < ae && (m+dur+10) > as; 
                    });
                    var bBusy = dayBlocchi.some(function(b){
                        var bs = tToM(b.ora); var be = bs + (parseInt(b.dur)||60);
                        return parseInt(b.cab) === c && m < be && (m+dur+10) > bs;
                    });
                    
                    if(!cBusy && !bBusy) freeCabs.push(c);
                }
                if(freeCabs.length > 0) {
                    if(!resultsByDate[currDStr]) resultsByDate[currDStr] = [];
                    resultsByDate[currDStr].push({time: mToT(m), cabs: freeCabs});
                }
            }
            currDate.setDate(currDate.getDate() + 1);
        }

        if(Object.keys(resultsByDate).length === 0) { 
            resDiv.innerHTML = "<div style='text-align:center; color:var(--red); padding:40px;'><i class='material-icons-round' style='font-size:48px; opacity:0.5; margin-bottom:10px;'>event_busy</i><br><b style='font-size:15px;'>Nessuno slot disponibile.</b><br><span style='font-size:12px; color:var(--text-muted);'>Prova a cambiare fascia oraria o operatore.</span></div>"; 
            setTimeout(function() { resDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
            return; 
        }
        
        var h = "<div style='display:flex; flex-direction:column; gap:20px; padding-bottom:30px;'>";
        
        Object.keys(resultsByDate).sort().forEach(function(dStr){
            var dObj = new Date(dStr);
            var dForm = dObj.toLocaleDateString('it-IT', {weekday: 'long', day: '2-digit', month: 'long'}).toUpperCase();
            
            h += `<div style="background:var(--bg-panel); border:1px solid var(--border-line); border-radius:16px; overflow:hidden; box-shadow:0 5px 15px rgba(0,0,0,0.2);">
                    <div style="background:rgba(56, 189, 248, 0.1); border-bottom:1px solid var(--border-line); padding:12px 15px; font-weight:900; color:var(--accent); font-size:13px; display:flex; align-items:center; gap:8px;">
                        <i class="material-icons-round" style="font-size:16px;">event</i> ${dForm}
                    </div>
                    <div style="display:flex; flex-direction:column;">`;
            
            resultsByDate[dStr].forEach(function(r, idx){
                var cabStr = encodeURIComponent(JSON.stringify(r.cabs));
                var bBorder = (idx < resultsByDate[dStr].length - 1) ? 'border-bottom:1px dashed var(--border-line);' : '';
                h += `
                    <div style="padding:15px; display:flex; justify-content:space-between; align-items:center; ${bBorder}">
                        <div style="display:flex; align-items:center; gap:15px;">
                            <div style="background:var(--bg-body); border:1px solid var(--border-line); color:var(--text-main); width:50px; height:50px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.2);">
                                ${r.time}
                            </div>
                            <div style="font-size:11px; color:var(--text-muted); font-weight:bold; text-transform:uppercase;">
                                <span style="color:var(--gold); display:block; margin-bottom:2px;"><i class="material-icons-round" style="font-size:12px; vertical-align:middle;">meeting_room</i> ${r.cabs.length} Cab. Libere</span>
                                <span><i class="material-icons-round" style="font-size:12px; vertical-align:middle;">check_circle</i> Slot Verificato</span>
                            </div>
                        </div>
                        <button class="btn-save" style="width:auto; margin:0; padding:10px 18px; font-size:12px; box-shadow:0 4px 10px rgba(56, 189, 248, 0.2);" onclick="m_showCabinChoice('${dStr}', '${r.time}', ${dur}, '${cabStr}')">SCEGLI</button>
                    </div>`;
            });
            h += `</div></div>`;
        });
        h += "</div>";
        resDiv.innerHTML = h;

        setTimeout(function() { resDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);

    }).catch(function(e){
        resDiv.innerHTML = "<div style='text-align:center; color:var(--red); padding:20px;'>Errore nel recupero operatori.</div>";
    });
}

function m_showCabinChoice(date, time, dur, cabStr) {
    var cabins = JSON.parse(decodeURIComponent(cabStr));
    var cModal = document.getElementById('cabinChoiceModal');
    var h = `
        <div class="modal-box" style="background:var(--bg-panel); padding:25px; border-radius:20px; width:90%; max-width:350px; text-align:center; box-shadow:0 15px 50px rgba(0,0,0,0.8); border:1px solid var(--accent);">
            <h3 style="margin-top:0; color:var(--accent); font-size:18px; display:flex; align-items:center; justify-content:center; gap:8px;"><i class="material-icons-round">sensor_door</i> Assegna Cabina</h3>
            <p style="font-size:13px; color:var(--text-main); margin-bottom:20px; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">Appuntam. alle <b>${time}</b></p>
            <div style="display:flex; flex-direction:column; gap:10px; text-align:left; margin-bottom:25px; max-height:220px; overflow-y:auto;">
                <label style="display:flex; align-items:center; gap:10px; padding:15px; border:1px solid var(--accent); background:rgba(56, 189, 248, 0.05); border-radius:12px; cursor:pointer; transition:0.2s;">
                    <input type="radio" name="cabChoice" value="indifferente" checked style="width:auto; margin:0; accent-color:var(--accent);"> <b style="color:var(--accent); font-size:14px;">Qualsiasi Libera</b>
                </label>
    `;
    cabins.forEach(function(c){
        h += `<label style="display:flex; align-items:center; gap:10px; padding:15px; border:1px solid var(--border-line); background:var(--bg-body); border-radius:12px; cursor:pointer; transition:0.2s;">
                <input type="radio" name="cabChoice" value="${c}" style="width:auto; margin:0; accent-color:var(--accent);"> <b style="color:var(--text-main); font-size:14px;">Cabina ${c}</b>
              </label>`;
    });
    h += `  </div>
            <div style="display:flex; gap:12px;">
                <button class="btn-save btn-outline" style="flex:1; margin:0; padding:15px;" onclick="document.getElementById('cabinChoiceModal').style.display='none'">ANNULLA</button>
                <button class="btn-save" style="flex:1; margin:0; padding:15px;" onclick="m_confirmCabinAndSearch('${date}', '${time}', ${dur}, '${cabStr}')">CONFERMA</button>
            </div>
        </div>`;
    cModal.innerHTML = h;
    cModal.style.display = 'flex';
}

function m_confirmCabinAndSearch(date, time, dur, cabStr) {
    var cabins = JSON.parse(decodeURIComponent(cabStr));
    var radios = document.getElementsByName('cabChoice');
    var selectedCab = "indifferente";
    for(var i=0; i<radios.length; i++) { if(radios[i].checked) { selectedCab = radios[i].value; break; } }
    if(selectedCab === "indifferente") selectedCab = cabins[0];

    document.getElementById('cabinChoiceModal').style.display = 'none';
    document.getElementById('searchEngineModal').style.display = 'none';

    var servName = document.getElementById("sServSearch").value || "";

    setTimeout(function(){
        if(window.searchContextAppId) {
            var fDate = document.getElementById("fDate");
            var fOra = document.getElementById("fOra");
            var fCab = document.getElementById("fCab");
            
            if(fDate) fDate.value = date;
            if(fOra) fOra.value = time;
            if(fCab) fCab.value = selectedCab;
            
            document.getElementById("appFormSheet").classList.add("active");
            
            if(typeof window.m_refreshOperators === 'function') window.m_refreshOperators();
            if(typeof showToast === 'function') showToast("Spostato! Ora clicca SALVA IN AGENDA.");
            
            window.searchContextAppId = null;
        } else {
            var p = document.getElementById("mainDate");
            if(p) { p.value = date; if(typeof m_renderAll === 'function') m_renderAll(); }
            if(typeof m_openForm === 'function') m_openForm(null, '', selectedCab, time);
            setTimeout(function(){
                var dEl = document.getElementById("fDur");
                if(dEl) dEl.value = dur;
                
                var reqOp = document.getElementById("sOpSearch") ? document.getElementById("sOpSearch").value : "";
                if(reqOp && document.getElementById("fOp")) document.getElementById("fOp").value = reqOp;
                
                if(servName && document.getElementById("fServ")) {
                    document.getElementById("fServ").value = servName;
                    if(typeof m_renderServiceBox === 'function') m_renderServiceBox();
                }
            }, 100);
        }
    }, 100);
}

function tToM(t) { if(!t) return 0; var p = String(t).split(':'); return (parseInt(p[0])||0)*60 + (parseInt(p[1])||0); }
function mToT(m) { return String(Math.floor(m/60)).padStart(2,'0') + ":" + String(m%60).padStart(2,'0'); }