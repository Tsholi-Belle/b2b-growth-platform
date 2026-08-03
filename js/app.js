// MAIN APPLICATION CONTROLLER
import { SAMPLE_LOG_PRESETS } from './data/sampleLogs.js';
import { SAMPLE_RFPS } from './data/sampleRfps.js';
import { CLOUD_PROVIDERS } from './data/cloudPricingData.js';
import { ScraperAgent } from './engine/scraperAgent.js';
import { SimulatorAgent } from './engine/simulatorAgent.js';
import { ProposalAgent } from './engine/proposalAgent.js';
import { ImpactEngine } from './engine/impactEngine.js';

class AppController {
  constructor() {
    this.scraper = new ScraperAgent();
    this.simulator = new SimulatorAgent();
    this.proposalAgent = new ProposalAgent();
    this.impactEngine = new ImpactEngine();

    this.currentPreset = SAMPLE_LOG_PRESETS[0];
    this.currentRfp = SAMPLE_RFPS[0];
    this.latestSimulation = null;
    this.latestProposal = null;

    this.init();
  }

  async init() {
    this.bindTabNavigation();
    this.bindOptimizerControls();
    this.bindProposalControls();
    this.bindScraperControls();

    // Initial render
    this.renderLogPresets();
    this.renderRfpList();
    this.renderScraperMatrix();
    this.renderPillar2ImpactTable();
    
    // Run initial crawl and simulation
    await this.scraper.runCrawl();
    this.runSimulation();

    // Expose window API for inline onclick handlers
    window.app = this;
  }

  bindTabNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.getAttribute('data-tab');
        
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        e.currentTarget.classList.add('active');
        document.getElementById(`tab-${targetTab}`).classList.add('active');
      });
    });
  }

  bindOptimizerControls() {
    const mauInput = document.getElementById('input-mau');
    const rpsInput = document.getElementById('input-rps');
    const dbInput = document.getElementById('input-db');
    const egressInput = document.getElementById('input-egress');

    const updateSliderVals = () => {
      document.getElementById('val-mau').innerText = parseInt(mauInput.value).toLocaleString();
      document.getElementById('val-rps').innerText = `${rpsInput.value} req/s`;
      document.getElementById('val-db').innerText = `${dbInput.value} GB`;
      document.getElementById('val-egress').innerText = `${egressInput.value} TB`;
    };

    [mauInput, rpsInput, dbInput, egressInput].forEach(inp => {
      inp.addEventListener('input', () => {
        updateSliderVals();
        this.runSimulation();
      });
    });

    document.getElementById('btn-run-simulation').addEventListener('click', () => {
      this.runSimulation();
    });
  }

  bindProposalControls() {
    document.getElementById('btn-generate-proposal').addEventListener('click', async () => {
      await this.generateProposal();
    });
  }

  bindScraperControls() {
    document.getElementById('btn-trigger-crawl').addEventListener('click', async () => {
      const crawlRes = await this.scraper.runCrawl();
      this.appendTerminalLogs(crawlRes.logs, 'scraper');
      this.renderScraperMatrix();
    });
  }

  renderLogPresets() {
    const container = document.getElementById('log-preset-list');
    container.innerHTML = SAMPLE_LOG_PRESETS.map(preset => `
      <div class="preset-pill ${preset.id === this.currentPreset.id ? 'active' : ''}" onclick="window.app.selectLogPreset('${preset.id}')">
        <div class="preset-title">${preset.title}</div>
        <div class="preset-desc">${preset.description}</div>
      </div>
    `).join('');
  }

  selectLogPreset(presetId) {
    const preset = SAMPLE_LOG_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.currentPreset = preset;
    this.renderLogPresets();

    // Populate sliders with preset metrics
    document.getElementById('input-mau').value = preset.metrics.monthlyActiveUsers;
    document.getElementById('input-rps').value = preset.metrics.requestsPerSecondPeak;
    document.getElementById('input-db').value = preset.metrics.databaseSizeGB;
    document.getElementById('input-egress').value = preset.metrics.egressBandwidthTB;

    document.getElementById('val-mau').innerText = preset.metrics.monthlyActiveUsers.toLocaleString();
    document.getElementById('val-rps').innerText = `${preset.metrics.requestsPerSecondPeak} req/s`;
    document.getElementById('val-db').innerText = `${preset.metrics.databaseSizeGB} GB`;
    document.getElementById('val-egress').innerText = `${preset.metrics.egressBandwidthTB} TB`;

    this.appendTerminalLogs([
      `[SYSTEM] Ingested telemetry preset: "${preset.title}"`,
      ...preset.rawLogSnippet.split('\n')
    ], 'scraper');

    this.runSimulation();
  }

  renderRfpList() {
    const container = document.getElementById('rfp-document-list');
    container.innerHTML = SAMPLE_RFPS.map(rfp => `
      <div class="preset-pill ${rfp.id === this.currentRfp.id ? 'active' : ''}" onclick="window.app.selectRfp('${rfp.id}')">
        <div class="preset-title">${rfp.title}</div>
        <div class="preset-desc">Issuer: ${rfp.issuingOrganization} | Budget: ${rfp.budgetRange}</div>
      </div>
    `).join('');

    this.renderRfpExtractedDetails();
  }

  selectRfp(rfpId) {
    const rfp = SAMPLE_RFPS.find(r => r.id === rfpId);
    if (!rfp) return;

    this.currentRfp = rfp;
    this.renderRfpList();
  }

  renderRfpExtractedDetails() {
    const container = document.getElementById('rfp-extracted-details');
    const rfp = this.currentRfp;
    const specs = rfp.extractedTechnicalSpecs;

    container.innerHTML = `
      <div style="margin-bottom: 0.5rem;"><strong style="color: var(--text-main);">${rfp.title}</strong></div>
      <div><strong>Issuer:</strong> ${rfp.issuingOrganization}</div>
      <div><strong>Deadline:</strong> ${rfp.submissionDeadline}</div>
      <div><strong>Budget Range:</strong> ${rfp.budgetRange}</div>
      <div style="margin-top: 0.5rem;"><strong>Extracted Technical Specs:</strong></div>
      <ul style="padding-left: 1.2rem; margin-top: 0.25rem;">
        <li>Expected MAU: ${specs.expectedMAU.toLocaleString()}</li>
        <li>Peak RPS: ${specs.requestsPerSecondPeak} req/sec</li>
        <li>Database Size: ${specs.databaseStorageTB} TB</li>
        <li>Monthly Egress: ${specs.monthlyEgressTB} TB</li>
      </ul>
      <div style="margin-top: 0.5rem;"><strong>Compliance Requirements:</strong></div>
      <div style="margin-top: 0.25rem;">
        ${rfp.complianceRequirements.map(req => `<span class="tag-badge">${req}</span>`).join('')}
      </div>
    `;
  }

  runSimulation() {
    const params = {
      monthlyActiveUsers: parseInt(document.getElementById('input-mau').value),
      requestsPerSecondPeak: parseInt(document.getElementById('input-rps').value),
      databaseSizeGB: parseFloat(document.getElementById('input-db').value),
      monthlyEgressTB: parseFloat(document.getElementById('input-egress').value),
      currentMonthlySpend: this.currentPreset.metrics.currentMonthlySpend || 4500
    };

    const simRes = this.simulator.simulateCosts(params);
    this.latestSimulation = simRes;

    this.appendTerminalLogs(simRes.logs, 'simulator');
    this.renderSimulationOutputs(simRes);
    this.renderOverviewBarChart(simRes);
  }

  renderSimulationOutputs(simRes) {
    const container = document.getElementById('simulation-output-list');
    const recCode = simRes.recommendedProvider.providerName;

    const html = Object.keys(simRes.results).map(key => {
      const p = simRes.results[key];
      const isRec = p.providerName === recCode;

      return `
        <div class="provider-row ${isRec ? 'recommended' : ''}">
          <div class="provider-info">
            <div class="provider-badge" style="background: ${p.badgeColor};"></div>
            <div>
              <div class="provider-name">
                ${p.providerName}
                ${isRec ? `<span class="tag-badge" style="margin-left: 0.5rem; background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); border-color: var(--accent-emerald);">RECOMMENDED BEST VALUE</span>` : ''}
              </div>
              <div class="provider-details">
                Compute: $${p.breakdown.compute}/mo | DB: $${p.breakdown.database}/mo | Egress: $${p.breakdown.egress}/mo | SLA: ${p.slaUptime}
              </div>
            </div>
          </div>

          <div class="provider-pricing">
            <div class="monthly-price">$${p.monthlyReserved.toLocaleString()}<span style="font-size:0.75rem; color: var(--text-muted); font-weight: normal;">/mo</span></div>
            <div class="price-subtext">
              ${p.annualSavingsVsCurrent > 0 ? `Saves $${p.annualSavingsVsCurrent.toLocaleString()}/yr` : 'On-Demand Rate'}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  renderOverviewBarChart(simRes) {
    const container = document.getElementById('overview-bar-chart');
    if (!container || !simRes) return;

    const providers = Object.values(simRes.results);
    const maxSpend = Math.max(...providers.map(p => p.monthlyReserved));

    container.innerHTML = providers.map(p => {
      const heightPct = Math.max(15, Math.round((p.monthlyReserved / maxSpend) * 100));
      return `
        <div class="bar-column">
          <div class="bar-value">$${p.monthlyReserved}</div>
          <div class="bar-fill" style="height: ${heightPct}%; background: linear-gradient(180deg, ${p.badgeColor}, rgba(0,0,0,0.4));"></div>
          <div class="bar-label">${p.providerName.split(' ')[0]}</div>
        </div>
      `;
    }).join('');
  }

  async generateProposal() {
    this.appendTerminalLogs([
      `[SYSTEM] Triggering Agent 3 (Proposal Writer)...`,
      `[Agent 3] Reading RFP document "${this.currentRfp.title}"`
    ], 'proposal');

    const res = await this.proposalAgent.generateProposal(this.currentRfp);
    this.latestProposal = res.proposal;

    this.appendTerminalLogs(res.logs, 'proposal');
    this.renderProposalPreview(res.proposal);
  }

  renderProposalPreview(proposal) {
    const area = document.getElementById('proposal-preview-area');
    const audit = proposal.auditReport || { complianceScore: 98, riskLevel: 'Low' };

    area.innerHTML = `
      <div style="width: 100%; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div>
            <span class="tag-badge" style="background: rgba(16,185,129,0.15); color: var(--accent-emerald);">PROPOSAL DRAFT READY</span>
            <span class="tag-badge" style="background: rgba(245,158,11,0.15); color: var(--accent-amber);">AGENT 4 AUDITED (${audit.complianceScore}%)</span>
            <h3 style="font-size: 1.1rem; color: var(--text-main); margin-top: 0.25rem;">${proposal.rfpTitle}</h3>
          </div>
          <button class="btn-primary" style="width: auto; padding: 0.6rem 1.2rem;" onclick="window.app.openModal()">
            📄 Full Review & Export PDF
          </button>
        </div>

        <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass); margin-bottom: 1rem;">
          <p style="font-size: 0.85rem; color: var(--text-muted);">${proposal.executiveSummary}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
          <div style="background: rgba(0,242,254,0.05); border: 1px solid rgba(0,242,254,0.2); padding: 0.85rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.72rem; color: var(--primary-cyan); font-weight: 700;">CLOUD BLUEPRINT</div>
            <div style="font-size: 1rem; font-weight: 800; color: var(--text-main);">${proposal.recommendedCloudArchitecture.primaryProvider.split(' ')[0]}</div>
            <div style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 600;">$${proposal.recommendedCloudArchitecture.monthlyOpEx.toLocaleString()}/mo</div>
          </div>

          <div style="background: rgba(139,92,246,0.05); border: 1px solid rgba(139,92,246,0.2); padding: 0.85rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.72rem; color: var(--accent-purple); font-weight: 700;">RAG SIMILARITY</div>
            <div style="font-size: 1rem; font-weight: 800; color: var(--text-main);">${(proposal.matchScore * 100).toFixed(0)}% Match</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${proposal.ragSource.clientIndustry}</div>
          </div>

          <div style="background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.2); padding: 0.85rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.72rem; color: var(--accent-amber); font-weight: 700;">AGENT 4 AUDIT</div>
            <div style="font-size: 1rem; font-weight: 800; color: var(--accent-emerald);">${audit.complianceScore}% Passed</div>
            <div style="font-size: 0.75rem; color: var(--accent-emerald);">${audit.riskLevel}</div>
          </div>
        </div>
      </div>
    `;
  }

  renderScraperMatrix() {
    const tbody = document.querySelector('#matrix-table tbody');
    tbody.innerHTML = Object.keys(CLOUD_PROVIDERS).map(key => {
      const p = CLOUD_PROVIDERS[key];
      const computeSample = Object.values(p.compute)[0];
      const dbSample = Object.values(p.database)[0];

      return `
        <tr>
          <td><strong style="color: ${p.badgeColor};">${p.name}</strong></td>
          <td>${computeSample ? `${computeSample.name} ($${computeSample.hourlyRate}/hr)` : 'N/A'}</td>
          <td>${dbSample ? `${dbSample.name} ($${dbSample.hourlyRate}/hr)` : 'N/A'}</td>
          <td>$${p.storageGB}/GB</td>
          <td>${p.egressGB === 0 ? '<strong style="color: var(--accent-emerald);">FREE (0.00)</strong>' : `$${p.egressGB}/GB`}</td>
          <td>${p.apiRateLimit}</td>
          <td><span class="tag-badge" style="background: rgba(16,185,129,0.1); color: var(--accent-emerald);">${p.slaUptime}</span></td>
          <td>${(p.reservedDiscountYear1 * 100)}% Off</td>
        </tr>
      `;
    }).join('');
  }

  renderPillar2ImpactTable() {
    const tbody = document.getElementById('pillar2-impact-table');
    if (!tbody) return;

    const data = this.impactEngine.getImpactMetrics();

    tbody.innerHTML = data.historicalVerificationTelemetry.map(t => `
      <tr>
        <td><strong>${t.clientName}</strong></td>
        <td>${t.migrationDate}</td>
        <td>$${t.predictedAnnualSavings.toLocaleString()}/yr</td>
        <td>$${t.actual30DaySavings.toLocaleString()}</td>
        <td>$${t.actual60DaySavings.toLocaleString()}</td>
        <td>$${t.actual90DaySavings.toLocaleString()}</td>
        <td><strong style="color: var(--accent-emerald);">$${t.projectedActualAnnualSavings.toLocaleString()}/yr</strong></td>
        <td><span class="tag-badge" style="background: rgba(16,185,129,0.15); color: var(--accent-emerald);">${t.verificationStatus} (${t.accuracyScore})</span></td>
      </tr>
    `).join('');
  }

  appendTerminalLogs(logArray, agentType = 'system') {
    const output = document.getElementById('terminal-log-output');
    logArray.forEach(log => {
      const div = document.createElement('div');
      div.className = `log-entry ${agentType}`;
      div.innerText = log;
      output.appendChild(div);
    });
    output.scrollTop = output.scrollHeight;
  }

  openModal() {
    if (!this.latestProposal) return;
    const modal = document.getElementById('proposal-modal');
    const content = document.getElementById('modal-content');

    const prop = this.latestProposal;

    content.innerHTML = `
      <div class="proposal-section">
        <h3>EXECUTIVE SUMMARY & PROPOSAL OVERVIEW</h3>
        <p>${prop.executiveSummary}</p>
        <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">
          Prepared for: <strong>${prop.clientName}</strong> | Proposal ID: <strong>${prop.proposalId}</strong> | Date: <strong>${prop.generatedAt}</strong>
        </p>
      </div>

      <div class="proposal-section">
        <h3>CONCEPT 1 SYNERGY: DYNAMIC CLOUD COST & ARCHITECTURE BLUEPRINT</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          Agent 2 (The Simulator) calculated the exact multi-cloud infrastructure fees for your workload specs:
        </p>

        <table class="proposal-table">
          <thead>
            <tr>
              <th>Cloud Provider</th>
              <th>Monthly Compute</th>
              <th>Monthly DB</th>
              <th>Monthly Egress</th>
              <th>Total Reserved OpEx / Month</th>
              <th>SLA Guarantee</th>
            </tr>
          </thead>
          <tbody>
            ${Object.values(prop.multiCloudComparison).map(c => `
              <tr style="${c.providerName === prop.recommendedCloudArchitecture.primaryProvider ? 'background: rgba(16,185,129,0.15); font-weight: bold;' : ''}">
                <td>${c.providerName}</td>
                <td>$${c.breakdown.compute}</td>
                <td>$${c.breakdown.database}</td>
                <td>$${c.breakdown.egress}</td>
                <td>$${c.monthlyReserved.toLocaleString()}</td>
                <td>${c.slaUptime}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="proposal-section">
        <h3>IMPLEMENTATION ROADMAP & MILESTONES</h3>
        <table class="proposal-table">
          <thead>
            <tr>
              <th>Phase & Scope</th>
              <th>Timeline</th>
              <th>Implementation Fee</th>
              <th>Deliverables</th>
            </tr>
          </thead>
          <tbody>
            ${prop.implementationMilestones.map(m => `
              <tr>
                <td><strong>${m.phase}</strong></td>
                <td>${m.duration}</td>
                <td>${m.cost}</td>
                <td>${m.details}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="proposal-section">
        <h3>COMMERCIAL ESTIMATE & FINANCIAL SUMMARY</h3>
        <div style="background: rgba(0,0,0,0.4); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span>Total Professional Services Implementation Fee:</span>
            <strong>${prop.totalProposedImplementationFee}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span>Recommended Year 1 Cloud Infrastructure OpEx (${prop.recommendedCloudArchitecture.primaryProvider}):</span>
            <strong>$${prop.recommendedCloudArchitecture.annualOpEx.toLocaleString()} USD</strong>
          </div>
          <div style="display: flex; justify-content: space-between; color: var(--accent-emerald); font-weight: 700; font-size: 1.05rem; padding-top: 0.5rem; border-top: 1px solid var(--border-glass);">
            <span>Projected 1-Year Cost Savings vs Unoptimized AWS On-Demand:</span>
            <span>${prop.projectedFirstYearOpExSavings}</span>
          </div>
        </div>
      </div>

      <div class="proposal-section">
        <h3>SECTION 5: DATA PROTECTION, PRIVACY & AI GENERATIVE CLAUSES</h3>
        
        <div class="disclaimer-banner">
          <span style="font-size: 1.1rem;">⚠️</span>
          <div>
            <strong>Human-in-the-Loop Review Mandatory:</strong> ${prop.aiDisclaimer}
          </div>
        </div>

        <div class="legal-clause-box">
          <div class="legal-clause-item">
            <div class="legal-clause-title">🔒 1. Data Privacy & Zero-Retention Policy</div>
            <div class="legal-clause-text">${prop.dataProtectionClauses.privacyPolicy}</div>
          </div>

          <div class="legal-clause-item">
            <div class="legal-clause-title">🛡️ 2. Regulatory Compliance & Governance Standards</div>
            <div class="legal-clause-text">${prop.dataProtectionClauses.complianceStandard}</div>
          </div>

          <div class="legal-clause-item">
            <div class="legal-clause-title">⚖️ 3. Cloud Provider Rate & SLA Liability Limitation</div>
            <div class="legal-clause-text">${prop.dataProtectionClauses.pricingLiability}</div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  closeModal() {
    document.getElementById('proposal-modal').classList.remove('active');
  }

  exportProposalHTML() {
    window.print();
  }

  switchToOptimizerPreset(presetId) {
    document.querySelectorAll('.nav-tab')[1].click();
    this.selectLogPreset(presetId);
  }

  switchToRfpPreset(rfpId) {
    document.querySelectorAll('.nav-tab')[2].click();
    this.selectRfp(rfpId);
  }
}

// Instantiate App Controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new AppController();
});
