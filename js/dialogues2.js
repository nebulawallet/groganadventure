// ---------- Expansion dialogue: Act 3 (the Dogcore Festival), new characters, second side quests ----------
(() => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const D = DLG;

  // helpers to bolt new behaviour onto existing trees
  const preEntry = (id, fn) => { const old = D[id].entry; D[id].entry = (g) => fn(g) || old(g); };
  const addNodes = (id, nodes) => Object.assign(D[id].nodes, nodes);
  const addHub = (id, ...choices) => { const hub = D[id].nodes.hub.choices; hub.splice(hub.length - 1, 0, ...choices); };
  const side = (q) => (g) => g.qStage(q);

  // ---- Eski's mixtape: each friend gets a "here's the tape" option ----
  const TAPE = {
    rack: "A mixtape! *puts it in his mouth* ...Oh, it's for LISTENING. *listens* ...It made my ears feel warm. Five stars. Six stars. Is six allowed?",
    squid: "*listens* Eli... the crickets are chirping along. They're ON BEAT. Eski has rhythm that bugs respect. That's the highest honour there is.",
    rivergrain: "*listens* 'Shive tryna be a dog but man's bare weird.' HA! That's a good line! Tell him I'm stealing it for my set.",
    jack: "*plays it through the factory speakers* Yo, this actually slaps. Kinda absurd, kinda unhinged. Very 3am-sketch-channel energy. Love it.",
  };
  for (const npc of Object.keys(TAPE)) {
    addNodes(npc, {
      tape: {
        text: TAPE[npc],
        on: (g) => { g.take('mixtape', 1); g.flags['tape_' + npc] = true; g.xp(20, true); g.checkQuests(); },
        choices: [{ t: "I'll tell Eski.", next: 'hub' }],
      },
    });
    addHub(npc, { t: "Eski wanted you to have his mixtape.", next: 'tape', cond: (g) => g.qStage('eski2') === 10 && g.has('mixtape') && !g.flags['tape_' + npc] });
  }

  // ======================= VEA =======================
  preEntry('vea', (g) => {
    if (g.qStage('main') === 81) return 'escaped';
    if (g.qStage('vea2') === 20) return 'picnic_done';
    return null;
  });
  addNodes('vea', {
    escaped: {
      text: "Eli! I saw the glitter explosion from here! Are you okay? ...He got away? WITH the costume? Oh, Eli. *hugs you* Okay. Deep breaths. We'll get it back. Roby's been glued to his phone all night. If anyone knows where Shive went, it's him.",
      on: (g) => g.qSet('main', 82),
      choices: [
        { t: 'Thanks, Vea.', next: null },
        { t: 'I almost had him.', next: 'almost' },
      ],
    },
    almost: {
      text: "And next time you WILL. You beat him once, you can beat him again. That's just maths. Roby said so. Go!",
      choices: [{ t: '*determined bark*', next: null }],
    },
    picnic_offer: {
      text: "When this is all over, let's have a picnic! At Ramsey Creek Park, east of Cornelius. Except... Squid says goons have taken it over. Could you clear them out? I'll make sandwiches! The good ones, with the crusts cut off.",
      on: (g) => { if (g.qStage('vea2') === 0) g.qSet('vea2', 10); g.forceCamp('ramsey'); },
      choices: [{ t: "Crusts off? I'm in.", next: null }],
    },
    picnic_done: {
      text: "You cleared the WHOLE park? For a picnic? Eli! *wraps a scarf round your neck* I knitted this for you. It's lucky. Like the bracelet, but warmer. And here, I packed you something big.",
      on: (g) => { g.give('lucky_scarf', 1); g.give('big_bone', 1); g.qSet('vea2', 100); g.xp(200, true); g.recalc(); },
      choices: [{ t: "Best picnic ever.", next: null }],
    },
  });
  addHub('vea', { t: 'Want to do something fun after all this?', next: 'picnic_offer', cond: (g) => g.qStage('vea') === 100 && g.qStage('vea2') === 0 });

  // ======================= FLOWINGFOX =======================
  preEntry('fox', (g) => {
    if (g.qStage('main') === 86) return 'rally';
    if (g.qStage('fox2') === 20) return 'overwatch_done';
    return null;
  });
  addNodes('fox', {
    rally: {
      text: "A VIP pass? OUTSTANDING, soldier! But bad news: intel just came in. Shive's sending a goon raid to Aldersprings Lane to keep you busy while he preps the festival. We hold the line FIRST. Get back to the lane and defend it! Three waves, maybe more. I'll provide moral support from right here. HOOAH!",
      on: (g) => g.qSet('main', 87),
      choices: [{ t: 'HOOAH!', next: null }],
    },
    overwatch_offer: {
      text: "New op, private: Operation Overwatch. I need spy cams on three watchtowers: one in Davidson, one in Huntersville and one out west in Terrell. Press E at the base of each tower to plant a cam. Purely for lake security. And bird watching. Mostly bird watching.",
      on: (g) => { if (g.qStage('fox2') === 0) g.qSet('fox2', 10); },
      choices: [{ t: 'Sir, yes sir!', next: null }],
    },
    overwatch_done: {
      text: "Cams are LIVE! I can see EVERYTHING. A raccoon just stole a sandwich in Terrell. Unbelievable. The audacity. Here, take my Ghillie Suit, private. You've earned it. You'll look like a very brave bush.",
      on: (g) => { g.give('ghillie_suit', 1); g.money(60); g.qSet('fox2', 100); g.xp(220, true); },
      choices: [{ t: 'Thanks, Fox!', next: null }],
    },
  });
  addHub('fox', { t: 'Got another mission?', next: 'overwatch_offer', cond: (g) => g.qStage('fox') === 100 && g.qStage('fox2') === 0 });

  // ======================= JACK =======================
  preEntry('jack', (g) => (g.qStage('jack2') === 20 ? 'race_done' : null));
  addNodes('jack', {
    race_offer: {
      text: "Yo, you wanna RACE? Jack's Rally: out of the factory, down to Aldersprings, across to I-77, up and back round Mooresville. I'll lend you a scooter for it. Beat 36 seconds and I'll hook you up with something sick.",
      choices: [
        { t: "Let's race!", next: null, do: (g) => { if (g.qStage('jack2') === 0) g.qSet('jack2', 10); g.startRace(); } },
        { t: 'Later.', next: null },
      ],
    },
    race_retry: {
      text: (g) => pick(["Run it back? Let's GO.", "Again? Respect. Scooter's still warm.", "Third time's the charm, bro. Or fourth. Or fifth."]),
      choices: [
        { t: 'Start the race!', next: null, do: (g) => g.startRace() },
        { t: 'Not yet.', next: null },
      ],
    },
    race_done: {
      text: "YOU BEAT MY TIME?! Bro. BRO. Okay, take these: Turbo Sneakers. I put tiny scooter motors in the soles. +10% speed, forever. Do not tell health and safety. We don't have health and safety, but still.",
      on: (g) => { g.give('turbo_sneakers', 1); g.qSet('jack2', 100); g.xp(200, true); },
      choices: [{ t: '*zooms in place*', next: null }],
    },
  });
  addHub('jack',
    { t: 'Fancy a race?', next: 'race_offer', cond: (g) => g.qStage('jack') === 100 && g.qStage('jack2') === 0 },
    { t: 'Let me try the rally again.', next: 'race_retry', cond: (g) => g.qStage('jack2') === 10 && !g.race },
  );

  // ======================= ESKI =======================
  preEntry('eski', (g) => (g.qStage('eski2') === 20 ? 'tape_done' : null));
  addNodes('eski', {
    tape_offer: {
      text: "Bruv. BRUV. Me mixtape's DONE. 'Bars From The Lake, Volume One.' I need you to hand it out to the mandem: Rack, Squid, Rivergrain and Jack. Get me some reviews, innit. Honest ones. But good ones.",
      on: (g) => { if (g.qStage('eski2') === 0) { g.give('mixtape', 4); g.qSet('eski2', 10); } },
      choices: [{ t: "I'll get you reviews.", next: null }],
    },
    tape_done: {
      text: "They loved it?! Rack said WHAT? 'It made his ears feel warm'? I'll TAKE IT. Squid said the BUGS liked it?! Bruv I'm going platinum with insects. Here, take this: the Bass Cannon. Built it from me old speaker. It fires actual BARS.",
      on: (g) => { g.give('bass_cannon', 1); g.qSet('eski2', 100); g.xp(220, true); },
      choices: [{ t: 'Fire.', next: 'hub' }],
    },
    cousin: {
      text: "Ninefired? That's my cousin, bruv! Proper sound. Same nan. He's in Birkdale Village, Huntersville, past the motorway. Tell him Eski sent you and he'll sort you out. Probably. He's a bit of a wheeler-dealer, innit.",
      choices: [{ t: 'Cheers, Eski.', next: 'hub' }],
    },
  });
  addHub('eski',
    { t: 'Got anything else going on?', next: 'tape_offer', cond: (g) => g.qStage('eski') === 100 && g.qStage('eski2') === 0 },
    { t: 'Tell me about your cousin Ninefired.', next: 'cousin', cond: (g) => g.qStage('main') >= 83 && g.qStage('main') <= 85 },
  );

  // ======================= ROBY =======================
  preEntry('roby', (g) => {
    if (g.qStage('main') === 82) return 'track';
    if (g.qStage('roby2') === 20) return 'council_done';
    return null;
  });
  addNodes('roby', {
    track: {
      text: "*not looking up from phone* I know, I know. Shive escaped. I've been tracking his socials for six hours straight. His latest story: 'DOGCORE FESTIVAL. HUNTERSVILLE. MIDNIGHT. I BECOME DOG.' Geotag's south, past I-77. Problem: it's VIP only. But Eski's cousin Ninefired sells passes in Birkdale Village. Allegedly legally.",
      on: (g) => g.qSet('main', 83),
      choices: [
        { t: 'Thanks, Roby.', next: null },
        { t: 'How do you know all this?', next: 'notifs' },
      ],
    },
    notifs: {
      text: 'I have notifications on for four thousand accounts. Sleep is for people with average IQs.',
      choices: [{ t: 'That explains a lot.', next: null }],
    },
    council_offer: {
      text: "Outrage. OUTRAGE. Ronald Rump, the HOA president, just announced he SUPPORTS Shive's festival. 'Tremendous for business,' he says. Someone needs to beat him in a public debate outside the Civic Hall in Mooresville. I would, but he blocked me. On everything. Including email.",
      on: (g) => { if (g.qStage('roby2') === 0) g.qSet('roby2', 10); },
      choices: [{ t: "I'll debate him.", next: null }],
    },
    council_done: {
      text: "You BEAT Ronald Rump?! In a DEBATE?! *frantically typing* This is going on the front page. Take this: the Council Medal. +10 Speech. I had it made... for myself. But you've earned it. Probably more than me. Don't quote me.",
      on: (g) => { g.give('council_medal', 1); g.qSet('roby2', 100); g.xp(220, true); },
      choices: [{ t: 'Democracy wins again.', next: null }],
    },
  });
  addHub('roby', { t: 'Any council drama?', next: 'council_offer', cond: (g) => g.qStage('main') >= 60 && g.qStage('roby2') === 0 });

  // ======================= SQUID =======================
  preEntry('squid', (g) => (g.qStage('squid2') === 20 ? 'zap_done' : null));
  addNodes('squid', {
    zap_offer: {
      text: "Eli, it's TERRIBLE. The goons put up BUG ZAPPERS. Three of them! Davidson Meadows, Ramsey Creek Park and Davidson College. *ZZZT* That's the sound of a moth's dreams ending. Please, smash them!",
      on: (g) => { if (g.qStage('squid2') === 0) g.qSet('squid2', 10); },
      choices: [{ t: "I'll smash every one.", next: null }],
    },
    zap_done: {
      text: "All three?! The moths are free! THE MOTHS ARE FREE! Here, take my butterfly net. Every bonk stuns. Be gentle with it. Do NOT be gentle with goons.",
      on: (g) => { g.give('butterfly_net', 1); g.qSet('squid2', 100); g.xp(200, true); },
      choices: [{ t: 'Thanks, Squid!', next: null }],
    },
  });
  addHub('squid', { t: 'Do the bugs need help again?', next: 'zap_offer', cond: (g) => g.qStage('squid') === 100 && g.qStage('squid2') === 0 });

  // ======================= RACK =======================
  preEntry('rack', (g) => (g.qStage('rack2') === 20 ? 'fish_done' : null));
  addNodes('rack', {
    fish_offer: {
      text: "Eli! Rocky Steve is lonely. He wants a FISH friend. There's a Legendary Catfish in the lake, big as a car! Well. A small car. A toy car. Can you catch it? There's fishing spots at the pier, Ramsey Creek and Mountain Island Lake. Press E to fish!",
      on: (g) => { if (g.qStage('rack2') === 0) g.qSet('rack2', 10); },
      choices: [{ t: "I'll catch it.", next: null }],
    },
    fish_done: {
      text: "IS THAT HIM?! He's BEAUTIFUL! I'll call him... Rocky Steve Two. Here, have my fishing rod, I don't need it now. It's also really good for bonking. I found that out by accident.",
      on: (g) => { g.take('catfish', 1); g.give('fishing_rod', 1); g.qSet('rack2', 100); g.xp(200, true); },
      choices: [{ t: 'Enjoy, Rack.', next: null }],
    },
  });
  addHub('rack', { t: 'Need anything else, Rack?', next: 'fish_offer', cond: (g) => g.qStage('rack') === 100 && g.qStage('rack2') === 0 });

  // ======================= SINDER =======================
  preEntry('sinder', (g) => (g.qStage('sinder2') === 20 ? 'seance_done' : null));
  addNodes('sinder', {
    seance_offer: {
      text: "Hehehe. Eli. I'm having a little get-together. A seance. Old friends. Very old. I need three Spirit Candles from the graveyard at the Old Terrell Church, way out west. The candles will find you. Mostly.",
      on: (g) => { if (g.qStage('sinder2') === 0) g.qSet('sinder2', 10); },
      choices: [{ t: '...Sure, Sinder.', next: null }],
    },
    seance_done: {
      text: "*the candles light themselves as you hand them over* Ahhh. My old friends are here. Don't look behind you. *you look behind you. There's nothing there.* ...They like you, Eli. They want you to have this. It sees things.",
      on: (g) => { g.take('spirit_candle', 3); g.give('sinder_amulet', 1); g.qSet('sinder2', 100); g.xp(220, true); },
      choices: [{ t: '*backs away slowly* Thanks!', next: null }],
    },
  });
  addHub('sinder', { t: 'Got any more... errands?', next: 'seance_offer', cond: (g) => g.qStage('sinder') === 100 && g.qStage('sinder2') === 0 });

  // ======================= RIVERGRAIN =======================
  preEntry('rivergrain', (g) => (g.qStage('river2') === 20 ? 'mic_done' : null));
  addNodes('rivergrain', {
    mic_offer: {
      text: "Kid. There's a new comic in Birkdale. Jakub. Polish fella. Everyone's saying he's the funniest guy on the lake. THE FUNNIEST. That's MY title! Go to the Birkdale Comedy Cellar and beat him in a joke-off. For the honour of the pier!",
      on: (g) => { if (g.qStage('river2') === 0) g.qSet('river2', 10); },
      choices: [{ t: 'For the pier!', next: null }],
    },
    mic_done: {
      text: "You beat Jakub?! ...Honestly? I went and watched his set after. He's hilarious. We're doing a double act now. But STILL. Here: my Whoopee Cushion. Comedy's ultimate weapon. Stuns everything in range.",
      on: (g) => { g.give('whoopee_cushion', 1); g.qSet('river2', 100); g.xp(200, true); },
      choices: [{ t: '*squeeze* Pfffbbt.', next: null }],
    },
  });
  addHub('rivergrain', { t: 'Any new gigs?', next: 'mic_offer', cond: (g) => g.qStage('river') === 100 && g.qStage('river2') === 0 });

  // ======================= SHIVE (escape + festival) =======================
  D.shive.entry = (g) => {
    if (g.flags.shiveDefeated) return 'defeated';
    if (g.qStage('main') >= 88) return 'fest';
    return 'confront';
  };
  addNodes('shive', {
    escape: {
      text: "*on one knee, gasping* Okay... you're strong. Stronger than my last album sales. But THIS? This was just a SOUNDCHECK! *glitter explodes everywhere* The REAL show is the DOGCORE FESTIVAL! When the bass drops at midnight, my spell finishes and I become a REAL DOG! Catch me if you can, Grogan! *teleports away WITH your costume*",
      choices: [{ t: 'SHIVE!!!', next: null, do: (g) => g.shiveEscape() }],
    },
    fest: {
      text: "*spotlight hits the stage* WELL, WELL, WELL! Eli Grogan crashes my festival! *wearing your costume, now with a sequinned cape* Thirty seconds to midnight, Eli. When the bass drops, I become a REAL DOG. Forever! Any last words?",
      choices: [
        { t: 'Not if I drop you first.', next: 'fest2' },
        { t: "Shive... look around. The crowd's leaving. Nobody's here for you.", next: 'fest_cha', check: { stat: 'CHA', v: 7 }, fail: 'fest2' },
        { t: 'Give. Me. My. Costume.', next: 'fest2' },
      ],
    },
    fest_cha: {
      text: "*looks at the crowd* ...They're... they're going to the merch stand? THEY'RE BUYING NINEFIRED'S BOOTLEGS?! *visibly shaken* (Shive starts the fight weaker.)",
      on: (g) => { g.flags.shiveRattled2 = true; g.xp(40, true); },
      choices: [{ t: "Let's end this.", next: 'fest2' }],
    },
    fest2: {
      text: "GOONS! LIGHTS! BASS! *the speakers roar* THIS IS THE FINAL DROP, GROGAN!",
      choices: [{ t: "Let's go!", next: null, do: (g) => g.bossStart('festival') }],
    },
  });

  // ======================= NINEFIRED =======================
  D.ninefired = {
    entry: (g) => {
      const s = g.qStage('main');
      if ((s === 84 || s === 85) && g.count('merch_box') >= 4) return 'merch_done';
      if (s === 83) return g.flags.metNine ? 'pass' : 'meet';
      if (!g.flags.metNine) return 'meet';
      return 'hub';
    },
    nodes: {
      meet: {
        text: "Oi oi! You must be Eli, innit? Eski's told me BARE stuff about you. Says you're on a proper mad one. Wagwan, cuz?",
        on: (g) => { g.flags.metNine = true; },
        choices: [
          { t: 'I need a VIP pass for the Dogcore Festival.', next: 'pass', cond: (g) => g.qStage('main') === 83 },
          { t: "You're Eski's cousin?", next: 'cousin' },
          { t: 'Just looking around.', next: 'hub', cond: (g) => g.qStage('main') !== 83 },
        ],
      },
      cousin: {
        text: "Cousins, yeah. Same nan. She's proper sound, does the best roast in Huntersville. Eski got the bars, I got the business brain. Family, innit.",
        choices: [
          { t: 'I need a VIP pass for the festival.', next: 'pass', cond: (g) => g.qStage('main') === 83 },
          { t: 'Nice.', next: 'hub' },
        ],
      },
      pass: {
        text: "VIP pass? For Shive's festival? Bruv, them things are gold dust. I HAD a whole box... then his goons only went and robbed my merch stall. Four boxes of merch, gone. Took 'em to their warehouse east of the motorway.",
        choices: [
          { t: 'I get your merch back, you get me a pass?', next: 'deal' },
          { t: "Come on, cuz. We're practically family.", next: 'family', check: { skill: 'speech', v: 55 }, fail: 'family_fail' },
        ],
      },
      family: {
        text: "...Practically family. *wipes eye* Eski said you was smooth. Fine. Here's my last pass. Don't tell him I went soft. (You still get a bonus if you bring my merch back, yeah?)",
        on: (g) => { g.give('vip_pass', 1); g.qSet('main', 86); g.xp(60, true); },
        choices: [{ t: 'Legend.', next: null }],
      },
      family_fail: {
        text: "Hah! Nice try, cuz. Family pays full price. Ask my nan.",
        choices: [{ t: 'Fine. What do you need?', next: 'deal' }],
      },
      deal: {
        text: "Deal, bruv. Four boxes. Big grey goon called Big Dawg runs that warehouse. He's well hench. Proper unit. Don't get merked.",
        on: (g) => { if (g.qStage('main') === 83) g.qSet('main', 84); },
        choices: [
          { t: "I'll handle him.", next: null },
          { t: 'Got a shop?', next: null, do: (g) => g.openShop('ninefired') },
        ],
      },
      merch_done: {
        text: "MY MERCH! Bruv, you're a LEGEND, same as Eski said! *opens box* 'SHIVE DOGCORE TOUR'... spelt 'SHEIVE'. Bootlegs, innit. Still sell. Here: VIP pass, laminated and everything. And a little something for your trouble.",
        on: (g) => { g.take('merch_box', 4); if (!g.has('vip_pass')) g.give('vip_pass', 1); g.money(90); g.xp(250, true); if (g.qStage('main') < 86) g.qSet('main', 86); },
        choices: [{ t: 'Cheers, Ninefired.', next: null }],
      },
      hub: {
        text: (g) => pick(["You good, cuz?", "Wagwan, Eli!", "Business is booming, bruv. Booming.", "*counting a stack of bucks* Oh. Safe."]),
        choices: [
          { t: "Let's see the shop.", next: null, do: (g) => g.openShop('ninefired') },
          { t: 'Any tips for the festival?', next: 'tips' },
          { t: 'Laters.', next: null },
        ],
      },
      tips: {
        text: (g) => pick([
          "The Bouncer on the gate's a massive rottweiler goon. Show him a pass and he's sweet. Don't show him a pass and... yeah.",
          "Them Raver goons throw three glowsticks at once. Keep moving, innit.",
          "Shive's got a shield again. Sinder's whistle still works on it, I heard. Or wait till he gets tired.",
          "Stock up on Giant Bones before the festival. Trust.",
        ]),
        choices: [{ t: 'Safe.', next: 'hub' }],
      },
    },
  };

  // ======================= RONALD RUMP =======================
  const rumpRound = (win, next) => (g) => { if (win) g.flags.rumpPts = (g.flags.rumpPts || 0) + 1; };
  D.rump = {
    entry: (g) => (g.qStage('roby2') === 10 && !g.flags.rumpBeaten ? 'debate' : 'hub'),
    nodes: {
      hub: {
        text: (g) => pick([
          "Ronald Rump. HOA President. Tremendous president. Some say the best president this lake has ever had. Probably ever. What do you want, kid?",
          "Kid, I have the best lawn on Lake Norman. Everybody says so. Very green. The greenest.",
          "*adjusting his long red tie* Make Lake Norman Great Again. I came up with that. Nobody else. Just me.",
        ]),
        choices: [
          { t: 'Why are you so orange?', next: 'orange' },
          { t: 'What do you think of Shive?', next: 'shive' },
          { t: "What's with the hair?", next: 'hair' },
          { t: 'Bye.', next: null },
        ],
      },
      orange: {
        text: "It's a natural glow. Very natural. The MOST natural. People come up to me, big strong men, tears in their eyes, and they say 'Sir, how are you so golden?' True story.",
        choices: [{ t: 'Right.', next: 'hub' }],
      },
      shive: {
        text: (g) => g.flags.rumpBeaten
          ? "Shive? I never liked him. Never. Low energy. You beat me fair and square, kid. Mostly fair. A little square."
          : "Shive? Great guy. Rich guy. Very rich. His festival is tremendous for business. His music? ...Sad. I've heard better music from my car alarm. And I have the best car alarm.",
        choices: [{ t: 'Okay.', next: 'hub' }],
      },
      hair: {
        text: "The hair is real. One hundred percent. Many people have tried to touch it. Nobody has succeeded. It's protected. By a very strong wind. Natural wind.",
        choices: [{ t: 'Sure.', next: 'hub' }],
      },
      debate: {
        text: "So. Roby Mink sent you, huh? The little Reddit guy with the hat. Fine! A debate. I'm the best debater. Everybody says so. ROUND ONE: Shive's noise is GOOD for the lake. Brings in tourists. Tremendous tourists.",
        on: (g) => { g.flags.rumpPts = 0; },
        choices: [
          { t: "The noise is scaring off tourists AND the bugs. Squid has data.", next: 'r1win', check: { skill: 'speech', v: 35 }, fail: 'r1lose' },
          { t: 'Property values near the pylons dropped 30%. Your HOA lost money.', next: 'r1win', check: { stat: 'INT', v: 6 }, fail: 'r1lose' },
          { t: 'Your face is orange.', next: 'r1lose' },
        ],
      },
      r1win: { text: "...That's - okay, that's a good point. Lucky. Very lucky. The crowd is clapping. Fake clapping. ROUND TWO!", on: rumpRound(true), choices: [{ t: 'Bring it.', next: 'round2' }] },
      r1lose: { text: "That's not an argument, that's a COMPLIMENT. Thank you. The crowd agrees with me. ROUND TWO!", choices: [{ t: 'Hmph.', next: 'round2' }] },
      round2: {
        text: "Round two! The goons in dog costumes? Great security. The best security. And it's FREE security! Who doesn't love free?",
        choices: [
          { t: '*turns to the crowd* Raise your hand if a goon stole your stuff.', next: 'r2win', check: { stat: 'CHA', v: 6 }, fail: 'r2lose' },
          { t: "They stole seventeen costumes and Jack's batteries. That's not security, that's crime.", next: 'r2win', check: { skill: 'speech', v: 45 }, fail: 'r2lose' },
          { t: 'Dogs are pretty cool though.', next: 'r2lose' },
        ],
      },
      r2win: { text: "*every hand in the crowd goes up* ...Okay. That's a lot of hands. Very big hands, some of them. ROUND THREE! The final round! The biggest round!", on: rumpRound(true), choices: [{ t: 'Final round.', next: 'round3' }] },
      r2lose: { text: "See? Even the kid agrees! Dogs are cool! Goons are dogs! I win round two! Tremendous! ROUND THREE!", choices: [{ t: 'Ugh.', next: 'round3' }] },
      round3: {
        text: "Final round. My plan: I build a WALL around Aldersprings Lane. A big, beautiful wall. And I make the goons pay for it.",
        choices: [
          { t: "The goons have no money. I took it all off them.", next: 'r3win', check: { stat: 'INT', v: 7 }, fail: 'r3lose' },
          { t: "A wall won't stop a wizard. He FLIES.", next: 'r3win', check: { skill: 'speech', v: 55 }, fail: 'r3lose' },
          { t: '*barks at him*', next: 'r3bark' },
        ],
      },
      r3win: { text: "*long pause* ...He flies? Nobody told me he flies. Why does nobody tell me these things?!", on: rumpRound(true), choices: [{ t: 'And the verdict?', next: 'verdict' }] },
      r3lose: { text: "Wrong! The wall would be very tall. The tallest. Taller than wizards. Wizards would look at it and say 'wow'.", choices: [{ t: 'And the verdict?', next: 'verdict' }] },
      r3bark: { text: "*the crowd starts barking with you* ...Is this... is this a movement? I don't like this movement.", on: rumpRound(true), choices: [{ t: 'And the verdict?', next: 'verdict' }] },
      verdict: {
        text: (g) => ((g.flags.rumpPts || 0) >= 2
          ? `The crowd votes... YOU win, ${g.flags.rumpPts}-${3 - g.flags.rumpPts}. *Rump stares at the sky* Rigged. Totally rigged. But fine. FINE. I withdraw my support for Shive's festival. Tell the Reddit guy he can unblock himself. I mean - I'll unblock him.`
          : `The crowd votes... Rump wins, ${3 - (g.flags.rumpPts || 0)}-${g.flags.rumpPts || 0}. "Tremendous! Another big win for Ronald!" (You need to win 2 of 3 rounds. Level up your Speech, INT or CHA, then try again.)`),
        on: (g) => { if ((g.flags.rumpPts || 0) >= 2) { g.flags.rumpBeaten = true; g.qSet('roby2', 20); } },
        choices: [
          { t: 'Rematch!', next: 'debate', cond: (g) => !g.flags.rumpBeaten },
          { t: 'Done.', next: null },
        ],
      },
    },
  };

  // ======================= JAKUB =======================
  const JOKES = [
    "In Poland we say 'not my circus, not my monkeys'. Here in America, every circus is my circus. I have been to your Walmart.",
    "I moved to North Carolina for the weather. In Krakow, winter is six months. Here, summer is six months and it is like living inside a hot dumpling.",
    "My grandmother makes four hundred pierogi every Sunday. Nobody asks for four hundred pierogi. Nobody finishes four hundred pierogi. Still. Every Sunday. Four hundred.",
    "American portion sizes are crazy. I ordered 'small' fries. They came with their own postcode.",
    "My English teacher said I would never be a comedian in English. Well, Mrs. Kowalska, who is laughing now? ...Nobody. Okay. Next joke.",
    "I tried to explain Polish grammar to an American. Seven cases! He said 'that's crazy'. I said, you have 'read' and 'read' and they are different words. Who is crazy now?",
  ];
  const jakPt = (g) => { g.flags.jakPts = (g.flags.jakPts || 0) + 1; };
  D.jakub = {
    entry: (g) => (g.qStage('river2') === 10 && !g.flags.jakubBeaten ? 'jokeoff' : 'hub'),
    nodes: {
      hub: {
        text: (g) => pick(["Dzien dobry! I am Jakub. Best comedian in Birkdale. Also only comedian in Birkdale. You want a joke?", "Ah, my friend Eli! Sit, sit. The show is free. The pierogi are not.", "Hello! Have you heard the one about the Polish comedian? It is me. I am the one."]),
        choices: [
          { t: 'Tell me a joke.', next: 'joke' },
          { t: "What's the comedy scene like here?", next: 'scene' },
          { t: 'Bye, Jakub.', next: null },
        ],
      },
      joke: {
        text: () => pick(JOKES),
        choices: [{ t: '*laughs*', next: 'hub' }, { t: 'Another one!', next: 'joke' }],
      },
      scene: {
        text: (g) => (g.flags.jakubBeaten
          ? "Now? Wonderful. Me and Rivergrain, double act. 'The Pier and the Pierogi.' Sold out every night. Well. Eleven people. But eleven HAPPY people."
          : "Very good! Except there is a man on a pier who says he is 'Jokestar of Lake Norman'. I have seen his business card. He made it himself. I respect this."),
        choices: [{ t: 'Ha.', next: 'hub' }],
      },
      jokeoff: {
        text: "Ah! Rivergrain sends a challenger! Okay, okay. JOKE-OFF! I give you the setup, you give me the punchline. Best of three. The crowd decides. *the eleven people in the crowd cheer*",
        on: (g) => { g.flags.jakPts = 0; },
        choices: [{ t: "Let's go.", next: 'jr1' }],
      },
      jr1: {
        text: 'Round one! Why did the goon bring a ladder to the festival?',
        choices: [
          { t: 'Because he heard the drinks were on the house!', next: 'j1good' },
          { t: "To reach the high notes in Shive's songs! *perfect timing*", next: 'j1good', check: { stat: 'CHA', v: 6 }, fail: 'j1bad' },
          { t: "Because he's a goon.", next: 'j1bad' },
        ],
      },
      j1good: { text: '*the crowd roars* Ha! Classic! Very good. Round one to Eli!', on: jakPt, choices: [{ t: 'Next!', next: 'jr2' }] },
      j1bad: { text: '*one person coughs* ...Ah. The crowd is thinking. Thinking is not laughing. Round one to Jakub!', choices: [{ t: 'Next!', next: 'jr2' }] },
      jr2: {
        text: 'Round two! What do you call a Polish dog who loves comedy?',
        choices: [
          { t: "A Pole-dle! *wiggles eyebrows*", next: 'j2good', check: { skill: 'speech', v: 40 }, fail: 'j2bad' },
          { t: "Jakub's biggest fan!", next: 'j2good' },
          { t: 'A pierogi-pug?', next: 'j2bad' },
        ],
      },
      j2good: { text: "*the crowd loses it* Okay, OKAY! Even I am laughing! Round two to Eli!", on: jakPt, choices: [{ t: 'Final round!', next: 'jr3' }] },
      j2bad: { text: "A pierogi-pug... I would eat that. But I would not laugh at it. Round two to Jakub!", choices: [{ t: 'Final round!', next: 'jr3' }] },
      jr3: {
        text: "FINAL ROUND! Why is Shive's music like my grandmother's pierogi?",
        choices: [
          { t: 'Because nobody asked for four hundred of them!', next: 'j3good' },
          { t: "Because they both repeat the same thing over and over.", next: 'j3good', check: { stat: 'INT', v: 6 }, fail: 'j3bad' },
          { t: "Because they're both mid.", next: 'j3bad' },
        ],
      },
      j3good: { text: "*standing ovation from all eleven people* A CALLBACK! You used MY joke against me! This is the highest art!", on: jakPt, choices: [{ t: 'And the winner is...?', next: 'jverdict' }] },
      j3bad: { text: "Mid? MID? My grandmother would chase you with a wooden spoon. Round three to Jakub!", choices: [{ t: 'And the winner is...?', next: 'jverdict' }] },
      jverdict: {
        text: (g) => ((g.flags.jakPts || 0) >= 2
          ? "The crowd has decided... ELI WINS! *Jakub bows deeply* Bravo! You are funny like a Polish uncle at a wedding. This is the biggest compliment I have. Tell Rivergrain he has a good student."
          : "The crowd has decided... Jakub wins! Thank you, thank you! Don't be sad, my friend. Come back, we go again. Comedy is a marathon. With pierogi stops."),
        on: (g) => { if ((g.flags.jakPts || 0) >= 2) { g.flags.jakubBeaten = true; g.qSet('river2', 20); } },
        choices: [
          { t: 'Rematch!', next: 'jokeoff', cond: (g) => !g.flags.jakubBeaten },
          { t: 'Good show, Jakub.', next: null },
        ],
      },
    },
  };

  // ======================= THE BOUNCER =======================
  D.bouncer = {
    entry: (g) => (g.flags.gateOpen ? 'open' : g.qStage('main') < 88 ? 'notyet' : 'gate'),
    nodes: {
      notyet: {
        text: "*cracks knuckles* Festival ain't started yet, little man. Come back at midnight. Or never. Never's good.",
        choices: [{ t: 'Okay...', next: null }],
      },
      gate: {
        text: "*a wall of muscle in a rottweiler costume* Festival's VIP only. Shive's orders. You VIP, little man? You don't LOOK VIP.",
        choices: [
          { t: '[Show the VIP pass]', next: 'pass', cond: (g) => g.has('vip_pass') },
          { t: "I'm the opening act. Shive will be FURIOUS if I'm late.", next: 'talked', check: { skill: 'speech', v: 60 }, fail: 'talk_fail' },
          { t: "Then I'll go through you.", next: 'fight' },
          { t: 'Leave.', next: null },
        ],
      },
      pass: {
        text: "*squints at the pass for a very long time* ...Laminated. Legit. *steps aside* Enjoy the show, VIP. *quietly* You won't.",
        on: (g) => g.openGate(),
        choices: [{ t: 'Thanks, big guy.', next: null }],
      },
      talked: {
        text: "...The opening act? Nobody told me there was an opening act. *panics* Go, GO! Don't tell Shive I held you up!",
        on: (g) => g.openGate(),
        choices: [{ t: '*strolls in*', next: null }],
      },
      talk_fail: {
        text: "Nice try. The opening act is a DJ called Pupperoni. You ain't Pupperoni.",
        choices: [{ t: '[Show the VIP pass]', next: 'pass', cond: (g) => g.has('vip_pass') }, { t: "Then I'll go through you.", next: 'fight' }, { t: 'Leave.', next: null }],
      },
      fight: {
        text: "*his eyes glow red behind his shades* Wrong answer, little man.",
        choices: [{ t: '*raises fists*', next: null, do: (g) => g.bouncerFight() }],
      },
      open: {
        text: (g) => (g.flags.bouncerBeaten ? "*groans from the floor* ...Just go in. My tail hurts." : "Go on then. Shive's on the main stage. Good luck. You'll need it."),
        choices: [{ t: 'Cheers.', next: null }],
      },
    },
  };
})();
