
import os

file_path = 'index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add specific CSS for the result screen title to prevent cutoff
# We will target #result-screen h1
# The general h1 has font-size: 4rem;
# We want to reduce it for the result screen to fit in 400px card.

css_fix = """
        #result-screen h1 {
            font-size: 3rem; /* Reduced from 4rem */
            line-height: 1.1;
            word-wrap: break-word;
            max-width: 100%;
            margin-bottom: 20px;
        }
        
        /* Ensure the card itself handles overflow gracefully if needed, though we want to avoid scrollbars inside the card */
        #result-screen .card {
            overflow: visible; /* Allow text shadow/glow to bleed if needed, but text should fit */
        }
"""

# Insert this CSS before the closing style tag
# We can append it to the previous fix or just before </style>
if '#result-screen h1' not in content:
    content = content.replace('</style>', css_fix + '\n    </style>')

# Also, let's check if we can find the "SYSTEM FAILURE" text to ensure it's wrapped in a way that allows breaking.
# If it's "SYSTEM FAILURE", a space should allow breaking.
# The screenshot showed it broken into two lines, but still clipped.
# Reducing font size should fix the clipping.

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed Game Over text size")
