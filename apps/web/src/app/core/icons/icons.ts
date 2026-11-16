import { inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * Every icon the app uses. Each is a small SVG copied from
 * @material-symbols/svg-400 at build time (angular.json assets) and prefetched by
 * the service worker, instead of the 4 MB icon font.
 * To add an icon: add its name here AND to the glob in angular.json.
 */
export const APP_ICONS = [
  'account_circle',
  'bar_chart',
  'bolt',
  'cable',
  'cloud_off',
  'construction',
  'groups',
  'home',
  'info',
  'inventory_2',
  'local_shipping',
  'logout',
  'menu',
  'point_of_sale',
  'settings',
  'verified',
] as const;

export type AppIcon = (typeof APP_ICONS)[number];

/** Registers APP_ICONS so templates can use <mat-icon svgIcon="home" />. */
export function registerAppIcons(): void {
  const registry = inject(MatIconRegistry);
  const sanitizer = inject(DomSanitizer);
  for (const name of APP_ICONS) {
    // Static, same-origin URLs built from the constant list above.
    registry.addSvgIcon(
      name,
      sanitizer.bypassSecurityTrustResourceUrl(`icons/symbols/${name}.svg`),
    );
  }
}
