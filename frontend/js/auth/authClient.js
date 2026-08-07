const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'https://mock.supabase.co';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || 'mock-key';

let supabaseClient = null;

if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const MODAL_CSS = `
.auth-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(10, 15, 30, 0.85); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000; opacity: 0; transition: opacity 0.3s ease;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #fff;
}
.auth-overlay.show { opacity: 1; }
.auth-card {
    background: rgba(15, 22, 43, 0.7); border: 1px solid rgba(0, 212, 255, 0.2);
    border-radius: 16px; width: 400px; padding: 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1);
}
.auth-tabs { display: flex; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
.auth-tab {
    flex: 1; text-align: center; padding: 0.75rem; cursor: pointer;
    font-weight: 600; color: #8892b0; border-bottom: 2px solid transparent; transition: all 0.2s;
}
.auth-tab.active { color: #00d4ff; border-bottom-color: #00d4ff; }
.auth-form { display: none; flex-direction: column; gap: 1rem; }
.auth-form.active { display: flex; }
.auth-input {
    background: rgba(10, 15, 30, 0.6); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; padding: 0.75rem 1rem; color: #fff; outline: none; transition: border 0.2s;
    font-family: inherit; font-size: 0.95rem; width: 100%; box-sizing: border-box;
}
.auth-input:focus { border-color: #00d4ff; }
.auth-btn {
    background: #00d4ff; color: #0a0f1e; border: none; border-radius: 8px;
    padding: 0.75rem; font-weight: 700; cursor: pointer; transition: background 0.2s;
    font-family: inherit; font-size: 1rem;
}
.auth-btn:hover { background: #00e5ff; }
.auth-btn-secondary {
    background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1);
}
.auth-btn-secondary:hover { background: rgba(255,255,255,0.1); }
.auth-links { text-align: center; font-size: 0.85rem; margin-top: -0.5rem; }
.auth-links a { color: #00d4ff; text-decoration: none; }
.auth-links a:hover { text-decoration: underline; }
.auth-divider {
    text-align: center; margin: 1.5rem 0; position: relative; color: #8892b0; font-size: 0.85rem;
}
.auth-divider::before, .auth-divider::after {
    content: ""; position: absolute; top: 50%; width: 40%; height: 1px; background: rgba(255,255,255,0.1);
}
.auth-divider::before { left: 0; }
.auth-divider::after { right: 0; }
`;

let currentUser = null;
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
    if (sessionStorage.getItem('demo_mode') === 'true') {
        currentUser = { role: 'demo', org: 'Demo Org', currency: 'ZAR', name: 'Demo User' };
        return;
    }
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentSession = session;
            currentUser = session.user;
            setupStateListener();
        } else {
            renderModal();
        }
    } else {
        console.warn('Supabase not loaded, falling back to mock UI');
        renderModal();
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
    });
}

function renderModal() {
    const existing = document.getElementById('auth-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.className = 'auth-overlay';
    
    overlay.innerHTML = `
        <div class="auth-card">
            <h2 style="text-align:center; margin-top:0; margin-bottom:1.5rem; font-weight:700;">ArchEngine AI</h2>
            <div class="auth-tabs">
                <div class="auth-tab active" id="tab-login">Login</div>
                <div class="auth-tab" id="tab-signup">Sign Up</div>
            </div>
            
            <form id="form-login" class="auth-form active">
                <input type="email" class="auth-input" id="login-email" placeholder="Email Address" required>
                <input type="password" class="auth-input" id="login-password" placeholder="Password" required>
                <div class="auth-links"><a href="#">Forgot password?</a></div>
                <button type="submit" class="auth-btn">Log In</button>
            </form>
            
            <form id="form-signup" class="auth-form">
                <input type="text" class="auth-input" id="signup-name" placeholder="Full Name" required>
                <input type="text" class="auth-input" id="signup-org" placeholder="Organisation Name" required>
                <input type="email" class="auth-input" id="signup-email" placeholder="Email Address" required>
                <input type="password" class="auth-input" id="signup-password" placeholder="Password" required>
                <button type="submit" class="auth-btn">Create Account</button>
            </form>

            <div class="auth-divider">OR</div>
            
            <button class="auth-btn auth-btn-secondary" style="width:100%; margin-bottom:1rem;" id="btn-google">
                Continue with Google
            </button>
            <button class="auth-btn auth-btn-secondary" style="width:100%;" id="btn-demo">
                Try Demo (no signup)
            </button>
        </div>
    `;

    document.body.appendChild(overlay);
    
    setTimeout(() => overlay.classList.add('show'), 10);

    const checkSignupParam = new URLSearchParams(window.location.search).get('signup') === 'true';

    document.getElementById('tab-login').onclick = () => switchTab('login');
    document.getElementById('tab-signup').onclick = () => switchTab('signup');

    if (checkSignupParam) switchTab('signup');

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
        currentUser = { role: 'demo', org: 'Demo Org', currency: 'ZAR', name: 'Demo User' };
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('btn-google').onclick = async () => {
        if (supabaseClient) {
            await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
        }
    };
}

function switchTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
    document.getElementById('form-login').classList.toggle('active', tab === 'login');
    document.getElementById('form-signup').classList.toggle('active', tab === 'signup');
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
        setTimeout(() => overlay.remove(), 300);
    }
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
        setTimeout(() => overlay.remove(), 300);
    }
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
    return !!currentUser || sessionStorage.getItem('demo_mode') === 'true';
}
