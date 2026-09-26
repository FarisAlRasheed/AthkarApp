import { useEffect, useState } from 'react';
import type { TextStyle } from 'react-native';
import { formatRemaining, ticksBySecond } from '@/lib/arabic';
import { T } from './ui';

/**
 * Time left until `target`, re-rendering only itself: once a minute, and every second only in the
 * last ten minutes (DESIGN_PLAN §6.2 — the rest of the screen never re-renders for the clock).
 */
export function Countdown({ target, style, color }: { target: Date; style?: TextStyle; color?: string }) {
  const [now, setNow] = useState(() => Date.now());
  const at = target.getTime();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      const delay = ticksBySecond(at - n) ? 1000 - (n % 1000) : 60_000 - (n % 60_000);
      timer = setTimeout(tick, delay + 15);
    };
    tick();
    return () => clearTimeout(timer);
  }, [at]);

  return (
    <T variant="display" center color={color} style={style} accessibilityLiveRegion="none">
      {formatRemaining(at - now)}
    </T>
  );
}
