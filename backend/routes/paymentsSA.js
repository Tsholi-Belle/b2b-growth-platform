const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// PayFast configuration (Sandbox / Production)
const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '10000100'; // Default Sandbox ID
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a'; // Default Sandbox Key
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || 'jt7NOE43FZPn';
const PAYFAST_HOST = process.env.NODE_ENV === 'production' && process.env.PAYFAST_LIVE === 'true'
  ? 'https://www.payfast.co.za'
  : 'https://sandbox.payfast.co.za';

/**
 * Generate MD5 signature for PayFast integration
 */
function generatePayFastSignature(data, passphrase = null) {
  let pfOutput = '';
  // PayFast signature requires fields in specific order, excluding empty strings
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      if (data[key] !== '' && key !== 'signature') {
        pfOutput += `${key}=${encodeURIComponent(data[key].toString().trim()).replace(/%20/g, '+')}&`;
      }
    }
  }

  let getString = pfOutput.slice(0, -1);
  if (passphrase) {
    getString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
  }

  return crypto.createHash('md5').update(getString).digest('hex');
}

/**
 * GET /api/payments/methods
 * Returns supported payment methods in South Africa and globally
 */
router.get('/methods', (req, res) => {
  res.status(200).json({
    currency: 'ZAR',
    country: 'South Africa (ZA)',
    supported_gateways: [
      {
        id: 'payfast',
        name: 'PayFast South Africa',
        channels: ['Instant EFT (Capitec Pay, FNB, Nedbank, Standard Bank, Absa, Investec)', 'Debit / Credit Cards (Visa, Mastercard)', 'Masterpass', 'Zapper', 'SnapScan', 'RCS Store Cards'],
        settlementCurrency: 'ZAR (R)',
        instantEFT: true
      },
      {
        id: 'stripe_zar',
        name: 'Stripe International & ZAR',
        channels: ['Visa', 'Mastercard', 'American Express', 'Apple Pay', 'Google Pay'],
        settlementCurrency: 'USD / ZAR',
        instantEFT: false
      }
    ]
  });
});

/**
 * POST /api/payments/payfast/checkout
 * Generates signed PayFast payment payload for ZAR subscription checkout
 */
router.post('/payfast/checkout', (req, res) => {
  try {
    const { plan, email, fullName, returnUrl, cancelUrl } = req.body || {};

    const planPricesZAR = {
      starter: 890.00,       // R890 / month
      professional: 2690.00, // R2,690 / month
      enterprise: 8990.00    // R8,990 / month
    };

    const selectedPlan = (plan || 'starter').toLowerCase();
    const amount = planPricesZAR[selectedPlan] || planPricesZAR.starter;
    const itemName = `Amblysomus Solutions — ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan (Monthly)`;

    const paymentData = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: returnUrl || 'https://tsholi-belle.github.io/b2b-growth-platform/?payment=success',
      cancel_url: cancelUrl || 'https://tsholi-belle.github.io/b2b-growth-platform/?payment=cancelled',
      notify_url: 'https://archengine.kalixara.com/api/payments/payfast/notify',
      name_first: fullName ? fullName.split(' ')[0] : 'Enterprise',
      name_last: fullName && fullName.split(' ').length > 1 ? fullName.split(' ').slice(1).join(' ') : 'Subscriber',
      email_address: email || 'billing@kalixara.com',
      m_payment_id: `INV-${Date.now().toString(36).toUpperCase()}`,
      amount: amount.toFixed(2),
      item_name: itemName,
      item_description: 'AI Cloud Optimization & Autonomous RFP Proposal Platform',
      currency: 'ZAR'
    };

    const signature = generatePayFastSignature(paymentData, PAYFAST_PASSPHRASE);
    paymentData.signature = signature;

    res.status(200).json({
      status: 'success',
      gateway: 'PayFast South Africa',
      actionUrl: `${PAYFAST_HOST}/eng/process`,
      paymentData,
      formattedAmount: `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} ZAR`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate PayFast checkout: ' + err.message });
  }
});

/**
 * POST /api/payments/payfast/notify
 * Webhook listener for Instant Payment Notifications (ITN)
 */
router.post('/payfast/notify', (req, res) => {
  const pfData = req.body;
  console.log('[PayFast ITN] Payment notification received:', pfData.m_payment_id, pfData.payment_status);

  // In production, verify signature and IP from PayFast hosts
  res.status(200).send('OK');
});

module.exports = router;
