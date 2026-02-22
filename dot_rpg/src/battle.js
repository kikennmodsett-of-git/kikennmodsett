import { MonsterData } from './data/monsters.js';

export class Battle {
    constructor(player, monster, ui) {
        this.player = player;
        this.monster = monster;
        this.ui = ui;
        this.isFinished = false;
    }

    start() {
        this.ui.log(`${this.monster.name} (Lv.${this.monster.level}) が現れた！`);

        // レベル差チェック (10以上高い場合)
        if (MonsterData.shouldAskToBattle(this.player.level, this.monster.level)) {
            this.ui.log("注意：相手はかなりの熟練者だ... 戦いますか？");
            this.ui.clearActionPanel();
            this.ui.addAction("戦う", () => this.playerTurn());
            this.ui.addAction("立ち去る", () => this.endBattle("立ち去りました。"));
        } else {
            // 先制攻撃判定 (敏捷が高いほど先制しやすい)
            const playerFirst = (Math.random() * this.player.stats.agility) > (Math.random() * this.monster.spd);
            if (playerFirst) {
                this.ui.log(`${this.player.name} の先制攻撃！`);
                this.playerTurn();
            } else {
                this.ui.log(`${this.monster.name} の先制攻撃！`);
                this.monsterTurn();
            }
        }
    }

    playerTurn() {
        if (this.isFinished) return;
        this.ui.clearActionPanel();
        this.ui.addAction("攻撃", () => this.executeAttack(this.player, this.monster, true));
        this.ui.addAction("防御", () => this.executeDefend());
        this.ui.addAction("逃げる", () => this.executeEscape());
    }

    executeAttack(attacker, target, isPlayer) {
        // ダメージ計算: (攻撃力 * 2) - 相手の防御力 (最低ダメージ1)
        let damage = Math.max(1, (attacker === this.player ? this.player.stats.attack : attacker.atk) * 2 - (target === this.player ? this.player.stats.defense : target.def));

        target.hp -= damage;
        this.ui.log(`${attacker.name} の攻撃！ ${target.name} に ${damage} のダメージ！`);

        if (target.hp <= 0) {
            if (isPlayer) {
                this.win();
            } else {
                this.lose();
            }
        } else {
            if (isPlayer) {
                this.monsterTurn();
            } else {
                this.playerTurn();
            }
        }
    }

    executeDefend() {
        this.ui.log(`${this.player.name} は身を固めた！`);
        // 次のモンスターの攻撃のみダメージを半減させる（簡易実装）
        this.monsterTurn(true);
    }

    executeEscape() {
        // 逃走成功率: (プレイヤー敏捷 / モンスター敏捷) * 50%
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
        setTimeout(() => {
            let damage = Math.max(1, this.monster.atk * 2 - this.player.stats.defense);
            if (isDefending) damage = Math.floor(damage / 2);

            this.player.hp -= damage;
            this.ui.log(`${this.monster.name} の回避不能な一撃！ ${this.player.name} は ${damage} のダメージを受けた！`);
            this.ui.updateHeader(this.player);

            if (this.player.hp <= 0) {
                this.lose();
            } else {
                this.playerTurn();
            }
        }, 500);
    }

    win() {
        this.ui.log(`${this.monster.name} を倒した！`);
        this.ui.log(`${this.monster.exp} の経験値と ${this.monster.gold} G を手に入れた。`);

        // レアドロップ判定 (幸運の影響)
        if (Math.random() < (0.05 + this.player.stats.luck * 0.001)) {
            this.ui.log("お宝を発見！ レアドロップを手に入れた！");
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
        this.endBattle("目の前が真っ暗になった。");
        // デスペナルティなど
        this.player.hp = this.player.maxHp;
        this.ui.updateHeader(this.player);
    }

    endBattle(customMsg) {
        if (customMsg) this.ui.log(customMsg);
        this.isFinished = true;
        this.ui.clearActionPanel();
        this.ui.addAction("冒険を続ける", () => window.game.showMainMap());
    }
}
