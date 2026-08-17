/**
 * AI Safety Guardrails & POPIA Compliance Service
 * Enforces domain boundaries, profanity filters, prompt injection defense, and SA PII redaction.
 */

// Profanity / Abuse dictionary
const PROFANITY_PATTERNS = [
  /\b(fuck|shit|bitch|asshole|bastard|dick|cunt|slut|whore|nigger|kike|faggot|retard)\b/i,
  /\b(kill yourself|die in a fire|commit suicide|bomb|terrorist|hate you)\b/i
];

// Prompt Injection / Jailbreak signatures
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /you\s+are\s+now\s+(in\s+)?(dan\s+mode|unfiltered|jailbroken|godmode)/i,
  /reveal\s+(your\s+)?(system\s+prompt|hidden\s+instructions|master\s+key)/i,
  /override\s+(all\s+)?safety\s+(protocols|rules|guidelines)/i,
  /pretend\s+you\s+have\s+no\s+(morals|ethics|restrictions)/i,
  /drop\s+database|;\s*drop\s+table/i
];

// Out-of-bounds Harmful & Illegal keywords
const HARMFUL_DOMAINS = [
  /\b(malware|keylogger|ransomware|trojan|ddos\s+script|exploit\s+payload)\b/i,
  /\b(synthesize\s+explosives|make\s+a\s+bomb|illegal\s+drugs|counterfeit)\b/i,
  /\b(bypass\s+authentication\s+vulnerability|sql\s+injection\s+exploit)\b/i
];

/**
 * Validates South African 13-digit ID number using the official Luhn checksum algorithm
 * Format: YYMMDD SSSS C A Z
 */
function isValidSouthAfricanID(idStr) {
  if (!idStr || typeof idStr !== 'string') return false;
  const cleanId = idStr.replace(/\s+/g, '');
  if (!/^\d{13}$/.test(cleanId)) return false;

  // Month check (01-12) and Day check (01-31)
  const month = parseInt(cleanId.substring(2, 4), 10);
  const day = parseInt(cleanId.substring(4, 6), 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  // Luhn Checksum validation
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let digit = parseInt(cleanId.charAt(i), 10);
    if (i % 2 === 1) { // Odd indexes (2nd, 4th, 6th...) multiplied by 2
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Redacts South African PII under POPIA (Protection of Personal Information Act)
 */
function redactPOPIA_PII(text) {
  if (!text || typeof text !== 'string') return { text: '', redactedCount: 0 };
  let sanitized = text;
  let redactedCount = 0;

  // 1. Redact 13-Digit South African ID Numbers
  const saIdRegex = /\b\d{13}\b|\b\d{6}\s\d{4}\s\d{3}\b/g;
  sanitized = sanitized.replace(saIdRegex, match => {
    const cleanMatch = match.replace(/\s+/g, '');
    if (isValidSouthAfricanID(cleanMatch)) {
      redactedCount++;
      return '[REDACTED_SA_ID_NUMBER_POPIA_SEC19]';
    }
    return match;
  });

  // 2. Redact South African Phone Numbers (+27... / 082... / 072... / 061...)
  const saPhoneRegex = /(\+27|0)[6-8][0-9](\s|-|\.)?[0-9]{3}(\s|-|\.)?[0-9]{4}\b/g;
  sanitized = sanitized.replace(saPhoneRegex, () => {
    redactedCount++;
    return '[REDACTED_SA_PHONE_POPIA]';
  });

  // 3. Redact Credit Card / Financial Account Numbers (16-digit cards with optional spaces/dashes)
  const creditCardRegex = /\b(?:\d{4}[\s-]?){3}\d{4}\b|\b\d{15,16}\b/g;
  sanitized = sanitized.replace(creditCardRegex, () => {
    redactedCount++;
    return '[REDACTED_FINANCIAL_CARD_POPIA]';
  });

  // 4. Redact Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  sanitized = sanitized.replace(emailRegex, match => {
    if (match.toLowerCase() === 'hello@kalixara.com') return match; // Preserve support inbox
    redactedCount++;
    return '[REDACTED_PERSONAL_EMAIL]';
  });

  return {
    text: sanitized,
    redactedCount
  };
}

/**
 * Main Guardrails Evaluation Pipeline
 */
function evaluateInputGuardrails(input) {
  const text = typeof input === 'string' ? input : JSON.stringify(input);

  // 1. Check for Profanity & Toxicity
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        violation: 'PROFANITY_OR_TOXICITY',
        reason: 'Input contains prohibited abusive language or profanity.'
      };
    }
  }

  // 2. Check for Prompt Injection & Jailbreaks
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        violation: 'PROMPT_INJECTION_DETECTED',
        reason: 'Input contains potential prompt injection or safety bypass instructions.'
      };
    }
  }

  // 3. Check for Malicious & Harmful Exploits
  for (const pattern of HARMFUL_DOMAINS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        violation: 'HARMFUL_CONTENT_DETECTED',
        reason: 'Input requests generation of malicious scripts, exploits, or dangerous material.'
      };
    }
  }

  // 4. Apply POPIA PII Redaction
  const piiResult = redactPOPIA_PII(text);

  return {
    allowed: true,
    sanitizedText: piiResult.text,
    piiRedacted: piiResult.redactedCount > 0,
    redactedCount: piiResult.redactedCount,
    popiaCompliant: true
  };
}

/**
 * Output Guardrails Evaluation (verifies model generated output before returning to client)
 */
function evaluateOutputGuardrails(output) {
  const text = typeof output === 'string' ? output : JSON.stringify(output);

  // 1. Output Profanity Check
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        violation: 'OUTPUT_TOXICITY',
        sanitizedOutput: 'Content blocked: Model response failed toxicity guardrail.'
      };
    }
  }

  // 2. Output PII Redaction
  const piiResult = redactPOPIA_PII(text);

  return {
    allowed: true,
    output: typeof output === 'string' ? piiResult.text : JSON.parse(piiResult.text),
    popiaCompliant: true
  };
}

module.exports = {
  isValidSouthAfricanID,
  redactPOPIA_PII,
  evaluateInputGuardrails,
  evaluateOutputGuardrails
};
