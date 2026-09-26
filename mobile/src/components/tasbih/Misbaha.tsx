import {
  Atlas,
  Canvas,
  Circle,
  Group,
  Line,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  RoundedRect,
  Skia,
  useRectBuffer,
  useRSXformBuffer,
  useTexture,
  vec,
} from '@shopify/react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { positionFor, type MisbahaString } from '@/lib/misbaha';
import type { Tier } from '@/lib/quality';
import type { BeadMaterial } from '@/store/settings';
import { motion } from '@/theme';

/**
 * The misbaha (DESIGN_PLAN §7.4): beads on a hanging thread in two clusters — counted on the left,
 * remaining on the right — with the next bead crossing the gap on each count. Every bead comes from
 * one sprite sheet drawn once per material, and all of them are placed by one animated position in
 * a single Atlas draw, so it stays smooth on slow phones.
 */

export const MISBAHA_HEIGHT = 150;
const R = 15; // bead radius
const S = 33; // spacing along the thread
const GAP = 58; // where a bead crosses
const CELL = 64; // sprite cell, in points
const SCALE = 3; // sprite sheet resolution
const SLOTS = 24;
const HALF = 12;
const THREAD_Y = 36;
const SAG = 26;

type Palette = { body: string[]; rim: string; shine: number; glow?: string; grain?: string; tassel: string; thread: string };

export const MATERIALS: Record<BeadMaterial, Palette> = {
  amber: { body: ['#ffe29a', '#f0a23a', '#b3600f', '#7a3a06'], rim: 'rgba(90,40,0,0.35)', shine: 0.75, glow: 'rgba(255,214,120,0.75)', tassel: '#8a4a12', thread: '#6b3a12' },
  wood: { body: ['#d9a877', '#a8703f', '#784a24', '#4f2f14'], rim: 'rgba(50,25,5,0.35)', shine: 0.35, grain: 'rgba(60,30,10,0.35)', tassel: '#5a3218', thread: '#4a2a12' },
  pearl: { body: ['#ffffff', '#f5f0e8', '#ddd3c4', '#b8ad9c'], rim: 'rgba(120,110,95,0.3)', shine: 0.9, glow: 'rgba(255,225,240,0.45)', tassel: '#c8b89a', thread: '#9c8f7a' },
  onyx: { body: ['#7a7a88', '#34343f', '#15151c', '#050508'], rim: 'rgba(0,0,0,0.5)', shine: 0.85, tassel: '#1c1c22', thread: '#2a2a30' },
  turquoise: { body: ['#c8f1ea', '#5cc2b3', '#2a8a7e', '#16574f'], rim: 'rgba(10,60,55,0.35)', shine: 0.4, grain: 'rgba(20,70,60,0.28)', tassel: '#1f6b62', thread: '#2a5a54' },
};

/** Thread height at x: a hanging curve, lowest in the middle. */
function threadY(x: number, width: number) {
  'worklet';
  const t = (x - width / 2) / (width / 2);
  return THREAD_Y + SAG * (1 - t * t);
}

/** A value that springs to `target`; long jumps (a reset) glide instead; instant on the still tier. */
function useSpringTo(target: number, tier: Tier) {
  const v = useSharedValue(target);
  useEffect(() => {
    if (tier === 'still') v.set(target);
    else if (Math.abs(v.get() - target) > 4) v.set(withTiming(target, { duration: 700, easing: motion.easing.drift }));
    else v.set(withSpring(target, motion.spring.bead));
  }, [target, tier, v]);
  return v;
}

export const Misbaha = memo(function Misbaha({ string, count, pull, wave, kick, material, tier, width }: {
  string: MisbahaString;
  count: number;
  /** Extra travel while a bead is being dragged (0..1). */
  pull: SharedValue<number>;
  /** 0→1 once per completed round: a wave runs along the thread. */
  wave: SharedValue<number>;
  /** 1→0 after each count: the counted beads nudge. */
  kick: SharedValue<number>;
  material: BeadMaterial;
  tier: Tier;
  width: number;
}) {
  const palette = MATERIALS[material];
  const texture = useTexture(<Sheet palette={palette} />, { width: CELL * 3 * SCALE, height: CELL * 2 * SCALE }, [material]);

  // Everything is placed from `along`: one spring toward how far along the string the count has reached.
  const along = useSpringTo(positionFor(count, string), tier);

  const seq = useMemo(() => string.seq.map((p) => (p === 'bead' ? 0 : p === 'separator' ? 1 : 2)), [string]);
  const period = seq.length;
  const cx = width / 2;
  const full = tier === 'full';

  const sprites = useRectBuffer(SLOTS, (rect, k) => {
    'worklet';
    const img = texture.get();
    if (!img) {
      rect.setXYWH(0, 0, 0, 0);
      return;
    }
    const cw = img.width() / 3;
    const i = Math.floor(along.get() + pull.get()) - HALF + k;
    const kind = seq[((i % period) + period) % period];
    rect.setXYWH(kind * cw, 0, cw, img.height());
  });

  const transforms = useRSXformBuffer(SLOTS, (xf, k) => {
    'worklet';
    const img = texture.get();
    const sc = img ? CELL / (img.width() / 3) : 1 / SCALE;
    const p = along.get() + pull.get();
    const i = Math.floor(p) - HALF + k;
    const u = i - p;
    let x: number;
    let lift = 0;
    if (u >= 0) x = cx + GAP / 2 + S / 2 + u * S;
    else if (u <= -1) x = cx - GAP / 2 - S / 2 - (-u - 1) * S;
    else {
      const t = -u;
      x = cx + GAP / 2 + S / 2 - t * (GAP + S);
      lift = Math.sin(Math.PI * t) * 12;
    }
    // Counted beads nudge left as the new one arrives (full quality only).
    if (full && u <= -1 && u > -7) x -= kick.get() * 4 * Math.exp((u + 1) * 0.6);
    const w = wave.get();
    const ripple = w > 0 && w < 1 ? 6 * Math.sin(2 * Math.PI * ((x / width) * 1.5 - w * 2)) * Math.sin(Math.PI * w) : 0;
    const y = threadY(x, width) - lift + ripple;
    xf.set(sc, 0, x - CELL / 2, y - CELL / 2);
  });

  const thread = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    b.moveTo(-10, threadY(-10, width));
    for (let x = 2; x <= width + 10; x += 12) b.lineTo(x, threadY(x, width));
    return b.build();
  }, [width]);

  return (
    <View style={{ height: MISBAHA_HEIGHT }} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Path path={thread} style="stroke" strokeWidth={1.6} color={palette.thread} opacity={0.7} />
        <Atlas image={texture} sprites={sprites} transforms={transforms} />
      </Canvas>
    </View>
  );
});

/** One bead, one separator and the imam with its tassel, drawn once per material. */
function Sheet({ palette: m }: { palette: Palette }) {
  const c = CELL / 2;
  return (
    <Group transform={[{ scale: SCALE }]}>
      <Bead cx={c} cy={c} m={m} />
      <Separator cx={CELL + c} cy={c} m={m} />
      <Imam cx={CELL * 2 + c} cy={c} m={m} />
    </Group>
  );
}

function Bead({ cx, cy, m, r = R }: { cx: number; cy: number; m: Palette; r?: number }) {
  return (
    <Group>
      <Circle cx={cx} cy={cy + r * 0.14} r={r} color="rgba(0,0,0,0.2)" />
      <Circle cx={cx} cy={cy} r={r}>
        <RadialGradient c={vec(cx - r * 0.35, cy - r * 0.42)} r={r * 1.55} colors={m.body} />
      </Circle>
      {m.glow ? (
        <Circle cx={cx + r * 0.22} cy={cy + r * 0.3} r={r * 0.6}>
          <RadialGradient c={vec(cx + r * 0.22, cy + r * 0.3)} r={r * 0.6} colors={[m.glow, 'rgba(255,255,255,0)']} />
        </Circle>
      ) : null}
      {m.grain
        ? [-0.45, -0.1, 0.3].map((o) => (
          <Line key={o} p1={vec(cx - r * 0.8, cy + r * o)} p2={vec(cx + r * 0.8, cy + r * (o + 0.15))} color={m.grain} strokeWidth={0.8} />
        ))
        : null}
      <Circle cx={cx} cy={cy} r={r - 0.4} style="stroke" strokeWidth={0.9} color={m.rim} />
      <Oval x={cx - r * 0.58} y={cy - r * 0.72} width={r * 0.62} height={r * 0.38} color={`rgba(255,255,255,${m.shine})`} />
    </Group>
  );
}

function Separator({ cx, cy, m }: { cx: number; cy: number; m: Palette }) {
  const w = R * 2.3;
  const h = R * 1.4;
  return (
    <Group>
      <RoundedRect x={cx - w / 2} y={cy - h / 2 + 2} width={w} height={h} r={h / 2} color="rgba(0,0,0,0.2)" />
      <RoundedRect x={cx - w / 2} y={cy - h / 2} width={w} height={h} r={h / 2}>
        <LinearGradient start={vec(cx, cy - h / 2)} end={vec(cx, cy + h / 2)} colors={m.body} />
      </RoundedRect>
      <RoundedRect x={cx - w / 2 + 0.4} y={cy - h / 2 + 0.4} width={w - 0.8} height={h - 0.8} r={h / 2} style="stroke" strokeWidth={0.9} color={m.rim} />
      <Oval x={cx - w * 0.35} y={cy - h * 0.38} width={w * 0.5} height={h * 0.26} color={`rgba(255,255,255,${m.shine})`} />
    </Group>
  );
}

/** The imam hangs from the thread, with its tassel («الشرابة») below it. */
function Imam({ cx, cy, m }: { cx: number; cy: number; m: Palette }) {
  const w = R * 1.25;
  const h = R * 2.6;
  const top = cy + R * 0.2;
  return (
    <Group>
      {Array.from({ length: 9 }, (_, i) => {
        const spread = (i - 4) * 2.2;
        return <Line key={i} p1={vec(cx + spread * 0.2, top + h - 2)} p2={vec(cx + spread, top + h + R * 2.2)} color={m.tassel} strokeWidth={1.1} opacity={0.85} />;
      })}
      <RoundedRect x={cx - w / 2} y={top} width={w} height={h} r={w / 2}>
        <LinearGradient start={vec(cx - w / 2, top)} end={vec(cx + w / 2, top)} colors={[m.body[0], m.body[1], m.body[2]]} />
      </RoundedRect>
      <RoundedRect x={cx - w / 2 + 0.4} y={top + 0.4} width={w - 0.8} height={h - 0.8} r={w / 2} style="stroke" strokeWidth={0.9} color={m.rim} />
      <Bead cx={cx} cy={cy} m={m} r={R * 0.8} />
    </Group>
  );
}
