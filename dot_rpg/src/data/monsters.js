export const MonsterData = {
    generateMonsters() {
        const monsters = [];
        const baseNames = ["スライム", "ゴブリン", "オーク", "スケルトン", "ワイバーン", "ゴーレム", "キメラ", "ヴァンパイア", "リザード", "ウルフ"];
        const prefixes = ["迷子の", "怒れる", "古代の", "深淵の", "聖なる", "猛毒の", "呪われた", "伝説の", "虚無の", "紅蓮の"];
        const shapes = ["slime", "beast", "ghost", "dragon", "knight", "serpent"];
        const elements = ["炎", "氷", "風", "土", "光", "闇", "無"];

        for (let i = 1; i <= 1500; i++) {
            const pIdx = Math.floor(i / 10) % prefixes.length;
            const bIdx = i % baseNames.length;
            const name = `${prefixes[pIdx]}${baseNames[bIdx]}`;

            monsters.push({
                id: i,
                name: name,
                level: i,
                hp: 30 + i * 45,
                atk: 5 + i * 7,
                def: 3 + i * 4,
                spd: 4 + i * 5,
                exp: i * 25,
                gold: i * 20,
                color: `hsl(${i * 137.5 % 360}, 70%, 50%)`,
                shape: shapes[i % shapes.length],
                element: elements[i % elements.length],
                isBoss: i % 100 === 0,
                isDungeonMonster: i > 20
            });
        }
        return monsters;
    },

    shouldAskToBattle(playerLevel, monsterLevel) {
        return (monsterLevel - playerLevel) >= 15;
    }
};
