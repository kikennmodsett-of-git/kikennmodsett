export const SkillDB = {
    generateSkills() {
        const skills = [];
        const elements = ["炎", "氷", "雷", "風", "土", "光", "闇", "無"];
        const types = ["魔法", "剣技", "補助", "聖術", "暗黒技"];
        const rarities = ["コモン", "アンコモン", "レア", "エピック", "レジェンダリー"];

        for (let i = 1; i <= 550; i++) {
            const element = elements[i % elements.length];
            const type = types[Math.floor(i / 10) % types.length];
            const rarity = rarities[Math.floor(i / 100) % rarities.length];

            const cooldown = 1 + Math.floor(i / 100); // 最大5ターン程度のCT

            skills.push({
                id: `skill_${i}`,
                name: `${element}の${type} Lv.${(i % 10) + 1}`,
                description: `${element}属性の${type}。威力和特性は熟練度(${rarity})に依存する。`,
                power: 10 + Math.floor(i / 5),
                type: type,
                rarity: rarity,
                mpCost: 5 + Math.floor(i / 20),
                cooldown: cooldown,
                currentCooldown: 0,
                // 習得条件
                condition: i % 3 === 0 ? "level" : (i % 3 === 1 ? "quest" : "drop")
            });
        }
        return skills;
    },

    // 合体用：2つのスキル名を組み合わせて新しい名前を作る
    fuseNames(skill1, skill2) {
        return `${skill1.name.substring(0, 2)}${skill2.name.substring(skill2.name.length - 2)}`;
    }
};
