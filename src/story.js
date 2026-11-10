// Storybooks at the library: short stories read out loud, one page at a time.
// {name} becomes the player's name.
export const STORIES = [
  { title: 'The Duck Who Wanted to Fly', pic: '🦆', pages: [
    'Down at the Frog Pond lived a little duck named Dot.',
    'Every day, Dot watched the birds zoom over the trees. "I want to fly like that!" she said.',
    'She flapped and flapped. She hopped off a lily pad. SPLASH! Right back into the water.',
    'The wise old owl hooted, "Keep trying, Dot. Big things take practice."',
    'So Dot practiced every morning. One sunny day, she flapped, and flapped... and she flew!',
    'Dot circled over PepCity, quacking happily. The end. 🦆',
  ] },
  { title: '{name} and the Treehouse Star', pic: '🌳', pages: [
    'One morning, {name} found a map tucked inside a library book.',
    'The map showed a path into Kenwood Woods, past the creek, all the way to the treehouse.',
    '{name} crossed the wooden bridge. A squirrel chattered, "Hurry! Hurry!"',
    'Up, up, up the ladder went {name}. And there, on the treehouse floor, something sparkled.',
    'It was a golden star! "Every brave explorer finds one," whispered the owl.',
    '{name} smiled all the way home. The end. ⭐',
  ] },
  { title: 'The Moon Needs a Nightlight', pic: '🌙', pages: [
    'The moon felt a little scared of the dark.',
    '"Everyone has a nightlight but me," sighed the moon.',
    'The fireflies heard. They blinked and they twinkled. "We can help!"',
    'All the fireflies in Kenwood Woods flew up, up, up into the sky.',
    'They became the stars! Now the moon is never alone at night.',
    'Goodnight, moon. Goodnight, stars. The end. ✨',
  ] },
  { title: 'Pizza Day at PepCity', pic: '🍕', pages: [
    'Chef Tony had a BIG job. Everyone in PepCity wanted pizza today!',
    'He tossed the dough up high. It spun like a frisbee!',
    'Red sauce, gooey cheese, and round pepperoni went on top.',
    'Into the hot oven it went. Sniff, sniff! It smelled so good.',
    'Chef Tony shared slices with the whole town. Sharing makes food taste even better!',
    'The end. 🍕',
  ] },
];

export function setupStory({ $, read, onClose, name }) {
  let story = null, page = 0;
  function show() {
    const text = story.pages[page].replaceAll('{name}', name());
    $('sTitle').textContent = `${story.pic} ${story.title.replaceAll('{name}', name())}`;
    $('sText').textContent = text;
    $('sPage').textContent = `Page ${page + 1} of ${story.pages.length}`;
    $('sNext').textContent = page < story.pages.length - 1 ? 'Next page ▶' : 'The end! Pick another 📚';
    $('sBack').style.visibility = page > 0 ? 'visible' : 'hidden';
    read(text);
  }
  function pickList() {
    story = null;
    $('sTitle').textContent = '📚 Pick a story!';
    $('sPage').textContent = '';
    $('sText').innerHTML = '';
    const list = document.createElement('div');
    list.className = 'slist';
    for (const s of STORIES) {
      const b = document.createElement('button');
      b.className = 'qbtn small2';
      b.textContent = `${s.pic} ${s.title.replaceAll('{name}', name())}`;
      b.onclick = () => { story = s; page = 0; show(); };
      list.appendChild(b);
    }
    $('sText').appendChild(list);
    $('sNext').textContent = 'Close the book';
    $('sBack').style.visibility = 'hidden';
  }
  $('sNext').onclick = () => {
    if (!story) { onClose(); return; }
    if (page < story.pages.length - 1) { page++; show(); } else pickList();
  };
  $('sBack').onclick = () => { if (story && page > 0) { page--; show(); } };
  $('sClose').onclick = () => onClose();
  return { open: pickList };
}
