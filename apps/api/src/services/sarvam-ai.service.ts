import { isSovereignMode } from '@tgim/shared';
import { SarvamAIClient } from 'sarvamai';

/**
 * Server-side proxy for the Sarvam AI SDK. The subscription key is read from
 * the environment and never shipped to a client bundle. In Sovereign Mode or
 * when SARVAMAI_API_KEY is unset the provider is treated as not configured so
 * clients degrade to text-only input (mirrors the deterministic AI fallback).
 */

export type SupportedSarvamLanguage = 'hi-IN' | 'mr-IN' | 'en-IN';

const LANGUAGE_MAP: Record<string, SupportedSarvamLanguage> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
};

/** Map TGIM UI languages (en|hi|mr) to the BCP-47 codes Sarvam understands. */
export function sarvamLanguage(language: string): SupportedSarvamLanguage {
  return LANGUAGE_MAP[language] ?? 'en-IN';
}

function client(): SarvamAIClient | null {
  const apiKey = process.env.SARVAMAI_API_KEY;
  if (!apiKey || isSovereignMode()) return null;
  return new SarvamAIClient({ apiSubscriptionKey: apiKey });
}

export interface TranscriptionResult {
  transcript: string;
  language_code?: string;
  request_id?: string;
}

/** Speech-to-text using saaras:v3 ('transcribe' mode keeps the original language). */
export async function transcribeAudio(input: {
  bytes: ArrayBuffer;
  mimeType: string;
  language: string;
}): Promise<TranscriptionResult> {
  const c = client();
  if (!c) throw new Error('Sarvam AI speech-to-text is not configured in this environment');
  const configuredModel = process.env.SARVAMAI_STT_MODEL;
  const model = configuredModel === 'saaras:v4' ? configuredModel : 'saaras:v3';
  const blob = new Blob([input.bytes], { type: input.mimeType });
  const response = await c.speechToText.transcribe({
    file: blob,
    model,
    language_code: sarvamLanguage(input.language),
    mode: 'transcribe',
  });
  return {
    transcript: response.transcript,
    language_code: response.language_code,
    request_id: response.request_id,
  };
}

export interface SpeechResult {
  audioBase64: string;
  mimeType: string;
}

/** Text-to-speech using bulbul:v2 (output is WAV encoded as base64). */
export async function synthesizeSpeech(input: {
  text: string;
  language: string;
}): Promise<SpeechResult> {
  const c = client();
  if (!c) throw new Error('Sarvam AI text-to-speech is not configured in this environment');
  const configuredModel = process.env.SARVAMAI_TTS_MODEL;
  const model = configuredModel === 'bulbul:v3' ? configuredModel : 'bulbul:v2';
  const response = await c.textToSpeech.convert({
    text: input.text,
    language_code: sarvamLanguage(input.language),
    model,
  });
  return { audioBase64: response.audios.join(''), mimeType: 'audio/wav' };
}