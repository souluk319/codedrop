/**
 * CodeDrop - EX280 모의랩 데이터
 * 각 랩은 실제 시험처럼 여러 명령을 순서대로 입력하는 절차 훈련이다.
 */

const MOCK_LABS = [
    {
        id: "lab-01",
        title: "앱 배포와 외부 노출",
        goal: "프로젝트 생성부터 Deployment, Service, Route, 스케일, 검증까지 한 번에 수행합니다.",
        steps: [
            {
                id: "lab-01-01",
                scenario: "lab-web 프로젝트를 생성하고 전환하세요.",
                answers: ["oc new-project lab-web"],
                canonical: "oc new-project lab-web",
                hint: "new-project는 생성과 전환을 동시에 합니다.",
                explain: "시험에서는 먼저 작업 네임스페이스를 확정해야 뒤 명령의 -n 실수를 줄일 수 있습니다."
            },
            {
                id: "lab-01-02",
                scenario: "nginx 이미지로 web 디플로이먼트를 생성하세요.",
                answers: [
                    "oc create (?:deployment|deploy) web --image[ =]nginx(?: (?:-n|--namespace)[ =]lab-web)?",
                    "oc (?:-n|--namespace)[ =]lab-web create (?:deployment|deploy) web --image[ =]nginx"
                ],
                canonical: "oc create deployment web --image=nginx -n lab-web",
                hint: "oc create deployment <name> --image=<image>",
                explain: "명령형 생성은 빠르고, --dry-run=client -o yaml을 붙이면 매니페스트 뼈대 생성에도 쓸 수 있습니다."
            },
            {
                id: "lab-01-03",
                scenario: "web 디플로이먼트를 8080 포트 서비스로 노출하세요.",
                answers: [
                    "oc expose (?:deployment|deploy)(?:/| )web --port[ =]8080(?: (?:-n|--namespace)[ =]lab-web)?",
                    "oc expose (?:-n|--namespace)[ =]lab-web (?:deployment|deploy)(?:/| )web --port[ =]8080"
                ],
                canonical: "oc expose deployment/web --port=8080 -n lab-web",
                hint: "Deployment -> Service는 oc expose deployment/<name>",
                explain: "Deployment를 expose하면 같은 이름의 Service가 만들어집니다. 이후 Route는 Service를 대상으로 만듭니다."
            },
            {
                id: "lab-01-04",
                scenario: "web 서비스를 Route로 외부 노출하세요.",
                answers: [
                    "oc expose (?:service|svc)(?:/| )web(?: (?:-n|--namespace)[ =]lab-web)?",
                    "oc expose (?:-n|--namespace)[ =]lab-web (?:service|svc)(?:/| )web"
                ],
                canonical: "oc expose service/web -n lab-web",
                hint: "Service -> Route도 oc expose service/<name>",
                explain: "OpenShift Route는 클러스터 외부 HTTP 접근 지점입니다."
            },
            {
                id: "lab-01-05",
                scenario: "web 디플로이먼트를 레플리카 3개로 스케일하세요.",
                answers: [
                    "oc scale (?:deployment|deploy)(?:/| )web --replicas[ =]3(?: (?:-n|--namespace)[ =]lab-web)?",
                    "oc scale --replicas[ =]3 (?:deployment|deploy)(?:/| )web(?: (?:-n|--namespace)[ =]lab-web)?"
                ],
                canonical: "oc scale deployment/web --replicas=3 -n lab-web",
                hint: "oc scale deployment/<name> --replicas=<n>",
                explain: "수동 스케일은 oc scale, 자동 스케일은 oc autoscale입니다."
            },
            {
                id: "lab-01-06",
                scenario: "web Route의 호스트명을 jsonpath로 추출하세요.",
                answers: [
                    "oc get routes? web -o[ =]jsonpath=['\"]?\\{\\.spec\\.host\\}['\"]?(?: (?:-n|--namespace)[ =]lab-web)?",
                    "oc get routes? web(?: (?:-n|--namespace)[ =]lab-web)? -o[ =]jsonpath=['\"]?\\{\\.spec\\.host\\}['\"]?"
                ],
                canonical: "oc get route web -o jsonpath='{.spec.host}' -n lab-web",
                hint: "-o jsonpath='{.spec.host}'",
                explain: "검증 명령을 빠르게 만들려면 Route host만 뽑는 jsonpath를 손에 익혀야 합니다."
            }
        ]
    },
    {
        id: "lab-02",
        title: "htpasswd 사용자 추가",
        goal: "기존 htpasswd Secret을 추출해 사용자를 추가하고 다시 반영합니다.",
        steps: [
            {
                id: "lab-02-01",
                scenario: "openshift-config의 htpasswd-secret을 /tmp/로 추출하세요.",
                answers: [
                    "oc extract secret/htpasswd-secret (?:-n|--namespace)[ =]openshift-config --to[ =]/tmp/? --confirm",
                    "oc extract secret/htpasswd-secret --to[ =]/tmp/? --confirm (?:-n|--namespace)[ =]openshift-config"
                ],
                canonical: "oc extract secret/htpasswd-secret -n openshift-config --to /tmp/ --confirm",
                hint: "oc extract secret/<name> --to <dir> --confirm",
                explain: "Secret 데이터를 파일로 꺼낸 뒤 htpasswd를 수정하는 흐름이 안전합니다."
            },
            {
                id: "lab-02-02",
                scenario: "/tmp/htpasswd에 사용자 auditor, 비밀번호 redhat을 bcrypt 배치 모드로 추가하세요.",
                answers: ["htpasswd (?:-B -b|-b -B|-[bB]{2}) /tmp/htpasswd auditor redhat"],
                canonical: "htpasswd -B -b /tmp/htpasswd auditor redhat",
                hint: "기존 파일 수정이므로 -c는 쓰지 않습니다.",
                explain: "-c는 새 파일 생성이라 기존 사용자를 날릴 수 있습니다."
            },
            {
                id: "lab-02-03",
                scenario: "수정된 /tmp/htpasswd로 htpasswd-secret 데이터를 교체하세요.",
                answers: [
                    "oc set data secret/htpasswd-secret --from-file[ =]htpasswd=/tmp/htpasswd (?:-n|--namespace)[ =]openshift-config",
                    "oc set data secret/htpasswd-secret (?:-n|--namespace)[ =]openshift-config --from-file[ =]htpasswd=/tmp/htpasswd"
                ],
                canonical: "oc set data secret/htpasswd-secret --from-file=htpasswd=/tmp/htpasswd -n openshift-config",
                hint: "oc set data secret/<name> --from-file=htpasswd=<file>",
                explain: "Secret 이름과 키 이름 htpasswd를 유지해야 OAuth 설정이 계속 참조합니다."
            },
            {
                id: "lab-02-04",
                scenario: "OAuth 파드가 재배포되는지 openshift-authentication 네임스페이스의 파드를 확인하세요.",
                answers: [
                    "oc get pods? (?:-n|--namespace)[ =]openshift-authentication",
                    "oc (?:-n|--namespace)[ =]openshift-authentication get pods?"
                ],
                canonical: "oc get pods -n openshift-authentication",
                hint: "OAuth 적용 확인은 authentication 파드 상태부터 봅니다.",
                explain: "htpasswd Secret 변경 후 OAuth 오퍼레이터가 관련 파드를 갱신합니다."
            }
        ]
    },
    {
        id: "lab-03",
        title: "그룹 권한과 self-provisioner 차단",
        goal: "그룹 기반 RBAC를 적용하고 일반 사용자의 프로젝트 셀프 프로비저닝을 막습니다.",
        steps: [
            {
                id: "lab-03-01",
                scenario: "dev-team 그룹을 생성하세요.",
                answers: ["oc adm groups new dev-team"],
                canonical: "oc adm groups new dev-team",
                hint: "oc adm groups new <group>",
                explain: "사용자별 권한보다 그룹별 권한이 관리와 시험 검증 모두 쉽습니다."
            },
            {
                id: "lab-03-02",
                scenario: "dev-team에 user1과 user2를 추가하세요.",
                answers: ["oc adm groups add-users dev-team user1 user2"],
                canonical: "oc adm groups add-users dev-team user1 user2",
                hint: "add-users 뒤에 여러 사용자를 공백으로 나열합니다.",
                explain: "그룹 구성 후 그룹에 RoleBinding을 걸면 두 사용자에게 동시에 적용됩니다."
            },
            {
                id: "lab-03-03",
                scenario: "project1에서 dev-team 그룹에 edit 역할을 부여하세요.",
                answers: [
                    "oc adm policy add-role-to-group edit dev-team (?:-n|--namespace)[ =]project1",
                    "oc adm policy (?:-n|--namespace)[ =]project1 add-role-to-group edit dev-team"
                ],
                canonical: "oc adm policy add-role-to-group edit dev-team -n project1",
                hint: "add-role-to-group <role> <group> -n <project>",
                explain: "edit은 리소스 변경 권한을 주지만 RBAC를 마음대로 바꾸지는 못합니다."
            },
            {
                id: "lab-03-04",
                scenario: "인증된 OAuth 사용자의 self-provisioner 클러스터 역할을 제거하세요.",
                answers: ["oc adm policy remove-cluster-role-from-group self-provisioners? system:authenticated:oauth"],
                canonical: "oc adm policy remove-cluster-role-from-group self-provisioner system:authenticated:oauth",
                hint: "remove-cluster-role-from-group self-provisioner system:authenticated:oauth",
                explain: "EX280 단골 운영 과제입니다. 일반 사용자의 oc new-project를 막습니다."
            },
            {
                id: "lab-03-05",
                scenario: "user1이 project1에서 파드를 생성할 수 있는지 검증하세요.",
                answers: [
                    "oc auth can-i create pods? --as[ =]user1 (?:-n|--namespace)[ =]project1",
                    "oc auth can-i create pods? (?:-n|--namespace)[ =]project1 --as[ =]user1"
                ],
                canonical: "oc auth can-i create pods --as=user1 -n project1",
                hint: "oc auth can-i <verb> <resource> --as=<user> -n <project>",
                explain: "권한 변경 후 can-i 검증까지 해야 시험 답안으로 안정적입니다."
            }
        ]
    },
    {
        id: "lab-04",
        title: "anyuid SCC 문제 해결",
        goal: "권한 문제로 뜨지 않는 워크로드에 전용 SA와 anyuid SCC를 연결합니다.",
        steps: [
            {
                id: "lab-04-01",
                scenario: "apps 네임스페이스에서 문제가 있는 파드 목록을 확인하세요.",
                answers: [
                    "oc get pods? (?:-n|--namespace)[ =]apps",
                    "oc (?:-n|--namespace)[ =]apps get pods?"
                ],
                canonical: "oc get pods -n apps",
                hint: "먼저 상태를 봅니다.",
                explain: "SCC 문제는 Pending, CreateContainerConfigError, CrashLoopBackOff 등으로 나타날 수 있습니다."
            },
            {
                id: "lab-04-02",
                scenario: "apps 네임스페이스에 legacy-sa 서비스어카운트를 생성하세요.",
                answers: [
                    "oc create (?:sa|serviceaccount) legacy-sa (?:-n|--namespace)[ =]apps",
                    "oc (?:-n|--namespace)[ =]apps create (?:sa|serviceaccount) legacy-sa"
                ],
                canonical: "oc create sa legacy-sa -n apps",
                hint: "oc create sa <name> -n <ns>",
                explain: "기본 SA에 과권한을 주지 말고 워크로드 전용 SA를 만듭니다."
            },
            {
                id: "lab-04-03",
                scenario: "legacy-sa에 anyuid SCC를 부여하세요.",
                answers: [
                    "oc adm policy add-scc-to-user anyuid -z legacy-sa (?:-n|--namespace)[ =]apps",
                    "oc adm policy (?:-n|--namespace)[ =]apps add-scc-to-user anyuid -z legacy-sa"
                ],
                canonical: "oc adm policy add-scc-to-user anyuid -z legacy-sa -n apps",
                hint: "-z는 서비스어카운트를 뜻합니다.",
                explain: "anyuid는 이미지가 요구하는 UID로 컨테이너가 실행되게 합니다."
            },
            {
                id: "lab-04-04",
                scenario: "legacy 디플로이먼트가 legacy-sa를 사용하도록 설정하세요.",
                answers: [
                    "oc set (?:serviceaccount|sa) (?:deployment|deploy)(?:/| )legacy legacy-sa (?:-n|--namespace)[ =]apps",
                    "oc set (?:serviceaccount|sa) (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )legacy legacy-sa"
                ],
                canonical: "oc set serviceaccount deployment/legacy legacy-sa -n apps",
                hint: "oc set serviceaccount deployment/<name> <sa>",
                explain: "SCC는 SA에 붙고, 워크로드가 그 SA를 써야 실제 적용됩니다."
            },
            {
                id: "lab-04-05",
                scenario: "legacy 디플로이먼트 롤아웃 완료를 확인하세요.",
                answers: [
                    "oc rollout status (?:deployment|deploy)(?:/| )legacy (?:-n|--namespace)[ =]apps",
                    "oc rollout status (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )legacy"
                ],
                canonical: "oc rollout status deployment/legacy -n apps",
                hint: "rollout status로 해결 여부를 검증합니다.",
                explain: "권한을 바꿨다면 파드가 재생성되고 정상 rollout 되는지 확인해야 합니다."
            }
        ]
    },
    {
        id: "lab-05",
        title: "ConfigMap과 Secret 주입",
        goal: "설정과 민감정보를 만들고 환경변수/볼륨으로 주입합니다.",
        steps: [
            {
                id: "lab-05-01",
                scenario: "apps 네임스페이스에 MODE=prod 값을 담은 app-conf ConfigMap을 생성하세요.",
                answers: [
                    "oc create (?:configmap|cm) app-conf --from-literal[ =]MODE=prod (?:-n|--namespace)[ =]apps",
                    "oc create (?:configmap|cm) app-conf (?:-n|--namespace)[ =]apps --from-literal[ =]MODE=prod"
                ],
                canonical: "oc create configmap app-conf --from-literal=MODE=prod -n apps",
                hint: "oc create configmap <name> --from-literal=KEY=value",
                explain: "ConfigMap은 민감하지 않은 앱 설정에 씁니다."
            },
            {
                id: "lab-05-02",
                scenario: "apps 네임스페이스에 password=redhat 값을 담은 db-secret Secret을 생성하세요.",
                answers: [
                    "oc create secret generic db-secret --from-literal[ =]password=redhat (?:-n|--namespace)[ =]apps",
                    "oc create secret generic db-secret (?:-n|--namespace)[ =]apps --from-literal[ =]password=redhat"
                ],
                canonical: "oc create secret generic db-secret --from-literal=password=redhat -n apps",
                hint: "oc create secret generic <name> --from-literal=KEY=value",
                explain: "Secret은 base64 인코딩 저장이며 암호/토큰 같은 민감정보를 넣습니다."
            },
            {
                id: "lab-05-03",
                scenario: "app 디플로이먼트에 app-conf의 모든 키를 환경변수로 주입하세요.",
                answers: [
                    "oc set env (?:deployment|deploy)(?:/| )app --from[ =]configmap/app-conf (?:-n|--namespace)[ =]apps",
                    "oc set env (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )app --from[ =]configmap/app-conf"
                ],
                canonical: "oc set env deployment/app --from=configmap/app-conf -n apps",
                hint: "oc set env deployment/<name> --from=configmap/<cm>",
                explain: "환경변수 주입은 앱 프로세스가 키 값을 직접 읽는 경우에 편합니다."
            },
            {
                id: "lab-05-04",
                scenario: "app 디플로이먼트에 db-secret을 /etc/secret 경로로 마운트하세요.",
                answers: [
                    "oc set volumes? (?:deployment|deploy)(?:/| )app --add (?:--type[ =]secret --secret-name[ =]db-secret|--secret-name[ =]db-secret --type[ =]secret) --mount-path[ =]/etc/secret (?:-n|--namespace)[ =]apps",
                    "oc set volumes? (?:deployment|deploy)(?:/| )app (?:-n|--namespace)[ =]apps --add (?:--type[ =]secret --secret-name[ =]db-secret|--secret-name[ =]db-secret --type[ =]secret) --mount-path[ =]/etc/secret"
                ],
                canonical: "oc set volume deployment/app --add --type secret --secret-name db-secret --mount-path /etc/secret -n apps",
                hint: "oc set volume deployment/<name> --add --type secret --secret-name <secret>",
                explain: "파일 형태로 필요한 인증서/키는 볼륨 마운트가 더 자연스럽습니다."
            }
        ]
    },
    {
        id: "lab-06",
        title: "쿼터와 리소스 제한",
        goal: "프로젝트 총량 쿼터와 워크로드 requests/limits를 적용합니다.",
        steps: [
            {
                id: "lab-06-01",
                scenario: "project1에 pods=10, requests.cpu=2, requests.memory=1Gi 쿼터를 생성하세요.",
                answers: [
                    "oc create quota compute-quota --hard[ =]pods=10,requests\\.cpu=2,requests\\.memory=1Gi (?:-n|--namespace)[ =]project1",
                    "oc create quota compute-quota (?:-n|--namespace)[ =]project1 --hard[ =]pods=10,requests\\.cpu=2,requests\\.memory=1Gi"
                ],
                canonical: "oc create quota compute-quota --hard=pods=10,requests.cpu=2,requests.memory=1Gi -n project1",
                hint: "--hard=키=값,키=값",
                explain: "ResourceQuota는 네임스페이스 전체 사용량의 상한을 제어합니다."
            },
            {
                id: "lab-06-02",
                scenario: "project1의 compute-quota 사용 현황을 확인하세요.",
                answers: [
                    "oc describe quota compute-quota (?:-n|--namespace)[ =]project1",
                    "oc describe resourcequotas? compute-quota (?:-n|--namespace)[ =]project1"
                ],
                canonical: "oc describe quota compute-quota -n project1",
                hint: "describe quota가 Used/Hard를 보여줍니다.",
                explain: "생성 직후와 문제 해결 중 모두 describe quota를 자주 확인합니다."
            },
            {
                id: "lab-06-03",
                scenario: "front 디플로이먼트에 CPU request 100m, memory limit 256Mi를 설정하세요.",
                answers: [
                    "oc set resources (?:deployment|deploy)(?:/| )front --requests[ =]cpu=100m --limits[ =]memory=256Mi (?:-n|--namespace)[ =]project1",
                    "oc set resources (?:deployment|deploy)(?:/| )front (?:-n|--namespace)[ =]project1 --requests[ =]cpu=100m --limits[ =]memory=256Mi"
                ],
                canonical: "oc set resources deployment/front --requests=cpu=100m --limits=memory=256Mi -n project1",
                hint: "oc set resources deployment/<name> --requests=... --limits=...",
                explain: "requests는 스케줄링 보장량, limits는 런타임 상한입니다."
            },
            {
                id: "lab-06-04",
                scenario: "front 디플로이먼트의 YAML을 확인하세요.",
                answers: [
                    "oc get (?:deployment|deploy)(?:/| )front -o[ =]yaml (?:-n|--namespace)[ =]project1",
                    "oc get (?:deployment|deploy)(?:/| )front (?:-n|--namespace)[ =]project1 -o[ =]yaml"
                ],
                canonical: "oc get deployment/front -o yaml -n project1",
                hint: "-o yaml로 실제 반영 여부를 봅니다.",
                explain: "시험에서는 적용 후 get -o yaml 또는 describe로 검증해야 실수를 빨리 잡습니다."
            }
        ]
    },
    {
        id: "lab-07",
        title: "롤아웃 업데이트와 롤백",
        goal: "이미지를 바꾸고 롤아웃 확인, 이력 조회, 롤백까지 수행합니다.",
        steps: [
            {
                id: "lab-07-01",
                scenario: "apps의 web 디플로이먼트 nginx 컨테이너 이미지를 nginx:1.25로 바꾸세요.",
                answers: [
                    "oc set image (?:deployment|deploy)(?:/| )web nginx=nginx:1\\.25 (?:-n|--namespace)[ =]apps",
                    "oc set image (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )web nginx=nginx:1\\.25"
                ],
                canonical: "oc set image deployment/web nginx=nginx:1.25 -n apps",
                hint: "oc set image deployment/<name> <container>=<image>",
                explain: "set image는 새 ReplicaSet을 만들며 롤링 업데이트를 시작합니다."
            },
            {
                id: "lab-07-02",
                scenario: "web 디플로이먼트 롤아웃 완료를 확인하세요.",
                answers: [
                    "oc rollout status (?:deployment|deploy)(?:/| )web (?:-n|--namespace)[ =]apps",
                    "oc rollout status (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )web"
                ],
                canonical: "oc rollout status deployment/web -n apps",
                hint: "rollout status",
                explain: "업데이트가 끝났는지 확인하는 검증 명령입니다."
            },
            {
                id: "lab-07-03",
                scenario: "web 디플로이먼트 롤아웃 이력을 조회하세요.",
                answers: [
                    "oc rollout history (?:deployment|deploy)(?:/| )web (?:-n|--namespace)[ =]apps",
                    "oc rollout history (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )web"
                ],
                canonical: "oc rollout history deployment/web -n apps",
                hint: "rollout history deployment/<name>",
                explain: "리비전 확인 후 필요한 경우 특정 리비전으로 undo할 수 있습니다."
            },
            {
                id: "lab-07-04",
                scenario: "web 디플로이먼트를 직전 버전으로 롤백하세요.",
                answers: [
                    "oc rollout undo (?:deployment|deploy)(?:/| )web (?:-n|--namespace)[ =]apps",
                    "oc rollout undo (?:-n|--namespace)[ =]apps (?:deployment|deploy)(?:/| )web"
                ],
                canonical: "oc rollout undo deployment/web -n apps",
                hint: "rollout undo",
                explain: "잘못된 이미지/설정 배포는 undo가 가장 빠른 복구 방법입니다."
            }
        ]
    },
    {
        id: "lab-08",
        title: "Route 검증 루틴",
        goal: "Service, Route, jsonpath, curl 검증 루틴을 반복합니다.",
        steps: [
            {
                id: "lab-08-01",
                scenario: "apps 네임스페이스의 api 서비스를 Route로 노출하세요.",
                answers: [
                    "oc expose (?:service|svc)(?:/| )api (?:-n|--namespace)[ =]apps",
                    "oc expose (?:-n|--namespace)[ =]apps (?:service|svc)(?:/| )api"
                ],
                canonical: "oc expose service/api -n apps",
                hint: "oc expose svc/api",
                explain: "Route는 Service를 외부 HTTP 진입점으로 공개합니다."
            },
            {
                id: "lab-08-02",
                scenario: "api Route의 호스트를 jsonpath로 출력하세요.",
                answers: [
                    "oc get routes? api -o[ =]jsonpath=['\"]?\\{\\.spec\\.host\\}['\"]? (?:-n|--namespace)[ =]apps",
                    "oc get routes? api (?:-n|--namespace)[ =]apps -o[ =]jsonpath=['\"]?\\{\\.spec\\.host\\}['\"]?"
                ],
                canonical: "oc get route api -o jsonpath='{.spec.host}' -n apps",
                hint: "jsonpath='{.spec.host}'",
                explain: "호스트명을 정확히 뽑아 curl 검증으로 이어갑니다."
            },
            {
                id: "lab-08-03",
                scenario: "api-apps.apps.ocp4.example.com 으로 HTTP 응답을 확인하세요.",
                answers: ["curl (?:-s )?http://api-apps\\.apps\\.ocp4\\.example\\.com/?"],
                canonical: "curl http://api-apps.apps.ocp4.example.com",
                hint: "curl http://<route-host>",
                explain: "출제자가 요구한 외부 접근 검증을 명령 하나로 마무리합니다."
            },
            {
                id: "lab-08-04",
                scenario: "apps의 Route 목록을 확인하세요.",
                answers: [
                    "oc get routes? (?:-n|--namespace)[ =]apps",
                    "oc (?:-n|--namespace)[ =]apps get routes?"
                ],
                canonical: "oc get routes -n apps",
                hint: "oc get route -n <ns>",
                explain: "생성한 Route 이름과 HOST/PORT를 최종 확인합니다."
            }
        ]
    },
    {
        id: "lab-09",
        title: "NetworkPolicy 확인",
        goal: "네트워크 정책 적용과 조회를 명령 루틴으로 익힙니다.",
        steps: [
            {
                id: "lab-09-01",
                scenario: "apps 네임스페이스에 deny-all.yaml 네트워크 정책을 적용하세요.",
                answers: [
                    "oc apply -f deny-all\\.yaml (?:-n|--namespace)[ =]apps",
                    "oc apply (?:-n|--namespace)[ =]apps -f deny-all\\.yaml"
                ],
                canonical: "oc apply -f deny-all.yaml -n apps",
                hint: "oc apply -f <file> -n <ns>",
                explain: "YAML 내용 작성이 출제되더라도 적용 명령은 손에 익어 있어야 합니다."
            },
            {
                id: "lab-09-02",
                scenario: "apps의 NetworkPolicy 목록을 조회하세요.",
                answers: [
                    "oc get (?:networkpolic(?:y|ies)|netpol) (?:-n|--namespace)[ =]apps",
                    "oc (?:-n|--namespace)[ =]apps get (?:networkpolic(?:y|ies)|netpol)"
                ],
                canonical: "oc get networkpolicy -n apps",
                hint: "축약형은 netpol",
                explain: "정책 적용 여부는 목록과 describe로 확인합니다."
            },
            {
                id: "lab-09-03",
                scenario: "deny-all 네트워크 정책 상세를 확인하세요.",
                answers: [
                    "oc describe (?:networkpolicy|netpol) deny-all (?:-n|--namespace)[ =]apps",
                    "oc describe (?:-n|--namespace)[ =]apps (?:networkpolicy|netpol) deny-all"
                ],
                canonical: "oc describe networkpolicy deny-all -n apps",
                hint: "describe networkpolicy <name>",
                explain: "podSelector와 ingress/egress 규칙을 읽어 실제 차단 범위를 확인합니다."
            },
            {
                id: "lab-09-04",
                scenario: "allow-web.yaml 정책을 추가 적용하세요.",
                answers: [
                    "oc apply -f allow-web\\.yaml (?:-n|--namespace)[ =]apps",
                    "oc apply (?:-n|--namespace)[ =]apps -f allow-web\\.yaml"
                ],
                canonical: "oc apply -f allow-web.yaml -n apps",
                hint: "허용 정책도 apply -f",
                explain: "NetworkPolicy는 여러 정책이 합쳐져 허용 규칙을 구성합니다."
            }
        ]
    },
    {
        id: "lab-10",
        title: "Kustomize 오버레이",
        goal: "렌더링 미리보기, 적용, 확인, 삭제 루틴을 연습합니다.",
        steps: [
            {
                id: "lab-10-01",
                scenario: "overlays/prod 오버레이가 만들 매니페스트를 출력만 하세요.",
                answers: ["(?:oc|kubectl) kustomize overlays/prod/?"],
                canonical: "oc kustomize overlays/prod",
                hint: "oc kustomize <dir>",
                explain: "적용 전 렌더링 결과를 보는 습관이 실수를 크게 줄입니다."
            },
            {
                id: "lab-10-02",
                scenario: "overlays/prod 오버레이를 적용하세요.",
                answers: ["(?:oc|kubectl) apply -k overlays/prod/?"],
                canonical: "oc apply -k overlays/prod",
                hint: "apply -k <dir>",
                explain: "kustomization.yaml이 base와 patch를 합성합니다."
            },
            {
                id: "lab-10-03",
                scenario: "prod 네임스페이스의 리소스 전체를 확인하세요.",
                answers: [
                    "oc get all (?:-n|--namespace)[ =]prod",
                    "oc (?:-n|--namespace)[ =]prod get all"
                ],
                canonical: "oc get all -n prod",
                hint: "oc get all -n <ns>",
                explain: "적용 결과가 어떤 리소스로 나타났는지 빠르게 스캔합니다."
            },
            {
                id: "lab-10-04",
                scenario: "overlays/prod 오버레이로 생성된 리소스를 삭제하세요.",
                answers: ["(?:oc|kubectl) delete -k overlays/prod/?"],
                canonical: "oc delete -k overlays/prod",
                hint: "delete -k는 apply -k의 반대 루틴입니다.",
                explain: "같은 kustomization 기준으로 생성 리소스를 정리합니다."
            }
        ]
    },
    {
        id: "lab-11",
        title: "Helm 릴리스 운영",
        goal: "차트 저장소, 설치, 업그레이드, 이력 확인을 익힙니다.",
        steps: [
            {
                id: "lab-11-01",
                scenario: "https://charts.example.com 저장소를 example 이름으로 추가하세요.",
                answers: ["helm repo add example https://charts\\.example\\.com/?"],
                canonical: "helm repo add example https://charts.example.com",
                hint: "helm repo add <name> <url>",
                explain: "저장소 추가 후 repo update와 search repo로 차트를 찾습니다."
            },
            {
                id: "lab-11-02",
                scenario: "저장소 인덱스를 갱신하세요.",
                answers: ["helm repo update"],
                canonical: "helm repo update",
                hint: "repo add 다음 repo update",
                explain: "로컬 인덱스가 최신이어야 차트 버전 조회와 설치가 안정적입니다."
            },
            {
                id: "lab-11-03",
                scenario: "example/nginx 차트를 my-web 릴리스로 설치하세요.",
                answers: ["helm install my-web example/nginx"],
                canonical: "helm install my-web example/nginx",
                hint: "helm install <release> <chart>",
                explain: "릴리스명은 클러스터 안에서 Helm이 관리하는 배포 단위입니다."
            },
            {
                id: "lab-11-04",
                scenario: "my-web 릴리스를 같은 차트로 업그레이드하세요.",
                answers: ["helm upgrade my-web example/nginx"],
                canonical: "helm upgrade my-web example/nginx",
                hint: "helm upgrade <release> <chart>",
                explain: "values 변경이나 차트 버전 변경을 릴리스 새 리비전으로 반영합니다."
            },
            {
                id: "lab-11-05",
                scenario: "Helm 릴리스 목록을 확인하세요.",
                answers: ["helm (?:list|ls)"],
                canonical: "helm list",
                hint: "helm list",
                explain: "릴리스 상태와 리비전, 차트 버전을 확인합니다."
            }
        ]
    },
    {
        id: "lab-12",
        title: "Operator 설치 검증",
        goal: "OperatorGroup, Subscription, CSV 상태 확인 흐름을 익힙니다.",
        steps: [
            {
                id: "lab-12-01",
                scenario: "설치 가능한 cert-manager 패키지 정보를 확인하세요.",
                answers: [
                    "oc describe packagemanifests? cert-manager (?:-n|--namespace)[ =]openshift-marketplace",
                    "oc describe packagemanifests? cert-manager"
                ],
                canonical: "oc describe packagemanifest cert-manager -n openshift-marketplace",
                hint: "packagemanifest에서 채널과 설치 모드를 봅니다.",
                explain: "Subscription 작성 전 패키지명과 채널을 확인합니다."
            },
            {
                id: "lab-12-02",
                scenario: "my-operators 네임스페이스의 OperatorGroup 목록을 확인하세요.",
                answers: [
                    "oc get (?:operatorgroups?|og) (?:-n|--namespace)[ =]my-operators",
                    "oc (?:-n|--namespace)[ =]my-operators get (?:operatorgroups?|og)"
                ],
                canonical: "oc get operatorgroups -n my-operators",
                hint: "oc get operatorgroup -n <ns>",
                explain: "OperatorGroup은 오퍼레이터가 감시할 범위를 정합니다."
            },
            {
                id: "lab-12-03",
                scenario: "my-operators 네임스페이스의 Subscription 목록을 확인하세요.",
                answers: [
                    "oc get (?:subscriptions?|subs?) (?:-n|--namespace)[ =]my-operators",
                    "oc (?:-n|--namespace)[ =]my-operators get (?:subscriptions?|subs?)"
                ],
                canonical: "oc get subscriptions -n my-operators",
                hint: "축약형 sub도 자주 씁니다.",
                explain: "Subscription은 설치/업데이트 채널을 선언합니다."
            },
            {
                id: "lab-12-04",
                scenario: "my-operators 네임스페이스의 CSV 설치 상태를 확인하세요.",
                answers: [
                    "oc get (?:csvs?|clusterserviceversions?) (?:-n|--namespace)[ =]my-operators",
                    "oc (?:-n|--namespace)[ =]my-operators get (?:csvs?|clusterserviceversions?)"
                ],
                canonical: "oc get csv -n my-operators",
                hint: "CSV PHASE가 Succeeded인지 확인합니다.",
                explain: "CSV가 실제 오퍼레이터 설치본입니다. Succeeded가 되어야 완료입니다."
            }
        ]
    },
    {
        id: "lab-13",
        title: "Job과 CronJob",
        goal: "일회성 작업과 예약 작업 생성, 수동 실행, 로그 확인을 익힙니다.",
        steps: [
            {
                id: "lab-13-01",
                scenario: "busybox 이미지로 echo hello를 실행하는 test-job을 생성하세요.",
                answers: ["oc create job test-job --image[ =]busybox -- echo hello"],
                canonical: "oc create job test-job --image=busybox -- echo hello",
                hint: "-- 뒤에 컨테이너 실행 명령을 씁니다.",
                explain: "Job은 완료될 때까지 파드를 재시도하는 일회성 작업입니다."
            },
            {
                id: "lab-13-02",
                scenario: "test-job 로그를 확인하세요.",
                answers: ["oc logs job/test-job"],
                canonical: "oc logs job/test-job",
                hint: "oc logs job/<name>",
                explain: "job/<name> 형식이면 Job 파드를 자동으로 찾아 로그를 보여줍니다."
            },
            {
                id: "lab-13-03",
                scenario: "busybox 이미지로 매일 새벽 2시에 backup.sh를 실행하는 backup CronJob을 생성하세요.",
                answers: [
                    "oc create cronjob backup --image[ =]busybox --schedule[ =]['\"]0 2 \\* \\* \\*['\"] -- backup\\.sh",
                    "oc create cronjob backup --schedule[ =]['\"]0 2 \\* \\* \\*['\"] --image[ =]busybox -- backup\\.sh"
                ],
                canonical: "oc create cronjob backup --image=busybox --schedule=\"0 2 * * *\" -- backup.sh",
                hint: "cron 스케줄은 따옴표로 감쌉니다.",
                explain: "\"0 2 * * *\"는 매일 02:00 실행입니다."
            },
            {
                id: "lab-13-04",
                scenario: "backup CronJob을 manual-run Job으로 지금 한 번 실행하세요.",
                answers: ["oc create job manual-run --from[ =]cronjob/backup"],
                canonical: "oc create job manual-run --from=cronjob/backup",
                hint: "--from=cronjob/<name>",
                explain: "스케줄을 기다리지 않고 CronJob 템플릿을 검증할 수 있습니다."
            }
        ]
    },
    {
        id: "lab-14",
        title: "장애 진단 루틴",
        goal: "get, events, describe, logs, backup, explain 순서로 문제 해결 습관을 만듭니다.",
        steps: [
            {
                id: "lab-14-01",
                scenario: "web 네임스페이스의 모든 주요 리소스를 조회하세요.",
                answers: [
                    "oc get all (?:-n|--namespace)[ =]web",
                    "oc (?:-n|--namespace)[ =]web get all"
                ],
                canonical: "oc get all -n web",
                hint: "큰 그림은 get all",
                explain: "먼저 리소스 상태를 한 화면에서 봅니다."
            },
            {
                id: "lab-14-02",
                scenario: "web 네임스페이스의 이벤트를 lastTimestamp 순으로 정렬하세요.",
                answers: [
                    "oc get events --sort-by[ =]['\"]?\\.lastTimestamp['\"]? (?:-n|--namespace)[ =]web",
                    "oc get events (?:-n|--namespace)[ =]web --sort-by[ =]['\"]?\\.lastTimestamp['\"]?"
                ],
                canonical: "oc get events --sort-by=.lastTimestamp -n web",
                hint: "events --sort-by=.lastTimestamp",
                explain: "최근 사건 순서로 보면 원인 추적이 빠릅니다."
            },
            {
                id: "lab-14-03",
                scenario: "mysql-0 파드의 상세 정보를 확인하세요.",
                answers: [
                    "oc describe pods? mysql-0 (?:-n|--namespace)[ =]web",
                    "oc describe pod/mysql-0 (?:-n|--namespace)[ =]web"
                ],
                canonical: "oc describe pod mysql-0 -n web",
                hint: "describe pod <name>",
                explain: "Events 섹션에서 스케줄링/이미지/권한 문제 단서를 찾습니다."
            },
            {
                id: "lab-14-04",
                scenario: "mysql 디플로이먼트 로그를 실시간으로 추적하세요.",
                answers: [
                    "oc logs -f (?:deployment|deploy)(?:/| )mysql (?:-n|--namespace)[ =]web",
                    "oc logs (?:deployment|deploy)(?:/| )mysql -f (?:-n|--namespace)[ =]web"
                ],
                canonical: "oc logs -f deployment/mysql -n web",
                hint: "oc logs -f deployment/<name>",
                explain: "애플리케이션 오류는 로그에서 가장 빨리 드러납니다."
            },
            {
                id: "lab-14-05",
                scenario: "수정 전 app 디플로이먼트 YAML을 /tmp/app.bak.yaml로 백업하세요.",
                answers: [
                    "oc get (?:deployment|deploy)(?:/| )app -o[ =]yaml (?:-n|--namespace)[ =]web > /tmp/app\\.bak\\.yaml",
                    "oc get (?:deployment|deploy)(?:/| )app (?:-n|--namespace)[ =]web -o[ =]yaml > /tmp/app\\.bak\\.yaml"
                ],
                canonical: "oc get deploy app -o yaml -n web > /tmp/app.bak.yaml",
                hint: "수정 전 백업은 생명줄입니다.",
                explain: "잘못 수정하면 백업 YAML로 되돌릴 수 있습니다."
            },
            {
                id: "lab-14-06",
                scenario: "pod.spec.containers 필드 문서를 CLI에서 확인하세요.",
                answers: ["oc explain pods?\\.spec\\.containers"],
                canonical: "oc explain pod.spec.containers",
                hint: "oc explain <resource>.<field>",
                explain: "필드 위치가 헷갈릴 때 시험장에서 바로 확인할 수 있습니다."
            }
        ]
    },
    {
        id: "lab-15",
        title: "마무리 검증과 정리",
        goal: "시험 종료 전 상태 확인, 권한 확인, 불필요 리소스 정리 루틴을 연습합니다.",
        steps: [
            {
                id: "lab-15-01",
                scenario: "apps 네임스페이스의 전체 리소스를 확인하세요.",
                answers: [
                    "oc get all (?:-n|--namespace)[ =]apps",
                    "oc (?:-n|--namespace)[ =]apps get all"
                ],
                canonical: "oc get all -n apps",
                hint: "마지막 검증은 전체 상태 확인부터",
                explain: "완료 전 리소스가 정상 Running/Available인지 한 번 더 확인합니다."
            },
            {
                id: "lab-15-02",
                scenario: "apps 네임스페이스의 app Route 호스트를 추출하세요.",
                answers: [
                    "oc get routes? app -o[ =]jsonpath=['\"]?\\{\\.spec\\.host\\}['\"]? (?:-n|--namespace)[ =]apps",
                    "oc get routes? app (?:-n|--namespace)[ =]apps -o[ =]jsonpath=['\"]?\\{\\.spec\\.host\\}['\"]?"
                ],
                canonical: "oc get route app -o jsonpath='{.spec.host}' -n apps",
                hint: "Route 검증은 jsonpath",
                explain: "외부 접근 지점이 맞는지 확인합니다."
            },
            {
                id: "lab-15-03",
                scenario: "auditor 사용자가 apps에서 pods를 get 할 수 있는지 확인하세요.",
                answers: [
                    "oc auth can-i get pods? --as[ =]auditor (?:-n|--namespace)[ =]apps",
                    "oc auth can-i get pods? (?:-n|--namespace)[ =]apps --as[ =]auditor"
                ],
                canonical: "oc auth can-i get pods --as=auditor -n apps",
                hint: "can-i + --as",
                explain: "권한 문제는 눈으로 RoleBinding만 보지 말고 can-i로 검증합니다."
            },
            {
                id: "lab-15-04",
                scenario: "apps 네임스페이스의 old-secret Secret을 삭제하세요.",
                answers: [
                    "oc delete secret old-secret (?:-n|--namespace)[ =]apps",
                    "oc (?:-n|--namespace)[ =]apps delete secret old-secret"
                ],
                canonical: "oc delete secret old-secret -n apps",
                hint: "oc delete secret <name> -n <ns>",
                explain: "불필요한 Secret/ConfigMap은 운영 보안 관점에서도 정리 대상입니다."
            },
            {
                id: "lab-15-05",
                scenario: "apps 네임스페이스의 이벤트를 creationTimestamp 순으로 확인하세요.",
                answers: [
                    "oc get events --sort-by[ =]['\"]?\\.metadata\\.creationTimestamp['\"]? (?:-n|--namespace)[ =]apps",
                    "oc get events (?:-n|--namespace)[ =]apps --sort-by[ =]['\"]?\\.metadata\\.creationTimestamp['\"]?"
                ],
                canonical: "oc get events --sort-by=.metadata.creationTimestamp -n apps",
                hint: "events 정렬로 마지막 이상 징후를 봅니다.",
                explain: "제출 전 최근 이벤트를 보면 놓친 실패를 발견할 수 있습니다."
            }
        ]
    }
];
