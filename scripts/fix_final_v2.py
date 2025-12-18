
import os

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. CSS Fixes for Alignment
# We'll inject a global box-sizing rule and specific width rules
css_patch = """
        /* GLOBAL RESET */
        * {
            box-sizing: border-box;
        }

        /* Alignment Fixes V2 */
        .select-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 20px;
            width: 100% !important; /* Force full width */
        }
        
        .select-group label {
            color: var(--primary-neon);
            font-size: 0.8rem;
            letter-spacing: 1px;
            margin-left: 5px;
        }

        .select-group select {
            width: 100% !important; /* Force full width */
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
            width: 100% !important; /* Force full width */
            padding: 15px;
            font-size: 1.2rem;
            letter-spacing: 3px;
            margin-top: 10px;
            margin-bottom: 20px;
        }

        .logged-in-view {
            gap: 10px;
            width: 100%; /* Ensure container is full width */
            padding: 0 20px; /* Add padding to match card */
        }
        
        /* Ensure card has no padding that interferes */
        #start-screen .card {
            padding: 40px;
            width: 450px; /* Fixed width for consistency */
        }
"""

# Replace the previous CSS fix block or append to it
if "/* Alignment Fixes */" in content:
    # Replace the old block
    start_marker = "/* Alignment Fixes */"
    end_marker = "</style>"
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker, start_idx)
    content = content[:start_idx] + css_patch + content[end_idx:]
else:
    # Append
    content = content.replace('</style>', css_patch + '\n    </style>')


# 2. Refactor Event Listeners
# We need to replace initGameControls and related logic to avoid duplicates

new_js_logic = """
        // Named handlers to prevent duplicates
        function handleRestart() {
            els.screens.result.classList.add('hidden');
            els.screens.start.classList.remove('hidden');
            fetchLeaderboard(); 
            sfx.playBGM();
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
            
            console.log("Game Controls Initialized");
        }
"""

# Replace the old initGameControls function
# We'll search for "function initGameControls() {" and replace the block
start_marker = "function initGameControls() {"
end_marker = "function init() {" # The next function

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_js_logic + "\n        " + content[end_idx:]
else:
    print("Warning: Could not find initGameControls to replace.")

# 3. Add console logs to startGame
if "function startGame() {" in content:
    content = content.replace("function startGame() {", "function startGame() {\n            console.log('Starting Game...');")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully applied V2 fixes.")
