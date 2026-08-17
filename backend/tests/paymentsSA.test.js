const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const paymentsSARoutes = require('../routes/paymentsSA');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', paymentsSARoutes);
  return app;
}

test('GET /api/payments/methods returns South African payment options', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/payments/methods`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.currency, 'ZAR');
    assert.ok(data.supported_gateways.some(g => g.id === 'payfast'));
    assert.ok(data.supported_gateways.some(g => g.instantEFT === true));
  } finally {
    server.close();
  }
});

test('POST /api/payments/payfast/checkout generates valid signed PayFast payload', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/payments/payfast/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'professional',
        email: 'finance@kalixara.com',
        fullName: 'Kgomotso Lekganyane'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'success');
    assert.ok(data.paymentData);
    assert.strictEqual(data.paymentData.currency, 'ZAR');
    assert.strictEqual(data.paymentData.amount, '2690.00');
    assert.ok(data.paymentData.signature);
    assert.ok(data.actionUrl.includes('payfast.co.za'));
  } finally {
    server.close();
  }
});
