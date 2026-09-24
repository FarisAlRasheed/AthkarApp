import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { athkar, getAudio } from '@/content';

// Phase 1 test screen: checks the three risks before building real screens —
// Arabic text with full tashkeel, audio with the screen locked, and a local notification.

const FONTS = [
  { label: 'النظام', family: undefined },
  { label: 'Noto Naskh', family: 'NotoNaskhArabic_400Regular' },
  { label: 'Amiri', family: 'Amiri_400Regular' },
  { label: 'Scheherazade', family: 'ScheherazadeNew_400Regular' },
];
const SAMPLE_IDS = ['baqarah-ending', 'sayyid-al-istighfar', 'ayat-al-kursi'];
const RECITER = 'faris-alrasheed';

export default function Lab() {
  const [fontIndex, setFontIndex] = useState(1);
  const [size, setSize] = useState(24);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [notice, setNotice] = useState('');

  const sampleId = SAMPLE_IDS[sampleIndex];
  const player = useAudioPlayer(getAudio(RECITER, sampleId));
  const status = useAudioPlayerStatus(player);

  const togglePlay = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (status.duration && status.currentTime >= status.duration)) player.seekTo(0);
    player.play();
    player.setActiveForLockScreen(true, { title: athkar[sampleId].title, artist: 'فارس بن تركي الرشيد', albumTitle: 'أذكارنا' });
  };

  const scheduleTest = async () => {
    const { status: permission } = await Notifications.requestPermissionsAsync();
    if (permission !== 'granted') {
      setNotice('لم يُسمح بالإشعارات');
      return;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'التذكيرات',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: 'أذكار المساء', body: 'حان وقت أذكار المساء' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: 'reminders' },
    });
    setNotice('سيصل الإشعار بعد ١٠ ثوانٍ — اقفل الشاشة أو اخرج من التطبيق');
  };

  const family = FONTS[fontIndex].family;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>شاشة الاختبار</Text>

        <Text style={styles.label}>١) الخط</Text>
        <View style={styles.row}>
          {FONTS.map((f, i) => (
            <Chip key={f.label} label={f.label} active={i === fontIndex} onPress={() => setFontIndex(i)} />
          ))}
        </View>
        <View style={styles.row}>
          <Chip label="أ−" onPress={() => setSize((s) => Math.max(16, s - 2))} />
          <Text style={styles.value}>{size}</Text>
          <Chip label="أ+" onPress={() => setSize((s) => Math.min(40, s + 2))} />
          {SAMPLE_IDS.map((id, i) => (
            <Chip key={id} label={athkar[id].title} active={i === sampleIndex} onPress={() => setSampleIndex(i)} />
          ))}
        </View>
        <View style={styles.card}>
          <Text style={[styles.thiker, { fontFamily: family, fontSize: size, lineHeight: size * 2 }]}>
            {athkar[sampleId].text}
          </Text>
        </View>

        <Text style={styles.label}>٢) الصوت مع قفل الشاشة</Text>
        <View style={styles.row}>
          <Chip label={status.playing ? 'إيقاف مؤقت' : 'تشغيل'} active onPress={togglePlay} />
          <Text style={styles.value}>
            {Math.floor(status.currentTime)} / {Math.floor(status.duration || 0)} ث
          </Text>
        </View>
        <Text style={styles.hint}>شغّل التسجيل ثم اقفل الشاشة: هل يستمر الصوت؟ هل تظهر أزرار التحكم في شاشة القفل؟</Text>

        <Text style={styles.label}>٣) الإشعارات</Text>
        <View style={styles.row}>
          <Chip label="إشعار تجريبي بعد ١٠ ثوانٍ" active onPress={scheduleTest} />
        </View>
        {notice ? <Text style={styles.hint}>{notice}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.6 }]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f4ef' },
  content: { padding: 16, gap: 10 },
  heading: { fontSize: 22, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  label: { fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'right', writingDirection: 'rtl' },
  row: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  value: { fontSize: 15, minWidth: 28, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  thiker: { textAlign: 'right', writingDirection: 'rtl', color: '#1f2328' },
  hint: { fontSize: 14, color: '#6b7280', textAlign: 'right', writingDirection: 'rtl' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e1d8' },
  chipActive: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  chipText: { fontSize: 14, color: '#1f2328' },
  chipTextActive: { color: '#fff' },
});
