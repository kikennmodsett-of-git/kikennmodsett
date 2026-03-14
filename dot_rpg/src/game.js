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
    static isInitialized = false;
    constructor() {
        if (Game.isInitialized) return;
        Game.isInitialized = true;

        this.player = new Player("勇者");
        this.ui = new UI();
        this.worldSeed = Math.random();
        this.world = new World(this, this.worldSeed);
        this.inventory = new Inventory(this.player, this.ui);
        this.skillDB = SkillDB.generateSkills();
        this.allMonsters = MonsterData.generateMonsters();
        this.allQuests = QuestData.generateQuests();
        this.isLastBossDefeated = false;
        this.isBattleActive = false;
        this.isLoaded = false;
        this.isLoading = false;

        this.init();
    }

    init() {
        this.ui.log("Pixel Adventure Ver 2.0 へようこそ！");
        this.ui.log("WASDで町を探索し、ダンジョンへ挑みましょう。");

        document.getElementById('btn-status').onclick = () => this.inventory.showMainMenu();
        document.getElementById('btn-quests').onclick = () => this.showQuests();
        document.getElementById('btn-save').onclick = () => this.saveGame('manual');

        // 起動時にロードを試行
        this.loadGame();

        // 初期スキル習得 (ロードしていない場合のみ)
        if (!this.isLoaded) {
            this.player.learnSkill(this.skillDB[0]);
            this.player.learnSkill(this.skillDB[3]);
        }

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
        this.saveGame('auto'); // 戦闘開始時点の状態を保存（不整合防止）

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
            this.saveGame('auto'); // オートセーブ
            this.showQuests();
        }
    }

    openShop() {
        const discount = this.player.getDiscountRate();

        const items = [
            { type: 'weapon', name: "青銅の剣", atk: 10, price: 1000 },
            { type: 'weapon', name: "鉄の剣", atk: 25, price: 3000 },
            { type: 'weapon', name: "炎の剣", atk: 40, price: 8000, element: "炎" },
            { type: 'armor', slot: 'chest', name: "水の鎧", stats: { defense: 15 }, price: 6000, element: "氷" },
            { type: 'armor', slot: 'waist', name: "光の腰帯", stats: { defense: 5, luck: 10 }, price: 12000, element: "光", isRare: true },
            { type: 'armor', slot: 'head', name: "鉄の兜", stats: { defense: 5 }, price: 800 },
            { type: 'armor', slot: 'chest', name: "鉄の胸当て", stats: { defense: 12 }, price: 2000 },
            { type: 'armor', slot: 'legs', name: "鉄の具足", stats: { defense: 8 }, price: 1500 },
            { type: 'armor', slot: 'feet', name: "鉄のブーツ", stats: { defense: 4, agility: 2 }, price: 1000 },
            { type: 'armor', slot: 'waist', name: "鉄の腰帯", stats: { defense: 3, luck: 2 }, price: 800 }
        ];

        let html = `<h3>総合ショップ</h3><p>厳選された装備品です。</p><div class="shop-grid">`;

        items.forEach((item, idx) => {
            const price = Math.floor(item.price * (1 - discount));
            const statText = item.type === 'weapon' ? `攻撃+${item.atk}` :
                Object.entries(item.stats).map(([k, v]) => `${k}+${v}`).join(', ');

            html += `
                <div class="shop-item" style="border: 1px solid var(--accent-color); padding: 10px; margin: 5px;">
                    <strong>${item.name}</strong><br>
                    ${statText}<br>
                    価格: ${price} G<br>
                    <button onclick='game.buyShopItem(${JSON.stringify(item)}, ${price})'>購入</button>
                </div>
            `;
        });

        html += `</div><button onclick="game.ui.hideModal()">店を出る</button>`;
        this.ui.showModal(html);
    }

    buyShopItem(item, price) {
        if (this.player.gold >= price) {
            this.player.gold -= price;
            if (item.type === 'weapon') {
                this.player.inventory.push({ ...item, type: 'weapon' }); // 武器もインベントリへ
            } else {
                this.player.inventory.push(item);
            }
            this.ui.log(`${item.name} を購入しました！`);
            this.ui.updateHeader(this.player);
            this.openShop();
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
        this.ui.addAction("ショップ (武器・防具)", () => this.openShop());
        this.ui.addAction("鍛冶屋 (製作)", () => this.openForge());
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
        let html = `<h3>鍛冶屋</h3><p>手持ちの素材を組み合わせて装備を作ります。</p>`;
        html += `<div id="forge-selection">
            <button onclick="window.game.selectForgeCategory('weapon')">武器を作る</button>
            <button onclick="window.game.selectForgeCategory('armor')">防具を作る</button>
        </div>
        <div id="forge-dynamic-area" style="margin-top: 15px;"></div>
        <button onclick="game.ui.hideModal()" style="margin-top:10px;">店を出る</button>`;
        this.ui.showModal(html);
        this.forgeData = { category: '', materials: {} };
    }

    selectForgeCategory(cat) {
        this.forgeData.category = cat;
        this.updateForgeUI();
    }

    updateForgeUI() {
        const area = document.getElementById('forge-dynamic-area');
        if (!area) return;

        let html = `<h4>${this.forgeData.category === 'weapon' ? '武器' : '防具'}の素材選択</h4>`;
        const mats = Object.entries(this.player.materials).filter(([_, m]) => m.count > 0);

        if (mats.length === 0) {
            html += "<p>素材を持っていません。</p>";
        } else {
            html += `<div style="max-height: 200px; overflow-y: auto; border: 1px solid #444; padding: 5px;">`;
            mats.forEach(([key, m]) => {
                const selectedCount = this.forgeData.materials[key] || 0;
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; border-bottom: 1px solid #333;">
                        <span>${key} (所持:${m.count})</span>
                        <div>
                            <button onclick="window.game.changeForgeMat('${key}', -1)">-</button>
                            <span style="width: 20px; display: inline-block; text-align: center;">${selectedCount}</span>
                            <button onclick="window.game.changeForgeMat('${key}', 1)">+</button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        const totalSelected = Object.values(this.forgeData.materials).reduce((a, b) => a + b, 0);
        if (totalSelected > 0) {
            html += `<button onclick="window.game.executeForge()" style="margin-top:10px; width:100%; background: #ffaa00; font-weight: bold;">製作を開始する</button>`;
        }
        area.innerHTML = html;
    }

    changeForgeMat(key, diff) {
        const count = this.forgeData.materials[key] || 0;
        const newCount = Math.max(0, Math.min(this.player.materials[key].count, count + diff));
        if (newCount === 0) delete this.forgeData.materials[key];
        else this.forgeData.materials[key] = newCount;
        this.updateForgeUI();
    }

    executeForge() {
        const mats = this.forgeData.materials;
        let totalPower = 0;
        let elements = new Set();
        let nameParts = [];

        for (const [key, count] of Object.entries(mats)) {
            const m = this.player.materials[key];
            totalPower += m.level * count;
            if (m.baseName !== "魔力屑" && m.baseName !== "幻の金属") {
                elements.add(this.getElementFromName(m.baseName));
            }
            if (count >= 5) nameParts.push(m.baseName.replace("石", "").replace("晶", ""));
            this.player.materials[key].count -= count;
        }

        const isWeapon = this.forgeData.category === 'weapon';
        let element = elements.size > 0 ? Array.from(elements)[0] : "無";

        // デュアル属性判定 (2種類以上の属性素材があり、かつ低確率)
        if (elements.size >= 2 && Math.random() < 0.3) {
            const elArray = Array.from(elements);
            element = `${elArray[0]}・${elArray[1]}`;
            totalPower *= 1.2; // ボーナス
        }

        const baseName = nameParts.length > 0 ? nameParts[0] : (isWeapon ? "なまくら" : "お古");
        const finalName = `${baseName}の${isWeapon ? '鍛造剣' : '特製鎧'}`;

        const newItem = isWeapon ? {
            type: 'weapon',
            name: finalName,
            atk: Math.floor(totalPower * 2.5),
            element: element
        } : {
            type: 'armor',
            slot: 'chest',
            name: finalName,
            stats: { defense: Math.floor(totalPower * 1.5) },
            element: element
        };

        this.player.inventory.push(newItem);
        this.ui.log(`${finalName} (${element}属性) を作り上げた！`);
        this.ui.updateHeader(this.player);
        this.ui.hideModal();
    }

    getElementFromName(name) {
        const map = { "火炎石": "炎", "氷結晶": "氷", "疾風羽": "風", "大地岩": "土", "光輝砂": "光", "闇影核": "闇" };
        return map[name] || "無";
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
            this.saveGame('auto'); // オートセーブ
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

    // セーブ処理
    saveGame(type = 'manual') {
        const saveData = {
            updatedAt: Date.now(),
            player: {
                name: this.player.name,
                level: this.player.level,
                exp: this.player.exp,
                nextLevelExp: this.player.nextLevelExp,
                hp: this.player.hp,
                maxHp: this.player.maxHp,
                gold: this.player.gold,
                statusPoints: this.player.statusPoints,
                stats: this.player.stats,
                skills: this.player.skills,
                fusedSkills: this.player.fusedSkills,
                equipment: this.player.equipment,
                inventory: this.player.inventory,
                materials: this.player.materials,
                respawnPoint: this.player.respawnPoint,
                playerX: this.world.playerX,
                playerY: this.world.playerY
            },
            worldSeed: this.worldSeed,
            quests: this.allQuests.map(q => ({
                id: q.id,
                isAccepted: q.isAccepted,
                isCompleted: q.isCompleted,
                currentCount: q.currentCount
            })),
            isLastBossDefeated: this.isLastBossDefeated
        };

        const key = type === 'manual' ? 'pixel_adventure_save_manual' : 'pixel_adventure_save_auto';

        // 非同期風に実行してメインスレッドの詰まりを軽減
        setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify(saveData));
                const msg = type === 'manual' ? "【システム】データをセーブしました。" : "【システム】オートセーブ完了。";
                this.ui.log(msg);
            } catch (e) {
                console.error("Save failed:", e);
                this.ui.log("【システム】セーブに失敗しました。");
            }
        }, 0);
    }

    // ロード処理
    loadGame() {
        if (this.isBattleActive || this.isLoading) return; // 戦闘中やロード中は重複実行を制限
        this.isLoading = true;
        const manualJson = localStorage.getItem('pixel_adventure_save_manual');
        const autoJson = localStorage.getItem('pixel_adventure_save_auto');

        // 以前のキーも考慮（マイグレーション）
        const oldJson = localStorage.getItem('pixel_adventure_save');
        let manualData = manualJson ? JSON.parse(manualJson) : (oldJson ? JSON.parse(oldJson) : null);
        let autoData = autoJson ? JSON.parse(autoJson) : null;

        let data = null;
        if (manualData && autoData) {
            data = manualData.updatedAt > autoData.updatedAt ? manualData : autoData;
        } else {
            data = manualData || autoData;
        }

        if (!data) return;

        try {
            // プレイヤーデータの復元
            Object.assign(this.player, data.player);

            // ワールドシードと座標復元
            // インスタンスを再作成せず、既存のworldを更新する（重要：描画ループ重複回避）
            this.worldSeed = data.worldSeed || Math.random();
            this.world.seed = this.worldSeed;
            this.world.rngValue = this.worldSeed;
            this.world.playerX = data.player.playerX;
            this.world.playerY = data.player.playerY;

            // マップデータの再初期化が必要
            const seededRandom = () => {
                const x = Math.sin(this.world.rngValue++) * 10000;
                return x - Math.floor(x);
            };
            this.world.initMap(seededRandom);
            this.world.updateView();

            this.isLoaded = true;

            // クエスト状況の復元
            data.quests.forEach(savedQ => {
                const quest = this.allQuests.find(q => q.id === savedQ.id);
                if (quest) {
                    quest.isAccepted = savedQ.isAccepted;
                    quest.isCompleted = savedQ.isCompleted;
                    quest.currentCount = savedQ.currentCount;
                }
            });

            this.isLastBossDefeated = data.isLastBossDefeated || false;

            this.ui.log("【システム】セーブデータをロードしました！冒険の再開です。");
            this.ui.updateHeader(this.player);
        } catch (e) {
            console.error("Load failed:", e);
            this.ui.log("【システム】セーブデータが壊れています。");
        } finally {
            this.isLoading = false;
        }
    }
}

// グローバルに公開してHTMLのonclickから呼べるようにする
window.game = new Game();
