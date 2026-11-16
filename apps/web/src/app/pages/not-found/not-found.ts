import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-not-found',
  imports: [TranslocoDirective, MatButtonModule, RouterLink],
  template: `
    <ng-container *transloco="let t">
      <h1 class="page-title">{{ t('notFound.title') }}</h1>
      <p class="page-subtitle mb-3">{{ t('notFound.detail') }}</p>
      <a mat-flat-button routerLink="/home">{{ t('notFound.goHome') }}</a>
    </ng-container>
  `,
})
export class NotFound {}
