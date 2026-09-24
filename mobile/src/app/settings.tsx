import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RATES } from '@/components/reader/AudioPlayer';
import { Card, IconButton, Pill, Row, T } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import { METHODS } from '@/lib/prayer';
import { useProgress } from '@/store/progress';
import { FONT_SIZES, useSettings } from '@/store/settings';
import { useTasbih } from '@/store/tasbih';
import { space, THEMES, type ThemeId } from '@/theme';

export default function Settings() {
  const theme = useTheme();
  const s = useSettings();
  const resetAll = useProgress((p) => p.resetAll);
  const resetTasbih = useTasbih((t) => t.set);

  const confirmReset = () =>
    Alert.alert('مسح كل التقدم؟', 'سيُمسح تقدّمك في جميع الأذكار والمسبحة. لا يمكن التراجع.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'مسح', style: 'destructive', onPress: () => { resetAll(); resetTasbih({ count: 0 }); } },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Row style={styles.topbar}>
        <IconButton name="chevron-forward" label="رجوع" onPress={() => router.back()} />
        <T variant="heading" center style={{ flex: 1 }}>الإعدادات</T>
        <View style={{ width: 44 }} />
      </Row>
      <ScrollView contentContainerStyle={styles.content}>
        <Card onPress={() => router.push('/prayer')}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="heading">الموقع ومواقيت الصلاة</T>
              <T variant="caption" muted>
                {s.place ? `${s.place.name} · ${METHODS[s.place.method]}` : 'لم يُحدَّد بعد'}
              </T>
            </View>
            <Ionicons name="chevron-back" size={20} color={theme.muted} />
          </Row>
        </Card>

        <Card style={{ gap: space.md }}>
          <T variant="heading">المظهر</T>
          <Row style={{ flexWrap: 'wrap' }}>
            <Pill label="تلقائي حسب الوقت" active={s.themeMode === 'auto'} onPress={() => s.set({ themeMode: 'auto' })} />
            {(Object.keys(THEMES) as ThemeId[]).map((id) => (
              <Pill key={id} label={THEMES[id].label} active={s.themeMode === id} onPress={() => s.set({ themeMode: id })} />
            ))}
          </Row>
          <T variant="heading">حجم خط الأذكار</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {FONT_SIZES.map((f) => (
              <Pill key={f} label={toArabicDigits(f)} active={s.fontSize === f} onPress={() => s.set({ fontSize: f })} />
            ))}
          </Row>
        </Card>

        <Card style={{ gap: space.md }}>
          <T variant="heading">الصوت</T>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={{ flex: 1 }}>تكرار الأذكار المكررة صوتيًا</T>
            <Switch value={s.audioRepeat} onValueChange={(v) => s.set({ audioRepeat: v })} trackColor={{ true: theme.accent }} />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={{ flex: 1 }}>تشغيل جميع الأذكار تباعًا</T>
            <Switch value={s.playAll} onValueChange={(v) => s.set({ playAll: v })} trackColor={{ true: theme.accent }} />
          </Row>
          <T>سرعة التشغيل</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {RATES.map((r) => (
              <Pill key={r} label={`${toArabicDigits(r)}×`} active={s.playbackRate === r} onPress={() => s.set({ playbackRate: r })} />
            ))}
          </Row>
        </Card>

        <Card style={{ gap: space.xs }}>
          <T variant="heading">الإشعارات</T>
          <T variant="caption" muted>تذكير بالصلوات وبأذكار الصباح والمساء والنوم — في التحديث القادم.</T>
        </Card>

        <Card onPress={confirmReset}>
          <T variant="heading" color="#d0473b">مسح كل التقدم</T>
        </Card>

        {__DEV__ ? (
          <Card onPress={() => router.push('/lab')}>
            <T variant="caption" muted>شاشة الاختبار (للمطور)</T>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topbar: { paddingHorizontal: space.sm, paddingTop: space.xs },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
});
