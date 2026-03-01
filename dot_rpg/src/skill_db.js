export const SkillDB = {
    generateSkills() {
        const skills = [];
        const types = [
            { name: "刻命の剣技", element: "無", category: "物理" },
            { name: "爆炎の魔導", element: "炎", category: "魔法" },
            { name: "絶対零度の術", element: "氷", category: "魔法" },
            { name: "疾風の乱舞", element: "風", category: "魔法" },
            { name: "大地の断罪", element: "土", category: "魔法" },
            { name: "聖天の福音", element: "光", category: "神聖", healing: true },
            { name: "冥府の呪縛", element: "闇", category: "魔法" }
        ];
        const rarities = ["[一般]", "[上級]", "[秘伝]", "[奥義]", "[神話]"];

        const adjs = ["虚空を裂く", "天を焦がす", "魂を凍らせる", "次元を越える", "理を覆す", "聖なる光の", "深淵に眠る", "神威を纏う"];
        const suffixes = ["・極", "・零", "・真", "・天", "・影", ""];

        for (let i = 1; i <= 600; i++) {
            const typeInfo = types[i % types.length];
            const rarity = rarities[Math.floor(i / 120) % rarities.length];
            const adj = adjs[Math.floor(i / 8) % adjs.length];
            const suffix = suffixes[i % suffixes.length];
            const isPassive = i % 6 === 0;

            let name = isPassive
                ? `${rarity} ${adj}${typeInfo.element}の加護`
                : `${rarity} ${adj}${typeInfo.name}${suffix}`;

            skills.push({
                id: `skill_${i}`,
                name: `${name} +${(i % 20) + 1}`,
                description: isPassive
                    ? `【${typeInfo.category}】${typeInfo.element}属性の力を常に宿す。`
                    : `【${typeInfo.category}】${typeInfo.element}属性の力を解き放つ ${typeInfo.healing ? '癒やし' : '攻撃'}。`,
                power: typeInfo.healing ? 20 + Math.floor(i / 8) : 15 + Math.floor(i / 4),
                type: isPassive ? "パッシブ" : "アクティブ",
                element: typeInfo.element,
                category: typeInfo.category,
                isPassive: isPassive,
                healing: typeInfo.healing || false,
                rarity: rarity,
                mpCost: isPassive ? 0 : (10 + Math.floor(i / 30)),
                cooldown: isPassive ? 0 : 2 + Math.floor(i / 150),
                currentCooldown: 0,
                trigger: isPassive ? (i % 2 === 0 ? "onTurnEnd" : "onDamageTaken") : null
            });
        }
        return skills;
    },

    getElementalMultiplier(atkElement, defElement) {
        const table = {
            "炎": { "氷": 1.8, "風": 0.5 },
            "氷": { "風": 1.8, "土": 0.5 },
            "風": { "土": 1.8, "炎": 0.5 },
            "土": { "炎": 1.8, "氷": 0.5 },
            "光": { "闇": 2.0 },
            "闇": { "光": 2.0 }
        };
        return (table[atkElement] && table[atkElement][defElement]) ? table[atkElement][defElement] : 1.0;
    },

    fuseNames(skill1, skill2) {
        return `禁忌の${skill1.name.substring(5, 7)}${skill2.name.substring(7, 9)}`;
    }
};
