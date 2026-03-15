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
        this.moveSpeed = 0.1;
        this.jumpForce = 0.3;

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.scene.background = new THREE.Color(0x020205);
        this.scene.fog = new THREE.Fog(0x020205, 10, 50);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.PointLight(0x00ffff, 5, 100);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Create Player
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5
        });
        this.player = new THREE.Mesh(geometry, material);
        this.player.position.set(0, 2, 0);
        this.player.castShadow = true;
        this.scene.add(this.player);

        this.createLevel();

        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        window.addEventListener('resize', () => this.onWindowResize());

        document.getElementById('start-btn').onclick = () => this.startGame();
        document.getElementById('retry-btn').onclick = () => location.reload();
        document.getElementById('restart-btn').onclick = () => location.reload();

        this.animate();
    }

    createLevel() {
        const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x222244 });
        const neonMaterial = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1 });

        // Start platform
        this.addPlatform(0, 0, 0, 5, 5);

        // Scattered platforms
        const coords = [
            [0, 0, -8],
            [4, 1, -15],
            [-2, 2, -22],
            [3, 1, -30],
            [0, 2, -38],
            [-4, 3, -45],
            [0, 2, -55]
        ];

        coords.forEach(pos => {
            this.addPlatform(pos[0], pos[1], pos[2], 3, 3);
        });

        // Goal platform
        this.goal = this.addPlatform(0, 3, -65, 6, 6, 0x00ff00);

        // Goal Marker
        const markerGeo = new THREE.TorusGeometry(2, 0.1, 16, 100);
        const markerMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00 });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.set(0, 6, -65);
        this.scene.add(marker);
    }

    addPlatform(x, y, z, w, d, color = 0x222244) {
        const geo = new THREE.BoxGeometry(w, 0.5, d);
        const mat = new THREE.MeshStandardMaterial({ color: color });
        const platform = new THREE.Mesh(geo, mat);
        platform.position.set(x, y, z);
        platform.receiveShadow = true;
        this.scene.add(platform);
        this.platforms.push(platform);
        return platform;
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

        // Collision detection
        let onGround = false;
        this.platforms.forEach(platform => {
            const dx = Math.abs(this.player.position.x - platform.position.x);
            const dz = Math.abs(this.player.position.z - platform.position.z);
            const py = this.player.position.y;
            const pheight = 0.5; // half cube + half platform

            if (dx < (platform.geometry.parameters.width / 2 + 0.5) &&
                dz < (platform.geometry.parameters.depth / 2 + 0.5)) {

                if (py > platform.position.y && py < platform.position.y + 1.1) {
                    if (this.playerVelocity.y < 0) {
                        this.player.position.y = platform.position.y + 0.75;
                        this.playerVelocity.y = 0;
                        this.canJump = true;
                        onGround = true;
                    }
                }
            }
        });

        // Fall check
        if (this.player.position.y < -10) {
            this.gameOver(false);
        }

        // Goal check
        if (this.player.position.z < -62) {
            this.gameOver(true);
        }

        // Camera follow
        this.camera.position.set(
            this.player.position.x,
            this.player.position.y + 5,
            this.player.position.z + 10
        );
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
