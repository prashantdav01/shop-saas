import { Routes } from '@angular/router';
import { Shell } from './layout/shell';

const soon = (path: string, titleKey: string) => ({
  path,
  loadComponent: () => import('./pages/coming-soon/coming-soon').then((m) => m.ComingSoon),
  data: { titleKey },
});

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
      soon('billing', 'nav.billing'),
      soon('stock', 'nav.stock'),
      soon('purchases', 'nav.purchases'),
      soon('parties', 'nav.parties'),
      soon('warranty', 'nav.warranty'),
      soon('reports', 'nav.reports'),
      soon('settings', 'nav.settings'),
      {
        path: '**',
        loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
