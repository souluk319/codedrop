
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Login Enter Shortcut
# Find: els.controls.startBtn.addEventListener('click', startGame);
# Append after it (inside initAuth)
# We use a regex to be safe about whitespace
login_pattern = r"(els\.controls\.startBtn\.addEventListener\('click', startGame\);)"
login_shortcut = r"""\1

            // Enter key shortcuts for Auth
            els.auth.inputs.loginPass.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleLogin();
            });
            els.auth.inputs.regPassConfirm.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleRegister();
            });"""

content = re.sub(login_pattern, login_shortcut, content)

# 2. Add Global Start Shortcut
# Find: document.addEventListener('keydown', initAudio);
# Append after it (inside init)
start_pattern = r"(document\.addEventListener\('keydown', initAudio\);)"
start_shortcut = r"""\1

            // Global Enter to Start
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    // Only if Start Screen is visible, User is Logged In, and Game is NOT playing
                    if (!els.screens.start.classList.contains('hidden') && 
                        els.auth.loggedInView.classList.contains('active') && 
                        !state.isPlaying) {
                        startGame();
                    }
                }
            });"""

content = re.sub(start_pattern, start_shortcut, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully injected Enter key shortcuts.")
