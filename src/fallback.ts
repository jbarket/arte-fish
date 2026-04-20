export function applyStaticFallback(canvas: HTMLCanvasElement): void {
  const low = getComputedStyle(document.documentElement)
    .getPropertyValue('--canvas-low').trim() || '#0f2026';
  const high = getComputedStyle(document.documentElement)
    .getPropertyValue('--canvas-high').trim() || '#4d8a7a';

  canvas.style.background = `radial-gradient(ellipse at 30% 40%, ${high} 0%, ${low} 65%)`;
  canvas.dataset.fallback = 'true';
}
