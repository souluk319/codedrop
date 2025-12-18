
        /**
         * CodeDrop - Cyberpunk Edition
         */

        // --- API Config ---
        const API_BASE = "";

        // --- Data & Config ---

        const WORD_PACKS = {
            PYTHON: [
                // basics
                "def", "return", "class", "self", "import", "from", "as", "pass",
                "if", "elif", "else", "for", "while", "break", "continue",
                "try", "except", "finally", "raise", "with", "lambda",

                // built-in functions
                "print()", "input()", "len()", "range()", "open()", "type()", "id()",
                "str()", "int()", "float()", "bool()", "list()", "dict()", "set()", "tuple()",
                "enumerate()", "zip()", "map()", "filter()", "sorted()", "sum()", "min()", "max()",
                "any()", "all()", "dir()", "help()", "isinstance()",

                // common methods
                ".append()", ".pop()", ".sort()", ".reverse()", ".index()", ".count()",
                ".get()", ".items()", ".keys()", ".values()", ".update()",
                ".split()", ".join()", ".strip()", ".replace()", ".lower()", ".upper()",
                ".startswith()", ".endswith()", ".find()", ".format()",

                // standard library
                "import os", "import sys", "import time", "import math", "import random",
                "import json", "import re", "import datetime", "import collections",
                "os.path.join()", "os.listdir()", "sys.argv", "time.sleep()",
                "math.pi", "math.sqrt()", "random.randint()", "random.choice()",
                "json.loads()", "json.dumps()", "datetime.now()",

                // dunder methods
                "__init__", "__str__", "__repr__", "__name__", "__main__"
            ],

            JS: [
                // variables & syntax
                "const", "let", "var", "function", "=>", "return",
                "if", "else", "switch", "case", "break", "default",

                // error & control
                "try", "catch", "finally", "throw",
                "new", "this", "class", "extends", "super",

                // modules
                "import", "export", "require()", "module.exports",

                // browser
                "console.log", "document", "window", "navigator", "location",
                "querySelector()", "addEventListener()", "removeEventListener()",

                // storage & fetch
                "localStorage", "sessionStorage", "fetch()", "Headers",
                "Request", "Response",

                // async
                "Promise", "then()", "catch()", "finally()",
                "async", "await",

                // arrays & objects
                "map()", "filter()", "reduce()", "forEach()", "find()", "some()", "every()",
                "Object.keys()", "Object.values()", "Object.entries()",

                // json
                "JSON.parse", "JSON.stringify",

                // node & tooling
                "npm install", "npm run", "npx",
                "package.json", "node_modules",
                "webpack", "babel", "vite", "eslint", "prettier",

                // frameworks
                "react", "vue", "svelte", "next.js", "express"
            ],

            HTTP: [
                // methods
                "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS",

                // status
                "200 OK", "201 Created", "204 No Content",
                "301 Moved Permanently", "302 Found",
                "400 Bad Request", "401 Unauthorized", "403 Forbidden",
                "404 Not Found", "409 Conflict",
                "500 Internal Server Error", "502 Bad Gateway", "503 Service Unavailable",

                // headers
                "Content-Type", "Content-Length", "Authorization",
                "Bearer", "Cache-Control", "ETag", "Cookie", "Set-Cookie",
                "User-Agent", "Accept", "Accept-Encoding", "Origin", "Referer",

                // concepts
                "CORS", "HTTPS", "SSL", "TLS", "DNS", "IP Address",
                "localhost", "127.0.0.1", "0.0.0.0",
                "port 80", "port 443", "port 3000", "port 8000",

                // api
                "REST API", "GraphQL", "JSON", "request body", "query string",
                "path parameter", "response payload", "rate limit"
            ],

            CLI: [
                // git
                "git init", "git clone", "git status", "git add .", "git commit",
                "git push", "git pull", "git fetch", "git merge",
                "git checkout", "git branch", "git rebase",
                "git log", "git diff", "git stash", "git reset",

                // docker
                "docker ps", "docker images", "docker build", "docker run",
                "docker stop", "docker rm", "docker rmi",
                "docker-compose up", "docker-compose down",

                // shell
                "ls -la", "pwd", "cd ..", "mkdir", "rm -rf",
                "touch", "cat", "less", "more",
                "grep", "awk", "sed", "curl", "wget",
                "ssh", "scp",

                // permissions
                "chmod", "chown", "sudo",

                // package managers
                "apt-get update", "apt-get install",
                "brew install", "brew update",

                // env
                "echo $PATH", "export PATH", "env", "which",
                "history", "clear"
            ],

            VOCAB: [
                // general dev
                "API", "SDK", "IDE", "GUI", "CLI",
                "JSON", "XML", "YAML", "HTML", "CSS",
                "SQL", "NoSQL",

                // architecture
                "Database", "Server", "Client",
                "Frontend", "Backend", "Fullstack",
                "Monolith", "Microservice",

                // infra
                "DevOps", "CI/CD", "Pipeline",
                "Build", "Deploy", "Rollback",

                // CS
                "Algorithm", "Data Structure", "Big O",
                "Recursion", "Iteration",
                "Stack", "Queue", "Heap", "HashMap",

                // language
                "Variable", "Constant", "Function", "Method",
                "Class", "Object", "Interface",
                "Array", "String", "Integer", "Boolean", "Float",

                // quality
                "Bug", "Debug", "Test", "Refactor",
                "Lint", "Format",

                // performance
                "Latency", "Throughput", "Bandwidth",
                "Concurrency", "Parallelism", "Deadlock"
            ],

            MIX: [] // 아래에서 자동 합성 추천
        };


        // Populate MIX
        WORD_PACKS.MIX = Object.values(WORD_PACKS)
            .filter(pack => Array.isArray(pack))
            .flat();


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
            targetId: null, // ID of the word currently being targeted
            lastSpawnTime: 0,
            userId: null, // From API
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
            musicWidget: document.getElementById('music-widget')
        };

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
                                this.bgm.play();
                                document.removeEventListener('click', playOnInteraction);
                                document.removeEventListener('keydown', playOnInteraction);
                            };
                            document.addEventListener('click', playOnInteraction);
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

        // --- Game Logic ---


        async function fetchLeaderboard() {
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
            for (let i = 0; i < state.lives; i++) hearts += '♥';
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

            // Filter pool to exclude currently active words to prevent duplicates
            let pool = WORD_PACKS[state.pack];
            const activeTexts = state.activeWords.map(w => w.text);
            const filteredPool = pool.filter(word => !activeTexts.includes(word));

            // Use filtered pool if available, otherwise fallback to full pool
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


        function handleDrop(index) {
            const word = state.activeWords[index];

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
            state.isPlaying = false;
            state.isPaused = false;

            // Calculate Stats
            const durationMin = (Date.now() - state.startTime) / 60000;
            const wpm = durationMin > 0 ? Math.round((state.correctCharsTyped / 5) / durationMin) : 0;
            const accuracy = state.totalCharsTyped > 0 ? Math.round((state.correctCharsTyped / state.totalCharsTyped) * 100) : 0;

            // Update Result Screen
            els.result.title.textContent = victory ? "MISSION COMPLETE" : "SYSTEM FAILURE";
            els.result.title.style.color = victory ? "var(--success-color)" : "var(--danger-color)";
            els.result.title.style.textShadow = victory ? "0 0 20px var(--success-color)" : "0 0 20px var(--danger-color)";

            els.result.score.textContent = state.score;
            els.result.combo.textContent = state.maxCombo;
            els.result.wpm.textContent = wpm;
            els.result.acc.textContent = accuracy + "%";

            els.screens.result.classList.remove('hidden');

            // Submit Score
            if (state.userId) {
                els.result.status.textContent = "UPLOADING DATA...";
                try {
                    const res = await fetch(`${API_BASE}/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: state.userId,
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
            if (!list || list.length === 0) {
                els.controls.leaderboard.innerHTML = '<div style="text-align:center; color:#666;">NO DATA FOUND. BE THE FIRST.</div>';
                return;
            }

            let html = '<table>';
            html += '<tr><th>RANK</th><th>AGENT</th><th style="text-align:right;">SCORE</th><th style="text-align:right;">WPM</th></tr>';

            list.forEach((item, index) => {
                const rank = index + 1;
                const rankClass = rank <= 3 ? `rank-${rank}` : '';
                const nameStyle = rank <= 3 ? 'color:var(--primary-neon); font-weight:bold; font-size: 1.1em;' : 'color:var(--primary-neon);';

                html += `<tr>
            <td class="${rankClass}" style="font-weight:bold;">#${rank}</td>
            <td style="${nameStyle}">${item.nickname}</td>
            <td style="text-align:right; font-family:var(--font-code); color:#fff;">${item.score}</td>
            <td style="text-align:right; font-family:var(--font-code); color:#888;">${item.wpm}</td>
        </tr>`;
            });
            html += '</table>';

            els.controls.leaderboard.innerHTML = html;
        }



        function startGame() {
            console.log('Starting Game...');
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
                initGameControls();
                // sfx.playBGM();
            }
        }

        // Add Listeners for Game Controls

        // Named handlers to prevent duplicates
        function handleRestart() {
            els.screens.result.classList.add('hidden');
            els.screens.start.classList.remove('hidden');
            fetchLeaderboard();
            // sfx.playBGM();
        }

        function handleMusicWidgetClick(e) {
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
        }

        // Add Listeners for Game Controls
        function initGameControls() {
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
                els.musicWidget.addEventListener('click', handleMusicWidgetClick);
            }


            // Readme Logic
            const readmeWidget = document.getElementById('readme-widget');
            const readmeOverlay = document.getElementById('readme-overlay');
            const readmeClose = document.getElementById('readme-close');

            if (readmeWidget && readmeOverlay && readmeClose) {
                readmeWidget.addEventListener('click', () => {
                    readmeOverlay.classList.remove('hidden');
                    sfx.playKey('Enter'); // Sound feedback
                });

                readmeClose.addEventListener('click', () => {
                    readmeOverlay.classList.add('hidden');
                });

                readmeOverlay.addEventListener('click', (e) => {
                    if (e.target === readmeOverlay) {
                        readmeOverlay.classList.add('hidden');
                    }
                });
            }

            console.log("Game Controls Initialized");
        }

        function init() {
            initAuth();

            // Restore Nickname if any (though we use auth now)
            // const savedNick = localStorage.getItem('codedrop_nickname');
            // if (savedNick) els.controls.nickname.value = savedNick;

            // Load Initial Leaderboard
            fetchLeaderboard();
            initGameControls();

            
            // Sfx Init on interaction
            const initAudio = () => {
                sfx.init();
                sfx.playBGM();
                console.log("Audio Initialized & BGM Started");
                document.removeEventListener('click', initAudio);
                document.removeEventListener('keydown', initAudio);
            };

            document.addEventListener('click', initAudio);
            document.addEventListener('keydown', initAudio);
        }

        // --- Auth Logic ---
        function initAuth() {
            // Check LocalStorage
            const storedUser = localStorage.getItem('codedrop_user');
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    state.userId = user.id;
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

        async function handleLogin() {
            const nickname = els.auth.inputs.loginNick.value.trim();
            const password = els.auth.inputs.loginPass.value.trim();

            if (!nickname || !password) {
                els.auth.errors.login.textContent = "Please enter nickname and password.";
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nickname, password })
                });
                const data = await res.json();

                if (res.ok) {
                    // Success
                    loginSuccess(data.user_id, data.nickname);
                } else {
                    els.auth.errors.login.textContent = data.error || "Login failed.";
                }
            } catch (e) {
                els.auth.errors.login.textContent = "Server error.";
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
                    loginSuccess(data.user_id, data.nickname);
                } else {
                    els.auth.errors.register.textContent = data.error || "Registration failed.";
                }
            } catch (e) {
                els.auth.errors.register.textContent = "Server error.";
            }
        }

        function loginSuccess(id, nickname) {
            state.userId = id;
            state.nickname = nickname;
            localStorage.setItem('codedrop_user', JSON.stringify({ id, nickname }));
            showLoggedInView();
        }

        function handleLogout() {
            state.userId = null;
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
            if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;

            const password = prompt("Please enter your password to confirm deletion:");
            if (!password) return;

            try {
                const res = await fetch(`${API_BASE}/withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: state.userId, password })
                });

                if (res.ok) {
                    alert("Account deleted.");
                    handleLogout();
                } else {
                    const data = await res.json();
                    alert("Failed: " + (data.error || "Unknown error"));
                }
            } catch (e) {
                alert("Server error.");
            }
        }

        function showLoggedInView() {
            els.auth.authContainer.style.display = 'none';
            els.auth.loggedInView.classList.add('active');
            els.auth.userDisplay.textContent = state.nickname;

            // Refresh leaderboard for default view
            fetchLeaderboard();
            initGameControls();
        }

        function showAuthView() {
            els.auth.authContainer.style.display = 'block';
            els.auth.loggedInView.classList.remove('active');
            switchTab('login');
        }

        // Start
        init();

    