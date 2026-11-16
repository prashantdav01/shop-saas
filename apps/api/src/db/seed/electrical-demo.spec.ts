import { applyBp, planCoilDraw } from '@shop/shared';
import {
  DEMO_BRANDS,
  DEMO_CATEGORIES,
  DEMO_COILS,
  DEMO_OPENING_BALANCES,
  DEMO_OPENING_STOCK,
  DEMO_PARTIES,
  DEMO_PRICE_LISTS,
  DEMO_PRODUCTS,
  DEMO_SERIALS,
  DEMO_SHOP,
  DEMO_STORES,
  DEMO_TAX_VALUES_ARE_PLACEHOLDERS,
} from './electrical-demo';

const variants = DEMO_PRODUCTS.flatMap((p) =>
  p.variants.map((v) => ({ product: p, ...v })),
);
const bySku = new Map(variants.map((v) => [v.sku, v]));

describe('demo electrical shop data', () => {
  it('has the seven product groups and about 40 items', () => {
    expect(DEMO_CATEGORIES).toHaveLength(7);
    expect(new Set(DEMO_PRODUCTS.map((p) => p.category)).size).toBe(7);
    expect(variants.length).toBeGreaterThanOrEqual(35);
    expect(variants.length).toBeLessThanOrEqual(45);
  });

  it('every SKU and barcode is unique, and barcodes are in the GS1 in-store "200" range', () => {
    expect(bySku.size).toBe(variants.length);
    const barcodes = variants.flatMap((v) => (v.barcode ? [v.barcode] : []));
    expect(new Set(barcodes).size).toBe(barcodes.length);
    expect(barcodes.filter((b) => !/^200\d{10}$/.test(b))).toEqual([]);
  });

  it('every product uses a known brand and category, an HSN code, a valid rate and a Hindi name', () => {
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

  it('tax values are flagged as placeholders, not facts', () => {
    expect(DEMO_TAX_VALUES_ARE_PLACEHOLDERS).toBe(true);
  });

  it('prices make sense: whole paise, cost < list price, list price <= MRP when there is one', () => {
    for (const v of variants) {
      expect(Number.isSafeInteger(v.costPaise)).toBe(true);
      expect(Number.isSafeInteger(v.listPricePaise)).toBe(true);
      expect(v.costPaise).toBeLessThan(v.listPricePaise);
      if (v.mrpPaise !== null) {
        expect(Number.isSafeInteger(v.mrpPaise)).toBe(true);
        expect(v.listPricePaise).toBeLessThanOrEqual(v.mrpPaise);
      }
    }
  });

  it('only loose items (wire) have no MRP', () => {
    const noMrp = variants.filter((v) => v.mrpPaise === null);
    expect(noMrp.length).toBeGreaterThan(0);
    expect(
      noMrp.filter((v) => v.product.baseUnit !== 'metre').map((v) => v.sku),
    ).toEqual([]);
  });

  it('serial tracking follows the category rule', () => {
    const mismatched = DEMO_PRODUCTS.filter(
      (p) =>
        p.tracksSerials !==
        DEMO_CATEGORIES.find((c) => c.key === p.category)!.requiresSerial,
    ).map((p) => p.name);
    expect(mismatched).toEqual([]);
  });

  it('brand warranty defaults to the category, and is never negative', () => {
    const holder = bySku.get('JS-HLD-PEN')!;
    expect(holder.brandWarrantyMonths).toBe(
      DEMO_CATEGORIES.find((c) => c.key === 'accessories')!
        .defaultBrandWarrantyMonths,
    );
    for (const v of variants) {
      expect(v.brandWarrantyMonths).toBeGreaterThanOrEqual(0);
      expect(v.shopWarrantyMonths).toBeGreaterThanOrEqual(0);
    }
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
    it('every wire item has at least one coil, so nothing shows as out of stock', () => {
      const wireSkus = variants
        .filter((v) => v.product.tracksBatches)
        .map((v) => v.sku);
      const withCoil = new Set(DEMO_COILS.map((c) => c.sku));
      expect(wireSkus.filter((sku) => !withCoil.has(sku))).toEqual([]);
    });

    it('coils are batch-tracked items, within their nominal size, never below zero', () => {
      for (const c of DEMO_COILS) {
        expect(bySku.get(c.sku)?.product.tracksBatches).toBe(true);
        expect(c.remainingQty).toBeGreaterThanOrEqual(0);
        // remaining = initial + movements; no movements are seeded, so they are equal.
        expect(c.remainingQty).toBe(c.initialQty);
        expect(c.initialQty).toBeLessThanOrEqual(c.nominalLength);
        expect(c.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('batch codes are unique and at most one coil is open per item per store', () => {
      expect(new Set(DEMO_COILS.map((c) => c.batchCode)).size).toBe(
        DEMO_COILS.length,
      );
      const open = DEMO_COILS.filter((c) => c.isOpen).map(
        (c) => `${c.sku}@${c.store}`,
      );
      expect(new Set(open).size).toBe(open.length);
    });

    it('a sale at the counter draws from the open coil (roadmap demo)', () => {
      const counter = DEMO_COILS.filter(
        (c) => c.sku === 'PC-HW-1.5-RED' && c.store === 'counter',
      ).map((c) => ({
        id: c.batchCode,
        remaining: c.remainingQty,
        isOpen: c.isOpen,
      }));
      expect(planCoilDraw(2500, counter)).toEqual([
        { coilId: 'C-2611-02', qty: 2500 },
      ]);
    });
  });

  describe('serials', () => {
    it('every serial-tracked item has at least one unit in stock', () => {
      const serialSkus = variants
        .filter((v) => v.product.tracksSerials)
        .map((v) => v.sku);
      const withUnit = new Set(DEMO_SERIALS.map((s) => s.sku));
      expect(serialSkus.filter((sku) => !withUnit.has(sku))).toEqual([]);
    });

    it('serial numbers are unique and only on serial-tracked items', () => {
      expect(new Set(DEMO_SERIALS.map((s) => s.serialNumber)).size).toBe(
        DEMO_SERIALS.length,
      );
      for (const s of DEMO_SERIALS)
        expect(bySku.get(s.sku)?.product.tracksSerials).toBe(true);
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

  it('every store referenced by stock, coils and serials exists', () => {
    const stores = new Set(DEMO_STORES.map((s) => s.key));
    for (const x of [...DEMO_OPENING_STOCK, ...DEMO_COILS, ...DEMO_SERIALS]) {
      expect(stores.has(x.store)).toBe(true);
    }
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

    it('every list price for every item stays above cost and at or below MRP', () => {
      const problems: string[] = [];
      for (const list of DEMO_PRICE_LISTS) {
        for (const v of variants) {
          const fixed = list.items.find((i) => i.sku === v.sku)?.pricePaise;
          const basis =
            list.basis === 'mrp'
              ? (v.mrpPaise ?? v.listPricePaise)
              : v.listPricePaise;
          const price = fixed ?? basis - applyBp(basis, list.discountBp);
          if (price <= v.costPaise)
            problems.push(`${list.name} ${v.sku}: below cost`);
          if (v.mrpPaise !== null && price > v.mrpPaise) {
            problems.push(`${list.name} ${v.sku}: above MRP`);
          }
        }
      }
      expect(problems).toEqual([]);
    });

    it('phone numbers are obviously fake and names say "Demo" or "Walk-in"', () => {
      for (const p of DEMO_PARTIES) {
        if (p.phone) expect(p.phone).toMatch(/^99999\d{5}$/);
        expect(p.name).toMatch(/^(Demo |Walk-in)/);
      }
    });

    it('walk-in customers get no credit; price lists named by parties exist', () => {
      expect(DEMO_PARTIES.find((p) => p.key === 'walkin')!.creditAllowed).toBe(
        false,
      );
      for (const p of DEMO_PARTIES.filter((x) => x.priceList)) {
        expect(DEMO_PRICE_LISTS.some((l) => l.name === p.priceList)).toBe(true);
      }
    });

    it('opening balances belong to parties with credit, within their limits', () => {
      for (const b of DEMO_OPENING_BALANCES) {
        const party = DEMO_PARTIES.find((p) => p.key === b.party)!;
        expect(party.creditAllowed).toBe(true);
        expect(Number.isSafeInteger(b.amountPaise)).toBe(true);
        if (b.amountPaise > 0 && party.creditLimitPaise !== null) {
          expect(b.amountPaise).toBeLessThanOrEqual(party.creditLimitPaise);
        }
      }
      const contractor = DEMO_OPENING_BALANCES.find(
        (b) => b.party === 'contractor',
      )!;
      expect(contractor.amountPaise).toBeGreaterThan(0);
    });
  });

  it('the shop matches the shops table and turns on the electrical preset modules', () => {
    expect(DEMO_SHOP.planCode).toBe('trial');
    expect(DEMO_SHOP.subscriptionStatus).toBe('trialing');
    expect(DEMO_SHOP.modBatchTracking).toBe(true);
    expect(DEMO_SHOP.modSerialTracking).toBe(true);
    expect(DEMO_SHOP.modExpiryTracking).toBe(false);
    expect(DEMO_SHOP.modPharmacyCompliance).toBe(false);
    // An unregistered shop issues cash memos and has no GSTIN.
    expect(DEMO_SHOP.gstType).toBe('unregistered');
    expect(DEMO_SHOP.gstin).toBeNull();
  });
});
