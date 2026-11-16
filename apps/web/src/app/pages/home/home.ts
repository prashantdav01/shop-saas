import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

/** Landing page after login. Real numbers arrive with billing and stock (Phase 3). */
@Component({
  selector: 'app-home',
  imports: [TranslocoDirective, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <ng-container *transloco="let t">
      <header class="mb-4">
        <h1 class="page-title">{{ t('home.title') }}</h1>
        <p class="page-subtitle">{{ t('home.subtitle') }}</p>
      </header>

      <div class="row g-3">
        @for (action of actions; track action.route) {
          <div class="col-12 col-sm-6 col-lg-3">
            <a class="quick-action surface-card" [routerLink]="action.route">
              <mat-icon fontSet="material-symbols-outlined" class="quick-icon" aria-hidden="true">{{
                action.icon
              }}</mat-icon>
              <span class="quick-label">{{ t(action.labelKey) }}</span>
              <span class="quick-hint">{{ t(action.hintKey) }}</span>
            </a>
          </div>
        }
      </div>
    </ng-container>
  `,
  styles: `
    .quick-action {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 20px;
      height: 100%;
      text-decoration: none;
      color: inherit;
      transition:
        border-color 120ms ease,
        box-shadow 120ms ease;
      &:hover,
      &:focus-visible {
        border-color: var(--mat-sys-primary);
        box-shadow: var(--mat-sys-level2);
      }
    }
    .quick-icon {
      width: 40px;
      height: 40px;
      font-size: 40px;
      color: var(--mat-sys-primary);
      margin-bottom: 8px;
    }
    .quick-label {
      font: var(--mat-sys-title-medium);
    }
    .quick-hint {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class Home {
  protected readonly actions = [
    {
      icon: 'point_of_sale',
      labelKey: 'home.newBill',
      hintKey: 'home.newBillHint',
      route: '/billing',
    },
    { icon: 'cable', labelKey: 'home.stock', hintKey: 'home.stockHint', route: '/stock' },
    {
      icon: 'local_shipping',
      labelKey: 'home.purchase',
      hintKey: 'home.purchaseHint',
      route: '/purchases',
    },
    {
      icon: 'verified',
      labelKey: 'home.warranty',
      hintKey: 'home.warrantyHint',
      route: '/warranty',
    },
  ];
}
