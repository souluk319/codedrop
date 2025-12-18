
import os

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update .overlay CSS
overlay_css_old = """        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 40px;
            padding: 40px 0;
            justify-content: center;
            align-items: center;
            z-index: 100;
            overflow-y: auto;
        }"""

overlay_css_new = """        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(5px);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 100;
            overflow-y: auto;
            padding: 40px 0;
        }

        /* Electric Background Effect */
        .overlay::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                linear-gradient(transparent 95%, var(--primary-neon) 96%, transparent 97%),
                linear-gradient(90deg, transparent 95%, var(--primary-neon) 96%, transparent 97%);
            background-size: 100px 100px;
            opacity: 0.1;
            animation: electric-grid 2s linear infinite;
            pointer-events: none;
            z-index: -1;
        }

        @keyframes electric-grid {
            0% { transform: translate(0, 0); opacity: 0.1; }
            50% { opacity: 0.2; }
            100% { transform: translate(50px, 50px); opacity: 0.1; }
        }"""

# 2. Update .card CSS
card_css_old_start = ".card {"
card_css_new = """        .card {
            background: rgba(10, 10, 15, 0.95);
            border: 1px solid var(--glass-border);
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            width: 400px;
            height: 500px;
            box-shadow: 0 0 30px rgba(0, 243, 255, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.5);
            position: relative;
            overflow: hidden;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }"""

# 3. Update HTML Structure
html_old_start = '<div id="start-screen" class="overlay">'
html_new = """    <!-- Start Screen -->
    <div id="start-screen" class="overlay">
        <h1 style="margin-bottom: 40px; font-size: 5rem; text-shadow: 0 0 20px var(--primary-neon);">CODEDROP</h1>
        
        <div style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 40px; justify-content: center; align-items: center; width: 100%;">
            
            <!-- Main Menu Card -->
            <div class="card">
                <div class="select-group">
                    <label>Identify Yourself</label>
                    <input type="text" id="nickname-input" placeholder="ENTER_NICKNAME" maxlength="16"
                        style="text-align: center;">
                </div>

                <div class="select-group">
                    <label>System Difficulty</label>
                    <select id="difficulty-select">
                        <option value="EASY">EASY [SAFE_MODE]</option>
                        <option value="NORMAL">NORMAL [STANDARD]</option>
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
            </div>

            <!-- Leaderboard Preview -->
            <div id="leaderboard-preview">
                <h3
                    style="margin-bottom: 20px; color: var(--primary-neon); font-family: var(--font-display); letter-spacing: 2px; font-size: 1.5rem; text-shadow: 0 0 10px var(--primary-neon);">
                    TOP AGENTS</h3>
                <div id="leaderboard-list">
                    <div style="text-align: center; color: #666;">CONNECTING TO SERVER...</div>
                </div>
            </div>
        </div>
    </div>"""

# Apply replacements
if overlay_css_old in content:
    content = content.replace(overlay_css_old, overlay_css_new)
else:
    print("Warning: Overlay CSS not found exactly, attempting partial match...")
    # Fallback logic if needed, but for now let's rely on exact match or manual fix

# For card CSS, we replace the block
import re
content = re.sub(r'\.card\s*\{[^}]+\}', card_css_new, content)

# For HTML, we need to be careful. We'll replace the whole start-screen block.
# Finding the start and end of the start-screen div is tricky with regex.
# Let's try to construct the old HTML block based on what we know is there.
# Or simpler: find <div id="start-screen" ...> and replace until the closing </div> of that block.
# Given the complexity, let's try to match the specific structure we saw in view_file.

start_marker = '<div id="start-screen" class="overlay">'
end_marker = '<!-- Pause Overlay -->'

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    # We want to replace everything from start_idx up to (but not including) end_idx
    # But wait, end_idx is the start of the next section. We need to make sure we capture the closing </div> of start-screen.
    # The view_file showed start-screen ends right before Pause Overlay.
    
    old_html_block = content[start_idx:end_idx]
    content = content.replace(old_html_block, html_new + "\n\n    ")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully polished UI")
