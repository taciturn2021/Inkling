import Groq from 'groq-sdk';

export const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export async function generateGroqChatCompletion(apiKey, messages, options = {}) {
  const groq = new Groq({ apiKey });

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model: options.model || GROQ_MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
      max_completion_tokens: options.maxCompletionTokens ?? 2048,
    });
  } catch (error) {
    error.isGroqApiError = true;
    throw error;
  }

  return completion.choices?.[0]?.message?.content?.trim() || '';
}

export function isGroqAuthError(error) {
  return error?.status === 401 || error?.error?.code === 'invalid_api_key';
}

export function isGroqApiError(error) {
  return Boolean(error?.isGroqApiError || error?.status || error?.error?.code || error?.error?.message);
}

export function groqErrorDetails(error) {
  if (isGroqAuthError(error)) {
    return {
      status: 400,
      body: {
        error: 'Invalid API Key',
        message: 'Your saved Groq API key is invalid. Add a valid Groq API key in settings.',
      },
    };
  }

  const upstreamStatus = Number(error?.status);
  const upstreamMessage = error?.error?.message || error?.message;
  const message = typeof upstreamMessage === 'string' && upstreamMessage.trim()
    ? upstreamMessage.trim()
    : 'Groq could not generate a response right now. Please try again.';

  if (upstreamStatus === 429) {
    return {
      status: 429,
      body: {
        error: 'Groq Rate Limit',
        message,
      },
    };
  }

  if (upstreamStatus >= 400 && upstreamStatus < 500) {
    return {
      status: 400,
      body: {
        error: 'Groq Request Failed',
        message,
      },
    };
  }

  return {
    status: 502,
    body: {
      error: 'Groq Service Error',
      message,
    },
  };
}
