# Ashley's House

A 3D walk-around-and-decorate game that runs in the web browser.

## Play

Double-click **Play.bat**. The first run installs what it needs, which takes about a minute. After that, the game opens in your browser.

| Key | What it does |
| --- | --- |
| W A S D / arrows | walk (hold Shift to run) |
| Mouse | look around |
| Click (or E / Space) | pick up / put down |
| R / Q / mouse wheel | turn the thing you're holding |
| C | change color of a thing, or paint the wall/floor you're looking at |
| B | open the catalog to get new things |
| X | put the thing away (delete it) |
| Esc | pause menu (reset the house, empty it) |

The house saves automatically in the browser.

## Changing the house

- **Layout** (rooms, doors, windows, starting furniture): `src/house.js`. A map and instructions are at the top of the file.
- **Things you can place**: `src/items.js`. Each item is built from boxes, balls and cylinders.
- `photo reference/` has the photos the layout and furniture were based on.

If you change `src/house.js`, open the Esc menu in the game and choose **Put everything back** to load the new starting furniture.
