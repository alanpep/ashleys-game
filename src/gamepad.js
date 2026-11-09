// Game controller support (Xbox, PlayStation, Switch Pro... anything the browser sees as a "standard" gamepad).
// Buttons: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Back, 9 Start, 10 L-stick, 11 R-stick, 12-15 D-pad up/down/left/right
export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

export function setupGamepad() {
  let prev = [];
  const dead = (a = 0) => (Math.abs(a) < 0.18 ? 0 : (a - Math.sign(a) * 0.18) / 0.82);
  return {
    // read the controller once per frame. Returns null if none is plugged in.
    poll() {
      const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
      const gp = pads.find((p) => p && p.connected);
      if (!gp) return null;
      const held = gp.buttons.map((b) => b.pressed);
      const before = prev;
      prev = held;
      return {
        lx: dead(gp.axes[0]), ly: dead(gp.axes[1]), rx: dead(gp.axes[2]), ry: dead(gp.axes[3]),
        lt: gp.buttons[BTN.LT]?.value ?? 0, rt: gp.buttons[BTN.RT]?.value ?? 0,
        held: (i) => !!held[i],
        pressed: (i) => !!held[i] && !before[i], // just pushed this frame
        active: held.some(Boolean) || gp.axes.some((a) => Math.abs(a) > 0.4),
      };
    },
  };
}

// Controller names for the hints at the bottom of the screen
export const PAD_HINTS = [
  ['<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>', '🕹️'],
  ['<kbd>W</kbd> go', '<kbd>RT</kbd> go'], ['<kbd>S</kbd> brake / back up', '<kbd>LT</kbd> brake / back up'],
  ['<kbd>A</kbd><kbd>D</kbd> steer', '🕹️ steer'], ['<kbd>Right-click</kbd> honk', '<kbd>Ⓐ</kbd> honk'], ['<kbd>E</kbd> get out', '<kbd>Ⓑ</kbd> get out'],
  ['<kbd>Right-click</kbd>', '<kbd>Ⓑ</kbd>'], ['<kbd>Click</kbd>', '<kbd>Ⓧ</kbd>'], ['<kbd>C</kbd>', '<kbd>Ⓨ</kbd>'],
  ['<kbd>X</kbd>', '<kbd>D-pad ↓</kbd>'], ['<kbd>B</kbd>', '<kbd>Back</kbd>'], ['<kbd>V</kbd>', '<kbd>D-pad ↑</kbd>'],
  ['<kbd>Esc</kbd>', '<kbd>Start</kbd>'], ['<kbd>R</kbd>', '<kbd>LB</kbd>/<kbd>RB</kbd>'],
];
