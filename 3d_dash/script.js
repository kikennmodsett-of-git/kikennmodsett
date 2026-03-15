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

        // Physics & Controls
        this.playerVelocity = new THREE.Vector3();
        this.playerRotation = 0;
        this.canJump = true;
        this.gravity = -0.015;
        this.moveSpeed = 0.16;
        this.rotationSpeed = 0.05;
        this.jumpForce = 0.38;

        // Advanced Systems (Sections & Respawn)
        this.checkpoint = new THREE.Vector3(0, 2, 0);
        this.currentSection = 0;
        this.sectionSplits = [];
        this.sectionThresholds = [-80, -180, -280]; // Z-coordinates for section transitions

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.scene.background = new THREE.Color(0x010108);
        this.scene.fog = new THREE.Fog(0x010108, 40, 180);

        // Lights Optimization
        const ambientLight = new THREE.AmbientLight(0x404040, 4.0);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x00ffff, 20, 200);
        pointLight.position.set(20, 40, 20);
        pointLight.castShadow = true;
        this.scene.add(pointLight);

        // --- Create Player ---
        this.player = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        this.player.add(body);

        // Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const eyeL = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.4), eyeMat);
        eyeL.position.set(-0.25, 0.1, 0.51);
        const eyeR = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.4), eyeMat);
        eyeR.position.set(0.25, 0.1, 0.51);
        this.player.add(eyeL, eyeR);

        // Ornament
        const hornMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const h1 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7, 4), hornMat);
        h1.position.set(-0.5, 0.7, 0); h1.rotation.z = 0.6;
        const h2 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7, 4), hornMat);
        h2.position.set(0.5, 0.7, 0); h2.rotation.z = -0.6;
        this.player.add(h1, h2);

        this.player.position.copy(this.checkpoint);
        this.scene.add(this.player);

        this.createLevel();
        this.addDecorations();

        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        window.addEventListener('resize', () => this.onWindowResize());

        document.getElementById('start-btn').onclick = () => this.startGame();
        document.getElementById('retry-btn').onclick = () => location.reload();
        document.getElementById('restart-btn').onclick = () => this.respawn();

        this.animate();
    }

    addDecorations() {
        // More Crystals with individual lights
        for (let i = 0; i < 50; i++) {
            const size = Math.random() * 5 + 2;
            const color = Math.random() > 0.5 ? 0x00ffff : 0xff00ff;
            const crystal = new THREE.Mesh(
                new THREE.OctahedronGeometry(size, 0),
                new THREE.MeshStandardMaterial({
                    color: color, emissive: color, emissiveIntensity: 1.2, transparent: true, opacity: 0.7
                })
            );
            crystal.position.set((Math.random() - 0.5) * 120, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 400 - 150);
            this.scene.add(crystal);

            // Subtle glow lights
            if (i % 5 === 0) {
                const pLight = new THREE.PointLight(color, 15, 40);
                pLight.position.copy(crystal.position);
                this.scene.add(pLight);
            }
        }

        // Orbital Rings
        for (let i = 0; i < 12; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(30 + i * 15, 0.08, 16, 120),
                new THREE.MeshBasicMaterial({ color: 0x5555ff, transparent: true, opacity: 0.15 })
            );
            ring.position.set(0, 0, -150);
            ring.rotation.x = Math.PI / 2.5;
            ring.rotation.y = Math.random() * Math.PI;
            this.scene.add(ring);
        }
    }

    createLevel() {
        // Section 1
        this.addPlatform(0, 0, 0, 8, 8);
        for (let i = 1; i <= 8; i++) {
            const x = Math.sin(i) * 5;
            this.addPlatform(x, i * 0.5, i * -10, 4, 4);
        }

        // Section 2
        this.addPlatform(0, 5, -90, 10, 10, 0x00ffff); // Checkpoint 1
        for (let i = 1; i <= 8; i++) {
            const x = Math.cos(i) * 8;
            this.addPlatform(x, 5 + i * 0.5, -90 + i * -12, 4, 4);
        }

        // Section 3
        this.addPlatform(0, 10, -200, 10, 10, 0xff00ff); // Checkpoint 2
        for (let i = 1; i <= 10; i++) {
            const x = (Math.random() - 0.5) * 12;
            this.addPlatform(x, 10 + i * 0.8, -200 + i * -12, 3.5, 3.5);
        }

        // Goal
        this.goal = this.addPlatform(0, 20, -350, 15, 15, 0x00ff00);
        const marker = new THREE.Mesh(
            new THREE.TorusGeometry(5, 0.3, 16, 100),
            new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 2 })
        );
        marker.position.set(0, 28, -350);
        this.scene.add(marker);

        const goalLight = new THREE.PointLight(0x00ff00, 50, 100);
        goalLight.position.set(0, 28, -350);
        this.scene.add(goalLight);
    }

    addPlatform(x, y, z, w, d, color = 0x222244) {
        const group = new THREE.Group();

        // Island Top (High Emissive)
        const topMat = new THREE.MeshStandardMaterial({
            color: color, emissive: color, emissiveIntensity: 0.8
        });
        const topMesh = new THREE.Mesh(new THREE.CylinderGeometry(w / 1.5, w / 1.5, 0.6, 6), topMat);
        topMesh.receiveShadow = true;
        group.add(topMesh);

        // Pillar
        const bottomMat = new THREE.MeshStandardMaterial({ color: 0x050510, transparent: true, opacity: 0.9 });
        const bottomMesh = new THREE.Mesh(new THREE.CylinderGeometry(w / 1.5, 0, 5, 6), bottomMat);
        bottomMesh.position.y = -2.8;
        group.add(bottomMesh);

        // Neon Aura (Glow)
        const auraMat = new THREE.MeshBasicMaterial({
            color: color === 0x222244 ? 0x00ffff : color, transparent: true, opacity: 0.5
        });
        const aura = new THREE.Mesh(new THREE.CylinderGeometry(w / 1.5 + 0.5, w / 1.5 + 0.5, 0.2, 6), auraMat);
        aura.position.y = -0.3;
        group.add(aura);

        group.position.set(x, y, z);
        this.scene.add(group);
        this.platforms.push({ x, y, z, w, d });
        return group;
    }

    startGame() {
        document.getElementById('start-overlay').classList.add('hidden');
        this.isMoving = true;
        this.startTime = Date.now();
    }

    respawn() {
        this.player.position.copy(this.checkpoint);
        this.playerVelocity.set(0, 0, 0);
        document.getElementById('fall-overlay').classList.add('hidden');
        this.isMoving = true;
        this.isGameOver = false;
    }

    update() {
        if (!this.isMoving || this.isGameOver) return;

        this.elapsedTime = (Date.now() - this.startTime) / 1000;
        document.getElementById('timer').innerText = `TOTAL: ${this.elapsedTime.toFixed(2)}s`;

        // Section & Checkpoint Logic
        if (this.currentSection < this.sectionThresholds.length) {
            if (this.player.position.z < this.sectionThresholds[this.currentSection]) {
                const splitTime = this.elapsedTime;
                this.sectionSplits.push(splitTime);
                this.currentSection++;

                // Update Checkpoint
                this.checkpoint.copy(this.player.position);

                // Update UI
                const splitsEl = document.getElementById('splits');
                splitsEl.innerHTML = `SECTION ${this.currentSection + 1}<br>` +
                    this.sectionSplits.map((t, i) => `<span style="font-size:0.8em; opacity:0.7">S${i + 1}: ${t.toFixed(2)}s</span>`).join(' | ');
            }
        }

        // Controls
        if (this.keys['ArrowLeft']) this.playerRotation += this.rotationSpeed;
        if (this.keys['ArrowRight']) this.playerRotation -= this.rotationSpeed;
        this.player.rotation.y = this.playerRotation;

        const isDashing = (this.keys['ShiftLeft'] || this.keys['ShiftRight']);
        const currentSpeed = isDashing ? this.moveSpeed * 1.8 : this.moveSpeed;

        const moveVec = new THREE.Vector3();
        if (this.keys['KeyW']) moveVec.z -= 1;
        if (this.keys['KeyS']) moveVec.z += 1;
        if (this.keys['KeyA']) moveVec.x -= 1;
        if (this.keys['KeyD']) moveVec.x += 1;

        if (moveVec.length() > 0) {
            moveVec.normalize().multiplyScalar(currentSpeed);
            moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotation);
            this.player.position.add(moveVec);
        }

        // Physics
        if (this.keys['Space'] && this.canJump) {
            this.playerVelocity.y = this.jumpForce;
            this.canJump = false;
        }
        this.playerVelocity.y += this.gravity;
        this.player.position.y += this.playerVelocity.y;

        // Collision
        let onGround = false;
        this.platforms.forEach(p => {
            const dx = Math.abs(this.player.position.x - p.x);
            const dz = Math.abs(this.player.position.z - p.z);
            if (dx < p.w / 1.2 && dz < p.d / 1.2) {
                if (this.player.position.y > p.y && this.player.position.y < p.y + 1.5) {
                    if (this.playerVelocity.y < 0) {
                        this.player.position.y = p.y + 0.75;
                        this.playerVelocity.y = 0;
                        this.canJump = true;
                        onGround = true;
                    }
                }
            }
        });

        // Fall check (Auto-respawn UI)
        if (this.player.position.y < -25) {
            this.isMoving = false;
            document.getElementById('fall-overlay').classList.remove('hidden');
        }

        // Goal
        if (this.player.position.z < -340) {
            this.isGameOver = true;
            this.isMoving = false;
            document.getElementById('final-time').innerText = this.elapsedTime.toFixed(2);
            document.getElementById('finish-overlay').classList.remove('hidden');
        }

        // Camera
        const camOffset = new THREE.Vector3(0, 4, 8).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotation);
        this.camera.position.lerp(this.player.position.clone().add(camOffset), 0.1);
        this.camera.lookAt(this.player.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

new Game3D();
