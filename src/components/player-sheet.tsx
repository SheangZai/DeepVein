import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import {
  BLOCKED_NAME,
  REPORT_REASONS,
  blockPlayer,
  reportPlayer,
  unblockPlayer,
  useBlocked,
  type ReportReason,
} from '@/lib/moderation';
import { C, F, R, S } from '@/theme';

import { Button } from './ui';

export interface SheetPlayer {
  uid: string;
  name: string;
}

type Step = 'menu' | 'report' | 'done';

/**
 * Report / block menu for another player. `context` says where they were seen
 * (e.g. "tnt-room", "ladder") so reports are easier to review.
 */
export function usePlayerSheet(context: string) {
  const [player, setPlayer] = useState<SheetPlayer | null>(null);
  const open = useCallback((p: SheetPlayer) => setPlayer(p), []);
  const sheet = <PlayerSheet player={player} context={context} onClose={() => setPlayer(null)} />;
  return { open, sheet };
}

function PlayerSheet({ player, context, onClose }: { player: SheetPlayer | null; context: string; onClose: () => void }) {
  const blocked = useBlocked();
  const [step, setStep] = useState<Step>('menu');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setStep('menu');
    setMessage('');
    onClose();
  };

  if (!player) return null;
  const isBlocked = player.uid in blocked;
  // Show the real name for reporting, even when it's hidden elsewhere.
  const name = isBlocked && blocked[player.uid] !== BLOCKED_NAME ? blocked[player.uid] : player.name;

  const run = async (task: () => Promise<void>, done: string, failed: string) => {
    setBusy(true);
    try {
      await task();
      setMessage(done);
    } catch {
      setMessage(failed);
    } finally {
      setBusy(false);
      setStep('done');
    }
  };

  const report = (reason: ReportReason) =>
    run(
      () => reportPlayer(player.uid, name, reason, context),
      'Thanks. We’ll review this report.',
      'Couldn’t send the report. Check your connection and try again.',
    );

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.label}>MINER</Text>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>

          {step === 'menu' && (
            <>
              <Button label="Report" icon="flag" variant="secondary" onPress={() => setStep('report')} />
              {isBlocked ? (
                <Button
                  label="Unblock"
                  variant="secondary"
                  loading={busy}
                  onPress={() =>
                    run(() => unblockPlayer(player.uid), `${name} is unblocked.`, `${name} is unblocked on this device.`)
                  }
                />
              ) : (
                <Button
                  label="Block"
                  icon="x"
                  variant="danger"
                  loading={busy}
                  onPress={() =>
                    run(
                      () => blockPlayer(player.uid, name),
                      `${name} is blocked. Their name is hidden from you and they can’t be your friend.`,
                      `${name} is hidden on this device, but we couldn’t reach the server. Try again when you’re online.`,
                    )
                  }
                />
              )}
            </>
          )}

          {step === 'report' && (
            <>
              <Text style={styles.body}>Why are you reporting this miner?</Text>
              {REPORT_REASONS.map((r) => (
                <Button key={r.id} label={r.label} variant="secondary" loading={busy} onPress={() => report(r.id)} />
              ))}
            </>
          )}

          {step === 'done' && <Text style={styles.body}>{message}</Text>}

          <Button label={step === 'done' ? 'Done' : 'Cancel'} variant="ghost" onPress={close} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: S.lg },
  sheet: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: S.sm,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  label: { color: C.muted, fontFamily: F.bold, fontSize: 10, letterSpacing: 2.5, textAlign: 'center' },
  name: { color: C.text, fontFamily: F.display, fontSize: 26, textAlign: 'center', marginBottom: S.xs },
  body: { color: C.text, fontFamily: F.regular, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
