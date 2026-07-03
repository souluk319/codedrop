/**
 * CodeDrop - 모의랩 모드
 * 여러 EX280 작업을 순서대로 입력하는 절차형 훈련 엔진.
 */

const LabMode = (() => {
    const BEST_KEY = 'codedrop_lab_best';

    const state = {
        lab: null,
        idx: 0,
        score: 0,
        wrongAttempts: 0,
        hintUsed: false,
        answered: false,
        completed: []
    };

    const $ = (id) => document.getElementById(id);
    const ui = {};

    function cacheEls() {
        ui.screen = $('lab-screen');
        ui.card = $('lab-card');
        ui.title = $('lab-title');
        ui.progress = $('lab-progress');
        ui.score = $('lab-score');
        ui.goal = $('lab-goal');
        ui.checklist = $('lab-checklist');
        ui.text = $('lab-step-text');
        ui.input = $('lab-input');
        ui.feedback = $('lab-feedback');
        ui.hintBtn = $('lab-hint');
        ui.skipBtn = $('lab-skip');
        ui.nextBtn = $('lab-next');
        ui.quitBtn = $('lab-quit');
        ui.summary = $('lab-summary');
        ui.summaryTitle = $('lab-summary-title');
        ui.summaryStats = $('lab-summary-stats');
        ui.summaryReview = $('lab-summary-review');
        ui.retryBtn = $('lab-retry');
        ui.nextLabBtn = $('lab-next-lab');
        ui.homeBtn = $('lab-home');
    }

    function start(labId) {
        cacheEls();
        const lab = findLab(labId) || MOCK_LABS[0];
        if (!lab) return;

        state.lab = lab;
        state.idx = 0;
        state.score = 0;
        state.completed = [];

        ui.summary.classList.add('hidden');
        ui.card.classList.remove('hidden');
        ui.screen.classList.remove('hidden');

        bindEvents();
        renderStep();
    }

    function findLab(labId) {
        return (MOCK_LABS || []).find(lab => lab.id === labId);
    }

    function quit() {
        ui.screen.classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
        if (typeof fetchLeaderboard === 'function') fetchLeaderboard();
    }

    let eventsBound = false;
    function bindEvents() {
        if (eventsBound) return;
        eventsBound = true;

        ui.input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.stopPropagation();
            if (state.answered) {
                nextStep();
            } else if (ui.input.value.trim()) {
                checkAnswer();
            }
        });

        ui.hintBtn.addEventListener('click', showHint);
        ui.skipBtn.addEventListener('click', skipStep);
        ui.nextBtn.addEventListener('click', nextStep);
        ui.quitBtn.addEventListener('click', quit);
        ui.retryBtn.addEventListener('click', () => start(state.lab.id));
        ui.nextLabBtn.addEventListener('click', startNextLab);
        ui.homeBtn.addEventListener('click', quit);
    }

    function currentStep() {
        return state.lab.steps[state.idx];
    }

    function renderStep() {
        const step = currentStep();
        state.wrongAttempts = 0;
        state.hintUsed = false;
        state.answered = false;

        ui.title.textContent = state.lab.title;
        ui.progress.textContent = `STEP ${state.idx + 1} / ${state.lab.steps.length}`;
        renderScore();
        ui.goal.textContent = state.lab.goal;
        ui.text.textContent = step.scenario;
        renderChecklist();

        ui.input.value = '';
        ui.input.disabled = false;
        ui.input.classList.remove('correct', 'wrong');
        ui.feedback.className = 'scenario-feedback hidden';
        ui.feedback.innerHTML = '';
        ui.hintBtn.disabled = false;
        ui.hintBtn.classList.remove('hidden');
        ui.skipBtn.classList.remove('hidden');
        ui.nextBtn.classList.add('hidden');
        ui.input.focus();
    }

    function renderScore() {
        ui.score.textContent = `SCORE ${state.score}`;
    }

    function renderChecklist() {
        ui.checklist.innerHTML = '';
        state.lab.steps.forEach((step, index) => {
            const item = document.createElement('div');
            item.className = 'lab-check-item';
            if (index < state.completed.length) {
                item.classList.add(state.completed[index].skipped ? 'skipped' : 'done');
            } else if (index === state.idx) {
                item.classList.add('current');
            }

            const marker = document.createElement('span');
            marker.className = 'lab-check-marker';
            marker.textContent = index < state.completed.length ? (state.completed[index].skipped ? '!' : 'OK') : String(index + 1);

            const text = document.createElement('span');
            text.className = 'lab-check-text';
            text.textContent = index < state.completed.length ? state.completed[index].step.canonical : step.scenario;

            item.append(marker, text);
            ui.checklist.appendChild(item);
        });
    }

    function stepPoints() {
        const base = Math.max(25, 100 - 25 * state.wrongAttempts);
        return Math.max(0, base - (state.hintUsed ? 30 : 0));
    }

    function checkAnswer() {
        const step = currentStep();
        if (StudyCore.isCorrect(ui.input.value, step)) {
            state.answered = true;
            const dirty = state.wrongAttempts > 0 || state.hintUsed;
            const pts = stepPoints();
            state.score += pts;
            state.completed.push({ step, skipped: false, points: pts, dirty });
            StudyStats.record(step.id, dirty ? 'dirty' : 'clean');

            if (typeof sfx !== 'undefined') sfx.playSuccess();
            ui.input.disabled = true;
            ui.input.classList.remove('wrong');
            ui.input.classList.add('correct');
            renderScore();
            showFeedback('correct', `스텝 완료 +${pts}점`, step);
            showNextControls();
            renderChecklist();
            return;
        }

        state.wrongAttempts++;
        if (typeof sfx !== 'undefined') sfx.playFail();
        ui.input.classList.remove('wrong');
        void ui.input.offsetWidth;
        ui.input.classList.add('wrong');

        ui.feedback.className = 'scenario-feedback wrong-msg';
        ui.feedback.innerHTML = '';
        const msg = document.createElement('div');
        msg.textContent = `오답입니다. 다시 시도하세요. (오답 ${state.wrongAttempts}회 - 현재 스텝 ${stepPoints()}점)`;
        ui.feedback.appendChild(msg);
    }

    function showHint() {
        if (state.answered || state.hintUsed) return;
        const step = currentStep();
        state.hintUsed = true;
        ui.hintBtn.disabled = true;

        ui.feedback.className = 'scenario-feedback hint-msg';
        ui.feedback.innerHTML = '';
        const hint = document.createElement('div');
        hint.textContent = `힌트: ${step.hint}`;
        ui.feedback.appendChild(hint);
        ui.input.focus();
    }

    function skipStep() {
        if (state.answered) return;
        const step = currentStep();
        state.answered = true;
        state.completed.push({ step, skipped: true, points: 0, dirty: true });
        StudyStats.record(step.id, 'skip');

        if (typeof sfx !== 'undefined') sfx.playFail();
        ui.input.disabled = true;
        showFeedback('skipped', '스킵 - 절차를 확인하고 다음으로 진행', step);
        showNextControls();
        renderChecklist();
    }

    function showFeedback(kind, title, step) {
        ui.feedback.className = 'scenario-feedback ' + kind;
        ui.feedback.innerHTML = '';

        const titleEl = document.createElement('div');
        titleEl.className = 'fb-title';
        titleEl.textContent = title;

        const cmdEl = document.createElement('div');
        cmdEl.className = 'fb-canonical';
        cmdEl.textContent = step.canonical;

        const explainEl = document.createElement('div');
        explainEl.className = 'fb-explain';
        explainEl.textContent = step.explain;

        ui.feedback.append(titleEl, cmdEl, explainEl);
    }

    function showNextControls() {
        ui.hintBtn.classList.add('hidden');
        ui.skipBtn.classList.add('hidden');
        ui.nextBtn.classList.remove('hidden');
        ui.nextBtn.textContent = state.idx + 1 >= state.lab.steps.length ? '결과 보기' : '다음 스텝';
        ui.nextBtn.focus();
    }

    function nextStep() {
        if (!state.answered) return;
        state.idx++;
        if (state.idx < state.lab.steps.length) {
            renderStep();
        } else {
            renderSummary();
        }
    }

    function loadBest() {
        try {
            return JSON.parse(localStorage.getItem(BEST_KEY)) || {};
        } catch (e) {
            return {};
        }
    }

    function saveBest(best) {
        localStorage.setItem(BEST_KEY, JSON.stringify(best));
    }

    function renderSummary() {
        ui.card.classList.add('hidden');
        ui.summary.classList.remove('hidden');

        const best = loadBest();
        const prev = best[state.lab.id] || 0;
        const isNewBest = state.score > prev;
        if (isNewBest) {
            best[state.lab.id] = state.score;
            saveBest(best);
        }

        ui.summaryTitle.textContent = 'LAB REPORT';
        ui.summaryStats.innerHTML = '';
        addStat('총점', String(state.score) + (isNewBest ? ' ★신기록' : ''));
        addStat('완료', `${state.completed.filter(s => !s.skipped).length} / ${state.lab.steps.length}`);
        addStat('개인 최고', String(Math.max(prev, state.score)));

        ui.summaryReview.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'review-title';
        title.textContent = '절차 체크리스트';
        ui.summaryReview.appendChild(title);

        state.completed.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'review-item';
            const sc = document.createElement('div');
            sc.className = 'review-scenario';
            sc.textContent = `${index + 1}. ${entry.step.scenario}`;
            const ans = document.createElement('div');
            ans.className = 'review-answer';
            ans.textContent = `${entry.skipped ? 'SKIP' : entry.points + '점'} - ${entry.step.canonical}`;
            item.append(sc, ans);
            ui.summaryReview.appendChild(item);
        });

        const hasNext = nextLab() !== null;
        ui.nextLabBtn.classList.toggle('hidden', !hasNext);
    }

    function addStat(label, value) {
        const item = document.createElement('div');
        item.className = 'stat-item';
        const l = document.createElement('div');
        l.className = 'stat-label';
        l.textContent = label;
        const v = document.createElement('div');
        v.className = 'stat-value';
        v.style.fontSize = '1.4rem';
        v.textContent = value;
        item.append(l, v);
        ui.summaryStats.appendChild(item);
    }

    function nextLab() {
        const idx = MOCK_LABS.findIndex(lab => lab.id === state.lab.id);
        if (idx < 0 || idx + 1 >= MOCK_LABS.length) return null;
        return MOCK_LABS[idx + 1];
    }

    function startNextLab() {
        const lab = nextLab();
        if (lab) start(lab.id);
    }

    return { start, quit };
})();
