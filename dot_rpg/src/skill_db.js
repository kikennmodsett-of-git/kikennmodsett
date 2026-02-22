export const SkillDB = {
    generateSkills() {
        const skills = [];
        const elements = ["炎", "氷", "風", "土", "光", "闇", "無"];
        const rarities = ["コモン", "アンコモン", "レア", "エピック", "レジェンダリー"];

        const adjs = ["神速の", "轟く", "凍てつく", "逆巻く", "虚空の", "聖なる", "深淵の", "烈火の", "金剛の", "天翔ける"];
        const techs = ["一閃", "爆裂", "螺旋", "波動", "天破", "旋風", "断罪", "福音", "崩落", "神威"];
        const suffixes = ["・極", "・改", "・真", "・零", "・双", ""];

        for (let i = 1; i <= 550; i++) {
            const element = elements[i % elements.length];
            const rarity = rarities[Math.floor(i / 100) % rarities.length];
            const cooldown = 1 + Math.floor(i / 100);
            const isPassive = i % 5 === 0;

            const adj = adjs[Math.floor(i / 7) % adjs.length];
            const tech = techs[Math.floor(i / 3) % techs.length];
            const suffix = suffixes[Math.floor(i / 11) % suffixes.length];

            let name = "";
            if (isPassive) {
                name = `心眼・${adj}${element}の加護`;
            } else {
                name = `${adj}${element}${tech}${suffix}`;
            }

            skills.push({
                id: `skill_${i}`,
                name: `${name} Lv.${(i % 10) + 1}`,
                description: isPassive
                    ? `${element}の力を常に宿す。戦闘中、特定の条件下で自動発動する。`
                    : `${element}属性を宿した絶技。威力和特性は熟練度(${rarity})に依存する。`,
                power: 10 + Math.floor(i / 5),
                type: isPassive ? "パッシブ" : "アクティブ",
                element: element,
                isPassive: isPassive,
                rarity: rarity,
                mpCost: isPassive ? 0 : (5 + Math.floor(i / 20)),
                cooldown: isPassive ? 0 : cooldown,
                currentCooldown: 0,
                trigger: isPassive ? (i % 2 === 0 ? "onTurnEnd" : "onDamageTaken") : null,
                condition: i % 3 === 0 ? "level" : (i % 3 === 1 ? "quest" : "drop")
            });
        }
        return skills;
    },

    // 属性相性倍率を取得
    getElementalMultiplier(atkElement, defElement) {
        const table = {
            "炎": { "氷": 1.5, "風": 0.8 },
            "氷": { "風": 1.5, "土": 0.8 },
            "風": { "土": 1.5, "炎": 0.8 },
            "土": { "炎": 1.5, "氷": 0.8 },
            "光": { "闇": 1.5 },
            "闇": { "光": 1.5 }
        };
        if (table[atkElement] && table[atkElement][defElement]) {
            return table[atkElement][defElement];
        }
        return 1.0;
    },

    // 合体用：2つのスキル名を組み合わせて新しい名前を作る
    fuseNames(skill1, skill2) {
        return `${skill1.name.substring(0, 2)}${skill2.name.substring(skill2.name.length - 2)}`;
    }
};
