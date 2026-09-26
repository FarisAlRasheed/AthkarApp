import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Press, Row, T } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import type { Tier } from '@/lib/quality';
import { motion, space } from '@/theme';

const WINDOW = 30;
const BEAD = 6;

/**
 * The collection as a thread of beads (DESIGN_PLAN §7.3): done = filled, partial = half, current =
 * ringed, untouched = outline; right to left. Tapping it opens the list of athkar.
 */
export const Thread = memo(function Thread({ counts, nums, index, tier, onPress }: {
  counts: number[]; nums: number[]; index: number; tier: Tier; onPress: () => void;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const total = nums.length;
  const start = total <= WINDOW ? 0 : Math.min(Math.max(0, index - WINDOW / 2), total - WINDOW);
  const shown = Math.min(total, WINDOW);
  const step = shown > 1 ? (width - BEAD * 2) / (shown - 1) : 0;
  // Right to left: the first bead sits at the right edge.
  const xOf = (i: number) => width - BEAD - (i - start) * step;

  const marker = useSharedValue(0);
  useEffect(() => {
    if (!width) return;
    const x = xOf(index);
    marker.set(tier === 'full' && marker.get() ? withSpring(x, motion.spring.settle) : x);
    // xOf depends only on width/start/step, all derived from the values below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, width, start, step, tier]);
  const markerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: marker.get() - 7 }] }));

  return (
    <Press onPress={onPress} depth={motion.press.card} accessibilityLabel={`الذكر ${index + 1} من ${total} — عرض القائمة`} hitSlop={6}>
      <Row gap={space.sm} style={{ paddingVertical: 6 }}>
        <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width ? (
            <>
              <View style={[styles.line, { backgroundColor: theme.paperBorder }]} />
              {nums.slice(start, start + shown).map((n, k) => {
                const i = start + k;
                const c = counts[i] ?? 0;
                const done = c >= n;
                return (
                  <View
                    key={i}
                    style={[
                      styles.bead,
                      { left: xOf(i) - BEAD / 2, borderColor: done || c ? theme.accent : theme.paperBorder },
                      done && { backgroundColor: theme.accent },
                      !done && c > 0 && { backgroundColor: theme.accent, opacity: 0.45 },
                    ]}
                  />
                );
              })}
              <Animated.View style={[styles.marker, { borderColor: theme.accent }, markerStyle]} />
            </>
          ) : null}
        </View>
        <T variant="caption" bold color={theme.paperMuted} style={{ minWidth: 44, textAlign: 'center' }}>
          {`${toArabicDigits(index + 1)} / ${toArabicDigits(total)}`}
        </T>
      </Row>
    </Press>
  );
});

const styles = StyleSheet.create({
  track: { flex: 1, height: 16, justifyContent: 'center' },
  line: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  bead: { position: 'absolute', top: 5, width: BEAD, height: BEAD, borderRadius: BEAD / 2, borderWidth: 1 },
  marker: { position: 'absolute', left: 0, top: 1, width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
});
