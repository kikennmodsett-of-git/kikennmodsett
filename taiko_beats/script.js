class TaikoGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.audioCtx = null;
        this.audioBuffer = null;
        this.sourceNode = null;

        this.notes = [];
        this.chart = []; // {time, type} type: 0: don, 1: kat

        this.score = 0;
        this.combo = 0;
        this.stats = { good: 0, nice: 0, bad: 0 };

        this.isPlaying = false;
        this.startTime = 0;
        this.currentTime = 0;

        // Settings
        this.laneY = window.innerHeight * 0.5;
        this.judgmentX = 200;
        this.noteRadius = 40;
        this.noteSpeed = 400; // pixels per second

        this.judgmentWindows = {
            good: 0.05, // +-50ms
            nice: 0.12, // +-120ms
            bad: 0.20   // +-200ms
        };

        // Difficulty Config
        this.difficulty = 'normal';
        this.diffConfig = {
            easy: { thresholdRatio: 0.15, minGap: 0.45, speed: 320 },
            normal: { thresholdRatio: 0.10, minGap: 0.28, speed: 450 },
            hard: { thresholdRatio: 0.06, minGap: 0.18, speed: 620 }
        };

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        document.getElementById('audio-upload').addEventListener('change', (e) => this.handleUpload(e));
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('retry-btn').addEventListener('click', () => location.reload());

        // Difficulty button handling
        const diffBtns = document.querySelectorAll('.diff-btn');
        diffBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                diffBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.difficulty = btn.dataset.diff;
                if (this.audioBuffer) this.generateChart(); // Re-analyze
            });
        });

        window.addEventListener('keydown', (e) => this.handleInput(e));
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.laneY = window.innerHeight * 0.5;
    }

    async handleUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('file-name').innerText = file.name;
        document.getElementById('status').innerText = '楽曲を読み込んでいます...';

        try {
            const arrayBuffer = await file.arrayBuffer();
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

            document.getElementById('difficulty-selection').classList.remove('hidden');
            await this.generateChart();
            document.getElementById('start-btn').disabled = false;
        } catch (err) {
            console.error(err);
            document.getElementById('status').innerText = '読み込みに失敗しました。';
        }
    }

    async generateChart() {
        const pcmData = this.audioBuffer.getChannelData(0);
        const sampleRate = this.audioBuffer.sampleRate;
        const detections = [];

        const frameSize = 1024;
        const overlap = 512;

        // 1. Scan for Max Energy
        let maxEnergy = 0;
        for (let i = 0; i < pcmData.length - frameSize; i += overlap * 4) {
            let energy = 0;
            for (let j = 0; j < frameSize; j++) {
                energy += Math.abs(pcmData[i + j]);
            }
            if (energy / frameSize > maxEnergy) maxEnergy = energy / frameSize;
        }

        // 2. Dynamic Analysis
        const config = this.diffConfig[this.difficulty];
        const threshold = Math.max(0.01, maxEnergy * config.thresholdRatio);
        const minGap = config.minGap;
        let lastPeakTime = -1;
        let lastRollEndTime = -5; // For interval control

        for (let i = 0; i < pcmData.length - frameSize; i += overlap) {
            let energy = 0;
            for (let j = 0; j < frameSize; j++) {
                energy += Math.abs(pcmData[i + j]);
            }
            energy /= frameSize;

            if (energy > threshold) {
                const time = i / sampleRate;

                // Detect Sustained Energy for "Roll" (Added interval check and stricter duration)
                let sustainEnd = i;
                let lookAhead = i + overlap;
                const rollThreshold = threshold * 1.1; // Stricter for rolls

                while (lookAhead < pcmData.length - frameSize) {
                    let nextEnergy = 0;
                    for (let k = 0; k < frameSize; k++) nextEnergy += Math.abs(pcmData[lookAhead + k]);
                    if (nextEnergy / frameSize < rollThreshold * 0.8) break;
                    sustainEnd = lookAhead;
                    lookAhead += overlap;
                }

                const duration = (sustainEnd - i) / sampleRate;

                // Only allow Roll if it's long enough AND we haven't had one recently (5s interval)
                if (duration > 0.8 && time > lastRollEndTime + 5.0) {
                    detections.push({
                        time: time,
                        duration: Math.min(duration, 2.5), // Cap at 2.5s
                        type: 2 // Roll
                    });
                    i = sustainEnd + (minGap * sampleRate);
                    lastPeakTime = (sustainEnd / sampleRate);
                    lastRollEndTime = (sustainEnd / sampleRate);
                } else if (time - lastPeakTime > minGap) {
                    detections.push({
                        time: time,
                        duration: 0,
                        type: Math.random() > 0.7 ? 1 : 0
                    });
                    lastPeakTime = time;
                }
            }
        }

        // 3. Fallback (If no notes, generate periodically)
        if (detections.length === 0) {
            const songDuration = this.audioBuffer.duration;
            for (let t = 2; t < songDuration - 2; t += 1.0) {
                detections.push({ time: t, duration: 0, type: 0 });
            }
        }

        this.chart = detections;
        document.getElementById('status').innerText = `解析完了: ${this.chart.length} 個のノーツを生成 (${this.difficulty.toUpperCase()})`;
    }

    startGame() {
        document.getElementById('setup-overlay').classList.add('hidden');
        this.isPlaying = true;
        this.startTime = this.audioCtx.currentTime + 1.0; // 1s delay

        this.noteSpeed = this.diffConfig[this.difficulty].speed;

        this.sourceNode = this.audioCtx.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        this.sourceNode.connect(this.audioCtx.destination);
        this.sourceNode.start(this.startTime);

        this.notes = this.chart.map(n => ({ ...n, hit: false }));

        this.animate();
    }

    handleInput(e) {
        if (!this.isPlaying) return;

        let type = -1;
        if (e.code === 'KeyW') type = 0; // Don
        if (e.code === 'KeyS') type = 1; // Kat

        if (type === -1) return;

        const time = this.audioCtx.currentTime - this.startTime;
        this.checkHit(time, type);
    }

    checkHit(time, type) {
        // Special case: Roll (type: 2)
        const roll = this.notes.find(n => n.type === 2 && time >= n.time - 0.1 && time <= n.time + n.duration + 0.1);
        if (roll) {
            this.score += 20;
            this.stats.good++; // Count as good for result but don't show pop-up every hit
            this.showJudgment('連打！', true);
            this.updateUI();
            return;
        }

        // Find the closest unhit note of the same type
        const target = this.notes.find(n => !n.hit && (n.type === 0 || n.type === 1) && Math.abs(n.time - time) < this.judgmentWindows.bad);

        if (target && target.type === type) {
            const diff = Math.abs(target.time - time);
            let judgment = 'bad';

            if (diff < this.judgmentWindows.good) {
                judgment = 'good';
                this.score += 100;
                this.stats.good++;
            } else if (diff < this.judgmentWindows.nice) {
                judgment = 'nice';
                this.score += 50;
                this.stats.nice++;
            } else {
                judgment = 'bad';
                this.stats.bad++;
            }

            target.hit = true;
            this.showJudgment(judgment);

            if (judgment !== 'bad') {
                this.combo++;
            } else {
                this.combo = 0;
            }

            this.updateUI();
        }
    }

    showJudgment(text, isRoll = false) {
        const el = document.getElementById('judgment');
        el.innerText = text.toUpperCase();
        el.style.color = isRoll ? '#ffcc00' : (text === 'good' ? '#ffcc00' : (text === 'nice' ? '#00ffcc' : '#ff3333'));

        if (!isRoll || Math.random() > 0.5) { // Reduce flicker for roll
            el.classList.remove('pop-anim');
            void el.offsetWidth;
            el.classList.add('pop-anim');
        }
    }

    updateUI() {
        document.getElementById('score').innerText = `SCORE: ${this.score}`;
        document.getElementById('combo').innerText = `${this.combo} COMBO`;
    }

    animate() {
        if (!this.isPlaying) return;

        this.currentTime = this.audioCtx.currentTime - this.startTime;
        this.draw();

        // Game end check
        if (this.currentTime > this.audioBuffer.duration + 1) {
            this.endGame();
            return;
        }

        // Auto-bad for missed notes
        this.notes.forEach(n => {
            if (!n.hit && this.currentTime > n.time + this.judgmentWindows.bad) {
                n.hit = true;
                this.combo = 0;
                this.updateUI();
                this.showJudgment('bad');
                this.stats.bad++;
            }
        });

        requestAnimationFrame(() => this.animate());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Lane
        this.ctx.fillStyle = 'rgba(255,255,255,0.05)';
        this.ctx.fillRect(0, this.laneY - 60, this.canvas.width, 120);

        // Draw Judgment Circle
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(this.judgmentX, this.laneY, this.noteRadius + 5, 0, Math.PI * 2);
        this.ctx.stroke();

        // Draw Notes
        this.notes.forEach(note => {
            if (note.hit) return;

            const x = this.judgmentX + (note.time - this.currentTime) * this.noteSpeed;

            // Special Drawing for Roll
            if (note.type === 2) {
                const endX = x + note.duration * this.noteSpeed;
                if (endX < -100 || x > this.canvas.width + 100) return;

                // Draw Roll Bar
                this.ctx.fillStyle = '#ffcc00'; // Yellow
                this.ctx.beginPath();
                this.ctx.roundRect(x, this.laneY - this.noteRadius, endX - x, this.noteRadius * 2, this.noteRadius);
                this.ctx.fill();
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                // Roll text
                this.ctx.fillStyle = '#333';
                this.ctx.font = 'bold 18px Noto Sans JP';
                this.ctx.fillText('連打', x + 30, this.laneY);
                return;
            }

            if (x < -100 || x > this.canvas.width + 100) return;

            this.ctx.beginPath();
            this.ctx.arc(x, this.laneY, this.noteRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = note.type === 0 ? '#ff3333' : '#33ccff';
            this.ctx.fill();
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Symbol
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 20px Noto Sans JP';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(note.type === 0 ? 'ドン' : 'カッ', x, this.laneY);
        });
    }

    endGame() {
        this.isPlaying = false;

        const clearThreshold = this.chart.length * 40; // 40 score per note average
        const isClear = this.score >= clearThreshold;

        document.getElementById('result-overlay').classList.remove('hidden');
        document.getElementById('result-title').innerText = isClear ? 'STAGE CLEARED' : 'FAILED';
        document.getElementById('result-title').style.color = isClear ? '#00ffcc' : '#ff3333';

        document.getElementById('stat-good').innerText = this.stats.good;
        document.getElementById('stat-nice').innerText = this.stats.nice;
        document.getElementById('stat-bad').innerText = this.stats.bad;
        document.getElementById('stat-total').innerText = this.score;

        document.getElementById('clear-status').innerText = isClear
            ? 'おめでとうございます！合格ラインを突破しました。'
            : `不合格... (必要スコア: ${clearThreshold})`;
    }
}

new TaikoGame();
