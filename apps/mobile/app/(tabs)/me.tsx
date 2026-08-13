import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';
import { useState } from 'react';
import type { UserNotification } from '@tgim/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { clearSynced, sync, useDraftQueue } from '../../src/store/draftQueue';
import { useSession } from '../../src/store/session';
import { theme } from '../../src/theme';
import { api } from '../../src/api';
import { useI18n } from '../../src/i18n';
import { syncVerifications } from '../../src/store/verificationQueue';
import { ACTIVE_AREA_ID } from '../../src/config';
import { useOidcSession } from '../../src/store/oidc';

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { role, language } = useSession();
  const { pendingCount, drafts } = useDraftQueue();
  const [message, setMessage] = useState<string | null>(null);
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const identity = useOidcSession();

  const applyToVolunteer = async () => {
    try {
      await api.volunteers.apply({
        motivation: 'I want to verify local civic reports carefully and safely in my community.',
        languages: [language],
      });
      setMessage('Application sent. An administrator will review it.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Application could not be sent.');
    }
  };

  const enableNotifications = async () => {
    try {
      await api.notifications.updatePreferences({
        channels: ['in_app'], saved_area_ids: [ACTIVE_AREA_ID], issue_updates: true,
        promise_updates: true, language: language === 'hi' || language === 'mr' ? language : 'en',
      });
      setMessage('Private in-app updates enabled. Push delivery is disabled in sovereign mode.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Notifications could not be enabled.');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: insets.top + 12, gap: 16 }}
    >
      <View>
        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>{t('myTgim')}</Text>
        <Text style={{ color: theme.textMuted, marginTop: 2 }}>Public app profile and sync state</Text>
      </View>

      {role === 'citizen' && (
        <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 10 }}>
          <Text selectable style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Become a civic volunteer</Text>
          <Text selectable style={{ color: theme.textMuted }}>Approved volunteers can verify clustered reports in the field.</Text>
          <Button label="Apply for review" onPress={() => void applyToVolunteer()} />
          {message && <Text selectable style={{ color: theme.textMuted }}>{message}</Text>}
        </View>
      )}

      <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 10 }}>
        <Ionicons name="person-circle" size={38} color={theme.accent} />
        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 17, textTransform: 'capitalize' }}>{role.replace('_', ' ')}</Text>
        <Text style={{ color: theme.textMuted }}>Language: {language}</Text>
        <Text style={{ color: theme.textMuted }}>{identity.configured ? (identity.authenticated ? 'Sovereign identity signed in' : 'Sign in to submit or verify records') : 'OIDC not configured in this build'}</Text>
        {identity.configured && !identity.authenticated ? <Button label="Sign in securely" onPress={() => void identity.signIn()} disabled={identity.busy} /> : null}
        {identity.authenticated ? <Button label="Sign out" variant="secondary" onPress={() => void identity.signOut()} disabled={identity.busy} /> : null}
        {identity.error ? <Text selectable style={{ color: theme.palette.danger }}>{identity.error}</Text> : null}
      </View>

      <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 10 }}>
        <Text selectable style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Updates</Text>
        <Text selectable style={{ color: theme.textMuted }}>Receive issue and promise changes for saved areas.</Text>
        <Button label="Enable in-app updates" variant="secondary" onPress={() => void enableNotifications()} />
        <Button label="Check in-app updates" variant="secondary" onPress={() => void api.notifications.list().then(setNotifications).catch(error => setMessage(error instanceof Error ? error.message : 'Updates could not be loaded.'))} />
        {notifications.map(notification => <View key={notification.id} style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 }}><Text selectable style={{ color: theme.text, fontWeight: '700' }}>{notification.title}</Text><Text selectable style={{ color: theme.textMuted }}>{notification.body}</Text></View>)}
        {message && <Text selectable style={{ color: theme.textMuted }}>{message}</Text>}
      </View>

      <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: 10 }}>
        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Offline queue</Text>
        <Text style={{ color: theme.textMuted }}>{pendingCount} report(s) pending, {drafts.length - pendingCount} synced.</Text>
        <Button label={t('sync')} onPress={() => void Promise.all([sync(), syncVerifications()])} />
        <Button label="Clear synced reports" variant="secondary" onPress={() => void clearSynced()} />
      </View>

      <View style={{ height: insets.bottom + 8 }} />
    </ScrollView>
  );
}
