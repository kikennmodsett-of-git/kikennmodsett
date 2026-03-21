export class UI {
    constructor() {
        this.msgLog = document.getElementById('message-log');
        this.modal = document.getElementById('modal-container');
        this.modalBody = document.getElementById('modal-body');

        // バトルアリーナ関連
        this.arena = document.getElementById('battle-arena');
        this.monsterGraphic = document.getElementById('monster-graphic-large');
        this.monsterName = document.getElementById('battle-monster-name');
        this.monsterHPFill = document.getElementById('monster-hp-fill');

        document.getElementById('modal-close').onclick = () => this.hideModal();
    }

    log(message) {
        const div = document.createElement('div');
        div.innerHTML = `> ${message}`;
        this.msgLog.prepend(div);
    }

    updateHeader(player) {
        document.getElementById('player-level').textContent = `Lv. ${player.level}`;
        document.getElementById('player-hp-bar').textContent = `HP: ${player.hp}/${player.maxHp}`;
        document.getElementById('player-gold').textContent = `${player.gold} G`;
    }

    showModal(contentHtml) {
        this.modalBody.innerHTML = contentHtml;
        this.modal.classList.remove('hidden');
    }

    hideModal() {
        this.modal.classList.add('hidden');
    }

    clearActionPanel() {
        document.getElementById('action-panel').innerHTML = '';
    }

    addAction(label, callback, extraStyle = "") {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.onclick = callback;
        if (extraStyle) btn.style.cssText += extraStyle;
        document.getElementById('action-panel').appendChild(btn);
    }

    showBattleArena(monster, spriteSvg) {
        this.monsterGraphic.innerHTML = spriteSvg;
        this.monsterName.textContent = `${monster.name} (Lv.${monster.level})`;
        this.monsterHPFill.style.width = '100%';
        this.monsterGraphic.classList.remove('monster-die', 'monster-shake');
        this.arena.classList.remove('hidden');
        document.getElementById('world-container').classList.add('hidden');
    }

    hideBattleArena() {
        this.arena.classList.add('hidden');
        document.getElementById('world-container').classList.remove('hidden');
    }

    updateMonsterHP(current, max) {
        const pct = Math.max(0, (current / max) * 100);
        this.monsterHPFill.style.width = `${pct}%`;

        // 攻撃時の揺れ演出
        const container = document.getElementById('monster-container');
        container.classList.remove('monster-shake');
        void container.offsetWidth; // リフロー
        container.classList.add('monster-shake');
    }
}
