// ---------- Dialogue trees ----------
// node: { text: string|fn(g), on?: fn(g), choices: [{ t, next, cond?, do?, check?: {skill|stat, v}, fail? }] }
// next: node id, or null to end the conversation.
const DLG = (() => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sigChoice = (who, next) => ({ t: "Would you sign Roby's petition against Shive's noise?", next, cond: (g) => g.qStage('roby') === 10 && !g.flags['sig_' + who] });

  const D = {};

  // ======================= VEA =======================
  D.vea = {
    entry: (g) => {
      if (g.qStage('main') === 0) return 'intro';
      if (g.qStage('main') === 90) return 'ending';
      if (g.qStage('vea') >= 10 && g.qStage('vea') < 100 && g.count('wildflower') >= 4) return 'flowers_done';
      return 'hub';
    },
    nodes: {
      intro: {
        text: "Eli! There you are! I came over to show you my new bracelet and- wait. Why do you look so upset? Your face is all scrunchy.",
        choices: [
          { t: 'My dog costume is GONE, Vea. Someone stole it!', next: 'intro2' },
          { t: "*growls* I'm going to bark at whoever did this until they cry.", next: 'intro_angry' },
          { t: "Nothing. I'm fine. Totally fine.", next: 'intro_fine' },
        ],
      },
      intro_fine: {
        text: "Eli, you're literally growling. And you're not wearing your ears. You ALWAYS wear your ears. What happened?",
        choices: [{ t: "...Someone stole my dog costume.", next: 'intro2' }],
      },
      intro_angry: {
        text: "Okay, angry Eli is kind of cute, but let's channel that energy! Who did this? What happened?",
        choices: [{ t: 'I woke up and my dog costume was GONE.', next: 'intro2' }],
      },
      intro2: {
        text: "Oh no... your costume! Wait, last night I saw something weird. A guy in a giant purple wizard hat floating down Aldersprings Lane, blasting hyperpop out of a glowing speaker. He had a big sack full of... floppy ears?",
        choices: [
          { t: 'Shive. It HAS to be Shive.', next: 'intro3' },
          { t: 'A wizard? On OUR lane?', next: 'intro3b' },
        ],
      },
      intro3b: {
        text: "Purple hat, gold chains, singing about diamonds in a really high voice. Everyone on the lake knows who that is, Eli. It's Shive. He's been obsessed with dogs for months.",
        choices: [{ t: "Then I'm going to hunt him down.", next: 'intro3' }],
      },
      intro3: {
        text: "Go find FlowingFox at his Outpost, it's south of the lane, past the houses. He's your oldest friend and he's a soldier, so he'll know what to do. Oh! And take this. I packed you a lunch, just in case.",
        on: (g) => { g.give('packed_lunch', 1); g.qSet('main', 10); },
        choices: [
          { t: "Thanks Vea. You're the best.", next: 'intro4' },
          { t: "Will you wait for me? I'll come back a dog again.", next: 'intro_cha', check: { stat: 'CHA', v: 6 }, fail: 'intro_cha_fail' },
        ],
      },
      intro_cha: {
        text: "*giggles* Of course I will, you goof. I'll be right here. Now go get your ears back! (You feel lucky.)",
        on: (g) => { g.flags.veaBlessing = true; },
        choices: [{ t: 'Bye Vea!', next: 'intro4' }],
      },
      intro_cha_fail: {
        text: "Eli, you said that with a mouth full of my packed lunch. ...But yes. Obviously. Go!",
        choices: [{ t: '*swallows* Right. Going.', next: 'intro4' }],
      },
      intro4: {
        text: "Go get 'em, Eli! I believe in you! Oh, and if you happen to pass Davidson Meadows... no, never mind, focus on the mission!",
        choices: [
          { t: "I'll pick you some wildflowers anyway.", next: 'flowers_start' },
          { t: 'Bye Vea!', next: null },
        ],
      },
      flowers_start: {
        text: "Really? Eli! You're so sweet. The pink ones grow in Davidson Meadows, east of FlowingFox's Outpost. Only if you have time though!",
        on: (g) => { if (g.qStage('vea') === 0) g.qSet('vea', 10); },
        choices: [{ t: "I'll make time.", next: null }],
      },
      hub: {
        text: (g) => {
          const s = g.qStage('main');
          if (s >= 100) return "My favourite dog in the whole world! Want to go get ice cream at the pier later?";
          if (s >= 80) return "You're so close, Eli! Go show that wizard who the real good boy is!";
          if (s >= 60) return "Roby said something about pylons? Be careful out there, okay? I'll be here cheering for you.";
          if (s >= 40) return "How's the mission going? You look tired. Have you eaten? You need to eat, Eli.";
          return pick(["Hey you! Any luck finding the costume?", "I believe in you, Eli. Seriously. You've got this.", "You know you're still my favourite person, costume or no costume."]);
        },
        choices: [
          { t: 'Any advice?', next: 'advice' },
          { t: 'Could you patch me up?', next: 'heal' },
          { t: 'About those wildflowers...', next: 'flowers_start', cond: (g) => g.qStage('vea') === 0 },
          { t: "I'm still looking for the flowers.", next: 'flowers_wait', cond: (g) => g.qStage('vea') === 10 },
          { t: 'See you later, Vea.', next: null },
        ],
      },
      advice: {
        text: (g) => {
          const s = g.qStage('main');
          if (s <= 10) return "FlowingFox's Outpost is south of the lane. Follow the road from the end near Sinder's house. Press M if you get lost!";
          if (s <= 30) return "Don't forget you can dodge roll with Space! And if you're hurt, eat something (H).";
          if (s <= 50) return "Roby knows everything about the lake. Like, EVERYTHING. Just let him talk for a bit, he likes that.";
          if (s <= 60) return "Jack can build anything with a battery in it. And the others around the lake might have stuff that'll help you too. Help your friends and they'll help you!";
          return "If Shive's anything like his music, he'll be loud and annoying. Stay calm and keep moving!";
        },
        choices: [{ t: 'Thanks, Vea.', next: 'hub' }],
      },
      heal: {
        text: "*puts a plaster on your knee and kisses it better* There! All better. Fully healed by the power of love. And plasters.",
        on: (g) => g.healFull(),
        choices: [{ t: 'Thanks!', next: 'hub' }],
      },
      flowers_wait: {
        text: "Take your time! The pink ones in Davidson Meadows are the prettiest. East of FlowingFox's Outpost.",
        choices: [{ t: 'On it.', next: null }],
      },
      flowers_done: {
        text: "Eli... you actually picked them? For me? They're beautiful! Okay, I was saving this but... here. I made you a friendship bracelet. It's lucky, I promise.",
        on: (g) => { g.take('wildflower', 4); g.give('bracelet', 1); g.qSet('vea', 100); g.xp(90, true); },
        choices: [{ t: "*puts it on* I'm never taking it off.", next: null }],
      },
      ending: {
        text: "ELI!! Is that... YOU GOT IT BACK!! You're a dog again!! Oh my gosh come here! *hugs you* Everyone heard what happened on the island. FlowingFox is telling the whole lake you're a war hero.",
        choices: [
          { t: '*happy barking*', next: 'ending2' },
          { t: 'I couldn\'t have done it without everyone. Especially you.', next: 'ending2' },
        ],
      },
      ending2: {
        text: "Come on. Everyone's waiting at the pier. Rivergrain says he has a 'victory set' prepared. ...Brace yourself.",
        on: (g) => { g.qSet('main', 100); },
        choices: [{ t: "Let's go!", next: null, do: (g) => g.showEnding() }],
      },
    },
  };

  // ======================= FLOWINGFOX =======================
  D.fox = {
    entry: (g) => {
      const s = g.qStage('main');
      if (s === 10) return 'meet';
      if (s === 20) return 'training';
      if (s === 30) return g.has('flyer') ? 'debrief' : 'need_flyer';
      if (g.qStage('fox') === 20) return 'doghouse_done';
      return 'hub';
    },
    nodes: {
      meet: {
        text: "*salutes* PRIVATE GROGAN! At ease, soldier. ...Wait. What's wrong? You look like a dog without its costume. ...Oh. OH NO. Eli. Your costume.",
        choices: [
          { t: 'Shive stole it, Fox. The hyperpop wizard.', next: 'meet2' },
          { t: '*salutes back* Private Grogan reporting for duty, sir!', next: 'meet_salute' },
          { t: 'Why do you always wear that helmet?', next: 'meet_helmet' },
        ],
      },
      meet_salute: {
        text: "HOOAH! Now THAT'S a salute! I taught you that when we were six. Proud of you, private. Now. Debrief me. Where is the costume?",
        on: (g) => g.xp(10, true),
        choices: [{ t: 'Shive stole it.', next: 'meet2' }],
      },
      meet_helmet: {
        text: "In case the sky falls, Eli. Chicken Little was RIGHT. Nobody listened to him. Anyway, focus! Where's your costume?",
        choices: [{ t: 'Shive stole it.', next: 'meet2' }],
      },
      meet2: {
        text: "Shive. I knew it. Intel says his goons are all over the lake dressed as dogs. Fake dogs, Eli. The worst kind. If you're going after them you need training and a weapon. Take my old Foam Bat, it's standard issue, and this slingshot.",
        on: (g) => { g.give('foam_bat', 1); g.give('slingshot', 1); g.equip('foam_bat'); },
        choices: [
          { t: 'Foam? Really?', next: 'meet_foam' },
          { t: "Let's do this.", next: 'meet3' },
        ],
      },
      meet_foam: {
        text: "Don't let the foam fool you. I've bonked a goose with that bat. The goose respects me now. Allegedly.",
        choices: [{ t: 'Right. Okay.', next: 'meet3' }],
      },
      meet3: {
        text: "Listen up! Three goons are sniffing around Aldersprings Lane right now. LEFT CLICK to swing, RIGHT CLICK to fire your slingshot, SPACE to dodge roll, Q for B.A.R.K. Time when it gets hairy. Number keys swap weapons. Go bonk 'em and report back!",
        on: (g) => g.qSet('main', 20),
        choices: [{ t: 'SIR YES SIR!', next: null }],
      },
      training: {
        text: "The goons are on Aldersprings Lane, soldier! Up the road, by Rack's house! What are you waiting for? GO GO GO!",
        choices: [{ t: 'Going!', next: null }],
      },
      need_flyer: {
        text: "Outstanding bonking, private! Did one of them drop anything? Intel is everything. Go check where you took out the last one.",
        choices: [{ t: "I'll go look.", next: null }],
      },
      debrief: {
        text: "Outstanding work, soldier! What's that you've got? ...A flyer? 'SHIVE LIVE AT THE SPIRE - DOGCORE TOUR'. The Spire... that's on the island in the middle of the lake. Nobody can get near it. There's some kind of glowing barrier.",
        choices: [
          { t: 'How do I get past the barrier?', next: 'debrief2' },
          { t: 'The barrier must be powered by something nearby.', next: 'debrief_int', check: { stat: 'INT', v: 6 }, fail: 'debrief2' },
        ],
      },
      debrief_int: {
        text: "...Huh. Good thinking, private. If something's powering it, we take out the power. Classic tactics. I'm promoting you to Private First Class. It means nothing, but still.",
        on: (g) => g.xp(30, true),
        choices: [{ t: 'Thank you, sir!', next: 'debrief2' }],
      },
      debrief2: {
        text: "Roby Mink knows every weird thing happening on this lake. He's on every forum, every council meeting. Show HIM the flyer. Also, I've got a side mission if you're up for it, soldier. Operation Doghouse.",
        on: (g) => { if (g.qStage('main') === 30) { g.qSet('main', 40); g.xp(60, true); } },
        choices: [
          { t: 'Tell me about Operation Doghouse.', next: 'doghouse_brief' },
          { t: 'Later, Fox.', next: null },
        ],
      },
      doghouse_brief: {
        text: "Goon camp in the woods south-west of here. They've built KENNELS, Eli. Little goon kennels. It's an insult to real dogs everywhere. Clear it out and I'll give you my Paintball Marker and my spare vest.",
        on: (g) => { if (g.qStage('fox') === 0) g.qSet('fox', 10); g.forceCamp('doghouse'); },
        choices: [{ t: 'Consider it done.', next: null }],
      },
      doghouse_done: {
        text: "HOOAH! Scouts report the Doghouse is clear! You make me proud, Eli. Take my Paintball Marker and this Army Vest. You've earned it. And some bucks from the Volunteer Defence Force budget. Which is my piggy bank.",
        on: (g) => { g.give('paintball', 1); g.give('army_vest', 1); g.money(50); g.qSet('fox', 100); g.xp(150, true); },
        choices: [{ t: 'Thanks, Fox!', next: null }],
      },
      hub: {
        text: (g) => pick(["Private Grogan! What can I do ya for?", "Stay frosty out there, Eli.", "*doing push-ups* 997... 998... oh hey Eli!"]),
        choices: [
          { t: 'Tell me about yourself.', next: 'about' },
          { t: 'Any combat tips?', next: 'tips' },
          { t: 'Tell me about Operation Doghouse.', next: 'doghouse_brief', cond: (g) => g.qStage('fox') === 0 && g.qStage('main') >= 40 },
          { t: 'Bye Fox.', next: null },
        ],
      },
      about: {
        text: "I've been your friend since day one, Eli. First day of school you shared your crayons with me. I ate the blue one. Haven't looked back since. Now I serve in the Lake Norman Volunteer Defence Force. Current members: me. And now you!",
        choices: [{ t: 'Honoured, sir.', next: 'hub' }],
      },
      tips: {
        text: (g) => pick([
          'Barkers throw bones from range. Close the distance fast or keep moving!',
          "Goon Alphas CHARGE. When they crouch down, dodge roll sideways (SPACE). Don't roll straight back, they're faster than you.",
          'B.A.R.K. Time (Q) slows down everything except you. Uses up AP though. Fizzy Pop puts AP back.',
          "Eat your dog treats, soldier! Press H to eat the best healing item you've got.",
          'Level up and spend your points (C). A soldier without perks is a soldier without... perks.',
        ]),
        choices: [{ t: 'Got it.', next: 'hub' }],
      },
    },
  };

  // ======================= JACK VALENTINE =======================
  D.jack = {
    entry: (g) => {
      if (g.qStage('jack') >= 10 && g.qStage('jack') < 100 && g.count('volt_cell') >= 3) return 'cells_done';
      if (!g.flags.metJack) return 'meet';
      return 'hub';
    },
    nodes: {
      meet: {
        text: "Yo, Eli! Welcome to Volt Valentine Scooters, home of the fastest e-bikes on Lake Norman! Wait. Where's the costume, man? You look naked without the ears.",
        on: (g) => { g.flags.metJack = true; },
        choices: [
          { t: 'Shive stole it.', next: 'meet_shive' },
          { t: 'Nice scooters.', next: 'meet_scoot' },
        ],
      },
      meet_scoot: {
        text: "Nice? NICE? This is a 2000 watt dual-motor beast, Eli. It does 40 on Brawley Bridge. Probably illegal. Anyway. Where's your costume?",
        choices: [{ t: 'Shive stole it.', next: 'meet_shive' }],
      },
      meet_shive: {
        text: "SHIVE?! That guy is SO cringe. His goons broke in here last night too and stole three of my Volt Cells. Man, it's like a Sam Hyde sketch except nobody's laughing. And you know I'm a dog-costume guy myself, so this is personal.",
        choices: [
          { t: "I'll get your Volt Cells back.", next: 'quest' },
          { t: 'What could you build with those cells?', next: 'build_idea', check: { skill: 'tech', v: 25 }, fail: 'build_fail' },
          { t: "Who's Sam Hyde?", next: 'samhyde' },
        ],
      },
      samhyde: {
        text: "Only one of the funniest niche comedy guys on the internet, bro! Him and all those tiny channels with like 4000 subs that upload weird sketches at 3am. That's PEAK comedy. You're too young to get it. Rivergrain doesn't get it either.",
        choices: [{ t: 'Right... about those Volt Cells.', next: 'quest' }],
      },
      build_idea: {
        text: "Oh you're thinking like an ENGINEER now! With three Volt Cells I could build a Hydro-Scooter. An electric scooter that drives ON WATER. You could ride it straight out to Shive's island!",
        on: (g) => g.xp(20, true),
        choices: [{ t: "Let's do it.", next: 'quest' }],
      },
      build_fail: {
        text: "Uhh, the cells? You know, for scooters. And e-bikes. And... scooters. Look, just get 'em back and I'll think of something sick.",
        choices: [{ t: 'Fine.', next: 'quest' }],
      },
      quest: {
        text: "Goons took my cells to three spots: the Scrapyard west of here, the Doghouse Camp in the woods, and the Denver camp over Brawley Bridge. Get all three and I'll build you something that'll get you to Shive. Promise.",
        on: (g) => { if (g.qStage('jack') === 0) g.qSet('jack', 10); },
        choices: [
          { t: "I'm on it.", next: null },
          { t: 'Got anything for sale?', next: null, do: (g) => g.openShop('jack') },
        ],
      },
      cells_done: {
        text: "NO WAY. All three cells! Give me like... ten seconds. *frantic welding noises* *a small explosion* *more welding* BEHOLD! The HYDRO-SCOOTER! Rides on water, top speed 'yes'. Take it to Rivergrain's Pier. And here's a Shock Baton I made out of a spare motor. Zap some goons for me.",
        on: (g) => { g.take('volt_cell', 3); g.give('hydro_scooter', 1); g.give('shock_baton', 1); g.qSet('jack', 100); g.xp(220, true); },
        choices: [{ t: "Jack, you're a genius.", next: 'genius' }],
      },
      genius: {
        text: "I know, bro. I know. Now go get your costume back. Then we're going dog-costume scooter riding. Both of us. Full ears. The lake won't know what hit it.",
        choices: [{ t: "It's a date.", next: null }],
      },
      hub: {
        text: (g) => pick(["Eli my man! What's up?", "Just tuning a motor. What do you need?", "*doing a wheelie on an e-scooter inside the factory* Oh hey!"]),
        choices: [
          { t: "Let's see your shop.", next: null, do: (g) => g.openShop('jack') },
          { t: "What's new?", next: 'chat' },
          { t: 'About the Volt Cells...', next: 'cells_reminder', cond: (g) => g.qStage('jack') === 10 },
          { t: 'Can you help me get past the barrier?', next: 'quest', cond: (g) => g.qStage('jack') === 0 },
          { t: 'Later, Jack.', next: null },
        ],
      },
      cells_reminder: {
        text: (g) => `You've got ${g.count('volt_cell')} of 3. Scrapyard, Doghouse Camp, Denver camp. Go go go!`,
        choices: [{ t: 'Right.', next: null }],
      },
      chat: {
        text: (g) => pick([
          "Honestly? Electric bikes are the future. No petrol, no noise, just pure torque. And you can wear a dog costume while riding. I've checked.",
          "I watched this sketch last night where a guy reviews a microwave for 40 minutes. Didn't microwave anything. Best thing I've ever seen.",
          "If you ever wanna join the factory, we've got a dental plan. It's a toothbrush. One toothbrush. We share it.",
          "Dog costumes and scooters, Eli. That's all a man needs. That and a fully charged battery.",
        ]),
        choices: [{ t: 'Ha. Nice.', next: 'hub' }],
      },
    },
  };

  // ======================= ESKI =======================
  D.eski = {
    entry: (g) => {
      if (g.qStage('eski') >= 10 && g.qStage('eski') < 100 && g.has('speaker')) return 'speaker_done';
      if (!g.flags.metEski) return 'meet';
      return 'hub';
    },
    nodes: {
      meet: {
        text: "Oi oi! Wagwan Eli, you alright bruv? Hold on... where's your dog ting? You look proper naked without it, fam. Like a pengwin with no beak.",
        on: (g) => { g.flags.metEski = true; },
        choices: [
          { t: 'Shive nicked it, Eski.', next: 'meet_shive' },
          { t: 'Wagwan Eski.', next: 'meet_wag' },
          { t: 'Penguins have beaks?', next: 'meet_peng' },
        ],
      },
      meet_wag: {
        text: "Wagwan wagwan! Big man Eli in the ends! Respect. But for real bruv, where's the dog ting?",
        choices: [{ t: 'Shive nicked it.', next: 'meet_shive' }],
      },
      meet_peng: {
        text: "Course they do, bruv, what you on about? Don't change the subject. Where's the dog ting?",
        choices: [{ t: 'Shive nicked it.', next: 'meet_shive' }],
      },
      meet_shive: {
        text: "SHIVE?! That wasteman?! Bruv, his lot nicked my speaker an' all! My BIG speaker, fam, the one I drop all my bars off. Can't be doing a mixtape off me phone speaker, can I? That's long. Proper long.",
        choices: [
          { t: "I'll get your speaker back.", next: 'quest' },
          { t: 'Drop some bars then.', next: 'bars' },
          { t: "I'll get it back, but I want mates' rates in your shop.", next: 'discount', check: { skill: 'speech', v: 30 }, fail: 'discount_fail' },
        ],
      },
      bars: {
        text: "Say less. *ahem* 'Lake Norman, it's the ends, mandem on the pier / Shive tryna be a dog but man's bare weird / Took Eli's costume, that's a violation / bruv I'm gassed, gonna end his whole operation.' ...Yeah? YEAH? Bangers, innit.",
        choices: [
          { t: 'That was actually fire.', next: 'bars_fire' },
          { t: 'Mate, that was terrible.', next: 'bars_bad' },
        ],
      },
      bars_fire: {
        text: "SEE?! I KNOW, BRUV! Someone finally gets it! You're a real one, Eli. Proper real one.",
        on: (g) => { g.flags.eskiFan = true; g.xp(15, true); },
        choices: [{ t: 'So, about that speaker...', next: 'quest' }],
      },
      bars_bad: {
        text: "Allow it, bruv! That's my best verse! ...Nah you're right, it needs bass. That's why I need me SPEAKER, innit.",
        choices: [{ t: "I'll get your speaker.", next: 'quest' }],
      },
      discount: {
        text: "Hah! Look at you, negotiating like a proper road man. Fine, bruv, mates' rates. 20% off everything. Don't tell no one.",
        on: (g) => { g.flags.eskiDiscount = true; g.xp(20, true); },
        choices: [{ t: 'Deal.', next: 'quest' }],
      },
      discount_fail: {
        text: "Mates' rates?! Bruv, you ain't even got your dog ting. Get me speaker first, then we'll talk.",
        choices: [{ t: 'Fine.', next: 'quest' }],
      },
      quest: {
        text: "Goons took it to the Scrapyard in Mooresville, out west past the factory. Bring it back and I'll sort you out proper, fam. Also I got a little shop going, y'know. Nothing dodgy. Mostly nothing dodgy.",
        on: (g) => { if (g.qStage('eski') === 0) g.qSet('eski', 10); },
        choices: [
          { t: 'Show me the shop.', next: null, do: (g) => g.openShop('eski') },
          { t: 'Laters, Eski.', next: null },
        ],
      },
      speaker_done: {
        text: "MY SPEAKER! *hugs speaker* Eli you're a LEGEND, bruv! Proper ting. Here, have this chain. It's real gold. Probably. Don't ask where it's from. And some bucks for your trouble, innit.",
        on: (g) => { g.take('speaker', 1); g.give('chav_chain', 1); g.money(80); g.qSet('eski', 100); g.xp(160, true); },
        choices: [{ t: 'Cheers, Eski.', next: 'hub' }],
      },
      hub: {
        text: (g) => pick(["You good, bruv?", "Wagwan, my G.", "Eli! Big man ting!", "*nodding to music only he can hear* Oh, safe Eli."]),
        choices: [
          { t: "Let's see the shop.", next: null, do: (g) => g.openShop('eski') },
          { t: 'Got any advice?', next: 'advice' },
          { t: 'Tell me about Shive.', next: 'shive' },
          { t: 'Drop some bars.', next: 'bars2' },
          { t: "About your speaker...", next: 'spk_reminder', cond: (g) => g.qStage('eski') === 10 },
          { t: 'Laters.', next: null },
        ],
      },
      advice: {
        text: (g) => pick([
          "Shive's goons are wastemen, fam. Them big black Alpha ones though? They charge at you. Dodge, innit.",
          "If you're skint, bonk some goons. They always got bucks in their little dog pockets.",
          "Roby's alright, but bruv, he talks for DAYS. Just nod, innit.",
          "Want my advice? Don't trust nobody wearing six chains. 'Cept me.",
        ]),
        choices: [{ t: 'Safe.', next: 'hub' }],
      },
      shive: {
        text: "Shive thinks he's a hyperpop legend, bruv. Wears like six chains, flexes his Lambo on the socials every five minutes. Word is he wants to be a REAL dog. Like proper woof. Man's not well. Man's NOT well.",
        choices: [{ t: 'Yeah, he really is not well.', next: 'hub' }],
      },
      bars2: {
        text: (g) => pick([
          "'Eli on a mission, man's angry and he's vexed / Shive pull up with the hyperpop, gonna get wrecked.' ...Yeah, I'm working on it.",
          "'Mandem by the lake, Rack's thinking about rocks / Shive in his Lambo, mate, I'm stealing your socks.' ...The socks bit's a metaphor.",
          "'Big up Jack with the scooters, Vea with the love / Roby on Reddit, FlowingFox with the glove.' ...Fox don't have a glove. Rhymed though.",
        ]),
        choices: [{ t: 'Bangers.', next: 'hub' }],
      },
      spk_reminder: {
        text: 'Scrapyard, bruv! West of the factory. Big speaker, bare bass. You can\'t miss it.',
        choices: [{ t: 'Got it.', next: null }],
      },
    },
  };

  // ======================= ROBY MINK =======================
  D.roby = {
    entry: (g) => {
      const s = g.qStage('main');
      if (g.qStage('roby') === 20) return 'petition_done';
      if (s === 40 && g.has('flyer')) return 'flyer';
      if (s === 50) return 'pylon_wait';
      if (!g.flags.metRoby) return 'meet';
      return 'hub';
    },
    nodes: {
      meet: {
        text: "Ah. Eli. Greetings. I was just updating the r/LakeNorman wiki. Did you know I have the top comment on 14 of the last 20 posts? Not that I'm counting. *adjusts fedora* I'm counting.",
        on: (g) => { g.flags.metRoby = true; },
        choices: [
          { t: 'Cool, Roby.', next: 'hub' },
          { t: 'Have you seen my dog costume?', next: 'costume' },
        ],
      },
      costume: {
        text: "Your dog costume? Negative. However. Statistically, seventeen dog costumes have been reported stolen around the lake this week. I made a thread about it. Nobody upvoted it. Sheep. All of them.",
        choices: [{ t: 'Huh.', next: 'hub' }],
      },
      flyer: {
        text: "*squints at flyer through glasses* 'Shive Live at the Spire'. Fascinating. As I've said MANY times at council meetings, the island barrier is powered by three 'Bass Pylons'. Giant speakers around the lake pumping hyperpop into the ley lines. I have their exact coordinates.",
        on: (g) => { g.flags.metRoby = true; g.qSet('main', 50); },
        choices: [
          { t: 'Give me the coordinates!', next: 'demand' },
          { t: 'Ley lines? So the pylons amplify a resonant standing wave.', next: 'int_win', check: { stat: 'INT', v: 7 }, fail: 'int_fail' },
          { t: "Roby, you're the smartest guy on this lake. Only you can save it.", next: 'speech_win', check: { skill: 'speech', v: 45 }, fail: 'speech_fail' },
        ],
      },
      demand: {
        text: "Not so fast. I am currently running a petition to ban Shive's noise pollution at the Civic Hall. I need four signatures: Rack, Squid, Sinder and Rivergrain. Get them and the coordinates are yours. Quid pro quo, Eli. That's Latin. You wouldn't know.",
        on: (g) => { if (g.qStage('roby') === 0) g.qSet('roby', 10); },
        choices: [
          { t: 'Fine.', next: null },
          { t: 'Ugh. Politics.', next: 'politics' },
        ],
      },
      politics: {
        text: "Local politics is the backbone of society, Eli. Someone has to stand up to the Lake Norman HOA. Someone has to post 3000-word comments about parking. That someone is me.",
        choices: [{ t: "...I'll get the signatures.", next: null }],
      },
      int_win: {
        text: "...Huh. You actually understood that. Most people's eyes glaze over. Fine. A fellow intellectual deserves the coordinates. Don't post them online. Actually, do. And credit me.",
        on: (g) => g.xp(40, true),
        choices: [{ t: 'Thanks, Roby.', next: 'give_map' }],
      },
      int_fail: {
        text: "Close, but you've confused resonance with reverb. Classic beginner mistake. I'll explain it later in a 40-minute voice note. Anyway. Quid pro quo.",
        choices: [{ t: 'What do you want?', next: 'demand' }],
      },
      speech_win: {
        text: "...Well. I can't argue with facts. And that's the most factual thing anyone's ever said to me. Here, take the coordinates.",
        on: (g) => g.xp(40, true),
        choices: [{ t: 'Thanks, Roby.', next: 'give_map' }],
      },
      speech_fail: {
        text: "Flattery? Please. I'm immune. I'm the one who flatters others... with FACTS.",
        choices: [{ t: 'Okay, what do you want?', next: 'demand' }],
      },
      give_map: {
        text: "Three pylons. North one's in Lake Norman State Park. West one's past Denver, over Brawley Bridge. Third one's down by Cowans Ford Dam. Each one's guarded by a big Goon Alpha. And you'll need some way across the water. Jack Valentine might be able to help with that.",
        on: (g) => { if (!g.has('pylon_map')) g.give('pylon_map', 1); if (g.qStage('main') < 60) g.qSet('main', 60); if (g.qStage('jack') === 0) g.flags.hintJack = true; },
        choices: [
          { t: "I'll still help with your petition.", next: 'demand', cond: (g) => g.qStage('roby') === 0 },
          { t: 'Got it.', next: null },
        ],
      },
      pylon_wait: {
        text: (g) => `Signatures: ${g.sigs()}/4. Rack, Squid, Sinder and Rivergrain. Tick tock, Eli. Democracy waits for no one.`,
        choices: [
          { t: 'Working on it.', next: null },
          { t: "Come on Roby. Shive's barrier is a bigger problem than parking.", next: 'speech_win', check: { skill: 'speech', v: 45 }, fail: 'speech_fail2' },
        ],
      },
      speech_fail2: {
        text: 'Nothing is a bigger problem than parking, Eli.',
        choices: [{ t: 'Fine.', next: null }],
      },
      petition_done: {
        text: "Four signatures! Rack, Squid, Sinder... and Rivergrain signed as 'Hugh Jass'. Hilarious. I'll allow it. Democracy WINS. Here: the pylon map, my Debate Club Badge, and my 3D-printed Agar Blaster. I designed it. Obviously.",
        on: (g) => {
          g.give('agar_blaster', 1); g.give('debate_badge', 1);
          if (!g.has('pylon_map')) g.give('pylon_map', 1);
          if (g.qStage('main') === 50 || g.qStage('main') === 40) g.qSet('main', 60);
          g.qSet('roby', 100); g.xp(200, true);
        },
        choices: [{ t: 'An Agar Blaster?! Roby, I love you.', next: 'love' }],
      },
      love: {
        text: "*fedora tip* Naturally. It fires blobs that grow as they travel and eat through goons. I based it on the Agar.io physics engine, which I have personally reverse-engineered. Twice.",
        choices: [{ t: 'Nerd.', next: null }],
      },
      hub: {
        text: (g) => pick(["Eli. I'm in the middle of an argument with a guy from Mooresville. What is it?", "Greetings. Did you read my latest post? It has 3 upvotes. One is mine.", "*typing furiously* Hm? Oh. Hello."]),
        choices: [
          { t: 'Any news around the lake?', next: 'news' },
          { t: 'Debate me, Roby.', next: 'debate_win', check: { skill: 'speech', v: 30 }, fail: 'debate_fail', cond: (g) => !g.flags.robyDebate },
          { t: 'Where are the pylons again?', next: 'give_map', cond: (g) => g.qStage('main') >= 60 },
          { t: 'How is your IQ so high?', next: 'iq' },
          { t: 'Bye, Roby.', next: null },
        ],
      },
      news: {
        text: (g) => {
          const s = g.qStage('main');
          if (s < 40) return "Goons in dog costumes spotted all over the lake. I've been saying this for MONTHS. Nobody listens. If anyone finds anything from Shive, bring it to me.";
          if (s < 70) return `${g.pylonsDown()} of 3 pylons down, according to my live thread. The barrier is flickering. Squid says the crickets are already sounding better.`;
          return "The barrier is gone. My thread has 41 upvotes. I'm basically famous.";
        },
        choices: [{ t: 'Thanks.', next: 'hub' }],
      },
      debate_win: {
        text: "...Hm. I concede. You make a compelling argument. I'm saving a screenshot of this. For research. (Roby respects you more now.)",
        on: (g) => { g.flags.robyDebate = true; g.xp(30, true); },
        choices: [{ t: 'GG.', next: 'hub' }],
      },
      debate_fail: {
        text: "Wrong. Ratio'd. Come back when you've read more, Eli.",
        choices: [{ t: '...', next: 'hub' }],
      },
      iq: {
        text: "Genetics, mostly. Also I watched a documentary once. Also I'm in four Discord servers about philosophy. I'm technically a philosopher. Squid says I'm 'a lot'. She means a lot of intelligence.",
        choices: [{ t: 'Sure, Roby.', next: 'hub' }],
      },
    },
  };

  // ======================= SQUID =======================
  D.squid = {
    entry: (g) => {
      if (g.qStage('squid') >= 10 && g.qStage('squid') < 100 && g.count('rare_bug') >= 5) return 'bugs_done';
      if (!g.flags.metSquid) return 'meet';
      return 'hub';
    },
    nodes: {
      meet: {
        text: "Shh! Eli, don't move. There's a Carolina mantis on your shoulder. ...Okay, she's gone. Hi!! Sorry. Bug emergency.",
        on: (g) => { g.flags.metSquid = true; },
        choices: [
          { t: 'Hi Squid. What are you doing?', next: 'bugs_intro' },
          { t: 'Have you seen Shive?', next: 'shive' },
          sigChoice('squid', 'sign'),
        ],
      },
      shive: {
        text: "Shive? He kicked an anthill on his way past. On PURPOSE. I hope he gets stung by a thousand hornets. ...That's not very nice of me. A hundred hornets.",
        choices: [{ t: '...That gives me an idea.', next: 'bugs_intro' }],
      },
      bugs_intro: {
        text: "Bug watching! But the hyperpop from those big speakers is making all the bugs go crazy. My rare shimmer beetles flew off all over the lake! Could you find 5 of them for me? They glow. I'll give you something... buzzy.",
        choices: [
          { t: "I'll find them.", next: null, do: (g) => { if (g.qStage('squid') === 0) g.qSet('squid', 10); } },
          { t: 'Bugs are kind of gross.', next: 'gross' },
        ],
      },
      gross: {
        text: "Bugs are NOT gross! They're tiny dinosaurs with jobs! Ants farm. Bees dance. Dung beetles navigate by the MILKY WAY, Eli. What do you do?",
        choices: [{ t: "...Fine. I'll find your beetles.", next: null, do: (g) => { if (g.qStage('squid') === 0) g.qSet('squid', 10); } }],
      },
      bugs_done: {
        text: "FIVE SHIMMER BEETLES!! Hi babies! Hi! You're home! ...Okay, okay. Here's your reward. It's a jar of hornets. Don't worry, they LOVE you. Throw it at goons and they'll love them a lot less.",
        on: (g) => { g.take('rare_bug', 5); g.give('hornet_jar', 1); g.qSet('squid', 100); g.xp(180, true); },
        choices: [{ t: 'A jar. Of hornets. Thanks, Squid!', next: null }],
      },
      sign: {
        text: "Will it stop the hyperpop? The crickets have been chirping off-beat for a week. It's DISTRESSING. Give me that pen. *signs with a little ladybug doodle*",
        on: (g) => g.addSig('squid'),
        choices: [{ t: 'Thanks, Squid!', next: 'hub' }],
      },
      hub: {
        text: (g) => pick(["Did you know a dragonfly can see in almost every direction at once?", "Roby says I talk about bugs too much. Roby talks about Reddit too much.", "Shh. There's a beetle doing something incredible over there.", "Hi Eli! Have you met Gerald? *holds up a woodlouse*"]),
        choices: [
          sigChoice('squid', 'sign'),
          { t: 'Tell me a bug fact.', next: 'fact' },
          { t: 'About those beetles...', next: 'beetle_rem', cond: (g) => g.qStage('squid') === 10 },
          { t: 'Need help with anything?', next: 'bugs_intro', cond: (g) => g.qStage('squid') === 0 },
          { t: 'Bye Squid.', next: null },
        ],
      },
      fact: {
        text: (g) => pick([
          'Fireflies make light without heat! It\'s called bioluminescence. Better than Shive\'s stage lights.',
          'A group of ladybugs is called a loveliness. A loveliness of ladybugs! Like me and Roby. Well, mostly me.',
          'Some moths have no mouths. They just vibe for a week and then they\'re done. Honestly, same.',
          "Bees can recognise human faces. So if you're mean to a bee, it remembers.",
        ]),
        choices: [{ t: 'Cool!', next: 'hub' }],
      },
      beetle_rem: {
        text: (g) => `You've found ${g.count('rare_bug')} of 5! They glow, so look for sparkly green things. Try the State Park, Davidson Meadows, Denver, Sherrills Ford and the Catawba Woods!`,
        choices: [{ t: 'On it.', next: null }],
      },
    },
  };

  // ======================= RACK =======================
  D.rack = {
    entry: (g) => {
      if (g.qStage('rack') >= 10 && g.qStage('rack') < 100 && g.has('perfect_rock')) return 'rock_done';
      if (!g.flags.metRack) return 'meet';
      return 'hub';
    },
    nodes: {
      meet: {
        text: "Eli! Hey! Hey Eli! Guess what. I just figured something out. Water is just... wet ice. ...Hey, where's your dog suit?",
        on: (g) => { g.flags.metRack = true; },
        choices: [
          { t: 'Shive stole it.', next: 'meet_shive' },
          { t: 'Water is... what?', next: 'water' },
          sigChoice('rack', 'sign'),
        ],
      },
      water: {
        text: "Wet ice! Think about it. Actually, don't. It made my head hurt for an hour. Where's your dog suit though?",
        choices: [{ t: 'Shive stole it.', next: 'meet_shive' }],
      },
      meet_shive: {
        text: "Oh no! That's so mean! I'd help but I'm busy. I'm looking for the perfectest rock in the whole world. I saw it at the big dam but a goon barked at me so I ran away. Really fast. Could you get it?",
        choices: [
          { t: 'Sure, Rack.', next: null, do: (g) => { if (g.qStage('rack') === 0) g.qSet('rack', 10); } },
          { t: 'Why do you need a rock?', next: 'why' },
        ],
      },
      why: {
        text: "To be my friend! Rocks never leave. And they don't talk back. Not like Roby. I'm gonna call him Rocky. Or Steve. Rocky Steve.",
        choices: [{ t: "Okay, I'll get Rocky Steve.", next: null, do: (g) => { if (g.qStage('rack') === 0) g.qSet('rack', 10); } }],
      },
      rock_done: {
        text: "ROCKY STEVE!!! You found him! Hi Rocky Steve! I'll never let you go! ...Here, Eli, take my money jar and these pizzas I found. Don't ask where I found them. I don't remember.",
        on: (g) => { g.take('perfect_rock', 1); g.money(70); g.give('pizza', 2); g.qSet('rack', 100); g.xp(130, true); },
        choices: [{ t: 'Enjoy, Rack.', next: null }],
      },
      sign: {
        text: "A pet-ition? Is it a petition for pets? I love pets! Where do I sign? *signs with an X, then draws a little dog next to it*",
        on: (g) => g.addSig('rack'),
        choices: [{ t: "Close enough. Thanks, Rack.", next: 'hub' }],
      },
      hub: {
        text: (g) => pick([
          "If a dog wears a dog costume, is it two dogs?",
          "I tried to play Agar.io once but I kept getting eaten. Like, immediately. Every time.",
          "Hey Eli, do fish get thirsty?",
          "I'm not dumb, I'm just... thinking slowly on purpose.",
          "I lost my shoe today. Then I found it. It was on my foot.",
          "Do you think the moon knows we're looking at it?",
        ]),
        choices: [
          sigChoice('rack', 'sign'),
          { t: 'Got anything to tell me?', next: 'silly' },
          { t: 'About that rock...', next: 'rock_rem', cond: (g) => g.qStage('rack') === 10 },
          { t: 'Need any help?', next: 'meet_shive', cond: (g) => g.qStage('rack') === 0 },
          { t: 'See ya, Rack.', next: null },
        ],
      },
      silly: {
        text: (g) => pick([
          "Roby says I have a low IQ. But I've got the HIGHEST IQ of anyone at not knowing things.",
          "The goons smell like wet dog. Is that because they're dogs or because they're wet?",
          "I'm gonna fight Shive too. After my nap. Maybe two naps.",
          "Did you know Eski raps? He told me. Like nine times.",
        ]),
        choices: [{ t: 'Thanks, Rack.', next: 'hub' }],
      },
      rock_rem: {
        text: 'It\'s at the big dam! Cowans Ford! Down south! It\'s grey and round and PERFECT.',
        choices: [{ t: 'Okay.', next: null }],
      },
    },
  };

  // ======================= SINDER =======================
  D.sinder = {
    entry: (g) => {
      if (g.qStage('sinder') >= 10 && g.qStage('sinder') < 100 && g.count('glowcap') >= 3) return 'shrooms_done';
      if (!g.flags.metSinder) return 'meet';
      return 'hub';
    },
    nodes: {
      meet: {
        text: "*creaky rocking chair noise* ...Eli Grogan. I've been watching you. Not in a weird way. Well. In a slightly weird way.",
        on: (g) => { g.flags.metSinder = true; },
        choices: [
          { t: '...Hi, Sinder.', next: 'meet2' },
          { t: 'How long have you been watching me?', next: 'watch' },
        ],
      },
      watch: {
        text: "Since 1987.",
        choices: [{ t: "I wasn't born in 1987.", next: 'watch2' }],
      },
      watch2: {
        text: "Exactly. *stares*",
        choices: [{ t: '...Okay.', next: 'meet2' }],
      },
      meet2: {
        text: "You're after the wizard. Shive. I knew his grandmother. Lovely woman. Smelled of soup. I know his weakness, boy. A dog whistle. Shive wants to be a dog so badly that a real dog whistle drives him mad. Shatters his little shield. I can make one... but I need three Glowcap mushrooms from the State Park.",
        choices: [
          { t: "I'll get them.", next: null, do: (g) => { if (g.qStage('sinder') === 0) g.qSet('sinder', 10); } },
          { t: 'Why do you know all this?', next: 'why' },
          sigChoice('sinder', 'sign'),
        ],
      },
      why: {
        text: "I know many things, Eli. I know you ate a crayon in the first grade. ...Actually, that was FlowingFox. I know a lot about FlowingFox too.",
        choices: [{ t: "...I'll get the mushrooms.", next: null, do: (g) => { if (g.qStage('sinder') === 0) g.qSet('sinder', 10); } }],
      },
      shrooms_done: {
        text: "Ahhh, Glowcaps... *sniffs them deeply for much too long* ...Wonderful. *clatters around inside for a worrying amount of time* Here. One Dog Whistle. Blow it near Shive (G) and his shield will shatter. And a tonic. Drink it. It'll make you tougher. Don't ask what's in it. I genuinely don't remember.",
        on: (g) => { g.take('glowcap', 3); g.give('dog_whistle', 1); g.give('tonic', 1); g.qSet('sinder', 100); g.xp(180, true); },
        choices: [{ t: 'Thanks, Sinder. I think.', next: null }],
      },
      sign: {
        text: "Hehehe... I'll sign your little petition... if you shake my hand. *extends a strangely damp hand*",
        choices: [
          { t: '*shake his hand*', next: 'shake' },
          { t: "Sign it because it's the right thing to do, Sinder.", next: 'sign_speech', check: { skill: 'speech', v: 25 }, fail: 'sign_fail' },
        ],
      },
      shake: {
        text: "*His hand is... damp. Very damp. Why is it damp? You will never know.* Hehehe. *signs in very old-fashioned handwriting*",
        on: (g) => g.addSig('sinder'),
        choices: [{ t: '*wipes hand on trousers*', next: 'hub' }],
      },
      sign_speech: {
        text: "...You're a good boy, Eli. Fine. *signs* Keep your hands. For now.",
        on: (g) => { g.addSig('sinder'); g.xp(20, true); },
        choices: [{ t: 'Thanks.', next: 'hub' }],
      },
      sign_fail: {
        text: "The right thing? Hehehe. Boy, I'm 94. I stopped doing the right thing in 1962. Hand. Now.",
        choices: [{ t: '*shake his hand*', next: 'shake' }, { t: 'Never mind.', next: 'hub' }],
      },
      hub: {
        text: (g) => pick([
          "*rocking* Did you know there's a door in the lake? I've seen it. At night.",
          "Hello, Eli. You've grown. Since this morning.",
          "Hehehe. Sit with me a while. No? Fine.",
          "I collect teeth. Not human ones. Mostly not human ones.",
          "The goons don't bother me. I bother them.",
        ]),
        choices: [
          sigChoice('sinder', 'sign'),
          { t: 'Tell me about Shive.', next: 'lore' },
          { t: 'About those mushrooms...', next: 'shroom_rem', cond: (g) => g.qStage('sinder') === 10 },
          { t: 'Tell me about his weakness again.', next: 'meet2', cond: (g) => g.qStage('sinder') === 0 },
          { t: 'Bye, Sinder.', next: null },
        ],
      },
      lore: {
        text: "Shive was a sweet boy once. Then he discovered autotune. And money. Mostly autotune. He's been trying to become a dog since he was seven. The whistle, Eli. Don't forget the whistle.",
        choices: [{ t: 'Got it.', next: 'hub' }],
      },
      shroom_rem: {
        text: 'Glowcaps grow in the State Park, up north past Mooresville. Purple. Glowing. Don\'t lick them. I licked one in 1979. I saw music.',
        choices: [{ t: "...Won't lick them.", next: null }],
      },
    },
  };

  // ======================= RIVERGRAIN =======================
  const JOKES = [
    "Why did the goon sit in the shade? Because he didn't want to be a HOT dog! *ba dum tss*",
    "What do you call a dog magician? A LABRACADABRADOR! ...Shive should've hired me.",
    "Why don't Shive's goons use computers? Too many FLEAS-ware updates! ...Not my best.",
    "What's Shive's favourite kind of pizza? PUP-eroni. He's not even a real dog and he orders it.",
    "I told my wife I was going to be a comedian. She laughed. ...That's the most laughs I've had all year.",
    "Why did Roby cross the road? To post about it on Reddit. Seventeen paragraphs.",
    "Knock knock. Who's there? Shive. Shive who? Shive you my costume back, says no one, ever.",
  ];
  D.rivergrain = {
    entry: (g) => {
      if (g.qStage('river') === 20) return 'hecklers_done';
      if (!g.flags.metRiver) return 'meet';
      return 'hub';
    },
    nodes: {
      meet: {
        text: "Ladies and gentlemen, it's ELI GROGAN! *makes airhorn noises with his mouth* Hey kid, why'd the dog costume cross the road? ...Because someone STOLE it! Too soon? Too soon.",
        on: (g) => { g.flags.metRiver = true; },
        choices: [
          { t: 'Haha. Very funny.', next: 'meet2' },
          { t: '*finger guns* Good one, Rivergrain.', next: 'meet_cha', check: { stat: 'CHA', v: 5 }, fail: 'meet_cha_fail' },
          { t: "That's not funny. I'm actually upset.", next: 'meet_sad' },
          sigChoice('river', 'sign'),
        ],
      },
      meet_cha: {
        text: "*finger guns back* THAT'S what I'm talking about! A kid with STAGE PRESENCE! You and me, Eli. Double act. Think about it.",
        on: (g) => g.xp(15, true),
        choices: [{ t: "I'll think about it.", next: 'meet2' }],
      },
      meet_cha_fail: {
        text: "*your finger guns misfire and you poke yourself in the eye* ...Hah! Physical comedy! I like it!",
        choices: [{ t: 'Ow.', next: 'meet2' }],
      },
      meet_sad: {
        text: "Oh. Oh, kiddo. ...Want a joke to cheer you up? What do you call a wizard who steals dog costumes? A CAT-astrophe. ...I'll see myself out.",
        choices: [{ t: '*small smile* That one was okay.', next: 'meet2' }],
      },
      meet2: {
        text: "Truth is, I've got my own problems. Shive's goons keep heckling my shows on the pier! Every punchline: 'BOOOO! WOOF!' Can you shoo them off for me? I'll make it worth your while!",
        choices: [
          { t: "I'll deal with them.", next: null, do: (g) => { if (g.qStage('river') === 0) g.qSet('river', 10); } },
          { t: 'Maybe your jokes are just bad?', next: 'bad' },
        ],
      },
      bad: {
        text: "HOW DARE- ...okay, they're a LITTLE bad. But that's the charm! I'm the Jokestar of Lake Norman, kid! It's on my business card! I made the business card. Please?",
        choices: [{ t: 'Fine.', next: null, do: (g) => { if (g.qStage('river') === 0) g.qSet('river', 10); } }],
      },
      hecklers_done: {
        text: "They're GONE! The Jokestar of Lake Norman is BACK, baby! Here, kid, take my Rubber Chicken. It's been in my family for generations. Well, since Tuesday. It's got a great squeak and a better knockback.",
        on: (g) => { g.give('rubber_chicken', 1); g.qSet('river', 100); g.xp(150, true); },
        choices: [{ t: 'Thanks, Rivergrain!', next: null }],
      },
      sign: {
        text: "I'll sign... if you can finish my joke! Why don't Shive's goons ever win at poker?",
        choices: [
          { t: 'Because every time they get a good hand, they wag their tails!', next: 'sign_good' },
          { t: "Because they're dogs and can't hold cards.", next: 'sign_ok' },
          { t: 'Because Shive takes all their money.', next: 'sign_ok2' },
        ],
      },
      sign_good: {
        text: "HAHAHAHA! A NATURAL! You've got the gift, kid! *signs with a flourish as 'Hugh Jass'* Don't tell Roby.",
        on: (g) => { g.addSig('river'); g.xp(25, true); },
        choices: [{ t: "Hugh Jass. Classic.", next: 'hub' }],
      },
      sign_ok: {
        text: "Technically correct. The worst kind of correct. Eh, I'll sign anyway. *signs as 'Hugh Jass'*",
        on: (g) => g.addSig('river'),
        choices: [{ t: 'Thanks.', next: 'hub' }],
      },
      sign_ok2: {
        text: "Ooh, political satire. Edgy. Roby would love it. *signs as 'Hugh Jass'*",
        on: (g) => g.addSig('river'),
        choices: [{ t: 'Thanks.', next: 'hub' }],
      },
      hub: {
        text: (g) => pick(["Hey hey, it's my favourite audience member!", "*tapping a microphone that isn't plugged in* Is this thing on?", "Eli! I've got new material. You're gonna love it. Or tolerate it."]),
        choices: [
          { t: 'Tell me a joke.', next: 'joke' },
          sigChoice('river', 'sign'),
          { t: 'How do I get to the island?', next: 'island', cond: (g) => g.qStage('main') >= 50 },
          { t: 'Need help with the hecklers?', next: 'meet2', cond: (g) => g.qStage('river') === 0 },
          { t: 'See ya, Rivergrain.', next: null },
        ],
      },
      joke: {
        text: () => pick(JOKES),
        choices: [
          { t: '*laughs*', next: 'hub', do: (g) => { if (!g.flags.laughed) { g.flags.laughed = true; g.xp(10, true); } } },
          { t: '*groans*', next: 'groan' },
        ],
      },
      groan: {
        text: "A groan is just a laugh that's shy, kid. I'll take it.",
        choices: [{ t: 'Sure.', next: 'hub' }],
      },
      island: {
        text: (g) => g.has('hydro_scooter')
          ? "You've got a scooter that floats? HAH! Now THAT'S a punchline. Just hop on at the end of my pier. And kid... bring that costume home."
          : "You'll need a boat to get out to that island. Or a scooter that floats! Hah! ...Actually, ask Jack. He's crazy enough to build one.",
        choices: [{ t: 'Thanks.', next: 'hub' }],
      },
    },
  };

  // ======================= SHIVE =======================
  D.shive = {
    entry: (g) => (g.flags.shiveDefeated ? 'defeated' : 'confront'),
    nodes: {
      confront: {
        text: "*hyperpop bass drop* Well, well, WELL. If it isn't Eli Grogan. Like my new look? *spins around in YOUR dog costume, which is clearly three sizes too small for him*",
        choices: [
          { t: "That's MY costume, Shive. Take it off.", next: 'c2' },
          { t: 'Honestly? It looks terrible on you.', next: 'c_cha', check: { stat: 'CHA', v: 7 }, fail: 'c_cha_fail' },
          { t: 'Your music is mid.', next: 'c_mid' },
        ],
      },
      c_cha: {
        text: "T-terrible?! It does NOT look- *catches his reflection in a gold chain* ...oh no. Oh no, it's tight in the shoulders. *visibly rattled* (Shive is shaken: he starts the fight weaker.)",
        on: (g) => { g.flags.shiveRattled = true; g.xp(30, true); },
        choices: [{ t: 'Give it back.', next: 'c2' }],
      },
      c_cha_fail: {
        text: "Terrible? I look ICONIC. I have 400 streams, Eli. Four HUNDRED. What do you have? A girlfriend and friends who love you? Pathetic.",
        choices: [{ t: "...That's actually a lot.", next: 'c2' }],
      },
      c_mid: {
        text: "MID?! MID?!?! My track 'Diamond Paws (Nightcore Remix)' is a MASTERPIECE! It has a SIX MINUTE bass drop! That's how you KNOW it's art!",
        on: (g) => { g.flags.shiveRattled = true; },
        choices: [{ t: 'Six minutes of noise.', next: 'c2' }],
      },
      c2: {
        text: "YOUR costume? I own forty-seven dog costumes, Eli. A Lambo. Three diamond chains. A gold toilet. But none of it matters... until I become a REAL. DOG. With enough costumes, my spell will transform me forever!",
        choices: [
          { t: "That's... not how any of this works.", next: 'c3' },
          { t: "Wearing a costume doesn't make you a dog, Shive. You have to feel it in your heart.", next: 'c_int', check: { stat: 'INT', v: 6 }, fail: 'c3' },
        ],
      },
      c_int: {
        text: "...in my... heart? *his lip wobbles* NO! Don't do that! Don't make me FEEL things! *wipes eyes with sleeve*",
        on: (g) => g.xp(30, true),
        choices: [{ t: 'Give it back, Shive.', next: 'c3' }],
      },
      c3: {
        text: "SILENCE! Enough talk! Goons, get- no wait, you beat all of them. FINE. I'll do it MYSELF. *drops the sickest beat you have ever heard* LET'S DANCE, GROGAN!",
        choices: [{ t: "Let's go.", next: null, do: (g) => g.bossStart() }],
      },
      defeated: {
        text: "*sprawled on the floor, hat crooked* Okay... OKAY! You win! Take the costume! I just... I just wanted to be a good boy...",
        choices: [
          { t: 'Anyone can be a good boy, Shive. Just stop stealing stuff.', next: 'spare' },
          { t: 'Bad dog. *BONK*', next: 'bonk' },
          { t: "Return EVERYONE's costumes. And make music that doesn't hurt people's ears.", next: 'reform', check: { skill: 'speech', v: 50 }, fail: 'reform_fail' },
        ],
      },
      spare: {
        text: "*sniffles* ...Really? Anyone? ...Thanks, Eli. Here. Your costume. I... I washed it. With fabric softener. Twice.",
        on: (g) => g.shiveEnd('spared'),
        choices: [{ t: '*puts on costume* WOOF.', next: null }],
      },
      bonk: {
        text: "*BONK* OW! Okay! OKAY! Take it! *throws costume at you and teleports away in a puff of glitter* THIS ISN'T OVER! (It is over.)",
        on: (g) => g.shiveEnd('bonked'),
        choices: [{ t: '*puts on costume* WOOF.', next: null }],
      },
      reform: {
        text: "...You'd still listen to my music? If it was... nicer? *wipes tears* Okay. I'll give them all back. All 47. And I'll make a new track. 'Eli Grogan's Adventure (Lo-Fi Remix)'. For you.",
        on: (g) => { g.xp(150, true); g.shiveEnd('reformed'); },
        choices: [{ t: '*puts on costume* WOOF.', next: null }],
      },
      reform_fail: {
        text: "Make different music?! NEVER! ...But fine, you can have YOUR costume. Just yours. *throws it at you*",
        on: (g) => g.shiveEnd('spared'),
        choices: [{ t: '*puts on costume* WOOF.', next: null }],
      },
    },
  };

  return D;
})();
