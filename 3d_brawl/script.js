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

// --- Globals ---
let scene, camera, renderer, clock;
let localPlayer, npc;
let remotePlayers = {}; // peerId -> Player instance
let peer, conn;
let isNPCMode = false;
let gameActive = false;
let keys = {};

// --- Classes ---

class Player {
    constructor(id, name, color, isLocal = false) {
        this.id = id;
        this.name = name;
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

        // Animations based on action
        if (this.action === 'punch') {
            this.armR.rotation.x = -Math.PI / 2;
            this.actionTimer -= dt;
            if (this.actionTimer <= 0) this.action = 'idle';
        } else if (this.action === 'kick') {
            this.legR.rotation.x = -Math.PI / 3;
            this.actionTimer -= dt;
            if (this.actionTimer <= 0) this.action = 'idle';
        } else {
            // Idle/Walk animation (bobbing)
            const walkCycle = Math.sin(Date.now() * 0.01);
            this.armR.rotation.x = 0;
            this.legR.rotation.x = 0;
            if (this.isWalking) {
                this.legL.rotation.x = walkCycle * 0.5;
                this.legR.rotation.x = -walkCycle * 0.5;
                this.armL.rotation.x = -walkCycle * 0.5;
                this.armR.rotation.x = walkCycle * 0.5;
            } else {
                this.legL.rotation.x = 0;
                this.legR.rotation.x = 0;
                this.armL.rotation.x = 0;
                this.armR.rotation.x = 0;
            }
        }
    }

    punch() {
        if (Date.now() - this.lastAttackTime < ATTACK_COOLDOWN) return;
        this.action = 'punch';
        this.actionTimer = 0.3;
        this.lastAttackTime = Date.now();
        this.checkHit(1.5, DAMAGE_PUNCH);
        if (this.isLocal) syncState('punch');
    }

    kick() {
        if (Date.now() - this.lastAttackTime < ATTACK_COOLDOWN) return;
        this.action = 'kick';
        this.actionTimer = 0.3;
        this.lastAttackTime = Date.now();
        this.checkHit(1.8, DAMAGE_KICK);
        if (this.isLocal) syncState('kick');
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
            this.group.translateZ(MOVE_SPEED * 0.7);
            this.isWalking = true;
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
    for (let i = 0; i < 15; i++) {
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
    if (keys['ArrowUp']) {
        localPlayer.group.translateZ(MOVE_SPEED);
        moved = true;
    }
    if (keys['ArrowDown']) {
        localPlayer.group.translateZ(-MOVE_SPEED);
        moved = true;
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

    const players = [localPlayer];
    if (isNPCMode && npc) players.push(npc);
    Object.values(remotePlayers).forEach(p => players.push(p));

    players.forEach(p => {
        if (!p) return;
        const div = document.createElement('div');
        div.className = 'player-status';
        div.innerHTML = `
            <div>${p.name}</div>
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

function showResult(title, msg) {
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('result-title').innerText = title;
    document.getElementById('result-msg').innerText = msg;
}

// --- Networking (PeerJS) ---

async function startMultiplayer(roomPass, playerName) {
    // Hash password to get a reliable Peer ID
    const hash = await hashString(roomPass);
    const myId = `3dbrawl_player_${playerName}_${Math.random().toString(36).substr(2, 5)}`;
    const roomHostId = `3dbrawl_room_${hash}`;

    peer = new Peer(myId);

    peer.on('open', (id) => {
        console.log('My Peer ID:', id);
        joinRoom(roomHostId);
    });

    peer.on('connection', (c) => {
        setupConn(c);
    });

    // If we are the first one, we become the host (effectively)
    // In this simple P2P model, everyone tries to connect to the "Host ID"
}

// For simplicity in this demo, let's use a simpler "Join/Create" logic
// Real multiplayer logic would need a more complex lobby.
// Here we'll simulate it by having one "Master" derived from the password.

async function hashString(str) {
    const msgUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substr(0, 16);
}

function joinRoom(id) {
    // Attempt connection
    const conn = peer.connect(id);
    setupConn(conn);
}

function setupConn(c) {
    c.on('data', (data) => {
        if (data.type === 'sync') {
            handleRemoteSync(c.peer, data);
        }
    });
}

function handleRemoteSync(id, data) {
    if (!remotePlayers[id]) {
        remotePlayers[id] = new Player(id, data.name, 0x00ff88);
    }
    const p = remotePlayers[id];
    p.group.position.set(data.x, data.y, data.z);
    p.group.rotation.y = data.ry;
    p.hp = data.hp;
    if (data.action === 'punch') p.punch();
    if (data.action === 'kick') p.kick();
    updateHUD();
}

function syncState(action = 'none') {
    if (!conn) return;
    conn.send({
        type: 'sync',
        name: localPlayer.name,
        x: localPlayer.group.position.x,
        y: localPlayer.group.position.y,
        z: localPlayer.group.position.z,
        ry: localPlayer.group.rotation.y,
        hp: localPlayer.hp,
        action: action
    });
}

// --- Menu Events ---

document.getElementById('btn-npc').onclick = () => {
    const name = document.getElementById('player-name').value || 'Player';
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    isNPCMode = true;
    gameActive = true;

    localPlayer = new Player('local', name, 0x00f2ff, true);
    npc = new NPC('NPC Enemy');
    npc.group.position.set(5, 0, 5);

    updateHUD();
};

document.getElementById('btn-create').onclick = () => {
    const name = document.getElementById('player-name').value || 'Player';
    const pass = document.getElementById('room-pass').value;
    if (!pass) {
        alert('パスワードを入力してください');
        return;
    }

    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('room-display').innerText = `Room: ${pass}`;

    gameActive = true;
    localPlayer = new Player('local', name, 0x00f2ff, true);

    // PeerJS logic would go here
    // startMultiplayer(pass, name);

    updateHUD();
    alert('オンライン対戦機能はPeerJSのセットアップが必要ですが、基盤ロジックは実装済みです。現在はNPC戦もしくはこの画面でのソロ動作を確認できます。');
};

// Start
init();
gameLoop();
