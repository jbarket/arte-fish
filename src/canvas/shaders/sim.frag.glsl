precision highp float;
varying vec2 v_uv;
uniform sampler2D u_state;
uniform vec2 u_resolution;
uniform float u_dA;
uniform float u_dB;
uniform float u_feed;
uniform float u_kill;
uniform float u_dt;

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec2 c = texture2D(u_state, v_uv).rg;

  vec2 sum = vec2(0.0);
  sum += texture2D(u_state, v_uv + vec2(-texel.x, 0.0)).rg * 0.2;
  sum += texture2D(u_state, v_uv + vec2( texel.x, 0.0)).rg * 0.2;
  sum += texture2D(u_state, v_uv + vec2(0.0, -texel.y)).rg * 0.2;
  sum += texture2D(u_state, v_uv + vec2(0.0,  texel.y)).rg * 0.2;
  sum += texture2D(u_state, v_uv + vec2(-texel.x, -texel.y)).rg * 0.05;
  sum += texture2D(u_state, v_uv + vec2( texel.x, -texel.y)).rg * 0.05;
  sum += texture2D(u_state, v_uv + vec2(-texel.x,  texel.y)).rg * 0.05;
  sum += texture2D(u_state, v_uv + vec2( texel.x,  texel.y)).rg * 0.05;
  vec2 lap = sum - c;

  float A = c.r;
  float B = c.g;
  float reaction = A * B * B;

  float dA = u_dA * lap.r - reaction + u_feed * (1.0 - A);
  float dB = u_dB * lap.g + reaction - (u_kill + u_feed) * B;

  vec2 next = clamp(c + vec2(dA, dB) * u_dt, 0.0, 1.0);
  gl_FragColor = vec4(next, 0.0, 1.0);
}
