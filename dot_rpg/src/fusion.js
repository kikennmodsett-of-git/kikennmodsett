import { SkillDB } from './skill_db.js';

export class FusionSystem {
    static fuse(skill1, skill2) {
        const newName = SkillDB.fuseNames(skill1, skill2);
        return {
            id: `fused_${Date.now()}`,
            name: `極・${newName}`,
            description: `${skill1.name}と${skill2.name}が合体して生まれた究極の技。`,
            power: Math.floor((skill1.power + skill2.power) * 1.5),
            type: "究極技",
            rarity: "究極"
        };
    }
}
