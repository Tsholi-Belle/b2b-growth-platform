const test = require('node:test');
const assert = require('node:assert');
const geminiGateway = require('../services/geminiGateway');

test.beforeEach(() => {
  geminiGateway.resetClient();
});

test('generateContent returns provider vertex_ai and valid output structure on success', async () => {
  geminiGateway.setClientFactory(() => ({
    models: {
      generateContent: async () => ({
        text: 'Generated proposal response',
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 200, totalTokenCount: 300 }
      })
    }
  }));

  const result = await geminiGateway.generateContent({
    prompt: 'Write an RFP response'
  });

  assert.strictEqual(result.provider, 'vertex_ai');
  assert.strictEqual(result.text, 'Generated proposal response');
  assert.ok(result.latencyMs >= 0);
  assert.strictEqual(result.usage.totalTokenCount, 300);
});

test('AUTH_FAILED is thrown immediately without retries on credential errors', async () => {
  let callCount = 0;
  geminiGateway.setClientFactory(() => ({
    models: {
      generateContent: async () => {
        callCount++;
        throw new Error('401 Unauthorized Application Default Credentials invalid');
      }
    }
  }));

  await assert.rejects(async () => {
    await geminiGateway.generateContent({ prompt: 'Test prompt' });
  }, (err) => {
    assert.strictEqual(err.code, 'AUTH_FAILED');
    return true;
  });

  assert.strictEqual(callCount, 1, 'Should NOT retry on AUTH_FAILED');
});

test('MODEL_NOT_FOUND is thrown immediately without retries on 404', async () => {
  let callCount = 0;
  geminiGateway.setClientFactory(() => ({
    models: {
      generateContent: async () => {
        callCount++;
        throw new Error('404 Model not found');
      }
    }
  }));

  await assert.rejects(async () => {
    await geminiGateway.generateContent({ prompt: 'Test prompt' });
  }, (err) => {
    assert.strictEqual(err.code, 'MODEL_NOT_FOUND');
    return true;
  });

  assert.strictEqual(callCount, 1, 'Should NOT retry on MODEL_NOT_FOUND');
});

test('Transient 429 error retries at most once and recovers if second attempt succeeds', async () => {
  let callCount = 0;
  geminiGateway.setClientFactory(() => ({
    models: {
      generateContent: async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('429 Rate limit exceeded');
        }
        return { text: 'Recovered after retry' };
      }
    }
  }));

  const result = await geminiGateway.generateContent({ prompt: 'Test prompt' });
  assert.strictEqual(result.text, 'Recovered after retry');
  assert.strictEqual(callCount, 2, 'Should retry exactly once');
});

test('MODEL_TIMEOUT is thrown when call exceeds timeoutMs', async () => {
  geminiGateway.setClientFactory(() => ({
    models: {
      generateContent: async () => {
        await new Promise(r => setTimeout(r, 200));
        return { text: 'Delayed' };
      }
    }
  }));

  await assert.rejects(async () => {
    await geminiGateway.generateContent({ prompt: 'Test prompt', timeoutMs: 50 });
  }, (err) => {
    assert.strictEqual(err.code, 'MODEL_TIMEOUT');
    return true;
  });
});
