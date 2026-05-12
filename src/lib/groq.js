import Groq from 'groq-sdk';

export const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export async function generateGroqChatCompletion(apiKey, messages, options = {}) {
  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: options.model || GROQ_MODEL,
    messages,
    temperature: options.temperature ?? 0.3,
    max_completion_tokens: options.maxCompletionTokens ?? 2048,
  });

  return completion.choices?.[0]?.message?.content?.trim() || '';
}

export function isGroqAuthError(error) {
  return error?.status === 401 || error?.error?.code === 'invalid_api_key';
}
