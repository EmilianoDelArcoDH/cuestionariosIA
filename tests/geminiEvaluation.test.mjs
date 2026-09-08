import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestGeminiFeedback } from '../lib/geminiEvaluation.ts';

const success = () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'internal' }, { text: 'Bien.' }, { text: 'Puntaje: 90/100' }] } }] });

test('Gemini evaluation failure handling', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalTimeout = globalThis.setTimeout;
  const originalWarn = console.warn;
  t.after(() => { globalThis.fetch = originalFetch; globalThis.setTimeout = originalTimeout; console.warn = originalWarn; });
  globalThis.setTimeout = (fn) => originalTimeout(fn, 0);
  console.warn = () => {};
  for (const status of [429, 500, 502, 503, 504]) {
    let calls = 0;
    globalThis.fetch = async () => ++calls === 1 ? new Response('', { status }) : success();
    assert.equal(await requestGeminiFeedback('test', 'dummy'), 'Bien. Puntaje: 90/100');
    assert.equal(calls, 2);
  }
  for (const status of [400, 401, 403, 404]) {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response('', { status }); };
    await assert.rejects(requestGeminiFeedback('test', 'dummy'), new RegExp(`HTTP ${status}`));
    assert.equal(calls, 1);
  }
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('', { status: 429 }); };
  await assert.rejects(requestGeminiFeedback('test', 'dummy'), /cuota/);
  assert.equal(calls, 3);
  calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? Response.json({ candidates: [] }) : success();
  assert.match(await requestGeminiFeedback('test', 'dummy'), /90/);
  calls = 0;
  globalThis.fetch = async () => { if (++calls === 1) throw new TypeError('network'); return success(); };
  assert.match(await requestGeminiFeedback('test', 'dummy'), /90/);
  globalThis.fetch = async () => Response.json({ promptFeedback: { blockReason: 'SAFETY' } });
  await assert.rejects(requestGeminiFeedback('test', 'dummy'), /completar/);
  globalThis.fetch = async () => new Response('', { status: 429, headers: { 'retry-after': '60' } });
  await assert.rejects(requestGeminiFeedback('test', 'dummy'), /cuota/);
});

test('automatic Gemini to Groq fallback', async (t) => {
  const { requestEvaluationFeedback } = await import('../lib/geminiEvaluation.ts');
  const saved = { fetch: globalThis.fetch, warn: console.warn, info: console.info, gemini: process.env.GEMINI_API_KEY, groq: process.env.GROQ_API_KEY };
  t.after(() => {
    globalThis.fetch = saved.fetch; console.warn = saved.warn; console.info = saved.info;
    for (const [name, value] of [['GEMINI_API_KEY', saved.gemini], ['GROQ_API_KEY', saved.groq]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });
  process.env.GEMINI_API_KEY = 'dummy-gemini'; process.env.GROQ_API_KEY = 'dummy-groq';
  console.warn = () => {}; console.info = () => {};
  const groqSuccess = () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'Puntaje: 85/100. Correcta.' } }] });
  let calls = [];
  globalThis.fetch = async (url) => { calls.push(url); return success(); };
  assert.match(await requestEvaluationFeedback('test'), /90/);
  assert.equal(calls.length, 1);
  for (const failure of [
    () => new Response('', { status: 429 }),
    () => new Response('', { status: 503 }),
    () => { throw new DOMException('timeout', 'TimeoutError'); },
    () => Response.json({ candidates: [] }),
    () => Response.json({ candidates: [{ content: { parts: [{ text: 'Sin nota' }] } }] })
  ]) {
    calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push(url);
      if (url.includes('googleapis')) return failure();
      assert.equal(init.headers.Authorization, 'Bearer dummy-groq');
      assert.equal(JSON.parse(init.body).messages[0].content, 'test');
      return groqSuccess();
    };
    assert.match(await requestEvaluationFeedback('test'), /85/);
    assert.equal(calls.length, 2);
    assert.match(calls[1], /api.groq.com/);
  }
  globalThis.fetch = async () => new Response('', { status: 429 });
  await assert.rejects(requestEvaluationFeedback('test'), /proveedores disponibles/);
  delete process.env.GEMINI_API_KEY;
  globalThis.fetch = async () => groqSuccess();
  assert.match(await requestEvaluationFeedback('test'), /85/);
  for (const result of [
    { choices: [{ finish_reason: 'length', message: { content: 'Puntaje: 85/100' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: 'Sin nota' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: 'Puntaje: 150/100' } }] }
  ]) {
    globalThis.fetch = async () => Response.json(result);
    await assert.rejects(requestEvaluationFeedback('test'), /proveedores disponibles/);
  }
  delete process.env.GROQ_API_KEY;
  await assert.rejects(requestEvaluationFeedback('test'), /No hay proveedores/);
});
