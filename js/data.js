// ---------- Game content data ----------
const DATA = (() => {
  const SPECIAL = [
    { k: 'STR', name: 'Strength', desc: 'Raw power. Boosts melee damage and the Melee skill.' },
    { k: 'PER', name: 'Perception', desc: 'Keen eyes. Boosts ranged damage, the Ranged skill and shows enemies on the minimap from further away.' },
    { k: 'END', name: 'Endurance', desc: 'Toughness. Raises max HP and HP regeneration, boosts Medicine.' },
    { k: 'CHA', name: 'Charisma', desc: 'Pure Eli charm. Unlocks dialogue options and boosts Speech.' },
    { k: 'INT', name: 'Intelligence', desc: 'Big brain. More XP, more skill points per level, boosts Tech.' },
    { k: 'AGI', name: 'Agility', desc: 'Roblox parkour reflexes. Faster movement, more Action Points, boosts Sneak.' },
    { k: 'LUK', name: 'Luck', desc: 'Agar.io RNG. Critical hits, better loot and boosts Barter.' },
  ];
  const SKILLS = [
    { k: 'melee', name: 'Melee', stat: 'STR', desc: '+damage with bats, chains and hammers.' },
    { k: 'ranged', name: 'Ranged', stat: 'PER', desc: '+damage with slingshots, blasters and jars.' },
    { k: 'sneak', name: 'Sneak', stat: 'AGI', desc: 'Goons notice you from shorter range.' },
    { k: 'speech', name: 'Speech', stat: 'CHA', desc: 'Pass [Speech] checks in conversations.' },
    { k: 'tech', name: 'Tech', stat: 'INT', desc: 'Pass [Tech] checks. Hack Bass Pylons (Tech 40).' },
    { k: 'medicine', name: 'Medicine', stat: 'END', desc: 'Healing items restore more HP.' },
    { k: 'barter', name: 'Barter', stat: 'LUK', desc: 'Better shop prices.' },
  ];

  // weapons: wtype melee|ranged|thrown
  const ITEMS = {
    fists: { name: 'Fists', type: 'weapon', wtype: 'melee', dmg: 5, rate: 0.35, range: 1.3, arc: 1.7, kb: 2, icon: 'fists', desc: 'Your bare fists. Angry fists, though.' },
    foam_bat: { name: 'Foam Bat', type: 'weapon', wtype: 'melee', dmg: 10, rate: 0.42, range: 1.7, arc: 1.9, kb: 4, icon: 'foam_bat', value: 30, desc: "FlowingFox's training bat. Surprisingly bonky." },
    rubber_chicken: { name: 'Rubber Chicken', type: 'weapon', wtype: 'melee', dmg: 14, rate: 0.36, range: 1.7, arc: 2.0, kb: 7, icon: 'rubber_chicken', value: 60, desc: "Rivergrain's prized prop. Squeaks on impact. Huge knockback." },
    chav_chain: { name: 'Chav Chain', type: 'weapon', wtype: 'melee', dmg: 19, rate: 0.48, range: 2.2, arc: 2.2, kb: 4, icon: 'chav_chain', value: 90, desc: 'Proper heavy gold chain, innit. Long reach.' },
    shock_baton: { name: 'Shock Baton', type: 'weapon', wtype: 'melee', dmg: 22, rate: 0.42, range: 1.8, arc: 1.8, kb: 3, stun: 0.8, icon: 'shock_baton', value: 150, desc: 'Built from a scooter motor by Jack. Stuns goons.' },
    ban_hammer: { name: 'Ban Hammer', type: 'weapon', wtype: 'melee', dmg: 48, rate: 0.95, range: 2.0, arc: 2.4, kb: 10, icon: 'ban_hammer', value: 450, desc: 'A legendary Roblox moderator relic. One bonk = one ban.' },
    slingshot: { name: 'Slingshot', type: 'weapon', wtype: 'ranged', dmg: 8, rate: 0.45, ap: 3, proj: { speed: 15, size: 0.18, color: 0x9a9aa8, life: 0.9 }, icon: 'slingshot', value: 25, desc: 'Pebble flinger. Cheap on AP.' },
    paintball: { name: 'Paintball Marker', type: 'weapon', wtype: 'ranged', dmg: 7, rate: 0.14, ap: 2, proj: { speed: 20, size: 0.14, color: 0xe04aff, life: 0.7, spread: 0.08 }, icon: 'paintball', value: 200, desc: "FlowingFox's spare marker. Rapid fire." },
    agar_blaster: { name: 'Agar Blaster', type: 'weapon', wtype: 'ranged', dmg: 20, rate: 0.6, ap: 7, proj: { speed: 9, size: 0.2, color: 0x5cf06a, life: 1.4, grow: 0.5, pierce: true }, icon: 'agar_blaster', value: 300, desc: 'Fires blobs that grow as they travel and eat through goons.' },
    hornet_jar: { name: 'Hornet Jar', type: 'weapon', wtype: 'thrown', dmg: 30, rate: 1.1, ap: 14, aoe: 2.6, proj: { speed: 11, size: 0.3, color: 0xffd23a, life: 0.9 }, icon: 'hornet_jar', value: 220, desc: "Squid's angry friends. Shatters into a stinging swarm." },

    hoodie: { name: 'Blob Hoodie', type: 'armor', dr: 0, icon: 'flyer', desc: 'Your favourite Agar.io hoodie.' },
    padded_jacket: { name: 'Padded Scooter Jacket', type: 'armor', dr: 0.12, icon: 'volt_cell', value: 140, desc: 'Jack-approved crash protection. 12% damage resist.' },
    army_vest: { name: 'Army Vest', type: 'armor', dr: 0.18, icon: 'paintball', value: 220, desc: "FlowingFox's spare vest. 18% damage resist." },
    riot_onesie: { name: 'Riot Onesie', type: 'armor', dr: 0.25, icon: 'speaker', value: 380, desc: 'Fell off the back of a lorry. 25% damage resist.' },
    dog_costume: { name: 'THE Dog Costume', type: 'armor', dr: 0.3, icon: 'dog_costume', desc: 'Your dog costume. You are complete again. 30% damage resist.' },

    dog_treat: { name: 'Dog Treat', type: 'use', heal: 25, icon: 'dog_treat', value: 12, desc: 'Restores 25 HP. Tastes like victory.' },
    pizza: { name: 'Pizza Slice', type: 'use', heal: 55, icon: 'pizza', value: 28, desc: 'Restores 55 HP.' },
    fizzy_pop: { name: 'Fizzy Pop', type: 'use', heal: 10, ap: 60, icon: 'fizzy_pop', value: 20, desc: 'Restores 60 AP and 10 HP.' },
    packed_lunch: { name: "Vea's Packed Lunch", type: 'use', heal: 120, icon: 'packed_lunch', value: 50, desc: 'Made with love. Restores 120 HP.' },
    tonic: { name: "Sinder's Tonic", type: 'use', icon: 'tonic', desc: 'Permanently +1 Endurance. Smells like an old shed.' },

    flyer: { name: 'Hyperpop Flyer', type: 'quest', icon: 'flyer', desc: '"SHIVE LIVE AT THE SPIRE - DOGCORE TOUR". Glitter everywhere.' },
    pylon_map: { name: "Roby's Pylon Map", type: 'quest', icon: 'pylon_map', desc: 'Marks the 3 Bass Pylons powering Shive\'s barrier.' },
    volt_cell: { name: 'Volt Cell', type: 'quest', icon: 'volt_cell', desc: 'A stolen scooter battery from Jack\'s factory.' },
    speaker: { name: "Eski's Speaker", type: 'quest', icon: 'speaker', desc: 'A massive speaker. Bass boosted. Very loud.' },
    rare_bug: { name: 'Rare Bug', type: 'quest', icon: 'rare_bug', desc: 'A shimmering beetle. Squid would love it.' },
    perfect_rock: { name: 'Suspiciously Perfect Rock', type: 'quest', icon: 'perfect_rock', desc: 'It is, objectively, a perfect rock.' },
    glowcap: { name: 'Glowcap Mushroom', type: 'quest', icon: 'glowcap', desc: 'Glows purple. Do not eat. Probably.' },
    wildflower: { name: 'Wildflower', type: 'quest', icon: 'wildflower', desc: 'A pretty pink flower from Davidson Meadows.' },
    dog_whistle: { name: 'Dog Whistle', type: 'quest', icon: 'dog_whistle', desc: "Sinder's whistle. Press G near Shive to shatter his shield." },
    hydro_scooter: { name: 'Hydro-Scooter', type: 'quest', icon: 'hydro_scooter', desc: 'Jack\'s electric water scooter. Use it at Rivergrain\'s Pier.' },
    debate_badge: { name: 'Debate Club Badge', type: 'quest', icon: 'badge', desc: 'From Roby. +10 Speech while carried.' },
    bracelet: { name: "Vea's Friendship Bracelet", type: 'quest', icon: 'bracelet', desc: '+1 Luck and +15 max HP while carried. Wholesome.' },

    // --- expansion: weapons ---
    bass_cannon: { name: 'Bass Cannon', type: 'weapon', wtype: 'ranged', dmg: 26, rate: 0.8, ap: 12, proj: { speed: 10, size: 0.35, color: 0xff4fd8, life: 0.7, grow: 1.4, pierce: true }, icon: 'bass_cannon', value: 400, desc: "Eski's mixtape-powered speaker gun. Fires a growing wall of bass that pierces goons." },
    fishing_rod: { name: "Rack's Fishing Rod", type: 'weapon', wtype: 'melee', dmg: 24, rate: 0.55, range: 2.9, arc: 1.4, kb: 9, icon: 'fishing_rod', value: 160, desc: 'Huge reach, huge knockback. Smells of catfish.' },
    whoopee_cushion: { name: 'Whoopee Cushion', type: 'weapon', wtype: 'thrown', dmg: 18, rate: 1.0, ap: 12, aoe: 3.2, stunAoe: 2.0, proj: { speed: 10, size: 0.3, color: 0xff8ac8, life: 0.8 }, icon: 'whoopee', value: 200, desc: "Rivergrain's secret weapon. Stuns everything nearby with pure comedy." },
    butterfly_net: { name: 'Butterfly Net', type: 'weapon', wtype: 'melee', dmg: 16, rate: 0.38, range: 2.2, arc: 2.2, kb: 2, stun: 1.0, icon: 'butterfly_net', value: 140, desc: "Squid's net. Every hit stuns goons for a second." },
    glow_nunchucks: { name: 'Glowstick Nunchucks', type: 'weapon', wtype: 'melee', dmg: 30, rate: 0.3, range: 1.8, arc: 2.4, kb: 4, icon: 'nunchucks', value: 380, desc: "Big Dawg's weapon. Fast, flashy, and very rave." },
    ghillie_suit: { name: "Fox's Ghillie Suit", type: 'armor', dr: 0.22, sneak: 15, icon: 'ghillie', value: 300, desc: '22% damage resist and +15 Sneak. You are a bush now.' },
    // --- expansion: gear (passive while carried) ---
    turbo_sneakers: { name: 'Turbo Sneakers', type: 'gear', icon: 'sneakers', desc: '+10% move speed. Jack fitted them with tiny motors.' },
    lucky_scarf: { name: "Vea's Lucky Scarf", type: 'gear', icon: 'scarf', desc: '+20 max HP. Knitted with love (and a bit of glitter).' },
    sinder_amulet: { name: "Sinder's Eye Amulet", type: 'gear', icon: 'amulet', desc: '+1 Perception. It blinks sometimes. Please ignore that.' },
    council_medal: { name: 'Council Medal', type: 'gear', icon: 'medal', desc: '+10 Speech. Awarded for defeating Ronald Rump in debate.' },
    // --- expansion: consumables & key items ---
    big_bone: { name: 'Giant Bone', type: 'use', heal: 100, icon: 'bone', value: 45, desc: 'Restores 100 HP. Absolutely massive.' },
    vip_pass: { name: 'Dogcore VIP Pass', type: 'quest', icon: 'vip', desc: 'Gets you into the Dogcore Festival. Laminated.' },
    merch_box: { name: 'Merch Box', type: 'quest', icon: 'merch', desc: "A box of Ninefired's festival merch. Mostly bootleg t-shirts." },
    mixtape: { name: "Eski's Mixtape", type: 'quest', icon: 'mixtape', desc: '"ESKI - BARS FROM THE LAKE (VOL. 1)". Deliver to friends.' },
    catfish: { name: 'Legendary Catfish', type: 'quest', icon: 'catfish', desc: 'The one that got away. Until now.' },
    spirit_candle: { name: 'Spirit Candle', type: 'quest', icon: 'candle', desc: 'It lights itself. That is not normal.' },
  };

  for (const k in ITEMS) ITEMS[k].id = k;

  const PERKS = [
    { id: 'agar', name: 'Agar Absorber', desc: 'Like a big blob eating pellets: heal 6 HP on every kill.', req: (g) => g.level >= 2 },
    { id: 'parkour', name: 'Roblox Parkour', desc: '+15% move speed and dodge recharges 30% faster.', req: (g) => g.S.AGI >= 5 },
    { id: 'goodboy', name: 'Good Boy Energy', desc: '+15% XP from quests and talking. Shops 10% cheaper.', req: (g) => g.S.CHA >= 5 },
    { id: 'bigbrain', name: 'Big Brain', desc: '+15% XP from everything.', req: (g) => g.S.INT >= 6 },
    { id: 'bonk', name: 'Bonk', desc: '+20% melee damage and extra knockback.', req: (g) => g.S.STR >= 6 },
    { id: 'eagle', name: 'Eagle Eye', desc: '+20% ranged damage.', req: (g) => g.S.PER >= 6 },
    { id: 'thickfur', name: 'Thick Fur', desc: '+30 max HP.', req: (g) => g.S.END >= 5 },
    { id: 'luckypup', name: 'Lucky Pup', desc: '+7% crit chance and goons drop more bucks.', req: (g) => g.S.LUK >= 6 },
    { id: 'zoomies', name: 'Zoomies', desc: 'B.A.R.K. Time drains 35% less AP.', req: (g) => g.S.AGI >= 6 },
    { id: 'megabark', name: 'Mega Bark', desc: 'Press F to BARK, stunning and pushing back nearby goons (12s cooldown).', req: (g) => g.level >= 4 && g.S.CHA >= 4 },
    { id: 'ironstomach', name: 'Iron Stomach', desc: 'Healing items restore 40% more.', req: (g) => g.S.END >= 6 },
    { id: 'toughness', name: 'Toughness', desc: '-10% damage taken.', req: (g) => g.level >= 3 },
    { id: 'chavdiplo', name: 'Chav Diplomacy', desc: '+15 Speech. "Allow it, bruv."', req: (g) => g.flags.metEski },
    { id: 'hater', name: 'Hyperpop Hater', desc: '+30% damage against Shive.', req: (g) => g.level >= 6 },
    { id: 'packrat', name: 'Scooter Kid', desc: '+10% move speed and +20 max AP.', req: (g) => g.level >= 5 && g.skill('tech') >= 30 },
    { id: 'crit', name: 'Critical Barker', desc: 'Critical hits deal x2.5 instead of x2.', req: (g) => g.S.LUK >= 7 && g.level >= 4 },
    { id: 'bassboost', name: 'Bass Boosted', desc: '+25% damage with thrown and area weapons.', req: (g) => g.level >= 6 },
    { id: 'scavenger', name: 'Scavenger Pup', desc: 'Goons drop healing items twice as often.', req: (g) => g.S.LUK >= 5 && g.level >= 3 },
    { id: 'adrenaline', name: 'Adrenaline Zoomies', desc: 'Below 35% HP you deal +25% damage.', req: (g) => g.level >= 7 },
    { id: 'secondwind', name: 'Second Wind', desc: 'Once every 90 seconds, a hit that would knock you out leaves you on 1 HP instead.', req: (g) => g.level >= 8 && g.S.END >= 5 },
  ];

  const ENEMIES = {
    pup: { name: 'Goon Pup', hp: 26, spd: 3.5, dmg: 4, range: 1.15, cd: 1.3, xp: 14, bucks: [2, 8], look: { dog: { color: '#d8a868', belly: '#f8e0b8', ear: 'floppy', full: true, eye: '#e02a2a' } } },
    hound: { name: 'Goon Hound', hp: 62, spd: 2.8, dmg: 9, range: 1.35, cd: 1.5, xp: 28, bucks: [5, 14], look: { dog: { color: '#7a4a2a', belly: '#c89868', ear: 'pointy', full: true, eye: '#ff3a3a' }, extras: ['collar'] } },
    barker: { name: 'Goon Barker', hp: 32, spd: 3.0, dmg: 6, range: 8, cd: 1.9, xp: 24, bucks: [4, 10], ranged: true, look: { dog: { color: '#f0f0f0', belly: '#ffffff', ear: 'floppy', full: true, spots: true, eye: '#e02a2a' } } },
    raver: { name: 'Goon Raver', hp: 40, spd: 3.4, dmg: 7, range: 8, cd: 1.6, xp: 34, bucks: [6, 14], ranged: true, spread: 3, look: { dog: { color: '#3ad0ff', belly: '#ff8ae8', ear: 'pointy', full: true, eye: '#ffe066' }, extras: ['shades'] } },
    rottweiler: { name: 'The Bouncer', hp: 420, spd: 3.2, dmg: 20, range: 1.6, cd: 1.1, xp: 220, bucks: [60, 90], charge: true, scale: 1.5, look: { dog: { color: '#1e1a18', belly: '#a8682a', ear: 'pointy', full: true, eye: '#ff3a3a' }, extras: ['chain', 'shades'] } },
    bigdawg: { name: 'Big Dawg', hp: 480, spd: 2.9, dmg: 22, range: 1.9, cd: 1.2, xp: 300, bucks: [90, 140], charge: true, scale: 1.8, drop: 'glow_nunchucks', look: { dog: { color: '#7a7a82', belly: '#c8c8d0', ear: 'floppy', full: true, eye: '#ff3a3a' }, extras: ['chain', 'shades', 'collar'] } },
    alpha: { name: 'Goon Alpha', hp: 170, spd: 3.1, dmg: 14, range: 1.5, cd: 1.3, xp: 90, bucks: [25, 50], charge: true, scale: 1.25, look: { dog: { color: '#2a2a32', belly: '#5a5a6a', ear: 'pointy', full: true, eye: '#ffd23a' }, extras: ['chain', 'shades'] } },
  };

  const LOOKS = {
    eli: { skin: '#f2c9a2', hair: '#5a3a1e', hairStyle: 'messy', shirt: '#d8402a', pants: '#2a3a5a', shoes: '#f0f0f0', extras: ['agar'], short: true },
    eli_dog: { skin: '#f2c9a2', hair: '#5a3a1e', hairStyle: 'messy', dog: { color: '#c8884a', belly: '#f0d0a0', ear: 'floppy' }, hood: '#c8884a', short: true, extras: ['smile'] },
    jack: { skin: '#f0c8a0', hair: '#c8a050', hairStyle: 'short', shirt: '#ff7a1a', pants: '#3a3a3a', shoes: '#222', hat: 'bikehelm', hatColor: '#2ad0ff', extras: ['hivis', 'smile'] },
    eski: { skin: '#e8b890', hair: '#1a1a1a', hairStyle: 'buzz', shirt: '#2a2a3a', pants: '#2a2a3a', shoes: '#f8f8f8', hat: 'cap', hatColor: '#f0f0f0', extras: ['stripes', 'chain'] },
    roby: { skin: '#f0d0b0', hair: '#7a4a2a', hairStyle: 'short', shirt: '#5a6a8a', pants: '#4a4a3a', shoes: '#3a2a1a', hat: 'fedora', extras: ['glasses', 'neckbeard'] },
    shive: { skin: '#e8c8f0', hairStyle: 'hyper', robe: '#5a2a8a', shoes: '#2a0a3a', hat: 'wizard', hatColor: '#6a2a9a', extras: ['chain', 'stars', 'beard'], beard: '#ff4fd8' },
    vea: { skin: '#f6d2b8', hair: '#8a4a2a', hairStyle: 'long', shirt: '#ff9ac8', pants: '#5a6aaa', shoes: '#fff', extras: ['bow', 'heart', 'blush', 'smile'] },
    rack: { skin: '#f0c098', hair: '#d8b040', hairStyle: 'messy', shirt: '#4ab84a', pants: '#3a4a7a', shoes: '#6a3a1a', extras: ['derp', 'smile'] },
    squid: { skin: '#f8d8c0', hair: '#2a1a3a', hairStyle: 'long', shirt: '#3aa8a0', pants: '#4a3a2a', shoes: '#2a2a2a', extras: ['antenna', 'bug', 'blush'] },
    sinder: { skin: '#e0c0a0', hair: '#c8c8c8', hairStyle: 'bald', shirt: '#7a6a4a', pants: '#4a4a4a', shoes: '#2a1a0a', extras: ['beard', 'cardigan', 'cane'], beard: '#d8d8d8' },
    rivergrain: { skin: '#f0c8a0', hair: '#aa5a2a', hairStyle: 'short', shirt: '#ffd23a', pants: '#2a6aff', shoes: '#ff3a3a', hat: 'bucket', hatColor: '#4ad0ff', extras: ['clown', 'star', 'smile'] },
    roby_boss: { skin: '#f0d0b0', hair: '#7a4a2a', hairStyle: 'short', dog: { color: '#c8884a', belly: '#f0d0a0', ear: 'floppy' }, hood: '#c8884a', hat: 'fedora', extras: ['glasses', 'neckbeard'] },
    ninefired: { skin: '#eab896', hair: '#2a1a10', hairStyle: 'buzz', shirt: '#c8102e', pants: '#c8102e', shoes: '#f8f8f8', hat: 'cap', hatColor: '#1a1a1a', extras: ['stripes', 'chain', 'smile'] },
    rump: { skin: '#f0a050', hair: '#f8d870', hairStyle: 'swoop', shirt: '#1a1f3a', pants: '#1a1f3a', shoes: '#111111', extras: ['longtie'] },
    jakub: { skin: '#f2cfb0', hair: '#b8864a', hairStyle: 'short', shirt: '#f4f4f4', pants: '#3a3a4a', shoes: '#4a2a1a', hat: 'cap', hatColor: '#6a6a6a', extras: ['polish', 'mustache', 'smile'] },
    bouncer: { dog: { color: '#1e1a18', belly: '#a8682a', ear: 'pointy', full: true, eye: '#ff3a3a' }, extras: ['chain', 'shades'] },
    fox: { skin: '#e8b890', hair: '#c86a2a', hairStyle: 'short', shirt: '#5a6a3a', pants: '#4a5a2a', shoes: '#2a2a1a', hat: 'helmet', hatColor: '#4a5a2a', extras: ['camo', 'smile'] },
  };

  const NPCS = [
    { id: 'vea', name: 'Vea', look: 'vea', x: 95.5, z: 39, iq: 128, iqNote: 'emotional IQ: off the charts' },
    { id: 'rack', name: 'Rack', look: 'rack', x: 107, z: 39, iq: 79, iqNote: 'thinking slowly on purpose' },
    { id: 'roby', name: 'Roby Mink', look: 'roby', x: 115.5, z: 38.8, iq: 187, iqNote: 'self-reported' },
    { id: 'squid', name: 'Squid', look: 'squid', x: 117.5, z: 43.5, iq: 134, iqNote: 'bug genius' },
    { id: 'sinder', name: 'Sinder', look: 'sinder', x: 125, z: 38.8, iq: '???', iqNote: 'he refused the test. He stared at it.' },
    { id: 'jack', name: 'Jack Valentine', look: 'jack', x: 93.5, z: 16.5, iq: 121, iqNote: 'engineer brain' },
    { id: 'eski', name: 'Eski', look: 'eski', x: 113, z: 14.5, iq: 112, iqNote: 'street smart, innit' },
    { id: 'fox', name: 'FlowingFox', look: 'fox', x: 119, z: 61, iq: 104, iqNote: 'tactical genius (self-assessed)' },
    { id: 'rivergrain', name: 'Rivergrain', look: 'rivergrain', x: 85, z: 59.8, iq: 99, iqNote: 'jokestar' },
    { id: 'shive', name: 'Shive', look: 'shive', x: 68, z: 70, hidden: true, iq: 140, iqNote: 'he claims 200' },
    { id: 'robyboss', name: 'Roby Mink', look: 'roby_boss', x: 68, z: 70, iq: 'OVER 9000', iqNote: 'self-reported, again', scale: 1.35 },
    { id: 'ninefired', name: 'Ninefired', look: 'ninefired', x: 162.5, z: 127.2, iq: 109, iqNote: 'proper street smart, innit' },
    { id: 'rump', name: 'Ronald Rump', look: 'rump', x: 124, z: 27.3, iq: 'HUGE', iqNote: 'he says nobody has a bigger IQ, believe him' },
    { id: 'jakub', name: 'Jakub', look: 'jakub', x: 174.5, z: 126.8, iq: 126, iqNote: 'certified funny in two languages' },
    { id: 'bouncer', name: 'The Bouncer', look: 'bouncer', x: 170, z: 157.5, iq: 85, iqNote: 'all muscle', scale: 1.5 },
  ];

  // world pickups: shown when cond(g) is true and not yet collected
  const PICKUPS = [
    { id: 'vc1', item: 'volt_cell', x: 70, z: 13, cond: (g) => g.qStage('jack') >= 10 },
    { id: 'vc2', item: 'volt_cell', x: 103, z: 83, cond: (g) => g.qStage('jack') >= 10 },
    { id: 'vc3', item: 'volt_cell', x: 19, z: 45, cond: (g) => g.qStage('jack') >= 10 },
    { id: 'spk', item: 'speaker', x: 75, z: 19, cond: (g) => g.qStage('eski') >= 10 },
    { id: 'bug1', item: 'rare_bug', x: 46, z: 9, cond: (g) => g.qStage('squid') >= 10 },
    { id: 'bug2', item: 'rare_bug', x: 129, z: 61, cond: (g) => g.qStage('squid') >= 10 },
    { id: 'bug3', item: 'rare_bug', x: 16, z: 74, cond: (g) => g.qStage('squid') >= 10 },
    { id: 'bug4', item: 'rare_bug', x: 79, z: 114, cond: (g) => g.qStage('squid') >= 10 },
    { id: 'bug5', item: 'rare_bug', x: 46, z: 124, cond: (g) => g.qStage('squid') >= 10 },
    { id: 'gc1', item: 'glowcap', x: 30, z: 6, cond: (g) => g.qStage('sinder') >= 10 },
    { id: 'gc2', item: 'glowcap', x: 52, z: 4, cond: (g) => g.qStage('sinder') >= 10 },
    { id: 'gc3', item: 'glowcap', x: 42, z: 12, cond: (g) => g.qStage('sinder') >= 10 },
    { id: 'wf1', item: 'wildflower', x: 122, z: 60, cond: (g) => g.qStage('vea') >= 10 },
    { id: 'wf2', item: 'wildflower', x: 130, z: 58, cond: (g) => g.qStage('vea') >= 10 },
    { id: 'wf3', item: 'wildflower', x: 131, z: 67, cond: (g) => g.qStage('vea') >= 10 },
    { id: 'wf4', item: 'wildflower', x: 121, z: 69, cond: (g) => g.qStage('vea') >= 10 },
    { id: 'rock', item: 'perfect_rock', x: 127, z: 124, cond: (g) => g.qStage('rack') >= 10 },
    // free loot scattered about
    { id: 'l1', item: 'dog_treat', x: 92, z: 42, cond: () => true },
    { id: 'l2', item: 'pizza', x: 120, z: 56, cond: () => true },
    { id: 'l3', item: 'fizzy_pop', x: 60, z: 10, cond: () => true },
    { id: 'l4', item: 'dog_treat', x: 30, z: 60, cond: () => true },
    { id: 'l5', item: 'pizza', x: 90, z: 104, cond: () => true },
    { id: 'l6', item: 'fizzy_pop', x: 130, z: 92, cond: () => true },
    { id: 'l7', item: 'dog_treat', x: 60, z: 124, cond: () => true },
    { id: 'l8', item: 'pizza', x: 24, z: 96, cond: () => true },
    { id: 'mb1', item: 'merch_box', x: 170, z: 104, cond: (g) => g.qStage('main') >= 84 },
    { id: 'mb2', item: 'merch_box', x: 184, z: 104, cond: (g) => g.qStage('main') >= 84 },
    { id: 'mb3', item: 'merch_box', x: 177, z: 109, cond: (g) => g.qStage('main') >= 84 },
    { id: 'mb4', item: 'merch_box', x: 188, z: 101, cond: (g) => g.qStage('main') >= 84 },
    { id: 'sc1', item: 'spirit_candle', x: 55, z: 186, cond: (g) => g.qStage('sinder2') >= 10 },
    { id: 'sc2', item: 'spirit_candle', x: 64, z: 185, cond: (g) => g.qStage('sinder2') >= 10 },
    { id: 'sc3', item: 'spirit_candle', x: 50, z: 176, cond: (g) => g.qStage('sinder2') >= 10 },
    { id: 'l9', item: 'big_bone', x: 160, z: 50, cond: () => true },
    { id: 'l10', item: 'fizzy_pop', x: 180, z: 126, cond: () => true },
    { id: 'l11', item: 'big_bone', x: 36, z: 170, cond: () => true },
    { id: 'l12', item: 'pizza', x: 140, z: 86, cond: () => true },
    { id: 'l13', item: 'big_bone', x: 166, z: 152, cond: () => true },
  ];

  // goon camps
  const CAMPS = [
    { id: 'lane', name: 'Lane Goons', x: 110, z: 40.5, r: 3, members: ['pup', 'pup', 'pup'], lvl: 1, when: (g) => g.qStage('main') === 20, respawn: 0 },
    { id: 'scrapyard', x: 72, z: 15, r: 4, members: ['pup', 'pup', 'hound', 'barker'], lvl: 1, respawn: 240 },
    { id: 'doghouse', x: 101, z: 80, r: 4, members: ['hound', 'hound', 'barker', 'barker', 'pup'], lvl: 2, respawn: 300 },
    { id: 'denver', x: 22, z: 47, r: 4, members: ['pup', 'barker', 'barker', 'hound'], lvl: 2, respawn: 240 },
    { id: 'pylonN', x: 40, z: 8, r: 3, members: ['alpha', 'pup', 'barker'], lvl: 2, respawn: 0 },
    { id: 'pylonW', x: 12, z: 64, r: 3, members: ['alpha', 'hound', 'barker'], lvl: 3, respawn: 0 },
    { id: 'pylonD', x: 132, z: 112, r: 3, members: ['alpha', 'hound', 'hound', 'barker'], lvl: 3, respawn: 0 },
    { id: 'hecklers', x: 87, z: 57, r: 3, members: ['pup', 'pup', 'barker', 'barker'], lvl: 2, when: (g) => g.qStage('river') === 10, respawn: 0 },
    { id: 'woods', x: 48, z: 118, r: 4, members: ['pup', 'pup', 'barker'], lvl: 2, respawn: 180 },
    { id: 'sherrills', x: 80, z: 106, r: 4, members: ['hound', 'barker'], lvl: 2, respawn: 180 },
    { id: 'cornelius', x: 120, z: 86, r: 4, members: ['pup', 'barker', 'pup'], lvl: 2, respawn: 180 },
    { id: 'meadow', x: 125, z: 63, r: 3, members: ['pup', 'pup'], lvl: 1, respawn: 180 },
    { id: 'parkgoons', x: 34, z: 4, r: 3, members: ['pup', 'barker'], lvl: 2, respawn: 200 },
    { id: 'warehouse', x: 178, z: 105, r: 4, members: ['bigdawg', 'hound', 'raver', 'pup', 'raver'], lvl: 3, respawn: 0 },
    { id: 'ramsey', x: 144, z: 84, r: 3, members: ['pup', 'barker', 'hound', 'pup'], lvl: 2, respawn: 240 },
    { id: 'davidson', x: 182, z: 28, r: 3, members: ['raver', 'pup', 'barker'], lvl: 3, respawn: 200 },
    { id: 'huntersville', x: 186, z: 112, r: 3, members: ['raver', 'hound', 'raver'], lvl: 3, respawn: 200 },
    { id: 'terrell', x: 40, z: 186, r: 3, members: ['hound', 'barker', 'raver'], lvl: 3, respawn: 200 },
    { id: 'milake', x: 120, z: 158, r: 3, members: ['pup', 'raver', 'barker'], lvl: 3, respawn: 200 },
    { id: 'i77', x: 152, z: 76, r: 3, members: ['raver', 'pup', 'pup'], lvl: 3, respawn: 220 },
    { id: 'festival', x: 170.5, z: 170, r: 4, members: ['raver', 'raver', 'hound', 'barker', 'alpha'], lvl: 4, when: (g) => g.flags.gateOpen, respawn: 0 },
  ];

  const PYLONS = [
    { id: 'pylonN', name: 'North Bass Pylon', x: 40.5, z: 6.5 },
    { id: 'pylonW', name: 'West Bass Pylon', x: 11.5, z: 62.5 },
    { id: 'pylonD', name: 'Dam Bass Pylon', x: 132.5, z: 110.5 },
  ];

  const ZAPPERS = [
    { id: 'zap1', name: 'Bug Zapper', kind: 'zapper', x: 126.5, z: 61.5 },
    { id: 'zap2', name: 'Bug Zapper', kind: 'zapper', x: 146.5, z: 90.5 },
    { id: 'zap3', name: 'Bug Zapper', kind: 'zapper', x: 176.5, z: 58.5 },
  ];
  // interaction spots: fishing holes and watchtowers (positions snapped to the shore / tower base in game)
  const SPOTS = [
    { id: 'fish_pier', kind: 'fish', x: 84, z: 56 },
    { id: 'fish_ramsey', kind: 'fish', x: 139, z: 91 },
    { id: 'fish_mil', kind: 'fish', x: 100, z: 172 },
    { id: 'tower1', kind: 'tower', x: 186.5, z: 66.5 },
    { id: 'tower2', kind: 'tower', x: 190.5, z: 148.5 },
    { id: 'tower3', kind: 'tower', x: 16.5, z: 182 },
  ];
  const RACE = { time: 36, cps: [[100.5, 22], [100.5, 39.5], [128, 40.5], [150.5, 40.5], [150.5, 19], [125, 18.8], [101, 18.8]] };
  const RAID = [
    ['pup', 'pup', 'pup', 'pup'],
    ['pup', 'barker', 'barker', 'raver', 'pup'],
    ['hound', 'hound', 'raver', 'raver', 'alpha'],
  ];

  const SHOPS = {
    eski: { name: "Eski's Dodgy Deals", stock: ['dog_treat', 'pizza', 'fizzy_pop', 'riot_onesie', 'ban_hammer'] },
    ninefired: { name: "Ninefired's Bargains", stock: ['big_bone', 'pizza', 'fizzy_pop', 'padded_jacket', 'riot_onesie', 'ban_hammer'] },
    jack: { name: 'Volt Valentine Parts & Snacks', stock: ['dog_treat', 'fizzy_pop', 'padded_jacket', 'slingshot'] },
  };

  const pc = (g, item) => g.count(item);
  const QUESTS = {
    main: {
      name: 'The Stolen Costume', main: true, giver: 'Vea',
      stages: {
        0: { text: 'Talk to Vea outside your house on Aldersprings Lane.', target: 'npc:vea' },
        10: { text: 'Find FlowingFox at his Outpost south of Aldersprings Lane.', target: 'npc:fox' },
        20: { text: (g) => `Basic Training: defeat Shive's Goons on Aldersprings Lane (${g.flags.laneKills || 0}/3).`, target: [110, 40.5] },
        30: { text: 'Pick up the flyer the goons dropped and report back to FlowingFox.', target: 'npc:fox' },
        40: { text: 'Show the Hyperpop Flyer to Roby Mink on Aldersprings Lane.', target: 'npc:roby' },
        50: { text: 'Get the Bass Pylon locations from Roby Mink (help with his petition or talk him round).', target: 'npc:roby' },
        60: { text: (g) => `Destroy the Bass Pylons powering Shive's barrier (${g.pylonsDown()}/3). Get a way across the water from Jack Valentine${g.has('hydro_scooter') ? ' (done!)' : ''}.`, target: 'pylon' },
        70: { text: "The barrier is down! Go to Rivergrain's Pier and ride the Hydro-Scooter to Shive's Island.", target: 'pier' },
        80: { text: "Defeat Shive at his Spire and take back your dog costume!", target: 'npc:shive' },
        81: { text: 'Shive escaped with your costume! Go back across the lake and tell Vea what happened.', target: 'npc:vea' },
        82: { text: 'Ask Roby Mink where Shive went. He tracks everything online.', target: 'npc:roby' },
        83: { text: "Find Eski's cousin Ninefired in Birkdale Village (Huntersville, past I-77) and get a festival VIP pass.", target: 'npc:ninefired' },
        84: { text: (g) => `Raid the Goon Warehouse east of I-77 and recover Ninefired's merch (${pc(g, 'merch_box')}/4). Watch out for Big Dawg.`, target: 'item:merch_box' },
        85: { text: 'Bring the merch back to Ninefired in Birkdale Village.', target: 'npc:ninefired' },
        86: { text: 'You have the VIP pass! Rally your friends: report to FlowingFox at his Outpost.', target: 'npc:fox' },
        87: { text: (g) => `Defend Aldersprings Lane from Shive's goon raid!${g.raidWave ? ` (Wave ${g.raidWave()}/3)` : ''}`, target: [108, 40.5] },
        88: { text: 'The lane is safe! Head south to the Dogcore Festival in Huntersville and get past the Bouncer.', target: 'npc:bouncer' },
        89: { text: 'Storm the festival and defeat Shive on the main stage before the midnight bass drop!', target: 'npc:shive' },
        90: { text: 'You got your costume back! Head home to Aldersprings Lane and tell Vea.', target: 'npc:vea' },
        91: { text: "ROBY MINK BETRAYED YOU and stole your costume! Chase him to Shive's Island: ride the Hydro-Scooter from Rivergrain's Pier.", target: 'pier' },
        92: { text: 'Defeat Roby Mink, Lord of the Upvotes, at the Spire and take your costume back!', target: 'npc:robyboss' },
        93: { text: 'You got your costume back. AGAIN. Head home and tell Vea everything.', target: 'npc:vea' },
        100: { text: 'Lake Norman is safe. Eli is a dog again.', done: true },
      },
    },
    fox: {
      name: 'Operation Doghouse', giver: 'FlowingFox',
      stages: {
        10: { text: 'Clear out the Doghouse Camp in the woods south-west of the Outpost.', target: [101, 80] },
        20: { text: 'Report back to FlowingFox.', target: 'npc:fox' },
        100: { text: 'Mission accomplished, soldier.', done: true },
      },
    },
    jack: {
      name: 'Charged Up', giver: 'Jack Valentine',
      stages: {
        10: { text: (g) => `Find the 3 Volt Cells the goons stole from Jack's factory (${pc(g, 'volt_cell')}/3). Check the Scrapyard, Doghouse Camp and Denver Goon Camp.`, target: 'item:volt_cell' },
        20: { text: 'Bring the Volt Cells back to Jack Valentine.', target: 'npc:jack' },
        100: { text: 'Jack built you a Hydro-Scooter!', done: true },
      },
    },
    eski: {
      name: "Where's Me Speaker, Bruv?", giver: 'Eski',
      stages: {
        10: { text: "Get Eski's speaker back from the goons at the Mooresville Scrapyard.", target: 'item:speaker' },
        20: { text: 'Return the speaker to Eski at The Estate.', target: 'npc:eski' },
        100: { text: 'Eski has his speaker back. Bare bass.', done: true },
      },
    },
    roby: {
      name: 'Power to the Petition', giver: 'Roby Mink',
      stages: {
        10: { text: (g) => `Collect signatures for Roby's noise petition from Rack, Squid, Sinder and Rivergrain (${g.sigs()}/4).`, target: 'sigs' },
        20: { text: 'Bring the signed petition back to Roby Mink.', target: 'npc:roby' },
        100: { text: 'Democracy has been served (to Roby).', done: true },
      },
    },
    squid: {
      name: 'Bug Collector', giver: 'Squid',
      stages: {
        10: { text: (g) => `Find 5 Rare Bugs around Lake Norman for Squid (${pc(g, 'rare_bug')}/5).`, target: 'item:rare_bug' },
        20: { text: 'Bring the Rare Bugs to Squid.', target: 'npc:squid' },
        100: { text: 'Squid has new bug friends.', done: true },
      },
    },
    rack: {
      name: 'The Perfect Rock', giver: 'Rack',
      stages: {
        10: { text: 'Find the "perfectest rock in the world" that Rack saw at Cowans Ford Dam.', target: 'item:perfect_rock' },
        20: { text: 'Bring the Suspiciously Perfect Rock to Rack.', target: 'npc:rack' },
        100: { text: 'Rack has his rock. He named it Rocky.', done: true },
      },
    },
    sinder: {
      name: "Sinder's Strange Brew", giver: 'Sinder',
      stages: {
        10: { text: (g) => `Collect 3 Glowcap Mushrooms in Lake Norman State Park for Sinder (${pc(g, 'glowcap')}/3).`, target: 'item:glowcap' },
        20: { text: 'Bring the Glowcaps to Sinder. Try not to think about why he wants them.', target: 'npc:sinder' },
        100: { text: 'Sinder brewed something. You are not sure what.', done: true },
      },
    },
    river: {
      name: 'Tough Crowd', giver: 'Rivergrain',
      stages: {
        10: { text: "Get rid of the goon hecklers at Rivergrain's Pier.", target: [87, 57] },
        20: { text: 'Tell Rivergrain the hecklers are gone.', target: 'npc:rivergrain' },
        100: { text: 'The Jokestar of Lake Norman rides again.', done: true },
      },
    },
    jack2: {
      name: 'Scooter Rally', giver: 'Jack Valentine',
      stages: {
        10: { text: (g) => (g.race ? `RACE! Hit every checkpoint (${g.race.cp}/${RACE.cps.length}) - ${Math.ceil(g.race.t)}s left!` : `Beat Jack's rally course around Mooresville in under ${RACE.time} seconds. Talk to Jack to start.`), target: 'race' },
        20: { text: 'You won the rally! Tell Jack.', target: 'npc:jack' },
        100: { text: 'Fastest dog on Lake Norman.', done: true },
      },
    },
    eski2: {
      name: 'Mixtape Drop', giver: 'Eski',
      stages: {
        10: { text: (g) => `Hand out Eski's mixtape to Rack, Squid, Rivergrain and Jack (${['rack', 'squid', 'rivergrain', 'jack'].filter((n) => g.flags['tape_' + n]).length}/4).`, target: 'tapes' },
        20: { text: 'Tell Eski how his mixtape went down.', target: 'npc:eski' },
        100: { text: 'Bars delivered. Bare streams.', done: true },
      },
    },
    roby2: {
      name: 'Council Showdown', giver: 'Roby Mink',
      stages: {
        10: { text: 'Beat HOA President Ronald Rump in a debate outside Lake Norman Civic Hall in Mooresville.', target: 'npc:rump' },
        20: { text: 'Tell Roby you won the debate.', target: 'npc:roby' },
        100: { text: 'Democracy, again, served.', done: true },
      },
    },
    squid2: {
      name: 'Zap the Zappers', giver: 'Squid',
      stages: {
        10: { text: (g) => `Smash the 3 Bug Zappers the goons set up (${g.zappersDown()}/3): Davidson Meadows, Ramsey Creek Park and Davidson College.`, target: 'zapper' },
        20: { text: 'Tell Squid the bugs are safe.', target: 'npc:squid' },
        100: { text: 'The bugs are free.', done: true },
      },
    },
    rack2: {
      name: 'The One That Got Away', giver: 'Rack',
      stages: {
        10: { text: "Catch the Legendary Catfish for Rack. Fish at Rivergrain's Pier, Ramsey Creek or Mountain Island Lake (press E at a fishing spot).", target: 'spot:fish' },
        20: { text: 'Bring the Legendary Catfish to Rack.', target: 'npc:rack' },
        100: { text: 'Rack named the catfish "Rocky Steve 2".', done: true },
      },
    },
    sinder2: {
      name: "Sinder's Seance", giver: 'Sinder',
      stages: {
        10: { text: (g) => `Collect 3 Spirit Candles from the graveyard at the Old Terrell Church (${pc(g, 'spirit_candle')}/3).`, target: 'item:spirit_candle' },
        20: { text: 'Bring the Spirit Candles to Sinder. He is "expecting company".', target: 'npc:sinder' },
        100: { text: 'The seance happened. Nobody will talk about it.', done: true },
      },
    },
    river2: {
      name: 'Open Mic Night', giver: 'Rivergrain',
      stages: {
        10: { text: 'Beat Jakub, the Polish comedy king, in a joke-off at the Birkdale Comedy Cellar.', target: 'npc:jakub' },
        20: { text: 'Tell Rivergrain you won the joke-off.', target: 'npc:rivergrain' },
        100: { text: 'The Jokestar crown stays on Lake Norman.', done: true },
      },
    },
    vea2: {
      name: 'Picnic at Ramsey Creek', giver: 'Vea',
      stages: {
        10: { text: 'Clear the goons out of Ramsey Creek Park (east of Cornelius) so Vea can have a picnic.', target: [144, 84] },
        20: { text: 'Tell Vea the park is safe.', target: 'npc:vea' },
        100: { text: 'Best picnic ever.', done: true },
      },
    },
    fox2: {
      name: 'Operation Overwatch', giver: 'FlowingFox',
      stages: {
        10: { text: (g) => `Plant spy cams on 3 watchtowers: Davidson, Huntersville and Terrell (${['tower1', 'tower2', 'tower3'].filter((t) => g.flags['cam_' + t]).length}/3).`, target: 'spot:tower' },
        20: { text: 'Report back to FlowingFox.', target: 'npc:fox' },
        100: { text: 'The lake is under surveillance. Responsibly.', done: true },
      },
    },
    vea: {
      name: 'Wildflowers for Vea', giver: 'Vea',
      stages: {
        10: { text: (g) => `Pick 4 Wildflowers in Davidson Meadows for Vea (${pc(g, 'wildflower')}/4).`, target: 'item:wildflower' },
        20: { text: 'Give the flowers to Vea.', target: 'npc:vea' },
        100: { text: 'Vea loved the flowers.', done: true },
      },
    },
  };

  return { SPECIAL, SKILLS, ITEMS, PERKS, ENEMIES, LOOKS, NPCS, PICKUPS, CAMPS, PYLONS, ZAPPERS, SPOTS, RACE, RAID, SHOPS, QUESTS };
})();
