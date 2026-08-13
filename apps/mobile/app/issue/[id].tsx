import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@tgim/shared';
import type { IssueCategory } from '@tgim/shared';
import { api } from '../../src/api';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { useFetch } from '../../src/hooks/useFetch';
import { theme } from '../../src/theme';

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const fetchIssue = useCallback(() => api.issues.get(String(id)), [id]);
  const { data: issue, loading, reload } = useFetch(fetchIssue);

  const support = async () => {
    if (!id) return;
    setMessage(null);
    try {
      await api.issues.support(String(id));
      reload();
      setMessage('Support recorded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Support failed');
    }
  };

  const color = issue ? tokens.categoryColor[issue.category as IssueCategory] ?? theme.accent : theme.accent;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: insets.top + 12, gap: 16 }}
    >
      {loading && <Text style={{ color: theme.textMuted }}>Loading issue...</Text>}
      {issue && (
        <>
          <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 10 }}>
            <Badge label={issue.category} color={color} />
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>{issue.description}</Text>
            <Text style={{ color: theme.textMuted }}>Severity: {issue.severity} • Privacy: {issue.privacy}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="location" size={16} color={theme.textMuted} />
              <Text style={{ color: theme.textMuted }}>
                Public pin {issue.public_latitude?.toFixed(4)}, {issue.public_longitude?.toFixed(4)}
              </Text>
            </View>
          </View>
          <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 10 }}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>{issue.supports} supporter(s)</Text>
            <Text style={{ color: theme.textMuted }}>Supporting helps prioritize cluster verification and manifesto generation.</Text>
            <Button label="Support this issue" onPress={support} />
          </View>
        </>
      )}
      {message && <Text style={{ color: message.includes('failed') ? theme.palette.danger : theme.palette.success }}>{message}</Text>}
      <View style={{ height: insets.bottom + 8 }} />
    </ScrollView>
  );
}
