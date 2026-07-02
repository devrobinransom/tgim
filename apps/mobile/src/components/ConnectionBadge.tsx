import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../api';
import { theme } from '../theme';

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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: map.color }} />
      <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '600' }}>{map.label}</Text>
    </View>
  );
}
