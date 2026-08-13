import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
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
      contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: insets.top + 24, gap: 24 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: theme.text, letterSpacing: 0.5 }}>
            TG<Text style={{ color: theme.accent }}>•</Text>M
          </Text>
          <Text style={{ fontSize: 10, letterSpacing: 2, fontWeight: '800', color: theme.textMuted, marginTop: 2 }}>
            THE GREAT INDIAN MANIFESTO
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {LANGUAGES.map((l) => {
            const active = language === l.code;
            return (
              <Pressable
                key={l.code}
                onPress={() => setLanguage(l.code)}
                accessibilityRole="button"
                accessibilityLabel={l.label}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: active ? theme.accent : theme.border,
                  backgroundColor: active ? theme.accent : theme.card,
                }}
              >
                <Text style={{ color: active ? '#fff' : theme.text, fontWeight: '600', fontSize: 12 }}>{l.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Step indicator */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
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
          <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text, lineHeight: 31 }}>
            {t('valueStatement')}
          </Text>
          <Text style={{ color: theme.textMuted }}>{t('whatsHappeningNearYou')}</Text>
        </>
      )}

      {step === 1 && (
        <>
          <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>{t('whereDoYouLive')}</Text>
          <Text style={{ color: theme.textMuted }}>{t('whereDoYouLiveBody')}</Text>
          <View style={{ gap: 8 }}>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="location" size={18} color={active ? theme.accent : theme.textMuted} />
                    <View>
                      <Text style={{ fontWeight: '700', color: theme.text, fontSize: 16 }}>{area.name}</Text>
                      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{t('locality')}</Text>
                    </View>
                  </View>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
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
          <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>{t('whatMattersToYou')}</Text>
          <Text style={{ color: theme.textMuted }}>{t('whatMattersToYouBody')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: theme.radius.pill,
                    borderWidth: 1,
                    borderColor: active ? theme.accent : theme.border,
                    backgroundColor: active ? theme.accent + '14' : theme.card,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={16} color={active ? theme.accent : theme.textMuted} />
                  <Text style={{ color: active ? theme.accent : theme.text, fontWeight: '700', fontSize: 14 }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <View style={{ gap: 10 }}>
        {step < 2 ? (
          <Button label={t('next')} onPress={() => setStep(step + 1)} />
        ) : (
          <Button label={t('enterApp')} onPress={enter} />
        )}
        {step > 0 && (
          <Button label={t('back')} variant="secondary" onPress={() => setStep(step - 1)} />
        )}
      </View>
      <View style={{ height: insets.bottom + 12 }} />
    </ScrollView>
  );
}