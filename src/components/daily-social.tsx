import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { getPrompt } from '@/content';
import { useBlocked } from '@/lib/moderation';
import type { DigResult } from '@/lib/progress';
import { getFriendResults, getRank, submitDaily, type FriendResult } from '@/lib/social';
import { backendConfigured } from '@/lib/supabase';
import { gridOf } from '@/lib/progress';
import { C, F, S } from '@/theme';

import { Gem } from './gem';
import { Icon } from './icons';
import { usePlayerSheet } from './player-sheet';
import { Body, Button, Card, Heading, Label, Muted, Row } from './ui';

/** Uploads today's result, then shows the global rank and friends' digs. */
export function DailySocial({ result }: { result: DigResult }) {
  const digNo = result.digNo!;
  const [rank, setRank] = useState<{ deeper: number; total: number } | null>(null);
  const [friends, setFriends] = useState<FriendResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const blocked = useBlocked();
  const playerSheet = usePlayerSheet('friends');

  useEffect(() => {
    if (!backendConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        await submitDaily(digNo, result.score, gridOf(result.answers, 40), result.answers);
        const [r, f] = await Promise.all([getRank(digNo, result.score), getFriendResults(digNo)]);
        if (cancelled) return;
        setRank(r);
        setFriends(f);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Could not reach the server.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [digNo, result]);

  if (!backendConfigured) return null;
  if (error) {
    return (
      <Card>
        <Muted>Leaderboard unavailable: {error}</Muted>
      </Card>
    );
  }
  if (!rank || !friends) {
    return (
      <Card>
        <ActivityIndicator color={C.accent} />
      </Card>
    );
  }

  // Blocking ends the friendship on the server; hide them here right away too.
  const shown = friends.filter((f) => !(f.userId in blocked));
  const pct = rank.total > 1 ? Math.round(((rank.total - 1 - rank.deeper) / (rank.total - 1)) * 100) : 100;

  return (
    <>
      <Card>
        <Row>
          <Icon name="trophy" size={22} color={C.accent} />
          <Heading style={styles.flex}>
            {rank.deeper === 0 ? 'Deepest miner so far today!' : `Deeper than ${pct}% of miners`}
          </Heading>
        </Row>
        <Muted>
          #{rank.deeper + 1} of {rank.total.toLocaleString()} who dug #{digNo}
        </Muted>
      </Card>
      <Card>
        <Label>Friends</Label>
        {shown.length === 0 && (
          <>
            <Muted>Add friends with their miner code to compare digs.</Muted>
            <Button label="Add friends" variant="secondary" onPress={() => router.push('/profile')} />
          </>
        )}
        {shown.map((f) => (
          <Pressable key={f.userId} onPress={() => setOpen(open === f.userId ? null : f.userId)}>
            <Row style={styles.friendRow}>
              <Body style={styles.flex}>{f.name}</Body>
              <Text style={styles.grid}>{f.grid ?? '—'}</Text>
              <Body style={styles.score}>{f.score ?? '…'}</Body>
              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Report or block ${f.name}`}
                onPress={() => playerSheet.open({ uid: f.userId, name: f.name })}>
                <Icon name="flag" size={16} color={C.faint} />
              </Pressable>
            </Row>
            {open === f.userId &&
              f.answers.map((a) => (
                <Row key={a.promptId} style={styles.friendAnswer}>
                  <Gem tier={a.tier} size={14} />
                  <Muted style={styles.flex}>
                    {getPrompt(a.promptId).text}: {a.matched ?? (a.input ? 'Miss' : '—')}
                  </Muted>
                </Row>
              ))}
          </Pressable>
        ))}
      </Card>
      {playerSheet.sheet}
    </>
  );
}

const styles = StyleSheet.create({
  friendRow: { paddingVertical: S.xs },
  flex: { flex: 1 },
  grid: { fontSize: 14 },
  score: { width: 44, textAlign: 'right', fontFamily: F.bold },
  friendAnswer: { alignItems: 'flex-start', paddingLeft: S.sm },
});
