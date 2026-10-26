/* Impostazioni/logic_agenda.js */
window.agendaModule = (function() {
    let uiDataCache = { desktop: {}, mobile: {} };

    const uiFields = [
        { key: 'cliente', name: 'Dati Cliente (Nome, Tel, Email)' },
        { key: 'cabina', name: 'Selezione Cabina Manuale' },
        { key: 'note', name: 'Note Appuntamento' },
        { key: 'patologie', name: 'Patologie / Allergie' },
        { key: 'pagato', name: 'Spunta Pagato' },
        { key: 'eseguito', name: 'Spunta Eseguito' },
        { key: 'sconto', name: 'Campo Sconto' }
    ];

    function init() {
        if(!window.twStructId) return;

        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/settings/agenda').once('value').then(snap => {
            const data = snap.val() || {};
            
            const elYield = document.getElementById('ui_yield_active');
            const elFO = document.getElementById('ui_front_office');
            const elCab = document.getElementById('ui_num_cabine');
            const elStart = document.getElementById('ui_agenda_start');
            const elEnd = document.getElementById('ui_agenda_end');
            const elBlocco = document.getElementById('ui_block_duration');
            const elCuscinettoMin = document.getElementById('ui_cuscinetto_min');

            const elPausaActive = document.getElementById('ui_pausa_active');
            const elPausaStart = document.getElementById('ui_pausa_start');
            const elPausaEnd = document.getElementById('ui_pausa_end');

            if(elYield) elYield.checked = data.yield_active !== undefined ? data.yield_active : true;
            if(elFO) elFO.value = data.front_office !== undefined ? data.front_office : 1;
            if(elCab) {
                elCab.value = data.num_cabine !== undefined ? data.num_cabine : 5;
                localStorage.setItem('tw_num_cabine', elCab.value);
            }
            if(elStart) elStart.value = data.start || "09:00";
            if(elEnd) elEnd.value = data.end || "20:00";
            if(elBlocco) elBlocco.value = data.block_duration || 60;
            if(elCuscinettoMin) elCuscinettoMin.value = data.cuscinetto_min !== undefined ? data.cuscinetto_min : 30;

            if(elPausaActive) {
                elPausaActive.checked = data.pausa_active === true;
                document.getElementById('agenda_pausa_box').style.display = data.pausa_active ? 'block' : 'none';
            }
            if(elPausaStart) elPausaStart.value = data.pausa_start || "13:00";
            if(elPausaEnd) elPausaEnd.value = data.pausa_end || "15:00";
        });

        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/settings/ui').once('value').then(snap => {
            uiDataCache = snap.val() || { desktop: {}, mobile: {} };
            if (!uiDataCache.desktop) uiDataCache.desktop = {};
            if (!uiDataCache.mobile) uiDataCache.mobile = {};
            renderUISwitches();
        });
    }

    function renderUISwitches() {
        const container = document.getElementById('agendaUiSwitchesContainer');
        if(!container) return;
        let h = '';
        uiFields.forEach(f => {
            let deskChecked = (uiDataCache.desktop[f.key] !== false) ? 'checked' : '';
            let mobChecked = (uiDataCache.mobile[f.key] !== false) ? 'checked' : '';
            h += `
            <div style="background:var(--bg-body); border:1px solid var(--border-line); border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:12px;">
                <b style="color:var(--text-main); font-size:12px; border-bottom:1px dashed var(--border-line); padding-bottom:8px;">${f.name}</b>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:11px; color:var(--text-muted);"><i class="material-icons-round" style="font-size:14px; vertical-align:middle;">desktop_windows</i> Desktop</span>
                    <label class="switch" style="transform:scale(0.85); margin:0;"><input type="checkbox" id="ui_desk_${f.key}" ${deskChecked}><span class="slider"></span></label>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:11px; color:var(--text-muted);"><i class="material-icons-round" style="font-size:14px; vertical-align:middle;">smartphone</i> Mobile</span>
                    <label class="switch" style="transform:scale(0.85); margin:0;"><input type="checkbox" id="ui_mob_${f.key}" ${mobChecked}><span class="slider"></span></label>
                </div>
            </div>`;
        });
        container.innerHTML = h;
    }

    function save() {
        const cuscMin = parseInt(document.getElementById('ui_cuscinetto_min')?.value);

        const agendaPayload = {
            yield_active: document.getElementById('ui_yield_active')?.checked ?? true,
            front_office: parseInt(document.getElementById('ui_front_office')?.value) || 0,
            num_cabine: parseInt(document.getElementById('ui_num_cabine')?.value) || 5,
            start: document.getElementById('ui_agenda_start')?.value || "09:00",
            end: document.getElementById('ui_agenda_end')?.value || "20:00",
            block_duration: parseInt(document.getElementById('ui_block_duration')?.value) || 60,
            cuscinetto_min: isNaN(cuscMin) ? 30 : cuscMin,
            pausa_active: document.getElementById('ui_pausa_active')?.checked ?? false,
            pausa_start: document.getElementById('ui_pausa_start')?.value || "13:00",
            pausa_end: document.getElementById('ui_pausa_end')?.value || "15:00"
        };
        localStorage.setItem('tw_num_cabine', agendaPayload.num_cabine);

        const uiPayload = { desktop: {}, mobile: {} };
        uiFields.forEach(f => {
            const dEl = document.getElementById(`ui_desk_${f.key}`);
            const mEl = document.getElementById(`ui_mob_${f.key}`);
            if(dEl) uiPayload.desktop[f.key] = dEl.checked;
            if(mEl) uiPayload.mobile[f.key] = mEl.checked;
        });

        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/settings/agenda').update(agendaPayload);
        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/settings/ui').update(uiPayload).then(() => {
            if(typeof window.showToast === 'function') window.showToast("Impostazioni Agenda salvate!");
        });
    }

    return { init, save };
})();

document.addEventListener('DOMContentLoaded', () => { window.agendaModule.init(); });