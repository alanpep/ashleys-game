// Little jobs and chores around PepCity. Each one pays a few coins 🪙 and can be done again.
// Some jobs just count things you do anyway (watering plants, feeding your pet), and some
// you start from the job board (deliveries and cleaning up the park), which puts a
// bouncing arrow where you need to go.
import * as THREE from 'three';

export const JOBS = [
  { id: 'water', emoji: '🪴', title: 'Water 3 plants', need: 3, pay: 3, how: 'Right-click any plant or flower bed' },
  { id: 'litter', emoji: '🗑️', title: 'Clean up the park', need: 6, pay: 5, how: 'Walk over the litter in Kenwood Park', start: true },
  { id: 'mail', emoji: '📬', title: 'Help Mel deliver a letter', need: 1, pay: 4, how: 'Get the letter from Mail Carrier Mel, then take it to the house', start: true },
  { id: 'pizza', emoji: '🍕', title: 'Deliver a pizza for Chef Tony', need: 1, pay: 5, how: 'Pick up the pizza at Tony’s, then take it to the house', start: true },
  { id: 'feedpet', emoji: '🍖', title: 'Feed your pet', need: 1, pay: 2, how: 'Right-click your pet and pick Feed', pet: true },
  { id: 'fetch', emoji: '🎾', title: 'Play fetch 3 times', need: 3, pay: 3, how: 'Right-click your pet and pick Play fetch', pet: true },
  { id: 'walk', emoji: '🦮', title: 'Walk your pet on a leash', need: 100, pay: 4, how: 'Put on the leash and go for a walk (100 steps)', pet: true },
  { id: 'lesson', emoji: '📚', title: 'Finish a lesson at school', need: 1, pay: 5, how: 'Sit at a classroom desk and earn 5 stars' },
  { id: 'game', emoji: '🏃', title: 'Play tag or hide & seek', need: 1, pay: 3, how: 'Find the kids at Kenwood Park or the school playground' },
  { id: 'tidy', emoji: '🧸', title: 'Tidy up 3 toys', need: 3, pay: 3, how: 'Pick up a toy and put it down on (or right by) a toy box' },
];
const LEVELS = [[0, 'New Helper'], [15, 'Good Helper'], [40, 'Super Helper'], [80, 'Helper Hero'], [150, 'PepCity Champion']];
const LITTER = ['🥤', '📰', '🍌', '🧃', '🍬', '🥫'];
const PARK = { x0: 25, x1: 50, z0: -45, z1: -20 };

function emojiSprite(e, size = 0.5) {
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d'); g.font = '72px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 48, 54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); s.scale.set(size, size, 1);
  return s;
}

export function setupJobs(ctx) {
  const { scene, $, player, store } = ctx;
  const st = store.get('jobs') ?? {};
  st.coins ??= 0; st.earned ??= 0; st.prog ??= {}; st.done ??= {};
  let task = null; // the job you're doing right now: { id, step, target:{x,z,label}, from }
  const save = () => store.set('jobs', st);

  // the bouncing arrow over where to go
  const arrow = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 16), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
  cone.rotation.x = Math.PI; arrow.add(cone);
  let arrowIcon = null;
  arrow.visible = false; scene.add(arrow);
  const setArrowIcon = (e) => { if (arrowIcon) arrow.remove(arrowIcon); arrowIcon = emojiSprite(e, 0.8); arrowIcon.position.y = 0.95; arrow.add(arrowIcon); };
  let litter = [];

  function level() { let n = LEVELS[0][1]; for (const [at, name] of LEVELS) if (st.earned >= at) n = name; return n; }
  function drawCoins() { $('coins').textContent = `🪙 ${st.coins}`; }
  drawCoins();

  function pay(job) {
    st.coins += job.pay; st.earned += job.pay; st.done[job.id] = (st.done[job.id] ?? 0) + 1; st.prog[job.id] = 0;
    const before = level();
    save(); drawCoins();
    ctx.celebrate();
    ctx.toast(`${job.emoji} Job done! +${job.pay} 🪙`, 3000);
    if (level() !== before) setTimeout(() => ctx.toast(`🏅 You're now a ${level()}!`, 3500), 3100);
  }
  function did(id, n = 1) {
    const job = JOBS.find((j) => j.id === id);
    if (!job || (job.start && task?.id !== id)) return;
    const was = st.prog[id] ?? 0;
    st.prog[id] = Math.min(job.need, was + n);
    if (Math.floor(st.prog[id]) !== Math.floor(was) && job.need > 1 && job.need <= 10 && st.prog[id] < job.need) ctx.toast(`${job.emoji} ${Math.floor(st.prog[id])} of ${job.need}`, 1200);
    if (st.prog[id] >= job.need) { if (task?.id === id) stop(); pay(job); } else if (id !== 'walk' || Math.floor(st.prog[id]) % 10 === 0) save();
  }

  function stop() {
    task = null; arrow.visible = false;
    for (const l of litter) scene.remove(l);
    litter = [];
    $('task').textContent = '';
  }
  function houseDoor() {
    const doors = ctx.houseDoors();
    return doors[Math.floor(Math.random() * doors.length)];
  }
  function begin(id) {
    stop();
    const job = JOBS.find((j) => j.id === id);
    task = { id, step: 0 };
    st.prog[id] = 0;
    if (id === 'litter') {
      for (let i = 0; i < job.need; i++) {
        let x, z, tries = 0;
        do { x = PARK.x0 + Math.random() * (PARK.x1 - PARK.x0); z = PARK.z0 + Math.random() * (PARK.z1 - PARK.z0); } while (ctx.blocked(x, z) && ++tries < 20);
        const s = emojiSprite(LITTER[i % LITTER.length], 0.45); s.position.set(x, 0.25, z); scene.add(s); litter.push(s);
      }
      $('task').textContent = '🗑️ Pick up the litter in Kenwood Park!';
      task.target = { x: (PARK.x0 + PARK.x1) / 2, z: (PARK.z0 + PARK.z1) / 2 }; setArrowIcon('🗑️');
    } else {
      const who = id === 'mail' ? 'Mail Carrier Mel' : 'Chef Tony';
      task.from = who; task.to = houseDoor();
      $('task').textContent = id === 'mail' ? '📬 Go see Mail Carrier Mel to get the letter' : '🍕 Go to Tony’s Pizza to get the pizza';
      setArrowIcon(id === 'mail' ? '📬' : '🍕');
    }
    arrow.visible = true;
    ctx.close();
    ctx.chime();
  }

  function drawBoard() {
    $('jbCoins').textContent = `🪙 ${st.coins} coins · 🏅 ${level()}`;
    const list = $('jbList');
    list.innerHTML = '';
    for (const j of JOBS) {
      const row = document.createElement('div'); row.className = 'jrow';
      const p = Math.floor(st.prog[j.id] ?? 0), doing = task?.id === j.id;
      const needPet = j.pet && !ctx.hasPet();
      row.innerHTML = `<div class="jemoji">${j.emoji}</div><div class="jtext"><b>${j.title}</b><small>${needPet ? 'Adopt a pet at the Pet Shop first!' : j.how}</small>
        ${j.need > 1 ? `<div class="pbar"><div style="width:${(p / j.need) * 100}%;background:#7cc46a"></div></div>` : ''}</div><div class="jpay">+${j.pay} 🪙${st.done[j.id] ? `<small>done ${st.done[j.id]}×</small>` : ''}</div>`;
      if (j.start) {
        const b = document.createElement('button');
        b.className = 'qbtn small2 jgo'; b.textContent = doing ? 'Stop' : 'Do it!';
        b.onclick = () => { if (doing) { stop(); drawBoard(); } else begin(j.id); };
        row.appendChild(b);
      }
      list.appendChild(row);
    }
  }
  $('jbClose').onclick = () => ctx.close();

  const tmp = new THREE.Vector3();
  return {
    did,
    coins: () => st.coins,
    spend(n) { if (st.coins < n) return false; st.coins -= n; save(); drawCoins(); return true; },
    openBoard: drawBoard,
    update(dt, t) {
      if (!task) return;
      const p = player.pos;
      if (task.id === 'litter') {
        for (const l of litter) l.position.y = 0.25 + Math.sin(t * 3 + l.position.x) * 0.05;
        for (let i = litter.length - 1; i >= 0; i--) {
          const l = litter[i];
          if (Math.hypot(l.position.x - p.x, l.position.z - p.z) < 1.1) {
            scene.remove(l); litter.splice(i, 1); ctx.pickupSound(); ctx.burst(l.position.clone()); did('litter');
          }
        }
        // the arrow points at the closest bit of litter
        let best = null, bd = Infinity;
        for (const l of litter) { const d = (l.position.x - p.x) ** 2 + (l.position.z - p.z) ** 2; if (d < bd) { bd = d; best = l; } }
        if (best) task.target = { x: best.position.x, z: best.position.z };
      } else if (task.step === 0) {
        const f = ctx.person(task.from);
        if (f) task.target = { x: f.root.position.x, z: f.root.position.z };
        if (f && Math.hypot(f.root.position.x - p.x, f.root.position.z - p.z) < 2.6) {
          task.step = 1;
          const where = /'s /i.test(task.to.title) ? task.to.title : `the ${task.to.title}`;
          ctx.talk(f, task.id === 'mail' ? `Thank you, {name}! Please take this letter to ${where}! 💌` : `Thank you, {name}! This pizza goes to ${where}! 🍕`);
          $('task').textContent = task.id === 'mail' ? `💌 Take the letter to ${where}` : `🍕 Take the pizza to ${where}`;
          setArrowIcon(task.id === 'mail' ? '💌' : '🏠');
          ctx.chime();
        }
      } else {
        task.target = task.to;
        if (Math.hypot(task.to.x - p.x, task.to.z - p.z) < 2.2) { ctx.knock(task.to); did(task.id); }
      }
      if (task?.target) {
        arrow.position.set(task.target.x, 3.2 + Math.sin(t * 4) * 0.25, task.target.z);
        // little arrow in front of you if the target is far away
        const d = tmp.set(task.target.x - p.x, 0, task.target.z - p.z).length();
        arrow.scale.setScalar(d > 25 ? Math.min(4, d / 25) : 1);
      }
    },
  };
}
