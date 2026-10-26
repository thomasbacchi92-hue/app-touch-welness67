/* Piscina/Piscina_Backup.js - Export Excel Ordinato Cronologicamente */

window.exportSimpleExcel = function() {
    const d = document.getElementById("mainDate") ? document.getElementById("mainDate").value : new Date().toISOString().split('T')[0];
    let list = window.poolData && window.poolData[d] ? [...window.poolData[d]] : [];
    
    if(list.length === 0) {
        if(typeof window.showBlueToast === 'function') window.showBlueToast("Nessun dato da esportare per questa data.", true);
        else alert("Nessun dato da esportare per oggi.");
        return;
    }

    // Ordinamento cronologico rigoroso
    list.sort((a,b) => (a.ora || "").localeCompare(b.ora || ""));

    let csv = "ORA;N. CAMERA;NOME E COGNOME;PAX;SETTORE;NOTE;CHECK-IN\n";
    
    list.forEach(row => {
        const ora = (row.ora || "").toString().replace(/;/g, ":");
        const cam = (row.cam || "").toString().replace(/;/g, "");
        const cog = (row.cog || "").toString().replace(/;/g, " ");
        const pax = (row.pers || "1").toString().replace(/;/g, "");
        const area = (row.area || "").toString().replace(/;/g, "");
        const note = (row.note || "").toString().replace(/;/g, " ");
        const check = row.checked ? "SI" : "NO";
        
        csv += `${ora};${cam};${cog};${pax};${area};${note};${check}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Accessi_SPA_${d}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
};