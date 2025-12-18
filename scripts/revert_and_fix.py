
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. REMOVE NUCLEAR CSS
# We look for the specific block we added
nuclear_pattern = re.compile(r'<style>\s*/\* NUCLEAR MOBILE FIXES \*/.*?</style>', re.DOTALL)
content = re.sub(nuclear_pattern, '', content)

# 2. APPLY GENTLE FIX
# We want to ensure .card has max-width instead of just width, but WITHOUT !important if possible, 
# or just in the main CSS.
# The previous fix_ui_audio.py already did: content.replace('width: 400px;', 'width: 100%; max-width: 400px;')
# Let's verify and ensure it's correct.
# We will also add a gentle media query for mobile layout adjustments if not present.

gentle_css = """
    <style>
        @media (max-width: 768px) {
            #hud {
                padding: 0 15px;
                height: 60px;
            }
            .hud-group {
                gap: 15px;
            }
            .hud-value {
                font-size: 1.2rem;
            }
            #input-field {
                font-size: 1.5rem;
                height: 50px;
            }
            .card {
                width: 90%;
                max-width: 400px;
                margin: 0 auto;
            }
            #leaderboard-preview {
                width: 90%;
                max-width: 400px;
                margin: 20px auto 0;
            }
            /* Ensure container wraps */
            #game-area {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            /* Adjust widgets */
            #music-widget, #readme-widget {
                transform: scale(0.8);
            }
            #music-widget { right: 10px; bottom: 10px; transform-origin: bottom right; }
            #readme-widget { left: 10px; bottom: 10px; transform-origin: bottom left; }
        }
    </style>
"""

# Inject gentle CSS before </head>
if "</head>" in content:
    content = content.replace("</head>", gentle_css + "\n</head>")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully reverted Nuclear CSS and applied Gentle Responsive Fix.")
