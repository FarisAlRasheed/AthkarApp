import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutUp,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ring, T } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import type { Tier } from '@/lib/quality';
import { motion } from '@/theme';

const SIZE = 88;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const SEGMENTED_MAX = 12;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** SVG arc along the ring from angle a to b (degrees, 0 = top, clockwise). */
function arc(a: number, b: number) {
  const pt = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${SIZE / 2 + R * Math.cos(rad)} ${SIZE / 2 + R * Math.sin(rad)}`;
  };
  return `M${pt(a)}A${R} ${R} 0 ${b - a > 180 ? 1 : 0} 1 ${pt(b)}`;
}

/**
 * The remaining-count display (DESIGN_PLAN §7.3). Display only: the whole card counts.
 * Targets up to 12 get one segment per count; larger ones a smooth ring. The number rolls; a
 * finished thiker shows ✓ — never a lone «٠», which in Arabic digits is only a dot.
 */
export const Counter = memo(function Counter({ count, num, tier, milestone }: {
  count: number; num: number; tier: Tier; milestone: number;
}) {
  const theme = useTheme();
  const remaining = num - count;
  const glow = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (tier === 'still' || !milestone) return;
    glow.set(withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 500, easing: motion.easing.drift })));
  }, [milestone, tier, glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() * 0.35 }));

  const roll = tier === 'full';
  const done = remaining <= 0;

  return (
    <View style={styles.box}>
      <Animated.View style={[styles.glow, { backgroundColor: theme.accent }, glowStyle]} />
      {num <= SEGMENTED_MAX ? (
        <Segments count={count} num={num} color={done ? theme.success : theme.accent} track={theme.paperBorder} tier={tier} />
      ) : (
        <Ring size={SIZE} stroke={STROKE} progress={count / num} color={done ? theme.success : theme.accent} track={theme.paperBorder} />
      )}
      <View style={StyleSheet.absoluteFill}>
        {done ? (
          <Animated.View key="done" entering={tier === 'still' ? FadeIn.duration(150) : ZoomIn.duration(220)} style={styles.center}>
            <Ionicons name="checkmark" size={36} color={theme.success} />
          </Animated.View>
        ) : (
          <Animated.View
            key={remaining}
            entering={roll ? FadeInDown.duration(200).easing(motion.easing.enter) : FadeIn.duration(120)}
            exiting={roll ? FadeOutUp.duration(160) : undefined}
            style={styles.center}
          >
            <T variant="display" center color={theme.paperText} style={{ fontSize: 30, lineHeight: 40 }}>{toArabicDigits(remaining)}</T>
          </Animated.View>
        )}
      </View>
    </View>
  );
});

function Segments({ count, num, color, track, tier }: { count: number; num: number; color: string; track: string; tier: Tier }) {
  const gap = num === 1 ? 0 : Math.min(10, 36 / num);
  const span = 360 / num;
  const segs = Array.from({ length: num }, (_, i) => (num === 1 ? arc(0, 359.9) : arc(i * span + gap / 2, (i + 1) * span - gap / 2)));
  return (
    <Svg width={SIZE} height={SIZE}>
      {num === 1 ? <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={track} strokeWidth={STROKE} fill="none" /> : null}
      {segs.map((d, i) => (
        <Segment key={`${num}-${i}`} d={d} filled={i < count} color={color} track={track} length={(2 * Math.PI * R * (span - gap)) / 360} animate={tier === 'full' && i === count - 1} />
      ))}
    </Svg>
  );
}

/** One segment; the newest one sweeps in over 280 ms. */
function Segment({ d, filled, color, track, length, animate }: { d: string; filled: boolean; color: string; track: string; length: number; animate: boolean }) {
  const p = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    p.set(filled && animate ? withTiming(1, { duration: 280, easing: motion.easing.enter }) : filled ? 1 : 0);
  }, [filled, animate, p]);
  // Hidden at zero, or the round cap would leave a dot.
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - p.get()), strokeOpacity: p.get() > 0.001 ? 1 : 0 }));
  return (
    <>
      <Path d={d} stroke={track} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
      <AnimatedPath d={d} stroke={color} strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeDasharray={`${length} ${length}`} animatedProps={props} />
    </>
  );
}

const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: SIZE + 24, height: SIZE + 24, borderRadius: (SIZE + 24) / 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
