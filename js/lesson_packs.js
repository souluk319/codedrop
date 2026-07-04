/**
 * CodeDrop - 학습 모드 커리큘럼 데이터
 *
 * LESSON_TRACKS: 시험 우선순위 순서의 트랙 배열. 배열 순서 = 잠금 해제 순서.
 *
 * 스키마:
 *   track:  { id, title, subtitle, lessons: [lesson] }
 *   lesson: { id, title, intro, steps: [step], quizFrom, quizIds?, quizCount }
 *   step:   { id, cmd, desc, output, explain, scaffold?, hint? }
 *
 * 저작 규칙 (scripts/test_study_content.mjs 가 강제):
 *   - 모든 id는 시나리오/랩 id와 전역 유일
 *   - cmd 는 StudyCore.normalizeCmd(cmd) === cmd
 *   - scaffold: 'full'(명령 전체 표시) | 'hint'(마스킹 + hint 필드 필수)
 *   - quizFrom 은 SCENARIO_PACKS 키, quizIds 는 해당 팩에 실재하는 문제 id
 *   - 시뮬레이션 output 은 학습용 근사 (실제 oc 출력과 버전별 차이 가능)
 */

const LESSON_TRACKS = [
    {
        id: 'track-01',
        title: 'oc 기초와 조회',
        subtitle: '로그인부터 리소스 읽기까지',
        lessons: [
            {
                id: 'learn-01-01',
                title: 'oc 로그인과 프로젝트',
                intro: 'OpenShift의 모든 작업은 oc 명령으로 시작합니다.\n\nEX280 시험장에 앉으면 가장 먼저 하는 일은 클러스터에 로그인하고, 내가 누구인지 확인하고, 작업할 프로젝트로 이동하는 것입니다. 이 세 동작이 손에 붙어야 나머지 전부가 가능합니다.\n\n프로젝트(project)는 쿠버네티스 네임스페이스에 권한과 격리가 더해진 단위입니다. 아래 명령을 하나씩 직접 타이핑해 보세요.\n\n터미널 출력은 학습용 근사이며 실제 버전과 다를 수 있습니다.',
                steps: [
                    {
                        id: 'learn-01-01-s1',
                        cmd: 'oc login -u developer -p developer https://api.ocp4.example.com:6443',
                        desc: 'developer 계정으로 클러스터에 로그인합니다.',
                        output: 'Login successful.\n\nYou have one project on this server: "default"\n\nUsing project "default".',
                        explain: '-u 사용자, -p 비밀번호, 마지막이 API 서버 주소입니다. 시험에서는 문제지의 주소를 그대로 씁니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-01-01-s2',
                        cmd: 'oc whoami',
                        desc: '지금 누구로 로그인했는지 확인합니다.',
                        output: 'developer',
                        explain: '작업 전 신원 확인 습관입니다. 관리자 작업인데 일반 사용자로 들어와 있으면 여기서 바로 걸러집니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-01-01-s3',
                        cmd: 'oc new-project workshop',
                        desc: 'workshop 이라는 새 프로젝트를 만듭니다.',
                        output: 'Now using project "workshop" on server "https://api.ocp4.example.com:6443".',
                        explain: 'new-project는 생성과 동시에 해당 프로젝트로 전환합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-01-01-s4',
                        cmd: 'oc get pods',
                        desc: '현재 프로젝트의 파드 목록을 조회합니다.',
                        output: 'No resources found in workshop namespace.',
                        explain: '방금 만든 프로젝트라 비어 있는 것이 정상입니다. "No resources found"도 명령이 성공했다는 정보입니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-01-01-s5',
                        cmd: 'oc projects',
                        desc: '내가 접근 가능한 프로젝트 전체를 나열합니다.',
                        hint: 'project가 아니라 복수형 projects',
                        output: 'You have access to the following projects:\n\n    default\n  * workshop',
                        explain: '* 표시가 현재 프로젝트입니다. 단수형 oc project <이름>은 전환 명령입니다.',
                        scaffold: 'hint'
                    },
                    {
                        id: 'learn-01-01-s6',
                        cmd: 'oc get nodes',
                        desc: '클러스터 노드 목록을 조회합니다.',
                        hint: 'oc get <리소스종류> - 노드는 nodes',
                        output: 'NAME       STATUS   ROLES                         AGE   VERSION\nmaster01   Ready    control-plane,master,worker   42d   v1.28.6\nmaster02   Ready    control-plane,master,worker   42d   v1.28.6',
                        explain: 'oc get <종류>는 만능 조회 패턴입니다. pods, nodes, svc, routes, all처럼 종류만 바꿉니다.',
                        scaffold: 'hint'
                    }
                ],
                categories: ['WORKLOADS', 'TROUBLESHOOT'],
                quizFrom: 'TROUBLESHOOT',
                quizIds: ['ts-01', 'ts-03'],
                quizCount: 2
            },
            {
                id: 'learn-01-02',
                title: '조회 루틴과 문서 확인',
                intro: '문제를 풀 때 막히면 무작정 YAML을 열기보다 조회 루틴을 고정합니다.\n\n기본 흐름은 get으로 넓게 보고, describe로 한 개를 깊게 보고, logs와 events로 원인을 확인하고, 필드가 헷갈리면 oc explain을 봅니다. 이 루틴이 있으면 처음 보는 리소스도 당황하지 않습니다.',
                steps: [
                    {
                        id: 'learn-01-02-s1',
                        cmd: 'oc project web',
                        desc: '작업 프로젝트를 web으로 전환합니다.',
                        output: 'Now using project "web" on server "https://api.ocp4.example.com:6443".',
                        explain: '작업 대상 네임스페이스가 바뀌면 먼저 project 전환이나 -n 플래그를 확정합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-01-02-s2',
                        cmd: 'oc get pods -n web',
                        desc: 'web 네임스페이스의 파드 목록을 확인합니다.',
                        output: 'NAME        READY   STATUS    RESTARTS   AGE\nmysql-0     1/1     Running   0          7m\nfront-1     1/1     Running   0          5m',
                        explain: '상태를 넓게 훑는 첫 명령입니다. STATUS가 정상인지 먼저 봅니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-01-02-s3',
                        cmd: 'oc describe pod mysql-0 -n web',
                        desc: 'mysql-0 파드의 상세 정보와 이벤트를 확인합니다.',
                        output: 'Name: mysql-0\nNamespace: web\nStatus: Running\nEvents:\n  Type    Reason     Message\n  Normal  Scheduled  Successfully assigned web/mysql-0',
                        explain: 'describe 하단 Events가 장애 원인 추적의 핵심입니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-01-02-s4',
                        cmd: 'oc logs -f deployment/mysql -n web',
                        desc: 'mysql 디플로이먼트 로그를 실시간으로 추적합니다.',
                        output: '2026-07-04T09:00:01Z ready for connections',
                        explain: '-f는 follow입니다. CrashLoopBackOff는 이전 컨테이너 로그를 볼 때 -p도 기억합니다.',
                        scaffold: 'hint',
                        hint: 'oc logs -f deployment/<이름> -n <네임스페이스>'
                    },
                    {
                        id: 'learn-01-02-s5',
                        cmd: 'oc explain pod.spec.containers',
                        desc: '파드 컨테이너 필드 문서를 CLI에서 확인합니다.',
                        output: 'KIND: Pod\nVERSION: v1\n\nRESOURCE: containers <[]Object>\n\nDESCRIPTION:\n  List of containers belonging to the pod.',
                        explain: '시험장 오프라인 문서입니다. 필드 위치가 헷갈리면 oc explain으로 바로 탈출합니다.',
                        scaffold: 'hint',
                        hint: 'oc explain <리소스>.<필드경로>'
                    }
                ],
                categories: ['TROUBLESHOOT'],
                quizFrom: 'TROUBLESHOOT',
                quizIds: ['ts-02', 'ts-11'],
                quizCount: 2
            }
        ]
    },
    {
        id: 'track-02',
        title: '앱 배포와 노출',
        subtitle: 'new-app, rollout, route, curl 검증',
        lessons: [
            {
                id: 'learn-02-01',
                title: '이미지 배포와 롤아웃 확인',
                intro: 'EX280은 배포 후 검증까지가 한 문제입니다.\n\n이미지로 앱을 만들고, 생성된 Deployment를 확인하고, 롤아웃 상태를 본 뒤 스케일합니다. 여기서 손이 멈추지 않아야 앱 문제의 절반은 먹고 들어갑니다.',
                steps: [
                    {
                        id: 'learn-02-01-s1',
                        cmd: 'oc new-app --name hello --image quay.io/redhattraining/hello-world-nginx -n apps',
                        desc: 'hello 애플리케이션을 이미지로 배포합니다.',
                        output: 'deployment.apps/hello created\nservice/hello created',
                        explain: 'new-app은 이미지에서 Deployment와 Service를 자동 생성합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-02-01-s2',
                        cmd: 'oc get deployment hello -n apps',
                        desc: 'hello 디플로이먼트가 생성됐는지 확인합니다.',
                        output: 'NAME    READY   UP-TO-DATE   AVAILABLE   AGE\nhello   1/1     1            1           20s',
                        explain: 'READY와 AVAILABLE이 목표 replica 수와 맞는지 확인합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-02-01-s3',
                        cmd: 'oc rollout status deployment/hello -n apps',
                        desc: '롤아웃 완료 여부를 확인합니다.',
                        output: 'deployment "hello" successfully rolled out',
                        explain: '배포 검증의 표준 문장입니다. 이 줄을 봐야 배포가 끝난 것입니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-02-01-s4',
                        cmd: 'oc scale deployment hello --replicas=3 -n apps',
                        desc: 'hello 디플로이먼트를 3개 replica로 늘립니다.',
                        output: 'deployment.apps/hello scaled',
                        explain: '수동 스케일은 oc scale, CPU 기반 자동 스케일은 oc autoscale입니다.',
                        scaffold: 'hint',
                        hint: 'oc scale deployment <이름> --replicas=<수> -n <ns>'
                    }
                ],
                categories: ['WORKLOADS', 'DEPLOY'],
                quizFrom: 'WORKLOADS',
                quizIds: ['wl-02', 'wl-03'],
                quizCount: 2
            },
            {
                id: 'learn-02-02',
                title: 'Route 생성과 curl 검증',
                intro: '앱이 떠도 외부에서 접근되지 않으면 문제는 끝난 것이 아닙니다.\n\nOpenShift에서는 Service를 Route로 노출하고, route host를 뽑아 curl로 응답을 확인합니다. TLS가 붙으면 edge, passthrough, reencrypt 차이를 구분합니다.',
                steps: [
                    {
                        id: 'learn-02-02-s1',
                        cmd: 'oc expose service hello -n apps',
                        desc: 'hello 서비스를 HTTP Route로 노출합니다.',
                        output: 'route.route.openshift.io/hello exposed',
                        explain: 'expose service는 기본 HTTP Route를 만듭니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-02-02-s2',
                        cmd: 'oc create route edge hello-https --service hello -n apps',
                        desc: 'edge TLS Route를 생성합니다.',
                        output: 'route.route.openshift.io/hello-https created',
                        explain: 'edge는 라우터에서 TLS를 종료합니다. 기본 인증서나 지정 인증서를 사용할 수 있습니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-02-02-s3',
                        cmd: "oc get route web -o jsonpath='{.spec.host}' -n apps",
                        desc: 'Route 호스트명만 jsonpath로 추출합니다.',
                        output: 'web-apps.apps.ocp4.example.com',
                        explain: '호스트를 정확히 뽑아야 curl 검증으로 이어집니다.',
                        scaffold: 'hint',
                        hint: "oc get route <이름> -o jsonpath='{.spec.host}' -n <ns>"
                    },
                    {
                        id: 'learn-02-02-s4',
                        cmd: 'curl http://web-apps.apps.ocp4.example.com',
                        desc: 'HTTP 응답을 확인합니다.',
                        output: '<html><body>Hello from OpenShift</body></html>',
                        explain: 'Route 생성 후 curl까지 해야 검증 완료입니다.',
                        scaffold: 'hint',
                        hint: 'curl http://<route-host>'
                    }
                ],
                categories: ['DEPLOY', 'WORKLOADS', 'NETWORK_SECURITY'],
                quizFrom: 'DEPLOY',
                quizIds: ['dep-06', 'dep-07'],
                quizCount: 2
            }
        ]
    },
    {
        id: 'track-03',
        title: '설정과 매니페스트',
        subtitle: 'ConfigMap, Secret, dry-run, Kustomize',
        lessons: [
            {
                id: 'learn-03-01',
                title: 'ConfigMap과 Secret 주입',
                intro: '애플리케이션 설정은 이미지 안에 굽지 않고 ConfigMap과 Secret으로 주입합니다.\n\nConfigMap은 일반 설정, Secret은 민감정보입니다. 환경변수로 넣을 수도 있고 파일 형태가 필요하면 볼륨으로 마운트합니다.',
                steps: [
                    {
                        id: 'learn-03-01-s1',
                        cmd: 'oc create configmap app-config --from-literal=ENV=prod -n apps',
                        desc: 'ENV=prod 값을 가진 ConfigMap을 만듭니다.',
                        output: 'configmap/app-config created',
                        explain: '--from-literal은 키=값을 직접 지정합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-03-01-s2',
                        cmd: 'oc create secret generic db-secret --from-literal=password=redhat123 -n apps',
                        desc: 'password 값을 가진 generic Secret을 만듭니다.',
                        output: 'secret/db-secret created',
                        explain: 'Secret은 base64로 저장되지만 암호화 저장과는 다릅니다. 접근 권한 관리가 중요합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-03-01-s3',
                        cmd: 'oc set env deployment/mysql --from=secret/db-secret -n apps',
                        desc: 'db-secret의 모든 키를 환경변수로 주입합니다.',
                        output: 'deployment.apps/mysql updated',
                        explain: '--from=secret/name은 Secret의 모든 키를 환경변수로 만듭니다.',
                        scaffold: 'hint',
                        hint: 'oc set env deployment/<name> --from=secret/<secret> -n <ns>'
                    },
                    {
                        id: 'learn-03-01-s4',
                        cmd: 'oc set volume deployment/app --add --type secret --secret-name db-secret --mount-path /etc/secret -n apps',
                        desc: 'Secret을 /etc/secret 경로에 파일로 마운트합니다.',
                        output: 'deployment.apps/app volume updated',
                        explain: '인증서처럼 파일 형태가 필요한 설정은 볼륨 마운트가 자연스럽습니다.',
                        scaffold: 'hint',
                        hint: 'oc set volume deployment/<name> --add --type secret --secret-name <secret> --mount-path <path>'
                    }
                ],
                categories: ['RESOURCES'],
                quizFrom: 'RESOURCES',
                quizIds: ['res-03', 'res-04', 'res-05', 'res-06'],
                quizCount: 4
            },
            {
                id: 'learn-03-02',
                title: 'dry-run과 Kustomize 루틴',
                intro: 'YAML을 처음부터 손으로 쓰는 것은 느리고 위험합니다.\n\n명령형으로 뼈대를 만들고, 파일로 저장하고, 수정 후 apply 하는 루틴이 빠릅니다. Kustomize는 base와 overlay를 조합해 환경별 차이를 다룹니다.',
                steps: [
                    {
                        id: 'learn-03-02-s1',
                        cmd: 'oc create deployment web --image=nginx --dry-run=client -o yaml > web.yaml',
                        desc: 'web 디플로이먼트 YAML 뼈대를 파일로 저장합니다.',
                        output: 'web.yaml written',
                        explain: '--dry-run=client -o yaml은 클러스터에 만들지 않고 매니페스트만 출력합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-03-02-s2',
                        cmd: 'oc apply -f web.yaml',
                        desc: '수정한 매니페스트를 적용합니다.',
                        output: 'deployment.apps/web created',
                        explain: 'apply는 선언형 관리입니다. 같은 파일을 다시 적용하면 변경분만 반영합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-03-02-s3',
                        cmd: 'oc kustomize overlays/dev',
                        desc: 'dev 오버레이가 만들 매니페스트를 미리 출력합니다.',
                        output: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web-dev',
                        explain: '적용 전 렌더링 결과를 보는 습관이 실수를 줄입니다.',
                        scaffold: 'hint',
                        hint: 'oc kustomize <오버레이디렉터리>'
                    },
                    {
                        id: 'learn-03-02-s4',
                        cmd: 'oc apply -k overlays/dev',
                        desc: 'Kustomize 오버레이를 적용합니다.',
                        output: 'deployment.apps/web-dev configured\nservice/web configured',
                        explain: '-k는 kustomization.yaml을 읽어 base와 patch를 합성합니다.',
                        scaffold: 'hint',
                        hint: 'oc apply -k <오버레이디렉터리>'
                    }
                ],
                categories: ['MANIFESTS', 'DEPLOY'],
                quizFrom: 'MANIFESTS',
                quizIds: ['man-01', 'man-03'],
                quizCount: 2
            }
        ]
    },
    {
        id: 'track-04',
        title: '인증과 권한',
        subtitle: 'htpasswd부터 RBAC까지',
        lessons: [
            {
                id: 'learn-04-01',
                title: 'htpasswd 사용자 관리',
                intro: 'EX280 단골 1순위는 htpasswd 인증 공급자입니다.\n\n흐름은 항상 같습니다. htpasswd 파일에 사용자와 암호를 기록하고, 그 파일로 openshift-config 네임스페이스에 Secret을 만들고, OAuth CR 이름 cluster에 identityProvider로 연결합니다. 사용자 추가와 삭제는 extract, 수정, set data 순서로 갱신합니다.',
                steps: [
                    {
                        id: 'learn-04-01-s1',
                        cmd: 'htpasswd -c -B -b /tmp/htpasswd admin redhat',
                        desc: '새 htpasswd 파일을 만들며 admin 사용자를 추가합니다.',
                        output: 'Adding password for user admin',
                        explain: '-c는 파일 신규 생성입니다. 기존 파일에 쓰면 다른 사용자가 모두 날아갑니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-04-01-s2',
                        cmd: 'htpasswd -B -b /tmp/htpasswd developer devpass',
                        desc: '기존 파일에 developer 사용자를 추가합니다.',
                        output: 'Adding password for user developer',
                        explain: '추가와 암호 변경은 -c를 빼야 합니다. 이 한 글자가 시험 함정입니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-04-01-s3',
                        cmd: 'cat /tmp/htpasswd',
                        desc: '파일 내용을 확인합니다.',
                        output: 'admin:$2y$05$TjSJKfIXnWm5cV5B3q9GleZi0hV0nV0kX8PbW1yBglQ8HxHnOxG7W\ndeveloper:$2y$05$mB0T7dgLKk4XkzGiFYyIe.wS5nXLbYCEXplV9SXvV1sPBu4dNMdV6',
                        explain: '$2y$로 시작하면 bcrypt 해시입니다. 평문이 보이면 옵션을 잘못 쓴 것입니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-04-01-s4',
                        cmd: 'oc create secret generic htpasswd-secret --from-file=htpasswd=/tmp/htpasswd -n openshift-config',
                        desc: 'OAuth가 읽을 Secret을 만듭니다.',
                        output: 'secret/htpasswd-secret created',
                        explain: '네임스페이스는 openshift-config, 키 이름은 htpasswd여야 OAuth가 인식합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-04-01-s5',
                        cmd: 'oc edit oauth cluster',
                        desc: 'OAuth 커스텀 리소스를 열어 identityProvider를 연결합니다.',
                        hint: 'oc edit oauth <이름> - 클러스터 OAuth CR 이름은 cluster',
                        output: 'oauth.config.openshift.io/cluster edited',
                        explain: 'fileData.name이 방금 만든 Secret 이름을 가리킵니다.',
                        scaffold: 'hint'
                    },
                    {
                        id: 'learn-04-01-s6',
                        cmd: 'oc get pods -n openshift-authentication',
                        desc: '인증 파드가 새로 뜨는지 확인합니다.',
                        hint: '인증 파드는 openshift-authentication 네임스페이스에 있습니다',
                        output: 'NAME                               READY   STATUS    RESTARTS   AGE\noauth-openshift-6bd5c8f9d4-4x2mm   1/1     Running   0          35s',
                        explain: '새 oauth 파드가 Running이면 반영 완료입니다.',
                        scaffold: 'hint'
                    }
                ],
                categories: ['AUTH'],
                quizFrom: 'AUTH',
                quizIds: ['auth-01', 'auth-02', 'auth-03'],
                quizCount: 3
            },
            {
                id: 'learn-04-02',
                title: '그룹 RBAC와 can-i 검증',
                intro: '권한은 사용자에게 직접 주기보다 그룹에 주는 것이 관리하기 좋습니다.\n\n그룹을 만들고 사용자를 넣고, 프로젝트 역할을 그룹에 부여한 뒤 can-i로 검증합니다. 시험에서는 권한 부여 자체보다 검증 명령까지 손에 붙는지가 중요합니다.',
                steps: [
                    {
                        id: 'learn-04-02-s1',
                        cmd: 'oc adm groups new dev-group',
                        desc: 'dev-group 그룹을 생성합니다.',
                        output: 'group.user.openshift.io/dev-group created',
                        explain: '그룹은 사용자 묶음입니다. 이후 역할을 그룹에 부여합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-04-02-s2',
                        cmd: 'oc adm groups add-users dev-group user1 user2',
                        desc: 'dev-group에 user1, user2를 추가합니다.',
                        output: 'group.user.openshift.io/dev-group added: "user1", "user2"',
                        explain: '여러 사용자를 공백으로 한 번에 추가할 수 있습니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-04-02-s3',
                        cmd: 'oc adm policy add-role-to-group edit dev-group -n project1',
                        desc: 'project1에서 dev-group에 edit 역할을 부여합니다.',
                        output: 'clusterrole.rbac.authorization.k8s.io/edit added: "dev-group"',
                        explain: 'add-role-to-group은 네임스페이스 한정 RoleBinding을 만듭니다.',
                        scaffold: 'hint',
                        hint: 'oc adm policy add-role-to-group <role> <group> -n <project>'
                    },
                    {
                        id: 'learn-04-02-s4',
                        cmd: 'oc auth can-i create pods --as=user1 -n project1',
                        desc: 'user1이 project1에서 파드를 만들 수 있는지 검증합니다.',
                        output: 'yes',
                        explain: '권한 부여 후 can-i로 yes/no를 확인하는 것이 마무리입니다.',
                        scaffold: 'hint',
                        hint: 'oc auth can-i <verb> <resource> --as=<user> -n <project>'
                    }
                ],
                categories: ['RBAC'],
                quizFrom: 'RBAC',
                quizIds: ['rbac-03', 'rbac-04', 'rbac-05', 'rbac-09'],
                quizCount: 4
            }
        ]
    },
    {
        id: 'track-05',
        title: '쿼터와 리소스 제한',
        subtitle: 'ResourceQuota, requests, limits, HPA',
        lessons: [
            {
                id: 'learn-05-01',
                title: 'ResourceQuota로 네임스페이스 총량 제한',
                intro: 'ResourceQuota는 네임스페이스 전체 사용량을 제한합니다.\n\n파드 개수, CPU request, memory request 같은 총량을 제한해 팀별 사용량을 통제합니다. 쿼터 문제는 생성, describe, 해석 순서로 풉니다.',
                steps: [
                    {
                        id: 'learn-05-01-s1',
                        cmd: 'oc create quota my-quota --hard=pods=10 -n project1',
                        desc: 'project1에 파드 최대 10개 쿼터를 만듭니다.',
                        output: 'resourcequota/my-quota created',
                        explain: '--hard는 제한 키와 값을 지정합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-05-01-s2',
                        cmd: 'oc describe quota my-quota -n project1',
                        desc: '쿼터 사용량과 제한을 확인합니다.',
                        output: 'Resource   Used  Hard\npods       2     10',
                        explain: 'Used/Hard를 보면 현재 사용량과 제한을 바로 비교할 수 있습니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-05-01-s3',
                        cmd: 'oc create quota compute-quota --hard=pods=10,requests.cpu=2,requests.memory=1Gi -n project1',
                        desc: '여러 제한을 한 번에 건 compute-quota를 만듭니다.',
                        output: 'resourcequota/compute-quota created',
                        explain: '실전 쿼터는 콤마로 여러 키를 묶는 경우가 많습니다.',
                        scaffold: 'hint',
                        hint: '--hard=pods=10,requests.cpu=2,requests.memory=1Gi'
                    },
                    {
                        id: 'learn-05-01-s4',
                        cmd: 'oc get quota -n project1',
                        desc: 'project1의 쿼터 목록을 확인합니다.',
                        output: 'NAME            AGE   REQUEST                 LIMIT\nmy-quota        1m    pods: 2/10\ncompute-quota   5s    pods: 2/10, cpu: 0/2',
                        explain: '여러 쿼터가 동시에 적용될 수 있습니다.',
                        scaffold: 'hint',
                        hint: 'oc get quota -n <project>'
                    }
                ],
                categories: ['RESOURCES'],
                quizFrom: 'RESOURCES',
                quizIds: ['res-01', 'res-02', 'res-08'],
                quizCount: 3
            },
            {
                id: 'learn-05-02',
                title: 'requests, limits, autoscale',
                intro: '파드 리소스 관리는 requests와 limits를 구분하는 것에서 시작합니다.\n\nrequests는 스케줄링 보장량, limits는 컨테이너 상한입니다. HPA는 CPU request 대비 사용률을 기준으로 동작하므로 requests 설정과 함께 봐야 합니다.',
                steps: [
                    {
                        id: 'learn-05-02-s1',
                        cmd: 'oc set resources deployment/front --limits=memory=256Mi -n apps',
                        desc: 'front 디플로이먼트의 메모리 limit을 설정합니다.',
                        output: 'deployment.apps/front resource requirements updated',
                        explain: 'limit은 컨테이너가 넘을 수 없는 상한입니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-05-02-s2',
                        cmd: 'oc set resources deployment/front --requests=cpu=100m,memory=128Mi -n apps',
                        desc: 'front 디플로이먼트의 CPU/메모리 request를 설정합니다.',
                        output: 'deployment.apps/front resource requirements updated',
                        explain: 'request는 스케줄러가 보장해야 하는 최소 자원입니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-05-02-s3',
                        cmd: 'oc autoscale deployment/front --min 2 --max 10 --cpu-percent 80 -n apps',
                        desc: 'CPU 80% 기준 HPA를 만듭니다.',
                        output: 'horizontalpodautoscaler.autoscaling/front autoscaled',
                        explain: 'HPA는 부하에 따라 replica 수를 자동 조절합니다.',
                        scaffold: 'hint',
                        hint: 'oc autoscale deployment/<name> --min <n> --max <n> --cpu-percent <n>'
                    },
                    {
                        id: 'learn-05-02-s4',
                        cmd: 'oc adm top pods -n web',
                        desc: '파드별 CPU/메모리 사용량을 확인합니다.',
                        output: 'NAME      CPU(cores)   MEMORY(bytes)\nfront-1   12m          64Mi\nmysql-0   40m          180Mi',
                        explain: '실사용량은 top으로 확인합니다. requests/limits 설정과 비교하면 병목이 보입니다.',
                        scaffold: 'hint',
                        hint: 'oc adm top pods -n <namespace>'
                    }
                ],
                categories: ['RESOURCES', 'WORKLOADS', 'TROUBLESHOOT'],
                quizFrom: 'WORKLOADS',
                quizIds: ['wl-04', 'wl-03'],
                quizCount: 2
            }
        ]
    },
    {
        id: 'track-06',
        title: '네트워크와 보안 노출',
        subtitle: 'NetworkPolicy, IngressController, TLS, LoadBalancer',
        lessons: [
            {
                id: 'learn-06-01',
                title: 'NetworkPolicy 읽고 적용하기',
                intro: 'NetworkPolicy는 파드 간 통신을 허용하거나 차단합니다.\n\n정책이 꼬이면 앱은 떠 있는데 서로 통신하지 못합니다. 목록 확인, describe, 적용 순서를 익히면 네트워크 보안 문제에서 길을 잃지 않습니다.',
                steps: [
                    {
                        id: 'learn-06-01-s1',
                        cmd: 'oc get networkpolicy -n apps',
                        desc: 'apps 네임스페이스의 NetworkPolicy 목록을 봅니다.',
                        output: 'NAME       POD-SELECTOR   AGE\ndeny-all   <none>         5m',
                        explain: '축약형 netpol도 자주 씁니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-06-01-s2',
                        cmd: 'oc describe networkpolicy deny-all -n apps',
                        desc: 'deny-all 정책 상세를 확인합니다.',
                        output: 'Name: deny-all\nPodSelector: <none>\nPolicy Types: Ingress',
                        explain: 'podSelector와 ingress/egress 규칙을 읽어 차단 범위를 파악합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-06-01-s3',
                        cmd: 'oc apply -f deny-all.yaml -n apps',
                        desc: 'deny-all NetworkPolicy 매니페스트를 적용합니다.',
                        output: 'networkpolicy.networking.k8s.io/deny-all configured',
                        explain: '정책은 YAML로 작성해 apply하는 경우가 많습니다.',
                        scaffold: 'hint',
                        hint: 'oc apply -f <policy.yaml> -n <ns>'
                    },
                    {
                        id: 'learn-06-01-s4',
                        cmd: 'oc apply -f allow-web.yaml -n apps',
                        desc: '필요한 트래픽을 허용하는 정책을 추가합니다.',
                        output: 'networkpolicy.networking.k8s.io/allow-web configured',
                        explain: 'NetworkPolicy는 여러 정책의 허용 규칙이 합쳐져 동작합니다.',
                        scaffold: 'hint',
                        hint: '허용 정책도 apply -f로 추가합니다'
                    }
                ],
                categories: ['NETWORK_SECURITY'],
                quizFrom: 'NETWORK_SECURITY',
                quizIds: ['net-06', 'net-01'],
                quizCount: 2
            },
            {
                id: 'learn-06-02',
                title: 'Ingress와 non-HTTP 노출',
                intro: 'OpenShift의 HTTP 진입은 Route와 IngressController가 담당합니다.\n\nHTTP가 아닌 TCP 서비스는 LoadBalancer Service가 필요할 수 있고, TLS를 백엔드까지 넘겨야 하면 passthrough Route를 사용합니다.',
                steps: [
                    {
                        id: 'learn-06-02-s1',
                        cmd: 'oc get ingresscontroller -n openshift-ingress-operator',
                        desc: '클러스터 IngressController 목록을 확인합니다.',
                        output: 'NAME      AGE\ndefault   42d',
                        explain: '라우터 배치와 노출 방식은 IngressController가 관리합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-06-02-s2',
                        cmd: 'oc describe ingresscontroller default -n openshift-ingress-operator',
                        desc: '기본 IngressController 상태를 자세히 봅니다.',
                        output: 'Name: default\nEndpoint Publishing Strategy: LoadBalancerService\nConditions: Available=True',
                        explain: '라우터 상태가 이상하면 외부 접근이 전부 흔들릴 수 있습니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-06-02-s3',
                        cmd: 'oc create route passthrough tls-api --service api --port 8443 -n apps',
                        desc: 'api 서비스 8443 포트를 passthrough TLS Route로 노출합니다.',
                        output: 'route.route.openshift.io/tls-api created',
                        explain: 'passthrough는 TLS를 라우터에서 해제하지 않고 백엔드로 넘깁니다.',
                        scaffold: 'hint',
                        hint: 'oc create route passthrough <route> --service <svc> --port <port>'
                    },
                    {
                        id: 'learn-06-02-s4',
                        cmd: 'oc create service loadbalancer db --tcp=5432:5432 -n apps',
                        desc: 'db TCP 서비스를 LoadBalancer로 노출합니다.',
                        output: 'service/db created',
                        explain: 'HTTP Route로 처리하지 않는 TCP 앱은 LoadBalancer Service로 노출합니다.',
                        scaffold: 'hint',
                        hint: 'oc create service loadbalancer <name> --tcp=<port>:<targetPort>'
                    }
                ],
                categories: ['NETWORK_SECURITY', 'WORKLOADS'],
                quizFrom: 'NETWORK_SECURITY',
                quizIds: ['net-01', 'net-02', 'net-03', 'net-04'],
                quizCount: 4
            }
        ]
    },
    {
        id: 'track-07',
        title: 'Operator 운영',
        subtitle: '패키지, Subscription, CSV',
        lessons: [
            {
                id: 'learn-07-01',
                title: 'Operator 검색과 설치 상태 읽기',
                intro: 'Operator 문제는 이름과 채널을 찾는 것에서 시작합니다.\n\npackagemanifest로 설치 가능한 패키지를 보고, catalogsource가 살아 있는지 확인하고, Subscription과 CSV로 설치 상태를 봅니다.',
                steps: [
                    {
                        id: 'learn-07-01-s1',
                        cmd: 'oc get packagemanifests -n openshift-marketplace',
                        desc: '설치 가능한 Operator 패키지 목록을 조회합니다.',
                        output: 'NAME                 CATALOG               AGE\ncert-manager         Red Hat Operators     42d\nserverless-operator  Red Hat Operators     42d',
                        explain: 'OperatorHub에 보이는 패키지 목록입니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-07-01-s2',
                        cmd: 'oc describe packagemanifest cert-manager -n openshift-marketplace',
                        desc: 'cert-manager의 채널과 설치 모드를 확인합니다.',
                        output: 'Package: cert-manager\nDefault Channel: stable\nChannels: stable',
                        explain: 'Subscription 작성 전 패키지명과 채널을 확인합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-07-01-s3',
                        cmd: 'oc get catalogsources -n openshift-marketplace',
                        desc: '카탈로그 소스 상태를 확인합니다.',
                        output: 'NAME                  DISPLAY               TYPE   PUBLISHER\nredhat-operators      Red Hat Operators     grpc   Red Hat\ncommunity-operators   Community Operators   grpc   Red Hat',
                        explain: '카탈로그가 준비되지 않으면 Operator 설치가 진행되지 않습니다.',
                        scaffold: 'hint',
                        hint: 'oc get catalogsources -n openshift-marketplace'
                    },
                    {
                        id: 'learn-07-01-s4',
                        cmd: 'oc get subscriptions -A',
                        desc: '클러스터 전체 Subscription을 조회합니다.',
                        output: 'NAMESPACE             NAME           PACKAGE        SOURCE\nopenshift-operators   cert-manager   cert-manager   redhat-operators',
                        explain: 'Subscription은 어떤 Operator를 어떤 채널로 설치할지 선언합니다.',
                        scaffold: 'hint',
                        hint: 'oc get subscriptions -A'
                    }
                ],
                categories: ['OPERATORS'],
                quizFrom: 'OPERATORS',
                quizIds: ['op-01', 'op-02', 'op-03', 'op-04'],
                quizCount: 4
            },
            {
                id: 'learn-07-02',
                title: 'OperatorGroup, CSV, 제거 루틴',
                intro: 'Operator 설치는 OperatorGroup, Subscription, CSV 흐름으로 확인합니다.\n\nOperatorGroup은 감시 범위를 정하고, Subscription은 설치 선언, CSV는 실제 설치본입니다. 제거할 때는 Subscription과 CSV를 구분해야 합니다.',
                steps: [
                    {
                        id: 'learn-07-02-s1',
                        cmd: 'oc get operatorgroups -n my-operators',
                        desc: 'my-operators 네임스페이스의 OperatorGroup을 확인합니다.',
                        output: 'NAME             AGE\nmy-operators-og  2m',
                        explain: 'OperatorGroup은 Operator가 감시할 네임스페이스 범위를 정합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-07-02-s2',
                        cmd: 'oc get csv -n openshift-operators',
                        desc: 'openshift-operators의 CSV 설치 상태를 확인합니다.',
                        output: 'NAME                         DISPLAY        PHASE\ncert-manager.v1.14.0         cert-manager   Succeeded',
                        explain: 'CSV PHASE가 Succeeded면 설치 완료입니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-07-02-s3',
                        cmd: 'oc delete subscription cert-manager -n openshift-operators',
                        desc: 'cert-manager Subscription을 삭제합니다.',
                        output: 'subscription.operators.coreos.com "cert-manager" deleted',
                        explain: 'Subscription 삭제는 자동 업데이트 선언을 제거합니다.',
                        scaffold: 'hint',
                        hint: 'oc delete subscription <name> -n <ns>'
                    },
                    {
                        id: 'learn-07-02-s4',
                        cmd: 'oc get csv -n openshift-operators',
                        desc: '남은 CSV가 있는지 다시 확인합니다.',
                        output: 'NAME                         DISPLAY        PHASE\ncert-manager.v1.14.0         cert-manager   Succeeded',
                        explain: 'Subscription만 지워도 CSV가 남을 수 있습니다. 완전 제거는 CSV/CR 정리까지 확인합니다.',
                        scaffold: 'hint',
                        hint: 'oc get csv -n <operator-namespace>'
                    }
                ],
                categories: ['OPERATORS'],
                quizFrom: 'OPERATORS',
                quizIds: ['op-05', 'op-06', 'op-07'],
                quizCount: 3
            }
        ]
    },
    {
        id: 'track-08',
        title: 'SCC와 서비스어카운트',
        subtitle: '보안 컨텍스트와 워크로드 권한',
        lessons: [
            {
                id: 'learn-08-01',
                title: '서비스어카운트에 SCC 부여',
                intro: 'SCC 문제는 파드가 어떤 권한으로 실행되는지 다룹니다.\n\n기본 서비스어카운트에 직접 권한을 더하기보다 전용 SA를 만들고, 필요한 SCC를 부여하고, 워크로드가 그 SA를 사용하게 지정합니다.',
                steps: [
                    {
                        id: 'learn-08-01-s1',
                        cmd: 'oc create sa legacy-sa -n apps',
                        desc: 'apps 네임스페이스에 legacy-sa를 만듭니다.',
                        output: 'serviceaccount/legacy-sa created',
                        explain: '특별 권한이 필요한 워크로드에는 전용 SA를 사용합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-08-01-s2',
                        cmd: 'oc adm policy add-scc-to-user anyuid -z legacy-sa -n apps',
                        desc: 'legacy-sa에 anyuid SCC를 부여합니다.',
                        output: 'clusterrole.rbac.authorization.k8s.io/system:openshift:scc:anyuid added: "legacy-sa"',
                        explain: '-z는 서비스어카운트를 의미합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-08-01-s3',
                        cmd: 'oc set serviceaccount deployment/legacy legacy-sa -n apps',
                        desc: 'legacy 디플로이먼트가 legacy-sa를 쓰도록 지정합니다.',
                        output: 'deployment.apps/legacy serviceaccount updated',
                        explain: 'SCC는 SA에 부여하고, 워크로드는 그 SA를 사용해야 효력이 생깁니다.',
                        scaffold: 'hint',
                        hint: 'oc set serviceaccount deployment/<name> <sa> -n <ns>'
                    },
                    {
                        id: 'learn-08-01-s4',
                        cmd: 'oc rollout status deployment/legacy -n apps',
                        desc: '서비스어카운트 변경 후 새 파드 롤아웃을 확인합니다.',
                        output: 'deployment "legacy" successfully rolled out',
                        explain: 'SA 변경은 파드 재생성을 유발합니다. rollout 확인까지 해야 완료입니다.',
                        scaffold: 'hint',
                        hint: 'oc rollout status deployment/<name> -n <ns>'
                    }
                ],
                categories: ['SCC_SA', 'TROUBLESHOOT'],
                quizFrom: 'SCC_SA',
                quizIds: ['scc-01', 'scc-02', 'scc-03'],
                quizCount: 3
            },
            {
                id: 'learn-08-02',
                title: 'SCC 확인과 사전 검토',
                intro: 'SCC는 부여보다 검증이 더 중요합니다.\n\n어떤 SCC가 있는지, anyuid가 무엇을 허용하는지, 특정 파드가 어떤 SCC로 실행 가능한지 확인하면 보안 컨텍스트 장애를 빠르게 좁힐 수 있습니다.',
                steps: [
                    {
                        id: 'learn-08-02-s1',
                        cmd: 'oc get scc',
                        desc: '클러스터의 SCC 목록을 조회합니다.',
                        output: 'NAME          PRIV    CAPS\nrestricted-v2 false   <none>\nanyuid        false   <none>\nprivileged    true    *',
                        explain: 'restricted-v2가 기본이고 anyuid, privileged 순으로 권한이 커집니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-08-02-s2',
                        cmd: 'oc describe scc anyuid',
                        desc: 'anyuid SCC의 허용 범위를 확인합니다.',
                        output: 'Name: anyuid\nRun As User Strategy: RunAsAny\nAllowed Capabilities: <none>',
                        explain: 'RunAsAny는 이미지에 지정된 UID 실행을 허용합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-08-02-s3',
                        cmd: 'oc adm policy scc-subject-review -f pod.yaml',
                        desc: 'pod.yaml이 어떤 SCC로 실행될 수 있는지 미리 검토합니다.',
                        output: 'RESOURCE    ALLOWED BY\nPod/pod     anyuid',
                        explain: '배포 전에 SCC 매칭을 확인하면 장애를 줄일 수 있습니다.',
                        scaffold: 'hint',
                        hint: 'oc adm policy scc-subject-review -f <yaml>'
                    },
                    {
                        id: 'learn-08-02-s4',
                        cmd: 'oc auth can-i use scc/anyuid --as=system:serviceaccount:apps:legacy-sa',
                        desc: 'legacy-sa가 anyuid SCC를 사용할 수 있는지 검증합니다.',
                        output: 'yes',
                        explain: 'SA의 정식 사용자명은 system:serviceaccount:<ns>:<sa>입니다.',
                        scaffold: 'hint',
                        hint: '--as=system:serviceaccount:<namespace>:<serviceaccount>'
                    }
                ],
                categories: ['SCC_SA'],
                quizFrom: 'SCC_SA',
                quizIds: ['scc-04', 'scc-05', 'scc-06', 'scc-07'],
                quizCount: 4
            }
        ]
    },
    {
        id: 'track-09',
        title: 'Job과 CronJob',
        subtitle: '일회성 작업과 예약 작업',
        lessons: [
            {
                id: 'learn-09-01',
                title: 'Job 생성과 로그 확인',
                intro: 'Job은 완료될 때까지 실행되는 일회성 작업입니다.\n\n배치 작업, 데이터 초기화, 점검 명령처럼 끝나는 작업에는 Deployment가 아니라 Job을 씁니다.',
                steps: [
                    {
                        id: 'learn-09-01-s1',
                        cmd: 'oc create job test-job --image=busybox -- echo hello',
                        desc: 'busybox 이미지로 echo hello Job을 생성합니다.',
                        output: 'job.batch/test-job created',
                        explain: '-- 뒤는 컨테이너 안에서 실행할 명령입니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-09-01-s2',
                        cmd: 'oc get jobs -n apps',
                        desc: 'apps 네임스페이스의 Job 목록을 확인합니다.',
                        output: 'NAME       COMPLETIONS   DURATION   AGE\ntest-job   1/1           3s         10s',
                        explain: 'COMPLETIONS가 1/1이면 성공입니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-09-01-s3',
                        cmd: 'oc logs job/test-job',
                        desc: 'test-job 로그를 확인합니다.',
                        output: 'hello',
                        explain: 'job/name 형식이면 파드 이름을 몰라도 로그를 볼 수 있습니다.',
                        scaffold: 'hint',
                        hint: 'oc logs job/<job-name>'
                    },
                    {
                        id: 'learn-09-01-s4',
                        cmd: 'oc describe job test-job -n apps',
                        desc: 'Job 상세와 이벤트를 확인합니다.',
                        output: 'Name: test-job\nParallelism: 1\nCompletions: 1\nPods Statuses: 1 Succeeded',
                        explain: '실패한 Job은 describe와 logs를 함께 봅니다.',
                        scaffold: 'hint',
                        hint: 'oc describe job <name> -n <ns>'
                    }
                ],
                categories: ['JOBS', 'TROUBLESHOOT'],
                quizFrom: 'JOBS',
                quizIds: ['job-01', 'job-03', 'job-04'],
                quizCount: 3
            },
            {
                id: 'learn-09-02',
                title: 'CronJob과 수동 실행',
                intro: 'CronJob은 정해진 시간마다 Job을 생성합니다.\n\n스케줄 문자열을 정확히 쓰고, 기다리지 않고 수동 Job으로 한 번 검증하는 루틴을 익힙니다.',
                steps: [
                    {
                        id: 'learn-09-02-s1',
                        cmd: 'oc create cronjob backup --image=busybox --schedule="0 2 * * *" -- backup.sh',
                        desc: '매일 새벽 2시에 실행되는 backup CronJob을 만듭니다.',
                        output: 'cronjob.batch/backup created',
                        explain: 'cron 형식은 분 시 일 월 요일입니다. 스케줄은 따옴표로 감쌉니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-09-02-s2',
                        cmd: 'oc get cronjobs -n apps',
                        desc: 'apps 네임스페이스의 CronJob 목록을 확인합니다.',
                        output: 'NAME     SCHEDULE    SUSPEND   ACTIVE   LAST SCHEDULE\nbackup   0 2 * * *   False     0        <none>',
                        explain: 'SCHEDULE, SUSPEND, LAST SCHEDULE을 확인합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-09-02-s3',
                        cmd: 'oc create job manual-run --from=cronjob/backup',
                        desc: 'backup CronJob을 지금 즉시 수동 실행합니다.',
                        output: 'job.batch/manual-run created',
                        explain: '스케줄을 기다리지 않고 템플릿으로 Job을 생성해 검증합니다.',
                        scaffold: 'hint',
                        hint: 'oc create job <job-name> --from=cronjob/<cronjob-name>'
                    },
                    {
                        id: 'learn-09-02-s4',
                        cmd: 'oc logs job/manual-run',
                        desc: '수동 실행한 Job 로그를 확인합니다.',
                        output: 'backup complete',
                        explain: 'CronJob도 결국 Job을 만들기 때문에 로그 확인 루틴은 같습니다.',
                        scaffold: 'hint',
                        hint: 'oc logs job/<job-name>'
                    }
                ],
                categories: ['JOBS'],
                quizFrom: 'JOBS',
                quizIds: ['job-02', 'job-05', 'job-06'],
                quizCount: 3
            }
        ]
    },
    {
        id: 'track-10',
        title: '트러블슈팅 루틴',
        subtitle: 'events, backup, debug, must-gather',
        lessons: [
            {
                id: 'learn-10-01',
                title: '이벤트와 백업 습관',
                intro: '트러블슈팅은 순서 싸움입니다.\n\n문제를 보면 먼저 상태를 넓게 보고, 최근 이벤트를 시간순으로 보고, 수정 전 YAML을 백업합니다. 시험장에서 백업은 실수 복구용 안전장치입니다.',
                steps: [
                    {
                        id: 'learn-10-01-s1',
                        cmd: 'oc get events --sort-by=.metadata.creationTimestamp -n web',
                        desc: 'web 이벤트를 생성 시각 순으로 정렬합니다.',
                        output: 'LAST SEEN   TYPE      REASON      OBJECT\n1m          Warning   Failed      pod/mysql-0\n20s         Normal    Pulled      pod/front-1',
                        explain: '시간순으로 보면 장애 흐름이 보입니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-10-01-s2',
                        cmd: 'oc get events --sort-by=.lastTimestamp -n web',
                        desc: '마지막 발생 시각 기준으로 이벤트를 정렬합니다.',
                        output: 'LAST SEEN   TYPE      REASON      OBJECT\n35s         Normal    Started     pod/front-1\n5s          Warning   BackOff     pod/mysql-0',
                        explain: '최근 사건을 빠르게 찾을 때 유용합니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-10-01-s3',
                        cmd: 'oc get deploy app -o yaml -n web > /tmp/app.bak.yaml',
                        desc: '수정 전 app 디플로이먼트 YAML을 백업합니다.',
                        output: '/tmp/app.bak.yaml written',
                        explain: '잘못 수정하면 백업 파일로 즉시 복구할 수 있습니다.',
                        scaffold: 'hint',
                        hint: 'oc get <resource> -o yaml -n <ns> > <file>'
                    },
                    {
                        id: 'learn-10-01-s4',
                        cmd: 'oc rollout undo deployment/web -n apps',
                        desc: '잘못된 배포를 직전 버전으로 되돌립니다.',
                        output: 'deployment.apps/web rolled back',
                        explain: 'rollout undo는 배포 실패의 빠른 복구 명령입니다.',
                        scaffold: 'hint',
                        hint: 'oc rollout undo deployment/<name> -n <ns>'
                    }
                ],
                categories: ['TROUBLESHOOT', 'DEPLOY'],
                quizFrom: 'TROUBLESHOOT',
                quizIds: ['ts-04', 'ts-09', 'ts-10'],
                quizCount: 3
            },
            {
                id: 'learn-10-02',
                title: '디버그 셸과 must-gather',
                intro: '운영자는 파드 내부, 노드, 클러스터 전체 진단을 구분해야 합니다.\n\n파드 내부는 rsh, 노드 조사는 oc debug node, 지원팀 제출용 전체 수집은 must-gather입니다.',
                steps: [
                    {
                        id: 'learn-10-02-s1',
                        cmd: 'oc rsh mysql-0 -n web',
                        desc: 'mysql-0 파드 안으로 원격 셸을 엽니다.',
                        output: 'sh-4.4$',
                        explain: '실행 중인 컨테이너 안에서 파일과 프로세스를 확인할 수 있습니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-10-02-s2',
                        cmd: 'oc debug node/master01',
                        desc: 'master01 노드에 디버그 파드를 띄웁니다.',
                        output: 'Starting pod/master01-debug ...\nTo use host binaries, run chroot /host',
                        explain: '노드 실제 파일시스템은 접속 후 chroot /host를 실행해야 봅니다.',
                        scaffold: 'full'
                    },
                    {
                        id: 'learn-10-02-s3',
                        cmd: 'oc adm must-gather',
                        desc: '지원 제출용 클러스터 진단 정보를 수집합니다.',
                        output: 'Gathering data for ns/openshift-cluster-version...\nWrote must-gather.local.123456',
                        explain: 'must-gather는 장애 케이스 제출의 표준 수집 명령입니다.',
                        scaffold: 'hint',
                        hint: 'oc adm must-gather'
                    },
                    {
                        id: 'learn-10-02-s4',
                        cmd: 'oc adm top pods -n web',
                        desc: 'web 네임스페이스 파드별 CPU/메모리 사용량을 봅니다.',
                        output: 'NAME      CPU(cores)   MEMORY(bytes)\nmysql-0   38m          190Mi\nfront-1   10m          70Mi',
                        explain: '성능과 OOM 징후를 볼 때 top을 사용합니다.',
                        scaffold: 'hint',
                        hint: 'oc adm top pods -n <namespace>'
                    }
                ],
                categories: ['TROUBLESHOOT'],
                quizFrom: 'TROUBLESHOOT',
                quizIds: ['ts-05', 'ts-06', 'ts-07', 'ts-08'],
                quizCount: 4
            }
        ]
    }
];
