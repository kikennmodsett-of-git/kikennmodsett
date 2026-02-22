import { Player } from './player.js';
import { UI } from './ui.js';
import { MonsterData } from './data/monsters.js';
import { QuestData } from './data/quests.js';
import { Battle } from './battle.js';
import { World } from './world.js';

class Game {
    constructor() {
        this.player = new Player("勇者");
        this.ui = new UI();
        this.world = new World(this);
        this.allMonsters = MonsterData.generateMonsters();
        this.allQuests = QuestData.generateQuests();
        this.isLastBossDefeated = false;
        this.isBattleActive = false;

        this.init();
    }

    init() {
        this.ui.log("Pixel Adventure へようこそ！");
        this.ui.log("広大な世界と300のクエスト、400以上の魔物があなたを待っています。");

        document.getElementById('btn-status').onclick = () => this.showStatus();
        document.getElementById('btn-quests').onclick = () => this.showQuests();
        document.getElementById('btn-shop').onclick = () => this.showShop();

        this.showMainMap();
        this.ui.updateHeader(this.player);
    }

    showMainMap() {
        this.isBattleActive = false;
        this.ui.clearActionPanel();
        this.ui.log("フィールドを探索中... [WASD / 矢印キーで移動]");
        this.world.show();

        if (this.isLastBossDefeated) {
            this.ui.log("世界に平和が訪れたが、冒険はまだ続く...");
        }
    }

    startRandomBattle() {
        this.isBattleActive = true;
        this.world.hide();
        // プレイヤーのレベル付近のモンスターからランダムに選ぶ
        const range = 5;
        const minLv = Math.max(1, this.player.level - range);
        const maxLv = Math.min(450, this.player.level + range + 5);
        const candidates = this.allMonsters.filter(m => m.level >= minLv && m.level <= maxLv);
        const monster = candidates[Math.floor(Math.random() * candidates.length)];

        const battle = new Battle(this.player, monster, this.ui);
        battle.start();

        if (monster.isBoss && !this.isLastBossDefeated) {
            this.isLastBossDefeated = true; // 実際には勝利時にフラグを立てるが、簡易化
        }
    }

    useInn() {
        const cost = this.player.getAdjustedCost(100);
        if (this.player.gold >= cost) {
            this.player.gold -= cost;
            this.player.hp = this.player.maxHp;
            this.ui.log(`宿屋に泊まった。HPが全回復した！ (費用: ${cost} G, 人徳割引適用)`);
            this.ui.updateHeader(this.player);
        } else {
            this.ui.log("ゴールドが足りない！");
        }
    }

    showStatus() {
        let html = `<h3>ステータス</h3>
            <p>レベル: ${this.player.level}</p>
            <p>残りポイント: ${this.player.statusPoints}</p>
            <ul>
                <li>攻撃力: ${this.player.stats.attack} <button onclick="game.allocate('attack')">+</button></li>
                <li>防御力: ${this.player.stats.defense} <button onclick="game.allocate('defense')">+</button></li>
                <li>敏捷: ${this.player.stats.agility} <button onclick="game.allocate('agility')">+</button></li>
                <li>幸運: ${this.player.stats.luck} <button onclick="game.allocate('luck')">+</button></li>
                <li>人徳: ${this.player.stats.virtue} <button onclick="game.allocate('virtue')">+</button></li>
            </ul>`;
        this.ui.showModal(html);
    }

    allocate(stat) {
        if (this.player.allocatePoint(stat)) {
            this.showStatus();
            this.ui.updateHeader(this.player);
        }
    }

    showQuests() {
        let html = "<h3>クエスト一覧 (上位10件表示)</h3><ul>";
        this.allQuests.slice(0, 10).forEach(q => {
            html += `<li>${q.title}: ${q.description} [${q.isCompleted ? '達成' : '未達成'}]</li>`;
        });
        html += "</ul>";
        this.ui.showModal(html);
    }

    showShop() {
        const itemCost = this.player.getAdjustedCost(500);
        const html = `<h3>ショップ</h3>
            <p>人徳 ${this.player.stats.virtue} の影響で価格が ${Math.floor(this.player.getDiscountRate() * 100)}% 引きです。</p>
            <p>伝説の剣: ${itemCost} G <button onclick="game.buyItem('sword', ${itemCost})">購入</button></p>`;
        this.ui.showModal(html);
    }

    buyItem(item, cost) {
        if (this.player.gold >= cost) {
            this.player.gold -= cost;
            this.ui.log(`${item} を購入した！`);
            this.ui.updateHeader(this.player);
            this.showShop();
        } else {
            this.ui.log("ゴールドが足りません。");
        }
    }
}

// グローバルに公開してHTMLのonclickから呼べるようにする
window.game = new Game();
