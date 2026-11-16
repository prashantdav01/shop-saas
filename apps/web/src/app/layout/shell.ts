import { BreakpointObserver } from '@angular/cdk/layout';
import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { map } from 'rxjs';
import { LanguageService } from '../core/i18n/language.service';
import { PwaService } from '../core/pwa/pwa.service';
import { NAV_ITEMS } from './nav-items';

/** App frame: toolbar, menu (side on laptop, drawer on phone), offline banner. */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslocoDirective,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly language = inject(LanguageService);
  protected readonly pwa = inject(PwaService);
  protected readonly navItems = NAV_ITEMS;

  /** Below 768px the menu becomes a drawer. */
  protected readonly isHandset = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 767.98px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  protected readonly drawerOpen = signal(false);
  protected readonly sidenavMode = computed(() => (this.isHandset() ? 'over' : 'side'));
  protected readonly sidenavOpened = computed(() => !this.isHandset() || this.drawerOpen());

  protected closeDrawerOnHandset(): void {
    if (this.isHandset()) this.drawerOpen.set(false);
  }

  /** Skip link: move keyboard focus to the page content without changing the URL. */
  protected focusMain(): void {
    this.document.getElementById('main')?.focus();
  }

  private readonly document = inject(DOCUMENT);
}
