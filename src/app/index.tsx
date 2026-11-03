import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Gem } from '@/components/gem';
import { InviteBanner, shareInvite } from '@/components/invite-banner';
import { Icon, type IconName } from '@/components/icons';
import { Strata } from '@/components/strata';
import { Button, Card, IconBadge, Label, Row } from '@/components/ui';
import { currentDigNo, currentWeekNo, msUntilNextWeek, weeklyTopic } from '@/game/schedule';
import { depthFor } from '@/game/tiers';
import { MAX_PLAYERS, MIN_FUSE_MS, MIN_PLAYERS, START_FUSE_MS, START_HEARTS } from '@/game/tnt';
import { setSound, settingsStore } from '@/lib/music';
import { buddyFor, liveStreak, progressStore } from '@/lib/progress';
import { getDailyCount } from '@/lib/social';
import { useStore } from '@/lib/storage';
import { backendConfigured } from '@/lib/supabase';
import { C, F, R, S } from '@/theme';

function useNow(intervalMs: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export default function Home() {
  const progress = useStore(progressStore);
  const { sound } = useStore(settingsStore);
  const now = useNow(30_000);
  const digNo = currentDigNo(now);
  const today = progress.daily[digNo];
  const streak = liveStreak(progress, now);
  const buddy = buddyFor(progress);
  const openDaily = () => router.push({ pathname: '/dig', params: { mode: 'daily' } });
  const weekNo = currentWeekNo(now);
  const topic = weeklyTopic(weekNo);
  const thisWeek = progress.weekly?.[weekNo];
  const dugToday = useDailyCount(digNo);
  const [inviteNote, setInviteNote] = useState<string | null>(null);
  const invite = async () => {
    try {
      const how = await shareInvite();
      setInviteNote(how === 'copied' ? 'Invite link copied. Paste it to a friend!' : null);
    } catch (e: any) {
      setInviteNote(e?.message ?? 'Could not make an invite link.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Strata dim={0.2} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sound ? 'Turn sound off' : 'Turn sound on'}
            onPress={() => setSound(!sound)}
            hitSlop={10}
            style={({ pressed }) => [styles.soundBtn, pressed && styles.pressed]}>
            <Icon name={sound ? 'sound' : 'muted'} size={22} color={sound ? C.accent : C.faint} />
          </Pressable>
          <View style={styles.logoRow}>
            <Icon name="pickaxe" size={30} color={C.accent} strokeWidth={2.4} />
            <Text style={styles.logo}>DEEPVEIN</Text>
          </View>
          <Text style={styles.tagline}>Dig for the answers nobody else finds.</Text>
        </View>

        <InviteBanner />

        <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => [styles.stats, pressed && styles.pressed]}>
          <View style={styles.stat}>
            <View style={styles.buddy}>
              <Text style={styles.buddyEmoji}>{buddy.emoji}</Text>
            </View>
            <Text style={styles.statLabel} numberOfLines={1}>
              {buddy.name}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Row style={styles.statValueRow}>
              <Icon name="flame" size={22} color={streak > 0 ? C.fuse : C.faint} filled={streak > 0} strokeWidth={1.6} />
              <Text style={styles.statValue}>{streak}</Text>
            </Row>
            <Text style={styles.statLabel}>day streak</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Row style={styles.statValueRow}>
              <Gem tier="diamond" size={22} />
              <Text style={styles.statValue}>{progress.gems}</Text>
            </Row>
            <Text style={styles.statLabel}>gems found</Text>
          </View>
        </Pressable>

        <Card style={styles.hero}>
          <Row style={styles.heroTop}>
            <Label style={styles.heroLabel}>TNT Toss · Multiplayer</Label>
            <Icon name="tnt" size={22} color={C.danger} />
          </Row>
          <Text style={styles.heroTitle}>Pass the TNT before it blows</Text>
          <Row style={styles.meta}>
            <MetaPill icon="user" text={`${MIN_PLAYERS}–${MAX_PLAYERS} miners`} />
            <MetaPill icon="heart" text={`${START_HEARTS} hearts`} />
            <MetaPill icon="clock" text={`${START_FUSE_MS / 1000}s → ${MIN_FUSE_MS / 1000}s fuse`} />
          </Row>
          <Button label="Play TNT Toss" icon="tnt" onPress={() => router.push('/party')} />
        </Card>

        <Pressable
          onPress={() => router.push({ pathname: '/dig', params: { mode: 'weekly' } })}
          style={({ pressed }) => [styles.weekly, pressed && styles.tilePressed]}>
          <Row style={styles.heroTop}>
            <Label style={styles.weeklyLabel}>Topic of the Week</Label>
            <Text style={styles.weeklyEnds}>ends in {untilLabel(msUntilNextWeek(now))}</Text>
          </Row>
          <Row style={styles.weeklyRow}>
            <Text style={styles.weeklyEmoji}>{topic.emoji}</Text>
            <View style={styles.flex}>
              <Text style={styles.weeklyTitle}>{topic.title}</Text>
              <Text style={styles.tileSub}>
                {thisWeek
                  ? `Your dig · ${depthFor(thisWeek.score).toLocaleString()} m · see the leaderboard`
                  : 'One scored try · weekly leaderboard'}
              </Text>
            </View>
            <Icon name="chevron" size={22} color={C.muted} />
          </Row>
        </Pressable>

        <Label style={styles.section}>More ways to dig</Label>
        <View style={styles.tiles}>
          <Tile
            icon="pickaxe"
            color={C.accent}
            title={`Daily #${digNo}`}
            sub={
              today
                ? `Dug · ${depthFor(today.score).toLocaleString()} m`
                : dugToday
                  ? `${dugToday.toLocaleString()} miner${dugToday === 1 ? '' : 's'} dug today`
                  : 'Today’s vein is open'
            }
            onPress={openDaily}
          />
          <Tile
            icon="infinity"
            color="#7cc8ff"
            title="Unlimited"
            sub="Endless digs"
            onPress={() => router.push({ pathname: '/dig', params: { mode: 'unlimited' } })}
          />
          <Tile icon="calendar" color="#b59cff" title="Archive" sub="Past daily digs" onPress={() => router.push('/archive')} />
          <Tile icon="layers" color={C.good} title="Topics" sub="Pick a subject" onPress={() => router.push('/shafts')} />
        </View>

        <Row style={styles.footer}>
          <FooterLink icon="help" label="How to dig" onPress={() => router.push('/how-to')} />
          <FooterLink icon="user" label="Miner" onPress={() => router.push('/profile')} />
          {backendConfigured && <FooterLink icon="share" label="Invite friends" onPress={invite} />}
        </Row>
        {inviteNote && <Text style={styles.inviteNote}>{inviteNote}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Finished dailies today; refreshes every few minutes. Null until known or when offline. */
function useDailyCount(digNo: number) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!backendConfigured) return;
    let cancelled = false;
    const load = () =>
      getDailyCount(digNo)
        .then((n) => !cancelled && setCount(n))
        .catch(() => {});
    load();
    const t = setInterval(load, 180_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [digNo]);
  return count;
}

function untilLabel(ms: number) {
  const h = Math.max(0, Math.floor(ms / 3_600_000));
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

function MetaPill({ icon, text }: { icon: IconName; text: string }) {
  return (
    <Row style={styles.pill}>
      <Icon name={icon} size={14} color={C.accent} />
      <Text style={styles.pillText}>{text}</Text>
    </Row>
  );
}

function Tile({
  icon,
  color,
  title,
  sub,
  onPress,
}: {
  icon: IconName;
  color: string;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
      <IconBadge name={icon} color={color} size={44} />
      <View style={styles.tileText}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function FooterLink({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.footerLink, pressed && styles.pressed]}>
      <Icon name={icon} size={18} color={C.muted} />
      <Text style={styles.footerText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: {
    padding: S.lg,
    paddingTop: S.xl,
    paddingBottom: S.xxl,
    gap: S.md,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: { alignItems: 'center', gap: S.xs, marginBottom: S.sm },
  soundBtn: { position: 'absolute', right: 0, top: 0, padding: S.xs, zIndex: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  logo: {
    color: C.accent,
    fontSize: 46,
    fontFamily: F.display,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  tagline: { color: C.text, opacity: 0.8, fontSize: 14, fontFamily: F.medium },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,6,4,0.55)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: R.lg,
    paddingVertical: S.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValueRow: { gap: 6, minHeight: 34 },
  statValue: { color: C.text, fontSize: 24, fontFamily: F.display },
  statLabel: { color: C.muted, fontSize: 12, fontFamily: F.medium, paddingHorizontal: 4 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.08)' },
  buddy: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: C.accent,
    backgroundColor: C.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyEmoji: { fontSize: 18 },
  hero: {
    gap: S.md,
    borderColor: C.danger,
    borderWidth: 2,
    borderBottomWidth: 5,
    paddingVertical: S.xl,
    shadowColor: C.danger,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  heroTop: { justifyContent: 'space-between' },
  heroLabel: { color: C.danger },
  heroTitle: { color: C.text, fontSize: 30, fontFamily: F.display, lineHeight: 34 },
  meta: { flexWrap: 'wrap', gap: 6 },
  pill: {
    gap: 5,
    backgroundColor: C.edge,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { color: C.text, fontSize: 13, fontFamily: F.semi },
  section: { marginTop: S.sm },
  flex: { flex: 1 },
  weekly: {
    gap: S.sm,
    backgroundColor: C.surface,
    borderColor: C.good,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: R.lg,
    padding: S.md,
  },
  weeklyLabel: { color: C.good },
  weeklyEnds: { color: C.muted, fontSize: 12, fontFamily: F.medium },
  weeklyRow: { gap: S.md },
  weeklyEmoji: { fontSize: 34 },
  weeklyTitle: { color: C.text, fontSize: 22, fontFamily: F.display },
  inviteNote: { color: C.muted, fontSize: 13, fontFamily: F.medium, textAlign: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderTopColor: C.highlight,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderBottomColor: C.edge,
    borderRadius: R.lg,
    padding: S.md,
  },
  tilePressed: { borderBottomWidth: 1, marginTop: 3 },
  tileText: { flex: 1 },
  tileTitle: { color: C.text, fontSize: 16, fontFamily: F.bold },
  tileSub: { color: C.muted, fontSize: 12, fontFamily: F.regular, marginTop: 1 },
  footer: { justifyContent: 'space-around', marginTop: S.md },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: S.sm },
  footerText: { color: C.muted, fontSize: 14, fontFamily: F.semi },
  pressed: { opacity: 0.7 },
});
