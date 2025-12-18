
import os

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace overflow-y: auto; scrollbar-gutter: stable; with overflow-y: scroll;
# This forces the scrollbar to always be visible, preventing layout shifts.

old_css = """        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(5px);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 100;
            overflow-y: auto;
            scrollbar-gutter: stable;
            padding: 40px 0;
        }"""

new_css = """        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(5px);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 100;
            overflow-y: scroll; /* Force scrollbar to prevent layout shift */
            padding: 40px 0;
        }"""

if old_css in content:
    content = content.replace(old_css, new_css)
else:
    # Fallback: try to replace just the properties
    content = content.replace('overflow-y: auto;', 'overflow-y: scroll;')
    content = content.replace('scrollbar-gutter: stable;', '')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully applied final layout fix")
