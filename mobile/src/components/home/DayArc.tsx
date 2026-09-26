import { memo, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedProps, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { T } from '@/components/ui';
import { usePrayerTimes, useTheme } from '@/hooks';
import { formatTime } from '@/lib/arabic';
import { addDays, nightTimes, type DayTimes } from '@/lib/prayer';
import type { Tier } from '@/lib/quality';
import { moonPhase } from '@/lib/sky';
import { motion } from '@/theme';

const HEIGHT = 112;
const PAD = 16;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Mark = { at: Date; label?: string; next?: boolean };

/**
 * «قوس اليوم» (DESIGN_PLAN §7.2): by day, the sun's path from Fajr to Maghrib; by night, the night
 * from Maghrib to Fajr with its middle and last third. The sun or the moon (in its real phase) sits
 * at the current time; the part already travelled is drawn brighter. Right to left, like the text.
 */
export const DayArc = memo(function DayArc({ tier, nextAt }: { tier: Tier; nextAt: Date }) {
  const theme = useTheme();
  const { now, today, timesFor } = usePrayerTimes();
  const [width, setWidth] = useState(0);

  const arc = useMemo(() => {
    const night = now >= today.maghrib || now < today.fajr;
    const yesterday = timesFor(addDays(now, -1));
    const tomorrow = timesFor(addDays(now, 1));
    const start = night ? (now >= today.maghrib ? today.maghrib : yesterday.maghrib) : today.fajr;
    const end = night ? (now >= today.maghrib ? tomorrow.fajr : today.fajr) : today.maghrib;
    return { night, start, end, marks: marksFor(night, start, end, night ? (now >= today.maghrib ? today : yesterday) : today) };
  }, [now, today, timesFor]);

  const horizon = HEIGHT - 22;
  const amp = horizon - 14;
  const span = arc.end.getTime() - arc.start.getTime();
  const sunrise = today.sunrise.getTime();
  const point = (t: Date) => {
    const u = Math.min(1, Math.max(0, (t.getTime() - arc.start.getTime()) / span));
    let alt: number;
    if (arc.night) alt = 0.72 * Math.sin(Math.PI * u);
    else if (t.getTime() < sunrise) alt = -0.2 * (1 - (t.getTime() - arc.start.getTime()) / (sunrise - arc.start.getTime()));
    else alt = Math.sin((Math.PI * (t.getTime() - sunrise)) / (arc.end.getTime() - sunrise));
    return { x: width - PAD - u * (width - 2 * PAD), y: horizon - alt * amp };
  };
  const pathTo = (until: Date) => {
    const steps = 48;
    const stop = Math.min(until.getTime(), arc.end.getTime());
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const t = arc.start.getTime() + ((stop - arc.start.getTime()) * i) / steps;
      const p = point(new Date(t));
      d += `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    return d;
  };

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (tier !== 'full') {
      cancelAnimation(pulse);
      pulse.set(1);
      return;
    }
    pulse.set(withRepeat(withSequence(withTiming(0.45, { duration: 1500, easing: motion.easing.drift }), withTiming(1, { duration: 1500, easing: motion.easing.drift })), -1));
  }, [tier, pulse]);
  const pulseProps = useAnimatedProps(() => ({ opacity: pulse.get() }));

  const body = point(now);
  const moon = moonPhase(now);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="image" accessibilityLabel={arc.night ? 'مسار الليل' : 'مسار الشمس'}>
      {width ? (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={theme.glow} stopOpacity={0.55} />
              <Stop offset="1" stopColor={theme.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Line x1={PAD / 2} x2={width - PAD / 2} y1={horizon} y2={horizon} stroke={theme.border} strokeWidth={1} strokeDasharray="2 5" />
          <Path d={pathTo(arc.end)} stroke={theme.border} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          <Path d={pathTo(now)} stroke={theme.text} strokeOpacity={0.75} strokeWidth={2} fill="none" strokeLinecap="round" />
          {arc.marks.map((m, i) => {
            const p = point(m.at);
            const next = m.at.getTime() === nextAt.getTime();
            return next ? (
              <AnimatedCircle key={i} cx={p.x} cy={p.y} r={5} fill={theme.accent} animatedProps={pulseProps} />
            ) : (
              <Circle key={i} cx={p.x} cy={p.y} r={3} fill={m.at <= now ? theme.text : theme.muted} />
            );
          })}
          <Circle cx={body.x} cy={body.y} r={22} fill="url(#halo)" />
          {arc.night ? (
            <>
              <Circle cx={body.x} cy={body.y} r={8} fill={theme.text} opacity={0.15} />
              <Path d={moonPath(body.x, body.y, 8, moon.illumination, moon.waxing)} fill="#efeee2" />
            </>
          ) : (
            <Circle cx={body.x} cy={body.y} r={8} fill="#fff3cf" opacity={now.getTime() < sunrise ? 0.5 : 1} />
          )}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
      {arc.night ? (
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-around', marginTop: -4 }}>
          {arc.marks.filter((m) => m.label).map((m) => (
            <T key={m.label} variant="caption" muted center>{`${m.label} ${formatTime(m.at)}`}</T>
          ))}
        </View>
      ) : null}
    </View>
  );
});

function marksFor(night: boolean, start: Date, end: Date, day: DayTimes): Mark[] {
  if (!night) return [{ at: day.fajr }, { at: day.sunrise }, { at: day.dhuhr }, { at: day.asr }, { at: day.maghrib }];
  const { middle, lastThird } = nightTimes(start, end);
  return [
    { at: start },
    { at: day.isha },
    { at: middle, label: 'منتصف الليل' },
    { at: lastThird, label: 'الثلث الأخير' },
    { at: end },
  ];
}

/** The moon's lit part as an SVG path: the lit limb, then back along the terminator. */
function moonPath(cx: number, cy: number, r: number, k: number, waxing: boolean) {
  const rx = Math.max(0.01, r * Math.abs(1 - 2 * k));
  const limbSweep = waxing ? 1 : 0;
  const termSweep = (k < 0.5) === waxing ? 0 : 1;
  return `M${cx} ${cy - r}A${r} ${r} 0 0 ${limbSweep} ${cx} ${cy + r}A${rx} ${r} 0 0 ${termSweep} ${cx} ${cy - r}Z`;
}
