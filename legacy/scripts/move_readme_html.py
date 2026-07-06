
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract README HTML
readme_pattern = re.compile(r'<!-- Readme Widget -->.*?<!-- Readme Overlay -->.*?</div>\s*</div>', re.DOTALL)
readme_match = readme_pattern.search(content)

if readme_match:
    readme_html = readme_match.group(0)
    
    # Remove it from current location
    content = content.replace(readme_html, '')
    
    # 2. Insert it before <script>
    # Find the last <script> tag (assuming it's the main game logic)
    # Actually, let's look for the specific script tag that starts with /**
    # But simpler: just find <script>
    
    script_start = content.find('<script>')
    if script_start != -1:
        new_content = content[:script_start] + readme_html + '\n\n    ' + content[script_start:]
        
        # 3. Clean up any stray </script> at the very end if it exists (from previous error)
        # Check the last few lines
        if new_content.strip().endswith('</script></body></html>'):
             # This might be tricky. Let's just replace '  </script>\n</body>' with '</body>' if it's redundant.
             # But better to just trust the move.
             pass
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully moved README HTML before script tag.")
    else:
        print("Script tag not found.")
else:
    print("README HTML not found.")
