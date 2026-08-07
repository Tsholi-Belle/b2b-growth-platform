let billingStatus = { plan: 'free', trialDaysRemaining: 0, proposalsUsed: 0 };

const MODAL_CSS = `
.billing-modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(10, 15, 30, 0.85); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000; font-family: 'Plus Jakarta Sans', sans-serif;
}
.billing-modal {
    background: #0f162b; border: 1px solid rgba(0, 212, 255, 0.2);
    border-radius: 16px; padding: 2.5rem; max-width: 800px; width: 90%;
    color: #fff; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
.plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 2rem; }
.plan-card {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 1.5rem; text-align: center;
}
.plan-price { font-size: 2rem; font-weight: 700; color: #00d4ff; margin: 1rem 0; }
.plan-btn {
    background: #00d4ff; color: #0a0f1e; border: none; padding: 0.75rem;
    width: 100%; border-radius: 6px; font-weight: bold; cursor: pointer;
    margin-top: 1rem;
}
.plan-btn:hover { background: #00e5ff; }
.trial-banner {
    background: rgba(0, 212, 255, 0.1); color: #00d4ff; text-align: center;
    padding: 0.75rem; font-weight: 600; border-bottom: 1px solid rgba(0, 212, 255, 0.3);
    display: flex; justify-content: center; align-items: center; gap: 1rem;
}
.trial-banner button {
    background: #00d4ff; color: #0a0f1e; border: none; padding: 0.25rem 0.75rem;
    border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8rem;
}
`;

function injectCSS() {
    if (!document.getElementById('billing-css')) {
        const style = document.createElement('style');
        style.id = 'billing-css';
        style.textContent = MODAL_CSS;
        document.head.appendChild(style);
    }
}

export async function initTrialManager() {
    injectCSS();
    try {
        const res = await fetch('/api/billing/status').catch(() => null);
        if (res && res.ok) {
            billingStatus = await res.json();
        } else {
            billingStatus = { plan: 'trial', trialDaysRemaining: 5, proposalsUsed: 1 }; // Mock
        }
    } catch (e) {
        console.error('Trial manager init failed');
    }

    if (billingStatus.plan === 'trial' && billingStatus.trialDaysRemaining > 0) {
        renderTrialBanner(billingStatus.trialDaysRemaining);
    }
}

export function renderTrialBanner(daysRemaining) {
    const banner = document.createElement('div');
    banner.className = 'trial-banner';
    banner.innerHTML = `
        <span>${daysRemaining} days left in your free trial. Upgrade to unlock full access.</span>
        <button onclick="window.billing.renderUpgradeModal('trial_end')">Upgrade Now</button>
        <span style="cursor:pointer; margin-left:auto; opacity:0.6" onclick="this.parentElement.remove()">✕</span>
    `;
    document.body.prepend(banner);
    window.billing = { renderUpgradeModal };
}

export function renderUpgradeModal(featureName) {
    const overlay = document.createElement('div');
    overlay.className = 'billing-modal-overlay';
    
    overlay.innerHTML = `
        <div class="billing-modal">
            <h2 style="margin-top:0; text-align:center;">Upgrade to Unlock Features</h2>
            <p style="text-align:center; color:#8892b0; margin-bottom:2rem;">
                ${featureName ? `You need a premium plan to use ${featureName}.` : 'Choose a plan that fits your needs.'}
            </p>
            
            <div class="plans-grid">
                <div class="plan-card">
                    <h3>Starter</h3>
                    <div class="plan-price">$49<span style="font-size:1rem;color:#8892b0">/mo</span></div>
                    <ul style="text-align:left; font-size:0.9rem; color:#8892b0; padding-left:1.2rem;">
                        <li>10 Proposals/mo</li>
                        <li>PDF Exports</li>
                        <li>Live Pricing</li>
                    </ul>
                    <button class="plan-btn" onclick="window.billing.initiateCheckout('starter')">Choose Plan</button>
                </div>
                <div class="plan-card" style="border-color:#00d4ff;">
                    <h3>Professional</h3>
                    <div class="plan-price">$149<span style="font-size:1rem;color:#8892b0">/mo</span></div>
                    <ul style="text-align:left; font-size:0.9rem; color:#8892b0; padding-left:1.2rem;">
                        <li>Unlimited Proposals</li>
                        <li>Monte Carlo Simulation</li>
                        <li>Up to 5 team members</li>
                    </ul>
                    <button class="plan-btn" onclick="window.billing.initiateCheckout('professional')">Choose Plan</button>
                </div>
                <div class="plan-card">
                    <h3>Enterprise</h3>
                    <div class="plan-price">$499<span style="font-size:1rem;color:#8892b0">/mo</span></div>
                    <ul style="text-align:left; font-size:0.9rem; color:#8892b0; padding-left:1.2rem;">
                        <li>Custom Connectors</li>
                        <li>Dedicated Account Manager</li>
                        <li>Up to 25 team members</li>
                    </ul>
                    <button class="plan-btn" onclick="window.billing.initiateCheckout('enterprise')">Choose Plan</button>
                </div>
            </div>
            <div style="text-align:center; margin-top:2rem;">
                <a href="#" style="color:#8892b0; text-decoration:none;" onclick="this.closest('.billing-modal-overlay').remove(); return false;">Cancel</a>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    window.billing = { ...window.billing, initiateCheckout };
}

export async function initiateCheckout(plan) {
    try {
        const res = await fetch('/api/billing/checkout', {
            method: 'POST', body: JSON.stringify({ plan })
        }).catch(() => ({ ok: false }));
        
        if (res.ok) {
            const { url } = await res.json();
            window.location.href = url;
        } else {
            alert(`Redirecting to Stripe Checkout for ${plan} plan...`);
        }
    } catch (e) {
        console.error(e);
    }
}

export function isFeatureAllowed(featureName) {
    const plan = billingStatus.plan;
    if (plan === 'enterprise') return true;
    
    const gates = {
        'live_pricing': ['starter', 'professional', 'enterprise'],
        'connectors': ['starter', 'professional', 'enterprise'],
        'monte_carlo': ['professional', 'enterprise'],
        'pdf_export': ['starter', 'professional', 'enterprise'],
        'team_members': ['starter', 'professional', 'enterprise'],
        'unlimited_proposals': ['professional', 'enterprise']
    };
    
    return gates[featureName]?.includes(plan) || false;
}

export function getProposalsRemaining() {
    const limits = { 'free': 2, 'starter': 10, 'professional': Infinity, 'enterprise': Infinity, 'trial': Infinity };
    const limit = limits[billingStatus.plan] || 0;
    return limit - billingStatus.proposalsUsed;
}
