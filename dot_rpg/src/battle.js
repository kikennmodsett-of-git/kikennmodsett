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
            this.ui.addAction(btnText, () => {
                if (ct > 0) {
                    this.ui.log(`${skill.name} はまだ使えない！ (あと ${ct} ターン)`);
                    return;
                }
                this.executeSkill(skill);
            });
        });

        this.ui.addAction("戻る", () => this.playerTurn());
    }

    executeSkill(skill) {
        import('./skill_db.js').then(({ SkillDB }) => {
            if (skill.healing) {
                // 回復スキルの処理
                const recover = Math.floor(skill.power * (this.player.stats.attack / 8) + 10);
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + recover);
                this.ui.log(`${this.player.name} の ${skill.name}！ 体力を ${recover} 回復した。`);
                this.ui.updateHeader(this.player);
            } else {
                // 攻撃スキルの処理
                const multiplier = SkillDB.getElementalMultiplier(skill.element, this.monster.element);
                this.ui.log(`${this.player.name} の ${skill.name}！ (${skill.element}属性)`);
                if (multiplier > 1.0) this.ui.log("効果はバツグンだ！");
                if (multiplier < 1.0) this.ui.log("効果はいまひとつのようだ...");

                let damage = Math.floor(skill.power * (this.player.stats.attack / 5) * multiplier);
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
        let damage = Math.max(1, (attacker === this.player ? this.player.stats.attack : attacker.atk) * 2 - (target === this.player ? this.player.stats.defense : target.def));
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
        const success = (Math.random() * this.player.stats.agility) > (Math.random() * this.monster.spd * 0.5);
        if (success) {
            this.endBattle("うまく逃げ切れた！");
        } else {
            this.ui.log("逃げられない！");
            this.monsterTurn();
        }
    }

    monsterTurn(isDefending = false) {
        if (this.isFinished) return;

        // パッシブ発動チェック: ターン終了時
        this.triggerPassives("onTurnEnd");

        // クールタイム減少
        [...this.player.skills, ...this.player.fusedSkills].forEach(s => {
            if (s.currentCooldown > 0) s.currentCooldown--;
        });

        setTimeout(() => {
            let damage = Math.max(1, this.monster.atk * 2 - this.player.stats.defense);
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

        // レアドロップ判定 (幸運の影響)
        if (Math.random() < (0.05 + this.player.stats.luck * 0.001)) {
            this.ui.log("お宝を発見！ レアドロップ(スキル)を手に入れた！");
            // ランダムなスキル習得
            const randomSkill = window.game.skillDB[Math.floor(Math.random() * window.game.skillDB.length)];
            this.player.learnSkill(randomSkill);
        }

        // ダンジョン内なら低確率で武器を拾う
        if (this.monster.isDungeonMonster && Math.random() < 0.1) {
            this.ui.log("なんと、強力な武器を拾った！");
            this.player.weapon = { name: "ダンジョンの秘剣", atk: this.player.weapon.atk + 3 };
        }

        this.player.gold += this.monster.gold;
        if (this.player.gainExp(this.monster.exp)) {
            this.ui.log("レベルアップ！ ステータスポイントを5獲得しました。");
        }
        this.ui.updateHeader(this.player);
        this.endBattle();
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
