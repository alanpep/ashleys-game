// =====================================================================
//  THE HOUSE LAYOUT  -  edit this file to change the house!
// =====================================================================
//
//  Units are METERS (1 meter is about 3.3 feet).
//  Picture the floor plan from above, with the FRONT of the house at the top:
//     x goes left -> right
//     z goes top  -> bottom (front of house -> back yard)
//
//                 FRONT (street)
//   z=0  +-----------+------+-----------+------------------+
//        | Ashley's  | Bath |  Dining   |                  |
//        |   Room    |      |  Room     |   Living Room    |
//  z=3.5 +-----------+------+  (railing)|  (fireplace on   |
//        |     Hallway      |...........|   the right wall)|
//  z=4.7 +--------+---------+  Kitchen  |                  |
//        |  Big   |  Kids'  |   (bar)   |                  |
//        | Bedroom|  Room   |           |   patio door     |
//   z=8  +--------+---------+-----------+------------------+
//       x=0            x=6         x=10               x=17
//                  BACK YARD (patio, swing, fire pit)
//
//  rooms:     rectangles. x,z = the top-left corner, w = width, d = depth.
//             wall / floor = starting colors. floorStyle: 'wood', 'carpet' or 'tile'.
//             fan: true puts a spinning ceiling fan in the room.
//
//  openings:  x,z is the CENTER of the opening and must sit exactly on a room's
//             edge line (where two rooms touch, or on an outside wall).
//             kind:  'door' (default)  - walk-through doorway
//                    'window'          - add box: true for an outside flower box
//                    'open'            - no wall at all (open floor plan)
//                    'railing'         - white spindle railing
//                    'half'            - half wall with a counter on top (kitchen bar)
//             optional: bottom / top heights, curtains: 'floral' or a color,
//                       column: <position along the wall> for a white pillar
//
//  furniture: what's in the house at the start (and after "Put everything back").
//             rot = which way it faces, in degrees:
//                0 = faces the back yard, 180 = faces the street,
//                90 = faces right, -90 = faces left
//             Things placed at the same spot stack (a lamp on a nightstand),
//             as long as the bottom thing comes first in the list.
//             Wall things need a height y and should sit right against the wall
//             (walls are 0.1 thick on each side, so on the wall at z=0 use z=0.11).
//             Item names are the "id"s in src/items.js.
// =====================================================================

const SAGE = '#a9bea6';
const LAMINATE = '#a39282';

export const HOUSE = {
  title: "Ashley's House",
  wallHeight: 2.7,
  roofHeight: 1.6,
  roofColor: '#4b4642',
  gableColor: '#e9e2cc',
  spawn: { x: 15.2, z: 1.3, facing: -60 },

  rooms: [
    { name: "Ashley's Room", x: 0,   z: 0,   w: 3.8, d: 3.5, wall: '#fbe0ea', floor: '#e8d5c4', floorStyle: 'carpet' },
    { name: 'Bathroom',      x: 3.8, z: 0,   w: 2.2, d: 3.5, wall: '#dceefa', floor: '#f1eee8', floorStyle: 'tile' },
    { name: 'Hallway',       x: 0,   z: 3.5, w: 6,   d: 1.2, wall: SAGE,      floor: LAMINATE },
    { name: 'Big Bedroom',   x: 0,   z: 4.7, w: 3.5, d: 3.3, wall: '#6f819a', floor: '#5b5d63', floorStyle: 'carpet' },
    { name: "Kids' Room",    x: 3.5, z: 4.7, w: 2.5, d: 3.3, wall: '#c4def3', floor: '#c9c2b8', floorStyle: 'carpet' },
    { name: 'Dining Room',   x: 6,   z: 0,   w: 4,   d: 4,   wall: SAGE,      floor: LAMINATE, fan: true },
    { name: 'Kitchen',       x: 6,   z: 4,   w: 4,   d: 4,   wall: SAGE,      floor: LAMINATE },
    { name: 'Living Room',   x: 10,  z: 0,   w: 7,   d: 8,   wall: SAGE,      floor: LAMINATE, light: 8, recessed: true },
  ],

  openings: [
    // doors
    { x: 15,   z: 0,   width: 1.0 },                         // front door
    { x: 13.8, z: 8,   width: 1.6, curtains: 'floral' },     // patio door
    { x: 6,    z: 4.1, width: 1.0 },                         // hallway <-> dining/kitchen
    { x: 2.5,  z: 3.5, width: 0.9 },                         // Ashley's room
    { x: 4.9,  z: 3.5, width: 0.8 },                         // bathroom
    { x: 2.5,  z: 4.7, width: 0.9 },                         // big bedroom
    { x: 4.75, z: 4.7, width: 0.9 },                         // kids' room
    // open floor plan
    { x: 10,   z: 1.5, width: 3, kind: 'railing', column: 3 }, // dining railing + white pillar
    { x: 10,   z: 3.5, width: 1, kind: 'open' },             // steps down to living room
    { x: 10,   z: 6,   width: 4, kind: 'half' },             // kitchen bar over the living room
    { x: 8,    z: 4,   width: 4, kind: 'open' },             // dining <-> kitchen
    // windows
    { x: 1.9,  z: 0, width: 1.4, kind: 'window', box: true },
    { x: 4.9,  z: 0, width: 0.6, kind: 'window', bottom: 1.4, top: 1.9 },
    { x: 8,    z: 0, width: 1.8, kind: 'window', box: true },
    { x: 12.3, z: 0, width: 1.6, kind: 'window', box: true },
    { x: 1.75, z: 8, width: 1.4, kind: 'window', curtains: '#e8d9b5' },
    { x: 4.75, z: 8, width: 1.2, kind: 'window' },
    { x: 8,    z: 8, width: 1.2, kind: 'window', bottom: 1.1 },
  ],

  furniture: [
    // ---------------- Living Room ----------------
    { item: 'bigrug',        x: 13.6,  z: 4.2 },
    { item: 'activitytable', x: 13.8,  z: 4.0 },
    { item: 'kidchair',      x: 13.3,  z: 4.75, rot: 180 },
    { item: 'kidchair',      x: 14.3,  z: 4.75, rot: 180 },
    { item: 'couch',         x: 10.56, z: 6.0, rot: 90 },
    { item: 'loveseat',      x: 12.3,  z: 0.56 },
    { item: 'fireplace',     x: 16.65, z: 2.4, rot: -90 },
    { item: 'painting',      x: 16.39, z: 2.4, y: 2.0, rot: -90 },
    { item: 'flowers',       x: 16.28, z: 1.85, color: '#fbfaf7' },
    { item: 'smallplant',    x: 16.28, z: 3.0, color: '#f1eee8' },
    { item: 'tv',            x: 16.69, z: 5.6, rot: -90 },
    { item: 'walltv',        x: 16.89, z: 5.6, y: 2.0, rot: -90 },
    { item: 'floorlamp',     x: 16.6,  z: 4.25 },
    { item: 'cubeshelf',     x: 16.73, z: 0.72, rot: -90 },
    { item: 'globe',         x: 16.73, z: 0.5 },
    { item: 'drawers',       x: 15.4,  z: 7.68, rot: 180 },
    { item: 'plant',         x: 16.4,  z: 7.5 },
    { item: 'gallery',       x: 11.8,  z: 7.89, y: 1.7, rot: 180 },
    { item: 'clock',         x: 13.8,  z: 7.89, y: 2.45, rot: 180 },
    { item: 'toykitchen',    x: 10.3,  z: 2.0, rot: 90 },
    { item: 'toycar',        x: 12.0,  z: 6.5, rot: 40 },
    { item: 'mirror',        x: 14.0,  z: 0.11, y: 1.6 },
    { item: 'picture',       x: 10.7,  z: 0.11, y: 1.7, color: '#3b3634' },
    { item: 'doormat',       x: 15,    z: 0.45 },
    { item: 'ball',          x: 15.3,  z: 3.3, color: '#ef84ad' },

    // ---------------- Dining Room ----------------
    { item: 'diningtable', x: 8.0,  z: 1.9 },
    { item: 'chair',       x: 7.5,  z: 1.1 },
    { item: 'chair',       x: 8.5,  z: 1.1 },
    { item: 'chair',       x: 7.5,  z: 2.7, rot: 180 },
    { item: 'chair',       x: 8.5,  z: 2.7, rot: 180 },
    { item: 'chair',       x: 6.65, z: 1.9, rot: 90, color: '#34302f' },
    { item: 'flowers',     x: 8.2,  z: 1.9, color: '#34302f' },
    { item: 'smallplant',  x: 7.35, z: 0.17 },
    { item: 'smallplant',  x: 7.75, z: 0.17, color: '#34302f' },
    { item: 'smallplant',  x: 8.3,  z: 0.17, color: '#f1eee8' },
    { item: 'smallplant',  x: 8.7,  z: 0.17 },
    { item: 'picture',     x: 6.11, z: 1.9, y: 1.65, rot: 90, color: '#3b3634' },

    // ---------------- Kitchen ----------------
    { item: 'counter',  x: 6.6,  z: 7.6,  rot: 180 },
    { item: 'stove',    x: 7.5,  z: 7.57, rot: 180 },
    { item: 'counter',  x: 8.4,  z: 7.6,  rot: 180 },
    { item: 'counter',  x: 9.4,  z: 7.6,  rot: 180 },
    { item: 'pot',      x: 7.5,  z: 7.6 },
    { item: 'fridge',   x: 6.47, z: 5.2,  rot: 90 },
    { item: 'counter',  x: 6.4,  z: 6.4,  rot: 90 },
    { item: 'uppercab', x: 6.6,  z: 7.89, y: 1.9, rot: 180 },
    { item: 'uppercab', x: 9.4,  z: 7.89, y: 1.9, rot: 180 },
    { item: 'uppercab', x: 6.11, z: 6.4,  y: 1.9, rot: 90 },
    { item: 'fruitbowl', x: 10.0, z: 5.0 },
    { item: 'cupcake',  x: 10.0, z: 6.9 },

    // ---------------- Hallway ----------------
    { item: 'picture', x: 0.11, z: 4.1, y: 1.6, rot: 90, color: '#bba6e6' },

    // ---------------- Ashley's Room ----------------
    { item: 'roundrug',  x: 2.2,  z: 2.0, color: '#bba6e6' },
    { item: 'bed',       x: 0.65, z: 1.17, color: '#ef84ad' },
    { item: 'teddy',     x: 0.65, z: 0.62 },
    { item: 'desk',      x: 3.4,  z: 1.4, rot: -90 },
    { item: 'chair',     x: 2.85, z: 1.4, rot: 90, color: '#ef84ad' },
    { item: 'tablelamp', x: 3.5,  z: 0.95, color: '#ef84ad' },
    { item: 'bookshelf', x: 1.0,  z: 3.25, rot: 180 },
    { item: 'beanbag',   x: 3.25, z: 2.9, color: '#93c9ea' },
    { item: 'toybox',    x: 0.33, z: 2.8, rot: 90 },
    { item: 'ball',      x: 2.0,  z: 2.3 },
    { item: 'lights',    x: 1.9,  z: 0.11, y: 2.3 },
    { item: 'poster',    x: 3.69, z: 2.6, y: 1.65, rot: -90 },

    // ---------------- Bathroom ----------------
    { item: 'bathtub',  x: 4.9,  z: 0.5, rot: 90 },
    { item: 'toilet',   x: 5.61, z: 2.0, rot: -90 },
    { item: 'bathsink', x: 4.15, z: 2.0, rot: 90 },
    { item: 'mirror',   x: 3.91, z: 2.0, y: 1.6, rot: 90 },

    // ---------------- Big Bedroom ----------------
    { item: 'bigbed',     x: 1.75, z: 6.83, rot: 180, color: '#3c4a6b' },
    { item: 'dog',        x: 1.45, z: 6.3, rot: 120 },
    { item: 'nightstand', x: 0.55, z: 7.7, rot: 180 },
    { item: 'nightstand', x: 2.95, z: 7.7, rot: 180 },
    { item: 'tablelamp',  x: 2.95, z: 7.7 },
    { item: 'dresser',    x: 0.35, z: 5.6, rot: 90 },
    { item: 'mirror',     x: 0.11, z: 5.6, y: 1.65, rot: 90, color: '#4d3628' },
    { item: 'poster',     x: 3.39, z: 6.5, y: 1.6, rot: -90, color: '#fbfaf7' },

    // ---------------- Kids' Room ----------------
    { item: 'bed',    x: 5.35, z: 6.83, rot: 180, color: '#93c9ea' },
    { item: 'toybox', x: 3.83, z: 7.3, rot: 90, color: '#ec7d72' },
    { item: 'ball',   x: 4.3,  z: 5.6, color: '#f7da7e' },
    { item: 'poster', x: 5.89, z: 5.6, y: 1.6, rot: -90, color: '#93c9ea' },

    // ---------------- Back yard ----------------
    { item: 'patiochair', x: 15.0, z: 9.6,  rot: 200 },
    { item: 'patiochair', x: 16.4, z: 9.4,  rot: 160 },
    { item: 'firepit',    x: 16.0, z: 11.4 },
    { item: 'swing',      x: 10.5, z: 10.2 },
    { item: 'toytruck',   x: 13.0, z: 12.0, rot: -35 },
  ],

  // Flat stone areas outside: patio and front walkway
  patios: [
    { x: 12.6, z: 8.1, w: 4.4, d: 2.4 },
    { x: 14.6, z: -4,  w: 0.8, d: 3.92 },
  ],

  // Chimney above the fireplace
  chimney: { x: 16.45, z: 2.4, w: 0.8, d: 1.3 },

  // Bushes: [x, z, size]  (hostas along the front, a few out back)
  bushes: [[0.8, -0.65], [2.9, -0.7, 1.2], [5.6, -0.6, 0.9], [6.9, -0.7, 1.1], [9.3, -0.65], [11.0, -0.7, 1.2],
    [13.7, -0.6, 0.9], [16.3, -0.7], [-0.6, 6.5, 1.1], [17.6, 5.5], [0.8, 8.7, 0.9], [6.5, 8.7]],

  // Trees in the yard: [x, z, 'round' or 'pine', size]
  trees: [[3, -6, 'pine', 1.1], [-5, 2], [21, -3], [8, 16, 'round', 1.2], [21, 12], [-5, 11, 'pine'], [26, 4, 'pine', 0.9]],
};
