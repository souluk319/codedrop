/**
 * CODEDROP: CODE RED
 * OPERATION NIGHT SHIFT campaign data.
 *
 * Chapter 1 is the complete playable vertical slice. Chapters 2-8 intentionally
 * expose only locked teaser metadata until their command chains are authored.
 */

'use strict';

const CODE_RED_CAMPAIGN = {
    id: 'operation-night-shift',
    version: 1,
    title: {
        ko: 'CODEDROP: CODE RED',
        en: 'CODEDROP: CODE RED'
    },
    tagline: {
        ko: '떨어지기 전에 복구하라.',
        en: 'OPERATE BEFORE IT DROPS.'
    },
    world: {
        operation: 'OPERATION NIGHT SHIFT',
        cluster: 'NEXUS-9',
        operator: 'OPERATOR-07',
        incidentStart: '03:17',
        suspectedDeployment: 'HELIOS-42'
    },
    totalChapters: 8,
    estimatedMinutes: {
        storyOn: [25, 35],
        storyOff: [12, 18]
    },
    storageKeys: {
        storyEnabled: 'codedrop_code_red_story_enabled',
        difficulty: 'codedrop_code_red_difficulty',
        progress: 'codedrop_code_red_progress',
        seenStory: 'codedrop_code_red_seen_story',
        best: 'codedrop_code_red_best'
    },
    matchingPolicy: {
        normalization: 'trim-and-collapse-whitespace',
        fullMatch: true,
        namespaceRequired: true,
        destructiveShortcutsAccepted: false
    },
    cutscene: {
        style: 'pixel-motion-comic',
        autoPlay: false,
        controls: {
            next: 'Enter',
            fastForward: 'Space',
            skip: 'Escape'
        },
        cast: {
            'OPERATOR-07': {
                visual: 'operator-sprite',
                anchor: 'left'
            },
            WATCHER: {
                visual: 'watcher-hologram',
                anchor: 'center'
            },
            CONTROL: {
                visual: 'control-comms-portrait',
                anchor: 'right'
            },
            DEV: {
                visual: 'dev-comms-portrait',
                anchor: 'right'
            },
            SYSTEM: {
                visual: 'system-overlay',
                anchor: 'full'
            }
        }
    },
    difficulty: {
        beginner: {
            id: 'beginner',
            label: { ko: '비기너', en: 'BEGINNER' },
            fallSpeedMultiplier: 0,
            directiveDetail: 'copy-exact-command',
            hintPenalty: 0,
            wrongScorePenalty: 0,
            wrongImpactPenalty: 0,
            competitive: false
        },
        trainee: {
            id: 'trainee',
            label: { ko: '훈련생', en: 'TRAINEE' },
            fallSpeedMultiplier: 0.65,
            directiveDetail: 'command-skeleton',
            hintPenalty: 0
        },
        operator: {
            id: 'operator',
            label: { ko: '오퍼레이터', en: 'OPERATOR' },
            fallSpeedMultiplier: 1,
            directiveDetail: 'action-only',
            hintPenalty: 30
        },
        sre: {
            id: 'sre',
            label: { ko: 'SRE', en: 'SRE' },
            fallSpeedMultiplier: 1.35,
            directiveDetail: 'evidence-only',
            hintPenalty: 60
        }
    },
    prologue: {
        id: 'prologue-0317',
        title: { ko: 'PROLOGUE: 03:17', en: 'PROLOGUE: 03:17' },
        sceneTheme: {
            background: 'nexus-control-room-night',
            palette: 'nominal-blue-to-code-red',
            parallax: true
        },
        dialogue: [
            {
                id: 'prologue-01',
                speaker: 'SYSTEM',
                text: {
                    ko: '03:16:58 // NEXUS-9 상태 정상. 서비스 건전성 99.98%.',
                    en: '03:16:58 // NEXUS-9 STATUS NOMINAL. SERVICE HEALTH 99.98%.'
                },
                cue: {
                    shot: 'wide',
                    actor: 'SYSTEM',
                    action: 'status-grid-idle',
                    camera: 'slow-pan-right',
                    effect: 'blue-scanlines',
                    durationMs: 1800,
                    sfx: 'control-room-hum'
                }
            },
            {
                id: 'prologue-02',
                speaker: 'SYSTEM',
                text: {
                    ko: '03:17:08 // 결제 성공률 41.2%. 43초 동안 재시작 7회.',
                    en: '03:17:08 // PAYMENT SUCCESS RATE 41.2%. 7 RESTARTS IN 43 SECONDS.'
                },
                cue: {
                    shot: 'dashboard-closeup',
                    actor: 'SYSTEM',
                    action: 'metric-line-collapse',
                    camera: 'snap-zoom-center',
                    effect: 'red-warning-pulse',
                    durationMs: 1500,
                    sfx: 'warning-chirp'
                }
            },
            {
                id: 'prologue-03',
                speaker: 'WATCHER',
                text: {
                    ko: '평시 기준선 붕괴.',
                    en: 'Nominal baseline collapse detected.'
                },
                cue: {
                    shot: 'medium',
                    actor: 'WATCHER',
                    action: 'hologram-materialize',
                    camera: 'hold-center',
                    effect: 'cyan-to-red-flicker',
                    durationMs: 1100,
                    sfx: 'watcher-online'
                }
            },
            {
                id: 'prologue-04',
                speaker: 'CONTROL',
                text: {
                    ko: 'OPERATOR-07, 잠 깨. 첫 경보다.',
                    en: 'OPERATOR-07, wake up. First alarm.'
                },
                cue: {
                    shot: 'operator-desk',
                    actor: 'OPERATOR-07',
                    action: 'chair-turn-and-console-wake',
                    camera: 'track-left',
                    effect: 'monitor-light-sweep',
                    durationMs: 1400,
                    sfx: 'comms-open'
                }
            }
        ]
    },
    chapters: [
        {
            id: 'cr-01',
            chapter: 1,
            playable: true,
            status: 'ready',
            title: {
                ko: 'HEARTBEAT LOST',
                en: 'HEARTBEAT LOST'
            },
            subtitle: {
                ko: '끊어진 결제망의 심박',
                en: 'The payment network lost its heartbeat'
            },
            incident: {
                alertId: 'APP-01',
                code: 'CrashLoopBackOff',
                severity: 'CODE_RED',
                resource: 'pod',
                name: 'payment-api-7fd8b5c9b7-k2n6m',
                workload: 'payment-api',
                namespace: 'payments',
                fallSpeed: 1,
                metrics: {
                    restarts: 7,
                    observationWindowSeconds: 43,
                    ready: '0/1'
                }
            },
            missionBrief: {
                code: 'APP-01',
                heading: {
                    ko: 'MISSION BRIEF // APP-01',
                    en: 'MISSION BRIEF // APP-01'
                },
                namespace: 'payments',
                target: 'payment-api',
                symptom: {
                    ko: '43초 동안 7회 재시작',
                    en: '7 restarts in 43 seconds'
                },
                alert: 'CrashLoopBackOff',
                summary: {
                    ko: 'payment-api가 43초 동안 7회 재시작했다. 결제망의 심박이 끊긴다.',
                    en: 'payment-api restarted 7 times in 43 seconds. The payment network is losing its heartbeat.'
                },
                directive: {
                    ko: '추측 금지. 전 파드 상태를 즉시 스캔하라.',
                    en: 'Do not guess. Scan all pod states immediately.'
                }
            },
            sceneTheme: {
                background: 'nexus-control-room-payment-wall',
                palette: 'midnight-cyan-alert-red',
                parallax: true,
                foreground: 'operator-console',
                ambientMotion: ['status-led-flow', 'rain-on-glass', 'log-particle-drift']
            },
            preStory: [
                {
                    id: 'cr-01-pre-03',
                    speaker: 'DEV',
                    text: {
                        ko: '코드는 안 건드렸습니다. 02:59에 설정 동기화만 실행했습니다.',
                        en: 'We did not touch the code. We only ran a configuration sync at 02:59.'
                    },
                    cue: {
                        shot: 'comms-inset',
                        actor: 'DEV',
                        action: 'portrait-lean-in',
                        camera: 'rack-focus-right',
                        effect: 'timestamp-0259-flash',
                        durationMs: 1250,
                        sfx: 'comms-ping'
                    }
                },
                {
                    id: 'cr-01-pre-04',
                    speaker: 'SYSTEM',
                    text: {
                        ko: 'CODE RED // CrashLoopBackOff',
                        en: 'CODE RED // CrashLoopBackOff'
                    },
                    cue: {
                        shot: 'full-screen',
                        actor: 'SYSTEM',
                        action: 'incident-card-drop-in',
                        camera: 'impact-shake',
                        effect: 'red-vignette-and-glitch',
                        durationMs: 1450,
                        sfx: 'incident-lock'
                    }
                }
            ],
            successStory: [
                {
                    id: 'cr-01-success-01',
                    speaker: 'WATCHER',
                    text: {
                        ko: '결제 성공률 41.2 → 96.8 → 99.7.',
                        en: 'Payment success 41.2 → 96.8 → 99.7.'
                    },
                    cue: {
                        shot: 'metric-wall',
                        actor: 'WATCHER',
                        action: 'heartbeat-line-recover',
                        camera: 'rise-with-chart',
                        effect: 'red-to-green-wave',
                        durationMs: 1600,
                        sfx: 'service-recovered'
                    }
                },
                {
                    id: 'cr-01-success-02',
                    speaker: 'DEV',
                    text: {
                        ko: '살아났습니다. DB 연결도 정상입니다.',
                        en: 'It is alive. The database connection is healthy.'
                    },
                    cue: {
                        shot: 'split-screen',
                        actor: 'DEV',
                        action: 'portrait-exhale-and-nod',
                        camera: 'hold-split',
                        effect: 'signal-stabilize',
                        durationMs: 1200,
                        sfx: 'comms-clear'
                    }
                },
                {
                    id: 'cr-01-success-03',
                    speaker: 'CONTROL',
                    text: {
                        ko: '좋아. 하지만 방금 로그에 찍힌 02:59가 걸린다.',
                        en: 'Good. But the 02:59 timestamp in that log bothers me.'
                    },
                    cue: {
                        shot: 'operator-console',
                        actor: 'CONTROL',
                        action: 'highlight-log-timestamp',
                        camera: 'slow-push-terminal',
                        effect: 'amber-timestamp-pulse',
                        durationMs: 1400,
                        sfx: 'evidence-mark'
                    }
                }
            ],
            failureStory: [
                {
                    id: 'cr-01-failure-01',
                    speaker: 'WATCHER',
                    text: {
                        ko: '장애가 서비스 경계에 도달. 결제 실패율이 임계치를 넘었다.',
                        en: 'The incident reached the service boundary. Payment failures crossed the threshold.'
                    },
                    cue: {
                        shot: 'full-screen',
                        actor: 'WATCHER',
                        action: 'impact-line-breach',
                        camera: 'hard-shake-down',
                        effect: 'critical-red-blackout',
                        durationMs: 1500,
                        sfx: 'impact-breach'
                    }
                },
                {
                    id: 'cr-01-failure-02',
                    speaker: 'CONTROL',
                    text: {
                        ko: '자동 복구팀이 개입한다. 넌 로그를 놓쳤어.',
                        en: 'The automated recovery team is taking over. You missed the log.'
                    },
                    cue: {
                        shot: 'operator-silhouette',
                        actor: 'OPERATOR-07',
                        action: 'console-lockout',
                        camera: 'pull-back',
                        effect: 'cold-white-takeover',
                        durationMs: 1350,
                        sfx: 'control-lock'
                    }
                },
                {
                    id: 'cr-01-failure-03',
                    speaker: 'CONTROL',
                    text: {
                        ko: '다시 들어가. 이번에는 죽기 전 컨테이너부터 들어라.',
                        en: 'Go back in. This time, listen to the container before it died.'
                    },
                    cue: {
                        shot: 'terminal-closeup',
                        actor: 'CONTROL',
                        action: 'rewind-log-buffer',
                        camera: 'snap-to-cursor',
                        effect: 'timeline-rewind',
                        durationMs: 1300,
                        sfx: 'retry-arm'
                    }
                }
            ],
            failureStories: {
                observe: [
                    {
                        id: 'cr-01-failure-observe-01',
                        speaker: 'WATCHER',
                        text: {
                            ko: '장애 범위를 확정하기 전에 충격선이 무너졌다. 어떤 워크로드가 죽는지도 확보되지 않았다.',
                            en: 'The impact line broke before the scope was established. The failing workload was never confirmed.'
                        },
                        cue: {
                            shot: 'metric-wall',
                            actor: 'WATCHER',
                            action: 'scope-grid-collapse',
                            camera: 'hard-zoom-out',
                            effect: 'critical-red-blackout',
                            durationMs: 1450,
                            sfx: 'impact-breach'
                        }
                    },
                    {
                        id: 'cr-01-failure-observe-02',
                        speaker: 'CONTROL',
                        text: {
                            ko: '추측보다 먼저 전체 파드 상태를 읽어. 범위가 없으면 진단도 없다.',
                            en: 'Read every pod state before guessing. Without scope, there is no diagnosis.'
                        },
                        cue: {
                            shot: 'operator-silhouette',
                            actor: 'OPERATOR-07',
                            action: 'console-lockout',
                            camera: 'pull-back',
                            effect: 'cold-white-takeover',
                            durationMs: 1300,
                            sfx: 'control-lock'
                        }
                    }
                ],
                diagnose: [
                    {
                        id: 'cr-01-failure-diagnose-01',
                        speaker: 'WATCHER',
                        text: {
                            ko: '재시작 사이의 증거가 끊겼다. 종료 상태와 이전 로그, 주입 설정이 하나의 원인으로 연결되지 않았다.',
                            en: 'Evidence between restarts was lost. Termination state, previous logs, and injected configuration never converged on one cause.'
                        },
                        cue: {
                            shot: 'watcher-hologram',
                            actor: 'WATCHER',
                            action: 'evidence-chain-fracture',
                            camera: 'snap-between-clues',
                            effect: 'timeline-rewind',
                            durationMs: 1500,
                            sfx: 'impact-breach'
                        }
                    },
                    {
                        id: 'cr-01-failure-diagnose-02',
                        speaker: 'CONTROL',
                        text: {
                            ko: '상태에서 이벤트로, 이전 로그에서 환경 변수로 이어가. 증거가 원인을 지목할 때까지 조치하지 마.',
                            en: 'Move from state to events, then previous logs to environment. Do not act until the evidence identifies the cause.'
                        },
                        cue: {
                            shot: 'terminal-closeup',
                            actor: 'CONTROL',
                            action: 'rewind-log-buffer',
                            camera: 'snap-to-cursor',
                            effect: 'amber-timestamp-pulse',
                            durationMs: 1350,
                            sfx: 'retry-arm'
                        }
                    }
                ],
                remediate: [
                    {
                        id: 'cr-01-failure-remediate-01',
                        speaker: 'WATCHER',
                        text: {
                            ko: '근본 원인은 확인됐지만 최소 변경이 적용되지 않았다. 폐기된 DB_HOST가 계속 새 파드를 쓰러뜨린다.',
                            en: 'The root cause was known, but the minimal change never landed. The retired DB_HOST keeps taking down new pods.'
                        },
                        cue: {
                            shot: 'dashboard-closeup',
                            actor: 'WATCHER',
                            action: 'bad-config-propagate',
                            camera: 'track-restart-loop',
                            effect: 'red-warning-pulse',
                            durationMs: 1450,
                            sfx: 'impact-breach'
                        }
                    },
                    {
                        id: 'cr-01-failure-remediate-02',
                        speaker: 'CONTROL',
                        text: {
                            ko: '증상인 파드를 지워도 잘못된 DB_HOST는 남는다. Deployment의 설정을 고쳐.',
                            en: 'Deleting the symptomatic pod leaves the wrong DB_HOST intact. Correct the Deployment configuration.'
                        },
                        cue: {
                            shot: 'operator-silhouette',
                            actor: 'OPERATOR-07',
                            action: 'console-lockout',
                            camera: 'pull-back',
                            effect: 'cold-white-takeover',
                            durationMs: 1300,
                            sfx: 'control-lock'
                        }
                    }
                ],
                verify: [
                    {
                        id: 'cr-01-failure-verify-01',
                        speaker: 'WATCHER',
                        text: {
                            ko: '변경은 전송됐지만 복구는 증명되지 않았다. 새 Replica의 롤아웃 상태가 미확인이다.',
                            en: 'The change was submitted, but recovery was never proven. The new Replica rollout remains unverified.'
                        },
                        cue: {
                            shot: 'metric-wall',
                            actor: 'WATCHER',
                            action: 'verification-signal-flatline',
                            camera: 'tilt-down-with-chart',
                            effect: 'heartbeat-stutter',
                            durationMs: 1450,
                            sfx: 'impact-breach'
                        }
                    },
                    {
                        id: 'cr-01-failure-verify-02',
                        speaker: 'CONTROL',
                        text: {
                            ko: '검증되지 않은 변경은 복구가 아니다. 롤아웃이 정상 완료될 때까지 지켜봐.',
                            en: 'An unverified change is not a recovery. Watch until the rollout completes successfully.'
                        },
                        cue: {
                            shot: 'terminal-closeup',
                            actor: 'CONTROL',
                            action: 'rollout-status-freeze',
                            camera: 'snap-to-cursor',
                            effect: 'timeline-rewind',
                            durationMs: 1300,
                            sfx: 'retry-arm'
                        }
                    }
                ]
            },
            teaserStory: [
                {
                    id: 'cr-01-teaser-01',
                    speaker: 'SYSTEM',
                    text: {
                        ko: '다음 신호 // media // ImagePullBackOff',
                        en: 'NEXT SIGNAL // media // ImagePullBackOff'
                    },
                    cue: {
                        shot: 'secondary-monitor',
                        actor: 'SYSTEM',
                        action: 'ghost-image-tag-flicker',
                        camera: 'creep-zoom-right',
                        effect: 'violet-registry-noise',
                        durationMs: 1450,
                        sfx: 'registry-fail'
                    }
                },
                {
                    id: 'cr-01-teaser-02',
                    speaker: 'WATCHER',
                    text: {
                        ko: '결제망은 살아났다. 밤은 아직 끝나지 않았다.',
                        en: 'The payment network is alive. The night is not over.'
                    },
                    cue: {
                        shot: 'control-room-wide',
                        actor: 'WATCHER',
                        action: 'fade-behind-new-alert',
                        camera: 'slow-pull-back',
                        effect: 'chapter-two-silhouette',
                        durationMs: 1700,
                        sfx: 'night-shift-theme'
                    }
                }
            ],
            steps: [
                {
                    id: 'cr-01-01',
                    phase: 'observe',
                    canonical: 'oc get pods -n payments',
                    answers: [
                        'oc get (?:pods?|po) (?:-n payments|--namespace[ =]payments)',
                        'oc (?:-n payments|--namespace[ =]payments) get (?:pods?|po)'
                    ],
                    terminalOutput: {
                        ko: [
                            'NAME                           READY   STATUS             RESTARTS',
                            'payment-api-7fd8b5c9b7-k2n6m   0/1     CrashLoopBackOff   7',
                            'postgresql-0                   1/1     Running            0'
                        ],
                        en: [
                            'NAME                           READY   STATUS             RESTARTS',
                            'payment-api-7fd8b5c9b7-k2n6m   0/1     CrashLoopBackOff   7',
                            'postgresql-0                   1/1     Running            0'
                        ]
                    },
                    evidence: {
                        ko: 'CrashLoopBackOff · 43초 동안 재시작 7회',
                        en: 'CrashLoopBackOff · 7 restarts in 43 seconds'
                    },
                    rationale: {
                        ko: '전체 파드 상태를 먼저 보면 장애 범위와 비교 가능한 정상 의존성을 한 번에 확인할 수 있다.',
                        en: 'Listing all pods first establishes the incident scope and exposes a healthy dependency for comparison.'
                    },
                    directive: {
                        ko: '대상 확인. 종료 상태와 최근 이벤트를 확보하라.',
                        en: 'Target confirmed. Capture its termination state and recent events.'
                    },
                    hint: {
                        ko: 'oc get <리소스> -n <네임스페이스>',
                        en: 'oc get <resource> -n <namespace>'
                    },
                    rejectionFeedback: {
                        dangerous: {
                            ko: '파드를 삭제해도 CrashLoop의 원인은 남고 장애 범위만 흐려진다. 먼저 상태를 확보하라.',
                            en: 'Deleting a pod leaves the CrashLoop cause intact and obscures scope. Capture state first.'
                        },
                        namespace: {
                            ko: 'payments 네임스페이스를 지정하지 않으면 다른 운영 범위를 조사할 수 있다.',
                            en: 'Without the payments namespace, the command may inspect the wrong operational scope.'
                        },
                        resource: {
                            ko: '첫 단계의 대상은 개별 Deployment가 아니라 payments의 전체 파드다.',
                            en: 'The first target is every pod in payments, not an individual Deployment.'
                        },
                        flags: {
                            ko: '`-n payments` 또는 `--namespace payments`가 필요하다.',
                            en: 'Include `-n payments` or `--namespace payments`.'
                        },
                        generic: {
                            ko: '추측을 멈추고 payments의 파드 상태를 먼저 스캔하라.',
                            en: 'Stop guessing and scan pod states in payments first.'
                        }
                    },
                    knockback: 0.1
                },
                {
                    id: 'cr-01-02',
                    phase: 'diagnose',
                    canonical: 'oc describe pod payment-api-7fd8b5c9b7-k2n6m -n payments',
                    answers: [
                        'oc describe (?:pods?|po)(?:/| )payment-api-7fd8b5c9b7-k2n6m (?:-n payments|--namespace[ =]payments)',
                        'oc (?:-n payments|--namespace[ =]payments) describe (?:pods?|po)(?:/| )payment-api-7fd8b5c9b7-k2n6m'
                    ],
                    terminalOutput: {
                        ko: [
                            'Last State:  Terminated',
                            'Reason:      Error',
                            'Exit Code:   1',
                            'Events:',
                            '  Back-off restarting failed container payment-api'
                        ],
                        en: [
                            'Last State:  Terminated',
                            'Reason:      Error',
                            'Exit Code:   1',
                            'Events:',
                            '  Back-off restarting failed container payment-api'
                        ]
                    },
                    evidence: {
                        ko: 'Last State: Terminated · Exit Code 1',
                        en: 'Last State: Terminated · Exit Code 1'
                    },
                    rationale: {
                        ko: 'describe는 반복 재시작 중에도 마지막 종료 상태와 스케줄러·kubelet 이벤트를 보존한다.',
                        en: 'Describe preserves the last termination state and scheduler or kubelet events across restart loops.'
                    },
                    directive: {
                        ko: '현재 컨테이너는 이미 다시 태어났다. 죽기 직전의 목소리를 가져와라.',
                        en: 'The current container has already been reborn. Retrieve its voice from just before it died.'
                    },
                    hint: {
                        ko: 'oc describe pod <파드> -n <네임스페이스>',
                        en: 'oc describe pod <pod> -n <namespace>'
                    },
                    rejectionFeedback: {
                        dangerous: {
                            ko: '파드를 삭제하면 아직 읽지 않은 종료 상태와 이벤트 증거를 잃을 수 있다.',
                            en: 'Deleting the pod can destroy termination-state and event evidence that has not been read.'
                        },
                        namespace: {
                            ko: '대상 파드는 payments 네임스페이스에 있다. 네임스페이스를 명시하라.',
                            en: 'The target pod is in payments. Specify its namespace.'
                        },
                        resource: {
                            ko: 'payment-api-7fd8b5c9b7-k2n6m 파드의 상세 상태를 조사해야 한다.',
                            en: 'Inspect the detailed state of pod payment-api-7fd8b5c9b7-k2n6m.'
                        },
                        flags: {
                            ko: '정확한 파드 이름과 `-n payments`를 함께 전달하라.',
                            en: 'Provide the exact pod name together with `-n payments`.'
                        },
                        generic: {
                            ko: '대상 파드의 describe 결과에서 종료 상태와 최근 이벤트를 확보하라.',
                            en: 'Use the target pod description to capture termination state and recent events.'
                        }
                    },
                    knockback: 0.1
                },
                {
                    id: 'cr-01-03',
                    phase: 'diagnose',
                    canonical: 'oc logs pod/payment-api-7fd8b5c9b7-k2n6m --previous -n payments',
                    answers: [
                        'oc logs (?:(?:pods?|po)/)?payment-api-7fd8b5c9b7-k2n6m (?:--previous|-p) (?:-n payments|--namespace[ =]payments)',
                        'oc logs (?:(?:pods?|po)/)?payment-api-7fd8b5c9b7-k2n6m (?:-n payments|--namespace[ =]payments) (?:--previous|-p)',
                        'oc (?:-n payments|--namespace[ =]payments) logs (?:(?:pods?|po)/)?payment-api-7fd8b5c9b7-k2n6m (?:--previous|-p)'
                    ],
                    terminalOutput: {
                        ko: [
                            'FATAL: dial tcp: lookup postgres-old.payments.svc',
                            'no such host'
                        ],
                        en: [
                            'FATAL: dial tcp: lookup postgres-old.payments.svc',
                            'no such host'
                        ]
                    },
                    evidence: {
                        ko: 'postgres-old.payments.svc · no such host',
                        en: 'postgres-old.payments.svc · no such host'
                    },
                    rationale: {
                        ko: '재시작된 현재 컨테이너가 아니라 직전 실패 인스턴스의 로그를 읽어야 사라진 오류 원문을 복구할 수 있다.',
                        en: 'The previous container log recovers the original error that disappeared when the current instance restarted.'
                    },
                    directive: {
                        ko: '유령 호스트명이 검출됐다. Deployment에 주입된 환경 변수를 확인하라.',
                        en: 'A ghost hostname has surfaced. Inspect the environment injected into the Deployment.'
                    },
                    hint: {
                        ko: 'oc logs pod/<파드> --previous -n <네임스페이스>',
                        en: 'oc logs pod/<pod> --previous -n <namespace>'
                    },
                    rejectionFeedback: {
                        dangerous: {
                            ko: '파드를 삭제하면 이전 컨테이너 로그까지 사라질 수 있다. 증거를 먼저 보존하라.',
                            en: 'Deleting the pod can erase the previous-container log. Preserve the evidence first.'
                        },
                        namespace: {
                            ko: 'payment-api 로그는 payments 네임스페이스에서 조회해야 한다.',
                            en: 'Query the payment-api log in the payments namespace.'
                        },
                        resource: {
                            ko: '로그 대상은 payment-api-7fd8b5c9b7-k2n6m 파드다.',
                            en: 'The log target is pod payment-api-7fd8b5c9b7-k2n6m.'
                        },
                        flags: {
                            ko: '현재 로그가 아니라 종료된 인스턴스를 읽도록 `--previous` 또는 `-p`가 필요하다.',
                            en: 'Use `--previous` or `-p` to read the terminated instance instead of the current log.'
                        },
                        generic: {
                            ko: '대상 파드의 이전 로그에서 종료 직전 오류를 확보하라.',
                            en: 'Retrieve the target pod previous log and capture the error before termination.'
                        }
                    },
                    knockback: 0.12
                },
                {
                    id: 'cr-01-04',
                    phase: 'diagnose',
                    canonical: 'oc set env deployment/payment-api --list -n payments',
                    answers: [
                        'oc set env deploy(?:ment)?(?:/| )payment-api --list (?:-n payments|--namespace[ =]payments)',
                        'oc set env deploy(?:ment)?(?:/| )payment-api (?:-n payments|--namespace[ =]payments) --list',
                        'oc (?:-n payments|--namespace[ =]payments) set env deploy(?:ment)?(?:/| )payment-api --list'
                    ],
                    terminalOutput: {
                        ko: [
                            'DB_HOST=postgres-old.payments.svc',
                            'DB_PORT=5432'
                        ],
                        en: [
                            'DB_HOST=postgres-old.payments.svc',
                            'DB_PORT=5432'
                        ]
                    },
                    evidence: {
                        ko: 'DB_HOST=postgres-old.payments.svc · 폐기된 서비스 주소',
                        en: 'DB_HOST=postgres-old.payments.svc · retired service address'
                    },
                    rationale: {
                        ko: '로그의 유령 호스트명과 Deployment에 주입된 DB_HOST를 대조하면 애플리케이션이 아니라 설정이 근본 원인임을 증명할 수 있다.',
                        en: 'Comparing the ghost hostname in logs with the injected DB_HOST proves configuration, not application code, is the root cause.'
                    },
                    directive: {
                        ko: '02:59 설정 동기화가 폐기된 DB 주소를 주입했다. 현재 서비스 주소로 교체하라.',
                        en: 'The 02:59 sync injected a retired DB address. Replace it with the current service address.'
                    },
                    hint: {
                        ko: 'oc set env deployment/<배포> --list -n <네임스페이스>',
                        en: 'oc set env deployment/<deployment> --list -n <namespace>'
                    },
                    rejectionFeedback: {
                        dangerous: {
                            ko: '파드를 삭제해도 Deployment가 같은 잘못된 DB_HOST를 다시 주입한다.',
                            en: 'Deleting a pod only lets the Deployment inject the same wrong DB_HOST again.'
                        },
                        namespace: {
                            ko: 'payment-api Deployment는 payments 네임스페이스에 있다.',
                            en: 'The payment-api Deployment is in the payments namespace.'
                        },
                        resource: {
                            ko: '파드가 아니라 deployment/payment-api에 주입된 환경 변수를 조사하라.',
                            en: 'Inspect environment variables injected into deployment/payment-api, not the pod.'
                        },
                        flags: {
                            ko: '값을 바꾸기 전 현재 환경을 읽도록 `--list`가 필요하다.',
                            en: 'Use `--list` to read the current environment before changing it.'
                        },
                        generic: {
                            ko: 'Deployment의 환경 변수 목록에서 로그의 호스트명이 어디서 주입됐는지 확인하라.',
                            en: 'List the Deployment environment and locate where the logged hostname was injected.'
                        }
                    },
                    knockback: 0.1
                },
                {
                    id: 'cr-01-05',
                    phase: 'remediate',
                    canonical: 'oc set env deployment/payment-api DB_HOST=postgresql.payments.svc -n payments',
                    answers: [
                        'oc set env deploy(?:ment)?(?:/| )payment-api DB_HOST=postgresql\\.payments\\.svc (?:-n payments|--namespace[ =]payments)',
                        'oc set env deploy(?:ment)?(?:/| )payment-api (?:-n payments|--namespace[ =]payments) DB_HOST=postgresql\\.payments\\.svc',
                        'oc (?:-n payments|--namespace[ =]payments) set env deploy(?:ment)?(?:/| )payment-api DB_HOST=postgresql\\.payments\\.svc'
                    ],
                    terminalOutput: {
                        ko: [
                            'deployment.apps/payment-api updated'
                        ],
                        en: [
                            'deployment.apps/payment-api updated'
                        ]
                    },
                    evidence: {
                        ko: 'deployment.apps/payment-api updated',
                        en: 'deployment.apps/payment-api updated'
                    },
                    rationale: {
                        ko: '원인이 확인된 단일 환경 변수만 Deployment에서 수정하면 파괴적인 우회 없이 새 Replica에 올바른 주소를 배포할 수 있다.',
                        en: 'Changing only the proven environment variable on the Deployment sends the correct address to new Replicas without a destructive shortcut.'
                    },
                    directive: {
                        ko: '조치는 끝이 아니다. 새 롤아웃이 정상 완료되는지 끝까지 감시하라.',
                        en: 'Remediation is not completion. Watch the new rollout all the way to a healthy finish.'
                    },
                    hint: {
                        ko: 'oc set env deployment/<배포> DB_HOST=<현재 서비스> -n <네임스페이스>',
                        en: 'oc set env deployment/<deployment> DB_HOST=<current-service> -n <namespace>'
                    },
                    rejectionFeedback: {
                        dangerous: {
                            ko: '파드 삭제는 잘못된 DB_HOST를 수정하지 않는다. Deployment가 같은 오류 설정으로 다시 만든다.',
                            en: 'Deleting the pod does not fix the wrong DB_HOST. The Deployment recreates it with the same bad configuration.'
                        },
                        namespace: {
                            ko: '수정 대상은 payments 네임스페이스의 payment-api Deployment다.',
                            en: 'The change target is the payment-api Deployment in payments.'
                        },
                        resource: {
                            ko: '개별 파드가 아니라 deployment/payment-api의 환경 변수를 수정하라.',
                            en: 'Change the environment on deployment/payment-api, not an individual pod.'
                        },
                        flags: {
                            ko: '`DB_HOST=postgresql.payments.svc`와 `-n payments`를 모두 포함하라.',
                            en: 'Include both `DB_HOST=postgresql.payments.svc` and `-n payments`.'
                        },
                        generic: {
                            ko: '검증된 근본 원인만 최소 변경하라. DB_HOST를 현재 PostgreSQL 서비스로 교체한다.',
                            en: 'Make the smallest proven change: replace DB_HOST with the current PostgreSQL service.'
                        }
                    },
                    knockback: 0.09
                },
                {
                    id: 'cr-01-06',
                    phase: 'verify',
                    canonical: 'oc rollout status deployment/payment-api -n payments',
                    answers: [
                        'oc rollout status deploy(?:ment)?(?:/| )payment-api (?:-n payments|--namespace[ =]payments)',
                        'oc (?:-n payments|--namespace[ =]payments) rollout status deploy(?:ment)?(?:/| )payment-api'
                    ],
                    terminalOutput: {
                        ko: [
                            'deployment "payment-api" successfully rolled out'
                        ],
                        en: [
                            'deployment "payment-api" successfully rolled out'
                        ]
                    },
                    evidence: {
                        ko: 'payment-api rollout successfully completed',
                        en: 'payment-api rollout successfully completed'
                    },
                    rationale: {
                        ko: '변경 명령의 성공은 복구가 아니다. 롤아웃 완료를 확인해야 새 Replica가 설정을 수신하고 정상 상태에 도달했음을 증명한다.',
                        en: 'A successful change command is not recovery. Rollout completion proves new Replicas received the configuration and reached a healthy state.'
                    },
                    directive: {
                        ko: '복구 검증 완료. 결제망의 심박이 돌아왔다.',
                        en: 'Recovery verified. The payment network heartbeat is restored.'
                    },
                    hint: {
                        ko: 'oc rollout status deployment/<배포> -n <네임스페이스>',
                        en: 'oc rollout status deployment/<deployment> -n <namespace>'
                    },
                    rejectionFeedback: {
                        dangerous: {
                            ko: '검증 중 파드를 삭제하면 롤아웃 상태를 교란한다. 배포 상태를 끝까지 관찰하라.',
                            en: 'Deleting pods during verification disrupts rollout state. Observe the Deployment to completion.'
                        },
                        namespace: {
                            ko: 'payments 네임스페이스의 롤아웃을 검증해야 한다.',
                            en: 'Verify the rollout in the payments namespace.'
                        },
                        resource: {
                            ko: '검증 대상은 deployment/payment-api의 rollout status다.',
                            en: 'The verification target is the rollout status of deployment/payment-api.'
                        },
                        flags: {
                            ko: '정확한 Deployment와 `-n payments`를 함께 지정하라.',
                            en: 'Specify the exact Deployment together with `-n payments`.'
                        },
                        generic: {
                            ko: '조치를 복구로 확정하려면 payment-api 롤아웃 완료를 확인하라.',
                            en: 'Confirm payment-api rollout completion before declaring the action a recovery.'
                        }
                    },
                    knockback: 0.12
                }
            ],
            postmortem: {
                reportId: 'APP-01',
                status: 'RESOLVED',
                cause: {
                    ko: '02:59 설정 동기화가 폐기된 DB 호스트를 payment-api 환경 변수에 주입했다.',
                    en: 'The 02:59 configuration sync injected a retired DB host into the payment-api environment.'
                },
                evidence: {
                    ko: [
                        '파드가 Exit Code 1로 반복 종료됐다.',
                        '이전 컨테이너 로그에 postgres-old DNS 조회 실패가 남았다.',
                        'Deployment의 DB_HOST가 폐기된 서비스 주소를 가리켰다.'
                    ],
                    en: [
                        'The pod repeatedly terminated with exit code 1.',
                        'The previous container log showed a DNS failure for postgres-old.',
                        'The Deployment DB_HOST pointed to a retired service address.'
                    ]
                },
                resolution: {
                    ko: 'DB_HOST를 postgresql.payments.svc로 교체하고 새 롤아웃 완료를 검증했다.',
                    en: 'DB_HOST was changed to postgresql.payments.svc and the new rollout was verified.'
                },
                lesson: {
                    ko: '현재 로그만 보면 재시작 사이의 증거를 놓친다. 상태와 이벤트로 범위를 좁힌 뒤 --previous 로그를 읽고, 최소 변경 후 반드시 롤아웃을 검증한다.',
                    en: 'Current logs can hide evidence between restarts. Narrow the incident with state and events, read --previous logs, make the smallest change, and always verify the rollout.'
                },
                operatingFlow: [
                    'STATUS',
                    'DESCRIBE',
                    'PREVIOUS_LOG',
                    'ENV',
                    'FIX',
                    'ROLLOUT_VERIFY'
                ]
            },
            teaser: {
                nextChapterId: 'cr-02',
                signal: 'ImagePullBackOff',
                namespace: 'media',
                copy: {
                    ko: '존재하지 않는 이미지 태그가 다음 장애를 깨운다.',
                    en: 'A nonexistent image tag awakens the next incident.'
                }
            }
        },
        {
            id: 'cr-02',
            chapter: 2,
            playable: false,
            status: 'locked',
            title: { ko: 'GHOST TAG', en: 'GHOST TAG' },
            subtitle: { ko: '존재하지 않는 이미지', en: 'The image that does not exist' },
            incident: {
                code: 'ImagePullBackOff',
                resource: 'pod',
                name: 'thumbnailer-6c88b6dc55-p4j9x',
                workload: 'thumbnailer',
                namespace: 'media'
            },
            teaser: {
                unlockAfter: 'cr-01',
                commandCount: 5,
                situation: {
                    ko: '폭증한 미디어 대기열 앞에서 thumbnailer가 존재하지 않는 태그를 당기려다 멈춘다.',
                    en: 'As the media queue surges, thumbnailer stalls while pulling a tag that does not exist.'
                },
                clue: {
                    ko: '레지스트리가 거부한 정확한 이유를 이벤트에서 찾아라.',
                    en: 'Read the event and find the exact reason the registry refused the image.'
                }
            },
            steps: []
        },
        {
            id: 'cr-03',
            chapter: 3,
            playable: false,
            status: 'locked',
            title: { ko: 'NO CAPACITY', en: 'NO CAPACITY' },
            subtitle: { ko: '자원은 있는데 스케줄할 수 없다', en: 'Capacity exists, but nothing can schedule' },
            incident: {
                code: 'FailedScheduling',
                secondaryCode: 'Pending',
                resource: 'pod',
                name: 'report-worker-7f8c9f6bb8-vx2df',
                workload: 'report-worker',
                namespace: 'analytics'
            },
            teaser: {
                unlockAfter: 'cr-02',
                commandCount: 5,
                situation: {
                    ko: '클러스터 여유는 남아 있지만 report-worker가 노드 한 대 분량의 CPU를 요구한다.',
                    en: 'The cluster has headroom, but report-worker requests an entire node worth of CPU.'
                },
                clue: {
                    ko: '전체 여유와 워크로드 request를 함께 비교하라.',
                    en: 'Compare cluster headroom with the workload request.'
                }
            },
            steps: []
        },
        {
            id: 'cr-04',
            chapter: 4,
            playable: false,
            status: 'locked',
            title: { ko: 'THE EMPTY ROUTE', en: 'THE EMPTY ROUTE' },
            subtitle: { ko: '문은 있지만 복도가 없다', en: 'A door with no corridor' },
            incident: {
                code: 'HTTP 503',
                secondaryCode: 'NO ACTIVE ENDPOINTS',
                resource: 'route',
                name: 'checkout',
                workload: 'checkout-api',
                namespace: 'shop'
            },
            teaser: {
                unlockAfter: 'cr-03',
                commandCount: 7,
                situation: {
                    ko: '파드와 Route는 존재하지만 selector가 어긋나 EndpointSlice가 비어 있다.',
                    en: 'Pods and the Route exist, but a selector mismatch leaves the EndpointSlice empty.'
                },
                clue: {
                    ko: 'Route부터 Pod까지 연결선을 따라가라.',
                    en: 'Trace the connection from Route to Pod.'
                }
            },
            steps: []
        },
        {
            id: 'cr-05',
            chapter: 5,
            playable: false,
            status: 'locked',
            title: { ko: 'MISSING CONFIG', en: 'MISSING CONFIG' },
            subtitle: { ko: '조립되지 않은 실행 환경', en: 'A runtime that cannot be assembled' },
            incident: {
                code: 'CreateContainerConfigError',
                resource: 'pod',
                name: 'fraud-engine-65b7fbb9c7-j6m2q',
                workload: 'fraud-engine',
                namespace: 'risk'
            },
            teaser: {
                unlockAfter: 'cr-04',
                commandCount: 6,
                situation: {
                    ko: '위험 탐지 엔진이 필요한 ConfigMap이 사라져 시작조차 하지 못한다.',
                    en: 'The risk engine cannot start because its required ConfigMap has disappeared.'
                },
                clue: {
                    ko: '실패한 실행이 아니라 누락된 실행 조건을 찾아라.',
                    en: 'Look for a missing prerequisite, not a failed process.'
                }
            },
            steps: []
        },
        {
            id: 'cr-06',
            chapter: 6,
            playable: false,
            status: 'locked',
            title: { ko: 'MEMORY FIRE', en: 'MEMORY FIRE' },
            subtitle: { ko: '너무 낮아진 메모리 경계', en: 'A memory boundary set too low' },
            incident: {
                code: 'OOMKilled',
                resource: 'pod',
                name: 'indexer-7f4d7ccf9f-q8mvn',
                workload: 'indexer',
                namespace: 'search'
            },
            teaser: {
                unlockAfter: 'cr-05',
                commandCount: 6,
                situation: {
                    ko: '검색 인덱서의 memory limit가 안정 기준 512Mi에서 128Mi로 덮어써졌다.',
                    en: 'The search indexer memory limit was overwritten from the stable 512Mi to 128Mi.'
                },
                clue: {
                    ko: '사용량과 limit를 함께 보고 숫자를 바꿔라.',
                    en: 'Read usage and limit together before changing a number.'
                }
            },
            steps: []
        },
        {
            id: 'cr-07',
            chapter: 7,
            playable: false,
            status: 'locked',
            title: { ko: 'ALIVE, NOT READY', en: 'ALIVE, NOT READY' },
            subtitle: { ko: '살아 있지만 준비되지 않았다', en: 'Alive, but not ready' },
            incident: {
                code: 'Readiness probe failed',
                resource: 'pod',
                name: 'catalog-api-66c98c75db-mx7kt',
                workload: 'catalog-api',
                namespace: 'catalog'
            },
            teaser: {
                unlockAfter: 'cr-06',
                commandCount: 6,
                situation: {
                    ko: 'Running 프로세스의 readiness probe가 실제 포트가 아닌 8081을 두드린다.',
                    en: 'A Running process has a readiness probe knocking on 8081 instead of its real port.'
                },
                clue: {
                    ko: '살아 있는 것과 트래픽을 받을 준비가 된 것을 구분하라.',
                    en: 'Distinguish being alive from being ready to receive traffic.'
                }
            },
            steps: []
        },
        {
            id: 'cr-08',
            chapter: 8,
            playable: false,
            status: 'locked',
            title: { ko: 'ROLLBACK DAWN', en: 'ROLLBACK DAWN' },
            subtitle: { ko: 'HELIOS-42를 되돌려라', en: 'Roll back HELIOS-42' },
            incident: {
                code: 'ProgressDeadlineExceeded',
                resource: 'deployment',
                name: 'gateway',
                workload: 'gateway',
                namespace: 'edge',
                revision: 42
            },
            teaser: {
                unlockAfter: 'cr-07',
                commandCount: 7,
                situation: {
                    ko: '모든 흔적이 02:59 자동 배포 HELIOS-42로 모이고 gateway 롤아웃이 기한을 넘긴다.',
                    en: 'Every trail converges on the 02:59 deployment HELIOS-42 as the gateway rollout exceeds its deadline.'
                },
                clue: {
                    ko: '히스토리에서 마지막 안정 리비전을 확인하고 증거를 남긴 채 롤백하라.',
                    en: 'Find the last stable revision in history and roll back with evidence.'
                }
            },
            steps: []
        }
    ]
};

const CODE_RED_SCENARIOS = CODE_RED_CAMPAIGN.chapters;

if (typeof window !== 'undefined') {
    window.CODE_RED_CAMPAIGN = CODE_RED_CAMPAIGN;
    window.CODE_RED_SCENARIOS = CODE_RED_SCENARIOS;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CODE_RED_CAMPAIGN,
        CODE_RED_SCENARIOS
    };
}
