import './styles/reset.css';
import './styles/tokens.css';
import './styles/typography.css';
import './styles/layout.css';

import { prefersReducedMotion } from './motion';
import { applyStaticFallback } from './fallback';
import { createReactionDiffusion } from './canvas/reaction-diffusion';

function init() {
  const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  if (prefersReducedMotion()) {
    applyStaticFallback(canvas);
    return;
  }

  const rd = createReactionDiffusion(canvas);
  if (!rd) {
    applyStaticFallback(canvas);
    return;
  }

  const hero = canvas.closest('.hero');
  if (!hero || typeof IntersectionObserver === 'undefined') {
    rd.start();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          rd.start();
        } else {
          rd.stop();
        }
      }
    },
    { threshold: 0.01 },
  );
  observer.observe(hero);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
