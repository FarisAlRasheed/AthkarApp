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
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTheme } from '@/hooks';

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
  });
  const theme = useTheme();

  useEffect(() => {
    // doNotMix is required for lock-screen controls.
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
  }, []);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {/* Screens are transparent so the sky shows through; fade keeps transitions soft. */}
      <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 260, contentStyle: { backgroundColor: theme.sky[0] } }} />
    </>
  );
}
