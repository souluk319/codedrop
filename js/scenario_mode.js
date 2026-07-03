/**
 * CodeDrop - 장문모드 엔진 (연습 / 시험 / 오답복습)
 * 낙하 게임 루프와 완전히 분리된 별도 모드.
 *
 * 사용:
 *   ScenarioMode.start('AUTH')   — 연습 (카테고리 10문제, 힌트 허용)
 *   ScenarioMode.startExam()     — 시험 (전 영역 15문제, 90초, 힌트 없음, 스킵큐)
 *   ScenarioMode.startReview()   — 오답노트 (약점 문제 재출제)
 */

const ScenarioMode = (() => {

    const QUESTIONS_PER_SESSION = 10;
    const BEST_KEY = 'codedrop_scenario_best';

    // 시험 출제 청사진 (우선순위 가중, LINUX_BASIC 제외) — 합계 15
    const EXAM_BLUEPRINT = {
        AUTH: 2, RBAC: 2, SCC_SA: 2, RESOURCES: 2, WORKLOADS: 2,
        DEPLOY: 1, TROUBLESHOOT: 1, MANIFESTS: 1, OPERATORS: 1, JOBS: 1
    };
    const EXAM_TIME_PER_Q = 90;   // 초
    const EXAM_PASS_RATE = 0.7;

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
        timeLeft: 0
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

    function start(category) {
        const pack = SCENARIO_PACKS[category];
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

    function startExam() {
        const questions = [];
        Object.entries(EXAM_BLUEPRINT).forEach(([cat, count]) => {
            const pack = SCENARIO_PACKS[cat];
            if (!pack) return;
            questions.push(...StudyCore.shuffle(pack.questions).slice(0, count));
        });
        startSession({
            mode: 'exam',
            label: '실전 시험',
            questions: StudyCore.shuffle(questions),
            hintsAllowed: false,
            timePerQuestion: EXAM_TIME_PER_Q,
            skipToQueue: true,
            bestKeyCategory: null,
            retry: () => startExam()
        });
    }

    function startReview() {
        const pool = StudyStats.reviewPool().slice(0, QUESTIONS_PER_SESSION);
        if (pool.length === 0) return;
        startSession({
            mode: 'review',
            label: '오답노트',
            questions: pool,
            hintsAllowed: true,
            timePerQuestion: null,
            skipToQueue: false,
            bestKeyCategory: null,
            retry: () => startReview()
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

        ui.summary.classList.add('hidden');
        ui.card.classList.remove('hidden');
        ui.screen.classList.remove('hidden');

        bindEvents();
        renderQuestion();
    }

    function quit() {
        stopTimer();
        ui.screen.classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
        if (typeof fetchLeaderboard === 'function') fetchLeaderboard();
    }

    // ---------- 이벤트 ----------

    let eventsBound = false;
    function bindEvents() {
        if (eventsBound) return;
        eventsBound = true;

        ui.input.addEventListener('keydown', (e) => {
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
        if (ui.timer) ui.timer.classList.add('hidden');
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

    function totalInRound() {
        return session.list.length;
    }

    function renderQuestion() {
        const q = currentQuestion();
        session.wrongAttempts = 0;
        session.hintUsed = false;
        session.answered = false;

        const isExam = session.opts.mode === 'exam';
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
        ui.input.focus();

        ui.feedback.className = 'scenario-feedback hidden';
        ui.feedback.innerHTML = '';

        ui.hintBtn.disabled = false;
        ui.hintBtn.classList.toggle('hidden', !session.opts.hintsAllowed);
        ui.skipBtn.classList.remove('hidden');
        ui.skipBtn.textContent = (isExam && session.phase === 'main') ? '나중에 풀기' : '건너뛰기';
        ui.nextBtn.classList.add('hidden');

        startTimer();
    }

    function renderScore() {
        if (session.opts.mode === 'exam') {
            ui.score.textContent = `정답 ${session.correct}`;
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
            StudyStats.record(q.id, dirty ? 'dirty' : 'correct-clean');
            if (dirty) session.missed.push(q);

            let title;
            if (session.opts.mode === 'exam') {
                session.results.push({ q, correct: true });
                title = '정답!';
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
            if (typeof sfx !== 'undefined') sfx.playFail();

            ui.input.classList.remove('wrong');
            void ui.input.offsetWidth; // reflow로 shake 재시작
            ui.input.classList.add('wrong');

            ui.feedback.className = 'scenario-feedback wrong-msg';
            ui.feedback.innerHTML = '';
            const msg = document.createElement('div');
            msg.textContent = session.opts.mode === 'exam'
                ? `오답입니다. 시간 내에 다시 시도하세요. (오답 ${session.wrongAttempts}회)`
                : `오답입니다. 다시 시도하세요. (오답 ${session.wrongAttempts}회 — 현재 문제 배점 ${questionPoints()}점)`;
            ui.feedback.appendChild(msg);
        }
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
            return JSON.parse(localStorage.getItem(BEST_KEY)) || {};
        } catch (e) {
            return {};
        }
    }

    function saveBest(best) {
        localStorage.setItem(BEST_KEY, JSON.stringify(best));
    }

    function endSession() {
        stopTimer();
        ui.card.classList.add('hidden');
        ui.summary.classList.remove('hidden');

        if (session.opts.mode === 'exam') {
            renderExamSummary();
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
            label.textContent = (SCENARIO_PACKS[cat] && SCENARIO_PACKS[cat].label) || cat;
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

        StudyStats.recordExam({
            score: correct,
            total,
            correct,
            passed,
            perCat
        });
    }

    return { start, startExam, startReview, quit };
})();
