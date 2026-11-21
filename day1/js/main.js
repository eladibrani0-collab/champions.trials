// js/main.js
"use strict";

(() => {
  const $ = id => document.getElementById(id);

  function element(tag, className, parent, text = "") {
    const item = document.createElement(tag);
    item.className = className;
    item.textContent = text;
    parent.append(item);
    return item;
  }

  function button(parent, label, action, className = "quiet") {
    const item = element("button", className, parent, label);
    item.type = "button";
    item.addEventListener("click", action);
    return item;
  }

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function shuffled(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function makeId() {
    return globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function today() {
    const date = new Date();
    return Date.UTC(
      date.getFullYear(), date.getMonth(), date.getDate()
    ) / 86400000;
  }

  let toastTimer;

  function notify(message) {
    const toast = $("toast");
    if (!toast) return;

    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
  }

  const accountsKey = "moodifyAccountsV1";
  const sessionKey = "moodifySessionV1";

  let accounts = read(accountsKey, {});
  let email = read(sessionKey, "");

  if (!accounts || typeof accounts !== "object") accounts = {};
  if (!Object.hasOwn(accounts, email)) email = "";

  function workspaceKey() {
    return email ? `moodifyWorkspace:${email}` : "moodifyAdvancedData";
  }

  function loadWorkspace() {
    const saved = read(workspaceKey(), {});

    return {
      ...saved,
      boards: Array.isArray(saved.boards) ? saved.boards : [],
      games: Number(saved.games) || 0,
      score: Number(saved.score) || 0,
      puzzleWins: Number(saved.puzzleWins) || 0,
      photoCollections: saved.photoCollections || {}
    };
  }

  let data = loadWorkspace();
  let rounds = {};
  let activeGame = "paint";
  let currentPage = "home";
  let currentBoard = null;

  function persist() {
    const success = write(workspaceKey(), data);
    if (!success) notify("Browser storage is full or unavailable.");
    return success;
  }

  function updateStats() {
    const level = Math.floor(data.score / 100) + 1;
    let rank = "Rookie";

    if (level >= 10) rank = "Legend";
    else if (level >= 7) rank = "Master";
    else if (level >= 4) rank = "Creator";
    else if (level >= 2) rank = "Artist";

    const values = {
      boards: data.boards.length,
      games: data.games,
      score: data.score,
      level: String(level).padStart(2, "0"),
      rank
    };

    document.querySelectorAll("[data-stat]").forEach(item => {
      item.textContent = values[item.dataset.stat] ?? "";
    });

    const achievements = $("achievements");
    if (!achievements) return;

    achievements.replaceChildren();

    [
      ["First Creation", data.boards.length > 0],
      ["Arcade Explorer", data.games > 0],
      ["Puzzle Champion", data.puzzleWins > 0 || data.memoryWins > 0],
      ["Century Club", data.score >= 100]
    ].forEach(([name, earned]) => {
      element("p", "", achievements, `${name} · ${earned ? "Unlocked" : "Locked"}`);
    });
  }

  function award(round, points) {
    if (round.done) return;
    round.done = true;
    data.games++;
    data.score += points;
    if (activeGame === "slide") data.puzzleWins++;
    persist();
    updateStats();
  }

  /* =========================================================
     ARCADE
     ========================================================= */

  const gameInfo = {
    paint: [
      "Color by Numbers",
      "Choose a picture and a numbered color. Fill the matching squares."
    ],
    slide: [
      "Sliding Puzzle",
      "Slide a tile beside the empty space. Arrange 1 to 8 in order."
    ],
    water: [
      "Water Sort",
      "Select a bottle, then pour into an empty bottle or onto the same color."
    ],
    word: [
      "Daily Word",
      "Guess the five-letter word in six tries. Green means the right place. Gold means a different place."
    ]
  };

  function gameMessage(text) {
    if ($("gameStatus")) $("gameStatus").textContent = text;
  }

  function gameTools() {
    return element("div", "tools board-tools", $("gameSurface"));
  }

  function renderGame() {
    const surface = $("gameSurface");
    if (!surface) return;

    surface.replaceChildren();
    gameMessage("");

    if ($("gameTitle")) $("gameTitle").textContent = gameInfo[activeGame][0];
    if ($("gameRules")) $("gameRules").textContent = gameInfo[activeGame][1];

    document.querySelectorAll("[data-game]").forEach(item => {
      const selected = item.dataset.game === activeGame;
      item.setAttribute("aria-pressed", String(selected));
      item.classList.toggle("active", selected);
    });

    const renderers = {
      paint: renderPaint,
      slide: renderSlide,
      water: renderWater,
      word: renderWord
    };

    renderers[activeGame]();
  }

  function openGame(key) {
    if (!Object.hasOwn(gameInfo, key)) return;
    activeGame = key;
    renderGame();
  }

  /* 1. Color by Numbers */

  const pictures = {
    Cat: {
      colors: ["#bc8258", "#754d3f", "#e4be96", "#37343c", "#d99d9e"],
      rows: [
        "0000000000000",
        "0020000000200",
        "0022000002200",
        "0025200025200",
        "0021122211200",
        "0011111111100",
        "0211411141120",
        "0211411141120",
        "0011335331100",
        "0021334331200",
        "0002111112000",
        "0000211120000",
        "0000000000000"
      ]
    },
    Dog: {
      colors: ["#b58156", "#695045", "#ead2ad", "#33313a", "#c78080"],
      rows: [
        "0000000000000",
        "0000222220000",
        "0022111112200",
        "0221111111220",
        "0221133311220",
        "0221433341220",
        "0221433341220",
        "0021133311200",
        "0001334331000",
        "0001334331000",
        "0000135310000",
        "0000015100000",
        "0000000000000"
      ]
    },
    Bottle: {
      colors: ["#476657", "#85a990", "#c5d7bb", "#c6a476", "#ece0c0"],
      rows: [
        "0000044400000",
        "0000044400000",
        "0000011100000",
        "0000013100000",
        "0000013100000",
        "0000123210000",
        "0001223221000",
        "0001232221000",
        "0001555551000",
        "0001544451000",
        "0001555551000",
        "0001222221000",
        "0000111110000"
      ]
    }
  };

  function renderPaint() {
    const game = rounds.paint ||= { name: "Cat", progress: {} };
    const picture = pictures[game.name];
    const round = game.progress[game.name] ||= {
      color: 1,
      filled: new Set(),
      done: false
    };

    const picker = element("div", "picture-picker board-tools", $("gameSurface"));

    Object.keys(pictures).forEach(name => {
      const choice = button(picker, name, () => {
        game.name = name;
        renderGame();
      });
      choice.setAttribute("aria-pressed", String(game.name === name));
    });

    const palette = gameTools();

    picture.colors.forEach((hex, index) => {
      const color = index + 1;

      const swatch = button(palette, color, () => {
        round.color = color;
        renderGame();
      }, "swatch");

      swatch.style.backgroundColor = hex;
      swatch.style.color = [2, 4].includes(color) ? "#fff" : "#241e25";
      swatch.setAttribute("aria-label", `Color ${color}`);
      swatch.setAttribute("aria-pressed", String(round.color === color));
    });

    const grid = element("div", "paint-grid", $("gameSurface"));
    grid.style.setProperty("--columns", picture.rows[0].length);
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${picture.rows[0].length}, minmax(0, 1fr))`;

    const cells = [...picture.rows.join("")].map(Number);
    const total = cells.filter(Boolean).length;

    cells.forEach((color, index) => {
      if (!color) {
        element("span", "pixel paper", grid);
        return;
      }

      const filled = round.filled.has(index);

      const square = button(grid, filled ? "" : color, () => {
        if (round.color !== color) {
          gameMessage(`Choose color ${color} for this square.`);
          return;
        }

        round.filled.add(index);
        square.textContent = "";
        square.disabled = true;
        square.style.backgroundColor = picture.colors[color - 1];

        if (round.filled.size === total) {
          award(round, 40);
          gameMessage(`${game.name} complete. You earned 40 points.`);
        } else {
          gameMessage(`${round.filled.size} of ${total} squares colored.`);
        }
      }, "pixel");

      square.disabled = filled;
      square.setAttribute("aria-label", `Square ${index + 1}, color ${color}`);
      if (filled) square.style.backgroundColor = picture.colors[color - 1];
    });

    gameMessage(round.done
      ? `${game.name} complete. You earned 40 points.`
      : `${round.filled.size} of ${total} squares colored.`);
  }

  /* 2. Sliding Puzzle */

  function neighbors(gap) {
    return [gap - 3, gap + 3, gap - 1, gap + 1].filter(index => {
      if (index < 0 || index > 8) return false;

      const rowDistance = Math.abs(Math.floor(index / 3) - Math.floor(gap / 3));
      const columnDistance = Math.abs(index % 3 - gap % 3);
      return rowDistance + columnDistance === 1;
    });
  }

  function newPuzzle() {
    const tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    let gap = 8;
    let previous = -1;

    // Start solved and shuffle using legal moves.
    for (let step = 0; step < 9; step++) {
      const options = neighbors(gap).filter(index => index !== previous);
      const next = options[Math.floor(Math.random() * options.length)];
      [tiles[gap], tiles[next]] = [tiles[next], 0];
      previous = gap;
      gap = next;
    }

    return { tiles, moves: 0, done: false };
  }

  function renderSlide() {
    const round = rounds.slide ||= newPuzzle();
    const grid = element("div", "slide-grid slide-board", $("gameSurface"));
    const gap = round.tiles.indexOf(0);

    round.tiles.forEach((number, index) => {
      if (!number) {
        element("span", "", grid);
        return;
      }

      const tile = button(grid, number, () => {
        [round.tiles[gap], round.tiles[index]] = [number, 0];
        round.moves++;

        if (round.tiles.join("") === "123456780") award(round, 50);
        renderGame();
      }, "tile slide-tile");

      tile.disabled = round.done || !neighbors(gap).includes(index);
    });

    button(gameTools(), "New puzzle", () => {
      rounds.slide = newPuzzle();
      renderGame();
    });

    gameMessage(round.done
      ? `Solved in ${round.moves} moves. You earned 50 points.`
      : `Moves: ${round.moves}`);
  }

  /* 3. Water Sort */

  const waterColors = ["#a7c8dc", "#efd29a", "#abc0a2", "#d89f93"];

  const waterLevels = [
    [[0, 1, 0, 1], [1, 0, 1, 0], [], []],
    [[0, 1, 2, 0], [1, 2, 0, 1], [2, 0, 1, 2], [], []],
    [[0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2], [], []]
  ];

  function newWaterLevel(index) {
    return {
      index,
      bottles: waterLevels[index].map(layers => [...layers]),
      source: null,
      history: [],
      done: false
    };
  }

  function pour(round, index) {
    if (round.done) return;

    const destination = round.bottles[index];

    if (round.source === null) {
      if (!destination.length) {
        gameMessage("Choose a bottle containing water.");
        return;
      }

      round.source = index;
      renderGame();
      return;
    }

    if (round.source === index) {
      round.source = null;
      renderGame();
      return;
    }

    const source = round.bottles[round.source];
    const color = source.at(-1);

    if (destination.length === 4 ||
        (destination.length && destination.at(-1) !== color)) {
      gameMessage("Choose an empty bottle or one with the same top color.");
      return;
    }

    round.history.push(round.bottles.map(layers => [...layers]));

    while (source.length && source.at(-1) === color && destination.length < 4) {
      destination.push(source.pop());
    }

    round.source = null;

    const solved = round.bottles.every(layers =>
      !layers.length ||
      (layers.length === 4 && layers.every(value => value === layers[0]))
    );

    if (solved) award(round, 60);
    renderGame();
  }

  function renderWater() {
    const round = rounds.water ||= newWaterLevel(0);
    const rack = element("div", "bottles", $("gameSurface"));

    round.bottles.forEach((layers, index) => {
      const bottle = button(rack, "", () => pour(round, index), "bottle");
      bottle.disabled = round.done;
      bottle.setAttribute("aria-pressed", String(round.source === index));

      const contents = layers.map(color => color + 1).join(", ") || "empty";
      bottle.setAttribute("aria-label", `Bottle ${index + 1}, bottom to top: ${contents}`);

      layers.forEach(color => {
        const layer = element("span", "liquid", bottle, color + 1);
        layer.style.backgroundColor = waterColors[color];
      });
    });

    const bar = gameTools();

    if (round.done) {
      button(bar, "Next level", () => {
        rounds.water = newWaterLevel((round.index + 1) % waterLevels.length);
        renderGame();
      });
    } else {
      const undo = button(bar, "Undo", () => {
        round.bottles = round.history.pop();
        round.source = null;
        renderGame();
      });

      undo.disabled = !round.history.length;

      button(bar, "Restart level", () => {
        rounds.water = newWaterLevel(round.index);
        renderGame();
      });
    }

    gameMessage(round.done
      ? "All colors sorted. You earned 60 points."
      : `Level ${round.index + 1} · ${round.history.length} pours`);
  }

  /* 4. Daily Word */

  const targets = (`
    amber apple beach birch bloom brush cedar chalk charm chime cloud coral
    crane creek crown dance delta dream drift eagle earth ember field flame
    fleet flint float flora flute forge frame fresh frost fruit glass glaze
    gleam glint globe gloss grain grape grass green grove heart honey horse
    ivory jewel light lilac linen lunar maple marsh metal misty month mossy
    mural music night noble north novel ocean olive orbit otter paint panel
    paper patch peach pearl petal piano pilot pixel place plain plane plant
    plate plaza plume point polar poppy press prism pulse quiet quilt rainy
    range raven ridge river robin robot rocky satin scale scene scent shade
    shale shape sharp sheen sheet shelf shell shine shore sight silky slate
    slope solar solid sound south space spark spear spice spire split spray
    sprig stage stain stair stamp stand stare stark start state steam steel
    steep stick still stone store storm story straw strip study style sugar
    suite sunny surge sweep sweet swell swift swing swirl table taper taste
    teach tempo theme thick thorn three thumb tidal tiger timer title toast
    today token tonal topaz torch touch tough towel tower trace track trade
    trail train trait tread treat trend trial tribe trick truce trunk trust
    truth tulip twist ultra under union unite unity urban usher usual utter
    vague valid value vapor vault venue verse vigor vinyl viola visit vista
    vivid vocal vogue voice vowel wafer wagon waist waltz watch water weary
    weave wedge weigh whale wharf wheat wheel where while whisk white whole
    widen width wield windy wiser wispy witty woman woods woody world worth
    would woven wrath wreck wrest write wrong yacht yeast yield young youth zebra
  `).trim().split(/\s+/);

  const dictionary = new Set([
    ...targets,
    ...(`about above abuse actor acute admit adopt adore adult after again
    agent agile aging agree ahead aisle alarm album alert algae alias alibi
    alien align alike alive alley allow alloy alone along aloud alter amass
    amaze amend amiss among ample amuse angel anger angle angry ankle annex
    annoy antic anvil apart aphid apply apron arena argue arise armed armor
    aroma arose array arrow arson artsy ascot ashen aside asked asset atlas
    atoll atoms atone attic audio audit augur aunty avail avert avoid awake
    award aware awful awoke axial axiom azure bacon badge badly bagel baker
    balls balmy banal bands bangs banks barge baron basic basil basin basis
    batch baths baton bawdy beady beaks beams beans beard bears beast beats
    beaux beech beefy beers beets began begin begun being belle belly below
    belts bench bends berth berry beset bests betas bevel bikes bills binds
    bingo birds birth bison bites black blade blame bland blank blare blast
    blaze bleak bleat bleed blend bless blimp blind blink bliss blitz block
    blond blood blown blows blues bluff blunt blurb blurs blush board boast
    boats bobby bodies bogey bogus boils bolts bombs bonds bones bonus books
    booms boost booth boots booty booze bored bores borne bosom bossy bough
    bound bouts bowed bowel boxer boxes brace braid brain brake brand brass
    brave bravo brawl brawn bread break breed brick bride brief brim s brine
    bring brink briny brisk broad broil broke brood brook broom broth brown
    brows brute buddy budge buggy bugle build built bulbs bulge bulky bulls
    bully bumps bumpy bunch bunks bunny burly burns burnt burps burst buses
    bushy busts buyer buzz y bylaw bytes cabin cable cache cacti caddy cadet
    cages cakes calls calms camel cameo camps canal candy canes canoe canon
    caper capes cards cared cares cargo carol carry carts carve cases caste
    casts catch cater cause caves cease cells cents chain chair champ chant
    chaos chaps chard chart chase chasm chats cheap cheat check cheek cheer
    chefs chess chest chew s chick chide chief child chili chill chimp china
    chips chirp choir choke chose chunk churn chute cider cigar cinch circa
    cited cites civic civil claim clamp clams clang clank clans claps clash
    clasp class claws clean clear cleat cleft clerk click cliff climb cling
    clink cloak clock clogs clone close cloth clout clown clubs cluck clued
    clues clump clung coach coast coats cobra cocoa codes coils coins colds
    colon color colts combs comet comic comma condo cones cooks pools coops
    copes cords cores corks corns corny costs couch cough could count coupe
    court coven cover coves covid cower cows s coyly crabs crack craft crags
    cramp crams crank crash crass crate crave crawl craze crazy creak cream
    creed creep crepe crept crest crews cried cries crime crimp crisp croak
    crook crops cross crowd crude cruel crumb crump crush crust crypt cubby
    cubes cubic cuffs cuffs cumin cured cures curio curly curry curse curve
    curvy cuter cyber cycle cynic daddy daily dairy daisy dales dams s damp s
    dared dares darts dated dates datum daunt dawns dazed deals dealt deans
    dears death debts debug debut decay decks decor decoy decry deeds deems
    deeps deers defer deity delay dents dense depot depth derby desks deter
    detox deuce devil diary diced dices diets digit dikes dills dimes dimly
    diner dines dingo dings dingy diode dips s dirty disco discs disks ditch
    ditto ditty diver dives dizzy docks dodge dodgy doing dolls dolly domes
    donor doors doped dotes doubt dough douse doves downs downy dozen draft
    drags drain drake drama drank drape drape draws drawn dread dress dried
    drier dries drill drink drips drive drone drool droop drops drove drown
    drugs drums drunk dryer ducks ducts dudes duels duets dukes dumps dunes
    dunks duper dupes dusky dusty dutch duvet dwarf dwell dwelt dying eager
    eared early earns eased easel eases eaten eater eaves ebony eerie eased
    edges edict edify edits eels s eggs s egret eight eject eking elbow elder
    elect elegy elite elope elude elves email embed emits emoji empty enact
    ended endow enemy enjoy ennui ensue enter entry envoy epoch equal equip
    erase erect erode error erupt essay ether ethic ethos euros evade event
    every evict evoke exact exalt exams excel exert exile exist exits expel
    extra exude exult fable faced faces facet facts fades fails faint fairs
    fairy faith faked fakes falls false famed fancy fangs fanny fares farms
    fatal fated fates fatty fault fauna favor fawns fears feast feats fecal
    feeds feels feign feint fella fells felon fence fends feral ferns ferry
    fetal fetch fetid fetus fever fewer fiber fibre fiche fiefs fiery fifth
    fifty figs s fight filed files filet fills filly films filth final finch
    finds fined finer fines firms first fishy fists fitly fiver fives fixed
    fixer fixes fizzy fjord flack flags flail flair flake flaky flank flaps
    flare flash flask flats flaws flays fleas fleck flees flesh flick flier
    flies fling flips flirt flits flobs flock flood floor flops floss flour
    flown flows fluff fluid fluke flume flung flush flux s flyer foals foams
    foamy focal focus foggy foils folds folks folly fonts foods fools foots
    foray force fords forks forms forte forth forts forty forum fossa found
    fount fours fowls foxes foyer frail franc frank fraud frays freak freed
    frees frets friar fried fries frill frisk frizz frock frogs frond front
    froth frown froze frugal fuels fugue fully fumes funds fungi funny furor
    furry fused fuses fussy fusty fuzzy gains gamer games gamma gangs gaped
    gapes garbs gases gasps gassy gated gates gator gaudy gauge gaunt gauze
    gavel gawks gazed gazes gears gecko geeks geeky geese genes genie genre
    gents germs ghost giant giddy gifts gilds gills gilts girth girls gists
    given giver gives gizmo glade gland glare glary glean glide globs gloom
    glory glove glows glued glues gluts glyph gnash gnats gnaws gnome goals
    goats godly goers going golds golfs golly gonad goods goody gooey goofy
    goose gored gores gorge gory s gosh s got s gouge gourd gowns grabs grace
    grade grads graft grail grand grans grant graph grasp grate grave gravy
    graze great greed greek greet greys grids grief grill grime grimy grind
    grins gripe grips grist grits groan groin groom grope gross group grout
    growl grown grows grubs gruel gruff grunt guard guava guess guest guide
    guild guile guilt guise gulch gulls gulps gummy gunky guppy gurus gushy
    gusto gusts gusty gutsy gypsy habit hacks aided adieu raise tears rates
    later alert irate arose audio soare roate least learn tears erase eerie
    level belle hello sheep queue alley rally sassy mamma llama puppy kitty
    funny happy jelly jolly holly chess check chick pizza kayak civic rotor
    radar refer madam sheep steep speed seeds needs deeds never seven fever
    there their these those other which whose yours years house mouse mouths
    bread braid broad sweat seats boats coats meant means taken takes maker
    makes baked baker works walks talk s talks likes loved loves lover live s
    lived lives save s saves saved safer safe s right wrong lefts lifts gifts
    smile miles limes times items menus notes names teams tames mates meats
    teach cheat reach react crate cater caret trace raced cared clear clean
    close chose loose loser leash lease least scale stale steal tales teals
    heels peels feels reels steel sleep slept swept sweep roots shoots shoot
    trees freed greed breed green teens queen quick quirk quite quota quote
    equal usual issue using users house homes hours soups tours youth south
    north earth early ready reads dear s deals leads loads roads rooms doors
    books looks hooks cooks crook brook shook hooks whole holes hopes ropes
    roses poses noses loses loser loose loops pools spoon snoop proof floor
    flour four s frown brown blown clown flown known knows snow s snows snowy
    sunny rainy rainy storm humid dryly dryer fresh humid harsh hardy hands
    heads heard hears heart heal s heals helps herbs hero s heron hills hilly
    hinge hoist holds holes holy s honey honor horns horse hosts hotel hound
    hover human humor humor hurry hurts husky ideal ideas idiom image imply
    inbox incur index indie inert infer ingot inlet inner input intro irked
    irons irony isles issue ivory jacks jacket jaded jails jams s japes jazzy
    jeans jeers jerks jerky jewel joins joint jokes joker jolts judge juice
    juicy jumps jumpy jumbo juror keeps kicks kinds kings kiosk kites knead
    knees kneel knife knock knots known koala lacks laden ladle lager lakes
    lambs lamps lance lands lanes lanky lapse large larks laser lasts latch
    later latte laugh lawns layer leach leafy leaks leaky leans leaps leapt
    learn leash least leave ledge leech leeks legal lemon lends lens s leper
    level lever licks lifts liked liken likes limbs limbo limit limps lined
    liner lines links lions lists liter lived liver lives llama loans lobby
    local locks lodge lofty logic login logos looks looms loops loose lords
    loses lotus lousy loved lover loves lower loyal lucid lucky lumen lumps
    lumpy lunar lunch lunge lungs lurch lured lures lurks lusty lying lyric
    magic magma maize major maker makes males malls mango mania manor march
    marks marry marsh masks mason match matte mauve maxim mayor meals means
    meant meats medal media medic meets melon melts mercy merge merit merry
    messy meter metro micro midst might mild s miles milky mills mimic mince
    minds mined miner mines minor minus mirth miser missy mixed mixer mixes
    mocha mocks model modem modes moist molds moldy money monks moods moody
    moons moose moped mopes moral motel moths motif motor motto mound mount
    mourn mouse mouth moved mover moves movie mowed muddy mulch mules multi
    mummy munch mural murky muses musky muted mutes myths nails naive naked
    named names nanny nasal nasty natal naval navel nears needs needy neigh
    nerve nests never newer newly nicer niche niece nines ninth noise noisy
    nomad norms nose s nosed noses noted notes nouns nurse nylon oasis oaths
    obeys obese occur oddly odors offer often ogres oils s oiled older olive
    omega omens emits omit s omits onset opens opera optic order organ other
    ought ounce outer ovens overt owing owned owner oxide ozone paced pacer
    paces packs pacts paddy pagan pages pains pairs paler palms panda panic
    pants parks parse parts party pasta paste pasty paths patio pause paved
    paves pawns payee payer peace peaks pecan pedal peeks peels peers penal
    pence penny peppy perch peril perky perks pesky pests petty phase phone
    photo picks picky piece piers piety piggy piled piles pills pinch pines
    piney pinky pints pious pipes pique pitch pithy pivot pizza plaid plank
    plans plays plead pleas pleat plied plier plods plots plows pluck plugs
    plumb plump plums plunk plush poems poets poise poked poker polar poles
    polls polyp ponds pools porch pores porky ports posed poser poses posit
    posse posts pouch pound pours pouts power prank prawn prays price pride
    pried pries prime primo print prior privy prize probe prods prone prong
    proof props prose proud prove prowl proxy prune psalm puffs puffy pulls
    pulps pulpy pumps punch punts pupil puppy puree purer purge purrs purse
    pushy putts putty quack quads quail quake qualm quart quasi queen quell
    query quest queue quick quill quirk quite quits quota quote rabid raced
    racer races racks radar radio raids rails rains raise raked rakes rally
    ramen ranch ranks rants rapid rarer raspy rated rates ratio ratty raves
    rawer rayon razor reach react reads ready realm reams reaps rears rebel
    rebut recap recur reeds reedy reefs reeks reels refer regal rehab reign
    reins relax relay relic remit remix renal renew rents repay repel reply
    reset resin rests retry reuse revel rhyme rider rides rifle rifts right
    rigid rigor riled rinds rings rinks rinse riots ripen riper risen riser
    rises risks risky rites rival rivet roads roams roars roast robes rocks
    rodeo rogue roles rolls roman roofs rooms roomy roost roots ropes roses
    rosin rotor rouge rough round rouse route rover roves rowdy rowed rower
    royal ruble rugby ruins ruled ruler rules rumor runes rungs runny rural
    rusty sadly safer sails saint salad sales salon salsa salty salve salvo
    sandy saner sappy sassy sauce saucy sauna saved saver saves savor savvy
    sawed scalp scams scans scant scare scarf scars scary scoff scold scone
    scoop scoot scope score scorn scour scout scowl scram scrap screw scrub
    scrum scuba scuff scull seals seams sears seats seeds seedy seeks seems
    seeps seers seize sells sends sense sepia serum serve seven sever sewer
    shady shaft shake shaky shall shame shank shard share shark shave shawl
    sheaf shear sheds sheep sheer shied shift shiny ships shirt shock shoes
    shone shook shoot shops short shots shout shove shown shows showy shred
    shrew shrub shrug shuns shunt shuts shyly sides siege sieve sighs sigma
    signs silks silly silos silts since singe sings sinks sinus sired siren
    sites sixth sixty sized sizes skate skier skies skims skins skips skirt
    skits skull skunk slabs slack slain slams slang slant slaps slash slats
    slays sleds sleek sleep sleet slept slice slick slimy sling slink slips
    slits slops slosh slots sloth slows slugs slump slums slung slurp slush
    slyly smack small smart smash smear smell smelt smile smirk smock smoke
    smoky snags snail snake snaps snare snarl sneak sneer sniff snipe snips
    snobs snoop snore snort snout snowy snubs snuck snuff soaps soapy soars
    sober socks sodas sofas softy soggy soils soles solos solve sonar songs
    sonic sonny sooty sorry sorts souls soups soupy sowed spade spams spans
    spare spars spasm spate spawn spays speak specs speck speed spell spend
    spent spicy spied spies spike spiky spill spilt spine spins spiny spite
    spits spoil spoke spoof spook spool spoon spore sport spots spout spree
    spuds spume spunk spurn spurs spurt squad squat squib squid stabs stack
    staff stags staid stake stalk stall stank stash stats stave stays stead
    steak steal steed steer stems steps stern stews stiff stilt sting stink
    stint stock stoic stoke stole stomp stony stood stool stoop stops stork
    stout stove stows strap stray strep strew strum strut stuck studs stuff
    stump stung stuns stunt suave suede suing suits sulky sulks sully super
    surly sushi swamp swans swaps swarm swash swear sweat swigs swims swine
    swipe swish swoon swoop sword swore sworn swung syrup taboo tacos tails
    taint taken taker takes tales talks tally talon tamed tamer tames tango
    tangy tanks taped tapes tardy tarps tarts tasks tasty tatty taunt tawny
    taxed taxes taxis teams tears teary tease teens teeth tells temps tends
    tenet tense tenth tents tepid terms terns terse tests testy texts thank
    thaws theft their there these thief thigh thing think thins third throb
    threw throw thuds thugs thump thyme tiara tibia ticks tides tiers tight
    tiled tiles tills tilts timed times timid tinge tings tinny tints tipsy
    tired tires titan toads toils tolls tombs tomes toned toner tones tongs
    tonic tools tooth topic torso torts total totem totes tours touts towns
    toxic toxin toyed tract tramp trams traps trash trawl trays treed trees
    treks tress triad tried tries trike trill trims trios tripe trips trite
    troll tromp troop trope trots trout trove truck truer truly trump truss
    tubas tubby tubed tubes tucks tufts tummy tumor tunas tuned tuner tunes
    tunic turfs turns tutor tuxes twain twang tweak tweed tweet twerp twice
    twigs twill twine twins twirl twits tying typed types typos tyres udder
    ulcer uncle uncut undid undue unfit unify units unlit unmet unset untie
    until unwed unzip upper upset urged urges users using usurp valet valor
    valve veers vegan veils veins veiny venom vents verbs verge verso verve
    vests vexed vexes vials vibes vicar vices video views vigil villa vines
    viper viral virus visas visit visor vital vixen vodka voids volts voter
    votes vouch vowed wacky waded wades wafts waged wager wages wails waits
    waive wakes wales walks walls wands waned wanes wants wards wares warms
    warns warps warts washy wasps waste watts waved waver waves waxed waxes
    webby weeds weedy weeks weeps weepy weird weirs wells welsh welts whack
    whelp which whiff whims whine whiny whips whirl whirs whist whizz whose
    wider widow wield wilds wiles wills wilts wimps wimpy wince winch winds
    wines wings winks wiped wiper wipes wired wires wisps witch wives woken
    women wooed wooly words wordy works worms wormy worry worse worst wound
    wraps wreak wrens wring wrist wrote wrung wryly yards yarns yawns yearn
    years yells yelps yolks yours yummy zeros zesty zonal zoned zones zooms`)
      .trim().split(/\s+/).filter(word => /^[a-z]{5}$/.test(word))
  ]);

  function wordStorageKey() {
    return `moodifyWordV3:${email || "guest"}`;
  }

  function newWord(answer) {
    return { answer, guesses: [], draft: "", done: false };
  }

  function wordState() {
    const day = today();
    if (rounds.word?.day === day) return rounds.word;

    const daily = newWord(targets[day % targets.length]);
    const saved = read(wordStorageKey(), {});

    if (saved.day === day && Array.isArray(saved.guesses)) {
      daily.guesses = saved.guesses
        .filter(word => typeof word === "string" && /^[a-z]{5}$/.test(word))
        .slice(0, 6);
      daily.done = daily.guesses.includes(daily.answer) || daily.guesses.length === 6;
    }

    rounds.word = { day, mode: "daily", daily, practice: null, deck: [] };
    return rounds.word;
  }

  function gradeWord(guess, answer) {
    const marks = Array(5).fill("absent");
    const remaining = [...answer];

    for (let i = 0; i < 5; i++) {
      if (guess[i] === answer[i]) {
        marks[i] = "exact";
        remaining[i] = null;
      }
    }

    for (let i = 0; i < 5; i++) {
      if (marks[i] === "exact") continue;

      const index = remaining.indexOf(guess[i]);
      if (index !== -1) {
        marks[i] = "near";
        remaining[index] = null;
      }
    }

    return marks;
  }

  function startPractice() {
    const game = wordState();

    if (!game.deck.length) {
      game.deck = shuffled(targets.filter(word =>
        word !== game.daily.answer && word !== game.practice?.answer
      ));
    }

    game.practice = newWord(game.deck.pop());
    game.mode = "practice";
    renderGame();
  }

  function enterWordKey(key) {
    const game = wordState();
    const round = game[game.mode];
    if (round.done) return;

    if (key === "Backspace") {
      round.draft = round.draft.slice(0, -1);
    } else if (key === "Enter") {
      if (round.draft.length !== 5) {
        gameMessage("Enter five letters.");
        return;
      }

      if (!dictionary.has(round.draft)) {
        gameMessage("This word is not in the game’s word list.");
        return;
      }

      const guess = round.draft;
      round.guesses.push(guess);
      round.draft = "";

      if (game.mode === "daily") {
        write(wordStorageKey(), { day: game.day, guesses: round.guesses });
      }

      if (guess === round.answer || round.guesses.length === 6) {
        const points = game.mode === "daily" ? 75 : 25;
        award(round, guess === round.answer ? points : 0);
      }
    } else if (/^[a-z]$/i.test(key) && round.draft.length < 5) {
      round.draft += key.toLowerCase();
    } else {
      return;
    }

    renderGame();
  }

  function renderWord() {
    const game = wordState();
    const round = game[game.mode];
    const bar = gameTools();

    button(bar, "Daily puzzle", () => {
      game.mode = "daily";
      renderGame();
    });

    button(bar, "New Wordle", startPractice);

    if (game.mode === "daily" && game.practice && !game.practice.done) {
      button(bar, "Resume practice", () => {
        game.mode = "practice";
        renderGame();
      });
    }

    const grid = element("div", "word-grid letter-board", $("gameSurface"));
    const known = {};
    const strength = { absent: 1, near: 2, exact: 3 };

    for (let row = 0; row < 6; row++) {
      const guess = round.guesses[row];
      const draft = row === round.guesses.length ? round.draft : "";
      const marks = guess ? gradeWord(guess, round.answer) : [];

      for (let col = 0; col < 5; col++) {
        const letter = guess?.[col] || draft[col] || "";
        const tile = element("span", "letter", grid, letter.toUpperCase());

        if (guess) {
          const mark = marks[col];
          tile.classList.add(mark);
          tile.setAttribute("aria-label", `${letter}: ${mark}`);

          if (!known[letter] || strength[mark] > strength[known[letter]]) {
            known[letter] = mark;
          }
        } else if (letter) {
          tile.classList.add("typed");
        }
      }
    }

    const keyboard = element("div", "keyboard", $("gameSurface"));

    ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].forEach((letters, rowIndex) => {
      const row = element("div", "key-row", keyboard);

      function addKey(label, value, wide = false) {
        const key = button(row, label, () => enterWordKey(value), wide ? "key wide" : "key");
        key.disabled = round.done;

        const mark = known[value.toLowerCase()];
        if (mark) key.classList.add(mark);
        if (mark === "absent") key.style.textDecoration = "line-through";
        key.setAttribute("aria-label", mark ? `${label}: ${mark}` : label);
      }

      if (rowIndex === 2) addKey("Enter", "Enter", true);
      [...letters].forEach(letter => addKey(letter, letter));
      if (rowIndex === 2) addKey("Delete", "Backspace", true);
    });

    const modeName = game.mode === "daily" ? "Daily puzzle" : "Practice";

    if (round.done) {
      gameMessage(round.guesses.includes(round.answer)
        ? `${modeName} solved in ${round.guesses.length} of 6.`
        : `The word was ${round.answer.toUpperCase()}.`);
    } else {
      gameMessage(`${modeName} · Guess ${round.guesses.length + 1} of 6`);
    }
  }

  function initArcade() {
    document.querySelectorAll("[data-game]").forEach(choice => {
      choice.addEventListener("click", () => openGame(choice.dataset.game));
    });

    document.addEventListener("keydown", event => {
      if (currentPage !== "arcade" || activeGame !== "word") return;
      if ($("authDialog")?.open || event.ctrlKey || event.metaKey ||
          event.altKey || event.isComposing) return;

      const target = event.target;
      if (target instanceof Element &&
          target.closest("input, textarea, select, [contenteditable=true]")) return;

      if (event.key === "Enter" && target instanceof HTMLButtonElement) return;

      if (/^[a-z]$/i.test(event.key) || ["Enter", "Backspace"].includes(event.key)) {
        event.preventDefault();
        if (/^[a-z]$/i.test(event.key) && target instanceof HTMLButtonElement) {
          target.blur();
        }
        enterWordKey(event.key);
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && currentPage === "arcade" && activeGame === "word") {
        renderGame();
      }
    });

    renderGame();
  }

  /* =========================================================
     NAVIGATION AND PROFILE
     ========================================================= */

  const pageNames = {
    home: "Overview",
    studio: "Creative Studio",
    discover: "Discover",
    arcade: "Moodify Arcade",
    music: "Playlist",
    collection: "My Collection",
    profile: "My Profile"
  };

  function showPage(page) {
    if (!$(page) || !Object.hasOwn(pageNames, page)) return;
    currentPage = page;

    document.querySelectorAll(".page").forEach(section => {
      section.hidden = section.id !== page;
      section.classList.toggle("active", section.id === page);
    });

    document.querySelectorAll(".nav-link, .nav-item").forEach(link => {
      link.classList.toggle("active", (link.dataset.open || link.dataset.page) === page);
    });

    if ($("pageHeading")) $("pageHeading").textContent = pageNames[page];

    if (page === "arcade") renderGame();
    if (page === "collection") renderCollection();
    if (page === "discover") renderGallery();

    updateStats();
    window.scrollTo(0, 0);
  }

  function applyTheme(mode) {
    document.documentElement.classList.toggle("light", mode === "light");
    document.documentElement.classList.toggle("light-mode", mode === "light");

    if ($("themeToggle")) {
      $("themeToggle").textContent = mode === "light" ? "Dark mode" : "Light mode";
    }
  }

  function initNavigation() {
    document.querySelectorAll("[data-open]").forEach(link => {
      link.onclick = event => {
        event.preventDefault();
        showPage(link.dataset.open);
      };
    });

    applyTheme(read("moodifyThemeV1", "dark"));

    if ($("themeToggle")) {
      $("themeToggle").onclick = () => {
        const mode = document.documentElement.classList.contains("light") ? "dark" : "light";
        write("moodifyThemeV1", mode);
        applyTheme(mode);
      };
    }
  }

  function updateAccount() {
    const signedIn = Boolean(email && accounts[email]);
    const name = signedIn ? accounts[email].name : "Creative Explorer";

    for (const id of ["loginButton", "signupButton", "profileLogin"]) {
      if ($(id)) $(id).hidden = signedIn;
    }

    for (const id of ["accountButton", "logoutButton"]) {
      if ($(id)) $(id).hidden = !signedIn;
    }

    if ($("accountButton")) $("accountButton").textContent = name;
    if ($("profileName")) $("profileName").textContent = name;
    if ($("profileDetail")) {
      $("profileDetail").textContent = signedIn ? email : "Guest profile on this browser.";
    }
  }

  function switchAccount(address) {
    email = address;
    write(sessionKey, email);

    data = loadWorkspace();
    rounds = {};
    selectedPhotos = {};
    selectedColors = {};
    currentBoard = null;

    updateAccount();
    updateStats();
    renderGame();
    renderCollection();

    if ($("themeSelect")?.options.length) generateBoard();
    if (currentPage === "discover") renderGallery();
  }

  function hex(bytes) {
    return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  async function hashPassword(password, saltHex) {
    if (!globalThis.crypto?.subtle) {
      throw new Error("Open Moodify on localhost or HTTPS to use profiles.");
    }

    const salt = Uint8Array.from(saltHex.match(/../g), value => parseInt(value, 16));
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
    );

    const result = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
      key, 256
    );

    return hex(new Uint8Array(result));
  }

  function initAccount() {
    updateAccount();
    const dialog = $("authDialog");
    const form = $("authForm");
    if (!dialog || !form) return;

    let signup = false;

    function configure(create) {
      signup = create;
      $("authTitle").textContent = create ? "Sign up" : "Log in";
      $("authSubmit").textContent = create ? "Create account" : "Log in";
      $("switchAuth").textContent = create ? "Already registered? Log in" : "Create an account";
      $("authName").hidden = !create;
      $("nameLabel").hidden = !create;
      $("authName").required = create;
      $("authPassword").minLength = create ? 8 : 1;
      $("authPassword").autocomplete = create ? "new-password" : "current-password";
      $("authError").textContent = "";
    }

    function open(create) {
      form.reset();
      configure(create);
      dialog.showModal();
      (create ? $("authName") : $("authEmail")).focus();
    }

    $("loginButton").onclick = () => open(false);
    $("signupButton").onclick = () => open(true);
    $("profileLogin").onclick = () => open(false);
    $("closeAuth").onclick = () => dialog.close();
    $("switchAuth").onclick = () => configure(!signup);
    $("logoutButton").onclick = () => {
      switchAccount("");
      notify("Logged out.");
    };

    form.onsubmit = async event => {
      event.preventDefault();
      const address = $("authEmail").value.trim().toLowerCase();
      const password = $("authPassword").value;
      const name = $("authName").value.trim();

      $("authSubmit").disabled = true;
      $("switchAuth").disabled = true;
      $("authError").textContent = "";

      try {
        accounts = read(accountsKey, {});

        if (signup) {
          if (!name) throw new Error("Enter a display name.");
          if (Object.hasOwn(accounts, address)) {
            throw new Error("A profile with this email already exists.");
          }

          const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
          const digest = await hashPassword(password, salt);

          const next = { ...accounts, [address]: { name, salt, digest } };
          if (!write(accountsKey, next)) throw new Error("The profile could not be saved.");
          accounts = next;
        } else {
          const account = accounts[address];

          if (!account || await hashPassword(password, account.salt) !== account.digest) {
            throw new Error("The email or password is incorrect.");
          }
        }

        switchAccount(address);
        dialog.close();
        form.reset();
        notify(signup ? "Account created." : "Welcome back.");
      } catch (error) {
        $("authError").textContent = error.message;
      } finally {
        $("authSubmit").disabled = false;
        $("switchAuth").disabled = false;
      }
    };
  }

  /* =========================================================
     MUSIC: four original instrumentals and WAV downloads
     ========================================================= */

  const tracks = [
    { name: "Window Light", voice: "Felt keys", bpm: 78, roots: [50, 46, 53, 48],
      thirds: [3, 4, 4, 4], notes: [0, null, 7, 10, 7, null, 3, 5] },
    { name: "Copper Room", voice: "Electric piano", bpm: 88, roots: [48, 45, 53, 43],
      thirds: [4, 3, 4, 4], notes: [7, 4, null, 2, 0, null, 4, 7] },
    { name: "Salt Air", voice: "Plucked strings", bpm: 100, roots: [55, 50, 52, 48],
      thirds: [4, 4, 3, 4], notes: [0, 7, 4, null, 9, 7, null, 2] },
    { name: "After Hours", voice: "Analog synth", bpm: 92, roots: [45, 41, 48, 43],
      thirds: [3, 4, 4, 4], notes: [0, null, 3, 7, null, 10, 7, 5] }
  ];

  const recordings = new Map();
  let playingTrack = -1;
  let pendingTrack = -1;
  let audioRequest = 0;

  function makeRecording(index) {
    const track = tracks[index];
    const beat = 60 / track.bpm;
    const rate = 22050;
    const samples = new Float32Array(Math.ceil((32 * beat + 1.4) * rate));

    function note(start, duration, midi, volume, voice) {
      const hz = 440 * 2 ** ((midi - 69) / 12);
      const offset = Math.floor(start * rate);
      const length = Math.min(samples.length - offset, Math.floor(duration * rate));

      for (let i = 0; i < length; i++) {
        const t = i / rate;
        const phase = 2 * Math.PI * hz * t;
        const attack = voice === "pad" ? .12 : .012;
        const decay = voice === "Plucked strings" ? 4.8 : voice === "pad" ? .65 : 2;

        const envelope = Math.min(1, t / attack)
          * Math.min(1, (duration - t) / .12) * Math.exp(-decay * t);

        let tone = Math.sin(phase);

        if (voice === "Electric piano") tone += .24 * Math.sin(2 * phase + .55 * Math.sin(phase));
        if (voice === "Plucked strings") tone += .32 * Math.sin(2 * phase) + .15 * Math.sin(3 * phase);
        if (voice === "Analog synth") tone += .24 * Math.sin(3 * phase) + .1 * Math.sin(5 * phase);
        if (voice === "Felt keys") tone += .22 * Math.sin(2 * phase) * Math.exp(-4 * t);

        samples[offset + i] += tone * volume * envelope;
      }
    }

    for (let bar = 0; bar < 8; bar++) {
      const chord = bar % 4;
      const root = track.roots[chord];
      const third = track.thirds[chord];
      const start = bar * 4 * beat;

      [0, third, 7].forEach((pitch, n) => {
        note(start + n * .035, 3.7 * beat, root + pitch, .10, "pad");
      });

      note(start, 1.6 * beat, root - 12, .21, "bass");
      note(start + 2 * beat, 1.3 * beat, root - 5, .13, "bass");

      track.notes.forEach((pitch, step) => {
        if (pitch === null) return;
        const interval = pitch === 3 || pitch === 4 ? third : pitch;
        note(start + step * beat / 2, .9 * beat, root + 12 + interval, .18, track.voice);
      });
    }

    const echo = Math.floor(rate * beat * .75);
    for (let i = samples.length - 1; i >= echo; i--) {
      samples[i] += samples[i - echo] * .16;
    }

    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const wav = new DataView(buffer);

    function label(offset, value) {
      [...value].forEach((char, i) => wav.setUint8(offset + i, char.charCodeAt(0)));
    }

    label(0, "RIFF");
    wav.setUint32(4, buffer.byteLength - 8, true);
    label(8, "WAVE");
    label(12, "fmt ");
    wav.setUint32(16, 16, true);
    wav.setUint16(20, 1, true);
    wav.setUint16(22, 1, true);
    wav.setUint32(24, rate, true);
    wav.setUint32(28, rate * 2, true);
    wav.setUint16(32, 2, true);
    wav.setUint16(34, 16, true);
    label(36, "data");
    wav.setUint32(40, samples.length * 2, true);

    let peak = .01;
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample));

    for (let i = 0; i < samples.length; i++) {
      wav.setInt16(44 + i * 2, Math.round(samples[i] * 28500 / peak), true);
    }

    return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  }

  function recording(index) {
    if (!recordings.has(index)) {
      const promise = new Promise((resolve, reject) => {
        setTimeout(() => {
          try { resolve(makeRecording(index)); }
          catch (error) { reject(error); }
        }, 0);
      });

      recordings.set(index, promise.catch(error => {
        recordings.delete(index);
        throw error;
      }));
    }

    return recordings.get(index);
  }

  function syncSound() {
    const player = $("audioPlayer");
    document.querySelectorAll("[data-sound]").forEach(item => {
      const index = Number(item.dataset.sound);
      const active = playingTrack === index && player && !player.paused;

      item.textContent = pendingTrack === index
        ? "Preparing…" : active ? "Pause" : item.dataset.label;
      item.setAttribute("aria-pressed", String(Boolean(active)));
    });
  }

  async function playTrack(index) {
    const player = $("audioPlayer");
    if (!player) return;

    const request = ++audioRequest;

    if (playingTrack === index && !player.paused) {
      pendingTrack = -1;
      player.pause();
      syncSound();
      return;
    }

    pendingTrack = index;
    syncSound();

    try {
      const url = await recording(index);
      if (request !== audioRequest) return;

      if (playingTrack !== index) {
        player.src = url;
        playingTrack = index;
      }

      if (player.ended) player.currentTime = 0;
      if ($("nowPlaying")) $("nowPlaying").textContent = tracks[index].name;
      await player.play();
    } catch {
      if (request === audioRequest) notify("Open Playlist and press Play in the audio player.");
    } finally {
      if (request === audioRequest) pendingTrack = -1;
      syncSound();
    }
  }

  function soundButton(parent, index, label) {
    const item = button(parent, label, () => playTrack(index));
    item.dataset.sound = index;
    item.dataset.label = label;
    return item;
  }

  function initMusic() {
    const list = $("trackList");
    if (!list || !$("audioPlayer")) return;
    list.replaceChildren();

    tracks.forEach((track, index) => {
      const row = element("article", "track", list);
      const info = element("div", "", row);
      element("strong", "", info, track.name);
      element("small", "", info, `${track.voice} · ${Math.round(32 * 60 / track.bpm + 1.4)} sec`);
      soundButton(row, index, "Play");

      const download = button(row, "Download WAV", async () => {
        download.disabled = true;

        try {
          const link = document.createElement("a");
          link.href = await recording(index);
          link.download = track.name + ".wav";
          document.body.append(link);
          link.click();
          link.remove();
        } catch {
          notify("The audio file could not be prepared.");
        } finally {
          download.disabled = false;
        }
      });
    });

    ["play", "pause", "ended"].forEach(event => {
      $("audioPlayer").addEventListener(event, syncSound);
    });
  }

  /* =========================================================
     PHOTOGRAPHS AND AESTHETICS
     ========================================================= */

  const themes = {
    luxury: {
      name: "Quiet Luxury", track: 1, quote: "Elegance is an attitude.",
      description: "Sculptural furniture, polished stone and chandelier light.",
      photos: [
        [40808312, "Sculptural living room", ["#d8cabb", "#a58c74", "#eee4d8"]],
        [36563717, "Marble hotel lounge", ["#c09a65", "#e0c998", "#79604e"]],
        [40495413, "Chandelier reception", ["#b58244", "#654b3f", "#e7c083"]]
      ]
    },
    minimal: {
      name: "Minimal Living", track: 0, quote: "Less, but better.",
      description: "Simple lines, open space and soft daylight.",
      photos: [
        [40808228, "Daylight through curtains", ["#e8e2d8", "#c7beb0", "#a7a094"]],
        [34538288, "Softly lit living room", ["#d1ccc4", "#8f938c", "#ae9c86"]],
        [40808312, "Curved sofa", ["#d8cabb", "#a58c74", "#eee4d8"]]
      ]
    },
    summer: {
      name: "Summer Escape", track: 2, quote: "Collect moments, not things.",
      description: "Palm-lined shores, turquoise water and sunlit sand.",
      photos: [
        [26491549, "Pattaya shoreline", ["#55aaa8", "#538268", "#b1d7ce"]],
        [5232688, "Turquoise shallows", ["#65c9ca", "#d9ccaa", "#547d50"]],
        [32279566, "Palm coast from above", ["#4b959f", "#83aea2", "#d6c397"]]
      ]
    },
    dark: {
      name: "Dark Academia", track: 3, quote: "Lost in another chapter.",
      description: "Timber shelves and the quiet of an old reading room.",
      photos: [
        [38841200, "The library ladder", ["#815d41", "#40372f", "#a48b62"]],
        [36093623, "Scottish reading room", ["#503c34", "#7b6653", "#323329"]],
        [31376345, "Antique library", ["#956c43", "#bb975e", "#614a39"]]
      ]
    },
    pastel: {
      name: "Pastel Dreams", track: 0, quote: "Bloom in your own time.",
      description: "Pink plaster, blue shutters and sunlit façades.",
      photos: [
        [7019647, "Pink and blue in Burano", ["#d39da8", "#83b4c6", "#e4c6bc"]],
        [13793263, "Pale pink arches", ["#e5b5ad", "#d7c1ba", "#8cb6cc"]],
        [36444602, "Mediterranean shutters", ["#80a9bc", "#e1bb9c", "#c69985"]]
      ]
    },
    cyber: {
      name: "Cyber World", track: 3, quote: "The future belongs to creators.",
      description: "Tokyo at night, through neon signs and rain.",
      photos: [
        [40492947, "Tokyo neon signs", ["#bd527e", "#504675", "#282e4d"]],
        [29326301, "Umbrellas after dark", ["#477b9f", "#aa557a", "#34344b"]],
        [31667358, "Streetlights in the rain", ["#7663ae", "#c6558f", "#35476d"]]
      ]
    }
  };

  const filters = [
    ["Cream", "#e5d7c2"], ["Gold", "#c59a58"], ["Rose", "#cc8fa3"],
    ["Green", "#729779"], ["Blue", "#76a9c4"], ["Violet", "#9977b6"],
    ["Charcoal", "#45414b"]
  ];

  let activeStyle = "luxury";
  let selectedPhotos = {};
  let selectedColors = {};
  const measuredColors = new Map();

  function imageURL(id, width = 1100) {
    return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
  }

  function edits(style) {
    return data.photoCollections[style] ||= { added: [], hidden: [] };
  }

  function rgb(hexColor) {
    return [1, 3, 5].map(start => parseInt(hexColor.slice(start, start + 2), 16));
  }

  function distance(a, b) {
    return Math.hypot(
      (a[0] - b[0]) * 1.5,
      (a[1] - b[1]) * 2,
      (a[2] - b[2]) * 1.6
    );
  }

  function samplePalette(source) {
    const width = source.naturalWidth || source.width;
    const height = source.naturalHeight || source.height;
    if (!width || !height) return [];

    const canvas = document.createElement("canvas");
    const scale = 64 / Math.max(width, height);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const bins = new Map();

    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 160) continue;

      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const group = bins.get(key) || { count: 0, sums: [0, 0, 0] };

      group.count++;
      group.sums[0] += r;
      group.sums[1] += g;
      group.sums[2] += b;
      bins.set(key, group);
    }

    const colors = [...bins.values()]
      .sort((a, b) => b.count - a.count)
      .map(group => group.sums.map(value => Math.round(value / group.count)));

    const palette = [];

    for (const spacing of [85, 45, 20]) {
      for (const color of colors) {
        if (palette.every(other => distance(other, color) >= spacing)) palette.push(color);
        if (palette.length === 4) break;
      }
      if (palette.length === 4) break;
    }

    return palette.map(color => "#" + hex(color));
  }

  function photosFor(style) {
    const changes = edits(style);

    const originals = themes[style].photos
      .filter(([id]) => !changes.hidden.includes(String(id)))
      .map(([id, name, colors]) => ({
        id: String(id),
        name,
        src: imageURL(id),
        thumb: imageURL(id, 420),
        colors: measuredColors.get(String(id)) || colors
      }));

    return [...originals, ...changes.added];
  }

  function matchingPhotos(style) {
    const photos = photosFor(style);
    const color = selectedColors[style];
    if (!color || !photos.length) return photos;

    const wanted = rgb(color);
    const ranked = photos.map(photo => ({
      photo,
      score: Math.min(...photo.colors.map(value => distance(rgb(value), wanted)))
    })).sort((a, b) => a.score - b.score);

    return ranked.filter(item => item.score <= ranked[0].score + 45).map(item => item.photo);
  }

  function currentPhoto(style, photos) {
    return photos.find(photo => photo.id === selectedPhotos[style]) || photos[0];
  }

  async function importPhoto(file) {
    const url = URL.createObjectURL(file);

    try {
      const image = new Image();
      image.src = url;
      await image.decode();

      const scale = Math.min(1, 1100 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      return {
        id: makeId(),
        name: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
        src: canvas.toDataURL("image/jpeg", .78),
        colors: samplePalette(canvas)
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function addPhotos(style, files) {
    const owner = data;
    const added = [];
    let skipped = 0;

    for (const file of files) {
      try {
        if (!file.type.startsWith("image/")) throw new Error();
        added.push(await importPhoto(file));
      } catch {
        skipped++;
      }
    }

    if (owner !== data) return;
    if (!added.length) { notify("Choose a JPG, PNG or WebP photograph."); return; }

    const changes = edits(style);
    const before = changes.added;
    changes.added = [...before, ...added];

    if (!persist()) {
      changes.added = before;
      return;
    }

    selectedColors[style] = "";
    selectedPhotos[style] = added[0].id;
    renderGallery();
    notify(`${added.length} added${skipped ? `, ${skipped} skipped` : ""}.`);
  }

  function removePhoto(style, photo) {
    if (!confirm(`Remove "${photo.name}" from this collection?`)) return;

    const changes = edits(style);
    const beforeAdded = changes.added;
    const beforeHidden = changes.hidden;

    if (changes.added.some(item => item.id === photo.id)) {
      changes.added = changes.added.filter(item => item.id !== photo.id);
    } else {
      changes.hidden = [...changes.hidden, photo.id];
    }

    if (!persist()) {
      changes.added = beforeAdded;
      changes.hidden = beforeHidden;
      return;
    }

    delete selectedPhotos[style];
    renderGallery();
  }

  function renderGallery() {
    const gallery = $("discoverGrid");
    if (!gallery) return;

    gallery.replaceChildren();
    gallery.classList.add("lookbook");

    const style = activeStyle;
    const theme = themes[style];
    const photos = matchingPhotos(style);
    const selected = currentPhoto(style, photos);

    const tabs = element("div", "lookbook-tabs", gallery);

    Object.entries(themes).forEach(([key, item]) => {
      const tab = button(tabs, item.name, () => {
        activeStyle = key;
        renderGallery();
      }, "lookbook-tab");

      tab.setAttribute("aria-pressed", String(style === key));
    });

    const toolbar = element("div", "photo-toolbar", gallery);
    const colors = element("div", "photo-filters", toolbar);

    function selectColor(color) {
      selectedColors[style] = color;
      delete selectedPhotos[style];
      renderGallery();
    }

    const all = button(colors, "All colors", () => selectColor(""), "all-colors");
    all.setAttribute("aria-pressed", String(!selectedColors[style]));

    filters.forEach(([name, color]) => {
      const swatch = button(colors, "", () => selectColor(color), "filter-swatch");
      swatch.style.backgroundColor = color;
      swatch.title = name;
      swatch.setAttribute("aria-label", `Show photos closest to ${name}`);
      swatch.setAttribute("aria-pressed", String(selectedColors[style] === color));
    });

    const colorLabel = element("label", "custom-photo-color", colors, "Custom ");
    const custom = element("input", "", colorLabel);
    custom.type = "color";
    custom.value = selectedColors[style] || "#a98aff";
    custom.onchange = () => selectColor(custom.value);

    const upload = element("input", "", toolbar);
    upload.type = "file";
    upload.accept = "image/*";
    upload.multiple = true;
    upload.hidden = true;

    const add = button(toolbar, "Add photos", () => upload.click());

    upload.onchange = async () => {
      const files = [...upload.files];
      if (!files.length) return;

      add.disabled = true;
      add.textContent = "Adding…";
      try { await addPhotos(style, files); }
      finally {
        add.disabled = false;
        add.textContent = "Add photos";
        upload.value = "";
      }
    };

    if (!selected) {
      element("p", "photo-empty", gallery, "This collection is empty. Choose Add photos.");
      return;
    }

    const layout = element("div", "lookbook-layout", gallery);
    const figure = element("figure", "lookbook-photo", layout);
    const image = new Image();
    image.alt = selected.name;
    image.decoding = "async";
    if (!selected.src.startsWith("data:")) image.crossOrigin = "anonymous";
    figure.append(image);

    const caption = element("figcaption", "", figure, selected.name);
    const info = element("div", "lookbook-info", layout);
    element("h2", "", info, theme.name);
    element("p", "", info, theme.description);

    const palette = element("div", "lookbook-palette", info);

    function drawPalette(values) {
      palette.replaceChildren();
      values.forEach(color => {
        const item = element("span", "", palette);
        item.style.backgroundColor = color;
        item.title = color;
      });
    }

    drawPalette(selected.colors);

    const audioGroup = element("div", "lookbook-audio", info);
    soundButton(audioGroup, theme.track, "Listen");
    element("small", "", audioGroup, tracks[theme.track].name);
    syncSound();

    const actions = element("div", "lookbook-actions", info);

    button(actions, "Use in studio", () => {
      if (!$("themeSelect")) return;
      $("themeSelect").value = style;
      generateBoard(selected.name);
      showPage("studio");
    }, "primary");

    if (photos.length > 1) {
      button(actions, "Next photo", () => {
        const index = photos.findIndex(item => item.id === selected.id);
        selectedPhotos[style] = photos[(index + 1) % photos.length].id;
        renderGallery();
      });
    }

    button(actions, "Remove photo", () => removePhoto(style, selected), "remove-photo");

    image.onload = () => {
      if (!figure.isConnected || selectedColors[style] || !/^\d+$/.test(selected.id)) return;

      try {
        const values = samplePalette(image);
        if (values.length) {
          measuredColors.set(selected.id, values);
          drawPalette(values);
        }
      } catch {
        // Keep the built-in palette when the host restricts pixel reading.
      }
    };

    image.onerror = () => {
      if (!figure.isConnected) return;

      if (image.hasAttribute("crossorigin")) {
        image.removeAttribute("crossorigin");
        image.src = selected.src;
        return;
      }

      image.hidden = true;
      caption.textContent = "Photo unavailable. Choose another photo or add your own.";
    };

    image.src = selected.src;

    const thumbs = element("div", "lookbook-thumbs", gallery);
    photos.forEach(photo => {
      const thumb = button(thumbs, "", () => {
        selectedPhotos[style] = photo.id;
        renderGallery();
      }, "lookbook-thumb");

      thumb.setAttribute("aria-pressed", String(photo.id === selected.id));
      const preview = element("img", "", thumb);
      preview.alt = "";
      preview.loading = "lazy";
      preview.src = photo.thumb || photo.src;
      element("span", "", thumb, photo.name);
    });
  }

  /* =========================================================
     CREATIVE STUDIO AND SAVED BOARDS
     ========================================================= */

  function boardCards(board) {
    if (!Array.isArray(board.cards)) {
      board.cards = [
        ...(board.images || []).map(value => ({ type: "image", value })),
        ...(board.colors || []).map(value => ({ type: "color", value })),
        { type: "quote", value: board.quote || "" }
      ];

      if (board.uploaded) board.cards.unshift({ type: "image", value: board.uploaded });
    }

    return board.cards;
  }

  function generateBoard(title) {
    const selector = $("themeSelect");
    if (!selector) return;

    const style = themes[selector.value] ? selector.value : "minimal";
    const theme = themes[style];
    const photos = matchingPhotos(style);
    const selected = currentPhoto(style, photos);

    if (!selected) {
      notify("Add a photo to this aesthetic first.");
      return;
    }

    const ordered = [selected, ...photos.filter(photo => photo.id !== selected.id)];
    const name = title || $("boardTitle")?.value.trim() || theme.name;
    const accent = selectedColors[style] || selected.colors[0] || "#a98aff";

    currentBoard = {
      id: makeId(),
      title: name,
      date: new Date().toLocaleDateString(),
      theme: style,
      accent,
      images: ordered.slice(0, 3).map(photo => photo.src),
      colors: [...selected.colors],
      quote: theme.quote
    };

    if ($("boardTitle")) $("boardTitle").value = name;
    if ($("accentInput")) $("accentInput").value = accent;
    updateStudioSound();
    renderBoard();
  }

  function updateStudioSound() {
    const item = $("studioSound");
    const theme = themes[$("themeSelect")?.value];
    if (!item || !theme) return;

    item.dataset.sound = theme.track;
    item.dataset.label = "Play aesthetic sound";
    syncSound();
  }

  function renderBoard() {
    const grid = $("moodGrid");
    if (!currentBoard || !grid) return;

    if ($("displayTitle")) $("displayTitle").textContent = currentBoard.title;
    if ($("boardDate")) $("boardDate").textContent = currentBoard.date || "";
    $("moodBoard")?.style.setProperty("--board-accent", currentBoard.accent);

    grid.replaceChildren();
    const cards = boardCards(currentBoard);
    let dragged = null;

    cards.forEach((item, index) => {
      const card = element("div", `mood-card ${item.type}`, grid);
      card.draggable = true;

      if (item.type === "image") {
        const image = element("img", "", card);
        image.alt = "Mood board photograph";
        image.draggable = false;
        image.src = item.value;

        const remove = button(card, "Remove", () => {
          cards.splice(index, 1);
          currentBoard.images = cards.filter(c => c.type === "image").map(c => c.value);
          renderBoard();
        });

        remove.setAttribute("aria-label", `Remove photograph ${index + 1} from this board`);
      } else if (item.type === "color") {
        card.style.backgroundColor = item.value;
        element("span", "", card, item.value);
      } else {
        card.textContent = item.value;
      }

      card.ondragstart = event => {
        dragged = index;
        event.dataTransfer.setData("text/plain", String(index));
      };
      card.ondragover = event => event.preventDefault();
      card.ondragend = () => { dragged = null; };
      card.ondrop = event => {
        event.preventDefault();
        if (dragged === null || dragged === index) return;

        const [moved] = cards.splice(dragged, 1);
        cards.splice(index, 0, moved);
        dragged = null;
        renderBoard();
      };
    });
  }

  function renderCollection() {
    const grid = $("collectionGrid") || $("savedBoards");
    if (!grid) return;

    grid.replaceChildren();

    if (!data.boards.length) {
      element("p", "", grid, "Your saved boards will appear here.");
      return;
    }

    data.boards.forEach(board => {
      const card = element("article", "panel collection-card", grid);
      element("h3", "", card, board.title || "Untitled board");
      element("small", "", card, board.date || "");

      const strip = element("div", "color-strip", card);
      (board.colors || []).forEach(color => {
        element("span", "", strip).style.backgroundColor = color;
      });

      const bar = element("div", "card-actions", card);

      button(bar, "Open", () => {
        currentBoard = structuredClone(board);

        if ($("themeSelect")) $("themeSelect").value = themes[board.theme] ? board.theme : "minimal";
        if ($("boardTitle")) $("boardTitle").value = board.title || "";
        if ($("accentInput")) $("accentInput").value = board.accent || "#a98aff";

        updateStudioSound();
        renderBoard();
        showPage("studio");
      });

      button(bar, "Delete", () => {
        if (!confirm("Delete this saved board?")) return;
        const previous = data.boards;
        data.boards = previous.filter(item => item.id !== board.id);

        if (!persist()) {
          data.boards = previous;
          return;
        }

        updateStats();
        renderCollection();
      });
    });
  }

  function initStudio() {
    const selector = $("themeSelect");
    if (!selector || !$("moodGrid")) return;

    selector.replaceChildren();
    Object.entries(themes).forEach(([key, theme]) => {
      const option = element("option", "", selector, theme.name);
      option.value = key;
    });

    selector.value = "minimal";

    selector.onchange = () => {
      activeStyle = selector.value;
      generateBoard(themes[activeStyle].name);
    };

    if ($("generateBoard")) {
      $("generateBoard").onclick = () => generateBoard($("boardTitle")?.value.trim());
    }

    if ($("studioSound")) {
      $("studioSound").onclick = () => playTrack(themes[selector.value].track);
    }

    if ($("accentInput")) {
      $("accentInput").onchange = () => {
        selectedColors[selector.value] = $("accentInput").value;
        delete selectedPhotos[selector.value];
        generateBoard($("boardTitle")?.value.trim());
      };
    }

    if ($("randomColor") && $("accentInput")) {
      $("randomColor").onclick = () => {
        $("accentInput").value = "#" + Math.floor(Math.random() * 16777216)
          .toString(16).padStart(6, "0");

        $("accentInput").dispatchEvent(new Event("change"));
      };
    }

    if ($("imageUpload")) {
      $("imageUpload").multiple = true;

      $("imageUpload").onchange = async event => {
        const input = event.target;
        const target = currentBoard;
        const files = [...input.files];
        input.value = "";

        if (!target) return;
        const added = [];

        for (const file of files) {
          try {
            const photo = await importPhoto(file);
            added.push({ type: "image", value: photo.src });
          } catch {
            notify(`Could not open ${file.name}.`);
          }
        }

        boardCards(target).unshift(...added);
        target.images = target.cards.filter(item => item.type === "image").map(item => item.value);
        if (target === currentBoard) renderBoard();
      };
    }

    if ($("saveBoard")) {
      $("saveBoard").onclick = () => {
        if (!currentBoard) return;

        const previous = data.boards;
        const copy = structuredClone(currentBoard);
        copy.id = makeId();
        copy.title = $("boardTitle")?.value.trim() || copy.title;
        data.boards = [copy, ...previous].slice(0, 15);

        if (!persist()) {
          data.boards = previous;
          return;
        }

        currentBoard.title = copy.title;
        renderBoard();
        updateStats();
        notify("Board saved.");
      };
    }

    if ($("exportBoard")) {
      $("exportBoard").onclick = async () => {
        if (!currentBoard) return;

        if (typeof window.html2canvas !== "function") {
          notify("Connect to the internet to load PNG export.");
          return;
        }

        try {
          const canvas = await window.html2canvas($("moodBoard"), {
            useCORS: true,
            scale: 2,
            backgroundColor: getComputedStyle($("moodBoard")).backgroundColor,
            ignoreElements: item => item.tagName === "BUTTON"
          });

          const link = document.createElement("a");
          link.download = `${currentBoard.title || "Moodify"}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        } catch {
          notify("This board could not be exported.");
        }
      };
    }

    generateBoard();
  }

  /* =========================================================
     START
     ========================================================= */

  function start() {
    initArcade();
    initNavigation();
    updateStats();

    // Keep independently loaded features from blocking the Arcade.
    const features = [
      ["Profile", initAccount],
      ["Playlist", initMusic],
      ["Creative Studio", initStudio],
      ["Collection", renderCollection]
    ];

    features.forEach(([name, initialize]) => {
      try {
        initialize();
      } catch (error) {
        console.error(`Moodify: ${name} could not start.`, error);
      }
    });

    showPage("home");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
  /* 1. Color by Numbers */

  const pictures = [
    {
      name: "Cat",
      colors: ["#bc8258", "#754d3f", "#e4be96", "#37343c", "#d99d9e"],
      rows: [
        "0000000000000",
        "0020000000200",
        "0022000002200",
        "0025200025200",
        "0021122211200",
        "0011111111100",
        "0211411141120",
        "0211411141120",
        "0011335331100",
        "0021334331200",
        "0002111112000",
        "0000211120000",
        "0000000000000"
      ]
    },
    {
      name: "Dog",
      colors: ["#b58156", "#695045", "#ead2ad", "#33313a", "#c78080"],
      rows: [
        "0000000000000",
        "0000222220000",
        "0022111112200",
        "0221111111220",
        "0221133311220",
        "0221433341220",
        "0221433341220",
        "0021133311200",
        "0001334331000",
        "0001334331000",
        "0000135310000",
        "0000015100000",
        "0000000000000"
      ]
    },
    {
      name: "Glass Bottle",
      colors: ["#476657", "#85a990", "#c5d7bb", "#c6a476", "#ece0c0"],
      rows: [
        "0000044400000",
        "0000044400000",
        "0000011100000",
        "0000013100000",
        "0000013100000",
        "0000123210000",
        "0001223221000",
        "0001232221000",
        "0001555551000",
        "0001544451000",
        "0001555551000",
        "0001222221000",
        "0000111110000"
      ]
    },
    {
      name: "Strawberry",
      colors: ["#be4850", "#e76c70", "#f4cf91", "#50795b", "#83a66e"],
      rows: [
        "0000004000000",
        "0000404400000",
        "0000044505000",
        "0004445554000",
        "0011224221100",
        "0123222223210",
        "0122223222210",
        "0112322223210",
        "0012223222100",
        "0011222231100",
        "0001123211000",
        "0000112110000",
        "0000011100000"
      ]
    },
    {
      name: "Sailboat",
      colors: ["#e9d9b8", "#c87559", "#735441", "#658fa5", "#9cbec5"],
      rows: [
        "0000003000000",
        "0000013200000",
        "0000113220000",
        "0001113222000",
        "0011113222200",
        "0111113222220",
        "0000003000000",
        "0333333333330",
        "0032222222300",
        "0003333333000",
        "0550005500055",
        "0044550044550",
        "0000000000000"
      ]
    },
    {
      name: "Mushroom",
      colors: ["#b74f46", "#dd7863", "#f4dfb8", "#d4b58b", "#718769"],
      rows: [
        "0000000000000",
        "0000111110000",
        "0001223221000",
        "0012322222100",
        "0122222332210",
        "0123322332210",
        "1223322222221",
        "0111111111110",
        "0000033400000",
        "0000033400000",
        "0000333440000",
        "0050333440500",
        "0005555555000"
      ]
    },
    {
      name: "Cactus",
      colors: ["#49725e", "#81a47c", "#be795c", "#e2a57d", "#c86b85"],
      rows: [
        "0000005500000",
        "0000055550000",
        "0000012100000",
        "0000012100000",
        "0012012100000",
        "0012012101200",
        "0012212101200",
        "0001112121200",
        "0000012111000",
        "0000012100000",
        "0003444443000",
        "0000334430000",
        "0000033300000"
      ]
    },
    {
      name: "Cherries",
      colors: ["#a83e52", "#d66471", "#f2b1ad", "#65835b", "#805e43"],
      rows: [
        "0000000044400",
        "0000000544440",
        "0000005500000",
        "0000050050000",
        "0000500050000",
        "0005000005000",
        "0011100011100",
        "0123210123210",
        "0122210122210",
        "0112210112210",
        "0011100011100",
        "0000000000000",
        "0000000000000"
      ]
    },
    {
      name: "Tea Cup",
      colors: ["#64838a", "#97b7b5", "#93694d", "#d9c6ae", "#e5dcd1"],
      rows: [
        "0000500050000",
        "0000050500000",
        "0000500050000",
        "0000000000000",
        "0011111111000",
        "0123333332100",
        "0122222221110",
        "0122222221010",
        "0012222221110",
        "0011222211000",
        "0001111110000",
        "0444444444440",
        "0004444444000"
      ]
    },
    {
      name: "Lighthouse",
      colors: ["#af554f", "#ebddc7", "#525d70", "#edc77d", "#7c9fa8"],
      rows: [
        "0000003000000",
        "0000033300000",
        "0000333330000",
        "0000344430000",
        "0000333330000",
        "0000022200000",
        "0000011100000",
        "0000122210000",
        "0000222220000",
        "0000111110000",
        "0001223221000",
        "0033333333300",
        "0555500055550"
      ]
    }
  ];

  function nextColorPicture() {
    const game = rounds.paint ||= {
      deck: [],
      previous: null,
      current: null
    };

    if (game.deck.length === 0) {
      game.deck = shuffled(pictures);

      // The last picture in one set cannot be the first of the next.
      const lastIndex = game.deck.length - 1;

      if (game.deck[lastIndex].name === game.previous) {
        [game.deck[0], game.deck[lastIndex]] =
          [game.deck[lastIndex], game.deck[0]];
      }
    }

    const picture = game.deck.pop();
    game.previous = picture.name;

    game.current = {
      picture,
      color: 1,
      filled: new Set(),
      total: [...picture.rows.join("")].filter(value => value !== "0").length,
      done: false
    };

    return game.current;
  }

  function renderPaint() {
    // Returning to Arcade restores the unfinished picture.
    const round = rounds.paint?.current || nextColorPicture();
    const picture = round.picture;
    const surface = $("gameSurface");

    if ($("gameRules")) {
      $("gameRules").textContent =
        "Choose a numbered color and fill its matching squares to reveal the picture.";
    }

    const palette = gameTools();

    picture.colors.forEach((hex, index) => {
      const number = index + 1;

      const swatch = button(palette, number, () => {
        round.color = number;

        for (const item of palette.children) {
          item.setAttribute(
            "aria-pressed",
            String(Number(item.dataset.color) === number)
          );
        }

        gameMessage(`${round.filled.size} of ${round.total} squares colored.`);
      }, "swatch");

      swatch.dataset.color = String(number);
      swatch.style.backgroundColor = hex;

      const [r, g, b] = hex.slice(1).match(/../g)
        .map(channel => parseInt(channel, 16));

      swatch.style.color =
        r * 0.299 + g * 0.587 + b * 0.114 > 145 ? "#241e25" : "#ffffff";

      swatch.setAttribute("aria-label", `Color ${number}`);
      swatch.setAttribute("aria-pressed", String(round.color === number));
      swatch.disabled = round.done;
    });

    const grid = element("div", "paint-grid", surface);
    grid.style.setProperty("--columns", picture.rows[0].length);

    [...picture.rows.join("")].forEach((value, index) => {
      const number = Number(value);

      if (number === 0) {
        const paper = element("span", "pixel paper", grid);
        paper.setAttribute("aria-hidden", "true");
        return;
      }

      const filled = round.filled.has(index);

      const square = button(grid, filled ? "" : number, () => {
        if (round.done || round.filled.has(index)) return;

        if (round.color !== number) {
          gameMessage(`Select color ${number} for this square.`);
          return;
        }

        round.filled.add(index);
        square.textContent = "";
        square.disabled = true;
        square.style.backgroundColor = picture.colors[number - 1];

        if (round.filled.size === round.total) {
          award(round, 40);
          renderGame();
        } else {
          gameMessage(`${round.filled.size} of ${round.total} squares colored.`);
        }
      }, "pixel");

      square.disabled = filled;
      square.setAttribute("aria-label", `Square ${index + 1}, color ${number}`);

      if (filled) {
        square.style.backgroundColor = picture.colors[number - 1];
      }
    });

    if (round.done) {
      gameMessage(`${picture.name} complete. You earned 40 points.`);

      button(gameTools(), "Next picture", () => {
        nextColorPicture();
        renderGame();
      }, "primary");
    } else {
      gameMessage(`${round.filled.size} of ${round.total} squares colored.`);
    }
  }