import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GemRow } from '@/components/gem';
import { Icon } from '@/components/icons';
import { Strata } from '@/components/strata';
import { Muted } from '@/components/ui';
import { currentDigNo, digDateLabel } from '@/game/schedule';
import { progressStore } from '@/lib/progress';
import { useStore } from '@/lib/storage';
import { C, F, R, S } from '@/theme';

export default function Archive() {
  const progress = useStore(progressStore);
  const today = currentDigNo();
  const digs = Array.from({ length: Math.max(0, today - 1) }, (_, i) => today - 1 - i);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Strata />
      <FlatList
        data={digs}
        keyExtractor={(n) => String(n)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Muted style={styles.header}>
            Every past daily dig. Play any you missed.
          </Muted>
        }
        ListEmptyComponent={<Muted>No past digs yet. Come back tomorrow!</Muted>}
        renderItem={({ item: digNo }) => {
          const played = progress.daily[digNo] ?? progress.archive[digNo];
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: '/dig', params: { mode: 'archive', dig: String(digNo) } })}>
              <View style={styles.flex}>
                <Text style={styles.title}>Dig #{digNo}</Text>
                <Muted>{digDateLabel(digNo)}</Muted>
              </View>
              {played ? (
                <View style={styles.right}>
                  <GemRow answers={played.answers} size={16} gap={2} />
                  <Muted style={styles.pts}>{played.score} pts</Muted>
                </View>
              ) : (
                <View style={styles.dig}>
                  <Text style={styles.badge}>Dig</Text>
                  <Icon name="chevron" size={18} color={C.accent} strokeWidth={2.6} />
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { padding: S.lg, gap: S.sm },
  header: { marginBottom: S.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderColor: C.border,
    borderTopColor: C.highlight,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderBottomColor: C.edge,
    borderRadius: R.md,
    padding: S.lg,
    gap: S.md,
  },
  pressed: { opacity: 0.8 },
  flex: { flex: 1 },
  title: { color: C.text, fontSize: 18, fontFamily: F.display },
  right: { alignItems: 'flex-end', gap: 4 },
  pts: { fontSize: 12 },
  dig: { flexDirection: 'row', alignItems: 'center' },
  badge: { color: C.accent, fontFamily: F.bold, fontSize: 16 },
});
