/**
 * Demo electrical and electronics shop: test data and the sales demo.
 *
 * Shaped like docs/schema.dbml. The tables are created in Phase 2 (shop, stores,
 * staff) and Phase 3 (catalogue onward); a loader will insert this data then.
 *
 * All names and brands are invented; barcodes use the GS1 "200" in-store range so
 * they cannot match real products. HSN codes and GST rates are PLACEHOLDERS for
 * the demo only (see DEMO_TAX_VALUES_ARE_PLACEHOLDERS): not tax facts. A CA
 * confirms real values.
 */
import { type Milli, type Paise, parseInr, parseQty } from '@shop/shared';

const rs = (amount: string): Paise => parseInr(amount);
const qty = (value: string): Milli => parseQty(value);

export type CategoryKey =
  | 'wires'
  | 'switches'
  | 'lighting'
  | 'appliances'
  | 'electronics'
  | 'accessories'
  | 'tools';

export interface DemoCategory {
  key: CategoryKey;
  name: string;
  nameHi: string;
  requiresSerial: boolean;
  defaultBrandWarrantyMonths: number;
}

/** The seven product groups from the electrical roadmap. */
export const DEMO_CATEGORIES: readonly DemoCategory[] = [
  {
    key: 'wires',
    name: 'Wires & cables',
    nameHi: 'तार और केबल',
    requiresSerial: false,
    defaultBrandWarrantyMonths: 0,
  },
  {
    key: 'switches',
    name: 'Switches, sockets & MCBs',
    nameHi: 'स्विच, सॉकेट और MCB',
    requiresSerial: false,
    defaultBrandWarrantyMonths: 0,
  },
  {
    key: 'lighting',
    name: 'Lighting',
    nameHi: 'लाइट',
    requiresSerial: false,
    defaultBrandWarrantyMonths: 12,
  },
  {
    key: 'appliances',
    name: 'Fans, geysers & appliances',
    nameHi: 'पंखे, गीज़र और उपकरण',
    requiresSerial: true,
    defaultBrandWarrantyMonths: 24,
  },
  {
    key: 'electronics',
    name: 'Consumer electronics',
    nameHi: 'इलेक्ट्रॉनिक्स',
    requiresSerial: true,
    defaultBrandWarrantyMonths: 12,
  },
  {
    key: 'accessories',
    name: 'Accessories',
    nameHi: 'एक्सेसरीज़',
    requiresSerial: false,
    defaultBrandWarrantyMonths: 6,
  },
  {
    key: 'tools',
    name: 'Tools & consumables',
    nameHi: 'औज़ार और छोटा सामान',
    requiresSerial: false,
    defaultBrandWarrantyMonths: 0,
  },
];

/** Invented brands. */
export const DEMO_BRANDS = [
  'Prakash Cables',
  'Jyoti Switchgear',
  'Roshni Lights',
  'Pawan Appliances',
  'Shakti Power',
  'Kiran Electronics',
  'Mistri Tools',
] as const;
export type DemoBrand = (typeof DEMO_BRANDS)[number];

export interface DemoVariant {
  sku: string;
  barcode?: string;
  /** rating, gauge, colour, wattage, finish ... */
  attributes: Record<string, string>;
  costPaise: Paise;
  listPricePaise: Paise;
  /** Null when there is no printed MRP (loose wire). */
  mrpPaise: Paise | null;
  brandWarrantyMonths: number;
  shopWarrantyMonths: number;
  reorderLevel: Milli;
}

export interface DemoProduct {
  name: string;
  nameHi: string;
  category: CategoryKey;
  brand: DemoBrand;
  /** PLACEHOLDER, unverified. */
  hsnCode: string;
  /** PLACEHOLDER, unverified. Basis points: 1800 = 18%. */
  gstRateBp: number;
  /** Matches schema.dbml base units (piece, metre, kg). */
  baseUnit: 'piece' | 'metre';
  purchaseUnit: 'piece' | 'box' | 'coil' | 'pack';
  /** Base units per purchase unit (90 m per coil). */
  purchaseUnitFactor: Milli;
  tracksBatches: boolean;
  tracksSerials: boolean;
  variants: DemoVariant[];
}

/** A variant as written below; brand warranty defaults to the category's. */
type RawVariant = Omit<DemoVariant, 'brandWarrantyMonths'> & {
  brandWarrantyMonths?: number;
};
type RawProduct = Omit<DemoProduct, 'variants'> & { variants: RawVariant[] };

const v = (
  sku: string,
  attributes: Record<string, string>,
  cost: string,
  list: string,
  mrp: string | null,
  extra: Partial<
    Pick<DemoVariant, 'barcode' | 'brandWarrantyMonths' | 'shopWarrantyMonths'>
  > & {
    reorder?: string;
  } = {},
): RawVariant => ({
  sku,
  barcode: extra.barcode,
  attributes,
  costPaise: rs(cost),
  listPricePaise: rs(list),
  mrpPaise: mrp === null ? null : rs(mrp),
  brandWarrantyMonths: extra.brandWarrantyMonths,
  shopWarrantyMonths: extra.shopWarrantyMonths ?? 0,
  reorderLevel: qty(extra.reorder ?? '0'),
});

const RAW_PRODUCTS: readonly RawProduct[] = [
  // ---- Wires & cables: stored in metres, bought by the 90 m coil ----
  {
    name: 'House wire FR PVC',
    nameHi: 'हाउस वायर FR PVC',
    category: 'wires',
    brand: 'Prakash Cables',
    hsnCode: '8544',
    gstRateBp: 1800,
    baseUnit: 'metre',
    purchaseUnit: 'coil',
    purchaseUnitFactor: qty('90'),
    tracksBatches: true,
    tracksSerials: false,
    variants: [
      v(
        'PC-HW-1.0-RED',
        { gauge: '1.0 sq mm', colour: 'Red' },
        '12.40',
        '16.50',
        null,
        { reorder: '180' },
      ),
      v(
        'PC-HW-1.5-RED',
        { gauge: '1.5 sq mm', colour: 'Red' },
        '17.80',
        '23.00',
        null,
        { reorder: '180' },
      ),
      v(
        'PC-HW-1.5-BLK',
        { gauge: '1.5 sq mm', colour: 'Black' },
        '17.80',
        '23.00',
        null,
        { reorder: '180' },
      ),
      v(
        'PC-HW-2.5-RED',
        { gauge: '2.5 sq mm', colour: 'Red' },
        '28.60',
        '36.00',
        null,
        { reorder: '90' },
      ),
      v(
        'PC-HW-4.0-BLK',
        { gauge: '4.0 sq mm', colour: 'Black' },
        '45.00',
        '56.00',
        null,
        { reorder: '90' },
      ),
    ],
  },
  {
    name: 'LAN cable Cat6',
    nameHi: 'LAN केबल Cat6',
    category: 'wires',
    brand: 'Prakash Cables',
    hsnCode: '8544',
    gstRateBp: 1800,
    baseUnit: 'metre',
    purchaseUnit: 'coil',
    purchaseUnitFactor: qty('305'),
    tracksBatches: true,
    tracksSerials: false,
    variants: [
      v('PC-CAT6-GRY', { colour: 'Grey' }, '14.00', '20.00', null, {
        reorder: '100',
      }),
    ],
  },
  {
    name: 'Flexible copper wire',
    nameHi: 'फ्लेक्सिबल कॉपर वायर',
    category: 'wires',
    brand: 'Prakash Cables',
    hsnCode: '8544',
    gstRateBp: 1800,
    baseUnit: 'metre',
    purchaseUnit: 'coil',
    purchaseUnitFactor: qty('90'),
    tracksBatches: true,
    tracksSerials: false,
    variants: [
      v(
        'PC-FLX-0.75-WHT',
        { gauge: '0.75 sq mm', colour: 'White' },
        '9.50',
        '13.00',
        null,
        { reorder: '90' },
      ),
    ],
  },

  // ---- Switches, sockets & MCBs ----
  {
    name: 'Modular switch 6A',
    nameHi: 'मॉड्यूलर स्विच 6A',
    category: 'switches',
    brand: 'Jyoti Switchgear',
    hsnCode: '8536',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('20'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v(
        'JS-SW6-WHT',
        { rating: '6A', finish: 'White' },
        '28.00',
        '42.00',
        '55.00',
        { barcode: '2000000000011', reorder: '40' },
      ),
      v(
        'JS-SW6-GRY',
        { rating: '6A', finish: 'Grey' },
        '32.00',
        '48.00',
        '62.00',
        { barcode: '2000000000028', reorder: '20' },
      ),
    ],
  },
  {
    name: 'Modular socket 16A',
    nameHi: 'मॉड्यूलर सॉकेट 16A',
    category: 'switches',
    brand: 'Jyoti Switchgear',
    hsnCode: '8536',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('10'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v(
        'JS-SK16-WHT',
        { rating: '16A', finish: 'White' },
        '85.00',
        '120.00',
        '150.00',
        { barcode: '2000000000035', reorder: '10' },
      ),
    ],
  },
  {
    name: 'MCB single pole',
    nameHi: 'MCB सिंगल पोल',
    category: 'switches',
    brand: 'Jyoti Switchgear',
    hsnCode: '8536',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('12'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v('JS-MCB-SP-16', { rating: '16A' }, '140.00', '210.00', '265.00', {
        barcode: '2000000000042',
        reorder: '12',
      }),
      v('JS-MCB-SP-32', { rating: '32A' }, '160.00', '235.00', '295.00', {
        barcode: '2000000000059',
        reorder: '6',
      }),
    ],
  },
  {
    name: 'Switch plate 4 module',
    nameHi: 'स्विच प्लेट 4 मॉड्यूल',
    category: 'switches',
    brand: 'Jyoti Switchgear',
    hsnCode: '8538',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('10'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v(
        'JS-PL4-WHT',
        { modules: '4', finish: 'White' },
        '45.00',
        '70.00',
        '90.00',
        { reorder: '10' },
      ),
    ],
  },

  // ---- Lighting ----
  {
    name: 'LED bulb',
    nameHi: 'LED बल्ब',
    category: 'lighting',
    brand: 'Roshni Lights',
    hsnCode: '8539',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('50'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v(
        'RL-BLB-9W-CW',
        { wattage: '9W', colour: 'Cool white' },
        '48.00',
        '75.00',
        '99.00',
        { barcode: '2000000000066', brandWarrantyMonths: 12, reorder: '50' },
      ),
      v(
        'RL-BLB-12W-CW',
        { wattage: '12W', colour: 'Cool white' },
        '62.00',
        '95.00',
        '129.00',
        { barcode: '2000000000073', brandWarrantyMonths: 12, reorder: '25' },
      ),
      v(
        'RL-BLB-9W-WW',
        { wattage: '9W', colour: 'Warm white' },
        '50.00',
        '78.00',
        '99.00',
        { brandWarrantyMonths: 12, reorder: '25' },
      ),
    ],
  },
  {
    name: 'LED batten 20W',
    nameHi: 'LED बैटन 20W',
    category: 'lighting',
    brand: 'Roshni Lights',
    hsnCode: '9405',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('10'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v(
        'RL-BAT-20W',
        { wattage: '20W', length: '4 ft' },
        '160.00',
        '240.00',
        '325.00',
        { brandWarrantyMonths: 24, reorder: '10' },
      ),
    ],
  },
  {
    name: 'LED panel 15W',
    nameHi: 'LED पैनल 15W',
    category: 'lighting',
    brand: 'Roshni Lights',
    hsnCode: '9405',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('10'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v(
        'RL-PNL-15W-RND',
        { wattage: '15W', shape: 'Round' },
        '210.00',
        '320.00',
        '420.00',
        { brandWarrantyMonths: 24, reorder: '5' },
      ),
    ],
  },

  // ---- Fans, geysers & appliances: serial number on every unit ----
  {
    name: 'Ceiling fan 1200 mm',
    nameHi: 'छत का पंखा 1200 mm',
    category: 'appliances',
    brand: 'Pawan Appliances',
    hsnCode: '8414',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'piece',
    purchaseUnitFactor: qty('1'),
    tracksBatches: false,
    tracksSerials: true,
    variants: [
      v(
        'PA-CF-1200-WHT',
        { sweep: '1200 mm', colour: 'White' },
        '1450.00',
        '1950.00',
        '2490.00',
        { brandWarrantyMonths: 24, reorder: '3' },
      ),
      v(
        'PA-CF-1200-BRN',
        { sweep: '1200 mm', colour: 'Brown' },
        '1450.00',
        '1950.00',
        '2490.00',
        { brandWarrantyMonths: 24, reorder: '2' },
      ),
    ],
  },
  {
    name: 'Storage water heater 15 L',
    nameHi: 'गीज़र 15 लीटर',
    category: 'appliances',
    brand: 'Pawan Appliances',
    hsnCode: '8516',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'piece',
    purchaseUnitFactor: qty('1'),
    tracksBatches: false,
    tracksSerials: true,
    variants: [
      v('PA-GY-15L', { capacity: '15 L' }, '5200.00', '6800.00', '8990.00', {
        brandWarrantyMonths: 24,
        shopWarrantyMonths: 6,
        reorder: '1',
      }),
    ],
  },
  {
    name: 'Mixer grinder 750 W',
    nameHi: 'मिक्सर ग्राइंडर 750 W',
    category: 'appliances',
    brand: 'Pawan Appliances',
    hsnCode: '8509',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'piece',
    purchaseUnitFactor: qty('1'),
    tracksBatches: false,
    tracksSerials: true,
    variants: [
      v(
        'PA-MG-750',
        { wattage: '750 W', jars: '3' },
        '2350.00',
        '3100.00',
        '3999.00',
        { brandWarrantyMonths: 24, reorder: '1' },
      ),
    ],
  },

  // ---- Consumer electronics: serial number on every unit ----
  {
    name: 'Inverter 1100 VA',
    nameHi: 'इन्वर्टर 1100 VA',
    category: 'electronics',
    brand: 'Shakti Power',
    hsnCode: '8504',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'piece',
    purchaseUnitFactor: qty('1'),
    tracksBatches: false,
    tracksSerials: true,
    variants: [
      v('SP-INV-1100', { rating: '1100 VA' }, '5600.00', '7200.00', '8500.00', {
        brandWarrantyMonths: 24,
        reorder: '1',
      }),
    ],
  },
  {
    name: 'Inverter battery 150 Ah',
    nameHi: 'इन्वर्टर बैटरी 150 Ah',
    category: 'electronics',
    brand: 'Shakti Power',
    hsnCode: '8507',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'piece',
    purchaseUnitFactor: qty('1'),
    tracksBatches: false,
    tracksSerials: true,
    variants: [
      v(
        'SP-BAT-150',
        { capacity: '150 Ah', type: 'Tall tubular' },
        '11200.00',
        '13800.00',
        '16500.00',
        { brandWarrantyMonths: 36, reorder: '1' },
      ),
    ],
  },
  {
    name: 'Bluetooth speaker',
    nameHi: 'ब्लूटूथ स्पीकर',
    category: 'electronics',
    brand: 'Kiran Electronics',
    hsnCode: '8518',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'piece',
    purchaseUnitFactor: qty('1'),
    tracksBatches: false,
    tracksSerials: true,
    variants: [
      v(
        'KE-SPK-10W',
        { wattage: '10 W', colour: 'Black' },
        '850.00',
        '1250.00',
        '1799.00',
        { brandWarrantyMonths: 12, reorder: '2' },
      ),
    ],
  },

  // ---- Accessories ----
  {
    name: 'Extension board 4 socket',
    nameHi: 'एक्सटेंशन बोर्ड 4 सॉकेट',
    category: 'accessories',
    brand: 'Jyoti Switchgear',
    hsnCode: '8536',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('10'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v(
        'JS-EXT-4-1.5M',
        { sockets: '4', cord: '1.5 m' },
        '180.00',
        '260.00',
        '349.00',
        { barcode: '2000000000080', brandWarrantyMonths: 6, reorder: '5' },
      ),
      v(
        'JS-EXT-4-3M',
        { sockets: '4', cord: '3 m' },
        '220.00',
        '310.00',
        '399.00',
        { brandWarrantyMonths: 6, reorder: '5' },
      ),
    ],
  },
  {
    name: 'Mobile charger 20 W',
    nameHi: 'मोबाइल चार्जर 20 W',
    category: 'accessories',
    brand: 'Kiran Electronics',
    hsnCode: '8504',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('10'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v(
        'KE-CHG-20W-C',
        { port: 'USB-C', wattage: '20 W' },
        '210.00',
        '320.00',
        '499.00',
        { brandWarrantyMonths: 6, reorder: '5' },
      ),
      v(
        'KE-CHG-20W-A',
        { port: 'USB-A', wattage: '20 W' },
        '180.00',
        '280.00',
        '449.00',
        { brandWarrantyMonths: 6, reorder: '5' },
      ),
    ],
  },
  {
    name: 'Bulb holder',
    nameHi: 'बल्ब होल्डर',
    category: 'accessories',
    brand: 'Jyoti Switchgear',
    hsnCode: '8536',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('50'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v('JS-HLD-PEN', { type: 'Pendant' }, '14.00', '22.00', '30.00', {
        reorder: '50',
      }),
      v('JS-HLD-ANG', { type: 'Angle' }, '16.00', '25.00', '35.00', {
        reorder: '50',
      }),
    ],
  },

  // ---- Tools & consumables ----
  {
    name: 'PVC insulation tape',
    nameHi: 'PVC इंसुलेशन टेप',
    category: 'tools',
    brand: 'Mistri Tools',
    hsnCode: '3919',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'pack',
    purchaseUnitFactor: qty('10'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v('MT-TAPE-BLK', { colour: 'Black' }, '8.00', '14.00', '20.00', {
        reorder: '30',
      }),
      v('MT-TAPE-RED', { colour: 'Red' }, '8.00', '14.00', '20.00', {
        reorder: '20',
      }),
    ],
  },
  {
    name: 'Cable clips (packet of 100)',
    nameHi: 'केबल क्लिप',
    category: 'tools',
    brand: 'Mistri Tools',
    hsnCode: '3926',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('20'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v(
        'MT-CLIP-6MM',
        { size: '6 mm', count: '100' },
        '25.00',
        '40.00',
        '55.00',
        { reorder: '10' },
      ),
      v(
        'MT-CLIP-8MM',
        { size: '8 mm', count: '100' },
        '28.00',
        '45.00',
        '60.00',
        { reorder: '10' },
      ),
    ],
  },
  {
    name: 'Fuse wire',
    nameHi: 'फ्यूज़ वायर',
    category: 'tools',
    brand: 'Mistri Tools',
    hsnCode: '7408',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('10'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v('MT-FUSE-15A', { rating: '15A' }, '12.00', '20.00', '30.00', {
        reorder: '10',
      }),
    ],
  },
  {
    name: 'Line tester screwdriver',
    nameHi: 'लाइन टेस्टर',
    category: 'tools',
    brand: 'Mistri Tools',
    hsnCode: '8205',
    gstRateBp: 1800,
    baseUnit: 'piece',
    purchaseUnit: 'box',
    purchaseUnitFactor: qty('10'),
    tracksBatches: false,
    tracksSerials: false,
    variants: [
      v('MT-TESTER', {}, '22.00', '35.00', '50.00', {
        barcode: '2000000000097',
        reorder: '5',
      }),
    ],
  },
];

/** Products with each variant's brand warranty defaulted from its category. */
export const DEMO_PRODUCTS: readonly DemoProduct[] = RAW_PRODUCTS.map((p) => {
  const category = DEMO_CATEGORIES.find((c) => c.key === p.category)!;
  return {
    ...p,
    variants: p.variants.map((variant) => ({
      ...variant,
      brandWarrantyMonths:
        variant.brandWarrantyMonths ?? category.defaultBrandWarrantyMonths,
    })),
  };
});

export type StoreKey = 'godown' | 'counter';

export const DEMO_STORES: readonly {
  key: StoreKey;
  name: string;
  type: StoreKey;
}[] = [
  { key: 'godown', name: 'Godown', type: 'godown' },
  { key: 'counter', name: 'Counter', type: 'counter' },
];

/** The date the demo shop starts using the app; opening stock and balances are as of this day. */
export const DEMO_OPENING_DATE = '2026-11-01';

/** Opening stock for every variant that is not coil- or serial-tracked. */
export interface DemoOpeningStock {
  sku: string;
  store: StoreKey;
  qty: Milli;
}

/**
 * Coils (batches) as counted on the opening date. A coil already part cut
 * before the shop started on the app is entered with what is left as its
 * `initialQty`, so remaining = initial + movements holds from day one;
 * `nominalLength` records the coil's original size for display only.
 */
export interface DemoCoil {
  sku: string;
  store: StoreKey;
  batchCode: string;
  nominalLength: Milli;
  initialQty: Milli;
  remainingQty: Milli;
  isOpen: boolean;
  costPaise: Paise;
  receivedAt: string;
}

const coil = (
  sku: string,
  store: StoreKey,
  batchCode: string,
  nominal: string,
  counted: string,
  isOpen: boolean,
  cost: string,
): DemoCoil => ({
  sku,
  store,
  batchCode,
  nominalLength: qty(nominal),
  initialQty: qty(counted),
  remainingQty: qty(counted),
  isOpen,
  costPaise: rs(cost),
  receivedAt: DEMO_OPENING_DATE,
});

export const DEMO_COILS: readonly DemoCoil[] = [
  coil('PC-HW-1.0-RED', 'godown', 'C-2611-01', '90', '90', false, '12.40'),
  // The demo's main example: an open coil at the counter, a full one in the godown.
  coil('PC-HW-1.5-RED', 'counter', 'C-2611-02', '90', '37.5', true, '17.80'),
  coil('PC-HW-1.5-RED', 'godown', 'C-2611-03', '90', '90', false, '17.80'),
  coil('PC-HW-1.5-BLK', 'counter', 'C-2611-04', '90', '90', false, '17.80'),
  coil('PC-HW-2.5-RED', 'godown', 'C-2611-05', '90', '90', false, '28.60'),
  coil('PC-HW-4.0-BLK', 'godown', 'C-2611-06', '90', '90', false, '45.00'),
  coil('PC-CAT6-GRY', 'counter', 'C-2611-07', '305', '305', false, '14.00'),
  coil('PC-FLX-0.75-WHT', 'counter', 'C-2611-08', '90', '64', true, '9.50'),
];

/**
 * Serial-numbered units in stock on the opening date: at least one of every
 * serial-tracked item. Sold units are not seeded; a sale (with its serial_sales
 * row and warranty dates) is created through the real billing flow.
 */
export interface DemoSerial {
  sku: string;
  store: StoreKey;
  serialNumber: string;
}

export const DEMO_SERIALS: readonly DemoSerial[] = [
  { sku: 'PA-CF-1200-WHT', store: 'counter', serialNumber: 'DEMO-CF-0001' },
  { sku: 'PA-CF-1200-WHT', store: 'godown', serialNumber: 'DEMO-CF-0002' },
  { sku: 'PA-CF-1200-BRN', store: 'counter', serialNumber: 'DEMO-CF-0003' },
  { sku: 'PA-GY-15L', store: 'godown', serialNumber: 'DEMO-GY-0001' },
  { sku: 'PA-MG-750', store: 'counter', serialNumber: 'DEMO-MG-0001' },
  { sku: 'SP-INV-1100', store: 'counter', serialNumber: 'DEMO-IN-0001' },
  { sku: 'SP-BAT-150', store: 'godown', serialNumber: 'DEMO-BT-0001' },
  { sku: 'KE-SPK-10W', store: 'counter', serialNumber: 'DEMO-SK-0001' },
];

export const DEMO_OPENING_STOCK: readonly DemoOpeningStock[] =
  DEMO_PRODUCTS.flatMap((p) =>
    p.tracksBatches || p.tracksSerials
      ? []
      : p.variants.map((variant) => ({
          sku: variant.sku,
          store: 'counter' as const,
          qty: variant.reorderLevel > 0 ? variant.reorderLevel * 2 : qty('10'),
        })),
  );

export interface DemoPriceList {
  name: string;
  basis: 'list' | 'mrp';
  discountBp: number;
  isDefault: boolean;
  /** Fixed prices for chosen variants, overriding the percentage rule. */
  items: { sku: string; pricePaise: Paise }[];
}

export const DEMO_PRICE_LISTS: readonly DemoPriceList[] = [
  { name: 'Retail', basis: 'list', discountBp: 0, isDefault: true, items: [] },
  {
    name: 'Contractor',
    basis: 'list',
    discountBp: 1000,
    isDefault: false,
    items: [{ sku: 'PC-HW-1.5-RED', pricePaise: rs('20.50') }],
  },
  {
    name: 'Dealer',
    basis: 'list',
    discountBp: 1500,
    isDefault: false,
    items: [],
  },
];

/** Columns of the `parties` table (schema.dbml). Balances are ledger entries, below. */
export interface DemoParty {
  key: string;
  type: 'customer' | 'supplier' | 'both';
  name: string;
  phone: string | null;
  gstin: string | null;
  stateCode: string | null;
  priceList: string | null;
  creditAllowed: boolean;
  creditLimitPaise: Paise | null;
  creditDays: number;
}

/** Names say "Demo"; phone numbers use the 99999 0000x pattern so they are obviously fake. */
export const DEMO_PARTIES: readonly DemoParty[] = [
  {
    key: 'contractor',
    type: 'customer',
    name: 'Demo Contractor Works',
    phone: '9999900001',
    gstin: null,
    stateCode: '09',
    priceList: 'Contractor',
    creditAllowed: true,
    creditLimitPaise: rs('50000'),
    creditDays: 30,
  },
  {
    key: 'walkin',
    type: 'customer',
    name: 'Walk-in customer',
    phone: null,
    gstin: null,
    stateCode: null,
    priceList: null,
    creditAllowed: false,
    creditLimitPaise: null,
    creditDays: 0,
  },
  {
    key: 'supplier',
    type: 'supplier',
    name: 'Demo Distributors',
    phone: '9999900002',
    gstin: null,
    stateCode: '09',
    priceList: null,
    creditAllowed: true,
    creditLimitPaise: null,
    creditDays: 45,
  },
];

/**
 * Opening balances: `party_ledger` rows with entry_type 'opening'.
 * Positive = the party owes the shop; negative = the shop owes the party.
 */
export interface DemoOpeningBalance {
  party: string;
  amountPaise: Paise;
  asOf: string;
  dueDate: string | null;
}

export const DEMO_OPENING_BALANCES: readonly DemoOpeningBalance[] = [
  {
    party: 'contractor',
    amountPaise: rs('12450'),
    asOf: DEMO_OPENING_DATE,
    dueDate: '2026-11-30',
  },
  {
    party: 'supplier',
    amountPaise: -rs('38200'),
    asOf: DEMO_OPENING_DATE,
    dueDate: '2026-12-15',
  },
];

/**
 * The demo shop: fields named after the `shops` columns in src/db/schema.ts.
 * `planCode` resolves to plans.id. Created through app_create_shop() in real use.
 */
export const DEMO_SHOP = {
  name: 'Demo Electricals',
  gstType: 'unregistered' as const,
  gstin: null,
  stateCode: '09',
  turnoverBand: 'below_1_5_crore',
  preset: 'electrical_electronics',
  planCode: 'trial',
  subscriptionStatus: 'trialing' as const,
  modBatchTracking: true,
  modSerialTracking: true,
  modDecimalQty: true,
  modPriceLists: true,
  modQuotations: true,
  modCreditLedger: true,
  modExpiryTracking: false,
  modPharmacyCompliance: false,
  allowNegativeStock: true,
  mrpPolicy: 'warn' as const,
};

/**
 * HSN codes and GST rates above are demo placeholders, not tax facts. A loader
 * must mark this shop as demo data, and screens must not present these rates as
 * correct. A CA confirms real values before any real shop uses them.
 */
export const DEMO_TAX_VALUES_ARE_PLACEHOLDERS = true;
