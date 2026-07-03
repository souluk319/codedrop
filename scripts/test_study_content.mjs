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
    'js/study_stats.js'
].forEach(file => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
});

vm.runInContext(
    'globalThis.__codedrop = { WORD_PACKS, WORD_DESCS, SCENARIO_PACKS, MOCK_LABS, StudyCore, StudyStats };',
    context
);

const { WORD_PACKS, WORD_DESCS, SCENARIO_PACKS, MOCK_LABS, StudyCore, StudyStats } = context.__codedrop;
const ids = new Set();

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function validateItem(item, type) {
    assert(!ids.has(item.id), `duplicate id: ${item.id}`);
    ids.add(item.id);

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

const examBlueprint = {
    AUTH: 2,
    RBAC: 2,
    SCC_SA: 2,
    RESOURCES: 2,
    WORKLOADS: 2,
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

context.localStorage.store = {};
context.localStorage.getItem = key => context.localStorage.store[key] || null;
context.localStorage.setItem = (key, value) => { context.localStorage.store[key] = value; };

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
    ocCore: WORD_PACKS.OC_CORE.length
}, null, 2));
