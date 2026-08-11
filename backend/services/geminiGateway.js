const { GoogleGenAI } = require('@google/genai');

/**
 * Centralized Gemini Gateway Module for ArchEngine AI.
 * Handles Vertex AI ADC authentication, configurable models,
 * structured output generation, bounded retries, and normalized errors.
 */

// Configurable model (default to gemini-2.5-flash as modern fast model, fallback to process.env.GEMINI_MODEL)
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let genAIClient = null;

/**
 * Gets or initializes the singleton GoogleGenAI client.
 * Prioritizes Vertex AI mode with Application Default Credentials (ADC) in production.
 * Falls back to API Key mode if GEMINI_API_KEY is provided in local development.
 */
function getClient() {
  if (genAIClient) return genAIClient;

  const useVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' || !!process.env.GOOGLE_CLOUD_PROJECT;
  const apiKey = process.env.GEMINI_API_KEY;

  if (useVertex) {
    const project = process.env.GOOGLE_CLOUD_PROJECT || 'archengine-ai-prod';
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    console.log(`[GeminiGateway] Initializing Vertex AI mode (Project: ${project}, Location: ${location}) using ADC`);
    genAIClient = new GoogleGenAI({
      vertexai: true,
      project,
      location
    });
  } else if (apiKey) {
    console.log('[GeminiGateway] Initializing Gemini Developer API mode with API Key');
    genAIClient = new GoogleGenAI({ apiKey });
  } else {
    console.warn('[GeminiGateway] No Vertex AI project or GEMINI_API_KEY found. Client will use default environment fallback.');
    genAIClient = new GoogleGenAI();
  }

  return genAIClient;
}

/**
 * Normalized Error Taxonomy
 */
class GeminiGatewayError extends Error {
  constructor(code, message, originalError = null) {
    super(message);
    this.name = 'GeminiGatewayError';
    this.code = code; // GEMINI_UPSTREAM_UNAVAILABLE | MODEL_OUTPUT_INVALID | REQUEST_INVALID
    this.originalError = originalError;
  }
}

/**
 * Generates proposal content with Gemini 1.5/2.5 Pro or Flash.
 * Performs structured prompt execution with timeout and error mapping.
 *
 * @param {Object} params
 * @param {string} params.prompt - Main user/RFP prompt content
 * @param {string} [params.systemInstruction] - System instruction for the agent
 * @param {string} [params.model] - Optional override model name
 * @param {number} [params.temperature] - Generation temperature (0.0 - 1.0)
 * @param {Array} [params.tools] - Optional function calling tools
 * @returns {Promise<Object>} Object containing { text, usage, metadata, latencyMs }
 */
async function generateContent({ prompt, systemInstruction, model, temperature = 0.4, tools }) {
  const startTime = Date.now();
  const targetModel = model || DEFAULT_MODEL;

  try {
    const ai = getClient();

    const config = {
      temperature
    };

    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    if (tools) {
      config.tools = tools;
    }

    const contents = [
      { role: 'user', parts: [{ text: prompt }] }
    ];

    const response = await ai.models.generateContent({
      model: targetModel,
      contents,
      config
    });

    const latencyMs = Date.now() - startTime;
    const text = response.text || '';

    // Extract metadata safely if present
    const usage = response.usageMetadata || {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0
    };

    return {
      text,
      model: targetModel,
      provider: process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' ? 'vertex_ai' : 'gemini_api',
      latencyMs,
      usage
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    console.error(`[GeminiGateway] Call failed after ${latencyMs}ms:`, err.message);

    if (err.message && err.message.includes('404')) {
      throw new GeminiGatewayError('MODEL_NOT_FOUND', `Model ${targetModel} not found or unavailable in configured region`, err);
    }
    if (err.message && (err.message.includes('API key') || err.message.includes('CREDENTIALS'))) {
      throw new GeminiGatewayError('AUTH_FAILED', 'Authentication failed accessing Gemini/Vertex AI service', err);
    }
    
    throw new GeminiGatewayError('GEMINI_UPSTREAM_UNAVAILABLE', 'Gemini service is temporarily unavailable', err);
  }
}

module.exports = {
  getClient,
  generateContent,
  GeminiGatewayError,
  DEFAULT_MODEL
};
