import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IssueCategory, IssueSeverity, PrivacyLevel } from '@tgim/shared';
import { tokens } from '@tgim/shared';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { ACTIVE_AREA_NAME } from '../../src/config';
import { enqueueDraft, sync, useDraftQueue } from '../../src/store/draftQueue';
import { theme } from '../../src/theme';

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
const PRIVACY: { level: PrivacyLevel; label: string; blurb: string }[] = [
  { level: 'public', label: 'Public', blurb: 'Name + approximate area shown' },
  { level: 'anonymous', label: 'Anonymous', blurb: 'Identity hidden, area blurred ~200m' },
  { level: 'blurred', label: 'Blurred', blurb: 'Location blurred to pincode only' },
];

// Area centroid (Mumbai South Central). The server jitters this to a separate
// public_location for any non-public privacy mode — exact coords never leave here.
const AREA_CENTROID = { latitude: 19.076, longitude: 72.8777 };

export default function ReportWizard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pendingCount } = useDraftQueue();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<IssueCategory | null>(null);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IssueSeverity>('medium');
  const [privacy, setPrivacy] = useState<PrivacyLevel>('public');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const TOTAL = 5;
  const canNext =
    (step === 0) ||
    (step === 1 && category !== null) ||
    (step === 2 && description.trim().length >= 10) ||
    step === 3 ||
    step === 4;

  const submit = async () => {
    if (!category) return;
    setSubmitting(true);
    setResult(null);
    // 1) Durably enqueue FIRST — survives no-signal / force-quit.
    await enqueueDraft({
      category,
      description: description.trim(),
      severity,
      privacy,
      latitude: AREA_CENTROID.latitude,
      longitude: AREA_CENTROID.longitude,
    });
    // 2) Attempt immediate sync; idempotency_key makes a retry safe.
    const { synced, pending } = await sync();
    setSubmitting(false);
    setResult(
      synced > 0
        ? 'Report submitted and synced ✓'
        : `Saved offline — will sync automatically (${pending} pending)`,
    );
  };

  const reset = () => {
    setStep(0);
    setCategory(null);
    setDescription('');
    setSeverity('medium');
    setPrivacy('public');
    setResult(null);
  };

  if (result) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 24, paddingTop: insets.top + 24, gap: 20 }}>
        <Ionicons name="checkmark-circle" size={56} color={theme.palette.success} />
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>{result}</Text>
        <Text style={{ color: theme.textMuted }}>
          {pendingCount > 0
            ? `${pendingCount} report(s) waiting in the offline queue.`
            : 'Your report is in the queue. Clusters update automatically.'}
        </Text>
        <Button label="Report another" onPress={reset} />
        <Button label="View on map" variant="secondary" onPress={() => router.push('/(tabs)')} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: insets.top + 12, gap: 18 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>Pin a Problem</Text>
        {pendingCount > 0 && <Badge label={`${pendingCount} queued`} color={theme.palette.warning} />}
      </View>
      <Text style={{ color: theme.textMuted }}>Step {step + 1} of {TOTAL}</Text>

      {/* Progress bar */}
      <View style={{ height: 6, backgroundColor: theme.slate[200], borderRadius: 3 }}>
        <View
          style={{
            height: 6,
            width: `${((step + 1) / TOTAL) * 100}%`,
            backgroundColor: theme.accent,
            borderRadius: 3,
          }}
        />
      </View>

      {step === 0 && (
        <View style={{ gap: 12 }}>
          <Text style={{ fontWeight: '700', color: theme.text, fontSize: 16 }}>Location</Text>
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.border,
              padding: theme.spacing.lg,
              gap: 6,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: '700' }}>📍 {ACTIVE_AREA_NAME}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>
              Mumbai Suburban District. Your exact pin is kept private — only a blurred public
              location is ever shared.
            </Text>
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={{ gap: 12 }}>
          <Text style={{ fontWeight: '700', color: theme.text, fontSize: 16 }}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {CATEGORIES.map((c) => {
              const active = category === c;
              const color = tokens.categoryColor[c];
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={{
                    width: '30%',
                    aspectRatio: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    borderRadius: theme.radius.lg,
                    borderWidth: 1.5,
                    borderColor: active ? color : theme.border,
                    backgroundColor: active ? color + '14' : theme.card,
                  }}
                >
                  <Ionicons name={CATEGORY_ICON[c]} size={26} color={color} />
                  <Text style={{ fontSize: 12, color: theme.text, fontWeight: '600', textTransform: 'capitalize' }}>
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: 12 }}>
          <Text style={{ fontWeight: '700', color: theme.text, fontSize: 16 }}>Describe the issue</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What's wrong? Be specific (min 10 characters)…"
            placeholderTextColor={theme.slate[400]}
            multiline
            style={{
              backgroundColor: theme.card,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.border,
              padding: theme.spacing.lg,
              minHeight: 120,
              color: theme.text,
              textAlignVertical: 'top',
            }}
          />
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>{description.trim().length} / 2000</Text>
        </View>
      )}

      {step === 3 && (
        <View style={{ gap: 12 }}>
          <Text style={{ fontWeight: '700', color: theme.text, fontSize: 16 }}>Severity</Text>
          <View style={{ gap: 10 }}>
            {SEVERITIES.map((s) => {
              const active = severity === s;
              const color = tokens.severityToScale[s].color;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSeverity(s)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderRadius: theme.radius.md,
                    borderWidth: 1.5,
                    borderColor: active ? color : theme.border,
                    backgroundColor: active ? color + '14' : theme.card,
                    padding: theme.spacing.lg,
                  }}
                >
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color }} />
                  <Text style={{ color: theme.text, fontWeight: '600', textTransform: 'capitalize' }}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {step === 4 && (
        <View style={{ gap: 12 }}>
          <Text style={{ fontWeight: '700', color: theme.text, fontSize: 16 }}>Privacy</Text>
          {PRIVACY.map((p) => {
            const active = privacy === p.level;
            return (
              <Pressable
                key={p.level}
                onPress={() => setPrivacy(p.level)}
                style={{
                  borderRadius: theme.radius.md,
                  borderWidth: 1.5,
                  borderColor: active ? theme.accent : theme.border,
                  backgroundColor: active ? theme.accent + '14' : theme.card,
                  padding: theme.spacing.lg,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '700' }}>{p.label}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>{p.blurb}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        {step > 0 && (
          <View style={{ flex: 1 }}>
            <Button label="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          {step < TOTAL - 1 ? (
            <Button label="Next" onPress={() => setStep((s) => s + 1)} disabled={!canNext} />
          ) : (
            <Button label="Submit Problem" onPress={submit} loading={submitting} />
          )}
        </View>
      </View>
      <View style={{ height: insets.bottom + 8 }} />
    </ScrollView>
  );
}
