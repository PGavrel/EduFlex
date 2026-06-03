/* ==========================================================================
   EDUFLEX - MAIN APPLICATION (app.js)
   Single Page Application with Auth Flow & Role-Based Routing
   ========================================================================== */

// ─── STATE MANAGEMENT ────────────────────────────────────────────────────────
const DEFAULT_STATE = {
    role: 'visitor',        // visitor | student | parent | teacher | admin
    username: '',
    currentTab: 'accueil',
    theme: 'light',
    fontSize: 'medium',
    dyslexicMode: false,
    mood: null,
    ttsActive: false
};

function loadState() {
    try {
        const saved = localStorage.getItem('eduflex_state');
        return saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : { ...DEFAULT_STATE };
    } catch { return { ...DEFAULT_STATE }; }
}

function saveState() {
    localStorage.setItem('eduflex_state', JSON.stringify(APP));
}

let APP = loadState();

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function navigateTo(tab) {
    APP.currentTab = tab;
    saveState();
    renderApp();
}

// ─── TOAST NOTIFICATIONS ─────────────────────────────────────────────────────
function showToast(message, type = 'primary') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : type === 'warning' ? 'alert-triangle' : type === 'danger' ? 'x-circle' : 'info'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons({ nodes: [toast] });
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 3500);
}

// ─── CONFETTI CELEBRATION ────────────────────────────────────────────────────
function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 5, h: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * 3 + 2, angle: Math.random() * 360, spin: Math.random() * 0.2 - 0.1
        });
    }
    let frame = 0;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.y += p.speed; p.angle += p.spin;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
            ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });
        frame++;
        if (frame < 180) requestAnimationFrame(animate);
        else canvas.remove();
    }
    animate();
}

// ─── THEME & ACCESSIBILITY ───────────────────────────────────────────────────
function setTheme(theme) {
    APP.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    saveState();
}

function setFontSize(size) {
    APP.fontSize = size;
    document.documentElement.setAttribute('data-font-size', size);
    saveState();
}

function toggleDyslexicMode() {
    APP.dyslexicMode = !APP.dyslexicMode;
    document.body.classList.toggle('dyslexic-mode', APP.dyslexicMode);
    saveState();
    showToast(APP.dyslexicMode ? 'Mode dyslexie activé' : 'Mode dyslexie désactivé', 'primary');
}

// ─── TEXT TO SPEECH ──────────────────────────────────────────────────────────
function toggleTTS() {
    if (APP.ttsActive) {
        speechSynthesis.cancel();
        APP.ttsActive = false;
    } else {
        const textContent = document.querySelector('.main-content')?.innerText || '';
        if (textContent && speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(textContent.substring(0, 2000));
            utterance.lang = 'fr-FR'; utterance.rate = 0.9;
            utterance.onend = () => { APP.ttsActive = false; saveState(); renderApp(); };
            speechSynthesis.speak(utterance);
            APP.ttsActive = true;
        }
    }
    saveState();
    renderApp();
}

// ─── AUTH FUNCTIONS ──────────────────────────────────────────────────────────
function loginAs(role, username) {
    APP.role = role;
    APP.username = username;
    APP.currentTab = 'dashboard';
    saveState();
    showToast(`Bienvenue ${username} ! Connexion réussie.`, 'success');
    launchConfetti();
    renderApp();
}

// ─── LOGOUT FUNCTION ─────────────────────────────────────────────────────────
function logout() {
    APP.role = 'visitor';
    APP.username = '';
    APP.currentTab = 'accueil';
    APP.mood = null;
    speechSynthesis.cancel();
    APP.ttsActive = false;
    saveState();
    showToast('Déconnexion réussie. À bientôt !', 'primary');
    renderApp();
}

// ─── NAV ITEMS PER ROLE ──────────────────────────────────────────────────────
function getNavItems() {
    const common = [
        { id: 'dashboard', label: 'Tableau de bord', icon: 'layout-dashboard' }
    ];
    switch (APP.role) {
        case 'student': return [
            ...common,
            { id: 'cours', label: 'Mes Cours', icon: 'book-open' },
            { id: 'ia-assistant', label: 'Assistant IA', icon: 'bot' },
            { id: 'live', label: 'Sessions Live', icon: 'video' },
            { id: 'communaute', label: 'Communauté', icon: 'users' },
            { id: 'bienetre', label: 'Bien-être', icon: 'heart' },
            { id: 'whiteboard', label: 'Tableau Blanc', icon: 'pen-tool' }
        ];
        case 'parent': return [
            ...common,
            { id: 'suivi', label: 'Suivi Enfant', icon: 'bar-chart-3' },
            { id: 'messages', label: 'Messages', icon: 'mail' },
            { id: 'facturation', label: 'Facturation', icon: 'credit-card' }
        ];
        case 'teacher': return [
            ...common,
            { id: 'mes-eleves', label: 'Mes Élèves', icon: 'users' },
            { id: 'contenus', label: 'Contenus', icon: 'file-text' },
            { id: 'planning', label: 'Planning', icon: 'calendar' },
            { id: 'messages', label: 'Messages', icon: 'mail' }
        ];
        case 'admin': return [
            ...common,
            { id: 'utilisateurs', label: 'Utilisateurs', icon: 'users' },
            { id: 'statistiques', label: 'Statistiques', icon: 'bar-chart-3' },
            { id: 'configuration', label: 'Configuration', icon: 'settings' }
        ];
        default: return [];
    }
}

// ─── SIDEBAR RENDERING ──────────────────────────────────────────────────────
function renderSidebar() {
    const sidebar = document.getElementById('sidebar-nav');
    if (APP.role === 'visitor') {
        sidebar.innerHTML = '';
        sidebar.style.display = 'none';
        document.querySelector('.main-layout').style.marginLeft = '0';
        return;
    }
    sidebar.style.display = '';
    document.querySelector('.main-layout').style.marginLeft = '';
    const navItems = getNavItems();
    const roleLabels = { student: 'Élève', parent: 'Parent', teacher: 'Enseignant', admin: 'Administrateur' };

    sidebar.innerHTML = `
        <div class="sidebar-logo">
            <div class="logo-icon"><i data-lucide="graduation-cap" style="width:22px;height:22px"></i></div>
            <span class="logo-text">EduFlex</span>
        </div>
        <ul class="nav-links">
            ${navItems.map(item => `
                <li class="nav-item ${APP.currentTab === item.id ? 'active' : ''}">
                    <a href="#" onclick="navigateTo('${item.id}'); return false;" id="nav-${item.id}">
                        <i data-lucide="${item.icon}" style="width:20px;height:20px"></i>
                        <span>${item.label}</span>
                    </a>
                </li>
            `).join('')}
        </ul>
        <div class="sidebar-footer">
            <div class="user-profile-summary" onclick="logout()">
                <div class="user-avatar" style="background:linear-gradient(135deg,var(--color-primary),var(--color-success));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:1rem;border:none;">
                    ${APP.username.charAt(0).toUpperCase()}
                </div>
                <div class="user-info-text">
                    <span class="user-name">${APP.username}</span>
                    <span class="user-role">${roleLabels[APP.role] || APP.role}</span>
                </div>
                <i data-lucide="log-out" style="width:18px;height:18px;margin-left:auto;color:var(--text-muted)"></i>
            </div>
        </div>
    `;
}

// ─── HEADER RENDERING ────────────────────────────────────────────────────────
function renderHeader() {
    const header = document.getElementById('global-header');
    if (APP.role === 'visitor') {
        header.innerHTML = `
            <div class="sidebar-logo" style="cursor:pointer" onclick="navigateTo('accueil')">
                <div class="logo-icon"><i data-lucide="graduation-cap" style="width:22px;height:22px"></i></div>
                <span class="logo-text">EduFlex</span>
            </div>
            <div class="header-actions">
                <button class="btn btn-secondary btn-sm" onclick="navigateTo('connexion')">
                    <i data-lucide="log-in" style="width:16px;height:16px"></i> Connexion
                </button>
                <button class="btn btn-primary btn-sm" onclick="navigateTo('inscription')">
                    <i data-lucide="user-plus" style="width:16px;height:16px"></i> Inscription
                </button>
            </div>
        `;
        return;
    }
    const themeIcons = { light: 'sun', dark: 'moon', 'high-contrast': 'eye' };
    const nextTheme = APP.theme === 'light' ? 'dark' : APP.theme === 'dark' ? 'high-contrast' : 'light';
    header.innerHTML = `
        <div class="search-bar-container">
            <i data-lucide="search" style="width:18px;height:18px;color:var(--text-muted)"></i>
            <input class="search-input" type="text" placeholder="Rechercher un cours, un sujet..." id="global-search">
        </div>
        <div class="header-actions">
            <div class="quick-accessibility-menu">
                <button class="icon-btn ${APP.ttsActive ? 'active' : ''}" onclick="toggleTTS()" title="Lecture vocale">
                    <i data-lucide="${APP.ttsActive ? 'volume-x' : 'volume-2'}" style="width:18px;height:18px"></i>
                </button>
                <button class="icon-btn ${APP.dyslexicMode ? 'active' : ''}" onclick="toggleDyslexicMode()" title="Mode dyslexie">
                    <i data-lucide="type" style="width:18px;height:18px"></i>
                </button>
                <button class="icon-btn" onclick="setTheme('${nextTheme}')" title="Thème: ${nextTheme}">
                    <i data-lucide="${themeIcons[APP.theme]}" style="width:18px;height:18px"></i>
                </button>
            </div>
            <button class="icon-btn" title="Notifications" onclick="showToast('Aucune nouvelle notification', 'primary')">
                <i data-lucide="bell" style="width:18px;height:18px"></i>
            </button>
        </div>
    `;
}

// ─── CHATBOT WIDGET ──────────────────────────────────────────────────────────
function renderChatbotWidget() {
    const container = document.getElementById('floating-chatbot');
    if (APP.role === 'visitor') { container.innerHTML = ''; return; }
    container.innerHTML = `
        <button class="chatbot-widget-btn" onclick="toggleChatPopup()" id="chatbot-toggle-btn">
            <i data-lucide="message-circle" style="width:26px;height:26px"></i>
        </button>
        <div class="chatbot-popup-window" id="chatbot-popup">
            <div class="ia-chat-header">
                <div class="ia-chat-botinfo">
                    <div class="ia-avatar"><i data-lucide="bot" style="width:22px;height:22px"></i></div>
                    <div><strong>FlexBot</strong><br><small style="color:var(--text-secondary)">IA pédagogique</small></div>
                </div>
                <button class="icon-btn" onclick="toggleChatPopup()"><i data-lucide="x" style="width:16px;height:16px"></i></button>
            </div>
            <div class="ia-messages-container" id="chatbot-messages">
                <div class="chat-bubble-wrapper ia">
                    <div class="ia-avatar" style="width:32px;height:32px;min-width:32px"><i data-lucide="bot" style="width:16px;height:16px"></i></div>
                    <div class="chat-bubble">Salut ${APP.username} ! 👋 Comment puis-je t'aider aujourd'hui ?</div>
                </div>
            </div>
            <div class="chat-input-bar">
                <input type="text" class="chat-input-field" placeholder="Pose ta question..." id="chatbot-input" onkeydown="if(event.key==='Enter') sendChatMessage()">
                <button class="btn btn-primary btn-sm" onclick="sendChatMessage()"><i data-lucide="send" style="width:16px;height:16px"></i></button>
            </div>
        </div>
    `;
}

function toggleChatPopup() {
    const popup = document.getElementById('chatbot-popup');
    if (popup) popup.classList.toggle('active');
}

function sendChatMessage() {
    const input = document.getElementById('chatbot-input');
    const msgContainer = document.getElementById('chatbot-messages');
    if (!input || !input.value.trim()) return;
    const userMsg = input.value.trim();
    input.value = '';
    // User bubble
    msgContainer.innerHTML += `
        <div class="chat-bubble-wrapper student">
            <div class="chat-bubble">${userMsg}</div>
        </div>
    `;
    // Bot response (simulated)
    const responses = [
        "C'est une excellente question ! Laisse-moi réfléchir... 🤔 Je te recommande de revoir le chapitre 3 de ton cours de maths pour bien comprendre ce concept.",
        "Je suis là pour t'aider ! 💪 N'hésite pas à me poser d'autres questions.",
        "Voici un conseil : essaie de diviser le problème en petites étapes. Ça te semblera beaucoup plus simple ! 🎯",
        "Bonne approche ! Continue comme ça, tu es sur la bonne voie ! 🌟",
        "Je comprends que ça puisse sembler compliqué. Prends une passe et reviens-y ensuite, tu verras la différence ! ☕"
    ];
    setTimeout(() => {
        const botResp = responses[Math.floor(Math.random() * responses.length)];
        msgContainer.innerHTML += `
            <div class="chat-bubble-wrapper ia">
                <div class="ia-avatar" style="width:32px;height:32px;min-width:32px"><i data-lucide="bot" style="width:16px;height:16px"></i></div>
                <div class="chat-bubble">${botResp}</div>
            </div>
        `;
        msgContainer.scrollTop = msgContainer.scrollHeight;
        lucide.createIcons({ nodes: [msgContainer] });
    }, 800);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

// ─── PAGE: ACCUEIL (PUBLIC LANDING) ──────────────────────────────────────────
function renderLandingPage() {
    return `
    <div class="fade-in-up">
        <!-- Hero Section -->
        <section class="landing-hero">
            <div class="hero-content">
                <div class="hero-tagline"><i data-lucide="sparkles" style="width:16px;height:16px"></i> L'école réinventée</div>
                <h1 class="hero-title">Apprendre autrement,<br><span>à son rythme</span></h1>
                <p class="hero-desc">EduFlex réconcilie les élèves de 11 à 25 ans avec l'école grâce à un environnement flexible, un accompagnement humain et une IA pédagogique disponible 24h/24.</p>
                <div class="hero-actions">
                    <button class="btn btn-primary" onclick="navigateTo('inscription')"><i data-lucide="rocket" style="width:18px;height:18px"></i> Commencer gratuitement</button>
                    <button class="btn btn-secondary" onclick="navigateTo('connexion')"><i data-lucide="play-circle" style="width:18px;height:18px"></i> Découvrir la plateforme</button>
                </div>
            </div>
            <div class="hero-image-container">
                <div class="hero-img-mock" style="height:320px;background:linear-gradient(135deg, #eff6ff 0%, #ecfdf5 50%, #fffbeb 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
                    <i data-lucide="graduation-cap" style="width:80px;height:80px;color:var(--color-primary);opacity:0.6"></i>
                    <span style="font-weight:700;font-size:1.4rem;color:var(--color-primary)">EduFlex</span>
                    <span style="color:var(--text-secondary);font-size:0.9rem">Plateforme éducative hybride</span>
                </div>
                <div class="hero-stats-badge">
                    <div class="hero-stats-num">97%</div>
                    <div class="hero-stats-text">de satisfaction<br>élèves & parents</div>
                </div>
            </div>
        </section>

        <!-- Key Features -->
        <h2 class="section-title">Pourquoi choisir <span style="background:linear-gradient(135deg,var(--color-primary),var(--color-success));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">EduFlex</span> ?</h2>
        <p class="section-subtitle">Une approche pédagogique unique, pensée pour les élèves aux parcours atypiques.</p>
        <div class="grid-3" style="margin-bottom:80px">
            ${[
            { icon: 'brain', title: 'IA Pédagogique', desc: 'Un assistant intelligent disponible 24h/24 pour expliquer, guider et accompagner chaque élève.', color: 'var(--color-primary)' },
            { icon: 'users', title: 'Enseignants certifiés', desc: "Des professeurs de l'Éducation Nationale assurent un suivi personnalisé et bienveillant.", color: 'var(--color-success)' },
            { icon: 'calendar', title: 'Emploi du temps flexible', desc: 'Cours en direct et en replay, avec un planning adapté au rythme de chaque élève.', color: 'var(--color-warning)' },
            { icon: 'shield', title: 'Espace sécurisé', desc: 'Un environnement numérique bienveillant, sans jugement, avec modération active.', color: 'var(--color-primary)' },
            { icon: 'heart', title: 'Bien-être intégré', desc: 'Suivi émotionnel, exercices de relaxation et accès à des psychologues scolaires.', color: '#ec4899' },
            { icon: 'trophy', title: 'Gamification', desc: 'Badges, récompenses et progression visible pour maintenir la motivation.', color: 'var(--color-warning)' }
        ].map(f => `
                <div class="card card-premium" style="text-align:center;padding:32px">
                    <div style="width:56px;height:56px;border-radius:var(--border-radius-md);background:${f.color}15;color:${f.color};display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
                        <i data-lucide="${f.icon}" style="width:28px;height:28px"></i>
                    </div>
                    <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:12px">${f.title}</h3>
                    <p style="color:var(--text-secondary);font-size:0.9rem">${f.desc}</p>
                </div>
            `).join('')}
        </div>

        <!-- Pricing -->
        <h2 class="section-title">Tarifs transparents</h2>
        <p class="section-subtitle">Des formules adaptées à chaque besoin, sans engagement.</p>
        <div class="pricing-cards-grid" style="margin-bottom:80px">
            ${[
            { name: 'Essentiel', price: '29', period: '/mois', features: ['Cours en replay illimités', 'Assistant IA 24h/24', 'Exercices interactifs', 'Suivi de progression'], popular: false },
            { name: 'Accompagné', price: '67', period: '/mois', features: ['Tout Essentiel +', '2h de tutorat/semaine', 'Sessions live illimitées', 'Suivi parental détaillé', 'Psychologue scolaire'], popular: true },
            { name: 'Sur-mesure', price: '99', period: '/mois', features: ['Tout Accompagné +', '5h de tutorat/semaine', 'Programme personnalisé', 'Coaching orientation', 'Support prioritaire'], popular: false }
        ].map(p => `
                <div class="pricing-card ${p.popular ? 'popular' : ''}">
                    <h3 style="font-size:1.1rem;font-weight:700">${p.name}</h3>
                    <div class="price-val">${p.price}€<span>${p.period}</span></div>
                    <ul>${p.features.map(f => `<li><i data-lucide="check" style="width:16px;height:16px"></i>${f}</li>`).join('')}</ul>
                    <button class="btn ${p.popular ? 'btn-primary' : 'btn-secondary'}" onclick="navigateTo('inscription')">${p.popular ? 'Commencer maintenant' : 'Choisir'}</button>
                </div>
            `).join('')}
        </div>

        <!-- Footer CTA -->
        <div style="text-align:center;padding:60px 0;background:linear-gradient(135deg,var(--color-primary-light),var(--color-success-light));border-radius:var(--border-radius-lg);margin-bottom:40px">
            <h2 style="font-size:2rem;font-weight:800;margin-bottom:16px">Prêt à rejoindre EduFlex ?</h2>
            <p style="color:var(--text-secondary);margin-bottom:32px;max-width:500px;margin-left:auto;margin-right:auto">Essai gratuit de 14 jours, sans engagement. Rejoignez des centaines de familles qui ont déjà fait confiance à EduFlex.</p>
            <button class="btn btn-primary" onclick="navigateTo('inscription')"><i data-lucide="rocket" style="width:18px;height:18px"></i> Essai gratuit 14 jours</button>
        </div>
    </div>
    `;
}

// ─── PAGE: CONNEXION ─────────────────────────────────────────────────────────
function renderLoginPage() {
    return `
    <div class="fade-in-up" style="max-width:460px;margin:40px auto">
        <div class="card" style="padding:40px">
            <div style="text-align:center;margin-bottom:32px">
                <div style="width:64px;height:64px;border-radius:var(--border-radius-md);background:linear-gradient(135deg,var(--color-primary),var(--color-success));display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:white">
                    <i data-lucide="log-in" style="width:30px;height:30px"></i>
                </div>
                <h1 style="font-size:1.6rem;font-weight:800;margin-bottom:8px">Connexion</h1>
                <p style="color:var(--text-secondary)">Accédez à votre espace EduFlex</p>
            </div>
            <form onsubmit="handleLogin(event)" id="login-form">
                <div style="margin-bottom:20px">
                    <label style="font-weight:600;font-size:0.9rem;display:block;margin-bottom:6px">Adresse e-mail</label>
                    <input type="email" class="chat-input-field" style="width:100%;padding:14px 18px" placeholder="votre@email.com" id="login-email" required>
                </div>
                <div style="margin-bottom:20px">
                    <label style="font-weight:600;font-size:0.9rem;display:block;margin-bottom:6px">Mot de passe</label>
                    <input type="password" class="chat-input-field" style="width:100%;padding:14px 18px" placeholder="••••••••" id="login-password" required>
                </div>
                <div style="margin-bottom:24px">
                    <label style="font-weight:600;font-size:0.9rem;display:block;margin-bottom:8px">Je suis :</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" id="login-role-grid">
                        ${['student', 'parent', 'teacher', 'admin'].map((r, i) => {
        const labels = { student: '🎓 Élève', parent: '👨‍👩‍👧 Parent', teacher: '📚 Enseignant', admin: '⚙️ Admin' };
        return `<button type="button" class="btn btn-secondary btn-sm login-role-btn ${i === 0 ? 'active-role' : ''}" data-role="${r}" onclick="selectLoginRole('${r}', this)" style="justify-content:center">${labels[r]}</button>`;
    }).join('')}
                    </div>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;padding:16px"><i data-lucide="arrow-right" style="width:18px;height:18px"></i> Se connecter</button>
            </form>
            <p style="text-align:center;margin-top:24px;color:var(--text-secondary);font-size:0.9rem">
                Pas encore de compte ? <a href="#" onclick="navigateTo('inscription'); return false;" style="font-weight:600">Créer un compte</a>
            </p>
        </div>
    </div>
    `;
}

let selectedLoginRole = 'student';
function selectLoginRole(role, btn) {
    selectedLoginRole = role;
    document.querySelectorAll('.login-role-btn').forEach(b => b.classList.remove('active-role'));
    btn.classList.add('active-role');
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const name = email.split('@')[0];
    loginAs(selectedLoginRole, name);
}

// ─── PAGE: INSCRIPTION ──────────────────────────────────────────────────────
function renderRegisterPage() {
    return `
    <div class="fade-in-up" style="max-width:520px;margin:40px auto">
        <div class="card" style="padding:40px">
            <div style="text-align:center;margin-bottom:32px">
                <div style="width:64px;height:64px;border-radius:var(--border-radius-md);background:linear-gradient(135deg,var(--color-primary),var(--color-success));display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:white">
                    <i data-lucide="user-plus" style="width:30px;height:30px"></i>
                </div>
                <h1 style="font-size:1.6rem;font-weight:800;margin-bottom:8px">Créer un compte</h1>
                <p style="color:var(--text-secondary)">Rejoignez la communauté EduFlex</p>
            </div>
            <form onsubmit="handleRegister(event)" id="register-form">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
                    <div>
                        <label style="font-weight:600;font-size:0.9rem;display:block;margin-bottom:6px">Prénom</label>
                        <input type="text" class="chat-input-field" style="width:100%;padding:14px 18px" placeholder="Prénom" id="reg-prenom" required>
                    </div>
                    <div>
                        <label style="font-weight:600;font-size:0.9rem;display:block;margin-bottom:6px">Nom</label>
                        <input type="text" class="chat-input-field" style="width:100%;padding:14px 18px" placeholder="Nom" id="reg-nom" required>
                    </div>
                </div>
                <div style="margin-bottom:20px">
                    <label style="font-weight:600;font-size:0.9rem;display:block;margin-bottom:6px">Adresse e-mail</label>
                    <input type="email" class="chat-input-field" style="width:100%;padding:14px 18px" placeholder="votre@email.com" id="reg-email" required>
                </div>
                <div style="margin-bottom:20px">
                    <label style="font-weight:600;font-size:0.9rem;display:block;margin-bottom:6px">Mot de passe</label>
                    <input type="password" class="chat-input-field" style="width:100%;padding:14px 18px" placeholder="Minimum 8 caractères" id="reg-password" required minlength="8">
                </div>
                <div style="margin-bottom:24px">
                    <label style="font-weight:600;font-size:0.9rem;display:block;margin-bottom:8px">Votre profil :</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" id="reg-role-grid">
                        ${['student', 'parent', 'teacher', 'admin'].map((r, i) => {
        const labels = { student: '🎓 Élève', parent: '👨‍👩‍👧 Parent', teacher: '📚 Enseignant', admin: '⚙️ Admin' };
        return `<button type="button" class="btn btn-secondary btn-sm reg-role-btn ${i === 0 ? 'active-role' : ''}" data-role="${r}" onclick="selectRegRole('${r}', this)" style="justify-content:center">${labels[r]}</button>`;
    }).join('')}
                    </div>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;padding:16px"><i data-lucide="check-circle" style="width:18px;height:18px"></i> Créer mon compte</button>
            </form>
            <p style="text-align:center;margin-top:24px;color:var(--text-secondary);font-size:0.9rem">
                Déjà inscrit ? <a href="#" onclick="navigateTo('connexion'); return false;" style="font-weight:600">Se connecter</a>
            </p>
        </div>
    </div>
    `;
}

let selectedRegRole = 'student';
function selectRegRole(role, btn) {
    selectedRegRole = role;
    document.querySelectorAll('.reg-role-btn').forEach(b => b.classList.remove('active-role'));
    btn.classList.add('active-role');
}

function handleRegister(e) {
    e.preventDefault();
    const prenom = document.getElementById('reg-prenom').value;
    loginAs(selectedRegRole, prenom);
}

// ─── PAGE: STUDENT DASHBOARD ─────────────────────────────────────────────────
function renderStudentDashboard() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    return `
    <div class="fade-in-up">
        <!-- Welcome Banner -->
        <div class="student-welcome-banner">
            <div class="student-welcome-text">
                <h2>${greeting}, ${APP.username} ! 👋</h2>
                <p>Tu as 3 cours prévus aujourd'hui. Continue comme ça, tu es sur la bonne voie !</p>
            </div>
            <button class="btn btn-primary" onclick="navigateTo('cours')"><i data-lucide="book-open" style="width:18px;height:18px"></i> Reprendre mon cours</button>
        </div>

        <!-- Mood Tracker -->
        <div class="card" style="margin-bottom:24px;padding:20px">
            <div class="card-title"><i data-lucide="smile" style="width:20px;height:20px;color:var(--color-warning)"></i> Comment te sens-tu aujourd'hui ?</div>
            <div class="mood-selector-container">
                ${['😢', '😟', '😐', '🙂', '😄'].map((emoji, i) => `
                    <button class="mood-btn ${APP.mood === i ? 'active' : ''}" onclick="setMood(${i})">${emoji}</button>
                `).join('')}
            </div>
            ${APP.mood !== null ? `<p style="margin-top:12px;color:var(--text-secondary);font-size:0.85rem">Merci ! Ton humeur a été enregistrée. ${APP.mood >= 3 ? '🎉 Super !' : APP.mood <= 1 ? '💙 N\'hésite pas à consulter l\'espace bien-être.' : ''}</p>` : ''}
        </div>

        <!-- Quick Stats -->
        <div class="dashboard-quick-stats">
            ${[
            { icon: 'book-open', value: '12', label: 'Cours complétés', color: 'blue' },
            { icon: 'trophy', value: '8', label: 'Badges obtenus', color: 'orange' },
            { icon: 'clock', value: '24h', label: 'Temps d\'étude', color: 'green' },
            { icon: 'trending-up', value: '85%', label: 'Moyenne générale', color: 'blue' }
        ].map(s => `
                <div class="quick-stat-card">
                    <div class="stat-icon-wrapper ${s.color}"><i data-lucide="${s.icon}" style="width:24px;height:24px"></i></div>
                    <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
                </div>
            `).join('')}
        </div>

        <!-- Main Grid -->
        <div class="dashboard-layout-grid">
            <div>
                <!-- Schedule -->
                <div class="card weekly-schedule-card">
                    <div class="card-title"><i data-lucide="calendar" style="width:20px;height:20px;color:var(--color-primary)"></i> Emploi du temps du jour</div>
                    <div class="schedule-timeline">
                        ${[
            { time: '09:00', title: 'Mathématiques', desc: 'Chapitre 5 : Fonctions affines', type: 'course' },
            { time: '10:30', title: 'Français – Session Live', desc: 'Analyse de texte avec Mme Dubois', type: 'live' },
            { time: '14:00', title: 'Histoire-Géo', desc: 'Devoir à rendre : La Révolution industrielle', type: 'homework' },
            { time: '16:00', title: 'SVT', desc: 'Cours en replay : La cellule animale', type: 'course' }
        ].map(item => `
                            <div class="schedule-item ${item.type}">
                                <span class="schedule-time">${item.time}</span>
                                <div class="schedule-dot"></div>
                                <div class="schedule-info">
                                    <div class="schedule-title">${item.title}</div>
                                    <div class="schedule-desc">${item.desc}</div>
                                </div>
                                ${item.type === 'live' ? '<span class="badge badge-danger" style="animation:pulseBorder 2s infinite">● EN DIRECT</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Course Progress -->
                <div class="card">
                    <div class="card-title"><i data-lucide="trending-up" style="width:20px;height:20px;color:var(--color-success)"></i> Progression des cours</div>
                    ${[
            { name: 'Mathématiques', progress: 72, color: '#3b82f6' },
            { name: 'Français', progress: 58, color: '#10b981' },
            { name: 'Histoire-Géo', progress: 85, color: '#f59e0b' },
            { name: 'SVT', progress: 40, color: '#8b5cf6' }
        ].map(c => `
                        <div style="margin-bottom:16px">
                            <div style="display:flex;justify-content:space-between;font-size:0.9rem;font-weight:600;margin-bottom:4px">
                                <span>${c.name}</span><span>${c.progress}%</span>
                            </div>
                            <div class="progress-container"><div class="progress-fill" style="width:${c.progress}%;background:${c.color}"></div></div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Right Column -->
            <div>
                <!-- Badges -->
                <div class="card" style="margin-bottom:24px">
                    <div class="card-title"><i data-lucide="award" style="width:20px;height:20px;color:var(--color-warning)"></i> Mes Badges</div>
                    <div class="badges-panel-list">
                        ${[
            { icon: 'star', name: 'Première étoile', locked: false },
            { icon: 'zap', name: 'Série de 5', locked: false },
            { icon: 'flame', name: 'En feu !', locked: false },
            { icon: 'trophy', name: 'Champion', locked: true },
            { icon: 'crown', name: 'Expert', locked: true },
            { icon: 'gem', name: 'Diamant', locked: true }
        ].map(b => `
                            <div class="badge-item-display ${b.locked ? 'locked' : ''}">
                                <div class="badge-icon-shield"><i data-lucide="${b.icon}" style="width:20px;height:20px"></i></div>
                                <span class="badge-name">${b.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="card">
                    <div class="card-title"><i data-lucide="zap" style="width:20px;height:20px;color:var(--color-primary)"></i> Actions rapides</div>
                    <div style="display:flex;flex-direction:column;gap:10px">
                        <button class="btn btn-secondary" onclick="navigateTo('ia-assistant')" style="width:100%;justify-content:flex-start"><i data-lucide="bot" style="width:18px;height:18px"></i> Poser une question à l'IA</button>
                        <button class="btn btn-secondary" onclick="navigateTo('bienetre')" style="width:100%;justify-content:flex-start"><i data-lucide="heart" style="width:18px;height:18px"></i> Exercice de respiration</button>
                        <button class="btn btn-secondary" onclick="navigateTo('whiteboard')" style="width:100%;justify-content:flex-start"><i data-lucide="pen-tool" style="width:18px;height:18px"></i> Ouvrir le tableau blanc</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

function setMood(index) {
    APP.mood = index;
    saveState();
    if (index >= 3) launchConfetti();
    showToast('Humeur enregistrée ! Merci 💙', 'success');
    renderApp();
}

// ─── PAGE: COURS ─────────────────────────────────────────────────────────────
function renderCoursPage() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Mes Cours</h1>
        <p style="color:var(--text-secondary);margin-bottom:32px">Explore tes matières et continue ta progression.</p>

        <div class="course-subjects-grid">
            ${[
            { icon: 'calculator', name: 'Mathématiques', progress: 72, lessons: 24, color: '#3b82f6' },
            { icon: 'book-open', name: 'Français', progress: 58, lessons: 18, color: '#10b981' },
            { icon: 'landmark', name: 'Histoire-Géo', progress: 85, lessons: 20, color: '#f59e0b' },
            { icon: 'flask-conical', name: 'SVT', progress: 40, lessons: 16, color: '#8b5cf6' },
            { icon: 'globe', name: 'Anglais', progress: 63, lessons: 22, color: '#ec4899' },
            { icon: 'atom', name: 'Physique-Chimie', progress: 35, lessons: 14, color: '#14b8a6' }
        ].map(s => `
                <div class="subject-card" onclick="showToast('Ouverture du cours de ${s.name}...', 'primary')">
                    <div class="subject-header-icon" style="background:${s.color}15;color:${s.color}">
                        <i data-lucide="${s.icon}" style="width:24px;height:24px"></i>
                    </div>
                    <h3 style="font-weight:700;font-size:1.05rem;margin-bottom:4px">${s.name}</h3>
                    <p style="color:var(--text-secondary);font-size:0.8rem;margin-bottom:12px">${s.lessons} leçons</p>
                    <div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:600;margin-bottom:4px">
                        <span>Progression</span><span>${s.progress}%</span>
                    </div>
                    <div class="progress-container"><div class="progress-fill" style="width:${s.progress}%;background:${s.color}"></div></div>
                </div>
            `).join('')}
        </div>

        <!-- Video Player - Fonctions affines -->
        <div class="card" style="margin-bottom:32px">
            <div class="card-title"><i data-lucide="play-circle" style="width:20px;height:20px;color:var(--color-primary)"></i> Cours en cours : Fonctions affines</div>
            <div style="position:relative;width:100%;padding-top:56.25%;border-radius:12px;overflow:hidden;background:#000">
                <iframe
                    src="https://www.youtube.com/embed/n5_pRx4ozIg?start=7"
                    style="position:absolute;top:0;left:0;width:100%;height:100%;border:none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen
                    title="Cours Fonctions affines"
                ></iframe>
            </div>
        </div>

        <!-- Quiz Section -->
        <div class="card">
            <div class="card-title"><i data-lucide="help-circle" style="width:20px;height:20px;color:var(--color-success)"></i> Quiz : Fonctions affines</div>
            <div class="quiz-container-box" id="quiz-area">
                ${renderQuiz()}
            </div>
        </div>
    </div>
    `;
}

// ─── QUIZ ENGINE ─────────────────────────────────────────────────────────────
const quizData = [
    {
        question: 'Quelle est la forme générale d\'une fonction affine ?',
        options: ['f(x) = ax²+b', 'f(x) = ax+b', 'f(x) = a/x', 'f(x) = √x'],
        correct: 1,
        explanation: 'Une fonction affine est représentée par une droite. Sa formule est de la forme f(x) = ax + b, où "a" représente le coefficient directeur et "b" l\'ordonnée à l\'origine. f(x) = ax²+b est une fonction du second degré, f(x) = a/x est une fonction inverse et f(x) = √x est la fonction racine carrée.'
    },
    {
        question: 'Quel est le coefficient directeur de f(x) = 3x - 7 ?',
        options: ['7', '-7', '3', '-3'],
        correct: 2,
        explanation: 'Dans l\'expression ax + b, le coefficient directeur est le nombre "a" qui multiplie x. Ici, c\'est 3. Le nombre -7 correspond à l\'ordonnée à l\'origine "b".'
    },
    {
        question: 'L\'ordonnée à l\'origine de f(x) = 2x + 5 est :',
        options: ['2', '5', '7', '0'],
        correct: 1,
        explanation: 'L\'ordonnée à l\'origine est la valeur de f(0), c\'est-à-dire la constante "b" dans ax + b. Pour f(x) = 2x + 5, c\'est 5. C\'est le point où la droite coupe l\'axe des ordonnées (y).'
    }
];
let quizIndex = 0, quizScore = 0, quizAnswered = false;

function renderQuiz() {
    if (quizIndex >= quizData.length) {
        return `
            <div style="text-align:center;padding:40px">
                <div style="font-size:3rem;margin-bottom:16px">${quizScore === quizData.length ? '🏆' : quizScore >= 2 ? '🎉' : '💪'}</div>
                <h3 style="font-size:1.3rem;font-weight:700;margin-bottom:8px">Quiz terminé !</h3>
                <p style="color:var(--text-secondary);margin-bottom:24px">Score : ${quizScore}/${quizData.length}</p>
                <button class="btn btn-primary" onclick="resetQuiz()"><i data-lucide="rotate-ccw" style="width:16px;height:16px"></i> Recommencer</button>
            </div>
        `;
    }
    const q = quizData[quizIndex];
    return `
        <div class="quiz-question-counter">Question ${quizIndex + 1}/${quizData.length}</div>
        <div class="quiz-question-text">${q.question}</div>
        <div class="quiz-options-list">
            ${q.options.map((opt, i) => `
                <div class="quiz-option-item" onclick="answerQuiz(${i})" id="quiz-opt-${i}">${opt}</div>
            `).join('')}
        </div>
        <div id="quiz-explanation-box" style="display:none; margin-bottom: 20px; padding: 16px; border-radius: var(--border-radius-md); background-color: var(--color-primary-light); border-left: 4px solid var(--color-primary); font-size: 0.9rem; line-height: 1.5;">
            <strong>Explication :</strong> <span id="quiz-explanation-text"></span>
        </div>
        <div style="display:flex;justify-content:flex-end">
            <button class="btn btn-primary btn-sm" onclick="nextQuizQuestion()" id="quiz-next-btn" style="display:none"><i data-lucide="arrow-right" style="width:16px;height:16px"></i> Suivant</button>
        </div>
    `;
}

function answerQuiz(index) {
    if (quizAnswered) return;
    quizAnswered = true;
    const q = quizData[quizIndex];
    const correct = q.correct;
    const options = document.querySelectorAll('.quiz-option-item');

    options[correct].classList.add('correct');
    if (index === correct) {
        quizScore++;
        showToast('Bonne réponse ! 🎯', 'success');
    } else {
        options[index].classList.add('incorrect');
        showToast('Pas tout à fait...', 'warning');
    }

    // Afficher l'explication
    const expBox = document.getElementById('quiz-explanation-box');
    const expText = document.getElementById('quiz-explanation-text');
    if (expBox && expText) {
        expText.textContent = q.explanation;
        expBox.style.display = 'block';
        if (index === correct) {
            expBox.style.borderColor = 'var(--color-success)';
            expBox.style.backgroundColor = 'var(--color-success-light)';
        } else {
            expBox.style.borderColor = 'var(--color-danger)';
            expBox.style.backgroundColor = 'var(--color-danger-light)';
        }
    }

    const nextBtn = document.getElementById('quiz-next-btn');
    if (nextBtn) nextBtn.style.display = '';
}

function nextQuizQuestion() {
    quizIndex++;
    quizAnswered = false;
    const quizArea = document.getElementById('quiz-area');
    if (quizArea) {
        quizArea.innerHTML = renderQuiz();
        lucide.createIcons({ nodes: [quizArea] });
        if (quizIndex >= quizData.length && quizScore === quizData.length) launchConfetti();
    }
}

function resetQuiz() {
    quizIndex = 0; quizScore = 0; quizAnswered = false;
    const quizArea = document.getElementById('quiz-area');
    if (quizArea) { quizArea.innerHTML = renderQuiz(); lucide.createIcons({ nodes: [quizArea] }); }
}

// ─── PAGE: IA ASSISTANT ──────────────────────────────────────────────────────
function renderIAAssistantPage() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Assistant IA</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">FlexBot est là pour t'accompagner dans tes révisions et répondre à tes questions.</p>
        <div class="ia-chat-interface">
            <div class="ia-chat-header">
                <div class="ia-chat-botinfo">
                    <div class="ia-avatar"><i data-lucide="bot" style="width:24px;height:24px"></i></div>
                    <div>
                        <strong style="font-size:1rem">FlexBot</strong>
                        <div style="font-size:0.8rem;color:var(--text-secondary)"><span class="status-indicator status-active" style="width:8px;height:8px;display:inline-block;margin-right:4px"></span>En ligne – IA pédagogique</div>
                    </div>
                </div>
            </div>
            <div class="ia-messages-container" id="ia-main-messages">
                <div class="chat-bubble-wrapper ia">
                    <div class="ia-avatar" style="width:36px;height:36px;min-width:36px"><i data-lucide="bot" style="width:18px;height:18px"></i></div>
                    <div class="chat-bubble">Salut ${APP.username} ! 👋 Je suis FlexBot, ton assistant pédagogique. Je peux t'aider à comprendre tes cours, résoudre des exercices, ou simplement discuter. Que veux-tu faire aujourd'hui ?</div>
                </div>
            </div>
            <div class="chat-quick-prompts">
                ${['Explique-moi les fonctions affines', 'Aide-moi en conjugaison', 'Quiz de maths', 'Résumé du cours d\'histoire'].map(p => `
                    <button class="quick-prompt-tag" onclick="sendIAPrompt('${p}')">${p}</button>
                `).join('')}
            </div>
            <div class="chat-input-bar">
                <input type="text" class="chat-input-field" placeholder="Pose ta question ici..." id="ia-main-input" onkeydown="if(event.key==='Enter') sendIAMainMessage()">
                <button class="btn btn-primary btn-sm" onclick="sendIAMainMessage()"><i data-lucide="send" style="width:18px;height:18px"></i></button>
            </div>
        </div>
    </div>
    `;
}

function sendIAPrompt(text) {
    const input = document.getElementById('ia-main-input');
    if (input) { input.value = text; sendIAMainMessage(); }
}

function sendIAMainMessage() {
    const input = document.getElementById('ia-main-input');
    const container = document.getElementById('ia-main-messages');
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim(); input.value = '';
    container.innerHTML += `<div class="chat-bubble-wrapper student"><div class="chat-bubble">${msg}</div></div>`;
    const responses = [
        `Excellente question ! 🤓 Pour les fonctions affines, retiens que la forme est f(x) = ax + b, où "a" est le coefficient directeur (la pente) et "b" l'ordonnée à l'origine.`,
        `Je vois que tu travailles dur ! 💪 Voici un petit conseil : prends le temps de bien lire l'énoncé avant de commencer l'exercice.`,
        `C'est un sujet passionnant ! 📚 Je te recommande de commencer par les bases puis de progresser étape par étape.`,
        `Très bonne approche ! 🎯 Continue comme ça. N'hésite pas à me poser d'autres questions si besoin.`
    ];
    setTimeout(() => {
        container.innerHTML += `
            <div class="chat-bubble-wrapper ia">
                <div class="ia-avatar" style="width:36px;height:36px;min-width:36px"><i data-lucide="bot" style="width:18px;height:18px"></i></div>
                <div class="chat-bubble">${responses[Math.floor(Math.random() * responses.length)]}</div>
            </div>
        `;
        container.scrollTop = container.scrollHeight;
        lucide.createIcons({ nodes: [container] });
    }, 700);
    container.scrollTop = container.scrollHeight;
}

// Variable globale temporaire pour suivre si un live est en cours de lecture
let currentActiveLiveUrl = null;

function closeLiveStream() {
    currentActiveLiveUrl = null;
    renderApp();
}

function joinLiveStream(url) {
    currentActiveLiveUrl = url;
    showToast('Connexion à la session live réussie ! 🎥', 'success');
    renderApp();
}

// ─── PAGE: SESSIONS LIVE ─────────────────────────────────────────────────────
function renderLivePage() {
    let playerHtml = '';
    if (currentActiveLiveUrl) {
        // Utilisation de youtube-nocookie.com pour éviter les blocages de cookies d'intégration
        const embedUrl = "https://www.youtube-nocookie.com/embed/uV_EmbYu9_E?start=12&autoplay=1";
        playerHtml = `
            <div class="card" style="margin-bottom: 32px; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div class="card-title" style="margin-bottom: 0;">
                        <i data-lucide="video" style="width:20px;height:20px;color:var(--color-danger);animation:pulseBorder 2s infinite"></i> 
                        Cours en Direct : Résolution d'équations (Maths)
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <a href="https://youtu.be/uV_EmbYu9_E?si=RHe_zoPk6W13c3DU&t=12" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center;">
                            <i data-lucide="external-link" style="width:14px;height:14px;margin-right:5px"></i> Ouvrir sur YouTube
                        </a>
                        <button class="btn btn-secondary btn-sm" onclick="closeLiveStream()">
                            <i data-lucide="x" style="width:16px;height:16px"></i> Fermer
                        </button>
                    </div>
                </div>
                <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: var(--border-radius-md); box-shadow: var(--shadow-md); background: #000;">
                    <iframe 
                        src="${embedUrl}" 
                        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        referrerpolicy="strict-origin-when-cross-origin"
                        allowfullscreen>
                    </iframe>
                </div>
                <p style="margin-top: 10px; font-size: 0.8rem; color: var(--text-secondary); text-align: center;">
                    💡 Si la vidéo indique une erreur, cliquez sur "Ouvrir sur YouTube" ci-dessus pour la regarder directement.
                </p>
            </div>
        `;
    }

    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Sessions Live</h1>
        <p style="color:var(--text-secondary);margin-bottom:32px">Participe aux cours en direct avec tes enseignants.</p>
        
        ${playerHtml}

        <div class="live-sessions-catalog">
            ${[
            { subject: 'Maths', title: 'Résolution d\'équations', teacher: 'M. Martin', time: 'Aujourd\'hui 10:30', live: true, gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', url: 'https://youtu.be/uV_EmbYu9_E?si=RHe_zoPk6W13c3DU&t=12' },
            { subject: 'Français', title: 'Commentaire de texte', teacher: 'Mme Dubois', time: 'Demain 14:00', live: false, gradient: 'linear-gradient(135deg, #10b981, #059669)', url: null },
            { subject: 'Histoire', title: 'La Révolution française', teacher: 'M. Leroy', time: 'Mercredi 09:00', live: false, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', url: null },
            { subject: 'Anglais', title: 'Oral Practice', teacher: 'Mrs. Smith', time: 'Jeudi 11:00', live: false, gradient: 'linear-gradient(135deg, #ec4899, #db2777)', url: null },
            { subject: 'SVT', title: 'La photosynthèse', teacher: 'Mme Garcia', time: 'Vendredi 10:00', live: false, gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', url: null },
            { subject: 'Physique', title: 'Les forces en mécanique', teacher: 'M. Bernard', time: 'Vendredi 14:00', live: false, gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)', url: null }
        ].map(s => `
                <div class="live-card">
                    <div class="live-card-banner" style="background:${s.gradient}">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span class="badge" style="background:rgba(255,255,255,0.2);color:white">${s.subject}</span>
                            ${s.live ? '<span class="badge badge-danger" style="background:var(--color-danger);color:white">● LIVE</span>' : ''}
                        </div>
                        <span style="font-size:0.85rem;opacity:0.9">${s.time}</span>
                    </div>
                    <div class="live-card-body">
                        <h3 style="font-weight:700;font-size:1rem;margin-bottom:4px">${s.title}</h3>
                        <div class="live-instructor-info">
                            <div style="width:32px;height:32px;border-radius:50%;background:var(--border-color);display:flex;align-items:center;justify-content:center"><i data-lucide="user" style="width:16px;height:16px;color:var(--text-muted)"></i></div>
                            <span style="font-size:0.85rem;color:var(--text-secondary)">${s.teacher}</span>
                        </div>
                        <button class="btn ${s.live ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="${s.live ? `joinLiveStream('${s.url}')` : "showToast('Rappel programmé !', 'primary');"}">
                            ${s.live ? '<i data-lucide="video" style="width:14px;height:14px"></i> Rejoindre' : '<i data-lucide="bell" style="width:14px;height:14px"></i> Me rappeler'}
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `;
}

// ─── PAGE: COMMUNAUTÉ ────────────────────────────────────────────────────────
function renderCommunautePage() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Communauté</h1>
        <p style="color:var(--text-secondary);margin-bottom:32px">Rejoins des clubs, échange avec d'autres élèves et partage tes passions.</p>
        <div class="community-clubs-grid">
            ${[
            { icon: 'palette', name: 'Club Art', members: 34, color: '#ec4899' },
            { icon: 'gamepad-2', name: 'Gaming', members: 56, color: '#8b5cf6' },
            { icon: 'music', name: 'Musique', members: 28, color: '#f59e0b' },
            { icon: 'code', name: 'Coding', members: 42, color: '#3b82f6' },
            { icon: 'book-heart', name: 'Lecture', members: 19, color: '#10b981' },
            { icon: 'camera', name: 'Photo', members: 23, color: '#14b8a6' },
            { icon: 'drama', name: 'Théâtre', members: 15, color: '#ef4444' },
            { icon: 'earth', name: 'Environnement', members: 31, color: '#059669' }
        ].map(c => `
                <div class="club-card" onclick="showToast('Bienvenue dans le club ${c.name} !', 'success')">
                    <div class="club-icon-circle" style="background:${c.color}15;color:${c.color}">
                        <i data-lucide="${c.icon}" style="width:28px;height:28px"></i>
                    </div>
                    <h3 style="font-weight:700;font-size:1rem;margin-bottom:4px">${c.name}</h3>
                    <p style="font-size:0.8rem;color:var(--text-secondary)">${c.members} membres</p>
                </div>
            `).join('')}
        </div>

        <!-- Forum Preview -->
        <div class="card">
            <div class="card-title"><i data-lucide="message-square" style="width:20px;height:20px;color:var(--color-primary)"></i> Discussions récentes</div>
            ${[
            { author: 'Léa', title: 'Comment organiser ses révisions ?', replies: 12, time: 'il y a 2h' },
            { author: 'Thomas', title: 'Astuce pour mémoriser les dates en histoire', replies: 8, time: 'il y a 5h' },
            { author: 'Ines', title: 'Besoin d\'aide en maths niveau 3ème', replies: 15, time: 'hier' }
        ].map(d => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;border:1px solid var(--border-color);border-radius:var(--border-radius-md);margin-bottom:10px;cursor:pointer;transition:all var(--transition-fast)" onmouseover="this.style.borderColor='var(--color-primary)'" onmouseout="this.style.borderColor='var(--border-color)'">
                    <div>
                        <div style="font-weight:600;font-size:0.95rem">${d.title}</div>
                        <div style="font-size:0.8rem;color:var(--text-secondary)">par ${d.author} · ${d.time}</div>
                    </div>
                    <span class="badge badge-primary">${d.replies} réponses</span>
                </div>
            `).join('')}
        </div>
    </div>
    `;
}

// ─── PAGE: BIEN-ÊTRE ─────────────────────────────────────────────────────────
function renderBienEtrePage() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Espace Bien-être</h1>
        <p style="color:var(--text-secondary);margin-bottom:32px">Prends soin de toi. Tu mérites d'être bien. 💙</p>

        <div class="wellbeing-split">
            <!-- Stress Test -->
            <div class="card">
                <div class="card-title"><i data-lucide="brain" style="width:20px;height:20px;color:var(--color-warning)"></i> Comment te sens-tu ?</div>
                <p style="color:var(--text-secondary);margin-bottom:16px">Évalue ton niveau de stress sur une échelle de 1 à 5.</p>
                <div class="stress-option-buttons" id="stress-btns">
                    ${[1, 2, 3, 4, 5].map(n => `
                        <button class="stress-btn-val" onclick="selectStress(${n}, this)">${n}</button>
                    `).join('')}
                </div>
                <div id="stress-result"></div>
            </div>

            <!-- Breathing Exercise -->
            <div class="card">
                <div class="card-title"><i data-lucide="wind" style="width:20px;height:20px;color:var(--color-primary)"></i> Exercice de respiration</div>
                <div class="breathing-animation-container" id="breathing-zone">
                    <div class="breathing-circle-outer">
                        <div class="breathing-circle-inner" id="breathing-circle">
                            <span id="breathing-text">Start</span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="startBreathing()" id="breathing-start-btn">
                        <i data-lucide="play" style="width:16px;height:16px"></i> Commencer
                    </button>
                </div>
            </div>
        </div>

        <!-- Resources -->
        <div class="card" style="margin-top:32px">
            <div class="card-title"><i data-lucide="phone" style="width:20px;height:20px;color:var(--color-success)"></i> Ressources & Aide</div>
            <div class="grid-3">
                ${[
            { icon: 'phone', title: 'Ligne d\'écoute', desc: '3114 – Numéro national de prévention du suicide, disponible 24h/24.', color: 'var(--color-danger)' },
            { icon: 'message-circle', title: 'Chat avec un psy', desc: 'Un psychologue scolaire est disponible sur la plateforme.', color: 'var(--color-primary)' },
            { icon: 'book-heart', title: 'Articles bien-être', desc: 'Des ressources pour mieux comprendre et gérer tes émotions.', color: 'var(--color-success)' }
        ].map(r => `
                    <div class="card card-premium" style="text-align:center;cursor:pointer" onclick="showToast('Ouverture de la ressource...', 'primary')">
                        <div style="width:48px;height:48px;border-radius:50%;background:${r.color}15;color:${r.color};display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
                            <i data-lucide="${r.icon}" style="width:22px;height:22px"></i>
                        </div>
                        <h3 style="font-weight:700;margin-bottom:8px">${r.title}</h3>
                        <p style="color:var(--text-secondary);font-size:0.85rem">${r.desc}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    `;
}

function selectStress(level, btn) {
    document.querySelectorAll('.stress-btn-val').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const messages = {
        1: '😊 Super, tu es détendu ! Continue de prendre soin de toi.',
        2: '🙂 Tout va bien. Un petit exercice de respiration pourrait t\'aider à rester zen.',
        3: '😐 Un peu de stress, c\'est normal. Prends une pause si besoin.',
        4: '😟 Tu sembles stressé. N\'hésite pas à utiliser l\'exercice de respiration ci-dessous.',
        5: '😢 Ce niveau de stress est élevé. Parle à quelqu\'un de confiance ou utilise nos ressources d\'aide.'
    };
    const result = document.getElementById('stress-result');
    if (result) result.innerHTML = `<p style="margin-top:16px;padding:16px;background:var(--bg-primary);border-radius:var(--border-radius-md);border-left:4px solid var(--color-primary)">${messages[level]}</p>`;
}

let breathingInterval = null;
function startBreathing() {
    const circle = document.getElementById('breathing-circle');
    const text = document.getElementById('breathing-text');
    const zone = document.getElementById('breathing-zone');
    const btn = document.getElementById('breathing-start-btn');
    if (breathingInterval) {
        clearInterval(breathingInterval);
        breathingInterval = null;
        zone.classList.remove('breathing-active');
        text.textContent = 'Start';
        btn.innerHTML = '<i data-lucide="play" style="width:16px;height:16px"></i> Commencer';
        lucide.createIcons({ nodes: [btn] });
        return;
    }
    zone.classList.add('breathing-active');
    btn.innerHTML = '<i data-lucide="pause" style="width:16px;height:16px"></i> Arrêter';
    lucide.createIcons({ nodes: [btn] });
    const phases = ['Inspirez...', 'Retenez...', 'Expirez...', 'Retenez...'];
    let phase = 0;
    text.textContent = phases[0];
    breathingInterval = setInterval(() => {
        phase = (phase + 1) % phases.length;
        text.textContent = phases[phase];
    }, 2000);
}

// ─── PAGE: WHITEBOARD ────────────────────────────────────────────────────────
function renderWhiteboardPage() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Tableau Blanc</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">Dessine, note tes idées, fais des schémas librement.</p>
        <div class="whiteboard-box">
            <div class="whiteboard-canvas-wrapper">
                <canvas id="whiteboard-canvas" class="whiteboard-canvas" width="900" height="280"></canvas>
            </div>
            <div class="whiteboard-controls">
                <div class="whiteboard-colors">
                    ${['#0f172a', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'].map((c, i) => `
                        <div class="color-swatch ${i === 0 ? 'active' : ''}" style="background:${c}" onclick="setWBColor('${c}', this)"></div>
                    `).join('')}
                </div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-secondary btn-sm" onclick="clearWhiteboard()"><i data-lucide="trash-2" style="width:14px;height:14px"></i> Effacer</button>
                    <button class="btn btn-primary btn-sm" onclick="showToast('Dessin sauvegardé !', 'success')"><i data-lucide="save" style="width:14px;height:14px"></i> Sauvegarder</button>
                </div>
            </div>
        </div>
    </div>
    `;
}

let wbColor = '#0f172a', wbDrawing = false;
function setWBColor(color, el) {
    wbColor = color;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
}

function clearWhiteboard() {
    const canvas = document.getElementById('whiteboard-canvas');
    if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    showToast('Tableau effacé', 'primary');
}

function initWhiteboard() {
    const canvas = document.getElementById('whiteboard-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 3;

    canvas.addEventListener('pointerdown', (e) => {
        wbDrawing = true;
        ctx.beginPath();
        ctx.strokeStyle = wbColor;
        const rect = canvas.getBoundingClientRect();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener('pointermove', (e) => {
        if (!wbDrawing) return;
        ctx.strokeStyle = wbColor;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    });
    canvas.addEventListener('pointerup', () => wbDrawing = false);
    canvas.addEventListener('pointerleave', () => wbDrawing = false);
}

// ─── PAGE: PARENT DASHBOARD ──────────────────────────────────────────────────
function renderParentDashboard() {
    return `
    <div class="fade-in-up">
        <div class="student-welcome-banner">
            <div class="student-welcome-text">
                <h2>Bonjour, ${APP.username} ! 👨‍👩‍👧</h2>
                <p>Voici le suivi de votre enfant cette semaine.</p>
            </div>
        </div>

        <div class="card parent-dashboard-alert-box" style="margin-bottom:24px;padding:20px">
            <div class="card-title"><i data-lucide="bell" style="width:20px;height:20px;color:var(--color-success)"></i> Alertes</div>
            <p style="color:var(--text-secondary)">✅ Tout va bien ! Aucune alerte pour le moment.</p>
        </div>

        <div class="parent-charts-grid">
            <div class="card">
                <div class="card-title"><i data-lucide="bar-chart-3" style="width:20px;height:20px;color:var(--color-primary)"></i> Progression hebdomadaire</div>
                ${[
            { name: 'Mathématiques', grade: '16/20', progress: 80 },
            { name: 'Français', grade: '14/20', progress: 70 },
            { name: 'Histoire-Géo', grade: '17/20', progress: 85 },
            { name: 'SVT', grade: '12/20', progress: 60 }
        ].map(s => `
                    <div style="margin-bottom:14px">
                        <div style="display:flex;justify-content:space-between;font-size:0.9rem;font-weight:600;margin-bottom:4px">
                            <span>${s.name}</span><span class="badge badge-primary">${s.grade}</span>
                        </div>
                        <div class="progress-container"><div class="progress-fill" style="width:${s.progress}%"></div></div>
                    </div>
                `).join('')}
            </div>
            <div class="card">
                <div class="card-title"><i data-lucide="clock" style="width:20px;height:20px;color:var(--color-success)"></i> Temps d'étude</div>
                <div style="text-align:center;padding:24px">
                    <div style="font-size:2.5rem;font-weight:800;color:var(--color-primary)">18h</div>
                    <p style="color:var(--text-secondary);margin:8px 0">cette semaine</p>
                    <span class="badge badge-success">+3h vs semaine précédente</span>
                </div>
                <div class="report-card-text" style="margin-top:20px">
                    "Élève motivé et assidu. Bon progrès en mathématiques. Continue ses efforts !"<br>
                    <small style="color:var(--text-muted)">— M. Martin, tuteur principal</small>
                </div>
            </div>
        </div>
    </div>
    `;
}

// ─── PAGE: TEACHER DASHBOARD ─────────────────────────────────────────────────
function renderTeacherDashboard() {
    return `
    <div class="fade-in-up">
        <div class="student-welcome-banner">
            <div class="student-welcome-text">
                <h2>Bonjour, ${APP.username} ! 📚</h2>
                <p>Vous avez 2 sessions live prévues aujourd'hui et 5 devoirs à corriger.</p>
            </div>
            <button class="btn btn-primary" onclick="showToast('Création de contenu...', 'primary')"><i data-lucide="plus" style="width:18px;height:18px"></i> Créer un cours</button>
        </div>

        <div class="dashboard-quick-stats">
            ${[
            { icon: 'users', value: '24', label: 'Élèves suivis', color: 'blue' },
            { icon: 'video', value: '2', label: 'Sessions aujourd\'hui', color: 'green' },
            { icon: 'file-text', value: '5', label: 'Devoirs à corriger', color: 'orange' },
            { icon: 'star', value: '4.8', label: 'Note moyenne', color: 'blue' }
        ].map(s => `
                <div class="quick-stat-card">
                    <div class="stat-icon-wrapper ${s.color}"><i data-lucide="${s.icon}" style="width:24px;height:24px"></i></div>
                    <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
                </div>
            `).join('')}
        </div>

        <div class="dashboard-layout-grid">
            <div class="card">
                <div class="card-title"><i data-lucide="users" style="width:20px;height:20px;color:var(--color-primary)"></i> Mes Élèves</div>
                <div class="teacher-inbox-preview">
                    ${[
            { name: 'Léa Martin', status: 'En ligne', progress: 85, mood: '😄' },
            { name: 'Thomas Dupont', status: 'Hors ligne', progress: 62, mood: '😐' },
            { name: 'Inès Boucher', status: 'En cours', progress: 78, mood: '🙂' },
            { name: 'Lucas Moreau', status: 'En ligne', progress: 45, mood: '😟' }
        ].map(s => `
                        <div class="teacher-student-row">
                            <div style="display:flex;align-items:center;gap:12px">
                                <div style="width:36px;height:36px;border-radius:50%;background:var(--color-primary-light);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--color-primary);font-size:0.85rem">${s.name.charAt(0)}</div>
                                <div>
                                    <div style="font-weight:600;font-size:0.9rem">${s.name}</div>
                                    <div style="font-size:0.75rem;color:var(--text-secondary)">${s.status}</div>
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:16px">
                                <span>${s.mood}</span>
                                <div style="width:80px">
                                    <div class="progress-container"><div class="progress-fill" style="width:${s.progress}%"></div></div>
                                </div>
                                <span class="badge ${s.progress >= 70 ? 'badge-success' : s.progress >= 50 ? 'badge-warning' : 'badge-danger'}">${s.progress}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="card">
                <div class="card-title"><i data-lucide="calendar" style="width:20px;height:20px;color:var(--color-success)"></i> Prochaines sessions</div>
                ${[
            { time: '10:30', title: 'Maths – 3ème', type: 'live' },
            { time: '14:00', title: 'Maths – 2nde', type: 'live' },
            { time: '16:00', title: 'Correction devoirs', type: 'homework' }
        ].map(s => `
                    <div class="schedule-item ${s.type}" style="margin-bottom:8px">
                        <span class="schedule-time">${s.time}</span>
                        <div class="schedule-dot"></div>
                        <div class="schedule-info"><div class="schedule-title">${s.title}</div></div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    `;
}

// ─── PAGE: ADMIN DASHBOARD ───────────────────────────────────────────────────
function renderAdminDashboard() {
    return `
    <div class="fade-in-up">
        <div class="student-welcome-banner">
            <div class="student-welcome-text">
                <h2>Administration EduFlex ⚙️</h2>
                <p>Bienvenue ${APP.username}. Vue d'ensemble de la plateforme.</p>
            </div>
        </div>

        <div class="dashboard-quick-stats">
            ${[
            { icon: 'users', value: '1,247', label: 'Utilisateurs actifs', color: 'blue' },
            { icon: 'graduation-cap', value: '892', label: 'Élèves inscrits', color: 'green' },
            { icon: 'book-open', value: '156', label: 'Cours publiés', color: 'orange' },
            { icon: 'trending-up', value: '97%', label: 'Satisfaction', color: 'green' }
        ].map(s => `
                <div class="quick-stat-card">
                    <div class="stat-icon-wrapper ${s.color}"><i data-lucide="${s.icon}" style="width:24px;height:24px"></i></div>
                    <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
                </div>
            `).join('')}
        </div>

        <div class="grid-2">
            <div class="card">
                <div class="card-title"><i data-lucide="activity" style="width:20px;height:20px;color:var(--color-primary)"></i> Activité récente</div>
                ${[
            { text: 'Nouveau compte élève créé : Léa M.', time: 'il y a 15 min', icon: 'user-plus', color: 'var(--color-success)' },
            { text: 'Cours publié : "Les fractions" par M. Martin', time: 'il y a 1h', icon: 'book-open', color: 'var(--color-primary)' },
            { text: 'Session live terminée : Français 3ème', time: 'il y a 2h', icon: 'video', color: 'var(--color-warning)' },
            { text: 'Alerte bien-être : Lucas M. (stress élevé)', time: 'il y a 3h', icon: 'heart', color: 'var(--color-danger)' }
        ].map(a => `
                    <div style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid var(--border-color)">
                        <div style="width:36px;height:36px;min-width:36px;border-radius:50%;background:${a.color}15;color:${a.color};display:flex;align-items:center;justify-content:center">
                            <i data-lucide="${a.icon}" style="width:16px;height:16px"></i>
                        </div>
                        <div style="flex:1">
                            <div style="font-size:0.9rem;font-weight:500">${a.text}</div>
                            <div style="font-size:0.75rem;color:var(--text-muted)">${a.time}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="card">
                <div class="card-title"><i data-lucide="pie-chart" style="width:20px;height:20px;color:var(--color-success)"></i> Répartition utilisateurs</div>
                <div style="padding:20px">
                    ${[
            { label: 'Élèves', count: 892, pct: 72, color: '#3b82f6' },
            { label: 'Parents', count: 245, pct: 20, color: '#10b981' },
            { label: 'Enseignants', count: 85, pct: 7, color: '#f59e0b' },
            { label: 'Admins', count: 25, pct: 1, color: '#8b5cf6' }
        ].map(u => `
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                            <div style="width:12px;height:12px;border-radius:3px;background:${u.color}"></div>
                            <span style="flex:1;font-weight:500">${u.label}</span>
                            <span style="font-weight:700">${u.count}</span>
                            <span class="badge" style="background:${u.color}15;color:${u.color}">${u.pct}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
    `;
}

// ─── GENERIC PLACEHOLDER PAGES ───────────────────────────────────────────────
function renderPlaceholderPage(title, icon, description) {
    return `
    <div class="fade-in-up" style="text-align:center;padding:80px 0">
        <div style="width:80px;height:80px;border-radius:var(--border-radius-lg);background:var(--color-primary-light);color:var(--color-primary);display:flex;align-items:center;justify-content:center;margin:0 auto 24px">
            <i data-lucide="${icon}" style="width:40px;height:40px"></i>
        </div>
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:12px">${title}</h1>
        <p style="color:var(--text-secondary);max-width:400px;margin:0 auto 32px">${description}</p>
        <button class="btn btn-secondary" onclick="navigateTo('dashboard')"><i data-lucide="arrow-left" style="width:16px;height:16px"></i> Retour au tableau de bord</button>
    </div>
    `;
}

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────
function getPageContent() {
    // If visitor, only show public pages
    if (APP.role === 'visitor') {
        switch (APP.currentTab) {
            case 'connexion': return renderLoginPage();
            case 'inscription': return renderRegisterPage();
            default: return renderLandingPage();
        }
    }

    // If logged in, never show the landing page
    switch (APP.currentTab) {
        case 'accueil':
        case 'dashboard':
            switch (APP.role) {
                case 'student': return renderStudentDashboard();
                case 'parent': return renderParentDashboard();
                case 'teacher': return renderTeacherDashboard();
                case 'admin': return renderAdminDashboard();
                default: return renderStudentDashboard();
            }
        // Student pages
        case 'cours': return renderCoursPage();
        case 'ia-assistant': return renderIAAssistantPage();
        case 'live': return renderLivePage();
        case 'communaute': return renderCommunautePage();
        case 'bienetre': return renderBienEtrePage();
        case 'whiteboard': return renderWhiteboardPage();
        // Parent pages
        case 'suivi': return renderParentSuivi();
        case 'messages': return renderParentMessages();
        case 'facturation': return renderParentFacturation();
        // Teacher pages
        case 'mes-eleves': return renderTeacherStudents();
        case 'contenus': return renderTeacherContenus();
        case 'planning': return renderTeacherPlanning();
        // Admin pages
        case 'utilisateurs': return renderAdminUsers();
        case 'statistiques': return renderAdminStats();
        case 'configuration': return renderAdminConfig();
        default:
            APP.currentTab = 'dashboard';
            return getPageContent();
    }
}

// ─── SUB-PAGES RENDERING : PARENT ────────────────────────────────────────────
function renderParentSuivi() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Suivi de l'enfant</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">Consultez les notes, l'assiduité et la progression détaillée de votre enfant.</p>
        
        <div class="grid-2" style="margin-bottom: 24px;">
            <div class="card">
                <div class="card-title"><i data-lucide="line-chart" style="width:20px;height:20px;color:var(--color-primary)"></i> Moyennes trimestrielles</div>
                <div style="display:flex; flex-direction:column; gap:16px;">
                    ${[
                        { subject: 'Mathématiques', avg: '16.5/20', desc: 'Excellente progression', color: 'blue' },
                        { subject: 'Français', avg: '14.0/20', desc: 'Travail régulier et sérieux', color: 'green' },
                        { subject: 'Histoire-Géo', avg: '17.5/20', desc: 'Élève très impliqué', color: 'orange' },
                        { subject: 'SVT', avg: '12.0/20', desc: 'Des efforts à poursuivre', color: 'purple' }
                    ].map(s => `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <strong style="font-size:0.95rem;">${s.subject}</strong>
                                <div style="font-size:0.8rem; color:var(--text-secondary);">${s.desc}</div>
                            </div>
                            <span class="badge badge-primary" style="font-size:0.9rem; padding: 6px 12px;">${s.avg}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="card">
                <div class="card-title"><i data-lucide="check-circle" style="width:20px;height:20px;color:var(--color-success)"></i> Assiduité et Participation</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; text-align:center; padding: 16px 0;">
                    <div style="padding: 16px; background-color: var(--bg-primary); border-radius: var(--border-radius-md);">
                        <div style="font-size: 2.2rem; font-weight:800; color: var(--color-success);">100%</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top:4px;">Présence aux Lives</div>
                    </div>
                    <div style="padding: 16px; background-color: var(--bg-primary); border-radius: var(--border-radius-md);">
                        <div style="font-size: 2.2rem; font-weight:800; color: var(--color-primary);">12 / 12</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top:4px;">Devoirs rendus</div>
                    </div>
                </div>
                <div class="report-card-text" style="margin-top: 10px;">
                    💡 <strong>Observation du tuteur :</strong> Votre enfant se connecte régulièrement et montre un grand intérêt pour les sessions live du matin.
                </div>
            </div>
        </div>
    </div>
    `;
}

function renderParentMessages() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Messagerie parents-tuteurs</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">Échangez à tout moment avec les tuteurs et enseignants d'EduFlex.</p>
        
        <div class="ia-chat-interface" style="height: 500px;">
            <div class="ia-chat-header">
                <div class="ia-chat-botinfo">
                    <div style="width:40px;height:40px;border-radius:50%;background:var(--color-primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;">MM</div>
                    <div>
                        <strong>M. Martin (Tuteur Principal)</strong>
                        <div style="font-size:0.75rem;color:var(--text-secondary);">Enseignant de Mathématiques</div>
                    </div>
                </div>
            </div>
            <div class="ia-messages-container" id="parent-chat-messages">
                <div class="chat-bubble-wrapper ia">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--border-color);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">MM</div>
                    <div class="chat-bubble">Bonjour. Votre enfant a fait d'excellents progrès cette semaine sur les équations de premier degré. N'hésitez pas à me faire part de toute difficulté observée à la maison.</div>
                </div>
            </div>
            <div class="chat-input-bar">
                <input type="text" class="chat-input-field" placeholder="Écrire un message..." id="parent-chat-input" onkeydown="if(event.key==='Enter') sendParentChatMessage()">
                <button class="btn btn-primary btn-sm" onclick="sendParentChatMessage()"><i data-lucide="send" style="width:16px;height:16px"></i></button>
            </div>
        </div>
    </div>
    `;
}

function sendParentChatMessage() {
    const input = document.getElementById('parent-chat-input');
    const container = document.getElementById('parent-chat-messages');
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim();
    input.value = '';
    container.innerHTML += `
        <div class="chat-bubble-wrapper student">
            <div class="chat-bubble" style="background-color: var(--color-success);">${msg}</div>
        </div>
    `;
    container.scrollTop = container.scrollHeight;
    setTimeout(() => {
        container.innerHTML += `
            <div class="chat-bubble-wrapper ia">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--border-color);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">MM</div>
                <div class="chat-bubble">Bien reçu ! Merci pour votre retour, j'en prends note pour le prochain live. 👍</div>
            </div>
        `;
        container.scrollTop = container.scrollHeight;
        lucide.createIcons({ nodes: [container] });
    }, 1000);
}

function renderParentFacturation() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Facturation et Abonnements</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">Gérez votre abonnement EduFlex et téléchargez vos reçus.</p>
        
        <div class="grid-2">
            <div class="card">
                <div class="card-title"><i data-lucide="credit-card" style="width:20px;height:20px;color:var(--color-primary)"></i> Formule Actuelle</div>
                <div style="margin-bottom:16px;">
                    <span class="badge badge-success" style="font-size:0.85rem;margin-bottom:8px;">Formule Accompagnée</span>
                    <div style="font-size:1.8rem;font-weight:800;margin:8px 0;">67 € / mois</div>
                    <p style="font-size:0.9rem;color:var(--text-secondary);">Prochain prélèvement le 15 Juin 2026</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-secondary btn-sm" onclick="showToast('Option de modification d\'abonnement', 'primary')">Modifier la formule</button>
                    <button class="btn btn-secondary btn-sm" onclick="showToast('Abonnement suspendu avec succès', 'danger')" style="color:var(--color-danger); border-color:var(--color-danger);">Suspendre</button>
                </div>
            </div>
            
            <div class="card">
                <div class="card-title"><i data-lucide="file-text" style="width:20px;height:20px;color:var(--color-success)"></i> Historique de Facturation</div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${[
                        { date: '15 Mai 2026', amount: '67.00 €', id: 'FACT-002' },
                        { date: '15 Avril 2026', amount: '67.00 €', id: 'FACT-001' }
                    ].map(f => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border-color); border-radius: var(--border-radius-md);">
                            <div>
                                <strong style="font-size:0.9rem;">${f.id}</strong>
                                <div style="font-size:0.75rem; color:var(--text-secondary);">${f.date}</div>
                            </div>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span>${f.amount}</span>
                                <button class="icon-btn" onclick="showToast('Téléchargement de la facture...', 'success')" style="width:32px; height:32px;"><i data-lucide="download" style="width:14px;height:14px"></i></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
    `;
}

// ─── SUB-PAGES RENDERING : TEACHER ───────────────────────────────────────────
function renderTeacherStudents() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Suivi des élèves</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">Consultez l'engagement et l'état psychopédagogique de vos élèves.</p>
        
        <div class="teacher-inbox-preview" style="display:flex; flex-direction:column; gap:12px;">
            ${[
                { name: 'Léa Martin', alert: 'Tout va bien', status: 'En ligne', mood: '😄', mathAvg: '16/20', lastActive: 'Il y a 5 min' },
                { name: 'Lucas Moreau', alert: 'Alerte bien-être : stress élevé', status: 'Hors ligne', mood: '😟', mathAvg: '11/20', lastActive: 'Il y a 3 heures' },
                { name: 'Thomas Dupont', alert: 'Tout va bien', status: 'En ligne', mood: '😐', mathAvg: '13/20', lastActive: 'Il y a 10 min' },
                { name: 'Inès Boucher', alert: 'Tout va bien', status: 'En ligne', mood: '🙂', mathAvg: '15/20', lastActive: 'Il y a 2 min' }
            ].map(s => `
                <div class="teacher-student-row" style="padding: 20px;">
                    <div style="display:flex; align-items:center; gap:16px; flex: 1.2;">
                        <div style="width:44px; height:44px; border-radius:50%; background:var(--color-primary-light); color:var(--color-primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1rem;">
                            ${s.name.charAt(0)}
                        </div>
                        <div>
                            <strong style="font-size:1rem;">${s.name}</strong>
                            <div style="font-size:0.8rem; color:var(--text-secondary);">Dernière connexion : ${s.lastActive}</div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:24px; flex: 1.8; justify-content:flex-end; flex-wrap:wrap;">
                        <div style="text-align:right;">
                            <span style="font-size:1.2rem; margin-right:8px;">${s.mood}</span>
                            <span class="badge ${s.alert.includes('Alerte') ? 'badge-danger' : 'badge-success'}">${s.alert}</span>
                        </div>
                        <div>
                            Moyenne : <strong style="color:var(--color-primary);">${s.mathAvg}</strong>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="navigateTo('messages')">
                            <i data-lucide="mail" style="width:14px;height:14px;margin-right:5px"></i> Contacter
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `;
}

function renderTeacherContenus() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Gestion des contenus</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">Publiez de nouveaux cours et concevez des quiz interactifs.</p>
        
        <div class="grid-2">
            <div class="card">
                <div class="card-title"><i data-lucide="plus" style="width:20px;height:20px;color:var(--color-primary)"></i> Créer une ressource</div>
                <form onsubmit="event.preventDefault(); showToast('Ressource pédagogique créée avec succès ! 🎉', 'success');" style="display:flex; flex-direction:column; gap:16px;">
                    <div>
                        <label style="font-weight:600; font-size:0.9rem; display:block; margin-bottom:6px;">Titre de la ressource</label>
                        <input type="text" class="chat-input-field" placeholder="Ex: Les fractions décimales" required style="width:100%;">
                    </div>
                    <div>
                        <label style="font-weight:600; font-size:0.9rem; display:block; margin-bottom:6px;">Matière</label>
                        <select class="chat-input-field" style="width:100%; height:48px;">
                            <option>Mathématiques</option>
                            <option>Français</option>
                            <option>Histoire-Géographie</option>
                            <option>SVT</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%;">Publier le contenu</button>
                </form>
            </div>
            
            <div class="card">
                <div class="card-title"><i data-lucide="file-text" style="width:20px;height:20px;color:var(--color-success)"></i> Ressources publiées</div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${[
                        { title: 'Fonctions affines (Vidéo + Quiz)', subject: 'Mathématiques', status: 'Publié' },
                        { title: 'Analyse du commentaire littéraire', subject: 'Français', status: 'Brouillon' }
                    ].map(r => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border:1px solid var(--border-color); border-radius: var(--border-radius-md);">
                            <div>
                                <strong style="font-size:0.9rem;">${r.title}</strong>
                                <div style="font-size:0.75rem; color:var(--text-secondary);">${r.subject}</div>
                            </div>
                            <span class="badge ${r.status === 'Publié' ? 'badge-success' : 'badge-warning'}">${r.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
    `;
}

function renderTeacherPlanning() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Emploi du temps & Sessions live</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">Gérez vos créneaux de tutorat et vos cours en direct.</p>
        
        <div class="card">
            <div class="card-title"><i data-lucide="calendar" style="width:20px;height:20px;color:var(--color-primary)"></i> Mon Planning de la semaine</div>
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
                ${[
                    { date: 'Lundi - 10:30', title: 'Cours en Direct - Fonctions affines', type: 'live' },
                    { date: 'Mardi - 14:00', title: 'Tutorat Individuel - Léa Martin', type: 'tutorat' },
                    { date: 'Jeudi - 16:00', title: 'Réunion d\'équipe pédagogique', type: 'admin' }
                ].map(p => `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:14px; border:1px solid var(--border-color); border-radius: var(--border-radius-md);">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span class="status-indicator ${p.type === 'live' ? 'status-danger' : p.type === 'tutorat' ? 'status-active' : 'status-pending'}"></span>
                            <div>
                                <strong style="font-size:0.95rem;">${p.title}</strong>
                                <div style="font-size:0.8rem; color:var(--text-secondary);">${p.date}</div>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="showToast('Session prête', 'success')">Démarrer</button>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    `;
}

// ─── SUB-PAGES RENDERING : ADMIN ─────────────────────────────────────────────
function renderAdminUsers() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Gestion des comptes</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">Activez, modifiez ou supprimez les comptes des utilisateurs de la plateforme.</p>
        
        <div class="card">
            <div class="card-title"><i data-lucide="users" style="width:20px;height:20px;color:var(--color-primary)"></i> En attente de validation</div>
            <div style="display:flex; flex-direction:column; gap:12px;">
                ${[
                    { name: 'Mme Durand', email: 'durand.tuteur@eduflex.fr', role: 'Enseignant' },
                    { name: 'Arthur Dupuis', email: 'arthur.dupuis@gmail.com', role: 'Élève' }
                ].map(u => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:14px; border:1px solid var(--border-color); border-radius: var(--border-radius-md);">
                        <div>
                            <strong style="font-size:0.95rem;">${u.name}</strong> (${u.role})
                            <div style="font-size:0.8rem; color:var(--text-secondary);">${u.email}</div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="btn btn-success btn-sm" onclick="showToast('Compte validé avec succès !', 'success')">Valider</button>
                            <button class="btn btn-secondary btn-sm" onclick="showToast('Demande rejetée', 'warning')" style="color:var(--color-danger); border-color:var(--color-danger);">Refuser</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    `;
}

function renderAdminStats() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Statistiques d'audience</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">Visualisez l'état global et l'utilisation de la plateforme EduFlex.</p>
        
        <div class="grid-2">
            <div class="card">
                <div class="card-title"><i data-lucide="activity" style="width:20px;height:20px;color:var(--color-primary)"></i> Engagement quotidien</div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    ${[
                        { label: 'Connexions d\'élèves uniques', val: '645', pct: 92 },
                        { label: 'Utilisation de l\'IA FlexBot', val: '2 840 requêtes', pct: 85 },
                        { label: 'Heures cumulées en live', val: '124 heures', pct: 78 }
                    ].map(s => `
                        <div>
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem; font-weight:600; margin-bottom:4px;">
                                <span>${s.label}</span><span>${s.val}</span>
                            </div>
                            <div class="progress-container"><div class="progress-fill" style="width:${s.pct}%"></div></div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="card">
                <div class="card-title"><i data-lucide="pie-chart" style="width:20px;height:20px;color:var(--color-success)"></i> Taux de complétion des cours</div>
                <div style="text-align:center; padding:24px;">
                    <div style="font-size:3rem; font-weight:800; color:var(--color-success);">87.4%</div>
                    <p style="color:var(--text-secondary); margin:8px 0;">des cours commencés sont terminés</p>
                    <span class="badge badge-success">+4.2% ce mois-ci</span>
                </div>
            </div>
        </div>
    </div>
    `;
}

function renderAdminConfig() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Configuration globale</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">Ajustez la sécurité, la modération de l'IA et les clés d'accès.</p>
        
        <div class="card" style="max-width:600px;">
            <div class="card-title"><i data-lucide="shield" style="width:20px;height:20px;color:var(--color-primary)"></i> Paramètres de Modération active</div>
            <form onsubmit="event.preventDefault(); showToast('Configuration sauvegardée ! ⚙️', 'success');" style="display:flex; flex-direction:column; gap:16px; margin-top:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="font-size:0.95rem; display:block;">Modération automatique IA</strong>
                        <small style="color:var(--text-secondary);">Filtrage instantané des contenus injurieux.</small>
                    </div>
                    <input type="checkbox" checked style="width:20px; height:20px; cursor:pointer;">
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="font-size:0.95rem; display:block;">Alertes bien-être sensibles</strong>
                        <small style="color:var(--text-secondary);">Alerter les tuteurs en cas de mots-clés liés au stress extrême.</small>
                    </div>
                    <input type="checkbox" checked style="width:20px; height:20px; cursor:pointer;">
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top:10px;">Enregistrer les paramètres</button>
            </form>
        </div>
    </div>
    `;
}

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────
function getPageContent() {
    // If visitor, only show public pages
    if (APP.role === 'visitor') {
        switch (APP.currentTab) {
            case 'connexion': return renderLoginPage();
            case 'inscription': return renderRegisterPage();
            default: return renderLandingPage();
        }
    }

    // If logged in, never show the landing page
    switch (APP.currentTab) {
        case 'accueil':
        case 'dashboard':
            switch (APP.role) {
                case 'student': return renderStudentDashboard();
                case 'parent': return renderParentDashboard();
                case 'teacher': return renderTeacherDashboard();
                case 'admin': return renderAdminDashboard();
                default: return renderStudentDashboard();
            }
        // Student pages
        case 'cours': return renderCoursPage();
        case 'ia-assistant': return renderIAAssistantPage();
        case 'live': return renderLivePage();
        case 'communaute': return renderCommunautePage();
        case 'bienetre': return renderBienEtrePage();
        case 'whiteboard': return renderWhiteboardPage();
        // Parent pages
        case 'suivi': return renderParentSuivi();
        case 'messages': return renderParentMessages();
        case 'facturation': return renderParentFacturation();
        // Teacher pages
        case 'mes-eleves': return renderTeacherStudents();
        case 'contenus': return renderTeacherContenus();
        case 'planning': return renderTeacherPlanning();
        // Admin pages
        case 'utilisateurs': return renderAdminUsers();
        case 'statistiques': return renderAdminStats();
        case 'configuration': return renderAdminConfig();
        default:
            APP.currentTab = 'dashboard';
            return getPageContent();
    }
}

// ─── MAIN RENDER ─────────────────────────────────────────────────────────────
function renderApp() {
    // Apply stored preferences
    document.documentElement.setAttribute('data-theme', APP.theme);
    document.documentElement.setAttribute('data-font-size', APP.fontSize);
    document.body.classList.toggle('dyslexic-mode', APP.dyslexicMode);

    renderSidebar();
    renderHeader();
    renderChatbotWidget();

    const main = document.getElementById('main-content');
    main.innerHTML = getPageContent();

    // Initialize Lucide icons
    lucide.createIcons();

    // Initialize whiteboard if on that page
    if (APP.currentTab === 'whiteboard') setTimeout(initWhiteboard, 100);
}

// ─── ACTIVE ROLE BUTTON STYLING ──────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
    .active-role {
        background-color: var(--color-primary) !important;
        color: white !important;
        border-color: var(--color-primary) !important;
    }
`;
document.head.appendChild(style);

// ─── BOOT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderApp();
});
