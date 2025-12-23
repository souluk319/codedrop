const WORD_PACKS = {
    PYTHON: [
        // Essential Methods (Must Know)
        ".get()", ".items()", ".append()", ".extend()", ".pop()",
        ".split()", ".join()", ".strip()", ".replace()", ".format()",
        ".startswith()", ".endswith()", ".find()", ".count()",

        // Control Flow & Context
        "with open()", "try:", "except:", "finally:", "raise",
        "if __name__ == \"__main__\":", "yield", "lambda x:",
        "break", "continue", "pass",

        // Built-in Power Tools
        "enumerate()", "zip()", "isinstance()", "getattr()", "hasattr()",
        "map()", "filter()", "any()", "all()", "sorted()",
        "len()", "range()", "type()", "id()", "super()",

        // Standard Library (Daily Use)
        "datetime.now()", "json.loads()", "json.dumps()",
        "re.search()", "re.match()", "re.sub()",
        "os.path.join()", "os.listdir()", "sys.argv",
        "collections.Counter", "collections.defaultdict",
        "math.ceil()", "math.floor()", "random.choice()",

        // Modern Typing (3.10+)
        "list[str]", "dict[str, int]", "Optional[]", "Union[]",
        "Callable", "Any", "TypeVar", "Generic",

        // Pythonic Idioms
        "[x for x in list]", "{k:v for k,v in d}",
        "f\"{value}\"", "*args", "**kwargs",
        "__init__", "__str__", "__repr__",

        // Safe Keywords & Types (Pinky Friendly)
        "async", "await", "global", "nonlocal", "assert", "del", "yield", "lambda", "pass", "break", "continue",
        "True", "False", "None", "and", "or", "not", "is", "in", "Ellipsis",
        "Exception", "ValueError", "TypeError", "IndexError", "KeyError", "AttributeError", "NameError", "ImportError", "StopIteration", "KeyboardInterrupt",
        "object", "int", "str", "float", "bool", "list", "dict", "set", "tuple", "bytes", "complex",
        "self", "cls", "args", "kwargs", "module", "package", "wrapper", "decorator",
        "os", "sys", "math", "random", "json", "re", "datetime", "time", "collections", "itertools", "functools", "pathlib",
        "pip", "venv", "poetry", "pytest", "black", "mypy", "pylint", "flake8"
    ],

    JS: [
        // Modern DOM & Async
        "document.querySelector()", "document.getElementById()", "addEventListener()",
        "JSON.parse()", "JSON.stringify()", "localStorage.getItem()",
        "fetch()", ".then()", ".catch()", ".finally()",
        "Promise.all()", "Promise.resolve()", "Promise.reject()",
        "setTimeout()", "setInterval()", "clearTimeout()",

        // Array Methods (Functional)
        ".map()", ".filter()", ".reduce()", ".forEach()",
        ".find()", ".some()", ".every()", ".includes()",
        ".push()", ".pop()", ".shift()", ".unshift()",
        ".splice()", ".slice()", ".join()", ".split()",

        // Object & Class
        "Object.keys()", "Object.values()", "Object.entries()",
        "Object.assign()", "Object.freeze()",
        "constructor()", "super()", "this", "new",

        // Safe Keywords (Pinky Friendly - Expanded)
        "const", "let", "var", "if", "else", "for", "while", "return",
        "null", "undefined", "true", "false", "NaN", "Infinity",
        "class", "extends", "static", "import", "export", "from", "default",
        "switch", "case", "break", "continue", "try", "catch", "finally", "throw",
        "void", "typeof", "instanceof", "delete", "in", "of", "async", "await",
        "window", "document", "console", "Math", "Date", "String", "Number", "Boolean", "Array", "Object", "Promise", "Error",
        "Map", "Set", "WeakMap", "WeakSet", "Symbol", "BigInt"
    ],

    HTTP: [
        // Methods & Status
        "GET /api", "POST /login", "PUT /update", "DELETE /user",
        "200 OK", "201 Created", "204 No Content",
        "301 Moved", "302 Found", "304 Not Modified",
        "400 Bad Request", "401 Unauthorized", "403 Forbidden", "404 Not Found",
        "500 Internal Error", "502 Bad Gateway", "503 Unavailable",

        // Headers & Concepts
        "Content-Type", "Authorization", "Bearer Token", "Cache-Control",
        "User-Agent", "Set-Cookie", "Access-Control-Allow-Origin",
        "application/json", "multipart/form-data", "x-www-form-urlencoded",

        // Safe Terms (Pinky Friendly - Expanded)
        "Header", "Body", "Status", "Method", "Cookie", "Session", "Token",
        "Cache", "Proxy", "Client", "Server", "Host", "Origin", "Accept", "Allow",
        "Age", "Date", "Link", "Vary", "Via", "Secure", "Public", "Private",
        "Max", "Min", "Gzip", "Chunk", "Stream", "Socket", "Port", "Path",
        "Query", "Param", "Fragment", "Scheme", "User", "Pass", "Realm", "Nonce",
        "Cors", "Https", "Ssl", "Tls", "Dns", "Ip", "Tcp", "Udp"
    ],

    CLI: [
        // Git
        "git init", "git clone", "git status", "git add .", "git commit",
        "git push", "git pull", "git fetch", "git merge", "git checkout",
        "git branch", "git log", "git diff", "git stash", "git reset",

        // Docker & NPM
        "docker build", "docker run", "docker ps", "docker stop",
        "docker-compose up", "npm install", "npm run dev", "npm start",
        "npx create-react-app", "yarn add", "pnpm install",

        // Shell Commands
        "ls -la", "cd ..", "mkdir", "rm -rf", "touch", "cat",
        "grep", "awk", "sed", "curl", "wget", "ssh", "scp",
        "chmod +x", "chown", "ps aux", "kill -9", "tail -f",

        // Safe Commands (Pinky Friendly - Expanded)
        "git", "docker", "npm", "node", "yarn", "pnpm", "bun",
        "bash", "zsh", "sh", "sudo", "echo", "cd", "pwd", "ls", "cp", "mv", "rm",
        "mkdir", "touch", "cat", "less", "head", "tail", "grep", "awk", "sed",
        "curl", "wget", "ssh", "scp", "top", "ps", "kill", "man", "help", "exit",
        "clear", "history", "whoami", "ping", "dig", "tar", "zip", "unzip",
        "nano", "vim", "code", "env", "alias", "export", "source"
    ],

    VOCAB: [
        // Concepts
        "Big O Notation", "Time Complexity", "Space Complexity",
        "REST API", "GraphQL", "Microservices", "Monolith",
        "CI/CD Pipeline", "Docker Container", "Kubernetes Pod",
        "SQL Injection", "XSS Attack", "CSRF Token",
        "Unit Test", "Integration Test", "E2E Test", "TDD",
        "Design Pattern", "Singleton", "Factory", "Observer",

        // Safe Terms (Pinky Friendly - Expanded)
        "Bug", "Code", "Data", "Test", "View", "Model", "Class", "Object",
        "Stack", "Queue", "Heap", "Tree", "Graph", "Hash", "Node", "Loop",
        "Logic", "Error", "Event", "State", "Prop", "Comp", "Hook", "Ref", "Memo",
        "Type", "Interface", "Enum", "Generic", "Mixin", "Trait", "Scope", "Closure",
        "Context", "Thread", "Process", "Lock", "Mutex", "Atom", "Bit", "Byte",
        "Agile", "Scrum", "Sprint", "Kanban", "Epic", "User", "Story", "Task"
    ],

    MIX: [] // Populated automatically
};

// Populate MIX
WORD_PACKS.MIX = Object.values(WORD_PACKS)
    .filter(pack => Array.isArray(pack))
    .flat();
