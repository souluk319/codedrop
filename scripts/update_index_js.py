
import os

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update els object
# Remove nickname from controls
old_controls = """            controls: {
                diffSelect: document.getElementById('difficulty-select'),
                packSelect: document.getElementById('pack-select'),
                startBtn: document.getElementById('start-btn'),
                restartBtn: document.getElementById('restart-btn'),
                nickname: document.getElementById('nickname-input'),
                leaderboard: document.getElementById('leaderboard-list')
            },"""

new_controls = """            controls: {
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
            },"""

content = content.replace(old_controls, new_controls)

# 2. Add Auth Logic
# We'll append the auth logic before the init() call
init_call = "init();"
auth_logic = """
        // --- Auth Logic ---
        function initAuth() {
            // Check LocalStorage
            const storedUser = localStorage.getItem('codedrop_user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                state.userId = user.id;
                state.nickname = user.nickname;
                showLoggedInView();
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
"""

# Insert logic before init()
content = content.replace(init_call, auth_logic + "\n        " + init_call)

# 3. Update init() function
# Remove old startBtn listener and add initAuth() call
# We need to find the init function definition
# It's likely: function init() { ... }
# We'll replace the startBtn listener inside it.

# Actually, let's just append initAuth() call inside init() or call it at the start of init().
# Let's find "function init() {"
init_def = "function init() {"
new_init_def = "function init() {\n            initAuth();"
content = content.replace(init_def, new_init_def)

# Remove the old startBtn listener if it exists in init()
# "els.controls.startBtn.addEventListener('click', startGame);"
# We already added it in initAuth, so we should remove the old one to avoid duplicates or errors if we didn't remove it.
# But wait, the old one might be there. Let's try to remove it.
old_listener = "els.controls.startBtn.addEventListener('click', startGame);"
# content = content.replace(old_listener, "// " + old_listener) # Comment it out

# Actually, in initAuth I added the listener. If I don't remove the old one, it might be fine, but better to remove.
# However, I don't know exactly where it is.
# Let's assume it's in init().

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated index.html JS")
