import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Share, StyleSheet } from 'react-native';

import { inviteUrl } from '@/lib/links';
import { addFriend, getMinerByCode, getProfile, isFriend } from '@/lib/social';
import { backendConfigured } from '@/lib/supabase';
import { C, R, S } from '@/theme';

import { Body, Button, Card, Label, Muted, Row } from './ui';

type State =
  | { kind: 'ask'; code: string; name: string }
  | { kind: 'done'; name: string; already: boolean }
  | { kind: 'error'; message: string };

/** Opening deepvein.app/?friend=CODE asks whether to add that miner as a friend. */
export function InviteBanner() {
  const { friend } = useLocalSearchParams<{ friend?: string }>();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!friend || !backendConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const miner = await getMinerByCode(friend);
        if (cancelled) return;
        if (!miner) {
          setState({ kind: 'error', message: 'This invite is your own, or it isn’t valid any more.' });
        } else if (await isFriend(miner.id)) {
          if (!cancelled) setState({ kind: 'done', name: miner.name, already: true });
        } else if (!cancelled) {
          setState({ kind: 'ask', code: friend, name: miner.name });
        }
      } catch (e: any) {
        if (!cancelled) setState({ kind: 'error', message: e?.message ?? 'Could not open the invite.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [friend]);

  if (!state) return null;
  const dismiss = () => {
    router.setParams({ friend: undefined });
    setState(null);
  };

  if (state.kind === 'error') {
    return (
      <Card style={styles.card}>
        <Muted>{state.message}</Muted>
        <Button label="OK" variant="ghost" onPress={dismiss} />
      </Card>
    );
  }
  if (state.kind === 'done') {
    return (
      <Card style={styles.card}>
        <Label>Friends</Label>
        <Body>{state.already ? `You and ${state.name} are already friends.` : `You and ${state.name} are now friends! You’ll see each other’s daily digs.`}</Body>
        <Button label="Let’s dig" onPress={dismiss} />
      </Card>
    );
  }
  const accept = async () => {
    setBusy(true);
    try {
      await addFriend(state.code);
      setState({ kind: 'done', name: state.name, already: false });
    } catch (e: any) {
      setState({ kind: 'error', message: e?.message ?? 'Could not add that friend.' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={styles.card}>
      <Label>You’ve been invited</Label>
      <Body>Add {state.name} as a friend? You’ll see each other’s daily digs and weekly scores.</Body>
      <Row style={styles.row}>
        <Button label="Add friend" icon="check" onPress={accept} loading={busy} style={styles.flex} />
        <Button label="No thanks" variant="secondary" onPress={dismiss} style={styles.flex} />
      </Row>
    </Card>
  );
}

/** Shares a link that adds you as a friend when opened. Falls back to copying it. */
export async function shareInvite() {
  const { friend_code } = await getProfile();
  const url = inviteUrl(friend_code);
  const message = `Dig with me on Deepvein ⛏️ Name the answers nobody else finds, and pass the TNT before it blows. Add me as a friend: ${url}`;
  try {
    if (Platform.OS === 'web' && !(typeof navigator !== 'undefined' && 'share' in navigator)) throw new Error('no share');
    await Share.share({ message });
    return 'shared' as const;
  } catch {
    await Clipboard.setStringAsync(message);
    return 'copied' as const;
  }
}

const styles = StyleSheet.create({
  card: { borderColor: C.accent, borderWidth: 2, borderRadius: R.lg, gap: S.sm },
  row: { gap: S.sm },
  flex: { flex: 1 },
});
