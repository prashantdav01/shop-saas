import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTransloco } from '@jsverse/transloco';
import { routes } from './app.routes';
import { LanguageService, LANGUAGES } from './core/i18n/language.service';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';
import { PwaService } from './core/pwa/pwa.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    // DD/MM/YYYY in Material date pickers.
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    provideTransloco({
      config: {
        availableLangs: [...LANGUAGES],
        defaultLang: 'en',
        fallbackLang: 'en',
        missingHandler: { useFallbackTranslation: true },
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => {
      inject(LanguageService).init();
      inject(PwaService).init();
    }),
  ],
};
