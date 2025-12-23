function fetchLeaderboard() {
    // Only fetch if start screen is visible (optimization)
    if (els.screens.start.classList.contains('hidden')) return;

    try {
        const diff = els.controls.diffSelect.value.split(' ')[0].toLowerCase(); // Handle "EASY [SAFE_MODE]"
        const pack = els.controls.packSelect.value.toLowerCase();

        const res = await fetch(`${API_BASE}/leaderboard?difficulty=${diff}&pack=${pack}`);
        const data = await res.json();

        renderLeaderboard(data.top10);
    } catch (e) {
        console.error(e);
        els.controls.leaderboard.innerHTML = '<div style="text-align:center; color:var(--danger-color);">CONNECTION LOST</div>';
    }
}

function updateHUD() {
    els.hud.score.textContent = state.score;
    els.hud.combo.textContent = state.combo;
    els.hud.progress.textContent = `${state.spawnedCount}/100`;

    // Fix: Handle difficulty text with brackets
    const diffKey = state.difficulty.split(' ')[0];
    els.hud.diff.textContent = diffKey;

    let hearts = '';
    for (let i = 0; i < state.lives; i++) hearts += '??;
    els.hud.lives.textContent = hearts;

    // Update Pause Button Text
    if (els.hud.btnPause) {
        els.hud.btnPause.textContent = state.isPaused ? "RESUME" : "PAUSE";
    }
}

function gameLoop(timestamp) {
    if (!state.isPlaying) return;
    if (state.isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // Parse difficulty from select value (e.g. "EASY [SAFE_MODE]")
    const diffKey = state.difficulty.split(' ')[0];
    const diffConfig = DIFFICULTY[diffKey];
    const playfieldHeight = els.gameArea.clientHeight;

    // Spawning
    if (state.spawnedCount < 100) {
        if (timestamp - state.lastSpawnTime > diffConfig.spawnRate) {
            spawnWord();
            state.lastSpawnTime = timestamp;
        }
    } else if (state.activeWords.length === 0) {
        // All spawned and all cleared
        gameOver(true);
        return;
    }

    // Update Words
    state.activeWords.forEach((word, index) => {
        word.y += word.speed;
        word.el.style.top = `${word.y}px`;

        // Collision Check (Bottom)
        if (word.y > playfieldHeight - 30) {
            handleDrop(index);
        }
    });

    requestAnimationFrame(gameLoop);
}

function spawnWord() {
    state.spawnedCount++;
    updateHUD();

    const isEvent = [15, 30, 45, 60, 75, 90].includes(state.spawnedCount);

    // Helper to check for symbols (non-alphanumeric, excluding spaces)
    const hasSymbol = (str) => /[^a-zA-Z0-9\s]/.test(str);

    // Check if any currently active word has a symbol
    const activeHasSymbol = state.activeWords.some(w => hasSymbol(w.text));

    // Filter pool
    let pool = WORD_PACKS[state.pack];

    // 1. Exclude currently active words (duplicates)
    const activeTexts = state.activeWords.map(w => w.text);
    let filteredPool = pool.filter(word => !activeTexts.includes(word));

    // 2. If a symbol word is already active, filter out words with symbols
    if (activeHasSymbol) {
        const noSymbolPool = filteredPool.filter(word => !hasSymbol(word));
        // Only apply if we have enough non-symbol words (prevent empty pool)
        if (noSymbolPool.length > 0) {
            filteredPool = noSymbolPool;
        }
    }

    // Use filtered pool if available, otherwise fallback to full pool (rare case)
    if (filteredPool.length > 0) {
        pool = filteredPool;
    }

    const text = pool[Math.floor(Math.random() * pool.length)];
    const diffKey = state.difficulty.split(' ')[0];
    const diffConfig = DIFFICULTY[diffKey];

    const word = {
        id: Date.now() + Math.random(),
        text: text,
        x: Math.random() * 80 + 10, // 10% to 90%
        y: -40,
        speed: diffConfig.speedMin + Math.random() * (diffConfig.speedMax - diffConfig.speedMin),
        isEvent: isEvent,
        el: document.createElement('div')
    };

    // DOM Creation
    word.el.className = 'word-item';
    if (isEvent) word.el.classList.add('event');
    word.el.textContent = text;
    word.el.style.left = `${word.x}%`;
    word.el.style.top = `${word.y}px`;

    els.gameArea.appendChild(word.el);
    state.activeWords.push(word);
}

function handleInput(e) {
    const inputVal = e.target.value;
    state.totalCharsTyped++;

    // 1. Find Target if none
    if (!state.targetId) {
        // Find matching words (prefix match)
        const matches = state.activeWords.filter(w => w.text.startsWith(inputVal));

        if (matches.length > 0) {
            // Pick lowest (largest y)
            matches.sort((a, b) => b.y - a.y);
            const target = matches[0];
            state.targetId = target.id;

            // Highlight
            state.activeWords.forEach(w => w.el.classList.remove('target'));
            target.el.classList.add('target');
        }
    }

    // 2. Validate against Target
    if (state.targetId) {
        const target = state.activeWords.find(w => w.id === state.targetId);

        // If target disappeared (dropped) or input no longer matches prefix
        if (!target || !target.text.startsWith(inputVal)) {
            // Reset target
            state.targetId = null;
            state.activeWords.forEach(w => w.el.classList.remove('target'));

            // If input is not empty, try to find new target immediately
            if (inputVal.length > 0) {
                handleInput(e); // Recursive check for new target
                return;
            }
        } else {
            // Still matching target
            updateTargetDisplay(inputVal, target.text);
        }
    } else {
        updateTargetDisplay(inputVal);
    }
}

function handleKeydown(e) {
    sfx.playKey(e.key);

    if (e.key === 'Enter') {
        const inputVal = els.input.field.value;

        if (state.targetId) {
            const targetIndex = state.activeWords.findIndex(w => w.id === state.targetId);
            if (targetIndex !== -1) {
                const target = state.activeWords[targetIndex];
                if (target.text === inputVal) {
                    // Success
                    successWord(targetIndex);
                } else {
                    // Typo Enter
                    failTypo();
                }
            }
        } else {
            // Enter with no target or no match
            failTypo();
        }

        // Clear input
        els.input.field.value = '';
        updateTargetDisplay('');
        state.targetId = null;
        state.activeWords.forEach(w => w.el.classList.remove('target'));
    }
}

function successWord(index) {
    const word = state.activeWords[index];

    // Score
    const points = word.isEvent ? 50 : 10;
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;

    const bonus = Math.min(state.combo, 10);
    state.score += points + bonus;

    state.correctCharsTyped += word.text.length;

    // Play Success Sound
    sfx.playSuccess();

    // Remove
    word.el.classList.add('matched');
    setTimeout(() => {
        if (word.el.parentNode) word.el.parentNode.removeChild(word.el);
    }, 200);

    state.activeWords.splice(index, 1);
    updateHUD();
}

function failTypo() {
    // Play Fail Sound
    sfx.playFail();

    state.score = Math.max(0, state.score - 5);
    state.combo = 0;
    updateHUD();

    // Shake input
    els.input.field.classList.add('error');
    setTimeout(() => els.input.field.classList.remove('error'), 300);
}

function updateTargetDisplay(input, fullText = '') {
    if (!fullText) {
        els.input.target.textContent = '';
        return;
    }

    // Highlight matched part
    const matched = fullText.substring(0, input.length);
    const rest = fullText.substring(input.length);

    els.input.target.innerHTML = `<span class="match">${matched}</span><span class="rest">${rest}</span>`;
}

