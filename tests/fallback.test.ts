import { describe, it, expect } from 'vitest';
import { applyStaticFallback } from '../src/fallback';

describe('applyStaticFallback', () => {
  it('sets a radial gradient on the canvas element', () => {
    const canvas = document.createElement('canvas');
    applyStaticFallback(canvas);
    expect(canvas.style.background).toContain('radial-gradient');
  });

  it('leaves the element visible (no display:none)', () => {
    const canvas = document.createElement('canvas');
    applyStaticFallback(canvas);
    expect(canvas.style.display).not.toBe('none');
  });

  it('marks the canvas as the fallback via data attribute', () => {
    const canvas = document.createElement('canvas');
    applyStaticFallback(canvas);
    expect(canvas.dataset.fallback).toBe('true');
  });
});
