const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// ステージデータ (15ステージ)
const STAGES = [
    // Stage 1: 基本操作
    [
        "####################",
        "#                  #",
        "#                  #",
        "#                  #",
        "#                  #",
        "#                  #",
        "#     #            #",
        "#     #            #",
        "#   P #          @ #",
        "####################",
    ],
    // Stage 2: ジャンプの基本
    [
        "####################",
        "#                  #",
        "#                  #",
        "#                  #",
        "#       ####       #",
        "#       #          #",
        "#     P #    @     #",
        "#########    #######",
        "#                  #",
        "####################",
    ],
    // Stage 3: 棘の導入
    [
        "####################",
        "#                  #",
        "#                  #",
        "#                  #",
        "#                  #",
        "#    P        @    #",
        "#######^^^^^^#######",
        "#                  #",
        "#                  #",
        "####################",
    ],
    // Stage 4: 壁登りのチュートリアル
    [
        "####################",
        "#                  #",
        "#     @  #         #",
        "##########         #",
        "#                  #",
        "#                  #",
        "#       #          #",
        "#   P   #          #",
        "#########^^^^^^^^###",
        "####################",
    ],
    // Stage 5: 足場渡り
    [
        "####################",
        "#                  #",
        "#### @             #",
        "#    ###           #",
        "#          ###     #",
        "#                ###",
        "#      P           #",
        "####################",
        "#                  #",
        "####################",
    ],
    // Stage 6: 壁キック連続
    [
        "#####@##############",
        "##### ##############",
        "#                  #",
        "#                  #",
        "#     ##           #",
        "#      #           #",
        "#     ##           #",
        "#      #           #",
        "#   P ##           #",
        "####################",
    ],
    // Stage 7: 上下移動
    [
        "####################",
        "#@                 #",
        "#                  #",
        "#   #########      #",
        "#                  #",
        "#           ###### #",
        "#                  #",
        "#######            #",
        "#P                 #",
        "####################",
    ],
    // Stage 8: 棘の海
    [
        "####################",
        "#                  #",
        "#      ####        #",
        "#    ##    ##      #",
        "#  ##        ##    #",
        "#@             P   #",
        "####################",
        "#^^^^^^^^^^^^^^^^^^#",
        "#^^^^^^^^^^^^^^^^^^#",
        "####################",
    ],
    // Stage 9: 狭い隙間
    [
        "####################",
        "#                P #",
        "#   ################",
        "#                  #",
        "################   #",
        "#                  #",
        "#   ################",
        "#@                 #",
        "####################",
        "####################",
    ],
    // Stage 10: 壁駆け上がり2
    [
        "###@    ############",
        "###     ############",
        "#                   #",
        "#                   #",
        "#         ####      #",
        "#          ###      #",
        "#         ####      #",
        "#          ###      #",
        "##  P     ####      #",
        "####################",
    ],
    // Stage 11: 迷路
    [
        "####################",
        "#P#     #          #",
        "# # ### # ######## #",
        "#   # # # #      # #",
        "##### # # # #### # #",
        "#     # # # #  # # #",
        "# ##### # # #  # # #",
        "#       #   #  # @ #",
        "####################",
        "####################",
    ],
    // Stage 12: 精密ジャンプ
    [
        "####################",
        "#                  #",
        "#  @    ^    ^   P #",
        "###   ###  ###  ####",
        "#                  #",
        "#                  #",
        "#  ^    ^    ^     #",
        "####################",
        "#                  #",
        "####################",
    ],
    // Stage 13: 壁登り・地獄
    [
        "####@###############",
        "#### ###############",
        "#                  #",
        "#                  #",
        "#   ##             #",
        "#   ##             #",
        "#  ^##             #",
        "#  ^##             #",
        "# P ##             #",
        "####################",
    ],
    // Stage 14: バランス
    [
        "####################",
        "#                  #",
        "# P                #",
        "####   ^^^   ^   ###",
        "#      ###   #     #",
        "#            #     #",
        "#      ^     #   @ #",
        "####################",
        "#                  #",
        "####################",
    ],
    // Stage 15: ラスト
    [
        "####################",
        "#@                P#",
        "#^^^^^^^^^^^^^^^^^^#",
        "#                  #",
        "#                  #",
        "#  ^^^^^^^^^^^^^^  #",
        "#                  #",
        "##                ##",
        "####################",
        "####################",
    ]
];

// ゲーム設定
const TILE_SIZE = 40;
const GRAVITY = 0.6;
const FRICTION = 0.85;
const JUMP_FORCE = -12;
const WALL_JUMP_FORCE_Y = -11;
const WALL_JUMP_FORCE_X = 6;
const ACCEL = 1.0;
const MAX_SPEED = 6;

// ゲーム状態
let currentStage = 0;
let player = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    width: 32, height: 32,
    onGround: false,
    onWall: null, // 'left' or 'right'
    color: '#00d4ff',
    targetX: 0, targetY: 0 // 初期位置保存用
};

let keys = {};
let startTime = 0;
let finishTime = 0;
let isGameRunning = false;
let controlMode = 'keyboard';
let timerInterval = null;
let canJump = true; // ジャンプボタンの単発押しを管理

// 初期化
function init() {
    setupStage(currentStage);
    requestAnimationFrame(gameLoop);
}

function setupStage(index) {
    const stage = STAGES[index];
    canvas.height = stage.length * TILE_SIZE;
    canvas.width = stage[0].length * TILE_SIZE;

    for (let row = 0; row < stage.length; row++) {
        for (let col = 0; col < stage[row].length; col++) {
            const char = stage[row][col];
            if (char === 'P') {
                player.x = col * TILE_SIZE + (TILE_SIZE - player.width) / 2;
                player.y = row * TILE_SIZE + (TILE_SIZE - player.height) / 2;
                player.targetX = player.x;
                player.targetY = player.y;
                player.vx = 0;
                player.vy = 0;
            }
        }
    }
    document.getElementById('stage-display').textContent = `STAGE: ${currentStage + 1} / 15`;
}

function startGame(mode) {
    controlMode = mode;
    isGameRunning = true;
    currentStage = 0;
    startTime = Date.now();

    document.getElementById('overlay-screen').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');

    if (controlMode === 'mobile') {
        document.getElementById('mobile-controls').classList.remove('hidden');
    }

    setupStage(currentStage);

    timerInterval = setInterval(updateTimer, 10);
}

function updateTimer() {
    if (!isGameRunning) return;
    const now = Date.now();
    const diff = now - startTime;
    document.getElementById('timer-display').textContent = `TIME: ${formatTime(diff)}`;
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
}

// 入力処理
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// モバイル操作
const setupMobileBtn = (id, key) => {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
    btn.addEventListener('mousedown', () => keys[key] = true);
    btn.addEventListener('mouseup', () => keys[key] = false);
};

setupMobileBtn('btn-left', 'ArrowLeft');
setupMobileBtn('btn-right', 'ArrowRight');
setupMobileBtn('btn-jump', 'Space');

function gameLoop() {
    if (isGameRunning) {
        update();
        render();
    }
    requestAnimationFrame(gameLoop);
}

function update() {
    // 左右移動
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.vx -= ACCEL;
    } else if (keys['ArrowRight'] || keys['KeyD']) {
        player.vx += ACCEL;
    } else {
        player.vx *= FRICTION;
    }

    // 速度制限
    if (player.vx > MAX_SPEED) player.vx = MAX_SPEED;
    if (player.vx < -MAX_SPEED) player.vx = -MAX_SPEED;

    // 重力
    player.vy += GRAVITY;

    // 位置更新 (X)
    player.x += player.vx;
    checkCollision('x');

    // 位置更新 (Y)
    player.y += player.vy;
    checkCollision('y');

    // ジャンプ処理
    const jumpKey = keys['ArrowUp'] || keys['KeyW'] || keys['Space'];
    if (jumpKey) {
        if (canJump) {
            if (player.onGround) {
                player.vy = JUMP_FORCE;
                player.onGround = false;
                canJump = false;
            } else if (player.onWall) {
                // 壁ジャンプ
                player.vy = WALL_JUMP_FORCE_Y;

                // 駆け上がりの判定: 接触している壁の方向にキーを押し続けているか
                const pressingAgainstWall = (player.onWall === 'left' && (keys['ArrowLeft'] || keys['KeyA'])) ||
                    (player.onWall === 'right' && (keys['ArrowRight'] || keys['KeyD']));

                if (pressingAgainstWall) {
                    // 駆け上がり: ほとんど垂直に飛ぶが、わずかに壁に押し付けることで連続ジャンプを容易にする
                    player.vx = (player.onWall === 'left' ? -2 : 2);
                } else {
                    // 壁キック: 反対方向に大きく飛ぶ
                    player.vx = (player.onWall === 'left' ? WALL_JUMP_FORCE_X : -WALL_JUMP_FORCE_X);
                    // 以前の player.onWall = null; は不要 (checkCollisionで毎フレームリセットされるため)
                }
                canJump = false;
            }
        }
    } else {
        canJump = true;
    }
}

function checkCollision(axis) {
    const stage = STAGES[currentStage];
    player.onWall = null;

    const left = Math.floor(player.x / TILE_SIZE);
    const right = Math.floor((player.x + player.width) / TILE_SIZE);
    const top = Math.floor(player.y / TILE_SIZE);
    const bottom = Math.floor((player.y + player.height) / TILE_SIZE);

    for (let row = top; row <= bottom; row++) {
        for (let col = left; col <= right; col++) {
            if (!stage[row] || !stage[row][col]) continue;
            const tile = stage[row][col];

            if (tile === '#' || tile === '^' || tile === '@') {
                if (isIntersecting(player, { x: col * TILE_SIZE, y: row * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE })) {
                    if (tile === '^') {
                        restartStage();
                        return;
                    }
                    if (tile === '@') {
                        nextStage();
                        return;
                    }

                    if (tile === '#') {
                        if (axis === 'x') {
                            if (player.vx > 0) {
                                player.x = col * TILE_SIZE - player.width;
                                if (!player.onGround) player.onWall = 'right';
                            } else if (player.vx < 0) {
                                player.x = (col + 1) * TILE_SIZE;
                                if (!player.onGround) player.onWall = 'left';
                            }
                            player.vx = 0;
                        } else {
                            if (player.vy > 0) {
                                player.y = row * TILE_SIZE - player.height;
                                player.onGround = true;
                                player.vy = 0;
                            } else if (player.vy < 0) {
                                player.y = (row + 1) * TILE_SIZE;
                                player.vy = 0;
                            }
                        }
                    }
                }
            }
        }
    }

    if (axis === 'y' && player.vy !== 0) {
        player.onGround = false;
    }
}

function isIntersecting(r1, r2) {
    return r1.x < r2.x + r2.width &&
        r1.x + r1.width > r2.x &&
        r1.y < r2.y + r2.height &&
        r1.y + r1.height > r2.y;
}

function restartStage() {
    player.x = player.targetX;
    player.y = player.targetY;
    player.vx = 0;
    player.vy = 0;
}

function nextStage() {
    currentStage++;
    if (currentStage >= STAGES.length) {
        gameClear();
    } else {
        setupStage(currentStage);
    }
}

function gameClear() {
    isGameRunning = false;
    clearInterval(timerInterval);
    finishTime = Date.now() - startTime;
    document.getElementById('final-time-display').textContent = formatTime(finishTime);
    document.getElementById('clear-screen').classList.remove('hidden');
    document.getElementById('game-ui').classList.add('hidden');
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const stage = STAGES[currentStage];
    for (let row = 0; row < stage.length; row++) {
        for (let col = 0; col < stage[row].length; col++) {
            const char = stage[row][col];
            if (char === '#') {
                ctx.fillStyle = '#2a2a35';
                ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (char === '^') {
                drawSpike(col * TILE_SIZE, row * TILE_SIZE);
            } else if (char === '@') {
                drawGoal(col * TILE_SIZE, row * TILE_SIZE);
            }
        }
    }

    drawPlayer();
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const w = player.width;
    const h = player.height;
    const r = 8; // 角丸

    // 体
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();

    // 大きな一つ目
    const eyeX = x + w / 2;
    const eyeY = y + h / 2 - 2;
    const eyeSize = 10;

    // 白目
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // 黒目 (視線移動っぽさ)
    const lookX = player.vx * 0.5;
    const lookY = player.vy * 0.2;
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(eyeX + lookX, eyeY + lookY, 5, 0, Math.PI * 2);
    ctx.fill();

    // 輝き
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeX + lookX - 2, eyeY + lookY - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawSpike(x, y) {
    ctx.fillStyle = '#ff4b2b';
    ctx.beginPath();
    ctx.moveTo(x, y + TILE_SIZE);
    ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE / 4);
    ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
    ctx.fill();
}

function drawGoal(x, y) {
    const time = Date.now() / 500;
    const bounce = Math.sin(time) * 5;

    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(x + TILE_SIZE / 2, y + bounce);
    ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2 + bounce);
    ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE + bounce);
    ctx.lineTo(x, y + TILE_SIZE / 2 + bounce);
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

init();
