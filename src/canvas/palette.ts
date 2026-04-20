export interface Palette {
  low: [number, number, number];
  high: [number, number, number];
}

export function hexToRgbNormalized(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

export function readPaletteFromCssVars(): Palette {
  const styles = getComputedStyle(document.documentElement);
  const low = styles.getPropertyValue('--canvas-low').trim() || '#0f2026';
  const high = styles.getPropertyValue('--canvas-high').trim() || '#4d8a7a';
  return {
    low: hexToRgbNormalized(low),
    high: hexToRgbNormalized(high),
  };
}
