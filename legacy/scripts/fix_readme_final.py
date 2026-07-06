
import os
import re

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix CSS Specificity
# We need to make sure .hidden overrides #readme-overlay display
# Current CSS for #readme-overlay:
# #readme-overlay { ... display: flex; ... }
# We will change it to:
# #readme-overlay { ... display: flex; ... }
# #readme-overlay.hidden { display: none !important; }

# Let's find the #readme-overlay CSS block
if '#readme-overlay {' in content:
    # We can just append the specific hidden rule after the block or ensure .hidden has !important
    # The .hidden class already has !important in the file:
    # .hidden { display: none !important; }
    # So if that's defined *after* or has higher specificity, it should work.
    # However, ID selectors (#readme-overlay) have higher specificity than class selectors (.hidden).
    # So #readme-overlay { display: flex } overrides .hidden { display: none !important } ??
    # Actually !important should win, but let's be safe and add #readme-overlay.hidden
    
    css_fix = """
        #readme-overlay.hidden {
            display: none !important;
        }
    """
    if '#readme-overlay.hidden' not in content:
        content = content.replace('</style>', css_fix + '\n    </style>')

# 2. Fix Malformed JS
# The view showed:
# <script>
#     document.addEventListener('DOMContentLoaded', () => {
#         </script>
# 
# </body>

# We need to replace that broken block with the correct one.
broken_script_pattern = r'<script>\s*document\.addEventListener\(\'DOMContentLoaded\', \(\) => \{\s*</script>'
correct_script = """<script>
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
    </script>"""

# Try to find the broken part using regex or string match
# The view output showed:
# 1887:     <script>
# 1888:         document.addEventListener('DOMContentLoaded', () => {
# 1889:             </script>

broken_string = """    <script>
        document.addEventListener('DOMContentLoaded', () => {
            </script>"""

if broken_string.strip() in content:
    content = content.replace(broken_string.strip(), correct_script)
else:
    # Fallback: regex replace
    content = re.sub(r'<script>\s*document\.addEventListener\(\'DOMContentLoaded\', \(\) => \{\s*</script>', correct_script, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed Readme JS and CSS")
