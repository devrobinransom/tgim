import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { ACTIVE_AREA_ID, ACTIVE_AREA_NAME } from '../../src/config';
import { useFetch } from '../../src/hooks/useFetch';
import { theme } from '../../src/theme';

export default function ManifestoScreen() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const fetchManifesto = useCallback(() => api.manifesto.get(ACTIVE_AREA_ID), []);
  const { data, loading } = useFetch(fetchManifesto);

  const exportPdf = async () => {
    if (!data?.is_published) return;
    setMessage(null);
    try {
      const destination = `${FileSystem.cacheDirectory}tgim-manifesto-v${data.version}.pdf`;
      const result = await FileSystem.downloadAsync(api.exports.manifestoPdfUrl(data.id), destination);
      await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Share TGIM manifesto' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Manifesto export failed');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: insets.top + 12, gap: 16 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>Local Manifesto</Text>
          <Text style={{ color: theme.textMuted, marginTop: 2 }}>{ACTIVE_AREA_NAME}</Text>
        </View>
        <Badge label={data?.is_published ? 'Published' : 'Draft'} color={data?.is_published ? theme.palette.success : theme.palette.warning} />
      </View>

      {!data && !loading && (
        <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 10 }}>
          <Ionicons name="document-text" size={28} color={theme.accent} />
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>No manifesto draft yet</Text>
          <Text style={{ color: theme.textMuted }}>Party teams generate and adopt promises on web. Mobile users can read the public draft once available.</Text>
        </View>
      )}

      {data?.promises.map((promise) => (
        <View key={promise.id} style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 8 }}>
          <Badge label={promise.time_horizon} color={theme.accent} />
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{promise.title}</Text>
          <Text style={{ color: theme.textMuted }}>{promise.description}</Text>
          {promise.target_metric && <Text style={{ color: theme.text, fontWeight: '700' }}>Target: {promise.target_metric}</Text>}
        </View>
      ))}

      {data?.is_published && <Button label="Export and share PDF" variant="secondary" onPress={() => void exportPdf()} />}

      {message && <Text style={{ color: message.includes('failed') || message.includes('Requires') ? theme.palette.danger : theme.palette.success }}>{message}</Text>}
      <View style={{ height: insets.bottom + 8 }} />
    </ScrollView>
  );
}
