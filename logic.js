// Dino Run - a Chrome dino clone
// ---------- constants ----------
const CANVAS_W = 600;
const SPAWN_X = CANVAS_W + 20;      // just off the right edge
const OFFSCREEN_X = -60;            // obstacle is recycled once it passes this
const GRAVITY = 0.2;
const JUMP_VELOCITY = 5.5;
const START_SPEED = 3.5;
const MAX_SPEED = 8.5;
const SPAWN_CHANCE = 60;            // 1-in-N chance per tick once there is room
const RESTART_DELAY = 600;          // ms before a game-over screen accepts input
const NIGHT_EVERY = 300;            // score points per day/night switch
const STORAGE_KEY = "dinoHighScore";

// ---------- elements ----------
const canvas = document.getElementById("canvas");
const scoreEl = document.getElementById("scoreElement");
const hiEl = document.getElementById("hiElement");

// ---------- state ----------
let state = "ready";                // "ready" | "running" | "over"
let speed = START_SPEED;
let score = 0;
let highScore = loadHighScore();
let groundX = 0;
let diedAt = 0;

function random(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

// ---------- high score (persists in the browser) ----------
function loadHighScore() {
    try { return parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0; }
    catch { return 0; }
}

function saveHighScore() {
    try { localStorage.setItem(STORAGE_KEY, highScore); }
    catch { /* storage blocked - high score just won't persist */ }
}

// ---------- classes ----------
class Dino {
    constructor(el) {
        this.el = el;
        this.reset();
    }

    reset() {
        this.y = 0;                 // 0 = on the ground, negative = in the air
        this.vy = 0;
        this.draw();
    }

    get onGround() { return this.y >= 0; }

    jump() {
        if (this.onGround) this.vy = -JUMP_VELOCITY;
    }

    update() {
        if (this.onGround && this.vy === 0) return;
        this.vy += GRAVITY;
        this.y += this.vy;
        if (this.y >= 0) { this.y = 0; this.vy = 0; }
    }

    draw() {
        this.el.style.top = 82 + this.y + "px";
        this.el.classList.toggle("run", state === "running" && this.onGround);
    }
}

class Cactus {
    constructor(el) {
        this.el = el;
        this.reset();
    }

    reset() {
        this.active = false;
        this.x = OFFSCREEN_X;
    }

    spawn() {
        this.active = true;
        this.x = SPAWN_X;
        this.el.classList.toggle("big", random(0, 2) === 1);
    }

    update() {
        if (!this.active) return;
        this.x -= speed;
        if (this.x <= OFFSCREEN_X) this.active = false;
    }

    draw() {
        this.el.style.left = this.x + "px";
    }
}

const dino = new Dino(document.getElementById("dinoElement"));
const obstacles = [1, 2].map(i => new Cactus(document.getElementById("cactusElement" + i)));

// ---------- state changes ----------
function setState(next) {
    state = next;
    canvas.classList.remove("ready", "running", "over");
    canvas.classList.add(next);
}

function startGame() {
    speed = START_SPEED;
    score = 0;
    groundX = 0;
    dino.reset();
    obstacles.forEach(c => c.reset());
    setState("running");
}

function gameOver() {
    setState("over");
    diedAt = Date.now();
    if (Math.floor(score) > highScore) {
        highScore = Math.floor(score);
        saveHighScore();
    }
}

// ---------- input (registered once) ----------
function action() {
    if (state === "running") dino.jump();
    else if (state === "ready" || Date.now() - diedAt > RESTART_DELAY) startGame();
}

window.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowUp" && e.key !== " ") return;
    e.preventDefault();
    if (e.repeat && state !== "running") return;   // holding the key can't restart
    action();
});
canvas.addEventListener("pointerdown", action);    // mouse, touch, and the play button

// ---------- game logic ----------
function trySpawn() {
    const free = obstacles.find(c => !c.active);
    if (!free) return;
    const lastX = Math.max(...obstacles.map(c => (c.active ? c.x : -Infinity)));
    const minGap = 220 + speed * 35;               // gaps grow with speed so jumps stay fair
    if (lastX > SPAWN_X - minGap) return;
    if (random(0, SPAWN_CHANCE) === 0) free.spawn();
}

function isColliding(elem1, elem2, pad = 7) {
    // hitboxes are shrunk by `pad` px so near-misses feel fair
    const a = elem1.getBoundingClientRect();
    const b = elem2.getBoundingClientRect();
    return (
        a.left + pad < b.right - pad &&
        a.right - pad > b.left + pad &&
        a.top + pad < b.bottom - pad &&
        a.bottom - pad > b.top + pad
    );
}

function update() {
    dino.update();
    obstacles.forEach(c => c.update());
    trySpawn();
    speed = Math.min(speed + 0.0004, MAX_SPEED);
    score += speed * 0.03;
    groundX += speed;
}

// ---------- rendering ----------
const pad5 = n => String(Math.floor(n)).padStart(5, "0");

function draw() {
    dino.draw();
    obstacles.forEach(c => c.draw());
    canvas.style.setProperty("--gx", -groundX + "px");
    hiEl.textContent = "HI " + pad5(highScore);
    scoreEl.textContent = pad5(score);
    document.body.classList.toggle("night", Math.floor(score / NIGHT_EVERY) % 2 === 1);
}

// ---------- main loop ----------
function main() {
    if (state !== "running") return;
    update();
    draw();
    if (obstacles.some(c => c.active && isColliding(dino.el, c.el))) {
        gameOver();
        draw();                                     // refresh HI score on the game-over screen
    }
}

draw();
setInterval(main, 10);