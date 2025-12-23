
import os

file_path = 'f:\\kugnus_idea\\CodeDrop\\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if '<script src="js/game.js"></script>' in line:
        new_lines.append(line)
        skip = True # Start skipping the next line (which is <script>)
        continue
    
    if skip:
        if '</script>' in line:
            # Check if this is the end of the main block
            # The main block ends with </script> followed by empty lines and then another <script> (audio unlock)
            # We need to be careful not to skip the audio unlock script
            # The audio unlock script starts with <script>
            # The main block end is just </script>
            # Let's look at the context.
            # The main block ends at line ~2543.
            # The next script starts at ~2548.
            # So if we find </script>, we stop skipping?
            # But we want to remove the </script> too?
            # Yes, we want to remove the whole block <script>...</script>
            # But I added <script> at the start.
            # So I am skipping from the <script> I added.
            # So I should skip UNTIL I find the matching </script>.
            # But how do I know which </script> is the matching one?
            # The main block is huge.
            # The next </script> is the one.
            skip = False
            continue
        continue
    
    new_lines.append(line)

# Wait, my logic is slightly flawed.
# I added:
# <script src="js/word_packs.js"></script>
# <script src="js/game.js"></script>
# <script>
#
# So I want to keep the first two lines.
# Then I want to remove the <script> line and everything until </script>.

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the marker
marker = '<script src="js/game.js"></script>'
start_idx = content.find(marker)

if start_idx != -1:
    # Find the next <script> after the marker
    script_start = content.find('<script>', start_idx + len(marker))
    
    # Find the closing </script> for this block
    # It should be the first </script> after script_start
    script_end = content.find('</script>', script_start)
    
    if script_start != -1 and script_end != -1:
        # Remove from script_start to script_end + len('</script>')
        new_content = content[:script_start] + content[script_end + 9:]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully cleaned index.html")
    else:
        print("Could not find script block to remove")
else:
    print("Could not find marker")
