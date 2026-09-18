import { evaluateWithTransformer } from './transformerEvaluator';

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

export async function requestGeminiFeedback(prompt: string, apiKey: string, maxAttempts = 3): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let retryDelay = 1000 * 2 ** attempt + Math.random() * 500;
    let failure = 'No se pudo conectar con Gemini.';
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) {
        console.warn('Gemini evaluation HTTP error', { status: response.status, attempt: attempt + 1 });
        failure = response.status === 429
          ? 'Gemini alcanzo su limite de solicitudes o cuota.'
          : `Gemini no pudo evaluar la respuesta (HTTP ${response.status}).`;
        if (![429, 500, 502, 503, 504].includes(response.status)) throw new PermanentGeminiError(failure);
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          const seconds = Number(retryAfter);
          const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
          if (delay > 10000) throw new PermanentGeminiError(failure);
          if (delay > 0) retryDelay = Math.max(retryDelay, delay);
        }
        await response.body?.cancel();
      } else {
        const data = await response.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts
          ?.filter((part: { thought?: boolean; text?: string }) => !part.thought && typeof part.text === 'string')
          .map((part: { text: string }) => part.text).join(' ').trim();
        if (data.promptFeedback?.blockReason || (candidate?.finishReason && candidate.finishReason !== 'STOP')) {
          console.warn('Gemini evaluation incomplete', { finishReason: candidate?.finishReason, blockReason: data.promptFeedback?.blockReason });
          throw new PermanentGeminiError('Gemini no pudo completar la evaluacion de esta respuesta.');
        }
        if (text) return text;
        failure = 'Gemini devolvio una respuesta vacia.';
        console.warn('Gemini evaluation empty response', { attempt: attempt + 1 });
      }
    } catch (error) {
      if (error instanceof PermanentGeminiError) throw error;
      // Do not log request bodies, credentials, or provider error messages.
      console.warn('Gemini evaluation connection failure', { attempt: attempt + 1 });
    }
    if (attempt === maxAttempts - 1) throw new Error(failure);
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }
  throw new Error('Gemini no pudo evaluar la respuesta.');
}

class PermanentGeminiError extends Error {}


function validateFeedback(text: unknown): string {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('El proveedor devolvio una evaluacion vacia.');
  }
  const match = text.match(/(?:^|[^\d.-])(\d{1,3})\s*\/\s*100|puntaje\s*:?\s*(\d{1,3})/i);
  const score = Number(match?.[1] ?? match?.[2]);
  if (!match || !Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error('El proveedor devolvio una evaluacion sin puntaje valido.');
  }
  return text.trim();
}

async function requestGroqFeedback(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 2048
    }),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) {
    await response.body?.cancel();
    console.warn('Groq evaluation HTTP error', { status: response.status });
    throw new Error(response.status === 429
      ? 'Groq alcanzo su limite de solicitudes o cuota.'
      : `Groq no pudo evaluar la respuesta (HTTP ${response.status}).`);
  }
  const data = await response.json();
  const choice = data.choices?.[0];
  if (choice?.finish_reason !== 'stop') {
    throw new Error('Groq no pudo completar la evaluacion de esta respuesta.');
  }
  return validateFeedback(choice.message?.content);
}

async function requestTransformerFallback(prompt: string, cause: unknown): Promise<string> {
  try {
    const feedback = validateFeedback(await evaluateWithTransformer(prompt));
    console.info('Evaluation provider succeeded', { provider: 'transformers-js' });
    return feedback;
  } catch {
    console.warn('Evaluation provider failed', { provider: 'transformers-js' });
    if (cause instanceof Error) throw cause;
    throw new Error('La IA no pudo completar la evaluacion: los proveedores disponibles fallaron o alcanzaron su limite.');
  }
}

/** Gemini is primary; Groq is used only when Gemini cannot produce a valid grade. */
export async function requestEvaluationFeedback(prompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!geminiKey && !groqKey) throw new Error('No hay proveedores de IA configurados.');

  let geminiFailure: unknown;
  if (geminiKey) {
    try {
      // With a backup, switch immediately instead of retrying an exhausted quota.
      return validateFeedback(await requestGeminiFeedback(prompt, geminiKey, groqKey ? 1 : 3));
    } catch (error) {
      geminiFailure = error;
      console.warn('Evaluation provider failed', { provider: 'gemini', fallback: Boolean(groqKey) });
    }
  }
  if (groqKey) {
    try {
      const feedback = await requestGroqFeedback(prompt, groqKey);
      console.info('Evaluation provider succeeded', { provider: 'groq' });
      return feedback;
    } catch {
      console.warn('Evaluation provider failed', { provider: 'groq' });
      return requestTransformerFallback(
        prompt,
        new Error('La IA no pudo completar la evaluacion: los proveedores disponibles fallaron o alcanzaron su limite.')
      );
    }
  }
  return requestTransformerFallback(
    prompt,
    geminiFailure instanceof Error ? geminiFailure : new Error('No se pudo completar la evaluacion.')
  );
}
