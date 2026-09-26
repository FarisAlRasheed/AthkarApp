import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@/hooks';
import { useTier } from '@/lib/quality';
import { motion, radius, space } from '@/theme';
import { IconButton, Row, T } from './ui';

/**
 * Bottom sheet: the dim backdrop fades while the sheet rises, and both go back down on close.
 * Dragging the handle down closes it — a shortcut for the × button, which is always there.
 */
export function Sheet({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  const theme = useTheme();
  const tier = useTier();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const open = useSharedValue(0);
  const drag = useSharedValue(0);
  // Mount as soon as it should show; unmount only after the closing animation.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      drag.set(0);
      open.set(tier === 'still' ? withTiming(1, { duration: 160 }) : withSpring(1, motion.spring.gentle));
    } else if (mounted) {
      open.set(withTiming(0, { duration: motion.duration.quick, easing: motion.easing.exit }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      }));
    }
  }, [visible, mounted, open, drag, tier]);

  const pan = Gesture.Pan()
    .onChange((e) => {
      drag.set(Math.max(0, drag.get() + e.changeY));
    })
    .onEnd((e) => {
      if (drag.get() > 110 || e.velocityY > 900) scheduleOnRN(onClose);
      else drag.set(withSpring(0, motion.spring.settle));
    });

  const backdrop = useAnimatedStyle(() => ({ opacity: open.get() }));
  const sheet = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(open.get(), [0, 1], [height * 0.6, 0]) + drag.get() }],
  }));

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="إغلاق" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { backgroundColor: theme.sheet, paddingBottom: insets.bottom + space.lg }, sheet]}>
          <GestureDetector gesture={pan}>
            <View>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
              <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
                <T variant="heading">{title}</T>
                <IconButton name="close" label="إغلاق" onPress={onClose} />
              </Row>
            </View>
          </GestureDetector>
          <ScrollView contentContainerStyle={{ gap: space.md }}>{children}</ScrollView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.38)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '78%',
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: space.lg, paddingTop: space.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: space.sm },
});
