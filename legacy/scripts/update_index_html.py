
import os

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the block to replace (Identify Yourself block)
start_marker = '<div class="select-group">'
end_marker = '<button class="btn" id="start-btn">Initialize</button>'

# Find the start of the card content (Identify Yourself)
# We look for the specific label to be sure
label_marker = '<label>Identify Yourself</label><!-- Test -->'
start_index = content.find(label_marker)

if start_index == -1:
    print("Could not find the start marker.")
    exit(1)

# Backtrack to the beginning of the div
div_start = content.rfind('<div class="select-group">', 0, start_index)

# Find the end of the card content (Initialize button)
button_end = content.find(end_marker)
if button_end == -1:
    print("Could not find the end marker.")
    exit(1)

# Calculate the end of the button tag
div_end = button_end + len(end_marker)

# The content to replace
old_content = content[div_start:div_end]
print(f"Replacing content from index {div_start} to {div_end}")

# New Content
new_content = """<!-- Auth Container -->
                <div id="auth-container">
                    <div class="auth-tabs">
                        <button class="auth-tab active" id="tab-login">LOGIN</button>
                        <button class="auth-tab" id="tab-register">REGISTER</button>
                    </div>

                    <!-- Login Form -->
                    <div class="auth-form active" id="form-login">
                        <input type="text" id="login-nick" placeholder="NICKNAME" maxlength="16">
                        <input type="password" id="login-pass" placeholder="PASSWORD">
                        <div class="auth-error" id="login-error"></div>
                        <button class="btn" id="btn-login" style="margin-top: 10px;">LOGIN</button>
                    </div>

                    <!-- Register Form -->
                    <div class="auth-form" id="form-register">
                        <input type="text" id="reg-nick" placeholder="NICKNAME (3-16 chars)" maxlength="16">
                        <input type="password" id="reg-pass" placeholder="PASSWORD (min 4 chars)">
                        <input type="password" id="reg-pass-confirm" placeholder="CONFIRM PASSWORD">
                        <div class="auth-error" id="reg-error"></div>
                        <button class="btn" id="btn-register" style="margin-top: 10px;">REGISTER</button>
                    </div>
                </div>

                <!-- Logged In View -->
                <div id="logged-in-view" class="logged-in-view">
                    <div class="welcome-msg">WELCOME, <span id="user-display">AGENT</span></div>

                    <div class="select-group">
                        <label>System Difficulty</label>
                        <select id="difficulty-select">
                            <option value="EASY">EASY [SAFE_MODE]</option>
                            <option value="NORMAL" selected>NORMAL [STANDARD]</option>
                            <option value="DEVELOPER">DEVELOPER [OVERCLOCK]</option>
                        </select>
                    </div>
                    <div class="select-group">
                        <label>Data Pack</label>
                        <select id="pack-select">
                            <option value="PYTHON">Python Module</option>
                            <option value="JS">JavaScript Runtime</option>
                            <option value="HTTP">Network Protocols</option>
                            <option value="CLI">Terminal Commands</option>
                            <option value="VOCAB">Dev Vocabulary</option>
                            <option value="MIX">Full System Mix</option>
                        </select>
                    </div>
                    <button class="btn" id="start-btn">Initialize</button>

                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="btn-small" id="btn-logout">LOGOUT</button>
                        <button class="btn-small btn-danger" id="btn-withdraw">WITHDRAW</button>
                    </div>
                </div>"""

# Replace
new_file_content = content[:div_start] + new_content + content[div_end:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_file_content)

print("Successfully updated index.html")
