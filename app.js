/* ==========================================================================
   EDUFLEX - MAIN APPLICATION (app.js)
   Single Page Application with Auth Flow & Role-Based Routing
   ========================================================================== */

// ─── STATE MANAGEMENT ────────────────────────────────────────────────────────
const DEFAULT_STATE = {
    role: 'visitor',        // visitor | student | parent | teacher | admin
    username: '',
    currentTab: 'accueil',
    theme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    fontSize: 'medium',
    dyslexicMode: false,
    mood: null,
    ttsActive: false,
    lastStudiedSubject: 'Mathématiques',
    activeSubject: 'Mathématiques',
    activeChatContact: null,
    checklistCandidatLibre: {
        readStatut: false,
        checkDocs: false,
        submitForm: false,
        payFees: false
    },
    examSimulating: false,
    examTimeRemaining: 0,
    examSubject: 'Mathématiques',
    examScore: null,

    // Gamification & Avatar variables
    studentTheme: 'college', // college | lycee
    avatar: null, // format: { top, hairColor, skin, clothing, clothingColor, accessories, eyes, eyebrows, mouth }
    coins: 100,
    xp: 0,
    level: 1,
    unlockedAccessories: ['none', 'prescription01'], // AvataaarsJs accessory IDs unlocked by default
    shopBoughtAccessories: [],
    streak: 3,
    completedQuests: [],
    claimedQuests: [],
    exploredSubjects: [],
    unlockedBadges: [],
    soundMuted: false
};

function loadState() {
    try {
        const saved = localStorage.getItem('eduflex_state');
        const state = saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : { ...DEFAULT_STATE };
        document.documentElement.setAttribute('data-theme', state.theme);

        // Migrate old avatar format (skinColor/hairStyle) to new AvataaarsJs format
        if (state.avatar && state.avatar.skinColor && !state.avatar.skin) {
            state.avatar = null; // Reset old format, user will re-create
        }

        // Apply student theme if role is student
        if (state.role === 'student') {
            document.documentElement.setAttribute('data-student-theme', state.studentTheme || 'college');
        } else {
            document.documentElement.removeAttribute('data-student-theme');
        }

        if (state.dyslexicMode) document.body.classList.add('dyslexic-mode');
        return state;
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
    renderApp();
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
            { id: 'calendrier', label: 'Calendrier', icon: 'calendar' },
            { id: 'examens', label: 'Examens', icon: 'graduation-cap' },
            { id: 'ia-assistant', label: 'Assistant IA', icon: 'bot' },
            { id: 'live', label: 'Sessions Live', icon: 'video' },
            { id: 'messages', label: 'Messagerie', icon: 'mail' },
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

    let avatarHtml = `
        <div class="user-avatar" style="background:linear-gradient(135deg,var(--color-primary),var(--color-success));display:flex;align-items:center;justify-content:center;color:var(--text-on-primary,white);font-weight:700;font-size:1rem;border:none;">
            ${APP.username.charAt(0).toUpperCase()}
        </div>
    `;
    let userSummaryClickAction = `logout()`;
    let userSummaryTitle = `Déconnexion`;

    if (APP.role === 'student') {
        avatarHtml = `
            <div class="avatar-sidebar-container" onclick="openAvatarCreator(); event.stopPropagation();" style="width:42px; height:42px; cursor:pointer;" title="Personnaliser mon avatar et le thème">
                ${renderAvatarSVG(APP.avatar, APP.mood, 42)}
            </div>
        `;
        userSummaryClickAction = `openAvatarCreator()`;
        userSummaryTitle = `Personnaliser mon profil`;
    }

    sidebar.innerHTML = `
        <div class="sidebar-logo">
            <img src="Logo_small.png" alt="EduFlex" style="width:60px;height:60px;border-radius:8px;object-fit:contain">
            <span class="logo-text">EduFlex</span>
        </div>
        <ul class="nav-links">
            ${navItems.map(item => `
                <li class="nav-item ${APP.currentTab === item.id ? 'active' : ''}">
                    <a href="#" onclick="playRetroSound('click'); navigateTo('${item.id}'); return false;" id="nav-${item.id}">
                        <i data-lucide="${item.icon}" style="width:20px;height:20px"></i>
                        <span>${item.label}</span>
                    </a>
                </li>
            `).join('')}
        </ul>
        <div class="sidebar-footer">
            <div class="user-profile-summary" onclick="${userSummaryClickAction}" title="${userSummaryTitle}">
                ${avatarHtml}
                <div class="user-info-text" style="flex-grow:1; margin-left: 8px;">
                    <span class="user-name">${APP.username}</span>
                    <span class="user-role">${roleLabels[APP.role] || APP.role}</span>
                </div>
                ${APP.role === 'student' ? `
                    <div style="display:flex; gap:10px; align-items:center; margin-left:auto;">
                        <i data-lucide="palette" style="width:18px;height:18px;color:var(--text-muted)" onclick="openAvatarCreator(); event.stopPropagation();" title="Personnaliser"></i>
                        <i data-lucide="log-out" style="width:18px;height:18px;color:var(--text-muted)" onclick="logout(); event.stopPropagation();" title="Se déconnecter"></i>
                    </div>
                ` : `
                    <i data-lucide="log-out" style="width:18px;height:18px;margin-left:auto;color:var(--text-muted)" onclick="logout(); event.stopPropagation();" title="Se déconnecter"></i>
                `}
            </div>
        </div>
    `;
}

// ─── HEADER RENDERING ────────────────────────────────────────────────────────
function renderHeader() {
    const header = document.getElementById('global-header');
    const themeIcons = { light: 'sun', dark: 'moon', 'high-contrast': 'eye' };
    const nextTheme = APP.theme === 'light' ? 'dark' : APP.theme === 'dark' ? 'high-contrast' : 'light';

    if (APP.role === 'visitor') {
        header.innerHTML = `
            <div class="sidebar-logo" style="cursor:pointer" onclick="navigateTo('accueil')">
                <img src="Logo_small.png" alt="EduFlex" style="width:36px;height:36px;border-radius:8px;object-fit:contain">
                <span class="logo-text">EduFlex</span>
            </div>
            <div class="header-actions">
                <button class="icon-btn" onclick="setTheme('${nextTheme}')" title="Thème: ${nextTheme}">
                    <i data-lucide="${themeIcons[APP.theme]}" style="width:18px;height:18px"></i>
                </button>
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

    if (APP.role === 'student') {
        const xpProgress = APP.xp || 0;
        const level = APP.level || 1;
        const coins = APP.coins || 0;
        const streak = APP.streak || 0;
        const soundIcon = APP.soundMuted ? 'volume-x' : 'volume-2';

        header.innerHTML = `
            <div style="display:flex; align-items:center; gap:20px; flex-grow:1; max-width:600px; min-width: 250px;">
                <div class="xp-level-badge" onclick="openAvatarCreator()" style="cursor:pointer; width:48px; height:48px; min-width:48px;" title="Clique pour modifier ton avatar et ton thème !">
                    ${level}
                </div>
                <div style="display:flex; flex-direction:column; flex-grow:1; gap:4px">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:800;">
                        <span>Niveau ${level}</span>
                        <span>${xpProgress} / 100 XP</span>
                    </div>
                    <div class="xp-progress-bar-container">
                        <div class="xp-progress-fill" style="width: ${xpProgress}%;"></div>
                    </div>
                </div>
            </div>
            
            <div class="header-actions">
                <div class="streak-container" title="Série de jours consécutifs !">
                    <span class="streak-flame">🔥</span>
                    <span>${streak}</span>
                </div>
                
                <div style="display:inline-flex; align-items:center; gap:6px; font-weight:800; color:#F59E0B; background:rgba(245, 158, 11, 0.1); border:1px solid rgba(245, 158, 11, 0.2); padding:6px 12px; border-radius:12px;" title="Tes pièces d'or !">
                    <span>🪙</span>
                    <span>${coins}</span>
                </div>
                
                <button class="icon-btn ${APP.soundMuted ? '' : 'active'}" onclick="toggleMuteSound()" title="${APP.soundMuted ? 'Activer le son' : 'Couper le son'}">
                    <i data-lucide="${soundIcon}" style="width:18px;height:18px"></i>
                </button>
                
                <div class="quick-accessibility-menu">
                    <button class="icon-btn ${APP.ttsActive ? 'active' : ''}" onclick="toggleTTS()" title="Lecture vocale">
                        <i data-lucide="${APP.ttsActive ? 'volume-x' : 'volume-2'}" style="width:18px;height:18px"></i>
                    </button>
                    <button class="icon-btn ${APP.dyslexicMode ? 'active' : ''}" onclick="toggleDyslexicMode()" title="Mode dyslexie">
                        <i data-lucide="type" style="width:18px;height:18px"></i>
                    </button>
                </div>
            </div>
        `;
        return;
    }

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
                    <div class="ia-avatar" style="width:36px;height:36px;min-width:36px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%;">
                        <img src="avatar_william.png" alt="Avatar de William" style="width:100%; height:100%; object-fit: cover;">
                    </div>
                    <div><strong>William</strong><br><small style="color:var(--text-secondary)">IA pédagogique</small></div>
                </div>
                <button class="icon-btn" onclick="toggleChatPopup()"><i data-lucide="x" style="width:16px;height:16px"></i></button>
            </div>
            <div class="ia-messages-container" id="chatbot-messages">
                <div class="chat-bubble-wrapper ia">
                    <div class="ia-avatar" style="width:36px;height:36px;min-width:36px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%;">
                        <img src="avatar_william.png" alt="Avatar de William" style="width:100%; height:100%; object-fit: cover;">
                    </div>
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
                <p class="hero-desc">EduFlex réconcilie les élèves de 11 à 20 ans avec l'école grâce à un environnement flexible, un accompagnement humain et une IA pédagogique disponible 24h/24.</p>
                <div class="hero-actions">
                    <button class="btn btn-primary" onclick="navigateTo('inscription')"><i data-lucide="rocket" style="width:18px;height:18px"></i> Commencer gratuitement</button>
                    <button class="btn btn-secondary" onclick="navigateTo('connexion')"><i data-lucide="play-circle" style="width:18px;height:18px"></i> Découvrir la plateforme</button>
                </div>
            </div>
            <div class="hero-image-container">
                <div class="hero-img-mock" style="height:350px;background:linear-gradient(135deg, #eff6ff 0%, #ecfdf5 50%, #fffbeb 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
                    <img src="Logo.png" alt="EduFlex" style="width:250px;height:250px;border-radius:15px;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(59,130,246,0.25))">
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
                <div style="width:64px;height:64px;border-radius:var(--border-radius-md);background:linear-gradient(135deg,var(--color-primary),var(--color-success));display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--text-on-primary,white)">
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
                <div style="width:64px;height:64px;border-radius:var(--border-radius-md);background:linear-gradient(135deg,var(--color-primary),var(--color-success));display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--text-on-primary,white)">
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

    if (!APP.avatar) {
        setTimeout(openAvatarCreator, 500);
        return `
            <div class="fade-in-up" style="text-align:center; padding:80px 20px;">
                <div style="font-size:4rem; margin-bottom:24px;">🎒</div>
                <h1 style="font-size:2rem; font-weight:800; margin-bottom:12px;">Bienvenue sur EduFlex !</h1>
                <p style="color:var(--text-secondary); max-width:500px; margin:0 auto 32px; font-size:1.1rem;">
                    Prêt à commencer ton aventure d'apprentissage ? Crée ton avatar et choisis ton style (Collège Aventurier ou Lycée Pro Gamer) pour personnaliser ta plateforme !
                </p>
                <button class="btn btn-primary" onclick="openAvatarCreator()" style="padding:16px 32px; font-size:1.1rem;">
                    🚀 Créer mon avatar personnalisé
                </button>
            </div>
        `;
    }

    APP.rpgStats = APP.rpgStats || { INT: 50, FOCUS: 45, DEDICATION: 60, CREATIVE: 30 };
    const statsList = APP.rpgStats ? [
        { key: 'INT', name: 'INT (Cours)', color: '#7C3AED' },
        { key: 'FOCUS', name: 'FOCUS (Quiz)', color: '#3B82F6' },
        { key: 'DEDICATION', name: 'DEDICATION (Série)', color: '#34D399' },
        { key: 'CREATIVE', name: 'CREATIVE (Art)', color: '#F472B6' }
    ] : [];

    const quests = [
        { id: 'quest-avatar', title: 'Créer ton avatar personnalisé', xp: 50, coins: 20, isCompleted: true },
        { id: 'quest-math', title: 'Terminer le quiz de Mathématiques', xp: 40, coins: 15, isCompleted: APP.completedQuests?.includes('quest-math') || false },
        { id: 'quest-zen', title: 'Faire une séance de respiration de 10s', xp: 30, coins: 10, isCompleted: APP.completedQuests?.includes('quest-zen') || false },
        { id: 'quest-whiteboard', title: 'Dessiner et sauvegarder sur le Tableau Blanc', xp: 30, coins: 10, isCompleted: APP.completedQuests?.includes('quest-whiteboard') || false }
    ];

    const flashcardsData = {
        'Mathématiques': { front: "Quelle est la forme d'une fonction affine ?", back: "f(x) = ax + b, où a est le coefficient directeur et b l'ordonnée à l'origine." },
        'Français': { front: "Qu'est-ce qu'un oxymore ?", back: "L'alliance de deux mots de sens opposés (ex: Une obscure clarté)." },
        'SVT': { front: "Qu'est-ce que la mitose cellulaire ?", back: "Une division cellulaire permettant la multiplication des cellules à l'identique." },
        'Anglais': { front: "Traduction de : 'I look forward to hearing from you'", back: "Dans l'attente de vos nouvelles (formule de politesse)." }
    };
    const activeFlashcard = flashcardsData[APP.activeSubject || 'Mathématiques'] || flashcardsData['Mathématiques'];

    const leaderboard = getLeaderboardData();

    const achievements = [
        { id: 'first-avatar', title: 'Pionnier', desc: 'Avatar personnalisé créé', icon: 'user-check', unlocked: true },
        { id: 'math-quiz-master', title: 'As des Maths', desc: 'Score parfait au quiz', icon: 'award', unlocked: APP.unlockedBadges?.includes('math-quiz-master') },
        { id: 'zen-master', title: 'Zen Master', desc: 'Respiration complétée', icon: 'wind', unlocked: APP.unlockedBadges?.includes('zen-master') },
        { id: 'whiteboard-artist', title: 'Artiste', desc: 'Dessin sauvegardé', icon: 'palette', unlocked: APP.unlockedBadges?.includes('whiteboard-artist') },
        { id: 'streak-3', title: 'Super Streak', desc: 'Série de 3 jours et plus', icon: 'flame', unlocked: APP.streak >= 3 }
    ];

    const shopItems = [
        { id: 'sunglasses', name: '🕶️ Lunettes de Soleil', price: 50 },
        { id: 'wayfarers', name: '😎 Wayfarers', price: 60 },
        { id: 'round', name: '🤓 Lunettes Rondes', price: 40 },
        { id: 'prescription02', name: '👓 Lunettes Pro', price: 45 },
        { id: 'kurt', name: '🤪 Kurt Cobain', price: 80 },
        { id: 'winterHat01', name: '🧢 Bonnet d\'Hiver', price: 70 },
        { id: 'turban', name: '🧣 Turban', price: 90 },
        { id: 'hat', name: '🎩 Chapeau', price: 100 },
        { id: 'eyepatch', name: '🏴‍☠️ Cache-œil Pirate', price: 120 }
    ];

    return `
    <div class="fade-in-up">
        <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:24px;" class="dashboard-layout-grid">
            
            <div style="display:flex; flex-direction:column; gap:24px;">
                
                <div class="card">
                    <div class="card-title">
                        <i data-lucide="compass" style="width:22px;height:22px;color:var(--color-primary);"></i>
                        <span>Quêtes du Jour</span>
                    </div>
                    <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:16px;">
                        Complète ces missions quotidiennes pour gagner de l'XP et des pièces d'or !
                    </p>
                    
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        ${quests.map(q => {
        const isClaimed = APP.claimedQuests?.includes(q.id);
        let actionButton = '';

        if (isClaimed) {
            actionButton = `<span class="badge badge-success">Récupérée 🎁</span>`;
        } else if (q.isCompleted) {
            actionButton = `
                                    <button class="btn btn-success btn-sm" onclick="claimQuestReward('${q.id}', ${q.xp}, ${q.coins})">
                                        Récupérer (+${q.xp}XP)
                                    </button>
                                `;
        } else {
            let clickAction = '';
            if (q.id === 'quest-math') clickAction = `selectSubject('Mathématiques'); navigateTo('cours');`;
            else if (q.id === 'quest-zen') clickAction = `navigateTo('bienetre');`;
            else if (q.id === 'quest-whiteboard') clickAction = `navigateTo('whiteboard');`;

            actionButton = `
                                    <button class="btn btn-secondary btn-sm" onclick="${clickAction}">
                                        Lancer ⚔️
                                    </button>
                                `;
        }

        return `
                                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border:1px solid var(--border-color); border-radius:var(--border-radius-md); background:rgba(0,0,0,0.01);">
                                    <div style="display:flex; align-items:center; gap:12px;">
                                        <i data-lucide="${q.isCompleted ? 'check-circle' : 'circle'}" style="color:${q.isCompleted ? 'var(--color-success)' : 'var(--text-muted)'}; width:20px; height:20px;"></i>
                                        <div>
                                            <span style="font-weight:700; font-size:0.9rem; text-decoration:${q.isCompleted ? 'line-through' : 'none'}; opacity:${q.isCompleted ? 0.6 : 1};">${q.title}</span>
                                            <div style="font-size:0.75rem; color:#F59E0B; font-weight:700;">💎 +${q.xp} XP · 🪙 +${q.coins} Pièces</div>
                                        </div>
                                    </div>
                                    <div>${actionButton}</div>
                                </div>
                            `;
    }).join('')}
                    </div>
                </div>

                <div class="card">
                    <div class="card-title">
                        <i data-lucide="gamepad-2" style="width:22px;height:22px;color:var(--color-success);"></i>
                        <span>Mini-jeux de révision</span>
                    </div>
                    <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:16px;">
                        Entraîne-toi en t'amusant avec nos outils interactifs.
                    </p>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1.2fr; gap:16px;">
                        <div class="flashcards-hub" style="background:rgba(0,0,0,0.01); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:16px;">
                            <strong style="font-size:0.85rem; margin-bottom:12px; text-transform:uppercase; color:var(--text-secondary); text-align:center;">Flashcard (${APP.activeSubject})</strong>
                            <div class="flashcard-wrapper" onclick="flipFlashcard(this)">
                                <div class="flashcard" id="dash-flashcard">
                                    <div class="flashcard-face flashcard-front">
                                        <div style="font-weight:700; font-size:0.85rem;">${activeFlashcard.front}</div>
                                        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:16px;">(Clique pour retourner)</div>
                                    </div>
                                    <div class="flashcard-face flashcard-back">
                                        <div style="font-size:0.8rem; font-weight:600; line-height:1.4;">${activeFlashcard.back}</div>
                                    </div>
                                </div>
                            </div>
                            <button class="btn btn-secondary btn-sm" onclick="changeDashboardFlashcard(); event.stopPropagation();">
                                Autre matière 🔄
                            </button>
                        </div>
                        
                        <div style="background:rgba(0,0,0,0.01); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:16px; display:flex; flex-direction:column; justify-content:space-between;" id="mini-quiz-box">
                            ${renderMiniQuizWidget()}
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-title">
                        <i data-lucide="trophy" style="width:22px;height:22px;color:var(--color-warning);"></i>
                        <span>Mur des Trophées</span>
                    </div>
                    <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:16px;">
                        Gagne des badges pour débloquer des accessoires d'avatar.
                    </p>
                    
                    <div class="trophy-badge-grid">
                        ${achievements.map(a => `
                            <div class="trophy-badge-item ${a.unlocked ? 'unlocked' : ''}" title="${a.desc}">
                                <div style="width:48px; height:48px; border-radius:50%; background:${a.unlocked ? 'var(--color-warning-light)' : 'rgba(0,0,0,0.05)'}; color:${a.unlocked ? 'var(--color-warning)' : 'var(--text-muted)'}; display:flex; align-items:center; justify-content:center; border:2px solid ${a.unlocked ? 'var(--color-warning)' : 'var(--border-color)'}; margin-bottom:6px;">
                                    <i data-lucide="${a.unlocked ? a.icon : 'lock'}" style="width:24px; height:24px;"></i>
                                </div>
                                <span style="font-size:0.75rem; font-weight:800;">${a.title}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

            </div>

            <div style="display:flex; flex-direction:column; gap:24px;">
                
                <div class="card" style="position:relative; overflow:hidden;">
                    <div class="card-title">
                        <i data-lucide="user" style="width:22px;height:22px;color:var(--color-primary);"></i>
                        <span>Fiche de Personnage</span>
                    </div>
                    
                    <div style="display:flex; justify-content:space-around; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
                        <div style="width:110px; height:110px;">
                            ${renderAvatarSVG(APP.avatar, APP.mood, 110)}
                        </div>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <button class="btn btn-primary btn-sm" onclick="openAvatarCreator()">
                                <i data-lucide="palette" style="width:14px;height:14px"></i> Éditeur d'Avatar
                            </button>
                            
                            <div style="display:flex; gap:6px; justify-content: center;">
                                ${['😢', '😐', '😄'].map((emoji, i) => {
        const moodIdx = i * 2;
        const isActive = APP.mood === moodIdx;
        return `
                                        <button class="icon-btn ${isActive ? 'active' : ''}" style="width:32px; height:32px; font-size:1.1rem; padding:0; display:flex; align-items:center; justify-content:center;" onclick="setMood(${moodIdx})" title="Changer d'humeur">
                                            ${emoji}
                                        </button>
                                    `;
    }).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="rpg-stats-grid">
                        ${statsList.map(stat => {
        const val = APP.rpgStats[stat.key] || 0;
        const r = 34;
        const circ = 2 * Math.PI * r;
        const strokeOffset = circ - (circ * val / 100);

        return `
                                <div class="rpg-stat-card">
                                    <svg class="stat-circle-svg" width="80" height="80">
                                        <circle class="stat-circle-bg" cx="40" cy="40" r="${r}" />
                                        <circle class="stat-circle-val" cx="40" cy="40" r="${r}" 
                                                stroke="${stat.color}" 
                                                stroke-dasharray="${circ}" 
                                                stroke-dashoffset="${strokeOffset}" />
                                        <text x="50%" y="55%" text-anchor="middle" font-weight="800" font-size="12" fill="var(--text-primary)" transform="rotate(90 40 40)">${val}%</text>
                                    </svg>
                                    <div class="stat-label-rpg" style="color:${stat.color}">${stat.name}</div>
                                </div>
                            `;
    }).join('')}
                    </div>
                </div>

                <div class="card">
                    <div class="card-title">
                        <i data-lucide="shopping-bag" style="width:22px;height:22px;color:var(--color-primary);"></i>
                        <span>Boutique d'Avatar</span>
                    </div>
                    <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:16px;">
                        Achète des accessoires exclusifs pour ton avatar avec tes pièces d'or !
                    </p>
                    
                    <div class="shop-grid">
                        ${shopItems.map(item => {
        const isOwned = APP.shopBoughtAccessories?.includes(item.id) || APP.unlockedAccessories?.includes(item.id);

        return `
                                <div class="shop-item-card">
                                    <span style="font-size:1.6rem; margin-bottom:4px;">${item.name.split(' ')[0]}</span>
                                    <span style="font-size:0.75rem; font-weight:700; margin-bottom:6px;">${item.name.substring(item.name.indexOf(' ') + 1)}</span>
                                    <div class="shop-item-price">
                                        <span>🪙</span>
                                        <span>${item.price}</span>
                                    </div>
                                    ${isOwned ? `
                                        <button class="btn btn-secondary btn-sm" style="width:100%" disabled>Acquis</button>
                                    ` : `
                                        <button class="btn btn-primary btn-sm" style="width:100%" onclick="buyAccessory('${item.id}', ${item.price})">Acheter</button>
                                    `}
                                </div>
                            `;
    }).join('')}
                    </div>
                </div>

                <div class="card">
                    <div class="card-title">
                        <i data-lucide="users" style="width:22px;height:22px;color:var(--color-primary);"></i>
                        <span>Classement de la semaine</span>
                    </div>
                    <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:16px;">
                        Classement hebdomadaire bienveillant basé sur ta progression en XP.
                    </p>
                    
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${leaderboard.map((u, idx) => {
        const isUser = u.isUser || false;
        const medals = ['🥇', '🥈', '🥉'];
        const rankIcon = medals[idx] || `${idx + 1}.`;

        return `
                                <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-radius:12px; border:${isUser ? '2px solid var(--color-primary)' : '1px solid transparent'}; background:${isUser ? 'var(--color-primary-light)' : 'rgba(0,0,0,0.01)'}; font-weight:${isUser ? 800 : 500};">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <span style="font-size:1.1rem; width:24px; text-align:center;">${rankIcon}</span>
                                        <div style="width:32px; height:32px;">
                                            ${renderAvatarSVG(u.avatar || { skin: 'light', top: 'shortWaved', hairColor: 'brown', clothing: 'hoodie', clothingColor: 'blue02', accessories: 'none', eyes: 'default', eyebrows: 'defaultNatural', mouth: 'default' }, null, 32)}
                                        </div>
                                        <span style="font-size:0.9rem;">${u.name}</span>
                                    </div>
                                    <span style="color:var(--color-primary); font-weight:800; font-size:0.9rem;">${u.xp} XP</span>
                                </div>
                            `;
    }).join('')}
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
    if (index >= 3) {
        launchConfetti();
        playRetroSound('success');
    } else if (index === 0) {
        playRetroSound('error');
    } else {
        playRetroSound('click');
    }
    showToast('Humeur enregistrée ! Merci 💙', 'success');
    renderApp();
}

// ─── PAGE: COURS ─────────────────────────────────────────────────────────────
const COURSES_DATA = {
    'Mathématiques': {
        videoUrl: 'https://www.youtube.com/embed/n5_pRx4ozIg?start=7',
        videoTitle: 'Cours en cours : Fonctions affines',
        fiches: [
            { id: 'math-affines-cours', title: 'Synthèse : Les Fonctions Affines', type: 'Cours', size: '1.2 Mo', desc: 'Définition, représentation graphique, détermination du coefficient directeur.', contentHtml: '<h3>Les Fonctions Affines</h3><p>Une fonction affine est une fonction de la forme <strong>f(x) = ax + b</strong>.</p><ul><li><strong>a</strong> est le coefficient directeur (la pente de la droite).</li><li><strong>b</strong> est l\'ordonnée à l\'origine (l\'endroit où la droite coupe l\'axe vertical).</li></ul><h4>Exemple</h4><p>Soit <em>f(x) = 2x - 3</em>. Le coefficient directeur est 2 (la droite monte), et l\'ordonnée à l\'origine est -3.</p>' },
            { id: 'math-affines-exo', title: 'Exercices corrigés : Équations & Tracés', type: 'Exercices', size: '950 Ko', desc: '10 exercices de difficulté progressive avec corrections détaillées.', contentHtml: '<h3>Exercices corrigés : Équations & Tracés</h3><p><strong>Exercice 1 :</strong> Déterminer l\'équation de la droite passant par A(1, 2) et B(3, 8).</p><p><em>Correction :</em><br>Le coefficient directeur <em>a = (yB - yA) / (xB - xA) = (8 - 2) / (3 - 1) = 6 / 2 = 3</em>.<br>L\'équation est de la forme <em>y = 3x + b</em>. Comme A(1, 2) appartient à la droite, on a : <em>2 = 3(1) + b => b = -1</em>.<br>L\'équation de la droite est donc <strong>y = 3x - 1</strong>.</p>' },
            { id: 'math-analytique-memo', title: 'Formulaire de Géométrie analytique', type: 'Mémo', size: '450 Ko', desc: 'Toutes les formules essentielles sur les coordonnées et vecteurs.', contentHtml: '<h3>Formulaire de Géométrie analytique</h3><p>Dans un repère orthonormé (O, I, J) :</p><ul><li><strong>Distance entre deux points :</strong> d = √((xB - xA)² + (yB - yA)²)</li><li><strong>Coordonnées du milieu :</strong> M((xA + xB)/2 ; (yA + yB)/2)</li><li><strong>Coordonnées d\'un vecteur AB :</strong> AB(xB - xA ; yB - yA)</li></ul>' }
        ],
        quiz: [
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
        ]
    },
    'Français': {
        videoUrl: 'https://www.youtube.com/embed/0T26wN8yJ7g',
        videoTitle: 'Cours en cours : Les figures de style',
        fiches: [
            { id: 'fr-style-cours', title: 'Les Figures de Style incontournables', type: 'Cours', size: '1.5 Mo', desc: 'Métaphores, comparaisons, personnifications et oxymores illustrés.', contentHtml: '<h3>Les Figures de Style</h3><p>Les figures de style enrichissent un texte et lui donnent une force expressive.</p><ul><li><strong>La Comparaison :</strong> Rapprochement de deux éléments à l\'aide d\'un outil de comparaison (comme, tel, semblable à). <em>Exemple : Il est fort comme un lion.</em></li><li><strong>La Métaphore :</strong> Comparaison sans mot de liaison. <em>Exemple : Cet homme est un lion.</em></li><li><strong>L\'Oxymore :</strong> Alliance de deux mots de sens opposés. <em>Exemple : Une obscure clarté.</em></li></ul>' },
            { id: 'fr-commentaire-methode', title: 'Fiche Méthode : Le Commentaire Littéraire', type: 'Méthodologie', size: '850 Ko', desc: 'Structure du plan, introduction, développement et conclusion type.', contentHtml: '<h3>Fiche Méthode : Le Commentaire Littéraire</h3><p>Le commentaire de texte réclame rigueur et logique :</p><ol><li><strong>L\'Introduction :</strong> Présentation de l\'auteur, de l\'œuvre, situation du passage, problématique et annonce du plan.</li><li><strong>Le Développement :</strong> Deux ou trois grandes parties structurées en sous-parties avec citations analysées.</li><li><strong>La Conclusion :</strong> Bilan des axes principaux et ouverture vers un autre texte ou auteur.</li></ol>' }
        ],
        quiz: [
            {
                question: 'Quelle figure de style est utilisée dans "Cette obscure clarté qui tombe des étoiles" ?',
                options: ['Une métaphore', 'Un oxymore', 'Une comparaison', 'Une hyperbole'],
                correct: 1,
                explanation: 'Un oxymore réunit deux termes de sens opposés dans un même groupe de mots ("obscure clarté"). La métaphore est une comparaison sans outil de comparaison, la comparaison utilise un outil, et l\'hyperbole est une exagération.'
            },
            {
                question: 'Qu\'est-ce qu\'une comparaison ?',
                options: ['Rapprocher deux termes avec un outil de comparaison', 'Rapprocher deux termes sans outil de comparaison', 'Exagérer une réalité', 'Attribuer des traits humains à un objet ou animal'],
                correct: 0,
                explanation: 'La comparaison utilise un mot outil (comme, semblable à, tel que). Rapprocher deux termes sans outil est une métaphore, exagérer est une hyperbole et attribuer des traits humains est une personnification.'
            }
        ]
    },
    'Histoire-Géo': {
        videoUrl: 'https://www.youtube.com/embed/3Lr6G12sR64',
        videoTitle: 'Cours en cours : La Première Guerre Mondiale',
        fiches: [
            { id: 'hg-ww1-cours', title: 'Synthèse : La Première Guerre Mondiale (1914-1918)', type: 'Cours', size: '2.1 Mo', desc: 'Les grandes phases du conflit, la vie dans les tranchées et le bilan humain.', contentHtml: '<h3>La Première Guerre Mondiale (1914-1918)</h3><p>Un conflit total qui a bouleversé l\'Europe :</p><ul><li><strong>1914 :</strong> Entrée en guerre suite à l\'assentiment de François-Ferdinand à Sarajevo. Guerre de mouvement.</li><li><strong>1915-1917 :</strong> Guerre de position (tranchées). Conditions de vie effroyables des Poilus (Verdun, la Somme).</li><li><strong>1918 :</strong> Reprise de la guerre de mouvement et signature de l\'Armistice le 11 novembre.</li></ul>' },
            { id: 'hg-mondialisation-carte', title: 'Cartographie : La mondialisation en fonctionnement', type: 'Cartes', size: '3.4 Mo', desc: 'Cartes clés des flux mondiaux, des métropoles et des espaces maritimes.', contentHtml: '<h3>Cartographie : La mondialisation</h3><p>La mondialisation repose sur des flux et des centres d\'impulsion majeurs :</p><ul><li><strong>Les flux matériels :</strong> Marchandises maritimes transitant par les grands canaux (Suez, Panama).</li><li><strong>Les flux immatériels :</strong> Capitaux financiers et informations numériques instantanées.</li><li><strong>Les pôles majeurs :</strong> Les trois mégapoles mondiales (Américaine, Européenne, Asiatique).</li></ul>' }
        ],
        quiz: [
            {
                question: 'En quelle année a débuté la Première Guerre Mondiale ?',
                options: ['1912', '1914', '1916', '1918'],
                correct: 1,
                explanation: 'La Première Guerre Mondiale a débuté en août 1914 suite à l\'assassinat de l\'archiduc François-Ferdinand en juin 1914 et à la mobilisation des alliances.'
            },
            {
                question: 'Quel traité met fin officiellement à la Première Guerre Mondiale en 1919 ?',
                options: ['Le traité de Rome', 'Le traité de Versailles', 'Le traité d\'Utrecht', 'Le traité de Paris'],
                correct: 1,
                explanation: 'Le traité de Versailles, signé le 28 juin 1919 dans la galerie des Glaces, règle la paix et attribue la responsabilité de la guerre à l\'Allemagne.'
            }
        ]
    },
    'SVT': {
        videoUrl: 'https://www.youtube.com/embed/Q4X-3W7W1wQ',
        videoTitle: 'Cours en cours : La mitose et réplication de l\'ADN',
        fiches: [
            { id: 'svt-adn-cours', title: 'La Mitose & Réplication de l\'ADN', type: 'Cours', size: '1.9 Mo', desc: 'Représentation visuelle des étapes de division cellulaire et réplication.', contentHtml: '<h3>La Réplication de l\'ADN</h3><p>L\'ADN se réplique de manière semi-conservative :</p><ul><li>Les deux brins de la double hélice se séparent.</li><li>De nouveaux nucléotides complémentaires sont assemblés en face de chaque brin modèle.</li><li>On obtient deux molécules d\'ADN identiques à la molécule de départ.</li></ul>' },
            { id: 'svt-lexique-genetique', title: 'Le vocabulaire de la génétique', type: 'Lexique', size: '1.1 Mo', desc: 'Définitions essentielles : Allèle, Gène, Génome, Phénotype et Génotype.', contentHtml: '<h3>Lexique de Génétique</h3><ul><li><strong>Gène :</strong> Portion d\'ADN codant pour un caractère précis.</li><li><strong>Allèle :</strong> Version différente d\'un même gène (ex: allèle yeux bleus / yeux marrons).</li><li><strong>Génotype :</strong> Ensemble des allèles d\'un individu.</li><li><strong>Phénotype :</strong> Ensemble des caractères observables d\'un individu.</li></ul>' }
        ],
        quiz: [
            {
                question: 'Quelle molécule porte l\'information génétique ?',
                options: ['L\'ARN', 'L\'ADN', 'Une protéine', 'Le glucose'],
                correct: 1,
                explanation: 'L\'ADN (Acide Désoxyribonucléique) est le support universel de l\'information génétique chez la majorité des êtres vivants.'
            }
        ]
    },
    'Anglais': {
        videoUrl: 'https://www.youtube.com/embed/l59B6d7wOeo',
        videoTitle: 'Cours en cours : Les temps du passé',
        fiches: [
            { id: 'ang-verbs-memo', title: 'Mémo : Les Verbes Irréguliers', type: 'Mémo', size: '600 Ko', desc: 'Tableau complet classé par phonétique des 100 verbes les plus courants.', contentHtml: '<h3>Les Verbes Irréguliers essentiels</h3><table><thead><tr><th>Base Verbale</th><th>Prétérit</th><th>Participe Passé</th><th>Traduction</th></tr></thead><tbody><tr><td>Be</td><td>was/were</td><td>been</td><td>être</td></tr><tr><td>Go</td><td>went</td><td>gone</td><td>aller</td></tr><tr><td>Do</td><td>did</td><td>done</td><td>faire</td></tr><tr><td>Take</td><td>took</td><td>taken</td><td>prendre</td></tr></tbody></table>' },
            { id: 'ang-opinion-vocab', title: 'Vocabulaire thématique : Exprimer son opinion', type: 'Vocabulaire', size: '420 Ko', desc: 'Mots de liaison et tournures idiomatiques pour argumenter.', contentHtml: '<h3>Exprimer son opinion en anglais</h3><ul><li><strong>In my opinion / To my mind :</strong> À mon avis</li><li><strong>I strongly believe that... :</strong> Je crois fermement que...</li><li><strong>On the one hand... on the other hand... :</strong> D\'un côté... de l\'autre...</li><li><strong>To sum up / In conclusion :</strong> En conclusion</li></ul>' }
        ],
        quiz: [
            {
                question: 'Quel est le prétérit du verbe "to go" ?',
                options: ['goed', 'gone', 'went', 'goes'],
                correct: 2,
                explanation: 'Le verbe "to go" est irrégulier : go / went / gone. Le prétérit simple est donc "went".'
            }
        ]
    },
    'Physique-Chimie': {
        videoUrl: 'https://www.youtube.com/embed/V6W_W1p4GVE',
        videoTitle: 'Cours en cours : Structure de l\'atome',
        fiches: [
            { id: 'pc-atome-memo', title: 'Le Tableau Périodique des Éléments', type: 'Mémo', size: '1.4 Mo', desc: 'Familles chimiques et propriétés fondamentales pour les atomes.', contentHtml: '<h3>Structure de l\'Atome</h3><p>Un atome est constitué :</p><ul><li>D\'un <strong>noyau</strong> central contenant des protons (chargés positivement) et des neutrons (neutres).</li><li>De <strong>nuages d\'électrons</strong> (chargés négativement) gravitant autour du noyau.</li></ul><p>L\'atome est électriquement neutre : il y a autant d\'électrons que de protons.</p>' }
        ],
        quiz: [
            {
                question: 'Quelle est la formule chimique de l\'eau ?',
                options: ['CO2', 'NaCl', 'H2O', 'CH4'],
                correct: 2,
                explanation: 'La formule chimique de l\'eau est H2O (deux atomes d\'hydrogène pour un atome d\'oxygène). CO2 est le dioxyde de carbone, NaCl le sel de table, et CH4 le méthane.'
            }
        ]
    }
};

let quizIndex = 0, quizScore = 0, quizAnswered = false;
let activePreviewFiche = null;

function renderCoursPage() {
    APP.activeSubject = APP.activeSubject || 'Mathématiques';
    const subject = COURSES_DATA[APP.activeSubject] || COURSES_DATA['Mathématiques'];

    const subjects = [
        { icon: 'calculator', name: 'Mathématiques', progress: 72, lessons: 24, color: '#3b82f6' },
        { icon: 'book-open', name: 'Français', progress: 58, lessons: 18, color: '#10b981' },
        { icon: 'landmark', name: 'Histoire-Géo', progress: 85, lessons: 20, color: '#f59e0b' },
        { icon: 'flask-conical', name: 'SVT', progress: 40, lessons: 16, color: '#8b5cf6' },
        { icon: 'globe', name: 'Anglais', progress: 63, lessons: 22, color: '#ec4899' },
        { icon: 'atom', name: 'Physique-Chimie', progress: 35, lessons: 14, color: '#14b8a6' }
    ];

    return `
    <div class="fade-in-up">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
            <div>
                <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Mes Cours</h1>
                <p style="color:var(--text-secondary)">Explore tes matières, consulte tes fiches et continue ta progression.</p>
            </div>
            <button class="btn btn-primary" onclick="selectSubject('${APP.lastStudiedSubject || 'Mathématiques'}'); showToast('Reprise du cours de ${APP.lastStudiedSubject || 'Mathématiques'}', 'success')">
                <i data-lucide="play-circle" style="width:18px;height:18px"></i> Reprendre où je m'étais arrêté (${APP.lastStudiedSubject || 'Mathématiques'})
            </button>
        </div>

        <!-- Filter bar -->
        <div class="card" style="padding:16px; margin-bottom:24px; display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
            <span style="font-weight:600; font-size:0.9rem;"><i data-lucide="filter" style="width:16px;height:16px;vertical-align:middle;margin-right:6px"></i>Niveau d'études :</span>
            <button class="btn btn-primary btn-sm" style="padding:6px 12px">Tous</button>
            <button class="btn btn-secondary btn-sm" onclick="showToast('Filtré pour le Collège', 'primary')" style="padding:6px 12px">Collège (3ème)</button>
            <button class="btn btn-secondary btn-sm" onclick="showToast('Filtré pour le Lycée', 'primary')" style="padding:6px 12px">Lycée (Seconde/1ère)</button>
        </div>

        <!-- Subjects Grid -->
        <div class="course-subjects-grid" style="margin-bottom: 40px">
            ${subjects.map(s => {
        const isActive = APP.activeSubject === s.name;
        return `
                <div class="subject-card ${isActive ? 'active' : ''}" 
                     style="cursor:pointer; transition: transform 0.2s, box-shadow 0.2s; border: 2px solid ${isActive ? s.color : 'transparent'}; box-shadow: ${isActive ? '0 10px 20px -5px ' + s.color + '30' : ''}"
                     onclick="selectSubject('${s.name}')">
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
                `;
    }).join('')}
        </div>

        <div style="border-bottom: 2px solid var(--border-color); margin-bottom: 40px;"></div>

        <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:24px;display:flex;align-items:center;gap:12px">
            <span style="display:inline-block;width:12px;height:24px;border-radius:4px;background:var(--color-primary)"></span>
            Matière active : ${APP.activeSubject}
        </h2>

        <!-- Fiches & Ressources Section -->
        <div class="card" style="margin-bottom:32px">
            <div class="card-title"><i data-lucide="files" style="width:20px;height:20px;color:var(--color-primary)"></i> Fiches de cours & révision</div>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:20px">Retrouve tes synthèses de cours, tes fiches méthodes et tes mémos indispensables.</p>
            <div style="display:grid;grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));gap:16px">
                ${subject.fiches.map(f => `
                    <div class="card card-premium" style="display:flex;flex-direction:column;justify-content:space-between;padding:20px;border:1px solid var(--border-color)">
                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
                                <span class="badge" style="background:var(--color-primary-light);color:var(--color-primary);font-size:0.75rem;padding:4px 8px;border-radius:6px;font-weight:600">${f.type}</span>
                                <span style="font-size:0.75rem;color:var(--text-secondary)">${f.size}</span>
                            </div>
                            <h4 style="font-size:1rem;font-weight:700;margin-bottom:8px;line-height:1.4">${f.title}</h4>
                            <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px;line-height:1.5">${f.desc}</p>
                        </div>
                        <div style="display:flex;gap:10px">
                            <button class="btn btn-secondary btn-sm" style="flex:1" onclick="previewFiche('${f.id}')"><i data-lucide="eye" style="width:14px;height:14px"></i> Lire</button>
                            <button class="btn btn-primary btn-sm" onclick="showToast('Téléchargement de la fiche démarré...', 'success')"><i data-lucide="download" style="width:14px;height:14px"></i> PDF</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Video Player -->
        <div class="card" style="margin-bottom:32px">
            <div class="card-title"><i data-lucide="play-circle" style="width:20px;height:20px;color:var(--color-primary)"></i> ${subject.videoTitle || 'Cours vidéo interactif'}</div>
            <div style="position:relative;width:100%;padding-top:56.25%;border-radius:12px;overflow:hidden;background:#000">
                <iframe
                    src="${subject.videoUrl}"
                    style="position:absolute;top:0;left:0;width:100%;height:100%;border:none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen
                    title="${subject.videoTitle}"
                ></iframe>
            </div>
        </div>

        <!-- Quiz Section -->
        <div class="card" style="margin-bottom:40px">
            <div class="card-title"><i data-lucide="help-circle" style="width:20px;height:20px;color:var(--color-success)"></i> Quiz d'évaluation</div>
            <div class="quiz-container-box" id="quiz-area">
                ${renderQuiz()}
            </div>
        </div>
    </div>

    <!-- Fiche Preview Overlay Modal -->
    ${activePreviewFiche ? `
    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px" onclick="closeFichePreview()">
        <div class="card fade-in" style="width:100%;max-width:700px;max-height:85vh;overflow-y:auto;position:relative;padding:32px;box-shadow:var(--shadow-lg)" onclick="event.stopPropagation()">
            <button class="icon-btn" style="position:absolute;top:20px;right:20px" onclick="closeFichePreview()"><i data-lucide="x" style="width:18px;height:18px"></i></button>
            <div style="margin-bottom:20px">
                <span class="badge" style="background:var(--color-primary-light);color:var(--color-primary);margin-bottom:8px">${activePreviewFiche.type}</span>
                <h2 style="font-size:1.4rem;font-weight:800;margin-bottom:8px">${activePreviewFiche.title}</h2>
                <div style="border-bottom:1px solid var(--border-color);margin-top:16px"></div>
            </div>
            <div class="fiche-modal-body" style="font-size:0.95rem;line-height:1.6;color:var(--text-primary)">
                ${activePreviewFiche.contentHtml}
            </div>
            <div style="margin-top:32px;display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap">
                <button class="btn btn-secondary" onclick="toggleTTSFiche()" id="tts-fiche-btn"><i data-lucide="volume-2" style="width:16px;height:16px"></i> Lire à haute voix</button>
                <button class="btn btn-secondary" onclick="closeFichePreview()">Fermer</button>
                <button class="btn btn-primary" onclick="showToast('Téléchargement démarré...', 'success'); closeFichePreview()"><i data-lucide="download" style="width:16px;height:16px"></i> Télécharger PDF</button>
            </div>
        </div>
    </div>
    ` : ''}
    `;
}

function selectSubject(subjectName) {
    APP.activeSubject = subjectName;
    APP.lastStudiedSubject = subjectName;
    saveState();
    quizIndex = 0;
    quizScore = 0;
    quizAnswered = false;

    if (APP.role === 'student') {
        checkExplorateurAchievement();
    }

    renderApp();
}

function previewFiche(ficheId) {
    const subject = COURSES_DATA[APP.activeSubject] || COURSES_DATA['Mathématiques'];
    const fiche = subject.fiches.find(f => f.id === ficheId);
    if (fiche) {
        activePreviewFiche = fiche;
        if (APP.role === 'student') {
            gainXP(15, "Fiche consultée");
            updateRPGStat('INT', 10);
        }
        renderApp();
    }
}

function closeFichePreview() {
    activePreviewFiche = null;
    speechSynthesis.cancel();
    renderApp();
}

function toggleTTSFiche() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        showToast("Lecture audio arrêtée", "primary");
    } else if (activePreviewFiche) {
        // Strip HTML tag utilities for speaking
        const rawText = activePreviewFiche.contentHtml.replace(/<[^>]*>/g, ' ');
        const utterance = new SpeechSynthesisUtterance(rawText);
        utterance.lang = 'fr-FR';
        speechSynthesis.speak(utterance);
        showToast("Lecture audio démarrée", "success");
    }
}

const quizData = []; // Fallback for references, but functions will use dynamic evaluation

function renderQuiz() {
    const currentSubject = APP.activeSubject || 'Mathématiques';
    const activeQuizData = COURSES_DATA[currentSubject]?.quiz || [];

    if (quizIndex >= activeQuizData.length) {
        return `
            <div style="text-align:center;padding:40px">
                <div style="font-size:3rem;margin-bottom:16px">${quizScore === activeQuizData.length ? '🏆' : quizScore >= 1 ? '🎉' : '💪'}</div>
                <h3 style="font-size:1.3rem;font-weight:700;margin-bottom:8px">Quiz terminé !</h3>
                <p style="color:var(--text-secondary);margin-bottom:24px">Score : ${quizScore}/${activeQuizData.length}</p>
                <button class="btn btn-primary" onclick="resetQuiz()"><i data-lucide="rotate-ccw" style="width:16px;height:16px"></i> Recommencer</button>
            </div>
        `;
    }
    const q = activeQuizData[quizIndex];
    return `
        <div class="quiz-question-counter">Question ${quizIndex + 1}/${activeQuizData.length}</div>
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

    const currentSubject = APP.activeSubject || 'Mathématiques';
    const activeQuizData = COURSES_DATA[currentSubject]?.quiz || [];
    const q = activeQuizData[quizIndex];
    const correct = q.correct;
    const options = document.querySelectorAll('.quiz-option-item');

    options[correct].classList.add('correct');
    if (index === correct) {
        quizScore++;
        showToast('Bonne réponse ! 🎯', 'success');
        if (APP.role === 'student') {
            gainXP(15);
            gainCoins(5);
            updateRPGStat('FOCUS', 8);
        }
    } else {
        options[index].classList.add('incorrect');
        showToast('Pas tout à fait...', 'warning');
        if (APP.role === 'student') {
            playRetroSound('error');
            const quizArea = document.getElementById('quiz-area');
            if (quizArea) {
                quizArea.classList.add('shake-error');
                setTimeout(() => quizArea.classList.remove('shake-error'), 500);
            }
        }
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
        const currentSubject = APP.activeSubject || 'Mathématiques';
        const activeQuizData = COURSES_DATA[currentSubject]?.quiz || [];

        if (quizIndex >= activeQuizData.length) {
            quizArea.innerHTML = renderQuiz();
            lucide.createIcons({ nodes: [quizArea] });

            if (quizScore === activeQuizData.length) {
                launchConfetti();
                if (APP.role === 'student') {
                    gainXP(50, "Quiz sans faute !");
                    gainCoins(20);
                    unlockAchievement('math-quiz-master', 'As des Maths', 'Obtenir un score parfait à un quiz de mathématiques');

                    APP.completedQuests = APP.completedQuests || [];
                    if (currentSubject === 'Mathématiques' && !APP.completedQuests.includes('quest-math')) {
                        APP.completedQuests.push('quest-math');
                        saveState();
                    }
                }
            }
        } else {
            quizArea.innerHTML = renderQuiz();
            lucide.createIcons({ nodes: [quizArea] });
        }
    }
}

// ─── PAGE: IA ASSISTANT ──────────────────────────────────────────────────────
function renderIAAssistantPage() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Assistant IA</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">William est là pour t'accompagner dans tes révisions et répondre à tes questions.</p>
        <div class="ia-chat-interface">
            <div class="ia-chat-header">
                <div class="ia-chat-botinfo">
                    <div class="ia-avatar" style="width:36px;height:36px;min-width:36px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%;">
                        <img src="avatar_william.png" alt="Avatar de William" style="width:100%; height:100%; object-fit: cover;">
                    </div>
                    <div>
                        <strong style="font-size:1rem">William</strong>
                        <div style="font-size:0.8rem;color:var(--text-secondary)"><span class="status-indicator status-active" style="width:8px;height:8px;display:inline-block;margin-right:4px"></span>En ligne – IA pédagogique</div>
                    </div>
                </div>
            </div>
            <div class="ia-messages-container" id="ia-main-messages">
                <div class="chat-bubble-wrapper ia">
                    <div class="ia-avatar" style="width:36px;height:36px;min-width:36px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%;">
                        <img src="avatar_william.png" alt="Avatar de William" style="width:100%; height:100%; object-fit: cover;">
                    </div>
                    <div class="chat-bubble">Salut ${APP.username} ! 👋 Je suis William, ton assistant pédagogique. Je peux t'aider à comprendre tes cours, résoudre des exercices, ou simplement discuter. Que veux-tu faire aujourd'hui ?</div>
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
                <div class="ia-avatar" style="width:36px;height:36px;min-width:36px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%;">
                    <img src="avatar_william.png" alt="Avatar de William" style="width:100%; height:100%; object-fit: cover;">
                </div>
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
            <div class="card" style="margin-bottom: 32px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
                    <div class="card-title" style="margin-bottom: 0; min-width: 200px; flex: 1;">
                        <i data-lucide="video" style="width:20px;height:20px;color:var(--color-danger);animation:pulseBorder 2s infinite"></i> 
                        Direct : Équations (Maths)
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <a href="https://youtu.be/uV_EmbYu9_E?si=RHe_zoPk6W13c3DU&t=12" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; white-space: nowrap;">
                            <i data-lucide="external-link" style="width:14px;height:14px;margin-right:5px"></i> YouTube
                        </a>
                        <button class="btn btn-secondary btn-sm" onclick="closeLiveStream()" style="white-space: nowrap;">
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
                            <span class="badge" style="background:rgba(255,255,255,0.2);color:var(--text-on-primary,white)">${s.subject}</span>
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

let breathingCycles = 0;
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

        if (APP.role === 'student' && breathingCycles >= 1) {
            gainXP(20, "Séance de respiration complétée !");
            updateRPGStat('DEDICATION', 10);
            unlockAchievement('zen-master', 'Zen Master', 'Compléter l\'exercice de respiration');

            APP.completedQuests = APP.completedQuests || [];
            if (!APP.completedQuests.includes('quest-zen')) {
                APP.completedQuests.push('quest-zen');
                saveState();
            }
        }
        breathingCycles = 0;
        return;
    }
    breathingCycles = 0;
    zone.classList.add('breathing-active');
    btn.innerHTML = '<i data-lucide="pause" style="width:16px;height:16px"></i> Arrêter';
    lucide.createIcons({ nodes: [btn] });
    const phases = ['Inspirez...', 'Retenez...', 'Expirez...', 'Retenez...'];
    let phase = 0;
    text.textContent = phases[0];
    breathingInterval = setInterval(() => {
        phase = (phase + 1) % phases.length;
        text.textContent = phases[phase];
        if (phase === 0) {
            breathingCycles++;
        }
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
                    <button class="btn btn-primary btn-sm" onclick="saveWhiteboardDrawing()"><i data-lucide="save" style="width:14px;height:14px"></i> Sauvegarder</button>
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
                    <div style="width:40px;height:40px;border-radius:50%;background:var(--color-primary);color:var(--text-on-primary,white);display:flex;align-items:center;justify-content:center;font-weight:700;">MM</div>
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
            { label: 'Utilisation de l\'IA William', val: '2 840 requêtes', pct: 85 },
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
        case 'calendrier': return renderCalendrierPage();
        case 'examens': return renderExamensPage();
        case 'messages': return renderMessageriePage();
        // Parent pages
        case 'suivi': return renderParentSuivi();
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


// ─── NOUVELLES PAGES DE LA REFONTE MAJEURE ─────────────────────────────────────

// ─── MESSAGERIE MULTI-PROFILS ET CHAT FLUIDE ──────────────────────────────────
const MESSAGES_CONTACTS = [
    { id: 'tuteur-martin', name: 'M. Martin (Tuteur Principal)', role: 'Enseignant', initiales: 'MM', lastMsg: 'Excellent travail cette semaine !', time: '10:30', online: true },
    { id: 'prof-dubois', name: 'Mme Dubois (Français)', role: 'Enseignant', initiales: 'MD', lastMsg: 'Pense à rendre ton devoir d\'analyse littéraire.', time: 'Hier', online: false },
    { id: 'psy-scolaire', name: 'Mme Benhamou (Psy Scolaire)', role: 'Psychologue', initiales: 'MB', lastMsg: 'Comment te sens-tu avec ton nouveau planning ?', time: 'Lundi', online: true },
    { id: 'buddy-lucas', name: 'Lucas Moreau (Camarade)', role: 'Camarade', initiales: 'LM', lastMsg: 'Tu veux faire une session révision demain ?', time: '15:12', online: true }
];

let MESSAGES_HISTORY = {
    'tuteur-martin': [
        { sender: 'them', text: 'Bonjour ! J\'espère que tu vas bien. Es-tu prêt pour le live de maths de ce matin ?', time: '09:15' },
        { sender: 'me', text: 'Bonjour M. Martin, oui j\'ai fini de réviser la fiche sur les fonctions affines !', time: '09:20' },
        { sender: 'them', text: 'Excellent travail cette semaine ! Ta rigueur paie.', time: '10:30' }
    ],
    'prof-dubois': [
        { sender: 'them', text: 'Bonjour, n\'oublie pas de consulter la fiche de méthodologie sur le commentaire composé.', time: 'Hier' }
    ],
    'psy-scolaire': [
        { sender: 'them', text: 'Bonjour ! N\'oublie pas que l\'espace bien-être est là si tu te sens débordé.', time: 'Lundi' }
    ],
    'buddy-lucas': [
        { sender: 'them', text: 'Salut ! J\'ai un peu de mal avec l\'exercice 4 en maths, tu as réussi ?', time: '14:30' },
        { sender: 'me', text: 'Salut Lucas ! Oui, j\'ai utilisé la formule y = ax + b, je t\'explique si tu veux.', time: '14:45' },
        { sender: 'them', text: 'Tu veux faire une session révision demain ?', time: '15:12' }
    ]
};

function renderMessageriePage() {
    APP.activeChatContact = APP.activeChatContact || MESSAGES_CONTACTS[0].id;
    const activeContact = MESSAGES_CONTACTS.find(c => c.id === APP.activeChatContact) || MESSAGES_CONTACTS[0];
    const messages = MESSAGES_HISTORY[activeContact.id] || [];

    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Messagerie sécurisée</h1>
        <p style="color:var(--text-secondary);margin-bottom:24px">Échanges bienveillants et sécurisés avec l'équipe pédagogique et tes camarades.</p>

        <div class="messagerie-container">
            <!-- Sidebar Contacts -->
            <div class="contacts-sidebar">
                <div class="contacts-header">
                    <div class="search-bar-container" style="width:100%">
                        <i data-lucide="search" style="width:16px;height:16px;color:var(--text-muted)"></i>
                        <input class="search-input" type="text" placeholder="Rechercher..." style="padding:8px 8px 8px 32px">
                    </div>
                </div>
                <div class="contacts-list">
                    ${MESSAGES_CONTACTS.map(c => {
        const isActive = c.id === activeContact.id;
        return `
                        <div class="contact-item ${isActive ? 'active' : ''}" onclick="selectChatContact('${c.id}')">
                            <div class="contact-avatar">
                                ${c.initiales}
                                ${c.online ? '<span style="position:absolute;bottom:0;right:0;width:12px;height:12px;background-color:var(--color-success);border:2px solid var(--bg-card);border-radius:50%"></span>' : ''}
                            </div>
                            <div class="contact-info">
                                <div class="contact-name-row">
                                    <span class="contact-name">${c.name}</span>
                                    <span class="contact-time">${c.time}</span>
                                </div>
                                <div class="contact-last-msg">${c.lastMsg}</div>
                            </div>
                        </div>
                        `;
    }).join('')}
                </div>
            </div>

            <!-- Chat View -->
            <div class="chat-area">
                <div class="ia-chat-header" style="border-bottom: 1px solid var(--border-color); padding: 14px 20px;">
                    <div class="ia-chat-botinfo">
                        <div class="contact-avatar" style="width:36px;height:36px;font-size:0.85rem">${activeContact.initiales}</div>
                        <div>
                            <strong>${activeContact.name}</strong>
                            <div style="font-size:0.75rem;color:var(--text-secondary)">
                                ${activeContact.online ? '🟢 En ligne' : '⚪ Hors ligne'} · ${activeContact.role}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ia-messages-container" id="chat-messages-box" style="padding: 20px; flex-grow: 1; overflow-y: auto;">
                    ${messages.map(m => `
                        <div class="chat-bubble-wrapper ${m.sender === 'me' ? 'student' : 'ia'}">
                            ${m.sender !== 'me' ? `<div class="contact-avatar" style="width:32px;height:32px;min-width:32px;font-size:0.75rem;margin-right:8px">${activeContact.initiales}</div>` : ''}
                            <div class="chat-bubble" style="${m.sender === 'me' ? 'background-color:var(--color-primary);color:var(--text-on-primary,white)' : ''}">
                                ${m.text}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="chat-input-bar" style="border-top:1px solid var(--border-color);padding:16px">
                    <input type="text" class="chat-input-field" placeholder="Rédiger votre message..." id="message-chat-input" onkeydown="if(event.key==='Enter') sendUserChatMessage()">
                    <button class="btn btn-primary btn-sm" onclick="sendUserChatMessage()"><i data-lucide="send" style="width:16px;height:16px"></i></button>
                </div>
            </div>
        </div>
    </div>
    `;
}

function selectChatContact(contactId) {
    APP.activeChatContact = contactId;
    saveState();
    renderApp();
}

function sendUserChatMessage() {
    const input = document.getElementById('message-chat-input');
    const container = document.getElementById('chat-messages-box');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value = '';

    const contactId = APP.activeChatContact || MESSAGES_CONTACTS[0].id;
    MESSAGES_HISTORY[contactId].push({ sender: 'me', text: text, time: 'À l\'instant' });

    // Update sidebar last message
    const contact = MESSAGES_CONTACTS.find(c => c.id === contactId);
    if (contact) {
        contact.lastMsg = text;
        contact.time = 'À l\'instant';
    }

    renderApp();

    // Auto simulated response
    setTimeout(() => {
        let reply = "J'ai bien reçu ton message. Je te réponds dès que possible ! 👍";
        if (contactId === 'buddy-lucas') {
            reply = "Génial, merci beaucoup pour ton aide ! Je suis dispo vers 15h.";
        } else if (contactId === 'tuteur-martin') {
            reply = "Parfait, je note ça dans ton suivi. Continue sur cette dynamique positive !";
        }
        MESSAGES_HISTORY[contactId].push({ sender: 'them', text: reply, time: 'À l\'instant' });
        if (contact) {
            contact.lastMsg = reply;
        }
        showToast('Nouveau message reçu', 'success');
        renderApp();
    }, 1200);
}

// ─── CALENDRIER INTERACTIF ───────────────────────────────────────────────────
let CALENDAR_EVENTS = [
    { day: 3, title: 'Maths : Fonctions affines', type: 'course', time: '09:00' },
    { day: 3, title: 'Français : Live Dubois', type: 'live', time: '10:30', url: 'https://youtu.be/uV_EmbYu9_E' },
    { day: 4, title: 'Devoir : Révolution ind.', type: 'homework', time: '14:00' },
    { day: 5, title: 'SVT : Mitose cellulaire', type: 'course', time: '16:00' },
    { day: 10, title: 'Exam Blanc : Français', type: 'homework', time: '08:30' },
    { day: 15, title: 'Tutorat individuel', type: 'personal', time: '11:00' }
];

function renderCalendrierPage() {
    return `
    <div class="fade-in-up">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
            <div>
                <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Mon Calendrier</h1>
                <p style="color:var(--text-secondary)">Gère ton planning de cours, tes devoirs à rendre et rejoins tes classes virtuelles.</p>
            </div>
            <button class="btn btn-primary" onclick="openAddEventModal()"><i data-lucide="plus" style="width:18px;height:18px"></i> Ajouter un rappel</button>
        </div>

        <div class="card" style="padding:0; overflow:hidden">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:20px; border-bottom:1px solid var(--border-color); flex-wrap:wrap; gap:12px">
                <h3 style="font-weight:800;font-size:1.2rem">Juin 2026</h3>
                <div style="display:flex; gap:8px">
                    <button class="btn btn-secondary btn-sm" onclick="showToast('Mois précédent', 'primary')"><i data-lucide="chevron-left" style="width:16px;height:16px"></i></button>
                    <button class="btn btn-secondary btn-sm" onclick="showToast('Mois suivant', 'primary')"><i data-lucide="chevron-right" style="width:16px;height:16px"></i></button>
                </div>
            </div>

            <div class="calendar-grid-header">
                <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div><div>Dim</div>
            </div>
            <div class="calendar-grid-body">
                <!-- Empty cells for start of June 2026 (starts on a Monday) -->
                ${Array.from({ length: 30 }).map((_, i) => {
        const dayNum = i + 1;
        const isToday = dayNum === 3; // Let's assume today is June 3rd, 2026
        const dayEvents = CALENDAR_EVENTS.filter(e => e.day === dayNum);

        return `
                    <div class="calendar-day-cell ${isToday ? 'today' : ''}">
                        <span class="calendar-day-num">${dayNum}</span>
                        ${dayEvents.map(e => `
                            <div class="calendar-event-item ${e.type}" onclick="handleCalendarEventClick('${e.title}', '${e.type}', '${e.url || ''}')" title="${e.time} - ${e.title}">
                                <span>${e.time}</span> ${e.title}
                            </div>
                        `).join('')}
                    </div>
                    `;
    }).join('')}
            </div>
        </div>
    </div>
    `;
}

function handleCalendarEventClick(title, type, url) {
    if (type === 'live' && url) {
        joinLiveStream(url);
        navigateTo('live');
    } else {
        showToast(`Détail : ${title}`, 'primary');
    }
}

function openAddEventModal() {
    const title = prompt("Titre de l'événement :");
    if (!title) return;
    const time = prompt("Heure (ex: 14:00) :", "14:00");
    const day = parseInt(prompt("Jour de Juin (1 à 30) :", "3"));
    if (isNaN(day) || day < 1 || day > 30) {
        showToast("Jour invalide", "danger");
        return;
    }
    CALENDAR_EVENTS.push({ day, title, time, type: 'personal' });
    showToast("Événement ajouté au calendrier !", "success");
    renderApp();
}

// ─── PRÉPARATION EXAMENS & CANDIDAT LIBRE ────────────────────────────────────
function renderExamensPage() {
    return `
    <div class="fade-in-up">
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px">Préparation aux examens</h1>
        <p style="color:var(--text-secondary);margin-bottom:32px">Tout le nécessaire pour préparer ton Brevet, ton Baccalauréat et t'inscrire en Candidat Libre.</p>

        <div class="grid-2">
            <!-- Simulated Preparation Progress -->
            <div class="card">
                <div class="card-title"><i data-lucide="trending-up" style="width:20px;height:20px;color:var(--color-primary)"></i> Niveau de préparation simulé</div>
                <div style="text-align:center; padding: 20px 0;">
                    <div style="font-size: 3rem; font-weight:800; color:var(--color-primary)">78%</div>
                    <p style="color:var(--text-secondary); margin-top: 8px;">Maîtrise globale estimée par l'IA</p>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px">
                    ${[
            { subject: 'Mathématiques', val: 82, color: 'blue' },
            { subject: 'Français', val: 75, color: 'green' },
            { subject: 'Histoire-Géo', val: 90, color: 'orange' },
            { subject: 'SVT / Sciences', val: 65, color: 'purple' }
        ].map(s => `
                        <div>
                            <div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:600;margin-bottom:4px">
                                <span>${s.subject}</span><span>${s.val}%</span>
                            </div>
                            <div class="progress-container"><div class="progress-fill" style="width:${s.val}%;background-color:var(--color-${s.color})"></div></div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:20px" onclick="navigateTo('cours')">Consolider mes matières faibles</button>
            </div>

            <!-- Exam simulator -->
            <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
                <div>
                    <div class="card-title"><i data-lucide="award" style="width:20px;height:20px;color:var(--color-success)"></i> Examens Blancs</div>
                    <p style="color:var(--text-secondary);margin-bottom:16px">Simule une épreuve nationale dans les conditions réelles pour mesurer tes compétences.</p>
                    <div style="background-color:var(--bg-primary);padding:16px;border-radius:var(--border-radius-md);margin-bottom:16px">
                        <strong>Epreuve disponible :</strong> Brevet Général 2026 - Mathématiques<br>
                        <small style="color:var(--text-secondary)">Durée : 2h (simulée en 2 minutes) · 4 exercices</small>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="startExamSimulation('Mathématiques')"><i data-lucide="play" style="width:18px;height:18px"></i> Lancer l'examen blanc</button>
            </div>
        </div>

        <!-- Candidat Libre Section -->
        <div class="card" style="margin-top:24px">
            <div class="card-title" style="color:var(--color-primary);font-size:1.3rem"><i data-lucide="info" style="width:24px;height:24px"></i> Accompagnement Inscription Candidat Libre</div>
            <p style="color:var(--text-secondary);margin-bottom:20px">Parce que s'inscrire aux examens nationaux en dehors d'un établissement classique réclame de la méthode, EduFlex t'accompagne pas-à-pas.</p>
            
            <div class="grid-2">
                <div>
                    <h4 style="font-weight:700;margin-bottom:12px">Checklist des démarches administratives</h4>
                    <div style="display:flex; flex-direction:column; gap:12px">
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                            <input type="checkbox" ${APP.checklistCandidatLibre.readStatut ? 'checked' : ''} onchange="toggleChecklistStep('readStatut')">
                            <span>Lire le guide officiel du statut de candidat libre</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                            <input type="checkbox" ${APP.checklistCandidatLibre.checkDocs ? 'checked' : ''} onchange="toggleChecklistStep('checkDocs')">
                            <span>Rassembler les pièces (CNI, attestation de recensement)</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                            <input type="checkbox" ${APP.checklistCandidatLibre.submitForm ? 'checked' : ''} onchange="toggleChecklistStep('submitForm')">
                            <span>S'enregistrer sur l'application Cyclades (Académie)</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                            <input type="checkbox" ${APP.checklistCandidatLibre.payFees ? 'checked' : ''} onchange="toggleChecklistStep('payFees')">
                            <span>Valider le dossier d'inscription finalisé</span>
                        </label>
                    </div>
                    <button class="btn btn-secondary btn-sm" style="margin-top:16px" onclick="showToast('Téléchargement de la checklist PDF...', 'success')"><i data-lucide="download" style="width:14px;height:14px;margin-right:5px"></i> Télécharger la fiche mémo</button>
                </div>
                <div style="background-color:var(--bg-primary);padding:20px;border-radius:var(--border-radius-lg)">
                    <h4 style="font-weight:700;margin-bottom:8px">Dates limites & Vigilance</h4>
                    <ul style="padding-left:20px;margin-bottom:16px;font-size:0.9rem;display:flex;flex-direction:column;gap:8px">
                        <li><strong>Octobre - Novembre 2026 :</strong> Inscriptions ouvertes sur Cyclades.</li>
                        <li><strong>Décembre 2026 :</strong> Date limite de dépôt des justificatifs.</li>
                        <li><strong>Mai 2027 :</strong> Réception des convocations aux centres d'examen.</li>
                    </ul>
                    <div style="background-color:var(--color-primary-light);padding:12px;border-radius:var(--border-radius-md);border-left:4px solid var(--color-primary);font-size:0.85rem">
                        ⚠️ Les dates varient selon les académies. Contactez nos conseillers EduFlex via la messagerie pour vérifier votre dossier.
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

function toggleChecklistStep(stepKey) {
    APP.checklistCandidatLibre[stepKey] = !APP.checklistCandidatLibre[stepKey];
    saveState();
    showToast("Démarches d'inscription mises à jour", "success");
    renderApp();
}

// ─── MODULE EXAMENS BLANCS CHRONOMÉTRÉS ───────────────────────────────────────
let examTimerInterval = null;

function startExamSimulation(subjectName) {
    APP.examSimulating = true;
    APP.examSubject = subjectName;
    APP.examTimeRemaining = 120; // 2 minutes in seconds for demo
    APP.examScore = null;
    saveState();
    showToast("Examen blanc démarré ! Concentrez-vous.", "success");
    renderApp();
}

function startExamTimerLogic() {
    if (examTimerInterval) return;
    examTimerInterval = setInterval(() => {
        if (APP.examTimeRemaining > 0 && APP.examSimulating) {
            APP.examTimeRemaining--;
            const timerEl = document.getElementById('exam-timer-countdown');
            if (timerEl) {
                const mins = Math.floor(APP.examTimeRemaining / 60);
                const secs = APP.examTimeRemaining % 60;
                timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
        } else {
            clearInterval(examTimerInterval);
            examTimerInterval = null;
            if (APP.examSimulating) finishExamSimulation();
        }
    }, 1000);
}

function finishExamSimulation() {
    clearInterval(examTimerInterval);
    examTimerInterval = null;
    APP.examSimulating = false;
    APP.examScore = Math.floor(Math.random() * 5) + 15; // Simulated score: 15 to 19/20
    saveState();
    showToast("Temps écoulé ou examen soumis ! Correction IA en cours...", "success");
    launchConfetti();
    renderApp();
}

function renderExamensBlancsPage() {
    const mins = Math.floor(APP.examTimeRemaining / 60);
    const secs = APP.examTimeRemaining % 60;

    return `
    <div class="fade-in-up">
        <div class="exam-simulation-bar">
            <div>
                <h2 style="font-weight:800;margin:0">Épreuve blanche de ${APP.examSubject}</h2>
                <small style="opacity:0.9">Brevet des collèges · Mode chronométré</small>
            </div>
            <div class="exam-timer">
                <i data-lucide="clock" style="width:24px;height:24px"></i>
                <span id="exam-timer-countdown">${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}</span>
            </div>
        </div>

        <div class="grid-2">
            <div class="card" style="padding:24px">
                <h3 style="font-weight:700;margin-bottom:16px">Exercice 1 : Algorithme et géométrie (5 points)</h3>
                <p style="margin-bottom:16px;line-height:1.6">On considère le programme de calcul suivant :</p>
                <div style="background-color:var(--bg-primary);padding:16px;border-radius:var(--border-radius-md);margin-bottom:16px;font-family:monospace">
                    - Choisir un nombre.<br>
                    - Soustraire 3.<br>
                    - Multiplier le résultat par le nombre de départ.
                </div>
                <p style="font-weight:600;margin-bottom:12px">Question : Si l'on choisit le nombre 5, quel résultat obtient-on ?</p>
                <input type="text" class="chat-input-field" placeholder="Saisir votre réponse..." style="width:100%;margin-bottom:20px">
                
                <h3 style="font-weight:700;margin-top:24px;margin-bottom:16px">Exercice 2 : Fonctions (5 points)</h3>
                <p style="margin-bottom:16px">Soit f la fonction définie par f(x) = 3x - 5. Quelle est l'image de 4 par cette fonction ?</p>
                <input type="text" class="chat-input-field" placeholder="Saisir votre réponse..." style="width:100%">
            </div>

            <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
                <div>
                    <div class="card-title"><i data-lucide="shield-alert" style="width:20px;height:20px;color:var(--color-warning)"></i> Consignes de l'examen</div>
                    <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.6">
                        - Ne rafraîchissez pas la page sous peine de perdre votre avancement.<br>
                        - Vous pouvez soumettre à tout moment dès que vous avez terminé.<br>
                        - À l'issue du temps, votre copie est envoyée pour correction automatique par l'IA William.
                    </p>
                </div>
                <div style="display:flex;gap:12px;margin-top:20px">
                    <button class="btn btn-secondary" onclick="showToast('Simulation en pause', 'warning')" style="flex:1">Pause</button>
                    <button class="btn btn-primary" onclick="finishExamSimulation()" style="flex:1">Soumettre ma copie</button>
                </div>
            </div>
        </div>
    </div>
    `;
}

// Overwrite the routing switcher to output the simulator if active
const originalGetPageContent = getPageContent;
getPageContent = function () {
    if (APP.examSimulating) {
        return renderExamensBlancsPage();
    }

    // Result of simulation
    if (APP.currentTab === 'examens' && APP.examScore !== null) {
        const score = APP.examScore;
        APP.examScore = null;
        saveState();
        return `
        <div class="fade-in-up" style="text-align:center;padding:60px 0">
            <div style="font-size:4rem;margin-bottom:20px">🏆</div>
            <h1 style="font-size:2rem;font-weight:800;margin-bottom:12px">Résultat de l'examen blanc</h1>
            <div style="font-size:3rem;font-weight:800;color:var(--color-success);margin-bottom:16px">${score}/20</div>
            <p style="color:var(--text-secondary);max-width:500px;margin:0 auto 32px">Félicitations ! L'IA William a analysé ta copie et ton score montre une excellente maîtrise des fondamentaux.</p>
            <div class="card" style="max-width:600px;margin:0 auto 32px;text-align:left;padding:24px">
                <h4 style="font-weight:700;margin-bottom:8px">Analyse détaillée de William</h4>
                <p style="font-size:0.95rem;line-height:1.6;color:var(--text-primary)">
                    - <strong>Points forts :</strong> L'application de l'algorithme est parfaitement maîtrisée (Exercice 1).<br>
                    - <strong>Axe de révision :</strong> Soigne la rédaction du calcul littéraire pour le calcul d'images (Exercice 2). Review la fiche "Les fonctions affines".
                </p>
            </div>
            <button class="btn btn-primary" onclick="navigateTo('examens')">Retour aux examens</button>
        </div>
        `;
    }

    return originalGetPageContent();
};

// ─── AMÉLIORATION COMMUNAUTÉ AVEC BINÔME DE SOUTIEN ───────────────────────────
const BUDDIES_DATA = [
    { name: 'Arthur L.', bio: 'En classe de 3ème, passionné d\'informatique et d\'échecs. Fait l\'école à la maison en raison d\'un handicap.', tags: ['Code', 'SVT', 'Échecs'], match: '96% compatible' },
    { name: 'Sarah G.', bio: 'Lycéenne (1ère Générale), adore la lecture et l\'anglais. Souffre de phobie scolaire.', tags: ['Littérature', 'Langues', 'Théâtre'], match: '92% compatible' },
    { name: 'Nolan V.', bio: 'Passionné de SVT et d\'art. Rejoint EduFlex après des soucis de harcèlement.', tags: ['Dessin', 'Sciences', 'Musique'], match: '88% compatible' }
];

const originalRenderCommunautePage = renderCommunautePage;
renderCommunautePage = function () {
    const parentHtml = originalRenderCommunautePage();
    return `
    ${parentHtml}
    
    <div style="border-bottom: 2px solid var(--border-color); margin: 40px 0;"></div>

    <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:8px;display:flex;align-items:center;gap:12px">
        <span style="display:inline-block;width:12px;height:24px;border-radius:4px;background:var(--color-primary)"></span>
        Camarades de soutien
    </h2>
    <p style="color:var(--text-secondary);margin-bottom:24px">EduFlex te met en relation avec d'autres élèves partageant des profils, centres d'intérêt ou parcours similaires pour t'entraider sans aucune pression.</p>

    <div class="matching-buddies-grid">
        ${BUDDIES_DATA.map(b => `
            <div class="buddy-card">
                <div class="buddy-header">
                    <div class="buddy-avatar-letters">${b.name.split(' ')[0][0]}${b.name.split(' ')[1] ? b.name.split(' ')[1][0] : ''}</div>
                    <div>
                        <strong style="font-size:1rem;color:var(--text-primary)">${b.name}</strong>
                        <div class="buddy-badge">${b.match}</div>
                    </div>
                </div>
                <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.5">${b.bio}</p>
                <div class="buddy-tags">
                    ${b.tags.map(t => `<span class="buddy-tag">${t}</span>`).join('')}
                </div>
                <button class="btn btn-primary btn-sm" onclick="startBuddyDiscussion('${b.name}')">Démarrer un binôme d'entraide</button>
            </div>
        `).join('')}
    </div>
    `;
};

function startBuddyDiscussion(buddyName) {
    showToast(`Binôme d'entraide demandé avec ${buddyName} ! 💙`, 'success');
    navigateTo('messages');
}

// ─── PARENT DASHBOARD ET BILANS HEBDOMADAIRES ENRICHIS ─────────────────────────
const originalRenderParentDashboard = renderParentDashboard;
renderParentDashboard = function () {
    return `
    <div class="fade-in-up">
        <div class="student-welcome-banner">
            <div class="student-welcome-text">
                <h2>Espace Parents EduFlex 👨‍👩‍👧</h2>
                <p>Suivi de l'engagement scolaire et du bien-être de votre enfant.</p>
            </div>
        </div>

        <div class="grid-3" style="margin-top:24px;margin-bottom:24px">
            <div class="card" style="text-align:center;padding:20px">
                <div style="font-size:2rem">😊</div>
                <h4 style="font-weight:700;margin-top:8px">Humeur moyenne</h4>
                <div style="font-size:1.5rem;font-weight:800;color:var(--color-success)">Bienveillant</div>
            </div>
            <div class="card" style="text-align:center;padding:20px">
                <div style="font-size:2rem">📈</div>
                <h4 style="font-weight:700;margin-top:8px">Cours consultés</h4>
                <div style="font-size:1.5rem;font-weight:800;color:var(--color-primary)">16 leçons / sem</div>
            </div>
            <div class="card" style="text-align:center;padding:20px">
                <div style="font-size:2rem">🎯</div>
                <h4 style="font-weight:700;margin-top:8px">Validation Quiz</h4>
                <div style="font-size:1.5rem;font-weight:800;color:var(--color-warning)">85% Réussite</div>
            </div>
        </div>

        <div class="card" style="margin-bottom:24px">
            <div class="card-title"><i data-lucide="bar-chart-3" style="width:20px;height:20px;color:var(--color-primary)"></i> Bilan hebdomadaire généré par l'IA</div>
            <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.6">
                <strong>Synthèse de la semaine :</strong> Votre enfant s'est montré particulièrement motivé et impliqué. Il a validé 3 fiches de cours supplémentaires et obtenu 3/3 au quiz d'évaluation en mathématiques.
            </p>
            <div style="background-color:var(--color-primary-light);padding:16px;border-radius:var(--border-radius-md);margin-top:16px;border-left:4px solid var(--color-primary)">
                💡 <strong>Conseil IA :</strong> Encouragez-le à persévérer et à s'accorder des temps de repos. Son niveau de stress est stable (2/5).
            </div>
        </div>

        <div class="parent-charts-grid">
            <div class="card">
                <div class="card-title"><i data-lucide="line-chart" style="width:20px;height:20px;color:var(--color-success)"></i> Détail par compétences</div>
                ${[
            { name: 'Compréhension de notions', val: 90 },
            { name: 'Autonomie de travail', val: 80 },
            { name: 'Participation aux lives', val: 100 },
            { name: 'Gestion des émotions', val: 75 }
        ].map(c => `
                    <div style="margin-bottom:12px">
                        <div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:600;margin-bottom:4px">
                            <span>${c.name}</span><span>${c.val}%</span>
                        </div>
                        <div class="progress-container"><div class="progress-fill" style="width:${c.val}%"></div></div>
                    </div>
                `).join('')}
            </div>
            
            <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
                <div>
                    <div class="card-title"><i data-lucide="mail" style="width:20px;height:20px;color:var(--color-warning)"></i> Contacter un enseignant</div>
                    <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.5">Un tuteur référent répond à toutes vos questions concernant le parcours et l'orientation de votre enfant.</p>
                </div>
                <button class="btn btn-primary" onclick="navigateTo('messages')">Accéder à la messagerie</button>
            </div>
        </div>
    </div>
    `;
};

// ─── AMÉLIORATION DU DASHBOARD ENSEIGNANT ───────────────────────────────────────
const originalRenderTeacherDashboard = renderTeacherDashboard;
renderTeacherDashboard = function () {
    return `
    <div class="fade-in-up">
        <div class="student-welcome-banner">
            <div class="student-welcome-text">
                <h2>Espace Enseignant 📚</h2>
                <p>Gestion de vos groupes de tutorat et validation des activités.</p>
            </div>
        </div>

        <div class="dashboard-quick-stats">
            ${[
            { icon: 'users', value: '18', label: 'Élèves assignés', color: 'blue' },
            { icon: 'file-text', value: '4', label: 'Devoirs en attente', color: 'orange' },
            { icon: 'trending-up', value: '92%', label: 'Taux de participation', color: 'green' }
        ].map(s => `
                <div class="quick-stat-card">
                    <div class="stat-icon-wrapper ${s.color}"><i data-lucide="${s.icon}" style="width:24px;height:24px"></i></div>
                    <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
                </div>
            `).join('')}
        </div>

        <div class="grid-2" style="margin-top:24px">
            <div class="card">
                <div class="card-title"><i data-lucide="bell" style="width:20px;height:20px;color:var(--color-danger)"></i> Suivi des élèves prioritaires</div>
                <div style="display:flex; flex-direction:column; gap:12px">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid var(--border-color);border-radius:var(--border-radius-md)">
                        <div>
                            <strong>Lucas Moreau</strong><br>
                            <small style="color:var(--text-secondary)">Dernière activité : Il y a 3 jours (Alerte stress)</small>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="navigateTo('messages')">Contacter</button>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid var(--border-color);border-radius:var(--border-radius-md)">
                        <div>
                            <strong>Thomas Dupont</strong><br>
                            <small style="color:var(--text-secondary)">Difficultés signalées en géométrie</small>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="showToast('Ressource envoyée', 'success')">Envoyer ressource</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-title"><i data-lucide="plus" style="width:20px;height:20px;color:var(--color-primary)"></i> Actions pédagogiques</div>
                <div style="display:flex; flex-direction:column; gap:10px">
                    <button class="btn btn-secondary" onclick="navigateTo('contenus')"><i data-lucide="file-text" style="width:16px;height:16px;margin-right:6px"></i> Publier un nouveau cours</button>
                    <button class="btn btn-secondary" onclick="navigateTo('planning')"><i data-lucide="calendar" style="width:16px;height:16px;margin-right:6px"></i> Planifier un cours en direct</button>
                </div>
            </div>
        </div>
    </div>
    `;
};

// ─── ESPACE ADMINISTRATEUR ───────────────────────────────────────────────────
const originalRenderAdminDashboard = renderAdminDashboard;
renderAdminDashboard = function () {
    return `
    <div class="fade-in-up">
        <div class="student-welcome-banner">
            <div class="student-welcome-text">
                <h2>Console d'Administration EduFlex ⚙️</h2>
                <p>Supervisez l'audience générale et gérez la modération de la plateforme.</p>
            </div>
        </div>

        <div class="dashboard-quick-stats" style="margin-top:24px">
            ${[
            { icon: 'activity', value: '12 840', label: 'Requêtes William', color: 'blue' },
            { icon: 'shield', value: '0', label: 'Signalement en attente', color: 'green' },
            { icon: 'credit-card', value: '97 800 €', label: 'Chiffre d\'affaires', color: 'orange' }
        ].map(s => `
                <div class="quick-stat-card">
                    <div class="stat-icon-wrapper ${s.color}"><i data-lucide="${s.icon}" style="width:24px;height:24px"></i></div>
                    <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
                </div>
            `).join('')}
        </div>

        <div class="grid-2" style="margin-top:24px">
            <div class="card">
                <div class="card-title"><i data-lucide="users" style="width:20px;height:20px;color:var(--color-primary)"></i> Activité système</div>
                <div style="display:flex; flex-direction:column; gap:10px">
                    <div style="display:flex;justify-content:space-between;font-size:0.9rem">
                        <span>Serveurs de streaming (Lives)</span>
                        <span style="color:var(--color-success);font-weight:700">🟢 Opérationnel</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:0.9rem">
                        <span>API William (IA Pédagogique)</span>
                        <span style="color:var(--color-success);font-weight:700">🟢 Opérationnel</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:0.9rem">
                        <span>Base de données utilisateurs</span>
                        <span style="color:var(--color-success);font-weight:700">🟢 Opérationnel</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-title"><i data-lucide="shield-alert" style="width:20px;height:20px;color:var(--color-warning)"></i> Administration rapide</div>
                <div style="display:flex; flex-direction:column; gap:10px">
                    <button class="btn btn-secondary" onclick="navigateTo('utilisateurs')">Gérer les comptes</button>
                    <button class="btn btn-secondary" onclick="navigateTo('configuration')">Configuration de modération</button>
                </div>
            </div>
        </div>
    </div>
    `;
};

// ─── AMÉLIORATION DU PIED DE PAGE LANDING PAGE & GLOBAL ───────────────────────
const originalRenderLandingPage = renderLandingPage;
renderLandingPage = function () {
    const parentHtml = originalRenderLandingPage();
    return `
    ${parentHtml}
    
    <footer class="footer-professional">
        <div class="footer-content">
            <div class="footer-column">
                <div class="sidebar-logo" style="margin-bottom: 16px; padding:0">
                    <img src="Logo.png" alt="EduFlex" style="width:36px;height:36px;border-radius:8px;object-fit:contain">
                    <span class="logo-text">EduFlex</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
                    EduFlex réconcilie les élèves aux parcours de vie complexes avec la réussite scolaire dans un cadre apaisant et personnalisé.
                </p>
                <div style="font-weight:700;font-size:0.9rem;color:var(--color-danger)">
                    📞 Urgence Bien-être : Composez le 3114 (Gratuit 24/7)
                </div>
            </div>
            
            <div class="footer-column">
                <h4>Plateforme</h4>
                <ul>
                    <li><a href="#" onclick="navigateTo('accueil'); return false;">Accueil</a></li>
                    <li><a href="#" onclick="navigateTo('inscription'); return false;">S'inscrire</a></li>
                    <li><a href="#" onclick="navigateTo('connexion'); return false;">Se connecter</a></li>
                </ul>
            </div>
            
            <div class="footer-column">
                <h4>Légal & Sécurité</h4>
                <ul>
                    <li><a href="#" onclick="showToast('Affichage des mentions légales', 'primary'); return false;">Mentions Légales</a></li>
                    <li><a href="#" onclick="showToast('Affichage du RGPD', 'primary'); return false;">Politique de Confidentialité</a></li>
                    <li><a href="#" onclick="showToast('Charte RGPD EduFlex', 'primary'); return false;">Conformité RGPD</a></li>
                </ul>
            </div>
            
            <div class="footer-column">
                <h4>Accessibilité</h4>
                <ul>
                    <li><span style="font-size:0.85rem;color:var(--text-secondary)">Norme : RGAA Conforme</span></li>
                    <li><span style="font-size:0.85rem;color:var(--text-secondary)">Sous-titres & TTS inclus</span></li>
                    <li><span style="font-size:0.85rem;color:var(--text-secondary)">Optimisé dyslexie</span></li>
                </ul>
            </div>
        </div>
        
        <div class="footer-bottom">
            <span>© 2026 EduFlex SAS. Tous droits réservés.</span>
            <div style="display:flex; gap:16px">
                <a href="#" onclick="showToast('Réseaux sociaux', 'primary'); return false;"><i data-lucide="twitter" style="width:18px;height:18px"></i></a>
                <a href="#" onclick="showToast('Réseaux sociaux', 'primary'); return false;"><i data-lucide="instagram" style="width:18px;height:18px"></i></a>
                <a href="#" onclick="showToast('Réseaux sociaux', 'primary'); return false;"><i data-lucide="linkedin" style="width:18px;height:18px"></i></a>
            </div>
        </div>
    </footer>
    `;
};

// Landing page uses overridden function directly

// ─── MAIN RENDER ─────────────────────────────────────────────────────────────

function renderApp() {
    // Apply stored preferences
    document.documentElement.setAttribute('data-theme', APP.theme);
    document.documentElement.setAttribute('data-font-size', APP.fontSize);
    document.body.classList.toggle('dyslexic-mode', APP.dyslexicMode);

    // Apply student theme if role is student
    if (APP.role === 'student') {
        document.documentElement.setAttribute('data-student-theme', APP.studentTheme || 'college');
    } else {
        document.documentElement.removeAttribute('data-student-theme');
    }

    renderSidebar();
    renderHeader();
    renderChatbotWidget();

    const main = document.getElementById('main-content');
    main.innerHTML = getPageContent();

    // Inject bottom navbar for mobile student view
    let bottomNavbar = document.getElementById('student-bottom-nav');
    if (APP.role === 'student') {
        if (!bottomNavbar) {
            bottomNavbar = document.createElement('nav');
            bottomNavbar.id = 'student-bottom-nav';
            bottomNavbar.className = 'bottom-navbar';
            document.getElementById('app').appendChild(bottomNavbar);
        }

        const mobileTabs = [
            { id: 'dashboard', label: 'Hub', icon: 'layout-dashboard' },
            { id: 'cours', label: 'Cours', icon: 'book-open' },
            { id: 'live', label: 'Lives', icon: 'video' },
            { id: 'ia-assistant', label: 'William', icon: 'bot' },
            { id: 'profile-trigger', label: 'Perso', icon: 'user' }
        ];

        bottomNavbar.innerHTML = mobileTabs.map(t => {
            const isActive = APP.currentTab === t.id || (t.id === 'profile-trigger' && document.getElementById('avatar-creator-modal'));
            return `
                <div class="bottom-nav-item ${isActive ? 'active' : ''}" onclick="playRetroSound('click'); ${t.id === 'profile-trigger' ? 'openAvatarCreator()' : `navigateTo('${t.id}')`}">
                    <i data-lucide="${t.icon}" style="width:20px;height:20px"></i>
                    <span>${t.label}</span>
                </div>
            `;
        }).join('');

        bottomNavbar.style.display = '';
    } else {
        if (bottomNavbar) bottomNavbar.style.display = 'none';
    }

    // Initialize Lucide icons
    lucide.createIcons();

    // Initialize whiteboard if on that page
    if (APP.currentTab === 'whiteboard') setTimeout(initWhiteboard, 100);
    // Initialize exam timer if simulating
    if (APP.examSimulating) startExamTimerLogic();
    // Bind search event listener
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim().toLowerCase();
                if (query) {
                    if (query.includes('math') || query.includes('affine')) {
                        selectSubject('Mathématiques'); navigateTo('cours');
                    } else if (query.includes('franc') || query.includes('style')) {
                        selectSubject('Français'); navigateTo('cours');
                    } else if (query.includes('hist') || query.includes('guer')) {
                        selectSubject('Histoire-Géo'); navigateTo('cours');
                    } else if (query.includes('svt') || query.includes('mitose') || query.includes('adn')) {
                        selectSubject('SVT'); navigateTo('cours');
                    } else {
                        showToast(`Recherche pour "${query}"... Aucun résultat exact, redirection vers vos cours.`, 'warning');
                        navigateTo('cours');
                    }
                    searchInput.value = '';
                }
            }
        });
    }
}

// ─── ACTIVE ROLE BUTTON STYLING ──────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
    .active-role {
        background-color: var(--color-primary) !important;
        color: var(--text-on-primary, white) !important;
        border-color: var(--color-primary) !important;
    }
    html[data-theme="high-contrast"] .active-role {
        color: #000000 !important;
    }
`;
document.head.appendChild(style);

document.head.appendChild(style);

// ==========================================================================
// SYSTEME DE GAMIFICATION: AVATAR, BOUTIQUE, RPG STATS & SONS RETRO
// ==========================================================================

let creatorActiveTab = 'skin';
let tempAvatar = null;

let dashQuizCurrentQuestion = 0;
let dashQuizScore = 0;
let dashQuizState = 'not-started'; // 'not-started' | 'playing' | 'answered' | 'finished'
const DASHBOARD_QUIZ = [
    { q: "Quel est l'organe principal de la photosynthèse ?", options: ["La racine", "La feuille", "La fleur", "La tige"], correct: 1, explanation: "Les feuilles contiennent la chlorophylle qui capte la lumière." },
    { q: "Qui a écrit 'Les Misérables' ?", options: ["Émile Zola", "Gustave Flaubert", "Victor Hugo", "Albert Camus"], correct: 2, explanation: "Victor Hugo a publié ce chef-d'œuvre littéraire en 1862." },
    { q: "Quelle est la valeur de x dans : 2x + 5 = 15 ?", options: ["x = 5", "x = 10", "x = 3", "x = 4"], correct: 0, explanation: "2x = 15 - 5 => 2x = 10 => x = 5." }
];

function renderMiniQuizWidget() {
    const qData = DASHBOARD_QUIZ[dashQuizCurrentQuestion];
    
    if (dashQuizState === 'not-started') {
        return `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; height:100%; min-height:180px; gap:12px;">
                <div style="font-size:2rem;">⚡</div>
                <strong style="font-size:1rem; font-weight:800;">Défi Mini-Quiz du Jour</strong>
                <p style="color:var(--text-secondary); font-size:0.85rem; max-width:240px; margin:0;">
                    3 questions rapides pour tester tes connaissances générales. 15s par question !
                </p>
                <button class="btn btn-primary btn-sm" onclick="startDashQuiz()" style="margin-top:8px;">
                    Commencer (+XP)
                </button>
            </div>
        `;
    }

    if (dashQuizState === 'finished') {
        const isPerfect = dashQuizScore === DASHBOARD_QUIZ.length;
        return `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; height:100%; min-height:180px; gap:12px;">
                <div style="font-size:2rem;">${isPerfect ? '🏆' : '🎉'}</div>
                <strong style="font-size:1rem; font-weight:800;">Défi Terminé !</strong>
                <p style="color:var(--text-secondary); font-size:0.85rem; margin:0;">
                    Tu as obtenu un score de <strong>${dashQuizScore} / ${DASHBOARD_QUIZ.length}</strong>.
                </p>
                <div style="font-size:0.75rem; color:var(--color-success); font-weight:800; margin-bottom:4px;">
                    ${isPerfect ? 'Récompense maximale obtenue ! 💎' : 'Bien joué ! Continue de t\'entraîner.'}
                </div>
                <button class="btn btn-secondary btn-sm" onclick="resetDashQuiz()">
                    Recommencer 🔄
                </button>
            </div>
        `;
    }

    const timerPercent = (dashQuizTimer / 15) * 100;

    return `
        <div style="display:flex; flex-direction:column; gap:12px; height:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; font-weight:700; color:var(--text-secondary);">
                <span>Question ${dashQuizCurrentQuestion + 1}/${DASHBOARD_QUIZ.length}</span>
                <span style="color:${dashQuizTimer <= 5 ? 'var(--color-danger)' : 'var(--color-primary)'}; font-variant-numeric: tabular-nums;">
                    ⏱️ ${dashQuizTimer}s
                </span>
            </div>
            
            <div style="width:100%; height:4px; background:rgba(0,0,0,0.05); border-radius:2px; overflow:hidden;">
                <div style="width:${timerPercent}%; height:100%; background:${dashQuizTimer <= 5 ? 'var(--color-danger)' : 'var(--color-primary)'}; transition: width 1s linear;"></div>
            </div>

            <div style="font-weight:700; font-size:0.9rem; margin:4px 0; line-height:1.4;">
                ${qData.q}
            </div>

            <div style="display:flex; flex-direction:column; gap:8px;">
                ${qData.options.map((opt, idx) => {
                    let className = 'quiz-option-item';
                    let extraStyle = 'padding: 8px 12px; font-size: 0.8rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s;';
                    
                    if (dashQuizState === 'answered') {
                        if (idx === qData.correct) {
                            extraStyle += ' background-color: var(--color-success-light); border-color: var(--color-success); color: var(--color-success); font-weight: 700;';
                        } else if (idx === dashQuizSelectedOption) {
                            extraStyle += ' background-color: var(--color-danger-light); border-color: var(--color-danger); color: var(--color-danger);';
                        } else {
                            extraStyle += ' opacity: 0.6; cursor: not-allowed;';
                        }
                    } else {
                        extraStyle += ' background-color: var(--bg-card);';
                    }

                    const clickAction = dashQuizState === 'playing' ? `selectDashQuizOption(${idx})` : '';
                    return `
                        <div class="${className}" style="${extraStyle}" onclick="${clickAction}">
                            ${opt}
                        </div>
                    `;
                }).join('')}
            </div>

            ${dashQuizState === 'answered' ? `
                <div style="margin-top:4px; padding:8px 12px; background:var(--color-primary-light); border-left:3px solid var(--color-primary); border-radius:4px; font-size:0.75rem; line-height:1.4;">
                    <strong>Explication :</strong> ${qData.explanation}
                </div>
                <button class="btn btn-primary btn-sm" onclick="nextDashQuizQuestion()" style="margin-top:auto; width:100%;">
                    ${dashQuizCurrentQuestion + 1 < DASHBOARD_QUIZ.length ? 'Suivant ➡️' : 'Terminer 📊'}
                </button>
            ` : ''}
        </div>
    `;
}

function startDashQuiz() {
    dashQuizCurrentQuestion = 0;
    dashQuizScore = 0;
    dashQuizState = 'playing';
    dashQuizTimer = 15;
    dashQuizSelectedOption = null;
    playRetroSound('click');
    
    if (dashQuizTimerInterval) clearInterval(dashQuizTimerInterval);
    dashQuizTimerInterval = setInterval(() => {
        if (dashQuizState === 'playing') {
            dashQuizTimer--;
            if (dashQuizTimer <= 0) {
                selectDashQuizOption(-1);
            } else {
                updateMiniQuizWidgetUI();
            }
        }
    }, 1000);

    renderApp();
}

function updateMiniQuizWidgetUI() {
    const miniQuizBox = document.getElementById('mini-quiz-box');
    if (miniQuizBox) {
        miniQuizBox.innerHTML = renderMiniQuizWidget();
    }
}

function selectDashQuizOption(optionIdx) {
    if (dashQuizState !== 'playing') return;
    dashQuizState = 'answered';
    dashQuizSelectedOption = optionIdx;
    
    if (dashQuizTimerInterval) {
        clearInterval(dashQuizTimerInterval);
        dashQuizTimerInterval = null;
    }

    const qData = DASHBOARD_QUIZ[dashQuizCurrentQuestion];
    const isCorrect = optionIdx === qData.correct;

    if (isCorrect) {
        dashQuizScore++;
        playRetroSound('success');
        showToast('Bonne réponse ! 🎯', 'success');
        if (APP.role === 'student') {
            gainXP(10);
            gainCoins(3);
            updateRPGStat('FOCUS', 5);
        }
    } else {
        playRetroSound('error');
        showToast(optionIdx === -1 ? 'Temps écoulé ! ⏱️' : 'Mauvaise réponse...', 'warning');
        
        const miniQuizBox = document.getElementById('mini-quiz-box');
        if (miniQuizBox) {
            miniQuizBox.classList.add('shake-error');
            setTimeout(() => miniQuizBox.classList.remove('shake-error'), 500);
        }
    }

    renderApp();
}

function nextDashQuizQuestion() {
    dashQuizCurrentQuestion++;
    if (dashQuizCurrentQuestion >= DASHBOARD_QUIZ.length) {
        dashQuizState = 'finished';
        playRetroSound('levelUp');
        launchConfetti();
        if (APP.role === 'student' && dashQuizScore === DASHBOARD_QUIZ.length) {
            gainXP(30, "Mini-quiz sans faute !");
            gainCoins(10);
        }
    } else {
        dashQuizState = 'playing';
        dashQuizTimer = 15;
        dashQuizSelectedOption = null;
        
        if (dashQuizTimerInterval) clearInterval(dashQuizTimerInterval);
        dashQuizTimerInterval = setInterval(() => {
            if (dashQuizState === 'playing') {
                dashQuizTimer--;
                if (dashQuizTimer <= 0) {
                    selectDashQuizOption(-1);
                } else {
                    updateMiniQuizWidgetUI();
                }
            }
        }, 1000);
    }
    
    renderApp();
}

function resetDashQuiz() {
    dashQuizState = 'not-started';
    dashQuizCurrentQuestion = 0;
    dashQuizScore = 0;
    if (dashQuizTimerInterval) {
        clearInterval(dashQuizTimerInterval);
        dashQuizTimerInterval = null;
    }
    playRetroSound('click');
    renderApp();
}

function renderAvatarSVG(avatar, mood = null, size = 80) {
    if (!avatar) {
        // Default placeholder for users who haven't created an avatar yet
        return Avataaars.create({
            style: 'circle',
            skin: 'light',
            top: 'shortWaved',
            hairColor: 'brown',
            clothing: 'hoodie',
            clothingColor: 'pastelBlue',
            accessories: 'none',
            eyes: 'default',
            eyebrows: 'defaultNatural',
            mouth: 'default',
            width: size,
            height: size
        });
    }

    // Map mood to eye and mouth expressions
    let moodEyes = avatar.eyes || 'default';
    let moodMouth = avatar.mouth || 'default';

    if (mood !== null && mood !== undefined) {
        if (mood === 0 || mood === 1) { // Triste / Stressé
            moodEyes = 'squint';
            moodMouth = 'sad';
        } else if (mood === 4) { // Très joyeux
            moodEyes = 'happy';
            moodMouth = 'smile';
        } else if (mood === 2 || mood === 3) { // Neutre / Concentré
            moodEyes = 'default';
            moodMouth = 'default';
        }
    }

    return Avataaars.create({
        style: 'circle',
        skin: avatar.skin || 'light',
        top: avatar.top || 'shortWaved',
        hairColor: avatar.hairColor || 'brown',
        clothing: avatar.clothing || 'hoodie',
        clothingColor: avatar.clothingColor || 'pastelBlue',
        accessories: avatar.accessories || 'none',
        accessoriesColor: avatar.accessoriesColor || 'black',
        eyes: moodEyes,
        eyebrows: avatar.eyebrows || 'defaultNatural',
        mouth: moodMouth,
        width: size,
        height: size
    });
}

function openAvatarCreator() {
    if (!APP.avatar) {
        APP.avatar = {
            skin: 'light',
            top: 'shortWaved',
            hairColor: 'brown',
            clothing: 'hoodie',
            clothingColor: 'pastelBlue',
            accessories: 'none',
            eyes: 'default',
            eyebrows: 'defaultNatural',
            mouth: 'default'
        };
    }
    tempAvatar = JSON.parse(JSON.stringify(APP.avatar));

    let overlay = document.getElementById('avatar-creator-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'avatar-creator-modal';
        overlay.className = 'avatar-creator-overlay';
        document.body.appendChild(overlay);
    }
    renderAvatarCreatorContent();
}

function renderAvatarCreatorContent() {
    const overlay = document.getElementById('avatar-creator-modal');
    if (!overlay) return;

    // AvataaarsJs option values
    const skinOptions = [
        { name: 'Clair', val: 'pale' },
        { name: 'Pêche', val: 'light' },
        { name: 'Doré', val: 'yellow' },
        { name: 'Brun', val: 'brown' },
        { name: 'Chocolat', val: 'darkBrown' },
        { name: 'Ébène', val: 'black' }
    ];
    const topOptions = [
        { name: '✂️ Court', val: 'shortWaved' },
        { name: '💇 Plat', val: 'shortFlat' },
        { name: '🌊 Ondulé', val: 'shortDreads01' },
        { name: '💁 Lisse', val: 'straight01' },
        { name: '🌀 Bouclés', val: 'curly' },
        { name: '😤 Ébouriffé', val: 'frizzle' },
        { name: '👱 César', val: 'theCaesar' },
        { name: '🧑‍🎤 Dreads', val: 'dreads01' },
        { name: '🦲 Chauve', val: 'noHair' },
        { name: '🧢 Bonnet', val: 'winterHat02' },
        { name: '🎩 Chapeau', val: 'hat' },
        { name: '🧕 Hijab', val: 'hijab' },
        { name: '🧣 Turban', val: 'turban' }
    ];
    const hairColorOptions = [
        { name: 'Brun', val: 'brown' },
        { name: 'Noir', val: 'black' },
        { name: 'Blond', val: 'blondeGolden' },
        { name: 'Roux', val: 'red' },
        { name: 'Platine', val: 'platinum' },
        { name: 'Auburn', val: 'auburn' },
        { name: 'Gris', val: 'silverGray' },
        { name: 'Rose', val: 'pastelPink' }
    ];
    const eyesOptions = [
        { name: '👀 Normal', val: 'default' },
        { name: '😊 Content', val: 'happy' },
        { name: '🤔 Surpris', val: 'surprised' },
        { name: '😐 Fatigué', val: 'squint' },
        { name: '😏 De côté', val: 'side' },
        { name: '😉 Clin d\'œil', val: 'winkWacky' },
        { name: '🤩 Étoiles', val: 'hearts' },
        { name: '😌 Fermés', val: 'close' }
    ];
    const eyebrowsOptions = [
        { name: 'Naturel', val: 'defaultNatural' },
        { name: 'Plat', val: 'flatNatural' },
        { name: 'Surpris', val: 'raisedExcitedNatural' },
        { name: 'En colère', val: 'angryNatural' },
        { name: 'Triste', val: 'sadConcernedNatural' },
        { name: 'Uni', val: 'unibrowNatural' }
    ];
    const mouthOptions = [
        { name: '😐 Normal', val: 'default' },
        { name: '😊 Sourire', val: 'smile' },
        { name: '😄 Rire', val: 'twinkle' },
        { name: '😮 Surpris', val: 'disbelief' },
        { name: '😕 Triste', val: 'sad' },
        { name: '😎 Sérieux', val: 'serious' },
        { name: '👅 Langue', val: 'tongue' },
        { name: '😬 Gêné', val: 'grimace' }
    ];
    const clothingOptions = [
        { name: '👕 T-Shirt', val: 'shirtCrewNeck' },
        { name: '🧥 Hoodie', val: 'hoodie' },
        { name: '🔵 Col-V', val: 'shirtVNeck' },
        { name: '👔 Blazer', val: 'blazerAndSweater' },
        { name: '🎨 Imprimé', val: 'graphicShirt' },
        { name: '🎅 Pull', val: 'collarAndSweater' },
        { name: '👚 Épaule', val: 'overall' }
    ];
    const clothingColorOptions = [
        { name: 'Bleu', val: 'blue02' },
        { name: 'Rose', val: 'pink' },
        { name: 'Menthe', val: 'pastelGreen' },
        { name: 'Rouge', val: 'red' },
        { name: 'Noir', val: 'black' },
        { name: 'Gris', val: 'gray02' },
        { name: 'Blanc', val: 'white' },
        { name: 'Lavande', val: 'pastelBlue' }
    ];

    const allAccessories = [
        { id: 'none', name: '❌ Aucun' },
        { id: 'prescription01', name: '👓 Lunettes' },
        { id: 'prescription02', name: '🤓 Lunettes Pro' },
        { id: 'round', name: '⭕ Rondes' },
        { id: 'sunglasses', name: '🕶️ Soleil' },
        { id: 'wayfarers', name: '😎 Wayfarers' },
        { id: 'kurt', name: '🤪 Kurt' },
        { id: 'eyepatch', name: '🏴‍☠️ Cache-œil' }
    ];

    const availableAccs = allAccessories.filter(a =>
        a.id === 'none' ||
        APP.unlockedAccessories.includes(a.id) ||
        APP.shopBoughtAccessories?.includes(a.id)
    );

    let tabContent = '';
    if (creatorActiveTab === 'skin') {
        tabContent = `
            <div class="creator-section-label">Couleur de peau</div>
            <div class="creator-grid">
                ${skinOptions.map(s => `
                    <div class="creator-item-option ${tempAvatar.skin === s.val ? 'active' : ''}" onclick="updateTempAvatar('skin', '${s.val}')">
                        ${s.name}
                    </div>
                `).join('')}
            </div>
        `;
    } else if (creatorActiveTab === 'hair') {
        tabContent = `
            <div class="creator-section-label">Coiffure</div>
            <div class="creator-grid">
                ${topOptions.map(h => `
                    <div class="creator-item-option ${tempAvatar.top === h.val ? 'active' : ''}" onclick="updateTempAvatar('top', '${h.val}')" style="font-weight:700">
                        ${h.name}
                    </div>
                `).join('')}
            </div>
            <div class="creator-section-label" style="margin-top:16px">Couleur des cheveux</div>
            <div class="creator-grid" style="grid-template-columns: repeat(4, 1fr); margin-top:8px">
                ${hairColorOptions.map(c => `
                    <div class="creator-item-option ${tempAvatar.hairColor === c.val ? 'active' : ''}" onclick="updateTempAvatar('hairColor', '${c.val}')">
                        ${c.name}
                    </div>
                `).join('')}
            </div>
        `;
    } else if (creatorActiveTab === 'face') {
        tabContent = `
            <div class="creator-section-label">Yeux</div>
            <div class="creator-grid">
                ${eyesOptions.map(e => `
                    <div class="creator-item-option ${tempAvatar.eyes === e.val ? 'active' : ''}" onclick="updateTempAvatar('eyes', '${e.val}')">
                        ${e.name}
                    </div>
                `).join('')}
            </div>
            <div class="creator-section-label" style="margin-top:16px">Sourcils</div>
            <div class="creator-grid" style="grid-template-columns: repeat(3, 1fr)">
                ${eyebrowsOptions.map(b => `
                    <div class="creator-item-option ${tempAvatar.eyebrows === b.val ? 'active' : ''}" onclick="updateTempAvatar('eyebrows', '${b.val}')">
                        ${b.name}
                    </div>
                `).join('')}
            </div>
            <div class="creator-section-label" style="margin-top:16px">Bouche</div>
            <div class="creator-grid">
                ${mouthOptions.map(m => `
                    <div class="creator-item-option ${tempAvatar.mouth === m.val ? 'active' : ''}" onclick="updateTempAvatar('mouth', '${m.val}')">
                        ${m.name}
                    </div>
                `).join('')}
            </div>
        `;
    } else if (creatorActiveTab === 'clothes') {
        tabContent = `
            <div class="creator-section-label">Vêtement</div>
            <div class="creator-grid">
                ${clothingOptions.map(c => `
                    <div class="creator-item-option ${tempAvatar.clothing === c.val ? 'active' : ''}" onclick="updateTempAvatar('clothing', '${c.val}')">
                        ${c.name}
                    </div>
                `).join('')}
            </div>
            <div class="creator-section-label" style="margin-top:16px">Couleur</div>
            <div class="creator-grid" style="grid-template-columns: repeat(4, 1fr)">
                ${clothingColorOptions.map(c => `
                    <div class="creator-item-option ${tempAvatar.clothingColor === c.val ? 'active' : ''}" onclick="updateTempAvatar('clothingColor', '${c.val}')">
                        ${c.name}
                    </div>
                `).join('')}
            </div>
        `;
    } else if (creatorActiveTab === 'accessories') {
        tabContent = `
            <div class="creator-section-label">Accessoires débloqués</div>
            <div style="display:flex; flex-direction:column; gap:10px">
                ${availableAccs.map(a => {
            const isEquipped = tempAvatar.accessories === a.id;
            return `
                        <button class="btn ${isEquipped ? 'btn-primary' : 'btn-secondary'}" style="justify-content:flex-start" onclick="updateTempAvatar('accessories', '${a.id}')">
                            <i data-lucide="${isEquipped ? 'check-circle' : 'circle'}" style="width:18px;height:18px"></i> ${a.name}
                        </button>
                    `;
        }).join('')}
            </div>
        `;
    } else if (creatorActiveTab === 'theme') {
        tabContent = `
            <div style="display:flex; flex-direction:column; gap:16px">
                <button class="btn ${APP.studentTheme === 'college' ? 'btn-primary' : 'btn-secondary'}" onclick="setStudentTheme('college')">
                    🎒 Mode Aventurier (Collège)
                </button>
                <button class="btn ${APP.studentTheme === 'lycee' ? 'btn-primary' : 'btn-secondary'}" onclick="setStudentTheme('lycee')">
                    🎮 Mode Pro Gamer (Lycée)
                </button>
            </div>
        `;
    }

    overlay.innerHTML = `
        <div class="avatar-creator-panel card">
            <div class="creator-preview-section">
                <h2 style="font-weight:800;margin-bottom:16px;text-align:center">Mon Avatar</h2>
                <div style="width:160px;height:160px">
                    ${renderAvatarSVG(tempAvatar, APP.mood, 160)}
                </div>
                <div style="margin-top:20px; font-size:0.8rem; color:var(--text-secondary); text-align:center">
                    ${APP.username} · Niveau ${APP.level}
                </div>
            </div>
            
            <div style="display:flex;flex-direction:column">
                <div class="creator-options-tabs">
                    <button class="creator-tab ${creatorActiveTab === 'skin' ? 'active' : ''}" onclick="setCreatorTab('skin')">Peau</button>
                    <button class="creator-tab ${creatorActiveTab === 'hair' ? 'active' : ''}" onclick="setCreatorTab('hair')">Cheveux</button>
                    <button class="creator-tab ${creatorActiveTab === 'face' ? 'active' : ''}" onclick="setCreatorTab('face')">Visage</button>
                    <button class="creator-tab ${creatorActiveTab === 'clothes' ? 'active' : ''}" onclick="setCreatorTab('clothes')">Style</button>
                    <button class="creator-tab ${creatorActiveTab === 'accessories' ? 'active' : ''}" onclick="setCreatorTab('accessories')">Items</button>
                    <button class="creator-tab ${creatorActiveTab === 'theme' ? 'active' : ''}" onclick="setCreatorTab('theme')">Vibe</button>
                </div>
                
                <div style="flex-grow:1;margin-bottom:24px;max-height:300px;overflow-y:auto">
                    ${tabContent}
                </div>
                
                <div style="display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap;">
                    <button class="btn btn-secondary" onclick="logout(); closeAvatarCreator();" style="border-color:var(--color-danger); color:var(--color-danger)">
                        <i data-lucide="log-out" style="width:16px;height:16px;margin-right:6px"></i>Déconnexion
                    </button>
                    <div style="display:flex;gap:12px">
                        <button class="btn btn-secondary" onclick="closeAvatarCreator()">Annuler</button>
                        <button class="btn btn-primary" onclick="saveAvatar()">Enregistrer</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons({ nodes: [overlay] });
}

function setCreatorTab(tab) {
    creatorActiveTab = tab;
    renderAvatarCreatorContent();
}

function updateTempAvatar(key, value) {
    tempAvatar[key] = value;
    renderAvatarCreatorContent();
}

function setStudentTheme(theme) {
    APP.studentTheme = theme;
    saveState();
    document.documentElement.setAttribute('data-student-theme', theme);
    playRetroSound('click');
    renderAvatarCreatorContent();
}

function saveAvatar() {
    APP.avatar = tempAvatar;
    saveState();
    closeAvatarCreator();
    playRetroSound('levelUp');
    launchConfetti();
    showToast("Avatar mis à jour ! 🌟", "success");
    renderApp();
}

function closeAvatarCreator() {
    const overlay = document.getElementById('avatar-creator-modal');
    if (overlay) overlay.remove();
}

function playRetroSound(type) {
    if (APP.soundMuted) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'click') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.16); // G5

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'levelUp') {
            osc.type = 'square';
            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                osc.frequency.setValueAtTime(freq, now + idx * 0.06);
            });
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.setValueAtTime(0.08, now + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

            osc.start(now);
            osc.stop(now + 0.45);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.22);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

            osc.start(now);
            osc.stop(now + 0.22);
        }
    } catch (e) {
        console.warn("AudioContext failed", e);
    }
}

function toggleMuteSound() {
    APP.soundMuted = !APP.soundMuted;
    saveState();
    playRetroSound('click');
    renderApp();
    showToast(APP.soundMuted ? "Sons coupés 🔇" : "Sons activés 🔊", "primary");
}

function gainXP(amount, message = '') {
    if (APP.role !== 'student') return;
    APP.xp = (APP.xp || 0) + amount;

    let leveledUp = false;
    while (APP.xp >= 100) {
        APP.xp -= 100;
        APP.level = (APP.level || 1) + 1;
        leveledUp = true;
    }

    saveState();

    if (leveledUp) {
        playRetroSound('levelUp');
        launchConfetti();
        showToast(`🎉 LEVEL UP ! Tu es niveau ${APP.level} !`, 'success');
    } else if (message) {
        showToast(`${message} (+${amount} XP)`, 'success');
        playRetroSound('success');
    }
}

function gainCoins(amount) {
    if (APP.role !== 'student') return;
    APP.coins = (APP.coins || 0) + amount;
    saveState();
}

function updateRPGStat(statName, amount) {
    if (APP.role !== 'student') return;
    APP.rpgStats = APP.rpgStats || { INT: 50, FOCUS: 45, DEDICATION: 60, CREATIVE: 30 };
    APP.rpgStats[statName] = Math.min(100, (APP.rpgStats[statName] || 0) + amount);
    saveState();
}

function unlockAchievement(id, title, description) {
    if (APP.role !== 'student') return;
    APP.unlockedBadges = APP.unlockedBadges || [];
    if (APP.unlockedBadges.includes(id)) return;

    APP.unlockedBadges.push(id);

    const accessoryMap = {
        'first-avatar': 'prescription01',
        'math-quiz-master': 'round',
        'streak-3': 'sunglasses',
        'explorateur': 'wayfarers',
        'zen-master': 'kurt'
    };
    const accToUnlock = accessoryMap[id];
    if (accToUnlock && !APP.unlockedAccessories.includes(accToUnlock)) {
        APP.unlockedAccessories.push(accToUnlock);
    }

    saveState();
    playRetroSound('levelUp');
    launchConfetti();
    showToast(`🏆 BADGE DÉBLOQUÉ : ${title} !`, 'success');
}

function getLeaderboardData() {
    const userXP = (APP.level - 1) * 100 + APP.xp;
    const list = [
        { name: 'Léa Martin', xp: 450, avatar: { skin: 'pale', top: 'straight01', hairColor: 'blondeGolden', clothing: 'hoodie', clothingColor: 'pink', accessories: 'prescription01', eyes: 'happy', eyebrows: 'defaultNatural', mouth: 'smile' } },
        { name: 'Thomas Dupont', xp: 320, avatar: { skin: 'light', top: 'shortFlat', hairColor: 'black', clothing: 'shirtCrewNeck', clothingColor: 'blue02', accessories: 'none', eyes: 'default', eyebrows: 'defaultNatural', mouth: 'default' } },
        { name: 'Inès Boucher', xp: 210, avatar: { skin: 'pale', top: 'curly', hairColor: 'brown', clothing: 'blazerAndSweater', clothingColor: 'pastelGreen', accessories: 'round', eyes: 'default', eyebrows: 'flatNatural', mouth: 'twinkle' } },
        { name: 'Lucas Moreau', xp: 120, avatar: { skin: 'brown', top: 'theCaesar', hairColor: 'red', clothing: 'graphicShirt', clothingColor: 'red', accessories: 'sunglasses', eyes: 'side', eyebrows: 'angryNatural', mouth: 'serious' } }
    ];

    list.push({
        name: APP.username + ' (Toi)',
        xp: userXP,
        avatar: APP.avatar,
        isUser: true
    });

    list.sort((a, b) => b.xp - a.xp);
    return list;
}

function claimQuestReward(questId, xpReward, coinReward) {
    APP.claimedQuests = APP.claimedQuests || [];
    if (APP.claimedQuests.includes(questId)) return;

    APP.claimedQuests.push(questId);
    gainXP(xpReward);
    gainCoins(coinReward);
    saveState();
    renderApp();
}

function flipFlashcard(el) {
    el.classList.toggle('flipped');
    playRetroSound('click');
}

const FLASHCARD_SUBJECTS = ['Mathématiques', 'Français', 'SVT', 'Anglais'];
function changeDashboardFlashcard() {
    let currIdx = FLASHCARD_SUBJECTS.indexOf(APP.activeSubject || 'Mathématiques');
    let nextIdx = (currIdx + 1) % FLASHCARD_SUBJECTS.length;
    APP.activeSubject = FLASHCARD_SUBJECTS[nextIdx];
    saveState();
    playRetroSound('click');
    renderApp();
}

function saveWhiteboardDrawing() {
    showToast('Dessin sauvegardé ! 🎨', 'success');
    if (APP.role === 'student') {
        gainXP(20, "Schéma enregistré !");
        updateRPGStat('CREATIVE', 15);
        unlockAchievement('whiteboard-artist', 'Artiste', 'Sauvegarder un dessin sur le Tableau Blanc');

        APP.completedQuests = APP.completedQuests || [];
        if (!APP.completedQuests.includes('quest-whiteboard')) {
            APP.completedQuests.push('quest-whiteboard');
            saveState();
        }
    }
}

function buyAccessory(id, price) {
    APP.shopBoughtAccessories = APP.shopBoughtAccessories || [];
    if (APP.shopBoughtAccessories.includes(id)) {
        showToast("Tu possèdes déjà cet accessoire !", "warning");
        return;
    }
    if ((APP.coins || 0) < price) {
        showToast("Pas assez de pièces ! 😢", "danger");
        playRetroSound('error');
        return;
    }
    APP.coins -= price;
    APP.shopBoughtAccessories.push(id);
    saveState();
    playRetroSound('levelUp');
    launchConfetti();
    showToast("Achat réussi ! Équipe-le dans l'éditeur.", "success");
    renderApp();
}

function checkExplorateurAchievement() {
    APP.exploredSubjects = APP.exploredSubjects || [];
    if (!APP.exploredSubjects.includes(APP.activeSubject)) {
        APP.exploredSubjects.push(APP.activeSubject);
        saveState();
        if (APP.exploredSubjects.length >= 3) {
            unlockAchievement('explorateur', 'Explorateur', 'Consulter au moins 3 matières différentes');
        }
    }
}

// ─── BOOT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderApp();
});
