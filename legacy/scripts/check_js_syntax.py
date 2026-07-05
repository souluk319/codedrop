
import re
import subprocess

file_path = 'f:/kugnus_idea/CodeDrop/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract content between <script> and </script>
# There might be multiple script tags, we want the main one (the last one or the largest one)
matches = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)

if not matches:
    print("No script tags found.")
    exit(1)

# The main script is likely the second one (first one is for readme logic, or vice versa)
# Let's check the length
main_script = max(matches, key=len)

with open('temp_check.js', 'w', encoding='utf-8') as f:
    f.write(main_script)

print("Extracted JS to temp_check.js")

# Run node check
try:
    result = subprocess.run(['node', '--check', 'temp_check.js'], capture_output=True, text=True)
    if result.returncode == 0:
        print("Syntax OK")
    else:
        print("Syntax Error:")
        print(result.stderr)
except Exception as e:
    print(f"Error running node: {e}")
