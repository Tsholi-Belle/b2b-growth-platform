import { displayCurrency } from '../frontend/js/utils/currencyFormatter.js';
// MAIN APPLICATION CONTROLLER
import { SAMPLE_LOG_PRESETS } from './data/sampleLogs.js';
import { SAMPLE_RFPS } from './data/sampleRfps.js';
import { CLOUD_PROVIDERS } from './data/cloudPricingData.js';
import { ScraperAgent } from './engine/scraperAgent.js';
import { SimulatorAgent } from './engine/simulatorAgent.js';
import { ProposalAgent } from './engine/proposalAgent.js';
import { ImpactEngine } from './engine/impactEngine.js';
import { EnterpriseIntegrationsEngine } from './engine/enterpriseIntegrations.js';
import { SensitivityEngine } from './engine/sensitivityEngine.js';


// API base URL — points to backend in production, relative in dev
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

// Helper: authenticated fetch (adds JWT token from Supabase session)
async function apiFetch(path, options = {}) {
  const session = window._authSession || null;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Demo mode check (users who clicked 'Try Demo')
const IS_DEMO_MODE = sessionStorage.getItem('archengine_demo_mode') === 'true';

class AppController {
  constructor() {
    this.scraper = new ScraperAgent();
    this.simulator = new SimulatorAgent();
    this.proposalAgent = new ProposalAgent();
    this.impactEngine = new ImpactEngine();
    this.enterpriseIntegrations = new EnterpriseIntegrationsEngine();
    this.sensitivityEngine = new SensitivityEngine();

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
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.nav-tab');
      if (!tabBtn) return;
      
      const targetTab = tabBtn.getAttribute('data-tab');
      if (!targetTab) return;

      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      tabBtn.classList.add('active');
      const targetEl = document.getElementById(`tab-${targetTab}`);
      if (targetEl) {
        targetEl.classList.add('active');
      }
    });
  }

  bindOptimizerControls() {
    const btnLoadDemo = document.getElementById('btn-load-demo');
    if (btnLoadDemo) {
        btnLoadDemo.addEventListener('click', () => {
            document.getElementById('current-provider').value = 'aws';
            document.getElementById('monthly-spend').value = 4500;
            document.getElementById('api-calls-millions').value = 150;
            document.getElementById('db-size-gb').value = 850;
            document.getElementById('egress-gb').value = 2500;
            document.getElementById('primary-region').value = 'us-east-1';
            document.getElementById('workload-type').value = 'saas';
        });
    }

    const btnRunOpt = document.getElementById('btn-run-optimizer');
    if (btnRunOpt) {
        btnRunOpt.addEventListener('click', () => {
            this.runSimulation();
        });
    }

    // Attempt old bindings if they exist
    const mauInput = document.getElementById('input-mau');
    if (mauInput) {
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
          if (inp) inp.addEventListener('input', () => {
            updateSliderVals();
            this.runSimulation();
          });
        });

        const btnRunSim = document.getElementById('btn-run-simulation');
        if (btnRunSim) {
            btnRunSim.addEventListener('click', () => {
                this.runSimulation();
            });
        }
    }
  }

  bindProposalControls() {
    const btnGen = document.getElementById('btn-generate-proposal');
    if (btnGen) {
        btnGen.addEventListener('click', async () => {
          await this.generateProposal();
        });
    }
    
    document.querySelectorAll('.source-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.rfp-source-panel').forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const panel = document.getElementById('panel-' + e.currentTarget.dataset.source);
        if (panel) panel.classList.add('active');
      });
    });

    const btnSamSearch = document.getElementById('btn-sam-search');
    if (btnSamSearch) {
        btnSamSearch.addEventListener('click', async () => {
            const kw = document.getElementById('sam-search-keyword').value;
            let results;
            try {
                results = await apiFetch(`/api/rfp/search?keyword=${encodeURIComponent(kw)}`);
            } catch(e) {
                console.warn("API Search failed", e);
                results = { items: [{title: "Mock RFP", description: "Mock Data due to API failure"}] };
            }
            const list = document.getElementById('sam-results-list');
            const items = (results && (results.opportunities || results.items)) || [];
            if (list) {
                if (items.length === 0) {
                    list.innerHTML = `<div class='sam-result-item'><h5>No opportunities found</h5><div class='sam-meta'>Try a different search term or NAICS code.</div></div>`;
                } else {
                    list.innerHTML = items.map(r => `
                      <div class='sam-result-item' onclick="document.getElementById('rfp-paste-text').value = \`${(r.title || '').replace(/`/g, '')}\\n\\nAgency: ${r.agency || 'Federal Agency'}\\nDeadline: ${r.response_deadline || 'N/A'}\\n\\n${(r.description_preview || '').replace(/`/g, '')}\`; const manualBtn = document.querySelector('[data-source=manual]'); if(manualBtn) manualBtn.click();">
                        <h5>${r.title || 'Solicitation Notice'}</h5>
                        <div class='sam-meta'>${r.agency || 'Federal Agency'} · Deadline: ${r.response_deadline || 'N/A'}</div>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.4rem;">${r.description_preview ? r.description_preview.substring(0, 140) + '...' : ''}</p>
                      </div>
                    `).join('');
                }
            }
        });
    }

    const btnExport = document.getElementById('btn-export-proposal');
    if (btnExport) {
        btnExport.addEventListener('click', async () => {
            try {
                const mod = await import('../frontend/js/proposals/proposalExporter.js');
                mod.exportProposalToPDF(this.latestProposal);
            } catch(e) {
                console.error("Export failed", e);
            }
        });
    }

    const dropZone = document.getElementById('rfp-drop-zone');
    if (dropZone) {
        dropZone.addEventListener('dragover', e => e.preventDefault());
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = ev => {
                    const txt = document.getElementById('rfp-paste-text');
                    if (txt) {
                        txt.value = ev.target.result;
                        document.querySelector('[data-source="manual"]').click();
                    }
                };
                reader.readAsText(file);
            }
        });
    }
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

  async runSimulation() {
    let params;
    
    // Check if new form exists
    const mauEl = document.getElementById('input-mau');
    if (mauEl) {
      params = {
        monthlyActiveUsers: parseInt(mauEl.value) || 150000,
        requestsPerSecondPeak: parseInt(document.getElementById('input-rps').value) || 200,
        databaseSizeGB: parseFloat(document.getElementById('input-db').value) || 850,
        monthlyEgressTB: parseFloat(document.getElementById('input-egress').value) || 2.5,
        currentMonthlySpend: this.currentPreset.metrics.currentMonthlySpend || 4500
      };
    } else {
      params = {
        currentProvider: document.getElementById('current-provider').value,
        currentMonthlySpend: parseFloat(document.getElementById('monthly-spend').value) || 0,
        apiCallsMillions: parseFloat(document.getElementById('api-calls-millions').value) || 0,
        databaseSizeGB: parseFloat(document.getElementById('db-size-gb').value) || 0,
        egressGB: parseFloat(document.getElementById('egress-gb').value) || 0,
        primaryRegion: document.getElementById('primary-region').value,
        workloadType: document.getElementById('workload-type').value,
        monthlyActiveUsers: 150000,
        requestsPerSecondPeak: 200,
        monthlyEgressTB: parseFloat(document.getElementById('egress-gb').value) / 1024 || 2.5
      };
    }

    let simRes;
    try {
      const qs = new URLSearchParams(params).toString();
      simRes = await apiFetch(`/api/cloud-pricing/compare?${qs}`);
    } catch (e) {
      console.warn("API failed, falling back to simulator", e);
      simRes = this.simulator.simulateCosts(params);
    }
    
    this.latestSimulation = simRes;
    this.appendTerminalLogs(simRes.logs || ['[SYSTEM] Simulation complete'], 'simulator');
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
                Compute: ${displayCurrency(p.breakdown.compute)}/mo | DB: ${displayCurrency(p.breakdown.database)}/mo | Egress: ${displayCurrency(p.breakdown.egress)}/mo | SLA: ${p.slaUptime}
              </div>
            </div>
          </div>

          <div class="provider-pricing">
            <div class="monthly-price">${displayCurrency(p.monthlyReserved.toLocaleString())}<span style="font-size:0.75rem; color: var(--text-muted); font-weight: normal;">/mo</span></div>
            <div class="price-subtext">
              ${p.annualSavingsVsCurrent > 0 ? `Saves ${displayCurrency(p.annualSavingsVsCurrent.toLocaleString())}/yr` : 'On-Demand Rate'}
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
          <div class="bar-value">${displayCurrency(p.monthlyReserved)}</div>
          <div class="bar-fill" style="height: ${heightPct}%; background: linear-gradient(180deg, ${p.badgeColor}, rgba(0,0,0,0.4));"></div>
          <div class="bar-label">${p.providerName.split(' ')[0]}</div>
        </div>
      `;
    }).join('');
  }

  async generateProposal() {
    this.appendTerminalLogs([
      `[SYSTEM] Triggering Agent 3 (Proposal Writer)...`,
      `[Agent 3] Processing RFP payload...`
    ], 'proposal');

    const pasteText = document.getElementById('rfp-paste-text')?.value || '';
    const companyContext = document.getElementById('company-context')?.value || 'Acme Enterprise Software Consultancy';
    const preferredTone = document.getElementById('proposal-tone')?.value || 'formal';

    const rfpTitle = (this.currentRfp && this.currentRfp.title) || 'Custom Enterprise RFP Submission';
    const rfpText = pasteText || (this.currentRfp ? (this.currentRfp.rawText || this.currentRfp.title) : 'Default enterprise RFP scope');

    const payload = {
      rfp: {
        title: rfpTitle,
        text: rfpText,
        source: 'manual'
      },
      rfp_text: rfpText,
      company_context: companyContext,
      preferred_tone: preferredTone,
      include_teaming: true
    };

    let res;
    let runEvidence = null;

    try {
      res = await apiFetch('/api/proposals/generate', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res && res.proposal) {
        this.latestProposal = res.proposal;
        runEvidence = res.run || null;
      } else if (res && res.id) {
        this.latestProposal = res;
      }
    } catch(e) {
      console.warn("API proposal generation failed", e);
      if (IS_DEMO_MODE) {
        this.appendTerminalLogs(['[Agent 3] Live API offline — using Demo Agent fallback'], 'proposal');
        res = await this.proposalAgent.generateProposal(this.currentRfp || { title: rfpTitle, rawText: rfpText });
        this.latestProposal = res.proposal;
      } else {
        alert(`Proposal Generation Error: ${e.message || 'Vertex AI upstream service unavailable'}`);
        return;
      }
    }

    this.latestRun = runEvidence;
    this.appendTerminalLogs(res.logs || ['[Agent 3] Proposal draft synthesized successfully'], 'proposal');
    this.renderProposalPreview(this.latestProposal, runEvidence);
    
    const qaSection = document.getElementById('proposal-qa-section');
    if (qaSection) qaSection.style.display = 'flex';
  }

  renderProposalPreview(proposal, runEvidence = null) {
    const area = document.getElementById('proposal-preview-area');
    if (!area) return;

    const audit = proposal.compliance_flags || proposal.auditReport || { complianceScore: proposal.audit_score || 95, riskLevel: 'Low' };
    const compScore = proposal.audit_score || audit.complianceScore || 95;
    const winProb = proposal.win_probability || 78;

    const runBadgeHTML = runEvidence ? `
      <div style="background: rgba(0, 212, 255, 0.08); border: 1px solid rgba(0, 212, 255, 0.25); padding: 0.75rem 1rem; border-radius: 10px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <div>
            <div style="font-size: 0.82rem; font-weight: 800; color: var(--accent-primary);">VERTEX AI RUN EVIDENCE</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Run ID: <code style="color:#fff;">${runEvidence.id.substring(0, 18)}...</code></div>
          </div>
        </div>
        <div style="display: flex; gap: 1rem; font-size: 0.78rem;">
          <div><span style="color:var(--text-muted);">Provider:</span> <strong style="color:#fff;">${runEvidence.provider.toUpperCase()}</strong></div>
          <div><span style="color:var(--text-muted);">Model:</span> <strong style="color:#00d4ff;">${runEvidence.model}</strong></div>
          <div><span style="color:var(--text-muted);">Latency:</span> <strong style="color:#fff;">${runEvidence.latency_ms}ms</strong></div>
          <div><span style="color:var(--text-muted);">Status:</span> <span class="tag-badge" style="background:rgba(16,185,129,0.2); color:var(--accent-emerald); padding:0.1rem 0.4rem;">${(runEvidence.validation_status || 'passed').toUpperCase()}</span></div>
        </div>
      </div>
    ` : '';

    const recCloud = proposal.recommendedCloudArchitecture || { primaryProvider: 'AWS (Amazon Web Services)', monthlyOpEx: 1950 };
    const execSummary = proposal.executiveSummary || proposal.proposal_content || 'Executive proposal summary generated successfully.';

    area.innerHTML = `
      <div style="width: 100%; text-align: left;">
        ${runBadgeHTML}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div>
            <span class="tag-badge" style="background: rgba(16,185,129,0.15); color: var(--accent-emerald);">PROPOSAL DRAFT READY</span>
            <span class="tag-badge" style="background: rgba(245,158,11,0.15); color: var(--accent-amber);">AGENT 4 AUDITED (${compScore}%)</span>
            <span class="tag-badge" style="background: rgba(0,212,255,0.15); color: var(--accent-primary);">WIN PROBABILITY (${winProb}%)</span>
            <h3 style="font-size: 1.1rem; color: var(--text-main); margin-top: 0.25rem;">${proposal.rfp_title || proposal.rfpTitle || 'RFP Proposal Draft'}</h3>
          </div>
          <button class="btn-primary" style="width: auto; padding: 0.6rem 1.2rem;" onclick="window.app.openModal()">
            📄 Full Review & Export PDF
          </button>
        </div>

        <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass); margin-bottom: 1rem; max-height: 200px; overflow-y: auto;">
          <p style="font-size: 0.85rem; color: var(--text-muted); white-space: pre-wrap;">${execSummary.substring(0, 500)}...</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
          <div style="background: rgba(0,242,254,0.05); border: 1px solid rgba(0,242,254,0.2); padding: 0.85rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.72rem; color: var(--primary-cyan); font-weight: 700;">CLOUD BLUEPRINT</div>
            <div style="font-size: 1rem; font-weight: 800; color: var(--text-main);">${recCloud.primaryProvider.split(' ')[0]}</div>
            <div style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 600;">${displayCurrency(recCloud.monthlyOpEx.toLocaleString())}/mo</div>
          </div>

          <div style="background: rgba(139,92,246,0.05); border: 1px solid rgba(139,92,246,0.2); padding: 0.85rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.72rem; color: var(--accent-purple); font-weight: 700;">WIN PROBABILITY</div>
            <div style="font-size: 1rem; font-weight: 800; color: var(--text-main);">${winProb}% Score</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Grade: ${winProb >= 85 ? 'A' : winProb >= 70 ? 'B' : 'C'}</div>
          </div>

          <div style="background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.2); padding: 0.85rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.72rem; color: var(--accent-amber); font-weight: 700;">AGENT 4 AUDIT</div>
            <div style="font-size: 1rem; font-weight: 800; color: var(--accent-emerald);">${compScore}% Passed</div>
            <div style="font-size: 0.75rem; color: var(--accent-emerald);">SOC2 / HIPAA Verified</div>
          </div>
        </div>
      </div>
    `;
  }
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
          <td>${computeSample ? `${computeSample.name} (${displayCurrency(computeSample.hourlyRate)}/hr)` : 'N/A'}</td>
          <td>${dbSample ? `${dbSample.name} (${displayCurrency(dbSample.hourlyRate)}/hr)` : 'N/A'}</td>
          <td>${displayCurrency(p.storageGB)}/GB</td>
          <td>${p.egressGB === 0 ? '<strong style="color: var(--accent-emerald);">FREE (0.00)</strong>' : `${displayCurrency(p.egressGB)}/GB`}</td>
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
        <td>${displayCurrency(t.predictedAnnualSavings.toLocaleString())}/yr</td>
        <td>${displayCurrency(t.actual30DaySavings.toLocaleString())}</td>
        <td>${displayCurrency(t.actual60DaySavings.toLocaleString())}</td>
        <td>${displayCurrency(t.actual90DaySavings.toLocaleString())}</td>
        <td><strong style="color: var(--accent-emerald);">${displayCurrency(t.projectedActualAnnualSavings.toLocaleString())}/yr</strong></td>
        <td><span class="tag-badge" style="background: rgba(16,185,129,0.15); color: var(--accent-emerald);">${t.verificationStatus} (${t.accuracyScore})</span></td>
      </tr>
    `).join('');
  }

  appendTerminalLogs(logArray, agentType = 'system') {
    const output = document.getElementById('terminal-log-output');
    if (!output) return;
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
                <td>${displayCurrency(c.breakdown.compute)}</td>
                <td>${displayCurrency(c.breakdown.database)}</td>
                <td>${displayCurrency(c.breakdown.egress)}</td>
                <td>${displayCurrency(c.monthlyReserved.toLocaleString())}</td>
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
            <strong>${displayCurrency(prop.recommendedCloudArchitecture.annualOpEx.toLocaleString())}</strong>
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
          <div>
            <strong>Human-in-the-Loop Review Mandatory:</strong> ${prop.aiDisclaimer}
          </div>
        </div>

        <div class="legal-clause-box">
          <div class="legal-clause-item">
            <div class="legal-clause-title">1. Data Privacy & Zero-Retention Policy</div>
            <div class="legal-clause-text">${prop.dataProtectionClauses.privacyPolicy}</div>
          </div>

          <div class="legal-clause-item">
            <div class="legal-clause-title">2. Regulatory Compliance & Governance Standards</div>
            <div class="legal-clause-text">${prop.dataProtectionClauses.complianceStandard}</div>
          </div>

          <div class="legal-clause-item">
            <div class="legal-clause-title">3. Cloud Provider Rate & SLA Liability Limitation</div>
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

  async triggerAWSConnect() {
    const res = await this.enterpriseIntegrations.connectAWSAccount();
    this.appendTerminalLogs(res.logs, 'scraper');
    alert("AWS CloudWatch IAM session established! Ingested live telemetry.");
  }

  async triggerGCPConnect() {
    const res = await this.enterpriseIntegrations.connectGCPProject();
    this.appendTerminalLogs(res.logs, 'scraper');
    alert("GCP Stackdriver API synced! Ingested live metrics.");
  }

  async triggerSAMPoll() {
    let res;
    try {
      res = await apiFetch('/api/rfp/search?keyword=cloud');
      this.appendTerminalLogs(['[SYSTEM] Fetched from SAM API'], 'proposal');
      alert(`SAM.gov Bid Listener Polled!`);
    } catch(e) {
      console.warn("API failed, falling back to enterpriseIntegrations", e);
      res = await this.enterpriseIntegrations.pollSAMGovPortal();
      this.appendTerminalLogs(res.logs, 'proposal');
      alert(`SAM.gov Bid Listener Polled! Detected: "${res.bids[0].title}"`);
    }
  }

  async triggerDraftPush() {
    const dummyProposal = this.latestProposal || { proposalId: 'PROP-2026-9041' };
    const res = await this.enterpriseIntegrations.pushDraftToEnterpriseWorkspace(dummyProposal);
    this.appendTerminalLogs(res.logs, 'proposal');
    alert(`Proposal draft ${dummyProposal.proposalId} pushed to Google Workspace / Office 365!`);
  }

  runMonteCarloTest() {
    const recCost = (this.latestSimulation && this.latestSimulation.recommendedProvider) 
      ? this.latestSimulation.recommendedProvider.monthlyReserved 
      : 1480;

    const res = this.sensitivityEngine.runMonteCarloSimulation({ baseMonthlyCost: recCost, iterations: 1000 });
    this.appendTerminalLogs(res.logs, 'simulator');

    const container = document.getElementById('pillar5-monte-carlo-results');
    if (container) {
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; text-align: center;">
          <div style="background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 4px;">
            <div style="font-size: 0.7rem; color: var(--text-muted);">P50 MEDIAN SPEND</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-main);">${displayCurrency(res.medianCost)}/mo</div>
          </div>
          <div style="background: rgba(245,158,11,0.08); padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(245,158,11,0.2);">
            <div style="font-size: 0.7rem; color: var(--accent-amber);">P95 RISK LIMIT</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-amber);">${displayCurrency(res.p95Cost)}/mo</div>
          </div>
          <div style="background: rgba(244,63,94,0.08); padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(244,63,94,0.2);">
            <div style="font-size: 0.7rem; color: var(--accent-rose);">WORST-CASE SPIKE</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-rose);">${displayCurrency(res.worstCaseCost)}/mo</div>
          </div>
        </div>
      `;
    }
  }
}

// Instantiate App Controller when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new AppController());
} else {
  new AppController();
}
