const ORG_ADMIN_CSS = `
.org-admin-panel {
    background: rgba(10, 15, 30, 0.8); backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.05); border-radius: 12px;
    padding: 2rem; color: #e2e8f0; font-family: 'Plus Jakarta Sans', sans-serif;
}
.org-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.org-title { margin: 0; font-size: 1.5rem; font-weight: 700; color: #fff; }
.org-badge {
    background: rgba(0, 212, 255, 0.1); color: #00d4ff; border: 1px solid rgba(0, 212, 255, 0.3);
    padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600;
}
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem; }
.stat-card {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
    padding: 1.5rem; border-radius: 12px; text-align: center;
}
.stat-value { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
.stat-label { font-size: 0.9rem; color: #8892b0; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.btn-primary {
    background: #00d4ff; color: #0a0f1e; border: none; padding: 0.5rem 1rem;
    border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;
}
.btn-primary:hover { background: #00e5ff; }
.btn-danger {
    background: rgba(255, 50, 50, 0.1); color: #ff5252; border: 1px solid rgba(255, 50, 50, 0.3);
    padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;
}
.members-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
.members-table th { text-align: left; padding: 1rem; color: #8892b0; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.1); }
.members-table td { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
.role-select {
    background: rgba(10, 15, 30, 0.8); color: #fff; border: 1px solid rgba(255,255,255,0.2);
    padding: 0.25rem; border-radius: 4px;
}
`;

function injectCSS() {
    if (!document.getElementById('org-admin-css')) {
        const style = document.createElement('style');
        style.id = 'org-admin-css';
        style.textContent = ORG_ADMIN_CSS;
        document.head.appendChild(style);
    }
}

export function renderOrgAdminPanel(containerId) {
    injectCSS();
    const container = document.getElementById(containerId);
    if (!container) return;

    // Mock data
    const orgData = {
        name: 'Acme Corp', plan: 'Professional', trialDays: 4,
        stats: { proposals: 12, agents: 45, exports: 10 },
        members: [
            { id: '1', name: 'Alice Smith', email: 'alice@acme.com', role: 'owner', joined: '2023-10-01' },
            { id: '2', name: 'Bob Jones', email: 'bob@acme.com', role: 'member', joined: '2023-11-15' }
        ]
    };

    let membersHtml = orgData.members.map(m => `
        <tr id="member-${m.id}">
            <td>${m.name}<br><small style="color:#8892b0">${m.email}</small></td>
            <td>
                <select class="role-select" onchange="window.orgAdmin.changeMemberRole('${m.id}', this.value)" ${m.role === 'owner' ? 'disabled' : ''}>
                    <option value="owner" ${m.role === 'owner' ? 'selected' : ''}>Owner</option>
                    <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option>
                </select>
            </td>
            <td>${m.joined}</td>
            <td>${m.role !== 'owner' ? `<button class="btn-danger" onclick="window.orgAdmin.removeMember('${m.id}')">Remove</button>` : ''}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="org-admin-panel">
            <div class="org-header">
                <h2 class="org-title">${orgData.name} <span class="org-badge">${orgData.plan}</span> ${orgData.trialDays ? `<span class="org-badge" style="color:#ffb86c; border-color:#ffb86c;">${orgData.trialDays} days left</span>` : ''}</h2>
                <button class="btn-primary" onclick="fetch('/api/billing/portal').then(()=>alert('Billing portal opened'))">Manage Billing</button>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-value">${orgData.stats.proposals}</div><div class="stat-label">Proposals (Month)</div></div>
                <div class="stat-card"><div class="stat-value">${orgData.stats.agents}</div><div class="stat-label">Agent Runs</div></div>
                <div class="stat-card"><div class="stat-value">${orgData.stats.exports}</div><div class="stat-label">PDF Exports</div></div>
            </div>

            <div class="section-header">
                <h3 style="margin:0;">Team Members</h3>
                <button class="btn-primary" onclick="const email=prompt('Email to invite:'); if(email) window.orgAdmin.inviteMember(email, 'member')">Invite Member</button>
            </div>
            
            <table class="members-table">
                <thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>${membersHtml}</tbody>
            </table>
        </div>
    `;

    window.orgAdmin = { inviteMember, changeMemberRole, removeMember };
}

export async function inviteMember(email, role) {
    try {
        await fetch('/api/org/invite', { method: 'POST', body: JSON.stringify({ email, role }) });
        alert(`Invited ${email} as ${role}`);
    } catch (e) { console.error(e); }
}

export async function changeMemberRole(userId, newRole) {
    try {
        await fetch(`/api/org/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) });
        console.log(`Role changed for ${userId} to ${newRole}`);
    } catch (e) { console.error(e); }
}

export async function removeMember(userId) {
    if (confirm('Are you sure you want to remove this member?')) {
        try {
            await fetch(`/api/org/members/${userId}`, { method: 'DELETE' });
            document.getElementById(`member-${userId}`)?.remove();
        } catch (e) { console.error(e); }
    }
}
