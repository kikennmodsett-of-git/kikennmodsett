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
            }, `border: 2px solid ${borderColor}`);
        });

        this.ui.addAction("戻る", () => this.playerTurn());
    }

    executeSkill(skill) {
        import('./skill_db.js').then(({ SkillDB }) => {
            const totalStats = this.player.getTotalStats();
            if (skill.healing) {
                // 回復スキルの処理
                const recover = Math.floor(skill.power * (totalStats.attack / 8) + 10);
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + recover);
                this.ui.log(`${this.player.name} の ${skill.name}！ 体力を ${recover} 回復した。`);
                this.ui.updateHeader(this.player);
            } else {
                // 攻撃スキルの処理
                const multiplier = SkillDB.getElementalMultiplier(skill.element, this.monster.element);
                this.ui.log(`${this.player.name} の ${skill.name}！ (${skill.element}属性)`);
                if (multiplier > 1.0) this.ui.log("効果はバツグンだ！");
                if (multiplier < 1.0) this.ui.log("効果はいまひとつのようだ...");

                let damage = Math.floor(skill.power * (totalStats.attack / 5) * multiplier);
                damage = Math.max(1, damage - Math.floor(this.monster.def / 2));

                this.monster.hp -= damage;
                this.ui.log(`${this.monster.name} に ${damage} のダメージ！`);
            }

            // CT設定
            skill.currentCooldown = skill.cooldown;

            if (this.monster.hp <= 0) {
                this.win();
            } else {
                this.monsterTurn();
            }
        });
    }

    executeAttack(attacker, target, isPlayer) {
        const totalStats = this.player.getTotalStats();
        let damage = Math.max(1, (attacker === this.player ? totalStats.attack : attacker.atk) * 2 - (target === this.player ? totalStats.defense : target.def));
        target.hp -= damage;
        this.ui.log(`${attacker.name} の攻撃！ ${target.name} に ${damage} のダメージ！`);

        if (target.hp <= 0) {
            if (isPlayer) this.win();
            else this.lose();
        } else {
            if (isPlayer) this.monsterTurn();
            else this.playerTurn();
        }
    }

    executeDefend() {
        this.ui.log(`${this.player.name} は身を固めた！`);
        this.monsterTurn(true);
    }

    executeEscape() {
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
            let damage = Math.max(1, this.monster.atk * 2 - totalStats.defense);
            if (isDefending) damage = Math.floor(damage / 2);

            this.player.hp -= damage;
            this.ui.log(`${this.monster.name} の攻撃！ ${this.player.name} は ${damage} のダメージを受けた！`);

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
        this.ui.log(`${this.monster.exp} の経験値と ${this.monster.gold} G を手に入れた。`);

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

        this.player.gold += this.monster.gold;
        if (this.player.gainExp(this.monster.exp)) {
            this.ui.log("レベルアップ！ ステータスポイントを5獲得しました。");
        }

        // 素材ドロップ判定
        const luckBonus = this.player.stats.luck * 0.001;
        const rollNormal = Math.random();
        const rollRare = Math.random();

        const dropRateNormal = 0.5 + luckBonus;
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

        // レアドロップ
        if (rollRare < dropRateRare) {
            const rareMaterialName = "幻の金属";
            this.gainMaterial(rareMaterialName, materialLevel, true);
        }

        this.ui.updateHeader(this.player);
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
        this.ui.log("目の前が真っ暗になった。");

        setTimeout(() => {
            window.game.respawnPlayer();
        }, 2000);
    }

    endBattle(customMsg) {
        if (customMsg) this.ui.log(customMsg);
        this.isFinished = true;
        this.ui.clearActionPanel();
        this.ui.addAction("探索に戻る", () => window.game.showMainMap());
    }
}
