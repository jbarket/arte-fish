import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prefersReducedMotion } from '../src/motion';

describe('prefersReducedMotion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when the media query matches', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when the media query does not match', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns false when matchMedia is unavailable', () => {
    // @ts-expect-error deliberately remove
    window.matchMedia = undefined;
    expect(prefersReducedMotion()).toBe(false);
  });
});
