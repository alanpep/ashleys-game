# PepCity

A 3D walk-around-and-decorate game that runs in the web browser.

## Play

Double-click **Play.bat**. The first run installs what it needs, which takes about a minute. After that, the game opens in your browser.

| Key | What it does |
| --- | --- |
| W A S D / arrows | walk (hold Shift to run) |
| Mouse | look around |
| Click (or E) | pick up / put down |
| Space | jump! |
| Right-click (or F) | do something with it: open doors, get in cars, sit, bounce balls, turn on TVs, lamps, fans and room lights, and lots more |
| Mouse wheel / R / Q | turn the thing you're holding |
| C | change color of a thing, or paint the wall/floor you're looking at |
| B | open the catalog to get new things |
| X | put the thing away (delete it) |
| V | switch between seeing your character and seeing through their eyes |
| H (or right-click while driving) | honk the horn |
| Esc | pause menu (reset the house, empty it) |

**Slow computer?** Press Esc and click the Graphics button to choose ✨ Pretty, ⚡ Fast or 🐢 Low (smoothest). The game also switches down by itself if it's running choppy, unless you've picked a level yourself. Low turns off shadows and screen effects, lowers the resolution, uses fewer lights, and doesn't draw things far away. Low's edge smoothing changes the next time the game is opened.

**Game controller** (Xbox, PlayStation or Switch Pro, plugged in or Bluetooth): left stick walks (push all the way to run), right stick looks around, Ⓐ jump, Ⓧ pick up / put down, Ⓑ do something (like right-click), Ⓨ change color, LB/RB turn things, D-pad ↓ put away, D-pad ↑ change view, Back = catalog, Start = menu. Driving: RT gas, LT brake/back up, Ⓐ honk, Ⓑ get out. In menus, use the D-pad or stick to pick a button and Ⓐ to press it.

The house is saved on the computer running Play.bat, in `saves/world.json`. Your character and the stars you've found are saved in each browser.

## Playing together

1. Start the game with **Play.bat** on one computer (the "host").
2. The black Play.bat window, the start screen and the Esc menu all show an address like `http://192.168.0.48:5173/`.
3. On a second computer on the same Wi-Fi, open that address in Chrome or Edge.

Both players are in the same neighborhood at the same time. You can see each other's characters, and whatever one of you moves, adds, paints or puts away changes for the other too. You can't grab something your friend is holding. Each player makes their own character and finds their own stars.

The first time, Windows may ask whether to let Node.js use the network. Choose **Allow** for private networks, or the other computer won't be able to connect.

If you delete `saves/world.json`, the next player to join brings their own copy of the house from their browser.

## Things to do

- **Make a character**: kid or grown-up, hair, clothes, hats, glasses, capes and wings. Change it any time from the Esc menu.
- **Explore Kenwood Ave**: the Ice Cream Shop (click the counter for a cone), the Toy Shop (click the counter for a surprise toy), Sunny Park (playground, fountain, duck pond), and the **Dream House**, an empty house to decorate.
- **Right-click everything!** Go down slides, swing, ride the merry-go-round, jump on the trampoline, sit on chairs, nap in beds, make the hydrant squirt, pet the dog, play the piano, flush the toilet, shoot hoops, and more. Right-click a wall to turn that room's lights on or off.
- **Open doors**: click a door, or just walk into it. Click the garage door to roll it up. Shop doors open by themselves.
- **Drive**: Kenwood Ave is part of a big loop road around the whole town (Kenwood Ave, Maple Dr, Willow Way, Birch Ln), and Lessenger Ln leads up to the school parking lot. Click a car or the school bus to get in. W goes, S brakes and backs up, A and D steer, E gets out.
- **Math time**: sit at a desk in the classroom and Ms. Lopez asks first-grade math questions (adding, taking away, counting, bigger numbers, what comes next). Click the right answer to earn stars.
- **Visit Lessenger Elementary**: a classroom, art room, library, office, lockers, and a playground with a basketball hoop.
- **Meet the neighbors**: people walk around town. Click them to say hi. Cars drive up and down Kenwood Ave and stop for you.
- **Around town**: the Fire Station (fire pole, alarm bell, fire truck), the Police Station (police car), Kenwood Market (checkout gives snacks, shopping carts), the Office Tower (elevator, computers), Pizza Palace (the oven makes pizza), the Pet Shop (adopt a pet!), and Kenwood Pool (swim, and use the diving board).
- **Vehicles**: the family's white pickup truck and white SUV at home, plus a minivan, ice cream truck (plays a song when you honk), fire truck and police car (sirens).
- **Animals**: pets wander around, dogs come say hi, wild bunnies hop around the yards, and birds fly off when you get close.
- **PepCity Fun Park**: drive up Fun Park Dr (off Kenwood Ave, past the woods). Right-click a ride to get on: three roller coasters (the Thunder Loop goes upside down!), a Ferris wheel, carousel, swing ride, teacups, drop tower, pirate ship and bumper cars (you steer). Plus cotton candy, hot dogs, ice cream and a ring-toss game.
- **Your own pet**: right-click the counter at the Pet Shop to adopt a dog, cat or bunny, pick its color and give it a name. It follows you everywhere. Right-click it to feed it, cuddle it, give it a bath, put it on a leash for a walk, tell it to stay, play fetch, or give it a treat (1 coin). Its food, fun and clean meters go down over time, so keep it happy! If you want a different pet, pick **Find a new home** in its menu and then adopt a new one.
- **Jobs and chores** (press **J**, or the pause menu): water plants, clean up litter in the park, deliver mail for Mel or pizza for Chef Tony (a bouncing arrow shows where to go), tidy toys into a toy box, look after your pet, finish a lesson, or play with the kids. Each job pays coins 🪙 and you level up from New Helper to PepCity Champion.
- **Tag and Hide & Seek**: the kids at Kenwood Park (Lily, Sam, Maya, Leo) and the school playground (Nora, Finn, Ivy) want to play. Right-click one to pick a game.
- **Learning Time**: sit at a classroom desk and pick Math, Reading, Telling Time, or Shapes & Patterns. Get 5 stars to finish a lesson.
- **PepCity Airport**: take Airport Rd south from the loop. Hop in a plane on the apron: **W** speeds up, **Space** lifts off once you're fast enough, **A/D** turn, **Shift** goes down, **S** slows down. Land anywhere, stop, then press **E** to get out. (Controller: RT/LT speed, left stick steers and climbs.)
- **PepCity Marina**: on the Great Lake south of the pier. Drive a speedboat or the pontoon boat out on the lake, then come back to a dock to get out.
- **More places**: the Hospital (checkups, an X-ray room, an ambulance), the Library (storybooks read out loud), PepCity Cinema (popcorn and a movie), PepCity Farm out west (barn, tractor, animals, cornfield, pumpkin patch), and the Great Lake Beach out east (sand, wading, a pier and lighthouse, sailboats).
- **Kenwood Woods**: trails start behind your house, behind the Blue House, and at the Secret Garden. Find the treehouse (climb it!), the campsite, the Fairy Ring, Owl Hollow, the Frog Pond, the Deer Meadow, berry bushes, and a hidden treasure chest. Watch for deer, foxes, squirrels, owls, frogs, turtles and fireflies.
- **Find all 29 golden stars** hidden around the neighborhood to unlock the Golden Crown. To hunt for them again, use **Reset my stars** in the Esc menu.

## Changing the house

- **Layout** (rooms, doors, windows, starting furniture): `src/house.js`. A map and instructions are at the top of the file.
- **Things you can place**: `src/items.js`. Each item is built from boxes, balls and cylinders.
- **What right-click does to each thing**: `src/interactions.js`.
- **The neighborhood** (other buildings, park, the road loop, people, traffic, star hiding spots): `src/neighborhood.js`.
- **Character options**: `src/character.js`.
- **Playing together**: `server/multiplayer.js` (the shared house) and `src/remotes.js` (drawing the other players).
- **Colors**: `src/palette.js`.
- **Sounds**: the files in `sounds/`, hooked up in `src/audio.js` (which file plays where, and how loud). Sounds are placed in the world, so they get louder as you get closer. There's a Sound On/Off button in the Esc menu.
- `photo reference/` has the photos the layout and furniture were based on.

If you change `src/house.js`, open the Esc menu in the game and choose **Put everything back** to load the new starting furniture.
