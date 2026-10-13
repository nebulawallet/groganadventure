// ---------- Post-game: Ronald Rump vs Sleepy Joe (parody HOA election) ----------
(() => {
  const D = DLG;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const preEntry = (id, fn) => { const old = D[id].entry; D[id].entry = (g) => fn(g) || old(g); };
  const addNodes = (id, nodes) => Object.assign(D[id].nodes, nodes);
  const addHub = (id, ...choices) => { const hub = D[id].nodes.hub.choices; hub.splice(hub.length - 1, 0, ...choices); };

  // ======================= RONALD RUMP =======================
  preEntry('rump', (g) => (g.qStage('rump2') === 30 ? 'joe_report' : null));
  addNodes('rump', {
    joe_offer: {
      text: "Kid! You beat the Reddit guy. Tremendous. Huge. Now I need a REAL fighter. There's a man. Sleepy Joe. Very sleepy. The sleepiest. He's running against me for HOA President, and he brought an ARMY. The Blue Army. They've taken over Davidson College. Very unfair. Go beat them and I'll make you my Vice President. Of the HOA. It's a huge deal.",
      choices: [
        { t: "I'll do it.", next: 'joe_go' },
        { t: "Why don't YOU fight him?", next: 'joe_why' },
        { t: 'Maybe later.', next: null },
      ],
    },
    joe_why: {
      text: "I have bone spurs. Very bad bone spurs. In my... bones. Also my hair can't get wet. Or windy. Or near a door. It's a whole thing.",
      choices: [{ t: "Fine. I'll do it.", next: 'joe_go' }],
    },
    joe_go: {
      text: "Fantastic! The Blue Army is camped on the college quad in Davidson. Big guys in suits. Aviator sunglasses. They throw ICE CREAM, kid. It's a disgrace. A delicious disgrace. Go get 'em!",
      on: (g) => { if (g.qStage('rump2') === 0) g.qSet('rump2', 10); },
      choices: [{ t: 'On it.', next: null }],
    },
    joe_report: {
      text: (g) => ({
        friends: "You brought him HERE? ...You know what, he's not bad company. He told me a story about a pony that lasted forty minutes. I fell asleep. HE fell asleep. Great story. We're co-presidents now. Nobody can agree on sprinkles. Here, kid, the Golden Gavel. You earned it.",
        bed: "You beat Sleepy Joe?! TREMENDOUS! I always said you were my favourite. I said it first. Nobody said it before me. Here: the Golden Gavel. Solid gold. Mostly gold. Some gold.",
        bonked: "You BONKED him? Kid, that's... honestly that's a little rough. He's an old guy. ...But tremendous bonk. Huge bonk. Take the Golden Gavel. Don't bonk me with it.",
      }[g.flags.joeEnd] || 'Tremendous work, kid. Here, the Golden Gavel.'),
      on: (g) => { g.give('golden_gavel', 1); g.money(250); g.xp(300, true); g.qSet('rump2', 100); g.flags.rumpVP = true; },
      choices: [{ t: 'Thanks, Mr. President.', next: 'vp' }],
    },
    vp: {
      text: "Vice President Grogan. Of the HOA. Sounds fantastic. Your first job: tell Rack to stop putting rocks on my lawn. He says they're 'visiting'.",
      choices: [{ t: '...Sure.', next: null }],
    },
  });
  addHub('rump',
    { t: 'Got any jobs for me?', next: 'joe_offer', cond: (g) => g.qStage('main') >= 93 && g.qStage('rump2') === 0 },
    { t: 'Where is the Blue Army again?', next: 'joe_go', cond: (g) => g.qStage('rump2') === 10 || g.qStage('rump2') === 20 },
  );

  // ======================= SLEEPY JOE =======================
  const JOE_LINES = [
    "Here's the deal, Jack. Ronald and I? We go way back. He still owes me five bucks from 1987.",
    "*licks ice cream* Chocolate chip. Best flavour. Don't let anybody tell you different. Not even Ronald.",
    "When I was your age I fought a goose named Corn Pop. Big goose. Bad goose. True story. Mostly true.",
    "Co-president! It's a big deal. Ronald handles the shouting. I handle the naps.",
    "C'mon, man. Have you tried the ice cream at the Birkdale stand? Ninefired gave me a discount. Said I looked like his nan.",
  ];
  D.joe = {
    entry: (g) => {
      if (g.flags.joeEnd === 'friends') return 'after';
      return g.flags.joeDefeated ? 'defeated' : 'confront';
    },
    nodes: {
      confront: {
        text: "*on a bench with an ENORMOUS ice cream cone, aviators on, half asleep* ...Hm? Oh! Here's the deal, Jack. Listen. *long pause* ...What was I saying? Oh, right. You're the kid Ronald sent. You know Ronald still owes me five bucks from 1987? C'mon, man.",
        choices: [
          { t: "My name's Eli, not Jack.", next: 'name' },
          { t: 'Rump says you rigged the HOA election.', next: 'rigged' },
          { t: 'Can I have some of that ice cream?', next: 'icecream', check: { stat: 'CHA', v: 6 }, fail: 'icecream_fail' },
        ],
      },
      name: {
        text: "Eli! Of course. Great kid. Reminds me of me. When I was your age, I fought a goose named Corn Pop. Big goose. Anyway, here's the deal-",
        choices: [{ t: 'The deal?', next: 'c2' }],
      },
      rigged: {
        text: "Rigged? MALARKEY! A whole bunch of malarkey! The only thing rigged around here is Ronald's hair. ...Is that a real thing? I'm asking. Nobody's ever touched it.",
        choices: [{ t: 'Nobody has ever touched it.', next: 'c2' }],
      },
      icecream: {
        text: "*holds it out, then pulls it back* ...Okay. One lick. *you take one lick* That was a BIG lick, Jack. That was half the scoop. C'mon, man! (Joe is flustered: he starts the fight weaker.)",
        on: (g) => { g.flags.joeRattled = true; g.xp(40, true); },
        choices: [{ t: 'Delicious.', next: 'c2' }],
      },
      icecream_fail: {
        text: "Get your own, Jack! Family recipe! Chocolate chip! There's a stand in Birkdale!",
        choices: [{ t: 'Fine.', next: 'c2' }],
      },
      c2: {
        text: "Look. Here's the deal. I'm not leaving. This HOA needs a leader with experience. Fifty years of experience. In... something. BLUE ARMY! ROLL OUT! *pushes up his aviators* C'mon, man. Let's dance.",
        choices: [{ t: "Let's go, Joe.", next: null, do: (g) => g.bossStart('college', 'joe') }],
      },
      defeated: {
        text: "*sitting on the grass, ice cream all over his aviators* Okay, okay, okay. You got me, Jack. Eli. Jack. ...I need a nap. A big one.",
        choices: [
          { t: 'Then go have that nap, Joe. A long one.', next: 'bed' },
          { t: "Why don't you and Rump share that ice cream and stop fighting?", next: 'friends', check: { skill: 'speech', v: 55 }, fail: 'friends_fail' },
          { t: '*BONK*', next: 'bonk' },
        ],
      },
      bed: {
        text: "*already snoring on the bench* ...zzz... corn pop... zzz... two scoops... zzz...",
        on: (g) => g.joeEnd('bed'),
        choices: [{ t: '*tiptoes away*', next: null }],
      },
      friends: {
        text: "...Share with Ronald? *very long pause* ...He does like two scoops. I always get one, he gets two. Very petty. ...Alright, Jack. Bipartisan ice cream social. At the Civic Hall. I'll bring the sprinkles. He'll bring the shouting.",
        on: (g) => g.joeEnd('friends'),
        choices: [{ t: 'Best of luck, co-presidents.', next: null }],
      },
      friends_fail: {
        text: "Share with RONALD? He double-dips, Jack. He DOUBLE DIPS. No. I'm going home. And I'm taking a nap. Malarkey.",
        on: (g) => g.joeEnd('bed'),
        choices: [{ t: 'Fair enough.', next: null }],
      },
      bonk: {
        text: "*BONK* Ow! C'mon, man! That's my ice cream arm! ...Okay, okay, I concede. I'll run for president of the Lake Norman Bowling Club instead. Much easier. Nobody bowls.",
        on: (g) => g.joeEnd('bonked'),
        choices: [{ t: '*dusts off hands*', next: null }],
      },
      after: {
        text: () => pick(JOE_LINES),
        choices: [{ t: "Ha. See you, Joe.", next: null }],
      },
    },
  };
})();
