export class World {
    constructor(game) {
        this.game = game;
        this.ui = game.ui;
        this.container = document.getElementById('world-container');
        this.canvas = document.getElementById('world-map-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.playerSprite = document.getElementById('player-sprite');

        this.tileSize = 32;
        this.mapSize = 500; // 500x500の超巨大マップ (25万タイル)
        this.mapData = [];

        // キャンバスサイズをコンテナに合わせる
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;

        // 固定オブジェクト（町、ダンジョン）
        this.locations = [
            { id: 'town_start', name: "始まりの町", x: 10, y: 10, type: 'town', npcs: [{ name: "村長", message: "Canvasの力で世界が500x500に広がったぞ！" }] },
            { id: 'town_central', name: "メガリス中央都", x: 250, y: 250, type: 'town', npcs: [{ name: "兵士", message: "ここが世界の中心だ。" }] },
            { id: 'town_snow', name: "凍土の都", x: 50, y: 450, type: 'town', npcs: [{ name: "守り人", message: "北西は常に凍てついている。" }] },
            { id: 'town_desert', name: "黄金の砂漠都市", x: 450, y: 50, type: 'town', npcs: [{ name: "商人", message: "南東の砂地には金が眠るという。" }] },
            { id: 'town_volcano', name: "火噴き村", x: 450, y: 450, type: 'town', npcs: [{ name: "職人", message: "南西の火山帯は危険がいっぱいだ。" }] },
            { id: 'town_islet', name: "孤島のリゾート", x: 50, y: 50, type: 'town', npcs: [{ name: "旅人", message: "この北東の海原を渡ってきたのか？" }] },
            { id: 'town_forest', name: "巨木の里", x: 120, y: 280, type: 'town', npcs: [{ name: "エルフ", message: "森の囁きを聞くが良い。" }] },
            { id: 'town_mine', name: "廃鉱の町", x: 380, y: 150, type: 'town', npcs: [{ name: "工夫", message: "この奥には巨大な魔物が..." }] },

            // ダンジョン
            { id: 'dungeon_1', name: "試練の洞窟", x: 15, y: 20, type: 'dungeon', recLv: 5 },
            { id: 'dungeon_water', name: "深海神殿", x: 60, y: 40, type: 'dungeon', recLv: 50 },
            { id: 'dungeon_forest', name: "暗黒樹海", x: 140, y: 300, type: 'dungeon', recLv: 120 },
            { id: 'dungeon_desert', name: "ピラミッドの迷宮", x: 460, y: 30, type: 'dungeon', recLv: 250 },
            { id: 'dungeon_snow', name: "絶対零度の獄", x: 30, y: 470, type: 'dungeon', recLv: 400 },
            { id: 'dungeon_fire', name: "灼熱の終焉", x: 470, y: 470, type: 'dungeon', recLv: 600 },
            { id: 'dungeon_sky', name: "天空の城", x: 250, y: 10, type: 'dungeon', recLv: 800 },
            { id: 'dungeon_last', name: "次元の狭間 (Last)", x: 495, y: 495, type: 'dungeon', recLv: 1000 }
        ];

        // 拠点のランダム追加配置を増量
        for (let i = 1; i <= 35; i++) {
            const rx = Math.floor(Math.random() * 480) + 10;
            const ry = Math.floor(Math.random() * 480) + 10;
            if (!this.locations.find(l => l.x === rx && l.y === ry)) {
                this.locations.push({
                    id: `hidden_spot_${i}`, name: `伝説の遺構 #${i}`,
                    x: rx, y: ry, type: 'dungeon', recLv: 150 + i * 20
                });
            }
        }

        this.playerX = 10;
        this.playerY = 10;
        this.isMoving = false;
        this.keys = {};

        this.initMap();
        this.setupControls();
        this.render(); // 描画ループ開始
    }

    initMap() {
        // データ生成のみ
        for (let y = 0; y < this.mapSize; y++) {
            this.mapData[y] = [];
            for (let x = 0; x < this.mapSize; x++) {
                let type = 'grass';
                const loc = this.locations.find(l => l.x === x && l.y === y);
                if (loc) {
                    type = loc.type;
                } else {
                    // バイオーム設定
                    if (y > 400 && x < 100) type = 'snow'; // 北西
                    else if (y < 100 && x > 400) type = 'desert'; // 南東
                    else if (y > 400 && x > 400) type = 'volcano'; // 南西
                    else if (Math.random() < 0.1) type = 'forest';
                    else if (Math.random() < 0.05) type = 'mountain';
                    else if (Math.random() < 0.02) type = 'water';
                }
                this.mapData[y][x] = type;
            }
        }
        this.playerSprite.className = 'hero-visual';
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.handleMovement();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    handleMovement() {
        if (this.game.isBattleActive || this.isMoving) return;

        let dx = 0;
        let dy = 0;

        if (this.keys['w'] || this.keys['arrowup']) dy = -1;
        if (this.keys['s'] || this.keys['arrowdown']) dy = 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx = -1;
        if (this.keys['d'] || this.keys['arrowright']) dx = 1;

        if (dx !== 0 || dy !== 0) {
            this.move(dx, dy);
        }
    }

    move(dx, dy) {
        const nextX = this.playerX + dx;
        const nextY = this.playerY + dy;

        // 境界チェック
        if (nextX < 0 || nextX >= this.mapSize || nextY < 0 || nextY >= this.mapSize) return;

        // 山などの通行不可判定（簡易）
        if (this.mapData[nextY][nextX] === 'mountain') return;

        this.playerX = nextX;
        this.playerY = nextY;
        this.isMoving = true;

        this.updateView();

        // 移動アニメーション後にエンカウント判定
        setTimeout(() => {
            this.isMoving = false;
            this.checkLocation();
            this.checkEncounter();
            // 押しっぱなし対応
            this.handleMovement();
        }, 120);
    }

    updateView() {
        const containerWidth = this.container.offsetWidth;
        const containerHeight = this.container.offsetHeight;

        this.pTargetLeft = this.playerX * this.tileSize;
        this.pTargetTop = this.playerY * this.tileSize;

        this.cameraX = (containerWidth / 2) - this.pTargetLeft - (this.tileSize / 2);
        this.cameraY = (containerHeight / 2) - this.pTargetTop - (this.tileSize / 2);

        // スプライトはCSSで動かす（Canvas上ではなくDOMとして重ねる）
        this.playerSprite.style.left = `${this.pTargetLeft}px`;
        this.playerSprite.style.top = `${this.pTargetTop}px`;
        this.playerSprite.style.transform = `translate(${this.cameraX}px, ${this.cameraY}px)`;
    }

    render() {
        if (!this.container.classList.contains('hidden')) {
            this.draw();
        }
        requestAnimationFrame(() => this.render());
    }

    draw() {
        const ctx = this.ctx;
        const ts = this.tileSize;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, cw, ch);

        ctx.save();
        ctx.translate(this.cameraX, this.cameraY);

        // 視野内のタイルのみ描画
        const startX = Math.max(0, Math.floor(-this.cameraX / ts));
        const endX = Math.min(this.mapSize, Math.ceil((-this.cameraX + cw) / ts));
        const startY = Math.max(0, Math.floor(-this.cameraY / ts));
        const endY = Math.min(this.mapSize, Math.ceil((-this.cameraY + ch) / ts));

        const colors = {
            grass: "#2d5a27", forest: "#1a3311", water: "#1e3c5a", mountain: "#4a4a4a",
            town: "#a67c52", dungeon: "#331133", snow: "#e0f0ff", desert: "#e6be8a", volcano: "#5a1e1e"
        };

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const type = this.mapData[y][x];
                ctx.fillStyle = colors[type];
                ctx.fillRect(x * ts, y * ts, ts, ts);

                // 装飾
                if (type === 'forest') {
                    ctx.fillStyle = "#142b0d";
                    ctx.beginPath();
                    ctx.moveTo(x * ts + ts / 2, y * ts + 5);
                    ctx.lineTo(x * ts + 5, y * ts + ts - 5);
                    ctx.lineTo(x * ts + ts - 5, y * ts + ts - 5);
                    ctx.fill();
                } else if (type === 'town') {
                    ctx.strokeStyle = "#5d4037";
                    ctx.strokeRect(x * ts + 4, y * ts + 4, ts - 8, ts - 8);
                } else if (type === 'dungeon') {
                    ctx.strokeStyle = "#ff00ff";
                    ctx.strokeRect(x * ts + 2, y * ts + 2, ts - 4, ts - 4);
                }
            }
        }
        ctx.restore();
    }

    checkLocation() {
        const loc = this.locations.find(l => l.x === this.playerX && l.y === this.playerY);
        if (loc) {
            this.ui.log(`「${loc.name}」に到着した。`);
            if (loc.type === 'town') {
                this.game.openTownMenu(loc);
            } else if (loc.type === 'dungeon') {
                this.game.openDungeonMenu(loc);
            }
        }
    }

    checkEncounter() {
        // 水辺や町などの安全地帯判定（簡易）
        if (this.mapData[this.playerY][this.playerX] === 'town') return;

        // 10%の確率でエンカウント
        if (Math.random() < 0.08) {
            this.game.startRandomBattle();
        }
    }

    updateControlMode(mode) {
        if (mode === "mobile") {
            this.showMobilePad();
        } else {
            this.hideMobilePad();
        }
    }

    showMobilePad() {
        if (!document.getElementById('mobile-pad')) {
            const pad = document.createElement('div');
            pad.id = 'mobile-pad';
            pad.innerHTML = `
                <button class="pad-btn up" ontouchstart="game.world.handleTouch('w')">↑</button>
                <div class="pad-row">
                    <button class="pad-btn left" ontouchstart="game.world.handleTouch('a')">←</button>
                    <button class="pad-btn down" ontouchstart="game.world.handleTouch('s')">↓</button>
                    <button class="pad-btn right" ontouchstart="game.world.handleTouch('d')">→</button>
                </div>
            `;
            this.container.appendChild(pad);
        } else {
            document.getElementById('mobile-pad').classList.remove('hidden');
        }
    }

    hideMobilePad() {
        const pad = document.getElementById('mobile-pad');
        if (pad) pad.classList.add('hidden');
    }

    handleTouch(key) {
        this.keys[key] = true;
        this.handleMovement();
        // すぐにOFFにしないと歩き続けてしまうため、タイマーでリセット
        setTimeout(() => this.keys[key] = false, 100);
    }

    show() {
        this.container.classList.remove('hidden');
        if (this.game.player.controlMode === "mobile") {
            this.showMobilePad();
        }
        this.updateView();
    }

    hide() {
        this.container.classList.add('hidden');
        this.hideMobilePad();
    }
}
