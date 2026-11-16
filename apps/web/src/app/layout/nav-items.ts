/** Main menu. Labels are translation keys (public/i18n/*.json). */
export interface NavItem {
  labelKey: string;
  icon: string;
  route: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { labelKey: 'nav.home', icon: 'home', route: '/home' },
  { labelKey: 'nav.billing', icon: 'point_of_sale', route: '/billing' },
  { labelKey: 'nav.stock', icon: 'inventory_2', route: '/stock' },
  { labelKey: 'nav.purchases', icon: 'local_shipping', route: '/purchases' },
  { labelKey: 'nav.parties', icon: 'groups', route: '/parties' },
  { labelKey: 'nav.warranty', icon: 'verified', route: '/warranty' },
  { labelKey: 'nav.reports', icon: 'bar_chart', route: '/reports' },
  { labelKey: 'nav.settings', icon: 'settings', route: '/settings' },
];
