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
            // 中心(10, 10)からの距離によるレベル調整
            const startX = 10;
            const startY = 10;
            const dist = Math.sqrt(Math.pow(this.world.playerX - startX, 2) + Math.pow(this.world.playerY - startY, 2));

            if (dist < 50) {
                // 平原エリア (Lv.1〜25)
                const baseLv = 1 + Math.floor(dist / 2);
                minLv = Math.max(1, baseLv - 2);
                maxLv = Math.min(25, baseLv + 2);
            } else {
                // 平原の外 (Lv.26〜)
                const baseLv = 26 + Math.floor((dist - 50) / 1.5);
                minLv = baseLv - 5;
                maxLv = baseLv + 5;
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
                <li>最大体力上昇 (+5): ${this.player.stats.hp} <button onclick="game.allocate('hp')">+</button> (現在の最大HP: ${this.player.maxHp})</li>
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
        let html = "<h3>クエスト一覧 (レベル近傍)</h3><ul>";
        // プレイヤーのレベルに近いクエストを表示
        const nearbyQuests = this.allQuests.filter(q => Math.abs(q.id - this.player.level) <= 10);
        nearbyQuests.slice(0, 10).forEach(q => {
            const status = q.isCompleted ? '【達成！】' : (q.isAccepted ? '【進行中】' : `<button onclick="game.acceptQuest(${q.id})">受注する</button>`);
            html += `<li style="margin-bottom:10px;">${q.title}: ${q.description}<br>${status}</li>`;
        });
        html += "</ul>";
        this.ui.showModal(html);
    }

    acceptQuest(questId) {
        const quest = this.allQuests.find(q => q.id === questId);
        if (quest) {
            quest.isAccepted = true;
            this.ui.log(`クエスト「${quest.title}」を引き受けた！`);
            this.showQuests();
        }
    }

    openArmorShop() {
        const townLevel = Math.max(1, this.player.level);
        const discount = this.player.getDiscountRate();

        const slots = ['head', 'chest', 'legs', 'feet', 'waist'];
        const slotNames = { head: '頭装備', chest: '胸当て', legs: 'レギンス', feet: 'ブーツ', waist: '腰帯' };
        const qualities = [
            { name: "一般", mul: 1, color: "#fff", price: 500 },
            { name: "上級", mul: 2, color: "#00d4ff", price: 2000 },
            { name: "伝説", mul: 4, color: "#ffd700", price: 10000 }
        ];

        let html = `<h3>防具屋</h3><p>最高品質の装備を揃えております。</p><div class="shop-grid">`;

        slots.forEach(slot => {
            const q = qualities[Math.floor(Math.random() * qualities.length)];
            const baseStat = Math.floor(townLevel * 0.5 * q.mul) + 2;
            const price = Math.floor(q.price * (townLevel / 5 + 1) * (1 - discount));

            const armorItem = {
                type: 'armor',
                slot: slot,
                name: `[${q.name}] ${slotNames[slot]}`,
                stats: { defense: baseStat },
                price: price,
                color: q.color
            };

            if (slot === 'waist') armorItem.stats.luck = Math.floor(baseStat / 2);
            if (slot === 'feet') armorItem.stats.agility = Math.floor(baseStat / 2);

            html += `
                <div class="shop-item" style="border: 2px solid ${q.color}; padding: 10px; margin: 5px;">
                    <strong style="color: ${q.color}">${armorItem.name}</strong><br>
                    防御+${armorItem.stats.defense} ${armorItem.stats.luck ? ', 幸運+' + armorItem.stats.luck : ''}<br>
                    価格: ${price} G<br>
                    <button onclick='game.buyArmor(${JSON.stringify(armorItem)})'>購入</button>
                </div>
            `;
        });

        html += `</div><button onclick="game.ui.hideModal()">店を出る</button>`;
        this.ui.showModal(html);
    }

    buyArmor(item) {
        if (this.player.gold >= item.price) {
            this.player.gold -= item.price;
            this.player.inventory.push(item);
            this.ui.log(`${item.name} を購入しました！ インベントリから装備してください。`);
            this.ui.updateHeader(this.player);
            this.openArmorShop();
        } else {
            this.ui.log("ゴールドが足りません！");
        }
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

        this.askToUpdateRespawnPoint(town);
        this.ui.addAction("宿屋 (100G)", () => this.useInn());
        this.ui.addAction("武器屋 (鍛冶屋)", () => this.openForge());
        this.ui.addAction("防具屋", () => this.openArmorShop());
        this.ui.addAction("ギルド (依頼受諾)", () => {
            this.ui.log("【ギルド】「お主の腕に見合った依頼があるぞ。」");
            this.showQuests();
        });
        this.ui.addAction("スキル合体所", () => this.openFusionCenter());

        // NPCとの会話
        if (town.npcs) {
            town.npcs.forEach(npc => {
                this.ui.addAction(`${npc.name}と話す`, () => {
                    this.ui.log(`【${npc.name}】「${npc.message}」`);
                });
            });
        }

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
            const newAtk = this.player.equipment.weapon.atk + 5;
            this.player.equipment.weapon = { name: "強化された剣", atk: newAtk };
            this.ui.log(`新しい武器を手に入れた！ (攻撃力 +${newAtk})`);
            this.ui.updateHeader(this.player);
            this.ui.hideModal();
        } else {
            this.ui.log("ゴールドが足りない！");
        }
    }

    openFusionCenter() {
        const allSkills = [...this.player.skills, ...this.player.fusedSkills];
        if (allSkills.length < 2) {
            this.ui.log("合体にはスキルが計2つ以上必要です。");
            return;
        }
        let html = `<h3>禁断のスキル合体所</h3><p>合体させる素材を2つ選んでください。<br>(合体済みスキルも素材にできます)</p>`;
        allSkills.forEach((s) => {
            html += `<button onclick="game.selectFusion('${s.id}')" style="margin:2px;">${s.name}</button> `;
        });
        this.ui.showModal(html);
        this.fusionBuffer = [];
    }

    selectFusion(skillId) {
        const allSkills = [...this.player.skills, ...this.player.fusedSkills];
        const skill = allSkills.find(s => s.id === skillId);

        if (!skill) return;
        if (this.fusionBuffer.find(s => s.id === skillId)) {
            this.ui.log("同じスキルは選べません。");
            return;
        }

        this.fusionBuffer.push(skill);
        this.ui.log(`${skill.name}を選択しました。残り${2 - this.fusionBuffer.length}つ。`);

        if (this.fusionBuffer.length === 2) {
            const s1 = this.fusionBuffer[0];
            const s2 = this.fusionBuffer[1];
            const newSkill = FusionSystem.fuse(s1, s2);

            // 元のスキルを削除（どちらのリストにあるか不明なので両方から消す）
            this.player.skills = this.player.skills.filter(s => s.id !== s1.id && s.id !== s2.id);
            this.player.fusedSkills = this.player.fusedSkills.filter(s => s.id !== s1.id && s.id !== s2.id);

            this.player.addFusedSkill(newSkill);
            this.ui.log(`合体成功！ 新たな絶技「${newSkill.name}」を習得！`);
            this.ui.hideModal();
            this.fusionBuffer = [];
        }
    }

    // リスポーン処理
    respawnPlayer() {
        const rp = this.player.respawnPoint;
        this.player.hp = this.player.maxHp;
        this.world.playerX = rp.x;
        this.world.playerY = rp.y;
        this.ui.log(`... ${rp.name} で意識を取り戻した。`);
        this.ui.updateHeader(this.player);
        this.showMainMap();
    }

    // リスポーン地点の更新確認プロンプト
    askToUpdateRespawnPoint(town) {
        if (this.player.respawnPoint.name !== town.name) {
            this.ui.log(`[復活地点] ここを再出発の場所に設定しますか？`);
            this.ui.addAction("復活地点をここに設定する", () => {
                this.player.respawnPoint = { x: town.x, y: town.y, name: town.name };
                this.ui.log(`${town.name} を復活の場所に設定しました。`);
                this.openTownMenu(town);
            });
        }
    }
}

// グローバルに公開してHTMLのonclickから呼べるようにする
window.game = new Game();
