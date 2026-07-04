import fs from 'fs';
import vm from 'vm';

const context = {
    console,
    localStorage: { getItem() { return null; }, setItem() { } },
    document: { getElementById() { return null; } }
};

vm.createContext(context);

[
    'js/word_packs.js',
    'js/scenario_packs.js',
    'js/lab_packs.js',
    'js/lesson_packs.js',
    'js/study_stats.js',
    'js/learn_mode.js'
].forEach(file => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
});

vm.runInContext(
    'globalThis.__codedrop = { WORD_PACKS, WORD_DESCS, SCENARIO_PACKS, MOCK_LABS, LESSON_TRACKS, StudyCore, StudyStats, LearnMode };',
    context
);

const { WORD_PACKS, WORD_DESCS, SCENARIO_PACKS, MOCK_LABS, LESSON_TRACKS, StudyCore, StudyStats, LearnMode } = context.__codedrop;
const ids = new Set();
const itemsById = new Map();

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function validateItem(item, type) {
    assert(!ids.has(item.id), `duplicate id: ${item.id}`);
    ids.add(item.id);
    itemsById.set(item.id, item);

    ['scenario', 'canonical', 'hint', 'explain'].forEach(field => {
        assert(Boolean(item[field]), `${item.id} missing ${field}`);
    });
    assert(Array.isArray(item.answers) && item.answers.length > 0, `${item.id} has no answers`);
    item.answers.forEach(src => new RegExp('^' + src + '$'));
    assert(StudyCore.isCorrect(item.canonical, item), `${type} canonical mismatch: ${item.id}`);
}

let scenarioCount = 0;
Object.entries(SCENARIO_PACKS).forEach(([key, pack]) => {
    assert(pack.label, `scenario pack ${key} missing label`);
    assert(Array.isArray(pack.questions) && pack.questions.length > 0, `scenario pack ${key} empty`);
    pack.questions.forEach(question => {
        scenarioCount++;
        validateItem(question, 'scenario');
    });
});

let labStepCount = 0;
MOCK_LABS.forEach(lab => {
    assert(!ids.has(lab.id), `duplicate lab id: ${lab.id}`);
    ids.add(lab.id);
    assert(lab.title && lab.goal, `lab ${lab.id} missing title/goal`);
    assert(Array.isArray(lab.steps) && lab.steps.length >= 4, `lab ${lab.id} has too few steps`);
    lab.steps.forEach(step => {
        labStepCount++;
        validateItem(step, 'lab');
    });
});

// --- 학습 모드 (LESSON_TRACKS) 검증 ---
let lessonCount = 0;
let lessonStepCount = 0;
const expectedTrackIds = [
    'track-01', 'track-02', 'track-03', 'track-04', 'track-05',
    'track-06', 'track-07', 'track-08', 'track-09', 'track-10'
];
const lessonCategoryCoverage = new Set();

assert(JSON.stringify(LESSON_TRACKS.map(track => track.id)) === JSON.stringify(expectedTrackIds),
    'LESSON_TRACKS must expose the full ordered 10-track curriculum');

LESSON_TRACKS.forEach(track => {
    assert(!ids.has(track.id), `duplicate track id: ${track.id}`);
    ids.add(track.id);
    assert(track.title && track.subtitle, `track ${track.id} missing title/subtitle`);
    assert(Array.isArray(track.lessons) && track.lessons.length > 0, `track ${track.id} has no lessons`);

    track.lessons.forEach(lesson => {
        lessonCount++;
        assert(!ids.has(lesson.id), `duplicate lesson id: ${lesson.id}`);
        ids.add(lesson.id);
        assert(lesson.title && lesson.intro, `lesson ${lesson.id} missing title/intro`);
        assert(Array.isArray(lesson.steps) && lesson.steps.length >= 4 && lesson.steps.length <= 8,
            `lesson ${lesson.id} must have 4-8 steps (has ${lesson.steps ? lesson.steps.length : 0})`);

        lesson.steps.forEach(step => {
            lessonStepCount++;
            assert(!ids.has(step.id), `duplicate lesson step id: ${step.id}`);
            ids.add(step.id);
            ['cmd', 'desc', 'output', 'explain'].forEach(field => {
                assert(Boolean(step[field]), `lesson step ${step.id} missing ${field}`);
            });
            assert(StudyCore.normalizeCmd(step.cmd) === step.cmd,
                `lesson step ${step.id} cmd has extra whitespace`);
            assert([undefined, 'full', 'hint'].includes(step.scaffold),
                `lesson step ${step.id} has invalid scaffold: ${step.scaffold}`);
            assert(step.scaffold !== 'hint' || Boolean(step.hint),
                `lesson step ${step.id} is hint-scaffolded but missing hint`);
        });

        assert(SCENARIO_PACKS[lesson.quizFrom], `lesson ${lesson.id} quizFrom unknown: ${lesson.quizFrom}`);
        if (lesson.categories !== undefined) {
            assert(Array.isArray(lesson.categories) && lesson.categories.length > 0,
                `lesson ${lesson.id} categories must be a non-empty array`);
            lesson.categories.forEach(cat => {
                assert(SCENARIO_PACKS[cat], `lesson ${lesson.id} category unknown: ${cat}`);
                lessonCategoryCoverage.add(cat);
            });
        }
        lessonCategoryCoverage.add(lesson.quizFrom);
        assert(Number.isInteger(lesson.quizCount) && lesson.quizCount >= 1,
            `lesson ${lesson.id} quizCount must be >= 1`);
        if (lesson.quizIds) {
            assert(Array.isArray(lesson.quizIds) && lesson.quizIds.length === lesson.quizCount,
                `lesson ${lesson.id} quizIds length must equal quizCount`);
            const packIds = new Set(SCENARIO_PACKS[lesson.quizFrom].questions.map(q => q.id));
            lesson.quizIds.forEach(qid => {
                assert(packIds.has(qid), `lesson ${lesson.id} quizIds references missing question: ${qid}`);
            });
        } else {
            assert(SCENARIO_PACKS[lesson.quizFrom].questions.length >= lesson.quizCount,
                `lesson ${lesson.id} quizCount exceeds pool of ${lesson.quizFrom}`);
        }
    });
});
assert(lessonCount >= 20, `LESSON_TRACKS needs at least 20 lessons (has ${lessonCount})`);

[
    'AUTH', 'RBAC', 'SCC_SA', 'RESOURCES', 'WORKLOADS',
    'NETWORK_SECURITY', 'DEPLOY', 'TROUBLESHOOT', 'MANIFESTS', 'OPERATORS', 'JOBS'
].forEach(cat => {
    assert(lessonCategoryCoverage.has(cat), `LESSON_TRACKS does not cover category ${cat}`);
});

// 레슨 스텝 cmd ↔ 대응 시나리오 정답 정규식 호환 (학습→테스트 일관성)
[
    ['auth-01', 'htpasswd -c -B -b /tmp/htpasswd admin redhat'],   // learn-04-01-s1
    ['auth-02', 'htpasswd -B -b /tmp/htpasswd developer devpass'], // learn-04-01-s2
    ['auth-03', 'oc create secret generic htpasswd-secret --from-file=htpasswd=/tmp/htpasswd -n openshift-config'], // learn-04-01-s4
    ['auth-05', 'oc edit oauth cluster']                           // learn-04-01-s5
].forEach(([qid, lessonCmd]) => {
    const item = itemsById.get(qid);
    assert(item, `lesson-consistency fixture missing question ${qid}`);
    assert(StudyCore.isCorrect(lessonCmd, item),
        `lesson cmd does not satisfy scenario answer for ${qid}: ${lessonCmd}`);
});

const examBlueprint = {
    AUTH: 2,
    RBAC: 2,
    SCC_SA: 2,
    RESOURCES: 2,
    WORKLOADS: 1,
    NETWORK_SECURITY: 1,
    DEPLOY: 1,
    TROUBLESHOOT: 1,
    MANIFESTS: 1,
    OPERATORS: 1,
    JOBS: 1
};

const examTotal = Object.values(examBlueprint).reduce((sum, count) => sum + count, 0);
assert(examTotal === 15, `exam blueprint total is ${examTotal}`);
Object.entries(examBlueprint).forEach(([key, count]) => {
    assert(SCENARIO_PACKS[key], `exam blueprint missing category ${key}`);
    assert(SCENARIO_PACKS[key].questions.length >= count, `not enough questions for ${key}`);
});

assert(WORD_PACKS.OC_CORE && WORD_PACKS.OC_CORE.length >= 40, 'OC_CORE pack is too small');
assert(WORD_PACKS.MIX.includes('oc whoami'), 'OC_CORE words are not included in MIX');
assert(WORD_DESCS['oc whoami'], 'OC_CORE descriptions are not registered');

Object.entries(WORD_PACKS).forEach(([pack, words]) => {
    assert(Array.isArray(words), `${pack} is not an array`);
    words.forEach(word => assert(typeof word === 'string' && word.trim(), `${pack} has an empty word`));
});
['LINUX', 'OC_CORE'].forEach(pack => {
    const unique = new Set(WORD_PACKS[pack]);
    assert(unique.size === WORD_PACKS[pack].length, `${pack} has duplicate commands`);
    WORD_PACKS[pack].forEach(word => assert(WORD_DESCS[word], `${pack} command missing description: ${word}`));
});
const flattenedMix = Object.entries(WORD_PACKS)
    .filter(([pack]) => pack !== 'MIX')
    .flatMap(([, words]) => words);
assert(JSON.stringify(WORD_PACKS.MIX) === JSON.stringify(flattenedMix), 'MIX should exactly flatten source packs');

[
    ['auth-01', 'htpasswd -ccc /tmp/htpasswd admin redhat', false],
    ['auth-01', 'htpasswd -cbB /tmp/htpasswd admin redhat', true],
    ['auth-02', 'htpasswd -BB /tmp/htpasswd developer devpass', false],
    ['auth-02', 'htpasswd -bB /tmp/htpasswd developer devpass', true],
    ['res-06', 'oc set volume deployment/app --add --mount-path=/etc/secret --type=secret --secret-name=db-secret -n apps', true],
    ['net-03', 'oc create service loadbalancer db --tcp=5432:5432 -n apps', true],
    ['net-04', 'oc create route passthrough tls-api --service=api --port=8443 -n apps', true],
    ['net-05', 'oc create route edge secure-web --service=web --cert=tls.crt --key=tls.key --ca-cert=ca.crt -n apps', true],
    ['lab-02-02', 'htpasswd -bb /tmp/htpasswd auditor redhat', false],
    ['lab-02-02', 'htpasswd -Bb /tmp/htpasswd auditor redhat', true],
    ['lab-05-04', 'oc set volume deployment/app --add --mount-path=/etc/secret --secret-name=db-secret --type=secret -n apps', true],
    ['lab-08-05', 'oc create route passthrough api-tls --port=8443 --service=api -n apps', true],
    ['lab-08-06', 'oc create service loadbalancer db --tcp=5432:5432 -n apps', true],
    ['lab-06-03', 'oc set resources deployment/front --limits=memory=256Mi --requests=cpu=100m -n project1', true]
].forEach(([id, command, expected]) => {
    const item = itemsById.get(id);
    assert(item, `fixture missing item ${id}`);
    assert(StudyCore.isCorrect(command, item) === expected, `matcher fixture failed for ${id}: ${command}`);
});

context.localStorage.store = {};
context.localStorage.getItem = key => context.localStorage.store[key] || null;
context.localStorage.setItem = (key, value) => { context.localStorage.store[key] = value; };

context.localStorage.store = {
    codedrop_learn_progress: JSON.stringify({ v: 1, lessons: { 'learn-01-01': { done: 'yes' } }, last: 'learn-01-01' })
};
assert(LearnMode.isUnlocked('learn-01-02') === false, 'corrupt learn progress must not unlock lesson 2');
assert(LearnMode.progress().done === 0, 'corrupt learn progress should fall back to empty progress');

context.localStorage.store = {
    codedrop_learn_progress: JSON.stringify({ v: 1, lessons: { 'learn-01-01': { done: true, quizBest: 2, quizTotal: 2, peeks: 1, at: 1 } }, last: 'learn-01-01' })
};
assert(LearnMode.isUnlocked('learn-01-02') === true, 'valid learn progress should unlock lesson 2');

StudyStats.record('lab-01-01', 'skip');
assert(StudyStats.categoryOf('lab-01-01') === 'LAB', 'lab steps should map to LAB stats');
assert(StudyStats.reviewPool().some(q => q.id === 'lab-01-01'), 'lab misses should enter review pool');

context.localStorage.store = {
    codedrop_study_stats: JSON.stringify({ v: 1, q: { 'auth-01': { a: 1, c: 1, last: 'dirty', at: 1 } } })
};
StudyStats.recordExam({ score: 0, total: 15, correct: 0, passed: false, perCat: {} });
assert(Array.isArray(StudyStats.get().exams), 'legacy stats should gain exams array');

context.localStorage.store = {};
StudyStats.record('auth-01', 'dirty');
const authSummary = StudyStats.categorySummary().AUTH;
assert(authSummary.correctRate === 1, 'dirty answers should count as correct attempts');
assert(authSummary.cleanRate === 0, 'dirty answers should not inflate clean rate');

console.log(JSON.stringify({
    scenarioCategories: Object.keys(SCENARIO_PACKS).length,
    scenarioCount,
    labs: MOCK_LABS.length,
    labStepCount,
    ocCore: WORD_PACKS.OC_CORE.length,
    tracks: LESSON_TRACKS.length,
    lessons: lessonCount,
    lessonSteps: lessonStepCount
}, null, 2));
