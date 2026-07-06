
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# --- 1. CLEANUP: Remove all previously injected style/script blocks ---
# We look for specific signatures of our previous scripts
content = re.sub(r'<style>\s*/\* NUCLEAR MOBILE FIXES \*/.*?</style>', '', content, flags=re.DOTALL)
content = re.sub(r'<style>\s*@media \(max-width: 768px\).*?</style>', '', content, flags=re.DOTALL)
content = re.sub(r'<script>\s*\(function\(\) \{\s*// Aggressive Audio Unlocker.*?</script>', '', content, flags=re.DOTALL)

# --- 2. RESTORE CORE CSS ---
# Ensure .card has fixed width 400px in the main CSS block
content = content.replace('width: 100%; max-width: 400px;', 'width: 400px;')
content = content.replace('width: 90%;', 'width: 400px;') # In case it was left as 90%

# --- 3. INJECT CORRECT MOBILE CSS ---
# This block MUST come after the main CSS to override it.
# We use !important to guarantee override of the fixed 400px.
mobile_css = """
    <style>
        /* MOBILE RESPONSIVE OVERRIDES */
        @media (max-width: 768px) {
            /* Force Stack Layout */
            #game-area {
                flex-direction: column !important;
                justify-content: flex-start !important;
                padding-top: 20px !important;
            }

            /* Responsive Widths */
            .card, #leaderboard-preview {
                width: 90% !important;
                max-width: 400px !important;
                height: auto !important;
                min-height: 400px !important;
                margin: 10px auto !important;
            }

            /* Adjust Inputs & Text */
            #input-field {
                width: 95% !important;
                font-size: 1.2rem !important;
            }
            h1 {
                font-size: 2.5rem !important;
            }
            
            /* HUD Adjustments */
            #hud {
                padding: 0 10px !important;
            }
            .hud-group {
                gap: 10px !important;
            }
        }
    </style>
"""

# Inject before </head>
if "</head>" in content:
    content = content.replace("</head>", mobile_css + "\n</head>")

# --- 4. INJECT AUDIO UNLOCKER ---
# This is the one feature that WAS working well.
audio_unlocker = """
    <script>
        (function() {
            const unlockAudio = () => {
                if (window.sfx && window.sfx.ctx && window.sfx.ctx.state === 'suspended') {
                    window.sfx.ctx.resume();
                }
            };
            window.addEventListener('click', unlockAudio);
            window.addEventListener('touchstart', unlockAudio);
            window.addEventListener('keydown', unlockAudio);
        })();
    </script>
"""

# Inject before </body>
if "</body>" in content:
    content = content.replace("</body>", audio_unlocker + "\n</body>")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully performed Clean Restoration of index.html")
