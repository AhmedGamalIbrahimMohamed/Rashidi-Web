/**
 * Production configuration.
 *
 * Replace `apiUrl` and `siteUrl` with the deployed values before building, or
 * inject them at build time from your CI environment.
 */
export const environment = {
  production: true,

  apiUrl: '/api',
  siteUrl: 'https://www.rashidi-ie.com',

  auth: {
    tokenKey: 'rashidi.access_token',
    refreshTokenKey: 'rashidi.refresh_token',
    refreshSkewSeconds: 60,
  },

  i18n: {
    defaultLocale: 'ar' as const,
    storageKey: 'rashidi.locale',
  },

  ui: {
    introDurationMs: 1600,
    machinesPerPage: 12,
    threeMinViewportWidth: 720,
  },
};
