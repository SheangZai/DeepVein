import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import type { BuddyInfo } from '@/game/tiers';
import { progressStore, setBuddy } from '@/lib/progress';
import { useStore } from '@/lib/storage';
import { C, F, R, S } from '@/theme';

import { Button, Label, Muted } from './ui';

function why(b: BuddyInfo) {
  const u = b.unlock;
  if (u.kind === 'luck') return 'It was hiding in the rubble. Pure luck!';
  if (u.kind === 'ores') return `You’ve dug ${u.count} ores.`;
  if (u.kind === 'rare') return `You’ve dug ${u.count} Emeralds or better.`;
  return `You kept a ${u.days}-day streak.`;
}

/** Celebration card for buddies unlocked by the dig that just finished. */
export function BuddyFound({ buddies }: { buddies: BuddyInfo[] }) {
  const progress = useStore(progressStore);
  const [i, setI] = useState(0);
  const b = buddies[Math.min(i, buddies.length - 1)];
  const using = progress.buddy === b.id;
  return (
    <Animated.View key={b.id} entering={ZoomIn.springify().damping(12)} style={styles.card}>
      <Label>NEW BUDDY FOUND</Label>
      <View style={styles.circle}>
        <Text style={styles.emoji}>{b.emoji}</Text>
      </View>
      <Text style={styles.name}>{b.name}</Text>
      <Muted style={styles.center}>{why(b)}</Muted>
      <Button
        label={using ? 'Digging with you' : 'Bring it along'}
        icon="check"
        disabled={using}
        onPress={() => setBuddy(b.id)}
      />
      {i < buddies.length - 1 && <Button label="Next buddy" variant="ghost" onPress={() => setI(i + 1)} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: S.sm,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 2,
    borderColor: C.accent,
    backgroundColor: 'rgba(255,193,69,0.08)',
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 56, lineHeight: 68 },
  name: { color: C.text, fontFamily: F.display, fontSize: 24 },
  center: { textAlign: 'center' },
});
