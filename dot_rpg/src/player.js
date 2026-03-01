export class Player {
    constructor(name) {
        this.name = name;
        this.level = 1;
        this.exp = 0;
        this.nextLevelExp = 100;

        this.hp = 100;
        this.maxHp = 100;
        this.gold = 500;

        // ステータスポイント
        this.statusPoints = 0;

        // 割り振り可能ステータス
        this.stats = {
            attack: 10,
            defense: 10,
            agility: 10,
            luck: 10,
            virtue: 10,
            hp: 0
        };

        // スキル・装備
        this.skills = []; // 習得済みスキル
        this.fusedSkills = []; // 合体で作ったスキル
        this.weapon = { name: "ひのきの棒", atk: 2 };
        this.inventory = [];
        this.controlMode = "pc"; // "pc" or "mobile"

        // リスポーン地点 (初期値: 始まりの町)
        this.respawnPoint = { x: 10, y: 10, name: "始まりの町" };
    }

    // 経験値獲得とレベルアップチェック
    gainExp(amount) {
        this.exp += amount;
        let leveledUp = false;
        while (this.exp >= this.nextLevelExp && this.level < 9999) {
            this.levelUp();
            leveledUp = true;
        }
        return leveledUp;
    }

    levelUp() {
        this.level++;
        this.statusPoints += 5;
        this.exp -= this.nextLevelExp;
        this.nextLevelExp = Math.floor(this.nextLevelExp * 1.5);
        // 体力は自動では上がらない
        this.hp = this.maxHp;

        // 次のレベルで習得可能なスキルがあるかチェック (SkillDBから)
        // 実装を簡易化するため、window.gameのスキルDBを参照
        if (window.game && window.game.skillDB) {
            const newSkills = window.game.skillDB.filter(s => s.condition === "level" && Math.floor(s.power / 2) <= this.level);
            newSkills.forEach(s => {
                if (this.learnSkill(s)) {
                    console.log(`新スキル「${s.name}」を自動習得しました。`);
                }
            });
        }
    }

    // ステータス割り振り
    allocatePoint(statName) {
        if (this.statusPoints > 0 && this.stats.hasOwnProperty(statName)) {
            this.stats[statName]++;
            this.statusPoints--;

            if (statName === 'hp') {
                this.maxHp += 5;
                this.hp += 5;
            }
            return true;
        }
        return false;
    }

    // 人徳による割引率の計算 (1ポイントあたり0.1%割引)
    getDiscountRate() {
        return Math.min(0.9, this.stats.virtue * 0.001);
    }

    // 施設費用の計算
    getAdjustedCost(baseCost) {
        const discount = this.getDiscountRate();
        return Math.floor(baseCost * (1 - discount));
    }

    // スキル習得
    learnSkill(skill) {
        if (!this.skills.find(s => s.id === skill.id)) {
            this.skills.push(skill);
            return true;
        }
        return false;
    }

    addFusedSkill(skill) {
        this.fusedSkills.push(skill);
    }
}
