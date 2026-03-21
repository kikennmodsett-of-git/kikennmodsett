export class World {
    constructor(game, seed = null) {
        this.game = game;
        this.ui = game.ui;
        this.seed = seed || Math.random();
        this.container = document.getElementById('world-container');
        this.canvas = document.getElementById('world-map-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.playerSprite = document.getElementById('player-sprite');
        this.coordElement = document.getElementById('player-coords');

        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d', { willReadFrequently: true });

        this.tileSize = 32;
        this.mapSize = 1000; // 1000x1000 (100万タイル)
        this.mapData = [];

        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;

        // シードベースの乱数生成器
        this.rngValue = this.seed;
        const seededRandom = () => {
            const x = Math.sin(this.rngValue++) * 10000;
            return x - Math.floor(x);
        };

        // 固定拠点 (島全体に点在)
        this.locations = [
            { id: 'town_start', name: "始まりの村", x: 500, y: 500, type: 'town', npcs: [{ name: "村長", message: "この島は四方を海に囲まれている。火山、砂漠、雪原、ジャングル...全てのバイオームを制する勇気はあるか。" }] },
            // 北東: 火山エリアの町
            { id: 'town_volcano_1', name: "マグマの砦", x: 800, y: 200, type: 'town' },
            { id: 'town_volcano_2', name: "煉獄の里", x: 900, y: 100, type: 'town' },
            // 北西: 砂漠エリアの町
            { id: 'town_desert_1', name: "砂塵の都", x: 200, y: 200, type: 'town' },
            { id: 'town_desert_2', name: "オアシス村", x: 100, y: 300, type: 'town' },
            // 南東: ジャングルエリアの町
            { id: 'town_jungle_1', name: "深緑の隠れ里", x: 800, y: 800, type: 'town' },
            { id: 'town_jungle_2', name: "精霊の森町", x: 700, y: 900, type: 'town' },
            // 南西: 極寒エリアの町
            { id: 'town_snow_1', name: "氷結の城下町", x: 200, y: 800, type: 'town' },
            { id: 'town_snow_2', name: "吹雪の宿", x: 100, y: 900, type: 'town' },
            // 平原エリア (中央部)
            { id: 'town_plain_1', name: "風車の町", x: 400, y: 600, type: 'town' },
            { id: 'town_plain_2', name: "街道の宿場", x: 600, y: 400, type: 'town' },

            { id: 'dungeon_last', name: "終焉の火口", x: 950, y: 50, type: 'dungeon', recLv: 1500 }
        ];

        // 50箇所のダンジョン・ランドマークを分散配置
        for (let i = 1; i <= 50; i++) {
            this.locations.push({
                id: `landmark_${i}`, name: `未知の遺跡 #${i}`,
                x: Math.floor(seededRandom() * 900) + 50,
                y: Math.floor(seededRandom() * 900) + 50,
                type: 'dungeon',
                recLv: i * 30
            });
        }

        this.playerX = 500;
        this.playerY = 500;
        this.isMoving = false;
        this.keys = {};
        this.isRenderLoopRunning = false;

        this.initMap(seededRandom);
        this.setupControls();
        this.updateView();
        this.render();
    }

    initMap(seededRandom) {
        // 拠点の位置をマップに展開
        const locMap = new Map();
        this.locations.forEach(l => {
            const size = (l.type === 'town') ? 5 : 2; // 街を少し大きく (5x5)
            const half = Math.floor(size / 2);
            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    locMap.set(`${l.x + dx},${l.y + dy}`, l.type);
                }
            }
        });

        const centerX = 500;
        const centerY = 500;
        const radius = 480; // 島の大まかな半径

        for (let y = 0; y < this.mapSize; y++) {
            this.mapData[y] = [];
            for (let x = 0; x < this.mapSize; x++) {
                let type = 'grass';
                const locType = locMap.get(`${x},${y}`);

                if (locType) {
                    type = locType;
                } else {
                    // 島（中心からの距離）判定
                    const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

                    // 角度に基づいて半径を変化させ、歪な形状にする
                    const angle = Math.atan2(y - centerY, x - centerX);
                    const variance = Math.sin(angle * 6) * 60 + Math.cos(angle * 4) * 30 + Math.sin(angle * 13) * 15;
                    const irregularRadius = radius + variance;

                    if (dist > irregularRadius) {
                        type = 'water';
                    } else if (dist < 80) { // 中央平原
                        type = 'grass';
                    } else {
                        // バイオーム配置
                        if (x > 500 && y < 500) type = 'volcano'; // 北東: 火山
                        else if (x <= 500 && y < 500) type = 'desert'; // 北西: 砂漠
                        else if (x > 500 && y >= 500) type = 'jungle'; // 南東: ジャングル
                        else type = 'snow'; // 南西: 極寒

                        // 所々に森や山を混ぜる (シード値を使用)
                        const localSeed = Math.sin(x * 0.1) * Math.cos(y * 0.1);
                        if (localSeed > 0.8) type = 'mountain';
                        else if (localSeed > 0.6) type = 'forest';
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
                this.toggleFullscreenMap();
            }
            this.handleMovement();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // 閉じるボタンのイベント
        document.getElementById('fullscreen-map-close').onclick = () => this.toggleFullscreenMap(false);
    }

    toggleFullscreenMap(force) {
        const container = document.getElementById('fullscreen-map-container');
        const isHidden = container.classList.contains('hidden');
        const target = (force !== undefined) ? !force : isHidden;

        if (target) {
            container.classList.remove('hidden');
            this.drawFullscreenMap();
            // 現在地もログに出す（従来通り）
            const type = this.mapData[this.playerY][this.playerX];
            const names = {
                grass: "平原", forest: "森", water: "水辺", mountain: "岩山",
                town: "街・村", dungeon: "ダンジョン", snow: "雪原", desert: "砂漠", volcano: "火山地帯",
                jungle: "ジャングル"
            };
            const typeName = names[type] || "未知の地点";
            document.getElementById('full-map-coords').textContent = `${typeName} (${this.playerX}, ${this.playerY})`;

            // 町の位置をログに一覧表示して分かりやすくする (NEW)
            this.ui.log("--- 周辺の町・村 ---");
            this.locations.filter(l => l.type === 'town').forEach(l => {
                const dist = Math.floor(Math.sqrt(Math.pow(l.x - this.playerX, 2) + Math.pow(l.y - this.playerY, 2)));
                if (dist < 300) {
                    this.ui.log(`${l.name}: (${l.x}, ${l.y}) - 距離: ${dist}`);
                }
            });
        } else {
            container.classList.add('hidden');
        }
    }

    drawFullscreenMap() {
        const canvas = document.getElementById('fullscreen-map-canvas');
        const ctx = canvas.getContext('2d');
        const size = this.mapSize;
        canvas.width = size;
        canvas.height = size;

        // ミニマップと同じ配色を使用
        const colors = {
            grass: "#2d5a27", forest: "#1a3311", water: "#1e3c5a", mountain: "#4a4a4a",
            town: "#ff0", dungeon: "#f0f", snow: "#fff", desert: "#e6be8a", volcano: "#a00",
            jungle: "#0a3d0a"
        };

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const type = this.mapData[y][x];
                ctx.fillStyle = colors[type] || "#000";
                ctx.fillRect(x, y, 1, 1);
            }
        }

        // 町の場所を白枠で囲んで強調表示 (NEW)
        this.locations.forEach(l => {
            if (l.type === 'town') {
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 2;
                ctx.strokeRect(l.x - 5, l.y - 5, 10, 10);
                ctx.fillStyle = "#ff0";
                ctx.font = "bold 12px Arial";
                ctx.fillText(l.name, l.x + 8, l.y + 4);
            } else if (l.type === 'dungeon' && l.recLv >= 1000) {
                ctx.strokeStyle = "#f0f";
                ctx.lineWidth = 3;
                ctx.strokeRect(l.x - 4, l.y - 4, 8, 8);
            }
        });

        // 現在地マーカーを大きく描画
        const pX = this.playerX;
        const pY = this.playerY;

        // 外枠（白い光）
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(pX, pY, 5, 0, Math.PI * 2);
        ctx.fill();

        // 中（赤い点）
        ctx.fillStyle = "#f00";
        ctx.beginPath();
        ctx.arc(pX, pY, 3, 0, Math.PI * 2);
        ctx.fill();

        // テキストで「YOU」と表示
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.fillText("YOU", pX, pY - 8);
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

        // 通行不可判定 (山・海)
        const targetTile = this.mapData[nextY][nextX];
        if (targetTile === 'mountain' || targetTile === 'water') return;

        this.playerX = nextX;
        this.playerY = nextY;
        this.isMoving = true;

        this.updateView();

        // 移動アニメーション後にエンカウント判定
        setTimeout(() => {
            try {
                this.isMoving = false;
                this.checkLocation();
                this.checkEncounter();
                // 押しっぱなしによる連続移動の再開
                if (!this.game.isBattleActive) {
                    this.handleMovement();
                }
            } catch (e) {
                console.error("Movement follow-up failed:", e);
                this.isMoving = false; // エラー時も確実にフラグを折る
            }
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

        // ミニマップクリックで全画面マップ表示
        this.minimapCanvas.onclick = () => this.toggleFullscreenMap(true);

        const colors = {
            grass: "#2d5a27", forest: "#1a3311", water: "#1e3c5a", mountain: "#4a4a4a",
            town: "#ff0", dungeon: "#f0f", snow: "#fff", desert: "#e6be8a", volcano: "#a00",
            jungle: "#0a3d0a"
        };

        const img = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const type = this.mapData[y][x];
                const colorStr = colors[type] || "#000";
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
        if (this.isRenderLoopRunning) return;
        this.isRenderLoopRunning = true;

        const loop = () => {
            if (!this.isRenderLoopRunning) return; // フラグが折れたらループ終了
            if (!this.container.classList.contains('hidden')) {
                this.draw();
                this.drawMinimapOverlay();
            }
            requestAnimationFrame(loop);
        };
        loop();
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
            town: "#a67c52", dungeon: "#331133", snow: "#e0f0ff", desert: "#e6be8a", volcano: "#5a1e1e",
            jungle: "#034d03"
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
                    ctx.fillStyle = "#8d6e63"; // 屋根色
                    ctx.beginPath();
                    ctx.moveTo(x * ts + 5, y * ts + ts - 5);
                    ctx.lineTo(x * ts + ts / 2, y * ts + 5);
                    ctx.lineTo(x * ts + ts - 5, y * ts + ts - 5);
                    ctx.fill();
                    ctx.strokeStyle = "#fff";
                    ctx.strokeRect(x * ts + 4, y * ts + 4, ts - 8, ts - 8);
                } else if (type === 'jungle') {
                    // 木のような装飾
                    ctx.fillStyle = "#0c2b0d";
                    ctx.fillRect(x * ts + ts / 3, y * ts + ts / 2, ts / 3, ts / 2);
                    ctx.beginPath();
                    ctx.arc(x * ts + ts / 2, y * ts + ts / 3, ts / 3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (type === 'dungeon') {
                    ctx.strokeStyle = "#ff00ff";
                    ctx.beginPath();
                    ctx.moveTo(x * ts + ts / 2, y * ts + 2);
                    ctx.lineTo(x * ts + ts - 2, y * ts + ts - 2);
                    ctx.lineTo(x * ts + 2, y * ts + ts - 2);
                    ctx.closePath();
                    ctx.stroke();
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
        this.render(); // ループを再開
    }

    hide() {
        this.container.classList.add('hidden');
        this.hideMobilePad();
        this.isRenderLoopRunning = false; // ループを物理的に停止
    }
}
