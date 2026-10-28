import { StyleSheet, Text, View } from 'react-native';

import { START_FUSE_MS, START_HEARTS } from '@/game/tnt';
import { C, F, R, S } from '@/theme';

/** Big two-tone "TNT TOSS" header used on the lobby, room and game-over screens. */
export function TntTitle({
  title = 'TNT TOSS',
  tagline = 'pass the TNT · don’t let it blow on you',
}: {
  title?: string;
  tagline?: string;
}) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.tagline}>{tagline}</Text>
    </View>
  );
}

export function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/** Miners / lives / fuse summary row for lobbies. */
export function TntStats({ miners }: { miners: number }) {
  return (
    <View style={styles.stats}>
      <StatBox label="MINERS" value={`${miners}`} />
      <StatBox label="LIVES" value={`${START_HEARTS}`} />
      <StatBox label="FUSE" value={`${START_FUSE_MS / 1000}s`} />
    </View>
  );
}

export function Waiting({ text }: { text: string }) {
  return <Text style={styles.waiting}>▸ {text}</Text>;
}

const styles = StyleSheet.create({
  titleBlock: { alignItems: 'center', gap: 2, marginTop: S.xs },
  title: {
    color: C.accent,
    fontFamily: F.display,
    fontSize: 42,
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: C.danger,
    textShadowOffset: { width: 3, height: 0 },
    textShadowRadius: 0,
  },
  tagline: { color: C.muted, fontFamily: F.medium, fontSize: 12, letterSpacing: 2, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: S.sm },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    backgroundColor: 'rgba(14,9,6,0.9)',
    paddingVertical: 6,
  },
  statLabel: { color: C.muted, fontFamily: F.bold, fontSize: 9, letterSpacing: 2.5 },
  statValue: { color: C.accent, fontFamily: F.display, fontSize: 20 },
  waiting: {
    textAlign: 'center',
    color: C.muted,
    fontFamily: F.bold,
    fontSize: 13,
    letterSpacing: 1.5,
    paddingVertical: S.md,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    backgroundColor: 'rgba(14,9,6,0.9)',
  },
});
