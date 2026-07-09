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

// --- LINUX Pack (EX280 워밍업) ---
// 명령어 + 한국어 한줄 설명. 게임 로직은 문자열 배열만 사용하므로
// 아래에서 WORD_PACKS.LINUX(문자열)와 WORD_DESCS(설명 맵)로 분리한다.
const LINUX_ENTRIES = [
    // 파일/디렉터리
    { text: "ls -la", desc: "숨김 파일 포함 상세 목록 출력" },
    { text: "pwd", desc: "현재 작업 디렉터리 경로 출력" },
    { text: "cd -", desc: "직전 디렉터리로 이동" },
    { text: "cp -r", desc: "디렉터리를 재귀적으로 복사" },
    { text: "mv", desc: "파일 이동 또는 이름 변경" },
    { text: "rm -rf", desc: "디렉터리를 강제로 재귀 삭제 (주의!)" },
    { text: "mkdir -p", desc: "중간 경로까지 한 번에 디렉터리 생성" },
    { text: "touch", desc: "빈 파일 생성 또는 수정시각 갱신" },
    { text: "find / -name", desc: "이름으로 파일 검색" },
    { text: "ln -s", desc: "심볼릭 링크 생성" },
    { text: "stat", desc: "파일의 상세 정보(권한/시각) 확인" },
    { text: "file", desc: "파일 종류 판별" },

    // 텍스트 처리
    { text: "cat", desc: "파일 내용 전체 출력" },
    { text: "less", desc: "파일을 페이지 단위로 열람" },
    { text: "head -n 5", desc: "파일 앞 5줄 출력" },
    { text: "tail -f", desc: "파일 끝을 실시간 추적 (로그 확인)" },
    { text: "grep -i", desc: "대소문자 무시하고 문자열 검색" },
    { text: "grep -r", desc: "디렉터리 전체에서 재귀 검색" },
    { text: "sed -i", desc: "파일 내용을 즉시(제자리) 치환" },
    { text: "awk '{print $1}'", desc: "각 줄의 첫 번째 필드 출력" },
    { text: "wc -l", desc: "줄 수 세기" },
    { text: "sort", desc: "줄 단위 정렬" },
    { text: "uniq -c", desc: "중복 줄 제거 + 반복 횟수 표시" },
    { text: "cut -d:", desc: "구분자(:)로 필드 잘라내기" },

    // 권한
    { text: "chmod +x", desc: "실행 권한 부여" },
    { text: "chmod 644", desc: "소유자 rw, 그룹/기타 r 권한 설정" },
    { text: "chown user:group", desc: "파일 소유자와 그룹 변경" },
    { text: "chgrp", desc: "파일의 그룹만 변경" },
    { text: "umask", desc: "새 파일의 기본 권한 마스크 확인/설정" },
    { text: "id", desc: "현재 사용자의 UID/GID/그룹 확인" },
    { text: "whoami", desc: "현재 로그인 사용자 이름 출력" },
    { text: "su -", desc: "로그인 셸로 다른 사용자 전환" },

    // 프로세스/서비스
    { text: "ps aux", desc: "모든 프로세스 상세 목록" },
    { text: "top", desc: "실시간 프로세스/자원 모니터링" },
    { text: "kill -9", desc: "프로세스 강제 종료 (SIGKILL)" },
    { text: "systemctl start", desc: "서비스 시작" },
    { text: "systemctl enable --now", desc: "부팅 시 자동 시작 + 즉시 시작" },
    { text: "systemctl status", desc: "서비스 상태와 최근 로그 확인" },
    { text: "systemctl restart", desc: "서비스 재시작" },
    { text: "journalctl -u", desc: "특정 유닛(서비스)의 로그 조회" },
    { text: "journalctl -f", desc: "시스템 로그 실시간 추적" },
    { text: "nohup", desc: "로그아웃 후에도 프로세스 계속 실행" },
    { text: "crontab -e", desc: "예약 작업(cron) 편집" },
    { text: "df -h", desc: "디스크 사용량을 읽기 쉽게 출력" },

    // 네트워크
    { text: "ip a", desc: "네트워크 인터페이스/IP 확인" },
    { text: "ss -tulpn", desc: "리스닝 중인 포트와 프로세스 확인" },
    { text: "ping", desc: "네트워크 연결 확인 (ICMP)" },
    { text: "curl -k", desc: "인증서 검증 없이 HTTP 요청" },
    { text: "ssh", desc: "원격 호스트에 보안 접속" },
    { text: "scp", desc: "SSH로 파일 원격 복사" },
    { text: "dig", desc: "DNS 조회" },
    { text: "nc -zv", desc: "포트 열림 여부 스캔" },

    // 패키지/압축/기타
    { text: "tar -xzvf", desc: "gzip 압축(tar.gz) 해제" },
    { text: "tar -czvf", desc: "gzip으로 압축(tar.gz) 생성" },
    { text: "rpm -q", desc: "설치된 패키지 조회" },
    { text: "dnf install", desc: "패키지 설치 (RHEL 계열)" },
    { text: "man", desc: "명령어 매뉴얼 페이지 열람" },
    { text: "history", desc: "명령어 입력 기록 확인" },
    { text: "export", desc: "환경 변수 설정 (하위 프로세스에 전달)" },
    { text: "echo $PATH", desc: "실행 파일 검색 경로 출력" }
];

// --- OC CORE Pack (EX280 필수 암기 명령) ---
const OC_ENTRIES = [
    // 조회/진단
    { text: "oc whoami", desc: "현재 로그인 사용자 확인" },
    { text: "oc project", desc: "현재 작업 중인 프로젝트 확인" },
    { text: "oc get all -n apps", desc: "네임스페이스의 주요 리소스 전체 조회" },
    { text: "oc get pods -A", desc: "모든 네임스페이스의 파드 조회" },
    { text: "oc describe pod", desc: "파드 상세 + 이벤트 확인 (진단 1순위)" },
    { text: "oc logs -f", desc: "컨테이너 로그 실시간 추적" },
    { text: "oc get events --sort-by", desc: "이벤트를 시간순 정렬해 조회" },
    { text: "oc explain deployment", desc: "리소스 필드 문서를 CLI에서 확인" },
    { text: "oc rsh", desc: "실행 중인 파드에 원격 셸 접속" },
    { text: "oc adm top pods", desc: "파드별 CPU/메모리 실사용량" },
    { text: "oc api-resources", desc: "사용 가능한 리소스 종류와 축약형 조회" },
    { text: "oc get -o yaml", desc: "리소스의 전체 YAML 출력 (백업/분석)" },
    { text: "-o jsonpath", desc: "특정 필드만 추출하는 출력 형식" },

    // 생성 뼈대 (dry-run 습관)
    { text: "--dry-run=client -o yaml", desc: "생성 없이 YAML 뼈대만 출력 (시험 필수기)" },
    { text: "oc new-project", desc: "프로젝트 생성 + 즉시 전환" },
    { text: "oc new-app --name", desc: "이미지/Git에서 앱 자동 배포" },
    { text: "oc create deployment", desc: "디플로이먼트 생성" },
    { text: "oc create configmap", desc: "설정값(ConfigMap) 생성" },
    { text: "oc create secret generic", desc: "민감정보(Secret) 생성" },
    { text: "oc create quota", desc: "네임스페이스 자원 총량 제한 생성" },
    { text: "oc create sa", desc: "서비스어카운트 생성" },
    { text: "oc create job", desc: "일회성 작업(Job) 생성" },
    { text: "oc create cronjob", desc: "예약 작업(CronJob) 생성" },
    { text: "oc create route edge", desc: "TLS edge 종료 Route 생성" },

    // 앱 운영
    { text: "oc expose svc", desc: "서비스를 Route로 외부 노출" },
    { text: "oc scale --replicas=3", desc: "레플리카 수 수동 조정" },
    { text: "oc rollout status", desc: "배포 진행 상태 확인 (검증 습관)" },
    { text: "oc rollout undo", desc: "직전 버전으로 롤백" },
    { text: "oc set image", desc: "컨테이너 이미지 교체 (새 롤아웃)" },
    { text: "oc set env --from", desc: "Secret/ConfigMap을 환경변수로 주입" },
    { text: "oc set volume --add", desc: "볼륨 마운트 추가" },
    { text: "oc set serviceaccount", desc: "워크로드에 SA 지정" },
    { text: "oc set resources", desc: "CPU/메모리 requests·limits 설정" },
    { text: "oc apply -f", desc: "매니페스트 파일 적용 (선언형)" },
    { text: "oc apply -k", desc: "Kustomize 오버레이 적용" },
    { text: "oc process", desc: "템플릿 파라미터 치환 렌더링" },
    { text: "helm install", desc: "Helm 차트 설치" },
    { text: "helm upgrade", desc: "Helm 릴리스 업그레이드" },

    // 권한/보안
    { text: "oc adm groups new", desc: "그룹 생성" },
    { text: "oc adm groups add-users", desc: "그룹에 사용자 추가" },
    { text: "oc adm policy add-role-to-user", desc: "사용자에게 역할 부여 (RoleBinding)" },
    { text: "oc adm policy add-scc-to-user", desc: "SA/사용자에 SCC 부여" },
    { text: "oc adm policy who-can", desc: "특정 작업 가능한 주체 역추적" },
    { text: "oc auth can-i", desc: "권한 여부 즉시 검증 (yes/no)" },
    { text: "htpasswd -c -B -b", desc: "htpasswd 파일 생성 (bcrypt, 배치)" },
    { text: "oc extract secret", desc: "Secret 내용을 파일로 추출" },
    { text: "oc set data secret", desc: "기존 Secret 데이터 갱신" },

    // 오퍼레이터
    { text: "oc get csv", desc: "오퍼레이터 설치 상태(Succeeded) 확인" },
    { text: "oc get packagemanifests", desc: "설치 가능한 오퍼레이터 카탈로그 조회" }
];

// --- GitHub CORE Pack (GitHub Certification 공통 핵심) ---
const GITHUB_ENTRIES = [
    { text: "git clone", desc: "원격 저장소를 로컬로 복제" },
    { text: "git status", desc: "작업 트리와 스테이징 상태 확인" },
    { text: "git add .", desc: "변경 파일 전체를 스테이징" },
    { text: "git commit -m", desc: "메시지와 함께 커밋 생성" },
    { text: "git push", desc: "로컬 커밋을 원격 저장소로 업로드" },
    { text: "git pull", desc: "원격 변경사항을 가져와 병합" },
    { text: "git fetch", desc: "원격 변경사항만 가져오고 병합하지 않음" },
    { text: "git branch", desc: "브랜치 목록 확인 또는 생성" },
    { text: "git checkout -b", desc: "새 브랜치를 만들고 전환" },
    { text: "git switch -c", desc: "새 브랜치를 만들고 전환하는 최신 명령" },
    { text: "git merge", desc: "다른 브랜치의 변경사항 병합" },
    { text: "git rebase", desc: "커밋 기반을 다른 브랜치 뒤로 재배치" },
    { text: "git log --oneline", desc: "커밋 기록을 한 줄씩 요약 표시" },
    { text: "git diff", desc: "변경된 코드 차이 확인" },
    { text: "git stash", desc: "작업 중 변경사항 임시 보관" },
    { text: "git tag", desc: "릴리스 지점을 표시하는 태그 관리" },
    { text: "pull request", desc: "변경사항을 리뷰하고 병합 요청하는 단위" },
    { text: "code review", desc: "변경 코드 검토와 승인/수정 요청 과정" },
    { text: "merge conflict", desc: "같은 파일 변경이 충돌해 수동 해결이 필요한 상태" },
    { text: "default branch", desc: "저장소의 기준 브랜치" },
    { text: "issue templates", desc: "버그/기능 요청 양식을 표준화하는 템플릿" },
    { text: "gh pr checkout", desc: "PR 브랜치를 로컬로 체크아웃" },
    { text: "gh pr checks", desc: "PR의 CI 체크 상태 확인" },
    { text: "gh workflow run", desc: "워크플로 수동 실행" },
    { text: "gh run list", desc: "Actions 실행 목록 조회" },
    { text: "gh run view --log", desc: "실패한 Actions 로그 확인" },
    { text: "gh run rerun", desc: "Actions 실행 재시도" },
    { text: "gh secret set", desc: "Actions/Dependabot용 Secret 등록" },
    { text: "workflow_dispatch", desc: "Actions 워크플로를 수동 실행할 수 있게 하는 이벤트" },
    { text: "pull_request", desc: "PR 생성/수정 시 Actions를 실행하는 이벤트" },
    { text: "runs-on", desc: "Actions job이 실행될 runner 환경 지정" },
    { text: "actions/checkout", desc: "워크플로에서 저장소 코드를 체크아웃하는 공식 액션" },
    { text: "permissions", desc: "GITHUB_TOKEN 권한 범위를 제한하는 설정" },
    { text: "repository secrets", desc: "저장소 단위 Actions 비밀값" },
    { text: "environment secrets", desc: "배포 환경별로 분리한 비밀값" },
    { text: "release notes", desc: "배포 변경사항과 주의점을 정리한 문서" },
    { text: "CODEOWNERS", desc: "경로별 코드 소유자와 리뷰 책임자 지정" },
    { text: "branch protection", desc: "브랜치 병합 규칙과 보호 정책" },
    { text: "required checks", desc: "병합 전 반드시 통과해야 하는 CI 체크" },
    { text: "rulesets", desc: "저장소/조직 단위 규칙 집합" },
    { text: "repository visibility", desc: "저장소 공개/비공개/내부 공개 범위" },
    { text: "organization owner", desc: "조직 전체 관리 권한을 가진 역할" },
    { text: "team maintainer", desc: "팀 멤버와 권한을 관리하는 역할" },
    { text: "audit log", desc: "조직 보안/관리 이벤트 기록" },
    { text: "Dependabot alerts", desc: "의존성 취약점 알림" },
    { text: "secret scanning", desc: "토큰/비밀정보 유출 탐지" },
    { text: "code scanning", desc: "CodeQL 등 정적 분석 보안 알림" },
    { text: "security advisories", desc: "보안 취약점 공지와 패치 관리" },
    { text: "GitHub Advanced Security", desc: "CodeQL/Secret scanning 등 보안 기능 묶음" },
    { text: "GitHub Actions", desc: "GitHub 내 CI/CD 자동화 플랫폼" },
    { text: "GitHub Copilot", desc: "코드 작성과 설명을 돕는 AI 개발 도우미" }
];

// 명령어 → 한국어 설명 조회 테이블 (successWord 토스트에서 사용)
const WORD_DESCS = {};
WORD_PACKS.LINUX = LINUX_ENTRIES.map(e => {
    WORD_DESCS[e.text] = e.desc;
    return e.text;
});
WORD_PACKS.OC_CORE = OC_ENTRIES.map(e => {
    WORD_DESCS[e.text] = e.desc;
    return e.text;
});
WORD_PACKS.GITHUB_CORE = GITHUB_ENTRIES.map(e => {
    WORD_DESCS[e.text] = e.desc;
    return e.text;
});

// Populate MIX
WORD_PACKS.MIX = Object.values(WORD_PACKS)
    .filter(pack => Array.isArray(pack))
    .flat();
