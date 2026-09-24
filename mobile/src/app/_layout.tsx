import { Amiri_400Regular } from '@expo-google-fonts/amiri';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import { ScheherazadeNew_400Regular } from '@expo-google-fonts/scheherazade-new';
import { setAudioModeAsync } from 'expo-audio';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ NotoNaskhArabic_400Regular, Amiri_400Regular, ScheherazadeNew_400Regular });

  useEffect(() => {
    // doNotMix is required for lock-screen controls.
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
  }, []);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
