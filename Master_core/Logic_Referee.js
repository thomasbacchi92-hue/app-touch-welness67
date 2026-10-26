/* Master_core/Logic_Referee.js - Arbitro Collisioni (Appuntamenti + Blocchi + Orario Spezzato) */

window._pendingActionData = null;

window.sysValidateMove = function(appId, newOra, newCab) {
    const d = document.getElementById("mainDate").value; 
    if(!d || !window.twStructId) return;

    const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${d}`);
    appRoot.once('value').then(snap => {
        let apps = window.normalizeFbArray(snap.val());
        const appToMove = apps.find(x => x.id === appId);
        if(!appToMove) return;

        const dayBlocchi = (window.db && window.db.blocchi && window.db.blocchi[d]) ? Object.values(window.db.blocchi[d]).filter(b => b !== null && b !== undefined) : [];
        
        // Estrazione Pausa Spezzato
        let hasPausa = false; let pStart = 0; let pEnd = 0;
        if (window.db && window.db.settings && window.db.settings.agenda && window.db.settings.agenda.pausa_active) {
            hasPausa = true;
            pStart = window.tToM(window.db.settings.agenda.pausa_start || "13:00");
            pEnd = window.tToM(window.db.settings.agenda.pausa_end || "15:00");
        }

        const startMin = window.tToM(newOra); 
        const endMin = startMin + (appToMove.durInt || 30);
        
        let hardCol = false; let shadowCol = false; let opCol = null;

        // Controllo scontro frontale con la Pausa
        if (hasPausa && (startMin < pEnd && endMin > pStart)) {
            hardCol = true;
        }

        // Validazione DRAG & DROP per COPPIA
        if (appToMove.isCouple && !hardCol) {
            const twin = apps.find(x => x.id === appToMove.linkedId || x.linkedId === appToMove.id || x.id === "TWIN_" + appId || "TWIN_" + x.id === appId);
            let twinNewCab = twin ? twin.cab : parseInt(newCab);
            
            if (parseInt(newCab) === parseInt(twinNewCab)) twinNewCab = parseInt(appToMove.cab);

            apps.forEach(a => {
                if (a.id === appId || (twin && a.id === twin.id)) return;
                
                if (parseInt(a.cab) === parseInt(newCab) || parseInt(a.cab) === parseInt(twinNewCab)) {
                    if (startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) {
                        if (startMin < a.oraFine && endMin > a.oraMin) hardCol = true; else shadowCol = true;
                    }
                }
                if (appToMove.op && a.op && a.op.toLowerCase() === appToMove.op.toLowerCase()) {
                    if (startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) opCol = a;
                }
                if (twin && twin.op && a.op && a.op.toLowerCase() === twin.op.toLowerCase()) {
                    if (startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) opCol = a;
                }
            });

            dayBlocchi.forEach(b => {
                if (parseInt(b.cab) === parseInt(newCab) || parseInt(b.cab) === parseInt(twinNewCab)) {
                    const bStart = window.tToM(b.ora);
                    const bEnd = bStart + (parseInt(b.dur, 10) || 60);
                    if (startMin < bEnd && (endMin + 10) > bStart) hardCol = true;
                }
            });

            if (hardCol || opCol) {
                if(window.showErrorToast) window.showErrorToast("⛔ Spazio o operatore insufficiente per spostare la coppia in questo orario!");
                return window.render();
            }

            appToMove.ora = newOra; appToMove.cab = parseInt(newCab);
            if (twin) { twin.ora = newOra; twin.cab = parseInt(twinNewCab); }

            appRoot.set(apps).then(() => { if(window.showToast) window.showToast("Coppia Spostata!"); window.render(); });
            return;
        }

        // Validazione Singoli contro Appuntamenti
        if(!hardCol) {
            apps.forEach(a => { 
                if(a.id === appId) return;
                if(parseInt(a.cab) === parseInt(newCab)) {
                    if(startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) {
                        if(startMin < a.oraFine && endMin > a.oraMin) hardCol = true; else shadowCol = true;
                    }
                }
                if(appToMove.op && appToMove.op !== "" && a.op && (a.op || '').toLowerCase() === (appToMove.op || '').toLowerCase()) {
                    if(startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) opCol = a;
                }
            });
        }

        // Validazione Singoli contro Blocchi Cuscinetto
        if(!hardCol) {
            dayBlocchi.forEach(b => {
                if(parseInt(b.cab) === parseInt(newCab)) {
                    const bStart = window.tToM(b.ora);
                    const bEnd = bStart + (parseInt(b.dur, 10) || 60);
                    if(startMin < bEnd && (endMin + 10) > bStart) hardCol = true;
                }
            });
        }

        if (hardCol) { if(window.showErrorToast) window.showErrorToast("⛔ Cabina occupata o bloccata (Pausa) in questo orario!"); return window.render(); }
        
        if (opCol) {
            const repSelect = document.getElementById('theftReplacementOp');
            if (repSelect) {
                repSelect.innerHTML = '<option value="">-- Seleziona Nuovo Operatore --</option>';
                Object.values(window.allUsersData).forEach(u => {
                    const isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true || u.deleted === true);
                    if (String(u.structureId) === String(window.twStructId) && !isGhost && u.nick !== appToMove.op) {
                        const isRepBusy = apps.some(a => {
                            if (a.id === appId) return false;
                            if ((a.op || '').toLowerCase() !== (u.nick || '').toLowerCase()) return false;
                            return (startMin < window.tToM(a.ora) + parseInt(a.dur || 30) + 10 && (endMin + 10) > window.tToM(a.ora));
                        });
                        if (!isRepBusy) repSelect.innerHTML += `<option value="${u.nick}">🟢 ${u.name} ${u.surname || ''}</option>`;
                    }
                });
            }
            if(document.getElementById('theftOpName')) document.getElementById('theftOpName').innerText = appToMove.op;
            if(document.getElementById('theftOldTime')) document.getElementById('theftOldTime').innerText = `Ha un appuntamento con: ${opCol.cog || 'Cliente'} alle ${opCol.ora}`;
            window._pendingActionData = { type: 'move', appId: appId, newOra: newOra, newCab: newCab, opCollision: opCol, apps: apps };
            if (document.getElementById('operatorTheftModal')) document.getElementById('operatorTheftModal').style.display = 'flex';
            return;
        }

        if (shadowCol) {
            window._pendingActionData = { type: 'move_shadow', appId: appId, newOra: newOra, newCab: newCab, apps: apps };
            setTimeout(() => {
                window.sysDeltaUpdateDOM(appId, newOra, newCab);
                const appElement = document.querySelector(`.app-base[data-app-id="${appId}"]`);
                if(appElement) {
                    appElement.style.opacity = "0.7";
                    appElement.style.border = "2px dashed var(--gold)";
                    appElement.style.boxShadow = "0 0 20px rgba(251, 191, 36, 0.6)";
                }
            }, 10);
            if(document.getElementById('shadowWarningModal')) document.getElementById('shadowWarningModal').style.display = 'flex';
            return; 
        }

        appToMove.ora = newOra; appToMove.cab = parseInt(newCab);
        appRoot.set(apps).then(() => { window.render(); });
    });
};

window.sysValidateAndSave = function() {
    const d = document.getElementById('aDate').value;
    const oldD = document.getElementById('mOldDate').value;
    const appId = document.getElementById('mId').value || ("APP_" + Date.now());
    const ora = document.getElementById('aOra').value;
    const cab = parseInt(document.getElementById('aCab').value, 10);
    const isEdit = document.getElementById('mId').value !== "";
    const newName = document.getElementById('aCog') ? document.getElementById('aCog').value.trim() || "Ospite" : "Ospite";
    const newCam = document.getElementById('aCam') ? document.getElementById('aCam').value : "";

    if (!d || !ora || !cab) { if(window.showErrorToast) window.showErrorToast("Dati obbligatori mancanti!"); return; }

    let appObj = {
        id: appId, ora: ora, cab: cab, cam: newCam, cog: newName,
        tel: document.getElementById('aTel') ? document.getElementById('aTel').value : "",
        dataNascita: document.getElementById('aDataNascita') ? document.getElementById('aDataNascita').value : "",
        op: document.getElementById('aOp') ? document.getElementById('aOp').value : "",
        serv: document.getElementById('aServ') ? document.getElementById('aServ').value : "",
        dur: parseInt(document.getElementById('aDur') ? document.getElementById('aDur').value : 30, 10),
        price: parseFloat(document.getElementById('aPrice') ? document.getElementById('aPrice').value : 0),
        basePrice: parseFloat(document.getElementById('aBasePrice') ? document.getElementById('aBasePrice').value : 0),
        discountType: document.getElementById('aDiscountType') ? document.getElementById('aDiscountType').value : "euro",
        discountValue: parseFloat(document.getElementById('discountValue') ? document.getElementById('discountValue').value : 0) || 0,
        note: document.getElementById('aNote') ? document.getElementById('aNote').value : "",
        patologie: document.getElementById('aPatologie') ? document.getElementById('aPatologie').value : "",
        fattura: document.getElementById('aFattura') ? document.getElementById('aFattura').value : "",
        codCliente: document.getElementById('aCodCliente') ? document.getElementById('aCodCliente').value : "",
        eseguito: document.getElementById('aEseguito') ? document.getElementById('aEseguito').checked : false,
        pagato: document.getElementById('aPagato') ? document.getElementById('aPagato').checked : false,
        isCouple: document.getElementById('aIsCouple') ? document.getElementById('aIsCouple').value === "true" : false
    };

    const dayApps = window.db && window.db.app && window.db.app[d] ? window.normalizeFbArray(window.db.app[d]) : [];
    const dayBlocchi = window.db && window.db.blocchi && window.db.blocchi[d] ? Object.values(window.db.blocchi[d]).filter(b => b !== null && b !== undefined) : [];
    const startMin = window.tToM(ora); const endMin = startMin + appObj.dur;

    let hasPausa = false; let pStart = 0; let pEnd = 0;
    if (window.db && window.db.settings && window.db.settings.agenda && window.db.settings.agenda.pausa_active) {
        hasPausa = true;
        pStart = window.tToM(window.db.settings.agenda.pausa_start || "13:00");
        pEnd = window.tToM(window.db.settings.agenda.pausa_end || "15:00");
    }

    if (hasPausa && (startMin < pEnd && endMin > pStart)) {
        if(window.showErrorToast) window.showErrorToast(`⛔ Orario in sovrapposizione con la Pausa Impostata!`); 
        return;
    }

    let twinObj = null;

    if (appObj.isCouple) {
        let cab2Val = parseInt(document.getElementById('aCab2')?.value, 10);
        let op2Val = document.getElementById('aOp2') ? document.getElementById('aOp2').value : "";

        if (!cab2Val || cab2Val === cab) {
            let numCabine = (window.db && window.db.settings && window.db.settings.agenda && window.db.settings.agenda.num_cabine) ? parseInt(window.db.settings.agenda.num_cabine) : 5;
            for (let c = 1; c <= numCabine; c++) {
                if (c === cab) continue;
                let isCabFree = !dayApps.some(a => parseInt(a.cab) === c && startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin && a.id !== appId && a.id !== "TWIN_" + appId) &&
                                !dayBlocchi.some(b => parseInt(b.cab) === c && startMin < (window.tToM(b.ora) + (parseInt(b.dur, 10) || 60)) && (endMin + 10) > window.tToM(b.ora));
                if (isCabFree) { cab2Val = c; break; }
            }
        }

        if (!op2Val || (appObj.op && op2Val.toLowerCase() === appObj.op.toLowerCase())) {
            let freeOp = Object.values(window.allUsersData || {}).find(u => {
                if (u.attivo === false || String(u.structureId) !== String(window.twStructId)) return false;
                if (appObj.op && u.nick === appObj.op) return false;
                let isOpBusy = dayApps.some(a => (a.op||'').toLowerCase() === u.nick.toLowerCase() && startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin && a.id !== appId && a.id !== "TWIN_" + appId);
                return !isOpBusy;
            });
            if (freeOp) op2Val = freeOp.nick;
        }

        if (appObj.op && op2Val && appObj.op.toLowerCase() === op2Val.toLowerCase() && appObj.op !== "") {
            if(window.showErrorToast) window.showErrorToast("⛔ Impossibile trovare un secondo operatore libero in questo orario!");
            return;
        }

        appObj.price = parseFloat((appObj.price / 2).toFixed(2));
        appObj.basePrice = parseFloat((appObj.basePrice / 2).toFixed(2));

        twinObj = { ...appObj };
        twinObj.id = isEdit && window._pendingActionData ? window._pendingActionData.twinObj.id : "TWIN_" + appId;
        twinObj.cab = cab2Val || cab;
        twinObj.op = op2Val;
        twinObj.linkedId = appId;
        appObj.linkedId = twinObj.id;
    } else {
        appObj.linkedId = null;
    }
    
    let hardCollision = false; let hardCollisionCab2 = false; let shadowCollision = false; let opCollision = null; let op2Collision = null;
    
    dayApps.forEach(a => {
        if (a.id === appId || a.id === appObj.linkedId || a.id === "TWIN_" + appId) return;
        
        if (parseInt(a.cab) === cab) {
            if(startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) {
                if(startMin < a.oraFine && endMin > a.oraMin) hardCollision = true; else shadowCollision = true;
            }
        }

        if (twinObj && parseInt(a.cab) === twinObj.cab && twinObj.cab !== cab) {
            if(startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) {
                if(startMin < a.oraFine && endMin > a.oraMin) hardCollisionCab2 = true; else shadowCollision = true;
            }
        }

        if (appObj.op && appObj.op !== "" && a.op && (a.op || '').toLowerCase() === (appObj.op || '').toLowerCase()) {
            if(startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) opCollision = a;
        }

        if (twinObj && twinObj.op && twinObj.op !== "" && a.op && (a.op || '').toLowerCase() === (twinObj.op || '').toLowerCase()) {
            if(startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) op2Collision = a;
        }
    });

    dayBlocchi.forEach(b => {
        const bStart = window.tToM(b.ora);
        const bEnd = bStart + (parseInt(b.dur, 10) || 60);
        if (parseInt(b.cab) === cab) {
            if (startMin < bEnd && (endMin + 10) > bStart) hardCollision = true;
        }
        if (twinObj && parseInt(b.cab) === twinObj.cab && twinObj.cab !== cab) {
            if (startMin < bEnd && (endMin + 10) > bStart) hardCollisionCab2 = true;
        }
    });

    if (hardCollision) { if(window.showErrorToast) window.showErrorToast(`⛔ Cabina ${cab} occupata o bloccata in questo orario!`); return; }
    if (hardCollisionCab2) { if(window.showErrorToast) window.showErrorToast(`⛔ Cabina ${twinObj.cab} (2ª persona) occupata o bloccata in questo orario!`); return; }

    if (appObj.isCouple) {
        if (opCollision) { if(window.showErrorToast) window.showErrorToast(`⛔ L'Operatore 1 (${appObj.op}) è già occupato alle ${opCollision.ora}!`); return; }
        if (op2Collision) { if(window.showErrorToast) window.showErrorToast(`⛔ L'Operatore 2 (${twinObj.op}) è già occupato alle ${op2Collision.ora}!`); return; }
    }

    window._pendingActionData = { type: 'save', d, oldD, appObj, twinObj, isEdit, newName, newCam };

    if (opCollision && !appObj.isCouple) {
        const repSelect = document.getElementById('theftReplacementOp');
        if (repSelect) {
            repSelect.innerHTML = '<option value="">-- Seleziona Sostituto Libero --</option>';
            Object.values(window.allUsersData).forEach(u => {
                const isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true || u.deleted === true);
                if (String(u.structureId) === String(window.twStructId) && !isGhost && u.nick !== appObj.op) {
                    const isRepBusy = dayApps.some(a => {
                        if (a.id === appId || a.id === appObj.linkedId) return false;
                        if ((a.op || '').toLowerCase() !== (u.nick || '').toLowerCase()) return false;
                        return (startMin < window.tToM(a.ora) + parseInt(a.dur || 30) + 10 && (endMin + 10) > window.tToM(a.ora));
                    });
                    if (!isRepBusy) repSelect.innerHTML += `<option value="${u.nick}">🟢 ${u.name} ${u.surname || ''}</option>`;
                }
            });
        }
        if(document.getElementById('theftOpName')) document.getElementById('theftOpName').innerText = appObj.op;
        if(document.getElementById('theftOldTime')) document.getElementById('theftOldTime').innerText = `Ha un appuntamento con: ${opCollision.cog || 'Cliente'} alle ${opCollision.ora}`;
        if (document.getElementById('operatorTheftModal')) document.getElementById('operatorTheftModal').style.display = 'flex';
        return;
    }

    if (shadowCollision) {
        window._pendingActionData.type = 'save_shadow';
        if (document.getElementById('shadowWarningModal')) document.getElementById('shadowWarningModal').style.display = 'flex';
        return;
    }
    
    window.sysProceedToNameCheck();
};

window.sysProceedToNameCheck = function() {
    if (!window._pendingActionData) return;
    const { isEdit, newName } = window._pendingActionData;

    if (isEdit && window._currentEditingOldName && window._currentEditingOldName.toLowerCase() !== newName.toLowerCase()) {
        const mod = document.getElementById('nameChangeModal');
        if (mod) {
            if(document.getElementById('ncOldName')) document.getElementById('ncOldName').innerText = window._currentEditingOldName;
            if(document.getElementById('ncNewName')) document.getElementById('ncNewName').innerText = newName;
            mod.style.display = 'flex'; return; 
        }
    }
    window.sysProceedToAnagraficaCheck('update');
};

window.sysResolveNameChange = function(action) {
    if(document.getElementById('nameChangeModal')) document.getElementById('nameChangeModal').style.display = 'none';
    if(window._pendingActionData) window._pendingActionData.nameAction = action; 
    window.sysProceedToAnagraficaCheck();
};

window.sysProceedToAnagraficaCheck = function() {
    if (!window._pendingActionData) return;
    const { isEdit, newName, newCam } = window._pendingActionData;

    if (isEdit) {
        let existingCustomer = null;
        if (window.globalCustomers) existingCustomer = window.globalCustomers.find(c => c.nome && c.nome.toLowerCase() === newName.toLowerCase());
        if (existingCustomer && existingCustomer.cam && existingCustomer.cam !== newCam && newCam !== "") {
            if (document.getElementById('cameraChangeModal')) {
                if(document.getElementById('ccOldCam')) document.getElementById('ccOldCam').innerText = existingCustomer.cam;
                if(document.getElementById('ccNewCam')) document.getElementById('ccNewCam').innerText = newCam;
                document.getElementById('cameraChangeModal').style.display = 'flex';
                return;
            }
        }
    }
    window.sysFinalizeSaveRequest();
};

window.sysResolveCameraChange = function(action) {
    if(document.getElementById('cameraChangeModal')) document.getElementById('cameraChangeModal').style.display = 'none';
    if (action === 'ignore' && window._pendingActionData) window._pendingActionData.ignoreCameraSync = true;
    window.sysFinalizeSaveRequest();
};

window.sysFinalizeSaveRequest = function() {
    if (!window._pendingActionData) return;
    const { d, oldD, appObj, twinObj, isEdit, ignoreCameraSync, nameAction } = window._pendingActionData;
    let appsToSave = [window.sanitizePayload ? window.sanitizePayload(appObj) : appObj];
    if(twinObj) appsToSave.push(window.sanitizePayload ? window.sanitizePayload(twinObj) : twinObj);
    
    if(typeof window.sysUpdateCRM === 'function') window.sysUpdateCRM(appObj, ignoreCameraSync, isEdit, nameAction);
    if(typeof window.sysFinalSaveToDB === 'function') window.sysFinalSaveToDB(d, oldD, appsToSave, appObj.id, isEdit, appObj.isCouple);
    
    window._pendingActionData = null; window._currentEditingOldName = null;
};

window.sysCancelShadowOverride = function() {
    if(document.getElementById('shadowWarningModal')) document.getElementById('shadowWarningModal').style.display = 'none';
    window._pendingActionData = null;
    if(window.render) window.render();
};

window.sysConfirmShadowOverride = function() {
    if(document.getElementById('shadowWarningModal')) document.getElementById('shadowWarningModal').style.display = 'none';
    if (!window._pendingActionData) return;
    if (window._pendingActionData.type === 'move_shadow') {
        const p = window._pendingActionData;
        const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${document.getElementById("mainDate").value}`);
        const appToMove = p.apps.find(x => x.id === p.appId);
        if(appToMove) { appToMove.ora = p.newOra; appToMove.cab = parseInt(p.newCab); }
        appRoot.set(p.apps).then(() => { window._pendingActionData = null; if(window.render) window.render(); });
    } else if (window._pendingActionData.type === 'save_shadow') {
        window._pendingActionData.type = 'save';
        window.sysProceedToNameCheck();
    }
};

window.sysConfirmOperatorTheft = function() {
    const repOp = document.getElementById('theftReplacementOp').value;
    if (!repOp) { if(window.showErrorToast) window.showErrorToast("Devi selezionare un sostituto libero per procedere!"); return; }

    if (window._pendingActionData && window._pendingActionData.type === 'move') {
        const { appId, newOra, newCab, apps } = window._pendingActionData;
        const appToMove = apps.find(x => x.id === appId);
        if(appToMove) { appToMove.op = repOp; appToMove.ora = newOra; appToMove.cab = parseInt(newCab); }
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${document.getElementById("mainDate").value}`).set(apps).then(() => {
            window.sysDeltaUpdateDOM(appId, newOra, newCab);
            document.getElementById('operatorTheftModal').style.display = 'none';
            if(window.showToast) window.showToast("Operatore scambiato con successo!");
            window._pendingActionData = null;
        });
    } else if (window._pendingActionData && window._pendingActionData.type === 'save') {
        window._pendingActionData.appObj.op = repOp;
        if(document.getElementById('aOp')) document.getElementById('aOp').value = repOp;
        document.getElementById('operatorTheftModal').style.display = 'none';
        if(window.showToast) window.showToast("Nuovo operatore assegnato.");
        window.sysProceedToNameCheck();
    }
};

window.sysCancelOperatorTheft = function() {
    if(document.getElementById('operatorTheftModal')) document.getElementById('operatorTheftModal').style.display = 'none'; 
    window._pendingActionData = null;
    if(window.render) window.render(); 
};