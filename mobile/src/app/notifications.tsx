import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { InstallSheet } from '@/components/Install';
import { SkyScreen } from '@/components/Sky';
import { Button, Card, IconButton, Pill, Row, T } from '@/components/ui';
import { goBack, useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import { askPermission, hasPermission, notificationsNeedInstall, notificationsSupported } from '@/lib/notify';
import { PRAYER_LABELS, PRAYERS, type Prayer } from '@/lib/prayer';
import { anyReminderOn, useNotify } from '@/store/notify';
import { useSkyScene } from '@/store/sky';
import { motion, space } from '@/theme';

const DELAYS = [0, 15, 30, 60];

/**
 * Reminder settings (APP_PLAN §5.5). This screen is the explanation; the system's permission
 * prompt only appears when the first reminder is turned on.
 */
export default function NotificationsScreen() {
  useSkyScene({ kind: 'clock' });
  const theme = useTheme();
  const n = useNotify();
  const [install, setInstall] = useState(false);

  /** Turns a reminder on, asking for permission the first time. */
  const enable = async (patch: Partial<Parameters<typeof n.set>[0]>) => {
    if (!anyReminderOn(n) && !(await hasPermission()) && !(await askPermission())) {
      if (Platform.OS === 'web') {
        // No system settings to open from a web page; the browser's site settings hold the switch.
        window.alert('الإشعارات مغلقة لهذا الموقع. اسمح بها من إعدادات المتصفح للموقع (أو إعدادات الجهاز للتطبيق المضاف) لتصلك التذكيرات.');
        return;
      }
      Alert.alert('الإشعارات مغلقة', 'اسمح لأذكارنا بالإشعارات من إعدادات الجهاز لتصلك التذكيرات.', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'فتح الإعدادات', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    n.set(patch);
  };

  const row = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <Row key={label} style={{ justifyContent: 'space-between' }}>
      <T style={{ flex: 1 }}>{label}</T>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.accent }} accessibilityLabel={label} disabled={!notificationsSupported} />
    </Row>
  );

  const delays = (value: number, key: 'morningAfter' | 'eveningAfter', after: string) => (
    <Row style={{ flexWrap: 'wrap' }}>
      {DELAYS.map((m) => (
        <Pill key={m} label={m ? `بعد ${after} بـ${toArabicDigits(m)} د` : `مع ${after}`} active={value === m} onPress={() => n.set({ [key]: m })} />
      ))}
    </Row>
  );

  return (
    <SkyScreen>
      <Row style={styles.topbar}>
        <IconButton name="chevron-forward" label="رجوع" onPress={() => goBack()} />
        <T variant="title" center style={{ flex: 1, fontSize: 22, lineHeight: 36 }}>الإشعارات</T>
        <View style={{ width: 44 }} />
      </Row>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.duration(motion.duration.calm).easing(motion.easing.enter)} style={{ gap: styles.content.gap }}>
          <Card style={{ gap: space.sm }}>
            <Ionicons name="notifications-outline" size={32} color={theme.accent} style={{ alignSelf: 'flex-end' }} />
            <T variant="heading">تذكير لطيف في وقته</T>
            <T muted style={{ lineHeight: 24 }}>
              تُجدوَل التذكيرات على جهازك فقط وتُحسب من مواقيت الصلاة في موقعك، دون إنترنت ودون أي خادم.
              {Platform.OS === 'web' && notificationsSupported ? ' في نسخة الويب تصل التذكيرات ما دام التطبيق مفتوحًا أو في الخلفية منذ وقت قريب.' : ''}
              {notificationsSupported || notificationsNeedInstall ? '' : ' الإشعارات غير متاحة في هذا المتصفح.'}
            </T>
            {notificationsNeedInstall ? (
              <>
                <T style={{ lineHeight: 24 }}>على آيفون تعمل الإشعارات بعد إضافة أذكارنا إلى الشاشة الرئيسية وفتحه منها.</T>
                <Button label="طريقة الإضافة" icon="phone-portrait-outline" onPress={() => setInstall(true)} />
              </>
            ) : null}
          </Card>

          <Card style={{ gap: space.md }}>
            <T variant="heading">الأذكار</T>
            {row('أذكار الصباح', n.morning, (v) => (v ? enable({ morning: true }) : n.set({ morning: false })))}
            {n.morning ? delays(n.morningAfter, 'morningAfter', 'الفجر') : null}
            {row('أذكار المساء', n.evening, (v) => (v ? enable({ evening: true }) : n.set({ evening: false })))}
            {n.evening ? delays(n.eveningAfter, 'eveningAfter', 'العصر') : null}
            {row('أذكار النوم (بعد العشاء بنصف ساعة)', n.sleep, (v) => (v ? enable({ sleep: true }) : n.set({ sleep: false })))}
          </Card>

          <Card style={{ gap: space.md }}>
            <T variant="heading">الصلوات</T>
            {PRAYERS.map((p: Prayer) =>
              row(`صلاة ${PRAYER_LABELS[p]}`, n.prayers[p], (v) => {
                const prayers = { ...n.prayers, [p]: v };
                return v ? enable({ prayers }) : n.set({ prayers });
              }),
            )}
          </Card>
        </Animated.View>
      </ScrollView>
      <InstallSheet visible={install} onClose={() => setInstall(false)} />
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  topbar: { paddingHorizontal: space.sm, paddingTop: space.xs },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
});
