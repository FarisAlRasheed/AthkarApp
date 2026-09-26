import type { ReactNode } from 'react';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

/**
 * A screen on the living sky. The sky itself is drawn once, behind the navigator
 * (components/sky/SkyHost); screens are transparent and set what it shows with useSkyScene.
 */
export function SkyScreen({ children, edges = ['top', 'bottom'] }: { children: ReactNode; edges?: Edge[] }) {
  return <SafeAreaView style={{ flex: 1 }} edges={edges}>{children}</SafeAreaView>;
}
