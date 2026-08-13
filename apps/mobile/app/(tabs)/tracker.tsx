import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { Badge } from '../../src/components/Badge';
import { useFetch } from '../../src/hooks/useFetch';
import { theme } from '../../src/theme';

export default function TrackerScreen() {
  const insets = useSafeAreaInsets();
  const fetchPromises = useCallback(() => api.party.listPromises(), []);
  const { data: promises, loading } = useFetch(fetchPromises);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: insets.top + 12, gap: 16 }}
    >
      <View>
        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>Promise Tracker</Text>
        <Text style={{ color: theme.textMuted, marginTop: 2 }}>Adopted promises and delivery status</Text>
      </View>

      {loading && <Text style={{ color: theme.textMuted }}>Loading promises...</Text>}
      {!loading && (!promises || promises.length === 0) && (
        <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 8 }}>
          <Ionicons name="checkmark-done-circle" size={28} color={theme.accent} />
          <Text style={{ color: theme.text, fontWeight: '800' }}>No adopted promises yet</Text>
          <Text style={{ color: theme.textMuted }}>Once a party adopts manifesto promises on web, voters will track them here.</Text>
        </View>
      )}

      {promises?.map((promise) => (
        <View key={promise.id} style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 8 }}>
          <Badge label={promise.status} color={promise.status === 'delayed' ? theme.palette.danger : theme.palette.success} />
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{promise.adopted_title}</Text>
          <Text style={{ color: theme.textMuted }}>{promise.adopted_description}</Text>
          <Text style={{ color: theme.text, fontWeight: '700' }}>Metric: {promise.target_metric}</Text>
        </View>
      ))}

      <View style={{ height: insets.bottom + 8 }} />
    </ScrollView>
  );
}
