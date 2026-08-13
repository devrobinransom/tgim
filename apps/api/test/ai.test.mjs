import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../dist/app.js';

/**
 * QA: Sarvam AI proxy contract. The subscription key lives server-side only;
 * these tests pin the degradation path (503 ai_not_configured) plus the
 * validation and audit behaviour of both /api/v1/ai/* routes.
 */
const jsonHeaders = { 'content-type': 'application/json' };
const role = (value) => ({ ...jsonHeaders, 'x-tgim-demo-role': value });

const PROVIDER_UNCONFIGURED = !process.env.SARVAMAI_API_KEY;

const HARD_AUTH = process.env.NODE_ENV === 'production' && process.env.DEMO_AUTH_ENABLED !== 'true';

test('ai routes require an actor when hard auth is enabled', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  if (!HARD_AUTH) {
    t.skip('demo auth auto-resolves actors — hard-auth check covered in production configs');
    return;
  }
  const stt = await app.inject({
    method: 'POST', url: '/api/v1/ai/speech-to-text',
    payload: { audio_base64: 'AQID', media_type: 'audio/m4a', language: 'en' },
  });
  assert.equal(stt.statusCode, 401);
  const tts = await app.inject({
    method: 'POST', url: '/api/v1/ai/text-to-speech',
    payload: { text: 'Hello', language: 'en' },
  });
  assert.equal(tts.statusCode, 401);
});

test('ai routes reject roles outside the citizen workspace', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  const stt = await app.inject({
    method: 'POST', url: '/api/v1/ai/speech-to-text', headers: role('party_lead'),
    payload: { audio_base64: 'AQID', media_type: 'audio/m4a', language: 'en' },
  });
  assert.equal(stt.statusCode, 403);
  const tts = await app.inject({
    method: 'POST', url: '/api/v1/ai/text-to-speech', headers: role('party_lead'),
    payload: { text: 'Hello', language: 'en' },
  });
  assert.equal(tts.statusCode, 403);
});

test('speech-to-text validates payload shape before touching the provider', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  const missing = await app.inject({
    method: 'POST', url: '/api/v1/ai/speech-to-text', headers: role('citizen'),
    payload: { media_type: 'audio/m4a', language: 'en' },
  });
  assert.equal(missing.statusCode, 400);
  const empty = await app.inject({
    method: 'POST', url: '/api/v1/ai/speech-to-text', headers: role('citizen'),
    payload: { audio_base64: '', media_type: 'audio/m4a', language: 'en' },
  });
  assert.equal(empty.statusCode, 400);
});

test('text-to-speech validates payload shape before touching the provider', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  const short = await app.inject({
    method: 'POST', url: '/api/v1/ai/text-to-speech', headers: role('citizen'),
    payload: { text: 'x', language: 'en' },
  });
  assert.equal(short.statusCode, 400);
});

test('ai routes degrade with 503 ai_not_configured when the provider key is absent', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  if (!PROVIDER_UNCONFIGURED) {
    t.skip('SARVAMAI_API_KEY is set — provider is configured in this environment');
    return;
  }
  const stt = await app.inject({
    method: 'POST', url: '/api/v1/ai/speech-to-text', headers: role('citizen'),
    payload: { audio_base64: 'AQID', media_type: 'audio/m4a', language: 'hi' },
  });
  assert.equal(stt.statusCode, 503);
  assert.equal(stt.json().error.code, 'ai_not_configured');

  const tts = await app.inject({
    method: 'POST', url: '/api/v1/ai/text-to-speech', headers: role('citizen'),
    payload: { text: 'Road repaired', language: 'mr' },
  });
  assert.equal(tts.statusCode, 503);
  assert.equal(tts.json().error.code, 'ai_not_configured');
});

test('successful ai proxy calls are audit-logged', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  if (PROVIDER_UNCONFIGURED) {
    t.skip('provider unconfigured — audit path needs a configured provider');
    return;
  }
  const stt = await app.inject({
    method: 'POST', url: '/api/v1/ai/speech-to-text', headers: role('citizen'),
    payload: { audio_base64: 'AQID', media_type: 'audio/m4a', language: 'en' },
  });
  assert.equal(stt.statusCode, 200);
  const audit = await app.inject({ method: 'GET', url: '/api/v1/audit', headers: role('platform_admin') });
  assert.ok(audit.json().some((event) => event.event_type === 'ai.speech_to_text'));
});
