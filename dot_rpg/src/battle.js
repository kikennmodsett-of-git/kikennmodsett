import { SkillDB } from './skill_db.js';
import { MonsterData } from './data/monsters.js';

export class Battle {
    constructor(player, monster, ui) {
        this.player = player;
        this.monster = monster;
        this.ui = ui;
        this.isFinished = false;
    }

    start() {
        this.ui.clearActionPanel();
        this.renderMonster();
        this.ui.log(`${this.monster.name} (Lv.${this.monster.level}) が現れた！`);

        // 遭遇時の選択
        this.ui.addAction("戦う", () => this.initiateBattle());
        this.ui.addAction("逃げる", () => this.executeEscape());
    }

    renderMonster() {
        const m = this.monster;
        const html = `
            <div id="battle-view" style="text-align:center; padding: 20px;">
                <div class="monster-sprite ${m.shape}" style="background-color: ${m.color}; margin: 0 auto;"></div>
                <div style="margin-top: 10px; font-weight: bold;">
                    ${m.name} [属性:${m.element}] <br>
                    <span style="color: #ff4b2b;">HP: ${m.hp}</span>
                </div>
            </div>
        `;
        this.ui.log(html);
    }

    initiateBattle() {
        this.playerTurn();
    }

    playerTurn() {
        if (this.isFinished) return;
        this.ui.clearActionPanel();
        this.ui.addAction("通常攻撃", () => this.executeAttack(this.player, this.monster, true));
        this.ui.addAction("スキル選択", () => this.showSkillSelection());
        this.ui.addAction("防御", () => this.executeDefend());
        this.ui.addAction("逃げる", () => this.executeEscape());
    }

    showSkillSelection() {
        this.ui.clearActionPanel();
        const allSkills = [...this.player.skills, ...this.player.fusedSkills].filter(s => !s.isPassive);

        if (allSkills.length === 0) {
            this.ui.log("使えるアクティブスキルがない！");
            this.playerTurn();
            return;
        }

        allSkills.forEach(skill => {
            const ct = skill.currentCooldown || 0;
            const btnText = ct > 0 ? `${skill.name} (CT:${ct})` : skill.name;

            // 属性色の取得
            const elementColors = {
                "炎": "#ff4b2b", "氷": "#00d4ff", "風": "#2ecc71",
                "土": "#a67c52", "光": "#ffd700", "闇": "#9b59b6", "無": "#ecf0f1"
            };
            const borderColor = elementColors[skill.element] || "var(--accent-color)";

            this.ui.addAction(btnText, () => {
                if (ct > 0) {
                    this.ui.log(`${skill.name} はまだ使えない！ (あと ${ct} ターン)`);
                    return;
                }
                this.executeSkill(skill);
            }, `border: 2px solid ${borderColor}; color: ${skill.rarityColor || '#fff'}`);
        });

        this.ui.addAction("戻る", () => this.playerTurn());
    }

    executeSkill(skill) {
        this.ui.clearActionPanel(); // 連打防止: 選択した瞬間にボタンを消す
        if (skill.healing) {
            const totalStats = this.player.getTotalStats();
            // 回復スキルの処理
            const recover = Math.floor(skill.power * (totalStats.attack / 8) + 10);
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + recover);
            this.ui.log(`${this.player.name} の ${skill.name}！ 体力を ${recover} 回復した。`);
            this.ui.updateHeader(this.player);
        } else {
            // 回避判定 (Lv.5以上の敵)
            if (this.monster.level >= 5 && this.dodgeCheck(this.player, this.monster)) {
                this.ui.log(`${this.monster.name} は攻撃を華麗に回避した！`);
            } else {
                const totalStats = this.player.getTotalStats();
                // 攻撃スキルの処理
                const multiplier = SkillDB.getElementalMultiplier(skill.element, this.monster.element);
                this.ui.log(`${this.player.name} の ${skill.name}！ (${skill.element}属性)`);
                if (multiplier > 1.0) this.ui.log("効果はバツグンだ！");
                if (multiplier < 1.0) this.ui.log("効果はいまひとつのようだ...");

                let damage = Math.floor(skill.power * (totalStats.attack / 5) * multiplier);
                damage = Math.max(1, damage - Math.floor(this.monster.def / 2));

                this.monster.hp -= damage;
                this.ui.log(`${this.monster.name} に ${damage} のダメージ！`);

                // HP吸収効果の適用
                const lifeSteal = this.player.getSpecialEffectValue("lifeSteal");
                if (lifeSteal > 0) {
                    const heal = Math.max(1, Math.floor(damage * (lifeSteal / 100)));
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
                    this.ui.log(`[特殊効果] ダメージの一部を吸収！体力を ${heal} 回復した。`);
                    this.ui.updateHeader(this.player);
                }
            }
        }

        // CT設定
        skill.currentCooldown = skill.cooldown;

        if (this.monster.hp <= 0) {
            this.win();
        } else {
            this.monsterTurn();
        }
    }

    executeAttack(attacker, target, isPlayer) {
        if (isPlayer) this.ui.clearActionPanel(); // 連打防止

        // 回避判定
        // プレイヤーの回避: 敏捷依存
        // モンスターの回避: レベル5以上かつ敏捷依存
        const isDodged = (target === this.monster) ?
            (target.level >= 5 && this.dodgeCheck(attacker, target)) :
            this.dodgeCheck(attacker, target);

        if (isDodged) {
            this.ui.log(`${target.name} は攻撃を回避した！`);
        } else {
            const totalStats = this.player.getTotalStats();
            let damage = Math.max(1, (attacker === this.player ? totalStats.attack : attacker.atk) * 2 - (target === this.player ? totalStats.defense : target.def));
            target.hp -= damage;
            this.ui.log(`${attacker.name} の攻撃！ ${target.name} に ${damage} のダメージ！`);

            // HP吸収効果の適用 (プレイヤーが攻撃した場合のみ)
            if (isPlayer) {
                const lifeSteal = this.player.getSpecialEffectValue("lifeSteal");
                if (lifeSteal > 0) {
                    const heal = Math.max(1, Math.floor(damage * (lifeSteal / 100)));
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
                    this.ui.log(`[特殊効果] ダメージの一部を吸収！体力を ${heal} 回復した。`);
                    this.ui.updateHeader(this.player);
                }
            }
        }

        if (target.hp <= 0) {
            if (isPlayer) this.win();
            else this.lose();
        } else {
            if (isPlayer) this.monsterTurn();
            else this.playerTurn();
        }
    }

    // 回避判定ロジック
    dodgeCheck(attacker, defender) {
        const totalStats = this.player.getTotalStats();
        const atkSpd = (attacker === this.player) ? totalStats.agility : attacker.spd;
        const defSpd = (defender === this.player) ? totalStats.agility : defender.spd;

        // 敏捷の差に基づいた回避率 (最大30%)
        const baseDodgeRate = 0.05; // 基本5%
        const speedBonus = Math.max(0, (defSpd - atkSpd) * 0.01);
        const dodgeRate = Math.min(0.30, baseDodgeRate + speedBonus);

        return Math.random() < dodgeRate;
    }

    executeDefend() {
        this.ui.clearActionPanel(); // 連打防止
        this.ui.log(`${this.player.name} は身を固めた！`);
        this.monsterTurn(true);
    }

    executeEscape() {
        this.ui.clearActionPanel(); // 連打防止
        const totalStats = this.player.getTotalStats();
        const success = (Math.random() * totalStats.agility) > (Math.random() * this.monster.spd * 0.5);
        if (success) {
            this.endBattle("うまく逃げ切れた！");
        } else {
            this.ui.log("逃げられない！");
            this.monsterTurn();
        }
    }

    monsterTurn(isDefending = false) {
        if (this.isFinished) return;
        const totalStats = this.player.getTotalStats();

        // パッシブ発動チェック: ターン終了時
        this.triggerPassives("onTurnEnd");

        // クールタイム減少
        [...this.player.skills, ...this.player.fusedSkills].forEach(s => {
            if (s.currentCooldown > 0) s.currentCooldown--;
        });

        setTimeout(() => {
            if (this.isFinished) return; // すでに勝利/逃走している場合は中止

            // 回避判定
            if (this.dodgeCheck(this.monster, this.player)) {
                this.ui.log(`${this.player.name} は攻撃を回避した！`);
            } else {
                let damage = Math.max(1, this.monster.atk * 2 - totalStats.defense);
                if (isDefending) damage = Math.floor(damage / 2);

                this.player.hp -= damage;
                this.ui.log(`${this.monster.name} の攻撃！ ${this.player.name} は ${damage} のダメージを受けた！`);
            }

            // パッシブ発動チェック: ダメージを受けた時
            this.triggerPassives("onDamageTaken");

            this.ui.updateHeader(this.player);

            if (this.player.hp <= 0) {
                this.lose();
            } else {
                this.playerTurn();
            }
        }, 500);
    }

    triggerPassives(trigger) {
        const passives = [...this.player.skills, ...this.player.fusedSkills].filter(s => s.isPassive && s.trigger === trigger);
        passives.forEach(s => {
            this.ui.log(`[パッシブ発動] ${s.name}！`);
            // 簡易的なパッシブ効果: HPを固定で少し回復する、または次の攻撃力を上げる（メッセージのみ）
            if (trigger === "onTurnEnd") {
                const recover = Math.floor(this.player.maxHp * 0.05);
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + recover);
                this.ui.log(`体力が ${recover} 回復した。`);
            }
        });
    }

    win() {
        this.ui.log(`${this.monster.name} を倒した！`);

        // 特殊効果によるボーナス計算
        const expBoost = this.player.getSpecialEffectValue("expBoost");
        const goldBoost = this.player.getSpecialEffectValue("goldBoost");

        const finalExp = Math.floor(this.monster.exp * (1 + expBoost / 100));
        const finalGold = Math.floor(this.monster.gold * (1 + goldBoost / 100));

        this.ui.log(`${finalExp} の経験値と ${finalGold} G を手に入れた。${expBoost > 0 ? `(ボーナス+${expBoost}%)` : ""}`);

        // クエスト進行チェック
        window.game.allQuests.forEach(q => {
            if (q.isAccepted && !q.isCompleted && q.targetMonsterLevel === this.monster.level) {
                q.currentCount++;
                this.ui.log(`クエスト進行: ${q.title} (${q.currentCount}/${q.requiredCount})`);
                if (q.currentCount >= q.requiredCount) {
                    q.isCompleted = true;
                    this.player.gold += q.rewardGold;
                    this.player.gainExp(q.rewardExp);
                    this.ui.log(`【クエスト達成！】報酬 ${q.rewardGold} G と ${q.rewardExp} EXP を獲得した。`);
                }
            }
        });

        this.player.gold += finalGold;
        if (this.player.gainExp(finalExp)) {
            this.ui.log("レベルアップ！ ステータスポイントを5獲得しました。");
        }

        // 素材ドロップ判定
        const luckBonus = this.player.stats.luck * 0.01; // 幸運ボーナスの影響を10倍に強化
        const rollNormal = Math.random();
        const rollRare = Math.random();

        const dropRateNormal = 0.75 + luckBonus;
        const dropRateRare = 0.05 + luckBonus;

        const materialLevel = Math.floor(this.monster.level / 5) + 1;

        // 通常ドロップ
        if (rollNormal < dropRateNormal) {
            const materialName = this.monster.element === "炎" ? "火炎石" :
                this.monster.element === "氷" ? "氷結晶" :
                    this.monster.element === "風" ? "疾風羽" :
                        this.monster.element === "土" ? "大地岩" :
                            this.monster.element === "光" ? "光輝砂" :
                                this.monster.element === "闇" ? "闇影核" : "魔力屑";

            this.gainMaterial(materialName, materialLevel, false);
        }

        // レアドロップ判定 (80通りの名前候補を動的に生成)
        if (rollRare < dropRateRare) {
            const rarePrefixes = ["神聖な", "呪われた", "いにしえの", "黄金の", "暗黒の", "輝く", "震える", "静かな", "荒ぶる", "高貴な"]; // 10
            const rareBases = ["大剣", "盾", "首飾り", "指輪", "魔導書", "宝珠", "結晶", "聖遺物"]; // 8 -> 計80通り

            const pIdx = Math.floor(Math.random() * rarePrefixes.length);
            const bIdx = Math.floor(Math.random() * rareBases.length);
            const rareItemName = `${rarePrefixes[pIdx]}${this.monster.element}の${rareBases[bIdx]}`;

            this.gainMaterial(rareItemName, materialLevel, true);
        }

        // --- アクセサリドロップ判定 (NEW) ---
        const rollAcc = Math.random();
        const dropRateAcc = 0.03 + luckBonus; // 基礎3% + 幸運

        if (rollAcc < dropRateAcc) {
            const accNames = ["お守り", "リング", "ネックレス", "ピアス", "ブレスレット", "アンクレット"];
            const accPrefixes = ["光る", "重厚な", "神秘的な", "古びた", "魔力漂う"];
            const name = `${accPrefixes[Math.floor(Math.random() * accPrefixes.length)]}${accNames[Math.floor(Math.random() * accNames.length)]}`;

            // レアリティ判定 (基本1, ラッキーで上昇)
            let rarity = 1;
            if (Math.random() < 0.1 + luckBonus * 0.05) rarity = 2;
            if (Math.random() < 0.02 + luckBonus * 0.02) rarity = 3;

            const accessory = {
                type: 'accessory',
                name: name,
                element: this.monster.element,
                level: materialLevel,
                stats: {
                    defense: Math.floor(this.monster.level / 10) + 1,
                    luck: Math.floor(Math.random() * 3) + 1
                },
                effects: null,
                rarity: rarity
            };

            // 1%の確率で特殊効果を付与
            if (Math.random() < 0.01) {
                const effects = [
                    { key: "expBoost", value: 10, label: "経験値+10%" },
                    { key: "lifeSteal", value: 5, label: "HP吸収+5%" },
                    { key: "goldBoost", value: 15, label: "獲得G+15%" }
                ];
                const effect = effects[Math.floor(Math.random() * effects.length)];
                accessory.effects = { [effect.key]: effect.value };
                accessory.name = `[極]${accessory.name}`;
                this.ui.log(`<span style="color: #ff00ff; font-weight: bold;">超レア！特殊効果付きアクセサリ「${accessory.name}」を入手！ (${effect.label})</span>`);
            } else {
                this.ui.log(`<span style="color: #00ff00;">アクセサリ「${accessory.name}」を入手した！</span>`);
            }

            this.player.inventory.push(accessory);
        }

        this.ui.updateHeader(this.player);
        window.game.saveGame('auto'); // 戦闘勝利時にオートセーブ
        this.endBattle();
    }

    gainMaterial(name, level, isRare) {
        const key = `${name}(Lv.${level})`;
        if (!this.player.materials[key]) {
            this.player.materials[key] = { count: 0, level: level, isRare: isRare, baseName: name };
        }
        this.player.materials[key].count++;

        const color = isRare ? "#ffff00" : "#ffffff";
        const msg = `<span style="color: ${color}">${name} Lv.${level} を手に入れた！</span>`;
        this.ui.log(msg);
    }

    lose() {
        this.ui.log(`${this.player.name} は力尽きた...`);
        this.isFinished = true;
        this.ui.clearActionPanel();

        // セーブデータの存在確認
        const hasSave = localStorage.getItem('pixel_adventure_save_manual') ||
            localStorage.getItem('pixel_adventure_save_auto') ||
            localStorage.getItem('pixel_adventure_save');

        if (hasSave) {
            this.ui.log("<span style='color:#ff4b2b;'>【敗北】力尽きました。冒険を再開するにはデータをロードしてください。</span>");
            this.ui.addAction("データをロードして再開", () => {
                window.game.showGameOverMenu(); // 専用のゲームオーバーメニュー（スロット選択）を表示
            }, "background: #ff4b2b; font-weight: bold;");
        } else {
            this.ui.log("<span style='color:#ff4b2b;'>【敗北】力尽きました。セーブデータがないため、初期地点から復帰します。</span>");
            this.ui.addAction("始まりの町で復活する", () => {
                window.game.respawnPlayer();
            }, "background: #2ecc71; font-weight: bold;");
        }
    }

    endBattle(customMsg) {
        if (customMsg) this.ui.log(customMsg);
        this.isFinished = true;
        this.ui.clearActionPanel();
        this.ui.addAction("探索に戻る", () => window.game.showMainMap());
    }
}
