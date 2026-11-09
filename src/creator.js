// The character creator screen: live 3D preview + option buttons.
import * as THREE from 'three';
import { OPTIONS, LOCKED, BODY_SUGGEST, createCharacter, animateCharacter, randomCharacter } from './character.js';

const TABS = [
  { name: '🙂 Me', rows: [['age', 'I am a'], ['body', ''], ['skin', 'Skin'], ['eyes', 'Eyes']] },
  { name: '💇 Hair', rows: [['hair', 'Style'], ['hairColor', 'Color'], ['beard', 'Beard']] },
  { name: '👕 Clothes', rows: [['top', 'Top'], ['topColor', 'Top color'], ['bottom', 'Bottom'], ['bottomColor', 'Bottom color'], ['shoes', 'Shoes']] },
  { name: '✨ Extras', rows: [['hat', 'Hat'], ['face', 'Face'], ['back', 'Back'], ['extraColor', 'Extras color']] },
];

export function setupCreator({ onDone, isUnlocked }) {
  const $ = (id) => document.getElementById(id);
  const holder = $('cPreview');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  holder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fffaf0', '#d9c7e8', 2.2));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(2, 4, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#ffd6e8', 0.8);
  fill.position.set(-3, 2, -2);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), new THREE.MeshStandardMaterial({ color: '#f3e8f7', roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);

  let draft = null, model = null, tab = 0, spin = -0.4, dragging = null, raf = 0, t = 0, last = 0;

  function rebuild() {
    if (model) scene.remove(model.root);
    model = createCharacter(draft);
    model.root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    scene.add(model.root);
    const h = model.height;
    camera.position.set(0, h * 0.62, h * 2.3 + 0.6);
    camera.lookAt(0, h * 0.52, 0);
  }

  function resize() {
    const w = holder.clientWidth, h = holder.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now; t += dt;
    if (!dragging) spin += dt * 0.35;
    model.root.rotation.y = spin;
    animateCharacter(model, t, 0, false);
    renderer.render(scene, camera);
  }

  function renderTabs() {
    $('cTabs').innerHTML = '';
    TABS.forEach((tb, i) => {
      const b = document.createElement('button');
      b.className = i === tab ? 'tab on' : 'tab';
      b.textContent = tb.name;
      b.onclick = () => { tab = i; renderTabs(); renderRows(); };
      $('cTabs').appendChild(b);
    });
  }

  function renderRows() {
    const box = $('cOptions');
    box.innerHTML = '';
    for (const [k, label] of TABS[tab].rows) {
      const row = document.createElement('div');
      row.className = 'crow';
      if (label) {
        const l = document.createElement('div');
        l.className = 'clabel';
        l.textContent = label;
        row.appendChild(l);
      }
      const opts = document.createElement('div');
      opts.className = 'copts';
      for (const o of OPTIONS[k]) {
        const b = document.createElement('button');
        if (Array.isArray(o)) {
          const [val, name] = o;
          const locked = LOCKED[val] && !isUnlocked(val);
          b.className = 'chip' + (draft[k] === val ? ' on' : '') + (locked ? ' locked' : '');
          b.textContent = locked ? `🔒 ${name}` : name;
          if (locked) b.title = LOCKED[val];
          b.onclick = () => {
            if (locked) { flash(LOCKED[val]); return; }
            set(k, val);
          };
        } else {
          b.className = 'swatch' + (draft[k] === o ? ' on' : '');
          b.style.background = o;
          b.setAttribute('aria-label', o);
          b.onclick = () => set(k, o);
        }
        opts.appendChild(b);
      }
      row.appendChild(opts);
      box.appendChild(row);
    }
  }

  let flashTimer;
  function flash(msg) {
    $('cMsg').textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { $('cMsg').textContent = ''; }, 2500);
  }

  function set(k, v) {
    draft[k] = v;
    if (k === 'body') Object.assign(draft, BODY_SUGGEST[v]);
    rebuild();
    renderRows();
  }

  // drag to spin
  holder.addEventListener('pointerdown', (e) => { dragging = { x: e.clientX, s: spin }; holder.setPointerCapture(e.pointerId); });
  holder.addEventListener('pointermove', (e) => { if (dragging) spin = dragging.s + (e.clientX - dragging.x) * 0.012; });
  holder.addEventListener('pointerup', () => { dragging = null; });

  $('cRandom').onclick = () => {
    draft = randomCharacter({ name: draft.name });
    rebuild(); renderRows();
  };
  $('cName').addEventListener('input', (e) => { draft.name = e.target.value.slice(0, 16); });
  $('cDone').onclick = () => {
    cancelAnimationFrame(raf);
    draft.name = ($('cName').value || '').trim() || 'Me';
    onDone({ ...draft });
  };

  return {
    open(current) {
      draft = { ...current };
      $('cName').value = draft.name ?? '';
      $('cMsg').textContent = '';
      tab = 0;
      renderTabs(); renderRows();
      rebuild();
      requestAnimationFrame(() => { resize(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); });
    },
    resize,
  };
}
