/* Impostazioni/logic_operatori.js */
window.operatoriModule = (function() {
    let usersData = {};

    function init() {
        firebase.database().ref(`MASTER_ADMIN_DB/users`).on('value', snap => {
            usersData = snap.val() || {};
            renderUsers();
        });
    }

    function renderUsers() {
        const container = document.getElementById('operatoriGridContainer');
        if(!container) return;
        let h = '';

        Object.keys(usersData).forEach(uid => {
            const u = usersData[uid];
            // Filtra solo quelli della struttura o quelli globali assegnati
            if(u.structureId && String(u.structureId) !== String(window.twStructId)) return;

            const isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true);
            const role = u.role === 'admin' ? 'Admin' : 'Operatore';
            const roleColor = u.role === 'admin' ? 'var(--red)' : 'var(--accent)';
            const bgClass = isGhost ? 'ghost' : '';
            
            h += `
            <div class="op-card ${bgClass}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <b style="font-size:15px; color:var(--text-main); display:block;">${u.name || ''} ${u.surname || ''}</b>
                        <span style="font-size:11px; color:var(--text-muted);">Nick: ${u.nick || '-'}</span>
                    </div>
                    <span style="font-size:10px; font-weight:900; background:rgba(0,0,0,0.2); border:1px solid ${roleColor}; color:${roleColor}; padding:4px 8px; border-radius:6px; text-transform:uppercase;">${role}</span>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px; padding-top:10px; border-top:1px dashed var(--border-line);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:12px; color:var(--text-main);">Stato Visibilità</span>
                        <label class="switch" style="transform:scale(0.8);"><input type="checkbox" ${!isGhost ? 'checked' : ''} onchange="window.operatoriModule.toggleStatus('${uid}', this.checked)"><span class="slider"></span></label>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:12px; color:var(--text-main);">Diritti di Admin</span>
                        <label class="switch" style="transform:scale(0.8);"><input type="checkbox" ${u.role === 'admin' ? 'checked' : ''} onchange="window.operatoriModule.toggleRole('${uid}', this.checked)"><span class="slider"></span></label>
                    </div>
                </div>
            </div>`;
        });
        container.innerHTML = h;
    }

    function toggleStatus(uid, isActive) {
        firebase.database().ref(`MASTER_ADMIN_DB/users/${uid}`).update({
            attiva: isActive,
            attivo: isActive,
            eliminato: !isActive
        }).then(() => window.showToast("Stato aggiornato!"));
    }

    function toggleRole(uid, isAdmin) {
        firebase.database().ref(`MASTER_ADMIN_DB/users/${uid}`).update({
            role: isAdmin ? 'admin' : 'operator'
        }).then(() => window.showToast("Permessi aggiornati!"));
    }

    function createOp() {
        const nick = document.getElementById('newOpNick').value.trim();
        const name = document.getElementById('newOpName').value.trim();
        const surname = document.getElementById('newOpSurname').value.trim();
        
        if(!nick || !name) { alert("Nickname e Nome sono obbligatori"); return; }
        
        const newId = 'OP_' + Date.now();
        const payload = {
            nick: nick,
            name: name,
            surname: surname,
            structureId: window.twStructId,
            attivo: true,
            attiva: true,
            role: 'operator'
        };

        firebase.database().ref(`MASTER_ADMIN_DB/users/${newId}`).set(payload).then(() => {
            document.getElementById('modalAddOp').style.display = 'none';
            document.getElementById('newOpNick').value = '';
            document.getElementById('newOpName').value = '';
            document.getElementById('newOpSurname').value = '';
            window.showToast("Staff aggiunto con successo!");
        });
    }

    return { init, toggleStatus, toggleRole, createOp };
})();

document.addEventListener('DOMContentLoaded', () => { window.operatoriModule.init(); });