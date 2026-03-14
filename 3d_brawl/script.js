/**
 * 3D-Brawl: 3D Online Fighting Game
 * Core Game Logic
 */

// --- Constants & Config ---
const HP_MAX = 100;
const MOVE_SPEED = 0.15;
const ROTATION_SPEED = 0.05;
const PLAYER_HEIGHT = 1.6;
const ATTACK_COOLDOWN = 500; // ms
const DAMAGE_PUNCH = 10;
const DAMAGE_KICK = 18;

let scene, camera, renderer, clock;
let localPlayer, npc;
let remotePlayers = {}; // peerId -> Player instance
let connections = {}; // peerId -> Connection instance
let peer;
let isLobby = false; // Lobby(Host)かどうかのフラグ
let isNPCMode = false;
let gameActive = false;
let keys = {};
let obstacles = []; // 衝突判定用の障害物リスト
class Player {
    constructor(id, name, color, isLocal = false) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.hp = HP_MAX;
        this.isLocal = isLocal;
        this.group = new THREE.Group();

        // Character Model (Simple Box Man)
        const mat = new THREE.MeshPhongMaterial({ color: color });

        // Body
        this.body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), mat);
        this.body.position.y = 1.0;
        this.group.add(this.body);

        // Head
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
        this.head.position.y = 1.6;
        this.group.add(this.head);

        // Arms
        this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), mat);
        this.armL.position.set(-0.4, 1.0, 0);
        this.group.add(this.armL);

        this.armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), mat);
        this.armR.position.set(0.4, 1.0, 0);
        this.group.add(this.armR);

        // Legs
        this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), mat);
        this.legL.position.set(-0.15, 0.3, 0);
        this.group.add(this.legL);

        this.legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), mat);
        this.legR.position.set(0.15, 0.3, 0);
        this.group.add(this.legR);

        // Name Tag (Canvas based)
        this.nameTag = this.createNameTag(name);
        this.nameTag.position.y = 2.2;
        this.group.add(this.nameTag);

        scene.add(this.group);

        this.lastAttackTime = 0;
        this.action = 'idle';
        this.actionPhase = 0; // アニメーションの進行度
        this.actionTimer = 0;
    }

    createNameTag(name) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 256, 64);
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(name, 128, 44);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(2, 0.5, 1);
        return sprite;
    }

    update(dt) {
        if (this.hp <= 0) return;

        // アニメーションのリセット
        this.head.position.y = 1.6;
        this.body.rotation.y = 0;
        this.group.position.y = 0;

        // Animations based on action
        if (this.action === 'punch') {
            this.actionTimer -= dt;
            const progress = 1 - (this.actionTimer / 0.3); // 0 to 1

            if (progress < 0.4) { // 振りかぶり
                this.armR.rotation.x = progress * 2;
                this.body.rotation.y = -progress * 0.5;
            } else if (progress < 0.7) { // 突き
                this.armR.rotation.x = -Math.PI / 2 - (progress - 0.4) * 2;
                this.body.rotation.y = (progress - 0.4) * 2;
                this.armR.position.z = (progress - 0.4) * 1.5;
            } else { // 戻し
                this.armR.rotation.x = -Math.PI / 2 + (progress - 0.7) * 3;
                this.armR.position.z = 0.45 - (progress - 0.7) * 1.5;
            }

            if (this.actionTimer <= 0) {
                this.action = 'idle';
                this.armR.position.z = 0;
                this.armR.rotation.x = 0;
            }
        } else if (this.action === 'kick') {
            this.actionTimer -= dt;
            const progress = 1 - (this.actionTimer / 0.4);

            if (progress < 0.3) { // タメ
                this.legR.rotation.x = -progress * 2;
                this.group.position.y = -progress * 0.2; // 少し腰を落とす
            } else if (progress < 0.8) { // 蹴り
                this.legR.rotation.x = -Math.PI / 1.5;
                this.body.rotation.y = -progress * 0.3;
            } else { // 戻し
                this.legR.rotation.x = -Math.PI / 1.5 + (progress - 0.8) * 5;
            }

            if (this.actionTimer <= 0) {
                this.action = 'idle';
                this.legR.rotation.x = 0;
                this.group.position.y = 0;
            }
        } else {
            // Idle/Walk animation
            const walkCycle = Math.sin(Date.now() * 0.012);
            if (this.isWalking) {
                this.legL.rotation.x = walkCycle * 0.7;
                this.legR.rotation.x = -walkCycle * 0.7;
                this.armL.rotation.x = -walkCycle * 0.5;
                this.armR.rotation.x = walkCycle * 0.5;
                this.group.position.y = Math.abs(walkCycle) * 0.1;
                this.body.rotation.z = walkCycle * 0.05;
            } else {
                this.legL.rotation.x = 0;
                this.legR.rotation.x = 0;
                this.armL.rotation.x = 0;
                this.armR.rotation.x = 0;
                this.group.position.y = Math.sin(Date.now() * 0.003) * 0.05;
            }
        }
    }

    punch() {
        if (Date.now() - this.lastAttackTime < ATTACK_COOLDOWN) return;
        this.action = 'punch';
        this.actionTimer = 0.3;
        this.lastAttackTime = Date.now();

        // 攻撃時の踏み込み（障害物判定を考慮）
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
        const nextPos = this.group.position.clone().add(forward.multiplyScalar(0.5));
        if (!this.checkObstacles(nextPos)) {
            this.group.position.add(forward.multiplyScalar(0.2));
        }

        this.checkHit(1.8, DAMAGE_PUNCH);
        if (this.isLocal) syncState('punch');
    }

    kick() {
        if (Date.now() - this.lastAttackTime < ATTACK_COOLDOWN + 200) return;
        this.action = 'kick';
        this.actionTimer = 0.4;
        this.lastAttackTime = Date.now();
        this.checkHit(2.2, DAMAGE_KICK);
        if (this.isLocal) syncState('kick');
    }

    checkObstacles(pos) {
        // キャラクターの衝突半径
        const radius = 0.5;
        for (let obj of obstacles) {
            const box = new THREE.Box3().setFromObject(obj);
            // 簡易的な円と矩形の衝突判定
            const closestPoint = new THREE.Vector3().copy(pos).clamp(box.min, box.max);
            const dist = pos.distanceTo(closestPoint);
            if (dist < radius) return true;
        }
        return false;
    }

    checkHit(range, damage) {
        // Simple range check for all potential targets
        const targets = [];
        if (isNPCMode && npc && npc !== this) targets.push(npc);
        if (isNPCMode && localPlayer && localPlayer !== this) targets.push(localPlayer);
        Object.values(remotePlayers).forEach(p => { if (p !== this) targets.push(p); });

        targets.forEach(target => {
            if (target.hp <= 0) return;
            const dist = this.group.position.distanceTo(target.group.position);
            if (dist < range) {
                // Directional check (must be roughly in front)
                const toTarget = target.group.position.clone().sub(this.group.position).normalize();
                const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
                if (toTarget.dot(forward) > 0.5) {
                    target.takeDamage(damage);
                }
            }
        });
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        updateHUD();

        // Flash red
        this.body.material.emissive.setHex(0xff0000);
        setTimeout(() => this.body.material.emissive.setHex(0x000000), 100);

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.group.rotation.x = Math.PI / 2;
        if (this.isLocal) {
            showResult('敗北...', '体力がゼロになりました');
            gameActive = false;
        }
    }
}

class NPC extends Player {
    constructor(name) {
        super('npc', name, 0xff8800);
    }

    update(dt) {
        super.update(dt);
        if (this.hp <= 0 || !gameActive) return;

        // Simple AI: Follow player and attack
        const dist = this.group.position.distanceTo(localPlayer.group.position);
        if (dist > 1.5) {
            // Chase
            this.group.lookAt(localPlayer.group.position.x, 0, localPlayer.group.position.z);

            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
            const nextPos = this.group.position.clone().add(forward.multiplyScalar(MOVE_SPEED * 0.7));

            if (!this.checkObstacles(nextPos)) {
                this.group.position.copy(nextPos);
                this.isWalking = true;
            } else {
                // 障害物がある場合は少し横にずれるなど、スタック回避の余地があるが今は停止
                this.isWalking = false;
            }
        } else {
            // Attack
            this.isWalking = false;
            if (Math.random() < 0.05) {
                Math.random() > 0.5 ? this.punch() : this.kick();
            }
        }
    }
}

// --- Core Engine ---

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.Fog(0x050510, 10, 50);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 5, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lights
    const ambient = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 7);
    scene.add(sun);

    // Grid Floor
    const grid = new THREE.GridHelper(100, 50, 0x00f2ff, 0x222244);
    scene.add(grid);

    // Floor Mesh
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshPhongMaterial({ color: 0x111122 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Obstacles
    obstacles = [];
    for (let i = 0; i < 20; i++) {
        const size = 1 + Math.random() * 3;
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(size, size, size),
            new THREE.MeshPhongMaterial({ color: 0x333344 })
        );
        box.position.set(
            (Math.random() - 0.5) * 40,
            size / 2,
            (Math.random() - 0.5) * 40
        );
        scene.add(box);
        obstacles.push(box);
    }

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function gameLoop() {
    requestAnimationFrame(gameLoop);
    const dt = clock.getDelta();

    if (gameActive && localPlayer) {
        handleInput();
        localPlayer.update(dt);
        updateCamera();

        if (isNPCMode && npc) npc.update(dt);
        Object.values(remotePlayers).forEach(p => p.update(dt));
    }

    renderer.render(scene, camera);
}

function handleInput() {
    if (!localPlayer || localPlayer.hp <= 0) return;

    let moved = false;
    const nextPos = localPlayer.group.position.clone();

    if (keys['ArrowUp']) {
        nextPos.add(new THREE.Vector3(0, 0, MOVE_SPEED).applyQuaternion(localPlayer.group.quaternion));
        moved = true;
    }
    if (keys['ArrowDown']) {
        nextPos.add(new THREE.Vector3(0, 0, -MOVE_SPEED).applyQuaternion(localPlayer.group.quaternion));
        moved = true;
    }

    if (moved) {
        if (!localPlayer.checkObstacles(nextPos)) {
            localPlayer.group.position.copy(nextPos);
        }
    }
    if (keys['ArrowLeft']) {
        localPlayer.group.rotation.y += ROTATION_SPEED;
    }
    if (keys['ArrowRight']) {
        localPlayer.group.rotation.y -= ROTATION_SPEED;
    }

    localPlayer.isWalking = moved;

    if (keys['Digit1']) localPlayer.punch();
    if (keys['Digit2']) localPlayer.kick();

    if (moved) syncState();
}

function updateCamera() {
    const offset = new THREE.Vector3(0, 3, -7).applyQuaternion(localPlayer.group.quaternion);
    const targetPos = localPlayer.group.position.clone().add(offset);
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(localPlayer.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
}

// --- UI & State ---

function updateHUD() {
    const list = document.getElementById('player-list');
    list.innerHTML = '';

    // Sort: Local first, then others
    const players = [localPlayer];
    if (isNPCMode && npc) players.push(npc);
    Object.values(remotePlayers).sort((a, b) => a.id.localeCompare(b.id)).forEach(p => players.push(p));

    players.forEach(p => {
        if (!p) return;
        const div = document.createElement('div');
        div.className = `player-status ${!p.isLocal && p.id !== 'npc' ? 'remote' : ''}`;
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>${p.name} ${p.isLocal ? '(YOU)' : ''}</span>
                <span>${Math.ceil(p.hp)} HP</span>
            </div>
            <div class="hp-bar-bg">
                <div class="hp-bar-fill" style="width: ${p.hp}%"></div>
            </div>
        `;
        list.appendChild(div);
    });

    // Win Check
    if (isNPCMode && npc && npc.hp <= 0) {
        showResult('勝利！', 'NPCを撃破しました');
        gameActive = false;
    }
}

function addLog(msg) {
    const log = document.getElementById('message-log');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerText = msg;
    log.appendChild(entry);

    // Auto remove after 5s
    setTimeout(() => {
        entry.style.opacity = '0';
        setTimeout(() => entry.remove(), 500);
    }, 5000);
}

function showResult(title, msg) {
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('result-title').innerText = title;
    document.getElementById('result-msg').innerText = msg;
}

// --- Networking (PeerJS) ---

async function startMultiplayer(mode, roomPass, playerName) {
    const hash = await hashString(roomPass);
    const lobbyId = `3dbrawl_lobby_${hash}`;
    const myId = mode === 'create' ? lobbyId : `3dbrawl_peer_${hash}_${Math.random().toString(36).substr(2, 5)}`;

    setupPeer(mode, myId, lobbyId, playerName);
}

function setupPeer(mode, id, lobbyId, playerName) {
    if (peer) peer.destroy();
    isLobby = (mode === 'create');

    peer = new Peer(id);

    peer.on('open', (myId) => {
        console.log('Peer ID:', myId);
        addLog(`ネットワークに接続完了: ${playerName}`);

        if (mode === 'join') {
            addLog(`ルーム「${roomPassDisplay}」に接続中...`);
            const conn = peer.connect(lobbyId);
            setupConn(conn);
        } else {
            addLog('部屋を作成完了。待機中です...');
        }
    });

    peer.on('connection', (c) => {
        setupConn(c);
        if (isLobby) {
            // ここでのaddLogは個別の接続時ではなく、実際の参加時（handleRemoteSync）で行うようにするため削除または調整
        }
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'peer-unavailable' && mode === 'join') {
            addLog('エラー: 指定されたパスワードのルームが存在しません。');
            gameActive = false;
            // メニューに戻る
            document.getElementById('hud').classList.add('hidden');
            document.getElementById('join-menu').classList.remove('hidden');
        } else if (err.type === 'unavailable-id' && mode === 'create') {
            alert('このパスワードのルームは既に使用されています。別のパスワードを試してください。');
            location.reload();
        }
    });
}

function setupConn(c) {
    c.on('open', () => {
        connections[c.peer] = c;
        // 自分の最新状態を送信
        syncState('join');
    });

    c.on('data', (data) => {
        if (data.type === 'sync') {
            handleRemoteSync(c.peer, data);

            // Lobbyなら他の全員にリレー（ブロードキャスト）
            if (isLobby) {
                relayData(data, c.peer);
                // 参加メッセージ（または最初の同期）なら即座に自分も同期を返して、参加相手に自分の姿を見せる
                if (data.action === 'join') {
                    syncState('welcome');
                }
            }
        }
    });

    c.on('close', () => {
        const p = remotePlayers[c.peer];
        if (p) {
            addLog(`${p.name} が退出しました`);
            scene.remove(p.group);
            delete remotePlayers[c.peer];
        }
        delete connections[c.peer];
        updateHUD();
    });
}

function handleRemoteSync(senderPeerId, data) {
    const actualId = data.fromId || senderPeerId;

    if (!remotePlayers[actualId]) {
        remotePlayers[actualId] = new Player(actualId, data.name || 'Unknown', data.color || 0xff00ea);
        addLog(`${data.name || '対戦相手'} さんが参加しました！`);
        updateHUD();
    }

    const p = remotePlayers[actualId];
    p.group.position.set(data.x, data.y, data.z);
    p.group.rotation.y = data.ry;
    p.hp = data.hp;
    p.isWalking = data.isWalking;

    if (data.action === 'punch') p.punch();
    if (data.action === 'kick') p.kick();

    updateHUD();
}

function syncState(action = 'none') {
    if (!localPlayer || !peer || peer.destroyed) return;

    const data = {
        type: 'sync',
        fromId: peer.id,
        name: localPlayer.name,
        color: localPlayer.color,
        x: localPlayer.group.position.x,
        y: localPlayer.group.position.y,
        z: localPlayer.group.position.z,
        ry: localPlayer.group.rotation.y,
        hp: localPlayer.hp,
        isWalking: localPlayer.isWalking,
        action: action
    };

    // 全ての接続先に送信
    Object.values(connections).forEach(c => {
        if (c.open) c.send(data);
    });
}

function relayData(data, excludePeerId) {
    Object.values(connections).forEach(c => {
        if (c.peer !== excludePeerId && c.open) {
            c.send(data);
        }
    });
}

async function hashString(str) {
    const msgUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substr(0, 16);
}

// --- Menu Events ---
let roomPassDisplay = "";

function startGame(playerName, npcMode = false) {
    init();
    // animate(); // Assuming animate() is not defined or gameLoop is used instead
    gameActive = true;
    isNPCMode = npcMode;
    localPlayer = new Player('local', playerName, 0x00f2ff, true);
    updateHUD();
    gameLoop();
}

// Main Menu
document.getElementById('btn-create-mode').onclick = () => {
    const name = document.getElementById('player-name').value;
    if (!name) return alert('プレイヤー名を入力してください');
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('setup-menu').classList.remove('hidden');
};

document.getElementById('btn-join-mode').onclick = () => {
    const name = document.getElementById('player-name').value;
    if (!name) return alert('プレイヤー名を入力してください');
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('join-menu').classList.remove('hidden');
};

document.getElementById('btn-npc').onclick = () => {
    const name = document.getElementById('player-name').value || 'Player';
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    startGame(name, true);
    npc = new NPC('NPC Enemy');
    npc.group.position.set(5, 0, 5);
};

// Sub Menus Back
document.getElementById('btn-setup-back').onclick = () => {
    document.getElementById('setup-menu').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
};

document.getElementById('btn-join-back').onclick = () => {
    document.getElementById('join-menu').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
};

// Start Multiplayer Actions
document.getElementById('btn-do-create').onclick = () => {
    const name = document.getElementById('player-name').value;
    const pass = document.getElementById('create-pass').value;
    if (!pass) return alert('パスワードを設定してください');
    roomPassDisplay = pass;
    document.getElementById('setup-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('room-display').innerText = `Room: ${pass} (Host)`;
    startGame(name);
    startMultiplayer('create', pass, name);
};

document.getElementById('btn-do-join').onclick = () => {
    const name = document.getElementById('player-name').value;
    const pass = document.getElementById('join-pass').value;
    if (!pass) return alert('パスワードを入力してください');
    roomPassDisplay = pass;
    document.getElementById('join-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('room-display').innerText = `Room: ${pass}`;
    startGame(name);
    startMultiplayer('join', pass, name);
};
