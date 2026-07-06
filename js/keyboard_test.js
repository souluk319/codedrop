(() => {
    const STRINGS = {
        en: {
            title: 'KEYBOARD TEST',
            subtitle: 'Press any key. CodeDrop will verify input, timing, and lock states.',
            state: 'State',
            count: 'Key Count',
            last: 'Last Key',
            code: 'Code',
            typing: 'Typing',
            idle: 'IDLE',
            down: 'KEYDOWN',
            up: 'KEYUP',
            home: 'HOME'
        },
        ko: {
            title: '키보드 테스트',
            subtitle: '키를 눌러 입력 상태, 반응 시간, 잠금 상태를 확인합니다.',
            state: '상태',
            count: '입력 수',
            last: '최근 키',
            code: '코드',
            typing: '입력 로그',
            idle: '대기',
            down: '눌림',
            up: '떨어짐',
            home: '홈'
        }
    };

    const MAIN_ROWS = [
        [
            ['Escape', 'ESC'], ['F1', 'F1'], ['F2', 'F2'], ['F3', 'F3'], ['F4', 'F4'],
            ['F5', 'F5'], ['F6', 'F6'], ['F7', 'F7'], ['F8', 'F8'],
            ['F9', 'F9'], ['F10', 'F10'], ['F11', 'F11'], ['F12', 'F12']
        ],
        [
            ['Backquote', '~'], ['Digit1', '1'], ['Digit2', '2'], ['Digit3', '3'], ['Digit4', '4'], ['Digit5', '5'],
            ['Digit6', '6'], ['Digit7', '7'], ['Digit8', '8'], ['Digit9', '9'], ['Digit0', '0'],
            ['Minus', '-'], ['Equal', '='], ['Backspace', 'Backspace', '2']
        ],
        [
            ['Tab', 'Tab', '1.5'], ['KeyQ', 'Q'], ['KeyW', 'W'], ['KeyE', 'E'], ['KeyR', 'R'], ['KeyT', 'T'],
            ['KeyY', 'Y'], ['KeyU', 'U'], ['KeyI', 'I'], ['KeyO', 'O'], ['KeyP', 'P'],
            ['BracketLeft', '['], ['BracketRight', ']'], ['Backslash', '\\', '1.5']
        ],
        [
            ['CapsLock', 'Caps Lock', '1.75'], ['KeyA', 'A'], ['KeyS', 'S'], ['KeyD', 'D'], ['KeyF', 'F'], ['KeyG', 'G'],
            ['KeyH', 'H'], ['KeyJ', 'J'], ['KeyK', 'K'], ['KeyL', 'L'], ['Semicolon', ';'],
            ['Quote', "'"], ['Enter', 'Enter', '2.25']
        ],
        [
            ['ShiftLeft', 'Shift', '2.25'], ['KeyZ', 'Z'], ['KeyX', 'X'], ['KeyC', 'C'], ['KeyV', 'V'], ['KeyB', 'B'],
            ['KeyN', 'N'], ['KeyM', 'M'], ['Comma', ','], ['Period', '.'], ['Slash', '/'], ['ShiftRight', 'Shift', '2.75']
        ],
        [
            ['ControlLeft', 'Ctrl', '1.25'], ['MetaLeft', 'Win', '1.25'], ['AltLeft', 'Alt', '1.25'],
            ['Space', 'Space', '6.25'], ['AltRight', 'Alt', '1.25'], ['MetaRight', 'Win', '1.25'],
            ['ContextMenu', 'Menu', '1.25'], ['ControlRight', 'Ctrl', '1.25']
        ]
    ];

    const NAV_KEYS = [
        ['PrintScreen', 'PrtSc'], ['ScrollLock', 'ScrLk'], ['Pause', 'Pause'],
        ['Insert', 'Ins'], ['Home', 'Home'], ['PageUp', 'PgUp'],
        ['Delete', 'Del'], ['End', 'End'], ['PageDown', 'PgDn'],
        ['', ''], ['ArrowUp', '↑'], ['', ''],
        ['ArrowLeft', '←'], ['ArrowDown', '↓'], ['ArrowRight', '→']
    ];

    const NUM_KEYS = [
        ['NumLock', 'Num'], ['NumpadDivide', '/'], ['NumpadMultiply', '*'], ['NumpadSubtract', '-'],
        ['Numpad7', '7'], ['Numpad8', '8'], ['Numpad9', '9'], ['NumpadAdd', '+', 'tall'],
        ['Numpad4', '4'], ['Numpad5', '5'], ['Numpad6', '6'],
        ['Numpad1', '1'], ['Numpad2', '2'], ['Numpad3', '3'], ['NumpadEnter', 'Enter', 'tall'],
        ['Numpad0', '0', 'wide2'], ['NumpadDecimal', 'Del']
    ];

    const els = {};
    const state = {
        open: false,
        startWasHidden: false,
        count: 0,
        firstAt: 0,
        lastAt: 0,
        pressed: new Set(),
        recentTimer: 0,
        lastSoundAt: 0
    };

    function lang() {
        return document.body.dataset.appLang === 'ko' ? 'ko' : 'en';
    }

    function text(key) {
        return STRINGS[lang()][key] || STRINGS.en[key] || key;
    }

    function keyLabel(event) {
        if (event.code === 'Space') return 'Space';
        if (event.key === ' ') return 'Space';
        return event.key && event.key.length === 1 ? event.key : (event.key || event.code || '-');
    }

    function printableLogKey(event) {
        if (event.key === ' ') return ' ';
        if (event.key === 'Enter') return '\n';
        if (event.key === 'Tab') return '⇥';
        if (event.key === 'Backspace') return '⌫';
        if (event.key && event.key.length === 1) return event.key;
        return `[${event.key || event.code}]`;
    }

    function createKey(code, label, wide) {
        const key = document.createElement('div');
        key.className = 'keytest-key';
        key.textContent = label;
        if (code) key.dataset.code = code;
        if (wide && /^\d/.test(wide)) key.dataset.wide = wide;
        if (wide === 'tall') key.classList.add('tall');
        if (wide === 'wide2') key.classList.add('wide2');
        return key;
    }

    function buildBoard() {
        if (!els.board || els.board.dataset.ready === '1') return;
        els.board.dataset.ready = '1';

        const main = document.createElement('div');
        main.className = 'keytest-zone';
        MAIN_ROWS.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'keytest-row';
            row.forEach(([code, label, wide]) => rowEl.appendChild(createKey(code, label, wide)));
            main.appendChild(rowEl);
        });

        const nav = document.createElement('div');
        nav.className = 'keytest-nav-grid';
        NAV_KEYS.forEach(([code, label]) => {
            const key = createKey(code, label);
            if (!code) key.style.visibility = 'hidden';
            nav.appendChild(key);
        });

        const num = document.createElement('div');
        num.className = 'keytest-numpad-grid';
        NUM_KEYS.forEach(([code, label, shape]) => num.appendChild(createKey(code, label, shape)));

        els.board.append(main, nav, num);
    }

    function keyElement(code) {
        if (!code) return null;
        return els.board?.querySelector(`[data-code="${CSS.escape(code)}"]`) || null;
    }

    function updateLocks(event) {
        const locks = [
            ['CapsLock', els.caps],
            ['NumLock', els.num],
            ['ScrollLock', els.scroll]
        ];
        locks.forEach(([name, el]) => {
            if (!el || !event.getModifierState) return;
            el.classList.toggle('on', event.getModifierState(name));
        });
    }

    function updateKpm(now) {
        const elapsedMinutes = state.firstAt ? Math.max((now - state.firstAt) / 60000, 1 / 60) : 1;
        const kpm = Math.round(state.count / elapsedMinutes);
        if (els.kpm) els.kpm.textContent = `KPM ${kpm}`;
    }

    function markRecent(code) {
        const el = keyElement(code);
        if (!el) return;
        document.querySelectorAll('.keytest-key.recent').forEach(key => key.classList.remove('recent'));
        el.classList.add('recent');
        window.clearTimeout(state.recentTimer);
        state.recentTimer = window.setTimeout(() => el.classList.remove('recent'), 520);
    }

    function playInputFeedback(event, now) {
        if (event.repeat) return;
        if (!window.sfx || typeof window.sfx.playKey !== 'function') return;
        if (now - state.lastSoundAt < 24) return;
        state.lastSoundAt = now;
        window.sfx.playKey(event.key === ' ' ? ' ' : (event.key || event.code));
    }

    function handleKeyDown(event) {
        if (!state.open) return;
        event.preventDefault();
        event.stopPropagation();

        const now = performance.now();
        playInputFeedback(event, now);
        if (!state.firstAt) state.firstAt = now;
        if (!event.repeat) {
            state.count += 1;
            state.pressed.add(event.code);
            const key = keyElement(event.code);
            if (key) key.classList.add('pressed', 'tested');
            if (els.log) {
                els.log.textContent = `${els.log.textContent}${printableLogKey(event)}`.slice(-2000);
                els.log.scrollTop = els.log.scrollHeight;
            }
        }

        if (els.state) els.state.textContent = text('down');
        if (els.count) els.count.textContent = String(state.count);
        if (els.last) els.last.textContent = keyLabel(event);
        if (els.code) els.code.textContent = `${event.code || '-'} · ${event.keyCode || event.which || 0}`;
        state.lastAt = now;
        updateKpm(now);
        updateLocks(event);
        markRecent(event.code);
    }

    function handleKeyUp(event) {
        if (!state.open) return;
        event.preventDefault();
        event.stopPropagation();

        state.pressed.delete(event.code);
        const key = keyElement(event.code);
        if (key) key.classList.remove('pressed');
        if (els.state) els.state.textContent = text('up');
        updateLocks(event);
    }

    function clear() {
        state.count = 0;
        state.firstAt = 0;
        state.lastAt = 0;
        state.pressed.clear();
        if (els.state) els.state.textContent = text('idle');
        if (els.count) els.count.textContent = '0';
        if (els.last) els.last.textContent = '-';
        if (els.code) els.code.textContent = '-';
        if (els.kpm) els.kpm.textContent = 'KPM 0';
        if (els.log) els.log.textContent = '';
        document.querySelectorAll('.keytest-key.pressed, .keytest-key.recent, .keytest-key.tested').forEach(key => {
            key.classList.remove('pressed', 'recent', 'tested');
        });
    }

    function open() {
        buildBoard();
        state.open = true;
        const startScreen = document.getElementById('start-screen');
        state.startWasHidden = Boolean(startScreen?.classList.contains('hidden'));
        startScreen?.classList.add('hidden');
        els.screen.classList.remove('hidden');
        applyLanguage();
        window.syncCodeDropChrome?.();
        els.close?.focus();
    }

    function close() {
        state.open = false;
        state.pressed.clear();
        document.querySelectorAll('.keytest-key.pressed').forEach(key => key.classList.remove('pressed'));
        els.screen.classList.add('hidden');
        const startScreen = document.getElementById('start-screen');
        if (startScreen && !state.startWasHidden) startScreen.classList.remove('hidden');
        window.syncCodeDropChrome?.();
    }

    function applyLanguage() {
        document.querySelectorAll('[data-keytest-i18n]').forEach(node => {
            node.textContent = text(node.dataset.keytestI18n);
        });
        if (els.close) els.close.textContent = text('home');
        if (els.state && (els.state.textContent === 'IDLE' || els.state.textContent === '대기')) {
            els.state.textContent = text('idle');
        }
    }

    function init() {
        els.screen = document.getElementById('keyboard-test-screen');
        if (!els.screen) return;
        els.button = document.getElementById('keyboard-test-btn');
        els.close = document.getElementById('keytest-close');
        els.clear = document.getElementById('keytest-clear');
        els.board = document.getElementById('keytest-board');
        els.state = document.getElementById('keytest-state');
        els.count = document.getElementById('keytest-count');
        els.last = document.getElementById('keytest-last');
        els.code = document.getElementById('keytest-code');
        els.log = document.getElementById('keytest-log');
        els.kpm = document.getElementById('keytest-kpm');
        els.caps = document.getElementById('keytest-caps');
        els.num = document.getElementById('keytest-num');
        els.scroll = document.getElementById('keytest-scroll');

        buildBoard();
        applyLanguage();

        els.button?.addEventListener('click', open);
        els.close?.addEventListener('click', close);
        els.clear?.addEventListener('click', clear);
        els.screen.addEventListener('click', event => {
            if (event.target === els.screen) close();
        });
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('keyup', handleKeyUp, true);
        window.addEventListener('codedrop:language', applyLanguage);

        window.KeyboardTest = { open, close, clear };
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
