import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function route(fail) {
  const exports = {};
  let active = 0;
  let maxActive = 0;
  const code = ts.transpileModule(fs.readFileSync('app/api/evaluate/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    Error,
    process: { env: { GEMINI_API_KEY: 'dummy' } },
    require(name) {
      if (name === '@/lib/evaluationPrompt') return { buildEvaluationPrompt: JSON.stringify };
      if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === '@/lib/questionnaires') return { findQuestionById: async (id) => ({ id, type: 'open', text: 'Pregunta' }) };
      if (name === '@/lib/geminiEvaluation') return { requestEvaluationFeedback: async () => {
        active++; maxActive = Math.max(maxActive, active);
        await new Promise(resolve => setTimeout(resolve, 1));
        active--;
        if (fail) throw new Error('Gemini alcanzo su limite de solicitudes o cuota.');
        return 'Puntaje: 80/100. Bien.';
      } };
      throw new Error(name);
    }
  });
  return { POST: exports.POST, maxActive: () => maxActive };
}

test('successful open questions are evaluated sequentially and averaged', async () => {
  const handler = route(false);
  const response = await handler.POST({ json: async () => ({ answers: [{ questionId: 1, answer: 'a' }, { questionId: 2, answer: 'b' }] }) });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.score, 80);
  assert.equal(body.feedback.length, 2);
  assert.equal(handler.maxActive(), 1);
});

test('provider failure cannot become a completed questionnaire or a grade', async () => {
  const handler = route(true);
  const response = await handler.POST({ json: async () => ({ answers: [{ questionId: 1, answer: 'a' }] }) });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.score, null);
  assert.equal(body.approved, false);
  assert.match(body.error, /cuota/);
});

test('individual evaluation also returns a retryable error', async () => {
  const response = await route(true).POST({ json: async () => ({ questionId: 1, answer: 'a' }) });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /pendiente/);
});
