/**
 * CODEDROP: CODE RED
 * Chapter 1 pixel motion-comic visual registry.
 *
 * Raster assets contain artwork only. Dialogue, commands, metrics, timestamps,
 * and localized labels stay in the DOM so they remain exact and accessible.
 */

'use strict';

(function registerCodeRedVisuals(root) {
    const BASE_PATH = 'assets/code-red/chapter-1/';
    const LOGICAL_SIZE = Object.freeze({ width: 320, height: 180 });
    const PALETTE = Object.freeze([
        '#03070b', '#ff304d', '#7c1026', '#52e5ff', '#3cf2a0', '#ffc857',
        '#b44eff', '#e8f0f1', '#c5bcb9', '#49b3d1', '#957671', '#b05d39',
        '#26709c', '#79443f', '#563e41', '#394454', '#332c31', '#0c4d7d',
        '#123b5a', '#1e1e26', '#082641', '#041528', '#950503'
    ]);

    const assets = {
        'control-room-bg': {
            src: `${BASE_PATH}control-room-bg.png`,
            slots: ['background'],
            type: 'image/png',
            critical: true,
            bytesMax: 153600
        },
        'control-room-mid': {
            src: `${BASE_PATH}control-room-mid.png`,
            slots: ['midground'],
            type: 'image/png',
            critical: true,
            bytesMax: 138240
        },
        'control-room-fg': {
            src: `${BASE_PATH}control-room-fg.png`,
            slots: ['foreground'],
            type: 'image/png',
            critical: true,
            bytesMax: 92160
        },
        'operator-desk-plate': {
            src: `${BASE_PATH}operator-desk-plate.png`,
            slots: ['midground', 'foreground'],
            type: 'image/png',
            critical: false,
            bytesMax: 122880
        },
        'operator-standing-sheet': {
            src: `${BASE_PATH}operator-standing-sheet.png`,
            slots: ['subject'],
            type: 'image/png',
            critical: false,
            bytesMax: 250880
        },
        'operator-console-sheet': {
            src: `${BASE_PATH}operator-console-sheet.png`,
            slots: ['subject'],
            type: 'image/png',
            critical: false,
            bytesMax: 250880
        },
        'watcher-sheet': {
            src: `${BASE_PATH}watcher-sheet.png`,
            slots: ['subject'],
            type: 'image/png',
            critical: true,
            bytesMax: 250880
        },
        'control-portrait-sheet': {
            src: `${BASE_PATH}control-portrait-sheet.png`,
            slots: ['subject'],
            type: 'image/png',
            critical: false,
            bytesMax: 184320
        },
        'dev-portrait-sheet': {
            src: `${BASE_PATH}dev-portrait-sheet.png`,
            slots: ['subject'],
            type: 'image/png',
            critical: false,
            bytesMax: 184320
        },
        'ui-data-atlas': {
            src: `${BASE_PATH}ui-data-atlas.png`,
            slots: ['ui'],
            type: 'image/png',
            critical: false,
            bytesMax: 225280
        }
    };

    const cropPresets = {
        wide: {
            desktop: { x: 0, y: 0, width: 320, height: 180 },
            portrait: { x: 88, y: 0, width: 144, height: 180 },
            compact: { x: 70, y: 0, width: 180, height: 180 }
        },
        center: {
            desktop: { x: 32, y: 0, width: 256, height: 180 },
            portrait: { x: 88, y: 0, width: 144, height: 180 },
            compact: { x: 70, y: 0, width: 180, height: 180 }
        },
        left: {
            desktop: { x: 0, y: 0, width: 256, height: 180 },
            portrait: { x: 16, y: 0, width: 144, height: 180 },
            compact: { x: 8, y: 0, width: 180, height: 180 }
        },
        right: {
            desktop: { x: 64, y: 0, width: 256, height: 180 },
            portrait: { x: 160, y: 0, width: 144, height: 180 },
            compact: { x: 132, y: 0, width: 180, height: 180 }
        },
        terminal: {
            desktop: { x: 32, y: 18, width: 256, height: 144 },
            portrait: { x: 88, y: 18, width: 144, height: 162 },
            compact: { x: 70, y: 18, width: 180, height: 162 }
        }
    };

    function cloneCrop(presetName) {
        const preset = cropPresets[presetName];
        return {
            desktop: { ...preset.desktop },
            portrait: { ...preset.portrait },
            compact: { ...preset.compact }
        };
    }

    function composition({
        subject = null,
        midground = 'control-room-mid',
        foreground = 'control-room-fg',
        ui = 'ui-data-atlas',
        focalSlot,
        actorState,
        screenState,
        crop = 'center'
    }) {
        return {
            layers: {
                background: 'control-room-bg',
                midground,
                subject,
                foreground,
                ui
            },
            focalSlot,
            actorState,
            screenState,
            crop: cloneCrop(crop),
            fallback: 'css'
        };
    }

    const compositions = {
        'status-grid-idle': composition({
            focalSlot: 'midground',
            actorState: 'system-idle',
            screenState: 'nominal-grid',
            crop: 'wide'
        }),
        'metric-line-collapse': composition({
            focalSlot: 'ui',
            actorState: 'system-alert',
            screenState: 'payment-metric-collapse',
            crop: 'center'
        }),
        'hologram-materialize': composition({
            subject: 'watcher-sheet',
            ui: null,
            focalSlot: 'subject',
            actorState: 'watcher-normal',
            screenState: 'baseline-alert',
            crop: 'center'
        }),
        'chair-turn-and-console-wake': composition({
            subject: 'operator-console-sheet',
            midground: 'operator-desk-plate',
            ui: null,
            focalSlot: 'subject',
            actorState: 'operator-console-wake',
            screenState: 'operator-console-online',
            crop: 'left'
        }),
        'portrait-lean-in': composition({
            subject: 'dev-portrait-sheet',
            ui: null,
            focalSlot: 'subject',
            actorState: 'dev-tense',
            screenState: 'timestamp-0259',
            crop: 'right'
        }),
        'incident-card-drop-in': composition({
            focalSlot: 'ui',
            actorState: 'system-critical',
            screenState: 'incident-card-locked',
            crop: 'center'
        }),
        'heartbeat-line-recover': composition({
            subject: 'watcher-sheet',
            focalSlot: 'ui',
            actorState: 'watcher-recovered',
            screenState: 'payment-heartbeat-recovered',
            crop: 'center'
        }),
        'portrait-exhale-and-nod': composition({
            subject: 'dev-portrait-sheet',
            ui: null,
            focalSlot: 'subject',
            actorState: 'dev-relieved',
            screenState: 'comms-stable',
            crop: 'right'
        }),
        'highlight-log-timestamp': composition({
            subject: 'control-portrait-sheet',
            midground: 'operator-desk-plate',
            focalSlot: 'ui',
            actorState: 'control-analyzing',
            screenState: 'log-timestamp-0259',
            crop: 'terminal'
        }),
        'impact-line-breach': composition({
            subject: 'watcher-sheet',
            focalSlot: 'ui',
            actorState: 'watcher-alert',
            screenState: 'impact-boundary-breach',
            crop: 'center'
        }),
        'console-lockout': composition({
            subject: 'operator-standing-sheet',
            midground: 'operator-desk-plate',
            ui: null,
            focalSlot: 'subject',
            actorState: 'operator-locked-silhouette',
            screenState: 'console-locked',
            crop: 'left'
        }),
        'rewind-log-buffer': composition({
            subject: 'control-portrait-sheet',
            midground: 'operator-desk-plate',
            focalSlot: 'ui',
            actorState: 'control-commanding',
            screenState: 'log-buffer-rewind',
            crop: 'terminal'
        }),
        'scope-grid-collapse': composition({
            subject: 'watcher-sheet',
            focalSlot: 'ui',
            actorState: 'watcher-alert',
            screenState: 'scope-grid-collapse',
            crop: 'wide'
        }),
        'evidence-chain-fracture': composition({
            subject: 'watcher-sheet',
            ui: null,
            focalSlot: 'subject',
            actorState: 'watcher-fractured',
            screenState: 'evidence-chain-fracture',
            crop: 'center'
        }),
        'bad-config-propagate': composition({
            subject: 'watcher-sheet',
            focalSlot: 'ui',
            actorState: 'watcher-alert',
            screenState: 'bad-config-propagation',
            crop: 'center'
        }),
        'verification-signal-flatline': composition({
            subject: 'watcher-sheet',
            focalSlot: 'ui',
            actorState: 'watcher-fractured',
            screenState: 'verification-flatline',
            crop: 'center'
        }),
        'rollout-status-freeze': composition({
            subject: 'control-portrait-sheet',
            midground: 'operator-desk-plate',
            focalSlot: 'ui',
            actorState: 'control-analyzing',
            screenState: 'rollout-status-frozen',
            crop: 'terminal'
        }),
        'ghost-image-tag-flicker': composition({
            focalSlot: 'ui',
            actorState: 'system-registry-alert',
            screenState: 'registry-ghost-image',
            crop: 'right'
        }),
        'fade-behind-new-alert': composition({
            subject: 'watcher-sheet',
            ui: null,
            focalSlot: 'subject',
            actorState: 'watcher-ghost',
            screenState: 'chapter-two-alert',
            crop: 'wide'
        })
    };

    const cameraAliases = {
        'slow-pan-right': 'pan-right-slow',
        'snap-zoom-center': 'zoom-center-snap',
        'hold-center': 'hold-center',
        'track-left': 'track-left',
        'rack-focus-right': 'focus-right-rack',
        'impact-shake': 'shake-impact',
        'rise-with-chart': 'track-up-chart',
        'hold-split': 'hold-split',
        'slow-push-terminal': 'push-terminal-slow',
        'hard-shake-down': 'shake-down-hard',
        'pull-back': 'pull-back',
        'snap-to-cursor': 'snap-cursor',
        'hard-zoom-out': 'zoom-out-hard',
        'snap-between-clues': 'snap-clues',
        'track-restart-loop': 'track-restart-loop',
        'tilt-down-with-chart': 'tilt-down-chart',
        'creep-zoom-right': 'zoom-right-creep',
        'slow-pull-back': 'pull-back-slow'
    };

    const shotAliases = {
        wide: 'establish-wide',
        'dashboard-closeup': 'dashboard-closeup',
        medium: 'portrait-medium',
        'operator-desk': 'operator-desk',
        'comms-inset': 'comms-inset',
        'full-screen': 'full-screen',
        'metric-wall': 'metric-wall',
        'split-screen': 'split-screen',
        'operator-console': 'operator-console',
        'operator-silhouette': 'operator-silhouette',
        'terminal-closeup': 'terminal-closeup',
        'watcher-hologram': 'watcher-hologram',
        'secondary-monitor': 'secondary-monitor',
        'control-room-wide': 'control-room-wide'
    };

    const effectAliases = {
        'blue-scanlines': 'scanlines-blue',
        'red-warning-pulse': 'warning-pulse-red',
        'cyan-to-red-flicker': 'flicker-cyan-red',
        'monitor-light-sweep': 'monitor-sweep',
        'timestamp-0259-flash': 'timestamp-flash',
        'red-vignette-and-glitch': 'vignette-glitch-red',
        'red-to-green-wave': 'recovery-wave',
        'signal-stabilize': 'signal-stable',
        'amber-timestamp-pulse': 'timestamp-pulse-amber',
        'critical-red-blackout': 'blackout-critical',
        'cold-white-takeover': 'takeover-cold-white',
        'timeline-rewind': 'rewind-timeline',
        'heartbeat-stutter': 'stutter-heartbeat',
        'violet-registry-noise': 'registry-noise-violet',
        'chapter-two-silhouette': 'silhouette-chapter-two'
    };

    const registry = {
        version: 1,
        basePath: BASE_PATH,
        logicalSize: LOGICAL_SIZE,
        palette: PALETTE,
        textRendering: 'dom-overlay',
        slots: ['background', 'midground', 'subject', 'foreground', 'ui'],
        assets,
        compositions,
        shotAliases,
        cameraAliases,
        effectAliases
    };

    root.CODE_RED_VISUALS = registry;
    if (typeof CODE_RED_CAMPAIGN !== 'undefined' && CODE_RED_CAMPAIGN.cutscene) {
        Object.assign(CODE_RED_CAMPAIGN.cutscene, registry);
    }
}(typeof window !== 'undefined' ? window : globalThis));
