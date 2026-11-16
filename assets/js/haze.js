// haze.js — fondo "Láser en el humo" (WebGL2): humo índigo que sube despacio y 6 haces de láser finos
// en abanico desde arriba al centro, que barren lento (14–22 s). Se ven sobre todo donde hay humo.
// Media resolución, 30 fps, en pausa cuando no se ve. Sin WebGL2 / movimiento reducido / ahorro de datos: fondo CSS.

const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uIntensity;
uniform float uAngle;   // inclinación del abanico hacia el puntero (positivo = a la derecha)
out vec4 outColor;

// TOPE DE LUMINANCIA: ningún píxel del fondo supera L = 0,040 (luminancia relativa WCAG).
// Así --ceniza (L ≈ 0,366) da ≥ 4,5:1 y el resto del texto, más. Se usa 0,0385 para dejar margen
// al redondeo a 8 bits y al escalado del canvas. Al saturarse, los haces quedan de un azul profundo.
const float LMAX = 0.0385;
const float KNEE = 0.022;   // desde acá la luz se comprime suave hacia el tope (sin mesetas planas)

float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s / 0.9375; }
// sRGB exacto (no gamma 2.2): el tope tiene que coincidir con lo que mide el control de contraste
vec3 toLin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float lum(vec3 lin){ return dot(lin, vec3(0.2126, 0.7152, 0.0722)); }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.y = 1.0 - uv.y;                       // y hacia abajo
  float aspect = uRes.x / uRes.y;

  // 1. humo: fbm que sube despacio, más denso abajo
  vec2 q = vec2(uv.x * aspect, 1.0 - uv.y);
  float n = fbm(vec3(q * 1.5 + vec2(0.0, -uTime * 0.025), uTime * 0.035));
  float dens = smoothstep(0.38, 0.92, n);

  // 2. láseres: 6 haces desde un punto apenas arriba del borde, en el centro; abanico de ±38°
  vec2 p = (uv - vec2(0.5, -0.03)) * vec2(aspect, 1.0);   // en altos de pantalla
  float r = length(p);
  float ang = atan(p.x, p.y);                              // 0 = hacia abajo, positivo = a la derecha
  float beams = 0.0, cores = 0.0;
  float I = uIntensity;
  for (int i = 0; i < 6; i++){
    float fi = float(i);
    float per = 14.0 + mod(fi * 5.0, 9.0);                 // 14 a 22 s, distinto en cada haz
    float sway = 0.1222 * sin(6.2832 * uTime / per + fi * 2.39);   // ±7°
    float b = mix(-0.6632, 0.6632, fi / 5.0) + sway + uAngle;
    float d = ang - b;
    float perp = abs(sin(d)) * r * uRes.y;                 // distancia al eje en px del canvas
    float front = step(0.0, cos(d));
    float core = exp(-perp * perp / 1.8);                  // núcleo de ~1,5 px
    float w = 7.0 + (14.0 + 30.0 * I) * r;                 // el halo se abre con la distancia y, en el show, más
    float halo = exp(-perp * perp / (w * w));
    // tramos: el humo corta cada haz a lo largo (partes densas y partes que se pierden)
    float tr = noise(vec3(r * 6.0 - uTime * 0.2, fi * 3.7, uTime * 0.05));
    float cut = 0.15 + 0.85 * smoothstep(0.3, 0.7, tr);
    cores += core * front * cut;
    beams += (0.55 * core + 0.5 * halo) * front * cut;
  }
  float fall = 1.0 / (1.0 + 1.6 * r * r);                  // se atenúan con la distancia a la fuente
  float vol = 0.3 + 0.7 * dens;                            // se ven sobre todo donde hay humo
  // curva empinada: las secciones tranquilas quedan lejos del tope y No Tempo (1) se despega
  float B = beams * fall * vol * I * I;

  // 3. color en lineal: negro frío + humo índigo (algo más claro arriba, donde está el rig) + haces
  vec3 negro = toLin(vec3(5.0, 6.0, 10.0) / 255.0);
  vec3 indigo = toLin(vec3(20.0, 26.0, 92.0) / 255.0);
  vec3 laser = toLin(vec3(62.0, 107.0, 255.0) / 255.0);
  vec3 hielo = toLin(vec3(168.0, 189.0, 255.0) / 255.0);
  float rig = 0.35 + 1.1 * exp(-uv.y * 3.5);
  // el humo también se ilumina con el show
  vec3 lin = negro + indigo * dens * rig * (0.12 + 0.26 * I) * min(1.0, I * 3.0);
  vec3 beamCol = mix(laser, hielo, clamp(0.35 * cores, 0.0, 0.5));   // centro un poco más claro
  lin += beamCol * B * 0.42;
  float vig = smoothstep(0.4, 1.05, length((uv - 0.5) * vec2(1.3, 1.1)));
  lin *= 1.0 - 0.35 * vig;

  // 4. grano de película animado (±3/255), antes del tope
  vec3 col = toSrgb(lin);
  float g = hash(vec3(gl_FragCoord.xy, floor(uTime * 24.0)));
  col += (g - 0.5) * (6.0 / 255.0);
  lin = toLin(clamp(col, 0.0, 1.0));

  // 5. tope de luminancia con rodilla suave
  float L = lum(lin);
  if (L > KNEE){
    float Lc = KNEE + (LMAX - KNEE) * (1.0 - exp(-(L - KNEE) / (LMAX - KNEE)));
    lin *= Lc / L;
  }
  outColor = vec4(toSrgb(lin), 1.0);
}`;

export function initHaze({ reduced }) {
  const canvas = document.querySelector('canvas.bg');
  const saveData = !!navigator.connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches;

  function fallback() {
    canvas?.remove();
    document.body.classList.add('haze-static');
  }
  if (!canvas || reduced || saveData) return fallback();
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return fallback();

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch {
    return fallback();
  }
  gl.useProgram(prog);
  // un solo triángulo que cubre la pantalla
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = Object.fromEntries(['uRes', 'uTime', 'uIntensity', 'uAngle'].map((n) => [n, gl.getUniformLocation(prog, n)]));

  // tamaño: CSS × min(dpr, 1.5) × 0.5, con tope 1280×720 manteniendo la proporción
  let lastW = 0;
  let lastH = 0;
  function resize() {
    // en móvil la barra de direcciones cambia sólo el alto: no se rehace el búfer por eso
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120) return;
    lastW = innerWidth; lastH = innerHeight;
    const r = Math.min(devicePixelRatio || 1, 1.5) * 0.5;
    let w = Math.max(1, Math.round(innerWidth * r));
    let h = Math.max(1, Math.round(innerHeight * r));
    const k = Math.min(1, 1280 / w, 720 / h);
    w = Math.round(w * k); h = Math.round(h * k);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  resize();
  addEventListener('resize', resize);

  /* ---------- estado ---------- */
  let intensity = 0;
  let target = 0;
  let tween = null; // {from, to, t0}
  let pointerX = 0.5;
  let pointerAngle = 0;
  const fine = matchMedia('(pointer: fine)').matches;
  if (fine) addEventListener('pointermove', (e) => { pointerX = e.clientX / innerWidth; }, { passive: true });
  const pause = { hidden: document.hidden, media: false, dialog: false };
  const mediaSrc = { set: false, film: false };
  let raf = 0;
  let lastFrame = 0;
  const t0 = performance.now();

  function setTarget(v) {
    if (v === target) return;
    target = v;
    tween = { from: intensity, to: v, start: performance.now() };
    wake();
  }

  function draw(now) {
    const time = (now - t0) / 1000;
    // el abanico se inclina un poco (±8°) hacia el puntero; el barrido de cada haz va en el shader
    if (fine) pointerAngle += (((pointerX - 0.5) * 2) * (8 * Math.PI / 180) - pointerAngle) * 0.04;
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uIntensity, intensity);
    gl.uniform1f(U.uAngle, pointerAngle);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const paused = () => pause.hidden || pause.media || pause.dialog || (intensity <= 0.001 && target <= 0.001);

  function frame(now) {
    raf = 0;
    if (dead) return;
    if (tween) {
      const k = Math.min(1, (now - tween.start) / 600);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      intensity = tween.from + (tween.to - tween.from) * e;
      if (k >= 1) tween = null;
    }
    if (now - lastFrame >= 1000 / 30 - 1) { lastFrame = now; draw(now); }
    if (paused()) { draw(now); return; } // último cuadro y a dormir
    raf = requestAnimationFrame(frame);
  }
  let dead = false; // contexto perdido: no se vuelve a dibujar
  function wake() { if (!raf && !dead) raf = requestAnimationFrame(frame); }

  // el humo arranca recién cuando termina la secuencia de carga del hero (las ventanas son la luz principal)
  let introOk = !!window.__zzIntro || !document.documentElement.classList.contains('js-motion');
  let wanted = 0;
  const go = () => { if (introOk) return; introOk = true; setTarget(wanted); };
  if (!introOk) { document.addEventListener('zz:intro', go, { once: true }); setTimeout(go, 4000); }

  // intensidad según la sección más cercana al centro de la pantalla
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      wanted = Number(en.target.dataset.haze) || 0;
      if (introOk) setTarget(wanted);
    }
  }, { rootMargin: '-50% 0px -50% 0px' });
  for (const el of document.querySelectorAll('[data-haze]')) io.observe(el);

  document.addEventListener('visibilitychange', () => { pause.hidden = document.hidden; if (!pause.hidden) wake(); });
  document.addEventListener('zz:media', (e) => {
    const { source, playing } = e.detail;
    if (source === 'dialog') pause.dialog = playing;
    else if (source in mediaSrc) { mediaSrc[source] = playing; pause.media = mediaSrc.set || mediaSrc.film; }
    if (!paused()) wake();
  });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); dead = true; cancelAnimationFrame(raf); raf = 0; fallback(); });

  // arrancar después del primer pintado
  const start = () => requestAnimationFrame(() => { draw(performance.now()); wake(); });
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
}
