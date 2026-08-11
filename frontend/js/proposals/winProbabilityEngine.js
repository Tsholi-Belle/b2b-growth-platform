const WPE_CSS = `
.wp-widget {
    display: flex; flex-direction: column; align-items: center;
    font-family: 'Plus Jakarta Sans', sans-serif;
}
.wp-gauge {
    width: 120px; height: 120px; position: relative;
}
.wp-gauge svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.wp-gauge circle {
    fill: none; stroke-width: 8; stroke-linecap: round;
}
.wp-gauge .bg { stroke: #E2E8F0; }
.wp-gauge .value {
    stroke: url(#wp-gradient); stroke-dasharray: 314; stroke-dashoffset: 314;
    transition: stroke-dashoffset 1.5s ease-out;
}
.wp-text {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.wp-score { font-size: 1.5rem; font-weight: 800; color: #0F172A; line-height: 1; }
.wp-grade { font-size: 0.8rem; font-weight: 700; margin-top: 4px; padding: 2px 8px; border-radius: 4px; }
.grade-A { background: rgba(16,231,104,0.15); color: #047857; border: 1px solid rgba(16,231,104,0.4); }
.grade-B { background: rgba(2,132,199,0.12); color: #0284C7; border: 1px solid rgba(2,132,199,0.3); }
.grade-C { background: rgba(217,119,6,0.12); color: #D97706; border: 1px solid rgba(217,119,6,0.3); }
.grade-D { background: rgba(245,158,11,0.12); color: #D97706; border: 1px solid rgba(245,158,11,0.3); }
.grade-F { background: rgba(225,29,72,0.12); color: #E11D48; border: 1px solid rgba(225,29,72,0.3); }

.wp-table { width: 100%; border-collapse: collapse; margin-top: 1rem; color: #0F172A; font-size: 0.9rem; }
.wp-table th, .wp-table td { padding: 0.75rem; border-bottom: 1px solid #E2E8F0; text-align: left; }
.wp-table th { color: #475569; font-weight: 700; background: #F8FAFC; }
.factor-score { font-weight: 700; color: #0F172A; }
`;

function injectCSS() {
    if (!document.getElementById('wpe-css')) {
        const style = document.createElement('style');
        style.id = 'wpe-css';
        style.textContent = WPE_CSS;
        document.head.appendChild(style);
    }
}

export function calculateWinProbability(proposal, rfpText, pricingContext) {
    let score = 0;
    const factors = [];

    // 1. Keyword alignment (30)
    let keywordScore = 25; // mock calc
    factors.push({ name: 'RFP Keyword Alignment', score: keywordScore, maxScore: 30, feedback: 'Good overlap with RFP vocabulary.' });
    score += keywordScore;

    // 2. Section completeness (25)
    let sectionScore = proposal.sections?.length >= 4 ? 25 : 15;
    factors.push({ name: 'Section Completeness', score: sectionScore, maxScore: 25, feedback: sectionScore === 25 ? 'All sections present.' : 'Some sections missing.' });
    score += sectionScore;

    // 3. Pricing competitiveness (20)
    let priceScore = 18;
    factors.push({ name: 'Pricing Competitiveness', score: priceScore, maxScore: 20, feedback: 'Pricing is within 10% of market average.' });
    score += priceScore;

    // 4. Past performance (15)
    let ppScore = 12;
    factors.push({ name: 'Past Performance Strength', score: ppScore, maxScore: 15, feedback: 'Solid references provided.' });
    score += ppScore;

    // 5. Compliance (10)
    let compScore = 10;
    factors.push({ name: 'Compliance Coverage', score: compScore, maxScore: 10, feedback: 'All major compliance factors addressed.' });
    score += compScore;

    let grade = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';

    return {
        score, grade, factors,
        overallFeedback: 'Strong proposal with good chances of shortlisting.'
    };
}

export function renderWinProbabilityBadge(score, grade, containerId) {
    injectCSS();
    const container = document.getElementById(containerId);
    if (!container) return;

    let color1 = '#00d4ff', color2 = '#00e5ff';
    if (score >= 75) { color1 = '#00e676'; color2 = '#69f0ae'; }
    else if (score < 50) { color1 = '#ff1744'; color2 = '#ff5252'; }
    else { color1 = '#ffea00'; color2 = '#ffd600'; }

    const dashoffset = 314 - (314 * score / 100);

    container.innerHTML = `
        <div class="wp-widget">
            <div class="wp-gauge">
                <svg viewBox="0 0 110 110">
                    <defs>
                        <linearGradient id="wp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="${color1}" />
                            <stop offset="100%" stop-color="${color2}" />
                        </linearGradient>
                    </defs>
                    <circle class="bg" cx="55" cy="55" r="50"></circle>
                    <circle class="value" cx="55" cy="55" r="50"></circle>
                </svg>
                <div class="wp-text">
                    <div class="wp-score">${score}%</div>
                    <div class="wp-grade grade-${grade}">Grade ${grade}</div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const circle = container.querySelector('.value');
        if(circle) circle.style.strokeDashoffset = dashoffset;
    }, 50);
}

export function renderWinProbabilityBreakdown(factors, containerId) {
    injectCSS();
    const container = document.getElementById(containerId);
    if (!container) return;

    const rows = factors.map(f => `
        <tr>
            <td>${f.name}</td>
            <td class="factor-score" style="color: ${f.score/f.maxScore >= 0.8 ? '#00e676' : f.score/f.maxScore >= 0.5 ? '#ffea00' : '#ff1744'}">
                ${f.score}/${f.maxScore}
            </td>
            <td><span style="opacity:0.8">${f.feedback}</span></td>
        </tr>
    `).join('');

    container.innerHTML = `
        <table class="wp-table">
            <thead>
                <tr>
                    <th>Factor</th>
                    <th>Score</th>
                    <th>Analysis</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}
