import { describe, expect, it } from 'vitest';
import { SHARED_PACKAGE } from './index';

describe('shared package', () => {
  it('exports its name', () => {
    expect(SHARED_PACKAGE).toBe('@shop/shared');
  });
});
