
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the Mobile Responsive Block we added
# We look for the specific block with the comment
content = re.sub(r'<style>\s*/\* MOBILE RESPONSIVE OVERRIDES \*/.*?</style>', '', content, flags=re.DOTALL)

# 2. Ensure Desktop Widths are Enforced (Just in case)
# We want .card to be width: 400px
# It should already be 400px from the previous step, but let's double check we didn't leave any 90%
if "width: 90%;" in content and ".card" in content:
    # This is a bit risky if 90% is used elsewhere, but in our context it was for the card.
    # Let's be specific with regex replacement for .card if needed, but 
    # since we removed the media query block, the main CSS should be active.
    # The main CSS has:
    # .card { ... width: 400px; ... }
    # Let's verify that isn't changed.
    pass 

# 3. Remove any other "max-width: 768px" blocks just to be safe
content = re.sub(r'@media\s*\(max-width:\s*768px\)\s*\{.*?\}', '', content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully removed Mobile Responsiveness logic.")
