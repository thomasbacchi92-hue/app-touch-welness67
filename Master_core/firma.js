/* Master_core/firma.js - Motore Privacy (Fix Variabili Form Unificato e Patologie) */

window.twPrivacyState = {
    appId: null, date: null, cog: null, custId: null, docs: null, signature: null, listenerRef: null, spinnerMove: null, isWaitingTablet: false
};

const SERVER_URL = 'https://script.google.com/macros/s/AKfycbx1EPW47IfK5F2LBZpkxep-7tKiqC-eaZfSVUD9NCM5mT_FscPmPLiYHd45XnniPQZWiA/exec';

window.showPrivacyCancelErrorModal = function(reasonMsg) {
    var existing = document.getElementById('tw-privacy-error-modal');
    if (existing) existing.remove();

    var msg = reasonMsg ? reasonMsg : "Il cliente ha annullato l'operazione o ha chiuso la schermata di firma sul tablet.";

    var modalHtml = '<div id="tw-privacy-error-modal" class="modal-overlay" style="display:flex; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); backdrop-filter:blur(6px); z-index:100005; align-items:center; justify-content:center;" onclick="if(event.target===this) this.remove()">' +
        '<div class="modal-box" style="background:#1e293b; max-width:420px; width:90%; text-align:center; padding:30px; border-radius:16px; border:1px solid rgba(239,68,68,0.4); border-top:4px solid #ef4444; box-shadow:0 25px 50px rgba(0,0,0,0.8); font-family: -apple-system, BlinkMacSystemFont, sans-serif;">' +
            '<div style="width:70px; height:70px; border-radius:50%; background:rgba(239,68,68,0.15); box-shadow:0 0 20px rgba(239,68,68,0.2); display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto; color:#ef4444; font-size:36px; font-weight:900;">' +
                '✕' +
            '</div>' +
            '<h3 style="margin:0 0 10px 0; font-size:20px; font-weight:900; color:#ffffff; text-transform:uppercase;">Firma Non Completata</h3>' +
            '<p style="font-size:15px; color:#94a3b8; margin:0 0 25px 0; line-height:1.6;">' +
                msg +
            '</p>' +
            '<button style="width:100%; margin:0; background:#ef4444; color:#ffffff; border:none; padding:14px; border-radius:8px; font-size:14px; font-weight:900; cursor:pointer; text-transform:uppercase;" onclick="document.getElementById(\'tw-privacy-error-modal\').remove()">' +
                'HO CAPITO' +
            '</button>' +
        '</div>' +
    '</div>';
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.checkAndSendPrivacy = function() {
    const appId = document.getElementById('mId') ? document.getElementById('mId').value : null;
    
    if (!appId || appId.trim() === "") {
        if (window.showToast) window.showToast("⚠️ Devi prima cliccare su 'SALVA IN AGENDA' per registrare l'appuntamento!", true);
        const btn = document.querySelector('.btn-outline[onclick*="checkAndSendPrivacy"]');
        if (btn) {
            btn.innerHTML = '<i class="material-icons-round">tablet_android</i> INVIA A TABLET';
            btn.disabled = false;
            btn.style.borderColor = 'var(--accent)';
        }
        return;
    }

    // Lettura Diretta dal Form Unificato (Sia per Add che per Edit)
    const rawDate = document.getElementById('aDate')?.value || document.getElementById('mOldDate')?.value;
    const date = rawDate || new Date().toISOString().split('T')[0];
    
    const cog = document.getElementById('aCog')?.value || "Ospite";
    const telefono = document.getElementById('aTel')?.value || "__________________";
    
    let dataNascita = document.getElementById('aDataNascita')?.value || "___/___/______";
    const displayDataNascita = dataNascita !== "___/___/______" ? dataNascita.split('-').reverse().join('/') : "___/___/______";
    
    const patologie = document.getElementById('aPatologie')?.value || "";

    const selectedDocId = document.getElementById('privacyDocSelect') ? document.getElementById('privacyDocSelect').value : null;

    let servName = "Trattamento SPA";
    const aServNode = document.getElementById('aServ');
    if(aServNode && aServNode.value) servName = aServNode.value;

    const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
    if (!safeStructId) return;

    let foundCustId = null;
    if (window.globalCustomers) {
        const match = window.globalCustomers.find(c => c.nome && c.nome.toLowerCase() === cog.toLowerCase());
        if (match) foundCustId = match.id;
    }
    window.twPrivacyState.custId = foundCustId;

    const displayDate = date.split('-').reverse().join('/');

    const btn = document.querySelector('.btn-outline[onclick*="checkAndSendPrivacy"]');
    if (btn) {
        btn.innerHTML = '<i class="material-icons-round">sync</i> RECUPERO MODELLO...'; 
        btn.style.borderColor = 'var(--accent)';
        btn.disabled = true;
    }

    showCursorSpinner();

    firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/settings/firma/modelli`).once('value').then(snap => {
        const modelli = snap.val();
        let customHtml = null;
        let finalTitle = 'Consenso Informato';
        
        if (modelli) {
            if (selectedDocId && modelli[selectedDocId]) {
                customHtml = modelli[selectedDocId].corpo;
                finalTitle = modelli[selectedDocId].titolo || 'Documento Struttura';
            } else {
                for (const key in modelli) {
                    if (modelli[key].isDefault) {
                        customHtml = modelli[key].corpo;
                        finalTitle = modelli[key].titolo || 'Consenso Informato';
                        break;
                    }
                }
            }
        }

        window.twPrivacyState.docTitle = finalTitle;

        let docHtml = "";
        let nomeStruttura = "La Direzione";
        let societaGestore = "La Società Gestore";

        if (window.db && window.db.settings && window.db.settings.company) {
             nomeStruttura = window.db.settings.company.nome || "La Direzione";
             societaGestore = window.db.settings.company.ragioneSociale || "La Società Gestore";
        }
        
        if (customHtml) {
            let processedHtml = customHtml
                .split("☐").join('<input type="checkbox" style="width:20px; height:20px; vertical-align:middle; cursor:pointer; margin-right:6px;">')
                .split("[CHECK]").join('<input type="checkbox" style="width:20px; height:20px; vertical-align:middle; cursor:pointer; margin-right:6px;">')
                .split("{{NOME_CLIENTE}}").join(cog)
                .split("{{NOME_STRUTTURA}}").join(nomeStruttura)
                .split("{{SOCIETA_GESTORE}}").join(societaGestore)
                .split("{{TELEFONO}}").join(telefono)
                .split("___/___/______").join(displayDataNascita)
                .split("[CLIENTE]").join(cog)
                .split("[DATA]").join(displayDate)
                .split("[SERVIZIO]").join(servName)
                .split("[PATOLOGIE]").join(patologie);

            let parser = new DOMParser();
            let doc = parser.parseFromString(processedHtml, 'text/html');

            let walk = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
            let textNodes = [];
            let n;
            while(n = walk.nextNode()) textNodes.push(n);

            textNodes.forEach(node => {
                let txt = node.nodeValue;
                let lowerTxt = txt.toLowerCase();
                
                if(lowerTxt.includes("specificare")) {
                    if (patologie !== "" && !patologie.toLowerCase().includes("nessuna")) {
                        const colonIdx = txt.indexOf(':');
                        if (colonIdx !== -1) {
                            const beforeColon = txt.substring(0, colonIdx + 1);
                            let afterColon = txt.substring(colonIdx + 1);
                            let remainingText = afterColon.replace(/^[\s\.\_…\-]+/, '');
                            
                            node.nodeValue = beforeColon + " ";
                            
                            let span = doc.createElement('span');
                            span.style.color = "#000";
                            span.style.fontWeight = "bold";
                            span.style.textDecoration = "underline";
                            span.textContent = patologie;
                            
                            if (node.parentNode) {
                                node.parentNode.insertBefore(span, node.nextSibling);
                                if (remainingText.length > 0) {
                                    let remNode = doc.createTextNode(" " + remainingText);
                                    node.parentNode.insertBefore(remNode, span.nextSibling);
                                }
                            }
                        } else {
                            node.nodeValue = txt.replace(/[\.\_…]{3,}/g, " " + patologie);
                        }
                        
                        let nextN = node.nextSibling;
                        if (nextN && nextN.nodeType === Node.TEXT_NODE && /^[\s\.\_…\-]+$/.test(nextN.nodeValue)) {
                            nextN.nodeValue = "";
                        }
                    }
                }
                
                if(lowerTxt.includes("relax") || lowerTxt.includes("buono stato") || lowerTxt.includes("buona salute") || lowerTxt.includes("idoneo")) {
                    let current = node.parentNode;
                    let attempts = 0;
                    while(current && attempts < 4 && current.nodeName !== 'BODY') {
                        let cb = current.querySelector ? current.querySelector('input[type="checkbox"]') : null;
                        if(cb) {
                            cb.setAttribute("checked", "checked");
                            cb.checked = true;
                            break;
                        }
                        let prev = current.previousElementSibling;
                        if(prev) {
                            let pCb = prev.querySelector ? prev.querySelector('input[type="checkbox"]') : null;
                            if(pCb) { pCb.setAttribute("checked", "checked"); pCb.checked = true; break; }
                            if(prev.tagName === 'INPUT' && prev.type === 'checkbox') { prev.setAttribute("checked", "checked"); prev.checked = true; break; }
                        }
                        current = current.parentNode;
                        attempts++;
                    }
                }
            });

            let trackerScript = doc.createElement('script');
            trackerScript.className = "tw-tracker";
            trackerScript.textContent = `
                document.querySelectorAll('input[type="checkbox"]').forEach(function(cb){
                    cb.addEventListener('change', function(){
                        if(this.checked) this.setAttribute('checked', 'checked');
                        else this.removeAttribute('checked');
                    });
                });
            `;
            doc.body.appendChild(trackerScript);
            
            docHtml = `<div style="font-family: Arial, sans-serif; color: #000; padding: 10px; line-height: 1.5; text-align: left; background:#ffffff;">${doc.body.innerHTML}</div>`;
        
        } else {
            docHtml = `
                <div style="font-family: Arial, sans-serif; color: #000; padding: 10px; line-height: 1.5; text-align: left; background:#ffffff;">
                    <h2 style="color: #000; border-bottom: 2px solid #ccc; padding-bottom: 10px; text-align: center; text-transform: uppercase;">Consenso Informato e Privacy</h2>
                    <p style="font-size: 16px;">Il/La sottoscritto/a <b style="font-size:18px;">${cog}</b>, in data <b>${displayDate}</b>, in relazione al servizio di <b>${servName}</b>, dichiara quanto segue:</p>
                    <div style="background: #f8f8f8; padding: 15px; margin: 20px 0; border: 1px solid #ddd;">
                        <b>QUADRO CLINICO DICHIARATO:</b><br>
                        <span style="font-size: 15px;">${patologie || 'Nessuna patologia dichiarata.'}</span>
                    </div>
                    <div style="font-size: 15px; margin-top: 20px;">
                        <div><input type="checkbox" checked="checked" style="width:18px; height:18px; vertical-align:middle; cursor:pointer;" onclick="if(this.checked) this.setAttribute('checked','checked'); else this.removeAttribute('checked');"> <span>Acconsento al trattamento dei dati.</span></div>
                    </div>
                </div>`;
        }

        if (btn) btn.innerHTML = '<i class="material-icons-round">sync</i> IN COMPILAZIONE SUL TABLET...'; 

        window.twPrivacyState.appId = appId;
        window.twPrivacyState.date = date;
        window.twPrivacyState.cog = cog;
        window.twPrivacyState.isWaitingTablet = false;

        const tabletRef = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/device_sync/tablet`);
        if(window.twPrivacyState.listenerRef) tabletRef.off('value', window.twPrivacyState.listenerRef);

        tabletRef.set({ status: 'pending', appId: appId, date: date, docs: [{ content: docHtml }] }).then(() => {
            window.twPrivacyState.isWaitingTablet = true;
            if(window.showToast) window.showToast("Modulo inviato al Tablet. In attesa di firma...", false);
        });
        
        window.twPrivacyState.listenerRef = tabletRef.on('value', snap => {
            const data = snap.val();

            if(data && data.status === 'review' && data.appId === appId) {
                window.twPrivacyState.isWaitingTablet = false;
                hideCursorSpinner();
                
                let mostraAnteprima = true;
                if (window.db && window.db.settings && window.db.settings.firma && window.db.settings.firma.anteprimaApp === false) {
                    mostraAnteprima = false;
                }

                if (mostraAnteprima) {
                    if (btn) btn.innerHTML = '<i class="material-icons-round" style="color:var(--gold)">visibility</i> VERIFICA ANTEPRIMA...';
                    if(window.showToast) window.showToast("Il cliente ha firmato! Verifica l'anteprima.", false);
                    openPreviewModal(data.docs, data.signature, appId, date, cog);
                } else {
                    window.twPrivacyState.docs = data.docs;
                    window.twPrivacyState.signature = data.signature;
                    if(window.showToast) window.showToast("Firma acquisita! Salvataggio automatico in corso...", false);
                    window.twPrivacyAction('accetta');
                }
            }
            else if (window.twPrivacyState.isWaitingTablet && (!data || data.status === 'idle' || data.status === 'cancelled' || data.status === 'aborted' || data.status === 'error')) {
                window.twPrivacyState.isWaitingTablet = false;
                hideCursorSpinner();
                tabletRef.off('value', window.twPrivacyState.listenerRef);
                
                if (btn) {
                    btn.innerHTML = '<i class="material-icons-round">tablet_android</i> INVIA A TABLET';
                    btn.disabled = false;
                    btn.style = '';
                }
                
                window.showPrivacyCancelErrorModal("Il cliente ha annullato la firma del documento oppure ha chiuso la schermata sul Tablet.");
            }
            else if (data && data.status === 'idle' && !window.twPrivacyState.isWaitingTablet) {
                hideCursorSpinner();
                if (btn) {
                    btn.innerHTML = '<i class="material-icons-round">tablet_android</i> INVIA A TABLET';
                    btn.disabled = false;
                    btn.style = '';
                }
            }
        });

    }).catch(err => {
        hideCursorSpinner();
        if (btn) { btn.innerHTML = '<i class="material-icons-round">tablet_android</i> INVIA A TABLET'; btn.disabled = false; btn.style.borderColor = 'var(--accent)'; }
    });
};

function showCursorSpinner() {
    if(document.getElementById('tw-cursor-spinner')) return;
    const spinner = document.createElement('div');
    spinner.id = 'tw-cursor-spinner';
    spinner.innerHTML = `<div style="width:28px; height:28px; border:3px solid rgba(56, 189, 248, 0.2); border-top-color:var(--accent); border-radius:50%; animation:spin 0.8s linear infinite; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>`;
    spinner.style.cssText = "position:fixed; pointer-events:none; z-index:999999; margin-top: 15px; margin-left: 15px; transition: opacity 0.2s;";
    document.body.appendChild(spinner);
    window.twPrivacyState.spinnerMove = (e) => { spinner.style.left = e.clientX + 'px'; spinner.style.top = e.clientY + 'px'; };
    document.addEventListener('mousemove', window.twPrivacyState.spinnerMove);
}

function hideCursorSpinner() {
    const s = document.getElementById('tw-cursor-spinner');
    if(s) { s.style.opacity = '0'; setTimeout(() => s.remove(), 200); }
    if(window.twPrivacyState.spinnerMove) document.removeEventListener('mousemove', window.twPrivacyState.spinnerMove);
}

function openPreviewModal(docs, signature, appId, date, cog) {
    if(document.getElementById('tw-privacy-preview-modal')) document.getElementById('tw-privacy-preview-modal').remove();
    
    window.twPrivacyState.docs = docs;
    window.twPrivacyState.signature = signature;

    const modalHtml = `
        <div id="tw-privacy-preview-modal" class="modal-overlay" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.9); z-index:100000; align-items:center; justify-content:center; backdrop-filter:blur(8px);">
            <div style="background:var(--bg-panel); border-radius:16px; width:95%; max-width:700px; height:90vh; display:flex; flex-direction:column; border:1px solid var(--border-line); box-shadow: 0 20px 50px rgba(0,0,0,0.6); overflow:hidden;">
                
                <div style="padding:20px; border-bottom:1px solid var(--border-line); display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.2);">
                    <h2 style="margin:0; font-size:18px; color:var(--accent); display:flex; align-items:center; gap:8px;">
                        <i class="material-icons-round">plagiarism</i> REVISIONE CONTRATTO
                    </h2>
                    <span style="background:var(--bg-body); padding:5px 12px; border-radius:20px; font-size:12px; font-weight:bold; color:var(--text-main);">${cog}</span>
                </div>
                
                <div style="flex:1; overflow-y:auto; padding:20px; background:#fff; color:#0f172a; position:relative;">
                    ${docs[0].content}
                    <div style="margin-top:30px; border-top:2px dashed #cbd5e1; padding-top:20px; text-align:center;">
                        <h4 style="margin:0 0 15px 0; color:#64748b; text-transform:uppercase; font-size:12px;">Firma Acquisita dal Tablet</h4>
                        <img src="${signature}" style="max-width:100%; max-height:200px; border-bottom:2px solid #0f172a; padding-bottom:5px;">
                    </div>
                </div>

                <div style="padding:15px; background:var(--bg-panel); border-top:1px solid var(--border-line); display:flex; gap:10px;">
                    <button class="btn-save" style="flex:1; margin:0; background:rgba(239, 68, 68, 0.1); color:var(--red); border:1px solid rgba(239, 68, 68, 0.3);" onclick="window.twPrivacyAction('elimina')">
                        <i class="material-icons-round">delete</i> ELIMINA
                    </button>
                    <button class="btn-save" style="flex:1; margin:0; background:rgba(251, 191, 36, 0.1); color:var(--gold); border:1px solid rgba(251, 191, 36, 0.3);" onclick="window.twPrivacyAction('rifai')">
                        <i class="material-icons-round">refresh</i> RIFAI
                    </button>
                    <button class="btn-save" id="btnApproveDoc" style="flex:2; margin:0; background:var(--green); color:#fff; border:none;" onclick="window.twPrivacyAction('accetta')">
                        <i class="material-icons-round">check_circle</i> ACCETTA E ARCHIVIA
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.twPrivacyAction = function(action) {
    const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
    const tabletRef = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/device_sync/tablet`);
    const btn = document.querySelector('.btn-outline[onclick*="checkAndSendPrivacy"]');
    
    if (action === 'elimina') {
        window.twPrivacyState.isWaitingTablet = false;
        if(window.twPrivacyState.listenerRef) tabletRef.off('value', window.twPrivacyState.listenerRef);
        tabletRef.update({ status: 'idle' });
        if(document.getElementById('tw-privacy-preview-modal')) document.getElementById('tw-privacy-preview-modal').remove();
        if(btn) { btn.innerHTML = '<i class="material-icons-round">tablet_android</i> INVIA A TABLET'; btn.style.borderColor = 'var(--accent)'; btn.disabled = false; }
        if(window.showToast) window.showToast("Acquisizione firma annullata.");
    } 
    else if (action === 'rifai') {
        window.twPrivacyState.isWaitingTablet = true;
        tabletRef.update({ status: 'pending' });
        if(document.getElementById('tw-privacy-preview-modal')) document.getElementById('tw-privacy-preview-modal').remove();
        showCursorSpinner(); 
        if (btn) { btn.innerHTML = '<i class="material-icons-round">sync</i> IN COMPILAZIONE SUL TABLET...'; }
        if(window.showToast) window.showToast("Rimandato al tablet per una nuova firma.");
    }
    else if (action === 'accetta') {
        window.twPrivacyState.isWaitingTablet = false;
        if(window.twPrivacyState.listenerRef) tabletRef.off('value', window.twPrivacyState.listenerRef);
        
        if(document.getElementById('tw-privacy-preview-modal')) document.getElementById('tw-privacy-preview-modal').remove();
        if(window.showToast) window.showToast("Invio a Drive in background. Puoi tornare a lavorare.", false);
        
        if (btn) {
            btn.innerHTML = '<i class="material-icons-round" style="color:var(--gold);">sync</i> SALVATAGGIO DRIVE...';
            btn.disabled = true;
        }

        let safeDocs = JSON.parse(JSON.stringify(window.twPrivacyState.docs));
        safeDocs.forEach(docObj => {
            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = docObj.content;
            
            let scripts = tempDiv.querySelectorAll('.tw-tracker');
            scripts.forEach(s => s.remove());
            
            let checkboxes = tempDiv.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                let isChecked = cb.hasAttribute('checked') || cb.checked;
                let span = document.createElement('span');
                span.style.fontSize = "16px";
                span.style.fontWeight = "bold";
                span.style.fontFamily = "sans-serif";
                span.innerHTML = isChecked ? '☑ ' : '☐ '; 
                cb.parentNode.replaceChild(span, cb);
            });
            
            docObj.content = tempDiv.innerHTML;
        });

        fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ 
                appId: window.twPrivacyState.appId, 
                image: window.twPrivacyState.signature, 
                now: new Date().toLocaleString('it-IT'),
                docs: safeDocs 
            }),
            redirect: "follow"
        })
        .then(async res => { 
            const textResponse = await res.text();
            try { return JSON.parse(textResponse); } catch(e) { return { url: textResponse }; }
        })
        .then(data => {
            const finalLink = data.url || data.fileUrl || data.link || "";
            if(!finalLink || !finalLink.includes("http")) throw new Error("Errore del server PDF.");
            
            tabletRef.update({ status: 'completed', driveLink: finalLink });
            
            firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/app/${window.twPrivacyState.date}`).once('value').then(appSnap => {
                let dayArr = appSnap.val() || [];
                if(!Array.isArray(dayArr)) dayArr = Object.values(dayArr);
                const idx = dayArr.findIndex(x => x && x.id === window.twPrivacyState.appId);
                if(idx > -1) {
                    dayArr[idx].driveLink = finalLink;
                    firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/app/${window.twPrivacyState.date}`).set(dayArr);
                }
            });

            const saveToCrm = (cId) => {
                const newDocId = 'DOC_' + Date.now();
                const docObj = {
                    dataInserimento: new Date().toLocaleDateString('it-IT'),
                    nomeDoc: window.twPrivacyState.docTitle + ' ' + window.twPrivacyState.date.split('-').reverse().join('/'),
                    link: finalLink
                };
                firebase.database().ref(`MASTER_ADMIN_DB/global_customers/${cId}/docs/${newDocId}`).set(docObj);
            };

            if (window.twPrivacyState.custId) {
                saveToCrm(window.twPrivacyState.custId);
            } else {
                firebase.database().ref('MASTER_ADMIN_DB/global_customers').once('value').then(crmSnap => {
                    const customers = crmSnap.val() || {};
                    for(let k in customers) {
                        if(customers[k].nome && customers[k].nome.toLowerCase() === window.twPrivacyState.cog.toLowerCase()) {
                            saveToCrm(k);
                            break;
                        }
                    }
                });
            }

            if(window.showToast) window.showToast("Contratto archiviato con successo nel CRM!", false);

            if (btn) {
                btn.innerHTML = '<i class="material-icons-round" style="color:var(--green)">check_circle</i> PRIVACY SALVATA';
                btn.style.borderColor = 'var(--green)';
                setTimeout(() => { btn.innerHTML = '<i class="material-icons-round">tablet_android</i> INVIA A TABLET'; btn.disabled = false; btn.style=''; }, 4000);
            }

        }).catch(err => {
            if (btn) {
                btn.innerHTML = '<i class="material-icons-round" style="color:var(--red)">error</i> ERRORE DRIVE';
                btn.style.borderColor = 'var(--red)';
                setTimeout(() => { btn.innerHTML = '<i class="material-icons-round">tablet_android</i> INVIA A TABLET'; btn.disabled = false; btn.style.borderColor = 'var(--accent)'; }, 5000);
            }
        });
    }
};