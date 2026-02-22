export class Inventory {
    constructor(player, ui) {
        this.player = player;
        this.ui = ui;
    }

    showMainMenu() {
        const html = `
            <div id="inventory-screen">
                <h2>メインメニュー</h2>
                <div class="inv-tabs">
                    <button onclick="game.inventory.showStats()">ステータス</button>
                    <button onclick="game.inventory.showSkills()">スキル・魔法</button>
                    <button onclick="game.inventory.showSettings()">設定</button>
                </div>
                <div id="inv-content"></div>
            </div>
        `;
        this.ui.showModal(html);
        this.showStats();
    }

    showStats() {
        const p = this.player;
        const html = `
            <h3>キャラクターステータス</h3>
            <p>レベル: ${p.level} (Next: ${p.nextLevelExp - p.exp})</p>
            <p>HP: ${p.hp} / ${p.maxHp}</p>
            <p>武器: ${p.weapon.name} (攻撃力 +${p.weapon.atk})</p>
            <hr>
            <p>残りポイント: ${p.statusPoints}</p>
            <ul class="stat-list">
                <li>攻撃力: ${p.stats.attack} <button onclick="game.inventory.allocate('attack')">+</button></li>
                <li>防御力: ${p.stats.defense} <button onclick="game.inventory.allocate('defense')">+</button></li>
                <li>敏捷: ${p.stats.agility} <button onclick="game.inventory.allocate('agility')">+</button></li>
                <li>幸運: ${p.stats.luck} <button onclick="game.inventory.allocate('luck')">+</button></li>
                <li>人徳: ${p.stats.virtue} <button onclick="game.inventory.allocate('virtue')">+</button></li>
            </ul>
        `;
        document.getElementById('inv-content').innerHTML = html;
    }

    allocate(stat) {
        if (this.player.allocatePoint(stat)) {
            this.showStats();
            this.ui.updateHeader(this.player);
        }
    }

    showSkills() {
        let html = `<h3>スキル・魔法一覧 (全${this.player.skills.length + this.player.fusedSkills.length}種)</h3>`;
        html += '<p style="font-size:10px; color:#aaa;">※パッシブスキルは自動で効果を発揮します</p>';
        html += '<div class="skill-grid">';

        const allSkills = [...this.player.skills, ...this.player.fusedSkills];
        if (allSkills.length === 0) {
            html += "<p>まだスキルを習得していません。</p>";
        } else {
            allSkills.forEach((s, idx) => {
                const typeLabel = s.isPassive ? "パッシブ" : "アクティブ";
                html += `<div class="skill-item ${s.isPassive ? 'passive' : ''}" onclick="game.inventory.showSkillDetail(${idx})">
                    <strong>${s.name}</strong><br>
                    <small>${s.element}属性 / ${typeLabel}</small>
                </div>`;
            });
        }
        html += '</div>';
        document.getElementById('inv-content').innerHTML = html;
    }

    showSkillDetail(idx) {
        const allSkills = [...this.player.skills, ...this.player.fusedSkills];
        const s = allSkills[idx];
        const html = `
            <div class="skill-detail-view">
                <h3>${s.name}</h3>
                <div class="skill-info">
                    <p><strong>属性:</strong> ${s.element}</p>
                    <p><strong>種類:</strong> ${s.isPassive ? 'パッシブスキル' : 'アクティブスキル'}</p>
                    <p><strong>威力:</strong> ${s.power}</p>
                    <p><strong>MP消費:</strong> ${s.mpCost}</p>
                    <p><strong>再使用(CT):</strong> ${s.cooldown} ターン</p>
                </div>
                <hr>
                <p class="skill-desc">${s.description}</p>
                ${s.isPassive ? `<p style="color:#00d4ff;">[発動タイミング: ${s.trigger}]</p>` : ''}
                <button onclick="game.inventory.showSkills()">戻る</button>
            </div>
        `;
        document.getElementById('inv-content').innerHTML = html;
    }

    showSettings() {
        const html = `
            <h3>設定</h3>
            <p>操作モード: <strong>${this.player.controlMode.toUpperCase()}</strong></p>
            <button onclick="game.inventory.toggleControl()">モードを切り替える</button>
            <p style="margin-top:15px; font-size:11px;">
                PC: WASD / 矢印キーで移動<br>
                MOBILE: 画面上の十字キーで移動
            </p>
        `;
        document.getElementById('inv-content').innerHTML = html;
    }

    toggleControl() {
        this.player.controlMode = this.player.controlMode === "pc" ? "mobile" : "pc";
        this.showSettings();
        // worldの状態を更新
        if (window.game && window.game.world) {
            window.game.world.updateControlMode(this.player.controlMode);
        }
    }
}
