const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'https://mock.supabase.co';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || 'mock-key';

let supabaseClient = null;

if (window.supabase) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch(e) {
        console.warn('Supabase client initialization skipped', e);
    }
}

const MODAL_CSS = `
.auth-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px);
    display: none; align-items: center; justify-content: center;
    z-index: 10000; opacity: 0; transition: opacity 0.3s ease;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #0F172A;
}
.auth-overlay.show { display: flex; opacity: 1; }
.auth-card {
    background: rgba(255, 255, 255, 0.95); border: 1px solid #CBD5E1;
    border-radius: 16px; width: 400px; padding: 2rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
    position: relative;
}
.auth-close-btn {
    position: absolute; top: 1rem; right: 1rem; background: transparent;
    border: none; font-size: 1.25rem; cursor: pointer; color: #64748B;
}
.auth-tabs { display: flex; margin-bottom: 1.5rem; border-bottom: 1px solid #E2E8F0; }
.auth-tab {
    flex: 1; text-align: center; padding: 0.75rem; cursor: pointer;
    font-weight: 600; color: #64748B; border-bottom: 2px solid transparent; transition: all 0.2s;
}
.auth-tab.active { color: #0F172A; border-bottom-color: #0F172A; font-weight: 700; }
.auth-form { display: none; flex-direction: column; gap: 1rem; }
.auth-form.active { display: flex; }
.auth-input {
    background: #FFFFFF; border: 1px solid #CBD5E1;
    border-radius: 8px; padding: 0.75rem 1rem; color: #0F172A; outline: none; transition: border 0.2s;
    font-family: inherit; font-size: 0.95rem; width: 100%; box-sizing: border-box;
}
.auth-input:focus { border-color: #0F172A; box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1); }
.auth-btn {
    background: #0F172A; color: #FFFFFF; border: none; border-radius: 8px;
    padding: 0.75rem; font-weight: 700; cursor: pointer; transition: background 0.2s;
    font-family: inherit; font-size: 1rem; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}
.auth-btn:hover { background: #1E293B; }
.auth-btn-secondary {
    background: #FFFFFF; color: #0F172A; border: 1px solid #CBD5E1;
}
.auth-btn-secondary:hover { background: #F8FAFC; border-color: #94A3B8; }
.auth-links { text-align: center; font-size: 0.85rem; margin-top: -0.5rem; }
.auth-links a { color: #0284C7; text-decoration: none; font-weight: 600; }
.auth-links a:hover { text-decoration: underline; }
.auth-divider {
    text-align: center; margin: 1.5rem 0; position: relative; color: #64748B; font-size: 0.85rem;
}
.auth-divider::before, .auth-divider::after {
    content: ""; position: absolute; top: 50%; width: 40%; height: 1px; background: #E2E8F0;
}
.auth-divider::before { left: 0; }
.auth-divider::after { right: 0; }
`;

let currentUser = { role: 'demo', org: 'ArchEngine Solutions', currency: 'ZAR', name: 'Advisory Lead' };
let currentSession = null;

function injectCSS() {
    if (!document.getElementById('auth-client-css')) {
        const style = document.createElement('style');
        style.id = 'auth-client-css';
        style.textContent = MODAL_CSS;
        document.head.appendChild(style);
    }
}

export async function initAuth() {
    injectCSS();
    renderUserMenu();

    const checkSignupParam = new URLSearchParams(window.location.search).get('signup') === 'true';
    if (checkSignupParam) {
        renderModal('signup');
        return;
    }

    if (supabaseClient) {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                currentSession = session;
                currentUser = session.user;
                setupStateListener();
                renderUserMenu();
            }
        } catch(e) {
            console.warn('Session retrieval skipped', e);
        }
    }
}

function setupStateListener() {
    if (!supabaseClient) return;
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentSession = session;
        currentUser = session?.user || null;
        if (event === 'SIGNED_OUT') {
            window.location.reload();
        }
        renderUserMenu();
    });
}

export function openAuthModal(tab = 'login') {
    renderModal(tab);
}

function renderModal(initialTab = 'login') {
    const existing = document.getElementById('auth-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.className = 'auth-overlay';
    
    overlay.innerHTML = `
        <div class="auth-card">
            <button class="auth-close-btn" id="btn-close-auth">✕</button>
            <h2 style="text-align:center; margin-top:0; margin-bottom:1.5rem; font-weight:700;">ArchEngine Solutions</h2>
            <div class="auth-tabs">
                <div class="auth-tab ${initialTab === 'login' ? 'active' : ''}" id="tab-login">Login</div>
                <div class="auth-tab ${initialTab === 'signup' ? 'active' : ''}" id="tab-signup">Sign Up</div>
            </div>
            
            <form id="form-login" class="auth-form ${initialTab === 'login' ? 'active' : ''}">
                <input type="email" class="auth-input" id="login-email" placeholder="Email Address" required>
                <input type="password" class="auth-input" id="login-password" placeholder="Password" required>
                <div class="auth-links"><a href="#">Forgot password?</a></div>
                <button type="submit" class="auth-btn">Log In</button>
            </form>
            
            <form id="form-signup" class="auth-form ${initialTab === 'signup' ? 'active' : ''}">
                <input type="text" class="auth-input" id="signup-name" placeholder="Full Name" required>
                <input type="text" class="auth-input" id="signup-org" placeholder="Organisation Name" required>
                <input type="email" class="auth-input" id="signup-email" placeholder="Email Address" required>
                <input type="password" class="auth-input" id="signup-password" placeholder="Password" required>
                <button type="submit" class="auth-btn">Create Account</button>
            </form>

            <div class="auth-divider">OR</div>
            
            <button class="auth-btn auth-btn-secondary" style="width:100%; margin-bottom:0.75rem;" id="btn-google">
                Continue with Google
            </button>
            <button class="auth-btn auth-btn-secondary" style="width:100%;" id="btn-demo">
                Explore Demo (No Sign Up)
            </button>
        </div>
    `;

    document.body.appendChild(overlay);
    
    setTimeout(() => overlay.classList.add('show'), 10);

    const closeBtn = document.getElementById('btn-close-auth');
    if (closeBtn) {
        closeBtn.onclick = () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 250);
        };
    }

    document.getElementById('tab-login').onclick = () => switchAuthTab('login');
    document.getElementById('tab-signup').onclick = () => switchAuthTab('signup');

    document.getElementById('form-login').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        await loginWithEmail(email, pass);
    };

    document.getElementById('form-signup').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const org = document.getElementById('signup-org').value;
        const email = document.getElementById('signup-email').value;
        const pass = document.getElementById('signup-password').value;
        await signupWithEmail(email, pass, name, org);
    };

    document.getElementById('btn-demo').onclick = () => {
        sessionStorage.setItem('demo_mode', 'true');
        currentUser = { role: 'demo', org: 'ArchEngine Solutions', currency: 'ZAR', name: 'Demo User' };
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 250);
        renderUserMenu();
    };

    document.getElementById('btn-google').onclick = async () => {
        if (supabaseClient) {
            await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
        }
    };
}

function switchAuthTab(tab) {
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');
    if (tabLogin) tabLogin.classList.toggle('active', tab === 'login');
    if (tabSignup) tabSignup.classList.toggle('active', tab === 'signup');
    if (formLogin) formLogin.classList.toggle('active', tab === 'login');
    if (formSignup) formSignup.classList.toggle('active', tab === 'signup');
}

export function renderUserMenu() {
    const container = document.getElementById('user-menu');
    if (!container) return;

    if (currentUser && currentUser.email) {
        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; font-weight:700;">
                <span>${currentUser.email.split('@')[0]}</span>
                <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="window.authLogout()">Sign Out</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button class="btn-secondary" style="padding:0.35rem 0.75rem; font-size:0.8rem; font-weight:700;" onclick="window.openAuthModal()">Sign In</button>
        `;
    }
}

export async function loginWithEmail(email, password) {
    if (supabaseClient) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { alert(error.message); return; }
        currentSession = data.session;
        currentUser = data.user;
    } else {
        currentUser = { email, role: 'admin', name: 'Mock User', currency: 'ZAR' };
        currentSession = { access_token: 'mock_token' };
    }
    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 250);
    }
    renderUserMenu();
}

export async function signupWithEmail(email, password, fullName, orgName) {
    if (supabaseClient) {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) { alert(error.message); return; }
        currentSession = data.session;
        currentUser = data.user;
    } else {
        currentUser = { email, name: fullName, org: orgName, role: 'owner', currency: 'ZAR' };
        currentSession = { access_token: 'mock_token' };
    }
    
    try {
        await fetch('/api/org', { method: 'POST', body: JSON.stringify({ orgName, fullName }) });
    } catch (e) { console.warn('API Mock:', e); }

    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 250);
    }
    renderUserMenu();
}

export async function logout() {
    sessionStorage.removeItem('demo_mode');
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    window.location.reload();
}

export function getSession() {
    return currentSession;
}

export function getUser() {
    return currentUser;
}

export function isAuthenticated() {
    return true;
}

// Global window exposure
window.openAuthModal = openAuthModal;
window.authLogout = logout;

// Auto init on module load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
