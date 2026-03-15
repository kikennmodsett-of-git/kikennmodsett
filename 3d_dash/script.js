import * as THREE from 'three';

class Game3D {
    constructor() {
        this.container = document.getElementById('game-container');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1500);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });

        this.player = null;
        this.platforms = [];
        this.movingPlatforms = [];
        // Advanced Systems (Sections & Respawn)
        this.checkpoint = new THREE.Vector3(0, 2, 0);
        this.currentSection = 0;
        this.sectionSplits = [];
        this.sectionThresholds = [-60, -120, -190, -310]; // Match gate positions
        this.sectionCheckpoints = [
            new THREE.Vector3(0, 2, 0),    // Section 1
            new THREE.Vector3(0, 4, -70),  // Section 2
            new THREE.Vector3(0, 6, -132), // Section 3
            new THREE.Vector3(0, 11, -205),// Section 4
            new THREE.Vector3(0, 16, -325) // Section 5
        ];
        this.checkpointRotation = 0;

        this.keys = {};
        this.isMoving = false;
        this.isGameOver = false;
        this.startTime = 0;
        this.elapsedTime = 0;

        this.playerVelocity = new THREE.Vector3();
        this.playerRotation = 0;
        this.canJump = true;
        this.gravity = -0.015;
        this.moveSpeed = 0.17;
        this.rotationSpeed = 0.05;
        this.jumpForce = 0.38;

        this.currentSection = 0;
        this.sectionThresholds = [-100, -220, -350, -500];
        this.sectionSplits = [];

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.scene.background = new THREE.Color(0x01010a);
        this.scene.fog = new THREE.Fog(0x01010a, 50, 250);

        const ambientLight = new THREE.AmbientLight(0x404040, 5.0);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x00ffff, 25, 300);
        pointLight.position.set(30, 60, 30);
        pointLight.castShadow = true;
        this.scene.add(pointLight);

        this.createPlayer();
        this.createLevel();
        this.createParticles();
        this.addDecorations();

        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        window.addEventListener('resize', () => this.onWindowResize());

        document.getElementById('start-btn').onclick = () => this.startGame();
        document.getElementById('retry-btn').onclick = () => location.reload();
        document.getElementById('restart-btn').onclick = () => this.respawn();

        this.animate();
    }

    createPlayer() {
        this.player = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.6 })
        );
        body.castShadow = true;
        this.player.add(body);

        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const eyeL = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.4), eyeMat);
        eyeL.position.set(-0.25, 0.1, 0.51);
        const eyeR = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.4), eyeMat);
        eyeR.position.set(0.25, 0.1, 0.51);
        this.player.add(eyeL, eyeR);

        const hornMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const h1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 4), hornMat);
        h1.position.set(-0.5, 0.7, 0); h1.rotation.z = 0.6;
        const h2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 4), hornMat);
        h2.position.set(0.5, 0.7, 0); h2.rotation.z = -0.6;
        this.player.add(h1, h2);

        this.player.position.copy(this.checkpoint);
        this.scene.add(this.player);
    }

    createParticles() {
        const geo = new THREE.BufferGeometry();
        const count = 2000;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 600;
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.2, transparent: true, opacity: 0.5 });
        this.particles = new THREE.Points(geo, mat);
        this.scene.add(this.particles);
    }

    addDecorations() {
        for (let i = 0; i < 70; i++) {
            const size = Math.random() * 6 + 2;
            const color = Math.random() > 0.5 ? 0x00ffff : 0xff00ff;
            const crystal = new THREE.Mesh(
                new THREE.OctahedronGeometry(size, 0),
                new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 })
            );
            crystal.position.set((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 150, (Math.random() - 0.5) * 1000 - 300);
            crystal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            this.scene.add(crystal);

            if (i % 8 === 0) {
                const light = new THREE.PointLight(color, 25, 60);
                light.position.copy(crystal.position);
                this.scene.add(light);
            }
        }
    }

    createLevel() {
        // Section 1: Introduction (Z-distance: 9)
        this.addPlatform(0, 0, 0, 8, 8);
        this.addRespawnGate(0, 0, 5, 0x00ffff);
        for (let i = 1; i <= 6; i++) this.addPlatform(Math.sin(i) * 3, i * 0.4, i * -9, 4, 4);

        // Section 2: Moving Platforms (Z-distance: 12)
        this.addRespawnGate(0, 3, -60, 0x00ffff);
        this.addPlatform(0, 3, -70, 10, 10, 0x00ffff);
        this.addMovingPlatform(0, 3, -82, 5, 5, 0x00ffff, new THREE.Vector3(6, 0, 0), 0.04);
        this.addMovingPlatform(0, 4, -94, 5, 5, 0x00ffff, new THREE.Vector3(-6, 0, 0), 0.05);
        this.addPlatform(0, 5, -106, 6, 6);

        // Section 3: Vertical Gimmicks (Z-distance: 12)
        this.addRespawnGate(0, 5, -120, 0xff00ff);
        this.addPlatform(0, 5, -132, 10, 10, 0xff00ff);
        this.addMovingPlatform(0, 6, -144, 5, 5, 0xff00ff, new THREE.Vector3(0, 4, 0), 0.03);
        this.addMovingPlatform(4, 8, -156, 5, 5, 0xff00ff, new THREE.Vector3(0, 5, 0), 0.04);
        this.addPlatform(0, 10, -172, 8, 8);

        // Section 4: The Void (Controlled Randomness: Z-distance: ~10)
        this.addRespawnGate(0, 10, -190, 0xffff00);
        this.addPlatform(0, 10, -205, 12, 12, 0xffff00);
        for (let i = 1; i <= 10; i++) {
            const x = (Math.random() - 0.5) * 8;
            this.addPlatform(x, 10 + i * 0.4, -205 + i * -10, 3.5, 3.5);
        }

        // Section 5: Moving Maze (Z-distance: 12)
        this.addRespawnGate(0, 15, -310, 0xffffff);
        this.addPlatform(0, 15, -325, 15, 15, 0xffffff);
        this.addMovingPlatform(5, 15, -337, 5, 5, 0x00ffff, new THREE.Vector3(-6, 3, -4), 0.02);
        this.addMovingPlatform(-5, 18, -349, 5, 5, 0xff00ff, new THREE.Vector3(6, -3, -4), 0.03);
        this.addMovingPlatform(0, 17, -361, 6, 6, 0x00ffff, new THREE.Vector3(0, 0, -8), 0.04);

        // Goal
        this.goal = this.addPlatform(0, 20, -390, 20, 20, 0x00ff00);
        const marker = new THREE.Mesh(
            new THREE.TorusGeometry(8, 0.4, 16, 120),
            new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 3 })
        );
        marker.position.set(0, 35, -390);
        this.scene.add(marker);
    }

    addPlatform(x, y, z, w, d, color = 0x222244) {
        const group = new THREE.Group();
        const top = new THREE.Mesh(new THREE.CylinderGeometry(w / 1.5, w / 1.5, 0.8, 6), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0 }));
        top.receiveShadow = true;
        group.add(top);

        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(w / 1.5, 0, 7, 6), new THREE.MeshStandardMaterial({ color: 0x050515, transparent: true, opacity: 0.9 }));
        pillar.position.y = -3.8;
        group.add(pillar);

        // Floating debris (thumbnail style)
        for (let i = 0; i < 4; i++) {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0x444466 }));
            rock.position.set((Math.random() - 0.5) * w, -1 - Math.random() * 3, (Math.random() - 0.5) * d);
            group.add(rock);
        }

        const aura = new THREE.Mesh(new THREE.CylinderGeometry(w / 1.5 + 0.6, w / 1.5 + 0.6, 0.15, 6), new THREE.MeshBasicMaterial({ color: color === 0x222244 ? 0x00ffff : color, transparent: true, opacity: 0.4 }));
        aura.position.y = -0.4;
        group.add(aura);

        group.position.set(x, y, z);
        this.scene.add(group);
        this.platforms.push({ x, y, z, w, d, group });
        return group;
    }

    addMovingPlatform(x, y, z, w, d, color, offset, speed) {
        const platform = this.addPlatform(x, y, z, w, d, color);
        this.movingPlatforms.push({ mesh: platform, basePos: new THREE.Vector3(x, y, z), offset, speed, t: Math.random() * Math.PI * 2 });
    }

    addRespawnGate(x, y, z, color) {
        const group = new THREE.Group();
        const frame = new THREE.Mesh(new THREE.TorusGeometry(3, 0.2, 16, 50), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 }));
        group.add(frame);
        const light = new THREE.PointLight(color, 10, 20);
        group.add(light);
        group.position.set(x, y + 3, z);
        this.scene.add(group);
    }

    startGame() {
        document.getElementById('start-overlay').classList.add('hidden');
        this.isMoving = true;
        this.startTime = Date.now();
    }

    respawn() {
        this.player.position.copy(this.checkpoint);
        this.playerVelocity.set(0, 0, 0);
        this.playerRotation = this.checkpointRotation;
        document.getElementById('fall-overlay').classList.add('hidden');
        this.isMoving = true;
    }

    update() {
        if (!this.isMoving || this.isGameOver) return;
        this.elapsedTime = (Date.now() - this.startTime) / 1000;
        document.getElementById('timer').innerText = `TOTAL: ${this.elapsedTime.toFixed(2)}s`;

        // Moving Platforms Update
        this.movingPlatforms.forEach(mp => {
            mp.t += mp.speed;
            const factor = Math.sin(mp.t);
            mp.mesh.position.x = mp.basePos.x + mp.offset.x * factor;
            mp.mesh.position.y = mp.basePos.y + mp.offset.y * factor;
            mp.mesh.position.z = mp.basePos.z + mp.offset.z * factor;
            // Update metadata for collision
            const meta = this.platforms.find(p => p.group === mp.mesh);
            if (meta) { meta.x = mp.mesh.position.x; meta.y = mp.mesh.position.y; meta.z = mp.mesh.position.z; }
        });

        // Checkpoint & Sections
        if (this.currentSection < this.sectionThresholds.length && this.player.position.z < this.sectionThresholds[this.currentSection]) {
            this.sectionSplits.push(this.elapsedTime);
            this.currentSection++;
            // Update Checkpoint to fixed section start
            this.checkpoint.copy(this.sectionCheckpoints[this.currentSection]);
            this.checkpointRotation = this.playerRotation;

            document.getElementById('splits').innerHTML = `SECTION ${this.currentSection + 1}<br>` +
                this.sectionSplits.map((t, i) => `<span style="font-size:0.8em; opacity:0.6">S${i + 1}: ${t.toFixed(2)}s</span>`).join(' | ');
        }

        // Controls
        if (this.keys['ArrowLeft']) this.playerRotation += this.rotationSpeed;
        if (this.keys['ArrowRight']) this.playerRotation -= this.rotationSpeed;
        this.player.rotation.y = this.playerRotation;

        const isDashing = (this.keys['ShiftLeft'] || this.keys['ShiftRight']);
        const currentSpeed = isDashing ? this.moveSpeed * 1.8 : this.moveSpeed;
        const moveVec = new THREE.Vector3();
        if (this.keys['KeyW']) moveVec.z -= 1; if (this.keys['KeyS']) moveVec.z += 1;
        if (this.keys['KeyA']) moveVec.x -= 1; if (this.keys['KeyD']) moveVec.x += 1;

        if (moveVec.length() > 0) {
            moveVec.normalize().multiplyScalar(currentSpeed).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotation);
            this.player.position.add(moveVec);
        }

        // Jump & Gravity
        if (this.keys['Space'] && this.canJump) { this.playerVelocity.y = this.jumpForce; this.canJump = false; }
        this.playerVelocity.y += this.gravity;
        this.player.position.y += this.playerVelocity.y;

        // Collision
        let onGround = false;
        this.platforms.forEach(p => {
            const dx = Math.abs(this.player.position.x - p.x);
            const dz = Math.abs(this.player.position.z - p.z);
            if (dx < p.w / 1.2 && dz < p.d / 1.2 && this.player.position.y > p.y && this.player.position.y < p.y + 1.5) {
                if (this.playerVelocity.y < 0) {
                    this.player.position.y = p.y + 0.75;
                    this.playerVelocity.y = 0;
                    this.canJump = true;
                    onGround = true;
                    // Stick to moving platform
                    const mp = this.movingPlatforms.find(m => m.mesh === p.group);
                    if (mp) {
                        const factor = Math.cos(mp.t) * mp.speed;
                        this.player.position.x += mp.offset.x * factor;
                        this.player.position.y += mp.offset.y * factor;
                        this.player.position.z += mp.offset.z * factor;
                    }
                }
            }
        });

        if (this.player.position.y < -35) { this.isMoving = false; document.getElementById('fall-overlay').classList.remove('hidden'); }
        if (this.player.position.z < -380) {
            this.isGameOver = true; this.isMoving = false;
            document.getElementById('final-time').innerText = this.elapsedTime.toFixed(2);
            document.getElementById('finish-overlay').classList.remove('hidden');
        }

        const camOffset = new THREE.Vector3(0, 4, 8).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotation);
        this.camera.position.lerp(this.player.position.clone().add(camOffset), 0.15);
        this.camera.lookAt(this.player.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
        if (this.particles) this.particles.position.z = this.player.position.z;
    }

    animate() { requestAnimationFrame(() => this.animate()); this.update(); this.renderer.render(this.scene, this.camera); }
    onWindowResize() { this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(window.innerWidth, window.innerHeight); }
}

new Game3D();
