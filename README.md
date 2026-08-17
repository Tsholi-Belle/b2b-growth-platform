# Amblysomus Solutions — Enterprise Cloud Advisory & Autonomous Proposal Engine

> **"Optimize infrastructure with empirical precision. Win high-value enterprise contracts."**  
> Amblysomus Solutions is an autonomous, multi-agent AI platform engineered in South Africa for global enterprise growth. It unifies **Multi-Cloud Financial Optimization** with **Autonomous RFP Proposal Generation** powered by closed-loop AI auditing and strict POPIA compliance.

---

## 📑 Table of Contents
1. [Architecture & Multi-Agent Pipeline](#-architecture--multi-agent-pipeline)
2. [Local Development Guide](#-local-development-guide)
3. [How to Get Your API Keys (Gemini, Supabase, Stripe, PayFast)](#-how-to-get-your-api-keys)
4. [How to Store API Keys Securely (Prevent Leaks)](#-how-to-store-api-keys-securely)
5. [South African Payments & Data Sovereignty](#-south-african-payments--data-sovereignty)
6. [Legal Policies & Compliance Suite](#-legal-policies--compliance-suite)
7. [Running Tests & Evaluation Suite](#-running-tests--evaluation-suite)
8. [License & Support](#-license--support)

---

## 🏛 Architecture & Multi-Agent Pipeline

Amblysomus operates a 5-agent pipeline with a closed-loop audit engine:

```
[ INCOMING TELEMETRY LOGS / RFP BID DOCUMENTS ]
                         │
                         ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  AGENT 1: Multi-Cloud Telemetry & SLA Benchmark Scraper     │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  AGENT 2: Micro-Economic Impact & Stochastic Modeler        │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  AGENT 3: Autonomous RFP Proposal Synthesizer (Gemini)      │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  AGENT 4: Closed-Loop Auditor & Win Probability Engine      │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  AGENT 5: Subcontractor Procurement & Margin Optimizer      │
  └─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Local Development Guide

### Prerequisites
* **Node.js**: v18.x or v20+ LTS ([Download](https://nodejs.org/))
* **npm**: v9+ (bundled with Node.js)
* **Git**: Installed and configured
* **Python**: 3.9+ *(optional, for Python lead outreach script)*

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Tsholi-Belle/b2b-growth-platform.git
cd b2b-growth-platform
```

---

### Step 2: Backend Setup & Local API Server

1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create your local environment file:
   ```bash
   cp .env.example .env
   ```

3. Start the backend in development mode:
   ```bash
   npm start
   # Server running at http://localhost:3001
   ```

---

### Step 3: Running the Frontend

You can run the frontend in two ways:

#### Option A: Direct Single-Container / Full-Stack Mode (Recommended)
The Node.js backend serves the frontend automatically at `http://localhost:3001`:
```bash
cd backend
npm start
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser.

#### Option B: Standalone Frontend Dev Server (with hot reload / static server)
```bash
# In the project root directory
npx serve . -p 8888
# OR using Python:
python3 -m http.server 8888
```
Open **[http://localhost:8888](http://localhost:8888)**. Click **"Try Demo (no signup)"** to test all features in interactive client simulation mode.

---

## 🔑 How to Get Your API Keys

### 1. Google Gemini & Vertex AI API Key
1. **Google AI Studio (Fastest for testing):**
   * Visit [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
   * Sign in with your Google account.
   * Click **"Create API Key"** and select or create a Google Cloud project.
   * Copy the key and set in `.env`: `GEMINI_API_KEY=AIzaSy...`
2. **Google Cloud Vertex AI (Production in South Africa / africa-south1):**
   * Go to [Google Cloud Console](https://console.cloud.google.com/).
   * Enable the **Vertex AI API**.
   * Create a Service Account with the `Vertex AI User` role.
   * Generate a JSON key or use Application Default Credentials (`gcloud auth application-default login`).

### 2. Supabase API Keys (Database & Auth)
1. Go to [https://supabase.com/](https://supabase.com/) and create a free project.
2. Under **Project Settings > API**, find:
   * **Project URL**: `https://xyzcompany.supabase.co`
   * **Anon / Public Key**: `anon_key_string...` (safe for browser)
   * **service_role Key**: `service_role_string...` (**SECRET** — backend only)
3. Under **SQL Editor**, run the database migration schema from [`backend/db/schema.sql`](backend/db/schema.sql).
4. Set in `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_ANON_KEY=your_anon_key
   ```

### 3. Stripe API Keys (International Billing)
1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. Toggle on **Test Mode** in the top-right corner.
3. Go to **Developers > API Keys**:
   * **Publishable key**: `pk_test_...`
   * **Secret key**: `sk_test_...`
4. For webhooks, go to **Developers > Webhooks > Add destination** (`http://your-domain/api/billing/webhook`) and copy the **Signing secret** (`whsec_...`).
5. Set in `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 4. PayFast API Keys (South African Rand & Instant EFT Payments)
1. Register a free Sandbox or Live merchant account at [https://www.payfast.co.za/](https://www.payfast.co.za/).
2. Go to **Settings > Integration**:
   * **Merchant ID**: e.g. `10000100` (Sandbox default)
   * **Merchant Key**: e.g. `46f0cd694581a` (Sandbox default)
   * **Passphrase**: Set a secure secret passphrase under security settings.
3. Set in `.env`:
   ```env
   PAYFAST_MERCHANT_ID=10000100
   PAYFAST_MERCHANT_KEY=46f0cd694581a
   PAYFAST_PASSPHRASE=your_passphrase
   PAYFAST_LIVE=false
   ```

---

## 🛡️ How to Store API Keys Securely

To prevent API keys from leaking publicly (which can lead to unauthorized billing and security breaches), follow these core security practices:

### 1. Never Commit `.env` or Credentials to Git
* The `.gitignore` file is configured to exclude all `.env`, `service-account*.json`, and credential files:
  ```gitignore
  .env
  .env.*
  *.pem
  *.key
  service-account*.json
  ```
* Before every git commit, check `git status` to verify no secret files are staged.

### 2. Differentiate Client Keys vs. Server Secret Keys
* **Public / Client-Safe Keys**: Stripe Publishable Key (`pk_...`), Supabase Anon Key. These only have restricted read/write permissions governed by Row-Level Security (RLS).
* **Private / Server-Only Secrets**: Stripe Secret Key (`sk_...`), Supabase Service Role Key, Gemini API Key, PayFast Passphrase. **These must NEVER be bundled in client JavaScript, HTML, or mobile apps.**

### 3. Use Cloud Secret Managers in Production
* On Google Cloud Platform (GCE / Cloud Run):
  * Store keys in **Google Secret Manager** (`gcloud secrets create gemini-key --data-file=...`).
  * Grant the VM service account the `Secret Manager Secret Accessor` role.
  * Access secrets at runtime without writing plaintext keys to disks.
* On GitHub Actions CI/CD:
  * Store credentials under **Repository Settings > Secrets and variables > Actions**.

### 4. Apply API Key Restrictions & Quotas
* In Google Cloud Console, restrict your Gemini API key to specific HTTP referrers, IP addresses, and enabled APIs (`Generative Language API` only).
* Set spending limits / quota caps in Stripe, Google Cloud, and OpenAI/Gemini dashboards.

### 5. Emergency Incident Response: If a Key is Leaked
1. **Revoke immediately:** Go to the provider's dashboard (Google AI Studio, Stripe, Supabase) and click **"Revoke / Delete Key"**.
2. **Generate replacement:** Create a new key and update your production environment.
3. **Audit access logs:** Review API usage logs for anomalous requests or unexpected billing.

---

## 🇿🇦 South African Payments & Data Sovereignty

* **In-Country Data Residency**: Production deployments are anchored in **`africa-south1` (Johannesburg, South Africa)** to comply with **POPIA Section 72** (Transborder Personal Data Flow Regulations).
* **South African Payment Rails**: Natively integrated with **PayFast South Africa**, supporting:
  * **Instant EFT**: Capitec Pay, Nedbank, Standard Bank, FNB, Absa, Investec.
  * **Cards & Digital Wallets**: Visa, Mastercard (ZAR `R`), Masterpass, SnapScan, Zapper.

---

## 📜 Legal Policies & Compliance Suite

Amblysomus includes full standalone legal disclosures accessible in the app footer and settings:
* 📄 **Terms of Service**: [`frontend/pages/terms.html`](frontend/pages/terms.html)
* 🔒 **Privacy Policy (POPIA & GDPR)**: [`frontend/pages/privacy.html`](frontend/pages/privacy.html)
* 🍪 **Cookie Policy**: [`frontend/pages/cookies.html`](frontend/pages/cookies.html)
* 🏷️ **Pricing & Payments (ZAR & USD)**: [`frontend/pages/pricing.html`](frontend/pages/pricing.html)

---

## 🧪 Running Tests & Evaluation Suite

Amblysomus features a comprehensive unit testing suite:

```bash
cd backend

# Run all unit tests (Auth, MFA, Guardrails, POPIA, Payments, Proposal Engine)
npm test

# Run AI diagnostic evaluation benchmarks
npm run eval
```

---

## 📄 License & Support

Distributed under the **MIT License**.

* 📧 **Advisory & Support Contact:** `hello@kalixara.com`
* 📍 **Data Protection & Legal Officer:** Johannesburg, South Africa
* 🌐 **Live Website:** [https://tsholi-belle.github.io/b2b-growth-platform/](https://tsholi-belle.github.io/b2b-growth-platform/)
