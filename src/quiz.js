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

const CHEERS = ['Great job!', "That's right!", 'You got it!', 'Super smart!', 'Wonderful!', 'Yes! Nice counting!'];
const TRY_AGAIN = ['Not quite. Try again!', 'Almost! Give it another try.', 'Hmm, count again!'];

// Wires up the quiz card in index.html. teacher(text, mood) makes Ms. Lopez speak.
export function setupQuiz({ $, teacher, chime, buzz, celebrate, onClose }) {
  const ROUND = 5;
  let p = null, stars = 0, locked = false;

  function drawStars() { $('qStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(ROUND - stars); }
  function show(problem) {
    p = problem;
    locked = false;
    $('qText').textContent = p.text;
    $('qPics').innerHTML = p.pics.map(([e, n, gone]) => (n === undefined ? `<span class="qplus">${e}</span>`
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
      setTimeout(() => (stars >= ROUND ? finish() : show(makeProblem(p))), 1600);
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
    again.onclick = () => start();
    const done = document.createElement('button');
    done.className = 'qbtn small2'; done.textContent = 'All done';
    done.onclick = () => onClose();
    $('qChoices').append(again, done);
    $('qFeedback').textContent = 'You are a math star! ⭐';
    teacher('Amazing work, {name}! You are a math star!', 'happy');
    celebrate();
  }
  function start() { stars = 0; drawStars(); show(makeProblem()); }
  $('qStop').onclick = () => onClose();
  return { start };
}
