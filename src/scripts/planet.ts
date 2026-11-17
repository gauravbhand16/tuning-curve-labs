import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/*
 * Fixed full-viewport Earth behind the page.
 * Ported from the Ascend reference (authored for three r143) to three r187:
 *  - WebGLRenderer replaces WebGL1Renderer, outputColorSpace replaces outputEncoding
 *  - punctual light intensities x PI to match the legacy lighting look
 *  - torus composer omitted (no torus geometry exists, it would render an empty layer)
 * Planet, cloud, glow, mote, star and marker shaders are the reference shaders.
 */

const canvas = document.querySelector<HTMLCanvasElement>('[data-planet]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ASSET = 'https://api.getlayers.ai/storage/v1/object/public/public/assets/ascend-d9857ad1f2';

type Stop = { p: number; v: number };

const CONFIG = {
  rimColor: '#c1faff', rimPower: 2.4, nightLights: 10, terrainDepth: 0.33, terrainShade: 1.3,
  oceanGlint: 0.45, oceanDeep: 0.12, oceanFlow: 3, oceanFlowSpeed: 0.8, oceanFlowScale: 2.1,
  glowColor: '#3a6cff', glowIntensity: 2.5, planetRadius: 1.95, spin: 0.03, initRotation: 2.07, tilt: 0.37,
  cloud1Height: 1.005, cloud1Opacity: 0.6, cloud1Spin: 0.06,
  cloud2Height: 1.03, cloud2Opacity: 0.5, cloud2Spin: 0.14,
  cloud3Height: 1.075, cloud3Opacity: 0.5, cloud3Spin: 0.1,
  bgColor: '#040a1e', flameColor: '#3a6cff', flameColor2: '#c1faff', flameAmt: 0.15,
  atmoColor: '#9fc4ff', atmoCount: 320, atmoSize: 22, atmoSpeed: 0.8,
  starColor: '#cfe0ff', starCount: 1400, starSize: 1.6, starFlicker: 1,
  markerColor: '#ffd27a', markerCount: 60, markerSize: 16, markerSpeed: 0.5,
};
const LAYERS = { BLOOM_SCENE: 2, ENTIRE_SCENE: 3 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const hexToVec3 = (hex: string) => {
  const s = hex.replace('#', '');
  return new THREE.Vector3(parseInt(s.slice(0, 2), 16) / 255, parseInt(s.slice(2, 4), 16) / 255, parseInt(s.slice(4, 6), 16) / 255);
};
const sample = (stops: Stop[], p: number) => {
  let i = 0;
  while (i < stops.length - 1 && p > stops[i + 1].p) i += 1;
  const a = stops[i];
  const b = stops[Math.min(i + 1, stops.length - 1)];
  const span = b.p - a.p;
  const t = span === 0 ? 0 : (p - a.p) / span;
  return a.v + (b.v - a.v) * (t * t * (3 - 2 * t));
};
const tag = (object: THREE.Object3D, ...layers: number[]) => object.traverse((child) => {
  child.layers.disable(0);
  layers.forEach((layer) => child.layers.enable(layer));
});

const SNOISE = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const FinalPass = {
  uniforms: {
    iTime: { value: 0 }, tDiffuse: { value: null as THREE.Texture | null }, torusTexture: { value: null as THREE.Texture | null },
    bloomTexture: { value: null as THREE.Texture | null }, haloTexture: { value: null as THREE.Texture | null },
    uBg: { value: hexToVec3(CONFIG.bgColor) }, uFlameA: { value: hexToVec3(CONFIG.flameColor) },
    uFlameB: { value: hexToVec3(CONFIG.flameColor2) }, uFlameAmt: { value: CONFIG.flameAmt },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float iTime; uniform sampler2D tDiffuse; uniform sampler2D bloomTexture; uniform sampler2D torusTexture; uniform sampler2D haloTexture;
    uniform vec3 uBg; uniform vec3 uFlameA; uniform vec3 uFlameB; uniform float uFlameAmt;
    varying vec2 vUv;
    vec3 warp3d(vec3 pos, float t){ float curv=.8,a=1.9,b=0.7; pos*=2.;
      pos.x+=curv*sin(t+a*pos.y)+t*b; pos.y+=curv*cos(t+a*pos.x);
      pos.y+=curv*sin(t+a*pos.z)+t*b; pos.z+=curv*cos(t+a*pos.y);
      pos.z+=curv*sin(t+a*pos.x)+t*b; pos.x+=curv*cos(t+a*pos.z);
      return 0.5+0.5*cos(pos.xyz+vec3(1,2,4)); }
    void main(){
      vec2 uv = 2.*vUv - 1.;
      vec3 w = pow(warp3d(vec3(uv.x, sin(uv.y), uv.y), iTime*1.5), vec3(1.5));
      vec3 flame = 1.5*uFlameA*w.x; flame*=w.y; flame += uFlameB*w.z;
      flame *= smoothstep(0.25, 1., abs(uv.y));
      float md = smoothstep(-0.7, 1., -uv.y*uv.x); flame *= md*md;
      vec3 bg = uBg * (1.0 - 0.4 * length(uv));
      vec3 halo = texture2D(haloTexture, vUv).xyz;
      gl_FragColor = vec4(bg + flame*uFlameAmt + texture2D(bloomTexture, vUv).xyz + texture2D(torusTexture, vUv).xyz + texture2D(tDiffuse, vUv).xyz + halo, 1.);
    }`,
};

const PLANET_FRAGMENT = `#include <dithering_fragment>
  vec3 normalizedNormal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  float rim = 1.0 - max(dot(viewDir, normalizedNormal), 0.0);
  rim = pow(rim, rimPower); rim = pow(rim, 1.5); rim *= 0.7;
  vec3 currentColor = gl_FragColor.rgb;
  float blueDom = currentColor.b - max(currentColor.r, currentColor.g);
  float waterMask = clamp(smoothstep(-0.005, 0.03, blueDom), 0.0, 1.0);
  float shimmer = snoise(vec3(vCustomUv.x * noiseScale + time * speedX, vCustomUv.y * noiseScale - time * speedY, time * speedZ));
  gl_FragColor.rgb += waterMask * shimmer * 0.025;
  float fT = time * oceanFlowSpeed * 4.0;
  float fS = 4.0 * oceanFlowScale;
  float warp = snoise(vec3(vCustomUv.x * fS - fT * 0.5, vCustomUv.y * fS + fT * 0.4, fT * 0.5));
  float flow = snoise(vec3(vCustomUv.x * fS * 2.0 + fT * 0.6 + warp, vCustomUv.y * fS * 2.0 - fT * 0.5, fT * 0.7));
  flow = warp * 0.6 + flow * 0.4;
  gl_FragColor.rgb += waterMask * flow * 0.12 * oceanFlow;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.01, 0.06, 0.16), waterMask * oceanDeep);
  vec3 finalColor = mix(gl_FragColor.rgb, rimColor, rim);
  gl_FragColor = vec4(finalColor, 1.0);
  vec3 surfPos = -vViewPosition;
  float terrH = dot(texture2D(map, vCustomUv).rgb, vec3(0.299, 0.587, 0.114));
  vec3 sigX = dFdx(surfPos), sigY = dFdy(surfPos);
  vec3 vR1 = cross(sigY, normalizedNormal), vR2 = cross(normalizedNormal, sigX);
  float fDet = dot(sigX, vR1);
  vec3 vGrad = sign(fDet) * (dFdx(terrH) * vR1 + dFdy(terrH) * vR2);
  vec3 bumpedNormal = normalize(abs(fDet) * normalizedNormal - terrainDepth * vGrad);
  vec3 shadeNormal = mix(bumpedNormal, normalizedNormal, waterMask);
  vec3 cityLights = texture2D(nightBlendTexture, vCustomUv).rgb * gl_FragColor.rgb * nightLights;
  vec3 viewSunDir = normalize(vec3(-0.9, 0.18, 0.4));
  float ndl = dot(normalizedNormal, viewSunDir);
  float dayAmt = smoothstep(-0.05, 0.35, ndl);
  float relief = dot(shadeNormal, viewSunDir) - ndl;
  gl_FragColor.rgb *= clamp(1.0 + relief * terrainShade * dayAmt, 0.55, 1.6);
  float nightFactor  = smoothstep(0.18, -0.30, ndl);
  float lightsFactor = smoothstep(0.30, -0.35, ndl);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.08, nightFactor);
  gl_FragColor.rgb += cityLights * lightsFactor;
  vec3 halfDir = normalize(viewSunDir + viewDir);
  float ripple = snoise(vec3(vCustomUv * 240.0, time * 4.0));
  float ndh = max(dot(normalizedNormal, halfDir) + ripple * 0.02, 0.0);
  float glint = pow(ndh, 140.0);
  gl_FragColor.rgb += glint * waterMask * dayAmt * oceanGlint * vec3(1.0, 0.97, 0.88);`;

const CLOUD_FRAGMENT = `#include <dithering_fragment>
  gl_FragColor.rgb = vec3(1.0);
  float cloudNoise = snoise(vec3(vCloudUv.x * noiseScale + uTime * uSpeedX + uPhase, vCloudUv.y * noiseScale - uTime * uSpeedY + uPhase, uTime * uSpeedZ + uPhase));
  float cloudNdv = max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
  float cloudEdge = pow(1.0 - cloudNdv, 3.0);
  float cloudMod = mix(cloudNoise, 1.0, cloudEdge);
  float cloudNdl = dot(normalize(vNormal), normalize(vec3(-0.9, 0.18, 0.4)));
  float cloudDay = 1.0 - smoothstep(0.30, -0.30, cloudNdl) * 0.9;
  gl_FragColor.a *= cloudMod * uOpacity * cloudDay;`;

type Uniforms = Record<string, { value: unknown }>;

/** Page scroll: Lenis smooth scrolling, anchors routed through Lenis. */
const initScroll = () => {
  // Lenis is driven by the single shared frame loop below (no second rAF loop).
  const lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.5, autoRaf: false });
  document.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link || link.target === '_blank' || event.defaultPrevented || event.metaKey || event.ctrlKey) return;
    const url = new URL(link.href, window.location.href);
    if (url.pathname !== window.location.pathname || !url.hash || url.hash === '#') return;
    const target = document.querySelector<HTMLElement>(url.hash);
    if (!target) return;
    event.preventDefault();
    // html scroll-padding-top (header clearance) is already applied by Lenis, so only a small nudge is added.
    lenis.scrollTo(target, { offset: 30 });
    history.replaceState(null, '', url.hash);
  });
  return lenis;
};

type PlanetHandle = { frame: (now: number) => void; resetClock: () => void };

const initPlanet = (canvasEl: HTMLCanvasElement): PlanetHandle | null => {
  let renderer: THREE.WebGLRenderer;
  try {
    // Everything is drawn through render targets and a final full-screen pass, so MSAA on the
    // default framebuffer is wasted memory and bandwidth. Alpha, stencil and the extra buffers are unused.
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
  } catch {
    canvasEl.remove();
    return null;
  }
  canvasEl.addEventListener('webglcontextlost', (event) => event.preventDefault());
  const lite = window.innerWidth < 760;
  const maxPR = lite ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
  let PR = maxPR;
  renderer.setPixelRatio(PR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Size from the canvas CSS box (100vw x 100vh) so mobile address-bar changes do not reallocate render targets.
  const W = () => canvasEl.clientWidth || window.innerWidth;
  const H = () => canvasEl.clientHeight || window.innerHeight;
  // The bloom buffer is heavily blurred, so it renders at half resolution with no visible change.
  const BLOOM_SCALE = 0.5;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.1, 200);
  camera.position.set(0, 0, 8);
  camera.layers.enable(LAYERS.BLOOM_SCENE);
  camera.layers.enable(LAYERS.ENTIRE_SCENE);
  scene.add(camera);

  const ambient = new THREE.AmbientLight(0xffffff, 1.8 * Math.PI);
  const sun = new THREE.DirectionalLight(0xffffff, 0.8 * Math.PI);
  sun.position.set(0, 10, 2);
  tag(ambient, LAYERS.ENTIRE_SCENE);
  tag(sun, LAYERS.ENTIRE_SCENE);
  scene.add(ambient, sun);

  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  black.needsUpdate = true;
  FinalPass.uniforms.torusTexture.value = black;
  FinalPass.uniforms.haloTexture.value = black;

  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.setPixelRatio(PR * BLOOM_SCALE);
  bloomComposer.setSize(W(), H());
  bloomComposer.addPass(new RenderPass(scene, camera));
  bloomComposer.addPass(new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.5, 0.6, 0));
  bloomComposer.addPass(new ShaderPass(GammaCorrectionShader));
  const finalComposer = new EffectComposer(renderer);
  finalComposer.setPixelRatio(PR);
  finalComposer.setSize(W(), H());
  finalComposer.addPass(new RenderPass(scene, camera));
  const finalPass = new ShaderPass(FinalPass);
  finalComposer.addPass(finalPass);

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);
  const planetGroup = new THREE.Group();
  planetGroup.rotation.z = CONFIG.tilt;
  worldGroup.add(planetGroup);
  const cloudGroup = new THREE.Group();
  cloudGroup.rotation.z = CONFIG.tilt;
  cloudGroup.visible = false;
  worldGroup.add(cloudGroup);

  const STOPS_X: Stop[] = [{ p: 0, v: 0 }, { p: 0.32, v: -3.1 }, { p: 0.64, v: 3.2 }, { p: 1, v: 0 }];
  const STOPS_Y: Stop[] = [{ p: 0, v: -4.4 }, { p: 0.32, v: 0.55 }, { p: 0.64, v: 0.45 }, { p: 1, v: 0.15 }];
  const STOPS_S: Stop[] = [{ p: 0, v: 2.1 }, { p: 0.32, v: 1.0 }, { p: 0.64, v: 0.92 }, { p: 1, v: 1.12 }];
  worldGroup.position.set(STOPS_X[0].v, STOPS_Y[0].v, 0);
  worldGroup.scale.setScalar(STOPS_S[0].v);

  const uRes = new THREE.Vector2(W() * PR, H() * PR);

  // atmosphere halo
  const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uGlow: { value: hexToVec3(CONFIG.glowColor) }, uIntensity: { value: CONFIG.glowIntensity } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uGlow; uniform float uIntensity; varying vec2 vUv;
      void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2); gl_FragColor = vec4(uGlow * a * uIntensity, a); }`,
  }));
  glowMesh.scale.setScalar(CONFIG.planetRadius * 2.3);
  tag(glowMesh, LAYERS.ENTIRE_SCENE);
  worldGroup.add(glowMesh);

  // ambient motes
  const moteCount = lite ? Math.round(CONFIG.atmoCount / 2) : CONFIG.atmoCount;
  const moteGeometry = new THREE.BufferGeometry();
  const motePos = new Float32Array(moteCount * 3);
  const moteSize = new Float32Array(moteCount);
  const moteSeed = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i += 1) {
    motePos[i * 3] = Math.random() * 2 - 1;
    motePos[i * 3 + 1] = Math.random() * 2 - 1;
    motePos[i * 3 + 2] = Math.random() * 2 - 1;
    moteSize[i] = CONFIG.atmoSize * (0.4 + Math.random());
    moteSeed[i] = Math.random() * 100;
  }
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  moteGeometry.setAttribute('size', new THREE.BufferAttribute(moteSize, 1));
  moteGeometry.setAttribute('seed', new THREE.BufferAttribute(moteSeed, 1));
  const moteMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uRes: { value: uRes }, uColor: { value: hexToVec3(CONFIG.atmoColor) } },
    vertexShader: `attribute float size; attribute float seed; uniform float uTime; uniform vec2 uRes; varying float vA;
      vec3 warp(vec3 p, float t){ float c=0.9,a=1.9,b=0.02,s=0.05; p*=2.;
        p.x+=c*sin(s*t+a*p.y)+t*b; p.y+=c*cos(s*t+a*p.x); p.y+=c*sin(s*t+a*p.z)+t*b;
        p.z+=c*cos(s*t+a*p.y); p.z+=c*sin(s*t+a*p.x)+t*b; p.x+=c*cos(s*t+a*p.z);
        return cos(p+vec3(1,2,4)); }
      void main(){
        vec3 v = position*4.0 + warp(position, uTime)*1.2;
        vec4 mv = modelViewMatrix * vec4(v, 1.0);
        float r = length(v); float farF = 1.0 - smoothstep(5.0, 6.5, r); float nearF = smoothstep(0.0, 0.5, -mv.z);
        vA = farF * nearF;
        gl_PointSize = size * uRes.y / 900.0 / -mv.z; gl_PointSize = max(gl_PointSize, 1.0);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
      void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
        float tex = smoothstep(0.5, 0.0, l); gl_FragColor = vec4(uColor * tex, tex * vA * 0.55); }`,
  });
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  motes.frustumCulled = false;
  tag(motes, LAYERS.ENTIRE_SCENE);
  scene.add(motes);

  // starfield
  const starCount = lite ? 800 : CONFIG.starCount;
  const starPos = new Float32Array(starCount * 3);
  const starSeed = new Float32Array(starCount);
  const starBright = new Float32Array(starCount);
  for (let i = 0; i < starCount; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = 90 * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = 90 * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = 90 * Math.cos(phi);
    starSeed[i] = Math.random() * 100;
    starBright[i] = 0.35 + Math.random() * 0.65;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeometry.setAttribute('seed', new THREE.BufferAttribute(starSeed, 1));
  starGeometry.setAttribute('bright', new THREE.BufferAttribute(starBright, 1));
  const starMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: CONFIG.starSize }, uFlicker: { value: CONFIG.starFlicker }, uColor: { value: hexToVec3(CONFIG.starColor) }, uRes: { value: uRes } },
    vertexShader: `attribute float seed; attribute float bright; uniform float uTime; uniform float uSize; uniform float uFlicker; uniform vec2 uRes; varying float vTw;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float tw = 0.6 + 0.4 * sin(uTime * uFlicker + seed); vTw = bright * tw;
        gl_PointSize = max(uSize * uRes.y / 900.0 * (90.0 / max(-mv.z, 1.0)), 1.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; varying float vTw;
      void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard; float core = smoothstep(0.5, 0.0, l); gl_FragColor = vec4(uColor, core * vTw); }`,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.frustumCulled = false;
  tag(stars, LAYERS.BLOOM_SCENE, LAYERS.ENTIRE_SCENE);
  scene.add(stars);

  // loaders
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(draco);
  const load = (url: string) => new Promise<{ scene: THREE.Object3D }>((resolve, reject) => gltfLoader.load(url, resolve, undefined, reject));
  const firstMesh = (root: THREE.Object3D) => {
    let found: THREE.Mesh | null = null;
    root.traverse((child) => { if (!found && (child as THREE.Mesh).isMesh) found = child as THREE.Mesh; });
    return found as THREE.Mesh | null;
  };

  let planetTime = 0;
  let cloudTime = 0;
  let markerTime = 0;
  let starTime = 0;
  let entryStart: number | null = null;
  let planetUniforms: Uniforms | null = null;
  let markerMaterial: THREE.ShaderMaterial | null = null;
  const cloudMeshes: { mesh: THREE.Mesh; spin: number; uniforms: Uniforms }[] = [];

  // cloud shells
  new THREE.TextureLoader().load(`${ASSET}/planet-clouds.png`, (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);
    texture.colorSpace = THREE.SRGBColorSpace;
    const layers = [
      { h: CONFIG.cloud1Height, o: CONFIG.cloud1Opacity, s: CONFIG.cloud1Spin, ry: 0.0, phase: 0.0 },
      { h: CONFIG.cloud2Height, o: CONFIG.cloud2Opacity, s: CONFIG.cloud2Spin, ry: 2.2, phase: 13.0 },
      { h: CONFIG.cloud3Height, o: CONFIG.cloud3Opacity, s: CONFIG.cloud3Spin, ry: 4.3, phase: 27.0 },
    ];
    layers.forEach((layer) => {
      const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false });
      const uniforms: Uniforms = {
        uTime: { value: 0 }, noiseScale: { value: 20 }, uSpeedX: { value: 1 }, uSpeedY: { value: 2 }, uSpeedZ: { value: 2 },
        uOpacity: { value: layer.o }, uPhase: { value: layer.phase },
      };
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = `varying vec2 vCloudUv;\n${shader.vertexShader.replace('void main() {', 'void main() {\n vCloudUv = uv;')}`;
        shader.fragmentShader = `varying vec2 vCloudUv; uniform float uTime; uniform float noiseScale; uniform float uSpeedX; uniform float uSpeedY; uniform float uSpeedZ; uniform float uOpacity; uniform float uPhase;\n${SNOISE}\n${shader.fragmentShader.replace('#include <dithering_fragment>', CLOUD_FRAGMENT)}`;
      };
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(CONFIG.planetRadius * layer.h, lite ? 40 : 64, lite ? 40 : 64), material);
      mesh.rotation.y = layer.ry;
      mesh.renderOrder = 2;
      tag(mesh, LAYERS.ENTIRE_SCENE);
      cloudGroup.add(mesh);
      cloudMeshes.push({ mesh, spin: layer.s, uniforms });
    });
  });

  // land markers (radar pings), sampled from land pixels only
  const addMarkers = (mesh: THREE.Mesh) => {
    const material = mesh.material as THREE.MeshStandardMaterial;
    const image = material.map?.image as CanvasImageSource & { width: number; height: number };
    if (!image) return;
    const width = image.width;
    const height = image.height;
    const surface = document.createElement('canvas');
    surface.width = width;
    surface.height = height;
    const context = surface.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, width, height).data;
    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const index = geometry.index;
    const triangles = index ? index.count / 3 : position.count / 3;
    const vertex = (t: number, corner: number) => (index ? index.getX(t * 3 + corner) : t * 3 + corner);
    const cumulative = new Float32Array(triangles);
    let total = 0;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let t = 0; t < triangles; t += 1) {
      a.fromBufferAttribute(position, vertex(t, 0));
      b.fromBufferAttribute(position, vertex(t, 1));
      c.fromBufferAttribute(position, vertex(t, 2));
      total += b.clone().sub(a).cross(c.clone().sub(a)).length() * 0.5;
      cumulative[t] = total;
    }
    const points: number[] = [];
    const seeds: number[] = [];
    let tries = 0;
    while (points.length / 3 < CONFIG.markerCount && tries < CONFIG.markerCount * 400) {
      tries += 1;
      const r = Math.random() * total;
      let lo = 0;
      let hi = triangles - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cumulative[mid] < r) lo = mid + 1; else hi = mid;
      }
      const i0 = vertex(lo, 0);
      const i1 = vertex(lo, 1);
      const i2 = vertex(lo, 2);
      let u = Math.random();
      let v = Math.random();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const w = 1 - u - v;
      const uu = uv.getX(i0) * w + uv.getX(i1) * u + uv.getX(i2) * v;
      const vv = uv.getY(i0) * w + uv.getY(i1) * u + uv.getY(i2) * v;
      const px = Math.min(width - 1, Math.max(0, Math.floor((((uu % 1) + 1) % 1) * width)));
      const py = Math.min(height - 1, Math.max(0, Math.floor((((vv % 1) + 1) % 1) * height)));
      const k = (py * width + px) * 4;
      if (pixels[k + 2] > pixels[k] + 6 && pixels[k + 2] > pixels[k + 1] + 6) continue;
      a.fromBufferAttribute(position, i0);
      b.fromBufferAttribute(position, i1);
      c.fromBufferAttribute(position, i2);
      const p = a.multiplyScalar(w).add(b.multiplyScalar(u)).add(c.multiplyScalar(v)).multiplyScalar(1.012);
      points.push(p.x, p.y, p.z);
      seeds.push(Math.random());
    }
    const markerGeometry = new THREE.BufferGeometry();
    markerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    markerGeometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1));
    markerMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uColor: { value: hexToVec3(CONFIG.markerColor) }, uSize: { value: CONFIG.markerSize }, uSpeed: { value: CONFIG.markerSpeed }, uRes: { value: uRes } },
      vertexShader: `attribute float seed; uniform float uSize; uniform vec2 uRes; varying float vSeed; varying float vFade;
        void main(){ vSeed = seed; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 vn = normalize(normalMatrix * normalize(position)); vec3 vd = normalize(-mv.xyz);
          vFade = smoothstep(0.15, 0.5, dot(vn, vd));
          gl_PointSize = max(uSize * uRes.y / 900.0 * (7.0 / max(-mv.z, 1.0)), 2.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uTime; uniform float uSpeed; varying float vSeed; varying float vFade;
        void main(){ if (vFade <= 0.001) discard; vec2 p = gl_PointCoord - 0.5; float d = length(p) * 2.0; if (d > 1.0) discard;
          float core = smoothstep(0.30, 0.0, d) * 1.2; float ph = fract(uTime * uSpeed + vSeed);
          float ring = smoothstep(0.07, 0.0, abs(d - ph)) * (1.0 - ph);
          gl_FragColor = vec4(uColor, clamp(core + ring, 0.0, 1.0) * vFade); }`,
    });
    const markers = new THREE.Points(markerGeometry, markerMaterial);
    markers.frustumCulled = false;
    tag(markers, LAYERS.BLOOM_SCENE, LAYERS.ENTIRE_SCENE);
    mesh.add(markers);
  };

  // planet
  (async () => {
    try {
      // The remote assets can fail transiently, so each load is retried once. The night-lights map is
      // optional (a black map is used if it never arrives); the planet itself is required.
      const loadWithRetry = async (url: string) => {
        try { return await load(url); } catch { await new Promise((resolve) => setTimeout(resolve, 1200)); return load(url); }
      };
      let nightTexture: THREE.Texture | null = null;

      loadWithRetry(`${ASSET}/planet-lights.glb`)
        .then((lights) => {
          nightTexture = (firstMesh(lights.scene)?.material as THREE.MeshStandardMaterial | undefined)?.map ?? null;
      
          if (planetUniforms && nightTexture) {
            planetUniforms.nightBlendTexture.value = nightTexture;
          }
        })
        .catch(() => {
          // Optional: continue without night lights.
        });
      
      const planet = await loadWithRetry(`${ASSET}/planet.glb`);
      const mesh = firstMesh(planet.scene);
      if (!mesh) return;
      mesh.geometry.computeBoundingSphere();
      mesh.position.set(0, 0, 0);
      mesh.scale.setScalar(CONFIG.planetRadius / (mesh.geometry.boundingSphere?.radius ?? 1));
      const material = (mesh.material as THREE.MeshStandardMaterial).clone();
      material.metalness = 0;
      material.roughness = 1;
      material.envMapIntensity = 0;
      mesh.material = material;
      const uniforms: Uniforms = {
        time: { value: 0 }, noiseScale: { value: 30 }, speedX: { value: 1.5 }, speedY: { value: 2.0 }, speedZ: { value: 2.5 },
        rimColor: { value: hexToVec3(CONFIG.rimColor) }, rimPower: { value: CONFIG.rimPower },
        nightBlendTexture: { value: nightTexture ?? black }, nightLights: { value: CONFIG.nightLights },
        terrainDepth: { value: CONFIG.terrainDepth }, terrainShade: { value: CONFIG.terrainShade },
        oceanGlint: { value: CONFIG.oceanGlint }, oceanDeep: { value: CONFIG.oceanDeep }, oceanFlow: { value: CONFIG.oceanFlow },
        oceanFlowSpeed: { value: CONFIG.oceanFlowSpeed }, oceanFlowScale: { value: CONFIG.oceanFlowScale },
      };
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = `varying vec2 vCustomUv;\n${shader.vertexShader.replace('void main() {', 'void main() {\n vCustomUv = uv;')}`;
        shader.fragmentShader = `varying vec2 vCustomUv; uniform float time; uniform float noiseScale; uniform float speedX; uniform float speedY; uniform float speedZ; uniform vec3 rimColor; uniform float rimPower; uniform sampler2D nightBlendTexture; uniform float nightLights; uniform float terrainDepth; uniform float terrainShade; uniform float oceanGlint; uniform float oceanDeep; uniform float oceanFlow; uniform float oceanFlowSpeed; uniform float oceanFlowScale;\n${SNOISE}\n${shader.fragmentShader.replace('#include <dithering_fragment>', PLANET_FRAGMENT)}`;
      };
      planetUniforms = uniforms;
      tag(mesh, LAYERS.ENTIRE_SCENE);
      planetGroup.add(mesh);
      try { addMarkers(mesh); } catch { /* markers are decorative */ }
      cloudGroup.visible = true;
      entryStart = performance.now();
    } catch {
      /* Network or decoder failure: the starfield and background still render. */
    }
  })();

  let curP = 0;
  let curX = STOPS_X[0].v;
  let curY = STOPS_Y[0].v;
  let curS = STOPS_S[0].v;
  let spinPhase = 0;
  let last: number | null = null;
  const side = () => clamp(window.innerWidth / 1200, 0.5, 1);

  // Document height is observed instead of being read (and forcing layout) on every frame.
  let scrollLimit = 1;
  const updateScrollLimit = () => { scrollLimit = document.documentElement.scrollHeight - window.innerHeight; };
  updateScrollLimit();
  new ResizeObserver(updateScrollLimit).observe(document.body);

  const resizeAll = () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H(), false);
    bloomComposer.setPixelRatio(PR * BLOOM_SCALE);
    bloomComposer.setSize(W(), H());
    finalComposer.setPixelRatio(PR);
    finalComposer.setSize(W(), H());
    uRes.set(W() * PR, H() * PR);
  };

  // Safety net for weak GPUs only: if frames stay slow, step the pixel ratio down (never below 1).
  let sampleMs = 0;
  let sampleFrames = 0;
  let settleUntil = performance.now() + 3000;
  const govern = (now: number, rawMs: number) => {
    if (now < settleUntil || rawMs <= 0 || rawMs > 250) return;
    sampleMs += rawMs;
    sampleFrames += 1;
    if (sampleFrames < 90) return;
    const average = sampleMs / sampleFrames;
    sampleMs = 0;
    sampleFrames = 0;
    if (average > 30 && PR > 1) {
      PR = Math.max(1, PR - 0.25);
      renderer.setPixelRatio(PR);
      resizeAll();
      settleUntil = now + 2000;
    }
  };

  const frame = (now: number) => {
    const rawMs = last === null ? 0 : now - last;
    const dt = Math.min(rawMs / 1000, 0.05);
    last = now;
    govern(now, rawMs);
    planetTime += dt / 12;
    cloudTime += dt / 20;
    starTime += dt;
    markerTime += dt;
    const target = scrollLimit > 0 ? clamp(window.scrollY / scrollLimit, 0, 1) : 0;
    curP += (target - curP) * Math.min(1, dt * 4.5);
    const k = Math.min(1, dt * 3.2);
    curX += (sample(STOPS_X, curP) * side() - curX) * k;
    curY += (sample(STOPS_Y, curP) - curY) * k;
    curS += (sample(STOPS_S, curP) - curS) * k;
    let entryY = -6.5;
    if (entryStart !== null) {
      const t = clamp((now - entryStart) / 1000 / 1.9, 0, 1);
      entryY = -6.5 * Math.pow(1 - t, 3);
    }
    worldGroup.position.set(curX, curY + entryY, 0);
    worldGroup.scale.setScalar(curS);
    spinPhase += dt * CONFIG.spin;
    planetGroup.rotation.y = CONFIG.initRotation + spinPhase + curP * Math.PI * 1.6;
    if (planetUniforms) planetUniforms.time.value = planetTime;
    cloudMeshes.forEach((cloud) => { cloud.mesh.rotation.y += dt * cloud.spin; cloud.uniforms.uTime.value = cloudTime; });
    starMaterial.uniforms.uTime.value = starTime;
    if (markerMaterial) markerMaterial.uniforms.uTime.value = markerTime;
    moteMaterial.uniforms.uTime.value = (now / 1000) * CONFIG.atmoSpeed * 8;
    motes.position.copy(camera.position);
    glowMesh.quaternion.copy(camera.quaternion);
    finalPass.uniforms.iTime.value = now / 1000;
    // Point sizes are derived from uRes, so the half-resolution bloom pass gets half-resolution values.
    uRes.set(W() * PR * BLOOM_SCALE, H() * PR * BLOOM_SCALE);
    camera.layers.set(LAYERS.BLOOM_SCENE);
    bloomComposer.render();
    uRes.set(W() * PR, H() * PR);
    finalPass.uniforms.bloomTexture.value = bloomComposer.readBuffer.texture;
    camera.layers.set(LAYERS.ENTIRE_SCENE);
    finalComposer.render();
  };

  // Resize only when the canvas CSS box changes (not on every mobile address-bar twitch), once per frame.
  let resizeQueued = false;
  new ResizeObserver(() => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; resizeAll(); updateScrollLimit(); });
  }).observe(canvasEl);
  resizeAll();

  return {
    frame,
    resetClock: () => {
      last = null;
      sampleMs = 0;
      sampleFrames = 0;
      settleUntil = performance.now() + 1500;
    },
  };
};

if (!canvas || reduceMotion) {
  canvas?.remove();
} else {
  // One shared animation loop for Lenis and the globe. It is cancelled while the tab is hidden and
  // restarted exactly once when the tab returns, so loops can never stack up.
  const lenis = initScroll();
  const planet = initPlanet(canvas);
  let rafId = 0;
  const loop = (now: number) => {
    rafId = requestAnimationFrame(loop);
    lenis.raf(now);
    planet?.frame(now);
  };
  const start = () => {
    if (rafId) return;
    planet?.resetClock();
    rafId = requestAnimationFrame(loop);
  };
  const stop = () => {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  if (!document.hidden) start();
}
