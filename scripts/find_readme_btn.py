
import re

try:
    with open('old_index.html', 'r', encoding='utf-16le') as f:
        content = f.read()
except:
    with open('old_index.html', 'r', encoding='utf-8') as f:
        content = f.read()

# Search for button-like elements or links that might be the README button
matches = re.findall(r'<a[^>]*>.*?</a>|<button[^>]*>.*?</button>', content, re.DOTALL)

print("Found elements:")
for m in matches:
    if "README" in m or "readme" in m or "docs" in m or "round" in m:
        print(m)
