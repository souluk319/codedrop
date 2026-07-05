
import os

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Animation (Use background-position instead of transform)
# Old Keyframes
old_keyframes = """        @keyframes electric-grid {
            0% { transform: translate(0, 0); opacity: 0.1; }
            50% { opacity: 0.2; }
            100% { transform: translate(50px, 50px); opacity: 0.1; }
        }"""

new_keyframes = """        @keyframes electric-grid {
            0% { background-position: 0 0; opacity: 0.1; }
            50% { opacity: 0.2; }
            100% { background-position: 50px 50px; opacity: 0.1; }
        }"""

if old_keyframes in content:
    content = content.replace(old_keyframes, new_keyframes)
else:
    # Fallback replacement if exact match fails
    content = content.replace('transform: translate(0, 0);', 'background-position: 0 0;')
    content = content.replace('transform: translate(50px, 50px);', 'background-position: 50px 50px;')

# 2. Fix .overlay overflow
# Revert overflow-y: scroll; to overflow-y: auto; but keep scrollbar-gutter if supported, 
# or just rely on the fact that background-position won't trigger scroll changes.
# Let's use overflow-y: auto; and scrollbar-gutter: stable; as a good practice.

# Find the .overlay block
# It currently has overflow-y: scroll;
content = content.replace('overflow-y: scroll;', 'overflow-y: auto; scrollbar-gutter: stable;')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed shaking animation")
