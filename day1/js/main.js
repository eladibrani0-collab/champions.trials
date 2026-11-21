"use strict";

const $ = id => document.getElementById(id);
const STORAGE_KEY = "moodifyAdvancedData";

const defaultData = {
boards: [],
score: 0,
games: 0,
memoryWins: 0
};

let data;

try {
data = {
...defaultData,
...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
};
} catch {
data = { ...defaultData };
}

if (!Array.isArray(data.boards)) data.boards = [];

function persist() {
try {
localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
return true;
} catch (error) {
notify("Storage unavailable or full.");
return false;
}
}

function notify(message) {
const toast = $("toast");
toast.textContent = message;
toast.classList.add("show");
clearTimeout(notify.timer);
notify.timer = setTimeout(() => {
toast.classList.remove("show");
}, 2500);
}

/* 1. PAGE NAVIGATION */

const pageNames = {
home: "Overview",
studio: "Creative Studio",
discover: "Discover",
arcade: "Moodify Arcade",
collection: "My Collection",
profile: "My Profile"
};

function showPage(page) {
const selected = $(page);
if (!selected) return;

document.querySelectorAll(".page").forEach(section => {
section.classList.remove("active");
});
selected.classList.add("active");

document.querySelectorAll(".nav-item").forEach(button => {
button.classList.toggle("active", button.dataset.page === page);
});

$("pageHeading").textContent = pageNames[page];
window.scrollTo({ top:0, behavior:"smooth" });

if (page === "home" || page === "profile" || page === "arcade") {
updateDashboard();
}
if (page === "collection") renderCollection();
}

/* 2. ORIGINAL AESTHETIC DATABASE */

const aesthetics = {
minimal: {
colors: ["#D8D2C8","#AFA79A","#ECE8DF","#827B70"],
quotes: [
"Less, but better.",
"Beauty lives in simplicity.",
"Create space for what matters.",
"Simplicity is an art."
]
},
luxury: {
colors: ["#C2A36B","#29251F","#E8D8B9","#826444"],
quotes: [
"Elegance is an attitude.",
"Make ordinary moments extraordinary.",
"Luxury is a state of mind.",
"Dream beyond the ordinary."
]
},
summer: {
colors: ["#F2A16B","#F5D76E","#76B9B2","#EBAF9B"],
quotes: [
"Chasing sunsets and dreams.",
"Collect moments, not things.",
"Let the sunshine find you.",
"Life is better in the sunshine."
]
},
dark: {
colors: ["#343B32","#75634E","#B5A18A","#252B27"],
quotes: [
"Lost in another chapter.",
"There is magic in the unknown.",
"Romanticize your own story.",
"Some stories are written in silence."
]
},
pastel: {
colors: ["#D9B8D8","#B8D5E5","#F5D7C7","#C5D9B8"],
quotes: [
"Make your own kind of magic.",
"Bloom in your own time.",
"Everything begins with imagination.",
"A little dream goes a long way."
]
},
cyber: {
colors: ["#8A5CFF","#12D9E8","#FF4EAD","#17152C"],
quotes: [
"The future belongs to creators.",
"Think beyond reality.",
"Create your own dimension.",
"Innovation has no limits."
]
}
};

const inspirationImages = [
"https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=700",
"https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=700",
"https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=700",
"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=700",
"https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=700",
"https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=700",
"https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=700"
];

function randomItem(array) {
return array[Math.floor(Math.random() * array.length)];
}

function shuffle(array) {
const result = [...array];
for (let i = result.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[result[i], result[j]] = [result[j], result[i]];
}
return result;
}

/* 3. MOOD BOARD GENERATOR */

let currentBoard = null;

function createId() {
if (window.crypto && typeof crypto.randomUUID === "function") {
return crypto.randomUUID();
}
return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function generateBoard() {
const themeName = $("themeSelect").value;
const theme = aesthetics[themeName];
if (!theme) return;

const title = $("boardTitle").value.trim() || "My Creative Universe";
const customColor = $("customColor").value;
const colors = shuffle(theme.colors);
const images = shuffle(inspirationImages);

currentBoard = {
id: createId(),
title,
theme: themeName,
accent: customColor,
quote: randomItem(theme.quotes),
colors,
images: images.slice(0,3),
uploaded: null,
date: new Date().toLocaleDateString()
};

renderBoard(currentBoard);
notify("Your new creative universe is ready!");
}

function createMoodCard(type, content, extra = {}) {
const card = document.createElement("div");
card.className = `mood-card ${extra.className || ""}`.trim();
card.draggable = true;

if (type === "image") {
const image = document.createElement("img");
image.src = content;
image.alt = "Mood board inspiration";
image.crossOrigin = content.startsWith("data:") ? null : "anonymous";
card.appendChild(image);
}

if (type === "color") {
card.classList.add("color-tile");
card.style.background = content;

const label = document.createElement("small");
label.textContent = extra.label || "COLOR PALETTE";

const hex = document.createElement("strong");
hex.textContent = content.toUpperCase();

card.append(label,hex);
}

if (type === "quote") {
card.classList.add("quote-tile");
const quote = document.createElement("p");
quote.textContent = `"${content}"`;
card.appendChild(quote);
}

return card;
}

function renderBoard(board) {
if (!board) return;

$("displayTitle").textContent = board.title;
$("boardDate").textContent = board.date;

const grid = $("moodGrid");
grid.replaceChildren();

const cards = [
createMoodCard("image",board.images[0],{className:"tall"}),
createMoodCard("color",board.accent,{label:"SIGNATURE COLOR"}),
createMoodCard("image",board.images[1]),
createMoodCard("quote",board.quote),
createMoodCard("image",board.uploaded || board.images[2],{className:"wide"}),
createMoodCard("color",board.colors[0]),
createMoodCard("color",board.colors[1]),
createMoodCard("color",board.colors[2])
];

cards.forEach(card => grid.appendChild(card));
enableDragAndDrop();
}

/* 4. DRAG AND DROP */

let draggedCard = null;

function enableDragAndDrop() {
const grid = $("moodGrid");

grid.querySelectorAll(".mood-card").forEach(card => {
card.addEventListener("dragstart", () => {
draggedCard = card;
card.classList.add("dragging");
});
card.addEventListener("dragend", () => {
card.classList.remove("dragging");
draggedCard = null;
});
card.addEventListener("dragover",event => event.preventDefault());
card.addEventListener("drop",event => {
event.preventDefault();
if (!draggedCard || draggedCard === card) return;

const cards = [...grid.children];
const from = cards.indexOf(draggedCard);
const to = cards.indexOf(card);

if (from < to) card.after(draggedCard);
else card.before(draggedCard);
});
});
}

/* 5. IMAGE UPLOAD */

$("imageUpload").addEventListener("change",event => {
const file = event.target.files[0];
if (!file) return;

if (!file.type.startsWith("image/")) {
notify("Please select a valid image.");
return;
}
if (file.size > 2 * 1024 * 1024) {
notify("Image must be smaller than 2 MB.");
return;
}

const reader = new FileReader();
reader.onload = () => {
if (!currentBoard) generateBoard();
currentBoard.uploaded = reader.result;
renderBoard(currentBoard);
notify("Your image has been added!");
};
reader.readAsDataURL(file);
event.target.value = "";
});

function randomizeColor() {
const color = "#" + Math.floor(Math.random()*16777216)
.toString(16).padStart(6,"0");

$("customColor").value = color;
if (currentBoard) {
currentBoard.accent = color;
renderBoard(currentBoard);
}
notify("New accent color selected!");
}

/* 6. SAVE AND LOAD COLLECTION */

function saveBoard() {
if (!currentBoard) {
notify("Create a board first!");
return;
}

const snapshot = {
...currentBoard,
id: createId(),
colors: [...currentBoard.colors],
images: [...currentBoard.images]
};

const previous = [...data.boards];
data.boards.unshift(snapshot);

if (data.boards.length > 15) {
data.boards = data.boards.slice(0,15);
}

if (!persist()) {
data.boards = previous;
return;
}

updateDashboard();
notify("Board saved to your collection!");
}

function renderCollection() {
const container = $("savedBoards");
container.replaceChildren();

if (!data.boards.length) {
const empty = document.createElement("div");
empty.className = "empty-state";
empty.innerHTML = `
<i class="bi bi-bookmark-heart"></i>
<h3>Your collection is waiting.</h3>
<p>Create your first board and save it here.</p>
`;

const button = document.createElement("button");
button.className = "main-button";
button.textContent = "Create a board";
button.onclick = () => showPage("studio");

empty.appendChild(button);
container.appendChild(empty);
return;
}

data.boards.forEach(board => {
const item = document.createElement("article");
item.className = "saved-item";

const preview = document.createElement("div");
preview.className = "saved-preview";

[board.accent,...board.colors.slice(0,3)].forEach(color => {
const swatch = document.createElement("span");
swatch.style.background = color;
preview.appendChild(swatch);
});

const heading = document.createElement("h4");
heading.textContent = board.title;

const details = document.createElement("p");
details.textContent = `${board.theme} · ${board.date}`;

const open = document.createElement("button");
open.textContent = "Open";
open.onclick = () => {
currentBoard = {
...board,
images: [...board.images],
colors: [...board.colors]
};
$("themeSelect").value = board.theme;
$("customColor").value = board.accent;
$("boardTitle").value = board.title;
renderBoard(currentBoard);
showPage("studio");
};

const remove = document.createElement("button");
remove.textContent = "Delete";
remove.onclick = () => deleteBoard(board.id);

item.append(preview,heading,details,open,remove);
container.appendChild(item);
});
}

function deleteBoard(id) {
data.boards = data.boards.filter(board => board.id !== id);
persist();
renderCollection();
updateDashboard();
notify("Board deleted.");
}

/* 7. EXPORT AS PNG */

async function downloadBoard() {
if (!currentBoard) {
notify("Generate a board first!");
return;
}

try {
if (typeof html2canvas !== "function") {
notify("Image export library unavailable.");
return;
}

const images = [...$("moodBoard").querySelectorAll("img")];
await Promise.all(images.map(img => {
if (img.complete) return Promise.resolve();
return new Promise(resolve => {
img.addEventListener("load",resolve,{once:true});
img.addEventListener("error",resolve,{once:true});
});
}));

const canvas = await html2canvas($("moodBoard"), {
scale:2,
backgroundColor:"#f0ebf4",
useCORS:true
});

const link = document.createElement("a");
link.download = "MOODIFY-Creation.png";
link.href = canvas.toDataURL("image/png");
link.click();

notify("Your artwork is ready!");
} catch (error) {
console.error(error);
notify("Export failed. Check image loading and try again.");
}
}

/* 8. DISCOVER PAGE */

function selectAesthetic(theme) {
$("themeSelect").value = theme;
$("boardTitle").value = `${theme.toUpperCase()} COLLECTION`;
showPage("studio");
generateBoard();
}

/* 9. ARCADE SYSTEM */

function randomHex() {
return "#" + Math.floor(Math.random()*16777216)
.toString(16).padStart(6,"0").toUpperCase();
}

function selectGame(game,button) {
stopReactionGame();

document.querySelectorAll(".game-choice").forEach(choice => {
choice.classList.remove("active");
});
button.classList.add("active");

$("reactionGame").classList.toggle("hidden",game !== "reaction");
$("memoryGame").classList.toggle("hidden",game !== "memory");
$("paletteGame").classList.toggle("hidden",game !== "palette");

if (game === "memory" && !$("memoryBoard").children.length) {
startMemoryGame();
}
}

/* 10. REACTION CHALLENGE */

let reactionTimer = null;
let reactionActive = false;
let reactionTime = 20;
let reactionHits = 0;
let reactionSession = 0;

function startReactionGame() {
stopReactionGame();

reactionSession++;
reactionTime = 20;
reactionHits = 0;
reactionActive = true;

$("reactionTime").textContent = reactionTime;
$("reactionHits").textContent = reactionHits;
$("reactionScore").textContent = "0";
$("reactionTimerBar").style.width = "100%";
$("reactionPlaceholder").classList.add("hidden");
$("reactionTarget").classList.remove("hidden");
$("reactionMessage").textContent = "Catch the moving target!";

data.games++;
persist();
updateDashboard();

moveReactionTarget();

reactionTimer = setInterval(() => {
reactionTime--;
$("reactionTime").textContent = reactionTime;
$("reactionTimerBar").style.width =
Math.max(0,reactionTime/20*100) + "%";

if (reactionTime <= 0) endReactionGame();
},1000);
}

function moveReactionTarget() {
if (!reactionActive) return;

const field = $("reactionField");
const target = $("reactionTarget");

const maxX = Math.max(0,field.clientWidth-target.offsetWidth);
const maxY = Math.max(0,field.clientHeight-target.offsetHeight);

target.style.left = (Math.random()*maxX) + "px";
target.style.top = (Math.random()*maxY) + "px";
}

function hitReactionTarget() {
if (!reactionActive) return;

reactionHits++;
$("reactionHits").textContent = reactionHits;
$("reactionScore").textContent = reactionHits*10;

data.score += 10;
persist();
updateDashboard();
moveReactionTarget();
}

function endReactionGame() {
if (!reactionActive) return;

clearInterval(reactionTimer);
reactionTimer = null;
reactionActive = false;

$("reactionTarget").classList.add("hidden");
$("reactionPlaceholder").classList.remove("hidden");
$("reactionPlaceholder").textContent = "CHALLENGE COMPLETE";
$("reactionMessage").textContent =
`TIME'S UP! ${reactionHits} hits, ${reactionHits*10} points.`;

notify("Reaction challenge completed!");
}

function stopReactionGame() {
clearInterval(reactionTimer);
reactionTimer = null;
reactionActive = false;
$("reactionTarget").classList.add("hidden");
}

/* 11. MEMORY FLIP */

const memoryIcons = [
"bi-stars","bi-heart-fill","bi-moon-stars-fill","bi-flower1",
"bi-gem","bi-sun-fill","bi-cloud-fill","bi-lightning-fill"
];

let memoryDeck = [];
let flippedCards = [];
let matchedPairs = 0;
let memoryMoveCount = 0;
let memoryLocked = false;
let memoryTimeout = null;
let memoryRound = 0;

function startMemoryGame() {
clearTimeout(memoryTimeout);

memoryRound++;
const thisRound = memoryRound;

memoryDeck = shuffle([...memoryIcons,...memoryIcons]);
flippedCards = [];
matchedPairs = 0;
memoryMoveCount = 0;
memoryLocked = false;

$("memoryMoves").textContent = "0";
$("memoryMessage").textContent = "Find all 8 matching pairs!";

const board = $("memoryBoard");
board.replaceChildren();

memoryDeck.forEach(icon => {
const button = document.createElement("button");
button.className = "memory-card";
button.innerHTML = '<i class="bi bi-question-lg"></i>';
button.dataset.icon = icon;
button.onclick = () => flipCard(button,thisRound);
board.appendChild(button);
});
}

function flipCard(card,round) {
if (round !== memoryRound) return;
if (
memoryLocked ||
card.classList.contains("flipped") ||
card.classList.contains("matched")
) return;

card.classList.add("flipped");
card.innerHTML = `<i class="bi ${card.dataset.icon}"></i>`;
flippedCards.push(card);

if (flippedCards.length !== 2) return;

memoryMoveCount++;
$("memoryMoves").textContent = memoryMoveCount;
memoryLocked = true;

const [first,second] = flippedCards;

if (first.dataset.icon === second.dataset.icon) {
first.classList.add("matched");
second.classList.add("matched");
flippedCards = [];
matchedPairs++;
memoryLocked = false;

if (matchedPairs === memoryIcons.length) {
finishMemoryGame(round);
}
} else {
memoryTimeout = setTimeout(() => {
if (round !== memoryRound) return;

[first,second].forEach(item => {
item.classList.remove("flipped");
item.innerHTML = '<i class="bi bi-question-lg"></i>';
});

flippedCards = [];
memoryLocked = false;
},750);
}
}

function finishMemoryGame(round) {
if (round !== memoryRound) return;

const earnedPoints = Math.max(20,120-memoryMoveCount*4);

data.score += earnedPoints;
data.games++;
data.memoryWins++;

persist();
updateDashboard();

$("memoryMessage").textContent =
`PERFECT MATCH! You earned ${earnedPoints} points!`;

notify("Memory challenge completed!");
}

/* 12. PALETTE MASTER */

let paletteRound = 0;
let paletteScore = 0;
let paletteActive = false;
let paletteAnswer = "";
let paletteSession = 0;
let paletteTimeout = null;

function startPaletteGame() {
clearTimeout(paletteTimeout);
paletteSession++;
paletteRound = 0;
paletteScore = 0;
paletteActive = true;

data.games++;
persist();
updateDashboard();

nextPaletteRound(paletteSession);
}

function nextPaletteRound(session) {
if (session !== paletteSession) return;

if (paletteRound >= 5) {
paletteActive = false;
$("paletteQuestion").textContent = "5/5";
$("paletteHex").textContent = `${paletteScore}/5 CORRECT`;
$("paletteOptions").replaceChildren();
$("paletteMessage").textContent =
paletteScore === 5
? "PERFECT! YOU ARE A PALETTE MASTER!"
: `CHALLENGE COMPLETE! ${paletteScore} out of 5 correct.`;

if (paletteScore === 5) {
data.score += 50;
persist();
updateDashboard();
}
return;
}

paletteRound++;
paletteAnswer = randomHex();

$("paletteQuestion").textContent = `${paletteRound}/5`;
$("paletteHex").textContent = paletteAnswer;
$("paletteMessage").textContent = "Choose the matching color.";

const choices = [paletteAnswer];
while (choices.length < 4) {
const candidate = randomHex();
if (!choices.includes(candidate)) choices.push(candidate);
}

const container = $("paletteOptions");
container.replaceChildren();

shuffle(choices).forEach(color => {
const button = document.createElement("button");
button.className = "color-option";
button.style.background = color;
button.setAttribute("aria-label","Choose color "+color);

button.onclick = () => {
if (!paletteActive || session !== paletteSession) return;
paletteActive = false;

container.querySelectorAll("button").forEach(btn => {
btn.disabled = true;
});

if (color === paletteAnswer) {
paletteScore++;
data.score += 20;
persist();
updateDashboard();
$("paletteMessage").textContent = "CORRECT! +20 POINTS";
} else {
$("paletteMessage").textContent =
`NOT QUITE! Correct color: ${paletteAnswer}`;
}

paletteTimeout = setTimeout(() => {
if (session !== paletteSession) return;
paletteActive = true;
nextPaletteRound(session);
},850);
};

container.appendChild(button);
});
}

/* 13. DASHBOARD AND PROGRESSION */

function getLevel() {
return Math.floor(data.score/100)+1;
}

function getRank() {
const level = getLevel();
if (level >= 10) return "LEGEND";
if (level >= 7) return "MASTER";
if (level >= 4) return "CREATOR";
if (level >= 2) return "ARTIST";
return "ROOKIE";
}

function updateDashboard() {
const level = getLevel();

$("statBoards").textContent = data.boards.length;
$("statGames").textContent = data.games;
$("statScore").textContent = data.score;
$("statLevel").textContent = String(level).padStart(2,"0");

$("arcadeScore").textContent = data.score;
$("arcadeGames").textContent = data.games;
$("arcadeRank").textContent = getRank();

$("profileBoards").textContent = data.boards.length;
$("profileGames").textContent = data.games;
$("profileScore").textContent = data.score;
$("profileLevel").textContent = String(level).padStart(2,"0");
$("profileRank").textContent = getRank();

$("achievements").replaceChildren();

const achievements = [
{
icon:"bi-palette-fill",
title:"First Creation",
unlocked:data.boards.length>=1
},
{
icon:"bi-controller",
title:"Arcade Explorer",
unlocked:data.games>=1
},
{
icon:"bi-trophy-fill",
title:"Score Collector",
unlocked:data.score>=100
},
{
icon:"bi-grid-3x3-gap-fill",
title:"Memory Champion",
unlocked:data.memoryWins>=1
},
{
icon:"bi-stars",
title:"Creative Legend",
unlocked:level>=10
}
];

achievements.forEach(achievement => {
const item = document.createElement("div");
item.className = "achievement";

const icon = document.createElement("i");
icon.className = `bi ${achievement.icon}`;

const label = document.createElement("span");
label.textContent = achievement.title +
(achievement.unlocked ? " ✓" : "");

item.append(icon,label);
$("achievements").appendChild(item);
});
}

/* 14. INITIALIZATION */

document.addEventListener("DOMContentLoaded",() => {
generateBoard();
renderCollection();
updateDashboard();
console.log("MOODIFY Creative Universe initialized.");
});
/* =========================================
MOODIFY EXPERIENCE UPGRADE
Account, themes, daily quests,
mood roulette, mood match and game bonuses
========================================= */

const MOODIFY_PROFILE_KEY = "moodifyLocalProfileV1";
const MOODIFY_THEME_KEY = "moodifyThemeV1";
const MOODIFY_DAILY_KEY = "moodifyDailyExperienceV1";

const moodifyPrompts = [
"Create a visual story inspired by a rainy afternoon.",
"Design a peaceful space for your future self.",
"Imagine your dream creative studio.",
"Create a mood board for a city that does not exist.",
"Combine nostalgia with futuristic design.",
"Design a world inspired by your favorite season.",
"Create a board that represents your personality.",
"Imagine a secret garden hidden inside a city.",
"Design the atmosphere of your dream weekend.",
"Turn a simple color into a complete visual story.",
"Imagine a world where architecture and nature become one.",
"Create a mood that feels like the perfect midnight."
];

const moodifyThemeNames = {
minimal: "Minimalist",
luxury: "Luxury",
summer: "Summer",
dark: "Dark Academia",
pastel: "Pastel Dreams",
cyber: "Cyberpunk"
};

let moodifyProfile = null;
let moodifyDaily = null;
let moodifySelectedMood = null;
let moodifyMatchChoices = [];

function moodifyRead(key, fallback) {
try {
const value = localStorage.getItem(key);
return value ? JSON.parse(value) : fallback;
} catch (error) {
return fallback;
}
}

function moodifyWrite(key, value) {
try {
localStorage.setItem(key, JSON.stringify(value));
return true;
} catch (error) {
notify("Browser storage is unavailable or full.");
return false;
}
}

function moodifyDateKey(date = new Date()) {
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
const day = String(date.getDate()).padStart(2, "0");

return `${year}-${month}-${day}`;
}

function moodifyDateFromKey(key) {
const parts = key.split("-").map(Number);

return new Date(parts[0], parts[1] - 1, parts[2]);
}

/* =========================================
1. DARK AND LIGHT MODE
========================================= */

function moodifyApplyTheme(theme) {
const light = theme === "light";

document.documentElement.classList.toggle(
"light-mode",
light
);

const toggle = document.getElementById("moodifyThemeToggle");
const icon = document.getElementById("moodifyThemeIcon");
const text = document.getElementById("moodifyThemeText");

if (toggle) {
toggle.classList.toggle("light-selected", light);
toggle.setAttribute("aria-pressed", String(light));
toggle.setAttribute(
"aria-label",
light ? "Switch to dark mode" : "Switch to light mode"
);
}

if (icon) {
icon.className = light
? "bi bi-sun"
: "bi bi-moon-stars";
}

if (text) {
text.textContent = light ? "Light mode" : "Dark mode";
}

moodifyWrite(MOODIFY_THEME_KEY, theme);
}

function moodifyToggleTheme() {
const light = document.documentElement.classList.contains(
"light-mode"
);

moodifyApplyTheme(light ? "dark" : "light");
}

/* =========================================
2. LOCAL PROFILE
========================================= */

function moodifyCreateSidebar() {
const sidebar = document.querySelector(".sidebar");
const bottom = sidebar.querySelector(".sidebar-bottom");

const container = document.createElement("div");
container.id = "moodifyExtraSidebar";

container.innerHTML = `
<div class="theme-switch">
<div class="theme-switch-label">
<i id="moodifyThemeIcon"
class="bi bi-moon-stars"></i>
<span id="moodifyThemeText">Dark mode</span>
</div>

<button
id="moodifyThemeToggle"
class="theme-toggle"
type="button"
aria-label="Switch to light mode"
aria-pressed="false">
</button>
</div>

<div class="account-widget">
<div class="account-icon">
<i class="bi bi-person-plus"></i>
</div>

<h3 id="moodifyAccountHeading">Join MOODIFY</h3>

<div id="moodifyGuestPanel">
<p>
Create your creative identity and
personalize your experience.
</p>

<form id="moodifyAccountForm" class="account-form">
<input
id="moodifyNameInput"
type="text"
placeholder="Your name"
autocomplete="name"
maxlength="40"
required>

<input
id="moodifyEmailInput"
type="email"
placeholder="Your email address"
autocomplete="email"
maxlength="120"
required>

<button type="submit">
JOIN THE UNIVERSE
</button>
</form>

<small class="account-hint">
Local profile only.
Your details stay in this browser.
</small>
</div>

<div id="moodifyMemberPanel" hidden>
<p class="account-status">
<i class="bi bi-check-circle"></i>
CREATIVE MEMBER
</p>

<div id="moodifyMemberName" class="account-user"></div>
<p id="moodifyMemberEmail" class="account-email"></p>

<button
id="moodifySignout"
class="account-signout">
Leave profile
</button>
</div>
</div>
`;

sidebar.insertBefore(container, bottom);

document.getElementById("moodifyThemeToggle")
.addEventListener("click", moodifyToggleTheme);

document.getElementById("moodifyAccountForm")
.addEventListener("submit", moodifySaveProfile);

document.getElementById("moodifySignout")
.addEventListener("click", moodifySignout);

moodifyProfile = moodifyRead(MOODIFY_PROFILE_KEY, null);

moodifyRenderProfile();

const savedTheme = moodifyRead(
MOODIFY_THEME_KEY,
"dark"
);

moodifyApplyTheme(savedTheme);
}

function moodifySaveProfile(event) {
event.preventDefault();

const name = document.getElementById("moodifyNameInput")
.value.trim();

const email = document.getElementById("moodifyEmailInput")
.value.trim();

if (!name || !email) {
notify("Please enter your name and email.");
return;
}

const emailInput = document.getElementById(
"moodifyEmailInput"
);

if (!emailInput.checkValidity()) {
emailInput.reportValidity();
return;
}

const profile = {
name,
email,
joined: moodifyDateKey()
};

if (!moodifyWrite(MOODIFY_PROFILE_KEY, profile)) {
return;
}

moodifyProfile = profile;
moodifyRenderProfile();
moodifyCelebrate();

notify("Welcome to MOODIFY, " + name + "!");
}

function moodifyRenderProfile() {
const guest = document.getElementById(
"moodifyGuestPanel"
);

const member = document.getElementById(
"moodifyMemberPanel"
);

if (!guest || !member) return;

const joined = Boolean(moodifyProfile);

guest.hidden = joined;
member.hidden = !joined;

document.getElementById(
"moodifyAccountHeading"
).textContent = joined
? "Your Universe"
: "Join MOODIFY";

if (joined) {
document.getElementById(
"moodifyMemberName"
).textContent = moodifyProfile.name;

document.getElementById(
"moodifyMemberEmail"
).textContent = moodifyProfile.email;
}

const profileHeading = document.querySelector(
"#profile .profile-card h2"
);

if (profileHeading) {
profileHeading.textContent = joined
? moodifyProfile.name
: "Creative Explorer";
}

const homeKicker = document.querySelector(
"#home .hero-tag"
);

if (homeKicker) {
homeKicker.textContent = joined
? "WELCOME BACK, " + moodifyProfile.name.toUpperCase()
: "CREATIVITY STARTS HERE";
}
}

function moodifySignout() {
moodifyProfile = null;

try {
localStorage.removeItem(MOODIFY_PROFILE_KEY);
} catch (error) {
console.error(error);
}

document.getElementById(
"moodifyAccountForm"
).reset();

moodifyRenderProfile();
notify("Local profile cleared.");
}

/* =========================================
3. DAILY CHALLENGE AND VISIT STREAK
========================================= */

function moodifyLoadDaily() {
const today = moodifyDateKey();

moodifyDaily = moodifyRead(MOODIFY_DAILY_KEY, {
date: "",
lastVisit: "",
streak: 0,
tasks: {},
claimed: false
});

if (moodifyDaily.date !== today) {
moodifyDaily.date = today;
moodifyDaily.tasks = {
create: false,
save: false,
play: false
};
moodifyDaily.claimed = false;
}

if (moodifyDaily.lastVisit !== today) {
let consecutive = false;

if (moodifyDaily.lastVisit) {
const yesterday = new Date();
yesterday.setHours(0, 0, 0, 0);
yesterday.setDate(yesterday.getDate() - 1);

consecutive =
moodifyDaily.lastVisit === moodifyDateKey(yesterday);
}

moodifyDaily.streak = consecutive
? (moodifyDaily.streak || 0) + 1
: 1;

moodifyDaily.lastVisit = today;
}

moodifyWrite(MOODIFY_DAILY_KEY, moodifyDaily);
}

function moodifyMarkTask(task) {
if (!moodifyDaily || !moodifyDaily.tasks) return;

if (moodifyDaily.tasks[task]) return;

moodifyDaily.tasks[task] = true;

moodifyWrite(MOODIFY_DAILY_KEY, moodifyDaily);
moodifyRenderDaily();

if (moodifyCompletedTasks() === 3) {
notify("Daily challenge complete! Claim your reward.");
}
}

function moodifyCompletedTasks() {
if (!moodifyDaily) return 0;

return ["create", "save", "play"].filter(
task => moodifyDaily.tasks[task]
).length;
}

function moodifyClaimReward() {
if (!moodifyDaily) return;

if (moodifyCompletedTasks() !== 3) {
notify("Complete all three activities first.");
return;
}

if (moodifyDaily.claimed) {
notify("You already claimed today's reward.");
return;
}

moodifyDaily.claimed = true;

if (!moodifyWrite(MOODIFY_DAILY_KEY, moodifyDaily)) {
moodifyDaily.claimed = false;
return;
}

data.score += 45;
persist();
updateDashboard();

moodifyRenderDaily();
moodifyCelebrate();

notify("Daily challenge complete! +45 points");
}

function moodifyRenderDaily() {
if (!moodifyDaily) return;

const streak = document.getElementById("moodifyStreak");
const progress = document.getElementById(
"moodifyQuestProgress"
);
const reward = document.getElementById(
"moodifyRewardButton"
);

if (!streak || !progress || !reward) return;

streak.textContent =
moodifyDaily.streak + " day visit streak";

const completed = moodifyCompletedTasks();

progress.style.width =
(completed / 3 * 100) + "%";

["create", "save", "play"].forEach(task => {
const check = document.getElementById(
"questCheck-" + task
);

if (!check) return;

const done = Boolean(moodifyDaily.tasks[task]);

check.classList.toggle("done", done);
check.innerHTML = done
? '<i class="bi bi-check-lg"></i>'
: '<i class="bi bi-circle"></i>';
});

const status = document.getElementById(
"moodifyQuestStatus"
);

status.textContent =
completed + " of 3 activities completed";

reward.disabled =
completed !== 3 || moodifyDaily.claimed;

reward.textContent = moodifyDaily.claimed
? "REWARD CLAIMED"
: "CLAIM 45 POINTS";
}

/* =========================================
4. RANDOM CREATIVE PROMPTS
========================================= */

function moodifyRandomPrompt() {
return moodifyPrompts[
Math.floor(Math.random() * moodifyPrompts.length)
];
}

function moodifySurpriseMe() {
const keys = Object.keys(aesthetics);

const selected = keys[
Math.floor(Math.random() * keys.length)
];

const prompt = moodifyRandomPrompt();

$("themeSelect").value = selected;
$("boardTitle").value = moodifyThemeNames[selected] +
" / Creative Experiment";

showPage("studio");
generateBoard();

const promptBox = document.getElementById(
"moodifyStudioPrompt"
);

if (promptBox) {
promptBox.textContent = prompt;
}

notify("Your new creative direction is ready!");
}

function moodifyRefreshPrompt() {
const prompt = moodifyRandomPrompt();

document.getElementById(
"moodifyStudioPrompt"
).textContent = prompt;
}

/* =========================================
5. NEW HOME PAGE EXPERIENCE
========================================= */

function moodifyCreateHomeExperience() {
const home = $("home");

const section = document.createElement("section");
section.className = "experience-section";

section.innerHTML = `
<div class="experience-heading">
<span class="top-kicker">BEYOND THE ORDINARY</span>
<h2>Your daily creative escape</h2>
</div>

<div class="experience-grid">

<div class="experience-card">
<span class="experience-kicker">
THE DAILY CREATIVE QUEST
</span>

<h3>Make today count.</h3>

<p>
Three small creative activities.
One new reason to come back tomorrow.
</p>

<div class="daily-streak">
<i class="bi bi-fire"></i>
<span id="moodifyStreak">1 day visit streak</span>
</div>

<div class="quest-list">

<div class="quest-item">
<span class="quest-check" id="questCheck-create">
<i class="bi bi-circle"></i>
</span>
Create a mood board
</div>

<div class="quest-item">
<span class="quest-check" id="questCheck-save">
<i class="bi bi-circle"></i>
</span>
Save a creation
</div>

<div class="quest-item">
<span class="quest-check" id="questCheck-play">
<i class="bi bi-circle"></i>
</span>
Play an arcade challenge
</div>

</div>

<div class="quest-progress">
<div
class="quest-progress-fill"
id="moodifyQuestProgress">
</div>
</div>

<p id="moodifyQuestStatus">
0 of 3 activities completed
</p>

<p class="quest-reward">
<i class="bi bi-stars"></i>
DAILY REWARD: 45 POINTS
</p>

<button
class="experience-button"
id="moodifyRewardButton"
disabled>
CLAIM 45 POINTS
</button>
</div>

<div class="experience-card">
<span class="experience-kicker">
CREATIVE ROULETTE
</span>

<h3>Let chance decide.</h3>

<p>
No idea what to create?
Discover a random aesthetic
and start something unexpected.
</p>

<div class="roulette-orb">
<i class="bi bi-shuffle"></i>
</div>

<button
class="experience-button"
id="moodifyRouletteButton">
SURPRISE ME
</button>
</div>

</div>
`;

const firstSection = home.querySelector(".section-title");

home.insertBefore(section, firstSection);

document.getElementById("moodifyRewardButton")
.addEventListener("click", moodifyClaimReward);

document.getElementById("moodifyRouletteButton")
.addEventListener("click", moodifySurpriseMe);

moodifyRenderDaily();
}

/* =========================================
6. MOOD MATCH
========================================= */

function moodifyCreateMoodMatch() {
const home = $("home");

const section = document.createElement("section");
section.className = "mood-match";

section.innerHTML = `
<span class="experience-kicker">
MOOD MATCH / DISCOVER YOUR STYLE
</span>

<h3>Which world would you step into?</h3>

<p>
Choose the aesthetic that speaks to you.
Discover your next creative direction.
</p>

<div
class="mood-match-options"
id="moodifyMatchOptions">
</div>

<div
class="mood-match-result"
id="moodifyMatchResult">
</div>

<button
class="experience-button experience-outline"
id="moodifyNextMatch">
DIFFERENT WORLDS
</button>

<button
class="experience-button"
id="moodifyCreateMatch"
hidden>
CREATE THIS MOOD
</button>
`;

const features = home.querySelector(".feature-grid");

features.insertAdjacentElement("afterend", section);

document.getElementById("moodifyNextMatch")
.addEventListener("click", moodifyNewMatch);

document.getElementById("moodifyCreateMatch")
.addEventListener("click", () => {
if (!moodifySelectedMood) return;

selectAesthetic(moodifySelectedMood);
});

moodifyNewMatch();
}

function moodifyNewMatch() {
const keys = Object.keys(aesthetics);

moodifyMatchChoices = [...keys]
.sort(() => Math.random() - .5)
.slice(0, 2);

moodifySelectedMood = null;

const container = document.getElementById(
"moodifyMatchOptions"
);

const result = document.getElementById(
"moodifyMatchResult"
);

container.replaceChildren();

result.textContent = "Choose one of the two worlds.";

document.getElementById(
"moodifyCreateMatch"
).hidden = true;

moodifyMatchChoices.forEach(key => {
const theme = aesthetics[key];

const button = document.createElement("button");
button.className = "mood-match-option";

const swatch = document.createElement("div");
swatch.className = "mood-match-swatch";

theme.colors.forEach(color => {
const part = document.createElement("span");
part.style.backgroundColor = color;
swatch.appendChild(part);
});

const label = document.createElement("strong");

label.textContent = moodifyThemeNames[key];

button.append(swatch, label);

button.addEventListener("click", () => {
moodifySelectedMood = key;

result.textContent =
"Your choice: " + moodifyThemeNames[key] +
". Make it your next creation.";

document.getElementById(
"moodifyCreateMatch"
).hidden = false;

container.querySelectorAll("button").forEach(btn => {
btn.style.borderColor = "#a98aff30";
});

button.style.borderColor = "#b69aff";
});

container.appendChild(button);
});
}

/* =========================================
7. EXTRA CREATIVE STUDIO FEATURE
========================================= */

function moodifyCreateStudioSurprise() {
const editor = document.querySelector(".editor-panel");

if (!editor) return;

const panel = document.createElement("div");
panel.className = "studio-surprise";

panel.innerHTML = `
<h4>
<i class="bi bi-stars"></i>
Creative Prompt
</h4>

<p id="moodifyStudioPrompt">
Design your next visual story.
</p>

<button
class="secondary-button"
id="moodifyNewPromptButton">
NEW INSPIRATION
</button>
`;

editor.appendChild(panel);

document.getElementById("moodifyNewPromptButton")
.addEventListener("click", moodifyRefreshPrompt);

moodifyRefreshPrompt();
}

/* =========================================
8. REACTION CHALLENGE COMBO BONUS
========================================= */

function moodifyCreateCombo() {
const reaction = $("reactionGame");

if (!reaction) return;

const display = document.createElement("div");

display.id = "moodifyComboDisplay";
display.className = "combo-display";
display.textContent = "COMBO BONUS EVERY 5 HITS";

const field = $("reactionField");

field.insertAdjacentElement("afterend", display);

$("reactionTarget").addEventListener("click", () => {
if (!reactionActive || reactionHits === 0) return;

if (reactionHits % 5 === 0) {
data.score += 15;

persist();
updateDashboard();

display.textContent =
reactionHits + " HITS / +15 BONUS POINTS";

display.classList.remove("pop");

void display.offsetWidth;

display.classList.add("pop");

moodifyCelebrate(12);
} else {
display.textContent =
reactionHits + " HITS / NEXT BONUS AT " +
(Math.ceil(reactionHits / 5) * 5);
}
});

const originalStartReaction = startReactionGame;

startReactionGame = function() {
originalStartReaction();

display.textContent = "COMBO BONUS EVERY 5 HITS";
display.classList.remove("pop");

moodifyMarkTask("play");
};
}

/* =========================================
9. CELEBRATION
========================================= */

function moodifyCelebrate(count = 32) {
if (window.matchMedia &&
window.matchMedia(
"(prefers-reduced-motion: reduce)"
).matches) {
return;
}

const colors = [
"#a98aff",
"#eb9ad2",
"#b9dcdc",
"#f5d76e",
"#c3a5ff"
];

for (let i = 0; i < count; i++) {
const particle = document.createElement("span");

particle.className = "mood-particle";
particle.style.left = Math.random() * 100 + "vw";
particle.style.backgroundColor =
colors[Math.floor(Math.random() * colors.length)];

particle.style.animationDelay =
Math.random() * .45 + "s";

particle.style.animationDuration =
(1.4 + Math.random() * 1.1) + "s";

document.body.appendChild(particle);

particle.addEventListener(
"animationend",
() => particle.remove(),
{once: true}
);
}
}

/* =========================================
10. CONNECT QUESTS TO EXISTING FEATURES
========================================= */

function moodifyConnectQuests() {
const originalGenerateBoard = generateBoard;

generateBoard = function(...args) {
const result = originalGenerateBoard(...args);

moodifyMarkTask("create");

return result;
};

const originalSaveBoard = saveBoard;

saveBoard = function(...args) {
const previousCount = data.boards.length;

const result = originalSaveBoard(...args);

if (data.boards.length > previousCount) {
moodifyMarkTask("save");
}

return result;
};

const originalStartPalette = startPaletteGame;

startPaletteGame = function(...args) {
const result = originalStartPalette(...args);

moodifyMarkTask("play");

return result;
};

const originalFinishMemory = finishMemoryGame;

finishMemoryGame = function(...args) {
const result = originalFinishMemory(...args);

moodifyMarkTask("play");
moodifyCelebrate(20);

return result;
};
}

/* =========================================
11. INITIALIZE NEW FEATURES
========================================= */

function moodifyInitializeExperience() {
moodifyLoadDaily();

moodifyCreateSidebar();
moodifyCreateHomeExperience();
moodifyCreateMoodMatch();
moodifyCreateStudioSurprise();

moodifyConnectQuests();
moodifyCreateCombo();

moodifyRenderProfile();
moodifyRenderDaily();
}

if (document.readyState === "loading") {
document.addEventListener(
"DOMContentLoaded",
moodifyInitializeExperience
);
} else {
moodifyInitializeExperience();
}

/* ===========================================
MOODIFY ARCADE EVOLUTION
Photo Memory, Visual Hunt, Daily Spotlight
=========================================== */

(() => {
"use strict";

/* REAL PHOTO COLLECTIONS */

const photoCollections = {
architecture: {
title: "Architecture",
photos: [
["https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=350&q=80", "Building"],
["https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=350&q=80", "Architecture"],
["https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=350&q=80", "Tower"],
["https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=350&q=80", "Interior"],
["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=350&q=80", "Skyscraper"],
["https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=350&q=80", "Workspace"],
["https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=450&q=80", "Structure"],
["https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=350&q=80", "Home"]
]
},

nature: {
title: "Nature",
photos: [
["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=350&q=80", "Forest"],
["https://images.unsplash.com/photo-1500534623283-312aade485b7?w=350&q=80", "Landscape"],
["https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=350&q=80", "Sunset"],
["https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=350&q=80", "Lake"],
["https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=350&q=80", "Mountains"],
["https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=350&q=80", "Waterfall"],
["https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=350&q=80", "Peaks"],
["https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=350&q=80", "Trees"]
]
},

aesthetic: {
title: "Aesthetic Objects",
photos: [
["https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=350&q=80", "Flowers"],
["https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=350&q=80", "Decor"],
["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=350&q=80", "Books"],
["https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=350&q=80", "Reading"],
["https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=350&q=80", "Fashion"],
["https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?w=350&q=80", "Still Life"],
["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=350&q=80", "Watch"],
["https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=350&q=80", "Style"]
]
}
};

const collectionKeys = Object.keys(photoCollections);

/* Fisher-Yates shuffle */

function mix(items) {
const result = [...items];

for (let i = result.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[result[i], result[j]] = [result[j], result[i]];
}

return result;
}

function randomInt(min, max) {
return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* MEMORY GAME STATE */

let photoSession = 0;
let photoFirst = null;
let photoSecond = null;
let photoLocked = false;
let photoMatches = 0;
let photoMoves = 0;
let photoTimer = null;
let photoStarted = false;
let photoStartTime = 0;
let photoCollectionIndex = 0;

const oldMemoryMessage = document.getElementById("memoryMessage");

function setupPhotoMemoryUI() {
const board = document.getElementById("memoryBoard");
const parent = board.parentElement;

const toolbar = document.createElement("div");
toolbar.className = "memory-topbar";

toolbar.innerHTML = `
<span class="memory-theme-name" id="photoThemeName">
PHOTO COLLECTION
</span>

<button class="memory-theme-button" id="nextPhotoTheme">
<i class="bi bi-shuffle"></i>
CHANGE COLLECTION
</button>
`;

parent.insertBefore(toolbar, board);

const bonus = document.createElement("p");
bonus.className = "memory-bonus";
bonus.id = "photoMemoryBonus";
bonus.textContent = "Match the photographs to earn points.";

board.insertAdjacentElement("afterend", bonus);

document.getElementById("nextPhotoTheme")
.addEventListener("click", () => {
photoCollectionIndex =
(photoCollectionIndex + 1) % collectionKeys.length;

window.startMemoryGame();
});
}

function flipPhotoCard(card, session) {
if (
session !== photoSession ||
photoLocked ||
card.classList.contains("matched") ||
card.classList.contains("flipped")
) return;

if (!photoStarted) {
photoStarted = true;
photoStartTime = Date.now();
}

card.classList.add("flipped");

if (!photoFirst) {
photoFirst = card;
return;
}

photoSecond = card;
photoMoves++;

document.getElementById("memoryMoves").textContent =
photoMoves;

photoLocked = true;

if (photoFirst.dataset.pair === photoSecond.dataset.pair) {
photoFirst.classList.add("matched");
photoSecond.classList.add("matched");

photoMatches++;
photoFirst = null;
photoSecond = null;
photoLocked = false;

document.getElementById("photoMemoryBonus").textContent =
photoMatches + " / 8 PAIRS MATCHED";

if (photoMatches === 8) {
finishPhotoMemory();
}
} else {
const first = photoFirst;
const second = photoSecond;

photoTimer = setTimeout(() => {
if (session !== photoSession) return;

first.classList.remove("flipped");
second.classList.remove("flipped");

photoFirst = null;
photoSecond = null;
photoLocked = false;
}, 900);
}
}

function finishPhotoMemory() {
const seconds = Math.round(
(Date.now() - photoStartTime) / 1000
);

const moveBonus = Math.max(0, 100 - photoMoves * 3);
const timeBonus = Math.max(0, 80 - seconds);
const points = 80 + moveBonus + timeBonus;

data.games++;
data.memoryWins++;
data.score += points;

persist();
updateDashboard();

document.getElementById("memoryMessage").textContent =
"COLLECTION COMPLETE! " +
photoMoves + " moves, " +
seconds + " seconds, +" +
points + " points.";

document.getElementById("photoMemoryBonus").textContent =
"ALL PHOTOGRAPHS MATCHED";

if (typeof moodifyMarkTask === "function") {
moodifyMarkTask("play");
}

if (typeof moodifyCelebrate === "function") {
moodifyCelebrate(25);
}
}

/* REPLACE ONLY MEMORY GAME LOGIC */

startMemoryGame = function() {
photoSession++;
clearTimeout(photoTimer);

if (typeof memoryRound !== "undefined") {
memoryRound++;
}

if (typeof memoryTimeout !== "undefined") {
clearTimeout(memoryTimeout);
}

const session = photoSession;

photoFirst = null;
photoSecond = null;
photoLocked = false;
photoMatches = 0;
photoMoves = 0;
photoStarted = false;

const key = collectionKeys[photoCollectionIndex];
const collection = photoCollections[key];
const board = document.getElementById("memoryBoard");

document.getElementById("photoThemeName").textContent =
collection.title.toUpperCase() + " COLLECTION";

document.getElementById("memoryMoves").textContent = "0";

document.getElementById("memoryMessage").textContent =
"Find all eight pairs of photographs.";

document.getElementById("photoMemoryBonus").textContent =
"MATCH 8 PAIRS TO COMPLETE THE COLLECTION";

board.replaceChildren();

const unique = new Map();

collection.photos.forEach(([url, label]) => {
const photoId = url.split("/photo-")[1]?.split("?")[0] || url;

if (!unique.has(photoId)) {
unique.set(photoId, [url, label]);
}
});

const photos = mix([...unique.values()]).slice(0, 8);

const deck = mix(
photos.flatMap(([url, label], index) => [
{url, label, pair:index},
{url, label, pair:index}
])
);

deck.forEach(item => {
const card = document.createElement("button");

card.type = "button";
card.className = "memory-card";
card.dataset.pair = String(item.pair);
card.setAttribute("aria-label", "Hidden photo card");

const inner = document.createElement("span");
inner.className = "memory-card-inner";

const front = document.createElement("span");
front.className = "memory-face memory-front";

const mark = document.createElement("span");
mark.className = "memory-front-mark";
mark.textContent = "M";
front.appendChild(mark);

const back = document.createElement("span");
back.className = "memory-face memory-back";

const fallback = document.createElement("span");
fallback.className = "memory-fallback";
fallback.textContent = item.label;

const img = document.createElement("img");
img.src = item.url;
img.alt = item.label;
img.loading = "lazy";

img.onerror = () => {
img.hidden = true;
fallback.style.display = "grid";
};

back.append(fallback, img);
inner.append(front, back);
card.appendChild(inner);

card.addEventListener("click", () => {
flipPhotoCard(card, session);
});

board.appendChild(card);
});
};

/* ===========================================
NEW GAME: VISUAL HUNT
=========================================== */

let huntSession = 0;
let huntLevel = 0;
let huntPoints = 0;
let huntActive = false;
let huntTimer = null;
let huntDeadline = 0;
let huntCorrectIndex = 0;

function buildHuntUI() {
const selector = document.querySelector(".game-selector");

const button = document.createElement("button");
button.className = "game-choice";
button.innerHTML = `
<i class="bi bi-eye"></i>
<h4>Visual Hunt</h4>
<p>Find the odd element.</p>
<span>PLAY NOW</span>
`;

button.addEventListener("click", () => {
selectGame("hunt", button);
});

selector.appendChild(button);

const panel = document.createElement("div");
panel.className = "game-arena hidden";
panel.id = "huntGame";

panel.innerHTML = `
<div class="game-heading">
<div>
<span class="top-kicker">VISUAL CHALLENGE / 004</span>
<h2>Visual Hunt</h2>
<p>Find the shape that is different.</p>
</div>

<div class="game-level">
LEVEL <span id="huntLevel">01</span>
</div>
</div>

<div class="hunt-level">
SPOT THE DIFFERENCE
</div>

<p class="hunt-description" id="huntDescription">
Look carefully. One shape is not like the others.
</p>

<div class="hunt-timer">
<div class="hunt-timer-fill" id="huntTimerFill"></div>
</div>

<div class="hunt-grid" id="huntGrid"></div>

<div class="game-message" id="huntMessage">
Press START to begin.
</div>

<button class="main-button" id="huntStartButton">
<i class="bi bi-play-fill"></i>
START CHALLENGE
</button>
`;

document.getElementById("arcade").appendChild(panel);

document.getElementById("huntStartButton")
.addEventListener("click", startVisualHunt);
}

function startVisualHunt() {
clearInterval(huntTimer);

huntSession++;
huntLevel = 0;
huntPoints = 0;
huntActive = true;

data.games++;
persist();
updateDashboard();

if (typeof moodifyMarkTask === "function") {
moodifyMarkTask("play");
}

nextHuntLevel(huntSession);
}

function nextHuntLevel(session) {
if (session !== huntSession || !huntActive) return;

if (huntLevel >= 8) {
finishHunt();
return;
}

huntLevel++;

document.getElementById("huntLevel").textContent =
String(huntLevel).padStart(2, "0");

document.getElementById("huntMessage").textContent =
"Find the different shape before time runs out.";

const grid = document.getElementById("huntGrid");
grid.replaceChildren();

const hue = randomInt(0, 359);
const saturation = randomInt(55, 85);
const lightness = randomInt(45, 65);

const baseColor =
`hsl(${hue}, ${saturation}%, ${lightness}%)`;

const difference = Math.max(7, 40 - huntLevel * 4);

const oddColor =
`hsl(${(hue + difference) % 360}, ` +
`${saturation}%, ${lightness}%)`;

const shapes = ["circle", "square", "diamond"];

const shape = shapes[randomInt(0, shapes.length - 1)];

huntCorrectIndex = randomInt(0, 8);

for (let i = 0; i < 9; i++) {
const tile = document.createElement("button");
tile.className = "hunt-tile";
tile.type = "button";
tile.setAttribute("aria-label", "Visual option " + (i + 1));

const graphic = document.createElement("span");
graphic.className = "hunt-shape";

graphic.style.setProperty(
"--hunt-color",
i === huntCorrectIndex ? oddColor : baseColor
);

graphic.style.setProperty(
"--hunt-radius",
shape === "circle" ? "50%" : "15%"
);

graphic.style.setProperty(
"--hunt-rotation",
shape === "diamond" ? "45deg" : "0deg"
);

tile.appendChild(graphic);

tile.addEventListener("click", () => {
chooseHuntTile(i, tile, session);
});

grid.appendChild(tile);
}

const roundTime = Math.max(4500, 10500 - huntLevel * 600);

huntDeadline = performance.now() + roundTime;

clearInterval(huntTimer);

function updateTimer() {
if (session !== huntSession || !huntActive) {
clearInterval(huntTimer);
return;
}

const remaining = Math.max(
0,
huntDeadline - performance.now()
);

document.getElementById("huntTimerFill").style.width =
(remaining / roundTime * 100) + "%";

if (remaining <= 0) {
clearInterval(huntTimer);
huntActive = false;

document.getElementById("huntMessage").textContent =
"TIME'S UP! You reached level " + huntLevel + ".";

document.querySelectorAll("#huntGrid button")
.forEach(btn => btn.disabled = true);
}
}

updateTimer();
huntTimer = setInterval(updateTimer, 100);
}

function chooseHuntTile(index, tile, session) {
if (!huntActive || session !== huntSession) return;

if (index !== huntCorrectIndex) {
tile.classList.add("incorrect");

document.getElementById("huntMessage").textContent =
"Not quite. Look again.";

return;
}

clearInterval(huntTimer);

tile.classList.add("correct");

const points = 10 + huntLevel * 5;
huntPoints += points;

data.score += points;
persist();
updateDashboard();

document.getElementById("huntMessage").textContent =
"CORRECT! +" + points + " POINTS";

document.querySelectorAll("#huntGrid button")
.forEach(btn => btn.disabled = true);

setTimeout(() => {
nextHuntLevel(session);
}, 650);
}

function finishHunt() {
huntActive = false;
clearInterval(huntTimer);

document.getElementById("huntMessage").textContent =
"VISUAL HUNT COMPLETE! " +
huntPoints + " POINTS EARNED.";

document.getElementById("huntGrid").replaceChildren();

if (typeof moodifyCelebrate === "function") {
moodifyCelebrate(30);
}
}

/* ===========================================
REPLACE GAME SELECTION
=========================================== */

selectGame = function(game, button) {
stopReactionGame();

huntSession++;
huntActive = false;
clearInterval(huntTimer);

["reaction", "memory", "palette", "hunt"].forEach(name => {
const panel = document.getElementById(name + "Game");

if (panel) {
panel.classList.toggle("hidden", name !== game);
}
});

document.querySelectorAll(".game-choice").forEach(choice => {
choice.classList.remove("active");
});

button.classList.add("active");

if (game === "memory" && photoMatches === 0 &&
!document.getElementById("memoryBoard").children.length) {
window.startMemoryGame();
}

changeArcadeAtmosphere();
};

/* ===========================================
DAILY FEATURED GAME
=========================================== */

const featuredGames = [
{
key: "reaction",
name: "Reaction Challenge",
detail: "How many targets can you catch?"
},
{
key: "memory",
name: "Memory Flip",
detail: "Match a new collection of photographs."
},
{
key: "palette",
name: "Palette Master",
detail: "Prove your color intuition."
},
{
key: "hunt",
name: "Visual Hunt",
detail: "Test your attention to detail."
}
];

function dailyGameIndex() {
const now = new Date();
const dateNumber = Math.floor(
Date.UTC(
now.getFullYear(),
now.getMonth(),
now.getDate()
) / 86400000
);

return dateNumber % featuredGames.length;
}

function buildDailySpotlight() {
const arcade = document.getElementById("arcade");
const stats = arcade.querySelector(".arcade-stats");

const spotlight = document.createElement("div");
spotlight.className = "arcade-spotlight";

const featured = featuredGames[dailyGameIndex()];

spotlight.innerHTML = `
<div>
<span class="arcade-spotlight-label">
GAME OF THE DAY
</span>
<h3></h3>
<p></p>
</div>
<button class="arcade-spotlight-button">
PLAY TODAY'S PICK
</button>
`;

spotlight.querySelector("h3").textContent = featured.name;
spotlight.querySelector("p").textContent = featured.detail;

spotlight.querySelector("button").addEventListener("click", () => {
const keys = ["reaction", "memory", "palette", "hunt"];
const index = keys.indexOf(featured.key);

const choice = document.querySelectorAll(".game-choice")[index];

if (choice) choice.click();

document.getElementById(featured.key + "Game")
?.scrollIntoView({
behavior: "smooth",
block: "start"
});
});

stats.insertAdjacentElement("afterend", spotlight);
}

/* ===========================================
CHANGING ARCADE ATMOSPHERE
=========================================== */

const moods = ["violet", "rose", "blue", "emerald"];

function changeArcadeAtmosphere() {
const mood = moods[randomInt(0, moods.length - 1)];

document.querySelectorAll(".game-arena").forEach(panel => {
panel.classList.add("arcade-atmosphere");
panel.dataset.mood = mood;
});
}

/* ===========================================
ROTATING MEMORY COLLECTIONS
=========================================== */

function rotateMemoryCollections() {
photoCollectionIndex = randomInt(0, collectionKeys.length - 1);

const originalStart = startMemoryGame;

startMemoryGame = function() {
originalStart();

photoCollectionIndex =
(photoCollectionIndex + 1) % collectionKeys.length;
};
}

/* ===========================================
START UPGRADE
=========================================== */

function initializeArcadeEvolution() {
setupPhotoMemoryUI();
buildHuntUI();
buildDailySpotlight();
changeArcadeAtmosphere();

// Each new game can use a new gallery.
rotateMemoryCollections();

// The next visit starts with a different collection.
window.startMemoryGame();

console.log("MOODIFY Arcade Evolution ready.");
}

if (document.readyState === "loading") {
document.addEventListener(
"DOMContentLoaded",
initializeArcadeEvolution
);
} else {
initializeArcadeEvolution();
}
})();
