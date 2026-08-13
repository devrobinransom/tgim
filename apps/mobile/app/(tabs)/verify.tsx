import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@tgim/shared';
import type { IssueCategory } from '@tgim/shared';
import { api } from '../../src/api';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { ACTIVE_AREA_NAME } from '../../src/config';
import { useFetch } from '../../src/hooks/useFetch';
import { useSession } from '../../src/store/session';
import { theme } from '../../src/theme';
import { enqueueVerification, syncVerifications } from '../../src/store/verificationQueue';

const checklistDefaults = {
  location_matches: true,
  evidence_is_clear: true,
  duplicate_checked: true,
};

export default function VolunteerVerify() {
  const insets = useSafeAreaInsets();
  const { role } = useSession();
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchIssues = useCallback(() => api.issues.list(), []);
  const { data: issues, loading, reload } = useFetch(fetchIssues);
  const fetchAssignments = useCallback(() => role === 'volunteer' ? api.verification.assignments() : Promise.resolve([]), [role]);
  const { data: assignments } = useFetch(fetchAssignments);

  const clusters = useMemo(() => {
    const seen = new Set<string>();
    const assignedIds = new Set((assignments ?? []).map(item => item.cluster_id));
    return (issues ?? [])
      .filter((issue) => issue.cluster_id)
      .filter(issue => assignedIds.size === 0 || assignedIds.has(issue.cluster_id!))
      .filter((issue) => {
        if (!issue.cluster_id || seen.has(issue.cluster_id)) return false;
        seen.add(issue.cluster_id);
        return true;
      });
  }, [assignments, issues]);

  const active = clusters.find((issue) => issue.cluster_id === selectedClusterId) ?? clusters[0];

  const submitVerification = async (outcome: 'verified' | 'rejected') => {
    if (!active?.cluster_id) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await enqueueVerification({
        cluster_id: active.cluster_id,
        outcome,
        notes: notes.trim() || undefined,
        checklist: checklistDefaults,
      });
      const result = await syncVerifications();
      setMessage(result.synced > 0 ? (outcome === 'verified' ? 'Cluster verified for manifesto review.' : 'Cluster rejected with notes.') : 'Verification saved offline and will sync later.');
      setNotes('');
      reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: insets.top + 12, gap: 16 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>Verification</Text>
          <Text style={{ color: theme.textMuted, marginTop: 2 }}>{ACTIVE_AREA_NAME} field queue</Text>
        </View>
        <Badge label={role === 'volunteer' ? 'Volunteer' : 'View only'} color={role === 'volunteer' ? theme.palette.success : theme.slate[400]} />
      </View>

      {loading && <Text style={{ color: theme.textMuted }}>Loading clusters...</Text>}
      {!loading && clusters.length === 0 && (
        <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 8 }}>
          <Ionicons name="shield-checkmark" size={26} color={theme.accent} />
          <Text style={{ color: theme.text, fontWeight: '800' }}>No verification queue yet</Text>
          <Text style={{ color: theme.textMuted }}>Citizen reports appear here after they are clustered.</Text>
        </View>
      )}

      {clusters.map((issue) => {
        const activeCard = issue.cluster_id === (selectedClusterId ?? active?.cluster_id);
        const color = tokens.categoryColor[issue.category as IssueCategory] ?? theme.accent;
        return (
          <Pressable
            key={issue.cluster_id}
            onPress={() => setSelectedClusterId(issue.cluster_id ?? null)}
            style={{
              backgroundColor: activeCard ? color + '12' : theme.card,
              borderRadius: theme.radius.lg,
              borderWidth: 1.5,
              borderColor: activeCard ? color : theme.border,
              padding: theme.spacing.md,
              gap: 8,
            }}
          >
            <Badge label={issue.category} color={color} />
            <Text style={{ color: theme.text, fontWeight: '700' }}>{issue.description}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Cluster {issue.cluster_id}</Text>
          </Pressable>
        );
      })}

      {active?.cluster_id && (
        <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 12 }}>
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Field checklist</Text>
          {assignments?.find(item => item.cluster_id === active.cluster_id)?.safety_notes && <Text selectable style={{ color: theme.palette.warning }}>Safety: {assignments.find(item => item.cluster_id === active.cluster_id)?.safety_notes}</Text>}
          {Object.entries(checklistDefaults).map(([key]) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="checkmark-circle" size={18} color={theme.palette.success} />
              <Text style={{ color: theme.text, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</Text>
            </View>
          ))}
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Add field notes, landmark, timing, or duplicate context..."
            placeholderTextColor={theme.slate[400]}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: theme.radius.md,
              minHeight: 92,
              padding: theme.spacing.md,
              color: theme.text,
              textAlignVertical: 'top',
            }}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label="Reject" variant="secondary" loading={submitting} onPress={() => submitVerification('rejected')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Verify" loading={submitting} onPress={() => submitVerification('verified')} />
            </View>
          </View>
          {message && <Text style={{ color: message.includes('failed') ? theme.palette.danger : theme.palette.success }}>{message}</Text>}
        </View>
      )}

      <View style={{ height: insets.bottom + 8 }} />
    </ScrollView>
  );
}
