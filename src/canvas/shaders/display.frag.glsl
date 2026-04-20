precision highp float;
varying vec2 v_uv;
uniform sampler2D u_state;
uniform vec3 u_colorLow;
uniform vec3 u_colorHigh;
uniform float u_bgBlend;

void main() {
  float b = texture2D(u_state, v_uv).g;
  float t = smoothstep(0.10, 0.45, b);
  vec3 color = mix(u_colorLow, u_colorHigh, t);
  gl_FragColor = vec4(color, 1.0);
}
