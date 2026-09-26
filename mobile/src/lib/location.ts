import * as Location from 'expo-location';
import { defaultMethodFor } from '@/lib/prayer';
import { useSettings } from '@/store/settings';

/**
 * Asks for the location once and saves it with a calculation method for the country. Prayer times
 * are then computed on the phone; the position never leaves it. Returns a message on failure.
 */
export async function locateMe(): Promise<{ ok: true } | { ok: false; message: string; denied?: boolean }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { ok: false, denied: true, message: 'لم يُسمح بالوصول إلى الموقع. يمكنك اختيار مدينتك من القائمة.' };
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
    const s = useSettings.getState();
    s.set({ place: { name, latitude, longitude, countryCode, method: s.place?.method ?? defaultMethodFor(countryCode), source: 'gps' } });
    return { ok: true };
  } catch {
    return { ok: false, message: 'تعذّر تحديد الموقع. حاول مرة أخرى أو اختر مدينتك.' };
  }
}
