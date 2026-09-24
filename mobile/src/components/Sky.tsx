import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks';
import type { Theme } from '@/theme';

// Fixed star field (fractions of the screen) so stars don't jump between renders.
const STARS = [
  [0.12, 0.06, 2], [0.78, 0.04, 2.5], [0.55, 0.11, 1.5], [0.33, 0.16, 2], [0.9, 0.19, 1.5],
  [0.07, 0.27, 1.5], [0.66, 0.24, 2], [0.44, 0.31, 1.5], [0.85, 0.36, 2], [0.2, 0.41, 1.5],
  [0.6, 0.47, 1.5], [0.05, 0.55, 2], [0.93, 0.58, 1.5], [0.38, 0.62, 1.5], [0.72, 0.7, 2],
  [0.15, 0.76, 1.5], [0.5, 0.83, 1.5], [0.88, 0.88, 2], [0.28, 0.92, 1.5],
] as const;

function Celestial({ theme }: { theme: Theme }) {
  const { width, height } = useWindowDimensions();
  switch (theme.celestial) {
    case 'moon':
      return (
        <>
          {STARS.map(([x, y, s], i) => (
            <View
              key={i}
              style={{ position: 'absolute', left: x * width, top: y * height, width: s, height: s, borderRadius: s, backgroundColor: i % 3 ? '#ffffff' : '#cfd4ff', opacity: 0.55 + (i % 4) * 0.12 }}
            />
          ))}
          <View style={[styles.body, { left: 28, top: height * 0.07, width: 30, height: 30, backgroundColor: '#ecebdf', opacity: 0.9 }]} />
        </>
      );
    case 'dawn':
      return (
        <>
          {STARS.slice(0, 7).map(([x, y, s], i) => (
            <View key={i} style={{ position: 'absolute', left: x * width, top: y * height * 0.6, width: s, height: s, borderRadius: s, backgroundColor: '#ffffff', opacity: 0.5 }} />
          ))}
          <View style={[styles.body, { left: width * 0.5 - 90, top: height * 0.93, width: 180, height: 180, backgroundColor: '#ffd9b3', opacity: 0.35 }]} />
        </>
      );
    case 'sun-high':
      return <View style={[styles.body, { right: 34, top: height * 0.06, width: 54, height: 54, backgroundColor: '#fff6cf', opacity: 0.95 }]} />;
    case 'sun-low':
      return <View style={[styles.body, { left: 30, top: height * 0.2, width: 60, height: 60, backgroundColor: '#fff0c4', opacity: 0.9 }]} />;
    case 'sunset':
      return <View style={[styles.body, { left: 36, top: height * 0.6, width: 70, height: 70, backgroundColor: '#ffd8a0', opacity: 0.85 }]} />;
  }
}

export function Sky() {
  const theme = useTheme();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={theme.sky} style={StyleSheet.absoluteFill} />
      <Celestial theme={theme} />
    </View>
  );
}

/** A screen drawn on the living sky. */
export function SkyScreen({ children, edges = ['top', 'bottom'] }: { children: ReactNode; edges?: Edge[] }) {
  return (
    <View style={{ flex: 1 }}>
      <Sky />
      <SafeAreaView style={{ flex: 1 }} edges={edges}>{children}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { position: 'absolute', borderRadius: 999 },
});
