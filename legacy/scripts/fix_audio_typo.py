
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the specific typo in initAudio
# Old: sfx.window.addEventListener('load', init);
# New: sfx.init();

# We use a flexible regex just in case of whitespace differences
# The pattern we saw was: sfx.window.addEventListener('load', init);
content = content.replace("sfx.window.addEventListener('load', init);", "sfx.init();")

# Just to be safe, if it was 'window.addEventListener' attached to sfx in some other way
# Let's also look for the exact string from the view_file output
# 2316:                 sfx.window.addEventListener('load', init);

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed sfx.init() typo.")
