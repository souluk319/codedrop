
import re

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the script block
script_pattern = re.compile(r'<script>.*?</script>', re.DOTALL)
script_match = script_pattern.search(content)

if script_match:
    script_content = script_match.group(0)
    
    # Remove the script from its current location
    content_without_script = content.replace(script_content, '')
    
    # Inject the script before the closing body tag
    new_content = content_without_script.replace('</body>', script_content + '\n</body>')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Successfully moved script tag to the end of body.")
else:
    print("Script tag not found.")
