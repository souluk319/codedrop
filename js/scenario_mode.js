/**
 * CodeDrop - 장문모드 엔진 (연습 / 시험 / 오답복습)
 * 낙하 게임 루프와 완전히 분리된 별도 모드.
 *
 * 사용:
 *   ScenarioMode.start('AUTH')   — 연습 (카테고리 10문제, 힌트 허용)
 *   ScenarioMode.startGuided('AUTH') — 따라치기 (정답 공개, 점수 미반영)
 *   ScenarioMode.startIncidentDrill() — 오류 진단훈련
 *   ScenarioMode.startExam()     — 시험 (전 영역 15문제, 90초, 힌트 없음, 스킵큐)
 *   ScenarioMode.startReview()   — 오답노트 (약점 문제 재출제)
 */

const ScenarioMode = (() => {

    const QUESTIONS_PER_SESSION = 10;
    const BEST_KEY = 'codedrop_scenario_best';

    // 시험 출제 청사진 (우선순위 가중, LINUX_BASIC 제외) — 합계 15
    const EXAM_BLUEPRINT = {
        AUTH: 2, RBAC: 2, SCC_SA: 2, RESOURCES: 2,
        WORKLOADS: 1, NETWORK_SECURITY: 1, DEPLOY: 1, TROUBLESHOOT: 1,
        MANIFESTS: 1, OPERATORS: 1, JOBS: 1
    };
    const EXAM_TIME_PER_Q = 90;   // 초
    const EXAM_PASS_RATE = 0.7;
    let runtime = {
        packs: () => (typeof SCENARIO_PACKS !== 'undefined' ? SCENARIO_PACKS : {}),
        examBlueprint: () => EXAM_BLUEPRINT,
        bestKey: BEST_KEY,
        incidentCategory: 'INCIDENTS',
        examLabel: '실전 시험',
        edition: 'ocp'
    };

    const session = {
        opts: null,
        list: [],          // 현재 라운드의 문제 목록
        idx: 0,
        phase: 'main',     // 'main' | 'deferred' (시험 복습 라운드)
        deferred: [],      // 시험: 건너뛴 문제 적립
        score: 0,
        correct: 0,
        wrongAttempts: 0,  // 현재 문제 오답 횟수
        hintUsed: false,
        answered: false,
        missed: [],        // 복습 리스트 (스킵/오답 경유)
        results: [],       // 시험: {q, correct}
        timerId: null,
        timeLeft: 0,
        startedAt: 0,
        guidedWrongAttempts: 0,
        guidedClean: 0,
        guidedChars: 0
    };

    const $ = (id) => document.getElementById(id);
    const ui = {};

    function cacheEls() {
        ui.screen = $('scenario-screen');
        ui.card = $('scenario-card');
        ui.category = $('scenario-category');
        ui.progress = $('scenario-progress');
        ui.score = $('scenario-score');
        ui.timer = $('scenario-timer');
        ui.chatBtn = $('scenario-chat');
        ui.text = $('scenario-text');
        ui.input = $('scenario-input');
        ui.feedback = $('scenario-feedback');
        ui.hintBtn = $('scenario-hint');
        ui.skipBtn = $('scenario-skip');
        ui.nextBtn = $('scenario-next');
        ui.quitBtn = $('scenario-quit');
        ui.summary = $('scenario-summary');
        ui.summaryTitle = $('scenario-summary-title');
        ui.summaryStats = $('scenario-summary-stats');
        ui.summaryReview = $('scenario-summary-review');
        ui.retryBtn = $('scenario-retry');
        ui.homeBtn = $('scenario-home');
    }

    // ---------- 진입점 ----------

    function configure(next = {}) {
        runtime = { ...runtime, ...next };
    }

    function getPacks() {
        return typeof runtime.packs === 'function' ? runtime.packs() : (runtime.packs || {});
    }

    function getExamBlueprint() {
        return typeof runtime.examBlueprint === 'function' ? runtime.examBlueprint() : (runtime.examBlueprint || EXAM_BLUEPRINT);
    }

    function getBestKey() {
        return runtime.bestKey || BEST_KEY;
    }

    function start(category) {
        const pack = getPacks()[category];
        if (!pack) {
            console.error('Unknown scenario category:', category);
            return;
        }
        startSession({
            mode: 'practice',
            label: pack.label,
            questions: StudyCore.shuffle(pack.questions).slice(0, QUESTIONS_PER_SESSION),
            hintsAllowed: true,
            timePerQuestion: null,
            skipToQueue: false,
            bestKeyCategory: category,
            retry: () => start(category)
        });
    }

    function startGuided(category) {
        const pack = getPacks()[category];
        if (!pack) {
            console.error('Unknown scenario category:', category);
            return;
        }
        startSession({
            mode: 'guided',
            practiceMode: 'follow',
            label: `${pack.label} · 따라치기`,
            questions: StudyCore.shuffle(pack.questions).slice(0, QUESTIONS_PER_SESSION),
            hintsAllowed: false,
            timePerQuestion: null,
            skipToQueue: false,
            bestKeyCategory: null,
            retry: () => startGuided(category)
        });
    }

    function startIncidentDrill() {
        start(runtime.incidentCategory || 'INCIDENTS');
    }

    function startExam() {
        const questions = [];
        const packs = getPacks();
        Object.entries(getExamBlueprint()).forEach(([cat, count]) => {
            const pack = packs[cat];
            if (!pack) return;
            questions.push(...StudyCore.shuffle(pack.questions).slice(0, count));
        });
        startSession({
            mode: 'exam',
            label: runtime.examLabel || '실전 시험',
            questions: StudyCore.shuffle(questions),
            hintsAllowed: false,
            timePerQuestion: EXAM_TIME_PER_Q,
            skipToQueue: true,
            bestKeyCategory: null,
            retry: () => startExam()
        });
    }

    function startReview(options = {}) {
        const pool = StudyStats.reviewPool({ edition: options.edition || runtime.edition || 'ocp' }).slice(0, QUESTIONS_PER_SESSION);
        if (pool.length === 0) return;
        startSession({
            mode: 'review',
            label: '오답노트',
            questions: pool,
            hintsAllowed: true,
            timePerQuestion: null,
            skipToQueue: false,
            bestKeyCategory: null,
            retry: () => startReview(options)
        });
    }

    function startSession(opts) {
        cacheEls();

        session.opts = opts;
        session.list = opts.questions;
        session.idx = 0;
        session.phase = 'main';
        session.deferred = [];
        session.score = 0;
        session.correct = 0;
        session.missed = [];
        session.results = [];
        session.startedAt = Date.now();
        session.guidedWrongAttempts = 0;
        session.guidedClean = 0;
        session.guidedChars = 0;

        ui.summary.classList.add('hidden');
        ui.card.classList.remove('hidden');
        ui.screen.classList.remove('hidden');

        bindEvents();
        renderQuestion();
        openStudyChat({ focus: false });
        if (ui.input && !ui.input.disabled) ui.input.focus();
    }

    function quit() {
        stopTimer();
        closeStudyChat();
        ui.screen.classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
        if (typeof fetchLeaderboard === 'function') fetchLeaderboard();
    }

    // ---------- 이벤트 ----------

    let eventsBound = false;
    function isStudyAudibleKey(event) {
        if (!event || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return false;
        if (event.key === 'Process') return false;
        return event.key === 'Enter' || event.key === 'Backspace' || event.key === ' ' || String(event.key || '').length === 1;
    }

    function playStudyTypingSound(event) {
        if (!isStudyAudibleKey(event)) return;
        if (window.CodeDropTypingSfx?.play) {
            window.CodeDropTypingSfx.play(event, { source: 'scenario', force: true });
            return;
        }
        if (!window.sfx || typeof window.sfx.playKey !== 'function') return;
        window.sfx.playKey(event.key || 'a');
    }

    function bindEvents() {
        if (eventsBound) return;
        eventsBound = true;

        ui.input.addEventListener('keydown', (e) => {
            if (!ui.input.disabled) playStudyTypingSound(e);
            if (e.key !== 'Enter') return;
            e.stopPropagation();
            if (session.answered) {
                nextQuestion();
            } else if (ui.input.value.trim()) {
                checkAnswer();
            }
        });

        ui.hintBtn.addEventListener('click', showHint);
        ui.skipBtn.addEventListener('click', skipQuestion);
        ui.nextBtn.addEventListener('click', nextQuestion);
        if (ui.chatBtn) ui.chatBtn.addEventListener('click', openStudyChat);
        ui.quitBtn.addEventListener('click', quit);
        ui.retryBtn.addEventListener('click', () => session.opts.retry());
        ui.homeBtn.addEventListener('click', quit);
    }

    // ---------- 타이머 (시험 전용) ----------

    function startTimer() {
        stopTimer();
        if (!session.opts.timePerQuestion) return;

        session.timeLeft = session.opts.timePerQuestion;
        renderTimer();
        ui.timer.classList.remove('hidden');

        const deadline = Date.now() + session.timeLeft * 1000;
        session.timerId = setInterval(() => {
            session.timeLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            renderTimer();
            if (session.timeLeft <= 0) handleTimeout();
        }, 250);
    }

    function stopTimer() {
        if (session.timerId) {
            clearInterval(session.timerId);
            session.timerId = null;
        }
        if (ui.timer) {
            ui.timer.classList.add('hidden');
            ui.timer.classList.remove('danger');
            ui.timer.textContent = '';
        }
    }

    function renderTimer() {
        ui.timer.textContent = `⏱ ${session.timeLeft}`;
        ui.timer.classList.toggle('danger', session.timeLeft < 15);
    }

    function handleTimeout() {
        stopTimer();
        const q = currentQuestion();
        session.answered = true;
        session.missed.push(q);
        session.results.push({ q, correct: false });
        StudyStats.record(q.id, 'wrong');

        if (typeof sfx !== 'undefined') sfx.playFail();
        ui.input.disabled = true;
        ui.input.classList.add('wrong');
        showFeedback('skipped', '시간 초과 (오답 처리)', q);
        showNextControls();
    }

    // ---------- 문제 흐름 ----------

    function currentQuestion() {
        return session.list[session.idx];
    }

    function isGuidedSession() {
        return session.opts && session.opts.mode === 'guided';
    }

    function hasStudyChat() {
        return !!session.opts;
    }

    function chatModeLabel() {
        if (session.opts?.mode === 'exam') return '시험 연습';
        if (isGuidedSession()) return '따라치기';
        if (session.opts?.mode === 'review') return '오답 복습';
        if ((session.opts?.label || '').includes('진단')) return '진단훈련';
        return '문제풀이';
    }

    function chatContextForCurrentQuestion() {
        const q = currentQuestion();
        const modeLabel = chatModeLabel();
        const label = session.opts?.label || 'Scenario';
        const edition = runtime.edition === 'github' ? 'github' : 'ocp';
        return {
            key: `scenario_${label}_${modeLabel}`,
            edition,
            label: `${label} · ${ui.progress?.textContent || '-'} · ${modeLabel}`,
            lessonTitle: `${label} ${modeLabel}`,
            trackTitle: edition === 'github' ? 'GitHub Scenario' : 'OCP Scenario',
            phase: isGuidedSession() ? 'follow' : (session.opts?.mode || 'practice'),
            progress: ui.progress ? ui.progress.textContent : '',
            prompt: q ? q.scenario : '',
            command: q ? q.canonical : '',
            explanation: q ? q.explain : '',
            hint: q ? q.hint || '' : '',
            ownerScreen: ui.screen
        };
    }

    function openStudyChat(options = {}) {
        if (!hasStudyChat() || typeof LearnMode === 'undefined' || typeof LearnMode.openContextChat !== 'function') return;
        LearnMode.openContextChat(chatContextForCurrentQuestion(), options);
    }

    function refreshStudyChatContext() {
        if (!hasStudyChat() || typeof LearnMode === 'undefined' || typeof LearnMode.setExternalChatContext !== 'function') return;
        LearnMode.setExternalChatContext(chatContextForCurrentQuestion());
    }

    function closeStudyChat() {
        if (typeof LearnMode !== 'undefined' && typeof LearnMode.closeChatPanel === 'function') {
            LearnMode.closeChatPanel();
        }
    }

    function totalInRound() {
        return session.list.length;
    }

    function renderQuestion() {
        const q = currentQuestion();
        session.wrongAttempts = 0;
        session.hintUsed = false;
        session.answered = false;

        const isExam = session.opts.mode === 'exam';
        const isGuided = isGuidedSession();
        const badge = session.phase === 'deferred'
            ? `복습 라운드 (${session.list.length}문제)`
            : session.opts.label;
        ui.category.textContent = badge;
        ui.progress.textContent = `${session.idx + 1} / ${totalInRound()}`;
        renderScore();
        ui.text.textContent = q.scenario;

        ui.input.value = '';
        ui.input.disabled = false;
        ui.input.classList.remove('correct', 'wrong');
        ui.input.placeholder = isGuided ? '정답 명령을 보고 그대로 입력 후 Enter' : '';
        ui.input.focus();

        ui.feedback.className = 'scenario-feedback hidden';
        ui.feedback.innerHTML = '';

        ui.hintBtn.disabled = false;
        ui.hintBtn.classList.toggle('hidden', !session.opts.hintsAllowed || isGuided);
        ui.skipBtn.classList.toggle('hidden', isGuided);
        ui.skipBtn.textContent = (isExam && session.phase === 'main') ? '나중에 풀기' : '건너뛰기';
        ui.nextBtn.classList.add('hidden');
        if (ui.chatBtn) ui.chatBtn.classList.toggle('hidden', !hasStudyChat());

        startTimer();
        if (isGuided) showGuide(q);
        refreshStudyChatContext();
    }

    function renderScore() {
        if (session.opts.mode === 'exam') {
            ui.score.textContent = `정답 ${session.correct}`;
        } else if (session.opts.mode === 'guided') {
            ui.score.textContent = `FOLLOW ${session.correct}`;
        } else {
            ui.score.textContent = `SCORE ${session.score}`;
        }
    }

    function questionPoints() {
        const base = Math.max(25, 100 - 25 * session.wrongAttempts);
        return Math.max(0, base - (session.hintUsed ? 30 : 0));
    }

    function checkAnswer() {
        const q = currentQuestion();

        if (StudyCore.isCorrect(ui.input.value, q)) {
            stopTimer();
            session.answered = true;
            session.correct++;

            const dirty = session.wrongAttempts > 0 || session.hintUsed;
            if (session.opts.mode !== 'guided') {
                StudyStats.record(q.id, dirty ? 'dirty' : 'correct-clean');
                if (dirty) session.missed.push(q);
            }

            let title;
            if (session.opts.mode === 'exam') {
                session.results.push({ q, correct: true });
                title = '정답!';
            } else if (session.opts.mode === 'guided') {
                session.guidedChars += q.canonical.length;
                if (session.wrongAttempts === 0) session.guidedClean++;
                title = '따라치기 완료';
            } else {
                const pts = questionPoints();
                session.score += pts;
                title = `정답! +${pts}점`;
            }

            if (typeof sfx !== 'undefined') sfx.playSuccess();
            ui.input.disabled = true;
            ui.input.classList.remove('wrong');
            ui.input.classList.add('correct');
            renderScore();

            showFeedback('correct', title, q);
            showNextControls();
        } else {
            session.wrongAttempts++;
            if (session.opts.mode === 'guided') session.guidedWrongAttempts++;
            if (typeof sfx !== 'undefined') sfx.playFail();

            ui.input.classList.remove('wrong');
            void ui.input.offsetWidth; // reflow로 shake 재시작
            ui.input.classList.add('wrong');

            if (session.opts.mode === 'guided') {
                showFeedback('wrong-msg', `입력이 다릅니다 · 오답 ${session.wrongAttempts}회`, q);
            } else {
                ui.feedback.className = 'scenario-feedback wrong-msg';
                ui.feedback.innerHTML = '';
                const msg = document.createElement('div');
                msg.textContent = session.opts.mode === 'exam'
                    ? `오답입니다. 시간 내에 다시 시도하세요. (오답 ${session.wrongAttempts}회)`
                    : `오답입니다. 다시 시도하세요. (오답 ${session.wrongAttempts}회 — 현재 문제 배점 ${questionPoints()}점)`;
                ui.feedback.appendChild(msg);
            }
        }
    }

    function showGuide(q) {
        ui.feedback.className = 'scenario-feedback hint-msg';
        ui.feedback.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'fb-title';
        title.textContent = '따라치기';
        const cmd = document.createElement('div');
        cmd.className = 'fb-canonical';
        cmd.textContent = q.canonical;
        const why = document.createElement('div');
        why.className = 'fb-explain';
        why.textContent = q.hint || q.explain;
        ui.feedback.append(title, cmd, why);
    }

    function showHint() {
        if (session.answered || session.hintUsed || !session.opts.hintsAllowed) return;
        const q = currentQuestion();
        session.hintUsed = true;
        ui.hintBtn.disabled = true;

        ui.feedback.className = 'scenario-feedback hint-msg';
        ui.feedback.innerHTML = '';
        const hint = document.createElement('div');
        hint.textContent = `힌트: ${q.hint}`;
        ui.feedback.appendChild(hint);
        ui.input.focus();
    }

    function skipQuestion() {
        if (session.answered) return;
        if (session.opts.mode === 'guided') return;
        const q = currentQuestion();
        stopTimer();

        if (session.opts.skipToQueue && session.phase === 'main') {
            // 시험 본 라운드: 정답 비공개로 뒤로 미룸
            session.deferred.push(q);
            session.answered = true;
            advance();
            return;
        }

        // 연습/복습 또는 시험 복습 라운드: 확정 처리
        session.answered = true;
        session.missed.push(q);
        StudyStats.record(q.id, session.opts.mode === 'exam' ? 'wrong' : 'skip');
        if (session.opts.mode === 'exam') {
            session.results.push({ q, correct: false });
        }

        ui.input.disabled = true;
        showFeedback('skipped', session.opts.mode === 'exam' ? '포기 (오답 처리)' : '건너뜀 (0점)', q);
        showNextControls();
    }

    function showFeedback(kind, title, q) {
        ui.feedback.className = 'scenario-feedback ' + kind;
        ui.feedback.innerHTML = '';

        const titleEl = document.createElement('div');
        titleEl.className = 'fb-title';
        titleEl.textContent = title;

        const cmdEl = document.createElement('div');
        cmdEl.className = 'fb-canonical';
        cmdEl.textContent = q.canonical;

        const explainEl = document.createElement('div');
        explainEl.className = 'fb-explain';
        explainEl.textContent = q.explain;

        ui.feedback.append(titleEl, cmdEl, explainEl);
    }

    function showNextControls() {
        ui.hintBtn.classList.add('hidden');
        ui.skipBtn.classList.add('hidden');
        ui.nextBtn.classList.remove('hidden');
        const last = session.idx + 1 >= totalInRound() &&
            !(session.phase === 'main' && session.deferred.length > 0);
        ui.nextBtn.textContent = last ? '결과 보기' : '다음 →';
        ui.nextBtn.focus();
    }

    function nextQuestion() {
        if (!session.answered) return;
        advance();
    }

    function advance() {
        stopTimer();
        session.idx++;
        if (session.idx < totalInRound()) {
            renderQuestion();
            return;
        }
        // 라운드 종료
        if (session.phase === 'main' && session.deferred.length > 0) {
            // 시험: 미뤄둔 문제 복습 라운드
            session.list = session.deferred;
            session.deferred = [];
            session.idx = 0;
            session.phase = 'deferred';
            renderQuestion();
            return;
        }
        endSession();
    }

    // ---------- 결과 ----------

    function loadBest() {
        try {
            return JSON.parse(localStorage.getItem(getBestKey())) || {};
        } catch (e) {
            return {};
        }
    }

    function saveBest(best) {
        localStorage.setItem(getBestKey(), JSON.stringify(best));
    }

    function endSession() {
        stopTimer();
        closeStudyChat();
        ui.card.classList.add('hidden');
        ui.summary.classList.remove('hidden');

        if (session.opts.mode === 'exam') {
            renderExamSummary();
        } else if (session.opts.mode === 'guided') {
            renderGuidedSummary();
        } else {
            renderPracticeSummary();
        }
    }

    function addStat(label, value, colorVar) {
        const item = document.createElement('div');
        item.className = 'stat-item';
        const l = document.createElement('div');
        l.className = 'stat-label';
        l.textContent = label;
        const v = document.createElement('div');
        v.className = 'stat-value';
        v.style.fontSize = '1.4rem';
        if (colorVar) v.style.color = `var(${colorVar})`;
        v.textContent = value;
        item.append(l, v);
        ui.summaryStats.appendChild(item);
    }

    function renderMissedReview(emptyText) {
        ui.summaryReview.innerHTML = '';
        if (session.missed.length > 0) {
            const title = document.createElement('div');
            title.className = 'review-title';
            title.textContent = '복습이 필요한 문제';
            ui.summaryReview.appendChild(title);

            session.missed.forEach(q => {
                const item = document.createElement('div');
                item.className = 'review-item';
                const sc = document.createElement('div');
                sc.className = 'review-scenario';
                sc.textContent = q.scenario;
                const ans = document.createElement('div');
                ans.className = 'review-answer';
                ans.textContent = q.canonical;
                item.append(sc, ans);
                ui.summaryReview.appendChild(item);
            });
        } else {
            const perfect = document.createElement('div');
            perfect.className = 'review-title';
            perfect.style.color = 'var(--success-color)';
            perfect.textContent = emptyText;
            ui.summaryReview.appendChild(perfect);
        }
    }

    function renderPracticeSummary() {
        ui.summaryTitle.textContent = 'SESSION REPORT';
        ui.summaryTitle.style.color = '';

        let bestLine = null;
        if (session.opts.bestKeyCategory) {
            const best = loadBest();
            const prev = best[session.opts.bestKeyCategory] || 0;
            const isNewBest = session.score > prev;
            if (isNewBest) {
                best[session.opts.bestKeyCategory] = session.score;
                saveBest(best);
            }
            bestLine = { prev, isNewBest };
        }

        ui.summaryStats.innerHTML = '';
        addStat('총점', String(session.score) + (bestLine && bestLine.isNewBest ? ' ★신기록' : ''));
        addStat('정답', `${session.correct} / ${session.list.length}`);
        if (bestLine) {
            addStat('개인 최고', String(Math.max(bestLine.prev, session.score)));
        } else {
            addStat('모드', session.opts.label);
        }

        renderMissedReview('건너뛴 문제 없음 — 완주!');
    }

    function renderGuidedSummary() {
        ui.summaryTitle.textContent = 'GUIDED REPORT';
        ui.summaryTitle.style.color = 'var(--success-color)';

        ui.summaryStats.innerHTML = '';
        addStat('훈련 방식', '따라치기');
        addStat('완료', `${session.correct} / ${session.list.length}`);
        addStat('클린 입력', `${session.guidedClean} / ${session.correct}`);
        addStat('WPM', String(guidedWpm()));
        addStat('점수 반영', '없음');

        ui.summaryReview.innerHTML = '';
        const note = document.createElement('div');
        note.className = 'review-title';
        note.textContent = '따라치기 기록은 시험 점수와 공식 랭킹에 반영되지 않습니다.';
        ui.summaryReview.appendChild(note);
    }

    function guidedWpm() {
        const elapsedMinutes = Math.max(0.05, (Date.now() - session.startedAt) / 60000);
        return Math.round((session.guidedChars / 5) / elapsedMinutes);
    }

    function renderExamSummary() {
        const total = session.results.length;
        const correct = session.results.filter(r => r.correct).length;
        const rate = total > 0 ? correct / total : 0;
        const passed = rate >= EXAM_PASS_RATE;

        ui.summaryTitle.textContent = passed ? 'PASS' : 'FAIL';
        ui.summaryTitle.style.color = passed ? 'var(--success-color)' : 'var(--danger-color)';

        ui.summaryStats.innerHTML = '';
        addStat('결과', `${correct} / ${total} (${Math.round(rate * 100)}%)`, passed ? '--success-color' : '--danger-color');
        addStat('합격선', `${Math.ceil(total * EXAM_PASS_RATE)}문제 (70%)`);
        addStat('판정', passed ? '합격권' : '재도전', passed ? '--success-color' : '--danger-color');

        // 카테고리별 breakdown
        const perCat = {};
        session.results.forEach(r => {
            const cat = StudyStats.categoryOf(r.q.id) || 'ETC';
            if (!perCat[cat]) perCat[cat] = [0, 0];
            perCat[cat][1]++;
            if (r.correct) perCat[cat][0]++;
        });

        ui.summaryReview.innerHTML = '';
        const bTitle = document.createElement('div');
        bTitle.className = 'review-title';
        bTitle.textContent = '영역별 결과';
        ui.summaryReview.appendChild(bTitle);

        Object.entries(perCat).forEach(([cat, [c, t]]) => {
            const row = document.createElement('div');
            row.className = 'exam-cat-row';
            const label = document.createElement('span');
            label.className = 'exam-cat-label';
            const packs = getPacks();
            label.textContent = (packs[cat] && packs[cat].label) || cat;
            const bar = document.createElement('span');
            bar.className = 'exam-cat-bar';
            const fill = document.createElement('span');
            fill.className = 'exam-cat-fill';
            fill.style.width = `${t > 0 ? (c / t) * 100 : 0}%`;
            fill.classList.add(c === t ? 'good' : (c > 0 ? 'mid' : 'bad'));
            bar.appendChild(fill);
            const count = document.createElement('span');
            count.className = 'exam-cat-count';
            count.textContent = `${c}/${t}`;
            row.append(label, bar, count);
            ui.summaryReview.appendChild(row);
        });

        // 오답 리뷰
        if (session.missed.length > 0) {
            const mTitle = document.createElement('div');
            mTitle.className = 'review-title';
            mTitle.style.marginTop = '15px';
            mTitle.textContent = '놓친 문제';
            ui.summaryReview.appendChild(mTitle);
            session.missed.forEach(q => {
                const item = document.createElement('div');
                item.className = 'review-item';
                const sc = document.createElement('div');
                sc.className = 'review-scenario';
                sc.textContent = q.scenario;
                const ans = document.createElement('div');
                ans.className = 'review-answer';
                ans.textContent = q.canonical;
                item.append(sc, ans);
                ui.summaryReview.appendChild(item);
            });
        }

        // 놓친 영역 → 학습 모드 레슨 복습 추천 칩
        if (typeof LearnMode !== 'undefined') {
            const weakCats = Object.entries(perCat).filter(([, [c, t]]) => c < t).map(([cat]) => cat);
            const chips = [];
            weakCats.forEach(cat => {
                LearnMode.lessonsForCategory(cat).forEach(lesson => {
                    // 아직 잠긴 레슨은 추천하지 않음 (순차 언락 유지)
                    if (LearnMode.isUnlocked(lesson.id) && !chips.some(ch => ch.id === lesson.id)) {
                        chips.push(lesson);
                    }
                });
            });
            if (chips.length > 0) {
                const cTitle = document.createElement('div');
                cTitle.className = 'review-title';
                cTitle.style.marginTop = '15px';
                cTitle.textContent = '이 레슨으로 복습하세요';
                ui.summaryReview.appendChild(cTitle);

                const chipWrap = document.createElement('div');
                chipWrap.style.display = 'flex';
                chipWrap.style.flexWrap = 'wrap';
                chipWrap.style.gap = '8px';
                chips.forEach(lesson => {
                    const chip = document.createElement('button');
                    chip.className = 'btn-small';
                    chip.type = 'button';
                    chip.textContent = `학습: ${lesson.title}`;
                    chip.addEventListener('click', () => {
                        stopTimer();
                        ui.screen.classList.add('hidden');
                        LearnMode.startLesson(lesson.id);
                    });
                    chipWrap.appendChild(chip);
                });
                ui.summaryReview.appendChild(chipWrap);
            }
        }

        StudyStats.recordExam({
            edition: runtime.edition || 'ocp',
            score: correct,
            total,
            correct,
            passed,
            perCat
        });
    }

    return { start, startGuided, startIncidentDrill, startExam, startReview, quit, configure };
})();
