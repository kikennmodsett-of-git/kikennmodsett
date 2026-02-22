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
        html += '<div class="skill-grid">';

        const allSkills = [...this.player.skills, ...this.player.fusedSkills];
        if (allSkills.length === 0) {
            html += "<p>まだスキルを習得していません。</p>";
        } else {
            allSkills.forEach(s => {
                html += `<div class="skill-item" onclick="alert('${s.name}: ${s.description}\\n威力: ${s.power}')">
                    <strong>${s.name}</strong><br><small>${s.type}</small>
                </div>`;
            });
        }
        html += '</div>';
        document.getElementById('inv-content').innerHTML = html;
    }

    showSettings() {
        const html = `
            <h3>設定</h3>
            <p>操作モード: <strong>${this.player.controlMode.toUpperCase()}</strong></p>
            <button onclick="game.inventory.toggleControl()">モードを切り替える</button>
            <p><small>Mobileモードでは、画面上のボタンで移動できます。（未実装のプレースホルダ）</small></p>
        `;
        document.getElementById('inv-content').innerHTML = html;
    }

    toggleControl() {
        this.player.controlMode = this.player.controlMode === "pc" ? "mobile" : "pc";
        this.showSettings();
    }
}
