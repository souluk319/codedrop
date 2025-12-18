
import os

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_card = False
in_leaderboard = False

for line in lines:
    # Fix .card width
    if '.card {' in line:
        in_card = True
    if in_card and '}' in line:
        in_card = False
    
    if in_card:
        if 'width: 90%;' in line:
            line = line.replace('width: 90%;', 'width: 450px;')
        elif 'max-width: 450px;' in line:
            line = line.replace('max-width: 450px;', 'max-width: 90%;')
            
    # Fix #leaderboard-preview
    if '#leaderboard-preview {' in line:
        in_leaderboard = True
    if in_leaderboard and '}' in line:
        in_leaderboard = False
        
    if in_leaderboard:
        if 'max-width: 500px;' in line:
            line = line.replace('max-width: 500px;', 'width: 400px;')
        elif 'width: 90%;' in line:
            line = '            max-width: 90%;\n            height: 500px;\n            overflow-y: auto;\n            display: flex;\n            flex-direction: column;\n            margin: 0;\n'

    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully updated index.html")
