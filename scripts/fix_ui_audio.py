
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. CSS Fix: Make .card responsive
# Find .card definition
# We want to change "width: 400px;" to "width: 100%; max-width: 400px;"
# There are two occurrences: one in main CSS, one in media query.
content = content.replace('width: 400px;', 'width: 100%; max-width: 400px;')

# 2. Audio Fix: Add touchstart
# In initAudio
content = content.replace("document.addEventListener('click', initAudio);", "document.addEventListener('click', initAudio);\n            document.addEventListener('touchstart', initAudio);")
content = content.replace("document.removeEventListener('click', initAudio);", "document.removeEventListener('click', initAudio);\n                document.removeEventListener('touchstart', initAudio);")

# In sfx.playBGM fallback
content = content.replace("document.addEventListener('click', playOnInteraction);", "document.addEventListener('click', playOnInteraction);\n                            document.addEventListener('touchstart', playOnInteraction);")
content = content.replace("document.removeEventListener('click', playOnInteraction);", "document.removeEventListener('click', playOnInteraction);\n                                document.removeEventListener('touchstart', playOnInteraction);")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully applied CSS responsive fixes and Audio touchstart support.")
