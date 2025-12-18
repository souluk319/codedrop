
import os

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The JS block to move
js_block = """
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

# Remove the JS block from the main script
if js_block.strip() in content:
    content = content.replace(js_block, "")
else:
    # Try to find it with loose matching if exact match fails (due to indentation)
    # But looking at the file view, indentation seems consistent.
    # Let's try replacing with empty string if found.
    pass

# We will append the JS in a new script tag at the end
new_script = """
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // Readme Logic
            const readmeWidget = document.getElementById('readme-widget');
            const readmeOverlay = document.getElementById('readme-overlay');
            const readmeClose = document.getElementById('readme-close');

            if (readmeWidget && readmeOverlay && readmeClose) {
                readmeWidget.addEventListener('click', () => {
                    readmeOverlay.classList.remove('hidden');
                    if (window.sfx) sfx.play('click');
                });

                readmeClose.addEventListener('click', () => {
                    readmeOverlay.classList.add('hidden');
                    if (window.sfx) sfx.play('click');
                });

                readmeOverlay.addEventListener('click', (e) => {
                    if (e.target === readmeOverlay) {
                        readmeOverlay.classList.add('hidden');
                    }
                });
            } else {
                console.error("Readme elements not found!");
            }
        });
    </script>
"""

# Insert before </body>
content = content.replace('</body>', new_script + '\n</body>')

# Clean up the old block more aggressively if needed
# We can use regex to remove the specific block we added previously
import re
# Escape special chars for regex
escaped_js = re.escape(js_block.strip())
# Try to remove it
content = re.sub(r'// Readme Logic.*}\);\s*', '', content, flags=re.DOTALL)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully moved Readme JS")
