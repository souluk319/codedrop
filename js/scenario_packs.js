/**
 * CodeDrop - 장문모드 (시나리오) 문제 데이터
 * EX280 (Red Hat Certified OpenShift Administrator) 대비
 *
 * 문제 형식:
 *   scenario  : 한국어 상황 지문
 *   answers   : 정답 정규식 배열 (정규화된 입력에 ^...$ 로 매칭)
 *   canonical : 모범 답안 (정답/건너뛰기 시 표시)
 *   hint      : 힌트 (플래그 니모닉)
 *   explain   : 한국어 해설 (배경지식)
 *
 * 작성 규약 (유연 매칭):
 *   - 단/복수:      pods?
 *   - 네임스페이스:  (?:-n|--namespace)[ =]web
 *   - 리소스 표기:   (?:deployment|deploy)(?:/| )front
 *   - 값 플래그:     --replicas[ =]3
 */

const SCENARIO_PACKS = {

    LINUX_BASIC: {
        label: "Linux 기초",
        questions: [
            {
                id: "lx-01",
                scenario: "현재 디렉터리의 deploy.sh 스크립트에 실행 권한을 부여하세요.",
                answers: [
                    "chmod (?:\\+x|a\\+x|u\\+x|755) (?:\\./)?deploy\\.sh"
                ],
                canonical: "chmod +x deploy.sh",
                hint: "chmod +x <파일>",
                explain: "+x는 모든 대상(ugo)에 실행 권한을 추가합니다. 755는 소유자 rwx, 그룹/기타 rx를 의미합니다."
            },
            {
                id: "lx-02",
                scenario: "httpd 서비스가 부팅 시 자동 시작되도록 설정하고, 지금 즉시 시작하세요. (명령어 하나로)",
                answers: [
                    "(?:sudo )?systemctl enable --now httpd(?:\\.service)?"
                ],
                canonical: "systemctl enable --now httpd",
                hint: "systemctl enable --now <서비스>",
                explain: "enable은 부팅 시 자동 시작 등록, --now 플래그는 등록과 동시에 start까지 수행합니다."
            },
            {
                id: "lx-03",
                scenario: "httpd 유닛(서비스)의 로그만 조회하세요.",
                answers: [
                    "(?:sudo )?journalctl -u httpd(?:\\.service)?"
                ],
                canonical: "journalctl -u httpd",
                hint: "journalctl -u(unit) <서비스>",
                explain: "journalctl -u는 특정 systemd 유닛의 로그만 필터링합니다. -f를 더하면 실시간 추적됩니다."
            },
            {
                id: "lx-04",
                scenario: "/var/log/messages 파일에서 대소문자 구분 없이 'error' 문자열을 검색하세요.",
                answers: [
                    "grep -i ['\"]?error['\"]? /var/log/messages"
                ],
                canonical: "grep -i error /var/log/messages",
                hint: "grep -i(ignore-case) <패턴> <파일>",
                explain: "-i는 대소문자를 무시합니다. Error, ERROR, error 모두 매칭됩니다."
            },
            {
                id: "lx-05",
                scenario: "/var/log/messages 파일의 끝부분을 실시간으로 추적(follow)하세요.",
                answers: [
                    "tail -f /var/log/messages"
                ],
                canonical: "tail -f /var/log/messages",
                hint: "tail -f(follow) <파일>",
                explain: "-f는 파일에 새로 추가되는 내용을 실시간으로 출력합니다. 로그 모니터링의 기본기입니다."
            },
            {
                id: "lx-06",
                scenario: "/etc 디렉터리 아래에서 이름이 .conf 로 끝나는 파일을 모두 찾으세요.",
                answers: [
                    "(?:sudo )?find /etc -name ['\"]?\\*\\.conf['\"]?"
                ],
                canonical: "find /etc -name \"*.conf\"",
                hint: "find <경로> -name \"<패턴>\"",
                explain: "find는 실시간으로 파일시스템을 탐색합니다. 패턴은 셸 확장을 막기 위해 따옴표로 감싸는 습관을 들이세요."
            },
            {
                id: "lx-07",
                scenario: "/opt/app/config 디렉터리를 중간 경로까지 한 번에 생성하세요.",
                answers: [
                    "(?:sudo )?mkdir -p /opt/app/config"
                ],
                canonical: "mkdir -p /opt/app/config",
                hint: "mkdir -p(parents) <경로>",
                explain: "-p는 존재하지 않는 상위 디렉터리를 함께 생성하고, 이미 존재해도 에러를 내지 않습니다."
            },
            {
                id: "lx-08",
                scenario: "app.tar.gz 압축 파일을 현재 디렉터리에 풀어주세요. (gzip, 상세 출력 포함)",
                answers: [
                    "tar (?:-xzvf|-xvzf|-zxvf|-zvxf|-vxzf|-vzxf|xzvf|xvzf|zxvf) (?:\\./)?app\\.tar\\.gz"
                ],
                canonical: "tar -xzvf app.tar.gz",
                hint: "tar -x(extract) -z(gzip) -v(verbose) -f(file)",
                explain: "x=해제, z=gzip, v=과정 출력, f=파일 지정. 반대로 압축 생성은 -czvf입니다."
            },
            {
                id: "lx-09",
                scenario: "리스닝 중인 TCP/UDP 포트와 해당 프로세스를 확인하세요.",
                answers: [
                    "(?:sudo )?ss -tulpn",
                    "(?:sudo )?ss -tulnp",
                    "(?:sudo )?netstat -tulpn"
                ],
                canonical: "ss -tulpn",
                hint: "ss -t(tcp) -u(udp) -l(listen) -p(process) -n(numeric)",
                explain: "ss는 netstat의 후속 도구입니다. 서비스가 의도한 포트에서 열려 있는지 확인할 때 사용합니다."
            },
            {
                id: "lx-10",
                scenario: "파일 시스템별 디스크 사용량을 사람이 읽기 쉬운 단위(GB/MB)로 출력하세요.",
                answers: [
                    "df -h"
                ],
                canonical: "df -h",
                hint: "df -h(human-readable)",
                explain: "-h는 바이트 대신 K/M/G 단위로 표시합니다. 디스크 가득참(disk full) 장애 진단의 첫 명령어입니다."
            }
        ]
    },

    AUTH: {
        label: "인증 (htpasswd/IdP)",
        questions: [
            {
                id: "auth-01",
                scenario: "htpasswd 인증 공급자용 사용자 파일을 생성하세요. 파일: /tmp/htpasswd, 사용자: admin, 비밀번호: redhat (새 파일 생성, bcrypt 해시, 비밀번호는 명령 인자로)",
                answers: [
                    "htpasswd (?:-c -B -b|-c -b -B|-B -c -b|-B -b -c|-b -c -B|-b -B -c|-cbB|-cBb|-Bcb|-Bbc|-bcB|-bBc) /tmp/htpasswd admin redhat"
                ],
                canonical: "htpasswd -c -B -b /tmp/htpasswd admin redhat",
                hint: "htpasswd -c(생성) -B(bcrypt) -b(배치) <파일> <유저> <암호>",
                explain: "-c는 새 파일 생성(기존 파일이면 덮어씀 주의!), -B는 bcrypt 해시, -b는 비밀번호를 인자로 전달합니다. 이 파일로 Secret을 만들어 OAuth CR에 연결합니다."
            },
            {
                id: "auth-02",
                scenario: "기존 /tmp/htpasswd 파일에 사용자 developer(비밀번호 devpass)를 추가하세요. (bcrypt, 배치 모드)",
                answers: [
                    "htpasswd (?:-B -b|-b -B|-Bb|-bB) /tmp/htpasswd developer devpass"
                ],
                canonical: "htpasswd -B -b /tmp/htpasswd developer devpass",
                hint: "기존 파일에 추가할 때는 -c를 빼세요",
                explain: "-c를 쓰면 기존 파일이 초기화됩니다. 사용자 추가/비밀번호 변경은 -c 없이 실행합니다."
            },
            {
                id: "auth-03",
                scenario: "/tmp/htpasswd 파일로 openshift-config 네임스페이스에 htpasswd-secret 이라는 Secret을 생성하세요. (키 이름: htpasswd)",
                answers: [
                    "oc create secret generic htpasswd-secret --from-file[ =]htpasswd=/tmp/htpasswd (?:-n|--namespace)[ =]openshift-config",
                    "oc create secret generic htpasswd-secret (?:-n|--namespace)[ =]openshift-config --from-file[ =]htpasswd=/tmp/htpasswd"
                ],
                canonical: "oc create secret generic htpasswd-secret --from-file=htpasswd=/tmp/htpasswd -n openshift-config",
                hint: "oc create secret generic <이름> --from-file=htpasswd=<파일> -n openshift-config",
                explain: "IdP용 Secret은 반드시 openshift-config 네임스페이스에, 키 이름은 htpasswd로 만들어야 OAuth 오퍼레이터가 인식합니다."
            },
            {
                id: "auth-04",
                scenario: "htpasswd 파일을 수정한 뒤, openshift-config 네임스페이스의 htpasswd-secret Secret 데이터를 새 파일(/tmp/htpasswd)로 교체하세요.",
                answers: [
                    "oc set data secret/htpasswd-secret --from-file[ =]htpasswd=/tmp/htpasswd (?:-n|--namespace)[ =]openshift-config",
                    "oc set data secret/htpasswd-secret (?:-n|--namespace)[ =]openshift-config --from-file[ =]htpasswd=/tmp/htpasswd"
                ],
                canonical: "oc set data secret/htpasswd-secret --from-file=htpasswd=/tmp/htpasswd -n openshift-config",
                hint: "oc set data secret/<이름> --from-file=... -n openshift-config",
                explain: "oc set data는 기존 Secret/ConfigMap의 데이터를 갱신합니다. 갱신 후 OAuth 파드가 자동 재배포됩니다."
            },
            {
                id: "auth-05",
                scenario: "클러스터의 OAuth 커스텀 리소스를 편집기로 여세요.",
                answers: [
                    "oc edit oauth(?:s|\\.config\\.openshift\\.io)? cluster"
                ],
                canonical: "oc edit oauth cluster",
                hint: "oc edit oauth <이름> — 클러스터 OAuth CR의 이름은 항상 cluster",
                explain: "identityProviders 항목에 htpasswd 공급자를 추가하는 곳이 이 OAuth CR입니다. 이름은 항상 cluster입니다."
            },
            {
                id: "auth-06",
                scenario: "openshift-config 네임스페이스의 htpasswd-secret 내용을 /tmp/ 디렉터리로 추출하세요. (덮어쓰기 허용)",
                answers: [
                    "oc extract secret/htpasswd-secret (?:-n|--namespace)[ =]openshift-config --to[ =]/tmp/? --confirm",
                    "oc extract secret/htpasswd-secret --to[ =]/tmp/? --confirm (?:-n|--namespace)[ =]openshift-config",
                    "oc extract secret/htpasswd-secret (?:-n|--namespace)[ =]openshift-config --confirm --to[ =]/tmp/?"
                ],
                canonical: "oc extract secret/htpasswd-secret -n openshift-config --to /tmp/ --confirm",
                hint: "oc extract secret/<이름> --to <디렉터리> --confirm",
                explain: "extract는 Secret의 키를 파일로 저장합니다. 사용자 추가/삭제 시 기존 htpasswd 파일을 꺼내는 표준 절차입니다. --confirm은 기존 파일 덮어쓰기 허용입니다."
            },
            {
                id: "auth-07",
                scenario: "제거된 사용자 manager의 identity 리소스와 user 리소스 중, user 리소스를 삭제하세요.",
                answers: [
                    "oc delete user manager"
                ],
                canonical: "oc delete user manager",
                hint: "oc delete user <이름>",
                explain: "htpasswd 파일에서 사용자를 지워도 User/Identity 리소스는 남습니다. oc delete user와 oc delete identity로 정리해야 완전히 제거됩니다."
            }
        ]
    },

    RBAC: {
        label: "권한 (RBAC/그룹)",
        questions: [
            {
                id: "rbac-01",
                scenario: "사용자 user1에게 클러스터 전체 관리자 권한(cluster-admin)을 부여하세요.",
                answers: [
                    "oc adm policy add-cluster-role-to-user cluster-admin user1"
                ],
                canonical: "oc adm policy add-cluster-role-to-user cluster-admin user1",
                hint: "oc adm policy add-cluster-role-to-user <역할> <사용자>",
                explain: "add-cluster-role-to-user는 ClusterRoleBinding을 생성합니다. 네임스페이스 한정 권한은 add-role-to-user -n <ns>를 사용합니다."
            },
            {
                id: "rbac-02",
                scenario: "project1 네임스페이스에서 사용자 user2에게 admin 역할을 부여하세요.",
                answers: [
                    "oc adm policy add-role-to-user admin user2 (?:-n|--namespace)[ =]project1",
                    "oc adm policy (?:-n|--namespace)[ =]project1 add-role-to-user admin user2"
                ],
                canonical: "oc adm policy add-role-to-user admin user2 -n project1",
                hint: "oc adm policy add-role-to-user <역할> <사용자> -n <프로젝트>",
                explain: "admin 역할은 해당 프로젝트 안에서만 모든 권한을 가집니다(프로젝트 삭제 포함, 쿼터 수정 제외)."
            },
            {
                id: "rbac-03",
                scenario: "dev-group 이라는 그룹을 생성하세요.",
                answers: [
                    "oc adm groups new dev-group"
                ],
                canonical: "oc adm groups new dev-group",
                hint: "oc adm groups new <그룹명>",
                explain: "그룹은 사용자 묶음입니다. 개별 사용자 대신 그룹에 역할을 부여하는 것이 관리 모범 사례입니다."
            },
            {
                id: "rbac-04",
                scenario: "dev-group 그룹에 사용자 user1과 user2를 추가하세요.",
                answers: [
                    "oc adm groups add-users dev-group user1 user2"
                ],
                canonical: "oc adm groups add-users dev-group user1 user2",
                hint: "oc adm groups add-users <그룹> <유저1> <유저2>",
                explain: "여러 사용자를 공백으로 나열해 한 번에 추가할 수 있습니다. 제거는 remove-users입니다."
            },
            {
                id: "rbac-05",
                scenario: "project1 네임스페이스에서 dev-group 그룹에 edit 역할을 부여하세요.",
                answers: [
                    "oc adm policy add-role-to-group edit dev-group (?:-n|--namespace)[ =]project1",
                    "oc adm policy (?:-n|--namespace)[ =]project1 add-role-to-group edit dev-group"
                ],
                canonical: "oc adm policy add-role-to-group edit dev-group -n project1",
                hint: "oc adm policy add-role-to-group <역할> <그룹> -n <프로젝트>",
                explain: "edit 역할은 리소스 생성/수정이 가능하지만 역할 부여(RBAC 변경)는 불가능합니다. view는 읽기 전용입니다."
            },
            {
                id: "rbac-06",
                scenario: "인증된 모든 사용자가 새 프로젝트를 만들지 못하도록 self-provisioner 클러스터 역할을 system:authenticated:oauth 그룹에서 제거하세요.",
                answers: [
                    "oc adm policy remove-cluster-role-from-group self-provisioners? system:authenticated:oauth"
                ],
                canonical: "oc adm policy remove-cluster-role-from-group self-provisioner system:authenticated:oauth",
                hint: "oc adm policy remove-cluster-role-from-group self-provisioner system:authenticated:oauth",
                explain: "EX280 단골 문제입니다. self-provisioner를 제거하면 일반 사용자의 oc new-project가 차단됩니다."
            },
            {
                id: "rbac-07",
                scenario: "project1 네임스페이스의 RoleBinding 목록을 조회하세요.",
                answers: [
                    "oc get rolebindings? (?:-n|--namespace)[ =]project1",
                    "oc (?:-n|--namespace)[ =]project1 get rolebindings?"
                ],
                canonical: "oc get rolebindings -n project1",
                hint: "oc get rolebindings -n <프로젝트>",
                explain: "누가 어떤 역할을 가졌는지 확인하는 명령입니다. oc describe rolebinding <이름>으로 상세를 봅니다."
            },
            {
                id: "rbac-08",
                scenario: "클러스터에서 누가 pods를 delete 할 수 있는지 확인하세요.",
                answers: [
                    "oc adm policy who-can delete pods?"
                ],
                canonical: "oc adm policy who-can delete pods",
                hint: "oc adm policy who-can <동사> <리소스>",
                explain: "who-can은 특정 작업 권한을 가진 사용자/그룹/SA를 역추적합니다. 권한 문제 디버깅에 유용합니다."
            },
            {
                id: "rbac-09",
                scenario: "user1 사용자가 project1 네임스페이스에서 파드를 생성(create)할 수 있는지 확인하세요.",
                answers: [
                    "oc auth can-i create pods? --as[ =]user1 (?:-n|--namespace)[ =]project1",
                    "oc auth can-i create pods? (?:-n|--namespace)[ =]project1 --as[ =]user1"
                ],
                canonical: "oc auth can-i create pods --as=user1 -n project1",
                hint: "oc auth can-i <동사> <리소스> --as=<유저> -n <프로젝트>",
                explain: "역할 부여 후 반드시 can-i로 검증하는 습관이 중요합니다. yes/no로 즉시 답이 나옵니다. --as는 해당 사용자로 가장(impersonate)합니다."
            }
        ]
    },

    RESOURCES: {
        label: "쿼터/시크릿/컨피그맵",
        questions: [
            {
                id: "res-01",
                scenario: "project1 네임스페이스에 파드 최대 10개를 제한하는 my-quota 라는 ResourceQuota를 생성하세요.",
                answers: [
                    "oc create quota my-quota --hard[ =]pods=10 (?:-n|--namespace)[ =]project1",
                    "oc create quota my-quota (?:-n|--namespace)[ =]project1 --hard[ =]pods=10",
                    "oc (?:-n|--namespace)[ =]project1 create quota my-quota --hard[ =]pods=10"
                ],
                canonical: "oc create quota my-quota --hard=pods=10 -n project1",
                hint: "oc create quota <이름> --hard=pods=10 -n <프로젝트>",
                explain: "ResourceQuota는 네임스페이스 단위 총량 제한입니다. cpu, memory, secrets 등도 --hard에 콤마로 나열할 수 있습니다."
            },
            {
                id: "res-02",
                scenario: "project1 네임스페이스의 my-quota 쿼터 사용 현황을 상세 조회하세요.",
                answers: [
                    "oc describe quota my-quota (?:-n|--namespace)[ =]project1",
                    "oc describe resourcequotas? my-quota (?:-n|--namespace)[ =]project1",
                    "oc (?:-n|--namespace)[ =]project1 describe quota my-quota"
                ],
                canonical: "oc describe quota my-quota -n project1",
                hint: "oc describe quota <이름> -n <프로젝트>",
                explain: "describe는 Used/Hard 형태로 현재 사용량 대비 제한을 보여줍니다. 쿼터 초과 시 새 리소스 생성이 거부됩니다."
            },
            {
                id: "res-03",
                scenario: "apps 네임스페이스에 password=redhat123 값을 담은 db-secret 이라는 generic Secret을 생성하세요.",
                answers: [
                    "oc create secret generic db-secret --from-literal[ =]password=redhat123 (?:-n|--namespace)[ =]apps",
                    "oc create secret generic db-secret (?:-n|--namespace)[ =]apps --from-literal[ =]password=redhat123",
                    "oc (?:-n|--namespace)[ =]apps create secret generic db-secret --from-literal[ =]password=redhat123"
                ],
                canonical: "oc create secret generic db-secret --from-literal=password=redhat123 -n apps",
                hint: "oc create secret generic <이름> --from-literal=키=값",
                explain: "--from-literal은 키=값을 직접 지정합니다. 파일이면 --from-file을 사용합니다. Secret 값은 base64로 저장됩니다."
            },
            {
                id: "res-04",
                scenario: "apps 네임스페이스에 ENV=prod 값을 담은 app-config 라는 ConfigMap을 생성하세요.",
                answers: [
                    "oc create configmap app-config --from-literal[ =]ENV=prod (?:-n|--namespace)[ =]apps",
                    "oc create (?:cm|configmap) app-config (?:-n|--namespace)[ =]apps --from-literal[ =]ENV=prod",
                    "oc create cm app-config --from-literal[ =]ENV=prod (?:-n|--namespace)[ =]apps"
                ],
                canonical: "oc create configmap app-config --from-literal=ENV=prod -n apps",
                hint: "oc create configmap <이름> --from-literal=키=값",
                explain: "ConfigMap은 민감하지 않은 설정용, Secret은 민감정보용입니다. 둘 다 환경변수나 볼륨으로 파드에 주입합니다."
            },
            {
                id: "res-05",
                scenario: "apps 네임스페이스의 mysql 디플로이먼트에 db-secret Secret의 모든 키를 환경변수로 주입하세요.",
                answers: [
                    "oc set env (?:deployment|deploy)(?:/| )mysql --from[ =]secret/db-secret (?:-n|--namespace)[ =]apps",
                    "oc set env (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )mysql --from[ =]secret/db-secret"
                ],
                canonical: "oc set env deployment/mysql --from=secret/db-secret -n apps",
                hint: "oc set env deployment/<이름> --from=secret/<시크릿>",
                explain: "--from=secret/...은 Secret의 모든 키를 환경변수로 한 번에 주입합니다. --prefix=DB_ 로 접두사를 붙일 수도 있습니다."
            },
            {
                id: "res-06",
                scenario: "apps 네임스페이스의 app 디플로이먼트에 db-secret Secret을 /etc/secret 경로에 볼륨으로 마운트하세요.",
                answers: [
                    "oc set volumes? (?:deployment|deploy)(?:/| )app --add (?:--type[ =]secret --secret-name[ =]db-secret|--secret-name[ =]db-secret --type[ =]secret) --mount-path[ =]/etc/secret (?:-n|--namespace)[ =]apps",
                    "oc set volumes? (?:deployment|deploy)(?:/| )app (?:-n|--namespace)[ =]apps --add (?:--type[ =]secret --secret-name[ =]db-secret|--secret-name[ =]db-secret --type[ =]secret) --mount-path[ =]/etc/secret",
                    "oc set volumes? (?:deployment|deploy)(?:/| )app --add --mount-path[ =]/etc/secret (?:--type[ =]secret --secret-name[ =]db-secret|--secret-name[ =]db-secret --type[ =]secret) (?:-n|--namespace)[ =]apps",
                    "oc set volumes? (?:deployment|deploy)(?:/| )app (?:-n|--namespace)[ =]apps --add --mount-path[ =]/etc/secret (?:--type[ =]secret --secret-name[ =]db-secret|--secret-name[ =]db-secret --type[ =]secret)"
                ],
                canonical: "oc set volume deployment/app --add --type secret --secret-name db-secret --mount-path /etc/secret -n apps",
                hint: "oc set volume deployment/<이름> --add --type secret --secret-name <시크릿> --mount-path <경로>",
                explain: "볼륨 마운트 방식은 각 키가 파일로 나타납니다. 인증서 등 파일 형태가 필요한 경우 환경변수 대신 사용합니다."
            },
            {
                id: "res-08",
                scenario: "project1 네임스페이스에 compute-quota 라는 쿼터를 생성하세요. 제한: pods=10, requests.cpu=2, requests.memory=1Gi (이 순서대로)",
                answers: [
                    "oc create quota compute-quota --hard[ =]pods=10,requests\\.cpu=2,requests\\.memory=1Gi (?:-n|--namespace)[ =]project1",
                    "oc create quota compute-quota (?:-n|--namespace)[ =]project1 --hard[ =]pods=10,requests\\.cpu=2,requests\\.memory=1Gi"
                ],
                canonical: "oc create quota compute-quota --hard=pods=10,requests.cpu=2,requests.memory=1Gi -n project1",
                hint: "--hard=키=값,키=값,... 콤마로 나열",
                explain: "실전 쿼터는 여러 키를 한 번에 겁니다. requests.*는 스케줄링 보장량 총합, limits.*는 상한 총합을 제한합니다."
            },
            {
                id: "res-07",
                scenario: "apps 네임스페이스의 front 디플로이먼트에 메모리 limit 256Mi를 설정하세요.",
                answers: [
                    "oc set resources (?:deployment|deploy)(?:/| )front --limits[ =]memory=256Mi (?:-n|--namespace)[ =]apps",
                    "oc set resources (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )front --limits[ =]memory=256Mi"
                ],
                canonical: "oc set resources deployment front --limits=memory=256Mi -n apps",
                hint: "oc set resources deployment <이름> --limits=memory=256Mi",
                explain: "limits는 상한, requests는 스케줄링 보장량입니다. --requests=cpu=100m,memory=128Mi 처럼 함께 지정할 수 있습니다."
            }
        ]
    },

    WORKLOADS: {
        label: "디플로이/스케일/네트워크",
        questions: [
            {
                id: "wl-01",
                scenario: "apps 라는 새 프로젝트를 생성하세요.",
                answers: [
                    "oc new-project apps"
                ],
                canonical: "oc new-project apps",
                hint: "oc new-project <이름>",
                explain: "new-project는 프로젝트 생성과 동시에 해당 프로젝트로 전환합니다. --display-name, --description 옵션도 있습니다."
            },
            {
                id: "wl-02",
                scenario: "quay.io/redhattraining/hello-world-nginx 이미지로 apps 네임스페이스에 hello 라는 애플리케이션을 배포하세요.",
                answers: [
                    "oc new-app --name[ =]hello (?:--image[ =]|--docker-image[ =])?quay\\.io/redhattraining/hello-world-nginx (?:-n|--namespace)[ =]apps",
                    "oc new-app (?:-n|--namespace)[ =]apps --name[ =]hello (?:--image[ =]|--docker-image[ =])?quay\\.io/redhattraining/hello-world-nginx",
                    "oc new-app (?:--image[ =]|--docker-image[ =])?quay\\.io/redhattraining/hello-world-nginx --name[ =]hello (?:-n|--namespace)[ =]apps"
                ],
                canonical: "oc new-app --name hello --image quay.io/redhattraining/hello-world-nginx -n apps",
                hint: "oc new-app --name <이름> --image <이미지>",
                explain: "new-app은 이미지에서 Deployment/Service를 자동 생성합니다. Git URL을 주면 S2I 빌드까지 수행합니다."
            },
            {
                id: "wl-03",
                scenario: "api 네임스페이스의 front 디플로이먼트를 레플리카 3개로 스케일하세요.",
                answers: [
                    "oc scale (?:deployment|deploy)(?:/| )front --replicas[ =]3 (?:-n|--namespace)[ =]api",
                    "oc scale (?:-n|--namespace)[ =]api (?:deployment|deploy)(?:/| )front --replicas[ =]3",
                    "oc scale --replicas[ =]3 (?:deployment|deploy)(?:/| )front (?:-n|--namespace)[ =]api"
                ],
                canonical: "oc scale deployment front --replicas=3 -n api",
                hint: "oc scale deployment <이름> --replicas=<수>",
                explain: "수동 스케일은 oc scale, CPU 기반 자동 스케일은 oc autoscale(HPA)입니다. deployment/front 형식도 허용됩니다."
            },
            {
                id: "wl-04",
                scenario: "apps 네임스페이스의 front 디플로이먼트에 최소 2개, 최대 10개, CPU 80% 기준의 HPA(자동 스케일)를 설정하세요.",
                answers: [
                    "oc autoscale (?:deployment|deploy)(?:/| )front --min[ =]2 --max[ =]10 --cpu-percent[ =]80 (?:-n|--namespace)[ =]apps",
                    "oc autoscale (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )front --min[ =]2 --max[ =]10 --cpu-percent[ =]80"
                ],
                canonical: "oc autoscale deployment front --min 2 --max 10 --cpu-percent 80 -n apps",
                hint: "oc autoscale deployment <이름> --min <n> --max <n> --cpu-percent <n>",
                explain: "HPA는 파드의 CPU requests 대비 사용률을 기준으로 동작하므로 requests 설정이 선행되어야 합니다."
            },
            {
                id: "wl-05",
                scenario: "apps 네임스페이스의 hello 서비스를 외부에서 접근할 수 있도록 Route로 노출하세요.",
                answers: [
                    "oc expose (?:service|svc)(?:/| )hello (?:-n|--namespace)[ =]apps",
                    "oc expose (?:-n|--namespace)[ =]apps (?:service|svc)(?:/| )hello"
                ],
                canonical: "oc expose service hello -n apps",
                hint: "oc expose service <이름>",
                explain: "expose는 비암호화(HTTP) Route를 생성합니다. TLS가 필요하면 oc create route edge를 사용합니다."
            },
            {
                id: "wl-06",
                scenario: "apps 네임스페이스의 hello 서비스에 대해 TLS edge 종료 방식의 hello-https 라는 Route를 생성하세요.",
                answers: [
                    "oc create route edge hello-https --service[ =]hello (?:-n|--namespace)[ =]apps",
                    "oc create route edge hello-https (?:-n|--namespace)[ =]apps --service[ =]hello",
                    "oc create route edge (?:-n|--namespace)[ =]apps hello-https --service[ =]hello"
                ],
                canonical: "oc create route edge hello-https --service hello -n apps",
                hint: "oc create route edge <route명> --service <서비스>",
                explain: "edge 종료는 라우터에서 TLS를 해제합니다. 인증서를 지정하지 않으면 라우터 기본 인증서가 사용됩니다. passthrough/reencrypt 방식도 있습니다."
            },
            {
                id: "wl-07",
                scenario: "apps 네임스페이스의 front 디플로이먼트를 롤링 재시작하세요. (설정 변경 반영)",
                answers: [
                    "oc rollout restart (?:deployment|deploy)(?:/| )front (?:-n|--namespace)[ =]apps",
                    "oc rollout restart (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )front"
                ],
                canonical: "oc rollout restart deployment/front -n apps",
                hint: "oc rollout restart deployment/<이름>",
                explain: "ConfigMap/Secret 변경은 자동 반영되지 않는 경우가 많아 rollout restart로 파드를 재생성합니다. undo로 롤백도 가능합니다."
            },
            {
                id: "wl-08",
                scenario: "apps 네임스페이스에 적용된 NetworkPolicy 목록을 조회하세요.",
                answers: [
                    "oc get networkpolic(?:y|ies) (?:-n|--namespace)[ =]apps",
                    "oc get netpol (?:-n|--namespace)[ =]apps",
                    "oc (?:-n|--namespace)[ =]apps get (?:networkpolic(?:y|ies)|netpol)"
                ],
                canonical: "oc get networkpolicy -n apps",
                hint: "oc get networkpolicy (축약형: netpol)",
                explain: "NetworkPolicy는 파드 간 트래픽을 제어합니다. 빈 podSelector({})는 네임스페이스 전체에 적용됨을 의미합니다."
            }
        ]
    },

    NETWORK_SECURITY: {
        label: "네트워크 보안/외부 노출",
        questions: [
            {
                id: "net-01",
                scenario: "클러스터의 IngressController 목록을 확인하세요.",
                answers: [
                    "oc get ingresscontrollers? (?:-n|--namespace)[ =]openshift-ingress-operator",
                    "oc (?:-n|--namespace)[ =]openshift-ingress-operator get ingresscontrollers?"
                ],
                canonical: "oc get ingresscontroller -n openshift-ingress-operator",
                hint: "oc get ingresscontroller -n openshift-ingress-operator",
                explain: "IngressController는 OpenShift 라우터의 배치와 노출 방식을 관리합니다. 외부 접근 문제는 여기 상태 확인부터 시작합니다."
            },
            {
                id: "net-02",
                scenario: "기본 IngressController(default)의 상세 상태를 확인하세요.",
                answers: [
                    "oc describe ingresscontrollers? default (?:-n|--namespace)[ =]openshift-ingress-operator",
                    "oc (?:-n|--namespace)[ =]openshift-ingress-operator describe ingresscontrollers? default"
                ],
                canonical: "oc describe ingresscontroller default -n openshift-ingress-operator",
                hint: "oc describe ingresscontroller default -n openshift-ingress-operator",
                explain: "라우터 replica, endpoint publishing 전략, degraded/progressing 조건을 확인해 ingress 문제의 원인을 좁힙니다."
            },
            {
                id: "net-03",
                scenario: "apps 네임스페이스에 db 라는 LoadBalancer 서비스를 만들고, 5432 포트를 5432 타깃 포트로 노출하세요.",
                answers: [
                    "oc create service loadbalancer db --tcp[ =]5432:5432 (?:-n|--namespace)[ =]apps",
                    "oc create service loadbalancer db (?:-n|--namespace)[ =]apps --tcp[ =]5432:5432",
                    "oc (?:-n|--namespace)[ =]apps create service loadbalancer db --tcp[ =]5432:5432"
                ],
                canonical: "oc create service loadbalancer db --tcp=5432:5432 -n apps",
                hint: "oc create service loadbalancer <name> --tcp=<port>:<targetPort>",
                explain: "HTTP Route가 아닌 TCP 서비스 노출은 LoadBalancer Service가 시험 목표에 포함됩니다. 환경에 따라 외부 IP/호스트 할당은 인프라가 담당합니다."
            },
            {
                id: "net-04",
                scenario: "apps 네임스페이스에서 api 서비스의 8443 포트를 TLS passthrough 방식의 tls-api Route로 노출하세요.",
                answers: [
                    "oc create route passthrough tls-api --service[ =]api --port[ =]8443 (?:-n|--namespace)[ =]apps",
                    "oc create route passthrough tls-api --port[ =]8443 --service[ =]api (?:-n|--namespace)[ =]apps",
                    "oc create route passthrough tls-api (?:-n|--namespace)[ =]apps --service[ =]api --port[ =]8443"
                ],
                canonical: "oc create route passthrough tls-api --service api --port 8443 -n apps",
                hint: "oc create route passthrough <route> --service <svc> --port <port>",
                explain: "passthrough Route는 TLS를 라우터에서 해제하지 않고 백엔드로 전달합니다. SNI 기반 non-HTTP TLS 노출을 다룰 때 핵심입니다."
            },
            {
                id: "net-05",
                scenario: "apps 네임스페이스에서 web 서비스에 edge TLS Route secure-web을 만들고 인증서 tls.crt, 키 tls.key, CA ca.crt를 지정하세요.",
                answers: [
                    "oc create route edge secure-web --service[ =]web --cert[ =]tls\\.crt --key[ =]tls\\.key --ca-cert[ =]ca\\.crt (?:-n|--namespace)[ =]apps",
                    "oc create route edge secure-web --service[ =]web --key[ =]tls\\.key --cert[ =]tls\\.crt --ca-cert[ =]ca\\.crt (?:-n|--namespace)[ =]apps",
                    "oc create route edge secure-web (?:-n|--namespace)[ =]apps --service[ =]web --cert[ =]tls\\.crt --key[ =]tls\\.key --ca-cert[ =]ca\\.crt"
                ],
                canonical: "oc create route edge secure-web --service web --cert tls.crt --key tls.key --ca-cert ca.crt -n apps",
                hint: "oc create route edge <route> --service <svc> --cert <crt> --key <key> --ca-cert <ca>",
                explain: "edge Route는 라우터가 TLS를 종료합니다. 사용자 제공 인증서를 지정해야 하는 문제가 나오면 cert/key/ca-cert 플래그를 함께 챙깁니다."
            },
            {
                id: "net-06",
                scenario: "apps 네임스페이스에 deny-all.yaml NetworkPolicy 매니페스트를 적용하세요.",
                answers: [
                    "oc apply -f deny-all\\.yaml (?:-n|--namespace)[ =]apps",
                    "oc apply (?:-n|--namespace)[ =]apps -f deny-all\\.yaml"
                ],
                canonical: "oc apply -f deny-all.yaml -n apps",
                hint: "oc apply -f <networkpolicy.yaml> -n <ns>",
                explain: "NetworkPolicy는 YAML로 작성해 적용하는 경우가 많습니다. 적용 후 oc describe networkpolicy로 podSelector와 ingress/egress를 확인합니다."
            }
        ]
    },

    TROUBLESHOOT: {
        label: "트러블슈팅",
        questions: [
            {
                id: "ts-01",
                scenario: "web 네임스페이스의 파드 목록을 조회하세요.",
                answers: [
                    "oc get pods? (?:-n|--namespace)[ =]web",
                    "oc (?:-n|--namespace)[ =]web get pods?"
                ],
                canonical: "oc get pods -n web",
                hint: "oc get pods -n <네임스페이스>",
                explain: "-n은 --namespace의 축약형입니다. 문제 파악의 첫 단계는 oc get pods → oc describe → oc logs → oc get events 순서입니다."
            },
            {
                id: "ts-02",
                scenario: "web 네임스페이스의 mysql 디플로이먼트 로그를 실시간으로 추적하세요.",
                answers: [
                    "oc logs -f (?:deployment|deploy)(?:/| )mysql (?:-n|--namespace)[ =]web",
                    "oc logs (?:deployment|deploy)(?:/| )mysql -f (?:-n|--namespace)[ =]web",
                    "oc logs (?:-n|--namespace)[ =]web -f (?:deployment|deploy)(?:/| )mysql"
                ],
                canonical: "oc logs -f deployment/mysql -n web",
                hint: "oc logs -f(follow) deployment/<이름>",
                explain: "-f는 tail -f처럼 실시간 추적입니다. 이전에 죽은 컨테이너의 로그는 -p(previous)로 확인합니다 — CrashLoopBackOff 진단의 핵심입니다."
            },
            {
                id: "ts-03",
                scenario: "web 네임스페이스의 mysql-0 파드 상세 정보(이벤트 포함)를 확인하세요.",
                answers: [
                    "oc describe pod(?:s|/)? ?mysql-0 (?:-n|--namespace)[ =]web",
                    "oc (?:-n|--namespace)[ =]web describe pods? mysql-0"
                ],
                canonical: "oc describe pod mysql-0 -n web",
                hint: "oc describe pod <파드명> -n <네임스페이스>",
                explain: "describe 하단의 Events 섹션에서 스케줄 실패, 이미지 풀 실패(ImagePullBackOff), OOMKilled 등 원인을 확인합니다."
            },
            {
                id: "ts-04",
                scenario: "web 네임스페이스의 이벤트를 생성 시각 순으로 정렬해 조회하세요.",
                answers: [
                    "oc get events --sort-by[ =]['\"]?\\.metadata\\.creationTimestamp['\"]? (?:-n|--namespace)[ =]web",
                    "oc get events (?:-n|--namespace)[ =]web --sort-by[ =]['\"]?\\.metadata\\.creationTimestamp['\"]?",
                    "oc (?:-n|--namespace)[ =]web get events --sort-by[ =]['\"]?\\.metadata\\.creationTimestamp['\"]?"
                ],
                canonical: "oc get events --sort-by=.metadata.creationTimestamp -n web",
                hint: "oc get events --sort-by=.metadata.creationTimestamp",
                explain: "이벤트는 기본적으로 시간순이 아닙니다. sort-by로 정렬하면 장애의 시간 흐름을 추적하기 쉽습니다."
            },
            {
                id: "ts-05",
                scenario: "master01 노드에 디버그 셸로 접속하세요.",
                answers: [
                    "oc debug node/master01"
                ],
                canonical: "oc debug node/master01",
                hint: "oc debug node/<노드명>",
                explain: "노드에 특권 파드를 띄워 셸을 제공합니다. 접속 후 chroot /host 를 실행해야 노드의 실제 파일시스템에 접근할 수 있습니다."
            },
            {
                id: "ts-06",
                scenario: "web 네임스페이스의 mysql-0 파드 안에서 원격 셸을 여세요.",
                answers: [
                    "oc rsh (?:-n|--namespace)[ =]web mysql-0",
                    "oc rsh mysql-0 (?:-n|--namespace)[ =]web",
                    "oc (?:-n|--namespace)[ =]web rsh mysql-0"
                ],
                canonical: "oc rsh mysql-0 -n web",
                hint: "oc rsh <파드명>",
                explain: "rsh는 실행 중인 컨테이너에 셸을 엽니다. 셸이 없는 이미지는 oc debug <파드>로 복제본을 띄워 조사합니다."
            },
            {
                id: "ts-07",
                scenario: "web 네임스페이스에서 파드별 CPU/메모리 사용량을 확인하세요.",
                answers: [
                    "oc adm top pods? (?:-n|--namespace)[ =]web",
                    "oc adm top (?:-n|--namespace)[ =]web pods?"
                ],
                canonical: "oc adm top pods -n web",
                hint: "oc adm top pods -n <네임스페이스>",
                explain: "metrics-server 기반 실사용량입니다. 노드 단위는 oc adm top nodes로 확인합니다. OOMKilled 사전 징후 파악에 유용합니다."
            },
            {
                id: "ts-08",
                scenario: "레드햇 지원팀에 제출할 클러스터 진단 정보를 수집하세요.",
                answers: [
                    "oc adm must-gather"
                ],
                canonical: "oc adm must-gather",
                hint: "oc adm must-gather",
                explain: "must-gather는 클러스터 상태/로그를 통째로 수집해 로컬 디렉터리에 저장합니다. 지원 케이스 오픈 시 표준 절차입니다."
            },
            {
                id: "ts-09",
                scenario: "web 네임스페이스의 이벤트를 마지막 발생 시각(lastTimestamp) 순으로 정렬해 조회하세요.",
                answers: [
                    "oc get events --sort-by[ =]['\"]?\\.lastTimestamp['\"]? (?:-n|--namespace)[ =]web",
                    "oc get events (?:-n|--namespace)[ =]web --sort-by[ =]['\"]?\\.lastTimestamp['\"]?",
                    "oc (?:-n|--namespace)[ =]web get events --sort-by[ =]['\"]?\\.lastTimestamp['\"]?"
                ],
                canonical: "oc get events --sort-by=.lastTimestamp -n web",
                hint: "oc get events --sort-by=.lastTimestamp",
                explain: "진단 루틴의 고정 멤버입니다: get all → events --sort-by → describe → logs. lastTimestamp 정렬이 최근 사건을 맨 아래로 보여줍니다."
            },
            {
                id: "ts-10",
                scenario: "수정 작업 전에 web 네임스페이스의 app 디플로이먼트 YAML을 /tmp/app.bak.yaml 파일로 백업하세요.",
                answers: [
                    "oc get (?:deployment|deploy)(?:/| )app -o[ =]yaml (?:-n|--namespace)[ =]web > /tmp/app\\.bak\\.yaml",
                    "oc get (?:deployment|deploy)(?:/| )app (?:-n|--namespace)[ =]web -o[ =]yaml > /tmp/app\\.bak\\.yaml",
                    "oc (?:-n|--namespace)[ =]web get (?:deployment|deploy)(?:/| )app -o[ =]yaml > /tmp/app\\.bak\\.yaml"
                ],
                canonical: "oc get deploy app -o yaml -n web > /tmp/app.bak.yaml",
                hint: "oc get <리소스> -o yaml > <백업파일>",
                explain: "시험장 철칙: 수정 전 백업. 잘못 고치면 oc apply -f 백업파일로 즉시 복구합니다."
            },
            {
                id: "ts-11",
                scenario: "pod 리소스의 spec.containers 필드 문서를 CLI에서 확인하세요.",
                answers: [
                    "oc explain pods?\\.spec\\.containers"
                ],
                canonical: "oc explain pod.spec.containers",
                hint: "oc explain <리소스>.<필드경로>",
                explain: "oc explain은 오프라인 문서입니다. YAML 필드 이름이 기억나지 않을 때 시험장에서 가장 빠른 탈출구입니다."
            }
        ]
    },

    DEPLOY: {
        label: "앱 배포/검증",
        questions: [
            {
                id: "dep-01",
                scenario: "이미지 nginx로 web 디플로이먼트의 YAML 뼈대를 만들어 web.yaml 파일로 저장하세요. (클러스터에 생성하지 않음)",
                answers: [
                    "oc create (?:deployment|deploy) web --image[ =]nginx --dry-run[ =]client -o[ =]yaml > web\\.yaml",
                    "oc create (?:deployment|deploy) web --dry-run[ =]client --image[ =]nginx -o[ =]yaml > web\\.yaml",
                    "oc create (?:deployment|deploy) web --image[ =]nginx -o[ =]yaml --dry-run[ =]client > web\\.yaml"
                ],
                canonical: "oc create deployment web --image=nginx --dry-run=client -o yaml > web.yaml",
                hint: "--dry-run=client -o yaml > 파일 — YAML 손코딩 대신 뼈대 생성",
                explain: "시험장 핵심 습관입니다. 명령형으로 뼈대를 만들고 vi로 수정한 뒤 oc apply -f로 적용하면 손코딩보다 압도적으로 빠릅니다."
            },
            {
                id: "dep-02",
                scenario: "apps 네임스페이스의 web 디플로이먼트 롤아웃 진행 상태를 확인하세요.",
                answers: [
                    "oc rollout status (?:deployment|deploy)(?:/| )web (?:-n|--namespace)[ =]apps",
                    "oc rollout status (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )web"
                ],
                canonical: "oc rollout status deployment/web -n apps",
                hint: "oc rollout status deployment/<이름>",
                explain: "배포 후 성공 확인의 표준입니다. 'successfully rolled out'이 나와야 완료 — 검증 없는 완료는 완료가 아닙니다."
            },
            {
                id: "dep-03",
                scenario: "apps 네임스페이스의 web 디플로이먼트 배포 이력을 조회하세요.",
                answers: [
                    "oc rollout history (?:deployment|deploy)(?:/| )web (?:-n|--namespace)[ =]apps",
                    "oc rollout history (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )web"
                ],
                canonical: "oc rollout history deployment/web -n apps",
                hint: "oc rollout history deployment/<이름>",
                explain: "리비전 번호 목록을 보여줍니다. 특정 리비전 상세는 --revision=N 플래그로 확인합니다."
            },
            {
                id: "dep-04",
                scenario: "apps 네임스페이스의 web 디플로이먼트를 직전 버전으로 롤백하세요.",
                answers: [
                    "oc rollout undo (?:deployment|deploy)(?:/| )web (?:-n|--namespace)[ =]apps",
                    "oc rollout undo (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )web"
                ],
                canonical: "oc rollout undo deployment/web -n apps",
                hint: "oc rollout undo deployment/<이름>",
                explain: "잘못된 배포의 즉효약입니다. --to-revision=N으로 특정 리비전까지 되돌릴 수도 있습니다."
            },
            {
                id: "dep-05",
                scenario: "apps 네임스페이스의 web 디플로이먼트에서 nginx 컨테이너의 이미지를 nginx:1.25로 교체하세요.",
                answers: [
                    "oc set image (?:deployment|deploy)(?:/| )web nginx=nginx:1\\.25 (?:-n|--namespace)[ =]apps",
                    "oc set image (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )web nginx=nginx:1\\.25"
                ],
                canonical: "oc set image deployment/web nginx=nginx:1.25 -n apps",
                hint: "oc set image deployment/<이름> <컨테이너>=<이미지>",
                explain: "이미지 교체는 새 롤아웃을 트리거합니다. 모든 컨테이너를 한 번에 바꾸려면 *=<이미지>를 사용합니다."
            },
            {
                id: "dep-06",
                scenario: "apps 네임스페이스의 web Route에서 호스트명만 jsonpath로 추출하세요.",
                answers: [
                    "oc get routes? web -o[ =]jsonpath=['\"]?\\{\\.spec\\.host\\}['\"]? (?:-n|--namespace)[ =]apps",
                    "oc get routes? web (?:-n|--namespace)[ =]apps -o[ =]jsonpath=['\"]?\\{\\.spec\\.host\\}['\"]?",
                    "oc (?:-n|--namespace)[ =]apps get routes? web -o[ =]jsonpath=['\"]?\\{\\.spec\\.host\\}['\"]?"
                ],
                canonical: "oc get route web -o jsonpath='{.spec.host}' -n apps",
                hint: "-o jsonpath='{.spec.host}'",
                explain: "curl 검증 전에 호스트를 뽑는 표준 기법입니다. jsonpath는 특정 필드만 출력해 스크립트 조합에 유용합니다."
            },
            {
                id: "dep-07",
                scenario: "Route 주소가 web-apps.apps.ocp4.example.com 일 때, HTTP 접속으로 앱 응답을 확인하세요.",
                answers: [
                    "curl (?:-s )?http://web-apps\\.apps\\.ocp4\\.example\\.com/?"
                ],
                canonical: "curl http://web-apps.apps.ocp4.example.com",
                hint: "curl http://<route호스트>",
                explain: "Route 생성 후 반드시 curl로 응답을 확인합니다. TLS route면 https:// + 자체서명 인증서일 때 -k를 붙입니다."
            },
            {
                id: "dep-08",
                scenario: "deployment 리소스의 spec.replicas 필드 문서를 확인하세요.",
                answers: [
                    "oc explain (?:deployment|deploy)\\.spec\\.replicas"
                ],
                canonical: "oc explain deployment.spec.replicas",
                hint: "oc explain <리소스>.<필드>",
                explain: "YAML 작성 중 필드 위치가 헷갈리면 explain이 가장 빠릅니다. --recursive로 하위 전체 구조도 볼 수 있습니다."
            },
            {
                id: "dep-09",
                scenario: "Git 소스 https://github.com/example/app 으로 myapp 이라는 애플리케이션을 배포하세요. (S2I)",
                answers: [
                    "oc new-app --name[ =]myapp https://github\\.com/example/app",
                    "oc new-app https://github\\.com/example/app --name[ =]myapp"
                ],
                canonical: "oc new-app --name myapp https://github.com/example/app",
                hint: "oc new-app --name <이름> <git-url>",
                explain: "Git URL을 주면 S2I(Source-to-Image) 빌드가 자동 구성됩니다: BuildConfig → ImageStream → Deployment → Service까지 한 번에 생성됩니다."
            }
        ]
    },

    MANIFESTS: {
        label: "Kustomize/Helm/Template",
        questions: [
            {
                id: "man-01",
                scenario: "overlays/dev 디렉터리의 Kustomize 오버레이를 클러스터에 적용하세요.",
                answers: [
                    "oc apply -k overlays/dev/?",
                    "kubectl apply -k overlays/dev/?"
                ],
                canonical: "oc apply -k overlays/dev",
                hint: "oc apply -k <디렉터리>",
                explain: "-k는 해당 디렉터리의 kustomization.yaml을 읽어 base + patch를 합성해 적용합니다. base/overlays 구조가 표준입니다."
            },
            {
                id: "man-02",
                scenario: "overlays/dev 오버레이로 만든 리소스를 모두 삭제하세요.",
                answers: [
                    "oc delete -k overlays/dev/?",
                    "kubectl delete -k overlays/dev/?"
                ],
                canonical: "oc delete -k overlays/dev",
                hint: "oc delete -k <디렉터리>",
                explain: "적용과 대칭입니다. 같은 kustomization을 기준으로 생성된 리소스 전체를 정리합니다."
            },
            {
                id: "man-03",
                scenario: "overlays/dev 오버레이가 생성할 매니페스트를 적용하지 않고 출력만 하세요.",
                answers: [
                    "(?:oc|kubectl) kustomize overlays/dev/?"
                ],
                canonical: "oc kustomize overlays/dev",
                hint: "oc kustomize <디렉터리> — 렌더링 미리보기",
                explain: "적용 전 미리보기 습관입니다. patch가 의도대로 합성됐는지 눈으로 확인한 뒤 apply -k 합니다."
            },
            {
                id: "man-04",
                scenario: "차트 example/nginx 를 my-web 이라는 릴리스 이름으로 설치하세요.",
                answers: [
                    "helm install my-web example/nginx"
                ],
                canonical: "helm install my-web example/nginx",
                hint: "helm install <릴리스명> <차트>",
                explain: "릴리스명이 먼저, 차트가 뒤입니다. 값 재정의는 --set key=value 또는 -f values.yaml로 합니다."
            },
            {
                id: "man-05",
                scenario: "현재 네임스페이스에 설치된 Helm 릴리스 목록을 조회하세요.",
                answers: [
                    "helm (?:list|ls)"
                ],
                canonical: "helm list",
                hint: "helm list",
                explain: "릴리스 이름/리비전/차트 버전이 나옵니다. 전 네임스페이스는 helm list -A입니다."
            },
            {
                id: "man-06",
                scenario: "my-web 릴리스를 example/nginx 차트의 새 버전으로 업그레이드하세요.",
                answers: [
                    "helm upgrade my-web example/nginx"
                ],
                canonical: "helm upgrade my-web example/nginx",
                hint: "helm upgrade <릴리스명> <차트>",
                explain: "업그레이드 실패 시 helm rollback <릴리스> <리비전>으로 되돌립니다. 이력은 helm history로 확인합니다."
            },
            {
                id: "man-07",
                scenario: "https://charts.example.com 차트 저장소를 example 이라는 이름으로 추가하세요.",
                answers: [
                    "helm repo add example https://charts\\.example\\.com/?"
                ],
                canonical: "helm repo add example https://charts.example.com",
                hint: "helm repo add <이름> <URL>",
                explain: "저장소 추가 후 helm repo update로 인덱스를 갱신하고 helm search repo로 차트를 찾습니다."
            },
            {
                id: "man-08",
                scenario: "mytemplate 템플릿을 NAME=web 파라미터로 렌더링해 바로 클러스터에 적용하세요. (파이프 사용)",
                answers: [
                    "oc process mytemplate (?:-p|--param)[ =]NAME=web \\| oc (?:apply|create) -f -"
                ],
                canonical: "oc process mytemplate -p NAME=web | oc apply -f -",
                hint: "oc process <템플릿> -p KEY=값 | oc apply -f -",
                explain: "process는 템플릿 파라미터를 치환해 매니페스트를 출력합니다. 파이프로 apply에 넘기는 것이 표준 원라이너입니다."
            }
        ]
    },

    OPERATORS: {
        label: "오퍼레이터",
        questions: [
            {
                id: "op-01",
                scenario: "설치 가능한 오퍼레이터 목록(패키지 매니페스트)을 조회하세요.",
                answers: [
                    "oc get packagemanifests? (?:-n|--namespace)[ =]openshift-marketplace",
                    "oc get packagemanifests?"
                ],
                canonical: "oc get packagemanifests -n openshift-marketplace",
                hint: "oc get packagemanifests -n openshift-marketplace",
                explain: "OperatorHub에 노출되는 카탈로그입니다. 여기서 오퍼레이터 이름과 채널을 확인한 뒤 Subscription을 작성합니다."
            },
            {
                id: "op-02",
                scenario: "cert-manager 오퍼레이터의 채널 등 상세 정보를 확인하세요.",
                answers: [
                    "oc describe packagemanifests? cert-manager (?:-n|--namespace)[ =]openshift-marketplace",
                    "oc describe packagemanifests? cert-manager"
                ],
                canonical: "oc describe packagemanifest cert-manager -n openshift-marketplace",
                hint: "oc describe packagemanifest <이름>",
                explain: "채널(stable 등), 기본 채널, 설치 모드를 여기서 확인합니다. Subscription의 channel 값이 여기서 나옵니다."
            },
            {
                id: "op-03",
                scenario: "클러스터의 카탈로그 소스 목록을 조회하세요.",
                answers: [
                    "oc get catalogsources? (?:-n|--namespace)[ =]openshift-marketplace"
                ],
                canonical: "oc get catalogsources -n openshift-marketplace",
                hint: "oc get catalogsources -n openshift-marketplace",
                explain: "redhat-operators, community-operators 등 오퍼레이터 공급원입니다. 카탈로그가 READY가 아니면 설치가 안 됩니다."
            },
            {
                id: "op-04",
                scenario: "클러스터 전체의 Subscription을 조회하세요.",
                answers: [
                    "oc get (?:subscriptions?|subs?) (?:-A|--all-namespaces)"
                ],
                canonical: "oc get subscriptions -A",
                hint: "oc get subscriptions -A",
                explain: "Subscription은 '이 오퍼레이터를 이 채널로 설치·자동갱신하라'는 선언입니다. 설치 흐름: OperatorGroup → Subscription → CSV."
            },
            {
                id: "op-05",
                scenario: "openshift-operators 네임스페이스에서 오퍼레이터 설치 상태(CSV)를 확인하세요.",
                answers: [
                    "oc get (?:csvs?|clusterserviceversions?) (?:-n|--namespace)[ =]openshift-operators",
                    "oc (?:-n|--namespace)[ =]openshift-operators get (?:csvs?|clusterserviceversions?)"
                ],
                canonical: "oc get csv -n openshift-operators",
                hint: "oc get csv -n <네임스페이스>",
                explain: "CSV(ClusterServiceVersion)의 PHASE가 Succeeded여야 설치 완료입니다. 시험에서도 이걸로 검증합니다."
            },
            {
                id: "op-06",
                scenario: "my-operators 네임스페이스의 OperatorGroup을 조회하세요.",
                answers: [
                    "oc get (?:operatorgroups?|og) (?:-n|--namespace)[ =]my-operators",
                    "oc (?:-n|--namespace)[ =]my-operators get (?:operatorgroups?|og)"
                ],
                canonical: "oc get operatorgroups -n my-operators",
                hint: "oc get operatorgroups -n <네임스페이스>",
                explain: "OperatorGroup은 오퍼레이터가 감시할 네임스페이스 범위를 정합니다. openshift-operators에는 기본으로 있고, 커스텀 네임스페이스 설치 시 직접 만들어야 합니다."
            },
            {
                id: "op-07",
                scenario: "오퍼레이터 제거의 첫 단계로, openshift-operators 네임스페이스의 cert-manager Subscription을 삭제하세요.",
                answers: [
                    "oc delete (?:subscription|sub) cert-manager (?:-n|--namespace)[ =]openshift-operators",
                    "oc (?:-n|--namespace)[ =]openshift-operators delete (?:subscription|sub) cert-manager"
                ],
                canonical: "oc delete subscription cert-manager -n openshift-operators",
                hint: "제거 순서: Subscription → CSV → (CR/OperatorGroup 정리)",
                explain: "Subscription 삭제만으론 CSV(실제 설치본)가 남습니다. oc delete csv <이름>까지 해야 완전 제거이고, 사용하던 CR도 정리 대상입니다."
            }
        ]
    },

    SCC_SA: {
        label: "SCC/서비스어카운트",
        questions: [
            {
                id: "scc-01",
                scenario: "apps 네임스페이스에 legacy-sa 라는 서비스어카운트를 생성하세요.",
                answers: [
                    "oc create (?:sa|serviceaccount) legacy-sa (?:-n|--namespace)[ =]apps",
                    "oc (?:-n|--namespace)[ =]apps create (?:sa|serviceaccount) legacy-sa"
                ],
                canonical: "oc create sa legacy-sa -n apps",
                hint: "oc create sa <이름>",
                explain: "파드에 특별 권한이 필요하면 default SA 대신 전용 SA를 만들어 SCC를 부여하는 것이 모범 사례입니다."
            },
            {
                id: "scc-02",
                scenario: "apps 네임스페이스의 legacy-sa 서비스어카운트에 anyuid SCC를 부여하세요.",
                answers: [
                    "oc adm policy add-scc-to-user anyuid -z legacy-sa (?:-n|--namespace)[ =]apps",
                    "oc adm policy (?:-n|--namespace)[ =]apps add-scc-to-user anyuid -z legacy-sa"
                ],
                canonical: "oc adm policy add-scc-to-user anyuid -z legacy-sa -n apps",
                hint: "add-scc-to-user <scc> -z <SA> — -z는 현재 네임스페이스의 SA를 의미",
                explain: "anyuid는 컨테이너가 이미지에 지정된 UID(root 포함)로 실행되도록 허용합니다. -z는 사용자 대신 서비스어카운트를 지정하는 플래그입니다."
            },
            {
                id: "scc-03",
                scenario: "apps 네임스페이스의 legacy 디플로이먼트가 legacy-sa 서비스어카운트를 사용하도록 지정하세요.",
                answers: [
                    "oc set (?:serviceaccount|sa) (?:deployment|deploy)(?:/| )legacy legacy-sa (?:-n|--namespace)[ =]apps",
                    "oc set (?:serviceaccount|sa) (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )legacy legacy-sa"
                ],
                canonical: "oc set serviceaccount deployment/legacy legacy-sa -n apps",
                hint: "oc set serviceaccount deployment/<이름> <SA>",
                explain: "SCC는 SA에 부여하고, 워크로드는 그 SA를 사용해야 효력이 생깁니다. 지정 후 파드가 재생성되며 적용됩니다."
            },
            {
                id: "scc-04",
                scenario: "anyuid SCC의 상세 내용(허용 범위)을 확인하세요.",
                answers: [
                    "oc describe scc anyuid"
                ],
                canonical: "oc describe scc anyuid",
                hint: "oc describe scc <이름>",
                explain: "RunAsUser, Capabilities, Volumes 등 무엇이 허용되는지 나옵니다. restricted-v2가 기본이고 anyuid/privileged 순으로 권한이 커집니다."
            },
            {
                id: "scc-05",
                scenario: "pod.yaml에 정의된 파드가 어떤 SCC로 실행될 수 있는지 검토하세요.",
                answers: [
                    "oc adm policy scc-subject-review -f pod\\.yaml"
                ],
                canonical: "oc adm policy scc-subject-review -f pod.yaml",
                hint: "oc adm policy scc-subject-review -f <yaml>",
                explain: "배포 전에 '이 파드가 어떤 SCC에 매칭되는지'를 미리 확인합니다. 권한 오류(CrashLoopBackOff) 예방에 유용합니다."
            },
            {
                id: "scc-06",
                scenario: "apps 네임스페이스의 legacy-sa 서비스어카운트가 anyuid SCC를 사용할 수 있는지 확인하세요.",
                answers: [
                    "oc auth can-i use scc/anyuid --as[ =]system:serviceaccount:apps:legacy-sa"
                ],
                canonical: "oc auth can-i use scc/anyuid --as=system:serviceaccount:apps:legacy-sa",
                hint: "--as=system:serviceaccount:<ns>:<sa>",
                explain: "SA의 정식 사용자명은 system:serviceaccount:<네임스페이스>:<이름>입니다. SCC 부여 검증의 표준 방법입니다."
            },
            {
                id: "scc-07",
                scenario: "클러스터의 SCC 목록을 조회하세요.",
                answers: [
                    "oc get scc",
                    "oc get securitycontextconstraints?"
                ],
                canonical: "oc get scc",
                hint: "oc get scc",
                explain: "restricted-v2, anyuid, privileged, hostaccess 등이 나옵니다. 파드가 어떤 SCC로 떴는지는 파드 어노테이션 openshift.io/scc에서 확인합니다."
            }
        ]
    },

    JOBS: {
        label: "Job/CronJob",
        questions: [
            {
                id: "job-01",
                scenario: "busybox 이미지로 echo hello 를 실행하는 test-job 이라는 Job을 생성하세요.",
                answers: [
                    "oc create job test-job --image[ =]busybox -- echo hello"
                ],
                canonical: "oc create job test-job --image=busybox -- echo hello",
                hint: "oc create job <이름> --image=<이미지> -- <명령>",
                explain: "-- 뒤가 컨테이너에서 실행할 명령입니다. Job은 완료(Completed)될 때까지 파드를 재시도하는 일회성 작업입니다."
            },
            {
                id: "job-02",
                scenario: "busybox 이미지로 매일 새벽 2시에 backup.sh 를 실행하는 backup 이라는 CronJob을 생성하세요.",
                answers: [
                    "oc create cronjob backup --image[ =]busybox --schedule[ =]['\"]0 2 \\* \\* \\*['\"] -- backup\\.sh",
                    "oc create cronjob backup --schedule[ =]['\"]0 2 \\* \\* \\*['\"] --image[ =]busybox -- backup\\.sh"
                ],
                canonical: "oc create cronjob backup --image=busybox --schedule=\"0 2 * * *\" -- backup.sh",
                hint: "--schedule=\"분 시 일 월 요일\" (cron 형식)",
                explain: "cron 형식: 분 시 일 월 요일. \"0 2 * * *\"는 매일 02:00입니다. 스케줄은 반드시 따옴표로 감쌉니다."
            },
            {
                id: "job-03",
                scenario: "apps 네임스페이스의 Job 목록을 조회하세요.",
                answers: [
                    "oc get jobs? (?:-n|--namespace)[ =]apps",
                    "oc (?:-n|--namespace)[ =]apps get jobs?"
                ],
                canonical: "oc get jobs -n apps",
                hint: "oc get jobs -n <네임스페이스>",
                explain: "COMPLETIONS 열이 1/1이면 성공입니다. 실패한 Job은 파드 로그로 원인을 확인합니다."
            },
            {
                id: "job-04",
                scenario: "test-job 이라는 Job의 실행 로그를 확인하세요.",
                answers: [
                    "oc logs job/test-job"
                ],
                canonical: "oc logs job/test-job",
                hint: "oc logs job/<이름>",
                explain: "job/이름 형식이면 해당 Job의 파드를 자동으로 찾아 로그를 보여줍니다. 파드 이름을 몰라도 됩니다."
            },
            {
                id: "job-05",
                scenario: "backup CronJob을 지금 즉시 수동으로 한 번 실행하세요. (Job 이름: manual-run)",
                answers: [
                    "oc create job manual-run --from[ =]cronjob/backup"
                ],
                canonical: "oc create job manual-run --from=cronjob/backup",
                hint: "oc create job <이름> --from=cronjob/<크론잡>",
                explain: "스케줄을 기다리지 않고 CronJob 템플릿으로 Job을 즉시 생성합니다. CronJob 동작 검증의 표준 방법입니다."
            },
            {
                id: "job-06",
                scenario: "apps 네임스페이스의 CronJob 목록을 조회하세요.",
                answers: [
                    "oc get (?:cronjobs?|cj) (?:-n|--namespace)[ =]apps",
                    "oc (?:-n|--namespace)[ =]apps get (?:cronjobs?|cj)"
                ],
                canonical: "oc get cronjobs -n apps",
                hint: "oc get cronjobs (축약형: cj)",
                explain: "SCHEDULE, SUSPEND, LAST SCHEDULE이 보입니다. 일시 중지는 spec.suspend=true 패치로 합니다."
            }
        ]
    }
};
