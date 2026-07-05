
import os
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix CSS (Add Neon/Cyberpunk styles)
# We'll replace the existing Auth CSS with improved versions
css_start_marker = "/* --- Auth UI --- */"
css_end_marker = "</style>"

new_css = """/* --- Auth UI --- */
        .auth-tabs {
            display: flex;
            margin-bottom: 25px;
            border-bottom: 2px solid rgba(0, 243, 255, 0.2);
            gap: 10px;
        }

        .auth-tab {
            flex: 1;
            padding: 12px;
            background: rgba(0, 0, 0, 0.6);
            color: #666;
            cursor: pointer;
            font-family: var(--font-display);
            font-size: 1rem;
            transition: all 0.3s;
            border: 1px solid transparent;
            outline: none;
            text-transform: uppercase;
            letter-spacing: 1px;
            clip-path: polygon(10% 0, 100% 0, 100% 100%, 0 100%, 0 20%);
        }

        .auth-tab:hover {
            color: #fff;
            background: rgba(0, 243, 255, 0.1);
        }

        .auth-tab.active {
            background: rgba(0, 243, 255, 0.15);
            color: var(--primary-neon);
            border: 1px solid var(--primary-neon);
            box-shadow: 0 0 10px rgba(0, 243, 255, 0.2);
            text-shadow: 0 0 5px var(--primary-neon);
        }

        .auth-form {
            display: none;
            flex-direction: column;
            gap: 20px;
        }

        .auth-form.active {
            display: flex;
            animation: fadeIn 0.3s ease-out;
        }

        .auth-form input {
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #333;
            padding: 15px;
            color: #fff;
            font-family: var(--font-code);
            font-size: 1rem;
            outline: none;
            transition: all 0.3s;
            border-left: 3px solid #333;
        }

        .auth-form input:focus {
            border-color: var(--primary-neon);
            box-shadow: -5px 0 10px -5px var(--primary-neon);
            background: rgba(0, 243, 255, 0.05);
        }

        .auth-error {
            color: var(--danger-color);
            font-size: 0.85rem;
            min-height: 1.2em;
            text-shadow: 0 0 5px rgba(255, 0, 85, 0.5);
            font-family: var(--font-code);
        }

        .logged-in-view {
            display: none;
            flex-direction: column;
            align-items: center;
            width: 100%;
            animation: fadeIn 0.5s ease-out;
        }

        .logged-in-view.active {
            display: flex;
        }

        .welcome-msg {
            font-size: 1.4rem;
            color: #fff;
            margin-bottom: 30px;
            font-family: var(--font-display);
            text-shadow: 0 0 10px rgba(0, 243, 255, 0.3);
            border: 1px solid var(--primary-neon);
            padding: 10px 30px;
            background: rgba(0, 243, 255, 0.05);
            clip-path: polygon(10% 0, 100% 0, 100% 80%, 90% 100%, 0 100%, 0 20%);
        }

        .welcome-msg span {
            color: var(--primary-neon);
            font-weight: bold;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
"""

# Replace CSS
# We need to find the existing Auth CSS block
start_idx = content.find(css_start_marker)
end_idx = content.find(css_end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_css + content[end_idx:]
else:
    print("Warning: Could not find CSS block to replace.")


# 2. Fix JS Syntax Error
# The error is around "sfx." followed by "function initAuth() {"
# We will remove the broken block and insert the correct one.

# We look for the broken init function start
broken_init_start = "function init() {"
# And the broken end (which is actually where the new function starts)
broken_init_end_marker = "function initAuth() {"

# We will search for the block that contains the error
# It looks like:
# function init() {
#     initAuth();
#     ...
#     els.controls.startBtn.addEventListener('click', () => {
#         sfx.
# // --- Auth Logic ---
# function initAuth() {

# We will replace everything from "function init() {" down to the end of the file (excluding </body></html>)
# with the correct code.

# Find the last occurrence of "function init() {"
init_start_idx = content.rfind("function init() {")

if init_start_idx == -1:
    print("Error: Could not find 'function init() {'")
    exit(1)

# Find the end of the script tag
script_end_idx = content.rfind("</script>")

# We will replace the content from init_start_idx to script_end_idx
# with the correct logic.

new_js_logic = """function init() {
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
"""

content = content[:init_start_idx] + new_js_logic + "\n    " + content[script_end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed index.html syntax and updated UI.")
