// ---------- Epilogue: Roby Mink's betrayal ----------
(() => {
  const D = DLG;
  const preEntry = (id, fn) => { const old = D[id].entry; D[id].entry = (g) => fn(g) || old(g); };
  const addNodes = (id, nodes) => Object.assign(D[id].nodes, nodes);
  const main = (g) => g.qStage('main');

  // ======================= VEA =======================
  preEntry('vea', (g) => ((main(g) === 91 || main(g) === 92) ? 'roby_news' : null));
  addNodes('vea', {
    pre_betray: {
      text: "ELI! Is that... you got it back?! Oh my gosh, come here- wait. Why is Roby sprinting down the lane at us? And why are his glasses GLOWING?",
      choices: [{ t: '...Roby?', next: null, do: (g) => g.robyAmbush() }],
    },
    roby_news: {
      text: "Roby did WHAT?! That- that NERD! After everything?! *deep breath* Okay. Go get it back, Eli. I'll be here. I'm going to write him a VERY strongly worded comment. With no emojis. He'll know I'm serious.",
      choices: [
        { t: 'Could you patch me up first?', next: 'heal' },
        { t: "I'm going.", next: null },
      ],
    },
  });

  // ======================= ROBY (the ambush) =======================
  preEntry('roby', (g) => (g.flags.robyEnd && !g.flags.robySorry ? 'sorry' : null));
  addNodes('roby', {
    betray: {
      text: "*panting* Eli! Wait! Before you go to Vea... *adjusts fedora* ...can I see the costume? Just for a second. For... research.",
      choices: [
        { t: 'Sure, Roby. Here.', next: 'betray2' },
        { t: 'Why?', next: 'betray2' },
        { t: 'Why are your glasses glowing?', next: 'betray_per', check: { stat: 'PER', v: 6 }, fail: 'betray2' },
      ],
    },
    betray_per: {
      text: "*the glow flickers* They're... blue-light glasses. Very advanced. ...You noticed. Of course you noticed. Fine. No more pretending.",
      choices: [{ t: 'Pretending?', next: 'betray2' }],
    },
    betray2: {
      text: "*SNATCHES THE COSTUME* HA! While you were fighting Shive, I took his spellbook from the festival stage. The CODEX OF WOOF. Shive was a hack. He didn't understand the maths. But I DO. With the ORIGINAL costume, the one his spell was tuned to, I'll become the smartest dog on the internet. Every post: front page. Every comment: gilded. LORD UPVOTE, ULTIMATE MODERATOR OF LAKE NORMAN!",
      choices: [
        { t: 'Roby, give it BACK!', next: 'betray3' },
        { t: 'Squid is going to be so disappointed in you.', next: 'betray_squid' },
        { t: "You don't need a costume to be smart, Roby. You already are.", next: 'betray_speech', check: { skill: 'speech', v: 70 }, fail: 'betray3' },
      ],
    },
    betray_squid: {
      text: "...Squid will understand. When I'm a genius dog I'll buy her the biggest bug collection in North Carolina. She'll... she'll understand. *voice cracks* (Roby is shaken: he'll start the fight weaker.)",
      on: (g) => { g.flags.robyRattled = true; },
      choices: [{ t: 'She will NOT understand.', next: 'betray3' }],
    },
    betray_speech: {
      text: "*hesitates* ...You think I'm... smart? Nobody's ever- NO! Don't do that! Emotions are for people with low karma! (Roby is shaken: he'll start the fight weaker.)",
      on: (g) => { g.flags.robyRattled = true; g.xp(40, true); },
      choices: [{ t: 'Roby...', next: 'betray3' }],
    },
    betray3: {
      text: "Give it back? Ratio. L. You fell off. *the costume starts to glow in his hands* I'll be at Shive's Spire finishing the ritual. Don't follow me, Eli. I've already downvoted you. *POOF*",
      choices: [{ t: 'ROBY!!!', next: null, do: (g) => g.robyBetray() }],
    },
    sorry: {
      text: "Eli. I... I owe you an apology. A big one. Not a 4,000-word one. Just: I'm sorry. I deleted my Reddit account. *pause* ...I made a new one. But it's only bug facts now. Squid runs it. I'm a moderator. Of nothing. It's nice.",
      on: (g) => { g.flags.robySorry = true; },
      choices: [{ t: "We're good, Roby.", next: null }],
    },
  });

  // ======================= SQUID =======================
  preEntry('squid', (g) => ((main(g) === 91 || main(g) === 92) && !g.flags.squidWorried ? 'worried' : null));
  addNodes('squid', {
    worried: {
      text: "Eli... Roby left me a note. 'Gone to become a god. Feed Gerald.' Gerald's the woodlouse. Roby isn't a god, Eli, he's a NERD. He's MY nerd. Please bring him back. And... bonk him a little. Not too much. Here, take these for the fight.",
      on: (g) => { g.flags.squidWorried = true; g.give('big_bone', 2); },
      choices: [{ t: "I'll bring him back.", next: null }],
    },
  });

  // ======================= ROBY, LORD OF THE UPVOTES =======================
  D.robyboss = {
    entry: (g) => (g.flags.robyDefeated ? 'defeated' : 'confront'),
    nodes: {
      confront: {
        text: "*floating in front of the Spire, wearing YOUR costume with his fedora on top, the Codex of Woof glowing beside him* Eli Grogan. I knew you'd come. Statistically, 94% of protagonists do. The ritual is almost complete. Once the Codex finishes compiling, I become LORD UPVOTE.",
        choices: [
          { t: 'Take my costume off, Roby.', next: 'c2' },
          { t: "Your '94%' statistic is from a Reddit comment with three upvotes.", next: 'c_int', check: { stat: 'INT', v: 8 }, fail: 'c_int_fail' },
          { t: 'Squid misses you. She told me to bring you home.', next: 'c_cha', check: { stat: 'CHA', v: 7 }, fail: 'c2' },
        ],
      },
      c_int: {
        text: "...It WAS three upvotes. One of them was mine. HOW DID YOU KNOW THAT?! *his concentration breaks* (Roby is rattled: he starts the fight weaker.)",
        on: (g) => { g.flags.robyRattled = true; g.xp(40, true); },
        choices: [{ t: 'Give it up, Roby.', next: 'c2' }],
      },
      c_int_fail: {
        text: "Source? SOURCE?! I AM the source! I've been cited by four other redditors! Five if you count my alt!",
        choices: [{ t: '...Your alt.', next: 'c2' }],
      },
      c_cha: {
        text: "*his lip wobbles* She... she said that? Does Gerald miss me too? ...NO! FOCUS, ROBY! (Roby is rattled: he starts the fight weaker.)",
        on: (g) => { g.flags.robyRattled = true; g.xp(40, true); },
        choices: [{ t: "Gerald definitely misses you.", next: 'c2' }],
      },
      c2: {
        text: "I was right about EVERYTHING. The pylons. The festival. Shive. And did anyone thank me? Did anyone UPVOTE me? NO! Well, now the whole lake will have to listen. MODERATORS... ASSEMBLE! *a ring of Mod Goons crawls out of the Spire*",
        choices: [{ t: "Let's go, Lord Upvote.", next: null, do: (g) => g.bossStart('island', 'roby') }],
      },
      defeated: {
        text: "*sprawled on the floor, fedora crooked, glasses cracked, the Codex smoking* ...I was wrong. Statistically, that has never happened before. *takes off the costume* Take it, Eli. I'm sorry. I just... I just wanted people to listen to me.",
        choices: [
          { t: "We always listen, Roby. Even to the 40-minute voice notes.", next: 'forgive' },
          { t: "*BONK* That's for the downvote.", next: 'bonk' },
          { t: 'Burn the Codex and go apologise to Squid. Properly.', next: 'redeem', check: { skill: 'speech', v: 60 }, fail: 'redeem_fail' },
        ],
      },
      forgive: {
        text: "*sniffles* ...Even the voice notes? *wipes glasses* Okay. Okay. I'm going home. Squid's going to kill me. Gerald's going to kill me. I deserve it.",
        on: (g) => g.robyEnd('forgiven'),
        choices: [{ t: '*puts costume on* WOOF.', next: null }],
      },
      bonk: {
        text: "*BONK* OW! Fair! FAIR! Completely fair! I'd upvote that bonk if I still had an account! *scrambles to the Hydro-Scooter*",
        on: (g) => g.robyEnd('bonked'),
        choices: [{ t: '*puts costume on* WOOF.', next: null }],
      },
      redeem: {
        text: "*throws the Codex of Woof into the lake, where it fizzes and sinks* ...You're right. I'll apologise to Squid. And Shive, weirdly. And Rack, for every time I called him low IQ. He's actually very wise. Rocky Steve told me.",
        on: (g) => { g.xp(150, true); g.robyEnd('redeemed'); },
        choices: [{ t: '*puts costume on* WOOF.', next: null }],
      },
      redeem_fail: {
        text: "Burn it?! It's the only copy! It has FOOTNOTES! ...Fine. You keep the costume, I keep the book. For historical research. Only research.",
        on: (g) => g.robyEnd('forgiven'),
        choices: [{ t: '*puts costume on* WOOF.', next: null }],
      },
    },
  };
})();
