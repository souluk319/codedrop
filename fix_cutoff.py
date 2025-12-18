
import os
import re

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update .card height and padding
# Look for the .card block we added previously
# It has width: 400px; height: 500px; padding: 40px;
# We want width: 400px; height: 550px; padding: 30px;

# Use regex to find the specific properties and replace them
# We need to be careful not to match other .card definitions if any (though we cleaned up)
# The current .card css should look like:
# .card { ... width: 400px; height: 500px; ... padding: 40px; ... }

# Let's just replace the specific lines
content = content.replace('height: 500px;', 'height: 550px;')
content = content.replace('padding: 40px;', 'padding: 30px;')

# Note: This replaces ALL occurrences. 
# .overlay has padding: 40px 0; -> padding: 30px 0; (Acceptable, maybe even better)
# .card has padding: 40px; -> padding: 30px; (Target)
# #leaderboard-preview has height: 500px; -> height: 550px; (Target, keeps symmetry)

# Let's verify if there are other 500px heights we don't want to change.
# Usually fine.

# 2. Also reduce .select-group margin to be safe
content = content.replace('margin: 20px 0;', 'margin: 15px 0;')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully adjusted heights and padding")
