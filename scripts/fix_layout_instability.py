
import os

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the .overlay CSS to prevent layout shifts
# We will add scrollbar-gutter: stable; to .overlay
# And ensure overflow-y is auto.

# Current .overlay CSS:
# .overlay {
#     ...
#     overflow-y: auto;
#     padding: 40px 0;
# }

# We want to replace "overflow-y: auto;" with "overflow-y: auto; scrollbar-gutter: stable;"
# Or better, just replace the whole block to be safe.

old_overlay_css = """        .overlay {
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
            padding: 40px 0;
        }"""

new_overlay_css = """        .overlay {
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

if old_overlay_css in content:
    content = content.replace(old_overlay_css, new_overlay_css)
else:
    # Fallback: simple string replacement
    content = content.replace('overflow-y: auto;', 'overflow-y: auto; scrollbar-gutter: stable;')

# Also check for the "shaking" caused by the glitch animation on h1
# The user said "screen is shaking", might be the h1 glitch affecting layout flow?
# h1 has "position: relative;" and transform translates.
# If it affects flow, it shouldn't because it's transform.
# But let's reduce the glitch intensity just in case.
# The glitch animation translates by 2px-6px.
# It shouldn't cause scrollbars unless it pushes width.
# But h1 is centered.

# Let's just stick to scrollbar-gutter for now.

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed layout instability")
