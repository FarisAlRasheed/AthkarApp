import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { motion } from '@/theme';

// ── ink ripple ─────────────────────────────────────────────────────────────────────────────

export interface RipplesHandle {
  spawn: (x: number, y: number) => void;
}

const RIPPLE_R = 140;

/**
 * Each counting tap spreads a soft circle of ink from the finger (DESIGN_PLAN §7.3). A fixed pool
 * of views is reused round-robin, so fast taps never allocate anything.
 */
export const Ripples = forwardRef<RipplesHandle, { color: string; pool: number }>(function Ripples({ color, pool }, ref) {
  const next = useRef(0);
  const slots = [useSlot(), useSlot(), useSlot()].slice(0, Math.max(1, pool));
  useImperativeHandle(ref, () => ({
    spawn: (x, y) => {
      const s = slots[next.current++ % slots.length];
      s.x.set(x);
      s.y.set(y);
      s.p.set(0);
      s.p.set(withTiming(1, { duration: 900, easing: motion.easing.enter }));
    },
  }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {slots.map((s, i) => <Ripple key={i} slot={s} color={color} />)}
    </View>
  );
});

function useSlot() {
  return { x: useSharedValue(0), y: useSharedValue(0), p: useSharedValue(1) };
}

function Ripple({ slot, color }: { slot: ReturnType<typeof useSlot>; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = slot.p.get();
    const r = interpolate(p, [0, 1], [8, RIPPLE_R]);
    return {
      opacity: interpolate(p, [0, 1], [0.16, 0]),
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      transform: [{ translateX: slot.x.get() - r }, { translateY: slot.y.get() - r }],
    };
  });
  return <Animated.View style={[styles.ripple, { backgroundColor: color }, style]} />;
}

// ── rising light motes ─────────────────────────────────────────────────────────────────────

export interface MotesHandle {
  /** Lift the motes from a region (px, in the overlay's coordinates). */
  lift: (x: number, y: number, width: number, height: number) => void;
}

const MOTES = 6;

/**
 * When a thiker is complete, a few points of light lift from its words into the sky and fade
 * (DESIGN_PLAN §7.3, «إليه يصعد الكلم الطيب»). One progress value drives them all.
 */
export const Motes = forwardRef<MotesHandle, { color: string }>(function Motes({ color }, ref) {
  const p = useSharedValue(1);
  const origin = [useMote(), useMote(), useMote(), useMote(), useMote(), useMote()];
  useImperativeHandle(ref, () => ({
    lift: (x, y, width, height) => {
      origin.forEach((m) => {
        m.x.set(x + Math.random() * width);
        m.y.set(y + height * (0.2 + Math.random() * 0.6));
        m.rise.set(120 + Math.random() * 110);
        m.drift.set((Math.random() - 0.5) * 40);
      });
      p.set(0);
      p.set(withDelay(250, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) })));
    },
  }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {origin.slice(0, MOTES).map((m, i) => <Mote key={i} mote={m} p={p} color={color} size={2 + (i % 3)} />)}
    </View>
  );
});

function useMote() {
  return { x: useSharedValue(0), y: useSharedValue(0), rise: useSharedValue(0), drift: useSharedValue(0) };
}

function Mote({ mote, p, color, size }: { mote: ReturnType<typeof useMote>; p: SharedValue<number>; color: string; size: number }) {
  const style = useAnimatedStyle(() => {
    const t = p.get();
    return {
      opacity: t >= 1 ? 0 : Math.sin(Math.PI * Math.min(1, t * 1.2)) * 0.9,
      transform: [
        { translateX: mote.x.get() + mote.drift.get() * t },
        { translateY: mote.y.get() - mote.rise.get() * t },
      ],
    };
  });
  return <Animated.View style={[styles.mote, { width: size * 2, height: size * 2, borderRadius: size, backgroundColor: color, shadowColor: color }, style]} />;
}

const styles = StyleSheet.create({
  ripple: { position: 'absolute', left: 0, top: 0 },
  mote: { position: 'absolute', left: 0, top: 0, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
});
