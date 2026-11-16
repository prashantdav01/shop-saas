import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoDirective } from '@jsverse/transloco';

/** Placeholder for screens built in later phases. Title comes from route data. */
@Component({
  selector: 'app-coming-soon',
  imports: [TranslocoDirective, MatIconModule],
  template: `
    <ng-container *transloco="let t">
      <h1 class="page-title">{{ t(titleKey()) }}</h1>
      <div class="surface-card empty-state mt-3">
        <mat-icon aria-hidden="true" svgIcon="construction" />
        <p class="m-0">{{ t('common.comingSoon') }}</p>
      </div>
    </ng-container>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 48px 16px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      mat-icon {
        width: 48px;
        height: 48px;
        font-size: 48px;
      }
    }
  `,
})
export class ComingSoon {
  /** Bound from route data by withComponentInputBinding(). */
  readonly titleKey = input('common.comingSoon');
}
