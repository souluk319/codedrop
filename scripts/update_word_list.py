
import os

file_path = r"f:\kugnus_idea\CodeDrop\index.html"

new_python_list = """            PYTHON: [
                // basics
                "def", "return", "class", "self", "import", "from", "as", "pass",
                "if", "elif", "else", "for", "while", "break", "continue",
                "try", "except", "finally", "raise", "with", "lambda",

                // built-in functions
                "print()", "input()", "len()", "range()", "open()", "type()", "id()",
                "str()", "int()", "float()", "bool()", "list()", "dict()", "set()", "tuple()",
                "enumerate()", "zip()", "map()", "filter()", "sorted()", "sum()", "min()", "max()",
                "any()", "all()", "dir()", "help()", "isinstance()",

                // common methods
                ".append()", ".pop()", ".sort()", ".reverse()", ".index()", ".count()",
                ".get()", ".items()", ".keys()", ".values()", ".update()",
                ".split()", ".join()", ".strip()", ".replace()", ".lower()", ".upper()",
                ".startswith()", ".endswith()", ".find()", ".format()",

                // standard library
                "import os", "import sys", "import time", "import math", "import random",
                "import json", "import re", "import datetime", "import collections",
                "os.path.join()", "os.listdir()", "sys.argv", "time.sleep()",
                "math.pi", "math.sqrt()", "random.randint()", "random.choice()",
                "json.loads()", "json.dumps()", "datetime.now()",

                // dunder methods
                "__init__", "__str__", "__repr__", "__name__", "__main__"
            ],"""

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_index = -1
end_index = -1

for i, line in enumerate(lines):
    if "PYTHON: [" in line:
        start_index = i
    if "]," in line and start_index != -1 and i > start_index:
        # We want the closing bracket of the PYTHON list.
        # The next list is JS, so we can check if JS starts soon after, or just take the first closing bracket after PYTHON start.
        # In the file, the PYTHON list ends with "]," and then JS starts.
        end_index = i
        break

if start_index != -1 and end_index != -1:
    print(f"Found PYTHON list from line {start_index+1} to {end_index+1}")
    
    # Keep lines before start_index
    new_lines = lines[:start_index]
    # Add new list
    new_lines.append(new_python_list + "\n")
    # Keep lines after end_index
    new_lines.extend(lines[end_index+1:])
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully updated index.html")
else:
    print("Could not find PYTHON list block")
