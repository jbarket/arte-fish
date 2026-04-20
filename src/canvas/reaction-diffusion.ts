import vertSrc from './shaders/vertex.vert.glsl?raw';
import simSrc from './shaders/sim.frag.glsl?raw';
import displaySrc from './shaders/display.frag.glsl?raw';
import {
  compileShader,
  linkProgram,
  createFullScreenQuad,
  createStateTexture,
  createFramebuffer,
} from './gl-helpers';
import { readPaletteFromCssVars } from './palette';

// Low-resolution simulation grid. We up-sample to the canvas size at display time.
const SIM_SIZE = 256;

// "Coral" regime — continuously spreading fronts that keep evolving on bounded grids.
// Mitosis (0.0367 / 0.0649) converges to a stable fixed point on 256² too quickly.
const PARAMS = {
  dA: 1.0,
  dB: 0.5,
  feed: 0.0545,
  kill: 0.062,
  dt: 1.0,
};

// Simulation steps per animation frame. Higher = faster evolution, more CPU.
const STEPS_PER_FRAME = 6;

export interface ReactionDiffusion {
  start: () => void;
  stop: () => void;
  dispose: () => void;
}

export function createReactionDiffusion(
  canvas: HTMLCanvasElement,
): ReactionDiffusion | null {
  const gl = canvas.getContext('webgl', {
    antialias: false,
    preserveDrawingBuffer: false,
    premultipliedAlpha: false,
  });
  if (!gl) return null;

  const halfFloatExt = gl.getExtension('OES_texture_half_float');
  const colorBufferHalfFloatExt = gl.getExtension('EXT_color_buffer_half_float');
  const halfFloatType: number | undefined =
    halfFloatExt && colorBufferHalfFloatExt ? halfFloatExt.HALF_FLOAT_OES : undefined;

  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const simFrag = compileShader(gl, gl.FRAGMENT_SHADER, simSrc);
  const displayFrag = compileShader(gl, gl.FRAGMENT_SHADER, displaySrc);

  const simProgram = linkProgram(gl, vert, simFrag);
  const displayProgram = linkProgram(gl, vert, displayFrag);

  const quad = createFullScreenQuad(gl);

  // Scatter a handful of small seed clusters so coral fronts propagate from multiple origins.
  const seedCenters: Array<[number, number]> = [];
  const seedCount = 7;
  for (let i = 0; i < seedCount; i++) {
    seedCenters.push([
      SIM_SIZE * (0.2 + Math.random() * 0.6),
      SIM_SIZE * (0.2 + Math.random() * 0.6),
    ]);
  }
  const seed = (x: number, y: number): [number, number] => {
    let inSeed = false;
    for (const [cx, cy] of seedCenters) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < 25 && Math.random() > 0.3) {
        inSeed = true;
        break;
      }
    }
    const noise = Math.random() < 0.002;
    return [1.0, inSeed || noise ? 1.0 : 0.0];
  };

  let texA = createStateTexture(gl, SIM_SIZE, SIM_SIZE, seed, halfFloatType);
  let texB = createStateTexture(gl, SIM_SIZE, SIM_SIZE, undefined, halfFloatType);
  let fbA = createFramebuffer(gl, texA);
  let fbB = createFramebuffer(gl, texB);

  const simLocs = {
    position: gl.getAttribLocation(simProgram, 'a_position'),
    state: gl.getUniformLocation(simProgram, 'u_state'),
    resolution: gl.getUniformLocation(simProgram, 'u_resolution'),
    dA: gl.getUniformLocation(simProgram, 'u_dA'),
    dB: gl.getUniformLocation(simProgram, 'u_dB'),
    feed: gl.getUniformLocation(simProgram, 'u_feed'),
    kill: gl.getUniformLocation(simProgram, 'u_kill'),
    dt: gl.getUniformLocation(simProgram, 'u_dt'),
  };

  const displayLocs = {
    position: gl.getAttribLocation(displayProgram, 'a_position'),
    state: gl.getUniformLocation(displayProgram, 'u_state'),
    colorLow: gl.getUniformLocation(displayProgram, 'u_colorLow'),
    colorHigh: gl.getUniformLocation(displayProgram, 'u_colorHigh'),
  };

  const palette = readPaletteFromCssVars();
  let rafId = 0;
  let running = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function bindQuad(location: number) {
    gl!.bindBuffer(gl!.ARRAY_BUFFER, quad);
    gl!.enableVertexAttribArray(location);
    gl!.vertexAttribPointer(location, 2, gl!.FLOAT, false, 0, 0);
  }

  function simStep() {
    gl!.useProgram(simProgram);
    gl!.viewport(0, 0, SIM_SIZE, SIM_SIZE);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbB);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, texA);
    gl!.uniform1i(simLocs.state, 0);
    gl!.uniform2f(simLocs.resolution, SIM_SIZE, SIM_SIZE);
    gl!.uniform1f(simLocs.dA, PARAMS.dA);
    gl!.uniform1f(simLocs.dB, PARAMS.dB);
    gl!.uniform1f(simLocs.feed, PARAMS.feed);
    gl!.uniform1f(simLocs.kill, PARAMS.kill);
    gl!.uniform1f(simLocs.dt, PARAMS.dt);
    bindQuad(simLocs.position);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

    [texA, texB] = [texB, texA];
    [fbA, fbB] = [fbB, fbA];
  }

  function displayStep() {
    gl!.useProgram(displayProgram);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, texA);
    gl!.uniform1i(displayLocs.state, 0);
    gl!.uniform3fv(displayLocs.colorLow, palette.low);
    gl!.uniform3fv(displayLocs.colorHigh, palette.high);
    bindQuad(displayLocs.position);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  function frame() {
    if (!running) return;
    for (let i = 0; i < STEPS_PER_FRAME; i++) simStep();
    displayStep();
    rafId = requestAnimationFrame(frame);
  }

  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  resize();

  return {
    start: () => {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    },
    stop: () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    },
    dispose: () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      gl!.deleteProgram(simProgram);
      gl!.deleteProgram(displayProgram);
      gl!.deleteShader(vert);
      gl!.deleteShader(simFrag);
      gl!.deleteShader(displayFrag);
      gl!.deleteBuffer(quad);
      gl!.deleteTexture(texA);
      gl!.deleteTexture(texB);
      gl!.deleteFramebuffer(fbA);
      gl!.deleteFramebuffer(fbB);
    },
  };
}