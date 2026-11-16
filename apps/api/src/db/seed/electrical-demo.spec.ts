import { planCoilDraw } from '@shop/shared';
import {
  DEMO_BRANDS,
  DEMO_CATEGORIES,
  DEMO_COILS,
  DEMO_OPENING_STOCK,
  DEMO_PARTIES,
  DEMO_PRICE_LISTS,
  DEMO_PRODUCTS,
  DEMO_SERIALS,
  DEMO_SHOP,
} from './electrical-demo';

const variants = DEMO_PRODUCTS.flatMap((p) =>
  p.variants.map((v) => ({ product: p, ...v })),
);
const bySku = new Map(variants.map((v) => [v.sku, v]));

describe('demo electrical shop data', () => {
  it('has the seven product groups and about 40 items', () => {
    expect(DEMO_CATEGORIES).toHaveLength(7);
    const used = new Set(DEMO_PRODUCTS.map((p) => p.category));
    expect(used.size).toBe(7);
    expect(variants.length).toBeGreaterThanOrEqual(35);
    expect(variants.length).toBeLessThanOrEqual(45);
  });

  it('every SKU and barcode is unique', () => {
    expect(bySku.size).toBe(variants.length);
    const barcodes = variants.flatMap((v) => (v.barcode ? [v.barcode] : []));
    expect(new Set(barcodes).size).toBe(barcodes.length);
  });

  it('every product uses a known brand and category, with an HSN code and a valid rate', () => {
    const categories = new Set(DEMO_CATEGORIES.map((c) => c.key));
    for (const p of DEMO_PRODUCTS) {
      expect(DEMO_BRANDS as readonly string[]).toContain(p.brand);
      expect(categories.has(p.category)).toBe(true);
      expect(p.hsnCode).toMatch(/^\d{4,8}$/);
      expect(
        Number.isInteger(p.gstRateBp) &&
          p.gstRateBp >= 0 &&
          p.gstRateBp <= 10_000,
      ).toBe(true);
      expect(p.nameHi.trim().length).toBeGreaterThan(0);
    }
  });

  it('prices make sense: cost < list price <= MRP, all whole paise', () => {
    for (const v of variants) {
      for (const paise of [v.costPaise, v.listPricePaise, v.mrpPaise ?? 0]) {
        expect(Number.isSafeInteger(paise)).toBe(true);
      }
      expect(v.costPaise).toBeLessThan(v.listPricePaise);
      if (v.mrpPaise !== null)
        expect(v.listPricePaise).toBeLessThanOrEqual(v.mrpPaise);
    }
  });

  it('only loose items (wire) have no MRP', () => {
    for (const v of variants) {
      if (v.mrpPaise === null) expect(v.product.baseUnit).toBe('metre');
    }
  });

  it('serial tracking follows the category rule', () => {
    const mismatched = DEMO_PRODUCTS.filter(
      (p) =>
        p.tracksSerials !==
        DEMO_CATEGORIES.find((c) => c.key === p.category)!.requiresSerial,
    ).map((p) => p.name);
    expect(mismatched).toEqual([]);
  });

  it('wire is stored in metres and bought by the coil', () => {
    for (const p of DEMO_PRODUCTS.filter((x) => x.category === 'wires')) {
      expect(p.baseUnit).toBe('metre');
      expect(p.purchaseUnit).toBe('coil');
      expect(p.tracksBatches).toBe(true);
      expect(p.purchaseUnitFactor).toBeGreaterThan(0);
    }
  });

  describe('coils', () => {
    it('has two coils of a batch-tracked wire, never below zero, at most one open per store', () => {
      expect(DEMO_COILS).toHaveLength(2);
      for (const coil of DEMO_COILS) {
        expect(bySku.get(coil.sku)?.product.tracksBatches).toBe(true);
        expect(coil.remainingQty).toBeGreaterThanOrEqual(0);
        expect(coil.remainingQty).toBeLessThanOrEqual(coil.initialQty);
      }
      for (const store of ['godown', 'counter']) {
        expect(
          DEMO_COILS.filter((c) => c.store === store && c.isOpen).length,
        ).toBeLessThanOrEqual(1);
      }
    });

    it('a sale at the counter draws from the open coil (roadmap demo)', () => {
      const counter = DEMO_COILS.filter((c) => c.store === 'counter').map(
        (c) => ({
          id: c.batchCode,
          remaining: c.remainingQty,
          isOpen: c.isOpen,
        }),
      );
      expect(planCoilDraw(2500, counter)).toEqual([
        { coilId: 'C-2611-01', qty: 2500 },
      ]);
    });
  });

  describe('serials', () => {
    it('has three units of serial-tracked items with unique serial numbers', () => {
      expect(DEMO_SERIALS).toHaveLength(3);
      expect(new Set(DEMO_SERIALS.map((s) => s.serialNumber)).size).toBe(3);
      for (const s of DEMO_SERIALS) {
        expect(bySku.get(s.sku)?.product.tracksSerials).toBe(true);
      }
    });

    it('a sold unit has a sale date; an in-stock unit does not', () => {
      for (const s of DEMO_SERIALS) {
        if (s.status === 'sold')
          expect(s.soldOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        else expect(s.soldOn).toBeUndefined();
      }
    });
  });

  it('opening stock covers every plain item and none of the coil or serial items', () => {
    const plain = variants.filter(
      (v) => !v.product.tracksBatches && !v.product.tracksSerials,
    );
    expect(DEMO_OPENING_STOCK.map((s) => s.sku).sort()).toEqual(
      plain.map((v) => v.sku).sort(),
    );
    for (const s of DEMO_OPENING_STOCK) expect(s.qty).toBeGreaterThan(0);
  });

  describe('price lists and parties', () => {
    it('has retail, contractor and dealer lists, exactly one default', () => {
      expect(DEMO_PRICE_LISTS.map((l) => l.name)).toEqual([
        'Retail',
        'Contractor',
        'Dealer',
      ]);
      expect(DEMO_PRICE_LISTS.filter((l) => l.isDefault)).toHaveLength(1);
      for (const l of DEMO_PRICE_LISTS) {
        expect(l.discountBp).toBeGreaterThanOrEqual(0);
        expect(l.discountBp).toBeLessThanOrEqual(10_000);
        for (const item of l.items) expect(bySku.has(item.sku)).toBe(true);
      }
    });

    it('a fixed contractor price is still above cost', () => {
      for (const item of DEMO_PRICE_LISTS.flatMap((l) => l.items)) {
        expect(item.pricePaise).toBeGreaterThan(bySku.get(item.sku)!.costPaise);
      }
    });

    it('has one contractor on credit who owes money, within the limit', () => {
      const contractor = DEMO_PARTIES.find((p) => p.key === 'contractor')!;
      expect(contractor.creditAllowed).toBe(true);
      expect(contractor.openingBalancePaise).toBeGreaterThan(0);
      expect(contractor.openingBalancePaise).toBeLessThanOrEqual(
        contractor.creditLimitPaise!,
      );
      expect(
        DEMO_PRICE_LISTS.some((l) => l.name === contractor.priceList),
      ).toBe(true);
    });

    it('phone numbers are obviously fake, and walk-in customers get no credit', () => {
      for (const p of DEMO_PARTIES) {
        if (p.phone) expect(p.phone).toMatch(/^99999\d{5}$/);
      }
      expect(DEMO_PARTIES.find((p) => p.key === 'walkin')!.creditAllowed).toBe(
        false,
      );
    });
  });

  it('the shop turns on the electrical preset modules and leaves pharmacy ones off', () => {
    expect(DEMO_SHOP.modules.batchTracking).toBe(true);
    expect(DEMO_SHOP.modules.serialTracking).toBe(true);
    expect(DEMO_SHOP.modules.expiryTracking).toBe(false);
    expect(DEMO_SHOP.modules.pharmacyCompliance).toBe(false);
    // An unregistered shop issues cash memos and has no GSTIN.
    expect(DEMO_SHOP.gstType).toBe('unregistered');
    expect(DEMO_SHOP.gstin).toBeNull();
  });
});
