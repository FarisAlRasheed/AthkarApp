import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/hooks';
import { fonts, motion, radius, space } from '@/theme';

// Layout is right-to-left by construction (automatic RTL flipping is off in app.json):
// rows use row-reverse and text is right-aligned, so it looks the same on every platform.

// Custom fonts need one family per weight (fontWeight would fake-bold on Android).
type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption';
const SIZES: Record<Variant, TextStyle> = {
  display: { fontSize: 40, fontFamily: fonts.semibold, fontVariant: ['tabular-nums'] },
  title: { fontSize: 26, fontFamily: fonts.title, lineHeight: 42 },
  heading: { fontSize: 17, fontFamily: fonts.semibold },
  body: { fontSize: 16, fontFamily: fonts.regular },
  caption: { fontSize: 13, fontFamily: fonts.regular },
};

export function T({ variant = 'body', muted, color, center, bold, style, ...rest }: TextProps & {
  variant?: Variant; muted?: boolean; color?: string; center?: boolean; bold?: boolean;
}) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        SIZES[variant],
        bold && { fontFamily: fonts.semibold },
        { color: color ?? (muted ? theme.muted : theme.text), textAlign: center ? 'center' : 'right', writingDirection: 'rtl' },
        style,
      ]}
    />
  );
}

export function Row({ style, children, gap = space.sm }: { style?: StyleProp<ViewStyle>; children: ReactNode; gap?: number }) {
  return <View style={[{ flexDirection: 'row-reverse', alignItems: 'center', gap }, style]}>{children}</View>;
}

/**
 * Pressable that sinks slightly and settles back — the tactile feel used by every control.
 * `style` is the look (it shrinks with the press); `containerStyle` is layout for the pressable
 * itself (flex, alignSelf) — put flex there, or it never reaches the row.
 */
export function Press({ onPress, style, containerStyle, children, depth = motion.press.button, disabled, hitSlop, ...a11y }: {
  onPress?: () => void; style?: StyleProp<ViewStyle>; containerStyle?: StyleProp<ViewStyle>; children: ReactNode;
  depth?: number; disabled?: boolean;
  hitSlop?: number; accessibilityLabel?: string; accessibilityHint?: string;
  accessibilityRole?: 'button' | 'tab'; accessibilityState?: { selected?: boolean };
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={onPress}
      style={containerStyle}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={a11y.accessibilityRole ?? 'button'}
      accessibilityLabel={a11y.accessibilityLabel}
      accessibilityHint={a11y.accessibilityHint}
      accessibilityState={a11y.accessibilityState}
      onPressIn={() => { scale.set(withTiming(depth, PRESS_IN)); }}
      onPressOut={() => { scale.set(withSpring(1, motion.spring.settle)); }}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}

const PRESS_IN = { duration: motion.duration.tap, easing: motion.easing.enter };

/** Glass card on the sky; `alt` is a flat tint for use inside sheets, `paper` the reading surface. */
export function Card({ style, children, onPress, alt, paper }: {
  style?: StyleProp<ViewStyle>; children: ReactNode; onPress?: () => void; alt?: boolean; paper?: boolean;
}) {
  const theme = useTheme();
  const look = paper
    ? { backgroundColor: theme.paper, borderColor: theme.paperBorder }
    : alt
      ? { backgroundColor: theme.surfaceAlt, borderColor: 'transparent' }
      : { backgroundColor: theme.glass, borderColor: theme.border };
  const base = [styles.card, look, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return <Press onPress={onPress} style={base} depth={motion.press.card}>{children}</Press>;
}

export function IconButton({ name, onPress, label, size = 24, color, filled }: {
  name: ComponentProps<typeof Ionicons>['name']; onPress: () => void; label: string;
  size?: number; color?: string; filled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Press onPress={onPress} accessibilityLabel={label} hitSlop={8} depth={motion.press.icon} style={[styles.icon, filled && { backgroundColor: theme.accent }]}>
      <Ionicons name={name} size={size} color={color ?? (filled ? theme.onAccent : theme.text)} />
    </Press>
  );
}

export function Pill({ label, onPress, active, onPaper }: { label: string; onPress?: () => void; active?: boolean; onPaper?: boolean }) {
  const theme = useTheme();
  const fg = active ? theme.onAccent : onPaper ? theme.paperText : theme.text;
  const text = <T variant="caption" bold color={fg}>{label}</T>;
  // Inactive pills get a border so they stay visible on any background.
  const look = active
    ? { backgroundColor: theme.accent, borderColor: theme.accent }
    : { backgroundColor: 'transparent', borderColor: onPaper ? theme.paperBorder : theme.border };
  if (!onPress) return <View style={[styles.pill, look]}>{text}</View>;
  return <Press onPress={onPress} depth={motion.press.icon} style={[styles.pill, look]}>{text}</Press>;
}

export function Button({ label, onPress, kind = 'primary', icon }: {
  label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger';
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  const theme = useTheme();
  const bg = kind === 'primary' ? theme.accent : theme.glass;
  const fg = kind === 'primary' ? theme.onAccent : kind === 'danger' ? '#e0584b' : theme.text;
  return (
    <Press onPress={onPress} style={[styles.button, { backgroundColor: bg, borderColor: kind === 'primary' ? theme.accent : theme.border }]}>
      <Row gap={space.sm} style={{ justifyContent: 'center' }}>
        {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
        <T variant="heading" color={fg}>{label}</T>
      </Row>
    </Press>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Circular progress ring; fills clockwise from the top, easing to each new value with a small bump. */
export function Ring({ size, stroke, progress, color, track, children }: {
  size: number; stroke: number; progress: number; color: string; track: string; children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(1, progress));
  const p = useSharedValue(target);
  const bump = useSharedValue(1);

  useEffect(() => {
    const grew = target > p.value;
    p.set(withTiming(target, { duration: 420, easing: motion.easing.enter }));
    if (grew) bump.set(withSequence(withTiming(1.03, { duration: 90 }), withSpring(1, motion.spring.settle)));
  }, [target, p, bump]);

  const circleProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
  const bumpStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));

  return (
    <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, bumpStyle]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`} strokeLinecap="round" animatedProps={circleProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth },
  icon: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  button: { minHeight: 52, borderRadius: radius.md, paddingHorizontal: space.lg, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
