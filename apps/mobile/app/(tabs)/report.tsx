import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { requestRecordingPermissionsAsync, RecordingPresets, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IssueCategory, IssueSeverity, PrivacyLevel } from '@tgim/shared';
import { tokens } from '@tgim/shared';
import { useI18n } from '../../src/i18n';
import { transcribeRecording } from '../../src/ai';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/typography';
import { ACTIVE_AREA_NAME } from '../../src/config';
import { enqueueDraft, sync, useDraftQueue, type EvidenceReference } from '../../src/store/draftQueue';
import { useSession } from '../../src/store/session';
import { fontScale, theme } from '../../src/theme';

const CATEGORIES: IssueCategory[] = [
  'water',
  'roads',
  'garbage',
  'health',
  'safety',
  'jobs',
  'transport',
  'housing',
];

const CATEGORY_ICON: Record<IssueCategory, keyof typeof Ionicons.glyphMap> = {
  water: 'water',
  roads: 'car',
  garbage: 'trash',
  health: 'medkit',
  safety: 'shield',
  jobs: 'briefcase',
  transport: 'bus',
  housing: 'home',
};

const SEVERITIES: IssueSeverity[] = ['low', 'medium', 'high', 'critical'];
const PRIVACY: { level: PrivacyLevel; labelKey: 'privacyPublic' | 'privacyAnonymous' | 'privacyBlurred'; hintKey: 'privacyPublicHint' | 'privacyAnonymousHint' | 'privacyBlurredHint' }[] = [
  { level: 'public', labelKey: 'privacyPublic', hintKey: 'privacyPublicHint' },
  { level: 'anonymous', labelKey: 'privacyAnonymous', hintKey: 'privacyAnonymousHint' },
  { level: 'blurred', labelKey: 'privacyBlurred', hintKey: 'privacyBlurredHint' },
];

// Area centroid (Mumbai South Central). The server jitters this to a separate
// public_location for any non-public privacy mode — exact coords never leave here.
const AREA_CENTROID = { latitude: 19.076, longitude: 72.8777 };

const TOTAL = 4;

export default function ReportWizard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { pendingCount } = useDraftQueue();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<IssueCategory | null>(null);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IssueSeverity>('medium');
  const [privacy, setPrivacy] = useState<PrivacyLevel>('public');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState(AREA_CENTROID);
  const [locationMessage, setLocationMessage] = useState('');
  const [evidence, setEvidence] = useState<EvidenceReference[]>([]);

  const captureCurrentLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setLocationMessage(t('locationPermissionDenied'));
      return;
    }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoordinates({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    setLocationMessage(t('locationCaptured'));
  };

  const addEvidence = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setLocationMessage(t('photoLibraryDenied'));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85, videoMaxDuration: 30, allowsMultipleSelection: true, selectionLimit: 5 - evidence.length });
    if (picked.canceled) return;
    const next = await Promise.all(picked.assets.map(async (asset) => {
      const mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' = asset.type === 'video' ? 'video/mp4' : asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' ? asset.mimeType : 'image/jpeg';
      return { uri: asset.uri, filename: asset.fileName || `evidence-${Date.now()}.${mediaType === 'video/mp4' ? 'mp4' : 'jpg'}`, media_type: mediaType };
    }));
    setEvidence(current => [...current, ...next].slice(0, 5));
  };

  const captureEvidence = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { setLocationMessage(t('cameraDenied')); return; }
    const captured = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.85, videoMaxDuration: 30 });
    if (captured.canceled) return;
    const asset = captured.assets[0];
    const mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' = asset.type === 'video' ? 'video/mp4' : asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' ? asset.mimeType : 'image/jpeg';
    setEvidence(current => [...current, { uri: asset.uri, filename: asset.fileName || `evidence-${Date.now()}.${mediaType === 'video/mp4' ? 'mp4' : 'jpg'}`, media_type: mediaType }].slice(0, 5));
  };

  const canNext =
    (step === 0) ||
    (step === 1 && category !== null) ||
    (step === 2 && description.trim().length >= 10) ||
    step === 3;

  const submit = async () => {
    if (!category) return;
    setSubmitting(true);
    setResult(null);
    await enqueueDraft({
      category,
      description: description.trim(),
      severity,
      privacy,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    }, evidence);
    const { synced, pending } = await sync();
    setSubmitting(false);
    setResult(
      synced > 0
        ? t('submitSuccess')
        : `${t('savedOffline')} (${pending})`,
    );
  };

  const reset = () => {
    setStep(0);
    setCategory(null);
    setDescription('');
    setSeverity('medium');
    setPrivacy('public');
    setResult(null);
    setEvidence([]);
  };

  if (result) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: theme.spacing.xl, paddingTop: insets.top + theme.spacing.xl, gap: theme.spacing.lg }}>
        <Ionicons name="checkmark-circle" size={56} color={theme.palette.success} />
        <Text role="h1" color={theme.text}>{result}</Text>
        <Text role="body" color={theme.textMuted}>
          {pendingCount > 0 ? `${pendingCount} ${t('queued')}` : result}
        </Text>
        <Button label={t('reportAnother')} onPress={reset} />
        <Button label={t('viewOnMap')} variant="secondary" onPress={() => router.push('/(tabs)')} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: insets.top + theme.spacing.md, gap: theme.spacing.lg }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text role="h1" color={theme.text}>{t('pinAProblem')}</Text>
        {pendingCount > 0 && <Badge label={`${pendingCount} ${t('queued')}`} color={theme.palette.warning} />}
      </View>
      <Text role="body" color={theme.textMuted}>{`${t('step')} ${step + 1} ${t('of')} ${TOTAL}`}</Text>

      <View style={{ height: 6, backgroundColor: theme.slate[200], borderRadius: 3 }}>
        <View style={{ height: 6, width: `${((step + 1) / TOTAL) * 100}%`, backgroundColor: theme.accent, borderRadius: 3 }} />
      </View>

      {step === 0 && (
        <View style={{ gap: theme.spacing.md }}>
          <Text role="h3" color={theme.text}>{t('location')}</Text>
          <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: theme.spacing.sm }}>
            <Text role="bodyStrong" color={theme.text}>📍 {ACTIVE_AREA_NAME}</Text>
            <Text role="label" color={theme.textMuted}>{t('locationPrivacynote')}</Text>
            <Button label={t('useCurrentLocation')} variant="secondary" onPress={() => void captureCurrentLocation()} />
            <Text role="small" selectable color={theme.textMuted}>{locationMessage}</Text>
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={{ gap: theme.spacing.md }}>
          <Text role="h3" color={theme.text}>{t('category')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
            {CATEGORIES.map((c) => {
              const active = category === c;
              const color = tokens.categoryColor[c];
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    width: '30%',
                    aspectRatio: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.spacing.sm,
                    borderRadius: theme.radius.lg,
                    borderWidth: 1.5,
                    borderColor: active ? color : theme.border,
                    backgroundColor: active ? color + '14' : theme.card,
                  }}
                >
                  <Ionicons name={CATEGORY_ICON[c]} size={26} color={color} />
                  <Text role="small" color={theme.text} style={{ textTransform: 'capitalize' }}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: theme.spacing.md }}>
          <Text role="h3" color={theme.text}>{t('description')}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('descriptionPlaceholder')}
            placeholderTextColor={theme.slate[400]}
            testID="report-description-input"
            multiline
            style={{
              backgroundColor: theme.card,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.border,
              padding: theme.spacing.lg,
              minHeight: 110,
              color: theme.text,
              fontSize: fontScale.body.fontSize,
              textAlignVertical: 'top',
            }}
          />
          <Text role="small" color={theme.textMuted}>{description.trim().length} / 2000</Text>
          <VoiceRecorder onTranscript={(text) => setDescription((current) => (current.trim() ? `${current.trim()} ${text}` : text))} />
        </View>
      )}

      {step === 3 && (
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: theme.spacing.md }}>
            <Text role="h3" color={theme.text}>{t('seriousness')}</Text>
            {SEVERITIES.map((s) => {
              const active = severity === s;
              const color = tokens.severityToScale[s].color;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSeverity(s)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
                    borderRadius: theme.radius.md, borderWidth: 1.5,
                    borderColor: active ? color : theme.border,
                    backgroundColor: active ? color + '14' : theme.card,
                    padding: theme.spacing.lg,
                  }}
                >
                  <View style={{ width: 14, height: 14, borderRadius: theme.radius.pill, backgroundColor: color }} />
                  <View style={{ flex: 1 }}>
                    <Text role="h3" color={theme.text} style={{ textTransform: 'capitalize' }}>{s}</Text>
                    <Text role="small" color={theme.textMuted}>{severityHint(t, s)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: theme.spacing.md }}>
            <Text role="h3" color={theme.text}>{t('privacy')}</Text>
            {PRIVACY.map((p) => {
              const active = privacy === p.level;
              return (
                <Pressable
                  key={p.level}
                  onPress={() => setPrivacy(p.level)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    borderRadius: theme.radius.md, borderWidth: 1.5,
                    borderColor: active ? theme.accent : theme.border,
                    backgroundColor: active ? theme.accent + '14' : theme.card,
                    padding: theme.spacing.lg,
                  }}
                >
                  <Text role="bodyStrong" color={theme.text}>{t(p.labelKey)}</Text>
                  <Text role="label" color={theme.textMuted} style={{ marginTop: theme.spacing.xs }}>{t(p.hintKey)}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: theme.spacing.md }}>
            <Text role="h3" color={theme.text}>{t('evidenceOptional')}</Text>
            <Button label={t('addPhotosVideo')} variant="secondary" onPress={() => void addEvidence()} disabled={evidence.length >= 5} />
            <Button label={t('openCamera')} variant="secondary" onPress={() => void captureEvidence()} disabled={evidence.length >= 5} />
            <Text role="body" selectable color={theme.textMuted}>{`${evidence.length} ${t('of')} 5 ${t('evidenceSelected')}`}</Text>
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
        {step > 0 && (
          <View style={{ flex: 1 }}>
            <Button label={t('back')} variant="secondary" onPress={() => setStep((s) => s - 1)} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          {step < TOTAL - 1 ? (
            <Button label={t('next')} onPress={() => setStep((s) => s + 1)} disabled={!canNext} />
          ) : (
            <Button label={t('submitReport')} onPress={submit} loading={submitting} />
          )}
        </View>
      </View>
      <View style={{ height: insets.bottom + theme.spacing.sm }} />
    </ScrollView>
  );
}

function severityHint(t: (k: 'severityLowHint' | 'severityMediumHint' | 'severityHighHint' | 'severityCriticalHint') => string, severity: IssueSeverity): string {
  switch (severity) {
    case 'low': return t('severityLowHint');
    case 'medium': return t('severityMediumHint');
    case 'high': return t('severityHighHint');
    case 'critical': return t('severityCriticalHint');
  }
}

/**
 * Voice entry for the Report description. Records with expo-audio, then proxies
 * the audio to the server-side Sarvam speech-to-text endpoint. The transcript
 * is appended to the report description — this is voice-to-Description, so the
 * evidence schema is untouched.
 */
function VoiceRecorder({ onTranscript }: { onTranscript: (text: string) => void }) {
  const { t } = useI18n();
  const { language } = useSession();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const toggle = async () => {
    try {
      if (state.isRecording) {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) {
          setNote(t('recordingFailed'));
          return;
        }
        setBusy(true);
        setNote(t('transcribing'));
        try {
          const transcript = await transcribeRecording(uri, language);
          if (transcript.trim().length > 0) onTranscript(transcript.trim());
          setNote(t('transcriptionDone'));
        } catch (error) {
          if (error instanceof Error && JSON.stringify(error).includes('ai_not_configured')) {
            setNote(t('transcriptionFailed'));
            return;
          }
          setNote(t('transcriptionFailed'));
        } finally {
          setBusy(false);
        }
      } else {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          setNote(t('voicePermissionDenied'));
          return;
        }
        await recorder.prepareToRecordAsync();
        recorder.record();
        setNote(null);
      }
    } catch {
      setNote(t('recordingFailed'));
    }
  };

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Pressable
        onPress={() => void toggle()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t('recordVoice')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          borderColor: state.isRecording ? theme.palette.danger : theme.accent,
          backgroundColor: state.isRecording ? theme.palette.danger + '14' : theme.accent + '14',
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Ionicons name={state.isRecording ? 'stop-circle' : 'mic'} size={20} color={state.isRecording ? theme.palette.danger : theme.accent} />
        <Text role="label" color={state.isRecording ? theme.palette.danger : theme.accent}>
          {busy ? t('transcribing') : state.isRecording ? t('stopRecording') : t('recordVoice')}
        </Text>
      </Pressable>
      {state.isRecording && (
        <Text role="small" color={theme.textMuted} center>
          {Math.round(state.durationMillis / 1000)}s
        </Text>
      )}
      {note && <Text role="small" color={theme.textMuted}>{note}</Text>}
    </View>
  );
}