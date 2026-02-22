export class World {
    constructor(game) {
        this.game = game;
        this.ui = game.ui;
        this.container = document.getElementById('world-container');
        this.mapElement = document.getElementById('world-map');
        this.playerSprite = document.getElementById('player-sprite');

        this.tileSize = 32;
        this.mapSize = 120; // 120x120へさらに拡大
        this.mapData = [];

        // 固定オブジェクト（町、ダンジョン）
        this.locations = [
            {
                id: 'town_start', name: "始まりの町", x: 10, y: 10, type: 'town',
                npcs: [
                    { name: "村長", message: "ようこそ！外の世界は属性相性が重要じゃ。炎は氷に強いぞ。" },
                    { name: "旅人", message: "パッシブスキルは自動で発動する便利な力だよ。" }
                ]
            },
            {
                id: 'town_central', name: "中央都市", x: 50, y: 50, type: 'town',
                npcs: [
                    { name: "兵士", message: "この先のダンジョンは推奨Lv.90だ。心して行け。" },
                    { name: "吟遊詩人", message: "光と闇は互いに反発し合う運命にあります..." }
                ]
            },
            {
                id: 'town_snow', name: "雪原の村", x: 20, y: 80, type: 'town',
                npcs: [
                    { name: "老人", message: "ここは常に雪が降っておる。氷の属性に耐性がないと厳しいぞ。" }
                ]
            },
            {
                id: 'town_desert', name: "砂漠の宿場町", x: 90, y: 20, type: 'town',
                npcs: [
                    { name: "商人", message: "灼熱の砂漠へようこそ！炎系統のスキルが大人気です。" }
                ]
            },
            {
                id: 'town_last_hope', name: "最後の希望の地", x: 100, y: 100, type: 'town',
                npcs: [
                    { name: "予言者", message: "ついにここまで来ましたか... 邪悪なる龍の目覚めは近いです。" }
                ]
            },
            { id: 'dungeon_1', name: "試練の洞窟", x: 15, y: 20, type: 'dungeon', recLv: 5 },
            { id: 'dungeon_2', name: "魔物の森", x: 45, y: 15, type: 'dungeon', recLv: 25 },
            { id: 'dungeon_snow', name: "氷結の神殿", x: 25, y: 95, type: 'dungeon', recLv: 50 },
            { id: 'dungeon_fire', name: "紅蓮の火山", x: 95, y: 30, type: 'dungeon', recLv: 75 },
            { id: 'dungeon_last', name: "ラストダンジョン", x: 110, y: 110, type: 'dungeon', recLv: 150 }
        ];
        this.playerX = 10;
        this.playerY = 10;

        this.isMoving = false;
        this.keys = {};

        this.initMap();
        this.setupControls();
    }

    initMap() {
        this.mapElement.style.gridTemplateColumns = `repeat(${this.mapSize}, ${this.tileSize}px)`;
        this.mapElement.style.gridTemplateRows = `repeat(${this.mapSize}, ${this.tileSize}px)`;

        // 簡易マップ生成
        for (let y = 0; y < this.mapSize; y++) {
            this.mapData[y] = [];
            for (let x = 0; x < this.mapSize; x++) {
                let type = 'grass';
                const loc = this.locations.find(l => l.x === x && l.y === y);
                if (loc) {
                    type = loc.type;
                } else if (Math.random() < 0.1) {
                    type = 'forest';
                } else if (Math.random() < 0.05) {
                    type = 'mountain';
                }

                const tile = document.createElement('div');
                tile.className = `tile ${type}`;
                if (loc) {
                    tile.title = `${loc.name}${loc.recLv ? ` (推奨Lv:${loc.recLv})` : ''}`;
                    if (loc.type === 'dungeon') tile.innerHTML = '<span class="loc-tag">LV.' + loc.recLv + '</span>';
                }

                this.mapElement.appendChild(tile);
                this.mapData[y][x] = type;
            }
        }
        // プレイヤーのグラフィック強化（CSSクラス名で管理）
        this.playerSprite.className = 'hero-visual';
        this.updateView();
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
        // プレイヤースプライトの位置を更新
        const containerWidth = this.container.offsetWidth;
        const containerHeight = this.container.offsetHeight;

        const pLeft = this.playerX * this.tileSize;
        const pTop = this.playerY * this.tileSize;

        const offsetX = (containerWidth / 2) - pLeft - (this.tileSize / 2);
        const offsetY = (containerHeight / 2) - pTop - (this.tileSize / 2);

        this.mapElement.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        // プレイヤースプライトはコンテナ上の固定位置（中央）にするか、マップ上の絶対座標にするか。
        // ここではマップと共に動く（transformで補正）
        this.playerSprite.style.left = `${pLeft}px`;
        this.playerSprite.style.top = `${pTop}px`;
        this.playerSprite.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
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
