import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/hooks';
import { radius, space } from '@/theme';

// Layout is right-to-left by construction (automatic RTL flipping is off in app.json):
// rows use row-reverse and text is right-aligned, so it looks the same on every platform.

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption';
const SIZES: Record<Variant, TextStyle> = {
  display: { fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] },
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16 },
  caption: { fontSize: 13 },
};

export function T({ variant = 'body', muted, color, center, style, ...rest }: TextProps & {
  variant?: Variant; muted?: boolean; color?: string; center?: boolean;
}) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        SIZES[variant],
        { color: color ?? (muted ? theme.muted : theme.text), textAlign: center ? 'center' : 'right', writingDirection: 'rtl' },
        style,
      ]}
    />
  );
}

export function Row({ style, children, gap = space.sm }: { style?: StyleProp<ViewStyle>; children: ReactNode; gap?: number }) {
  return <View style={[{ flexDirection: 'row-reverse', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Card({ style, children, onPress, alt }: {
  style?: StyleProp<ViewStyle>; children: ReactNode; onPress?: () => void; alt?: boolean;
}) {
  const theme = useTheme();
  const base = [styles.card, { backgroundColor: alt ? theme.surfaceAlt : theme.surface }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      {children}
    </Pressable>
  );
}

export function IconButton({ name, onPress, label, size = 24, color, filled }: {
  name: ComponentProps<typeof Ionicons>['name']; onPress: () => void; label: string;
  size?: number; color?: string; filled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.icon,
        filled && { backgroundColor: theme.accent },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Ionicons name={name} size={size} color={color ?? (filled ? theme.onAccent : theme.text)} />
    </Pressable>
  );
}

export function Pill({ label, onPress, active }: { label: string; onPress?: () => void; active?: boolean }) {
  const theme = useTheme();
  const text = <T variant="caption" color={active ? theme.onAccent : theme.text} style={{ fontWeight: '600' }}>{label}</T>;
  // Inactive pills get a border so they stay visible on any card background.
  const look = active
    ? { backgroundColor: theme.accent, borderColor: theme.accent }
    : { backgroundColor: 'transparent', borderColor: theme.border };
  if (!onPress) return <View style={[styles.pill, look]}>{text}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.pill, look, pressed && { opacity: 0.7 }]}
    >
      {text}
    </Pressable>
  );
}

export function Button({ label, onPress, kind = 'primary', icon }: {
  label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger';
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  const theme = useTheme();
  const bg = kind === 'primary' ? theme.accent : theme.surfaceAlt;
  const fg = kind === 'primary' ? theme.onAccent : kind === 'danger' ? '#d0473b' : theme.text;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.button, { backgroundColor: bg }, pressed && { opacity: 0.8 }]}>
      <Row gap={space.sm} style={{ justifyContent: 'center' }}>
        {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
        <T variant="heading" color={fg}>{label}</T>
      </Row>
    </Pressable>
  );
}

/** Circular progress ring; fills clockwise from the top. */
export function Ring({ size, stroke, progress, color, track, children }: {
  size: number; stroke: number; progress: number; color: string; track: string; children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - p)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg },
  icon: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  button: { minHeight: 52, borderRadius: radius.md, paddingHorizontal: space.lg, justifyContent: 'center' },
});
