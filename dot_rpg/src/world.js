export class World {
    constructor(game) {
        this.game = game;
        this.ui = game.ui;
        this.container = document.getElementById('world-container');
        this.mapElement = document.getElementById('world-map');
        this.playerSprite = document.getElementById('player-sprite');

        this.tileSize = 32;
        this.mapSize = 50; // 50x50タイル
        this.playerX = 25; // 初期位置
        this.playerY = 25;

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
            for (let x = 0; x < this.mapSize; x++) {
                const tile = document.createElement('div');
                tile.className = 'tile grass';
                // ランダムに山や森を置く
                const rand = Math.random();
                if (rand < 0.1) tile.classList.add('forest');
                else if (rand < 0.15) tile.classList.add('mountain');

                this.mapElement.appendChild(tile);
            }
        }
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

        this.playerX = nextX;
        this.playerY = nextY;
        this.isMoving = true;

        this.updateView();

        // 移動アニメーション後にエンカウント判定
        setTimeout(() => {
            this.isMoving = false;
            this.checkEncounter();
            // 押しっぱなし対応
            this.handleMovement();
        }, 150);
    }

    updateView() {
        // プレイヤースプライトの位置を更新
        this.playerSprite.style.left = `${this.playerX * this.tileSize}px`;
        this.playerSprite.style.top = `${this.playerY * this.tileSize}px`;

        // カメラ（スクロール）の計算
        // プレイヤーが中央に来るようにマップを動かす
        const containerWidth = this.container.offsetWidth;
        const containerHeight = this.container.offsetHeight;

        const offsetX = (containerWidth / 2) - (this.playerX * this.tileSize) - (this.tileSize / 2);
        const offsetY = (containerHeight / 2) - (this.playerY * this.tileSize) - (this.tileSize / 2);

        this.mapElement.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        this.playerSprite.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }

    checkEncounter() {
        // 10%の確率でエンカウント
        if (Math.random() < 0.1) {
            this.game.startRandomBattle();
        }
    }

    show() {
        this.container.classList.remove('hidden');
        this.updateView();
    }

    hide() {
        this.container.classList.add('hidden');
    }
}
