const { GoogleGenAI } = require('@google/genai');

/**
 * Centralized Vertex AI Gemini Gateway Module for ArchEngine Solutions.
 * Handles Vertex AI ADC authentication, configurable models,
 * structured output generation, bounded retries (max 1), request timeouts, and normalized error taxonomy.
 */

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '30000', 10);

let genAIClient = null;
let customClientFactory = null;

/**
 * Gets or initializes the GoogleGenAI client singleton.
 * Uses Vertex AI with Application Default Credentials (ADC).
 */
function getClient() {
  if (customClientFactory) {
    return customClientFactory();
  }

  if (genAIClient) return genAIClient;

  const project = process.env.GOOGLE_CLOUD_PROJECT || 'archengine-solutions';
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

  console.log(`[GeminiGateway] Initializing Vertex AI mode (Project: ${project}, Location: ${location}) using ADC`);

  genAIClient = new GoogleGenAI({
    vertexai: true,
    project,
    location
  });

  return genAIClient;
}

/**
 * Allows injecting a custom client factory (used for unit tests & mocks).
 */
function setClientFactory(factory) {
  customClientFactory = factory;
  genAIClient = null;
}

/**
 * Resets client instance and factory.
 */
function resetClient() {
  genAIClient = null;
  customClientFactory = null;
}

/**
 * Normalized Error Taxonomy
 */
class GeminiGatewayError extends Error {
  constructor(code, message, originalError = null) {
    super(message);
    this.name = 'GeminiGatewayError';
    this.code = code; // AUTH_FAILED | MODEL_NOT_FOUND | REQUEST_INVALID | MODEL_TIMEOUT | GEMINI_UPSTREAM_UNAVAILABLE
    this.originalError = originalError;
  }
}

/**
 * Checks if an error is a transient network or rate-limit error suitable for max 1 retry.
 */
function isTransientError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota') || msg.includes('503') || msg.includes('504') || msg.includes('econnreset') || code === 'ETIMEDOUT') {
    return true;
  }
  return false;
}

/**
 * Executes content generation via Vertex AI SDK with timeout and max 1 retry.
 *
 * @param {Object} params
 * @param {string} params.prompt - Main user/RFP prompt content
 * @param {string} [params.systemInstruction] - System instruction for the agent
 * @param {string} [params.model] - Optional override model name
 * @param {number} [params.temperature] - Generation temperature (0.0 - 1.0)
 * @param {Object} [params.responseSchema] - Optional JSON response schema
 * @param {string} [params.responseMimeType] - Optional response MIME type (e.g. 'application/json')
 * @param {number} [params.timeoutMs] - Request timeout in milliseconds
 * @returns {Promise<Object>} Object containing { text, model, provider, latencyMs, usage }
 */
async function generateContent({
  prompt,
  systemInstruction,
  model,
  temperature = 0.4,
  responseSchema,
  responseMimeType,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) {
  const startTime = Date.now();
  const targetModel = model || DEFAULT_MODEL;

  if (!prompt || typeof prompt !== 'string') {
    throw new GeminiGatewayError('REQUEST_INVALID', 'Prompt is required and must be a string');
  }

  const ai = getClient();

  const config = {
    temperature
  };

  if (systemInstruction) config.systemInstruction = systemInstruction;
  if (responseSchema) config.responseSchema = responseSchema;
  if (responseMimeType) config.responseMimeType = responseMimeType;

  const contents = [
    { role: 'user', parts: [{ text: prompt }] }
  ];

  let attempt = 0;
  const maxAttempts = 2; // Initial attempt + max 1 retry

  while (attempt < maxAttempts) {
    attempt++;
    try {
      // Execute request with race timeout
      const generatePromise = ai.models.generateContent({
        model: targetModel,
        contents,
        config
      });

      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new GeminiGatewayError('MODEL_TIMEOUT', `Gemini call timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      clearTimeout(timer);

      const latencyMs = Date.now() - startTime;
      const text = response.text || '';

      const usage = response.usageMetadata || {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0
      };

      return {
        text,
        model: targetModel,
        provider: 'vertex_ai',
        latencyMs,
        usage
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;

      if (err instanceof GeminiGatewayError && err.code === 'MODEL_TIMEOUT') {
        throw err;
      }

      const msg = (err.message || '').toLowerCase();

      if (msg.includes('404') || msg.includes('not found')) {
        throw new GeminiGatewayError('MODEL_NOT_FOUND', `Model ${targetModel} not found or unavailable in configured region`, err);
      }
      if (msg.includes('api key') || msg.includes('credentials') || msg.includes('unauthorized') || msg.includes('401') || msg.includes('403')) {
        throw new GeminiGatewayError('AUTH_FAILED', 'Vertex AI authentication failed using Application Default Credentials (ADC)', err);
      }

      // Check for transient retry eligibility (max 1 retry)
      if (attempt === 1 && isTransientError(err)) {
        console.warn(`[GeminiGateway] Transient error on attempt 1 (${err.message}). Retrying once...`);
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      throw new GeminiGatewayError('GEMINI_UPSTREAM_UNAVAILABLE', `Gemini service unavailable: ${err.message}`, err);
    }
  }
}

module.exports = {
  getClient,
  setClientFactory,
  resetClient,
  generateContent,
  GeminiGatewayError,
  DEFAULT_MODEL
};
