export function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

export function linkProgram(
  gl: WebGLRenderingContext,
  vert: WebGLShader,
  frag: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${log}`);
  }
  return program;
}

export function createFullScreenQuad(gl: WebGLRenderingContext): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Failed to create buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  return buffer;
}

// IEEE 754 float32 → float16 encoder. Subnormals flush to zero; fine for [0,1] state values.
function floatToHalf(val: number): number {
  const buf = new ArrayBuffer(4);
  new Float32Array(buf)[0] = val;
  const i = new Uint32Array(buf)[0];
  const s = (i >> 16) & 0x8000;
  const e = ((i >> 23) & 0xff) - (127 - 15);
  const m = i & 0x7fffff;
  if (e <= 0) return s;
  if (e >= 31) return s | 0x7c00 | (m ? 1 : 0);
  return s | (e << 10) | (m >> 13);
}

export function createStateTexture(
  gl: WebGLRenderingContext,
  width: number,
  height: number,
  seed?: (x: number, y: number) => [number, number],
  halfFloatType?: number,
): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) throw new Error('Failed to create texture');
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const filter = halfFloatType !== undefined ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const count = width * height * 4;

  if (halfFloatType !== undefined) {
    const data = new Uint16Array(count);
    const one = floatToHalf(1);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const [a, b] = seed ? seed(x, y) : [1, 0];
        const i = (y * width + x) * 4;
        data[i] = floatToHalf(a);
        data[i + 1] = floatToHalf(b);
        data[i + 2] = 0;
        data[i + 3] = one;
      }
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, halfFloatType, data);
  } else {
    const data = new Uint8Array(count);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const [a, b] = seed ? seed(x, y) : [1, 0];
        const i = (y * width + x) * 4;
        data[i] = Math.floor(a * 255);
        data[i + 1] = Math.floor(b * 255);
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }
  return tex;
}

export function createFramebuffer(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
): WebGLFramebuffer {
  const fb = gl.createFramebuffer();
  if (!fb) throw new Error('Failed to create framebuffer');
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('Framebuffer incomplete');
  }
  return fb;
}
