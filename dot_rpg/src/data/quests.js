export const QuestData = {
    generateQuests() {
        const quests = [];
        const areas = ["平原", "古の森", "霧の谷", "奈落の底", "忘れられた村の周辺", "北の雪原"];
        const reasons = ["が旅人を襲っている", "が農作物を荒らしている", "の調査が必要だ", "が異常繁殖している"];

        for (let i = 1; i <= 300; i++) {
            const area = areas[i % areas.length];
            const reason = reasons[i % reasons.length];
            quests.push({
                id: i,
                title: `【要請】${area}の脅威`,
                description: `${area}にて、Lv.${i} 前後のモンスター${reason}。平和のために討伐してほしい。`,
                targetMonsterLevel: i,
                requiredCount: 3,
                currentCount: 0,
                rewardGold: i * 150,
                rewardExp: i * 200,
                isCompleted: false,
                isAccepted: false
            });
        }
        return quests;
    }
};
