const blockRanks = [
    { name: "Brown", class: "rank-0", multiplier: 1 },
    { name: "Gray", class: "rank-1", multiplier: 1.5 },
    { name: "Green", class: "rank-2", multiplier: 2 },
    { name: "Yellow-Green", class: "rank-3", multiplier: 3 },
    { name: "Purple", class: "rank-4", multiplier: 5 },
    { name: "Pink", class: "rank-5", multiplier: 8 },
    { name: "Light Blue", class: "rank-6", multiplier: 12 },
    { name: "Red", class: "rank-7", multiplier: 20 },
    { name: "Silver", class: "rank-8", multiplier: 35 },
    { name: "Gold", class: "rank-9", multiplier: 50 },
    { name: "Rainbow", class: "rank-10", multiplier: 100 }
];

const toolRanks = [
    { name: "Wood", power: 1 },
    { name: "Stone", power: 5 },
    { name: "Iron", power: 20 },
    { name: "Diamond", power: 100 },
    { name: "Platinum", power: 500 }
];

let gameState = {
    score: 0,
    blockRank: 0,
    toolRank: 0
};

// DOM Elements
const scoreEl = document.getElementById('score');
const powerEl = document.getElementById('power');
const blockEl = document.getElementById('block');
const blockShopEl = document.getElementById('block-shop');
const toolShopEl = document.getElementById('tool-shop');
const clickEffectsEl = document.getElementById('click-effects');

// Init
function init() {
    loadGame();
    renderShop();
    updateUI();

    blockEl.addEventListener('click', handleBlockClick);

    // Auto-save every 30 seconds
    setInterval(saveGame, 30000);
}

function handleBlockClick(e) {
    const basePower = toolRanks[gameState.toolRank].power;
    const multiplier = blockRanks[gameState.blockRank].multiplier;
    const totalPower = basePower * multiplier;

    gameState.score += totalPower;

    // Get click position relative to the viewport for the effect
    // If e is undefined (simulated click), use center of block
    let x, y;
    if (e && e.clientX) {
        x = e.clientX;
        y = e.clientY;
    } else {
        const rect = blockEl.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    }

    createClickEffect(x, y, totalPower);
    updateUI();

    // Add a small scale animation reset
    blockEl.style.transform = 'rotateX(-20deg) rotateY(30deg) scale(0.95)';
    setTimeout(() => {
        blockEl.style.transform = '';
    }, 50);
}

function createClickEffect(x, y, amount) {
    const el = document.createElement('div');
    el.className = 'click-effect';
    el.textContent = `+${amount}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    clickEffectsEl.appendChild(el);

    setTimeout(() => {
        el.remove();
    }, 800);
}

function getBlockUpgradeCost() {
    return (gameState.blockRank + 1) * 100;
}

function getToolUpgradeCost() {
    return (gameState.toolRank + 1) * 1000;
}

function buyBlockUpgrade() {
    const cost = getBlockUpgradeCost();
    if (gameState.score >= cost && gameState.blockRank < blockRanks.length - 1) {
        gameState.score -= cost;
        gameState.blockRank++;
        renderShop(); // Re-render to show next upgrade
        updateUI();
        saveGame();
    }
}

function buyToolUpgrade() {
    const cost = getToolUpgradeCost();
    if (gameState.score >= cost && gameState.toolRank < toolRanks.length - 1) {
        gameState.score -= cost;
        gameState.toolRank++;
        renderShop(); // Re-render to show next upgrade
        updateUI();
        saveGame();
    }
}

function renderShop() {
    // Block Shop
    blockShopEl.innerHTML = '';
    if (gameState.blockRank < blockRanks.length - 1) {
        const nextRank = gameState.blockRank + 1;
        const cost = getBlockUpgradeCost();
        const item = document.createElement('div');
        item.id = 'btn-buy-block';
        item.className = `shop-item ${gameState.score >= cost ? '' : 'disabled'}`;
        item.onclick = () => buyBlockUpgrade();
        item.innerHTML = `
            <div class="item-info">
                <h4>Upgrade to ${blockRanks[nextRank].name}</h4>
                <div class="item-cost"><i class="fas fa-cube"></i> ${cost}</div>
                <div class="item-desc">x${blockRanks[nextRank].multiplier} Multiplier</div>
            </div>
            <div class="item-icon">
                <i class="fas fa-arrow-up"></i>
            </div>
        `;
        blockShopEl.appendChild(item);
    } else {
        blockShopEl.innerHTML = '<div class="shop-item disabled"><div class="item-info"><h4>Max Rank Reached</h4></div></div>';
    }

    // Tool Shop
    toolShopEl.innerHTML = '';
    if (gameState.toolRank < toolRanks.length - 1) {
        const nextRank = gameState.toolRank + 1;
        const cost = getToolUpgradeCost();
        const item = document.createElement('div');
        item.id = 'btn-buy-tool';
        item.className = `shop-item ${gameState.score >= cost ? '' : 'disabled'}`;
        item.onclick = () => buyToolUpgrade();
        item.innerHTML = `
            <div class="item-info">
                <h4>Upgrade to ${toolRanks[nextRank].name}</h4>
                <div class="item-cost"><i class="fas fa-cube"></i> ${cost}</div>
                <div class="item-desc">+${toolRanks[nextRank].power} Power</div>
            </div>
            <div class="item-icon">
                <i class="fas fa-tools"></i>
            </div>
        `;
        toolShopEl.appendChild(item);
    } else {
        toolShopEl.innerHTML = '<div class="shop-item disabled"><div class="item-info"><h4>Max Tool Reached</h4></div></div>';
    }
}

function updateUI() {
    scoreEl.textContent = Math.floor(gameState.score);

    const basePower = toolRanks[gameState.toolRank].power;
    const multiplier = blockRanks[gameState.blockRank].multiplier;
    powerEl.textContent = (basePower * multiplier).toLocaleString();

    // Update Block Appearance
    // Remove all rank classes first
    blockEl.className = 'block';
    blockEl.classList.add(blockRanks[gameState.blockRank].class);

    // Update Shop Buttons State
    const blockBtn = document.getElementById('btn-buy-block');
    if (blockBtn) {
        const cost = getBlockUpgradeCost();
        if (gameState.score >= cost) {
            blockBtn.classList.remove('disabled');
        } else {
            blockBtn.classList.add('disabled');
        }
    }

    const toolBtn = document.getElementById('btn-buy-tool');
    if (toolBtn) {
        const cost = getToolUpgradeCost();
        if (gameState.score >= cost) {
            toolBtn.classList.remove('disabled');
        } else {
            toolBtn.classList.add('disabled');
        }
    }
}

function saveGame() {
    localStorage.setItem('blockClickerSave', JSON.stringify(gameState));
}

function loadGame() {
    const saved = localStorage.getItem('blockClickerSave');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Merge with default state to handle any new fields in future
            gameState = { ...gameState, ...parsed };
        } catch (e) {
            console.error("Failed to load save", e);
        }
    }
}

// Reset game command for debugging
window.resetGame = function () {
    localStorage.removeItem('blockClickerSave');
    location.reload();
};

init();
