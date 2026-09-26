import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import { ScheherazadeNew_400Regular } from '@expo-google-fonts/scheherazade-new';
import { setAudioModeAsync } from 'expo-audio';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SkyHost } from '@/components/sky/SkyHost';
import { useHydrated, useTheme } from '@/hooks';
import { useNotifications } from '@/lib/notify';
import { detectTier } from '@/lib/quality';
import { useClockDriver } from '@/store/clock';
import { useSettings } from '@/store/settings';
import { fonts } from '@/theme';

// Keep the splash up until fonts and saved progress are loaded (no blank screen, no empty-progress flash).
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 400, fade: true });

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    NotoNaskhArabic_400Regular, Amiri_400Regular, Amiri_700Bold, ScheherazadeNew_400Regular,
    IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold,
    [fonts.quran]: require('../../assets/fonts/KFGQPC-Hafs-V30.ttf'),
  });
  const hydrated = useHydrated();
  const ready = fontsLoaded && hydrated;
  useClockDriver();
  useNotifications();
  const theme = useTheme();

  useEffect(() => {
    // Effects and ambient sound never stop the user's own audio; the reader's player switches to
    // doNotMix while a recitation plays (lock-screen controls need it).
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready) return;
    const s = useSettings.getState();
    if (s.autoTier === null) s.set({ autoTier: detectTier() });
    SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* One sky behind every screen; screens are transparent, so it stays put while they fade. */}
      <SkyHost />
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <ThemeProvider value={NAV_THEME}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 260, contentStyle: styles.screen }} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// The navigator paints its theme background behind screens; it must be clear for the sky to show.
const NAV_THEME = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent', card: 'transparent' } };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#04050d' },
  screen: { backgroundColor: 'transparent' },
});
