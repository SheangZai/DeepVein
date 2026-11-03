import { StyleSheet, Text, View } from 'react-native';

import { useOnlineCount } from '@/lib/online';
import { C, F, R } from '@/theme';

/** "● 12 miners online". Hidden until someone besides you is around. */
export function OnlinePill({ min = 2, center = false }: { min?: number; center?: boolean }) {
  const n = useOnlineCount();
  if (n === null || n < min) return null;
  return (
    <View style={[styles.pill, center && styles.center]} accessibilityLabel={`${n} miners online now`}>
      <View style={styles.dot} />
      <Text style={styles.text}>{n.toLocaleString()} miners online</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(79,209,139,0.12)',
    borderColor: 'rgba(79,209,139,0.4)',
    borderWidth: 1,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  center: { alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.good },
  text: { color: C.good, fontFamily: F.semi, fontSize: 13 },
});
