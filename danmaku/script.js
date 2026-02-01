const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('startScreen');
const hud = document.getElementById('hud');
const gameOverScreen = document.getElementById('gameOverScreen');
const victoryScreen = document.getElementById('victoryScreen');
const phaseDisplay = document.getElementById('phaseDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const finalTimeSpan = document.getElementById('finalTime');
const clearDifficultySpan = document.getElementById('clearDifficulty');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER, VICTORY
let difficulty = 'normal';
let controlMethod = 'mouse'; // 'mouse' or 'keyboard'
let startTime = 0;
let elapsedTime = 0;
let animationId;
let phase = 1;
const TOTAL_PHASES = 3;
const PHASE_DURATION = 30000; // 30 seconds per phase

// Player
const player = {
    x: 0,
    y: 0,
    radius: 6,
    speed: 5,
    color: '#00f2ff',
    trail: []
};

// Input
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    s: false,
    a: false,
    d: false
};

// Bullets
let bullets = [];

// Difficulty Settings
const difficultySettings = {
    easy: { bulletSpeed: 0.7, spawnRate: 1.2 },
    normal: { bulletSpeed: 1.0, spawnRate: 1.0 },
    hard: { bulletSpeed: 1.5, spawnRate: 0.7 }
};

// Resize Canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Reset player position to center if game not running or just starting
    if (gameState === 'START') {
        player.x = canvas.width / 2;
        player.y = canvas.height * 0.8;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Input Handling
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Mouse/Touch Control (optional, for better accessibility)
// Mouse/Touch Control (optional, for better accessibility)
canvas.addEventListener('mousemove', (e) => {
    if (gameState === 'PLAYING' && controlMethod === 'mouse') {
        player.x = e.clientX;
        player.y = e.clientY;
    }
});
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameState === 'PLAYING' && controlMethod === 'mouse') {
        player.x = e.touches[0].clientX;
        player.y = e.touches[0].clientY;
    }
}, { passive: false });


// Game Loop
function gameLoop(timestamp) {
    if (gameState !== 'PLAYING') return;

    // Calculate time
    elapsedTime = timestamp - startTime;
    timeDisplay.textContent = (elapsedTime / 1000).toFixed(2);

    // Phase Management
    const currentPhaseTime = elapsedTime % PHASE_DURATION;
    const currentPhase = Math.floor(elapsedTime / PHASE_DURATION) + 1;

    if (currentPhase > phase) {
        phase = currentPhase;
        if (phase > TOTAL_PHASES) {
            victory();
            return;
        }
        phaseDisplay.textContent = phase;
        // Clear bullets on phase change for a breather? No, keep it intense.
        // Maybe a visual effect?
    }

    update(timestamp);
    draw();

    animationId = requestAnimationFrame(gameLoop);
}

function update(timestamp) {
    // Player Movement (Keyboard)
    if (controlMethod === 'keyboard') {
        if (keys.ArrowUp || keys.w) player.y -= player.speed;
        if (keys.ArrowDown || keys.s) player.y += player.speed;
        if (keys.ArrowLeft || keys.a) player.x -= player.speed;
        if (keys.ArrowRight || keys.d) player.x += player.speed;

        // Clamp
        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
    }

    // Update Trail
    player.trail.push({ x: player.x, y: player.y, alpha: 1.0 });
    if (player.trail.length > 10) player.trail.shift();
    player.trail.forEach(t => t.alpha -= 0.1);

    // Spawn Bullets
    spawnBullets(timestamp);

    // Update Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        // Remove off-screen
        if (b.x < -50 || b.x > canvas.width + 50 || b.y < -50 || b.y > canvas.height + 50) {
            bullets.splice(i, 1);
            continue;
        }

        // Collision Detection
        const dx = b.x - player.x;
        const dy = b.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + b.radius) {
            gameOver();
        }
    }
}

function draw() {
    // Clear with trail effect
    ctx.fillStyle = 'rgba(5, 5, 5, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Player Trail
    player.trail.forEach(t => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, player.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 242, 255, ${t.alpha})`;
        ctx.fill();
    });

    // Draw Player
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Bullets
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
    });
}

// Bullet Spawning Logic
let lastSpawn = 0;

function spawnBullets(timestamp) {
    const settings = difficultySettings[difficulty];
    const spawnInterval = 100 * settings.spawnRate; // Base 100ms adjusted by difficulty

    // Grace period: No bullets for first 3 seconds
    if (elapsedTime < 3000) return;

    if (timestamp - lastSpawn > spawnInterval) {
        lastSpawn = timestamp;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // --- PATTERN SELECTION LOGIC ---
        // Easy: Mostly Linear, some Radial, Rain
        // Normal: Spiral, Aimed, Wave, Flower
        // Hard: Chaos, Cross, Fast Aimed, Double Spiral, Rain+Flower

        if (difficulty === 'easy') {
            if (phase === 1) {
                if (Math.random() < 0.7) spawnLinearBullet(settings.bulletSpeed);
                else spawnRadialBurst(centerX, centerY, 6, settings.bulletSpeed);
            } else if (phase === 2) {
                if (Math.random() < 0.5) spawnRain(settings.bulletSpeed);
                else spawnWave(timestamp, settings.bulletSpeed);
            } else { // Phase 3
                if (Math.random() < 0.4) spawnSpiral(centerX, centerY, timestamp, settings.bulletSpeed);
                else spawnFlower(centerX, centerY, timestamp, settings.bulletSpeed);
            }
        }
        else if (difficulty === 'normal') {
            if (phase === 1) {
                if (Math.random() < 0.5) spawnLinearBullet(settings.bulletSpeed);
                else spawnWave(timestamp, settings.bulletSpeed);
            } else if (phase === 2) {
                spawnSpiral(centerX, centerY, timestamp, settings.bulletSpeed);
                if (Math.random() < 0.3) spawnFlower(centerX, centerY, timestamp, settings.bulletSpeed);
            } else { // Phase 3
                spawnSpiral(centerX, centerY, timestamp, settings.bulletSpeed * 1.1);
                if (Math.random() < 0.4) spawnCross(centerX, centerY, timestamp, settings.bulletSpeed);
                if (Math.random() < 0.2) spawnRain(settings.bulletSpeed * 1.2);
            }
        }
        else if (difficulty === 'hard') {
            if (phase === 1) {
                spawnSpiral(centerX, centerY, timestamp, settings.bulletSpeed);
                if (Math.random() < 0.3) spawnAimedBullet(settings.bulletSpeed * 1.5);
            } else if (phase === 2) {
                spawnFlower(centerX, centerY, timestamp, settings.bulletSpeed * 1.2);
                spawnSpiral(centerX, centerY, -timestamp, settings.bulletSpeed);
                if (Math.random() < 0.3) spawnCross(centerX, centerY, timestamp, settings.bulletSpeed);
            } else { // Phase 3
                // Chaos
                spawnSpiral(centerX, centerY, timestamp * 1.5, settings.bulletSpeed * 1.2);
                spawnSpiral(centerX, centerY, -timestamp * 1.5, settings.bulletSpeed * 1.2);
                if (Math.random() < 0.5) spawnRandomSpray(centerX, centerY, settings.bulletSpeed);
                if (Math.random() < 0.3) spawnRain(settings.bulletSpeed * 1.5);
            }
        }
    }
}

function spawnLinearBullet(speedMult) {
    const side = Math.floor(Math.random() * 4); // 0:top, 1:right, 2:bottom, 3:left
    let x, y, vx, vy;
    const speed = 3 * speedMult;

    switch (side) {
        case 0: // Top
            x = Math.random() * canvas.width;
            y = -10;
            vx = (Math.random() - 0.5) * 2;
            vy = speed;
            break;
        case 1: // Right
            x = canvas.width + 10;
            y = Math.random() * canvas.height;
            vx = -speed;
            vy = (Math.random() - 0.5) * 2;
            break;
        case 2: // Bottom
            x = Math.random() * canvas.width;
            y = canvas.height + 10;
            vx = (Math.random() - 0.5) * 2;
            vy = -speed;
            break;
        case 3: // Left
            x = -10;
            y = Math.random() * canvas.height;
            vx = speed;
            vy = (Math.random() - 0.5) * 2;
            break;
    }

    bullets.push({ x, y, vx, vy, radius: 4, color: '#ff0055' });
}

function spawnRadialBurst(x, y, count, speedMult) {
    const angleStep = (Math.PI * 2) / count;
    const speed = 2 * speedMult;

    for (let i = 0; i < count; i++) {
        const angle = i * angleStep;
        bullets.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 4,
            color: '#ffaa00'
        });
    }
}

function spawnSpiral(x, y, timestamp, speedMult) {
    const angle = timestamp / 200;
    const speed = 3 * speedMult;
    bullets.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4,
        color: '#00ff88'
    });
}

function spawnAimedBullet(speedMult) {
    // Spawn from random edge aimed at player
    const side = Math.floor(Math.random() * 4);
    let x, y;

    if (side === 0) { x = Math.random() * canvas.width; y = -10; }
    else if (side === 1) { x = canvas.width + 10; y = Math.random() * canvas.height; }
    else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 10; }
    else { x = -10; y = Math.random() * canvas.height; }

    const angle = Math.atan2(player.y - y, player.x - x);
    const speed = 4 * speedMult;

    bullets.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 5,
        color: '#ff00ff' // Purple aimed bullets
    });
}

function spawnWave(timestamp, speedMult) {
    // Sine wave pattern from top
    const x = Math.random() * canvas.width;
    const speed = 3 * speedMult;
    bullets.push({
        x, y: -10,
        vx: Math.sin(timestamp / 500) * 2,
        vy: speed,
        radius: 4,
        color: '#00aaff'
    });
}

function spawnCross(x, y, timestamp, speedMult) {
    // 4 bullets in a cross shape rotating
    const angleBase = timestamp / 500;
    const speed = 2.5 * speedMult;
    for (let i = 0; i < 4; i++) {
        const angle = angleBase + (i * Math.PI / 2);
        bullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 5, color: '#ffff00' });
    }
}

function spawnRandomSpray(x, y, speedMult) {
    // Spray of bullets in random directions
    const count = 5;
    const speed = 4 * speedMult;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        bullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 3, color: '#ffffff' });
    }
}

function spawnFlower(x, y, timestamp, speedMult) {
    // Rotating flower pattern
    const petals = 5;
    const angleBase = timestamp / 1000;
    const speed = 2 * speedMult;

    for (let i = 0; i < petals; i++) {
        const angle = angleBase + (i * (Math.PI * 2 / petals));
        bullets.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 6,
            color: '#ff00aa'
        });
    }
}

function spawnRain(speedMult) {
    // Rain from top with slight angle
    const count = 3;
    const speed = 4 * speedMult;
    for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        bullets.push({
            x, y: -10,
            vx: (Math.random() - 0.5),
            vy: speed + Math.random(),
            radius: 3,
            color: '#00ffff'
        });
    }
}

// Game Flow Functions
function startGame(selectedDifficulty) {
    difficulty = selectedDifficulty;

    // Get selected control method
    const radios = document.getElementsByName('control');
    for (const radio of radios) {
        if (radio.checked) {
            controlMethod = radio.value;
            break;
        }
    }

    gameState = 'PLAYING';
    phase = 1;
    bullets = [];
    startTime = performance.now();
    elapsedTime = 0;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    // Reset player
    player.x = canvas.width / 2;
    player.y = canvas.height * 0.8;

    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = 'GAMEOVER';
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalTimeSpan.textContent = (elapsedTime / 1000).toFixed(2);
}

function victory() {
    gameState = 'VICTORY';
    hud.classList.add('hidden');
    victoryScreen.classList.remove('hidden');
    clearDifficultySpan.textContent = difficulty.toUpperCase();
}

// Event Listeners
document.querySelectorAll('.difficulty-select .btn').forEach(btn => {
    btn.addEventListener('click', () => {
        startGame(btn.dataset.difficulty);
    });
});

document.getElementById('retryBtn').addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
});

document.getElementById('playAgainBtn').addEventListener('click', () => {
    victoryScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
});
