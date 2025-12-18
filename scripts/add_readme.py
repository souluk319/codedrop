
import os

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add CSS
css_to_add = """
        /* --- Readme Widget --- */
        #readme-widget {
            position: fixed;
            bottom: 30px;
            left: 30px;
            z-index: 1000;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(5, 5, 10, 0.9);
            border: 2px solid var(--primary-neon);
            box-shadow: 0 0 20px rgba(0, 243, 255, 0.3);
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        #readme-widget:hover {
            transform: scale(1.1);
            box-shadow: 0 0 30px var(--primary-neon);
        }

        #readme-widget .widget-label {
            font-family: var(--font-display);
            color: var(--primary-neon);
            font-size: 0.8rem;
            letter-spacing: 1px;
            text-align: center;
            line-height: 1.2;
        }

        /* Readme Overlay */
        #readme-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        #readme-box {
            width: 600px;
            max-width: 90%;
            background: rgba(10, 10, 15, 0.95);
            border: 1px solid var(--primary-neon);
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 0 50px rgba(0, 243, 255, 0.2);
            position: relative;
            text-align: center;
        }

        #readme-box h2 {
            font-family: var(--font-display);
            color: #fff;
            font-size: 2.5rem;
            margin-bottom: 30px;
            text-shadow: 0 0 10px var(--primary-neon);
        }

        #readme-box p {
            color: #ccc;
            line-height: 1.6;
            margin-bottom: 20px;
            font-size: 1.1rem;
        }

        #readme-box .contact-info {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #333;
        }

        #readme-box .contact-item {
            color: var(--primary-neon);
            font-family: var(--font-code);
            margin: 10px 0;
            font-size: 1.2rem;
        }

        #readme-close {
            position: absolute;
            top: 20px;
            right: 20px;
            background: transparent;
            border: none;
            color: #666;
            font-size: 1.5rem;
            cursor: pointer;
            transition: 0.3s;
        }

        #readme-close:hover {
            color: #fff;
        }
"""

# Insert CSS before </style>
if '/* --- Readme Widget --- */' not in content:
    content = content.replace('</style>', css_to_add + '\n    </style>')

# 2. Add HTML
html_to_add = """
    <!-- Readme Widget -->
    <div id="readme-widget">
        <div class="widget-label">READ<br>ME</div>
    </div>

    <!-- Readme Overlay -->
    <div id="readme-overlay" class="hidden">
        <div id="readme-box">
            <button id="readme-close">×</button>
            <h2>SYSTEM MANUAL</h2>
            
            <p>
                <strong>MISSION:</strong><br>
                Falling code fragments threaten the system integrity.<br>
                Type the commands exactly as they appear to neutralize them.
            </p>
            
            <p>
                <strong>PROTOCOL:</strong><br>
                Prevent fragments from reaching the bottom.<br>
                Maintain high accuracy for combo bonuses.
            </p>

            <div class="contact-info">
                <div style="color: #888; margin-bottom: 15px; font-size: 0.9rem;">SYSTEM ADMINISTRATOR CONTACT</div>
                <div class="contact-item">souluk319@gmail.com</div>
                <div class="contact-item">+82-50-6933-1153</div>
            </div>
        </div>
    </div>
"""

# Insert HTML before </body>
if '<!-- Readme Widget -->' not in content:
    content = content.replace('</body>', html_to_add + '\n</body>')

# 3. Add JS
js_to_add = """
        // Readme Logic
        const readmeWidget = document.getElementById('readme-widget');
        const readmeOverlay = document.getElementById('readme-overlay');
        const readmeClose = document.getElementById('readme-close');

        readmeWidget.addEventListener('click', () => {
            readmeOverlay.classList.remove('hidden');
            sfx.play('click');
        });

        readmeClose.addEventListener('click', () => {
            readmeOverlay.classList.add('hidden');
            sfx.play('click');
        });

        readmeOverlay.addEventListener('click', (e) => {
            if (e.target === readmeOverlay) {
                readmeOverlay.classList.add('hidden');
            }
        });
"""

# Insert JS before </script>
if '// Readme Logic' not in content:
    content = content.replace('    </script>', js_to_add + '\n    </script>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added Readme widget")
