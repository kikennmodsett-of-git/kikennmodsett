export class UI {
    constructor() {
        this.msgLog = document.getElementById('message-log');
        this.modal = document.getElementById('modal-container');
        this.modalBody = document.getElementById('modal-body');

        document.getElementById('modal-close').onclick = () => this.hideModal();
    }

    log(message) {
        const div = document.createElement('div');
        div.textContent = `> ${message}`;
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

    addAction(label, callback) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.onclick = callback;
        document.getElementById('action-panel').appendChild(btn);
    }
}
