// GitHub Edition study data.
// Mirrors the OCP Edition learning surface: DROP, learn/follow tracks,
// scenarios, mock labs, incident drills, and an exam blueprint.

const GITHUB_SCENARIO_PACKS = {
    GH_FOUNDATIONS: {
        label: "Foundations",
        questions: [
            {
                id: "gh-found-01",
                scenario: "현재 터미널이 GitHub CLI에 로그인되어 있는지 확인합니다.",
                answers: ["^gh\\s+auth\\s+status$"],
                canonical: "gh auth status",
                hint: "GitHub CLI 인증 상태는 auth status로 확인합니다.",
                explain: "GitHub CLI로 저장소, PR, 이슈, Actions를 다루려면 먼저 인증 상태를 확인해야 합니다."
            },
            {
                id: "gh-found-02",
                scenario: "souluk319/codedrop 저장소를 로컬로 복제합니다.",
                answers: ["^gh\\s+repo\\s+clone\\s+souluk319/codedrop$", "^git\\s+clone\\s+https://github\\.com/souluk319/codedrop(\\.git)?$"],
                canonical: "gh repo clone souluk319/codedrop",
                hint: "GitHub CLI라면 gh repo clone OWNER/REPO 형태입니다.",
                explain: "GitHub CLI는 저장소 URL을 외우지 않아도 owner/repo 형식으로 복제할 수 있습니다."
            },
            {
                id: "gh-found-03",
                scenario: "새 private 저장소 souluk319/codedrop-lab을 생성합니다.",
                answers: ["^gh\\s+repo\\s+create\\s+souluk319/codedrop-lab\\s+--private$"],
                canonical: "gh repo create souluk319/codedrop-lab --private",
                hint: "repo create 뒤에 owner/repo와 --private를 붙입니다.",
                explain: "공개 범위는 저장소 생성 시 중요한 보안/협업 설정입니다."
            },
            {
                id: "gh-found-04",
                scenario: "feat/codedrop-dev 브랜치를 새로 만들고 이동합니다.",
                answers: ["^git\\s+(checkout\\s+-b|switch\\s+-c)\\s+feat/codedrop-dev$"],
                canonical: "git switch -c feat/codedrop-dev",
                hint: "최신 Git에서는 switch -c를 많이 씁니다.",
                explain: "브랜치는 작업 단위를 분리해 PR 리뷰와 병합 흐름을 안전하게 만듭니다."
            },
            {
                id: "gh-found-05",
                scenario: "제목이 'codedrop polish'이고 본문이 'mobile panel overlaps'인 이슈를 생성합니다.",
                answers: ["^gh\\s+issue\\s+create\\s+.*--title\\s+['\"]codedrop polish['\"].*--body\\s+['\"]mobile panel overlaps['\"].*$"],
                canonical: "gh issue create --title \"codedrop polish\" --body \"mobile panel overlaps\"",
                hint: "gh issue create에 --title과 --body를 붙입니다.",
                explain: "Issue는 작업, 버그, 논의의 단위를 저장소 안에 남기는 기본 협업 도구입니다."
            },
            {
                id: "gh-found-06",
                scenario: "제목이 'polish codedrop UX'이고 본문이 'align mobile panels'인 PR을 main 대상으로 생성합니다.",
                answers: ["^gh\\s+pr\\s+create\\s+.*--title\\s+['\"]polish codedrop UX['\"].*--body\\s+['\"]align mobile panels['\"].*--base\\s+main.*$"],
                canonical: "gh pr create --title \"polish codedrop UX\" --body \"align mobile panels\" --base main",
                hint: "gh pr create에 --title, --body, --base를 붙입니다.",
                explain: "PR은 코드 리뷰, 자동 검사, 변경 이력을 묶는 GitHub 협업의 중심 단위입니다."
            },
            {
                id: "gh-found-07",
                scenario: "PR 42를 승인 리뷰합니다.",
                answers: ["^gh\\s+pr\\s+review\\s+42\\s+--approve$"],
                canonical: "gh pr review 42 --approve",
                hint: "pr review <number> --approve",
                explain: "리뷰는 변경 승인과 품질 관리를 GitHub 안에 기록합니다."
            },
            {
                id: "gh-found-08",
                scenario: "PR 42를 squash 방식으로 병합하고 브랜치를 삭제합니다.",
                answers: ["^gh\\s+pr\\s+merge\\s+42\\s+--squash\\s+--delete-branch$"],
                canonical: "gh pr merge 42 --squash --delete-branch",
                hint: "merge에 --squash와 --delete-branch를 붙입니다.",
                explain: "Squash merge는 PR 변경을 하나의 깔끔한 커밋으로 main에 남깁니다."
            },
            {
                id: "gh-found-09",
                scenario: "v1.0.0 태그로 릴리스를 생성하고 자동 릴리스 노트를 붙입니다.",
                answers: ["^gh\\s+release\\s+create\\s+v1\\.0\\.0\\s+--generate-notes$"],
                canonical: "gh release create v1.0.0 --generate-notes",
                hint: "release create 뒤에 태그와 --generate-notes를 붙입니다.",
                explain: "Release는 태그, 바이너리, 릴리스 노트를 묶어 배포 지점을 명확히 합니다."
            },
            {
                id: "gh-found-10",
                scenario: "octo-org 소유자의 project 1번 항목 목록을 확인합니다.",
                answers: ["^gh\\s+project\\s+item-list\\s+1\\s+--owner\\s+octo-org$"],
                canonical: "gh project item-list 1 --owner octo-org",
                hint: "project item-list <number> --owner <owner>",
                explain: "GitHub Projects는 이슈와 PR을 묶어 작업 현황을 관리하는 도구입니다."
            },
            {
                id: "gh-found-11",
                scenario: "souluk319/codedrop 저장소의 기본 정보를 확인합니다.",
                answers: ["^gh\\s+repo\\s+view\\s+souluk319/codedrop$"],
                canonical: "gh repo view souluk319/codedrop",
                hint: "repo view OWNER/REPO",
                explain: "저장소 visibility, default branch, description 같은 기본 정보를 빠르게 확인합니다."
            },
            {
                id: "gh-found-12",
                scenario: "bug 라벨이 붙은 이슈 목록을 확인합니다.",
                answers: ["^gh\\s+issue\\s+list\\s+--label\\s+bug$"],
                canonical: "gh issue list --label bug",
                hint: "issue list --label <label>",
                explain: "라벨 기반 필터링은 이슈 triage와 작업 우선순위 정리에 자주 쓰입니다."
            },
            {
                id: "gh-found-13",
                scenario: "현재 브랜치의 PR 상태를 확인합니다.",
                answers: ["^gh\\s+pr\\s+status$"],
                canonical: "gh pr status",
                hint: "pr status",
                explain: "현재 작업 브랜치와 연결된 PR, 리뷰, 체크 상태를 한 번에 확인합니다."
            },
            {
                id: "gh-found-14",
                scenario: "souluk319/codedrop 저장소의 community profile 상태를 API로 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/community/profile$"],
                canonical: "gh api repos/souluk319/codedrop/community/profile",
                hint: "README, LICENSE, CONTRIBUTING, CODEOWNERS, SECURITY 같은 핵심 파일 상태를 보는 엔드포인트입니다.",
                explain: "Foundations 범위에서는 저장소의 핵심 파일과 커뮤니티 프로필이 협업 품질에 어떤 영향을 주는지 알아야 합니다."
            },
            {
                id: "gh-found-15",
                scenario: "souluk319/codedrop 저장소의 repository topics를 JSON으로 확인합니다.",
                answers: ["^gh\\s+repo\\s+view\\s+souluk319/codedrop\\s+--json\\s+repositoryTopics$"],
                canonical: "gh repo view souluk319/codedrop --json repositoryTopics",
                hint: "repo view에서 --json repositoryTopics를 요청합니다.",
                explain: "Topics는 저장소를 발견 가능하게 만들고 프로젝트의 성격을 분류하는 메타데이터입니다."
            },
            {
                id: "gh-found-16",
                scenario: "souluk319/codedrop 저장소의 milestones 목록을 API로 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/milestones$"],
                canonical: "gh api repos/souluk319/codedrop/milestones",
                hint: "repos/OWNER/REPO/milestones",
                explain: "Milestones는 이슈와 PR을 릴리스나 목표 단위로 묶어 진행 상황을 추적하는 협업 기능입니다."
            },
            {
                id: "gh-found-17",
                scenario: "souluk319/codedrop 저장소의 branch protection 설정을 main 브랜치 기준으로 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/branches/main/protection$"],
                canonical: "gh api repos/souluk319/codedrop/branches/main/protection",
                hint: "branches/main/protection",
                explain: "Branch protection은 리뷰, required checks, force push 제한 같은 협업 안전장치를 설정합니다."
            },
            {
                id: "gh-found-18",
                scenario: "souluk319/codedrop 저장소의 wiki 활성 여부를 확인합니다.",
                answers: ["^gh\\s+repo\\s+view\\s+souluk319/codedrop\\s+--json\\s+hasWikiEnabled$"],
                canonical: "gh repo view souluk319/codedrop --json hasWikiEnabled",
                hint: "repo view --json hasWikiEnabled",
                explain: "Wiki, Pages, Discussions, Gists는 GitHub에서 문서와 지식 공유를 할 때 쓰는 기능입니다."
            }
        ]
    },
    GH_ACTIONS: {
        label: "GitHub Actions",
        questions: [
            {
                id: "gh-act-01",
                scenario: "워크플로 파일을 넣을 기본 디렉터리를 만듭니다.",
                answers: ["^mkdir\\s+-p\\s+\\.github/workflows$"],
                canonical: "mkdir -p .github/workflows",
                hint: "워크플로 YAML은 .github/workflows 아래에 둡니다.",
                explain: "GitHub Actions는 저장소의 .github/workflows/*.yml 파일을 기준으로 실행됩니다."
            },
            {
                id: "gh-act-02",
                scenario: "저장소 워크플로 목록을 확인합니다.",
                answers: ["^gh\\s+workflow\\s+list$"],
                canonical: "gh workflow list",
                hint: "workflow list",
                explain: "워크플로 이름과 활성화 상태를 확인하면 수동 실행 대상을 찾기 쉽습니다."
            },
            {
                id: "gh-act-03",
                scenario: "ci.yml 워크플로를 수동 실행합니다.",
                answers: ["^gh\\s+workflow\\s+run\\s+ci\\.ya?ml$"],
                canonical: "gh workflow run ci.yml",
                hint: "workflow run 뒤에 파일명을 둡니다.",
                explain: "workflow_dispatch가 있는 워크플로는 CLI나 UI에서 수동 실행할 수 있습니다."
            },
            {
                id: "gh-act-04",
                scenario: "최근 Actions 실행 목록을 확인합니다.",
                answers: ["^gh\\s+run\\s+list$"],
                canonical: "gh run list",
                hint: "run list는 실행 히스토리를 보여줍니다.",
                explain: "실패한 실행 ID를 찾은 뒤 로그 조회나 재실행으로 이어갈 수 있습니다."
            },
            {
                id: "gh-act-05",
                scenario: "실패한 run의 로그를 확인합니다. run id는 123456입니다.",
                answers: ["^gh\\s+run\\s+view\\s+123456\\s+--log$"],
                canonical: "gh run view 123456 --log",
                hint: "run view에 ID와 --log를 붙입니다.",
                explain: "Actions 장애 대응은 로그를 먼저 보는 습관이 중요합니다."
            },
            {
                id: "gh-act-06",
                scenario: "run id 123456을 다시 실행합니다.",
                answers: ["^gh\\s+run\\s+rerun\\s+123456$"],
                canonical: "gh run rerun 123456",
                hint: "run rerun <id>",
                explain: "원인 조치 후 같은 run을 재실행해 해결 여부를 확인합니다."
            },
            {
                id: "gh-act-07",
                scenario: "run id 123456을 취소합니다.",
                answers: ["^gh\\s+run\\s+cancel\\s+123456$"],
                canonical: "gh run cancel 123456",
                hint: "run cancel <id>",
                explain: "잘못 시작한 배포나 오래 걸리는 실행은 취소할 수 있어야 합니다."
            },
            {
                id: "gh-act-08",
                scenario: "run id 123456이 끝날 때까지 watch합니다.",
                answers: ["^gh\\s+run\\s+watch\\s+123456$"],
                canonical: "gh run watch 123456",
                hint: "run watch <id>",
                explain: "Watch는 터미널에서 CI 상태를 계속 따라갈 때 유용합니다."
            },
            {
                id: "gh-act-09",
                scenario: "NPM_TOKEN 시크릿을 저장소에 설정합니다.",
                answers: ["^gh\\s+secret\\s+set\\s+NPM_TOKEN$"],
                canonical: "gh secret set NPM_TOKEN",
                hint: "값은 표준입력 또는 프롬프트로 넣을 수 있습니다.",
                explain: "Secret은 워크플로에서 토큰을 안전하게 참조하기 위한 저장소입니다."
            },
            {
                id: "gh-act-10",
                scenario: "NODE_ENV 변수를 production 값으로 저장소에 설정합니다.",
                answers: ["^gh\\s+variable\\s+set\\s+NODE_ENV\\s+--body\\s+production$"],
                canonical: "gh variable set NODE_ENV --body production",
                hint: "variable set NAME --body VALUE",
                explain: "민감하지 않은 설정값은 Actions variables로 분리할 수 있습니다."
            },
            {
                id: "gh-act-11",
                scenario: "run id 123456에서 build-artifact 이름의 artifact를 내려받습니다.",
                answers: ["^gh\\s+run\\s+download\\s+123456\\s+--name\\s+build-artifact$"],
                canonical: "gh run download 123456 --name build-artifact",
                hint: "run download <id> --name <artifact>",
                explain: "Artifacts는 빌드 산출물, 리포트, 로그 묶음을 실행 결과로 보관합니다."
            },
            {
                id: "gh-act-12",
                scenario: "souluk319/codedrop 저장소의 Actions cache 목록을 API로 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/actions/caches$"],
                canonical: "gh api repos/souluk319/codedrop/actions/caches",
                hint: "actions/caches 엔드포인트를 조회합니다.",
                explain: "Cache는 CI 속도를 높이지만 stale cache나 용량 문제를 만들 수 있어 운영 점검 대상입니다."
            },
            {
                id: "gh-act-13",
                scenario: "souluk319/codedrop 저장소의 environment 목록을 API로 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/environments$"],
                canonical: "gh api repos/souluk319/codedrop/environments",
                hint: "repos/OWNER/REPO/environments",
                explain: "Environment는 배포 승인, 보호 규칙, 환경별 secret을 관리하는 Actions 운영 단위입니다."
            },
            {
                id: "gh-act-14",
                scenario: "souluk319/codedrop 저장소의 workflow 권한 설정을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/actions/permissions/workflow$"],
                canonical: "gh api repos/souluk319/codedrop/actions/permissions/workflow",
                hint: "actions/permissions/workflow",
                explain: "GITHUB_TOKEN 권한은 least privilege 관점에서 read/write 범위를 확인해야 합니다."
            },
            {
                id: "gh-act-15",
                scenario: "souluk319/codedrop 저장소의 OIDC subject customization 설정을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/actions/oidc/customization/sub$"],
                canonical: "gh api repos/souluk319/codedrop/actions/oidc/customization/sub",
                hint: "actions/oidc/customization/sub",
                explain: "OIDC subject claim은 클라우드 배포 권한을 어떤 워크플로/브랜치에 묶을지 결정합니다."
            },
            {
                id: "gh-act-16",
                scenario: "reusable.yml 워크플로가 재사용 워크플로인지 YAML로 확인합니다.",
                answers: ["^gh\\s+workflow\\s+view\\s+reusable\\.ya?ml\\s+--yaml$"],
                canonical: "gh workflow view reusable.yml --yaml",
                hint: "workflow view <file> --yaml",
                explain: "재사용 워크플로는 on.workflow_call 계약을 확인해야 입력, secret, 호출 조건을 알 수 있습니다."
            },
            {
                id: "gh-act-17",
                scenario: "run id 123456의 job 목록을 API로 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/actions/runs/123456/jobs$"],
                canonical: "gh api repos/souluk319/codedrop/actions/runs/123456/jobs",
                hint: "actions/runs/<run_id>/jobs",
                explain: "Matrix나 needs 관계가 있는 워크플로에서는 실패한 job과 step을 정확히 찾는 것이 첫 진단입니다."
            },
            {
                id: "gh-act-18",
                scenario: "souluk319/codedrop 저장소의 artifact 목록을 API로 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/actions/artifacts$"],
                canonical: "gh api repos/souluk319/codedrop/actions/artifacts",
                hint: "actions/artifacts",
                explain: "Artifacts는 테스트 리포트, 빌드 결과, 배포 산출물을 실행 사이에 전달하거나 보관할 때 사용합니다."
            },
            {
                id: "gh-act-19",
                scenario: "souluk319/codedrop 저장소의 self-hosted runner 목록을 API로 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/actions/runners$"],
                canonical: "gh api repos/souluk319/codedrop/actions/runners",
                hint: "repos/OWNER/REPO/actions/runners",
                explain: "Self-hosted runner는 라벨, 네트워크, 보안 격리까지 함께 관리해야 하는 Actions 운영 대상입니다."
            },
            {
                id: "gh-act-20",
                scenario: "souluk319/codedrop 저장소의 workflow run retention 설정을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/actions/permissions$"],
                canonical: "gh api repos/souluk319/codedrop/actions/permissions",
                hint: "actions/permissions",
                explain: "Actions 운영에서는 권한, artifact/log 보존 기간, 허용 action 정책을 비용과 보안 관점에서 관리합니다."
            },
            {
                id: "gh-act-21",
                scenario: "souluk319/codedrop 저장소의 failed run만 조회합니다.",
                answers: ["^gh\\s+run\\s+list\\s+--status\\s+failure$"],
                canonical: "gh run list --status failure",
                hint: "run list --status failure",
                explain: "장애 대응은 실패 실행을 빠르게 좁히고 로그, matrix 축, runner 상태를 연결해서 보는 흐름입니다."
            }
        ]
    },
    GH_SECURITY: {
        label: "Advanced Security",
        questions: [
            {
                id: "gh-sec-01",
                scenario: "저장소의 code scanning alert 목록을 API로 조회합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/code-scanning/alerts$"],
                canonical: "gh api repos/souluk319/codedrop/code-scanning/alerts",
                hint: "gh api repos/OWNER/REPO/code-scanning/alerts",
                explain: "Code scanning은 CodeQL 등 정적 분석 결과를 alert로 관리합니다."
            },
            {
                id: "gh-sec-02",
                scenario: "Secret scanning alert 목록을 API로 조회합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/secret-scanning/alerts$"],
                canonical: "gh api repos/souluk319/codedrop/secret-scanning/alerts",
                hint: "secret-scanning/alerts 엔드포인트를 씁니다.",
                explain: "토큰 유출은 빠르게 탐지하고 revoke하는 운영 절차가 중요합니다."
            },
            {
                id: "gh-sec-03",
                scenario: "Dependabot alert 목록을 API로 조회합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/dependabot/alerts$"],
                canonical: "gh api repos/souluk319/codedrop/dependabot/alerts",
                hint: "dependabot/alerts 엔드포인트를 씁니다.",
                explain: "Dependabot alerts는 취약한 의존성을 발견하고 업데이트 PR로 연결합니다."
            },
            {
                id: "gh-sec-04",
                scenario: "저장소 dependency graph의 SBOM을 조회합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/dependency-graph/sbom$"],
                canonical: "gh api repos/souluk319/codedrop/dependency-graph/sbom",
                hint: "dependency-graph/sbom 엔드포인트를 씁니다.",
                explain: "SBOM은 소프트웨어 구성 요소를 추적하고 공급망 리스크를 파악하는 자료입니다."
            },
            {
                id: "gh-sec-05",
                scenario: "저장소 security advisory 목록을 조회합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/security-advisories$"],
                canonical: "gh api repos/souluk319/codedrop/security-advisories",
                hint: "security-advisories 엔드포인트입니다.",
                explain: "Private vulnerability reporting과 security advisory는 취약점 공개/조율 프로세스와 연결됩니다."
            },
            {
                id: "gh-sec-06",
                scenario: "CodeQL 데이터베이스를 codeql-db 경로에 생성합니다.",
                answers: ["^codeql\\s+database\\s+create\\s+codeql-db$"],
                canonical: "codeql database create codeql-db",
                hint: "codeql database create <path>",
                explain: "CodeQL 분석은 언어별 데이터베이스 생성 후 쿼리를 실행하는 흐름입니다."
            },
            {
                id: "gh-sec-07",
                scenario: "codeql-db 데이터베이스를 JavaScript 기본 쿼리로 분석합니다.",
                answers: ["^codeql\\s+database\\s+analyze\\s+codeql-db\\s+codeql/javascript-queries$"],
                canonical: "codeql database analyze codeql-db codeql/javascript-queries",
                hint: "database analyze <db> <query-pack>",
                explain: "CodeQL 쿼리 팩은 언어/목적별 분석 규칙 묶음입니다."
            },
            {
                id: "gh-sec-08",
                scenario: "조직 octo-org의 security advisory 목록을 조회합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/security-advisories$"],
                canonical: "gh api orgs/octo-org/security-advisories",
                hint: "orgs/<org>/security-advisories",
                explain: "조직 단위 보안 관리는 저장소 개별 알림과 조직 전체 정책을 함께 봐야 합니다."
            },
            {
                id: "gh-sec-09",
                scenario: "저장소의 vulnerability alerts 설정 엔드포인트를 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/vulnerability-alerts$"],
                canonical: "gh api repos/souluk319/codedrop/vulnerability-alerts",
                hint: "vulnerability-alerts 엔드포인트입니다.",
                explain: "취약한 의존성 알림은 dependency graph와 Dependabot 운영의 기초입니다."
            },
            {
                id: "gh-sec-10",
                scenario: "souluk319/codedrop 저장소의 code scanning default setup 설정을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/code-scanning/default-setup$"],
                canonical: "gh api repos/souluk319/codedrop/code-scanning/default-setup",
                hint: "code-scanning/default-setup",
                explain: "Default setup은 CodeQL을 빠르게 활성화하는 경로이며 언어/쿼리 설정 확인이 필요합니다."
            },
            {
                id: "gh-sec-11",
                scenario: "열린 secret scanning alert만 조회합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/secret-scanning/alerts\\s+--field\\s+state=open$"],
                canonical: "gh api repos/souluk319/codedrop/secret-scanning/alerts --field state=open",
                hint: "--field state=open으로 열린 alert만 필터링합니다.",
                explain: "Secret scanning과 push protection은 노출된 토큰이 코드에 들어오거나 남는 것을 막는 핵심 기능입니다."
            },
            {
                id: "gh-sec-12",
                scenario: "JavaScript CodeQL query pack을 설치합니다.",
                answers: ["^codeql\\s+pack\\s+install\\s+codeql/javascript-queries$"],
                canonical: "codeql pack install codeql/javascript-queries",
                hint: "codeql pack install <pack>",
                explain: "Query pack 설치는 표준 쿼리나 커스텀 쿼리를 로컬 분석에 가져오는 절차입니다."
            },
            {
                id: "gh-sec-13",
                scenario: "souluk319/codedrop 저장소의 Dependabot secret 목록을 API로 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/dependabot/secrets$"],
                canonical: "gh api repos/souluk319/codedrop/dependabot/secrets",
                hint: "dependabot/secrets",
                explain: "Dependabot secrets는 dependency update 과정에서 private registry 등에 접근할 때 필요합니다."
            },
            {
                id: "gh-sec-14",
                scenario: "souluk319/codedrop 저장소의 dependency review 설정 파일을 확인합니다.",
                answers: ["^cat\\s+\\.github/dependency-review-config\\.ya?ml$"],
                canonical: "cat .github/dependency-review-config.yml",
                hint: "dependency-review-config.yml",
                explain: "Dependency Review는 PR 병합 전 취약점과 라이선스 정책을 확인하는 공급망 보안 장치입니다."
            },
            {
                id: "gh-sec-15",
                scenario: "souluk319/codedrop 저장소의 CodeQL analysis 목록을 API로 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/code-scanning/analyses$"],
                canonical: "gh api repos/souluk319/codedrop/code-scanning/analyses",
                hint: "code-scanning/analyses",
                explain: "분석 이력은 어떤 언어, ref, category로 CodeQL이 실행됐는지 확인하는 데 필요합니다."
            },
            {
                id: "gh-sec-16",
                scenario: "CodeQL 분석 결과를 results.sarif 파일로 출력합니다.",
                answers: ["^codeql\\s+database\\s+analyze\\s+codeql-db\\s+codeql/javascript-queries\\s+--format=sarif-latest\\s+--output=results\\.sarif$"],
                canonical: "codeql database analyze codeql-db codeql/javascript-queries --format=sarif-latest --output=results.sarif",
                hint: "--format=sarif-latest --output=results.sarif",
                explain: "SARIF는 code scanning 결과를 GitHub나 외부 도구로 전달하는 표준 포맷입니다."
            },
            {
                id: "gh-sec-17",
                scenario: "octo-org 조직의 security managers 목록을 API로 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/security-managers$"],
                canonical: "gh api orgs/octo-org/security-managers",
                hint: "orgs/<org>/security-managers",
                explain: "Security manager 역할은 조직 전체 보안 알림과 기능 운영을 개발팀과 분리해 관리할 때 쓰입니다."
            },
            {
                id: "gh-sec-18",
                scenario: "souluk319/codedrop 저장소의 secret scanning alert 42를 resolved 상태로 닫습니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/secret-scanning/alerts/42\\s+--method\\s+PATCH\\s+--field\\s+state=resolved\\s+--field\\s+resolution=revoked$"],
                canonical: "gh api repos/souluk319/codedrop/secret-scanning/alerts/42 --method PATCH --field state=resolved --field resolution=revoked",
                hint: "PATCH alert id 42에 state=resolved, resolution=revoked",
                explain: "Secret alert는 토큰 폐기, 영향 범위 확인, 해결 사유 기록까지 마쳐야 닫을 수 있습니다."
            }
        ]
    },
    GH_ADMIN: {
        label: "Administration",
        questions: [
            {
                id: "gh-admin-01",
                scenario: "octo-org 조직의 팀 목록을 API로 조회합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/teams$"],
                canonical: "gh api orgs/octo-org/teams",
                hint: "조직 리소스는 orgs/<org> 경로입니다.",
                explain: "팀은 권한을 사람 단위가 아니라 그룹 단위로 관리하게 해줍니다."
            },
            {
                id: "gh-admin-02",
                scenario: "octo-org 조직의 멤버 목록을 API로 조회합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/members$"],
                canonical: "gh api orgs/octo-org/members",
                hint: "orgs/<org>/members",
                explain: "멤버십 확인은 접근 권한과 조직 보안 점검의 첫 단계입니다."
            },
            {
                id: "gh-admin-03",
                scenario: "octo-org 조직의 audit log를 조회합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/audit-log$"],
                canonical: "gh api orgs/octo-org/audit-log",
                hint: "audit-log 엔드포인트를 씁니다.",
                explain: "Audit log는 보안 사고나 권한 변경 추적의 기본 자료입니다."
            },
            {
                id: "gh-admin-04",
                scenario: "souluk319/codedrop 저장소의 rulesets를 조회합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/rulesets$"],
                canonical: "gh api repos/souluk319/codedrop/rulesets",
                hint: "repos/OWNER/REPO/rulesets",
                explain: "Rulesets는 브랜치 보호보다 넓은 정책을 저장소/조직에 적용합니다."
            },
            {
                id: "gh-admin-05",
                scenario: "dev1 사용자의 souluk319/codedrop 저장소 권한을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/collaborators/dev1/permission$"],
                canonical: "gh api repos/souluk319/codedrop/collaborators/dev1/permission",
                hint: "collaborators/<user>/permission",
                explain: "권한 확인은 접근 문제를 진단할 때 먼저 확인해야 하는 축입니다."
            },
            {
                id: "gh-admin-06",
                scenario: "octo-org 조직의 외부 협업자 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/outside_collaborators$"],
                canonical: "gh api orgs/octo-org/outside_collaborators",
                hint: "outside_collaborators 엔드포인트입니다.",
                explain: "외부 협업자 관리는 조직 데이터 노출 범위를 관리하는 중요한 영역입니다."
            },
            {
                id: "gh-admin-07",
                scenario: "octo-org 조직의 self-hosted runner 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/actions/runners$"],
                canonical: "gh api orgs/octo-org/actions/runners",
                hint: "actions/runners 엔드포인트를 씁니다.",
                explain: "Self-hosted runner는 네트워크, 보안, 라벨, 그룹 정책까지 함께 관리해야 합니다."
            },
            {
                id: "gh-admin-08",
                scenario: "octo-org 조직의 runner group 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/actions/runner-groups$"],
                canonical: "gh api orgs/octo-org/actions/runner-groups",
                hint: "actions/runner-groups",
                explain: "Runner group은 어떤 저장소가 어떤 runner를 쓸 수 있는지 제한하는 관리 단위입니다."
            },
            {
                id: "gh-admin-09",
                scenario: "octo-org 조직의 저장소 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/repos$"],
                canonical: "gh api orgs/octo-org/repos",
                hint: "orgs/<org>/repos",
                explain: "조직 전체 거버넌스는 저장소 인벤토리 파악에서 시작합니다."
            },
            {
                id: "gh-admin-10",
                scenario: "octo-org 조직의 custom repository roles를 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/roles$"],
                canonical: "gh api orgs/octo-org/roles",
                hint: "orgs/<org>/roles",
                explain: "Custom role은 기본 권한보다 세밀한 저장소 접근 제어를 가능하게 합니다."
            },
            {
                id: "gh-admin-11",
                scenario: "octo-org 조직의 SAML credential authorization 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/credential-authorizations$"],
                canonical: "gh api orgs/octo-org/credential-authorizations",
                hint: "credential-authorizations",
                explain: "Enterprise/SSO 환경에서는 토큰과 SSH key가 SAML 인증을 거쳤는지 확인해야 합니다."
            },
            {
                id: "gh-admin-12",
                scenario: "octo-org 조직의 Actions 권한 정책을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/actions/permissions$"],
                canonical: "gh api orgs/octo-org/actions/permissions",
                hint: "orgs/<org>/actions/permissions",
                explain: "조직 Actions 정책은 어떤 워크플로와 액션을 허용할지 결정합니다."
            },
            {
                id: "gh-admin-13",
                scenario: "octo-org 조직의 custom properties schema를 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/properties/schema$"],
                canonical: "gh api orgs/octo-org/properties/schema",
                hint: "properties/schema",
                explain: "Custom properties는 저장소 분류와 정책 적용 대상을 관리하는 메타데이터입니다."
            },
            {
                id: "gh-admin-14",
                scenario: "repo.add_member 이벤트만 audit log에서 검색합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/audit-log\\s+--field\\s+phrase=repo\\.add_member$"],
                canonical: "gh api orgs/octo-org/audit-log --field phrase=repo.add_member",
                hint: "audit-log --field phrase=<event>",
                explain: "Audit log phrase 검색은 특정 보안 이벤트나 권한 변경을 빠르게 좁히는 방식입니다."
            },
            {
                id: "gh-admin-15",
                scenario: "octo-org 조직의 rulesets를 조회합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/rulesets$"],
                canonical: "gh api orgs/octo-org/rulesets",
                hint: "orgs/<org>/rulesets",
                explain: "조직 rulesets는 여러 저장소에 공통 보호 정책을 적용하는 관리 기능입니다."
            },
            {
                id: "gh-admin-16",
                scenario: "octo-org 조직의 pending invitation 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/invitations$"],
                canonical: "gh api orgs/octo-org/invitations",
                hint: "orgs/<org>/invitations",
                explain: "초대 상태는 접근 권한 요청이 실제 멤버십으로 이어졌는지 확인할 때 필요합니다."
            },
            {
                id: "gh-admin-17",
                scenario: "octo-org 조직의 SCIM provisioned identity 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+scim/v2/organizations/octo-org/Users$"],
                canonical: "gh api scim/v2/organizations/octo-org/Users",
                hint: "SCIM은 scim/v2/organizations/<org>/Users 경로를 사용합니다.",
                explain: "SCIM은 IdP와 GitHub 조직 사용자 수명주기를 연결하는 엔터프라이즈 관리 기능입니다."
            },
            {
                id: "gh-admin-18",
                scenario: "souluk319/codedrop 저장소의 transfer 요청 상태를 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/transfer$"],
                canonical: "gh api repos/souluk319/codedrop/transfer",
                hint: "repos/OWNER/REPO/transfer",
                explain: "저장소 이전은 소유권, 접근 권한, 조직 정책에 영향을 주므로 admin 범위에서 추적해야 합니다."
            },
            {
                id: "gh-admin-19",
                scenario: "octo-org 조직의 Actions billing usage를 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/settings/billing/actions$"],
                canonical: "gh api orgs/octo-org/settings/billing/actions",
                hint: "settings/billing/actions",
                explain: "Enterprise 운영자는 Actions minute, storage, runner 비용과 사용량을 모니터링해야 합니다."
            },
            {
                id: "gh-admin-20",
                scenario: "octo-org 조직의 GitHub Packages billing usage를 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/settings/billing/packages$"],
                canonical: "gh api orgs/octo-org/settings/billing/packages",
                hint: "settings/billing/packages",
                explain: "Packages storage와 transfer 사용량은 비용 최적화와 보존 정책 설계에 연결됩니다."
            }
        ]
    },
    GH_COPILOT: {
        label: "Copilot",
        questions: [
            {
                id: "gh-copilot-01",
                scenario: "GitHub CLI Copilot 확장을 설치합니다.",
                answers: ["^gh\\s+extension\\s+install\\s+github/gh-copilot$"],
                canonical: "gh extension install github/gh-copilot",
                hint: "Copilot CLI는 gh extension입니다.",
                explain: "gh-copilot은 터미널에서 명령 제안과 설명을 받을 수 있게 합니다."
            },
            {
                id: "gh-copilot-02",
                scenario: "설치된 GitHub CLI 확장 목록을 확인합니다.",
                answers: ["^gh\\s+extension\\s+list$"],
                canonical: "gh extension list",
                hint: "extension list",
                explain: "확장 기반 기능은 설치 상태를 먼저 확인해야 합니다."
            },
            {
                id: "gh-copilot-03",
                scenario: "release checklist 작성 명령을 Copilot에게 제안받습니다.",
                answers: ["^gh\\s+copilot\\s+suggest\\s+['\"]write a release checklist['\"]$"],
                canonical: "gh copilot suggest \"write a release checklist\"",
                hint: "suggest 뒤에 자연어 요청을 둡니다.",
                explain: "Copilot은 정답 대체물이 아니라 반복 작업 초안과 설명을 빠르게 얻는 보조 도구입니다."
            },
            {
                id: "gh-copilot-04",
                scenario: "git rebase 명령의 의미를 Copilot에게 설명받습니다.",
                answers: ["^gh\\s+copilot\\s+explain\\s+['\"]git rebase['\"]$"],
                canonical: "gh copilot explain \"git rebase\"",
                hint: "explain 뒤에 설명받을 명령을 넣습니다.",
                explain: "시험에서는 Copilot의 기능 범위, 책임 있는 사용, 조직 정책을 함께 이해해야 합니다."
            },
            {
                id: "gh-copilot-05",
                scenario: "Copilot CLI 설정을 확인합니다.",
                answers: ["^gh\\s+copilot\\s+config$"],
                canonical: "gh copilot config",
                hint: "copilot config",
                explain: "조직 정책과 개인 설정이 어떤 보조 기능을 허용하는지 이해해야 합니다."
            },
            {
                id: "gh-copilot-06",
                scenario: "octo-org 조직의 Copilot seat 정보를 조회합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/copilot/billing/seats$"],
                canonical: "gh api orgs/octo-org/copilot/billing/seats",
                hint: "orgs/<org>/copilot/billing/seats",
                explain: "Copilot Business/Enterprise에서는 seat 할당과 사용량 관리가 운영 범위에 들어갑니다."
            },
            {
                id: "gh-copilot-07",
                scenario: "octo-org 조직의 최신 28일 Copilot usage metrics report 링크를 조회합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/copilot/metrics/reports/organization-28-day/latest$"],
                canonical: "gh api orgs/octo-org/copilot/metrics/reports/organization-28-day/latest",
                hint: "orgs/<org>/copilot/metrics/reports/organization-28-day/latest",
                explain: "Copilot usage metrics report는 조직 단위 도입, 사용량, 기능 활용 현황을 내려받을 수 있는 최신 API 경로입니다."
            },
            {
                id: "gh-copilot-08",
                scenario: "kubectl 명령을 설명받도록 Copilot explain을 실행합니다.",
                answers: ["^gh\\s+copilot\\s+explain\\s+['\"]kubectl get pods -A['\"]$"],
                canonical: "gh copilot explain \"kubectl get pods -A\"",
                hint: "explain 뒤에 명령 전체를 따옴표로 넣습니다.",
                explain: "Copilot은 낯선 CLI를 해석하는 데 유용하지만, 민감정보 입력과 결과 검증에는 주의해야 합니다."
            },
            {
                id: "gh-copilot-09",
                scenario: "octo-org 조직의 Copilot billing 정보를 조회합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/copilot/billing$"],
                canonical: "gh api orgs/octo-org/copilot/billing",
                hint: "copilot/billing",
                explain: "Copilot 운영은 seat뿐 아니라 청구 상태와 플랜 범위도 함께 확인합니다."
            },
            {
                id: "gh-copilot-10",
                scenario: "octo-org 조직의 최신 28일 Copilot 사용자별 usage metrics report 링크를 조회합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/copilot/metrics/reports/users-28-day/latest$"],
                canonical: "gh api orgs/octo-org/copilot/metrics/reports/users-28-day/latest",
                hint: "copilot/metrics/reports/users-28-day/latest",
                explain: "사용자별 metrics report는 활성 사용자와 기능 사용 패턴을 분석해 라이선스 운영과 도입 효과 판단에 씁니다."
            },
            {
                id: "gh-copilot-11",
                scenario: "dev1 사용자에게 Copilot seat를 할당합니다.",
                answers: [
                    "^gh\\s+api\\s+orgs/octo-org/copilot/billing/selected_users\\s+--method\\s+POST\\s+--field\\s+selected_usernames\\[\\]=dev1$",
                    "^gh\\s+api\\s+orgs/octo-org/copilot/billing/selected_users\\s+--method\\s+POST\\s+--raw-field\\s+selected_usernames\\[\\]=dev1$"
                ],
                canonical: "gh api orgs/octo-org/copilot/billing/selected_users --method POST --field selected_usernames[]=dev1",
                hint: "billing/selected_users 엔드포인트에 POST로 selected_usernames[]를 보냅니다.",
                explain: "Copilot Business 운영자는 사용자 또는 팀 단위 seat 할당 흐름을 이해해야 합니다."
            },
            {
                id: "gh-copilot-12",
                scenario: "PR 테스트 작성 방법을 Copilot에게 제안받습니다.",
                answers: ["^gh\\s+copilot\\s+suggest\\s+['\"]write tests for a pull request['\"]$"],
                canonical: "gh copilot suggest \"write tests for a pull request\"",
                hint: "copilot suggest 뒤에 자연어 작업을 넣습니다.",
                explain: "Copilot은 테스트 초안 작성처럼 범위가 명확한 작업에서 특히 유용합니다."
            },
            {
                id: "gh-copilot-13",
                scenario: "Copilot Chat에 줄 컨텍스트 파일 .github/copilot-instructions.md를 확인합니다.",
                answers: ["^cat\\s+\\.github/copilot-instructions\\.md$"],
                canonical: "cat .github/copilot-instructions.md",
                hint: "copilot-instructions.md",
                explain: "Instructions 파일은 저장소별 규칙과 코딩 표준을 Copilot 응답 컨텍스트로 제공하는 방식입니다."
            },
            {
                id: "gh-copilot-14",
                scenario: "octo-org 조직의 2026-07-01 하루 Copilot usage metrics report 링크를 조회합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/copilot/metrics/reports/organization-1-day\\s+--field\\s+day=2026-07-01$"],
                canonical: "gh api orgs/octo-org/copilot/metrics/reports/organization-1-day --field day=2026-07-01",
                hint: "copilot/metrics/reports/organization-1-day --field day=YYYY-MM-DD",
                explain: "일 단위 metrics report는 특정 날짜의 Copilot 사용량을 추적하고 기간별 추세 분석의 기준점으로 씁니다."
            },
            {
                id: "gh-copilot-15",
                scenario: "Copilot에게 legacy function을 refactor하는 프롬프트를 보냅니다.",
                answers: ["^gh\\s+copilot\\s+suggest\\s+['\"]refactor this legacy function with tests['\"]$"],
                canonical: "gh copilot suggest \"refactor this legacy function with tests\"",
                hint: "작업, 대상, 검증 조건을 함께 적습니다.",
                explain: "좋은 프롬프트는 목표, 제약, 검증 기준, 필요한 컨텍스트를 포함할수록 품질이 좋아집니다."
            },
            {
                id: "gh-copilot-16",
                scenario: "Copilot에게 command injection 위험을 설명하도록 요청합니다.",
                answers: ["^gh\\s+copilot\\s+explain\\s+['\"]command injection risk in shell scripts['\"]$"],
                canonical: "gh copilot explain \"command injection risk in shell scripts\"",
                hint: "copilot explain 뒤에 보안 위험을 자연어로 넣습니다.",
                explain: "Copilot 결과는 검증이 필요하며, 보안·개인정보·저작권·민감정보 입력 제한을 함께 고려해야 합니다."
            },
            {
                id: "gh-copilot-17",
                scenario: "octo-org 조직의 Copilot seat 목록을 dev1 사용자 기준으로 필터링해 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/copilot/billing/seats\\s+--jq\\s+['\"].*dev1.*['\"]$"],
                canonical: "gh api orgs/octo-org/copilot/billing/seats --jq '.seats[] | select(.assignee.login==\"dev1\")'",
                hint: "billing/seats 목록을 받은 뒤 --jq로 assignee.login을 필터링합니다.",
                explain: "관리자는 seat 목록, 정책, 제외 파일, 데이터 처리 범위를 함께 확인해야 합니다."
            }
        ]
    },
    GITHUB_INCIDENTS: {
        label: "Incident Drill",
        questions: [
            {
                id: "gh-inc-01",
                scenario: "CI가 실패했습니다. 먼저 실패 run 98765의 로그를 확인합니다.",
                answers: ["^gh\\s+run\\s+view\\s+98765\\s+--log$"],
                canonical: "gh run view 98765 --log",
                hint: "장애는 로그부터 확인합니다.",
                explain: "Actions 실패는 로그, 실패 step, 사용한 secret, checkout/ref 순서로 좁히는 것이 좋습니다."
            },
            {
                id: "gh-inc-02",
                scenario: "PR 병합이 막혔습니다. required checks 상태를 확인합니다.",
                answers: ["^gh\\s+pr\\s+checks\\s+42$"],
                canonical: "gh pr checks 42",
                hint: "PR 번호는 42입니다.",
                explain: "Branch protection이나 ruleset이 required checks를 강제할 수 있습니다."
            },
            {
                id: "gh-inc-03",
                scenario: "워크플로에서 NPM_TOKEN이 없어 배포가 실패했습니다. Secret을 등록합니다.",
                answers: ["^gh\\s+secret\\s+set\\s+NPM_TOKEN$"],
                canonical: "gh secret set NPM_TOKEN",
                hint: "secret set을 사용합니다.",
                explain: "Secret 누락은 Actions에서 가장 흔한 환경 차이 문제 중 하나입니다."
            },
            {
                id: "gh-inc-04",
                scenario: "dev1이 저장소에 접근할 수 없습니다. 권한을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/collaborators/dev1/permission$"],
                canonical: "gh api repos/souluk319/codedrop/collaborators/dev1/permission",
                hint: "collaborators/dev1/permission",
                explain: "사용자 권한, 팀 권한, 조직 정책을 분리해서 확인해야 합니다."
            },
            {
                id: "gh-inc-05",
                scenario: "Secret scanning이 토큰 유출을 감지했습니다. 알림 목록을 조회합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/secret-scanning/alerts$"],
                canonical: "gh api repos/souluk319/codedrop/secret-scanning/alerts",
                hint: "secret-scanning/alerts",
                explain: "유출 대응은 탐지, 토큰 폐기, 영향 범위 확인, 재발 방지 순서로 진행합니다."
            },
            {
                id: "gh-inc-06",
                scenario: "Dependabot이 critical 취약점을 보고했습니다. 알림 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/dependabot/alerts$"],
                canonical: "gh api repos/souluk319/codedrop/dependabot/alerts",
                hint: "dependabot/alerts",
                explain: "취약 의존성은 severity, affected range, patched version을 보고 업데이트 전략을 정합니다."
            },
            {
                id: "gh-inc-07",
                scenario: "Self-hosted runner가 offline입니다. 조직 runner 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/actions/runners$"],
                canonical: "gh api orgs/octo-org/actions/runners",
                hint: "orgs/<org>/actions/runners",
                explain: "Runner 장애는 라벨, 그룹 권한, 네트워크, 에이전트 상태를 함께 확인합니다."
            },
            {
                id: "gh-inc-08",
                scenario: "Ruleset 때문에 직접 push가 막혔습니다. 저장소 rulesets를 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/rulesets$"],
                canonical: "gh api repos/souluk319/codedrop/rulesets",
                hint: "rulesets",
                explain: "Ruleset 위반은 우회가 아니라 PR/check/review 흐름을 맞추는 방식으로 해결해야 합니다."
            },
            {
                id: "gh-inc-09",
                scenario: "CI가 갑자기 느려졌습니다. Actions cache 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/actions/caches$"],
                canonical: "gh api repos/souluk319/codedrop/actions/caches",
                hint: "actions/caches",
                explain: "Cache 용량, key 충돌, 오래된 cache는 CI 속도와 재현성 문제를 만들 수 있습니다."
            },
            {
                id: "gh-inc-10",
                scenario: "배포 승인이 걸려 진행되지 않습니다. 저장소 environment 설정을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/environments$"],
                canonical: "gh api repos/souluk319/codedrop/environments",
                hint: "environments",
                explain: "Environment protection rule은 승인자, 대기 시간, 브랜치 제한으로 배포를 막을 수 있습니다."
            },
            {
                id: "gh-inc-11",
                scenario: "클라우드 배포 OIDC 인증이 실패했습니다. subject customization을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/actions/oidc/customization/sub$"],
                canonical: "gh api repos/souluk319/codedrop/actions/oidc/customization/sub",
                hint: "actions/oidc/customization/sub",
                explain: "OIDC subject claim이 클라우드 trust policy와 맞지 않으면 토큰 교환이 실패합니다."
            },
            {
                id: "gh-inc-12",
                scenario: "SSO 이후 토큰 접근이 실패합니다. credential authorization을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/credential-authorizations$"],
                canonical: "gh api orgs/octo-org/credential-authorizations",
                hint: "credential-authorizations",
                explain: "SAML SSO 조직에서는 PAT/SSH key가 승인되지 않으면 API 접근이 막힐 수 있습니다."
            }
        ]
    }
};

const GITHUB_EXAM_BLUEPRINT = {
    GH_FOUNDATIONS: 6,
    GH_ACTIONS: 7,
    GH_SECURITY: 6,
    GH_ADMIN: 6,
    GH_COPILOT: 5
};

const GITHUB_MOCK_LABS = [
    {
        id: "gh-lab-01",
        title: "PR 기반 협업 루틴",
        goal: "브랜치 생성부터 PR 생성, 체크 확인, 병합까지 GitHub 기본 협업 흐름을 반복합니다.",
        steps: [
            {
                id: "gh-lab-01-01",
                scenario: "작업 브랜치 feat/codedrop-dev를 생성하고 이동합니다.",
                answers: ["^git\\s+(switch\\s+-c|checkout\\s+-b)\\s+feat/codedrop-dev$"],
                canonical: "git switch -c feat/codedrop-dev",
                hint: "switch -c 또는 checkout -b",
                explain: "작업은 main에서 직접 하지 않고 브랜치로 분리합니다."
            },
            {
                id: "gh-lab-01-02",
                scenario: "변경사항을 스테이징합니다.",
                answers: ["^git\\s+add\\s+\\.$"],
                canonical: "git add .",
                hint: "전체 변경사항을 스테이징합니다.",
                explain: "커밋 전 어떤 변경을 포함할지 스테이징으로 정합니다."
            },
            {
                id: "gh-lab-01-03",
                scenario: "메시지 'polish codedrop dev'로 커밋합니다.",
                answers: ["^git\\s+commit\\s+-m\\s+['\"]polish codedrop dev['\"]$"],
                canonical: "git commit -m \"polish codedrop dev\"",
                hint: "commit -m",
                explain: "커밋 메시지는 변경 의도를 짧게 설명해야 합니다."
            },
            {
                id: "gh-lab-01-04",
                scenario: "main 대상으로 PR을 생성합니다.",
                answers: ["^gh\\s+pr\\s+create\\s+.*--base\\s+main.*$"],
                canonical: "gh pr create --title \"polish codedrop dev\" --body \"updates GitHub Edition UX\" --base main",
                hint: "gh pr create --base main",
                explain: "PR은 리뷰와 CI를 거쳐 main에 합류하는 관문입니다."
            },
            {
                id: "gh-lab-01-05",
                scenario: "PR 42의 체크 상태를 확인합니다.",
                answers: ["^gh\\s+pr\\s+checks\\s+42$"],
                canonical: "gh pr checks 42",
                hint: "pr checks <number>",
                explain: "Required checks가 통과해야 병합 가능한 정책이 흔합니다."
            },
            {
                id: "gh-lab-01-06",
                scenario: "PR 42를 squash 방식으로 병합하고 브랜치를 삭제합니다.",
                answers: ["^gh\\s+pr\\s+merge\\s+42\\s+--squash\\s+--delete-branch$"],
                canonical: "gh pr merge 42 --squash --delete-branch",
                hint: "pr merge 42 --squash --delete-branch",
                explain: "작업 브랜치 정리는 저장소 히스토리를 깔끔하게 유지합니다."
            }
        ]
    },
    {
        id: "gh-lab-02",
        title: "Actions 장애 대응",
        goal: "실패한 GitHub Actions run을 찾아 로그를 보고 원인을 조치한 뒤 재실행합니다.",
        steps: [
            {
                id: "gh-lab-02-01",
                scenario: "최근 Actions 실행 목록을 확인합니다.",
                answers: ["^gh\\s+run\\s+list$"],
                canonical: "gh run list",
                hint: "run list",
                explain: "실패한 실행 ID를 찾는 첫 단계입니다."
            },
            {
                id: "gh-lab-02-02",
                scenario: "run id 98765의 로그를 확인합니다.",
                answers: ["^gh\\s+run\\s+view\\s+98765\\s+--log$"],
                canonical: "gh run view 98765 --log",
                hint: "run view <id> --log",
                explain: "실패한 step과 에러 메시지를 확인합니다."
            },
            {
                id: "gh-lab-02-03",
                scenario: "NPM_TOKEN secret을 등록합니다.",
                answers: ["^gh\\s+secret\\s+set\\s+NPM_TOKEN$"],
                canonical: "gh secret set NPM_TOKEN",
                hint: "secret set",
                explain: "배포 토큰 같은 민감값은 Secret으로 주입합니다."
            },
            {
                id: "gh-lab-02-04",
                scenario: "NODE_ENV 변수를 production으로 등록합니다.",
                answers: ["^gh\\s+variable\\s+set\\s+NODE_ENV\\s+--body\\s+production$"],
                canonical: "gh variable set NODE_ENV --body production",
                hint: "variable set NODE_ENV --body production",
                explain: "Secret이 아닌 설정값은 variable로 분리할 수 있습니다."
            },
            {
                id: "gh-lab-02-05",
                scenario: "run id 98765를 재실행합니다.",
                answers: ["^gh\\s+run\\s+rerun\\s+98765$"],
                canonical: "gh run rerun 98765",
                hint: "run rerun <id>",
                explain: "원인 조치 후 같은 실행을 다시 돌려 검증합니다."
            }
        ]
    },
    {
        id: "gh-lab-03",
        title: "보안 알림 점검",
        goal: "Code scanning, Secret scanning, Dependabot, SBOM을 CLI/API로 확인합니다.",
        steps: [
            {
                id: "gh-lab-03-01",
                scenario: "Code scanning alert 목록을 조회합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/code-scanning/alerts$"],
                canonical: "gh api repos/souluk319/codedrop/code-scanning/alerts",
                hint: "code-scanning/alerts",
                explain: "코드 취약점 분석 결과는 code scanning alert로 관리됩니다."
            },
            {
                id: "gh-lab-03-02",
                scenario: "Secret scanning alert 목록을 조회합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/secret-scanning/alerts$"],
                canonical: "gh api repos/souluk319/codedrop/secret-scanning/alerts",
                hint: "secret-scanning/alerts",
                explain: "유출 토큰 탐지는 실제 운영에서 즉시 대응해야 하는 영역입니다."
            },
            {
                id: "gh-lab-03-03",
                scenario: "Dependabot alert 목록을 조회합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/dependabot/alerts$"],
                canonical: "gh api repos/souluk319/codedrop/dependabot/alerts",
                hint: "dependabot/alerts",
                explain: "의존성 취약점은 업데이트 PR과 릴리스 노트 검토로 이어집니다."
            },
            {
                id: "gh-lab-03-04",
                scenario: "SBOM을 조회합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/dependency-graph/sbom$"],
                canonical: "gh api repos/souluk319/codedrop/dependency-graph/sbom",
                hint: "dependency-graph/sbom",
                explain: "공급망 보안은 의존성 목록과 출처 파악에서 출발합니다."
            },
            {
                id: "gh-lab-03-05",
                scenario: "CodeQL 데이터베이스를 생성합니다.",
                answers: ["^codeql\\s+database\\s+create\\s+codeql-db$"],
                canonical: "codeql database create codeql-db",
                hint: "codeql database create codeql-db",
                explain: "CodeQL 로컬 분석은 데이터베이스 생성과 분석의 두 단계로 진행됩니다."
            }
        ]
    },
    {
        id: "gh-lab-04",
        title: "조직 관리 점검",
        goal: "팀, 멤버, 외부 협업자, 권한, audit log를 순서대로 확인합니다.",
        steps: [
            {
                id: "gh-lab-04-01",
                scenario: "조직 팀 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/teams$"],
                canonical: "gh api orgs/octo-org/teams",
                hint: "orgs/octo-org/teams",
                explain: "권한은 개인이 아니라 팀 단위로 설계하는 것이 관리하기 쉽습니다."
            },
            {
                id: "gh-lab-04-02",
                scenario: "조직 멤버 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/members$"],
                canonical: "gh api orgs/octo-org/members",
                hint: "orgs/octo-org/members",
                explain: "멤버십 인벤토리는 보안 검토의 시작점입니다."
            },
            {
                id: "gh-lab-04-03",
                scenario: "외부 협업자 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/outside_collaborators$"],
                canonical: "gh api orgs/octo-org/outside_collaborators",
                hint: "outside_collaborators",
                explain: "외부 협업자는 접근 범위와 만료 정책을 특히 신경써야 합니다."
            },
            {
                id: "gh-lab-04-04",
                scenario: "dev1의 저장소 권한을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/collaborators/dev1/permission$"],
                canonical: "gh api repos/souluk319/codedrop/collaborators/dev1/permission",
                hint: "collaborators/dev1/permission",
                explain: "접근 장애는 사용자 권한과 팀 권한을 함께 추적합니다."
            },
            {
                id: "gh-lab-04-05",
                scenario: "조직 audit log를 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/audit-log$"],
                canonical: "gh api orgs/octo-org/audit-log",
                hint: "audit-log",
                explain: "관리 이벤트는 나중에 되짚을 수 있어야 운영이 안전합니다."
            }
        ]
    },
    {
        id: "gh-lab-05",
        title: "Ruleset과 Runner 운영",
        goal: "Rulesets, self-hosted runners, runner groups를 확인합니다.",
        steps: [
            {
                id: "gh-lab-05-01",
                scenario: "저장소 rulesets를 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/rulesets$"],
                canonical: "gh api repos/souluk319/codedrop/rulesets",
                hint: "repos/souluk319/codedrop/rulesets",
                explain: "Rulesets는 직접 push, required review, required status check 같은 정책을 강제합니다."
            },
            {
                id: "gh-lab-05-02",
                scenario: "조직 runner 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/actions/runners$"],
                canonical: "gh api orgs/octo-org/actions/runners",
                hint: "actions/runners",
                explain: "Runner 상태는 CI 장애의 주요 원인입니다."
            },
            {
                id: "gh-lab-05-03",
                scenario: "runner group 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/actions/runner-groups$"],
                canonical: "gh api orgs/octo-org/actions/runner-groups",
                hint: "actions/runner-groups",
                explain: "Runner group은 저장소별 실행 권한을 제한합니다."
            },
            {
                id: "gh-lab-05-04",
                scenario: "조직 저장소 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/repos$"],
                canonical: "gh api orgs/octo-org/repos",
                hint: "orgs/octo-org/repos",
                explain: "정책 적용 범위를 확인하려면 저장소 인벤토리가 필요합니다."
            }
        ]
    },
    {
        id: "gh-lab-06",
        title: "Copilot 운영 점검",
        goal: "Copilot CLI와 조직 seat/usage API를 확인합니다.",
        steps: [
            {
                id: "gh-lab-06-01",
                scenario: "Copilot CLI 확장을 설치합니다.",
                answers: ["^gh\\s+extension\\s+install\\s+github/gh-copilot$"],
                canonical: "gh extension install github/gh-copilot",
                hint: "extension install github/gh-copilot",
                explain: "Copilot CLI는 GitHub CLI 확장 형태입니다."
            },
            {
                id: "gh-lab-06-02",
                scenario: "git rebase 명령을 Copilot에게 설명받습니다.",
                answers: ["^gh\\s+copilot\\s+explain\\s+['\"]git rebase['\"]$"],
                canonical: "gh copilot explain \"git rebase\"",
                hint: "copilot explain",
                explain: "명령 설명을 빠르게 얻을 수 있지만 결과 검증은 사용자의 책임입니다."
            },
            {
                id: "gh-lab-06-03",
                scenario: "릴리스 체크리스트를 Copilot에게 제안받습니다.",
                answers: ["^gh\\s+copilot\\s+suggest\\s+['\"]write a release checklist['\"]$"],
                canonical: "gh copilot suggest \"write a release checklist\"",
                hint: "copilot suggest",
                explain: "자연어를 작업 초안으로 바꾸는 Copilot의 대표 사용 흐름입니다."
            },
            {
                id: "gh-lab-06-04",
                scenario: "Copilot seat 정보를 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/copilot/billing/seats$"],
                canonical: "gh api orgs/octo-org/copilot/billing/seats",
                hint: "copilot/billing/seats",
                explain: "조직에서는 seat 할당과 비용 관리가 중요합니다."
            },
            {
                id: "gh-lab-06-05",
                scenario: "최신 28일 Copilot usage metrics report 링크를 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/copilot/metrics/reports/organization-28-day/latest$"],
                canonical: "gh api orgs/octo-org/copilot/metrics/reports/organization-28-day/latest",
                hint: "copilot/metrics/reports/organization-28-day/latest",
                explain: "사용량 report는 도입 효과와 정책 점검에 쓰입니다."
            }
        ]
    },
    {
        id: "gh-lab-07",
        title: "Actions 보안 경계 점검",
        goal: "workflow 권한, environment, OIDC, cache, code scanning 기본 설정을 점검합니다.",
        steps: [
            {
                id: "gh-lab-07-01",
                scenario: "조직 Actions 허용 정책을 확인합니다.",
                answers: ["^gh\\s+api\\s+orgs/octo-org/actions/permissions$"],
                canonical: "gh api orgs/octo-org/actions/permissions",
                hint: "orgs/octo-org/actions/permissions",
                explain: "조직 정책은 어떤 Actions 사용을 허용할지 결정합니다."
            },
            {
                id: "gh-lab-07-02",
                scenario: "저장소 workflow 권한 설정을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/actions/permissions/workflow$"],
                canonical: "gh api repos/souluk319/codedrop/actions/permissions/workflow",
                hint: "actions/permissions/workflow",
                explain: "GITHUB_TOKEN 권한은 워크플로가 저장소에 무엇을 쓸 수 있는지 제한합니다."
            },
            {
                id: "gh-lab-07-03",
                scenario: "배포 environment 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/environments$"],
                canonical: "gh api repos/souluk319/codedrop/environments",
                hint: "environments",
                explain: "Environment는 배포 승인과 환경별 secret을 묶는 단위입니다."
            },
            {
                id: "gh-lab-07-04",
                scenario: "OIDC subject customization을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/actions/oidc/customization/sub$"],
                canonical: "gh api repos/souluk319/codedrop/actions/oidc/customization/sub",
                hint: "actions/oidc/customization/sub",
                explain: "OIDC subject는 클라우드 trust policy와 맞아야 합니다."
            },
            {
                id: "gh-lab-07-05",
                scenario: "Actions cache 목록을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/actions/caches$"],
                canonical: "gh api repos/souluk319/codedrop/actions/caches",
                hint: "actions/caches",
                explain: "Cache는 속도 개선과 장애 원인 양쪽이 될 수 있습니다."
            },
            {
                id: "gh-lab-07-06",
                scenario: "Code scanning default setup을 확인합니다.",
                answers: ["^gh\\s+api\\s+repos/souluk319/codedrop/code-scanning/default-setup$"],
                canonical: "gh api repos/souluk319/codedrop/code-scanning/default-setup",
                hint: "code-scanning/default-setup",
                explain: "Default setup이 켜져 있어야 표준 CodeQL 분석이 자동으로 돌아갑니다."
            }
        ]
    }
];

const GITHUB_LESSON_TRACKS = [
    {
        id: "gh-track-foundations",
        title: "1단계 Git/PR 실무 기본",
        subtitle: "clone, branch, commit, push, PR, 보호 규칙",
        lessons: [
            {
                id: "gh-lesson-git-core",
                title: "1. Git 기본 작업 루틴",
                intro: "가장 먼저 익혀야 할 흐름은 저장소를 받고, 상태를 보고, 브랜치를 나누고, 커밋을 원격으로 올리는 일입니다.",
                categories: ["Foundations"],
                quizFrom: "GH_FOUNDATIONS",
                quizIds: ["gh-found-02", "gh-found-04", "gh-found-06", "gh-found-13", "gh-found-17"],
                quizCount: 5,
                steps: [
                    { id: "gh-ls-01", cmd: "git clone https://github.com/souluk319/codedrop.git", desc: "원격 저장소를 로컬로 복제합니다.", output: "Cloning into 'codedrop'...", explain: "대부분의 GitHub 실무는 저장소를 받고 로컬 작업 환경을 만드는 데서 시작합니다.", scaffold: "git clone https://github.com/souluk319/codedrop.git" },
                    { id: "gh-ls-02", cmd: "git status", desc: "작업 트리 상태를 확인합니다.", output: "On branch main\nnothing to commit, working tree clean", explain: "수정 전후 상태 확인은 실수 방지의 가장 기본적인 습관입니다.", scaffold: "git status" },
                    { id: "gh-ls-03", cmd: "git switch -c feat/codedrop-dev", desc: "작업 브랜치를 생성합니다.", output: "Switched to a new branch 'feat/codedrop-dev'", explain: "작업 단위는 main이 아니라 브랜치로 분리합니다.", scaffold: "git switch -c feat/codedrop-dev" },
                    { id: "gh-ls-04", cmd: "git add .", desc: "변경사항을 스테이징합니다.", output: "changes staged", explain: "커밋에 포함할 변경을 명시적으로 고르는 단계입니다.", scaffold: "git add ." },
                    { id: "gh-ls-04a", cmd: "git commit -m \"polish codedrop dev\"", desc: "작업 내용을 커밋합니다.", output: "[feat/codedrop-dev abc123] polish codedrop dev", explain: "작고 설명 가능한 커밋은 리뷰와 롤백을 쉽게 만듭니다.", scaffold: "git commit -m \"polish codedrop dev\"" },
                    { id: "gh-ls-04b", cmd: "git push -u origin feat/codedrop-dev", desc: "브랜치를 원격으로 올립니다.", output: "branch 'feat/codedrop-dev' set up to track 'origin/feat/codedrop-dev'", explain: "원격 브랜치가 있어야 PR 생성과 CI 실행으로 이어집니다.", scaffold: "git push -u origin feat/codedrop-dev" }
                ]
            },
            {
                id: "gh-lesson-pr-review",
                title: "2. PR 리뷰와 체크",
                intro: "다음 우선순위는 PR을 열고, CI 상태를 확인하고, 리뷰와 병합까지 이어지는 협업 루틴입니다.",
                categories: ["Foundations"],
                quizFrom: "GH_FOUNDATIONS",
                quizIds: ["gh-found-05", "gh-found-06", "gh-found-07", "gh-found-08", "gh-found-13"],
                quizCount: 5,
                steps: [
                    { id: "gh-ls-05", cmd: "gh issue list --label bug", desc: "버그 이슈를 먼저 확인합니다.", output: "12  codedrop polish  bug", explain: "작업 전 이슈와 우선순위를 확인하면 중복 작업을 줄일 수 있습니다.", scaffold: "gh issue list --label bug" },
                    { id: "gh-ls-06", cmd: "gh pr create --title \"polish codedrop UX\" --body \"align mobile panels\" --base main", desc: "PR을 생성합니다.", output: "https://github.com/souluk319/codedrop/pull/42", explain: "PR은 리뷰와 자동 검사를 묶는 관문입니다.", scaffold: "gh pr create --title \"polish codedrop UX\" --body \"align mobile panels\" --base main" },
                    { id: "gh-ls-07", cmd: "gh pr checks 42", desc: "PR의 CI 체크 상태를 확인합니다.", output: "build pass\nlint pass", explain: "Required checks가 실패하면 병합이 막히므로 먼저 확인합니다.", scaffold: "gh pr checks 42" },
                    { id: "gh-ls-08", cmd: "gh pr checkout 42", desc: "리뷰 대상 PR을 로컬로 가져옵니다.", output: "Switched to branch 'contributor/feat/codedrop-dev'", explain: "리뷰나 재현이 필요할 때 PR 브랜치를 직접 체크아웃합니다.", scaffold: "gh pr checkout 42" },
                    { id: "gh-ls-09", cmd: "gh pr review 42 --approve", desc: "PR을 승인 리뷰합니다.", output: "✓ Approved pull request", explain: "승인 리뷰는 병합 정책의 조건이 될 수 있습니다.", scaffold: "gh pr review 42 --approve" },
                    { id: "gh-ls-09a", cmd: "gh pr merge 42 --squash --delete-branch", desc: "PR을 병합합니다.", output: "✓ Merged pull request #42", explain: "Squash merge와 브랜치 삭제로 히스토리를 정리합니다.", scaffold: "gh pr merge 42 --squash --delete-branch" }
                ]
            },
            {
                id: "gh-lesson-repo-guardrails",
                title: "3. 저장소 기준과 보호 규칙",
                intro: "PR 흐름 다음에는 저장소 기본 정보, 브랜치 보호, ruleset, 릴리스 노트를 확인하는 운영 기준을 익힙니다.",
                categories: ["Foundations"],
                quizFrom: "GH_FOUNDATIONS",
                quizIds: ["gh-found-09", "gh-found-11", "gh-found-14", "gh-found-17", "gh-found-18"],
                quizCount: 5,
                steps: [
                    { id: "gh-ls-10", cmd: "gh repo view souluk319/codedrop", desc: "저장소 기본 정보를 확인합니다.", output: "name: souluk319/codedrop\nvisibility: public", explain: "visibility와 default branch는 협업·보안 판단의 기본 정보입니다.", scaffold: "gh repo view souluk319/codedrop" },
                    { id: "gh-ls-11", cmd: "gh api repos/souluk319/codedrop/community/profile", desc: "커뮤니티 프로필을 확인합니다.", output: "{\"health_percentage\":75}", explain: "README, LICENSE, CONTRIBUTING, CODEOWNERS, SECURITY 같은 기본 파일 상태를 봅니다.", scaffold: "gh api repos/souluk319/codedrop/community/profile" },
                    { id: "gh-ls-12", cmd: "gh api repos/souluk319/codedrop/branches/main/protection", desc: "main 브랜치 보호 설정을 확인합니다.", output: "{\"required_status_checks\":{}}", explain: "브랜치 보호는 리뷰, required checks, force push 제한의 중심입니다.", scaffold: "gh api repos/souluk319/codedrop/branches/main/protection" },
                    { id: "gh-ls-13", cmd: "gh api repos/souluk319/codedrop/rulesets", desc: "저장소 rulesets를 확인합니다.", output: "[{\"name\":\"main protection\"}]", explain: "Ruleset은 저장소 정책을 명시적으로 적용하는 최신 운영 단위입니다.", scaffold: "gh api repos/souluk319/codedrop/rulesets" },
                    { id: "gh-ls-14", cmd: "gh release create v1.0.0 --generate-notes", desc: "자동 릴리스 노트와 함께 릴리스를 생성합니다.", output: "✓ Created release v1.0.0", explain: "릴리스 노트는 배포 변경사항을 팀과 사용자에게 전달하는 실무 기록입니다.", scaffold: "gh release create v1.0.0 --generate-notes" }
                ]
            }
        ]
    },
    {
        id: "gh-track-actions",
        title: "2단계 GitHub Actions 운영",
        subtitle: "워크플로 실행, 로그, Secret, artifact",
        lessons: [
            {
                id: "gh-lesson-actions-basic",
                title: "4. Actions YAML과 실행",
                intro: "Actions 워크플로는 파일 위치, 수동 실행, run 목록, 로그 조회 흐름이 기본입니다.",
                categories: ["Actions"],
                quizFrom: "GH_ACTIONS",
                quizIds: ["gh-act-01", "gh-act-02", "gh-act-03", "gh-act-04", "gh-act-05"],
                quizCount: 5,
                steps: [
                    { id: "gh-ls-15", cmd: "mkdir -p .github/workflows", desc: "워크플로 디렉터리를 만듭니다.", output: ".github/workflows ready", explain: "Actions YAML은 이 경로에 둡니다.", scaffold: "mkdir -p .github/workflows" },
                    { id: "gh-ls-16", cmd: "gh workflow list", desc: "워크플로 목록을 확인합니다.", output: "ci.yml active", explain: "활성화된 워크플로와 파일명을 파악합니다.", scaffold: "gh workflow list" },
                    { id: "gh-ls-17", cmd: "gh workflow run ci.yml", desc: "CI 워크플로를 수동 실행합니다.", output: "✓ Created workflow_dispatch event", explain: "수동 실행은 재현과 점검에 유용합니다.", scaffold: "gh workflow run ci.yml" },
                    { id: "gh-ls-18", cmd: "gh run list", desc: "Actions 실행 목록을 확인합니다.", output: "completed failure ci.yml 98765", explain: "실패 run id를 찾습니다.", scaffold: "gh run list" },
                    { id: "gh-ls-19", cmd: "gh run view 123456 --log", desc: "실패 로그를 확인합니다.", output: "Error: missing NPM_TOKEN", explain: "로그는 장애 진단의 출발점입니다.", scaffold: "gh run view 123456 --log" }
                ]
            },
            {
                id: "gh-lesson-actions-ops",
                title: "5. Secret과 실패 대응",
                intro: "Secret, variable, artifact, rerun/cancel/watch를 반복합니다.",
                categories: ["Actions"],
                quizFrom: "GH_ACTIONS",
                quizIds: ["gh-act-06", "gh-act-07", "gh-act-08", "gh-act-09", "gh-act-10", "gh-act-11"],
                quizCount: 5,
                steps: [
                    { id: "gh-ls-20", cmd: "gh secret set NPM_TOKEN", desc: "누락된 Secret을 등록합니다.", output: "✓ Set secret NPM_TOKEN", explain: "Secret은 노출 없이 워크플로에 값을 전달합니다.", scaffold: "gh secret set NPM_TOKEN" },
                    { id: "gh-ls-21", cmd: "gh variable set NODE_ENV --body production", desc: "Actions variable을 등록합니다.", output: "✓ Set variable NODE_ENV", explain: "민감하지 않은 설정은 variable로 분리합니다.", scaffold: "gh variable set NODE_ENV --body production" },
                    { id: "gh-ls-22", cmd: "gh run rerun 123456", desc: "실패 run을 재실행합니다.", output: "✓ Requested rerun", explain: "조치 후 같은 run으로 검증합니다.", scaffold: "gh run rerun 123456" },
                    { id: "gh-ls-23", cmd: "gh run watch 123456", desc: "run 완료를 기다립니다.", output: "✓ Run completed", explain: "터미널에서 CI 상태를 계속 확인할 수 있습니다.", scaffold: "gh run watch 123456" },
                    { id: "gh-ls-24", cmd: "gh run download 123456 --name build-artifact", desc: "artifact를 내려받습니다.", output: "Downloaded build-artifact", explain: "빌드 산출물과 리포트를 확인합니다.", scaffold: "gh run download 123456 --name build-artifact" }
                ]
            },
            {
                id: "gh-lesson-actions-security",
                title: "6. Actions 보안 경계",
                intro: "재사용 워크플로, GITHUB_TOKEN 권한, environment, OIDC, cache를 운영 관점에서 점검합니다.",
                categories: ["Actions"],
                quizFrom: "GH_ACTIONS",
                quizIds: ["gh-act-12", "gh-act-13", "gh-act-14", "gh-act-15", "gh-act-16"],
                quizCount: 5,
                steps: [
                    { id: "gh-ls-43", cmd: "gh workflow view reusable.yml --yaml", desc: "재사용 워크플로 계약을 확인합니다.", output: "on:\n  workflow_call:", explain: "workflow_call이 있어야 다른 워크플로에서 호출할 수 있습니다.", scaffold: "gh workflow view reusable.yml --yaml" },
                    { id: "gh-ls-44", cmd: "gh api repos/souluk319/codedrop/actions/permissions/workflow", desc: "workflow 권한을 확인합니다.", output: "{\"default_workflow_permissions\":\"read\"}", explain: "기본 권한은 최소 권한 원칙으로 점검합니다.", scaffold: "gh api repos/souluk319/codedrop/actions/permissions/workflow" },
                    { id: "gh-ls-45", cmd: "gh api repos/souluk319/codedrop/environments", desc: "environment를 확인합니다.", output: "{\"environments\":[{\"name\":\"production\"}]}", explain: "보호된 배포 환경은 승인을 요구할 수 있습니다.", scaffold: "gh api repos/souluk319/codedrop/environments" },
                    { id: "gh-ls-46", cmd: "gh api repos/souluk319/codedrop/actions/oidc/customization/sub", desc: "OIDC subject 설정을 확인합니다.", output: "{\"use_default\":false}", explain: "OIDC claim은 외부 클라우드 권한과 직접 연결됩니다.", scaffold: "gh api repos/souluk319/codedrop/actions/oidc/customization/sub" },
                    { id: "gh-ls-47", cmd: "gh api repos/souluk319/codedrop/actions/caches", desc: "Actions cache를 확인합니다.", output: "{\"actions_caches\":[]}", explain: "Cache 상태는 CI 성능과 장애 재현성을 좌우합니다.", scaffold: "gh api repos/souluk319/codedrop/actions/caches" }
                ]
            }
        ]
    },
    {
        id: "gh-track-security-admin",
        title: "3단계 보안과 조직 운영",
        subtitle: "GHAS 알림, 조직 관리, rulesets",
        lessons: [
            {
                id: "gh-lesson-ghas",
                title: "7. 보안 알림 triage",
                intro: "Code scanning, Secret scanning, Dependabot, SBOM, CodeQL을 구분합니다.",
                categories: ["Advanced Security"],
                quizFrom: "GH_SECURITY",
                quizIds: ["gh-sec-01", "gh-sec-02", "gh-sec-03", "gh-sec-04", "gh-sec-06", "gh-sec-07"],
                quizCount: 5,
                steps: [
                    { id: "gh-ls-25", cmd: "gh api repos/souluk319/codedrop/code-scanning/alerts", desc: "Code scanning alert를 조회합니다.", output: "[{\"rule\":\"js/sql-injection\"}]", explain: "코드 분석 기반 보안 알림입니다.", scaffold: "gh api repos/souluk319/codedrop/code-scanning/alerts" },
                    { id: "gh-ls-26", cmd: "gh api repos/souluk319/codedrop/secret-scanning/alerts", desc: "Secret scanning alert를 조회합니다.", output: "[{\"secret_type\":\"github_token\"}]", explain: "유출된 토큰 탐지 알림입니다.", scaffold: "gh api repos/souluk319/codedrop/secret-scanning/alerts" },
                    { id: "gh-ls-27", cmd: "gh api repos/souluk319/codedrop/dependabot/alerts", desc: "Dependabot alert를 조회합니다.", output: "[{\"dependency\":\"lodash\"}]", explain: "의존성 취약점 알림입니다.", scaffold: "gh api repos/souluk319/codedrop/dependabot/alerts" },
                    { id: "gh-ls-28", cmd: "gh api repos/souluk319/codedrop/dependency-graph/sbom", desc: "SBOM을 확인합니다.", output: "{\"sbom\":{\"packages\":[]}}", explain: "공급망 분석의 근거 자료입니다.", scaffold: "gh api repos/souluk319/codedrop/dependency-graph/sbom" },
                    { id: "gh-ls-29", cmd: "codeql database create codeql-db", desc: "CodeQL DB를 만듭니다.", output: "Successfully created database", explain: "로컬 CodeQL 분석의 준비 단계입니다.", scaffold: "codeql database create codeql-db" },
                    { id: "gh-ls-30", cmd: "codeql database analyze codeql-db codeql/javascript-queries", desc: "CodeQL 분석을 실행합니다.", output: "Analysis complete", explain: "쿼리 팩으로 취약 패턴을 분석합니다.", scaffold: "codeql database analyze codeql-db codeql/javascript-queries" }
                ]
            },
            {
                id: "gh-lesson-admin",
                title: "8. 조직 권한과 저장소 정책",
                intro: "팀, 멤버, 외부 협업자, rulesets, runner group을 점검합니다.",
                categories: ["Administration"],
                quizFrom: "GH_ADMIN",
                quizIds: ["gh-admin-01", "gh-admin-02", "gh-admin-03", "gh-admin-04", "gh-admin-06", "gh-admin-08"],
                quizCount: 5,
                steps: [
                    { id: "gh-ls-31", cmd: "gh api orgs/octo-org/teams", desc: "팀 목록을 조회합니다.", output: "[{\"name\":\"platform\"}]", explain: "팀 기반 권한 관리의 출발점입니다.", scaffold: "gh api orgs/octo-org/teams" },
                    { id: "gh-ls-32", cmd: "gh api orgs/octo-org/members", desc: "멤버 목록을 조회합니다.", output: "[{\"login\":\"dev1\"}]", explain: "조직 구성원을 먼저 파악합니다.", scaffold: "gh api orgs/octo-org/members" },
                    { id: "gh-ls-33", cmd: "gh api orgs/octo-org/outside_collaborators", desc: "외부 협업자를 확인합니다.", output: "[{\"login\":\"contractor1\"}]", explain: "외부 접근은 주기적으로 검토해야 합니다.", scaffold: "gh api orgs/octo-org/outside_collaborators" },
                    { id: "gh-ls-34", cmd: "gh api repos/souluk319/codedrop/rulesets", desc: "저장소 rulesets를 조회합니다.", output: "[{\"name\":\"main protection\"}]", explain: "규칙 기반 보호 정책을 확인합니다.", scaffold: "gh api repos/souluk319/codedrop/rulesets" },
                    { id: "gh-ls-35", cmd: "gh api orgs/octo-org/actions/runner-groups", desc: "runner group을 확인합니다.", output: "[{\"name\":\"prod-runners\"}]", explain: "runner 접근 제어는 Actions 보안의 핵심입니다.", scaffold: "gh api orgs/octo-org/actions/runner-groups" },
                    { id: "gh-ls-36", cmd: "gh api orgs/octo-org/audit-log", desc: "audit log를 확인합니다.", output: "[{\"action\":\"repo.add_member\"}]", explain: "변경 이력 추적은 조직 관리의 안전망입니다.", scaffold: "gh api orgs/octo-org/audit-log" }
                ]
            },
            {
                id: "gh-lesson-admin-policy",
                title: "9. 감사와 조직 정책",
                intro: "SSO credential, Actions 정책, custom properties, audit log, 조직 rulesets를 점검합니다.",
                categories: ["Administration"],
                quizFrom: "GH_ADMIN",
                quizIds: ["gh-admin-11", "gh-admin-12", "gh-admin-13", "gh-admin-14", "gh-admin-15"],
                quizCount: 5,
                steps: [
                    { id: "gh-ls-48", cmd: "gh api orgs/octo-org/credential-authorizations", desc: "SSO credential authorization을 확인합니다.", output: "[{\"login\":\"dev1\"}]", explain: "SAML SSO 조직에서는 토큰 권한 승인 상태가 중요합니다.", scaffold: "gh api orgs/octo-org/credential-authorizations" },
                    { id: "gh-ls-49", cmd: "gh api orgs/octo-org/actions/permissions", desc: "조직 Actions 정책을 조회합니다.", output: "{\"enabled_repositories\":\"selected\"}", explain: "어떤 저장소가 Actions를 사용할 수 있는지 확인합니다.", scaffold: "gh api orgs/octo-org/actions/permissions" },
                    { id: "gh-ls-50", cmd: "gh api orgs/octo-org/properties/schema", desc: "custom properties schema를 조회합니다.", output: "[{\"property_name\":\"service-tier\"}]", explain: "저장소 분류 메타데이터는 정책 적용과 검색에 쓰입니다.", scaffold: "gh api orgs/octo-org/properties/schema" },
                    { id: "gh-ls-51", cmd: "gh api orgs/octo-org/audit-log --field phrase=repo.add_member", desc: "특정 audit 이벤트를 검색합니다.", output: "[{\"action\":\"repo.add_member\"}]", explain: "phrase 검색으로 필요한 보안 이벤트만 좁힙니다.", scaffold: "gh api orgs/octo-org/audit-log --field phrase=repo.add_member" },
                    { id: "gh-ls-52", cmd: "gh api orgs/octo-org/rulesets", desc: "조직 rulesets를 조회합니다.", output: "[{\"name\":\"all repos protection\"}]", explain: "조직 rulesets는 공통 보호 정책을 여러 저장소에 적용합니다.", scaffold: "gh api orgs/octo-org/rulesets" }
                ]
            }
        ]
    },
    {
        id: "gh-track-copilot",
        title: "4단계 Copilot 운영",
        subtitle: "CLI 사용, 책임 있는 사용, seat/usage 관리",
        lessons: [
            {
                id: "gh-lesson-copilot-cli",
                title: "10. Copilot 운영과 사용량",
                intro: "Copilot은 제안/설명/조직 seat/usage/정책 이해가 핵심입니다.",
                categories: ["Copilot"],
                quizFrom: "GH_COPILOT",
                quizIds: ["gh-copilot-01", "gh-copilot-03", "gh-copilot-04", "gh-copilot-09", "gh-copilot-10", "gh-copilot-12"],
                quizCount: 5,
                steps: [
                    { id: "gh-ls-37", cmd: "gh extension install github/gh-copilot", desc: "Copilot CLI 확장을 설치합니다.", output: "✓ Installed extension github/gh-copilot", explain: "CLI 환경에서 Copilot 제안과 설명을 사용합니다.", scaffold: "gh extension install github/gh-copilot" },
                    { id: "gh-ls-38", cmd: "gh extension list", desc: "설치된 확장을 확인합니다.", output: "github/gh-copilot", explain: "확장 상태 확인은 문제 진단에 필요합니다.", scaffold: "gh extension list" },
                    { id: "gh-ls-39", cmd: "gh copilot explain \"git rebase\"", desc: "명령 설명을 Copilot에게 받습니다.", output: "git rebase reapplies commits...", explain: "Copilot은 학습 보조와 생산성 보조로 쓰되 검증 책임은 사용자에게 있습니다.", scaffold: "gh copilot explain \"git rebase\"" },
                    { id: "gh-ls-40", cmd: "gh copilot suggest \"write a release checklist\"", desc: "작업 초안을 제안받습니다.", output: "Suggested command...", explain: "자연어를 작업 절차 초안으로 바꿉니다.", scaffold: "gh copilot suggest \"write a release checklist\"" },
                    { id: "gh-ls-41", cmd: "gh api orgs/octo-org/copilot/billing/seats", desc: "Copilot seat를 확인합니다.", output: "[{\"assignee\":\"dev1\"}]", explain: "조직 도입에서는 seat와 비용 관리가 중요합니다.", scaffold: "gh api orgs/octo-org/copilot/billing/seats" },
                    { id: "gh-ls-42", cmd: "gh api orgs/octo-org/copilot/metrics/reports/organization-28-day/latest", desc: "Copilot usage report를 확인합니다.", output: "{\"download_links\":[\"https://example.com/copilot-usage.ndjson\"]}", explain: "사용량 report는 도입 효과와 정책 점검에 쓰입니다.", scaffold: "gh api orgs/octo-org/copilot/metrics/reports/organization-28-day/latest" },
                    { id: "gh-ls-53", cmd: "gh api orgs/octo-org/copilot/metrics/reports/users-28-day/latest", desc: "사용자별 Copilot metrics report를 확인합니다.", output: "{\"download_links\":[\"https://example.com/copilot-users.ndjson\"]}", explain: "사용자별 report는 seat 운영과 활성도 분석에 쓰는 운영 지표입니다.", scaffold: "gh api orgs/octo-org/copilot/metrics/reports/users-28-day/latest" }
                ]
            }
        ]
    }
];
