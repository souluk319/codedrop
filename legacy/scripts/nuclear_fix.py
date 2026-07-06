
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# --- 1. NUCLEAR CSS FIX ---
# We will inject a very strong style block at the end of <head> to override everything for mobile.
mobile_css = """
    <style>
        /* NUCLEAR MOBILE FIXES */
        @media (max-width: 768px) {
            /* General Sizing */
            body, html {
                width: 100%;
                height: 100%;
                overflow: hidden;
                position: fixed; /* Prevent bouncy scroll */
            }

            /* HUD */
            #hud {
                padding: 0 10px !important;
                height: 60px !important;
            }
            .hud-group {
                gap: 15px !important;
            }
            .hud-value {
                font-size: 1rem !important;
            }
            #lives-display {
                font-size: 1.2rem !important;
            }

            /* Game Area */
            #game-area {
                width: 100% !important;
            }
            .word-item {
                font-size: 0.9rem !important;
                padding: 4px 8px !important;
            }

            /* Input Area */
            #input-area {
                height: 100px !important;
                padding: 10px !important;
            }
            #input-field {
                width: 100% !important;
                max-width: 100% !important;
                font-size: 1.2rem !important;
                height: 50px !important;
            }
            #target-display {
                font-size: 0.8rem !important;
            }

            /* Cards (Login, etc) */
            .card {
                width: 95% !important;
                max-width: 95% !important;
                height: auto !important;
                min-height: 400px !important;
                padding: 15px !important;
                margin: 0 auto !important;
            }
            h1 {
                font-size: 2rem !important;
            }
            .btn {
                padding: 10px 20px !important;
                font-size: 1rem !important;
            }

            /* Leaderboard */
            #leaderboard-preview {
                width: 95% !important;
                max-width: 95% !important;
                height: 300px !important;
            }

            /* Music Widget */
            #music-widget {
                bottom: 10px !important;
                right: 10px !important;
                transform: scale(0.8) !important;
                transform-origin: bottom right !important;
            }
            
            /* README Widget */
            #readme-widget {
                bottom: 10px !important;
                left: 10px !important;
                transform: scale(0.8) !important;
                transform-origin: bottom left !important;
            }
        }
    </style>
"""

# Inject CSS before </head>
if "</head>" in content:
    content = content.replace("</head>", mobile_css + "\n</head>")

# --- 2. AGGRESSIVE AUDIO UNLOCKER ---
# We will inject a script that runs immediately and attaches to window events
audio_unlock_script = """
    <script>
        (function() {
            // Aggressive Audio Unlocker
            const unlockAudio = () => {
                if (window.sfx && window.sfx.ctx) {
                    if (window.sfx.ctx.state === 'suspended') {
                        window.sfx.ctx.resume().then(() => {
                            console.log("AudioContext Resumed by User Interaction");
                            // Try to play a silent sound to verify
                            window.sfx.playTone(0, 'sine', 0.01, 0);
                        });
                    }
                } else if (window.sfx && !window.sfx.ctx) {
                     // Force init if not ready
                     window.sfx.init();
                }
            };

            // Attach to everything
            window.addEventListener('click', unlockAudio);
            window.addEventListener('touchstart', unlockAudio);
            window.addEventListener('keydown', unlockAudio);
            window.addEventListener('mousedown', unlockAudio);
            window.addEventListener('touchend', unlockAudio);
        })();
    </script>
"""

# Inject Unlocker Script before </body>
if "</body>" in content:
    content = content.replace("</body>", audio_unlock_script + "\n</body>")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully injected Nuclear CSS and Aggressive Audio Unlocker.")
