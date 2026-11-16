import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import en from '../../public/i18n/en.json';
import hi from '../../public/i18n/hi.json';
import { routes } from './app.routes';
import { NAV_ITEMS } from './layout/nav-items';
import { Login } from './pages/login/login';

type Tree = { [key: string]: string | Tree };

function keys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`),
  );
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]!).sort();
}

function lookup(tree: Tree, key: string): string | undefined {
  let node: string | Tree | undefined = tree;
  for (const part of key.split('.')) {
    node = typeof node === 'object' ? node[part] : undefined;
  }
  return typeof node === 'string' ? node : undefined;
}

describe('translations', () => {
  it('Hindi and English have exactly the same keys', () => {
    expect(keys(hi as Tree).sort()).toEqual(keys(en as Tree).sort());
  });

  it('no translation is empty', () => {
    for (const lang of [en, hi] as Tree[]) {
      for (const key of keys(lang)) {
        expect(lookup(lang, key)?.trim(), key).toBeTruthy();
      }
    }
  });

  it('placeholders like {{mobile}} match between languages', () => {
    for (const key of keys(en as Tree)) {
      expect(placeholders(lookup(hi as Tree, key)!), key).toEqual(
        placeholders(lookup(en as Tree, key)!),
      );
    }
  });

  it('every menu label has a translation', () => {
    for (const item of NAV_ITEMS) {
      expect(lookup(en as Tree, item.labelKey), item.labelKey).toBeTruthy();
    }
  });
});

describe('routes', () => {
  it('every menu item opens a real page, not "not found"', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const router = TestBed.inject(Router);
    for (const item of NAV_ITEMS) {
      await router.navigateByUrl(item.route);
      const leaf = router.routerState.snapshot.root.firstChild?.firstChild;
      expect(leaf?.routeConfig?.path, item.route).toBe(item.route.slice(1));
    }
  });
});

describe('Login (layout only)', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideTransloco({ config: { availableLangs: ['en'], defaultLang: 'en' } }),
      ],
    });
    const fixture = TestBed.createComponent(Login);
    return fixture.componentInstance as unknown as {
      phone: { setValue(v: string): void; valid: boolean };
      otp: { setValue(v: string): void; valid: boolean };
      step: () => string;
      sendOtp(): void;
    };
  }

  it.each(['9876543210', '6000000000'])('accepts Indian mobile %s', (mobile) => {
    const login = setup();
    login.phone.setValue(mobile);
    expect(login.phone.valid).toBe(true);
  });

  it.each(['5876543210', '987654321', '98765432100', '98765abcde', ''])('rejects %s', (mobile) => {
    const login = setup();
    login.phone.setValue(mobile);
    expect(login.phone.valid).toBe(false);
  });

  it('moves to the code step only with a valid number', () => {
    const login = setup();
    login.phone.setValue('123');
    login.sendOtp();
    expect(login.step()).toBe('phone');
    login.phone.setValue('9876543210');
    login.sendOtp();
    expect(login.step()).toBe('otp');
  });

  it('accepts only a 6-digit code', () => {
    const login = setup();
    login.otp.setValue('12345');
    expect(login.otp.valid).toBe(false);
    login.otp.setValue('123456');
    expect(login.otp.valid).toBe(true);
  });
});
