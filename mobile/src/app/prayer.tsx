import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SkyScreen } from '@/components/Sky';
import { Sheet } from '@/components/Sheet';
import { Button, Card, IconButton, Row, T } from '@/components/ui';
import { goBack, useNow, usePrayerTimes, useTheme } from '@/hooks';
import { formatCountdown, formatTime } from '@/lib/arabic';
import { CITIES, defaultMethodFor, METHODS, nextTime, PRAYER_LABELS, TIME_NAMES, type MethodId } from '@/lib/prayer';
import { useSettings } from '@/store/settings';
import { radius, space } from '@/theme';

export default function PrayerScreen() {
  const theme = useTheme();
  const now = useNow(1000);
  const { today, tomorrow, hasPlace } = usePrayerTimes(now);
  const place = useSettings((s) => s.place);
  const set = useSettings((s) => s.set);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [query, setQuery] = useState('');

  const useMyLocation = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMessage('لم يُسمح بالوصول إلى الموقع. يمكنك اختيار مدينتك من القائمة.');
        setCityOpen(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const { latitude, longitude } = pos.coords;
      let name = 'موقعي';
      let countryCode: string | undefined;
      try {
        const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
        name = addr?.city ?? addr?.region ?? name;
        countryCode = addr?.isoCountryCode ?? undefined;
      } catch {
        // Offline: keep the generic name; times are still computed on the device.
      }
      set({ place: { name, latitude, longitude, countryCode, method: place?.method ?? defaultMethodFor(countryCode), source: 'gps' } });
    } catch {
      setMessage('تعذّر تحديد الموقع. حاول مرة أخرى أو اختر مدينتك.');
    } finally {
      setBusy(false);
    }
  };

  const next = nextTime(now, today, tomorrow);
  const cities = CITIES.filter((c) => c.name.includes(query.trim()));

  return (
    <SkyScreen>
      <Row style={styles.topbar}>
        <IconButton name="chevron-forward" label="رجوع" onPress={() => goBack()} />
        <T variant="title" center style={{ flex: 1, fontSize: 22, lineHeight: 36 }}>مواقيت الصلاة</T>
        <View style={{ width: 44 }} />
      </Row>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.duration(450).springify().damping(18)} style={{ gap: styles.content.gap }}>
        {hasPlace ? (
          <Card style={{ gap: space.xs, alignItems: 'center' }}>
            <T muted center>بقي على {PRAYER_LABELS[next.name]}</T>
            <T variant="display" center>{formatCountdown(next.at.getTime() - now.getTime())}</T>
            <Row gap={6}>
              <Ionicons name={place?.source === 'gps' ? 'location' : 'business-outline'} size={16} color={theme.muted} />
              <T variant="caption" muted>{place?.name}</T>
            </Row>
          </Card>
        ) : (
          <Card style={{ gap: space.md }}>
            <Ionicons name="location-outline" size={36} color={theme.accent} style={{ alignSelf: 'flex-end' }} />
            <T variant="heading">نحتاج موقعك لحساب المواقيت</T>
            <T muted>
              تُحسب مواقيت الصلاة على جهازك من موقعك، دون إنترنت. لا يُرسل موقعك إلى أي جهة، ولا يُحفظ إلا على جهازك.
            </T>
          </Card>
        )}

        {hasPlace ? (
          <Card style={{ paddingVertical: space.sm }}>
            {TIME_NAMES.map((name, i) => {
              const active = name === next.name;
              return (
                <Row
                  key={name}
                  style={[
                    styles.timeRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                    active && { backgroundColor: theme.surfaceAlt, borderRadius: radius.sm },
                  ]}
                >
                  <T variant="heading" style={{ flex: 1 }} color={active ? theme.accent : theme.text}>{PRAYER_LABELS[name]}</T>
                  <T variant="heading" color={active ? theme.accent : theme.text}>{formatTime(today[name])}</T>
                </Row>
              );
            })}
          </Card>
        ) : null}

        {message ? <T muted>{message}</T> : null}

        <View style={{ gap: space.md }}>
          {busy ? <ActivityIndicator color={theme.accent} /> : (
            <Button label={place?.source === 'gps' ? 'تحديث موقعي' : 'استخدام موقعي'} icon="navigate-outline" onPress={useMyLocation} />
          )}
          <Button label="اختيار مدينة" kind="secondary" icon="business-outline" onPress={() => setCityOpen(true)} />
        </View>

        {hasPlace ? (
          <Card onPress={() => setMethodOpen(true)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="caption" muted>طريقة الحساب</T>
                <T>{METHODS[place!.method]}</T>
              </View>
              <Ionicons name="chevron-back" size={20} color={theme.muted} />
            </Row>
          </Card>
        ) : null}
        </Animated.View>
      </ScrollView>

      <Sheet visible={cityOpen} onClose={() => setCityOpen(false)} title="اختر مدينتك">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث…"
          placeholderTextColor={theme.muted}
          style={[styles.search, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
        />
        {cities.map((c) => (
          <Pressable
            key={c.name}
            onPress={() => {
              set({ place: { name: c.name, latitude: c.latitude, longitude: c.longitude, countryCode: c.country, method: defaultMethodFor(c.country), source: 'city' } });
              setCityOpen(false);
              setMessage('');
            }}
            style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.surfaceAlt }]}
          >
            <T>{c.name}</T>
          </Pressable>
        ))}
      </Sheet>

      <Sheet visible={methodOpen} onClose={() => setMethodOpen(false)} title="طريقة الحساب">
        {(Object.keys(METHODS) as MethodId[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              if (place) set({ place: { ...place, method: m } });
              setMethodOpen(false);
            }}
            style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.surfaceAlt }]}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <T style={{ flex: 1 }}>{METHODS[m]}</T>
              {place?.method === m ? <Ionicons name="checkmark" size={20} color={theme.accent} /> : null}
            </Row>
          </Pressable>
        ))}
      </Sheet>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  topbar: { paddingHorizontal: space.sm, paddingTop: space.xs },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  timeRow: { paddingVertical: space.md, paddingHorizontal: space.sm },
  search: { borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.md, fontSize: 16, textAlign: 'right' },
  option: { paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: radius.sm },
});
