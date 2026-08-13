/**
 * QA: the Sarvam AI proxy client contract. Verifies that the mobile client
 * ships the exact request shape the server-side /api/v1/ai/* routes validate,
 * and that the API key never appears in a request (it lives server-side only).
 */
import { createApiClient, ApiClient } from '@tgim/api-client';

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('ai proxy client', () => {
  let client: ApiClient;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    client = createApiClient({ baseUrl: 'http://tgim.test', fetch: fetchMock as unknown as typeof fetch });
  });

  it('posts base64 audio to the speech-to-text proxy', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ transcript: 'pothole near the gate', language_code: 'en-IN' }));
    const result = await client.ai.transcribeVoice({ audio_base64: 'aGVsbG8=', media_type: 'audio/m4a', language: 'hi' });

    expect(result.transcript).toBe('pothole near the gate');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://tgim.test/api/v1/ai/speech-to-text');
    expect(JSON.parse(init.body as string)).toEqual({ audio_base64: 'aGVsbG8=', media_type: 'audio/m4a', language: 'hi' });
    expect(JSON.stringify(init)).not.toContain('apiSubscriptionKey');
  });

  it('posts text to the text-to-speech proxy', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ audio_base64: 'QUFB', media_type: 'audio/wav' }));
    const result = await client.ai.speak({ text: 'Road repaired', language: 'mr' });

    expect(result.audio_base64).toBe('QUFB');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://tgim.test/api/v1/ai/text-to-speech');
    expect(JSON.parse(init.body as string)).toEqual({ text: 'Road repaired', language: 'mr' });
  });

  it('surfaces 503 ai_not_configured as an ApiError for the client to degrade gracefully', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'ai_not_configured', message: 'Sarvam AI speech-to-text is not configured in this environment' } }, false),
    );
    await expect(
      client.ai.transcribeVoice({ audio_base64: 'AQID', media_type: 'audio/m4a', language: 'en' }),
    ).rejects.toThrow(/ai_not_configured/);
  });
});