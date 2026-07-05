
import os

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to modify the renderLeaderboard function loop.
# Current code snippet:
# list.forEach((item, index) => {
#     const rank = index + 1;
#     const rankClass = rank <= 3 ? `rank-${rank}` : '';
#     html += `<tr>
# <td class="${rankClass}" style="font-weight:bold;">#${rank}</td>
# <td style="color:var(--primary-neon);">${item.nickname}</td>
# <td style="text-align:right; font-family:var(--font-code); color:#fff;">${item.score}</td>
# <td style="text-align:right; font-family:var(--font-code); color:#888;">${item.wpm}</td>
# </tr>`;
# });

# New code snippet:
# We will add font-weight: bold to the nickname td if rank <= 3.

old_loop = """            list.forEach((item, index) => {
                const rank = index + 1;
                const rankClass = rank <= 3 ? `rank-${rank}` : '';
                html += `<tr>
            <td class="${rankClass}" style="font-weight:bold;">#${rank}</td>
            <td style="color:var(--primary-neon);">${item.nickname}</td>
            <td style="text-align:right; font-family:var(--font-code); color:#fff;">${item.score}</td>
            <td style="text-align:right; font-family:var(--font-code); color:#888;">${item.wpm}</td>
        </tr>`;
            });"""

new_loop = """            list.forEach((item, index) => {
                const rank = index + 1;
                const rankClass = rank <= 3 ? `rank-${rank}` : '';
                const nameStyle = rank <= 3 ? 'color:var(--primary-neon); font-weight:bold; font-size: 1.1em;' : 'color:var(--primary-neon);';
                
                html += `<tr>
            <td class="${rankClass}" style="font-weight:bold;">#${rank}</td>
            <td style="${nameStyle}">${item.nickname}</td>
            <td style="text-align:right; font-family:var(--font-code); color:#fff;">${item.score}</td>
            <td style="text-align:right; font-family:var(--font-code); color:#888;">${item.wpm}</td>
        </tr>`;
            });"""

if old_loop in content:
    content = content.replace(old_loop, new_loop)
else:
    # Fallback: try to match with less whitespace strictness if needed, but exact match is preferred.
    # The indentation in the file view seemed to match standard 4 spaces or tabs.
    # Let's try to be flexible if it fails.
    print("Exact match failed. Checking for variations...")
    # Try to find the block by parts
    pass

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated leaderboard rendering")
