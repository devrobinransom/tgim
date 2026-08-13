import * as FileSystem from 'expo-file-system/legacy';
import { api } from './api';

const MEDIA_TYPE_BY_EXT: Record<string, string> = {
  m4a: 'audio/m4a',
  caf: 'audio/x-caf',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  webm: 'audio/webm',
  opus: 'audio/opus',
  aac: 'audio/aac',
  amr: 'audio/amr',
  aif: 'audio/aiff',
};

function mediaTypeForUri(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() ?? '';
  return MEDIA_TYPE_BY_EXT[ext] ?? 'audio/m4a';
}

/**
 * Turns a locally recorded voice note into a transcript via the server-side
 * Sarvam AI proxy. The subscription key never enters the app bundle — the app
 * only sends base64 audio and receives plain text. Returns the transcript of
 * an empty string when the provider is not configured (503).
 */
export async function transcribeRecording(uri: string, language: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const response = await api.ai.transcribeVoice({
    audio_base64: base64,
    media_type: mediaTypeForUri(uri),
    language: language === 'hi' || language === 'mr' ? language : 'en',
  });
  return response.transcript ?? '';
}