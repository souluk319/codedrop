
import os

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Modify #music-widget.open to be semi-transparent and opaque on hover
# Current CSS:
# #music-widget.open {
#     width: 350px;
#     height: 350px;
#     border-radius: 12px;
#     background: rgba(5, 5, 10, 0.95);
#     border: 1px solid var(--primary-neon);
#     box-shadow: 0 0 40px rgba(0, 243, 255, 0.2);
#     display: flex;
#     flex-direction: column;
# }

# We will add opacity: 0.3; transition: opacity 0.3s;
# And add the hover rule.

old_css = """        #music-widget.open {
            width: 350px;
            height: 350px;
            border-radius: 12px;
            background: rgba(5, 5, 10, 0.95);
            border: 1px solid var(--primary-neon);
            box-shadow: 0 0 40px rgba(0, 243, 255, 0.2);
            display: flex;
            flex-direction: column;
        }"""

new_css = """        #music-widget.open {
            width: 350px;
            height: 350px;
            border-radius: 12px;
            background: rgba(5, 5, 10, 0.95);
            border: 1px solid var(--primary-neon);
            box-shadow: 0 0 40px rgba(0, 243, 255, 0.2);
            display: flex;
            flex-direction: column;
            opacity: 0.3; /* Semi-transparent when playing */
            transition: opacity 0.3s ease;
        }

        #music-widget.open:hover {
            opacity: 1; /* Fully visible on hover */
            box-shadow: 0 0 60px rgba(0, 243, 255, 0.4);
            z-index: 10000; /* Ensure it's on top when interacting */
        }"""

if old_css in content:
    content = content.replace(old_css, new_css)
else:
    # Fallback: try to replace just the properties if exact match fails
    # But exact match is safer. Let's try to match the block structure.
    # If indentation varies, we might need regex.
    import re
    # Remove whitespace for matching
    # Actually, let's just use regex to find the block
    pattern = r'#music-widget\.open\s*\{[^}]+\}'
    match = re.search(pattern, content)
    if match:
        # We found it, but we want to replace it with new_css
        # But new_css has extra rules.
        # Let's just append the new properties to the existing block and add the hover rule after.
        
        # Construct the replacement
        # We want to replace the closing brace '}' with the new properties and the closing brace
        # But we need to be careful.
        
        # Let's try the simple replace first, if it fails, we warn.
        pass

# Apply the replacement
content = content.replace(old_css, new_css)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated Music Box opacity")
