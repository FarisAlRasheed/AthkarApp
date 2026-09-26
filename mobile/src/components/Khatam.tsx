import { memo, useEffect } from 'react';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { motion } from '@/theme';

/**
 * «الخاتم» — the eight-point star (two overlapping squares), in thin lines only (DESIGN_PLAN §2.3).
 * With `draw`, it draws itself once over `duration` ms.
 */
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function geometry(size: number) {
  const c = size / 2;
  const s = size * 0.3; // half the side of each square
  const r = s * Math.SQRT2;
  const square = `M${c - s} ${c - s}L${c + s} ${c - s}L${c + s} ${c + s}L${c - s} ${c + s}Z`;
  const diamond = `M${c} ${c - r}L${c + r} ${c}L${c} ${c + r}L${c - r} ${c}Z`;
  return { c, ring: s * 0.62, path: `${square}${diamond}`, length: 16 * s };
}

export const Khatam = memo(function Khatam({ size, color, strokeWidth = 1, draw, delay = 0, duration = 1200 }: {
  size: number; color: string; strokeWidth?: number; draw?: boolean; delay?: number; duration?: number;
}) {
  const { c, ring, path, length } = geometry(size);
  const ringLength = 2 * Math.PI * ring;
  const p = useSharedValue(draw ? 0 : 1);
  useEffect(() => {
    if (draw) p.set(withDelay(delay, withTiming(1, { duration, easing: motion.easing.drift })));
  }, [draw, delay, duration, p]);
  const starProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - p.get()) }));
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: ringLength * (1 - p.get()) }));

  return (
    <Svg width={size} height={size}>
      <AnimatedPath
        d={path} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round"
        strokeDasharray={`${length} ${length}`} animatedProps={starProps}
      />
      <AnimatedCircle
        cx={c} cy={c} r={ring} stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeDasharray={`${ringLength} ${ringLength}`} animatedProps={ringProps}
      />
    </Svg>
  );
});
