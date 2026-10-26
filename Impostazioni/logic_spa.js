/* Impostazioni/logic_spa.js - Gestione Configurazione SPA (Orari, Moduli e Limiti) */

window.spaModule = (function() {
    let dbSettings = { piscina: {}, spa: {}, campi: { pax: true, cog: true, note: true }, regole: { preset: 'Piscina', confirm_del: true, soglia_att: 0, soglia_full: 0 } };
    let currentSrv = 'piscina';
    const giorni = { 1:'Lunedì', 2:'Martedì', 3:'Mercoledì', 4:'Giovedì', 5:'Venerdì', 6:'Sabato', 7:'Domenica' };

    function buildDefault() {
        let obj = {};
        for(let i=1; i<=7; i++) obj[i] = { active: true, pausa_active: false, m_in: "09:00", m_out: "20:00", p_in: "13:00", p_out: "15:00" };
        return obj;
    }

    function init() {
        if(!window.twStructId) return;

        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/settings/orari_moduli').once('value').then(snap => {
            const val = snap.val() || {};
            
            dbSettings.piscina = val.piscina || buildDefault();
            dbSettings.spa = val.spa || buildDefault();
            dbSettings.campi = val.campi || { pax: true, cog: true, note: true };
            dbSettings.regole = val.regole || { preset: 'Piscina', confirm_del: true, soglia_att: 0, soglia_full: 0 };
            
            const elPax = document.getElementById('f_pax');
            const elCog = document.getElementById('f_cog');
            const elNote = document.getElementById('f_note');
            const elPreset = document.getElementById('r_preset');
            const elConfirm = document.getElementById('r_confirm_del');
            const elSogliaAtt = document.getElementById('r_soglia_att');
            const elSogliaFull = document.getElementById('r_soglia_full');

            if(elPax) elPax.checked = dbSettings.campi.pax !== false;
            if(elCog) elCog.checked = dbSettings.campi.cog !== false;
            if(elNote) elNote.checked = dbSettings.campi.note !== false;
            
            if(elPreset) elPreset.value = dbSettings.regole.preset || 'Piscina';
            if(elConfirm) elConfirm.checked = dbSettings.regole.confirm_del !== false; 
            if(elSogliaAtt) elSogliaAtt.value = dbSettings.regole.soglia_att || 0;
            if(elSogliaFull) elSogliaFull.value = dbSettings.regole.soglia_full || 0;
            
            renderDays();
        });
    }

    function switchTab(srv) {
        currentSrv = srv;
        document.querySelectorAll('.spa-tab-btn').forEach(b => {
            b.classList.remove('active');
            b.style.background = 'transparent';
            b.style.color = 'var(--text-main)';
        });
        
        const activeBtn = document.getElementById(srv === 'piscina' ? 'spaTabPiscina' : 'spaTabSpa');
        if(activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.background = 'rgba(56, 189, 248, 0.1)';
            activeBtn.style.color = 'var(--accent)';
            activeBtn.style.borderColor = 'var(--accent)';
        }
        renderDays();
    }

    function toggleSyncWeek() {
        const isSync = document.getElementById('spa_sync_week')?.checked;
        for(let i=2; i<=7; i++) {
            const block = document.getElementById(`spaDayBlock_${i}`);
            if(block) block.style.display = isSync ? 'none' : 'flex';
        }
    }

    function togglePausa(dayIdx) {
        const isActive = document.getElementById(`spa_pausa_act_${dayIdx}`).checked;
        const pomBlock = document.getElementById(`spa_pomBlock_${dayIdx}`);
        if(pomBlock) pomBlock.style.display = isActive ? 'flex' : 'none';
    }

    function toggleDayActive(dayIdx) {
        const isAct = document.getElementById(`spa_act_${dayIdx}`).checked;
        const cont = document.getElementById(`spa_times_${dayIdx}`);
        if(cont) cont.style.opacity = isAct ? '1' : '0.3';
        if(cont) cont.style.pointerEvents = isAct ? 'auto' : 'none';
    }

    function renderDays() {
        const cont = document.getElementById("spaDaysContainer");
        if(!cont) return;
        let html = '';
        const data = dbSettings[currentSrv];

        for(let i=1; i<=7; i++) {
            const legacyData = data[i] || {};
            let isPausa = legacyData.pausa_active === true;
            if (legacyData.tipo === 'spezzato') isPausa = true; 
            
            const d = { 
                active: legacyData.active !== false, 
                pausa_active: isPausa, 
                m_in: legacyData.m_in || "09:00", 
                m_out: legacyData.m_out || "20:00", 
                p_in: legacyData.p_in || "13:00", 
                p_out: legacyData.p_out || "15:00" 
            };

            const checked = d.active ? 'checked' : '';
            const pausaChecked = d.pausa_active ? 'checked' : '';
            const pomDisplay = d.pausa_active ? 'flex' : 'none';

            html += `
            <div class="form-group-box" id="spaDayBlock_${i}" style="flex-direction:row; align-items:center; gap:15px; padding:12px 20px;">
                <div style="display:flex; align-items:center; gap:15px; width: 140px; flex-shrink:0;">
                    <span style="font-weight:900; font-size:13px; text-transform:uppercase; width:75px;">${giorni[i]}</span>
                    <label class="switch"><input type="checkbox" id="spa_act_${i}" ${checked} onchange="window.spaModule.toggleDayActive(${i})"><span class="slider"></span></label>
                </div>
                
                <div id="spa_times_${i}" style="display:flex; flex:1; gap:15px; align-items:center; opacity:${d.active?'1':'0.3'}; pointer-events:${d.active?'auto':'none'}; transition:0.3s;">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <span style="font-size:11px; font-weight:bold; color:var(--text-muted);">Apertura</span>
                        <input type="time" id="spa_m_in_${i}" value="${d.m_in}" class="form-input" style="width:90px; padding:6px;">
                        <span style="font-size:11px; font-weight:bold; color:var(--text-muted);">Chiusura</span>
                        <input type="time" id="spa_m_out_${i}" value="${d.m_out}" class="form-input" style="width:90px; padding:6px;">
                    </div>
                    
                    <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.03); padding:6px 12px; border-radius:8px; border:1px dashed var(--border-line);">
                        <label class="switch"><input type="checkbox" id="spa_pausa_act_${i}" ${pausaChecked} onchange="window.spaModule.togglePausa(${i})"><span class="slider"></span></label>
                        <span style="font-size:11px; font-weight:bold; color:var(--accent); text-transform:uppercase;">Spezzato</span>
                    </div>

                    <div id="spa_pomBlock_${i}" style="display:${pomDisplay}; gap:10px; align-items:center;">
                        <span style="font-size:11px; font-weight:bold; color:var(--accent);">Inizio Pausa</span>
                        <input type="time" id="spa_p_in_${i}" value="${d.p_in}" class="form-input" style="width:90px; padding:6px; border-color:var(--accent);">
                        <span style="font-size:11px; font-weight:bold; color:var(--accent);">Fine Pausa</span>
                        <input type="time" id="spa_p_out_${i}" value="${d.p_out}" class="form-input" style="width:90px; padding:6px; border-color:var(--accent);">
                    </div>
                </div>
            </div>`;
        }
        cont.innerHTML = html;
        toggleSyncWeek();
    }

    function save() {
        const isSync = document.getElementById('spa_sync_week')?.checked;
        
        let newSrvData = {};
        for(let i=1; i<=7; i++) {
            const readIdx = isSync ? 1 : i; 
            const isPausa = document.getElementById(`spa_pausa_act_${readIdx}`).checked;
            newSrvData[i] = {
                active: document.getElementById(`spa_act_${readIdx}`).checked,
                pausa_active: isPausa,
                tipo: isPausa ? 'spezzato' : 'continuato', 
                m_in: document.getElementById(`spa_m_in_${readIdx}`).value,
                m_out: document.getElementById(`spa_m_out_${readIdx}`).value,
                p_in: document.getElementById(`spa_p_in_${readIdx}`).value,
                p_out: document.getElementById(`spa_p_out_${readIdx}`).value
            };
        }
        
        dbSettings[currentSrv] = newSrvData;
        dbSettings.campi = {
            pax: document.getElementById('f_pax').checked,
            cog: document.getElementById('f_cog').checked,
            note: document.getElementById('f_note').checked
        };
        dbSettings.regole = {
            preset: document.getElementById('r_preset').value,
            confirm_del: document.getElementById('r_confirm_del').checked,
            soglia_att: parseInt(document.getElementById('r_soglia_att').value) || 0,
            soglia_full: parseInt(document.getElementById('r_soglia_full').value) || 0
        };

        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/settings/orari_moduli').set(dbSettings).then(() => {
            if(typeof window.showToast === 'function') window.showToast("Impostazioni SPA salvate con successo!");
        });
    }

    return { init, switchTab, toggleSyncWeek, togglePausa, toggleDayActive, save };
})();

document.addEventListener('DOMContentLoaded', () => { window.spaModule.init(); });