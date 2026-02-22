import { Player } from './player.js';
import { UI } from './ui.js';
import { MonsterData } from './data/monsters.js';
import { QuestData } from './data/quests.js';
import { Battle } from './battle.js';
import { World } from './world.js';
import { Inventory } from './inventory.js';
import { SkillDB } from './skill_db.js';
import { FusionSystem } from './fusion.js';

class Game {
    constructor() {
        this.player = new Player("勇者");
        this.ui = new UI();
        this.world = new World(this);
        this.inventory = new Inventory(this.player, this.ui);
        this.skillDB = SkillDB.generateSkills();
        this.allMonsters = MonsterData.generateMonsters();
        this.allQuests = QuestData.generateQuests();
        this.isLastBossDefeated = false;
        this.isBattleActive = false;

        this.init();
    }

    init() {
        this.ui.log("Pixel Adventure Ver 2.0 へようこそ！");
        this.ui.log("WASDで町を探索し、ダンジョンへ挑みましょう。");

        // 初期スキル習得
        this.player.learnSkill(this.skillDB[0]);
        this.player.learnSkill(this.skillDB[10]);

        document.getElementById('btn-status').onclick = () => this.inventory.showMainMenu();
        document.getElementById('btn-quests').onclick = () => this.showQuests();
        document.getElementById('btn-shop').onclick = () => this.ui.log("町の中で施設を利用してください。");

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

    startRandomBattle(targetLv = null) {
        this.isBattleActive = true;
        this.world.hide();

        let minLv, maxLv;

        if (targetLv) {
            // ダンジョンなどの指定レベルがある場合
            minLv = Math.max(1, targetLv - 2);
            maxLv = targetLv + 5;
        } else {
            // 町(10, 10)からの距離によるレベル調整
            const startX = 10;
            const startY = 10;
            const dist = Math.abs(this.world.playerX - startX) + Math.abs(this.world.playerY - startY);

            // 距離に応じて基本レベルを決定 (町付近は Lv.1〜3)
            const baseLv = 1 + Math.floor(dist / 3);
            minLv = Math.max(1, baseLv - 1);
            maxLv = baseLv + 3;

            // 始まりの町(10, 10)のごく近所(距離5以内)は超安全
            if (dist < 5) {
                minLv = 1;
                maxLv = 3;
            }
        }

        const candidates = this.allMonsters.filter(m => m.level >= minLv && m.level <= maxLv && !m.isBoss);
        const monster = candidates.length > 0
            ? JSON.parse(JSON.stringify(candidates[Math.floor(Math.random() * candidates.length)])) // インスタンスを壊さないためにコピー
            : JSON.parse(JSON.stringify(this.allMonsters[0]));

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

    openTownMenu(town) {
        this.ui.clearActionPanel();
        this.ui.log(`${town.name}に滞在中。`);
        this.ui.addAction("宿屋 (100G)", () => this.useInn());
        this.ui.addAction("鍛冶屋", () => this.openForge());
        this.ui.addAction("スキル合体所", () => this.openFusionCenter());
        this.ui.addAction("出発する", () => this.showMainMap());
    }

    openDungeonMenu(dungeon) {
        this.ui.clearActionPanel();
        this.ui.log(`${dungeon.name}の入口。 推奨Lv: ${dungeon.recLv}`);
        this.ui.addAction("探索する", () => this.enterDungeon(dungeon));
        this.ui.addAction("立ち去る", () => this.showMainMap());
    }

    enterDungeon(dungeon) {
        this.ui.log(`${dungeon.name}を探索している...`);
        // ダンジョン内ではエンカウント率アップなどの処理
        setTimeout(() => this.startRandomBattle(dungeon.recLv), 500);
    }

    openForge() {
        const cost = this.player.getAdjustedCost(1000);
        const html = `<h3>鍛冶屋</h3>
            <p>新しい武器を打つことができます。 (費用: ${cost} G)</p>
            <button onclick="game.craftWeapon(${cost})">武器を作る</button>`;
        this.ui.showModal(html);
    }

    craftWeapon(cost) {
        if (this.player.gold >= cost) {
            this.player.gold -= cost;
            const newAtk = this.player.weapon.atk + 5;
            this.player.weapon = { name: "強化された剣", atk: newAtk };
            this.ui.log(`新しい武器を手に入れた！ (攻撃力 +${newAtk})`);
            this.ui.updateHeader(this.player);
            this.ui.hideModal();
        } else {
            this.ui.log("ゴールドが足りない！");
        }
    }

    openFusionCenter() {
        if (this.player.skills.length < 2) {
            this.ui.log("合体にはスキルが2つ以上必要です。");
            return;
        }
        let html = `<h3>スキル合体所</h3><p>合体させるスキルを選んでください。</p>`;
        this.player.skills.forEach((s, idx) => {
            html += `<button onclick="game.selectFusion(${idx})">${s.name}</button> `;
        });
        this.ui.showModal(html);
        this.fusionBuffer = [];
    }

    selectFusion(idx) {
        const skill = this.player.skills[idx];
        this.fusionBuffer.push(skill);
        this.ui.log(`${skill.name}を選択しました。`);
        if (this.fusionBuffer.length === 2) {
            const newSkill = FusionSystem.fuse(this.fusionBuffer[0], this.fusionBuffer[1]);
            this.player.addFusedSkill(newSkill);
            this.ui.log(`合体成功！ 新スキル「${newSkill.name}」を習得！`);
            this.ui.hideModal();
        }
    }
}

// グローバルに公開してHTMLのonclickから呼べるようにする
window.game = new Game();
