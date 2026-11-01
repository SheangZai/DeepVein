/**
 * Synthesises Deepvein's music and sound effects into assets/audio/*.wav.
 * Run with: node scripts/make-music.js
 *
 *   calm.wav  – background loop for menus and the start of a fuse
 *   tense.wav – faster, nervous loop for the last seconds of a fuse
 *   boom.wav  – the TNT going off
 *
 * Everything is generated here (chiptune-style), so there are no licensing
 * questions. Loops end exactly on a bar line so they repeat without a gap.
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'audio');

// ---------- Helpers ----------

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'A3' → MIDI number. */
const n = (name) => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};

const square = (phase, duty = 0.5) => (phase % 1 < duty ? 1 : -1);
const triangle = (phase) => 4 * Math.abs((phase % 1) - 0.5) - 1;

/** Deterministic noise so every run makes the same files. */
let seed = 1;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

function track(seconds) {
  return new Float32Array(Math.round(seconds * RATE));
}

/** Adds a pitched note with a quick attack and exponential decay. */
function tone(buf, { start, dur, hz, vol, wave, duty = 0.5, decay = 6, slide = 0 }) {
  const s0 = Math.round(start * RATE);
  const len = Math.round(dur * RATE);
  let phase = 0;
  for (let i = 0; i < len && s0 + i < buf.length; i++) {
    const t = i / RATE;
    const f = hz * (1 + slide * (t / dur));
    phase += f / RATE;
    const attack = Math.min(1, i / (0.004 * RATE));
    const release = Math.min(1, (len - i) / (0.01 * RATE));
    const env = attack * release * Math.exp(-decay * t);
    const v = wave === 'tri' ? triangle(phase) : wave === 'sine' ? Math.sin(2 * Math.PI * phase) : square(phase, duty);
    buf[s0 + i] += v * vol * env;
  }
}

/** Kick: sine with a fast pitch drop. */
function kick(buf, start, vol) {
  const s0 = Math.round(start * RATE);
  const len = Math.round(0.18 * RATE);
  let phase = 0;
  for (let i = 0; i < len && s0 + i < buf.length; i++) {
    const t = i / RATE;
    phase += (50 + 110 * Math.exp(-t * 35)) / RATE;
    buf[s0 + i] += Math.sin(2 * Math.PI * phase) * vol * Math.exp(-t * 18);
  }
}

/** Filtered noise hit (hats, snares). `bright` 0..1 sets the tone. */
function hit(buf, start, dur, vol, bright) {
  const s0 = Math.round(start * RATE);
  const len = Math.round(dur * RATE);
  let lp = 0;
  for (let i = 0; i < len && s0 + i < buf.length; i++) {
    const t = i / RATE;
    const x = noise();
    lp += (x - lp) * (1 - bright);
    const hp = x - lp; // brighter when bright is high
    const v = bright > 0.5 ? hp : lp * 2.5;
    buf[s0 + i] += v * vol * Math.exp(-t * (6 / dur));
  }
}

function normalise(buf, peak) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  const g = max > 0 ? peak / max : 1;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
}

function writeWav(file, buf) {
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * 32767))), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); // PCM
  head.writeUInt16LE(1, 22); // mono
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, file), Buffer.concat([head, data]));
  console.log(`${file}: ${(buf.length / RATE).toFixed(1)}s, ${Math.round((44 + data.length) / 1024)} KB`);
}

// Chords as [root, third, fifth] MIDI notes. A minor: the mine's home key.
const CHORD = {
  Am: [n('A3'), n('C4'), n('E4')],
  F: [n('F3'), n('A3'), n('C4')],
  C: [n('C4'), n('E4'), n('G4')],
  G: [n('G3'), n('B3'), n('D4')],
  E: [n('E3'), n('G#3'), n('B3')],
  Dm: [n('D3'), n('F3'), n('A3')],
};

// ---------- Calm loop: relaxed digging groove ----------

function makeCalm() {
  const bpm = 100;
  const beat = 60 / bpm;
  const prog = ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'];
  const buf = track(prog.length * 4 * beat);

  prog.forEach((name, bar) => {
    const chord = CHORD[name];
    const t0 = bar * 4 * beat;
    // Bass: root on 1, fifth on 3, a passing octave on the "and" of 4.
    tone(buf, { start: t0, dur: beat * 1.9, hz: midiHz(chord[0] - 12), vol: 0.5, wave: 'tri', decay: 1.2 });
    tone(buf, { start: t0 + 2 * beat, dur: beat * 1.4, hz: midiHz(chord[2] - 12), vol: 0.42, wave: 'tri', decay: 1.5 });
    tone(buf, { start: t0 + 3.5 * beat, dur: beat * 0.45, hz: midiHz(chord[0]), vol: 0.3, wave: 'tri', decay: 3 });
    // Soft arpeggio in eighth notes.
    const arp = [chord[0], chord[1], chord[2], chord[1] + 12, chord[2], chord[1], chord[0] + 12, chord[2]];
    arp.forEach((m, i) => {
      tone(buf, { start: t0 + i * beat * 0.5, dur: beat * 0.45, hz: midiHz(m + 12), vol: 0.09, wave: 'sq', duty: 0.25, decay: 7 });
    });
    // Light drums: kick on 1 and 3, a pickaxe "tink" hat on the off-beats.
    kick(buf, t0, 0.55);
    kick(buf, t0 + 2 * beat, 0.45);
    for (let i = 0; i < 4; i++) hit(buf, t0 + (i + 0.5) * beat, 0.05, 0.08, 0.9);
    hit(buf, t0 + beat, 0.12, 0.12, 0.3);
    hit(buf, t0 + 3 * beat, 0.12, 0.12, 0.3);
  });

  // A short lead motif every other bar, so the loop has a hook.
  const motif = [
    [0, 'E5', 0.5],
    [0.5, 'D5', 0.5],
    [1, 'C5', 1],
    [2, 'A4', 1.5],
  ];
  [0, 2, 4].forEach((bar) => {
    motif.forEach(([at, note, len]) => {
      tone(buf, { start: (bar * 4 + at) * beat, dur: len * beat, hz: midiHz(n(note)), vol: 0.07, wave: 'sq', duty: 0.5, decay: 2.5 });
    });
  });

  normalise(buf, 0.8);
  return buf;
}

// ---------- Tense loop: the fuse is almost gone ----------

function makeTense() {
  const bpm = 152;
  const beat = 60 / bpm;
  const prog = ['Am', 'Am', 'F', 'E'];
  const buf = track(prog.length * 4 * beat);

  prog.forEach((name, bar) => {
    const chord = CHORD[name];
    const t0 = bar * 4 * beat;
    // Driving eighth-note bass.
    for (let i = 0; i < 8; i++) {
      const m = chord[0] - 12 + (i % 2 === 1 ? 12 : 0);
      tone(buf, { start: t0 + i * beat * 0.5, dur: beat * 0.42, hz: midiHz(m), vol: 0.45, wave: 'tri', decay: 4 });
    }
    // Fast sixteenth-note arpeggio, climbing.
    for (let i = 0; i < 16; i++) {
      const m = chord[i % 3] + 12 + (i >= 8 ? 12 : 0);
      tone(buf, { start: t0 + i * beat * 0.25, dur: beat * 0.22, hz: midiHz(m), vol: 0.08, wave: 'sq', duty: 0.125, decay: 10 });
    }
    // Four-on-the-floor kick, snare on 2 and 4, sixteenth hats.
    for (let i = 0; i < 4; i++) kick(buf, t0 + i * beat, 0.6);
    hit(buf, t0 + beat, 0.15, 0.3, 0.3);
    hit(buf, t0 + 3 * beat, 0.15, 0.3, 0.3);
    for (let i = 0; i < 16; i++) hit(buf, t0 + i * beat * 0.25, 0.03, i % 2 ? 0.05 : 0.09, 0.95);
    // Alarm: a high two-note beep on each beat.
    for (let i = 0; i < 4; i++) {
      tone(buf, { start: t0 + i * beat, dur: 0.06, hz: midiHz(n('A6')), vol: 0.07, wave: 'sq', decay: 20 });
    }
  });
  // Rising siren over the last bar to build into the loop restart.
  tone(buf, { start: 3 * 4 * beat, dur: 4 * beat * 0.98, hz: midiHz(n('E5')), vol: 0.06, wave: 'sq', duty: 0.5, decay: 0, slide: 0.5 });

  normalise(buf, 0.85);
  return buf;
}

// ---------- Boom ----------

function makeBoom() {
  const buf = track(1.4);
  // Low thump.
  let phase = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / RATE;
    phase += (35 + 90 * Math.exp(-t * 12)) / RATE;
    buf[i] += Math.sin(2 * Math.PI * phase) * 0.9 * Math.exp(-t * 4);
  }
  // Rumbling noise that darkens as it fades.
  let lp = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / RATE;
    const cutoff = 0.5 * Math.exp(-t * 3) + 0.02;
    lp += (noise() - lp) * cutoff;
    buf[i] += lp * 1.6 * Math.exp(-t * 2.5);
  }
  normalise(buf, 0.95);
  return buf;
}

fs.mkdirSync(OUT, { recursive: true });
writeWav('calm.wav', makeCalm());
writeWav('tense.wav', makeTense());
writeWav('boom.wav', makeBoom());
