/* Funzioni/impostazioni/turni.js - Motore Master Roster (Inline Editing Compatto) */

window.turniModule = (function() {
    let currentWeekOffset = 0;
    let weekStartStr = "";
    let weekEndStr = "";
    let allTurniData = {}; 
    let activeOperators = []; 
    const giorniNomi = { 1:'Lunedì', 2:'Martedì', 3:'Mercoledì', 4:'Giovedì', 5:'Venerdì', 6:'Sabato', 7:'Domenica' };

    function init() {
        calcWeek(0);
        setTimeout(() => {
            loadOperators();
            fetchData();
        }, 300);
    }

    function calcWeek(offset) {
        try {
            currentWeekOffset += offset;
            const now = new Date();
            const day = now.getDay() || 7; 
            now.setDate(now.getDate() - day + 1 + (currentWeekOffset * 7));
            const start = new Date(now);
            const end = new Date(now);
            end.setDate(end.getDate() + 6);
            
            weekStartStr = start.toISOString().split('T')[0];
            weekEndStr = end.toISOString().split('T')[0];
            
            const fmtStart = start.toLocaleDateString('it-IT', { day:'2-digit', month:'short' });
            const fmtEnd = end.toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' });
            
            const lbl = document.getElementById('adminWeekLabel');
            if(lbl) lbl.innerText = `${fmtStart} - ${fmtEnd}`;
        } catch(e) {
            console.error("Errore nel calcolo della settimana:", e);
        }
    }

    function changeWeek(offset) {
        calcWeek(offset);
        renderMasterGrid();
    }

    function loadOperators() {
        firebase.database().ref(`MASTER_ADMIN_DB/users`).once('value').then(snap => {
            const users = snap.val() || {};
            activeOperators = [];
            
            Object.values(users).forEach(u => {
                const isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true || u.deleted === true);
                let isMatch = false;
                if(u.structureId && String(u.structureId) === String(window.twStructId)) isMatch = true;
                if(!u.structureId) isMatch = true; 
                
                if (!isGhost && isMatch) {
                    // Creiamo una chiave sicura per gli ID HTML rimuovendo spazi/caratteri strani
                    const safeNick = (u.nick || '').replace(/[^a-zA-Z0-9]/g, '_');
                    activeOperators.push({ nick: u.nick, safeNick: safeNick, name: `${u.name || ''} ${u.surname || ''}`.trim() });
                }
            });
            renderMasterGrid();
        }).catch(e => {
            document.getElementById('turniMasterGrid').innerHTML = `<div style="grid-column:1/-1; padding:40px; text-align:center; color:var(--red);">Errore connessione DB Operatori.</div>`;
        });
    }

    function fetchData() {
        if(!window.twStructId) return;
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/turni`).on('value', snap => {
            allTurniData = snap.val() || {};
            renderMasterGrid();
        });
    }

    function renderMasterGrid() {
        const grid = document.getElementById('turniMasterGrid');
        if(!grid) return;

        if(activeOperators.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; padding:40px; text-align:center; color:var(--text-muted);">Nessun operatore attivo trovato.</div>`;
            return;
        }

        let h = '';
        
        // RIGA INTESTAZIONI
        h += `<div class="roster-op-cell" style="background:transparent; border:none; box-shadow:none;"></div>`;
        
        const dStr = new Date(weekStartStr);
        for(let i=1; i<=7; i++) {
            const dateObj = new Date(dStr);
            dateObj.setDate(dStr.getDate() + (i - 1));
            const dayNum = dateObj.getDate();
            const monthStr = dateObj.toLocaleDateString('it-IT', {month: 'short'});
            h += `<div class="roster-header"><span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">${giorniNomi[i]}</span><span style="font-size:18px; color:var(--accent);">${dayNum} ${monthStr}</span></div>`;
        }

        // RIGHE OPERATORI CON MODULI INLINE
        activeOperators.forEach(op => {
            h += `<div class="roster-op-cell"><i class="material-icons-round" style="margin-right:8px; font-size:18px;">person</i> ${op.name || 'Sconosciuto'}</div>`;
            
            for(let i=1; i<=7; i++) {
                let d = { active: false, tipo: 'continuato', m_in: "09:00", m_out: "18:00", p_in: "", p_out: "" };
                if(allTurniData[weekStartStr] && allTurniData[weekStartStr][op.nick] && allTurniData[weekStartStr][op.nick][i]) {
                    d = allTurniData[weekStartStr][op.nick][i];
                }
                
                const sNick = op.safeNick;
                const checked = d.active ? 'checked' : '';
                const cellBgClass = d.active ? 'on' : 'off';
                const dispTimes = d.active ? 'flex' : 'none';
                const dispRiposo = d.active ? 'none' : 'block';
                const isSpezzato = d.tipo === 'spezzato';
                const dispPom = isSpezzato ? 'flex' : 'none';

                // Costruzione form inline per la singola cella
                h += `
                <div class="roster-cell ${cellBgClass}" id="cell_${sNick}_${i}">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:6px; border-bottom:1px dashed var(--border-line); padding-bottom:4px;">
                        <span style="font-size:10px; font-weight:bold; color:var(--text-muted); text-transform:uppercase;">In Turno</span>
                        <label class="switch" style="transform:scale(0.7); transform-origin:right; margin:0;"><input type="checkbox" id="act_${sNick}_${i}" ${checked} onchange="window.turniModule.toggleCell('${sNick}', ${i})"><span class="slider"></span></label>
                    </div>
                    
                    <div id="wrap_${sNick}_${i}" style="display:${dispTimes}; flex-direction:column; gap:5px; width:100%;">
                        <select id="tipo_${sNick}_${i}" class="form-input" style="height:26px; font-size:10px; padding:0 4px; background:rgba(0,0,0,0.2); border-color:transparent; cursor:pointer;" onchange="window.turniModule.toggleShift('${sNick}', ${i})">
                            <option value="continuato" ${d.tipo==='continuato'?'selected':''}>Turno Unico</option>
                            <option value="spezzato" ${d.tipo==='spezzato'?'selected':''}>Spezzato</option>
                        </select>
                        <div style="display:flex; gap:4px; width:100%;">
                            <input type="time" id="min_${sNick}_${i}" value="${d.m_in}" class="form-input" style="height:26px; padding:0; font-size:11px; text-align:center; flex:1;">
                            <input type="time" id="mout_${sNick}_${i}" value="${d.m_out}" class="form-input" style="height:26px; padding:0; font-size:11px; text-align:center; flex:1;">
                        </div>
                        <div id="pom_${sNick}_${i}" style="display:${dispPom}; gap:4px; width:100%;">
                            <input type="time" id="pin_${sNick}_${i}" value="${d.p_in}" class="form-input" style="height:26px; padding:0; font-size:11px; text-align:center; border-color:var(--accent); flex:1;">
                            <input type="time" id="pout_${sNick}_${i}" value="${d.p_out}" class="form-input" style="height:26px; padding:0; font-size:11px; text-align:center; border-color:var(--accent); flex:1;">
                        </div>
                    </div>
                    
                    <div id="off_${sNick}_${i}" style="display:${dispRiposo}; font-size:13px; font-weight:900; color:var(--red); padding-top:10px;">RIPOSO</div>
                </div>`;
            }
        });

        grid.innerHTML = h;
    }

    // =========================================================================
    // LOGICHE UI INLINE
    // =========================================================================

    function toggleCell(sNick, day) {
        const isAct = document.getElementById(`act_${sNick}_${day}`).checked;
        const cell = document.getElementById(`cell_${sNick}_${day}`);
        const wrap = document.getElementById(`wrap_${sNick}_${day}`);
        const offMsg = document.getElementById(`off_${sNick}_${day}`);

        if(isAct) {
            cell.classList.remove('off'); cell.classList.add('on');
            wrap.style.display = 'flex';
            offMsg.style.display = 'none';
        } else {
            cell.classList.remove('on'); cell.classList.add('off');
            wrap.style.display = 'none';
            offMsg.style.display = 'block';
        }
    }

    function toggleShift(sNick, day) {
        const tipo = document.getElementById(`tipo_${sNick}_${day}`).value;
        const pomBlock = document.getElementById(`pom_${sNick}_${day}`);
        if(pomBlock) pomBlock.style.display = tipo === 'spezzato' ? 'flex' : 'none';
    }

    // =========================================================================
    // SALVATAGGIO E AUTOMAZIONI MASSIVE (INLINE)
    // =========================================================================

    function saveTurniWeek() {
        if(activeOperators.length === 0) return;
        
        let weekPayload = {};
        
        activeOperators.forEach(op => {
            const sNick = op.safeNick;
            weekPayload[op.nick] = {};
            
            for(let i=1; i<=7; i++) {
                // Legge i dati inseriti nei campi HTML
                weekPayload[op.nick][i] = {
                    active: document.getElementById(`act_${sNick}_${i}`).checked,
                    tipo: document.getElementById(`tipo_${sNick}_${i}`).value,
                    m_in: document.getElementById(`min_${sNick}_${i}`).value,
                    m_out: document.getElementById(`mout_${sNick}_${i}`).value,
                    p_in: document.getElementById(`pin_${sNick}_${i}`).value,
                    p_out: document.getElementById(`pout_${sNick}_${i}`).value
                };
            }
        });

        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/turni/${weekStartStr}`).set(weekPayload).then(() => {
            if(window.showToast) window.showToast("Tutti i turni della settimana salvati con successo!");
        }).catch(err => {
            console.error("Errore salvataggio:", err);
            if(window.showToast) window.showToast("Errore durante il salvataggio.");
        });
    }

    function applyMondayToAll() {
        if(activeOperators.length === 0) return;
        if(!confirm("Vuoi copiare le impostazioni del Lunedì su tutti gli altri giorni della settimana per TUTTI gli operatori? (Modificherà solo la visuale, ricordati poi di premere Salva).")) return;

        activeOperators.forEach(op => {
            const sNick = op.safeNick;
            // Prendi i valori del Lunedì (giorno 1)
            const act = document.getElementById(`act_${sNick}_1`).checked;
            const tipo = document.getElementById(`tipo_${sNick}_1`).value;
            const min = document.getElementById(`min_${sNick}_1`).value;
            const mout = document.getElementById(`mout_${sNick}_1`).value;
            const pin = document.getElementById(`pin_${sNick}_1`).value;
            const pout = document.getElementById(`pout_${sNick}_1`).value;

            // Spalmali dal Martedì alla Domenica
            for(let i=2; i<=7; i++) {
                document.getElementById(`act_${sNick}_${i}`).checked = act;
                document.getElementById(`tipo_${sNick}_${i}`).value = tipo;
                document.getElementById(`min_${sNick}_${i}`).value = min;
                document.getElementById(`mout_${sNick}_${i}`).value = mout;
                document.getElementById(`pin_${sNick}_${i}`).value = pin;
                document.getElementById(`pout_${sNick}_${i}`).value = pout;

                // Aggiorna le classi grafiche delle singole celle
                toggleCell(sNick, i);
                toggleShift(sNick, i);
            }
        });
        
        if(window.showToast) window.showToast("Orari di Lunedì clonati! Premi Salva per confermare.");
    }

    function copyPreviousWeek() {
        if(activeOperators.length === 0) return;
        
        const prevDate = new Date(weekStartStr);
        prevDate.setDate(prevDate.getDate() - 7);
        const prevWeekKey = prevDate.toISOString().split('T')[0];

        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/turni/${prevWeekKey}`).once('value').then(snap => {
            const prevData = snap.val();
            
            if(!prevData || Object.keys(prevData).length === 0) {
                if(window.showToast) window.showToast("La settimana scorsa è vuota. Nessun dato da copiare.");
                else alert("La settimana precedente è vuota.");
                return;
            }

            if(!confirm("Vuoi incollare il planning della settimana scorsa a schermo? Sovrascriverà i dati correnti (Ricordati poi di premere Salva).")) return;

            activeOperators.forEach(op => {
                const sNick = op.safeNick;
                if(prevData[op.nick]) {
                    for(let i=1; i<=7; i++) {
                        const d = prevData[op.nick][i];
                        if(d) {
                            document.getElementById(`act_${sNick}_${i}`).checked = d.active;
                            document.getElementById(`tipo_${sNick}_${i}`).value = d.tipo;
                            document.getElementById(`min_${sNick}_${i}`).value = d.m_in;
                            document.getElementById(`mout_${sNick}_${i}`).value = d.m_out;
                            document.getElementById(`pin_${sNick}_${i}`).value = d.p_in || "";
                            document.getElementById(`pout_${sNick}_${i}`).value = d.p_out || "";
                            
                            toggleCell(sNick, i);
                            toggleShift(sNick, i);
                        }
                    }
                }
            });
            
            if(window.showToast) window.showToast("Copia eseguita! Premi Salva per confermare.");
        });
    }

    return {
        init, changeWeek,
        toggleCell, toggleShift, saveTurniWeek,
        applyMondayToAll, copyPreviousWeek
    };

})();

(function() {
    function boot() {
        if(window.turniModule && typeof window.turniModule.init === 'function') {
            window.turniModule.init();
        }
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(boot, 50);
    } else {
        document.addEventListener('DOMContentLoaded', boot);
    }
})();