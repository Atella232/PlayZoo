import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.playzoo.game',
  appName: 'PlayZoo',
  webDir: 'dist',
  backgroundColor: '#0b1020',
  ios: { contentInset: 'always' },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_icon', iconColor: '#f59e0b' },
  },
};

export default config;
