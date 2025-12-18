
import re

try:
    with open('old_index.html', 'r', encoding='utf-16le') as f:
        content = f.read()
except:
    with open('old_index.html', 'r', encoding='utf-8') as f:
        content = f.read()

# Extract the block containing "readme-close" and surrounding divs
start_idx = content.find('id="readme-close"')
if start_idx != -1:
    # Look backwards for the start of the container (likely a div with class overlay)
    # This is a bit heuristic
    context = content[max(0, start_idx - 1000):min(len(content), start_idx + 2000)]
    print("Context around readme-close:")
    print(context)

# Also look for the button that opens it
matches = re.findall(r'<div[^>]*class="[^"]*readme[^"]*"[^>]*>.*?</div>', content, re.DOTALL)
for m in matches:
    print("Found readme div match:", m)
