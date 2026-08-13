import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { Text } from '../src/components/typography';
import { ACTIVE_AREA_ID, ACTIVE_AREA_NAME, INTEREST_CATEGORIES, LANGUAGES } from '../src/config';
import { useI18n } from '../src/i18n';
import { api } from '../src/api';
import { useFetch } from '../src/hooks/useFetch';
import { useSession } from '../src/store/session';
import { theme } from '../src/theme';

const LOCALITY_DEFAULT = { id: ACTIVE_AREA_ID, name: ACTIVE_AREA_NAME };

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { language, setLanguage, setArea, setInterests, setRole, completeOnboarding } = useSession();

  const [step, setStep] = useState(0);
  const [selectedArea, setSelectedArea] = useState<{ id: string; name: string } | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const fetchAreas = useCallback(() => api.areas.list().catch(() => []), []);
  const { data: areas } = useFetch(fetchAreas);

  const localities = useMemo(() => {
    const all = (areas ?? [])
      .filter((area) => area.type === 'pincode' || area.type === 'ward')
      .map((area) => ({ id: area.id, name: area.name }));
    if (!selectedArea) {
      return [LOCALITY_DEFAULT, ...all.filter((area) => area.id !== ACTIVE_AREA_ID)].slice(0, 12);
    }
    return all.length ? all : [LOCALITY_DEFAULT];
  }, [areas, selectedArea]);

  const toggleInterest = (key: string) => {
    setSelectedInterests((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  };

  const enter = () => {
    setRole('citizen');
    setLanguage(language);
    setArea(selectedArea ?? LOCALITY_DEFAULT);
    setInterests(selectedInterests);
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: insets.top + theme.spacing.xl, gap: theme.spacing.xl }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text role="logo" color={theme.text} style={{ letterSpacing: 0.5 }}>
            TG<Text color={theme.accent}>•</Text>M
          </Text>
          <Text role="micro" color={theme.textMuted} style={{ letterSpacing: 2, marginTop: theme.spacing.xs }}>
            THE GREAT INDIAN MANIFESTO
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {LANGUAGES.map((l) => {
            const active = language === l.code;
            return (
              <Pressable
                key={l.code}
                onPress={() => setLanguage(l.code)}
                accessibilityRole="button"
                accessibilityLabel={l.label}
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: active ? theme.accent : theme.border,
                  backgroundColor: active ? theme.accent : theme.card,
                }}
              >
                <Text role="small" color={active ? '#fff' : theme.text}>{l.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Step indicator */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= step ? theme.accent : theme.slate[200],
            }}
          />
        ))}
      </View>

      {step === 0 && (
        <>
          <Text role="display" color={theme.text}>
            {t('valueStatement')}
          </Text>
          <Text role="body" color={theme.textMuted}>{t('whatsHappeningNearYou')}</Text>
        </>
      )}

      {step === 1 && (
        <>
          <Text role="h1" color={theme.text}>{t('whereDoYouLive')}</Text>
          <Text role="body" color={theme.textMuted}>{t('whereDoYouLiveBody')}</Text>
          <View style={{ gap: theme.spacing.sm }}>
            {localities.map((area) => {
              const active = (selectedArea?.id ?? ACTIVE_AREA_ID) === area.id;
              return (
                <Pressable
                  key={area.id}
                  onPress={() => setSelectedArea(area)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: active ? theme.accent + '14' : theme.card,
                    borderColor: active ? theme.accent : theme.border,
                    borderWidth: 1.5,
                    borderRadius: theme.radius.lg,
                    padding: theme.spacing.lg,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                    <Ionicons name="location" size={18} color={active ? theme.accent : theme.textMuted} />
                    <View>
                      <Text role="h3" color={theme.text}>{area.name}</Text>
                      <Text role="small" color={theme.textMuted}>{t('locality')}</Text>
                    </View>
                  </View>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: theme.radius.pill,
                      borderWidth: 2,
                      borderColor: active ? theme.accent : theme.border,
                      backgroundColor: active ? theme.accent : 'transparent',
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {step === 2 && (
        <>
          <Text role="h1" color={theme.text}>{t('whatMattersToYou')}</Text>
          <Text role="body" color={theme.textMuted}>{t('whatMattersToYouBody')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {INTEREST_CATEGORIES.map((item) => {
              const active = selectedInterests.includes(item.key);
              return (
                <Pressable
                  key={item.key}
                  onPress={() => toggleInterest(item.key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.md,
                    borderRadius: theme.radius.pill,
                    borderWidth: 1,
                    borderColor: active ? theme.accent : theme.border,
                    backgroundColor: active ? theme.accent + '14' : theme.card,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={16} color={active ? theme.accent : theme.textMuted} />
                  <Text role="bodyStrong" color={active ? theme.accent : theme.text}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <View style={{ gap: theme.spacing.md }}>
        {step < 2 ? (
          <Button label={t('next')} onPress={() => setStep(step + 1)} />
        ) : (
          <Button label={t('enterApp')} onPress={enter} />
        )}
        {step > 0 && (
          <Button label={t('back')} variant="secondary" onPress={() => setStep(step - 1)} />
        )}
      </View>
      <View style={{ height: insets.bottom + theme.spacing.md }} />
    </ScrollView>
  );
}