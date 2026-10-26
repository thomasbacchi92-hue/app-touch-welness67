/* Impostazioni/logic_grafica.js */
window.graficaModule = (function() {
    let baseData = { usa_preset: true, criterio_attivo: 'servizio', colori_servizio: {}, colori_durata: {}, sovrascrivi_stati: true, colori_stato: { pagato: '#10b981', eseguito: '#a855f7' } };
    let dbServizi = [];
    let standardPalette = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#10b981','#06b6d4','#0ea5e9','#3b82f6','#6366f1','#8b5cf6','#d946ef','#f43f5e'];

    function init() {
        if(!window.twStructId) return;
        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/servizi').once('value').then(snap => {
            dbServizi = snap.val() ? Object.values(snap.val()) : [];
            firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/settings/grafica').once('value').then(snap2 => {
                const data = snap2.val() || {};
                baseData = { usa_preset: true, criterio_attivo: 'servizio', colori_servizio: {}, colori_durata: {}, sovrascrivi_stati: true, colori_stato: { pagato: '#10b981', eseguito: '#a855f7' }, ...data };
                
                const togglePresetEl = document.getElementById('graficaPresetToggle');
                if(togglePresetEl) togglePresetEl.checked = baseData.usa_preset;
                
                const toggleStatoEl = document.getElementById('graficaStatoToggle');
                if(toggleStatoEl) toggleStatoEl.checked = baseData.sovrascrivi_stati;
                
                switchLogic(baseData.criterio_attivo || 'servizio');
                togglePreset();
                toggleStato();
            });
        });
    }

    function togglePreset() {
        const toggle = document.getElementById('graficaPresetToggle');
        const wrapper = document.getElementById('graficaLogicWrapper');
        if(toggle && wrapper) {
            baseData.usa_preset = toggle.checked;
            wrapper.style.opacity = toggle.checked ? '0.3' : '1';
            wrapper.style.pointerEvents = toggle.checked ? 'none' : 'auto';
        }
    }

    function toggleStato() {
        const toggle = document.getElementById('graficaStatoToggle');
        const wrapper = document.getElementById('graficaStatoRows');
        if(toggle && wrapper) {
            baseData.sovrascrivi_stati = toggle.checked;
            wrapper.style.opacity = toggle.checked ? '1' : '0.3';
            wrapper.style.pointerEvents = toggle.checked ? 'auto' : 'none';
            renderStatoRows();
        }
    }

    function switchLogic(logicName) {
        baseData.criterio_attivo = logicName;
        document.querySelectorAll('.logic-card').forEach(c => c.classList.remove('active'));
        const activeCard = document.getElementById('cardLogic' + logicName.charAt(0).toUpperCase() + logicName.slice(1));
        if(activeCard) activeCard.classList.add('active');
        renderRows(logicName);
    }

    function renderRows(logic) {
        const container = document.getElementById('graficaDynamicRows');
        if(!container) return;
        let h = '';

        if(logic === 'servizio') {
            dbServizi.forEach(s => {
                let color = baseData.colori_servizio[s.id] || "default";
                h += buildRow(s.id, s.nome, color, 'servizio');
            });
        } else if(logic === 'durata') {
            [20, 30, 40, 50, 60, 80, 90, 110, 120].forEach(d => {
                let color = baseData.colori_durata[`dur_${d}`] || "default";
                h += buildRow(`dur_${d}`, `${d} Minuti`, color, 'durata');
            });
        } else {
            h = `<div style="padding:15px; color:var(--text-muted); grid-column:1/-1;">Per Tipologia: In costruzione...</div>`;
        }
        container.innerHTML = h;
    }

    function renderStatoRows() {
        const container = document.getElementById('graficaStatoRows');
        if(!container) return;
        let cPagato = baseData.colori_stato.pagato || '#10b981';
        let cEseguito = baseData.colori_stato.eseguito || '#a855f7';
        container.innerHTML = buildRow('pagato', 'Pagato', cPagato, 'stato') + buildRow('eseguito', 'Eseguito', cEseguito, 'stato');
    }

    function buildRow(id, name, color, type) {
        let isDef = color === "default" || !color;
        let bg = isDef ? "background:var(--bg-body);" : `background:${color}; color:#fff; border-color:${color};`;
        return `
        <div style="border:1px solid var(--border-line); border-radius:8px; padding:10px; display:flex; align-items:center; justify-content:space-between; ${bg} cursor:pointer; transition:0.2s;" onclick="window.graficaModule.openPalette('${id}', '${type}')">
            <b style="font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</b>
            <div style="width:20px; height:20px; border-radius:50%; background:${isDef ? 'var(--border-line)' : '#fff'}; flex-shrink:0;"></div>
        </div>`;
    }

    function openPalette(id, type) {
        document.getElementById('paletteTargetId').value = id;
        document.getElementById('paletteTargetType').value = type;
        
        let ph = type === 'stato' ? '' : `<div class="palette-item" onclick="window.graficaModule.selectColor('default')"><div class="palette-swatch" style="background:var(--bg-panel);"></div><span class="palette-name" style="color:var(--text-muted);">Default</span></div>`;
        standardPalette.forEach(c => {
            ph += `<div class="palette-item" onclick="window.graficaModule.selectColor('${c}')">
                     <div class="palette-swatch" style="background:${c}; border-color:${c};"></div><span class="palette-name">${c.toUpperCase()}</span>
                   </div>`;
        });
        document.getElementById('paletteGridContainer').innerHTML = ph;
        document.getElementById('modalColorPalette').style.display = 'flex';
    }

    function selectColor(hex) { applyCustomColor(hex); }

    function applyCustomColor(hex) {
        const id = document.getElementById('paletteTargetId').value;
        const type = document.getElementById('paletteTargetType').value;
        if(type === 'servizio') baseData.colori_servizio[id] = hex;
        else if(type === 'durata') baseData.colori_durata[id] = hex;
        else if(type === 'stato') baseData.colori_stato[id] = hex;
        
        document.getElementById('modalColorPalette').style.display = 'none';
        if(type === 'stato') renderStatoRows(); else renderRows(baseData.criterio_attivo);
    }

    function saveAll() {
        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/settings/grafica').update({
            usa_preset: baseData.usa_preset,
            criterio_attivo: baseData.criterio_attivo,
            colori_servizio: baseData.colori_servizio || {},
            colori_durata: baseData.colori_durata || {},
            sovrascrivi_stati: baseData.sovrascrivi_stati,
            colori_stato: baseData.colori_stato || { pagato: '#10b981', eseguito: '#a855f7' }
        }).then(() => {
            if(typeof window.showToast === 'function') window.showToast("Grafica Appuntamenti e Priorità Stati salvati!");
        });
    }

    function resetColors() {
        if(confirm("Forzare i colori di default? (Tutti i custom andranno persi)")) {
            baseData.colori_servizio = {}; baseData.colori_durata = {}; baseData.colori_stato = { pagato: '#10b981', eseguito: '#a855f7' };
            baseData.usa_preset = true; document.getElementById('graficaPresetToggle').checked = true;
            togglePreset(); renderRows(baseData.criterio_attivo); renderStatoRows(); saveAll();
        }
    }

    return { init, togglePreset, toggleStato, switchLogic, openPalette, selectColor, applyCustomColor, saveAll, resetColors };
})();

document.addEventListener('DOMContentLoaded', () => { window.graficaModule.init(); });