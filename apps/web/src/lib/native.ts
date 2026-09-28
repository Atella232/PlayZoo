import { Capacitor } from '@capacitor/core';
import { setAdProvider } from './ads';

export const isNative = () => Capacitor.isNativePlatform();

/** Anuncios recompensados de prueba de Google. Sustituir por los reales con VITE_ADMOB_REWARDED_ID. */
const TEST_REWARDED = Capacitor.getPlatform() === 'ios' ? 'ca-app-pub-3940256099942544/1712485313' : 'ca-app-pub-3940256099942544/5224354917';

/** Prepara la capa nativa: consentimiento (UMP) y anuncios recompensados con AdMob. */
export async function initNative(): Promise<void> {
  if (!isNative()) return;
  try {
    const { AdMob, AdmobConsentStatus, RewardAdPluginEvents } = await import('@capacitor-community/admob');
    const testing = import.meta.env.VITE_ADMOB_REWARDED_ID === undefined;
    await AdMob.initialize({ initializeForTesting: testing });
    // Consentimiento obligatorio en la UE
    const info = await AdMob.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) await AdMob.showConsentForm();
    setAdProvider({
      async showRewarded() {
        try {
          const consent = await AdMob.requestConsentInfo();
          if (!consent.canRequestAds) return false;
          let rewarded = false;
          const h = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
            rewarded = true;
          });
          await AdMob.prepareRewardVideoAd({ adId: import.meta.env.VITE_ADMOB_REWARDED_ID ?? TEST_REWARDED, isTesting: testing });
          await AdMob.showRewardVideoAd();
          await h.remove();
          return rewarded;
        } catch (e) {
          console.warn('Anuncio no disponible', e);
          return false;
        }
      },
    });
  } catch (e) {
    console.warn('AdMob no disponible', e);
  }
}

const REMINDER_ID = 4242;

/** Recordatorio diario local del juego de hoy (sin servidor). */
export async function setDailyReminder(enabled: boolean, hour = 9): Promise<boolean> {
  if (!isNative()) return false;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  if (!enabled) {
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
    return true;
  }
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return false;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_ID,
        title: 'PlayZoo',
        body: '¡Ya está el minijuego de hoy! Ve a por la mejor marca del grupo.',
        schedule: { on: { hour, minute: 0 }, allowWhileIdle: true },
      },
    ],
  });
  return true;
}
