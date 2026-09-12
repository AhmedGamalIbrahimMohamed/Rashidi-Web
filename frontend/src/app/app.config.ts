import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),

    provideRouter(
      routes,
      // Native cross-document-style transitions between routes, which the
      // browser runs on the compositor — cheaper than animating it ourselves.
      withViewTransitions({ skipInitialTransition: true }),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),

    provideHttpClient(
      withFetch(),
      // Order matters. Interceptors run outermost-first on the way out, so
      // errors surface innermost-first on the way back: `authInterceptor` must
      // be listed LAST so its catchError sees a real HttpErrorResponse and can
      // recognise a 401. `errorInterceptor` then normalises whatever survives
      // into an ApiFailure for components.
      withInterceptors([errorInterceptor, authInterceptor]),
    ),
  ],
};
