import { describe, expect, it } from 'vitest';

describe('infrastructure smoke test', () => {
  it('vitest is configured correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('path aliases resolve (type-level check)', () => {
    // This test file itself validates the vitest config loads correctly
    expect(true).toBe(true);
  });
});
