import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { api } from '../api';
import { theme } from '../theme';
import { Text } from './typography';

/** Live connection + persistence-mode badge (mirrors the web sim's status pill). */
export function ConnectionBadge() {
  const [state, setState] = useState<'checking' | 'prisma' | 'in-memory-fallback' | 'offline'>(
    'checking',
  );

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const health = await api.health();
        if (active) setState(health.database);
      } catch {
        if (active) setState('offline');
      }
    };
    check();
    const t = setInterval(check, 4000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const map = {
    checking: { color: theme.slate[400], label: 'Connecting…' },
    prisma: { color: theme.palette.success, label: 'Postgres Live' },
    'in-memory-fallback': { color: theme.palette.info, label: 'In-Memory Simulation' },
    offline: { color: theme.palette.danger, label: 'Offline' },
  }[state];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <View style={{ width: 8, height: 8, borderRadius: theme.radius.pill, backgroundColor: map.color }} />
      <Text role="caption" color={theme.textMuted}>{map.label}</Text>
    </View>
  );
}
