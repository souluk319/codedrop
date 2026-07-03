/**
 * CodeDrop - EX280 학습 대시보드
 */

const Dashboard = (() => {
    const $ = (id) => document.getElementById(id);
    const ui = {};

    function cacheEls() {
        ui.screen = $('dashboard-screen');
        ui.summary = $('dashboard-summary');
        ui.cats = $('dashboard-cats');
        ui.weak = $('dashboard-weak');
        ui.exams = $('dashboard-exams');
        ui.reviewBtn = $('dashboard-review-btn');
        ui.closeBtn = $('dashboard-close');
    }

    let bound = false;
    function bindEvents() {
        if (bound) return;
        bound = true;
        ui.closeBtn.addEventListener('click', close);
        ui.reviewBtn.addEventListener('click', () => {
            if (ui.reviewBtn.disabled) return;
            close();
            document.getElementById('start-screen').classList.add('hidden');
            ScenarioMode.startReview();
        });
    }

    function open() {
        cacheEls();
        bindEvents();
        render();
        ui.screen.classList.remove('hidden');
    }

    function close() {
        ui.screen.classList.add('hidden');
    }

    function render() {
        const summary = StudyStats.categorySummary();
        const data = StudyStats.get();
        const categories = Object.entries(summary);
        const attemptedQuestions = categories.reduce((sum, [, cat]) => sum + cat.attempted, 0);
        const totalQuestions = categories.reduce((sum, [, cat]) => sum + cat.total, 0);
        const totalAttempts = categories.reduce((sum, [, cat]) => sum + cat.attempts, 0);
        const reviewCount = StudyStats.reviewPool().length;

        ui.summary.innerHTML = '';
        addMetric(ui.summary, '커버리지', `${attemptedQuestions} / ${totalQuestions}`);
        addMetric(ui.summary, '총 시도', String(totalAttempts));
        addMetric(ui.summary, '오답노트', `${reviewCount}문제`);

        ui.cats.innerHTML = '';
        categories.forEach(([key, cat]) => addCategoryRow(key, cat));

        renderWeak(summary);
        renderExams(data.exams || []);

        ui.reviewBtn.textContent = `오답노트 풀기 (${reviewCount}문제)`;
        ui.reviewBtn.disabled = reviewCount === 0;
    }

    function addMetric(parent, label, value) {
        const item = document.createElement('div');
        item.className = 'dashboard-metric';
        const l = document.createElement('div');
        l.className = 'stat-label';
        l.textContent = label;
        const v = document.createElement('div');
        v.className = 'stat-value';
        v.textContent = value;
        item.append(l, v);
        parent.appendChild(item);
    }

    function addCategoryRow(key, cat) {
        const row = document.createElement('div');
        row.className = 'dashboard-cat-row';
        const rate = cat.rate;
        const percent = rate === null ? 0 : Math.round(rate * 100);

        row.classList.toggle('dim', rate === null);

        const label = document.createElement('div');
        label.className = 'dashboard-cat-label';
        label.textContent = cat.label;

        const bar = document.createElement('div');
        bar.className = 'dashboard-cat-bar';
        const fill = document.createElement('span');
        fill.style.width = `${percent}%`;
        if (rate === null) fill.className = 'dim';
        else if (percent >= 80) fill.className = 'good';
        else if (percent >= 50) fill.className = 'mid';
        else fill.className = 'bad';
        bar.appendChild(fill);

        const meta = document.createElement('div');
        meta.className = 'dashboard-cat-meta';
        meta.textContent = rate === null
            ? `0/${cat.total}`
            : `${percent}% · ${cat.attempted}/${cat.total}`;

        row.append(label, bar, meta);
        ui.cats.appendChild(row);
    }

    function renderWeak(summary) {
        const candidates = Object.values(summary)
            .filter(cat => cat.attempts >= 5 && cat.rate !== null)
            .sort((a, b) => a.rate - b.rate);

        ui.weak.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'review-title';
        title.textContent = '약점 콜아웃';
        ui.weak.appendChild(title);

        const body = document.createElement('div');
        body.className = 'dashboard-note';
        if (candidates.length === 0) {
            body.textContent = '아직 충분한 시도 데이터가 없습니다. 연습/시험을 몇 세션 더 돌리면 약점 영역이 표시됩니다.';
        } else {
            const weak = candidates[0];
            body.textContent = `${weak.label}: ${Math.round(weak.rate * 100)}% 정확도. 이 영역을 먼저 복습하세요.`;
        }
        ui.weak.appendChild(body);
    }

    function renderExams(exams) {
        ui.exams.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'review-title';
        title.textContent = '최근 시험';
        ui.exams.appendChild(title);

        if (exams.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'dashboard-note';
            empty.textContent = '아직 시험 기록이 없습니다.';
            ui.exams.appendChild(empty);
            return;
        }

        exams.slice(0, 5).forEach(exam => {
            const row = document.createElement('div');
            row.className = 'dashboard-exam-row';

            const when = document.createElement('span');
            when.textContent = formatDate(exam.at);

            const score = document.createElement('span');
            score.textContent = `${exam.correct}/${exam.total}`;

            const chip = document.createElement('span');
            chip.className = 'dashboard-chip ' + (exam.passed ? 'pass' : 'fail');
            chip.textContent = exam.passed ? 'PASS' : 'FAIL';

            row.append(when, score, chip);
            ui.exams.appendChild(row);
        });
    }

    function formatDate(ts) {
        try {
            return new Date(ts).toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '-';
        }
    }

    return { open, close };
})();
