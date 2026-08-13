import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { theme } from '../../src/theme';
import { useI18n } from '../../src/i18n';

/**
 * Five-tab IA: Home · Explore · Report · Promises · You.
 *
 * The specialist flows (verify, manifesto, participate, tracker) are removed
 * from the tab bar but stay route-resolvable for deep links and workspaces
 * inside "You", so existing URLs and share links keep working.
 */
export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.slate[400],
        tabBarStyle: { borderTopColor: theme.border, backgroundColor: theme.card },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarButtonTestID: 'tab-home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('explore'),
          tabBarButtonTestID: 'tab-explore',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: t('report'),
          tabBarButtonTestID: 'tab-report',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="promises"
        options={{
          title: t('promises'),
          tabBarButtonTestID: 'tab-promises',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: t('you'),
          tabBarButtonTestID: 'tab-me',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
        }}
      />
      {/*
        Hidden-but-routable specialist screens. They no longer appear in the
        tab bar; navigation happens through "You" workspaces and deep links.
        `href: null` keeps them out of the auto-generated bottom bar entirely.
      */}
      <Tabs.Screen name="verify" options={{ href: null }} />
      <Tabs.Screen name="manifesto" options={{ href: null }} />
      <Tabs.Screen name="participate" options={{ href: null }} />
      <Tabs.Screen name="tracker" options={{ href: null }} />
    </Tabs>
  );
}