
import os

file_path = 'f:/kugnus_idea/CodeDrop/index.html'
funcs_path_1 = 'f:/kugnus_idea/CodeDrop/extracted_funcs.js'
funcs_path_2 = 'f:/kugnus_idea/CodeDrop/extracted_funcs_part2.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

with open(funcs_path_1, 'r', encoding='utf-8') as f:
    funcs1 = f.read()

with open(funcs_path_2, 'r', encoding='utf-8') as f:
    funcs2 = f.read()

all_funcs = funcs1 + "\n" + funcs2

# Insert before "function startGame() {"
insert_point = "function startGame() {"

if insert_point in content:
    content = content.replace(insert_point, all_funcs + "\n\n" + insert_point)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully injected all missing functions.")
else:
    print("Error: Could not find insertion point 'function startGame() {'")
