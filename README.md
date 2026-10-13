# Eli Grogan's Adventure

An isometric pixel-art RPG built with Three.js, set around Lake Norman, NC.

The evil hyperpop wizard **Shive** has stolen Eli's dog costume. Help your friends, level up,
take down Shive's goons and their Bass Pylons, then cross the lake to Shive's Island and get it back.

## What's in it
- A 200x200 map of Lake Norman: Aldersprings Lane, Mooresville, Davidson & Davidson College, Huntersville & Birkdale Village, Cornelius, Denver, Terrell, Sherrills Ford, Ramsey Creek Park, I-77, Cowans Ford Dam, the Catawba River, Mountain Island Lake and the Dogcore Festival
- A main story in three acts (the lane, the Bass Pylons and Shive's Spire, then the Dogcore Festival), plus a final betrayal: Roby Mink steals the costume and becomes Lord Upvote
- 18 side quests, a branching dialogue system with S.P.E.C.I.A.L. and skill checks, perks, levelling, fast travel from the map (M)

## How to play
Double-click `index.html` (it needs an internet connection the first time, to load Three.js and the fonts).

| Key | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Aim |
| Left / Right click | Melee / ranged attack |
| Space | Dodge roll |
| E | Talk / interact |
| Q | B.A.R.K. Time (slow motion, uses AP) |
| H | Quick heal |
| F / G | Mega Bark (perk) / Dog Whistle (item) |
| 1-9, mouse wheel | Swap weapons |
| C / I / J / M | Stats & perks / Inventory / Quests / Full map |
| N | Toggle music |
| Esc / F5 | Pause menu / Quick save |

On phones and tablets the game shows touch controls: drag on the left side to move, and use the on-screen buttons to hit, shoot, dodge and talk (attacks auto-aim). Landscape works best.

The game autosaves to your browser.

## Files
- `js/worldgen.js` - Lake Norman map layout (lake, Aldersprings Lane, towns, roads)
- `js/world.js` - builds the 3D world
- `js/sprites.js` - pixel-art character and item sprites (drawn in code)
- `js/data.js` - items, weapons, perks, enemies, quests, shops
- `js/dialogues.js` - every character's dialogue tree
- `js/dialogues2.js` - Act 3 dialogue, the new characters and the second side quests
- `js/dialogues3.js` - Roby Mink's betrayal and final boss fight
- `js/game.js` - gameplay, combat, AI, boss fight, saving
- `js/ui.js` - HUD, dialogue box, menus, minimap and full map
- `js/audio.js` - chiptune music and sound effects
- `js/touch.js` - mobile controls (joystick, buttons, auto-aim)
