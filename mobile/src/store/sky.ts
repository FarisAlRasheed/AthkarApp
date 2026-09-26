import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { create } from 'zustand';
import type { Scene, ThemeOverride } from '@/lib/sky';

/**
 * What the one sky behind every screen should show. Screens set their scene when they gain focus;
 * the sky (components/sky) and the theme follow it.
 */
interface SkyStore {
  scene: Scene;
  /** Bumps when the screen's scene changes (not on progress within it), so the sky blends faster. */
  serial: number;
  /** Set by the sky when a scene asks for a theme (the reader's journey); null = the clock's theme. */
  theme: ThemeOverride | null;
  warmPaper: boolean;
}

export const useSky = create<SkyStore>(() => ({ scene: { kind: 'clock' }, serial: 0, theme: null, warmPaper: false }));

const identity = (s: Scene) => (s.kind === 'journey' ? `journey:${s.collectionId}` : 'clock');

export function setScene(scene: Scene) {
  const prev = useSky.getState();
  if (JSON.stringify(prev.scene) === JSON.stringify(scene)) return;
  useSky.setState({ scene, serial: identity(prev.scene) === identity(scene) ? prev.serial : prev.serial + 1 });
}

/** Shows `scene` while this screen is focused. Pass a scene that only changes when it should. */
export function useSkyScene(scene: Scene) {
  const key = JSON.stringify(scene);
  useFocusEffect(
    useCallback(() => {
      setScene(JSON.parse(key) as Scene);
    }, [key]),
  );
}
