// Everything about how the game LOOKS: light, shadows, sky, soft contact
// shadows (ambient occlusion), hover outlines, sparkles and catalog pictures.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { P } from './palette.js';
import { tex } from './textures.js';

// Graphics levels. "low" is for laptops: no screen effects or shadows, slightly lower resolution,
// only a couple of room lights, and things far away aren't drawn.
const QUALITY = {
  pretty: { ao: true, post: true, shadows: true, shadow: 2048, ratio: () => Math.min(devicePixelRatio, 2), lights: 8, fog: [70, 230], view: 150 },
  fast: { ao: false, post: true, shadows: true, shadow: 1024, ratio: () => 1, lights: 4, fog: [55, 170], view: 100 },
  low: { ao: false, post: false, shadows: false, shadow: 512, ratio: () => 0.75, lights: 2, fog: [35, 105], view: 60 },
};
export const QUALITY_ORDER = ['pretty', 'fast', 'low'];
// the graphics level to start with: whatever was used last time, or a guess for this computer
export function startQuality() {
  let q = null;
  try { q = localStorage.getItem('quality'); } catch { /* no storage */ }
  return QUALITY[q] ? q : guessQuality();
}
// a first guess for computers we haven't seen before
function guessQuality() {
  let gpu = '';
  try { const gl = document.createElement('canvas').getContext('webgl2'), ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''; gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* unknown */ }
  const builtIn = /intel|iris|uhd|hd graphics|radeon\(tm\) graphics|vega|mali|adreno|apple m1|swiftshader|llvmpipe/i.test(gpu);
  const smallCpu = (navigator.hardwareConcurrency ?? 8) <= 4 || (navigator.deviceMemory ?? 8) <= 4;
  return builtIn && smallCpu ? 'low' : builtIn || smallCpu ? 'fast' : 'pretty';
}

export function setupLook({ renderer, scene, camera, center }) {
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Soft fill light that makes rounded shapes read nicely
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  scene.add(new THREE.HemisphereLight('#fffaf0', '#c9b79c', 1.5));

  // Afternoon sun from the back yard side, so sunlight spills in the back windows
  const sun = new THREE.DirectionalLight(P.warmLight, 2.4);
  sun.castShadow = true;
  sun.target.position.copy(center);
  sun.position.copy(center).add(new THREE.Vector3(14, 22, 18));
  const sc = sun.shadow.camera;
  sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90;
  const sunOffset = new THREE.Vector3(14, 22, 18);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  // ---------- sky ----------
  scene.background = new THREE.Color(P.skyHorizon);
  scene.fog = new THREE.Fog(P.skyHorizon, 70, 230);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(P.skyTop) }, bottom: { value: new THREE.Color(P.skyHorizon) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
void main() {
  gl_FragColor = vec4(mix(bottom, top, smoothstep(0.0, 0.55, vP.y)), 1.0);
  #include <colorspace_fragment>
}`,
  }));
  sky.renderOrder = -1;
  scene.add(sky);

  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 1, fog: false });
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Group();
    const a = (i / 18) * Math.PI * 2 + Math.sin(i * 7) * 0.3, r = 80 + (i % 3) * 25;
    c.position.set(center.x + Math.cos(a) * r, 26 + (i % 4) * 5, center.z + Math.sin(a) * r);
    for (let k = 0; k < 5; k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(3 + ((i + k) % 3) * 1.4, 16, 12), cloudMat);
      b.position.set((k - 2) * 3.2, Math.sin(k * 2.3) * 0.8, Math.cos(k * 1.7) * 1.5);
      b.scale.y = 0.6;
      c.add(b);
    }
    clouds.add(c);
  }
  scene.add(clouds);

  // ---------- post processing ----------
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.blendIntensity = 0.8;
  gtao.updateGtaoMaterial({ radius: 0.4, distanceExponent: 1.5, thickness: 1, scale: 1.1, samples: 16 });
  // Sprites (speech bubbles, floating emoji) must not cast these soft shadows,
  // or every bit of text gets a dark box around it.
  gtao.overrideVisibility = function () {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => { cache.set(o, o.visible); if (o.isPoints || o.isLine || o.isSprite) o.visible = false; });
  };
  composer.addPass(gtao);
  const outline = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
  outline.edgeStrength = 5;
  outline.edgeGlow = 0.6;
  outline.edgeThickness = 1.6;
  outline.visibleEdgeColor.set('#ffffff');
  outline.hiddenEdgeColor.set(P.blush);
  composer.addPass(outline);
  composer.addPass(new OutputPass());

  let quality = startQuality();
  let settings = QUALITY[quality];

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  }

  function setQuality(q) {
    quality = QUALITY[q] ? q : 'pretty';
    const Q = settings = QUALITY[quality];
    gtao.enabled = Q.ao;
    sun.castShadow = Q.shadows;
    sun.shadow.mapSize.set(Q.shadow, Q.shadow);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    renderer.setPixelRatio(Q.ratio());
    composer.setPixelRatio(Q.ratio());
    scene.fog.near = Q.fog[0]; scene.fog.far = Q.fog[1];
    camera.far = Q.fog[1] + 25;
    sky.scale.setScalar(Math.min(1, (camera.far - 5) / 180));
    resize();
    try { localStorage.setItem('quality', quality); } catch { /* no storage */ }
    api.onQuality?.(Q);
  }
  addEventListener('resize', resize);

  // ---------- outline: white when looking at something, pink while holding ----------
  function setOutline(obj, holding) {
    outline.selectedObjects = obj ? [obj] : [];
    outline.visibleEdgeColor.set(holding ? P.bubblegum : '#ffffff');
    outline.edgeStrength = holding ? 3 : 5;
  }

  // ---------- sparkles when you put something down ----------
  const sparks = [];
  const SPARK_COLORS = [P.butter, P.bubblegum, P.sky, P.mint, P.lavender, P.white];
  function burst(pos, count = 16) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({ map: tex.star(), color: SPARK_COLORS[i % SPARK_COLORS.length], transparent: true, depthWrite: false, fog: false });
      const s = new THREE.Sprite(m);
      s.position.copy(pos);
      const a = Math.random() * Math.PI * 2, sp = 0.8 + Math.random() * 1.2;
      s.userData = { v: new THREE.Vector3(Math.cos(a) * sp, 1.5 + Math.random() * 1.5, Math.sin(a) * sp), life: 0.7 + Math.random() * 0.3, max: 1, spin: (Math.random() - 0.5) * 8 };
      s.userData.max = s.userData.life;
      scene.add(s);
      sparks.push(s);
    }
  }

  const clock = { t: 0 };
  function update(dt, focus) {
    clock.t += dt;
    if (focus) { // keep the sharp shadows around wherever you are
      const fx = Math.round(focus.x), fz = Math.round(focus.z);
      if (fx !== sun.target.position.x || fz !== sun.target.position.z) {
        sun.target.position.set(fx, 0, fz);
        sun.position.copy(sun.target.position).add(sunOffset);
      }
    }
    sky.position.copy(camera.position);
    clouds.rotation.y += dt * 0.004;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i], u = s.userData;
      u.life -= dt;
      if (u.life <= 0) { scene.remove(s); s.material.dispose(); sparks.splice(i, 1); continue; }
      u.v.y -= 5 * dt;
      s.position.addScaledVector(u.v, dt);
      const k = u.life / u.max;
      s.scale.setScalar(0.06 + 0.1 * k);
      s.material.opacity = Math.min(1, k * 1.5);
      s.material.rotation += u.spin * dt;
    }
  }

  const api = {
    render: () => (settings.post ? composer.render() : renderer.render(scene, camera)),
    update, burst, setOutline, setQuality,
    get quality() { return quality; },
    get settings() { return settings; },
  };
  setQuality(quality);
  return api;
}

// ---------- little 3D pictures of each item for the catalog ----------
let thumb;
export function makeThumbnail(obj, isWall) {
  if (!thumb) {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(160, 160);
    r.toneMapping = THREE.NeutralToneMapping;
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight('#fffaf0', '#c9b79c', 2.6));
    const d = new THREE.DirectionalLight('#ffffff', 2.4);
    d.position.set(2, 5, 4);
    s.add(d);
    thumb = { r, s, cam: new THREE.PerspectiveCamera(28, 1, 0.01, 100) };
  }
  thumb.s.add(obj);
  obj.updateMatrixWorld(true);
  const sphere = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
  const dir = (isWall ? new THREE.Vector3(0.45, 0.2, 1) : new THREE.Vector3(0.9, 0.8, 1.25)).normalize();
  const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(14))) * 1.02;
  thumb.cam.position.copy(sphere.center).addScaledVector(dir, dist);
  thumb.cam.lookAt(sphere.center);
  thumb.r.render(thumb.s, thumb.cam);
  const url = thumb.r.domElement.toDataURL();
  thumb.s.remove(obj);
  return url;
}
