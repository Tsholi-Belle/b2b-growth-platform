# Google Cloud VM & South Africa POPIA Deployment Guide

This guide provides instructions to deploy **ArchEngine Solutions** to a **Google Compute Engine (GCE) VM instance** with:
1. **Free-Tier US Deployment** (`us-central1`, `us-east1`, or `us-west1` for $0/mo free tier).
2. **South Africa In-Country Data Residency Deployment** (`africa-south1` Johannesburg) for complete **POPIA compliance**.
3. **Open-Source Database Layer** (PostgreSQL 16 / Encrypted Local Storage with Zero-Retention AI governance).

---

## 1. Google Cloud Deployment Options

| Deployment Mode | Region | Cost Tier | Compliance & Best Use |
| :--- | :--- | :--- | :--- |
| **Option A: South Africa POPIA In-Country VM** *(Recommended for SA)* | `africa-south1-a` (Johannesburg) | Low Cost (~$4 - $7/mo) | **100% POPIA Section 72 In-Country Data Sovereignty**. Open-Source PostgreSQL. |
| **Option B: Google Cloud Free Tier VM** | `us-central1-a` (Iowa) | **$0.00 / month** (Permanently Free) | Free Tier eligible (`e2-micro`, 30 GB standard disk, 1 GB egress). |

---

## 2. 1-Command Deployment via `gcloud` CLI

### Deploying to South Africa (`africa-south1` Johannesburg - POPIA Compliant):
```bash
gcloud compute instances create archengine-sa-vm \
    --project="YOUR_GCP_PROJECT_ID" \
    --zone="africa-south1-a" \
    --machine-type="e2-micro" \
    --image-family="ubuntu-2204-lts" \
    --image-project="ubuntu-os-cloud" \
    --boot-disk-size="30GB" \
    --boot-disk-type="pd-standard" \
    --tags="http-server,https-server" \
    --scopes="cloud-platform" \
    --metadata-from-file=startup-script=scripts/gce_startup_script.sh
```

### Deploying to US Free Tier Region (`us-central1` Iowa - $0/mo):
```bash
gcloud compute instances create archengine-free-vm \
    --project="YOUR_GCP_PROJECT_ID" \
    --zone="us-central1-a" \
    --machine-type="e2-micro" \
    --image-family="ubuntu-2204-lts" \
    --image-project="ubuntu-os-cloud" \
    --boot-disk-size="30GB" \
    --boot-disk-type="pd-standard" \
    --tags="http-server,https-server" \
    --scopes="cloud-platform" \
    --metadata-from-file=startup-script=scripts/gce_startup_script.sh
```

---

## 3. Deployment via Google Cloud Console (UI)

If deploying through the **Google Cloud Web Console**:

1. Navigate to **Compute Engine > VM Instances > Create Instance**.
2. **Name:** `archengine-vm`.
3. **Region:** Select `us-central1` (Iowa), `us-east1`, or `us-west1`.
4. **Machine Configuration:**
   * Series: `E2`
   * Machine type: `e2-micro` (2 vCPU, 1 GB memory).
5. **Boot Disk:**
   * OS: `Ubuntu`
   * Version: `Ubuntu 22.04 LTS`
   * Boot disk type: `Standard persistent disk`
   * Size: `30 GB`.
6. **Identity and API access:**
   * Service Account: `Compute Engine default service account` (or custom service account with `roles/aiplatform.user` and `roles/datastore.user`).
   * Access scopes: `Allow full access to all Cloud APIs`.
7. **Firewall:**
   * Check ✅ **Allow HTTP traffic**
   * Check ✅ **Allow HTTPS traffic**
8. **Advanced options > Management > Automation (Startup script):**
   * Copy and paste the contents of [`scripts/gce_startup_script.sh`](file:///Users/kgomotsolekganyane/.gemini/antigravity/scratch/b2b-growth-platform/scripts/gce_startup_script.sh).
9. Click **Create**.

---

## 4. Verifying the Deployment

Once the VM instance boots (takes ~1 to 2 minutes):
1. Copy the **External IP** from the VM instance list (e.g. `http://34.123.45.67`).
2. Open `http://<YOUR_VM_EXTERNAL_IP>` in your browser.
3. You will see the full **ArchEngine Solutions** platform live, complete with:
   * Real-time Multi-Cloud Cost Optimizer
   * Autonomous RFP Proposal Generator & Compliance Auditor
   * Proactive Co-Creator (Clarifications, Belief Graph, Prompt Inspector)
   * Beta Tester Feedback Survey (persisting directly to Google Cloud Firestore)
   * Advisory Consultation Booking (routed to `hello@kalixara.com`)

---

## 5. Attaching a Custom Domain & Free SSL (Optional)

To secure the instance with HTTPS:
```bash
# SSH into the instance
gcloud compute ssh archengine-vm --zone="us-central1-a"

# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL Certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
