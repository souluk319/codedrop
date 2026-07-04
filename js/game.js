/**
 * CodeDrop - Cyberpunk Edition
 * Game Logic
 */

// --- API Config ---
const API_BASE = "";
const README_LANGUAGE_STORAGE_KEY = 'codedrop_readme_language';
const MUSIC_UI_STORAGE_KEY = 'codedrop_music_ui';
const MUSIC_FALLBACK_TRACKS = [
    'KUGNUS X AI SET',
    'SoundCloud playlist queue',
    'Open SoundCloud view for full track list'
];

const DIFFICULTY = {
    EASY: { spawnRate: 2500, speedMin: 0.5, speedMax: 1.0, eventChance: 0 },
    NORMAL: { spawnRate: 2000, speedMin: 0.7, speedMax: 1.3, eventChance: 0 },
    DEVELOPER: { spawnRate: 1500, speedMin: 2, speedMax: 3.5, eventChance: 0 }
};

// --- Game State ---

const state = {
    score: 0,
    lives: 3,
    combo: 0,
    maxCombo: 0,
    spawnedCount: 0,
    activeWords: [], // { id, text, x, y, speed, el, isEvent }
    isPlaying: false,
    isPaused: false,
    difficulty: 'NORMAL',
    pack: 'PYTHON',
    startTime: 0,
    totalCharsTyped: 0,
    correctCharsTyped: 0,
    lastInputLength: 0,
    targetId: null, // ID of the word currently being targeted
    lastSpawnTime: 0,
    userId: null, // From API
    userToken: null,
    nickname: ''
};

// --- DOM Elements ---

const els = {
    hud: {
        score: document.getElementById('score'),
        combo: document.getElementById('combo'),
        lives: document.getElementById('lives-display'),
        progress: document.getElementById('progress'),
        diff: document.getElementById('diff-badge'),
        btnPause: document.getElementById('btn-pause'),
        btnHome: document.getElementById('btn-home')
    },
    gameArea: document.getElementById('game-area'),
    input: {
        field: document.getElementById('input-field'),
        target: document.getElementById('target-display')
    },
    screens: {
        start: document.getElementById('start-screen'),
        result: document.getElementById('result-screen'),
        pause: document.getElementById('pause-screen')
    },
    result: {
        title: document.getElementById('result-title'),
        score: document.getElementById('final-score'),
        combo: document.getElementById('final-combo'),
        wpm: document.getElementById('final-wpm'),
        acc: document.getElementById('final-acc'),
        status: document.getElementById('submit-status')
    },
    controls: {
        diffSelect: document.getElementById('difficulty-select'),
        packSelect: document.getElementById('pack-select'),
        startBtn: document.getElementById('start-btn'),
        restartBtn: document.getElementById('restart-btn'),
        leaderboard: document.getElementById('leaderboard-list')
    },
    auth: {
        tabs: {
            login: document.getElementById('tab-login'),
            register: document.getElementById('tab-register')
        },
        forms: {
            login: document.getElementById('form-login'),
            register: document.getElementById('form-register')
        },
        inputs: {
            loginNick: document.getElementById('login-nick'),
            loginPass: document.getElementById('login-pass'),
            regNick: document.getElementById('reg-nick'),
            regPass: document.getElementById('reg-pass'),
            regPassConfirm: document.getElementById('reg-pass-confirm')
        },
        btns: {
            login: document.getElementById('btn-login'),
            register: document.getElementById('btn-register'),
            logout: document.getElementById('btn-logout'),
            withdraw: document.getElementById('btn-withdraw')
        },
        errors: {
            login: document.getElementById('login-error'),
            register: document.getElementById('reg-error')
        },
        loggedInView: document.getElementById('logged-in-view'),
        authContainer: document.getElementById('auth-container'),
        userDisplay: document.getElementById('user-display')
    },
    musicWidget: document.getElementById('music-widget'),
    confirm: {
        screen: document.getElementById('confirm-screen'),
        title: document.getElementById('confirm-title'),
        message: document.getElementById('confirm-message'),
        input: document.getElementById('confirm-input'),
        error: document.getElementById('confirm-error'),
        cancel: document.getElementById('confirm-cancel'),
        ok: document.getElementById('confirm-ok')
    }
};

const overlayChromeIds = [
    'result-screen',
    'pause-screen',
    'scenario-screen',
    'lab-screen',
    'dashboard-screen',
    'learn-screen',
    'confirm-screen',
    'readme-overlay'
];

let overlayChromeObserver = null;
let commandDialogSession = null;
let commandDialogBound = false;
let widgetOverlapCheckAt = 0;
let soundCloudWidget = null;
let soundCloudWidgetBound = false;
let musicPlaying = false;

function setGameChrome(active) {
    document.body.classList.toggle('game-active', Boolean(active));
}

function isElementVisible(el) {
    return Boolean(el) && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none';
}

function syncOverlayChrome() {
    const hasOverlay = overlayChromeIds.some(id => isElementVisible(document.getElementById(id)));
    document.body.classList.toggle('overlay-chrome-hidden', hasOverlay);
}

function rectsOverlap(a, b, padding = 4) {
    return a.left < b.right + padding &&
        a.right > b.left - padding &&
        a.top < b.bottom + padding &&
        a.bottom > b.top - padding;
}

function bottomWidgets() {
    return [
        document.getElementById('readme-widget'),
        els.musicWidget
    ].filter(Boolean);
}

function setBottomWidgetsTranslucent(active) {
    bottomWidgets().forEach(widget => widget.classList.toggle('widget-overlap', Boolean(active)));
}

function updateBottomWidgetOverlap(timestamp = 0) {
    if (!state.isPlaying || state.isPaused || state.activeWords.length === 0) {
        setBottomWidgetsTranslucent(false);
        return;
    }

    if (timestamp && timestamp - widgetOverlapCheckAt < 80) return;
    widgetOverlapCheckAt = timestamp || Date.now();

    const widgets = bottomWidgets()
        .filter(widget => getComputedStyle(widget).display !== 'none')
        .map(widget => widget.getBoundingClientRect());
    if (widgets.length === 0) return;

    const overlaps = state.activeWords.some(word => {
        if (!word.el || !word.el.isConnected) return false;
        const wordRect = word.el.getBoundingClientRect();
        return widgets.some(widgetRect => rectsOverlap(wordRect, widgetRect, 8));
    });

    setBottomWidgetsTranslucent(overlaps);
}

function initOverlayChromeObserver() {
    if (overlayChromeObserver) return;

    overlayChromeObserver = new MutationObserver(syncOverlayChrome);
    overlayChromeIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) overlayChromeObserver.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
    });
    window.syncCodeDropChrome = syncOverlayChrome;
    syncOverlayChrome();
}

function showCommandDialog({
    title,
    message,
    okText = 'CONFIRM',
    cancelText = 'CANCEL',
    input = false,
    placeholder = 'PASSWORD',
    danger = false,
    requireValue = false
}) {
    return new Promise(resolve => {
        const c = els.confirm;
        if (!c.screen) {
            resolve({ accepted: false, value: '' });
            return;
        }

        if (commandDialogSession) {
            commandDialogSession.resolve({ accepted: false, value: '' });
        }

        commandDialogSession = { resolve, input, requireValue };
        c.title.textContent = title;
        c.message.textContent = message;
        c.ok.textContent = okText;
        c.cancel.textContent = cancelText || '';
        c.cancel.classList.toggle('hidden', !cancelText);
        c.input.value = '';
        c.input.placeholder = placeholder;
        c.input.classList.toggle('hidden', !input);
        c.error.textContent = '';
        c.screen.classList.toggle('danger', danger);
        c.screen.classList.remove('hidden');
        syncOverlayChrome();

        window.setTimeout(() => {
            if (input) c.input.focus();
            else c.ok.focus();
        }, 0);
    });
}

function closeCommandDialog(result) {
    if (!commandDialogSession) return;

    const session = commandDialogSession;
    commandDialogSession = null;
    els.confirm.screen.classList.add('hidden');
    els.confirm.input.value = '';
    els.confirm.error.textContent = '';
    syncOverlayChrome();
    session.resolve(result);
}

function acceptCommandDialog() {
    if (!commandDialogSession) return;

    const value = els.confirm.input.value.trim();
    if (commandDialogSession.requireValue && !value) {
        els.confirm.error.textContent = 'PASSWORD REQUIRED';
        els.confirm.input.classList.add('wrong');
        window.setTimeout(() => els.confirm.input.classList.remove('wrong'), 260);
        els.confirm.input.focus();
        return;
    }

    closeCommandDialog({ accepted: true, value });
}

function cancelCommandDialog() {
    closeCommandDialog({ accepted: false, value: '' });
}

function initCommandDialog() {
    const c = els.confirm;
    if (commandDialogBound || !c.screen) return;
    commandDialogBound = true;

    c.ok.addEventListener('click', acceptCommandDialog);
    c.cancel.addEventListener('click', cancelCommandDialog);
    c.screen.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) cancelCommandDialog();
    });
    c.screen.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelCommandDialog();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            acceptCommandDialog();
        }
    });
}

// --- Sound FX (Web Audio API & WAVs) ---
const sfx = {
    ctx: null,
    sounds: {},
    bgm: null,
    loaded: false,
    init: function () {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!this.ctx) {
            this.ctx = new AudioContext();
        } else if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        if (!this.loaded) {
            // Load WAVs
            this.sounds.enter = new Audio('sound/enter.wav');
            this.sounds.backspace = new Audio('sound/backspace2.wav');
            this.sounds.space = new Audio('sound/spacebar.wav');
            this.sounds.space.volume = 0.5;
            this.sounds.key = new Audio('sound/key.wav');
            this.sounds.correct = new Audio('sound/correct_sound.wav');

            this.bgm = new Audio('sound/mainpage_bgm.wav');
            this.bgm.loop = false;
            this.bgm.volume = 0.5;

            this.loaded = true;
        }
    },
    playBGM: function () {
        if (this.bgm) {
            this.bgm.currentTime = 0;
            const promise = this.bgm.play();
            if (promise !== undefined) {
                promise.catch(error => {
                    console.log("BGM Autoplay blocked. Waiting for interaction.");
                    const playOnInteraction = () => {
                        this.bgm.play().catch(() => { });
                        document.removeEventListener('click', playOnInteraction);
                        document.removeEventListener('touchstart', playOnInteraction);
                        document.removeEventListener('keydown', playOnInteraction);
                    };
                    document.addEventListener('click', playOnInteraction);
                    document.addEventListener('touchstart', playOnInteraction);
                    document.addEventListener('keydown', playOnInteraction);
                });
            }
        }
    },
    playKey: function (key) {
        let sound;
        if (key === 'Enter') sound = this.sounds.enter;
        else if (key === 'Backspace') sound = this.sounds.backspace;
        else if (key === ' ') sound = this.sounds.space;
        else sound = this.sounds.key;

        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(() => { });
        }
    },
    playTone: function (freq, type, duration, vol = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playSuccess: function () {
        if (this.sounds.correct) {
            this.sounds.correct.currentTime = 0;
            this.sounds.correct.play().catch(() => { });
        } else {
            // Fallback
            this.playTone(880, 'sine', 0.1, 0.1);
        }
    },
    playFail: function () {
        // Keep existing synth
        this.playTone(150, 'sawtooth', 0.3, 0.1);
        this.playTone(100, 'square', 0.3, 0.1);
    }
};
window.sfx = sfx;

// --- Game Logic ---

function renderLeaderboardMessage(message, color = '#666') {
    els.controls.leaderboard.innerHTML = '';
    const empty = document.createElement('div');
    empty.style.textAlign = 'center';
    empty.style.color = color;
    empty.textContent = message;
    els.controls.leaderboard.appendChild(empty);
}

function leaderboardSelection() {
    if (isOcpEditionActive()) {
        const ocpDiff = document.getElementById('ocp-difficulty-select');
        return {
            diff: ((ocpDiff && ocpDiff.value) || 'NORMAL').toLowerCase(),
            pack: 'oc_core'
        };
    }

    return {
        diff: els.controls.diffSelect.value.split(' ')[0].toLowerCase(),
        pack: els.controls.packSelect.value.toLowerCase()
    };
}

async function fetchLeaderboard() {
    // Only fetch if start screen is visible (optimization)
    if (els.screens.start.classList.contains('hidden')) return;

    try {
        const { diff, pack } = leaderboardSelection();

        const res = await fetch(`${API_BASE}/leaderboard?difficulty=${diff}&pack=${pack}`);
        const data = await res.json();

        renderLeaderboard(data.top10);
    } catch (e) {
        console.error(e);
        renderLeaderboardMessage('CONNECTION LOST', 'var(--danger-color)');
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
    for (let i = 0; i < state.lives; i++) hearts += '♥';
    els.hud.lives.textContent = hearts;

    // Update Pause Button Text
    if (els.hud.btnPause) {
        els.hud.btnPause.textContent = state.isPaused ? "RESUME" : "PAUSE";
    }
}

function gameLoop(timestamp) {
    if (!state.isPlaying) return;
    // Debug Log (Throttle to avoid spam, e.g., every 60 frames)
    if (Math.floor(timestamp) % 60 === 0) {
        console.log("Loop:", Math.floor(timestamp), "Last:", Math.floor(state.lastSpawnTime), "Diff:", Math.floor(timestamp - state.lastSpawnTime));
    }

    if (state.isPaused) {
        updateBottomWidgetOverlap(timestamp);
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

    // Update Words. Iterate backwards because handleDrop mutates activeWords.
    for (let index = state.activeWords.length - 1; index >= 0; index--) {
        const word = state.activeWords[index];
        word.y += word.speed;
        word.el.style.top = `${word.y}px`;

        // Collision Check (Bottom)
        if (word.y > playfieldHeight - 30) {
            handleDrop(index);
        }
    }

    updateBottomWidgetOverlap(timestamp);
    requestAnimationFrame(gameLoop);
}

function spawnWord() {
    console.log("Spawning Word...");
    state.spawnedCount++;
    updateHUD();

    const isEvent = [15, 30, 45, 60, 75, 90].includes(state.spawnedCount);

    // Filter pool to exclude currently active words to prevent duplicates
    // Helper to check for symbols (non-alphanumeric, excluding spaces)

    const hasSymbol = (str) => /[^a-zA-Z0-9\s]/.test(str);
    // Helper for Heavy Words (Symbol + >10 chars)
    const isHeavy = (str) => str.length > 10 && hasSymbol(str);

    // Check if any currently active word has a symbol
    const activeHasSymbol = state.activeWords.some(w => hasSymbol(w.text));

    // Filter pool
    let pool = WORD_PACKS[state.pack];

    // 1. Exclude currently active words (duplicates)
    const activeTexts = state.activeWords.map(w => w.text);
    let filteredPool = pool.filter(word => !activeTexts.includes(word));

    // 2. Apply Constraints
    if (activeHasSymbol) {
        // If symbol word exists, ONLY allow safe words (no symbols)
        const safePool = filteredPool.filter(word => !hasSymbol(word));
        if (safePool.length > 0) filteredPool = safePool;
    } else {
        // No symbol word active.
        // Check Heavy Word constraint: Only allow heavy words every 10th spawn
        if (state.spawnedCount % 10 !== 0) {
            const noHeavyPool = filteredPool.filter(word => !isHeavy(word));
            if (noHeavyPool.length > 0) filteredPool = noHeavyPool;
        }
    }

    // Use filtered pool if available, otherwise fallback to full pool (rare case)
    if (filteredPool.length > 0) {
        pool = filteredPool;
    }

    const text = pool[Math.floor(Math.random() * pool.length)];
    const diffKey = state.difficulty.split(' ')[0];
    const diffConfig = DIFFICULTY[diffKey];

    // Calculate Speed (Increase by 20% after 50 spawns)
    let baseSpeed = diffConfig.speedMin + Math.random() * (diffConfig.speedMax - diffConfig.speedMin);
    if (state.spawnedCount > 50) {
        baseSpeed *= 1.2;
    }

    const word = {
        id: Date.now() + Math.random(),
        text: text,
        x: Math.random() * 80 + 10, // 10% to 90%
        y: -40,
        speed: baseSpeed,
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
    if (!state.isPlaying || state.isPaused) return;

    const inputVal = e.target.value;
    const delta = Math.max(0, inputVal.length - state.lastInputLength);
    state.totalCharsTyped += delta;
    state.lastInputLength = inputVal.length;

    if (inputVal.length === 0) {
        state.targetId = null;
        state.activeWords.forEach(w => w.el.classList.remove('target'));
        updateTargetDisplay('');
        return;
    }

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

            const matches = state.activeWords.filter(w => w.text.startsWith(inputVal));
            if (matches.length > 0) {
                matches.sort((a, b) => b.y - a.y);
                const nextTarget = matches[0];
                state.targetId = nextTarget.id;
                nextTarget.el.classList.add('target');
                updateTargetDisplay(inputVal, nextTarget.text);
            } else {
                updateTargetDisplay(inputVal);
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
    if (!state.isPlaying || state.isPaused) return;

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
        state.lastInputLength = 0;
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

    showDescToast(word.text);
}

// --- Desc Toast (명령어 한줄 설명) ---
let descToastTimer = null;

function showDescToast(text) {
    if (typeof WORD_DESCS === 'undefined' || !WORD_DESCS[text]) return;

    // startGame()이 gameArea.innerHTML = '' 로 비우므로 없으면 재생성
    let toast = document.getElementById('desc-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'desc-toast';
        els.gameArea.appendChild(toast);
    }

    toast.innerHTML = `<span class="cmd"></span> &nbsp;→&nbsp; <span class="desc"></span>`;
    toast.querySelector('.cmd').textContent = text;
    toast.querySelector('.desc').textContent = WORD_DESCS[text];
    toast.classList.add('show');

    clearTimeout(descToastTimer);
    descToastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
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


function handleDrop(index) {
    const word = state.activeWords[index];
    if (!state.isPlaying || !word) return;

    // Remove from DOM
    if (word.el.parentNode) word.el.parentNode.removeChild(word.el);

    // Remove from array
    state.activeWords.splice(index, 1);

    // Reset Target if dropped
    if (state.targetId === word.id) {
        state.targetId = null;
        updateTargetDisplay('');
    }

    // Logic
    state.lives--;
    state.combo = 0;
    updateHUD();

    // Visual Feedback
    els.hud.lives.style.opacity = 0.5;
    setTimeout(() => els.hud.lives.style.opacity = 1, 200);

    if (state.lives <= 0) {
        gameOver(false);
    }
}

async function gameOver(victory = false) {
    if (!state.isPlaying && !els.screens.result.classList.contains('hidden')) return;

    state.isPlaying = false;
    state.isPaused = false;
    setGameChrome(false);
    setBottomWidgetsTranslucent(false);
    state.targetId = null;
    state.lastInputLength = 0;
    els.input.field.value = '';
    els.input.field.disabled = true;
    updateTargetDisplay('');
    state.activeWords.forEach(word => {
        if (word.el && word.el.parentNode) word.el.parentNode.removeChild(word.el);
    });
    state.activeWords = [];

    // Calculate Stats
    const durationMin = (Date.now() - state.startTime) / 60000;
    const wpm = durationMin > 0 ? Math.round((state.correctCharsTyped / 5) / durationMin) : 0;
    const rawAccuracy = state.totalCharsTyped > 0 ? Math.round((state.correctCharsTyped / state.totalCharsTyped) * 100) : 0;
    const accuracy = Math.max(0, Math.min(100, rawAccuracy));

    // Update Result Screen
    els.result.title.textContent = victory ? "MISSION COMPLETE" : "SYSTEM FAILURE";
    els.result.title.style.color = victory ? "var(--success-color)" : "var(--danger-color)";
    els.result.title.style.textShadow = victory ? "0 0 20px var(--success-color)" : "0 0 20px var(--danger-color)";

    els.result.score.textContent = state.score;
    els.result.combo.textContent = state.maxCombo;
    els.result.wpm.textContent = wpm;
    els.result.acc.textContent = accuracy + "%";

    els.screens.result.classList.remove('hidden');
    syncOverlayChrome();

    // Submit Score
    if (state.userToken) {
        els.result.status.textContent = "UPLOADING DATA...";
        try {
            const res = await fetch(`${API_BASE}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.userToken}`
                },
                body: JSON.stringify({
                    score: state.score,
                    wpm: wpm,
                    accuracy: accuracy,
                    difficulty: state.difficulty.toLowerCase(),
                    pack: state.pack.toLowerCase()
                })
            });
            const data = await res.json();
            if (data.ok) {
                els.result.status.textContent = "UPLOAD COMPLETE. CHECK RANKING.";
            } else {
                els.result.status.textContent = "UPLOAD FAILED.";
            }
        } catch (e) {
            console.error(e);
            els.result.status.textContent = "SERVER ERROR. DATA NOT SAVED.";
        }
    } else {
        els.result.status.textContent = "OFFLINE MODE. DATA NOT SAVED.";
    }
}

function renderLeaderboard(list) {
    els.controls.leaderboard.innerHTML = '';

    if (!list || list.length === 0) {
        renderLeaderboardMessage('NO DATA FOUND. BE THE FIRST.');
        return;
    }

    const table = document.createElement('table');
    const headRow = document.createElement('tr');
    ['RANK', 'AGENT', 'SCORE', 'WPM'].forEach((label, index) => {
        const th = document.createElement('th');
        th.textContent = label;
        if (index >= 2) th.style.textAlign = 'right';
        headRow.appendChild(th);
    });
    table.appendChild(headRow);

    list.forEach((item, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';

        const row = document.createElement('tr');
        const rankCell = document.createElement('td');
        rankCell.textContent = `#${rank}`;
        rankCell.style.fontWeight = 'bold';
        if (rankClass) rankCell.className = rankClass;

        const nameCell = document.createElement('td');
        nameCell.textContent = String(item.nickname || 'unknown');
        nameCell.style.color = 'var(--primary-neon)';
        if (rank <= 3) {
            nameCell.style.fontWeight = 'bold';
            nameCell.style.fontSize = '1.1em';
        }

        const scoreCell = document.createElement('td');
        scoreCell.textContent = String(Number(item.score) || 0);
        scoreCell.style.textAlign = 'right';
        scoreCell.style.fontFamily = 'var(--font-code)';
        scoreCell.style.color = '#fff';

        const wpmCell = document.createElement('td');
        wpmCell.textContent = String(Number(item.wpm) || 0);
        wpmCell.style.textAlign = 'right';
        wpmCell.style.fontFamily = 'var(--font-code)';
        wpmCell.style.color = '#888';

        row.append(rankCell, nameCell, scoreCell, wpmCell);
        table.appendChild(row);
    });

    els.controls.leaderboard.appendChild(table);
}



// --- Mode Routing (DROP / SCENARIO / LAB / EXAM) ---
let gameMode = 'DROP';
let editionBurstTimer = null;

function isOcpEditionActive() {
    return document.body.classList.contains('ocp-edition');
}

function triggerEditionBurst() {
    document.body.classList.remove('edition-burst');
    // Reflow so repeated edition switches replay the one-shot CSS animation.
    void document.body.offsetWidth;
    document.body.classList.add('edition-burst');

    clearTimeout(editionBurstTimer);
    editionBurstTimer = setTimeout(() => {
        document.body.classList.remove('edition-burst');
    }, 760);
}

function handleStart() {
    if (gameMode === 'LEARN') {
        els.screens.start.classList.add('hidden');
        LearnMode.openPicker();
    } else if (gameMode === 'SCENARIO') {
        const catSelect = document.getElementById('scenario-category-select');
        els.screens.start.classList.add('hidden');
        ScenarioMode.start(catSelect.value);
    } else if (gameMode === 'LAB') {
        const labSelect = document.getElementById('lab-select');
        els.screens.start.classList.add('hidden');
        LabMode.start(labSelect.value);
    } else if (gameMode === 'EXAM') {
        els.screens.start.classList.add('hidden');
        ScenarioMode.startExam();
    } else {
        if (isOcpEditionActive()) {
            const ocpDiff = document.getElementById('ocp-difficulty-select');
            if (ocpDiff) els.controls.diffSelect.value = ocpDiff.value;
            els.controls.packSelect.value = 'OC_CORE';
        }
        startGame();
    }
}

function initModeControls() {
    const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));
    const catSelect = document.getElementById('scenario-category-select');
    const labSelect = document.getElementById('lab-select');
    const standardMenu = document.getElementById('standard-menu');
    const ocpMenu = document.getElementById('ocp-menu');
    const editionCodeBtn = document.getElementById('edition-code-btn');
    const editionOcpBtn = document.getElementById('edition-ocp-btn');
    const ocpDiffSelect = document.getElementById('ocp-difficulty-select');
    const ocpStartBtn = document.getElementById('ocp-start-btn');
    const dashboardBtn = document.getElementById('dashboard-btn');
    const modeGroups = {
        LEARN: ['learn-info-group'],
        DROP: ['ocp-drop-group'],
        SCENARIO: ['scenario-select-group'],
        LAB: ['lab-select-group'],
        EXAM: ['exam-info-group']
    };

    if (modeButtons.length === 0) return;

    // 카테고리 옵션을 SCENARIO_PACKS에서 자동 생성
    if (typeof SCENARIO_PACKS !== 'undefined' && catSelect && catSelect.options.length === 0) {
        Object.entries(SCENARIO_PACKS).forEach(([key, pack]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = pack.label;
            catSelect.appendChild(opt);
        });
    }

    if (typeof MOCK_LABS !== 'undefined' && labSelect && labSelect.options.length === 0) {
        MOCK_LABS.forEach((lab, index) => {
            const opt = document.createElement('option');
            opt.value = lab.id;
            opt.textContent = `${String(index + 1).padStart(2, '0')}. ${lab.title}`;
            labSelect.appendChild(opt);
        });
    }

    function setMode(mode) {
        gameMode = mode;
        modeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));

        Object.entries(modeGroups).forEach(([groupMode, ids]) => {
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.toggle('hidden', groupMode !== mode);
            });
        });

        // 학습 모드: 커리큘럼 진행도 문구 갱신
        if (mode === 'LEARN' && typeof LearnMode !== 'undefined') {
            const info = document.getElementById('learn-info-text');
            if (info) {
                const p = LearnMode.progress();
                info.textContent = p.next
                    ? `${p.done}/${p.total} 레슨 완료 · 다음: ${p.next.title}`
                    : `커리큘럼 완주! ${p.done}/${p.total} 레슨 완료`;
            }
        }

        // 시험 모드 소프트 게이트 (비차단 권장 문구)
        if (mode === 'EXAM' && typeof LearnMode !== 'undefined' && typeof StudyStats !== 'undefined') {
            const gate = document.getElementById('exam-gate-note');
            if (gate) {
                const p = LearnMode.progress();
                const examCount = (StudyStats.get().exams || []).length;
                const show = p.total > 0 && p.done / p.total < 0.3 && examCount === 0;
                gate.classList.toggle('hidden', !show);
                if (show) {
                    gate.textContent = `커리큘럼 ${p.done}/${p.total} — 학습 모드를 먼저 도는 것을 권장합니다.`;
                }
            }
        }
    }

    function openOcpEdition() {
        if (isOcpEditionActive()) return;
        document.body.classList.add('ocp-edition');
        triggerEditionBurst();
        if (standardMenu) standardMenu.classList.add('hidden');
        if (ocpMenu) ocpMenu.classList.remove('hidden');
        if (editionCodeBtn) editionCodeBtn.classList.remove('active');
        if (editionOcpBtn) editionOcpBtn.classList.add('active');
        setMode('DROP');
        fetchLeaderboard();
    }

    function closeOcpEdition() {
        if (!isOcpEditionActive()) return;
        triggerEditionBurst();
        document.body.classList.remove('ocp-edition');
        if (ocpMenu) ocpMenu.classList.add('hidden');
        if (standardMenu) standardMenu.classList.remove('hidden');
        if (editionOcpBtn) editionOcpBtn.classList.remove('active');
        if (editionCodeBtn) editionCodeBtn.classList.add('active');
        setMode('DROP');
        fetchLeaderboard();
    }

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    if (editionOcpBtn) {
        editionOcpBtn.addEventListener('click', openOcpEdition);
    }

    if (editionCodeBtn) {
        editionCodeBtn.addEventListener('click', closeOcpEdition);
    }

    if (ocpStartBtn) {
        ocpStartBtn.addEventListener('click', handleStart);
    }

    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => Dashboard.open());
    }

    if (els.controls.diffSelect) {
        els.controls.diffSelect.addEventListener('change', fetchLeaderboard);
    }
    if (els.controls.packSelect) {
        els.controls.packSelect.addEventListener('change', fetchLeaderboard);
    }
    if (ocpDiffSelect) {
        ocpDiffSelect.addEventListener('change', fetchLeaderboard);
    }

    setMode(gameMode);
}

function startGame() {
    console.log('Starting Game...');
    // Validate
    const diff = els.controls.diffSelect.value;
    const pack = els.controls.packSelect.value;

    state.difficulty = diff;
    state.pack = pack;
    setBottomWidgetsTranslucent(false);

    // UI Reset
    els.screens.start.classList.add('hidden');
    els.screens.pause.classList.add('hidden');
    els.screens.result.classList.add('hidden');
    setGameChrome(true);
    syncOverlayChrome();
    els.gameArea.innerHTML = ''; // Clear words
    els.input.field.value = '';
    state.lastInputLength = 0;
    els.input.field.disabled = false;
    els.input.field.focus();
    updateTargetDisplay('');
    els.hud.btnPause.textContent = "PAUSE";

    // State Reset
    state.isPlaying = true;
    state.isPaused = false;
    state.score = 0;
    state.lives = 3;
    state.combo = 0;
    state.maxCombo = 0;
    state.spawnedCount = 0;
    state.activeWords = [];
    state.startTime = Date.now();
    state.lastSpawnTime = performance.now();
    state.totalCharsTyped = 0;
    state.correctCharsTyped = 0;
    state.targetId = null;

    updateHUD();

    // Start Loop
    requestAnimationFrame(gameLoop);

    // Play BGM
    // // sfx.playBGM();
}

function togglePause() {
    if (!state.isPlaying) return;

    state.isPaused = !state.isPaused;

    if (state.isPaused) {
        els.hud.btnPause.textContent = "PLAY";
        els.screens.pause.classList.remove('hidden');
        els.input.field.disabled = true;
    } else {
        els.hud.btnPause.textContent = "PAUSE";
        els.screens.pause.classList.add('hidden');
        els.input.field.disabled = false;
        els.input.field.focus();
        state.lastSpawnTime = performance.now();
    }
    syncOverlayChrome();
}

async function goHome() {
    const result = await showCommandDialog({
        title: 'ABORT MISSION?',
        message: '현재 낙하 세션을 종료하고 시작 화면으로 돌아갑니다. 진행 중인 점수는 저장되지 않습니다.',
        okText: 'ABORT',
        cancelText: 'STAY',
        danger: true
    });

    if (!result.accepted) return;

    state.isPlaying = false;
    state.isPaused = false;
    setGameChrome(false);
    setBottomWidgetsTranslucent(false);
    els.screens.pause.classList.add('hidden');
    els.screens.result.classList.add('hidden');
    els.screens.start.classList.remove('hidden');
    els.input.field.value = '';
    els.input.field.disabled = true;
    updateTargetDisplay('');
    state.targetId = null;
    state.lastInputLength = 0;

    // Clear game area
    els.gameArea.innerHTML = '';
    state.activeWords = [];

    fetchLeaderboard();
    initGameControls();
    syncOverlayChrome();
    // sfx.playBGM();
}

// Add Listeners for Game Controls

// Named handlers to prevent duplicates
function handleRestart() {
    els.screens.result.classList.add('hidden');
    els.screens.start.classList.remove('hidden');
    setGameChrome(false);
    els.input.field.value = '';
    els.input.field.disabled = true;
    updateTargetDisplay('');
    state.targetId = null;
    state.lastInputLength = 0;
    fetchLeaderboard();
    syncOverlayChrome();
    // sfx.playBGM();
}

function normalizeMusicUi(value) {
    return value === 'legacy' ? 'legacy' : 'island';
}

function preferredMusicUi() {
    return normalizeMusicUi(localStorage.getItem(MUSIC_UI_STORAGE_KEY) || els.musicWidget?.dataset.playerUi);
}

function setMusicStatus(text) {
    const status = document.getElementById('music-status');
    if (status) status.textContent = text;
}

function setMusicNowTitle(text) {
    const title = document.getElementById('music-now-title');
    if (title) title.textContent = text || MUSIC_FALLBACK_TRACKS[0];
}

function renderMusicTrackList(tracks = MUSIC_FALLBACK_TRACKS, activeTitle = tracks[0]) {
    const list = document.getElementById('music-track-list');
    if (!list) return;

    list.replaceChildren();
    tracks.slice(0, 8).forEach((track, index) => {
        const title = typeof track === 'string' ? track : track?.title;
        const item = document.createElement('div');
        item.className = 'music-track-item';
        if (title === activeTitle || index === 0) item.classList.add('active');

        const number = document.createElement('span');
        number.className = 'music-track-index';
        number.textContent = String(index + 1).padStart(2, '0');

        const label = document.createElement('span');
        label.textContent = title || `Track ${index + 1}`;

        item.append(number, label);
        list.appendChild(item);
    });
}

function updateSoundCloudMetadata() {
    renderMusicTrackList(MUSIC_FALLBACK_TRACKS, MUSIC_FALLBACK_TRACKS[0]);
    setMusicNowTitle(MUSIC_FALLBACK_TRACKS[0]);

    if (!soundCloudWidget) return;

    try {
        if (typeof soundCloudWidget.getCurrentSound === 'function') {
            soundCloudWidget.getCurrentSound(sound => {
                const title = sound?.title || MUSIC_FALLBACK_TRACKS[0];
                setMusicNowTitle(title);
                setMusicStatus(title);
            });
        }

        if (typeof soundCloudWidget.getSounds === 'function') {
            soundCloudWidget.getSounds(sounds => {
                if (!Array.isArray(sounds) || sounds.length === 0) return;
                const titles = sounds.map(sound => sound?.title).filter(Boolean);
                if (titles.length) renderMusicTrackList(titles, titles[0]);
            });
        }
    } catch (error) {
        renderMusicTrackList(MUSIC_FALLBACK_TRACKS, MUSIC_FALLBACK_TRACKS[0]);
    }
}

function setMusicPlayback(active) {
    musicPlaying = Boolean(active);
    if (els.musicWidget) els.musicWidget.classList.toggle('is-playing', musicPlaying);

    const playToggle = document.getElementById('music-play-toggle');
    if (playToggle) {
        const label = musicPlaying ? 'Pause music' : 'Play music';
        playToggle.setAttribute('aria-label', label);
        playToggle.title = label;
    }
}

function syncMusicUiControls(mode = preferredMusicUi()) {
    const normalized = normalizeMusicUi(mode);
    const uiToggle = document.getElementById('music-ui-toggle');
    if (uiToggle) {
        const label = normalized === 'legacy' ? 'Return to island player' : 'Open SoundCloud player view';
        uiToggle.setAttribute('aria-label', label);
        uiToggle.title = label;
    }
    setMusicPlayback(musicPlaying);
}

function initSoundCloudWidget() {
    if (soundCloudWidgetBound) return soundCloudWidget;

    const iframe = document.getElementById('soundcloud-player');
    if (!iframe || !window.SC || !window.SC.Widget) {
        setMusicStatus('SOUNDCLOUD LINK READY');
        return null;
    }

    try {
        soundCloudWidget = window.SC.Widget(iframe);
        const events = window.SC.Widget.Events || {};
        if (events.READY) soundCloudWidget.bind(events.READY, updateSoundCloudMetadata);
        if (events.PLAY) soundCloudWidget.bind(events.PLAY, () => {
            setMusicPlayback(true);
            setMusicStatus('STREAMING KUGNUS X AI');
            updateSoundCloudMetadata();
        });
        if (events.PAUSE) soundCloudWidget.bind(events.PAUSE, () => {
            setMusicPlayback(false);
            setMusicStatus('KUGNUS X AI STREAM');
        });
        if (events.FINISH) soundCloudWidget.bind(events.FINISH, () => {
            setMusicPlayback(false);
            setMusicStatus('STREAM COMPLETE');
        });
        soundCloudWidgetBound = true;
        setMusicStatus('SOUNDCLOUD READY');
        updateSoundCloudMetadata();
    } catch (error) {
        soundCloudWidget = null;
        setMusicStatus('SOUNDCLOUD LINK READY');
    }

    return soundCloudWidget;
}

function openMusicWidget(mode = preferredMusicUi()) {
    if (!els.musicWidget) return;

    const normalized = normalizeMusicUi(mode);
    els.musicWidget.dataset.playerUi = normalized;
    els.musicWidget.classList.remove('closed', 'open', 'legacy-open', 'island-open', 'track-open', 'track-list-open');

    if (normalized === 'legacy') {
        els.musicWidget.classList.add('open', 'legacy-open');
    } else {
        els.musicWidget.classList.add('island-open');
    }

    initSoundCloudWidget();
    updateSoundCloudMetadata();
    syncMusicUiControls(normalized);
}

function closeMusicWidget() {
    if (!els.musicWidget) return;
    els.musicWidget.classList.remove('open', 'legacy-open', 'island-open', 'track-open', 'track-list-open');
    els.musicWidget.classList.add('closed');
}

function switchMusicWidgetUi() {
    if (!els.musicWidget) return;
    const nextMode = els.musicWidget.classList.contains('legacy-open') ? 'island' : 'legacy';
    localStorage.setItem(MUSIC_UI_STORAGE_KEY, nextMode);
    openMusicWidget(nextMode);
    sfx.playKey('Tab');
}

function toggleMusicDetails() {
    if (!els.musicWidget || !els.musicWidget.classList.contains('island-open')) return;
    const willOpen = !els.musicWidget.classList.contains('track-open');
    els.musicWidget.classList.toggle('track-open', willOpen);
    if (!willOpen) els.musicWidget.classList.remove('track-list-open');

    const detailToggle = document.getElementById('music-detail-toggle');
    if (detailToggle) {
        detailToggle.setAttribute('aria-label', willOpen ? 'Collapse music details' : 'Expand music details');
    }

    if (willOpen) updateSoundCloudMetadata();
    sfx.playKey('Tab');
}

function toggleMusicTrackList() {
    if (!els.musicWidget || !els.musicWidget.classList.contains('island-open')) return;
    els.musicWidget.classList.add('track-open');
    els.musicWidget.classList.toggle('track-list-open');
    updateSoundCloudMetadata();
    sfx.playKey('Tab');
}

function toggleMusicPlayback() {
    const widget = initSoundCloudWidget();

    if (widget && typeof widget.play === 'function' && typeof widget.pause === 'function') {
        if (musicPlaying) {
            widget.pause();
        } else {
            widget.play();
        }
        return;
    }

    setMusicPlayback(!musicPlaying);
    setMusicStatus(musicPlaying ? 'STREAMING KUGNUS X AI' : 'SOUNDCLOUD LINK READY');
}

function initMusicWidgetPreference() {
    if (!els.musicWidget) return;
    const mode = preferredMusicUi();
    els.musicWidget.dataset.playerUi = mode;
    syncMusicUiControls(mode);
    renderMusicTrackList();
}

function handleMusicWidgetClick(e) {
    const action = e.target.closest('[data-music-action]')?.dataset.musicAction;

    if (action === 'close') {
        e.stopPropagation();
        closeMusicWidget();
        return;
    }

    if (action === 'toggle') {
        e.stopPropagation();
        toggleMusicPlayback();
        return;
    }

    if (action === 'switch-ui') {
        e.stopPropagation();
        switchMusicWidgetUi();
        return;
    }

    if (action === 'details') {
        e.stopPropagation();
        toggleMusicDetails();
        return;
    }

    if (action === 'track-list') {
        e.stopPropagation();
        toggleMusicTrackList();
        return;
    }

    if (els.musicWidget.classList.contains('closed')) {
        openMusicWidget(preferredMusicUi());
    }
}

function handleReadmeWidgetClick() {
    const readmeOverlay = document.getElementById('readme-overlay');
    if (!readmeOverlay) return;
    readmeOverlay.classList.remove('hidden');
    sfx.playKey('Enter');
}

function handleReadmeCloseClick() {
    const readmeOverlay = document.getElementById('readme-overlay');
    if (readmeOverlay) readmeOverlay.classList.add('hidden');
}

function handleReadmeOverlayClick(e) {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.add('hidden');
    }
}

function normalizeReadmeLanguage(value) {
    return value === 'ko' ? 'ko' : 'en';
}

function setReadmeLanguage(value, options = {}) {
    const lang = normalizeReadmeLanguage(value);
    const readmeBox = document.getElementById('readme-box');

    localStorage.setItem(README_LANGUAGE_STORAGE_KEY, lang);

    if (readmeBox) {
        readmeBox.dataset.manualLang = lang;
    }

    document.querySelectorAll('.readme-lang-toggle [data-readme-lang]').forEach(langButton => {
        langButton.classList.toggle('active', normalizeReadmeLanguage(langButton.dataset.readmeLang) === lang);
    });

    if (options.sound) sfx.playKey('Tab');
}

function initReadmeLanguage() {
    setReadmeLanguage(localStorage.getItem(README_LANGUAGE_STORAGE_KEY) || 'en');
}

function handleReadmeLanguageClick(e) {
    const button = e.target.closest('[data-readme-lang]');
    if (!button) return;

    const lang = normalizeReadmeLanguage(button.dataset.readmeLang);
    setReadmeLanguage(lang, { sound: true });
}

// Add Listeners for Game Controls
function initGameControls() {
    initCommandDialog();
    initOverlayChromeObserver();

    // Remove existing to be safe (though named functions handle this mostly)
    els.input.field.removeEventListener('input', handleInput);
    els.input.field.removeEventListener('keydown', handleKeydown);
    els.hud.btnPause.removeEventListener('click', togglePause);
    els.hud.btnHome.removeEventListener('click', goHome);
    els.screens.pause.removeEventListener('click', togglePause);
    els.controls.restartBtn.removeEventListener('click', handleRestart);
    if (els.musicWidget) els.musicWidget.removeEventListener('click', handleMusicWidgetClick);

    // Add
    els.input.field.addEventListener('input', handleInput);
    els.input.field.addEventListener('keydown', handleKeydown);
    els.hud.btnPause.addEventListener('click', togglePause);
    els.hud.btnHome.addEventListener('click', goHome);
    els.screens.pause.addEventListener('click', togglePause);
    els.controls.restartBtn.addEventListener('click', handleRestart);

    // Music Widget Logic
    if (els.musicWidget) {
        initMusicWidgetPreference();
        els.musicWidget.addEventListener('click', handleMusicWidgetClick);
    }


    // Readme Logic
    const readmeWidget = document.getElementById('readme-widget');
    const readmeOverlay = document.getElementById('readme-overlay');
    const readmeClose = document.getElementById('readme-close');
    const readmeLangToggle = document.querySelector('.readme-lang-toggle');

    if (readmeWidget && readmeOverlay && readmeClose) {
        console.log("README Elements Found & Listeners Attached");
        readmeWidget.removeEventListener('click', handleReadmeWidgetClick);
        readmeClose.removeEventListener('click', handleReadmeCloseClick);
        readmeOverlay.removeEventListener('click', handleReadmeOverlayClick);
        if (readmeLangToggle) readmeLangToggle.removeEventListener('click', handleReadmeLanguageClick);
        readmeWidget.addEventListener('click', handleReadmeWidgetClick);
        readmeClose.addEventListener('click', handleReadmeCloseClick);
        readmeOverlay.addEventListener('click', handleReadmeOverlayClick);
        if (readmeLangToggle) readmeLangToggle.addEventListener('click', handleReadmeLanguageClick);
        initReadmeLanguage();
    }

    console.log("Game Controls Initialized");
}

function init() {
    setGameChrome(false);
    initOverlayChromeObserver();
    initAuth();

    // Restore Nickname if any (though we use auth now)
    // const savedNick = localStorage.getItem('codedrop_nickname');
    // if (savedNick) els.controls.nickname.value = savedNick;

    // Load Initial Leaderboard
    fetchLeaderboard();
    initGameControls();
    initModeControls();


    // Sfx Init on interaction
    const initAudio = () => {
        sfx.init();
        sfx.playBGM();
        console.log("Audio Initialized & BGM Started");
        document.removeEventListener('click', initAudio);
        document.removeEventListener('touchstart', initAudio);
        document.removeEventListener('keydown', initAudio);
    };

    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);
    document.addEventListener('keydown', initAudio);

    // Global Enter to Start
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // Only if Start Screen is visible, User is Logged In, and Game is NOT playing
            const dashboard = document.getElementById('dashboard-screen');
            const commandDialog = document.getElementById('confirm-screen');
            if (!els.screens.start.classList.contains('hidden') &&
                els.auth.loggedInView.classList.contains('active') &&
                (!dashboard || dashboard.classList.contains('hidden')) &&
                (!commandDialog || commandDialog.classList.contains('hidden')) &&
                !state.isPlaying) {
                if (isOcpEditionActive()) {
                    handleStart();
                } else {
                    startGame();
                }
            }
        }
    });
}

// --- Auth Logic ---
function initAuth() {
    // Check LocalStorage
    const storedUser = localStorage.getItem('codedrop_user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            state.userId = user.id;
            state.userToken = user.token || null;
            state.nickname = user.nickname;
            showLoggedInView();
        } catch (e) {
            localStorage.removeItem('codedrop_user');
            showAuthView();
        }
    } else {
        showAuthView();
    }

    // Tabs
    els.auth.tabs.login.addEventListener('click', () => switchTab('login'));
    els.auth.tabs.register.addEventListener('click', () => switchTab('register'));

    // Buttons
    els.auth.btns.login.addEventListener('click', handleLogin);
    els.auth.btns.register.addEventListener('click', handleRegister);
    els.auth.btns.logout.addEventListener('click', handleLogout);
    els.auth.btns.withdraw.addEventListener('click', handleWithdraw);

    // Start Button (now in logged in view)
    els.controls.startBtn.addEventListener('click', startGame);

    // Enter key shortcuts for Auth
    els.auth.inputs.loginPass.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    els.auth.inputs.regPassConfirm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
}

function switchTab(tab) {
    els.auth.tabs.login.classList.toggle('active', tab === 'login');
    els.auth.tabs.register.classList.toggle('active', tab === 'register');
    els.auth.forms.login.classList.toggle('active', tab === 'login');
    els.auth.forms.register.classList.toggle('active', tab === 'register');

    // Clear errors
    els.auth.errors.login.textContent = '';
    els.auth.errors.register.textContent = '';
}

const LOCAL_AUTH_KEY = 'codedrop_local_auth_users';

function isLocalDevAuthEnabled() {
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function readLocalAuthUsers() {
    if (!isLocalDevAuthEnabled()) return {};

    try {
        const users = JSON.parse(localStorage.getItem(LOCAL_AUTH_KEY)) || {};
        if (!users.test) {
            users.test = { id: 'local-test', nickname: 'test', password: 'test' };
            localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(users));
        }
        return users;
    } catch (e) {
        return { test: { id: 'local-test', nickname: 'test', password: 'test' } };
    }
}

function saveLocalAuthUsers(users) {
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(users));
}

function tryLocalDevLogin(nickname, password) {
    const key = nickname.toLowerCase();
    const users = readLocalAuthUsers();
    const user = users[key];

    if (!user || user.password !== password) return false;
    loginSuccess(user.id, user.nickname, null);
    return true;
}

function createLocalDevUser(nickname, password) {
    if (!isLocalDevAuthEnabled()) return { ok: false, error: 'Local auth disabled.' };

    const key = nickname.toLowerCase();
    const users = readLocalAuthUsers();
    if (users[key]) return { ok: false, error: 'Nickname already taken locally.' };

    users[key] = {
        id: `local-${Date.now()}`,
        nickname,
        password
    };
    saveLocalAuthUsers(users);
    loginSuccess(users[key].id, nickname, null);
    return { ok: true };
}

async function handleLogin() {
    const nickname = els.auth.inputs.loginNick.value.trim();
    const password = els.auth.inputs.loginPass.value.trim();

    if (!nickname || !password) {
        els.auth.errors.login.textContent = "Please enter nickname and password.";
        return;
    }

    if (isLocalDevAuthEnabled() && tryLocalDevLogin(nickname, password)) return;

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, password })
        });
        const data = await res.json();

        if (res.ok) {
            // Success
            loginSuccess(data.user_id, data.nickname, data.token);
        } else if (res.status >= 500 && tryLocalDevLogin(nickname, password)) {
            return;
        } else {
            els.auth.errors.login.textContent = res.status >= 500 && isLocalDevAuthEnabled()
                ? "DB offline. Local dev login: test / test"
                : data.error || "Login failed.";
        }
    } catch (e) {
        if (tryLocalDevLogin(nickname, password)) return;
        els.auth.errors.login.textContent = isLocalDevAuthEnabled()
            ? "Server offline. Local dev login: test / test"
            : "Server error.";
    }
}

async function handleRegister() {
    const nickname = els.auth.inputs.regNick.value.trim();
    const password = els.auth.inputs.regPass.value.trim();
    const confirm = els.auth.inputs.regPassConfirm.value.trim();

    if (!nickname || !password) {
        els.auth.errors.register.textContent = "All fields required.";
        return;
    }
    if (password.length < 4) {
        els.auth.errors.register.textContent = "Password too short (min 4).";
        return;
    }
    if (password !== confirm) {
        els.auth.errors.register.textContent = "Passwords do not match.";
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, password })
        });
        const data = await res.json();

        if (res.ok) {
            // Success -> Auto Login
            loginSuccess(data.user_id, data.nickname, data.token);
        } else if (res.status >= 500 && createLocalDevUser(nickname, password).ok) {
            return;
        } else {
            els.auth.errors.register.textContent = data.error || "Registration failed.";
        }
    } catch (e) {
        const localResult = createLocalDevUser(nickname, password);
        if (localResult.ok) return;
        els.auth.errors.register.textContent = isLocalDevAuthEnabled()
            ? localResult.error
            : "Server error.";
    }
}

function loginSuccess(id, nickname, token = null) {
    state.userId = id;
    state.userToken = token;
    state.nickname = nickname;
    localStorage.setItem('codedrop_user', JSON.stringify({ id, nickname, token }));
    showLoggedInView();
}

function handleLogout() {
    state.userId = null;
    state.userToken = null;
    state.nickname = '';
    localStorage.removeItem('codedrop_user');

    // Clear inputs
    els.auth.inputs.loginNick.value = '';
    els.auth.inputs.loginPass.value = '';
    els.auth.inputs.regNick.value = '';
    els.auth.inputs.regPass.value = '';
    els.auth.inputs.regPassConfirm.value = '';

    showAuthView();
}

async function handleWithdraw() {
    const result = await showCommandDialog({
        title: 'DELETE ACCOUNT?',
        message: '계정을 삭제하면 로컬 로그인 정보와 원격 계정 복구가 불가능합니다. 계속하려면 비밀번호를 입력하세요.',
        okText: 'WITHDRAW',
        cancelText: 'CANCEL',
        input: true,
        placeholder: 'PASSWORD',
        requireValue: true,
        danger: true
    });

    if (!result.accepted) return;

    const password = result.value;

    if (isLocalDevAuthEnabled() && !state.userToken) {
        const key = state.nickname.toLowerCase();
        const users = readLocalAuthUsers();
        if (users[key] && users[key].password === password) {
            delete users[key];
            saveLocalAuthUsers(users);
            await showCommandDialog({
                title: 'LOCAL ACCOUNT DELETED',
                message: '로컬 개발 계정이 삭제되었습니다.',
                okText: 'OK',
                cancelText: ''
            });
            handleLogout();
        } else {
            await showCommandDialog({
                title: 'WITHDRAW FAILED',
                message: '비밀번호가 일치하지 않습니다.',
                okText: 'OK',
                cancelText: '',
                danger: true
            });
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(state.userToken ? { 'Authorization': `Bearer ${state.userToken}` } : {})
            },
            body: JSON.stringify({ password })
        });

        if (res.ok) {
            await showCommandDialog({
                title: 'ACCOUNT DELETED',
                message: '계정이 삭제되었습니다.',
                okText: 'OK',
                cancelText: ''
            });
            handleLogout();
        } else {
            const data = await res.json();
            await showCommandDialog({
                title: 'WITHDRAW FAILED',
                message: data.error || 'Unknown error',
                okText: 'OK',
                cancelText: '',
                danger: true
            });
        }
    } catch (e) {
        await showCommandDialog({
            title: 'SERVER ERROR',
            message: '서버 응답을 받지 못했습니다.',
            okText: 'OK',
            cancelText: '',
            danger: true
        });
    }
}

function showLoggedInView() {
    els.auth.authContainer.style.display = 'none';
    els.auth.loggedInView.classList.add('active');
    els.auth.userDisplay.textContent = state.nickname;

    // Refresh leaderboard for default view
    fetchLeaderboard();
    initGameControls();
    syncOverlayChrome();
}

function showAuthView() {
    document.body.classList.remove('ocp-edition');
    setGameChrome(false);
    const standardMenu = document.getElementById('standard-menu');
    const ocpMenu = document.getElementById('ocp-menu');
    const editionCodeBtn = document.getElementById('edition-code-btn');
    const editionOcpBtn = document.getElementById('edition-ocp-btn');
    if (standardMenu) standardMenu.classList.remove('hidden');
    if (ocpMenu) ocpMenu.classList.add('hidden');
    if (editionOcpBtn) editionOcpBtn.classList.remove('active');
    if (editionCodeBtn) editionCodeBtn.classList.add('active');
    els.auth.authContainer.style.display = 'block';
    els.auth.loggedInView.classList.remove('active');
    switchTab('login');
    syncOverlayChrome();
}

// Start
window.addEventListener('load', init);
