/* Master_core/Component_Navbar.js - Navigazione Universale, Memoria Data e Pulsanti Dinamici */

(function() {
    function detectRootPath() {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].getAttribute('src') || '';
            if (src.indexOf('Component_Navbar.js') !== -1) {
                return src.split('Master_core/Component_Navbar.js')[0] || './';
            }
        }
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/impostazioni/')) return '../../';
        if (path.includes('/funzioni/') || path.includes('/operatoridisp/') || path.includes('/piscina/')) return '../';
        return './';
    }

    window.twRootPath = detectRootPath();
    
    // ==========================================
    // FIX LOGOUT AUTOMATICO 48 ORE
    // ==========================================
    window.checkGlobalSession = function() {
        var token = localStorage.getItem("tw_token");
        var loginTime = localStorage.getItem("tw_login_timestamp");
        var now = Date.now();
        var expirationTime = 48 * 60 * 60 * 1000; // 48 ore in millisecondi

        if (!token || !loginTime || (now - parseInt(loginTime) > expirationTime)) {
            localStorage.removeItem("tw_token");
            localStorage.removeItem("tw_login_timestamp");
            localStorage.removeItem("tw_user");
            localStorage.removeItem("tw_structure_id");
            window.location.replace(window.twRootPath + "login.html"); 
            return false;
        }
        return true;
    };
    window.checkGlobalSession();

    if (!document.getElementById('tw-page-transition-overlay')) {
        const overlayHtml = `
            <style>
                #tw-page-transition-overlay {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background: #0f172a; z-index: 2147483647;
                    opacity: 1; pointer-events: all;
                    transition: opacity 0.2s ease-out;
                    display: flex; align-items: center; justify-content: center;
                }
                body.tw-loaded #tw-page-transition-overlay { opacity: 0; pointer-events: none; }
            </style>
            <div id="tw-page-transition-overlay"></div>
        `;
        if (document.body) document.body.insertAdjacentHTML('afterbegin', overlayHtml);
        else document.addEventListener('DOMContentLoaded', () => document.body.insertAdjacentHTML('afterbegin', overlayHtml));

        window.addEventListener('load', () => { document.body.classList.add('tw-loaded'); });
        setTimeout(() => { if(document.body) document.body.classList.add('tw-loaded'); }, 150);
    }

    window.twNavigate = function(url) {
        const overlay = document.getElementById('tw-page-transition-overlay');
        if (overlay) {
            document.body.classList.remove('tw-loaded');
            overlay.style.opacity = '1'; overlay.style.pointerEvents = 'all';
            setTimeout(() => { window.location.href = url; }, 200);
        } else window.location.href = url;
    };

    function initNavbar() {
        const navbarContainer = document.getElementById('tw-universal-navbar');
        if (!navbarContainer) return;

        const path = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        const rootPath = window.twRootPath;
        
        let activePage = 'agenda';
        if (path.includes('anagrafica')) activePage = 'crm';
        else if (path.includes('operatoridisp')) activePage = 'operatori';
        else if (path.includes('lista')) activePage = 'lista';
        else if (search.includes('view=radar')) activePage = 'radar';
        else if (path.includes('piscina')) activePage = 'spa';
        else if (path.includes('chat')) activePage = 'chat';
        else if (path.includes('impostazioni.html') || path.includes('gestione.html')) activePage = 'impostazioni';
        else if (path.includes('planning_turni')) activePage = 'turni';

        const makeBtn = (id, icon, text, link, customActiveStyle = null) => {
            const isActive = activePage === id;
            let finalClass = "nav-btn" + (isActive ? " btn-main" : "");
            let finalStyle = isActive ? (customActiveStyle ? customActiveStyle.bg : "background: rgba(56, 189, 248, 0.1); border-color: rgba(56, 189, 248, 0.5); color: #fff;") : "";
            let iconStyle = isActive ? (customActiveStyle ? customActiveStyle.icon : "color: var(--accent);") : "";
            return `<button type="button" class="${finalClass}" style="${finalStyle}" onclick="window.twNavigate('${rootPath}${link}')"><i class="material-icons-round" style="${iconStyle}">${icon}</i> <span>${text}</span></button>`;
        };

        const purpleStyle = { bg: "background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.5); color: #fff;", icon: "color: var(--purple);" };

        let chatClass = activePage === 'chat' ? 'chat-btn active' : 'chat-btn';
        let chatBtnHTML = `<button type="button" class="${chatClass}" title="Comunicazioni" onclick="window.twNavigate('${rootPath}Funzioni/chat.html')"><i class="material-icons-round">forum</i></button>`;

        const pageTitles = { 'crm': 'ANAGRAFICA', 'lista': 'LISTA APPUNTAMENTI', 'radar': 'RICERCA POSTO', 'spa': 'GESTIONE SPA', 'chat': 'COMUNICAZIONI', 'impostazioni': 'IMPOSTAZIONI GENERALI', 'turni': 'PLANNING STAFF', 'operatori': 'OPERATORI' };

        let centerContent = "";
        if (activePage === 'agenda' || activePage === 'operatori' || activePage === 'spa') {
            centerContent = `
                <div id="mainDateControls">
                    <button type="button" class="btn-arrow" onclick="window.sysChangeDate(-1)"><i class="material-icons-round">chevron_left</i></button>
                    <div class="date-selector-pro" onclick="if(typeof window.sysOpenCustomCalendar === 'function') window.sysOpenCustomCalendar('mainDate', 'fakeDateText')">
                        <i class="material-icons-round">calendar_today</i><span id="fakeDateText">Oggi</span>
                        <input type="hidden" id="mainDate" onchange="window.sysUpdateFakeDate(); if(typeof window.render === 'function') window.render(); if(typeof window.renderOperatori === 'function') window.renderOperatori(); if(typeof window.sysCheckIfTodayAndCenter === 'function') window.sysCheckIfTodayAndCenter();">
                    </div>
                    <button type="button" class="btn-arrow" onclick="window.sysChangeDate(1)"><i class="material-icons-round">chevron_right</i></button>
                </div>
            `;
        } else {
            centerContent = `<div style="font-weight:900; font-size:16px; letter-spacing:1px; color:var(--accent); text-transform:uppercase; display:flex; align-items:center; gap:8px;"><i class="material-icons-round" style="font-size:20px;">${activePage==='turni'?'view_week':(activePage==='impostazioni'?'settings':(activePage==='crm'?'contact_page':'spa'))}</i> ${pageTitles[activePage] || 'TOUCH WELNESS'}</div>`;
        }

        // ==========================================
        // FIX ERRORE 404 (Maiuscole / Minuscole / Percorsi)
        // ==========================================
        const html = `
            <style>
                .tw-navbar-uni { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 100%); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(56, 189, 248, 0.2); padding: 10px 15px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.6); z-index: 1000; flex-shrink: 0; gap: 15px; }
                .tw-navbar-uni .nav-wing { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
                .tw-navbar-uni .left-wing { justify-content: flex-start; } .tw-navbar-uni .right-wing { justify-content: flex-end; }
                .tw-navbar-uni .nav-btn { flex: 1 1 0; min-width: 0; background: rgba(15, 23, 42, 0.4); color: var(--text-main); border: 1px solid rgba(255,255,255,0.05); padding: 10px 8px; border-radius: 8px; font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: 0.2s; text-transform: uppercase; }
                .tw-navbar-uni .nav-btn span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
                .tw-navbar-uni .nav-btn i { font-size: 16px; color: var(--text-muted); transition: 0.2s; flex-shrink: 0; }
                .tw-navbar-uni .nav-btn:hover { background: rgba(30, 41, 59, 0.8); border-color: rgba(56, 189, 248, 0.6); color: #fff; transform: translateY(-2px); }
                .tw-navbar-uni .nav-btn:hover i { color: var(--accent); }
                .tw-navbar-uni .nav-btn.btn-main { background: rgba(56, 189, 248, 0.1); border-color: rgba(56, 189, 248, 0.5); color: #fff; }
                .tw-navbar-uni .nav-btn.btn-main i { color: var(--accent); }
                .tw-navbar-uni .nav-center { display: flex; align-items: center; justify-content: center; flex: 0 1 auto; min-width: max-content; }
                .tw-navbar-uni #mainDateControls { display: flex; align-items: stretch; background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 4px; overflow: hidden; height: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
                .tw-navbar-uni .btn-arrow { background: rgba(0,0,0,0.2); border: none; color: var(--text-muted); cursor: pointer; padding: 0 12px; transition: 0.2s; font-size:24px; display:flex; align-items:center; justify-content:center; }
                .tw-navbar-uni .btn-arrow:hover { color: var(--accent); background: rgba(56, 189, 248, 0.1); }
                .tw-navbar-uni .date-selector-pro { display: flex; align-items: center; justify-content: center; gap: 8px; background: transparent; padding: 0 20px; cursor: pointer; transition: 0.2s; border-radius: 0; border:none; color:var(--text-main); font-weight:900;}
                .tw-navbar-uni .date-selector-pro span { font-size: 14px; white-space: nowrap; letter-spacing: 0.5px; min-width: 95px; text-align: center; display: inline-block; }
                .tw-navbar-uni .date-selector-pro i { font-size: 18px; color: var(--accent); }
                .tw-navbar-uni .chat-btn { width: 40px; height: 40px; flex: none; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
                .tw-navbar-uni .chat-btn { border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.1); } .tw-navbar-uni .chat-btn i { color: var(--accent); font-size: 20px; transition: 0.2s; }
                .tw-navbar-uni .chat-btn:hover, .tw-navbar-uni .chat-btn.active { background: var(--accent); transform: translateY(-2px); box-shadow: 0 4px 10px rgba(56, 189, 248, 0.4); } .tw-navbar-uni .chat-btn:hover i, .tw-navbar-uni .chat-btn.active i { color: #0f172a; }
                @media (max-width: 768px) { .tw-navbar-uni .nav-wing { display: none; } }
            </style>
            <div class="tw-navbar-uni">
                <div class="nav-wing left-wing">
                    ${makeBtn('crm', 'contact_page', 'CRM', 'Anagrafica.html')}
                    ${makeBtn('lista', 'view_list', 'LISTA', 'Lista.html')}
                    ${makeBtn('operatori', 'groups', 'OPERATORI', 'Funzioni/OperatoriDisp/index.html', purpleStyle)}
                    ${makeBtn('agenda', 'calendar_today', 'APPUNTAMENTI', 'index.html')}
                </div>
                <div class="nav-center">${centerContent}</div>
                <div class="nav-wing right-wing">
                    ${makeBtn('spa', 'pool', 'SPA', 'Piscina/Piscina_GUI.html')}
                    ${makeBtn('turni', 'view_week', 'TURNI', 'Planning_Turni.html')}
                    ${makeBtn('impostazioni', 'settings', 'IMPOSTAZIONI', 'Impostazioni/impostazioni.html')} 
                    ${chatBtnHTML}
                </div>
            </div>
        `;
        
        navbarContainer.innerHTML = html;
        const dEl = document.getElementById("mainDate");
        if (dEl && !dEl.value) {
            const savedDate = sessionStorage.getItem('tw_current_date');
            if (savedDate) {
                dEl.value = savedDate;
            } else {
                const now = new Date();
                dEl.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            }
        }
        if (typeof window.sysUpdateFakeDate === 'function') window.sysUpdateFakeDate();
    }

    window.sysUpdateFakeDate = function() {
        const dEl = document.getElementById("mainDate");
        const fEl = document.getElementById("fakeDateText");
        if(dEl && dEl.value) {
            sessionStorage.setItem('tw_current_date', dEl.value); 
            if(fEl) {
                const parts = dEl.value.split('-');
                if(parts.length === 3) {
                    const today = new Date();
                    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                    fEl.innerText = (dEl.value === todayStr) ? "Oggi" : `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }
        }
    };

    window.sysChangeDate = function(offset) {
        const dEl = document.getElementById("mainDate");
        if(!dEl) return;
        let current = dEl.value ? new Date(Number(dEl.value.split('-')[0]), Number(dEl.value.split('-')[1]) - 1, Number(dEl.value.split('-')[2])) : new Date();
        current.setDate(current.getDate() + offset);
        dEl.value = current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0') + '-' + String(current.getDate()).padStart(2, '0');
        window.sysUpdateFakeDate();
        if(typeof window.render === 'function') window.render();
        if(typeof window.renderOperatori === 'function') window.renderOperatori();
        if(typeof window.sysCheckIfTodayAndCenter === 'function') window.sysCheckIfTodayAndCenter();
    };

    initNavbar();
})();
