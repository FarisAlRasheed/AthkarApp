import {
  Canvas,
  Circle,
  Group,
  Line,
  LinearGradient,
  Path,
  Points,
  RadialGradient,
  Rect,
  Skia,
  vec,
  type SkPoint,
} from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { moonPhase, skyState, type Scene, type SkyState } from '@/lib/sky';
import { useTier, type Tier } from '@/lib/quality';
import { timesFor, useClock } from '@/store/clock';
import { useSettings } from '@/store/settings';
import { useSky } from '@/store/sky';

/**
 * The one sky behind every screen (DESIGN_PLAN §2.1, §6.2), drawn in a single Skia canvas.
 * State comes from lib/sky once a minute or when the scene changes; everything that moves runs on
 * the UI thread. Ambient motion (twinkling, drifting clouds, shooting stars) only runs on the full
 * tier, on clock scenes, and only while the stars or clouds are actually visible.
 */
export function SkyHost() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const now = useClock((s) => s.now);
  const scene = useSky((s) => s.scene);
  const serial = useSky((s) => s.serial);
  const themeMode = useSettings((s) => s.themeMode);
  const place = useSettings((s) => s.place);
  const tier = useTier();
  const quality = useSettings((s) => s.quality);
  useFrameWatch(!__DEV__ && quality === 'auto' && tier === 'full', () => useSettings.getState().set({ autoTier: 'lite' }));

  const state = useMemo(
    () => skyState({ now, timesFor, scene, pinned: themeMode === 'auto' ? null : themeMode, width, height, top: insets.top }),
    // place changes the prayer times behind timesFor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now, scene, themeMode, place, width, height, insets.top],
  );

  // The sky tells the theme and paper what to use (the reader's journey); null = follow the clock.
  useEffect(() => {
    const s = useSky.getState();
    if (s.theme !== state.theme || s.warmPaper !== state.warmPaper) useSky.setState({ theme: state.theme, warmPaper: state.warmPaper });
  }, [state.theme, state.warmPaper]);

  // How long the sky takes to follow a change: quick when the screen changes (so text on the sky
  // is never left on the wrong brightness), 1.2 s per step of a journey, 2 s for the clock's drift.
  // Lite and still tiers change instantly.
  const [seenSerial, setSeenSerial] = useState(serial);
  const switching = seenSerial !== serial;
  useEffect(() => {
    if (!switching) return;
    const t = setTimeout(() => setSeenSerial(serial), 800);
    return () => clearTimeout(t);
  }, [switching, serial]);
  const blend = tier !== 'full' ? 0 : switching ? 700 : scene.kind === 'journey' ? 1200 : 2000;

  const layer = { state, tier, blend, width, height };
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Gradient {...layer} />
      <HorizonGlow {...layer} />
      <Stars {...layer} top={insets.top} scene={scene} />
      <Clouds {...layer} />
      <Rays {...layer} />
      <Sun {...layer} />
      <Moon {...layer} now={now} />
      <ShootingStar {...layer} />
      <Dim {...layer} />
    </Canvas>
  );
}

type LayerProps = { state: SkyState; tier: Tier; blend: number; width?: number; height?: number };

const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** A number that eases to `target` whenever it changes. */
function useEased(target: number, ms: number) {
  const v = useSharedValue(target);
  useEffect(() => {
    v.set(ms ? withTiming(target, { duration: ms, easing: Easing.inOut(Easing.sin) }) : target);
  }, [target, ms, v]);
  return v;
}

function Gradient({ state, blend, width = 0, height = 0 }: LayerProps) {
  const target = state.look.stops.map(rgbOf);
  const key = state.look.stops.join();
  const from = useSharedValue(target);
  const to = useSharedValue(target);
  const t = useSharedValue(1);

  useEffect(() => {
    // Start the blend from whatever is on screen now, so a change mid-blend never jumps.
    const k = t.get();
    const f = from.get();
    const cur = to.get().map((c, i) => c.map((v, j) => f[i][j] + (v - f[i][j]) * k));
    from.set(cur);
    to.set(key.split(',').map(rgbOf));
    t.set(0);
    const ms = blend;
    t.set(ms ? withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }) : 1);
  }, [key, blend, from, to, t]);

  const colors = useDerivedValue(() => {
    const k = t.get();
    const f = from.get();
    return to.get().map((c, i) => `rgb(${Math.round(f[i][0] + (c[0] - f[i][0]) * k)},${Math.round(f[i][1] + (c[1] - f[i][1]) * k)},${Math.round(f[i][2] + (c[2] - f[i][2]) * k)})`);
  });

  return (
    <Rect x={0} y={0} width={width} height={height}>
      <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={colors} positions={[0, 0.35, 0.7, 1]} />
    </Rect>
  );
}

function HorizonGlow({ state, blend, width = 0, height = 0 }: LayerProps) {
  const level = useEased(state.look.glow, blend);
  return (
    <Rect x={0} y={height * 0.45} width={width} height={height * 0.55} opacity={level}>
      <RadialGradient c={vec(width / 2, height * 1.05)} r={Math.max(width, height * 0.55)} colors={[`${state.look.glowColor}b0`, `${state.look.glowColor}00`]} />
    </Rect>
  );
}

// ── stars ──────────────────────────────────────────────────────────────────────────────────

/** Deterministic pseudo-random numbers, so stars never jump between renders. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GROUP_SIZE = [1.3, 1.9, 2.5, 1.6];
const TWINKLE_MS = [3200, 4700, 6100, 8300];

function Stars({ state, tier, blend, width = 0, height = 0, top, scene }: LayerProps & { top: number; scene: Scene }) {
  const count = tier === 'full' ? 60 : 25;
  const groups = useMemo(() => {
    const rnd = seeded(7);
    const g: SkPoint[][] = [[], [], [], []];
    for (let i = 0; i < count; i++) g[i % 4].push(vec(rnd() * width, Math.pow(rnd(), 1.6) * height * 0.8));
    return g;
  }, [count, width, height]);

  // The reader's evening: one star per completed thiker, inside the sky band.
  const band = scene.kind === 'journey' ? scene.band : 0;
  const bandStars = useMemo(() => {
    const rnd = seeded(31);
    return Array.from({ length: 40 }, () => vec(12 + rnd() * (width - 24), top + 6 + rnd() * Math.max(10, band - 12)));
  }, [width, top, band]);

  const level = useEased(state.starLimit === null ? state.look.stars : 0, blend);
  const twinkle = [useSharedValue(1), useSharedValue(1), useSharedValue(1), useSharedValue(1)];
  const moving = tier === 'full' && state.ambient && state.look.stars > 0.02;
  useEffect(() => {
    twinkle.forEach((v, i) => {
      if (!moving) {
        cancelAnimation(v);
        v.set(1);
        return;
      }
      const d = TWINKLE_MS[i] / 2;
      v.set(withDelay(i * 700, withRepeat(withSequence(withTiming(0.35, { duration: d, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: d, easing: Easing.inOut(Easing.sin) })), -1)));
    });
    // twinkle is a fixed array of shared values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moving]);
  const opacities = [
    useDerivedValue(() => level.get() * twinkle[0].get()),
    useDerivedValue(() => level.get() * twinkle[1].get()),
    useDerivedValue(() => level.get() * twinkle[2].get()),
    useDerivedValue(() => level.get() * twinkle[3].get()),
  ];

  const limit = Math.min(state.starLimit ?? 0, bandStars.length);
  const newest = useSharedValue(1);
  useEffect(() => {
    if (!limit) return;
    newest.set(0);
    newest.set(withDelay(200, withTiming(1, { duration: tier === 'full' ? 900 : 0, easing: Easing.out(Easing.cubic) })));
  }, [limit, tier, newest]);

  return (
    <>
      {groups.map((pts, i) => (
        <Points key={i} points={pts} mode="points" color="#ffffff" style="stroke" strokeWidth={GROUP_SIZE[i]} strokeCap="round" opacity={opacities[i]} />
      ))}
      {limit > 1 ? <Points points={bandStars.slice(0, limit - 1)} mode="points" color="#fff8e8" style="stroke" strokeWidth={2.2} strokeCap="round" /> : null}
      {limit > 0 ? (
        <Group opacity={newest}>
          <Circle cx={bandStars[limit - 1].x} cy={bandStars[limit - 1].y} r={7}>
            <RadialGradient c={bandStars[limit - 1]} r={7} colors={['#fff4d6aa', '#fff4d600']} />
          </Circle>
          <Circle cx={bandStars[limit - 1].x} cy={bandStars[limit - 1].y} r={1.3} color="#ffffff" />
        </Group>
      ) : null}
    </>
  );
}

// ── clouds ─────────────────────────────────────────────────────────────────────────────────

const PUFFS = [[0, 0, 38], [34, -10, 30], [-34, -4, 28], [66, 6, 22], [-62, 8, 20]];
const CLOUDS = [
  { y: 0.12, scale: 1, ms: 240_000, start: 0.2 },
  { y: 0.24, scale: 0.75, ms: 320_000, start: 0.7 },
  { y: 0.4, scale: 1.2, ms: 280_000, start: 0.45 },
];

function Clouds({ state, tier, blend, width = 0, height = 0 }: LayerProps) {
  const level = useEased(state.look.clouds * (tier === 'full' ? 1 : 0.8), blend);
  const clouds = tier === 'full' ? CLOUDS : CLOUDS.slice(0, 2);
  const moving = tier === 'full' && state.ambient && state.look.clouds > 0.02;
  return (
    <Group opacity={level}>
      {clouds.map((c, i) => (
        <Cloud key={i} {...c} width={width} height={height} moving={moving} />
      ))}
    </Group>
  );
}

function Cloud({ y, scale, ms, start, width, height, moving }: (typeof CLOUDS)[number] & { width: number; height: number; moving: boolean }) {
  const span = width + 240 * scale;
  const x = useSharedValue(start * span);
  useEffect(() => {
    if (!moving) {
      cancelAnimation(x);
      return;
    }
    // Drift right to left; wrap around off-screen.
    const from = x.get();
    x.set(
      withSequence(
        withTiming(0, { duration: (from / span) * ms, easing: Easing.linear }),
        withRepeat(withSequence(withTiming(span, { duration: 0 }), withTiming(0, { duration: ms, easing: Easing.linear })), -1),
      ),
    );
  }, [moving, ms, span, x]);
  const transform = useDerivedValue(() => [{ translateX: x.get() - 120 * scale }, { translateY: height * y }, { scale }]);
  return (
    <Group transform={transform}>
      {PUFFS.map(([dx, dy, r], i) => (
        <Circle key={i} cx={dx} cy={dy} r={r}>
          <RadialGradient c={vec(dx, dy)} r={r} colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']} />
        </Circle>
      ))}
    </Group>
  );
}

// ── afternoon rays ─────────────────────────────────────────────────────────────────────────

/** Three faint beams from the low Asr sun, breathing over 8 s (full quality only). */
function Rays({ state, tier, height = 0 }: LayerProps) {
  const on = tier === 'full' && state.rays && !!state.sun;
  const breath = useSharedValue(0);
  useEffect(() => {
    if (!on) {
      cancelAnimation(breath);
      breath.set(withTiming(0, { duration: 600 }));
      return;
    }
    breath.set(withRepeat(withSequence(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), withTiming(0.45, { duration: 4000, easing: Easing.inOut(Easing.sin) })), -1));
  }, [on, breath]);
  const beams = useMemo(() => {
    if (!state.sun) return [];
    const { x, y } = state.sun;
    // Fanning down and away from the sun, toward the middle of the screen.
    return [-0.35, -0.05, 0.25].map((a, i) => {
      const len = height * (0.75 + i * 0.08);
      const dir = x > 200 ? -1 : 1;
      const ang = Math.PI / 2 - dir * (0.55 + a);
      const spread = 0.05 + i * 0.012;
      return Skia.PathBuilder.Make()
        .moveTo(x, y)
        .lineTo(x + Math.cos(ang - spread) * len, y + Math.sin(ang - spread) * len)
        .lineTo(x + Math.cos(ang + spread) * len, y + Math.sin(ang + spread) * len)
        .close()
        .build();
    });
  }, [state.sun, height]);
  const opacity = useDerivedValue(() => breath.get() * 0.5);
  if (!beams.length) return null;
  return (
    <Group opacity={opacity}>
      {beams.map((p, i) => (
        <Path key={i} path={p}>
          <RadialGradient c={vec(state.sun!.x, state.sun!.y)} r={height * 0.8} colors={['rgba(255,240,200,0.35)', 'rgba(255,240,200,0)']} />
        </Path>
      ))}
    </Group>
  );
}

// ── sun & moon ─────────────────────────────────────────────────────────────────────────────

function useBody(pos: { x: number; y: number } | null, blend: number) {
  const ms = blend;
  const x = useSharedValue(pos?.x ?? 0);
  const y = useSharedValue(pos?.y ?? 0);
  const shown = useEased(pos ? 1 : 0, blend ? 900 : 0);
  useEffect(() => {
    if (!pos) return;
    const ease = { duration: ms, easing: Easing.inOut(Easing.sin) };
    x.set(ms && shown.get() > 0 ? withTiming(pos.x, ease) : pos.x);
    y.set(ms && shown.get() > 0 ? withTiming(pos.y, ease) : pos.y);
  }, [pos?.x, pos?.y, ms, x, y, shown, pos]);
  const transform = useDerivedValue(() => [{ translateX: x.get() }, { translateY: y.get() }]);
  return { transform, shown };
}

function Sun({ state, blend }: LayerProps) {
  const { transform, shown } = useBody(state.sun, blend);
  return (
    <Group transform={transform} opacity={shown}>
      <Circle cx={0} cy={0} r={78}>
        <RadialGradient c={vec(0, 0)} r={78} colors={['rgba(255,244,214,0.55)', 'rgba(255,236,200,0.18)', 'rgba(255,236,200,0)']} positions={[0, 0.4, 1]} />
      </Circle>
      <Circle cx={0} cy={0} r={21} color="#fff6d8" />
    </Group>
  );
}

const MOON_R = 15;

function Moon({ state, blend, now }: LayerProps & { now: Date }) {
  const { transform, shown } = useBody(state.moon, blend);
  const day = now.toDateString();
  const lit = useMemo(() => {
    const { illumination: k, waxing } = moonPhase(new Date(day));
    const sign = waxing ? 1 : -1;
    const rx = Math.max(0.01, MOON_R * Math.abs(1 - 2 * k));
    // Lit limb (a half circle on the lit side), then back along the terminator (half an ellipse).
    return Skia.PathBuilder.Make()
      .moveTo(0, -MOON_R)
      .arcToOval(Skia.XYWHRect(-MOON_R, -MOON_R, MOON_R * 2, MOON_R * 2), -90, 180 * sign, false)
      .arcToOval(Skia.XYWHRect(-rx, -MOON_R, rx * 2, MOON_R * 2), 90, (k < 0.5 ? -180 : 180) * sign, false)
      .close()
      .build();
  }, [day]);
  return (
    <Group transform={transform} opacity={shown}>
      <Circle cx={0} cy={0} r={MOON_R * 3.4}>
        <RadialGradient c={vec(0, 0)} r={MOON_R * 3.4} colors={['rgba(223,228,255,0.22)', 'rgba(223,228,255,0)']} />
      </Circle>
      <Circle cx={0} cy={0} r={MOON_R} color="rgba(236,235,223,0.1)" />
      <Path path={lit} color="#efeee2" />
    </Group>
  );
}

// ── shooting star ──────────────────────────────────────────────────────────────────────────

function ShootingStar({ state, tier, width = 0, height = 0 }: LayerProps) {
  const p = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const on = tier === 'full' && state.shooting && state.look.stars > 0.7;
  useEffect(() => {
    if (!on) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        sx.set(width * (0.35 + Math.random() * 0.55));
        sy.set(height * (0.05 + Math.random() * 0.25));
        p.set(0);
        p.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
        next();
      }, (3 + Math.random() * 5) * 60_000);
    };
    next();
    return () => clearTimeout(timer);
  }, [on, width, height, p, sx, sy]);
  const LEN = 140;
  const head = useDerivedValue(() => vec(sx.get() - LEN * p.get(), sy.get() + LEN * 0.45 * p.get()));
  const tail = useDerivedValue(() => {
    const q = Math.max(0, p.get() - 0.3);
    return vec(sx.get() - LEN * q, sy.get() + LEN * 0.45 * q);
  });
  const opacity = useDerivedValue(() => Math.sin(Math.PI * p.get()));
  if (!on) return null;
  return <Line p1={tail} p2={head} color="#ffffff" strokeWidth={1.4} strokeCap="round" opacity={opacity} />;
}

function Dim({ state, blend, width = 0, height = 0 }: LayerProps) {
  const level = useEased(state.dim, blend ? 1200 : 0);
  return <Rect x={0} y={0} width={width} height={height} color="#000000" opacity={level} />;
}

/**
 * Watches the first seconds of real animation on the full tier; if too many frames are slow, auto
 * quality drops to lite for good (DESIGN_PLAN §6.3). Release builds only — dev builds are slow.
 */
export function useFrameWatch(active: boolean, onSlow: () => void) {
  const [measuring, setMeasuring] = useState(true);
  const frames = useSharedValue(0);
  const slow = useSharedValue(0);
  const elapsed = useSharedValue(0);
  const finished = useSharedValue(false);
  const finish = useCallback((tooSlow: boolean) => {
    setMeasuring(false);
    if (tooSlow) onSlow();
  }, [onSlow]);
  const cb = useFrameCallback((info) => {
    const dt = info.timeSincePreviousFrame;
    if (dt === null || finished.get()) return;
    frames.set(frames.get() + 1);
    elapsed.set(elapsed.get() + dt);
    if (dt > 25) slow.set(slow.get() + 1);
    if (elapsed.get() > 10_000) {
      finished.set(true);
      scheduleOnRN(finish, frames.get() > 120 && slow.get() / frames.get() > 0.2);
    }
  }, false);
  useEffect(() => {
    cb.setActive(active && measuring);
  }, [active, measuring, cb]);
}

