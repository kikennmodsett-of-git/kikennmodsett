export const MonsterData = {
    // 400種類以上のモンスターを生成する簡易ファクトリ
    generateMonsters() {
        const monsters = [];
        const baseNames = ["スライム", "ゴブリン", "オーク", "スケルトン", "ドラゴン", "ゴーレム", "キメラ", "ヴァンパイア"];
        const prefixes = ["迷子の", "怒れる", "古代の", "闇の", "光の", "邪悪な", "守護の", "伝説の"];

        for (let i = 1; i <= 450; i++) {
            const pIdx = Math.floor((i - 1) / baseNames.length) % prefixes.length;
            const bIdx = (i - 1) % baseNames.length;
            const name = `${prefixes[pIdx]}${baseNames[bIdx]}`;

            monsters.push({
                id: i,
                name: name,
                level: i, // レベルはIDに比例させる（1〜450）
                hp: i * 20,
                atk: i * 5,
                def: i * 3,
                spd: i * 4,
                exp: i * 15,
                gold: i * 10,
                isBoss: i === 450,
                isDungeonMonster: i > 5 // 簡易的にLv5以上をダンジョン判定
            });
        }
        return monsters;
    },

    // レベル差のチェック
    shouldAskToBattle(playerLevel, monsterLevel) {
        return (monsterLevel - playerLevel) >= 10;
    }
};
