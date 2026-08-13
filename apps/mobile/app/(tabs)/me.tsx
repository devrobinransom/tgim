import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { UserNotification, UserRole } from '@tgim/shared';
import { useActiveArea } from '../../src/area';
import { useI18n } from '../../src/i18n';
import { Button } from '../../src/components/Button';
import { ConnectionBadge } from '../../src/components/ConnectionBadge';
import { Screen, SectionHeader, TopBar } from '../../src/components/ProductPrimitives';
import { Text } from '../../src/components/typography';
import { clearSynced, sync, useDraftQueue } from '../../src/store/draftQueue';
import { useSession } from '../../src/store/session';
import { useOidcSession } from '../../src/store/oidc';
import { syncVerifications } from '../../src/store/verificationQueue';
import { theme } from '../../src/theme';
import { api } from '../../src/api';

const VERIFY_ROLES: UserRole[] = ['volunteer', 'platform_moderator', 'platform_admin'];
const PARTICIPATE_ROLES: UserRole[] = ['party_lead', 'platform_moderator', 'platform_admin'];

export default function YouScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { role, language } = useSession();
  const { areaId } = useActiveArea();
  const { pendingCount, drafts } = useDraftQueue();
  const [message, setMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const identity = useOidcSession();

  const canVerify = VERIFY_ROLES.includes(role);
  const canParticipate = PARTICIPATE_ROLES.includes(role);

  const applyToVolunteer = async () => {
    try {
      await api.volunteers.apply({
        motivation: 'I want to verify local civic reports carefully and safely in my community.',
        languages: [language],
      });
      setMessage(t('volunteerApplied'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('volunteerApplyFailed'));
    }
  };

  const enableNotifications = async () => {
    try {
      await api.notifications.updatePreferences({
        channels: ['in_app'], saved_area_ids: [areaId], issue_updates: true,
        promise_updates: true, language: language === 'hi' || language === 'mr' ? language : 'en',
      });
      setMessage(t('updatesEnabled'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('updatesLoadFailed'));
    }
  };

  return (
    <Screen>
      <TopBar title={t('you')} subtitle={t('publicProfile')} right={<ConnectionBadge />} />

      {/* Identity card */}
      <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <Ionicons name="person-circle" size={38} color={theme.accent} />
        <Text role="h3" color={theme.text} style={{ textTransform: 'capitalize' }}>{role.replace('_', ' ')}</Text>
        <Text role="body" color={theme.textMuted}>{`${t('languageLabel')}: ${language}`}</Text>
        <Text role="body" color={theme.textMuted}>
          {identity.configured ? (identity.authenticated ? t('sovereignIdentity') : t('signInToSubmit')) : t('oidcNotConfigured')}
        </Text>
        {identity.configured && !identity.authenticated ? <Button label={t('signInSecurely')} onPress={() => void identity.signIn()} disabled={identity.busy} /> : null}
        {identity.authenticated ? <Button label={t('signOut')} variant="secondary" onPress={() => void identity.signOut()} disabled={identity.busy} /> : null}
        {identity.error ? <Text role="body" selectable color={theme.palette.danger}>{identity.error}</Text> : null}
      </View>

      {/* Role workspaces */}
      <SectionHeader title={t('workspaces')} />
      <WorkspaceCard
        icon="shield-checkmark"
        title={t('verifyWorkspace')}
        body={t('verifyWorkspaceBody')}
        available={canVerify}
        unavailableLabel={t('workspaceUnavailable')}
        onPress={() => canVerify && router.push('/(tabs)/verify')}
      />
      <WorkspaceCard
        icon="checkbox"
        title={t('participateWorkspace')}
        body={t('participateWorkspaceBody')}
        available={canParticipate}
        unavailableLabel={t('workspaceUnavailable')}
        onPress={() => canParticipate && router.push('/(tabs)/participate')}
      />

      {role === 'citizen' && (
        <View style={{ backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <Text role="h3" selectable color={theme.text}>{t('becomeVolunteer')}</Text>
          <Text role="body" selectable color={theme.textMuted}>{t('becomeVolunteerBody')}</Text>
          <Button label={t('applyForReview')} onPress={() => void applyToVolunteer()} />
          {message && <Text role="body" selectable color={theme.textMuted}>{message}</Text>}
        </View>
      )}

      {/* Updates */}
      <SectionHeader title={t('updatesTitle')} subtitle={t('updatesBody')} />
      <View style={{ gap: theme.spacing.md }}>
        <Button label={t('enableInAppUpdates')} variant="secondary" onPress={() => void enableNotifications()} />
        <Button label={t('checkInAppUpdates')} variant="secondary" onPress={() => void api.notifications.list().then(setNotifications).catch(error => setMessage(error instanceof Error ? error.message : t('updatesLoadFailed')))} />
        {notifications.map(notification => (
          <View key={notification.id} style={{ backgroundColor: theme.card, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.md, gap: theme.spacing.xs }}>
            <Text role="bodyStrong" selectable color={theme.text}>{notification.title}</Text>
            <Text role="body" selectable color={theme.textMuted}>{notification.body}</Text>
          </View>
        ))}
      </View>

      {/* Offline queue */}
      <SectionHeader title={t('offlineQueue')} />
      <View style={{ gap: theme.spacing.md }}>
        <Text role="body" color={theme.textMuted}>{`${pendingCount} ${t('pendingReports')}, ${drafts.length - pendingCount} ${t('clearSynced')}`}</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}><Button label={t('enqueueSync')} onPress={() => void Promise.all([sync(), syncVerifications()])} /></View>
          <View style={{ flex: 1 }}><Button label={t('clearSynced')} variant="secondary" onPress={() => void clearSynced()} /></View>
        </View>
      </View>
    </Screen>
  );
}

function WorkspaceCard({
  icon,
  title,
  body,
  available,
  unavailableLabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  available: boolean;
  unavailableLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!available}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        backgroundColor: theme.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: theme.spacing.lg,
        opacity: available ? (pressed ? 0.85 : 1) : 0.55,
      })}
    >
      <View style={{ width: 42, height: 42, borderRadius: theme.radius.pill, backgroundColor: theme.accent + '14', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={22} color={theme.accent} />
      </View>
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <Text role="h3" color={theme.text}>{title}</Text>
        <Text role="label" color={theme.textMuted}>{body}</Text>
        {!available ? <Text role="small" color={theme.palette.warning}>{unavailableLabel}</Text> : null}
      </View>
      {available ? <Ionicons name="chevron-forward" size={18} color={theme.slate[400]} /> : null}
    </Pressable>
  );
}