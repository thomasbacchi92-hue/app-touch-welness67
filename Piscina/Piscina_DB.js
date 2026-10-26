/* Piscina/Piscina_DB.js - Database Manager (Con Limiti Capienza) */

const fbConfigPool = {
    apiKey: "AIzaSyCrDuK7SWHdbzrJR-pNpxmRwGnZgV2Dd2Y",
    authDomain: "touch-welness-massage.firebaseapp.com",
    databaseURL: "https://touch-welness-massage-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "touch-welness-massage",
    storageBucket: "touch-welness-massage.firebasestorage.app"
};

if (!firebase.apps.length) firebase.initializeApp(fbConfigPool);

const currentStructureId = localStorage.getItem("tw_structure_id");
if (!currentStructureId) {
    window.location.href = "../login.html";
    throw new Error("Accesso Negato: ID Struttura mancante"); 
}

const poolRef = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + currentStructureId + '/piscina_db_v1');
const settingsRef = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + currentStructureId + '/settings/orari_moduli');

window.poolData = {};
window.dbOrari = { piscina: {}, spa: {}, campi: { pax: true, cog: true, note: true }, regole: { preset: 'Piscina', confirm_del: true, soglia_att: 0, soglia_full: 0 } };

window.initDB = function() {
    poolRef.on('value', snapshot => {
        window.poolData = snapshot.val() || {};
        if(typeof window.loadPoolData === "function") window.loadPoolData();
    });

    settingsRef.on('value', snap => {
        const val = snap.val() || {};
        window.dbOrari.piscina = val.piscina || window.buildDefaultOrari();
        window.dbOrari.spa = val.spa || window.buildDefaultOrari();
        window.dbOrari.campi = val.campi || { pax: true, cog: true, note: true };
        window.dbOrari.regole = val.regole || { preset: 'Piscina', confirm_del: true, soglia_att: 0, soglia_full: 0 };
        
        if(typeof window.applyFieldVisibility === "function") window.applyFieldVisibility();
        if(typeof window.loadPoolData === "function") window.loadPoolData();
    });
};

window.buildDefaultOrari = function() {
    let obj = {};
    for(let i=1; i<=7; i++) obj[i] = { active: true, tipo: 'continuato', m_in: "10:00", m_out: "19:00", p_in: "", p_out: "" };
    return obj;
};

window.savePoolEntry = function(date, entry, isFullUpdate = false) {
    if (!window.poolData) window.poolData = {};
    if (!window.poolData[date]) window.poolData[date] = [];

    if (!isFullUpdate && entry) window.poolData[date].push(entry);

    poolRef.child(date).set(window.poolData[date]).then(() => {
        if(typeof window.loadPoolData === "function") window.loadPoolData();
    }).catch(err => console.error("Errore salvataggio Cloud:", err));
};

window.removePoolEntry = function(date, id) {
    if(window.poolData[date]) {
        window.poolData[date] = window.poolData[date].filter(x => x.id !== id);
        poolRef.child(date).set(window.poolData[date]).then(() => {
            if(typeof window.loadPoolData === "function") window.loadPoolData();
        });
    }
};