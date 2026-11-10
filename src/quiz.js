// First-grade math with Ms. Lopez: adding and taking away within 10, counting,
// which number is bigger, and what comes next. Pictures help you count.
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const THINGS = [['🍎', 'apples'], ['⭐', 'stars'], ['🐞', 'ladybugs'], ['🎈', 'balloons'], ['🍪', 'cookies'], ['🐟', 'fish'], ['🌸', 'flowers'], ['🚗', 'cars'], ['🦆', 'ducks']];

function choicesFor(answer, max = 20) {
  const set = new Set([answer]);
  const tries = [answer + 1, answer - 1, answer + 2, answer - 2, answer + 3, answer - 3];
  for (const n of tries.sort(() => Math.random() - 0.5)) { if (set.size >= 3) break; if (n >= 0 && n <= max) set.add(n); }
  return [...set].sort(() => Math.random() - 0.5);
}

export function makeProblem(last) {
  let p;
  do {
    const [emoji, word] = pick(THINGS);
    const kind = pick(['add', 'add', 'sub', 'sub', 'count', 'bigger', 'next']);
    if (kind === 'add') {
      const a = rnd(1, 6), b = rnd(1, 10 - a);
      p = { text: `${a} + ${b} = ?`, say: `What is ${a} plus ${b}?`, pics: [[emoji, a], ['+'], [emoji, b]], answer: a + b };
    } else if (kind === 'sub') {
      const a = rnd(3, 10), b = rnd(1, a - 1);
      p = { text: `${a} − ${b} = ?`, say: `What is ${a} minus ${b}?`, pics: [[emoji, a - b], [emoji, b, true]], answer: a - b };
    } else if (kind === 'count') {
      const n = rnd(3, 10);
      p = { text: `How many ${word}?`, say: `How many ${word} do you see?`, pics: [[emoji, n]], answer: n };
    } else if (kind === 'bigger') {
      const a = rnd(1, 20); let b = rnd(1, 20); while (b === a) b = rnd(1, 20);
      p = { text: 'Which number is bigger?', say: `Which number is bigger, ${a} or ${b}?`, pics: [], answer: Math.max(a, b), choices: [a, b] };
    } else {
      const n = rnd(1, 19);
      p = { text: `What comes after ${n}?`, say: `What number comes after ${n}?`, pics: [], answer: n + 1 };
    }
  } while (last && p.text === last.text);
  p.choices ??= choicesFor(p.answer);
  return p;
}


// ---------- Reading ----------
const WORDS = [['🐱', 'cat'], ['🐶', 'dog'], ['☀️', 'sun'], ['🐷', 'pig'], ['🚌', 'bus'], ['🎩', 'hat'], ['🐟', 'fish'], ['🍎', 'apple'], ['🚗', 'car'], ['🐝', 'bee'],
  ['⭐', 'star'], ['🌳', 'tree'], ['🦆', 'duck'], ['🐸', 'frog'], ['🎈', 'balloon'], ['🍰', 'cake'], ['🌙', 'moon'], ['🐮', 'cow'], ['🥚', 'egg'], ['🐻', 'bear']];
const RHYMES = [['cat', 'hat', 'bat'], ['dog', 'log', 'frog'], ['sun', 'fun', 'run'], ['bee', 'tree', 'see'], ['cake', 'lake', 'snake'], ['moon', 'spoon', 'June'], ['bed', 'red', 'Ted'], ['car', 'star', 'jar'], ['fish', 'dish', 'wish'], ['pig', 'big', 'wig']];
const SIGHT = ['the', 'and', 'is', 'you', 'to', 'it', 'see', 'can', 'my', 'we', 'like', 'go', 'look', 'said', 'play', 'here'];
const others = (list, not, n = 2) => [...new Set(list)].filter((w) => !not.includes(w)).sort(() => Math.random() - 0.5).slice(0, n);
const mix = (a) => a.sort(() => Math.random() - 0.5);
function readingProblem() {
  const kind = pick(['match', 'match', 'letter', 'rhyme', 'sight']);
  if (kind === 'match') {
    const [e, w] = pick(WORDS);
    return { text: 'Which word goes with the picture?', say: 'Look at the picture. Which word matches it?', pics: [[e, 1]], answer: w, choices: mix([w, ...others(WORDS.map((x) => x[1]), [w])]) };
  }
  if (kind === 'letter') {
    const [e, w] = pick(WORDS), L = w[0].toUpperCase();
    return { text: `What letter does "${w}" start with?`, say: `What letter does the word ${w} start with?`, pics: [[e, 1]], answer: L, choices: mix([L, ...others('ABCDEFGHIJKLMNOPRSTW'.split(''), [L])]) };
  }
  if (kind === 'rhyme') {
    const set = pick(RHYMES), w = set[0], r = pick(set.slice(1));
    const wrong = others(RHYMES.filter((x) => x !== set).flat(), []);
    return { text: `Which word rhymes with "${w}"?`, say: `Which word rhymes with ${w}?`, pics: [], answer: r, choices: mix([r, ...wrong]) };
  }
  const w = pick(SIGHT);
  return { text: 'Find the word you hear!', say: `Can you find the word: ${w}?`, pics: [['🔊']], answer: w, choices: mix([w, ...others(SIGHT, [w])]) };
}

// ---------- Telling time ----------
function clockSVG(h, m) {
  const ha = ((h % 12) + m / 60) * 30 * Math.PI / 180, ma = m * 6 * Math.PI / 180;
  let nums = '';
  for (let i = 1; i <= 12; i++) { const a = i * 30 * Math.PI / 180; nums += `<text x="${(50 + Math.sin(a) * 36).toFixed(1)}" y="${(50 - Math.cos(a) * 36 + 4.5).toFixed(1)}" font-size="12" font-weight="800" text-anchor="middle" fill="#3a2a4a">${i}</text>`; }
  return `<svg viewBox="0 0 100 100" width="170" height="170"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#ef84ad" stroke-width="5"/>${nums}
    <line x1="50" y1="50" x2="${(50 + Math.sin(ha) * 22).toFixed(1)}" y2="${(50 - Math.cos(ha) * 22).toFixed(1)}" stroke="#3a2a4a" stroke-width="6" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="${(50 + Math.sin(ma) * 32).toFixed(1)}" y2="${(50 - Math.cos(ma) * 32).toFixed(1)}" stroke="#4f86c6" stroke-width="4" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="4" fill="#3a2a4a"/></svg>`;
}
const fmt = (h, m) => `${h}:${m ? '30' : '00'}`;
function timeProblem() {
  const h = rnd(1, 12), m = pick([0, 0, 30]);
  const set = new Set([fmt(h, m)]);
  while (set.size < 3) set.add(Math.random() < 0.5 ? fmt(rnd(1, 12), m) : fmt(h, m ? 0 : 30));
  return { text: 'What time is it?', say: m ? 'Look at the clock. The long hand points to the 6. What time is it?' : 'Look at the clock. What time does it say?', html: clockSVG(h, m), answer: fmt(h, m), choices: mix([...set]) };
}

// ---------- Shapes, colors and patterns ----------
const SHAPES = [['🔺', 'triangle'], ['🟦', 'square'], ['🔵', 'circle'], ['⭐', 'star'], ['💜', 'heart'], ['🔷', 'diamond']];
const SIDES = [['triangle', 3], ['square', 4], ['rectangle', 4], ['pentagon', 5], ['hexagon', 6]];
const COLORS = [['🍌', 'banana', 'yellow'], ['🍎', 'apple', 'red'], ['🐸', 'frog', 'green'], ['🥕', 'carrot', 'orange'], ['🍇', 'bunch of grapes', 'purple'], ['☁️', 'cloud', 'white'], ['🐷', 'pig', 'pink'], ['🫐', 'blueberry', 'blue']];
const DOTS = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠', '⭐', '💜', '🍎', '🐱'];
function shapesProblem() {
  const kind = pick(['shape', 'pattern', 'pattern', 'color', 'sides']);
  if (kind === 'shape') {
    const [e, n] = pick(SHAPES);
    return { text: `Which one is a ${n}?`, say: `Can you find the ${n}?`, pics: [], answer: e, choices: mix([e, ...others(SHAPES.map((x) => x[0]), [e])]) };
  }
  if (kind === 'color') {
    const [e, n, c] = pick(COLORS);
    return { text: `What color is a ${n}?`, say: `What color is a ${n}?`, pics: [[e, 1]], answer: c, choices: mix([c, ...others(COLORS.map((x) => x[2]), [c])]) };
  }
  if (kind === 'sides') {
    const [n, k] = pick(SIDES);
    return { text: `How many sides does a ${n} have?`, say: `How many sides does a ${n} have?`, pics: [], answer: k, choices: choicesFor(k, 8) };
  }
  const [a, b, c] = others(DOTS, [], 3), pat = pick([[a, b], [a, b, c], [a, a, b]]);
  const len = pat.length === 2 ? 5 : pat.length * 2 + 1;
  const seq = Array.from({ length: len }, (_, i) => pat[i % pat.length]), ans = pat[len % pat.length];
  const set = [...new Set([ans, ...pat, c])].slice(0, 3);
  return { text: 'What comes next?', say: 'Look at the pattern. What comes next?', html: `<span class="qgroup">${seq.join('')}<span class="qmark">❓</span></span>`, answer: ans, choices: mix(set) };
}

export const SUBJECTS = [
  { id: 'math', title: 'Math Time', emoji: '➕', make: (last) => makeProblem(last), star: 'math star' },
  { id: 'reading', title: 'Reading Time', emoji: '📖', make: readingProblem, star: 'reading star' },
  { id: 'time', title: 'Telling Time', emoji: '🕒', make: timeProblem, star: 'clock expert' },
  { id: 'shapes', title: 'Shapes & Patterns', emoji: '🔺', make: shapesProblem, star: 'shape star' },
];

const CHEERS = ['Great job!', "That's right!", 'You got it!', 'Super smart!', 'Wonderful!', 'Yes! Nice counting!'];
const TRY_AGAIN = ['Not quite. Try again!', 'Almost! Give it another try.', 'Hmm, count again!'];

// Wires up the quiz card in index.html. teacher(text, mood) makes Ms. Lopez speak.
export function setupQuiz({ $, teacher, chime, buzz, celebrate, onClose, onFinish }) {
  const ROUND = 5;
  let p = null, stars = 0, locked = false, subject = SUBJECTS[0];

  function drawStars() { $('qStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(ROUND - stars); }
  function show(problem) {
    p = problem;
    locked = false;
    $('qText').textContent = p.text;
    $('qPics').innerHTML = p.html ?? p.pics.map(([e, n, gone]) => (n === undefined ? `<span class="qplus">${e}</span>`
      : `<span class="qgroup${gone ? ' gone' : ''}">${e.repeat(n)}</span>`)).join('');
    $('qChoices').innerHTML = '';
    for (const c of p.choices) {
      const b = document.createElement('button');
      b.className = 'qbtn';
      b.textContent = c;
      b.onclick = () => answer(c, b);
      $('qChoices').appendChild(b);
    }
    $('qFeedback').textContent = '';
    teacher(p.say);
  }
  function answer(c, btn) {
    if (locked) return;
    if (c === p.answer) {
      locked = true;
      btn.classList.add('right');
      stars++;
      drawStars();
      const cheer = pick(CHEERS);
      $('qFeedback').textContent = `⭐ ${cheer}`;
      chime();
      teacher(cheer, 'happy');
      setTimeout(() => (stars >= ROUND ? finish() : next()), 1600);
    } else {
      btn.classList.add('wrong');
      btn.disabled = true;
      const msg = pick(TRY_AGAIN);
      $('qFeedback').textContent = `💪 ${msg}`;
      buzz();
      teacher(msg);
    }
  }
  function finish() {
    $('qText').textContent = `🎉 You got all ${ROUND} stars!`;
    $('qPics').innerHTML = '<span class="qgroup">🏆</span>';
    $('qChoices').innerHTML = '';
    const again = document.createElement('button');
    again.className = 'qbtn small2'; again.textContent = 'Keep practicing';
    again.onclick = () => begin(subject);
    const other = document.createElement('button');
    other.className = 'qbtn small2'; other.textContent = 'Something else';
    other.onclick = () => start();
    const done = document.createElement('button');
    done.className = 'qbtn small2'; done.textContent = 'All done';
    done.onclick = () => onClose();
    $('qChoices').append(again, other, done);
    $('qFeedback').textContent = `You are a ${subject.star}! ⭐`;
    teacher(`Amazing work, {name}! You are a ${subject.star}!`, 'happy');
    celebrate();
    onFinish?.(subject.id);
  }
  function next() { let q, n = 0; do q = subject.make(p); while (p && q.text === p.text && q.answer === p.answer && ++n < 10); show(q); }
  function begin(sub) { subject = sub; p = null; stars = 0; drawStars(); $('qTitle').textContent = `${sub.emoji} ${sub.title} with Ms. Lopez`; next(); }
  // first, pick what to learn
  function start() {
    p = null; locked = true;
    $('qTitle').textContent = '📚 Learning Time with Ms. Lopez';
    $('qStars').textContent = '';
    $('qText').textContent = 'What do you want to learn?';
    $('qPics').innerHTML = '';
    $('qFeedback').textContent = '';
    $('qChoices').innerHTML = '';
    for (const sub of SUBJECTS) {
      const b = document.createElement('button');
      b.className = 'qbtn small2'; b.textContent = `${sub.emoji} ${sub.title}`;
      b.onclick = () => begin(sub);
      $('qChoices').appendChild(b);
    }
    teacher('What do you want to learn today, {name}?');
  }
  $('qStop').onclick = () => onClose();
  return { start };
}
