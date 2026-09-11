/**
 * Development configuration.
 *
 * Nothing secret belongs in this file — it is compiled into the browser
 * bundle and is readable by anyone. Secrets live in the backend `.env`.
 */
export const environment = {
  production: false,

  /** Base URL of the Express API. */
  apiUrl: 'http://localhost:4000/api',

  /** Canonical origin, used for og:url and JSON-LD. */
  siteUrl: 'http://localhost:4200',

  auth: {
    /** localStorage keys for the JWT pair. */
    tokenKey: 'rashidi.access_token',
    refreshTokenKey: 'rashidi.refresh_token',
    /** Refresh the access token this many seconds before it expires. */
    refreshSkewSeconds: 60,
  },

  i18n: {
    defaultLocale: 'en' as const,
    storageKey: 'rashidi.locale',
  },

  ui: {
    /** Intro/loading screen duration in milliseconds. */
    introDurationMs: 1600,
    /** Catalogue page size. */
    machinesPerPage: 12,
    /** Skip the 3D hero below this viewport width. */
    threeMinViewportWidth: 720,
  },
};
