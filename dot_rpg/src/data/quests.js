export const QuestData = {
    generateQuests() {
        const quests = [];
        for (let i = 1; i <= 300; i++) {
            quests.push({
                id: i,
                title: `クエスト No.${i}`,
                description: `レベル ${i} 程度のモンスターを討伐せよ。`,
                targetMonsterId: i,
                requiredCount: 1,
                currentCount: 0,
                rewardGold: i * 50,
                rewardExp: i * 100,
                isCompleted: false,
                isAccepted: false
            });
        }
        return quests;
    }
};
