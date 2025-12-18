
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

        function init() {
            initAuth();
            
            // Restore Nickname if any (though we use auth now)
            // const savedNick = localStorage.getItem('codedrop_nickname');
            // if (savedNick) els.controls.nickname.value = savedNick;

            // Load Initial Leaderboard
            fetchLeaderboard();

            // Sfx Init on interaction
            const initAudio = () => {
                sfx.init();
                sfx.playBGM();
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
        }

        function showAuthView() {
            els.auth.authContainer.style.display = 'block';
            els.auth.loggedInView.classList.remove('active');
            switchTab('login');
        }

        // Start
        init();

    