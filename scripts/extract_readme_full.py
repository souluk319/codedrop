
import re

try:
    with open('old_index.html', 'r', encoding='utf-16le') as f:
        content = f.read()
except:
    with open('old_index.html', 'r', encoding='utf-8') as f:
        content = f.read()

# 1. Extract HTML
# Look for the widget div. It likely has an id like "readme-widget" or class "readme-widget"
html_match = re.search(r'(<div[^>]*id="readme-widget"[^>]*>.*?</div>)', content, re.DOTALL)
overlay_match = re.search(r'(<div[^>]*id="readme-overlay"[^>]*>.*?</div>)', content, re.DOTALL)

readme_html = ""
if html_match:
    readme_html += html_match.group(1) + "\n"
if overlay_match:
    readme_html += overlay_match.group(1) + "\n"

# If regex failed, try a broader search for the button
if not readme_html:
    print("Regex failed, trying heuristic search for HTML...")
    start = content.find('<div id="readme-widget"')
    if start != -1:
        end = content.find('<!--', start) # Assuming it ends before next comment
        readme_html = content[start:end]

# 2. Extract JS
# Look for event listeners related to readme
js_match = re.search(r'(const readmeWidget = document.getElementById\(\'readme-widget\'\);.*?)\n\s*(\}\);)', content, re.DOTALL)

readme_js = ""
if js_match:
    readme_js = js_match.group(1) + js_match.group(2)
else:
    # Try finding the logic block
    start = content.find("const readmeWidget = document.getElementById('readme-widget');")
    if start != -1:
        end = content.find("});", start) + 3
        readme_js = content[start:end]

with open('readme_restore.txt', 'w', encoding='utf-8') as f:
    f.write("<!-- HTML -->\n" + readme_html + "\n\n<!-- JS -->\n" + readme_js)

print("Extracted README components.")
