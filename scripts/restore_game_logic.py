
import os

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Change "INITIALIZE" to "START"
content = content.replace('<button class="btn" id="start-btn">Initialize</button>', '<button class="btn" id="start-btn">START</button>')

# 2. Improve CSS for Alignment
# We'll add some CSS to the end of the style block
css_fix = """
        /* Alignment Fixes */
        .select-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 20px;
            width: 100%;
        }
        
        .select-group label {
            color: var(--primary-neon);
            font-size: 0.8rem;
            letter-spacing: 1px;
            margin-left: 5px;
        }

        .select-group select {
            width: 100%;
            padding: 12px;
            background: rgba(0,0,0,0.8);
            border: 1px solid #333;
            color: #fff;
            font-family: var(--font-code);
            outline: none;
            cursor: pointer;
            transition: all 0.3s;
        }

        .select-group select:hover {
            border-color: var(--primary-neon);
            box-shadow: 0 0 10px rgba(0, 243, 255, 0.1);
        }

        #start-btn {
            width: 100%;
            padding: 15px;
            font-size: 1.2rem;
            letter-spacing: 3px;
            margin-top: 10px;
            margin-bottom: 20px;
        }

        .logged-in-view {
            gap: 10px;
        }
"""
content = content.replace('</style>', css_fix + '\n    </style>')


# 3. Restore Missing JS Logic
# We need to insert the missing functions before "function init() {"
# The missing functions are: startGame, togglePause, goHome, handleInput, handleKeydown, and MusicBox logic.

missing_js = """
        function startGame() {
            // Validate
            const diff = els.controls.diffSelect.value;
            const pack = els.controls.packSelect.value;
            
            state.difficulty = diff;
            state.pack = pack;

            // UI Reset
            els.screens.start.classList.add('hidden');
            els.screens.pause.classList.add('hidden');
            els.screens.result.classList.add('hidden');
            els.gameArea.innerHTML = ''; // Clear words
            els.input.field.value = '';
            els.input.field.disabled = false;
            els.input.field.focus();
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
            state.lastSpawnTime = Date.now();
            state.totalCharsTyped = 0;
            state.correctCharsTyped = 0;
            state.targetId = null;

            updateHUD();
            
            // Start Loop
            requestAnimationFrame(gameLoop);
            
            // Play BGM
            sfx.playBGM();
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
                state.lastSpawnTime = Date.now();
            }
        }

        function goHome() {
            if (confirm("ABORT MISSION? Progress will be lost.")) {
                state.isPlaying = false;
                state.isPaused = false;
                els.screens.pause.classList.add('hidden');
                els.screens.result.classList.add('hidden');
                els.screens.start.classList.remove('hidden');

                // Clear game area
                els.gameArea.innerHTML = '';
                state.activeWords = [];

                fetchLeaderboard();
                sfx.playBGM();
            }
        }

        // Add Listeners for Game Controls
        function initGameControls() {
            els.input.field.addEventListener('input', handleInput);
            els.input.field.addEventListener('keydown', handleKeydown);

            // Controls
            els.hud.btnPause.addEventListener('click', togglePause);
            els.hud.btnHome.addEventListener('click', goHome);

            // Resume on overlay click
            els.screens.pause.addEventListener('click', togglePause);
            
            // Restart from Result
            els.controls.restartBtn.addEventListener('click', () => {
                els.screens.result.classList.add('hidden');
                els.screens.start.classList.remove('hidden');
                fetchLeaderboard(); 
                sfx.playBGM();
            });

            // Music Widget Logic
            if (els.musicWidget) {
                els.musicWidget.addEventListener('click', (e) => {
                    // If clicking close button, minimize
                    if (e.target.id === 'close-player') {
                        e.stopPropagation();
                        els.musicWidget.classList.remove('open');
                        els.musicWidget.classList.add('closed');
                        return;
                    }

                    // If closed, open it
                    if (els.musicWidget.classList.contains('closed')) {
                        els.musicWidget.classList.remove('closed');
                        els.musicWidget.classList.add('open');
                    }
                });
            }
        }
"""

# Insert missing JS before init()
content = content.replace('function init() {', missing_js + '\n        function init() {')

# Add initGameControls() call inside init()
content = content.replace('fetchLeaderboard();', 'fetchLeaderboard();\n            initGameControls();')


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully restored game logic, fixed UI, and enabled MusicBox.")
