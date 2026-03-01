import { SkillDB } from './skill_db.js';

export class FusionSystem {
    static fuse(skill1, skill2) {
        const newName = SkillDB.fuseNames(skill1, skill2);
        const healing = skill1.healing || skill2.healing;
        const element = skill1.element === "無" ? skill2.element : skill1.element;

        return {
            id: `fused_${Date.now()}`,
            name: `極・${newName} EX`,
            description: `${skill1.name}と${skill2.name}が禁断の儀式で融合した${healing ? '至高の癒やし' : '究極の絶技'}。`,
            power: Math.floor((skill1.power + skill2.power) * 1.6),
            type: "アクティブ", // 戦闘で選択可能にするためアクティブ固定
            category: "究極",
            element: element,
            isPassive: false,
            healing: healing,
            rarity: "[神話]",
            mpCost: Math.max(skill1.mpCost, skill2.mpCost) + 10,
            cooldown: Math.max(skill1.cooldown, skill2.cooldown, 3),
            currentCooldown: 0
        };
    }
}
