import * as THREE from 'three';

class Game3D {
    constructor() {
        this.container = document.getElementById('game-container');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });

        this.player = null;
        this.platforms = [];
        this.goal = null;

        this.keys = {};
        this.isMoving = false;
        this.isGameOver = false;
        this.startTime = 0;
        this.elapsedTime = 0;

        this.playerVelocity = new THREE.Vector3();
        this.canJump = true;
        this.gravity = -0.015;
        this.moveSpeed = 0.12;
        this.jumpForce = 0.35;

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.scene.background = new THREE.Color(0x020210);
        this.scene.fog = new THREE.Fog(0x020210, 20, 100);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 2.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x00ffff, 10, 100);
        pointLight.position.set(10, 20, 10);
        pointLight.castShadow = true;
        this.scene.add(pointLight);

        // --- Create Player (サムネイルのデザインを再現) ---
        this.player = new THREE.Group();

        // Body (Neon Box)
        const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.3
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        this.player.add(body);

        // Eyes (Vibrant white emissive)
        const eyeGeo = new THREE.PlaneGeometry(0.2, 0.4);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.25, 0.1, 0.51);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.25, 0.1, 0.51);
        this.player.add(eyeL, eyeR);

        // Horns/Wings (Thunder style from thumbnail)
        const hornGeo = new THREE.ConeGeometry(0.1, 0.6, 4);
        const hornMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const h1 = new THREE.Mesh(hornGeo, hornMat);
        h1.position.set(-0.5, 0.6, 0);
        h1.rotation.z = 0.6;
        const h2 = new THREE.Mesh(hornGeo, hornMat);
        h2.position.set(0.5, 0.6, 0);
        h2.rotation.z = -0.6;
        this.player.add(h1, h2);

        this.player.position.set(0, 2, 0);
        this.scene.add(this.player);

        this.createLevel();
        this.addDecorations();

        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        window.addEventListener('resize', () => this.onWindowResize());

        document.getElementById('start-btn').onclick = () => this.startGame();
        document.getElementById('retry-btn').onclick = () => location.reload();
        document.getElementById('restart-btn').onclick = () => location.reload();

        this.animate();
    }

    addDecorations() {
        // Floating Crystals (サムネイルの背景)
        for (let i = 0; i < 30; i++) {
            const size = Math.random() * 4 + 1;
            const geo = new THREE.OctahedronGeometry(size, 0);
            const mat = new THREE.MeshStandardMaterial({
                color: Math.random() > 0.5 ? 0x00ffff : 0xff00ff,
                emissive: Math.random() > 0.5 ? 0x00ffff : 0xff00ff,
                emissiveIntensity: 0.6,
                transparent: true,
                opacity: 0.6
            });
            const crystal = new THREE.Mesh(geo, mat);
            crystal.position.set(
                (Math.random() - 0.5) * 80,
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 120 - 40
            );
            crystal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            this.scene.add(crystal);
        }

        // Void Rings (幻想的な軌道)
        for (let i = 0; i < 6; i++) {
            const ringGeo = new THREE.TorusGeometry(20 + i * 8, 0.04, 16, 100);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0x5555ff,
                transparent: true,
                opacity: 0.2
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(0, 0, -40);
            ring.rotation.x = Math.PI / 2.5;
            ring.rotation.y = Math.random() * Math.PI;
            this.scene.add(ring);
        }
    }

    createLevel() {
        // --- Platforms (六角柱の浮遊島スタイル) ---
        this.addPlatform(0, 0, 0, 5, 5);

        const coords = [
            [0, 0, -10],
            [5, 1, -20],
            [-3, 2, -30],
            [4, 1.5, -42],
            [0, 3, -55],
            [-6, 2, -68],
            [0, 3, -80]
        ];

        coords.forEach(pos => {
            this.addPlatform(pos[0], pos[1], pos[2], 3.5, 3.5);
        });

        // Goal Platform
        this.goal = this.addPlatform(0, 4, -95, 8, 8, 0x00ff00);

        // Goal Marker (サムネイルのような光の輪)
        const markerGeo = new THREE.TorusGeometry(3, 0.15, 16, 100);
        const markerMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00 });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.set(0, 8, -95);
        this.scene.add(marker);

        const lightMarker = new THREE.PointLight(0x00ff00, 20, 50);
        lightMarker.position.set(0, 8, -95);
        this.scene.add(lightMarker);
    }

    addPlatform(x, y, z, w, d, color = 0x222244) {
        const group = new THREE.Group();

        // Island Top
        const topGeo = new THREE.CylinderGeometry(w / 1.5, w / 1.5, 0.5, 6);
        const topMat = new THREE.MeshStandardMaterial({ color: color });
        const topMesh = new THREE.Mesh(topGeo, topMat);
        topMesh.receiveShadow = true;
        group.add(topMesh);

        // Island Bottom (Tapered pillar)
        const bottomGeo = new THREE.CylinderGeometry(w / 1.5, 0, 3, 6);
        const bottomMat = new THREE.MeshStandardMaterial({
            color: 0x111122,
            transparent: true,
            opacity: 0.9
        });
        const bottomMesh = new THREE.Mesh(bottomGeo, bottomMat);
        bottomMesh.position.y = -1.75;
        group.add(bottomMesh);

        // Neon Aura (底部が光る演出)
        const auraGeo = new THREE.CylinderGeometry(w / 1.5 + 0.3, w / 1.5 + 0.3, 0.1, 6);
        const auraMat = new THREE.MeshBasicMaterial({
            color: color === 0x00ff00 ? 0x00ff00 : 0x00ffff,
            transparent: true,
            opacity: 0.3
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.y = -0.3;
        group.add(aura);

        group.position.set(x, y, z);
        this.scene.add(group);

        // Interaction Metadata
        const pData = { x, y, z, w, d };
        this.platforms.push(pData);
        return group;
    }

    startGame() {
        document.getElementById('start-overlay').classList.add('hidden');
        this.isMoving = true;
        this.startTime = Date.now();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update() {
        if (!this.isMoving || this.isGameOver) return;

        // Timer
        this.elapsedTime = (Date.now() - this.startTime) / 1000;
        document.getElementById('timer').innerText = `TIME: ${this.elapsedTime.toFixed(2)}`;

        // Movement
        const moveVec = new THREE.Vector3();
        if (this.keys['KeyW']) moveVec.z -= 1;
        if (this.keys['KeyS']) moveVec.z += 1;
        if (this.keys['KeyA']) moveVec.x -= 1;
        if (this.keys['KeyD']) moveVec.x += 1;

        moveVec.normalize().multiplyScalar(this.moveSpeed);
        this.player.position.x += moveVec.x;
        this.player.position.z += moveVec.z;

        // Jump
        if (this.keys['Space'] && this.canJump) {
            this.playerVelocity.y = this.jumpForce;
            this.canJump = false;
        }

        // Physics
        this.playerVelocity.y += this.gravity;
        this.player.position.y += this.playerVelocity.y;

        // Collision detection (浮遊島の座標データに基づき判定)
        let onGround = false;
        this.platforms.forEach(p => {
            const dx = Math.abs(this.player.position.x - p.x);
            const dz = Math.abs(this.player.position.z - p.z);
            const py = this.player.position.y;

            if (dx < (p.w / 1.25) && dz < (p.d / 1.25)) {
                if (py > p.y && py < p.y + 1.2) {
                    if (this.playerVelocity.y < 0) {
                        this.player.position.y = p.y + 0.75;
                        this.playerVelocity.y = 0;
                        this.canJump = true;
                        onGround = true;
                    }
                }
            }
        });

        // Fall check
        if (this.player.position.y < -15) {
            this.gameOver(false);
        }

        // Goal check
        if (this.player.position.z < -90) {
            this.gameOver(true);
        }

        // Camera follow (Smooth transition)
        const targetCamPos = new THREE.Vector3(
            this.player.position.x,
            this.player.position.y + 6,
            this.player.position.z + 12
        );
        this.camera.position.lerp(targetCamPos, 0.1);
        this.camera.lookAt(this.player.position);
    }

    gameOver(win) {
        this.isGameOver = true;
        this.isMoving = false;
        if (win) {
            document.getElementById('final-time').innerText = this.elapsedTime.toFixed(2);
            document.getElementById('finish-overlay').classList.remove('hidden');
        } else {
            document.getElementById('fall-overlay').classList.remove('hidden');
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

new Game3D();
