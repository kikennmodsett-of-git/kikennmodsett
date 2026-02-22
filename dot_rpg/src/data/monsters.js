export const MonsterData = {
    // 400種類以上のモンスターを生成する簡易ファクトリ
    generateMonsters() {
        const monsters = [];
        const colors = ["#ff5555", "#55ff55", "#5555ff", "#ffff55", "#ff55ff", "#55ffff", "#ffffff", "#888888"];
        const shapes = ["slime", "beast", "ghost", "dragon", "knight"];
        const elements = ["炎", "氷", "風", "土", "光", "闇", "無"];

        for (let i = 1; i <= 450; i++) {
            const pIdx = Math.floor((i - 1) / baseNames.length) % prefixes.length;
            const bIdx = (i - 1) % baseNames.length;
            const name = `${prefixes[pIdx]}${baseNames[bIdx]}`;
            const color = colors[i % colors.length];
            const shape = shapes[Math.floor(i / 10) % shapes.length];
            const element = elements[i % elements.length];

            monsters.push({
                id: i,
                name: name,
                level: i,
                hp: i * 20,
                atk: i * 5,
                def: i * 3,
                spd: i * 4,
                exp: i * 15,
                gold: i * 10,
                color: color,
                shape: shape,
                element: element,
                isBoss: i === 450,
                isDungeonMonster: i > 5
            });
        }
        return monsters;
    },

    // レベル差のチェック
    shouldAskToBattle(playerLevel, monsterLevel) {
        return (monsterLevel - playerLevel) >= 10;
    }
};
