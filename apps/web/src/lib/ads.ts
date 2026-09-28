/**
 * Anuncio recompensado. En la web se usa un anuncio simulado (AdHost).
 * En la app nativa (Capacitor) se sustituye `provider` por AdMob.
 */
export interface AdProvider {
  showRewarded(): Promise<boolean>;
}

type Listener = (resolve: (ok: boolean) => void) => void;
let listener: Listener | null = null;

export function registerAdHost(l: Listener | null) {
  listener = l;
}

export const simulatedAds: AdProvider = {
  showRewarded() {
    return new Promise((resolve) => {
      if (!listener) return resolve(false);
      listener(resolve);
    });
  },
};

export let adProvider: AdProvider = simulatedAds;
export function setAdProvider(p: AdProvider) {
  adProvider = p;
}
