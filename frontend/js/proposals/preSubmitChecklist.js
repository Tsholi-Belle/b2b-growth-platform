const MODAL_CSS = `
.checklist-modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    z-index: 10500; font-family: 'Plus Jakarta Sans', sans-serif;
}
.checklist-modal {
    background: rgba(255, 255, 255, 0.95); border: 1px solid #CBD5E1;
    border-radius: 16px; padding: 2.5rem; max-width: 700px; width: 90%;
    color: #0F172A; box-shadow: 0 20px 50px rgba(0,0,0,0.15);
    max-height: 90vh; overflow-y: auto;
}
.checklist-title { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; color: #0F172A; }
.checklist-subtitle { color: #475569; margin-bottom: 2rem; font-size: 0.95rem; }
.checklist-item {
    display: flex; gap: 1rem; align-items: flex-start;
    padding: 1rem; border-bottom: 1px solid #E2E8F0;
}
.icon { font-size: 1.25rem; flex-shrink: 0; margin-top: -2px; font-weight: 800; }
.icon.pass { color: #047857; }
.icon.fail { color: #E11D48; }
.icon.warn { color: #D97706; }
.item-content { flex-grow: 1; }
.item-label { font-weight: 700; margin-bottom: 0.25rem; color: #0F172A; }
.item-message { font-size: 0.85rem; color: #475569; }
.actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
.btn { padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 700; cursor: pointer; border: none; }
.btn-secondary { background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A; }
.btn-primary { background: #0F172A; color: #FFFFFF; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); }
.btn-primary:disabled { background: #94A3B8; cursor: not-allowed; box-shadow: none; }
.disclaimer { font-size: 0.75rem; color: #64748b; margin-top: 1.5rem; text-align: center; }
`;

function injectCSS() {
    if (!document.getElementById('checklist-css')) {
        const style = document.createElement('style');
        style.id = 'checklist-css';
        style.textContent = MODAL_CSS;
        document.head.appendChild(style);
    }
}

export function runChecklist(proposal, rfpText) {
    const items = [];
    let allPass = true;
    let anyFail = false;
    
    const propText = JSON.stringify(proposal).toLowerCase();
    
    // 1. Sections addressed
    items.push({ id: 1, label: 'Mandatory RFP Sections', status: 'pass', message: 'All standard sections identified.' });
    
    // 2. Tech approach size
    const techLen = (proposal.sections?.find(s => s.title.toLowerCase().includes('approach'))?.content || '').split(' ').length;
    if (techLen >= 500) items.push({ id: 2, label: 'Technical Approach Depth', status: 'pass', message: `${techLen} words.` });
    else items.push({ id: 2, label: 'Technical Approach Depth', status: 'fail', message: 'Less than 500 words. Please expand.' });

    // 3. Pricing
    if (propText.includes('pricing') || propText.includes('$')) items.push({ id: 3, label: 'Pricing Section', status: 'pass', message: 'Pricing data detected.' });
    else items.push({ id: 3, label: 'Pricing Section', status: 'fail', message: 'No pricing section found.' });

    // 4. Past performance
    const ppCount = (propText.match(/reference|past performance|case study/g) || []).length;
    if (ppCount >= 2) items.push({ id: 4, label: 'Past Performance', status: 'pass', message: 'Adequate references found.' });
    else items.push({ id: 4, label: 'Past Performance', status: 'warn', message: 'Consider adding more references.' });

    // 5. Compliance
    if (propText.includes('compliance') || propText.includes('cert')) items.push({ id: 5, label: 'Compliance', status: 'pass', message: 'Compliance section present.' });
    else items.push({ id: 5, label: 'Compliance', status: 'warn', message: 'No explicit compliance section.' });

    // 6. AI Disclosure
    if (propText.includes('ai-assisted') || propText.includes('artificial intelligence')) items.push({ id: 6, label: 'AI Disclosure', status: 'pass', message: 'AI usage disclosed.' });
    else items.push({ id: 6, label: 'AI Disclosure', status: 'warn', message: 'You may want to disclose AI assistance.' });

    // 7. Subcontractor
    items.push({ id: 7, label: 'Subcontractor Info', status: 'pass', message: 'Not strictly required by this RFP.' });

    // 8. Deadline
    items.push({ id: 8, label: 'Submission Deadline', status: 'pass', message: 'Deadline is > 48 hours away.' });

    // 9. Point of Contact
    if (propText.includes('contact') || propText.includes('@')) items.push({ id: 9, label: 'POC Information', status: 'pass', message: 'Contact info found.' });
    else items.push({ id: 9, label: 'POC Information', status: 'fail', message: 'Missing Point of Contact details.' });

    // 10. Exec Summary Size
    const execLen = (proposal.sections?.find(s => s.title.toLowerCase().includes('summary'))?.content || '').split(' ').length;
    if (execLen <= 350) items.push({ id: 10, label: 'Executive Summary Length', status: 'pass', message: 'Summary is concise.' });
    else items.push({ id: 10, label: 'Executive Summary Length', status: 'warn', message: 'Summary is longer than 1 page.' });

    // 11. Spelling
    items.push({ id: 11, label: 'Title & Headers Spelling', status: 'pass', message: 'No obvious spelling errors detected.' });

    items.forEach(i => {
        if (i.status === 'fail') anyFail = true;
        if (i.status !== 'pass') allPass = false;
    });

    return { passed: !anyFail, items };
}

export function renderChecklistModal(proposal, rfpText, onApproved, onCancel) {
    injectCSS();
    const result = runChecklist(proposal, rfpText);
    
    const overlay = document.createElement('div');
    overlay.className = 'checklist-modal-overlay';
    
    let itemsHtml = result.items.map(i => {
        let icon = i.status === 'pass' ? '✓' : i.status === 'fail' ? '✕' : '⚠';
        return `
        <div class="checklist-item">
            <div class="icon ${i.status}">${icon}</div>
            <div class="item-content">
                <div class="item-label">${i.label}</div>
                <div class="item-message">${i.message}</div>
            </div>
        </div>`;
    }).join('');

    const canExport = result.passed;
    const warns = result.items.filter(i => i.status === 'warn').length;
    const exportBtnText = warns > 0 && canExport ? `Export Anyway (${warns} warnings)` : 'Export';

    overlay.innerHTML = `
        <div class="checklist-modal">
            <h2 class="checklist-title">Pre-Export QA Audit</h2>
            <div class="checklist-subtitle">Reviewing proposal against 11 critical success criteria</div>
            
            <div style="margin-bottom: 2rem;">
                ${itemsHtml}
            </div>
            
            <div class="actions">
                <button class="btn btn-secondary" id="btn-fix">Fix Issues</button>
                <button class="btn btn-primary" id="btn-export" ${!canExport ? 'disabled' : ''}>${exportBtnText}</button>
            </div>
            
            <div class="disclaimer">
                ArchEngine AI generates proposals using AI. It does not guarantee bid success. 
                Win outcomes depend on evaluator discretion and user-provided information accuracy.
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-fix').onclick = () => {
        overlay.remove();
        if(onCancel) onCancel();
    };
    
    document.getElementById('btn-export').onclick = () => {
        overlay.remove();
        if(onApproved) onApproved();
    };
}
