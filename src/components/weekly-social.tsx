import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useBlocked } from '@/lib/moderation';
import { gridOf, type DigResult } from '@/lib/progress';
import { ensureSession, getFriendWeekly, getWeekRank, getWeekTop, submitWeekly, type WeeklyEntry } from '@/lib/social';
import { backendConfigured } from '@/lib/supabase';
import { C, F, S } from '@/theme';

import { Icon } from './icons';
import { usePlayerSheet } from './player-sheet';
import { Body, Card, Heading, Label, Muted, Row } from './ui';

/** Uploads this week's Topic of the Week result, then shows the week's top list and friends. */
export function WeeklySocial({ result, topic }: { result: DigResult; topic: string }) {
  const weekNo = result.weekNo!;
  const [me, setMe] = useState<string | null>(null);
  const [rank, setRank] = useState<{ deeper: number; total: number } | null>(null);
  const [top, setTop] = useState<WeeklyEntry[] | null>(null);
  const [friends, setFriends] = useState<WeeklyEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const blocked = useBlocked();
  const playerSheet = usePlayerSheet('weekly');

  useEffect(() => {
    if (!backendConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const id = await ensureSession();
        await submitWeekly(weekNo, topic, result.score, gridOf(result.answers, 40));
        const [r, t, f] = await Promise.all([getWeekRank(weekNo, result.score), getWeekTop(weekNo, 10), getFriendWeekly(weekNo)]);
        if (cancelled) return;
        setMe(id);
        setRank(r);
        setTop(t);
        setFriends(f);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Could not reach the server.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weekNo, topic, result]);

  if (!backendConfigured) return null;
  if (error) {
    return (
      <Card>
        <Muted>Leaderboard unavailable: {error}</Muted>
      </Card>
    );
  }
  if (!rank || !top) {
    return (
      <Card>
        <ActivityIndicator color={C.accent} />
      </Card>
    );
  }

  const pct = rank.total > 1 ? Math.round(((rank.total - 1 - rank.deeper) / (rank.total - 1)) * 100) : 100;
  const shownTop = top.filter((e) => !(e.userId in blocked));
  const shownFriends = friends.filter((e) => !(e.userId in blocked));

  const row = (e: WeeklyEntry, place?: number) => (
    <Row key={e.userId} style={styles.row}>
      {place !== undefined && <Text style={[styles.place, place <= 3 && { color: C.accent }]}>{place}</Text>}
      <Text style={[styles.name, e.userId === me && styles.meText]} numberOfLines={1}>
        {e.userId === me ? `${e.name} (you)` : e.name}
      </Text>
      <Body style={styles.score}>{e.score}</Body>
      {e.userId !== me ? (
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Report or block ${e.name}`}
          onPress={() => playerSheet.open({ uid: e.userId, name: e.name })}>
          <Icon name="flag" size={16} color={C.faint} />
        </Pressable>
      ) : (
        <Icon name="flag" size={16} color="transparent" />
      )}
    </Row>
  );

  return (
    <>
      <Card>
        <Row>
          <Icon name="trophy" size={22} color={C.accent} />
          <Heading style={styles.flex}>
            {rank.deeper === 0 ? 'Top of the week so far!' : `Deeper than ${pct}% this week`}
          </Heading>
        </Row>
        <Muted>
          #{rank.deeper + 1} of {rank.total.toLocaleString()} who dug this week’s topic
        </Muted>
      </Card>
      <Card>
        <Label>This week’s top miners</Label>
        {shownTop.map((e, i) => row(e, i + 1))}
      </Card>
      {shownFriends.length > 0 && (
        <Card>
          <Label>Friends this week</Label>
          {shownFriends.map((e) => row(e))}
        </Card>
      )}
      {playerSheet.sheet}
    </>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: S.xs },
  flex: { flex: 1 },
  place: { width: 24, color: C.muted, fontFamily: F.display, fontSize: 16 },
  name: { flex: 1, color: C.text, fontSize: 15, fontFamily: F.medium },
  meText: { color: C.accent, fontFamily: F.bold },
  score: { width: 56, textAlign: 'right', fontFamily: F.bold },
});
