
import os

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add specific CSS for the result screen card to prevent button cutoff
# We will target #result-screen .card
# The general .card has height: 550px;
# We want the result card to fit its content.

css_fix = """
        #result-screen .card {
            height: auto;
            min-height: 550px;
            padding-bottom: 50px; /* Ensure space for button */
        }
"""

# Insert this CSS before the closing style tag
if '#result-screen .card' not in content:
    content = content.replace('</style>', css_fix + '\n    </style>')

# Also, let's update the "SESSION ENDED" text to "SYSTEM FAILURE" to match the user's screenshot/request if it's static.
# The user's screenshot shows "SYSTEM FAILURE" in a glitch font.
# The HTML has <h1 id="result-title">SESSION ENDED</h1>
# The JS might be updating it, or the user's screenshot is from a state where it says SYSTEM FAILURE.
# Let's check if there's JS that sets it.
# But the main request is "fix button cutoff".

# Let's also make sure the button has some margin at the bottom.
# The button is the last element in .card.
# .card has padding: 30px; (from previous fix).

# If we set height: auto, it should expand to fit.
# But let's add the CSS fix.

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed Game Over screen layout")
