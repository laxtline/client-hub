// Configures the Groq AI client used by the AI summary service.
// Groq exposes an OpenAI-compatible REST API, so we call it directly with the
// built-in fetch (Node 18+) — no extra SDK dependency required.
// The API key is read from the environment so it is never hard-coded.
import dotenv from 'dotenv';

dotenv.config();

export const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
export const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
export const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';

// Enabled only when a key is present, so the AI service can detect this and
// fall back to a deterministic template instead of crashing.
export const groqEnabled = Boolean(GROQ_API_KEY);

/**
 * Call Groq's chat-completions endpoint and return the assistant's text.
 * Throws on a non-2xx response so the caller can fall back gracefully.
 *
 * @param {object}   opts
 * @param {Array}    opts.messages     - OpenAI-style chat messages
 * @param {number}   [opts.maxTokens]  - response token cap
 * @param {number}   [opts.temperature]
 * @param {boolean}  [opts.jsonMode]   - request strict JSON output
 * @returns {Promise<string>}
 */
export async function groqChat({ messages, maxTokens = 400, temperature = 0.4, jsonMode = false }) {
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Groq API ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}
