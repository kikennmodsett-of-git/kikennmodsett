export class World {
    constructor(game) {
        this.game = game;
        this.ui = game.ui;
        this.container = document.getElementById('world-container');
        this.canvas = document.getElementById('world-map-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.playerSprite = document.getElementById('player-sprite');
        this.coordElement = document.getElementById('player-coords');

        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        this.tileSize = 32;
        this.mapSize = 1000; // 1000x1000 (100万タイル)
        this.mapData = [];

        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;

        // 固定拠点
        this.locations = [
            { id: 'town_start', name: "始まりの町", x: 10, y: 10, type: 'town', npcs: [{ name: "村長", message: "100万タイルの大台へようこそ！" }] },
            { id: 'town_central', name: "千都メガリス", x: 500, y: 500, type: 'town', npcs: [{ name: "王様", message: "広大すぎる世界を旅する勇気はあるか。" }] },
            { id: 'town_north', name: "北端の要塞", x: 500, y: 50, type: 'town' },
            { id: 'town_south', name: "南の楽園", x: 500, y: 950, type: 'town' },
            { id: 'town_west', name: "西の夕日町", x: 50, y: 500, type: 'town' },
            { id: 'town_east', name: "東の日の出町", x: 950, y: 500, type: 'town' },
            { id: 'dungeon_last', name: "終焉の地 (Last)", x: 990, y: 990, type: 'dungeon', recLv: 1000 }
        ];

        // 100箇所の拠点をランダム分散配置
        for (let i = 1; i <= 95; i++) {
            this.locations.push({
                id: `landmark_${i}`, name: `未知の遺跡 #${i}`,
                x: Math.floor(Math.random() * 980) + 10,
                y: Math.floor(Math.random() * 980) + 10,
                type: Math.random() < 0.3 ? 'town' : 'dungeon',
                recLv: 50 + i * 10
            });
        }

        this.playerX = 10;
        this.playerY = 10;
        this.isMoving = false;
        this.keys = {};

        this.initMap();
        this.setupControls();
        this.render();
    }

    initMap() {
        const seeds = [];
        for (let i = 0; i < 150; i++) {
            seeds.push({
                x: Math.floor(Math.random() * this.mapSize),
                y: Math.floor(Math.random() * this.mapSize),
                type: i < 50 ? 'forest' : (i < 100 ? 'mountain' : 'water'),
                radius: 8 + Math.random() * 20
            });
        }

        // 拠点の位置をマップに展開（巨大化対応）
        const locMap = new Map();
        this.locations.forEach(l => {
            const size = (l.type === 'town') ? 3 : 1; // 街は3x3
            const half = Math.floor(size / 2);
            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    locMap.set(`${l.x + dx},${l.y + dy}`, l.type);
                }
            }
        });

        for (let y = 0; y < this.mapSize; y++) {
            this.mapData[y] = [];
            for (let x = 0; x < this.mapSize; x++) {
                let type = 'grass';
                const locType = locMap.get(`${x},${y}`);

                if (locType) {
                    type = locType;
                } else {
                    // スタート地点周辺 (半径50) は強制的に平地
                    const distToStart = Math.sqrt(Math.pow(x - 10, 2) + Math.pow(y - 10, 2));
                    if (distToStart < 50) {
                        type = 'grass';
                    } else {
                        // バイオーム境界
                        if (y < 150) type = 'snow';
                        else if (y > 850) type = 'volcano';
                        else if (x > 850) type = 'desert';
                        else {
                            const s = seeds.find(s => Math.abs(s.x - x) < s.radius && Math.abs(s.y - y) < s.radius);
                            if (s) type = s.type;
                        }
                    }
                }
                this.mapData[y][x] = type;
            }
        }
        this.playerSprite.className = 'hero-visual';
        this.drawMinimapBase();
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            this.keys[k] = true;
            if (k === 'm') {
                this.showCurrentLocation();
            }
            this.handleMovement();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    showCurrentLocation() {
        const type = this.mapData[this.playerY][this.playerX];
        const names = {
            grass: "平原", forest: "森", water: "水辺", mountain: "岩山",
            town: "街・村", dungeon: "ダンジョン", snow: "雪原", desert: "砂漠", volcano: "火山地帯"
        };
        const typeName = names[type] || "未知の地点";
        this.ui.log(`【現在地情報】 ${typeName} (${this.playerX}, ${this.playerY})`);
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
        const containerWidth = this.container.offsetWidth || 800; // フォールバック
        const containerHeight = this.container.offsetHeight || 300;

        // キャンバスサイズが確定していない場合に更新
        if (this.canvas.width <= 0) {
            this.canvas.width = containerWidth;
            this.canvas.height = containerHeight;
        }

        this.pTargetLeft = this.playerX * this.tileSize;
        this.pTargetTop = this.playerY * this.tileSize;

        this.cameraX = (containerWidth / 2) - this.pTargetLeft - (this.tileSize / 2);
        this.cameraY = (containerHeight / 2) - this.pTargetTop - (this.tileSize / 2);

        this.playerSprite.style.left = `${this.pTargetLeft}px`;
        this.playerSprite.style.top = `${this.pTargetTop}px`;
        this.playerSprite.style.transform = `translate(${this.cameraX}px, ${this.cameraY}px)`;

        // 座標更新
        if (this.coordElement) {
            this.coordElement.innerText = `(${this.playerX}, ${this.playerY})`;
        }
    }

    drawMinimapBase() {
        const ctx = this.minimapCtx;
        const w = this.minimapCanvas.width = this.mapSize;
        const h = this.minimapCanvas.height = this.mapSize;

        // ミニマップクリックで現在地表示
        this.minimapCanvas.onclick = () => this.showCurrentLocation();

        const colors = {
            grass: "#2d5a27", forest: "#1a3311", water: "#1e3c5a", mountain: "#4a4a4a",
            town: "#ff0", dungeon: "#f0f", snow: "#fff", desert: "#e6be8a", volcano: "#a00"
        };

        const img = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const type = this.mapData[y][x];
                const colorStr = colors[type];
                // 簡易色変換 (3桁・6桁hex対応)
                let r, g, b;
                if (colorStr.length === 4) {
                    r = parseInt(colorStr[1] + colorStr[1], 16);
                    g = parseInt(colorStr[2] + colorStr[2], 16);
                    b = parseInt(colorStr[3] + colorStr[3], 16);
                } else {
                    r = parseInt(colorStr.slice(1, 3), 16);
                    g = parseInt(colorStr.slice(3, 5), 16);
                    b = parseInt(colorStr.slice(5, 7), 16);
                }
                const idx = (y * w + x) * 4;
                img.data[idx] = r;
                img.data[idx + 1] = g;
                img.data[idx + 2] = b;
                img.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        this.minimapBaseImg = ctx.getImageData(0, 0, w, h);
    }

    render() {
        if (!this.container.classList.contains('hidden')) {
            this.draw();
            this.drawMinimapOverlay();
        }
        requestAnimationFrame(() => this.render());
    }

    drawMinimapOverlay() {
        const ctx = this.minimapCtx;
        ctx.putImageData(this.minimapBaseImg, 0, 0);

        // プレイヤーのドット
        ctx.fillStyle = "#0ff";
        ctx.fillRect(this.playerX - 5, this.playerY - 5, 10, 10);
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
        // 街やダンジョンの判定（中心点からの距離で判定）
        const loc = this.locations.find(l => {
            const range = (l.type === 'town') ? 1 : 0; // 街は周囲1タイルも判定内
            return Math.abs(l.x - this.playerX) <= range && Math.abs(l.y - this.playerY) <= range;
        });

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
