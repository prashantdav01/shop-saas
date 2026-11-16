import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { TranslocoService } from '@jsverse/transloco';
import { filter } from 'rxjs';

/**
 * PWA behaviour: online/offline status, and a prompt when a new version is ready.
 * The service worker caches only the app shell and static files (ngsw-config.json);
 * shop data always comes from the server.
 */
@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  init(): void {
    const setOnline = () => this.online.set(true);
    const setOffline = () => this.online.set(false);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    });

    if (!this.swUpdate.isEnabled) return;
    this.swUpdate.versionUpdates
      .pipe(
        filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.promptUpdate());
  }

  private promptUpdate(): void {
    const ref = this.snackBar.open(
      this.transloco.translate('pwa.updateReady'),
      this.transloco.translate('pwa.reload'),
      { duration: 0 },
    );
    ref.onAction().subscribe(() => document.location.reload());
  }
}
