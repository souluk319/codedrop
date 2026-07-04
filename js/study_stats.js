/**
 * CodeDrop - 학습 공용 헬퍼 + 통계 저장소
 * StudyCore: 명령어 매칭/셔플 (scenario_mode.js, lab_mode.js 공용)
 * StudyStats: 문제별 학습 기록 + 시험 이력 (localStorage)
 */

const StudyCore = {
    // 공백 정규화: 앞뒤 제거 + 연속 공백 축약
    normalizeCmd(str) {
        return str.trim().replace(/\s+/g, ' ');
    },

    // question/step: { answers: [regexSrc, ...] }
    isCorrect(input, question) {
        const normalized = this.normalizeCmd(input);
        return question.answers.some(src => {
            try {
                return new RegExp('^' + src + '$').test(normalized);
            } catch (e) {
                console.error('Invalid answer pattern:', src, e);
                return false;
            }
        });
    },

    shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
};

const StudyStats = (() => {
    const KEY = 'codedrop_study_stats';
    const VERSION = 1;
    const EXAM_HISTORY_CAP = 10;

    // qid → 카테고리 역맵 (SCENARIO_PACKS 기준, 1회 생성)
    let qidToCategory = null;
    let qidToQuestion = null;

    function buildMaps() {
        if (qidToCategory) return;
        qidToCategory = {};
        qidToQuestion = {};
        if (typeof SCENARIO_PACKS !== 'undefined') {
            Object.entries(SCENARIO_PACKS).forEach(([cat, pack]) => {
                pack.questions.forEach(q => {
                    qidToCategory[q.id] = cat;
                    qidToQuestion[q.id] = q;
                });
            });
        }
        if (typeof MOCK_LABS !== 'undefined') {
            MOCK_LABS.forEach(lab => {
                lab.steps.forEach(step => {
                    qidToCategory[step.id] = 'LAB';
                    qidToQuestion[step.id] = {
                        ...step,
                        scenario: `[${lab.title}] ${step.scenario}`
                    };
                });
            });
        }
    }

    function emptyData() {
        return { v: VERSION, q: {}, exams: [] };
    }

    function normalizeData(data) {
        if (!data || data.v !== VERSION || !data.q || typeof data.q !== 'object') {
            return emptyData();
        }

        if (!Array.isArray(data.exams)) data.exams = [];
        Object.entries(data.q).forEach(([id, entry]) => {
            const a = Math.max(0, Number(entry.a) || 0);
            const c = Math.max(0, Number(entry.c) || 0);
            const clean = entry.clean === undefined ? c : Math.max(0, Number(entry.clean) || 0);
            data.q[id] = {
                a,
                c: Math.min(c, a),
                clean: Math.min(clean, a),
                last: entry.last || null,
                at: Number(entry.at) || 0
            };
        });
        return data;
    }

    function load() {
        try {
            const data = JSON.parse(localStorage.getItem(KEY));
            return normalizeData(data);
        } catch (e) { /* 손상 → 리셋 */ }
        return emptyData();
    }

    function save(data) {
        localStorage.setItem(KEY, JSON.stringify(data));
    }

    // outcome: 'clean'/'correct-clean'(무힌트 정답) | 'dirty'(오답/힌트 후 정답) | 'wrong' | 'skip'
    function record(id, outcome) {
        const data = load();
        const entry = data.q[id] || { a: 0, c: 0, clean: 0, last: null, at: 0 };
        const isCorrect = outcome === 'clean' || outcome === 'correct-clean' || outcome === 'dirty';
        const isClean = outcome === 'clean' || outcome === 'correct-clean';
        entry.a++;
        if (isCorrect) entry.c++;
        if (isClean) entry.clean++;
        entry.last = (outcome === 'clean' || outcome === 'correct-clean') ? 'correct' : outcome;
        entry.at = Date.now();
        data.q[id] = entry;
        save(data);
    }

    function recordExam(result) {
        // result: {score, total, correct, passed, perCat: {CAT: [correct, total]}}
        const data = load();
        if (!Array.isArray(data.exams)) data.exams = [];
        data.exams.unshift({ at: Date.now(), ...result });
        data.exams = data.exams.slice(0, EXAM_HISTORY_CAP);
        save(data);
    }

    function summarizeItems(items, label) {
        const data = load();
        let attempted = 0, attempts = 0, corrects = 0, cleans = 0;
        items.forEach(item => {
            const e = data.q[item.id];
            if (e) {
                attempted++;
                attempts += e.a;
                corrects += e.c;
                cleans += e.clean === undefined ? e.c : e.clean;
            }
        });
        return {
            label,
            attempted,
            total: items.length,
            attempts,
            correct: corrects,
            clean: cleans,
            rate: attempts > 0 ? cleans / attempts : null,
            correctRate: attempts > 0 ? corrects / attempts : null,
            cleanRate: attempts > 0 ? cleans / attempts : null
        };
    }

    // 카테고리별 요약: {CAT: {label, attempted, total, cleanRate}}
    function categorySummary() {
        buildMaps();
        const summary = {};

        if (typeof SCENARIO_PACKS !== 'undefined') {
            Object.entries(SCENARIO_PACKS).forEach(([cat, pack]) => {
                summary[cat] = summarizeItems(pack.questions, pack.label);
            });
        }
        if (typeof MOCK_LABS !== 'undefined') {
            const steps = MOCK_LABS.flatMap(lab => lab.steps);
            summary.LAB = summarizeItems(steps, '모의랩');
        }
        return summary;
    }

    // 오답노트 풀: 마지막이 wrong/skip/dirty 이거나 정답률 60% 미만(2회 이상 시도)
    function reviewPool() {
        buildMaps();
        const data = load();
        const pool = [];
        Object.entries(data.q).forEach(([id, e]) => {
            const q = qidToQuestion[id];
            if (!q) return;
            const weak = e.last === 'wrong' || e.last === 'skip' || e.last === 'dirty' ||
                (e.a >= 2 && e.c / e.a < 0.6);
            if (weak) pool.push(q);
        });
        return StudyCore.shuffle(pool);
    }

    function categoryOf(id) {
        buildMaps();
        return qidToCategory[id] || null;
    }

    function get() {
        return load();
    }

    function reset() {
        localStorage.removeItem(KEY);
    }

    return { record, recordExam, categorySummary, reviewPool, categoryOf, get, reset };
})();
