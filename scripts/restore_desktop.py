
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Revert Global Width Change
# We previously changed "width: 400px;" to "width: 100%; max-width: 400px;"
# We want to change it back to "width: 400px;" to prevent Flexbox wrapping on desktop.
content = content.replace('width: 100%; max-width: 400px;', 'width: 400px;')

# 2. Strengthen Mobile Media Query
# We need to ensure that on mobile, it DOES switch to responsive width.
# We'll look for the media query block we added and add !important to the width.

# Find the gentle css block
gentle_pattern = re.compile(r'\.card\s*\{\s*width: 90%;', re.DOTALL)
if gentle_pattern.search(content):
    content = re.sub(r'\.card\s*\{\s*width: 90%;', '.card { width: 90% !important;', content)
    content = re.sub(r'#leaderboard-preview\s*\{\s*width: 90%;', '#leaderboard-preview { width: 90% !important;', content)
else:
    # If regex fails (maybe whitespace diff), let's just inject a fresh strong media query at the end of head
    # to be absolutely sure.
    strong_mobile_css = """
    <style>
        @media (max-width: 768px) {
            .card, #leaderboard-preview {
                width: 90% !important;
                max-width: 400px !important;
                margin: 10px auto !important;
            }
            #game-area {
                flex-direction: column !important;
            }
        }
    </style>
    """
    if "</head>" in content:
        content = content.replace("</head>", strong_mobile_css + "\n</head>")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully restored Desktop fixed widths and enforced Mobile responsiveness.")
