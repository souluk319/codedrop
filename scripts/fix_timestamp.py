
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix startGame
content = content.replace('state.lastSpawnTime = Date.now();', 'state.lastSpawnTime = performance.now();')

# Fix togglePause
# Note: togglePause might have the same line, so the above replace works for both if they are identical.
# Let's check if there are any other Date.now() usages that should remain.
# state.startTime = Date.now(); -> Should remain Date.now() for WPM calc.

# Verify if togglePause uses exactly "state.lastSpawnTime = Date.now();"
# If it has different whitespace, regex is safer.

content = re.sub(r'state\.lastSpawnTime\s*=\s*Date\.now\(\);', 'state.lastSpawnTime = performance.now();', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated timestamp logic.")
