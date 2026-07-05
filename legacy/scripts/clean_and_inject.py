
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Define the README HTML Block (Clean Version)
readme_html = """
    <!-- Readme Widget -->
    <div id="readme-widget" style="position: fixed; bottom: 20px; left: 20px; width: 60px; height: 60px; border-radius: 50%; border: 2px solid var(--primary-neon); background: rgba(0,0,0,0.8); color: var(--primary-neon); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 9999; box-shadow: 0 0 15px var(--primary-neon); transition: all 0.3s;">
        <div class="widget-label" style="font-family: var(--font-display); font-size: 0.8rem; text-align: center; line-height: 1.1;">READ<br>ME</div>
    </div>

    <!-- Readme Overlay -->
    <div id="readme-overlay" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
        <div id="readme-box" style="background: rgba(10, 10, 10, 0.95); border: 1px solid var(--primary-neon); padding: 40px; width: 90%; max-width: 600px; position: relative; box-shadow: 0 0 30px rgba(0, 243, 255, 0.2);">
            <button id="readme-close" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: var(--primary-neon); font-size: 1.5rem; cursor: pointer;">X</button>
            <h2 style="color: var(--primary-neon); font-family: var(--font-display); margin-bottom: 20px; text-align: center; letter-spacing: 2px;">SYSTEM MANUAL</h2>

            <p style="color: #fff; margin-bottom: 15px; line-height: 1.6;">
                <strong style="color: var(--primary-neon);">MISSION:</strong><br>
                Falling code fragments threaten the system integrity.<br>
                Type the commands exactly as they appear to neutralize them.
            </p>

            <p style="color: #fff; margin-bottom: 30px; line-height: 1.6;">
                <strong style="color: var(--primary-neon);">PROTOCOL:</strong><br>
                Prevent fragments from reaching the bottom.<br>
                Maintain high accuracy for combo bonuses.
            </p>

            <div class="contact-info" style="border-top: 1px solid #333; padding-top: 20px;">
                <div style="color: #888; margin-bottom: 15px; font-size: 0.9rem; text-align: center;">SYSTEM ADMINISTRATOR CONTACT</div>
                <div class="contact-links" style="display: flex; justify-content: center; gap: 20px;">
                    <a href="https://github.com/souluk319" target="_blank" class="contact-link" style="color: #fff; text-decoration: none; display: flex; align-items: center; gap: 5px; font-size: 0.9rem; transition: color 0.3s;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                        GITHUB
                    </a>
                    <a href="https://kugnus.tistory.com" target="_blank" class="contact-link" style="color: #fff; text-decoration: none; display: flex; align-items: center; gap: 5px; font-size: 0.9rem; transition: color 0.3s;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M0 0h24v24H0z" fill="none" /><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
                        BLOG
                    </a>
                    <a href="mailto:souluk319@gmail.com" class="contact-link" style="color: #fff; text-decoration: none; display: flex; align-items: center; gap: 5px; font-size: 0.9rem; transition: color 0.3s;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                        EMAIL
                    </a>
                </div>
            </div>
        </div>
    </div>
"""

# 2. Remove Existing README HTML (Regex to catch variations)
# We remove anything that looks like the readme widget or overlay
content = re.sub(r'<!-- Readme Widget -->.*?<!-- Readme Overlay -->.*?</div>\s*</div>', '', content, flags=re.DOTALL)
# Also try to remove if it was split or malformed
content = re.sub(r'<div id="readme-widget">.*?</div>', '', content, flags=re.DOTALL)
content = re.sub(r'<div id="readme-overlay".*?</div>\s*</div>', '', content, flags=re.DOTALL)

# 3. Extract Script
script_pattern = re.compile(r'<script>.*?</script>', re.DOTALL)
script_match = script_pattern.search(content)
script_content = ""

if script_match:
    script_content = script_match.group(0)
    content = content.replace(script_content, '')

# 4. Modify Script to use window.onload
if "init();" in script_content:
    script_content = script_content.replace("init();", "window.addEventListener('load', init);")

# 5. Reassemble: Content + README HTML + Script + End Body
# Remove </body> and </html> to append correctly
content = content.replace('</body>', '').replace('</html>', '')

new_content = content + '\n' + readme_html + '\n' + script_content + '\n</body>\n</html>'

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully cleaned and re-injected README and Script.")
