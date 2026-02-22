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
            attack: 10,   // 攻撃力: モンスターを倒しやすくなる
            defense: 10,  // 防御力: 受けるダメージ軽減
            agility: 10,  // 敏捷: 先制、逃走成功率
            luck: 10,     // 幸運: レアドロップ率
            virtue: 10    // 人徳: 価格、施設利用費の割引
        };
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
        this.maxHp += 20;
        this.hp = this.maxHp;
    }

    // ステータス割り振り
    allocatePoint(statName) {
        if (this.statusPoints > 0 && this.stats.hasOwnProperty(statName)) {
            this.stats[statName]++;
            this.statusPoints--;
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
}
