
import re

try:
    with open('old_index.html', 'r', encoding='utf-16le') as f:
        content = f.read()
except:
    with open('old_index.html', 'r', encoding='utf-8') as f:
        content = f.read()

# Functions to extract
funcs = [
    "function fetchLeaderboard",
    "function updateHUD",
    "function gameLoop",
    "function spawnWord",
    "function updateGame",
    "function draw",
    "function handleInput",
    "function handleKeydown",
    "function successWord",
    "function failTypo",
    "function updateTargetDisplay"
]

extracted_code = ""

for func in funcs:
    start_idx = content.find(func)
    if start_idx != -1:
        # Simple brace counting to find end of function
        brace_count = 0
        end_idx = start_idx
        found_brace = False
        
        while end_idx < len(content):
            char = content[end_idx]
            if char == '{':
                brace_count += 1
                found_brace = True
            elif char == '}':
                brace_count -= 1
            
            end_idx += 1
            
            if found_brace and brace_count == 0:
                break
        
        extracted_code += content[start_idx:end_idx] + "\n\n"

with open('extracted_funcs.js', 'w', encoding='utf-8') as f:
    f.write(extracted_code)

print("Extracted functions to extracted_funcs.js")
