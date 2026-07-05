
import os

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# HTML to inject
readme_html = """
    <!-- Readme Widget -->
    <div id="readme-widget">
        <div class="widget-label">READ<br>ME</div>
    </div>

    <!-- Readme Overlay -->
    <div id="readme-overlay" class="hidden">
        <div id="readme-box">
            <button id="readme-close">X</button>
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
                <div class="contact-links">
                    <a href="https://github.com/souluk319" target="_blank" class="contact-link">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                        GITHUB
                    </a>
                    <a href="https://kugnus.tistory.com" target="_blank" class="contact-link">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                        BLOG
                    </a>
                    <a href="mailto:souluk319@naver.com" class="contact-link">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                        EMAIL
                    </a>
                </div>
            </div>
        </div>
    </div>
"""

# JS to inject
readme_js = """
            // Readme Logic
            const readmeWidget = document.getElementById('readme-widget');
            const readmeOverlay = document.getElementById('readme-overlay');
            const readmeClose = document.getElementById('readme-close');

            if (readmeWidget && readmeOverlay && readmeClose) {
                readmeWidget.addEventListener('click', () => {
                    readmeOverlay.classList.remove('hidden');
                    sfx.playKey('Enter'); // Sound feedback
                });
                
                readmeClose.addEventListener('click', () => {
                    readmeOverlay.classList.add('hidden');
                });
                
                readmeOverlay.addEventListener('click', (e) => {
                    if (e.target === readmeOverlay) {
                        readmeOverlay.classList.add('hidden');
                    }
                });
            }
"""

# Inject HTML before Music Widget
if '<div id="music-widget"' in content:
    content = content.replace('<div id="music-widget"', readme_html + '\n    <div id="music-widget"')
else:
    content = content.replace('</body>', readme_html + '\n</body>')

# Inject JS into initGameControls
if 'console.log("Game Controls Initialized");' in content:
    content = content.replace('console.log("Game Controls Initialized");', readme_js + '\n            console.log("Game Controls Initialized");')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully injected README widget.")
