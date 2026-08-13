import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ConnectionBadge } from '../../src/components/ConnectionBadge';
import { MapPreview, QueueCard, Screen, SearchSurface, TopBar } from '../../src/components/ProductPrimitives';
import { StatCard } from '../../src/components/StatCard';
import { ACTIVE_AREA_NAME, SEED_PINCODES } from '../../src/config';
import { api } from '../../src/api';
import { useFetch } from '../../src/hooks/useFetch';
import { theme } from '../../src/theme';

export default function MapDashboard() {
  const router = useRouter();
  const fetchIssues = useCallback(() => api.issues.list(), []);
  const { data: issues, loading } = useFetch(fetchIssues);

  const list = issues ?? [];
  const categories = new Set(list.map((i) => i.category));
  const topIssues = [...list].slice(0, 5);

  return (
    <Screen>
      <TopBar
        title={(
          <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>
          TG<Text style={{ color: theme.accent }}>•</Text>M
          </Text>
        )}
        subtitle={ACTIVE_AREA_NAME}
        right={<ConnectionBadge />}
      />

      <SearchSurface label={`Search ${ACTIVE_AREA_NAME}...`} />

      <MapPreview issues={list} />

      {/* Area stat cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatCard value={loading ? '—' : String(list.length)} label="Citizen Inputs" accent={theme.accent} />
        <StatCard value={String(categories.size)} label="Active Categories" />
        <StatCard value={String(SEED_PINCODES.length)} label="Pincodes Covered" />
        <StatCard value={ACTIVE_AREA_NAME} label="Constituency" />
      </View>

      {/* Top issues */}
      <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text }}>Top Issues</Text>
      {topIssues.length === 0 && !loading && (
        <Text style={{ color: theme.textMuted }}>No reports yet — be the first to pin a problem.</Text>
      )}
      {topIssues.map((issue) => <QueueCard key={issue.id} issue={issue} onPress={() => router.push(`/issue/${issue.id}`)} />)}

      <Pressable
        onPress={() => router.push('/(tabs)/manifesto')}
        style={{
          backgroundColor: theme.accent,
          borderRadius: theme.radius.md,
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Generate Local Manifesto</Text>
      </Pressable>
    </Screen>
  );
}
