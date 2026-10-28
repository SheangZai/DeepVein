import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Gem } from '@/components/gem';
import { Card, Muted, Row, Screen } from '@/components/ui';
import { SHAFTS } from '@/content/shafts';
import { TIERS, type TierId } from '@/game/tiers';
import { progressStore, shaftKey } from '@/lib/progress';
import { useStore } from '@/lib/storage';
import { C, F, R, S } from '@/theme';

export default function Shafts() {
  const progress = useStore(progressStore);

  return (
    <Screen>
      <Muted>Themed digs, level by level. Every shaft is open.</Muted>
      {SHAFTS.map((shaft) => {
        return (
          <Card key={shaft.id}>
            <Row>
              <View style={styles.emojiBox}>
                <Text style={styles.emoji}>{shaft.emoji}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.title}>{shaft.title}</Text>
                <Muted>{shaft.blurb}</Muted>
              </View>
            </Row>
            <View style={styles.levels}>
              {Array.from({ length: shaft.levels }, (_, i) => i + 1).map((level) => {
                const r = progress.shafts[shaftKey(shaft.id, level)];
                const best = r?.answers.reduce<TierId>((b, a) => (a.points > TIERS[b].points ? a.tier : b), 'miss');
                return (
                  <Pressable
                    key={level}
                    accessibilityLabel={`Level ${level}`}
                    onPress={() =>
                      router.push({ pathname: '/dig', params: { mode: 'shaft', shaft: shaft.id, level: String(level) } })
                    }
                    style={({ pressed }) => [styles.level, r && styles.levelDone, pressed && styles.pressed]}>
                    {r ? (
                      <Gem tier={best ?? 'miss'} size={26} />
                    ) : (
                      <Text style={styles.levelText}>{level}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  emojiBox: {
    width: 48,
    height: 48,
    borderRadius: R.md,
    backgroundColor: C.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  title: { color: C.text, fontSize: 20, fontFamily: F.display },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginTop: S.xs },
  level: {
    width: 52,
    height: 52,
    borderRadius: R.md,
    backgroundColor: C.edge,
    borderColor: C.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelDone: { borderColor: C.accent, borderWidth: 2 },
  pressed: { opacity: 0.7 },
  levelText: { color: C.text, fontSize: 20, fontFamily: F.display },
});
