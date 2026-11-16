import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type AppLanguage = 'en' | 'hi';
export const LANGUAGES: readonly AppLanguage[] = ['en', 'hi'];
const STORAGE_KEY = 'app.lang';

/** Current UI language. Remembered per device; sets <html lang> for fonts and screen readers. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  readonly current = signal<AppLanguage>('en');

  init(): void {
    this.use(this.saved() ?? 'en');
  }

  use(lang: AppLanguage): void {
    this.current.set(lang);
    this.transloco.setActiveLang(lang);
    this.document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Private mode or blocked storage: the choice just isn't remembered.
    }
  }

  toggle(): void {
    this.use(this.current() === 'en' ? 'hi' : 'en');
  }

  private saved(): AppLanguage | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return LANGUAGES.includes(value as AppLanguage) ? (value as AppLanguage) : null;
    } catch {
      return null;
    }
  }
}
