/* funzioni/cuscinetto.js - Generazione Blocchi Operativi Puri e Drag&Drop Nativo */

document.addEventListener('DOMContentLoaded', () => {
    const stili = document.createElement('style');
    stili.innerHTML = `
        .blocco-cabina { z-index: 6; cursor: grab; padding: 8px 12px; box-sizing: border-box; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.4) !important; }
        .blocco-cabina:active { cursor: grabbing !important; }
        body.is-dragging-mode .blocco-cabina { pointer-events: none !important; }
    `;
    document.head.appendChild(stili);
});

window.cuscinetto = {
    isResizing: false, 
    resizeStartY: 0, 
    resizeStartDur: 0, 
    resizeBlockId: null,

    createInstantBlock: function(cab, ora) {
        const d = document.getElementById("mainDate") ? document.getElementById("mainDate").value : null;
        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
        
        if (!d || !safeStructId || !cab || !ora) {
            if(window.showErrorToast) window.showErrorToast("Impossibile creare: coordinate cabina mancanti.");
            return;
        }

        const id = "BLK_" + Date.now();
        let dur = 60;
        
        if (window.db && window.db.settings && window.db.settings.agenda && window.db.settings.agenda.cuscinetto_min) {
            dur = parseInt(window.db.settings.agenda.cuscinetto_min, 10) || 60;
        }

        const newBlock = { id: id, cab: String(cab), ora: ora, dur: dur, note: "Blocco Operativo" };

        // Pre-inserimento Ottimistico (Immediato, nessuna attesa di rete)
        if (!window.db.blocchi) window.db.blocchi = {};
        if (!window.db.blocchi[d]) window.db.blocchi[d] = {};
        window.db.blocchi[d][id] = newBlock;
        if(window.render) window.render();

        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi/${d}/${id}`).set(newBlock).then(() => { 
            if(window.showToast) window.showToast(`Cuscinetto creato!`); 
        });
    },

    openDeleteModal: function(id, e) {
        if (e) e.stopPropagation();
        
        // Cancellazione rapida senza Modale (più fluido per operatività)
        if(confirm("Vuoi rimuovere questo blocco operativo?")) {
            this.confirmDeleteBlock(id);
        }
    },

    confirmDeleteBlock: function(id) {
        const d = document.getElementById("mainDate").value;
        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
        
        if (window.db.blocchi && window.db.blocchi[d] && window.db.blocchi[d][id]) {
            delete window.db.blocchi[d][id];
            if(window.render) window.render();
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

        if (window.db.blocchi && window.db.blocchi[d] && window.db.blocchi[d][bId]) {
            window.db.blocchi[d][bId].dur = newDur;
            if(window.render) window.render();
        }
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi/${d}/${bId}`).update({ dur: newDur });
    },

    moveBlock: function(blockId, newCab, newOra) {
        const d = document.getElementById("mainDate").value;
        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
        
        if (window.db.blocchi && window.db.blocchi[d] && window.db.blocchi[d][blockId]) {
            window.db.blocchi[d][blockId].cab = String(newCab);
            window.db.blocchi[d][blockId].ora = newOra;
            if(window.render) window.render();
        }

        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi/${d}/${blockId}`).update({ cab: String(newCab), ora: newOra }).then(() => { 
            if(window.showToast) window.showToast("Blocco Spostato!"); 
        });
    }
};