
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Email
content = content.replace('souluk319@naver.com', 'souluk319@gmail.com')

# 2. Inject Debug Logs in gameLoop
# Find gameLoop function
game_loop_sig = 'function gameLoop(timestamp) {'
if game_loop_sig in content:
    log_code = """
            if (!state.isPlaying) return;
            // Debug Log (Throttle to avoid spam, e.g., every 60 frames)
            if (Math.floor(timestamp) % 60 === 0) {
                console.log("Loop:", Math.floor(timestamp), "Last:", Math.floor(state.lastSpawnTime), "Diff:", Math.floor(timestamp - state.lastSpawnTime));
            }
"""
    # We replace the first line of the function body
    content = content.replace(game_loop_sig + '\n            if (!state.isPlaying) return;', game_loop_sig + log_code)

# 3. Inject Debug Log in spawnWord
spawn_word_sig = 'function spawnWord() {'
if spawn_word_sig in content:
    content = content.replace(spawn_word_sig, spawn_word_sig + '\n            console.log("Spawning Word...");')

# 4. Inject Debug Log in initGameControls for Readme
readme_check = 'if (readmeWidget && readmeOverlay && readmeClose) {'
if readme_check in content:
    content = content.replace(readme_check, readme_check + '\n                console.log("README Elements Found & Listeners Attached");')
else:
    print("Warning: README check block not found.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated email and injected debug logs.")
