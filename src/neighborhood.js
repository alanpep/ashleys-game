// =====================================================================
//  THE NEIGHBORHOOD - everything outside the home.
//  Same format as src/house.js (see the notes at the top of that file).
//
//  Map (x goes right, z goes down; the street runs left-right):
//
//            Lessenger Elementary + school playground (z -47..-36)
//        Yellow House   Ice Cream   Toy Shop      Sunny Park (playground, fountain, pond)
//   z=-18 ------------------------------------------------------------------------------
//                          K E N W O O D   A V E
//   z=-8  ------------------------------------------------------------------------------
//        Blue House        HOME (x 0..17) + Garage  Dream House (empty - decorate it!)
//                          back yard
//
//  Doors: every 'door' opening gets a real door. Add double: true for two doors,
//  slide: true for sliding glass doors (auto: true opens them when someone walks up),
//  glass: true for a window in the door, doorColor for the color, open: true to start open.
//  kind: 'garage' makes a roll-up garage door.
// =====================================================================
import { P } from './palette.js';

const walkway = (x, z1, z2) => ({ x: x - 0.4, z: Math.min(z1, z2), w: 0.8, d: Math.abs(z2 - z1) });

export const BUILDINGS = [
  // ---------------- Dream House: empty, for decorating ----------------
  {
    id: 'dream', title: 'Dream House', wallHeight: 2.7, exterior: '#cfe6d4', roofColor: '#8b7f9e', gableColor: '#fbfaf7',
    rooms: [
      { name: 'Dream Living Room', x: 25, z: 0, w: 7, d: 5, wall: P.white, floor: '#d9c3a0', recessed: true },
      { name: 'Dream Kitchen',     x: 32, z: 0, w: 7, d: 5, wall: P.white, floor: '#e8e2d8', floorStyle: 'tile' },
      { name: 'Dream Bedroom',     x: 25, z: 5, w: 5, d: 4, wall: P.white, floor: '#e8d6bd', floorStyle: 'carpet' },
      { name: 'Dream Bathroom',    x: 30, z: 5, w: 3, d: 4, wall: P.white, floor: '#f1eee8', floorStyle: 'tile' },
      { name: 'Dream Kids Room',   x: 33, z: 5, w: 6, d: 4, wall: P.white, floor: '#e8d6bd', floorStyle: 'carpet', fan: true },
    ],
    openings: [
      { x: 28.5, z: 0, width: 1.0 },
      { x: 32, z: 2.5, width: 2.4, kind: 'open' },
      { x: 27, z: 5, width: 0.9 },
      { x: 31.5, z: 5, width: 0.8 },
      { x: 35, z: 5, width: 0.9 },
      { x: 26.5, z: 0, width: 1.2, kind: 'window', box: true, shutters: P.bubblegum },
      { x: 30.5, z: 0, width: 1.4, kind: 'window', box: true, shutters: P.bubblegum },
      { x: 35.5, z: 0, width: 2.0, kind: 'window', box: true, shutters: P.bubblegum },
      { x: 27.5, z: 9, width: 1.4, kind: 'window', shutters: P.bubblegum },
      { x: 31.5, z: 9, width: 0.6, kind: 'window', bottom: 1.4, top: 1.9, noShutters: true },
      { x: 36, z: 9, width: 1.4, kind: 'window', shutters: P.bubblegum },
      { x: 39, z: 2.5, width: 1.4, kind: 'window', shutters: P.bubblegum },
      { x: 25, z: 7, width: 1.2, kind: 'window', shutters: P.bubblegum },
    ],
    patios: [walkway(28.5, -7.5, -0.08)],
    bushes: [[25.6, -0.7, 1, P.bubblegum], [33.2, -0.7, 1.1, P.butter], [38.3, -0.7, 0.9, P.lavender]],
    sign: { text: 'Dream House', x: 31.5, y: 1.1, z: -4.5, rot: 180, w: 2.6, h: 0.6, bg: P.teal, posts: true },
    furniture: [
      { item: 'balloons', x: 26.0, z: 0.6 },
      { item: 'balloons', x: 29.3, z: 0.6, color: P.lavender },
      { item: 'roundrug', x: 28.5, z: 2.5, color: P.butter },
      { item: 'mailbox', x: 29.6, z: -7.1, rot: 180, color: P.mint },
      { item: 'flowerbed', x: 26.5, z: -2.5 },
      { item: 'flowerbed', x: 30.5, z: -2.5 },
    ],
  },

  // ---------------- Blue House (locked) ----------------
  {
    id: 'blue', title: 'Blue House', wallHeight: 2.7, exterior: '#bcd4ea', roofColor: '#4f4a48', gableColor: '#fbfaf7',
    rooms: [
      { name: 'Blue Living Room', x: -19, z: 0, w: 8, d: 8, wall: P.cream, floor: '#c69c6d', light: 6 },
      { name: 'Blue Bedroom', x: -11, z: 0, w: 4, d: 4, wall: '#d7e6f5', floor: '#d8c8b0', floorStyle: 'carpet' },
      { name: 'Blue Kitchen', x: -11, z: 4, w: 4, d: 4, wall: '#f4efe4', floor: '#e8e2d8', floorStyle: 'tile' },
    ],
    openings: [
      { x: -13, z: 0, width: 1.0, doorColor: P.coral },
      { x: -11, z: 2, width: 0.9 },
      { x: -11, z: 6, width: 2.0, kind: 'open' },
      { x: -16.5, z: 0, width: 1.6, kind: 'window', box: true },
      { x: -9, z: 0, width: 1.4, kind: 'window', box: true },
      { x: -16, z: 8, width: 1.4, kind: 'window' },
      { x: -9, z: 8, width: 1.2, kind: 'window', bottom: 1.1 },
      { x: -19, z: 4, width: 1.4, kind: 'window' },
    ],
    patios: [walkway(-13, -7.5, -0.5)],
    bushes: [[-18, -0.7], [-15.2, -0.7, 0.9, P.white], [-11, -0.7, 0.9, P.white], [-8, -0.7]],
    furniture: [
      { item: 'mailbox', x: -11.9, z: -7.1, rot: 180, color: P.white },
      { item: 'trampoline', x: -13, z: 11.5 },
    ],
  },

  // ---------------- Yellow House (locked, across the street) ----------------
  {
    id: 'yellow', title: 'Yellow House', wallHeight: 2.7, exterior: '#f3dfa0', roofColor: '#5d6b7a', gableColor: '#fbfaf7',
    rooms: [
      { name: 'Yellow Living Room', x: -21, z: -26, w: 8, d: 8, wall: '#fff6e0', floor: '#c69c6d', light: 6 },
      { name: 'Yellow Bedroom', x: -13, z: -22, w: 4, d: 4, wall: '#fde2ec', floor: '#e8d6bd', floorStyle: 'carpet' },
      { name: 'Yellow Kitchen', x: -13, z: -26, w: 4, d: 4, wall: '#e6f2e2', floor: '#e8e2d8', floorStyle: 'tile' },
    ],
    openings: [
      { x: -15, z: -18, width: 1.0, doorColor: P.sky },
      { x: -13, z: -20, width: 0.9 },
      { x: -13, z: -24, width: 2.0, kind: 'open' },
      { x: -18.5, z: -18, width: 1.6, kind: 'window', box: true, shutters: P.sky },
      { x: -11, z: -18, width: 1.4, kind: 'window', box: true, shutters: P.sky },
      { x: -18, z: -26, width: 1.4, kind: 'window', shutters: P.sky },
      { x: -11, z: -26, width: 1.2, kind: 'window', bottom: 1.1, shutters: P.sky },
    ],
    patios: [walkway(-15, -17.4, -16.5)],
    bushes: [[-20, -17.3], [-17, -17.3, 0.8, P.bubblegum], [-13, -17.3, 0.8, P.bubblegum], [-10, -17.3]],
    furniture: [
      { item: 'mailbox', x: -13.8, z: -16.9, color: P.butter },
      { item: 'swingset', x: -15, z: -30 },
    ],
  },

  // ---------------- Ice Cream Shop ----------------
  {
    id: 'icecream', title: 'Ice Cream Shop', wallHeight: 3.0, exterior: '#fbe0ea', roof: 'flat', roofColor: '#f7f1e6',
    rooms: [{ name: 'Ice Cream Shop', x: -4, z: -26, w: 10, d: 8, wall: '#fff1f5', floor: P.blush, floorStyle: 'checker', light: 9, recessed: true }],
    openings: [
      { x: 1, z: -18, width: 1.4, slide: true, auto: true, awning: [P.bubblegum, P.white] },
      { x: -2.1, z: -18, width: 2.8, kind: 'window', bottom: 0.5, top: 2.4, noShutters: true, awning: [P.bubblegum, P.white] },
      { x: 4.2, z: -18, width: 2.4, kind: 'window', bottom: 0.5, top: 2.4, noShutters: true, awning: [P.bubblegum, P.white] },
      { x: -4, z: -22, width: 2.0, kind: 'window', bottom: 0.9, top: 2.3, noShutters: true },
      { x: 6, z: -22, width: 2.0, kind: 'window', bottom: 0.9, top: 2.3, noShutters: true },
    ],
    patios: [{ x: -4.2, z: -17.92, w: 10.4, d: 1.42, color: '#e6ddd0' }],
    sign: { text: 'Ice Cream', x: 1, y: 3.35, z: -17.65, w: 3.6, h: 0.75, bg: P.bubblegum },
    furniture: [
      { item: 'icecreamcounter', x: 1, z: -25.4 },
      { item: 'cafetable', x: -2.0, z: -21.6 },
      { item: 'stool', x: -2.75, z: -21.6 },
      { item: 'stool', x: -1.25, z: -21.6, color: P.sky },
      { item: 'cafetable', x: 3.8, z: -21.6 },
      { item: 'stool', x: 3.05, z: -21.6, color: P.butter },
      { item: 'stool', x: 4.55, z: -21.6, color: P.mint },
      { item: 'icecream', x: -2.0, z: -21.6 },
      { item: 'balloons', x: -3.5, z: -25.5 },
      { item: 'balloons', x: 5.5, z: -25.5, color: P.sky },
      { item: 'poster', x: -3.89, z: -24.5, y: 1.8, rot: 90, color: P.butter },
      { item: 'plant', x: 5.5, z: -18.6 },
      { item: 'cafetable', x: -2.5, z: -16.8 },
      { item: 'stool', x: -3.2, z: -16.8, color: P.coral },
    ],
  },

  // ---------------- Toy Shop ----------------
  {
    id: 'toyshop', title: 'Toy Shop', wallHeight: 3.0, exterior: '#cfe3f7', roof: 'flat', roofColor: '#f7f1e6',
    rooms: [{ name: 'Toy Shop', x: 9, z: -26, w: 10, d: 8, wall: '#fff8e7', floor: P.woodLight, light: 9, recessed: true }],
    openings: [
      { x: 14, z: -18, width: 1.4, slide: true, auto: true, awning: [P.sky, P.white] },
      { x: 11, z: -18, width: 2.8, kind: 'window', bottom: 0.5, top: 2.4, noShutters: true, awning: [P.sky, P.white] },
      { x: 17.1, z: -18, width: 2.4, kind: 'window', bottom: 0.5, top: 2.4, noShutters: true, awning: [P.sky, P.white] },
      { x: 19, z: -22, width: 2.0, kind: 'window', bottom: 0.9, top: 2.3, noShutters: true },
    ],
    patios: [{ x: 8.8, z: -17.92, w: 10.4, d: 1.42, color: '#e6ddd0' }],
    sign: { text: 'Toy Shop', x: 14, y: 3.35, z: -17.65, w: 3.6, h: 0.75, bg: P.sky },
    furniture: [
      { item: 'register', x: 14, z: -24.9 },
      { item: 'storeshelf', x: 9.32, z: -24.0, rot: 90 },
      { item: 'storeshelf', x: 9.32, z: -21.6, rot: 90, color: P.butter },
      { item: 'storeshelf', x: 18.68, z: -24.6, rot: -90, color: P.bubblegum },
      { item: 'teddy', x: 9.35, z: -24.4, y: 1.3 },
      { item: 'dino', x: 9.35, z: -23.6, y: 1.3 },
      { item: 'robot', x: 9.35, z: -24.0, y: 0.8 },
      { item: 'unicorn', x: 9.35, z: -21.9, y: 1.3 },
      { item: 'ball', x: 9.35, z: -21.2, y: 0.8, color: P.sky },
      { item: 'duck', x: 9.35, z: -21.6, y: 0.3 },
      { item: 'robot', x: 18.65, z: -24.9, y: 1.3, color: P.mint },
      { item: 'unicorn', x: 18.65, z: -24.2, y: 1.3 },
      { item: 'dino', x: 18.65, z: -24.6, y: 0.8, color: P.lavender },
      { item: 'roundrug', x: 14, z: -21.4, color: P.butter },
      { item: 'toycar', x: 13.6, z: -21.3, rot: 30 },
      { item: 'toytruck', x: 16.8, z: -20.6, rot: -60 },
      { item: 'balloons', x: 18.4, z: -18.6 },
      { item: 'beanbag', x: 11.2, z: -19.2, color: P.lavender },
    ],
  },

  // ---------------- The garage (attached to the home) ----------------
  {
    id: 'garage', title: 'Garage', wallHeight: 2.6, roofHeight: 1.2, roofColor: '#4b4642', gableColor: '#e9e2cc', attach: 'minX',
    rooms: [{ name: 'Garage', x: 17, z: 0, w: 4.6, d: 6.6, wall: '#ebe6dc', floor: '#bdb8b0', floorStyle: 'tile', light: 6 }],
    openings: [
      { x: 19.2, z: 0, width: 2.9, kind: 'garage' },
      { x: 20.4, z: 6.6, width: 0.9 },
      { x: 21.6, z: 3.5, width: 1.0, kind: 'window', bottom: 1.2, top: 1.9, noShutters: true },
    ],
  },

  // ---------------- Lessenger Elementary ----------------
  {
    id: 'school', title: 'Lessenger Elementary', wallHeight: 3.0, roof: 'flat', roofColor: '#ddd6c8',
    rooms: [
      { name: 'School Office', x: -18.5, z: -40, w: 6, d: 4, wall: '#f4ecd8', floor: '#cfc6b5', floorStyle: 'tile' },
      { name: 'School Hallway', x: -12.5, z: -40, w: 18, d: 4, wall: '#f7f1e6', floor: '#e6e0d3', floorStyle: 'tile', light: 9, recessed: true },
      { name: 'Classroom', x: -18.5, z: -47, w: 7.5, d: 7, wall: '#fff1d0', floor: '#d9c3a0', light: 8, recessed: true },
      { name: 'Art Room', x: -11, z: -47, w: 7, d: 7, wall: '#dcedf9', floor: '#ebe6dc', floorStyle: 'tile', light: 8, recessed: true },
      { name: 'School Library', x: -4, z: -47, w: 9.5, d: 7, wall: '#e3f0dc', floor: '#9fb7d6', floorStyle: 'carpet', light: 8, recessed: true },
    ],
    openings: [
      { x: -6.5, z: -36, width: 1.8, double: true, glass: true, doorColor: '#2e6fb5' },
      { x: -12.5, z: -38.2, width: 0.9 },
      { x: -18.5, z: -39.3, width: 0.9, doorColor: '#2e6fb5' },
      { x: -11.9, z: -40, width: 0.9, doorColor: '#f2cf63' },
      { x: -7.5, z: -40, width: 0.9, doorColor: '#93c9ea' },
      { x: 0.5, z: -40, width: 2.6, kind: 'open' },
      { x: 5.5, z: -38, width: 1.0, doorColor: '#2e6fb5' },
      { x: -15.5, z: -36, width: 2.0, kind: 'window', bottom: 0.9, top: 2.4, noShutters: true },
      { x: -10.5, z: -36, width: 1.8, kind: 'window', bottom: 0.9, top: 2.4, noShutters: true },
      { x: -2.5, z: -36, width: 1.8, kind: 'window', bottom: 0.9, top: 2.4, noShutters: true },
      { x: 2, z: -36, width: 1.8, kind: 'window', bottom: 0.9, top: 2.4, noShutters: true },
      { x: -16.5, z: -47, width: 2.2, kind: 'window', bottom: 0.8, top: 2.5, noShutters: true },
      { x: -13, z: -47, width: 2.2, kind: 'window', bottom: 0.8, top: 2.5, noShutters: true },
      { x: -9, z: -47, width: 2.2, kind: 'window', bottom: 0.8, top: 2.5, noShutters: true },
      { x: -6, z: -47, width: 2.2, kind: 'window', bottom: 0.8, top: 2.5, noShutters: true },
      { x: -1.5, z: -47, width: 2.2, kind: 'window', bottom: 0.8, top: 2.5, noShutters: true },
      { x: 2.5, z: -47, width: 2.2, kind: 'window', bottom: 0.8, top: 2.5, noShutters: true },
      { x: 5.5, z: -43.5, width: 2.2, kind: 'window', bottom: 0.8, top: 2.5, noShutters: true },
    ],
    patios: [
      { x: -7.3, z: -33.6, w: 1.6, d: 17.1, color: '#d8d0c2' },     // path from Kenwood Ave
      { x: -11, z: -35.92, w: 9, d: 2.4, color: '#d8d0c2' },        // front steps area
      { x: -20.05, z: -39.85, w: 1.45, d: 1.1, color: '#d8d0c2' },  // office door to the parking lot
      { x: 6.4, z: -47.5, w: 14, d: 11.2, color: '#7d7f86' },      // blacktop playground
    ],
    bushes: [[-17, -35.3, 1, P.bubblegum], [-13, -35.3], [-0.5, -35.3, 1, P.butter], [3.8, -35.3]],
    sign: { text: 'Lessenger Elementary', x: -6.5, y: 3.5, z: -35.62, w: 6.2, h: 0.8, bg: '#2e6fb5' },
    signs: [{ text: 'Lessenger Elementary', x: -1.6, y: 1.0, z: -32.6, w: 3.4, h: 0.6, bg: '#2e6fb5', posts: true }],
    furniture: [
      // classroom
      { item: 'chalkboard', x: -18.39, z: -43.5, y: 2.1, rot: 90 },
      { item: 'alphabet', x: -16.0, z: -40.11, y: 2.6, rot: 180 },
      { item: 'teacherdesk', x: -17.3, z: -45.6, rot: 90 },
      { item: 'globe', x: -17.3, z: -45.9, y: 0.8 },
      ...[-45.5, -43.6, -41.7].flatMap((z) => [-15.6, -14.1, -12.6].map((x, i) => ({ item: 'schooldesk', x, z, rot: -90, color: [P.coral, P.sky, P.mint][i] }))),
      { item: 'bookshelf', x: -11.6, z: -46.7, rot: -90 },
      { item: 'clock', x: -11.11, z: -43.5, y: 2.5, rot: -90 },
      { item: 'poster', x: -11.11, z: -41.6, y: 2.0, rot: -90, color: P.butter },
      // art room
      { item: 'easel', x: -10.0, z: -45.6, rot: 45 },
      { item: 'easel', x: -8.0, z: -46.0, rot: 0, color: P.lavender },
      { item: 'easel', x: -5.6, z: -45.6, rot: -45, color: P.mint },
      { item: 'activitytable', x: -7.5, z: -42.8 },
      { item: 'kidchair', x: -8.3, z: -42.8, rot: 90 },
      { item: 'kidchair', x: -6.7, z: -42.8, rot: -90, color: P.sky },
      { item: 'painting', x: -10.89, z: -42.5, y: 2.1, rot: 90 },
      { item: 'poster', x: -4.11, z: -42.5, y: 2.0, rot: -90, color: P.bubblegum },
      { item: 'balloons', x: -4.6, z: -40.6 },
      // library
      ...[-46.3, -45.3, -44.3, -43.3].map((z) => ({ item: 'bookshelf', x: -3.75, z, rot: 90 })),
      { item: 'bookshelf', x: 5.25, z: -46.3, rot: -90 },
      { item: 'bookshelf', x: 5.25, z: -41.2, rot: -90 },
      { item: 'bigrug', x: 0.8, z: -43.5, color: P.butter },
      { item: 'beanbag', x: -0.5, z: -44.6, color: P.coral },
      { item: 'beanbag', x: 1.8, z: -44.8, color: P.lavender },
      { item: 'beanbag', x: 0.6, z: -42.3, color: P.mint },
      { item: 'books', x: 0.6, z: -43.5 },
      { item: 'plant', x: 4.8, z: -40.6 },
      // hallway
      ...[-10.3, -9.0, -5.6, -4.3, -3.0, 3.2, 4.5].map((x, i) => ({ item: 'lockers', x, z: -39.75, color: i % 2 ? '#5b8fd9' : '#6fa0e3' })),
      { item: 'poster', x: -8.0, z: -36.11, y: 2.0, rot: 180, color: P.mint },
      { item: 'clock', x: -6.5, z: -36.11, y: 2.6, rot: 180 },
      // office
      { item: 'desk', x: -15.5, z: -38.7, rot: 180 },
      { item: 'chair', x: -15.5, z: -39.4 },
      { item: 'flowers', x: -15.1, z: -38.7, y: 0.8 },
      { item: 'plant', x: -18.0, z: -36.6 },
      { item: 'picture', x: -18.39, z: -38.0, y: 1.8, rot: 90 },
      // outside: flag, bus, playground
      { item: 'flagpole', x: -9.6, z: -33.6 },
      { item: 'schoolbus', x: 13.4, z: -33.9, rot: 90 },
      { item: 'slide', x: 9.0, z: -44.4 },
      { item: 'swingset', x: 13.5, z: -45.4, color: P.coral },
      { item: 'hoop', x: 19.4, z: -40.5, rot: -90 },
      { item: 'ball', x: 17.0, z: -40.0, color: '#f2a25f' },
      { item: 'hopscotch', x: 9.2, z: -38.5, rot: 90 },
      { item: 'merrygoround', x: 15.8, z: -38.8, color: P.lavender },
      { item: 'bench', x: 7.2, z: -41.0, rot: 90 },
    ],
  },
  // ---------------- Fire Station (on Maple Dr) ----------------
  {
    id: 'firestation', title: 'Fire Station', wallHeight: 3.6, roof: 'flat', roofColor: '#ddd6c8',
    rooms: [
      { name: 'Fire Engine Bay', x: 68, z: -46, w: 14, d: 10, wall: '#f4efe4', floor: '#bdb8b0', floorStyle: 'tile', light: 9, recessed: true },
      { name: 'Firefighter Kitchen', x: 68, z: -36, w: 7, d: 6, wall: '#fde2d8', floor: '#e8e2d8', floorStyle: 'tile' },
      { name: 'Bunk Room', x: 75, z: -36, w: 7, d: 6, wall: '#dceefa', floor: '#c9c2b8', floorStyle: 'carpet' },
    ],
    openings: [
      { x: 82, z: -43.5, width: 3.4, kind: 'garage', top: 3.2 },
      { x: 82, z: -38.5, width: 3.4, kind: 'garage', top: 3.2 },
      { x: 71.5, z: -36, width: 1.0 },
      { x: 78.5, z: -36, width: 1.0 },
      { x: 75, z: -33, width: 0.9 },
      { x: 82, z: -33, width: 1.0, doorColor: '#d9443a' },
      { x: 68, z: -33, width: 1.6, kind: 'window', noShutters: true },
      { x: 71.5, z: -30, width: 1.6, kind: 'window', noShutters: true },
      { x: 78.5, z: -30, width: 1.6, kind: 'window', noShutters: true },
      { x: 72, z: -46, width: 2.0, kind: 'window', bottom: 1.2, top: 2.6, noShutters: true },
      { x: 78, z: -46, width: 2.0, kind: 'window', bottom: 1.2, top: 2.6, noShutters: true },
      { x: 68, z: -41, width: 2.0, kind: 'window', bottom: 1.2, top: 2.6, noShutters: true },
    ],
    patios: [{ x: 82.1, z: -46, w: 4.8, d: 10, color: '#c9c3b8' }, { x: 82.1, z: -33.6, w: 4.8, d: 1.2, color: '#c9c3b8' }],
    sign: { text: 'Fire Station', x: 82.42, y: 3.95, z: -41, rot: 90, w: 4.2, h: 0.75, bg: '#d9443a' },
    furniture: [
      { item: 'firetruck', x: 74.5, z: -43.5, rot: 90 },
      { item: 'pickup', x: 75.5, z: -38.5, rot: 90, color: '#d9443a' },
      { item: 'firepole', x: 69.0, z: -37.0 },
      { item: 'alarmbell', x: 68.11, z: -38.6, y: 2.4, rot: 90 },
      { item: 'dog', x: 70.0, z: -44.8, rot: 60, color: '#f4f4f1' },
      { item: 'diningtable', x: 71.5, z: -32.8 },
      { item: 'chair', x: 70.7, z: -32.8, rot: 90 }, { item: 'chair', x: 72.3, z: -32.8, rot: -90 },
      { item: 'fridge', x: 68.45, z: -30.6, rot: 90 },
      { item: 'stove', x: 74.55, z: -31.0, rot: -90 },
      { item: 'pot', x: 74.55, z: -31.0 },
      { item: 'bed', x: 77.0, z: -31.3, rot: 90, color: '#d9443a' },
      { item: 'bed', x: 80.6, z: -31.3, rot: -90, color: '#d9443a' },
      { item: 'clock', x: 75.11, z: -34.5, y: 2.3, rot: 90 },
    ],
  },

  // ---------------- Police Station ----------------
  {
    id: 'police', title: 'Police Station', wallHeight: 3.0, roof: 'flat', exterior: '#d7e3ef', roofColor: '#ddd6c8',
    rooms: [
      { name: 'Police Lobby', x: 70, z: -56, w: 12, d: 4, wall: '#f4efe4', floor: '#d9d4cc', floorStyle: 'tile' },
      { name: 'Police Office', x: 70, z: -62, w: 12, d: 6, wall: '#dceefa', floor: '#a39282' },
    ],
    openings: [
      { x: 82, z: -54, width: 1.2, glass: true, doorColor: '#2e6fb5' },
      { x: 76, z: -56, width: 1.0 },
      { x: 82, z: -59, width: 1.6, kind: 'window', noShutters: true },
      { x: 74, z: -52, width: 1.6, kind: 'window', noShutters: true },
      { x: 79, z: -52, width: 1.6, kind: 'window', noShutters: true },
      { x: 76, z: -62, width: 2.0, kind: 'window', noShutters: true },
      { x: 70, z: -59, width: 1.6, kind: 'window', noShutters: true },
    ],
    patios: [{ x: 82.1, z: -62, w: 4.8, d: 10, color: '#c9c3b8' }],
    sign: { text: 'Police', x: 82.42, y: 3.35, z: -57, rot: 90, w: 3, h: 0.7, bg: '#2e6fb5' },
    furniture: [
      { item: 'policecar', x: 84.5, z: -58.5 },
      { item: 'counter', x: 74, z: -53, rot: 90 },
      { item: 'chair', x: 79, z: -55.4, rot: 180 }, { item: 'chair', x: 80, z: -55.4, rot: 180 },
      { item: 'plant', x: 81.4, z: -52.6 },
      { item: 'computer', x: 73, z: -60.6 },
      { item: 'officechair', x: 73, z: -59.8, rot: 180 },
      { item: 'computer', x: 78, z: -60.6 },
      { item: 'officechair', x: 78, z: -59.8, rot: 180 },
      { item: 'poster', x: 75, z: -61.89, y: 1.9, color: '#93c9ea' },
      { item: 'clock', x: 70.11, z: -57.5, y: 2.3, rot: 90 },
      { item: 'bookshelf', x: 81.7, z: -61.0, rot: -90 },
    ],
  },

  // ---------------- Kenwood Market (grocery store) ----------------
  {
    id: 'grocery', title: 'Kenwood Market', wallHeight: 3.2, roof: 'flat', exterior: '#e8f3e2', roofColor: '#ddd6c8',
    rooms: [
      { name: 'Kenwood Market', x: -58, z: -34, w: 16, d: 12, wall: '#fbfaf7', floor: '#e6e0d3', floorStyle: 'tile', light: 9, recessed: true },
      { name: 'Stock Room', x: -58, z: -38, w: 16, d: 4, wall: '#ebe6dc', floor: '#bdb8b0', floorStyle: 'tile' },
    ],
    openings: [
      { x: -50, z: -22, width: 1.8, slide: true, auto: true, awning: ['#4f8a46', P.white] },
      { x: -55, z: -22, width: 3.4, kind: 'window', bottom: 0.5, top: 2.6, noShutters: true, awning: ['#4f8a46', P.white] },
      { x: -45, z: -22, width: 3.4, kind: 'window', bottom: 0.5, top: 2.6, noShutters: true, awning: ['#4f8a46', P.white] },
      { x: -45, z: -34, width: 1.2 },
      { x: -58, z: -28, width: 2.0, kind: 'window', bottom: 1.0, top: 2.4, noShutters: true },
    ],
    patios: [{ x: -58.2, z: -21.92, w: 16.4, d: 5.4, color: '#e6ddd0' }],
    sign: { text: 'Kenwood Market', x: -50, y: 3.55, z: -21.65, w: 5.2, h: 0.75, bg: '#4f8a46' },
    signs: [
      { text: 'Cereal & Snacks', x: -55, y: 2.55, z: -28.5, w: 1.9, h: 0.42, bg: '#f2a25f' },
      { text: 'Cans & Drinks', x: -51, y: 2.55, z: -28.5, w: 1.9, h: 0.42, bg: '#5b8fd9' },
      { text: 'Bakery & Snacks', x: -47, y: 2.55, z: -28.5, w: 1.9, h: 0.42, bg: '#c8963c' },
    ],
    furniture: [
      { item: 'checkout', x: -55.5, z: -24.5, rot: 90 },
      { item: 'checkout', x: -53.0, z: -24.5, rot: 90, color: '#ef84ad' },
      ...[-55, -51, -47].flatMap((x) => [-29.5, -31.2].flatMap((z) => [
        { item: groceryShelf(x - 0.33, z), x: x - 0.33, z, rot: -90 },
        { item: groceryShelf(x + 0.33, z), x: x + 0.33, z, rot: 90 },
      ])),
      { item: 'produce', x: -44.5, z: -25.5, rot: -90 },
      { item: 'produce', x: -44.5, z: -27.8, rot: -90 },
      { item: 'freezer', x: -51, z: -33.4 },
      { item: 'freezer', x: -47, z: -33.4 },
      { item: 'cart', x: -43.0, z: -21.2, rot: 90 },
      { item: 'cart', x: -43.0, z: -20.6, rot: 90 },
      { item: 'cart', x: -43.0, z: -20.0, rot: 90 },
      { item: 'balloons', x: -42.6, z: -22.6 },
      { item: 'cupcake', x: -55.5, z: -25.0, y: 1.0 },
      { item: 'icecream', x: -53.0, z: -24.0, y: 1.0, color: '#ef84ad' },
    ],
  },

  // ---------------- Office tower ----------------
  {
    id: 'office', title: 'Kenwood Office Tower', wallHeight: 3.2, roof: 'flat', floors: 3, exterior: '#cfd8e3', roofColor: '#b9c2cc',
    rooms: [
      { name: 'Office Lobby', x: -62, z: -62, w: 6, d: 16, wall: '#f4f1ea', floor: '#d9d4cc', floorStyle: 'tile', light: 8, recessed: true },
      { name: 'Office', x: -56, z: -62, w: 8, d: 16, wall: '#eef3f7', floor: '#8f9aa8', floorStyle: 'carpet', light: 9, recessed: true },
    ],
    openings: [
      { x: -62, z: -54, width: 1.8, slide: true, auto: true },
      { x: -56, z: -54, width: 3.0, kind: 'open' },
      { x: -62, z: -59, width: 2.4, kind: 'window', bottom: 0.6, top: 2.8, noShutters: true },
      { x: -62, z: -49, width: 2.4, kind: 'window', bottom: 0.6, top: 2.8, noShutters: true },
      { x: -59, z: -62, width: 2.0, kind: 'window', bottom: 0.8, top: 2.8, noShutters: true },
      { x: -52, z: -62, width: 3.0, kind: 'window', bottom: 0.8, top: 2.8, noShutters: true },
      { x: -52, z: -46, width: 3.0, kind: 'window', bottom: 0.8, top: 2.8, noShutters: true },
      { x: -48, z: -58, width: 2.4, kind: 'window', bottom: 0.8, top: 2.8, noShutters: true },
      { x: -48, z: -50, width: 2.4, kind: 'window', bottom: 0.8, top: 2.8, noShutters: true },
    ],
    patios: [{ x: -66.9, z: -57, w: 4.8, d: 6, color: '#d8d0c2' }],
    sign: { text: 'Office Tower', x: -62.42, y: 3.55, z: -54, rot: -90, w: 4, h: 0.75, bg: '#5b6b7d' },
    furniture: [
      { item: 'counter', x: -58.4, z: -55.5, rot: -90, color: '#fbfaf7' },
      { item: 'counter', x: -58.4, z: -52.5, rot: -90, color: '#fbfaf7' },
      { item: 'computer', x: -57.9, z: -54.0, rot: -90 },
      { item: 'elevator', x: -59.5, z: -46.11, y: 1.15, rot: 180 },
      { item: 'plant', x: -61.4, z: -46.6 }, { item: 'plant', x: -61.4, z: -61.4 },
      { item: 'bench', x: -60.5, z: -59.5, rot: 90 },
      ...[-60, -57, -51, -48].flatMap((z) => [-53.5, -50.5].map((x) => ({ item: 'computer', x, z }))),
      ...[-60, -57, -51, -48].flatMap((z) => [-53.5, -50.5].map((x) => ({ item: 'officechair', x, z: z + 0.75, rot: 180 }))),
      { item: 'watercooler', x: -48.5, z: -54.0 },
      { item: 'clock', x: -48.11, z: -54, y: 2.3, rot: -90 },
      { item: 'smallplant', x: -50.5, z: -60.3, y: 0.76 },
    ],
  },

  // ---------------- Pizza Palace ----------------
  {
    id: 'pizza', title: 'Pizza Palace', wallHeight: 3.0, roof: 'flat', exterior: '#fde2d8', roofColor: '#f7f1e6',
    rooms: [{ name: 'Pizza Palace', x: -14, z: -62, w: 10, d: 10, wall: '#fff6e8', floor: '#f2c4c0', floorStyle: 'checker', light: 9, recessed: true }],
    openings: [
      { x: -9, z: -62, width: 1.4, slide: true, auto: true, awning: ['#d9443a', P.white] },
      { x: -12, z: -62, width: 2.2, kind: 'window', bottom: 0.5, top: 2.4, noShutters: true, awning: ['#d9443a', P.white] },
      { x: -6, z: -62, width: 2.2, kind: 'window', bottom: 0.5, top: 2.4, noShutters: true, awning: ['#d9443a', P.white] },
      { x: -14, z: -57, width: 2.0, kind: 'window', bottom: 0.9, top: 2.3, noShutters: true },
    ],
    patios: [{ x: -14.2, z: -64.9, w: 10.4, d: 2.82, color: '#e6ddd0' }],
    sign: { text: 'Pizza Palace', x: -9, y: 3.35, z: -62.35, rot: 180, w: 3.8, h: 0.75, bg: '#d9443a' },
    furniture: [
      { item: 'pizzaoven', x: -9, z: -52.7, rot: 180 },
      { item: 'counter', x: -11.8, z: -52.4, rot: 180 },
      { item: 'counter', x: -6.2, z: -52.4, rot: 180 },
      ...[[-12, -59], [-6, -59], [-12, -56], [-6, -56]].flatMap(([x, z], i) => [
        { item: 'cafetable', x, z, color: '#fbfaf7' },
        { item: 'stool', x: x - 0.75, z, color: '#d9443a' },
        { item: 'stool', x: x + 0.75, z, color: '#d9443a' },
        ...(i % 2 ? [] : [{ item: 'pizza', x, z }]),
      ]),
      { item: 'poster', x: -4.11, z: -57, y: 1.9, rot: -90, color: '#f7da7e' },
      { item: 'plant', x: -13.4, z: -61.4 },
    ],
  },

  // ---------------- Pet Shop ----------------
  {
    id: 'petshop', title: 'Pet Shop', wallHeight: 3.0, roof: 'flat', exterior: '#d9f2e6', roofColor: '#f7f1e6',
    rooms: [{ name: 'Pet Shop', x: 0, z: -62, w: 9, d: 9, wall: '#fffbe8', floor: '#d9c3a0', light: 9, recessed: true }],
    openings: [
      { x: 4.5, z: -62, width: 1.4, slide: true, auto: true, awning: [P.mint, P.white] },
      { x: 1.8, z: -62, width: 2.0, kind: 'window', bottom: 0.5, top: 2.4, noShutters: true, awning: [P.mint, P.white] },
      { x: 7.2, z: -62, width: 2.0, kind: 'window', bottom: 0.5, top: 2.4, noShutters: true, awning: [P.mint, P.white] },
    ],
    patios: [{ x: -0.2, z: -64.9, w: 9.4, d: 2.82, color: '#e6ddd0' }],
    sign: { text: 'Pet Shop', x: 4.5, y: 3.35, z: -62.35, rot: 180, w: 3.2, h: 0.75, bg: '#5fb3a8' },
    furniture: [
      { item: 'petcounter', x: 4.5, z: -53.8, rot: 180 },
      { item: 'fishtank', x: 0.6, z: -58.5, rot: 90 },
      { item: 'fishtank', x: 0.6, z: -56.4, rot: 90, color: '#5b8fd9' },
      { item: 'birdcage', x: 8.3, z: -58.5 },
      { item: 'birdcage', x: 8.3, z: -56.8, color: '#93c9ea' },
      { item: 'bunny', x: 3.5, z: -57.5 },
      { item: 'bunny', x: 5.5, z: -58.2, color: '#c9a27c' },
      { item: 'cat', x: 6.5, z: -56.0, rot: -40 },
      { item: 'dog', x: 2.5, z: -55.5, rot: 30, color: '#c69c6d' },
      { item: 'roundrug', x: 4.5, z: -57.5, color: P.mint },
      { item: 'ball', x: 3.0, z: -59.5, color: P.sky },
      { item: 'poster', x: 8.89, z: -55, y: 1.9, rot: -90, color: '#ef84ad' },
    ],
  },
  // ---------------- Hospital ----------------
  {
    id: 'hospital', title: 'PepCity Hospital', wallHeight: 3.2, roof: 'flat', exterior: '#f1f3f5', roofColor: '#d9dde2',
    rooms: [
      { name: 'Hospital Lobby', x: 54, z: -33, w: 12, d: 5, wall: '#e9f3f8', floor: '#e6e9ec', floorStyle: 'tile', light: 8, recessed: true },
      { name: 'Exam Room', x: 54, z: -40, w: 4, d: 7, wall: '#dceefa', floor: '#e6e9ec', floorStyle: 'tile' },
      { name: 'Patient Room', x: 58, z: -40, w: 4, d: 7, wall: '#e3f0dc', floor: '#e6e9ec', floorStyle: 'tile' },
      { name: 'X-Ray Room', x: 62, z: -40, w: 4, d: 7, wall: '#e6e0f5', floor: '#e6e9ec', floorStyle: 'tile' },
    ],
    openings: [
      { x: 60, z: -28, width: 1.8, slide: true, auto: true },
      { x: 56, z: -28, width: 2.2, kind: 'window', bottom: 0.7, top: 2.5, noShutters: true },
      { x: 64, z: -28, width: 2.2, kind: 'window', bottom: 0.7, top: 2.5, noShutters: true },
      { x: 56, z: -33, width: 0.9 }, { x: 60, z: -33, width: 0.9 }, { x: 64, z: -33, width: 0.9 },
      { x: 56, z: -40, width: 1.4, kind: 'window', noShutters: true }, { x: 60, z: -40, width: 1.4, kind: 'window', noShutters: true },
      { x: 54, z: -36.5, width: 1.4, kind: 'window', noShutters: true },
    ],
    patios: [{ x: 59.2, z: -27.92, w: 1.6, d: 11.4, color: '#e6ddd0' }],
    sign: { text: '+ Hospital', x: 60, y: 3.55, z: -27.65, w: 3.8, h: 0.75, bg: '#d9443a' },
    furniture: [
      { item: 'counter', x: 57.5, z: -31.8 }, { item: 'computer', x: 56.4, z: -31.6 },
      { item: 'chair', x: 62.4, z: -29.0, rot: 180 }, { item: 'chair', x: 63.2, z: -29.0, rot: 180 }, { item: 'chair', x: 64.0, z: -29.0, rot: 180 },
      { item: 'plant', x: 65.4, z: -32.4 }, { item: 'poster', x: 54.11, z: -30.5, y: 1.9, rot: 90, color: '#aee0c5' },
      { item: 'exambed', x: 55.3, z: -37.6 }, { item: 'stool', x: 56.8, z: -36.2 }, { item: 'poster', x: 57.89, z: -37.0, y: 1.8, rot: -90, color: '#93c9ea' },
      { item: 'hospitalbed', x: 60.4, z: -38.4 }, { item: 'teddy', x: 60.4, z: -38.0, y: 0.75 }, { item: 'balloons', x: 61.4, z: -39.5 },
      { item: 'nightstand', x: 59.0, z: -39.5 }, { item: 'flowers', x: 59.0, z: -39.5 },
      { item: 'xray', x: 64, z: -39.89, y: 1.65 }, { item: 'exambed', x: 63.2, z: -36.2, rot: 90 }, { item: 'wheelchair', x: 65.2, z: -34.2, rot: 180 },
      { item: 'ambulance', x: 63.8, z: -23.5 },
      { item: 'clock', x: 60, z: -32.89, y: 2.5, rot: 180 },
    ],
  },

  // ---------------- Library ----------------
  {
    id: 'library', title: 'Kenwood Library', wallHeight: 3.2, roof: 'flat', exterior: '#e9dcc2', roofColor: '#d9cbb0',
    rooms: [{ name: 'Kenwood Library', x: 46, z: -63, w: 12, d: 10, wall: '#f3ead8', floor: '#7f9cc4', floorStyle: 'carpet', light: 9, recessed: true }],
    openings: [
      { x: 52, z: -63, width: 1.8, slide: true, auto: true },
      { x: 48.4, z: -63, width: 2.2, kind: 'window', bottom: 0.6, top: 2.6, noShutters: true },
      { x: 55.6, z: -63, width: 2.2, kind: 'window', bottom: 0.6, top: 2.6, noShutters: true },
      { x: 49.5, z: -53, width: 1.8, kind: 'window', bottom: 1.2, top: 2.6, noShutters: true },
      { x: 54.5, z: -53, width: 1.8, kind: 'window', bottom: 1.2, top: 2.6, noShutters: true },
    ],
    patios: [{ x: 50.8, z: -65.9, w: 2.4, d: 2.82, color: '#e6ddd0' }],
    sign: { text: 'Library', x: 52, y: 3.55, z: -63.35, rot: 180, w: 3, h: 0.7, bg: '#4f86c6' },
    furniture: [
      ...[-61.6, -60.6, -59.6, -58.6, -57.6, -56.6, -55.6, -54.6].map((z) => ({ item: 'bookshelf', x: 46.25, z, rot: 90 })),
      ...[-61.6, -60.6, -59.6, -56.6, -55.6, -54.6].map((z) => ({ item: 'bookshelf', x: 57.75, z, rot: -90 })),
      ...[47.2, 52.0, 57.0].map((x) => ({ item: 'bookshelf', x, z: -53.25, rot: 180 })),
      { item: 'counter', x: 49.0, z: -61.6, rot: 180 },
      { item: 'diningtable', x: 52.5, z: -57.6, color: '#c9a77c' },
      { item: 'chair', x: 51.6, z: -57.6, rot: 90 }, { item: 'chair', x: 53.4, z: -57.6, rot: -90 },
      { item: 'storybook', x: 55.0, z: -59.5, rot: 180 }, { item: 'storybook', x: 49.6, z: -56.0, rot: 120, color: '#4f86c6' },
      { item: 'beanbag', x: 55.5, z: -56.0, color: P.lavender }, { item: 'beanbag', x: 50.0, z: -54.4, color: P.mint },
      { item: 'roundrug', x: 52.5, z: -55.2, color: P.butter }, { item: 'plant', x: 47.0, z: -62.4 },
      { item: 'clock', x: 52, z: -53.11, y: 2.6, rot: 180 },
    ],
  },

  // ---------------- PepCity Cinema (movie theater) ----------------
  {
    id: 'cinema', title: 'PepCity Cinema', wallHeight: 4.0, roof: 'flat', exterior: '#5a2a3a', roofColor: '#3a2a3a',
    rooms: [
      { name: 'Cinema Lobby', x: -50, z: -6, w: 16, d: 5, wall: '#f8dce8', floor: '#c8463c', floorStyle: 'carpet', light: 8, recessed: true },
      { name: 'Movie Theater', x: -50, z: -1, w: 16, d: 9, wall: '#3a2a3a', floor: '#5a2a3a', floorStyle: 'carpet', light: 3, recessed: true, dark: true },
    ],
    openings: [
      { x: -42, z: -6, width: 1.8, double: true, glass: true, doorColor: '#d9443a' },
      { x: -47, z: -6, width: 2.6, kind: 'window', bottom: 0.5, top: 2.6, noShutters: true },
      { x: -37, z: -6, width: 2.6, kind: 'window', bottom: 0.5, top: 2.6, noShutters: true },
      { x: -47, z: -1, width: 1.4, kind: 'open', top: 2.6 }, { x: -37, z: -1, width: 1.4, kind: 'open', top: 2.6 },
    ],
    patios: [{ x: -50, z: -7.45, w: 16, d: 1.37, color: '#e6ddd0' }],
    sign: { text: 'PepCity Cinema', x: -42, y: 4.4, z: -6.37, rot: 180, w: 6, h: 1.0, bg: '#d9443a' },
    furniture: [
      { item: 'moviescreen', x: -42, z: 7.89, y: 2.2, rot: 180 },
      ...[2.0, 3.6, 5.2].flatMap((z) => [-46.4, -45.3, -44.2, -43.1, -40.9, -39.8, -38.7, -37.6].map((x) => ({ item: 'theaterseat', x, z: z - 6.5 + 6.5, rot: 0 }))),
      { item: 'popcornmachine', x: -48.8, z: -3.0, rot: 90 },
      { item: 'counter', x: -45.4, z: -2.4, rot: 180 }, { item: 'counter', x: -44.4, z: -2.4, rot: 180 },
      { item: 'popcorn', x: -45.4, z: -2.4, y: 1.0 },
      { item: 'poster', x: -34.11, z: -4.5, y: 1.9, rot: -90, color: '#ef84ad' }, { item: 'poster', x: -34.11, z: -2.5, y: 1.9, rot: -90, color: '#93c9ea' },
      { item: 'plant', x: -35.0, z: -5.4 },
    ],
  },

  // ---------------- The farm's barn ----------------
  {
    id: 'barn', title: 'Red Barn', wallHeight: 4.2, roofHeight: 2.4, exterior: '#b5403a', roofColor: '#6b4a3a', gableColor: '#b5403a',
    rooms: [{ name: 'Red Barn', x: -102, z: -52, w: 14, d: 10, wall: '#c9a77c', floor: '#a08a6a', floorStyle: 'tile', light: 7 }],
    openings: [
      { x: -88, z: -47, width: 3.6, kind: 'garage', top: 3.6 },
      { x: -95, z: -42, width: 1.1, doorColor: '#fbfaf7' },
      { x: -98, z: -52, width: 1.4, kind: 'window', bottom: 1.6, top: 2.8, shutters: '#fbfaf7' },
      { x: -92, z: -52, width: 1.4, kind: 'window', bottom: 1.6, top: 2.8, shutters: '#fbfaf7' },
      { x: -102, z: -47, width: 1.4, kind: 'window', bottom: 1.6, top: 2.8, shutters: '#fbfaf7' },
    ],
    sign: { text: 'PepCity Farm', x: -87.6, y: 4.0, z: -47, rot: 90, w: 3.6, h: 0.7, bg: '#b5403a' },
    furniture: [
      { item: 'tractor', x: -95, z: -47, rot: 90 },
      { item: 'haybale', x: -100.8, z: -50.9 }, { item: 'haybale', x: -99.7, z: -50.9 }, { item: 'haybale', x: -100.3, z: -50.9, y: 0.6 },
      { item: 'haybale', x: -100.8, z: -43.4, rot: 90 }, { item: 'haybale', x: -92, z: -43.3 },
      { item: 'workbench', x: -96.5, z: -51.6 }, { item: 'pegboard', x: -96.5, z: -51.89, y: 2.0 },
    ],
  },
];

// Which kind of grocery shelf goes where in Kenwood Market's aisles
export function groceryShelf(x, z) {
  const aisle = x < -53 ? 0 : x < -49 ? 1 : 2, side = x < [-55, -51, -47][aisle] ? 0 : 1;
  return [['shelf_cereal', 'shelf_snacks'], ['shelf_cans', 'shelf_drinks'], ['shelf_bread', 'shelf_snacks']][aisle][side];
}

// Areas with no building: the park, the street, the secret garden
export const AREAS = [
  {
    id: 'park',
    furniture: [
      { item: 'fountain', x: 37.5, z: -24 },
      { item: 'slide', x: 28.5, z: -22.5 },
      { item: 'swingset', x: 31.8, z: -21.4 },
      { item: 'sandbox', x: 29.0, z: -26.6 },
      { item: 'merrygoround', x: 32.6, z: -25.8 },
      { item: 'bench', x: 44.0, z: -25.4, rot: 180 },
      { item: 'bench', x: 39.0, z: -33.0, rot: 90 },
      { item: 'bench', x: 34.4, z: -21.2, rot: 90 },
      { item: 'picnictable', x: 30.0, z: -35.0 },
      { item: 'picnictable', x: 33.5, z: -38.5, rot: 20 },
      { item: 'flowerbed', x: 35.0, z: -24.0, rot: 90 },
      { item: 'flowerbed', x: 40.0, z: -24.0, rot: -90 },
      { item: 'duck', x: 42.5, z: -31.5 },
      { item: 'duck', x: 45.0, z: -33.5 },
      { item: 'duck', x: 44.6, z: -30.0 },
      { item: 'duck', x: 46.4, z: -31.2, color: P.white },
      { item: 'streetlamp', x: 36.0, z: -29.5 },
      { item: 'streetlamp', x: 39.0, z: -37.0 },
    ],
  },
  {
    id: 'street',
    furniture: [
      { item: 'mailbox', x: 13.9, z: -7.1, rot: 180, color: P.sky },
      { item: 'hydrant', x: 8.0, z: -8.0 },
      { item: 'streetlamp', x: -16, z: -8.2 }, { item: 'streetlamp', x: 3, z: -8.2 },
      { item: 'streetlamp', x: 23, z: -8.2 }, { item: 'streetlamp', x: 42, z: -8.2 },
      { item: 'streetlamp', x: -6, z: -15.8 }, { item: 'streetlamp', x: 7.5, z: -15.8 },
      { item: 'streetlamp', x: 22, z: -15.8 }, { item: 'streetlamp', x: 52, z: -15.8 },
    ],
  },
  {
    id: 'family-cars', clearSpots: true, // the white pickup in the driveway and the white SUV in the garage
    furniture: [
      { item: 'pickup', x: 19.2, z: -3.9, color: '#f4f4f1' },
      { item: 'suv', x: 19.2, z: 3.2, color: '#f4f4f1' },
    ],
  },
  {
    id: 'more-cars',
    furniture: [
      { item: 'car', x: -31.0, z: -36.6, rot: 90, color: '#93c9ea' },
      { item: 'minivan', x: -31.0, z: -42.4, rot: 90, color: '#bba6e6' },
      { item: 'icecreamtruck', x: -24.0, z: -46.0, rot: -90 },
      { item: 'firetruck', x: -24.0, z: -38.6, rot: -90 },
    ],
  },
  {
    id: 'school-lot',
    furniture: [
      { item: 'car', x: -31.0, z: -45.6, rot: 90, color: '#bba6e6' },
      { item: 'car', x: -31.0, z: -40.0, rot: 90, color: '#fbfaf7' },
      { item: 'streetlamp', x: -20.6, z: -48.6 },
      { item: 'streetlamp', x: -20.6, z: -35.4 },
    ],
  },
  {
    id: 'garage-stuff',
    furniture: [
      { item: 'workbench', x: 19.2, z: 6.25, rot: 180 },
      { item: 'pegboard', x: 19.2, z: 6.49, y: 2.0, rot: 180 },
      { item: 'bike', x: 21.0, z: 4.6, rot: -90, color: P.bubblegum },
      { item: 'bike', x: 21.0, z: 3.4, rot: -90, color: P.sky },
      { item: 'toytruck', x: 17.9, z: 5.6, rot: 90 },
      { item: 'ball', x: 18.0, z: 4.6, color: P.mint },
    ],
  },
  {
    id: 'blue-inside',
    furniture: [
      { item: 'couch', x: -16, z: 7.45, rot: 180, color: '#7d93b5' },
      { item: 'coffeetable', x: -16, z: 5.8 },
      { item: 'rug', x: -16, z: 5.8, color: P.butter },
      { item: 'tv', x: -16.2, z: 0.45 },
      { item: 'armchair', x: -18.3, z: 5.4, rot: 90, color: P.mint },
      { item: 'plant', x: -18.5, z: 0.6 },
      { item: 'bed', x: -8.0, z: 2.0, rot: -90, color: '#c4def3' },
      { item: 'nightstand', x: -7.4, z: 0.55 },
      { item: 'tablelamp', x: -7.4, z: 0.55 },
      { item: 'fridge', x: -7.45, z: 7.45, rot: 180 },
      { item: 'counter', x: -8.6, z: 7.6, rot: 180 },
      { item: 'stove', x: -9.6, z: 7.6, rot: 180 },
      { item: 'diningtable', x: -9.0, z: 5.4 },
      { item: 'dog', x: -14.5, z: 4.2, rot: 40 },
    ],
  },
  {
    id: 'yellow-inside',
    furniture: [
      { item: 'couch', x: -18, z: -25.45, color: '#e39a4c' },
      { item: 'coffeetable', x: -18, z: -23.8 },
      { item: 'roundrug', x: -18, z: -23.4, color: P.bubblegum },
      { item: 'tv', x: -19.6, z: -18.45, rot: 180 },
      { item: 'bookshelf', x: -20.75, z: -21.5, rot: 90 },
      { item: 'piano', x: -14.2, z: -25.5 },
      { item: 'bed', x: -10.1, z: -20.0, rot: -90, color: P.lavender },
      { item: 'toybox', x: -12.4, z: -21.4, rot: 90 },
      { item: 'teddy', x: -10.1, z: -20.4, y: 0.6 },
      { item: 'fridge', x: -9.45, z: -25.45 },
      { item: 'counter', x: -10.6, z: -25.6 },
      { item: 'stove', x: -11.6, z: -25.6 },
      { item: 'cat', x: -16.4, z: -21.6, rot: -30 },
    ],
  },
  {
    id: 'grocery-food', // more to buy at Kenwood Market
    furniture: [
      { item: 'shelf_cereal', x: -57.62, z: -25.5, rot: 90 },
      { item: 'shelf_snacks', x: -57.62, z: -32.1, rot: 90 },
      { item: 'shelf_drinks', x: -56.6, z: -33.62 },
      { item: 'shelf_drinks', x: -54.9, z: -33.62 },
      { item: 'shelf_cans', x: -49.0, z: -33.62 },
      { item: 'bakerycase', x: -44.75, z: -30.6, rot: -90 },
      { item: 'shelf_cans', x: -54, z: -37.62 },
      { item: 'shelf_snacks', x: -50, z: -37.62 },
      { item: 'watermelon', x: -43.0, z: -24.0 },
      { item: 'watermelon', x: -43.0, z: -24.5, color: '#5a9a4e' },
      { item: 'banana', x: -44.5, z: -25.5, y: 0.95 },
      { item: 'bread', x: -53.0, z: -24.9, y: 1.0 },
      { item: 'milk', x: -52.6, z: -24.2, y: 1.0 },
      { item: 'juice', x: -55.9, z: -24.2, y: 1.0, color: '#ef84ad' },
    ],
  },
  {
    id: 'woods',
    furniture: [
      { item: 'treehouse', x: -28, z: 38 },
      { item: 'tent', x: -53, z: 42.5, rot: 150 },
      { item: 'firepit', x: -49.5, z: 39.5 },
      { item: 'log', x: -49.5, z: 37.4 }, { item: 'log', x: -47.4, z: 39.8, rot: 90 }, { item: 'stump', x: -51.4, z: 38.2 },
      { item: 'picnictable', x: -54.5, z: 36.5, rot: 20 },
      { item: 'fairyhouse', x: 46, z: 40 },
      ...Array.from({ length: 10 }, (_, i) => ({ item: 'mushroom', x: 46 + Math.cos(i * 0.628) * 2.8, z: 40 + Math.sin(i * 0.628) * 2.8, color: i % 3 === 2 ? '#bba6e6' : '#d9443a' })),
      { item: 'berrybush', x: 11, z: 32.5 }, { item: 'berrybush', x: 13.2, z: 33.4, color: '#4f86c6' }, { item: 'berrybush', x: 12.2, z: 31.4 },
      { item: 'treasurechest', x: -60.5, z: 72.6, rot: 150 },
      { item: 'birdhouse', x: 63.6, z: 46.5 }, { item: 'birdhouse', x: 68.6, z: 51.0, color: '#93c9ea' },
      { item: 'bench', x: 25, z: 58.2, rot: 180 },
      { item: 'log', x: -4, z: 66.5, rot: 20 }, { item: 'stump', x: 2.6, z: 36.6 }, { item: 'stump', x: -15.5, z: 48 },
    ],
  },
  {
    id: 'grocery-cereal',
    furniture: [
      { item: 'cerealdisplay', x: -55, z: -27.7 },
      { item: 'cerealbowl', x: -53.0, z: -24.1, y: 1.0, color: '#ef84ad' },
    ],
  },
  {
    id: 'clocks', // digital clocks that show the real time
    furniture: [
      { item: 'digitalclock', x: -48.11, z: -56.5, y: 2.3, rot: -90 },
      { item: 'digitalclock', x: -4.5, z: -36.11, y: 2.45, rot: 180 },
      { item: 'digitalclock', x: 68.11, z: -31.5, y: 2.2, rot: 90 },
      { item: 'digitalclock', x: -50, z: -21.89, y: 2.8, rot: 180 },
    ],
  },
  {
    id: 'farm',
    furniture: [
      ...Array.from({ length: 12 }, (_, i) => ({ item: 'pumpkin', x: -91 + (i % 4) * 2.2 + Math.sin(i) * 0.4, z: -8 + Math.floor(i / 4) * 2.0, rot: i * 40 })),
      { item: 'haybale', x: -82.0, z: -38.0 }, { item: 'haybale', x: -83.2, z: -38.0, rot: 90 }, { item: 'haybale', x: -82.6, z: -38.0, y: 0.6 },
      { item: 'picnictable', x: -80, z: -12, rot: 10 },
    ],
  },
  {
    id: 'beach',
    furniture: [
      { item: 'umbrella', x: 106, z: 4 }, { item: 'loungechair', x: 106.8, z: 5.2, rot: -90, color: P.sky },
      { item: 'umbrella', x: 104, z: -20, color: P.sky }, { item: 'loungechair', x: 104.8, z: -18.8, rot: -90, color: P.butter },
      { item: 'umbrella', x: 107, z: 30, color: P.mint }, { item: 'loungechair', x: 107.8, z: 31.2, rot: -90, color: P.bubblegum },
      { item: 'sandcastle', x: 109, z: 14 }, { item: 'sandcastle', x: 110, z: -30 },
      { item: 'ball', x: 108, z: 9, color: P.butter }, { item: 'ball', x: 103, z: -26, color: P.bubblegum },
      { item: 'rug', x: 105, z: 18, rot: 90, color: P.coral }, { item: 'rug', x: 103, z: -6, rot: 90, color: P.sky },
      { item: 'bench', x: 98.5, z: 0, rot: 90 }, { item: 'picnictable', x: 99, z: 20, rot: 90 },
    ],
  },
  {
    id: 'funpark',
    furniture: [
      { item: 'cottoncandystand', x: 72.5, z: 104.5, rot: 90 }, { item: 'hotdogstand', x: 87.5, z: 104.5, rot: -90 },
      { item: 'icecreamcounter', x: 72.8, z: 132, rot: 90 }, { item: 'gamebooth', x: 74.2, z: 141, rot: 90 }, { item: 'gamebooth', x: 85.8, z: 141, rot: -90, color: '#93c9ea' },
      { item: 'balloons', x: 76.2, z: 101.5 }, { item: 'balloons', x: 83.8, z: 101.5, color: P.sky }, { item: 'balloons', x: 76, z: 146, color: P.mint },
      { item: 'flowerbed', x: 74, z: 99.5 }, { item: 'flowerbed', x: 86, z: 99.5 },
      { item: 'bench', x: 76.4, z: 118, rot: 90 }, { item: 'bench', x: 83.6, z: 118, rot: -90 }, { item: 'bench', x: 40, z: 129.6, rot: 180 },
      { item: 'bench', x: 92, z: 155.6, rot: 180 }, { item: 'picnictable', x: 70, z: 120 }, { item: 'picnictable', x: 89, z: 160 },
    ],
  },
  {
    id: 'pool',
    furniture: [
      { item: 'divingboard', x: 33, z: -51.0, rot: 180 },
      { item: 'loungechair', x: 25.6, z: -58.5, rot: 90, color: P.sky },
      { item: 'loungechair', x: 25.6, z: -55.5, rot: 90, color: P.bubblegum },
      { item: 'loungechair', x: 40.4, z: -58.5, rot: -90, color: P.butter },
      { item: 'umbrella', x: 25.6, z: -60.6 },
      { item: 'umbrella', x: 40.4, z: -56.0, color: P.sky },
      { item: 'ball', x: 31, z: -57, color: P.butter },
      { item: 'duck', x: 36, z: -55, color: P.butter },
    ],
  },
  {
    id: 'garden',
    furniture: [
      { item: 'flowerbed', x: 56, z: 21, rot: 30 },
      { item: 'flowerbed', x: 60, z: 19, rot: -20 },
      { item: 'bench', x: 58.5, z: 25.5, rot: 180 },
      { item: 'balloons', x: 61.5, z: 24, color: P.butter },
    ],
  },
];

// Named outdoor places (for the banner when you walk in)
export const ZONES = [
  { name: 'Sunny Park', icon: '🌳', x: 23, z: -46, w: 30, d: 28 },
  { name: 'Kenwood Ave', icon: '🚗', x: -66, z: -16.5, w: 152, d: 9 },
  { name: 'School Parking Lot', icon: '🚌', x: -34, z: -50, w: 14, d: 16 },
  { name: 'Lessenger Lane', icon: '🏫', x: -30.5, z: -67, w: 7, d: 17 },
  { name: 'Maple Drive', icon: '🍁', x: 84, z: -76, w: 14, d: 62 },
  { name: 'Birch Lane', icon: '🌲', x: -76, z: -76, w: 14, d: 62 },
  { name: 'Willow Way', icon: '🌳', x: -62, z: -76, w: 146, d: 12 },
  { name: 'Front Yard', icon: '🌷', x: -1, z: -7.5, w: 19, d: 7.5 },
  { name: 'Back Yard', icon: '🌼', x: -1, z: 8, w: 19, d: 8 },
  { name: 'Secret Garden', icon: '🌸', x: 52, z: 16, w: 13, d: 14 },
  { name: 'School Playground', icon: '🏀', x: 6, z: -48, w: 15, d: 12 },
  { name: 'Lessenger Elementary', icon: '🏫', x: -20, z: -36, w: 26, d: 5 },
  { name: 'Kenwood Pool', icon: '🏊', x: 24, z: -64, w: 18, d: 14 },
  { name: 'PepCity Fun Park', icon: '🎢', x: -45, z: 92, w: 180, d: 110 },
  { name: 'Fun Park Dr', icon: '🎡', x: 76, z: -7, w: 8, d: 93 },
  { name: 'PepCity Farm', icon: '🚜', x: -108, z: -64, w: 34, d: 68 },
  { name: 'Lighthouse Pier', icon: '🗼', x: 112, z: 8, w: 30, d: 4 },
  { name: 'Great Lake Beach', icon: '🏖️', x: 94, z: -110, w: 120, d: 200 },
  { name: 'The Treehouse', icon: '🌳', x: -34, z: 32, w: 12, d: 12 },
  { name: 'Fairy Ring', icon: '🍄', x: 39, z: 34, w: 12, d: 12 },
  { name: 'Campsite', icon: '🏕️', x: -58, z: 32, w: 16, d: 16 },
  { name: 'Deer Meadow', icon: '🦌', x: -16, z: 50, w: 22, d: 22 },
  { name: 'Owl Hollow', icon: '🦉', x: 60, z: 42, w: 12, d: 12 },
  { name: 'Frog Pond', icon: '🐸', x: 17, z: 42, w: 16, d: 16 },
  { name: 'Kenwood Woods', icon: '🌲', x: -140, z: 20, w: 300, d: 90 },
  { name: 'Kenwood Woods', icon: '🌲', x: -140, z: -130, w: 70, d: 150 },
  { name: 'Kenwood Woods', icon: '🌲', x: 93, z: -130, w: 60, d: 150 },
  { name: 'Kenwood Woods', icon: '🌲', x: -70, z: -130, w: 163, d: 57 },
];

// Golden stars to find! [x, y, z]
export const STARS = [
  [10.5, 0.7, 12.0],   // back yard, past the swing
  [4.9, 0.8, 1.2],     // home bathroom, by the bathtub
  [9.6, 0.6, 4.4],     // home kitchen corner
  [8.0, 0.4, 1.9],     // under the dining table
  [38.2, 0.6, 8.3],    // Dream House kids room
  [2.8, 0.6, -25.3],   // ice cream shop, next to the counter
  [9.5, 1.85, -21.6],  // toy shop, on top of a shelf
  [28.5, 1.7, -22.8],  // top of the slide
  [37.5, 2.5, -24.0],  // fountain
  [-13, 0.7, 10.0],    // behind the Blue House
  [-15, 0.7, -28.5],   // behind the Yellow House
  [58.5, 0.7, 23.0],   // secret garden
  [21.1, 0.6, 6.1],    // in the garage
  [4.8, 0.5, -46.4],   // school library corner
  [19.15, 2.65, -40.5], // in the basketball hoop!
  [33, -0.2, -58.5],    // at the bottom of the pool!
  [80.6, 1.0, -31.3],   // on a fire station bunk bed
  [-56.5, 0.6, -36.5],  // in the grocery stock room
  [-28, 3.75, 38],      // up in the treehouse!
  [46, 1.7, 40],        // on top of the fairy house
  [-60.5, 0.6, 73.6],   // next to the hidden treasure chest
  [65.4, 0.6, -39.4],   // hospital x-ray room
  [57.3, 0.6, -53.6],   // library corner
  [-49.4, 0.6, 7.4],    // movie theater
  [-89.5, 0.6, -5.5],   // pumpkin patch
  [137, 0.7, 10],       // end of the lighthouse pier
  [55, 27.4, 114.85],   // top of the Ferris wheel (ride it!)
  [27.8, 25.0, 139],    // top of the Thunder Loop's big hill (ride it!)
  [102.7, 32.3, 165],   // top of the drop tower (ride it!)
];

// Swimming pools: [x0, z0, x1, z1] of the water
export const POOLS = [[27, -61, 39, -53]];

export const WORLD_BOUNDS = { minX: -110, maxX: 140, minZ: -105, maxZ: 200 };

// ---------- PepCity Fun Park (north of town, up Fun Park Dr) ----------
export const FUNPARK = {
  roadX: 80, road: [-7.4, 86], bridgeZ: 51.8,
  lot: [70, 86, 90, 96.5], gate: [80, 98],
  paths: [[78, 98, 82, 175], [8, 124, 112, 128], [30, 150, 110, 154], [8, 107, 12, 126], [48, 154, 52, 163.5], [111, 110, 115, 124]],
  coasters: {
    thunder: [[0, 1.5, 104], [12, 1.5, 104], [21, 1.6, 105.5], [27, 2.5, 111], [28.5, 7, 119], [28.5, 14, 127], [28.3, 21, 134], [27.8, 24, 139], [26.8, 21, 143.5],
      [25.8, 10, 150], [25, 2.5, 156], [23.5, 3, 163], [19, 4, 170], [13, 2, 176.5], [2.00, 1.50, 177.00], [-3.66, 3.84, 177.45], [-6.00, 9.50, 177.90], [-3.66, 15.16, 178.35], [2.00, 17.50, 178.80], [7.66, 15.16, 179.25], [10.00, 9.50, 179.70], [7.66, 3.84, 180.15], [2.00, 1.50, 180.60],
      [-10, 2.5, 181], [-21, 5, 181.5], [-30, 7, 177], [-34.5, 9, 168], [-35, 12, 158], [-34, 4.5, 148], [-33, 7.5, 138], [-30, 3, 127], [-24, 2, 115], [-14, 1.6, 106.5], [-6, 1.5, 104]],
    dragon: [[44, 1.4, 166], [56, 1.4, 166], [64, 2.5, 167.5], [69, 6, 172], [70, 8, 178], [67, 7, 184], [60, 2.5, 188], [52, 5, 188.5], [45, 1.6, 186], [41, 4, 180], [40, 3.5, 173], [41, 1.5, 168.5]],
    kiddie: [[110, 1, 106], [118, 1, 106], [123.5, 2, 108.5], [125.5, 1.5, 114], [123, 2.2, 120], [116, 1.2, 121.5], [109.5, 1.8, 119], [106.5, 1.2, 112]],
  },
  ferris: [55, 115], carousel: [95, 116], swings: [95, 138], teacups: [112, 142], drop: [100, 165], pirate: [66, 160], bumper: [52, 140],
};


// The farm (west) and the beach on the Great Lake (east)
export const FARM = { pen: [-100, -36, -80, -16], gate: [-26.5, -23.5], corn: [-106, -12, -96, 4], road: [-88, -48.5, -72.5, -45.5] };
export const BEACH = { sand: 96, shore: 113, swimTo: 122, pier: { x0: 111, x1: 139, z: 10, w: 2.6 }, lot: [93.4, -16, 100, -6] };

// ---------- Kenwood Woods ----------
export const WOODS = {
  loopRect: { x0: -70, x1: 90, z0: -70, z1: -12 },
  townStrip: { x0: -30, x1: 72, z0: -9, z1: 22 }, // the houses and their yards: no forest here
  clearRects: [[-108, -64, -74, 6], [95, -200, 400, 200], [-45, 90, 135, 210], [75, -9, 85, 92]], // the farm, the beach, the fun park and its road
  trails: [
    [[5, 17], [5, 28], [2, 38], [-12, 45], [-30, 47], [-48, 52], [-55, 62], [-40, 70], [-15, 72], [8, 66], [28, 60], [48, 63], [68, 58], [80, 46], [70, 36], [60, 31]],
    [[2, 38], [14, 42], [19.5, 45.5]],    // to the frog pond
    [[-13, 15], [-14, 28], [-12, 45]],    // from behind the Blue House
    [[-30, 47], [-28.5, 41]],             // to the treehouse
    [[48, 63], [46, 44]],                 // to the fairy ring
    [[-48, 52], [-50, 45]],               // to the campsite
    [[68, 58], [66, 52]],                 // to owl hollow
  ],
  creeks: [
    [[-128, 60], [-95, 64], [-75, 60], [-60, 58], [-35, 57], [-12, 55], [6, 53], [19.5, 51]],
    [[30.5, 50], [50, 53], [75, 51], [100, 55], [140, 52]],
  ],
  pond: { x: 25, z: 50, r: 6 },
  owlTree: { x: 66, z: 48 },
  clearings: [
    { x: -28, z: 38, r: 5 }, { x: 45, z: 40, r: 5.5 }, { x: -50, z: 40, r: 7 }, { x: -5, z: 61, r: 10, meadow: true },
    { x: 12, z: 33, r: 3.5 }, { x: -60.5, z: 72.5, r: 2.5 }, { x: 25, z: 58.5, r: 2 },
  ],
  signs: [
    { text: 'Kenwood Woods', x: 6.6, z: 19, rot: 0 }, { text: 'Kenwood Woods', x: -11.4, z: 17, rot: 0 }, { text: 'Kenwood Woods', x: 61.6, z: 30.5, rot: 180 },
    { text: 'Frog Pond', x: 3.6, z: 39.6, rot: 70, w: 1.8 }, { text: 'Treehouse', x: -31.6, z: 46, rot: 0, w: 1.8 },
    { text: 'Campsite', x: -46.5, z: 51.5, rot: 0, w: 1.8 }, { text: 'Fairy Ring', x: 49.5, z: 61.6, rot: 0, w: 1.8 }, { text: 'Owl Hollow', x: 69.5, z: 57, rot: 0, w: 1.8 },
  ],
  deer: [[-5, 60, true], [-2, 64, false], [-9, 63, false], [-80, 20, true], [95, 10, false], [40, -90, false], [-90, -40, true]],
  foxes: [[30, 70], [-70, 50], [105, -30], [-20, -88]],
  squirrels: [[0, 30], [-20, 40], [35, 66], [55, 45], [-40, 62], [80, 40], [-85, -10], [110, 20]],
  owls: [[67.4, 4.55, 48.3], [-28, 5.72, 37.6]],
  fireflies: [[45, 40], [-5, 55], [25, 50], [-50, 40]],
};

// The big road loop: Kenwood Ave (z = -12) is the top side; it goes all the way around town.
export const LOOP = { x0: -70, x1: 90, z0: -70, z1: -12, R: 14 };
export const ROAD_WIDTH = 6;

// ---------- people who live here (they walk around town) ----------
// path: points to walk between. loop: true walks round and round, otherwise back and forth.
const SW_HOME = -8.65, SW_SHOP = -15.35; // the two sidewalks
export const PEOPLE = [
  { name: 'Mrs. Rose', look: { age: 'grownup', body: 'girl', skin: '#e0ac85', hair: 'bun', hairColor: '#d9d4cc', top: 'long', topColor: '#bba6e6', bottom: 'skirt', bottomColor: '#6f819a', face: 'glasses' },
    path: [[-40, SW_HOME], [37.5, SW_HOME], [37.5, SW_SHOP], [-40, SW_SHOP]], loop: true, speed: 0.9, dog: true },
  { name: 'Mr. Patel', look: { age: 'grownup', body: 'boy', skin: '#a8714f', hair: 'short', hairColor: '#2a2420', beard: 'mustache', top: 'tee', topColor: '#5fb3a8', bottom: 'pants', bottomColor: '#4a4a55' },
    path: [[50, SW_SHOP], [15, SW_SHOP], [15, SW_HOME], [50, SW_HOME]], loop: true, speed: 1.2 },
  { name: 'Jogger Jen', look: { age: 'grownup', body: 'girl', skin: '#f1c7a3', hair: 'ponytail', hairColor: '#e0b25a', top: 'tank', topColor: '#ef84ad', bottom: 'shorts', bottomColor: '#3b3b48', hat: 'cap' },
    path: [[-44, SW_SHOP], [60, SW_SHOP], [60, SW_HOME], [-44, SW_HOME]], loop: true, speed: 2.6, run: true },
  { name: 'Sam', look: { age: 'kid', body: 'boy', skin: '#8a5a3c', hair: 'curly', hairColor: '#1f1a17', top: 'hoodie', topColor: '#f2a25f', bottom: 'shorts', bottomColor: '#5b8fd9', back: 'backpack' },
    path: [[-6.5, SW_SHOP], [-6.5, -34.4], [-3, -35.0]], speed: 1.0 },
  { name: 'Lily', look: { age: 'kid', body: 'girl', skin: '#f6d3b8', hair: 'pigtails', hairColor: '#b5562f', top: 'dress', topColor: '#aee0c5', hat: 'bow', extraColor: '#ef84ad' },
    path: [[37.5, -16.6], [37.5, -21.3], [40.1, -24], [37.5, -26.7], [37.5, -30], [28.5, -30]], speed: 0.9 },
  { name: 'Grandpa Joe', look: { age: 'grownup', body: 'boy', skin: '#e9b896', hair: 'buzz', hairColor: '#e8e4dc', beard: 'beard', top: 'long', topColor: '#a0745a', bottom: 'pants', bottomColor: '#6b5a4a', hat: 'cap' },
    path: [[40.5, -38.6], [48.5, -38.6], [51, -34]], speed: 0.6 },
  { name: 'Maya', look: { age: 'kid', body: 'girl', skin: '#c68c64', hair: 'long', hairColor: '#2a1d16', top: 'tee', topColor: '#f7da7e', bottom: 'pants', bottomColor: '#bba6e6', back: 'wings' },
    path: [[8.0, -46.6], [19.4, -46.6], [19.4, -37.4], [8.0, -37.4]], loop: true, speed: 1.6, run: true },
  { name: 'Ms. Kim', look: { age: 'grownup', body: 'girl', skin: '#f0cfae', hair: 'bob', hairColor: '#1b1b1f', top: 'long', topColor: '#ec7d72', bottom: 'pants', bottomColor: '#2f3a4a' },
    path: [[1.0, -16.8], [14.0, -16.8]], speed: 0.8 },
  { name: 'Firefighter Fran', look: { age: 'grownup', body: 'girl', skin: '#c68c63', hair: 'ponytail', hairColor: '#2b2220', top: 'long', topColor: '#d9443a', bottom: 'pants', bottomColor: '#3b3b48', hat: 'cap' },
    path: [[84.5, -47], [84.5, -30]], speed: 0.9 },
  // ---- Mom and Dad, out for a walk together (same 'together' time, side by side) ----
  { name: 'Dad', together: 5, lane: -0.45, path: [[15, -1.6], [15, -7.9], [37.5, -7.9], [37.5, -21.0]], speed: 0.85,
    says: ['Hi kiddo! 😄', 'Want to go get ice cream? 🍦', 'Who wants a piggyback ride? 🐴', 'Love you, {name}! 💙', "Let's go to the park! 🌳"],
    look: { age: 'grownup', body: 'boy', skin: '#eab996', eyes: '#5a3d2b', hair: 'short', hairColor: '#3b2418', beard: 'beard',
      top: 'hoodie', topColor: '#2b3140', bottom: 'pants', bottomColor: '#5b7fb0', shoes: '#2a2727', hat: 'none' } },
  { name: 'Mom', together: 5, lane: 0.45, path: [[15, -1.6], [15, -7.9], [37.5, -7.9], [37.5, -21.0]], speed: 0.85,
    says: ['Hi sweetie! 💕', 'I love you to the moon and back! 🌙', 'Did you brush your teeth? 🪥', "Let's find some golden stars! ⭐", 'Want a snack? 🍎'],
    look: { age: 'grownup', body: 'girl', skin: '#f3c9a8', eyes: '#6b5a3c', hair: 'ponytail', hairColor: '#5a3a26',
      top: 'long', topColor: '#4a3a6e', bottom: 'pants', bottomColor: '#5b7fb0', shoes: '#fbfaf7', hat: 'none' } },

  // ---- people who live in the Blue House and the Yellow House ----
  { name: 'Grandma Bea', job: 'read', at: [-16.3, 7.3], face: 180, seatY: 0.5, says: ['Welcome to our house, dear! 💙', 'Would you like a cookie? 🍪', 'I love a good book! 📖'],
    look: { age: 'grownup', body: 'girl', skin: '#f1c7a3', hair: 'bun', hairColor: '#e8e4dc', top: 'long', topColor: '#bba6e6', bottom: 'skirt', bottomColor: '#6f819a', face: 'glasses', hat: 'none' } },
  { name: 'Grandpa Walt', job: 'cook', at: [-9.6, 6.95], face: 0, says: ['Making my famous soup! 🍲', 'Smells good, huh? 😋'],
    look: { age: 'grownup', body: 'boy', skin: '#e9b896', hair: 'buzz', hairColor: '#e8e4dc', beard: 'mustache', top: 'tee', topColor: '#93c9ea', bottom: 'pants', bottomColor: '#6b5a4a', hat: 'none' } },
  { name: 'Mr. Sunny', job: 'read', at: [-17.4, -25.35], face: 0, seatY: 0.5, says: ['Hi neighbor! 👋', 'Come in, come in! 💛'],
    look: { age: 'grownup', body: 'boy', skin: '#9a6440', hair: 'curly', hairColor: '#2b2220', top: 'hoodie', topColor: '#f7da7e', bottom: 'pants', bottomColor: '#3f5f8f', hat: 'none' } },
  { name: 'Penny', job: 'type', at: [-14.2, -24.7], face: 180, says: ['Listen to me play! 🎹', 'I am practicing piano! 🎶'],
    look: { age: 'kid', body: 'girl', skin: '#9a6440', hair: 'pigtails', hairColor: '#2b2220', top: 'dress', topColor: '#f7da7e', hat: 'bow', extraColor: '#ef84ad' } },
  { name: 'Mrs. Sunny', job: 'cook', at: [-11.6, -25.05], face: 180, says: ['Lunch is almost ready! 🥪', 'Want some lemonade? 🍋'],
    look: { age: 'grownup', body: 'girl', skin: '#c68c63', hair: 'long', hairColor: '#2b2220', top: 'long', topColor: '#ef84ad', bottom: 'pants', bottomColor: '#5b7fb0', hat: 'none' } },

  // ---- people at the hospital, library, cinema, farm and beach ----
  { name: 'Dr. Hart', job: 'wave', at: [56.9, -35.4], face: -120, says: ['Time for your checkup! 🩺', 'Eat your veggies and stay healthy! 🥦', 'Hop on the bed and say ahhh! 👅'],
    look: { age: 'grownup', body: 'girl', skin: '#c68c63', hair: 'bun', hairColor: '#2b2220', top: 'long', topColor: '#fbfaf7', bottom: 'pants', bottomColor: '#5fb3a8', face: 'glasses', hat: 'none' } },
  { name: 'Nurse Daisy', job: 'type', at: [57.5, -32.45], face: 0, says: ['Welcome to the hospital! 🏥', 'The doctor will see you now! 🩺', 'Feel better soon! 💖'],
    look: { age: 'grownup', body: 'girl', skin: '#f1c7a3', hair: 'ponytail', hairColor: '#d9a95a', top: 'tee', topColor: '#93c9ea', bottom: 'pants', bottomColor: '#93c9ea', hat: 'none' } },
  { name: 'Mr. Booker', job: 'type', at: [49.0, -60.9], face: 180, says: ['Welcome to the library! 📚', 'Try reading a storybook! 📖', 'Shhh, quiet voices please! 🤫'],
    look: { age: 'grownup', body: 'boy', skin: '#6b4128', hair: 'short', hairColor: '#c9c4bf', beard: 'beard', top: 'long', topColor: '#a0745a', bottom: 'pants', bottomColor: '#3b3b48', face: 'glasses', hat: 'none' } },
  { name: 'Ticket Tina', job: 'wave', at: [-44.9, -1.7], face: 180, says: ['Welcome to the movies! 🎬', 'Grab some popcorn! 🍿', 'The movie is starting! 🎞️'],
    look: { age: 'grownup', body: 'girl', skin: '#e0ac84', hair: 'curly', hairColor: '#a8592f', top: 'tee', topColor: '#d9443a', bottom: 'skirt', bottomColor: '#2a2727', hat: 'cap', extraColor: '#d9443a' } },
  { name: 'Farmer Ruth', job: 'wave', at: [-78.6, -27.5], face: -90, says: ['Welcome to the farm! 🚜', 'Moo! Meet my cows! 🐄', 'Want to pick a pumpkin? 🎃'],
    look: { age: 'grownup', body: 'girl', skin: '#e0ac84', hair: 'pigtails', hairColor: '#a8592f', top: 'long', topColor: '#d9443a', bottom: 'pants', bottomColor: '#3f5f8f', hat: 'cap', extraColor: '#f2cf63' } },
  { name: 'Farmer Hank', job: 'cook', at: [-90.8, -37.0], face: 0, says: ['Feeding time for the animals! 🌾', 'The tractor is in the barn! 🚜'],
    look: { age: 'grownup', body: 'boy', skin: '#e9b896', hair: 'short', hairColor: '#7a4a2c', beard: 'beard', top: 'long', topColor: '#4f86c6', bottom: 'pants', bottomColor: '#3f5f8f', hat: 'cap', extraColor: '#4f8a46' } },
  { name: 'Lifeguard Leo', job: 'whistle', at: [109.5, -8.2], face: 90, says: ['Swim safe in the lake! 🌊', 'Stay where I can see you! 👀'],
    look: { age: 'grownup', body: 'boy', skin: '#c68c63', hair: 'spiky', hairColor: '#f1d69a', top: 'tank', topColor: '#d9443a', bottom: 'shorts', bottomColor: '#d9443a', face: 'sunglasses' } },
  { name: 'Coral', job: 'cook', at: [108.2, 14.6], face: 135, says: ['I built a sandcastle! 🏰', 'Want to look for seashells? 🐚'],
    look: { age: 'kid', body: 'girl', skin: '#f1c7a3', hair: 'ponytail', hairColor: '#d9a95a', top: 'tank', topColor: '#ef84ad', bottom: 'shorts', bottomColor: '#93c9ea', hat: 'cap', extraColor: '#f7da7e' } },
  { name: 'Beach Bob', path: [[101, -60], [101, 60]], speed: 0.8, says: ['What a beautiful lake! 🌊', 'The water is chilly! 🥶'],
    look: { age: 'grownup', body: 'boy', skin: '#e9b896', hair: 'buzz', hairColor: '#7a4a2c', top: 'tank', topColor: '#f7da7e', bottom: 'shorts', bottomColor: '#5fb3a8', hat: 'cap', extraColor: '#fbfaf7' } },

  // ---- people at the Fun Park ----
  { name: 'Bubbles the Clown', job: 'juggle', at: [80, 112], face: 180, says: ['Honk honk! 🤡', 'Want to see me juggle? 🎪', 'Ride the Thunder Loop if you dare! 🎢'],
    look: { age: 'grownup', body: 'boy', skin: '#fbe3cf', hair: 'curly', hairColor: '#ec7d72', top: 'hoodie', topColor: '#bba6e6', bottom: 'pants', bottomColor: '#f7da7e', hat: 'cap', extraColor: '#d9443a' } },
  { name: 'Rita', job: 'wave', at: [58.3, 120.5], face: 150, says: ['Hop on the Ferris wheel! 🎡', 'You can see the whole city from the top! 🌆'],
    look: { age: 'grownup', body: 'girl', skin: '#c68c63', hair: 'ponytail', hairColor: '#2b2220', top: 'tee', topColor: '#ef84ad', bottom: 'pants', bottomColor: '#3b3b48', hat: 'cap', extraColor: '#ef84ad' } },
  { name: 'Coaster Carl', job: 'wave', at: [9.5, 108.5], face: 0, says: ['Keep your hands inside the car! 🎢', 'The Thunder Loop goes upside down! 🌀'],
    look: { age: 'grownup', body: 'boy', skin: '#f1c7a3', hair: 'short', hairColor: '#4a2f22', beard: 'beard', top: 'tee', topColor: '#d9443a', bottom: 'pants', bottomColor: '#3b3b48', hat: 'cap', extraColor: '#d9443a' } },
  { name: 'Cora', job: 'type', at: [71.6, 104.5], face: 90, says: ['Cotton candy! Pink or blue? 🍭', 'So fluffy and sweet! ☁️'],
    look: { age: 'grownup', body: 'girl', skin: '#fbe3cf', hair: 'bun', hairColor: '#ef84ad', top: 'tee', topColor: '#ef84ad', bottom: 'skirt', bottomColor: '#fbfaf7', hat: 'none' } },
  { name: 'Fun Park Fran', path: [[80, 100], [80, 152], [40, 152], [40, 126], [80, 126]], loop: true, speed: 0.9, says: ['Best day ever! 🎉', 'Did you ride the Ferris wheel? 🎡'],
    look: { age: 'grownup', body: 'girl', skin: '#e0ac84', hair: 'long', hairColor: '#a8592f', top: 'tee', topColor: '#aee0c5', bottom: 'shorts', bottomColor: '#5b7fb0', hat: 'none' } },
  { name: 'Timmy', path: [[80, 126], [110, 126], [110, 152], [80, 152]], loop: true, speed: 1.4, run: true, says: ['I rode EVERYTHING! 🎢', 'Let us go on the teacups! ☕'],
    look: { age: 'kid', body: 'boy', skin: '#9a6440', hair: 'curly', hairColor: '#2b2220', top: 'tee', topColor: '#f7da7e', bottom: 'shorts', bottomColor: '#5b8fd9', hat: 'cap', extraColor: '#ec7d72' } },

  // ---- people at work (at: where they stand, face: which way, in degrees like furniture) ----
  { name: 'Officer Dan', job: 'directing', at: [-23.4, -57.5], face: -90, says: ['Officer Dan, keeping you safe! 👮', 'Slow down near the school! 🚸'],
    look: { age: 'grownup', body: 'boy', skin: '#f1c7a3', hair: 'short', hairColor: '#4a2f22', top: 'long', topColor: '#2e4a7a', bottom: 'pants', bottomColor: '#2a2a33', hat: 'cap', extraColor: '#2e4a7a' } },
  { name: 'Officer Molly', job: 'clipboard', at: [83.0, -56.3], face: 90, says: ['Officer Molly at your service! 👮‍♀️', 'Remember to buckle up! 🚓'],
    look: { age: 'grownup', body: 'girl', skin: '#c68c63', hair: 'bun', hairColor: '#2b2220', top: 'long', topColor: '#2e4a7a', bottom: 'pants', bottomColor: '#2a2a33', hat: 'cap', extraColor: '#2e4a7a' } },
  { name: 'Firefighter Fred', job: 'spray', at: [84.8, -43.5], face: -90, says: ['Washing the fire truck! 🚒', 'Never play with matches! 🔥', 'Want to slide down the fire pole? 🧯'],
    look: { age: 'grownup', body: 'boy', skin: '#e0ac84', hair: 'short', hairColor: '#a8592f', beard: 'mustache', top: 'long', topColor: '#d9443a', bottom: 'pants', bottomColor: '#3b3b48', hat: 'cap', extraColor: '#f2cf63' } },
  { name: 'Chef Tony', job: 'toss', at: [-9, -53.9], face: 180, says: ['Fresh pizza, coming right up! 🍕', 'Want extra cheese? 🧀', 'Mamma mia! 👨‍🍳'],
    look: { age: 'grownup', body: 'boy', skin: '#e0ac84', hair: 'short', hairColor: '#2b2220', beard: 'mustache', top: 'tee', topColor: '#fbfaf7', bottom: 'pants', bottomColor: '#3b3b48', hat: 'cap', extraColor: '#fbfaf7' } },
  { name: 'Cashier Kim', job: 'type', at: [-55.5, -25.35], face: 0, says: ['Did you find everything okay? 🛒', 'Have a great day! 😊', 'Beep! Beep! Scanning! 🧾'],
    look: { age: 'grownup', body: 'girl', skin: '#f0cfae', hair: 'ponytail', hairColor: '#1b1b1f', top: 'tee', topColor: '#4f8a46', bottom: 'pants', bottomColor: '#3f5f8f' } },
  { name: 'Pet Keeper Pat', job: 'wave', at: [6.3, -53.6], face: 180, says: ['Want to adopt a pet? 🐾', 'The bunnies love carrots! 🥕', 'Feed the fish, they are hungry! 🐠'],
    look: { age: 'grownup', body: 'girl', skin: '#9a6440', hair: 'curly', hairColor: '#2b2220', top: 'tee', topColor: '#aee0c5', bottom: 'pants', bottomColor: '#5b7fb0' } },
  { name: 'Ms. Lopez', job: 'point', at: [-17.5, -42.9], face: 90, says: ['Welcome to class! 📚', 'What is 2 + 2? 🤔', 'Great job today! ⭐', 'Time for recess! 🛝'],
    look: { age: 'grownup', body: 'girl', skin: '#c68c63', hair: 'long', hairColor: '#2b2220', top: 'dress', topColor: '#bba6e6', face: 'glasses' } },
  { name: 'Crossing Guard Gary', job: 'stop', at: [13.5, -16.2], face: 0, says: ['Stop! Look both ways! 🛑', 'Be safe crossing the street! 🚸'],
    look: { age: 'grownup', body: 'boy', skin: '#f1c7a3', hair: 'buzz', hairColor: '#c9c4bf', top: 'hoodie', topColor: '#f2a25f', bottom: 'pants', bottomColor: '#3b3b48', hat: 'cap', extraColor: '#f2a25f' } },
  { name: 'Lifeguard Lucy', job: 'whistle', at: [40.7, -52.4], face: -122, says: ['No running by the pool! 🏊', 'Splash safely! 💦', 'Tweet! Tweet! 😎'],
    look: { age: 'grownup', body: 'girl', skin: '#e0ac84', hair: 'ponytail', hairColor: '#d9a95a', top: 'tank', topColor: '#d9443a', bottom: 'shorts', bottomColor: '#d9443a', face: 'sunglasses' } },
  { name: 'Izzy', job: 'wave', at: [-0.7, -25.5], face: 0, says: ['What flavor do you want? 🍦', 'Sprinkles make everything better! 🌈'],
    look: { age: 'grownup', body: 'girl', skin: '#fbe3cf', hair: 'pigtails', hairColor: '#ef84ad', top: 'tee', topColor: '#ef84ad', bottom: 'skirt', bottomColor: '#fbfaf7', hat: 'bow', extraColor: '#fbfaf7' } },
  { name: 'Toby', job: 'wave', at: [14, -25.6], face: 0, says: ['Have you seen the new dino toy? 🦖', 'The robots are my favorite! 🤖'],
    look: { age: 'grownup', body: 'boy', skin: '#6b4128', hair: 'curly', hairColor: '#1b1b1f', top: 'tee', topColor: '#93c9ea', bottom: 'pants', bottomColor: '#3f5f8f', face: 'glasses' } },
  { name: 'Omar', job: 'sittype', at: [-50.5, -56.3], face: 180, says: ['Busy busy busy! 💻', 'Time for a snack break! 🍪'],
    look: { age: 'grownup', body: 'boy', skin: '#a8714f', hair: 'short', hairColor: '#2b2220', beard: 'beard', top: 'long', topColor: '#fbfaf7', bottom: 'pants', bottomColor: '#3b3b48' } },
  { name: 'Mail Carrier Mel', job: 'mail', path: [[-20, -7.75], [40, -7.75]], speed: 0.9, says: ['Mail delivery! 📬', 'I have a letter for you! 💌'],
    look: { age: 'grownup', body: 'girl', skin: '#f1c7a3', hair: 'bob', hairColor: '#a8592f', top: 'tee', topColor: '#5b8fd9', bottom: 'shorts', bottomColor: '#3f5f8f', hat: 'cap', extraColor: '#5b8fd9' } },
  { name: 'Mr. Green', look: { age: 'grownup', body: 'boy', skin: '#9a6440', hair: 'buzz', hairColor: '#c9c4bf', beard: 'beard', top: 'tee', topColor: '#4f8a46', bottom: 'pants', bottomColor: '#5b7fb0' },
    path: [[-57, -18.5], [-44.5, -18.5]], speed: 0.7 },
  { name: 'Leo', look: { age: 'kid', body: 'boy', skin: '#f1c7a3', hair: 'spiky', hairColor: '#e0b25a', top: 'tee', topColor: '#ec7d72', bottom: 'shorts', bottomColor: '#4f8a46', face: 'freckles' },
    path: [[24.5, -2.0], [24.5, -7.6], [-20, -7.6], [-20, -2.0]], loop: true, speed: 1.3 },
];

// ---------- kids at school and grown-ups at the office ----------
const KID_NAMES = ['Emma', 'Noah', 'Olivia', 'Liam', 'Ava', 'Mason', 'Sophia', 'Ethan', 'Mia', 'Lucas', 'Chloe', 'Jack', 'Zoe', 'Ben', 'Ella', 'Max', 'Ruby', 'Owen'];
const SKINS = ['#fbe3cf', '#f1c7a3', '#e0ac84', '#c68c63', '#9a6440', '#6b4128'];
const HAIR_COLORS = ['#2b2220', '#4a2f22', '#7a4a2c', '#a8592f', '#d9a95a', '#f1d69a'];
const SHIRTS = ['#ef84ad', '#93c9ea', '#f7da7e', '#aee0c5', '#bba6e6', '#ec7d72', '#f2a25f', '#5fb3a8', '#4f86c6'];
function kidLook(i) {
  const girl = i % 2 === 0;
  return {
    age: 'kid', body: girl ? 'girl' : 'boy', skin: SKINS[(i * 5) % 6], hairColor: HAIR_COLORS[(i * 7) % 6],
    hair: girl ? ['long', 'ponytail', 'pigtails', 'bun', 'bob', 'curly'][i % 6] : ['short', 'spiky', 'buzz', 'curly'][i % 4],
    top: ['tee', 'hoodie', 'long', 'tee'][i % 4], topColor: SHIRTS[i % SHIRTS.length],
    bottom: girl && i % 4 === 0 ? 'skirt' : ['pants', 'shorts'][i % 2], bottomColor: ['#5b7fb0', '#3f5f8f', '#bba6e6', '#4f8a46'][i % 4],
    hat: i % 5 === 1 ? 'bow' : 'none', face: i % 6 === 3 ? 'glasses' : 'none', extraColor: SHIRTS[(i + 3) % SHIRTS.length],
  };
}
const KID_SAYS = ['Hi! Are you new here? 👋', 'I love recess! 🛝', 'Math is my favorite! ➕', "Let's play tag at recess! 🏃", 'I got a gold star today! ⭐', 'Shhh, I\u2019m working! ✏️'];
let kid = 0;
const nextKid = (extra) => { const i = kid++; return { name: KID_NAMES[i % KID_NAMES.length], look: kidLook(i), says: KID_SAYS, ...extra }; };

// classroom: students at their desks (the desk's seat is 0.42 behind it, facing the chalkboard)
for (const [x, z] of [[-15.6, -45.5], [-14.1, -45.5], [-15.6, -43.6], [-12.6, -43.6], [-14.1, -41.7], [-12.6, -41.7], [-15.6, -41.7]]) {
  PEOPLE.push(nextKid({ job: 'student', at: [x + 0.42, z], face: -90, seatY: 0.415 }));
}
// art room: painting at the easels, coloring at the little table
PEOPLE.push(nextKid({ job: 'paint', at: [-9.45, -45.05], face: -135, says: ['Look at my painting! 🎨', "I'm painting a rainbow! 🌈"] }));
PEOPLE.push(nextKid({ job: 'paint', at: [-8.0, -45.3], face: 180, says: ['Look at my painting! 🎨', "It's a dinosaur! 🦖"] }));
PEOPLE.push(nextKid({ job: 'paint', at: [-6.15, -45.05], face: 135, says: ['Look at my painting! 🎨', 'I used ALL the colors! 🖍️'] }));
PEOPLE.push(nextKid({ job: 'student', at: [-8.3, -42.8], face: 90, seatY: 0.33 }));
PEOPLE.push(nextKid({ job: 'student', at: [-6.7, -42.8], face: -90, seatY: 0.33 }));
PEOPLE.push({ name: 'Mr. Rivera', job: 'wave', at: [-5.4, -41.0], face: -150, says: ['Welcome to art class! 🎨', 'Every artist was first a beginner! ✨'],
  look: { age: 'grownup', body: 'boy', skin: '#c68c63', hair: 'curly', hairColor: '#2b2220', beard: 'beard', top: 'tee', topColor: '#bba6e6', bottom: 'pants', bottomColor: '#3b3b48', hat: 'none' } });
// library: reading on the bean bags
PEOPLE.push(nextKid({ job: 'read', at: [-0.5, -44.6], face: 30, seatY: 0.42, says: ['This book is SO good! 📖', 'Shhh! Library voice! 🤫'] }));
PEOPLE.push(nextKid({ job: 'read', at: [1.8, -44.8], face: -30, seatY: 0.42, says: ['I love dragon stories! 🐉', 'Shhh! Library voice! 🤫'] }));
PEOPLE.push(nextKid({ job: 'read', at: [0.6, -42.3], face: 180, seatY: 0.42, says: ['Can you read this with me? 📚'] }));
PEOPLE.push({ name: 'Mrs. Page', job: 'wave', at: [4.2, -41.8], face: -120, says: ['Shhh! Welcome to the library 📚', 'Want me to find you a good book? 📖'],
  look: { age: 'grownup', body: 'girl', skin: '#f1c7a3', hair: 'bun', hairColor: '#c9c4bf', top: 'long', topColor: '#4f8a46', bottom: 'skirt', bottomColor: '#6b5a4a', face: 'glasses', hat: 'none' } });
// hallway and recess
PEOPLE.push(nextKid({ path: [[-11.2, -38.2], [4.6, -38.2]], speed: 0.9 }));
PEOPLE.push(nextKid({ path: [[3.8, -37.6], [-10.5, -37.6]], speed: 1.1 }));
PEOPLE.push(nextKid({ job: 'jump', at: [9.2, -38.0], face: 90, says: ['Hop hop hop! 🦘', 'Want to play hopscotch? 1️⃣2️⃣3️⃣'] }));
PEOPLE.push(nextKid({ path: [[8.5, -42.5], [12.5, -40], [17.5, -43], [12.5, -46]], loop: true, speed: 2.2, run: true, says: ["You're it! 🏃", 'Tag! 😆'] }));
PEOPLE.push(nextKid({ path: [[17.5, -43], [12.5, -46], [8.5, -42.5], [12.5, -40]], loop: true, speed: 2.2, run: true, says: ["Can't catch me! 😆"] }));

// ---------- the office ----------
const OFFICE = [
  ['Priya', 'girl', '#c68c63', 'long', '#2b2220', '#ef84ad'], ['Greg', 'boy', '#f1c7a3', 'short', '#a8592f', '#93c9ea'],
  ['Dana', 'girl', '#fbe3cf', 'bob', '#d9a95a', '#aee0c5'], ['Marcus', 'boy', '#6b4128', 'buzz', '#2b2220', '#fbfaf7'],
  ['Linda', 'girl', '#e0ac84', 'bun', '#7a4a2c', '#bba6e6'],
];
const OFFICE_SAYS = ['Busy busy busy! 💻', 'Time for a meeting! 📊', 'I love my job! 😊', 'Want to see my spreadsheet? 📈', 'Coffee time! ☕'];
[[-53.5, -59.25], [-50.5, -59.25], [-53.5, -56.25], [-53.5, -50.25], [-50.5, -47.25]].forEach(([x, z], i) => {
  const [name, body, skin, hair, hairColor, topColor] = OFFICE[i];
  PEOPLE.push({ name, job: 'sittype', at: [x, z], face: 180, says: OFFICE_SAYS,
    look: { age: 'grownup', body, skin, hair, hairColor, top: 'long', topColor, bottom: body === 'girl' && i % 2 ? 'skirt' : 'pants', bottomColor: '#3b3b48', beard: body === 'boy' && i === 1 ? 'beard' : 'none', face: i === 2 ? 'glasses' : 'none', hat: 'none' } });
});
PEOPLE.push({ name: 'Receptionist Rosa', job: 'type', at: [-57.25, -54.0], face: -90, says: ['Welcome to the Office Tower! 🏢', 'The elevator is right over there! 🛗'],
  look: { age: 'grownup', body: 'girl', skin: '#e0ac84', hair: 'ponytail', hairColor: '#2b2220', top: 'long', topColor: '#ec7d72', bottom: 'skirt', bottomColor: '#3b3b48', hat: 'none' } });
PEOPLE.push({ name: 'Steve', path: [[-49.3, -53.2], [-55.0, -53.2]], speed: 0.7, says: ['Getting some water! 💧', 'Is it lunchtime yet? 🥪'],
  look: { age: 'grownup', body: 'boy', skin: '#f1c7a3', hair: 'short', hairColor: '#c9c4bf', top: 'long', topColor: '#5b7fb0', bottom: 'pants', bottomColor: '#3b3b48', face: 'glasses', hat: 'none' } });

// What people say when they don't have their own lines. Kids and grown-ups talk differently:
// only kids ask to be friends or to race; grown-ups are friendly neighbors.
export const SAYINGS = {
  kid: [
    'Hi {name}! 👋', 'Wanna be friends? 💖', 'Want to race to the park? 🏃', 'I love your outfit! ✨',
    'School is so much fun! 📚', 'Have you found all the golden stars? ⭐', 'Have you been to the toy shop? 🧸', 'Did you see the ducks at the pond? 🦆',
  ],
  grownup: [
    'Hi {name}! 👋', 'What a sunny day! ☀️', 'Nice to see you, {name}!', 'Have a great day! 😊',
    'The ice cream shop has the BEST cones! 🍦', 'Did you see the ducks at the pond? 🦆', 'Watch out for cars! 🚗', 'Remember to look both ways! 🚸',
  ],
};

// Cars (and a school bus) driving around the loop
export const TRAFFIC = {
  loop: LOOP,
  cars: ['#ec7d72', '#93c9ea', '#f7da7e', '#aee0c5', '#bba6e6', '#ef84ad'],
  buses: ['#f2b705'],
  others: [['pickup', '#3f5f8f'], ['suv', '#5fb3a8'], ['minivan', '#f2a25f'], ['pickup', '#d9443a'], ['icecreamtruck', '#fbfaf7'], ['suv', '#34302f']],
};
