import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import {
  canInstall, detectDevice, isInAppBrowser, isIOSOtherBrowser, promptInstall, useInstalled, useInstallPrompt, type Device,
} from '@/lib/pwa';
import { useSettings } from '@/store/settings';
import { motion, radius, space } from '@/theme';
import { Sheet } from './Sheet';
import { Button, Card, IconButton, Pill, Press, Row, T } from './ui';

type Icon = ComponentProps<typeof Ionicons>['name'];
type Step = { icon: Icon; title: string; caption?: string };

const STEPS: Record<Device, Step[]> = {
  ios: [
    { icon: 'share-outline', title: 'اضغط زر المشاركة', caption: 'المربّع الذي يخرج منه سهم، أسفل الشاشة في Safari. إن لم تجده فاضغط ⋯ أولًا.' },
    { icon: 'add-circle-outline', title: 'اختر «إضافة إلى الشاشة الرئيسية»', caption: 'مرّر القائمة للأسفل إن لم يظهر الخيار.' },
    { icon: 'checkmark-circle-outline', title: 'اضغط «إضافة»', caption: 'إن ظهر خيار «فتح كتطبيق ويب» فأبقِه مفعّلًا.' },
    { icon: 'apps-outline', title: 'افتح أذكارنا من الشاشة الرئيسية', caption: 'ومن هناك فعّل الإشعارات — يسمح بها آيفون للتطبيقات المضافة فقط.' },
  ],
  android: [
    { icon: 'ellipsis-vertical', title: 'اضغط قائمة المتصفح ⋮', caption: 'أعلى الشاشة في Chrome. وفي متصفح سامسونج: القائمة ≡ ثم «إضافة الصفحة إلى».' },
    { icon: 'download-outline', title: 'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»' },
    { icon: 'checkmark-circle-outline', title: 'اضغط «تثبيت»', caption: 'تظهر أيقونة أذكارنا مع تطبيقاتك.' },
  ],
  desktop: [
    { icon: 'download-outline', title: 'اضغط أيقونة التثبيت في شريط العنوان', caption: 'في Chrome وEdge، أو من القائمة ⋮ ثم «تثبيت أذكارنا».' },
    { icon: 'phone-portrait-outline', title: 'أو افتح الرابط على جوالك', caption: 'واتبع خطوات آيفون أو أندرويد.' },
  ],
};

const TABS: [Device, string][] = [['ios', 'آيفون'], ['android', 'أندرويد'], ['desktop', 'كمبيوتر']];

/** How to put the web app on the home screen, for the phone it's opened on (any can be picked). */
export function InstallSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const [device, setDevice] = useState<Device>(detectDevice);
  const detected = detectDevice();
  const canPrompt = useInstallPrompt();
  const installed = useInstalled();
  const steps = STEPS[device];

  return (
    <Sheet visible={visible} onClose={onClose} title="أضف أذكارنا إلى الشاشة الرئيسية">
      <T muted style={{ lineHeight: 24 }}>
        يفتح كتطبيق بملء الشاشة، ويُحفظ على جوالك فيعمل دون إنترنت، وتصلك منه تذكيرات الأذكار والصلاة.
      </T>

      {installed ? (
        <Card alt><T>تمت الإضافة. افتح أذكارنا من الشاشة الرئيسية.</T></Card>
      ) : canPrompt && device === detected && device !== 'ios' ? (
        <Button label="تثبيت التطبيق" icon="download-outline" onPress={() => promptInstall().then((ok) => ok && onClose())} />
      ) : null}

      {isInAppBrowser() && device === detected ? (
        <Card alt style={{ gap: space.xs }}>
          <T variant="heading">افتح الرابط في المتصفح أولًا</T>
          <T variant="caption" muted>
            {device === 'ios' ? 'من القائمة اختر «فتح في Safari»' : 'من القائمة اختر «فتح في Chrome»'}، فمتصفحات التطبيقات لا تضيف إلى الشاشة الرئيسية.
          </T>
        </Card>
      ) : null}

      <Row style={{ flexWrap: 'wrap' }}>
        {TABS.filter(([d]) => d !== 'desktop' || detected === 'desktop').map(([d, label]) => (
          <Pill key={d} label={d === detected ? `${label} (جهازك)` : label} active={device === d} onPress={() => setDevice(d)} />
        ))}
      </Row>

      <View style={{ gap: space.sm }}>
        {steps.map((s, i) => (
          <Row key={s.title} gap={space.md} style={[styles.step, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.num, { backgroundColor: theme.accent }]}>
              <T variant="caption" bold center color={theme.onAccent}>{toArabicDigits(i + 1)}</T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="heading" style={{ fontSize: 15 }}>{s.title}</T>
              {s.caption ? <T variant="caption" muted style={{ lineHeight: 20 }}>{s.caption}</T> : null}
            </View>
            <Ionicons name={s.icon} size={24} color={theme.accent} />
          </Row>
        ))}
      </View>

      {device === 'ios' && isIOSOtherBrowser() && detected === 'ios' ? (
        <T variant="caption" muted>في Chrome على آيفون: زر المشاركة بجانب شريط العنوان. وإن لم يظهر الخيار فافتح الرابط في Safari.</T>
      ) : null}
    </Sheet>
  );
}

/** A quiet offer on the home screen, on phones in a browser tab. Closing it hides it for good. */
export function InstallCard() {
  const theme = useTheme();
  const hidden = useSettings((s) => s.installHidden);
  const installed = useInstalled();
  const [open, setOpen] = useState(false);
  if (!canInstall || hidden || installed || detectDevice() === 'desktop') return null;
  return (
    <>
      <Row gap={space.xs} style={[styles.card, { backgroundColor: theme.glass, borderColor: theme.border }]}>
        <Press onPress={() => setOpen(true)} depth={motion.press.card} containerStyle={{ flex: 1 }} accessibilityHint="يعرض خطوات الإضافة">
          <Row gap={space.md}>
            <Ionicons name="phone-portrait-outline" size={26} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <T variant="heading">أضف أذكارنا إلى الشاشة الرئيسية</T>
              <T variant="caption" muted>يفتح كتطبيق، ويعمل دون إنترنت، وتصلك التذكيرات</T>
            </View>
          </Row>
        </Press>
        <IconButton name="close" size={20} label="إخفاء" onPress={() => useSettings.getState().set({ installHidden: true })} />
      </Row>
      <InstallSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, paddingVertical: space.md, paddingStart: space.xs, paddingEnd: space.md },
  step: { borderRadius: radius.md, padding: space.md },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
