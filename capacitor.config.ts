import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.f86ff09b15754e709ef0463d6b8838fc',
  appName: 'cparemind',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://cparemind.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
