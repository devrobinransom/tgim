import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UserRole } from '@tgim/shared';
import { Button } from '../src/components/Button';
import { LANGUAGES, ACTIVE_AREA_NAME } from '../src/config';
import { useSession } from '../src/store/session';
import { theme } from '../src/theme';

type PublicMobileRole = Extract<UserRole, 'citizen' | 'volunteer'>;

const ROLES: { role: PublicMobileRole; label: string; blurb: string }[] = [
  { role: 'citizen', label: 'Citizen', blurb: 'Report & support local issues' },
  { role: 'volunteer', label: 'Volunteer', blurb: 'Verify clusters in the field' },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role, language, setRole, setLanguage, completeOnboarding } = useSession();
  const [selectedRole, setSelectedRole] = useState<PublicMobileRole>(
    role === 'volunteer' ? 'volunteer' : 'citizen',
  );

  const start = () => {
    setRole(selectedRole);
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: insets.top + 24, gap: 24 }}
    >
      <View>
        <Text style={{ fontSize: 30, fontWeight: '900', color: theme.text, letterSpacing: 0.5 }}>
          TG<Text style={{ color: theme.accent }}>•</Text>M
        </Text>
        <Text style={{ fontSize: 10, letterSpacing: 2, fontWeight: '800', color: theme.textMuted, marginTop: 2 }}>
          THE GREAT INDIAN MANIFESTO
        </Text>
      </View>

      <Text style={{ fontSize: 26, fontWeight: '800', color: theme.text, lineHeight: 32 }}>
        Report issues, verify what matters, and track every <Text style={{ color: theme.accent }}>promise</Text>.
      </Text>

      <View style={{ gap: 10 }}>
        <Text style={{ fontWeight: '700', color: theme.text }}>Use TGIM as a...</Text>
        {ROLES.map((r) => {
          const active = selectedRole === r.role;
          return (
            <Pressable
              key={r.role}
              onPress={() => setSelectedRole(r.role)}
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
              <View>
                <Text style={{ fontWeight: '700', color: theme.text, fontSize: 16 }}>{r.label}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>{r.blurb}</Text>
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

      <View style={{ gap: 10 }}>
        <Text style={{ fontWeight: '700', color: theme.text }}>Language</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {LANGUAGES.map((l) => {
            const active = language === l.code;
            return (
              <Pressable
                key={l.code}
                onPress={() => setLanguage(l.code)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: active ? theme.accent : theme.border,
                  backgroundColor: active ? theme.accent : theme.card,
                }}
              >
                <Text style={{ color: active ? '#fff' : theme.text, fontWeight: '600' }}>{l.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.border,
          padding: theme.spacing.lg,
        }}
      >
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>Your area</Text>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginTop: 2 }}>
          📍 {ACTIVE_AREA_NAME}, Mumbai Suburban
        </Text>
      </View>

      <Button label="Enter public app" onPress={start} />
      <View style={{ height: insets.bottom + 12 }} />
    </ScrollView>
  );
}
