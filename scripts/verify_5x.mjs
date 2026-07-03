import { spawnSync } from 'child_process';

const passes = [
    ['1/5 syntax + full static gate', ['scripts/verify_all.mjs']],
    ['2/5 content matcher fixtures', ['scripts/test_study_content.mjs']],
    ['3/5 UI/UX structural invariants', ['scripts/verify_ui_ux.mjs']],
    ['4/5 backend/static exposure smoke', ['scripts/verify_server_smoke.mjs']],
    ['5/5 final full-system gate', ['scripts/verify_all.mjs']]
];

for (const [index, [label, args]] of passes.entries()) {
    console.log(`\n========== CodeDrop OCP verification ${label} ==========`);
    const result = spawnSync('node', args, {
        stdio: 'inherit',
        env: { ...process.env, CODEDROP_VERIFY_PASS: String(index + 1) }
    });

    if (result.status !== 0) {
        console.error(`\nVerification failed on ${label}.`);
        process.exit(result.status || 1);
    }
}

console.log(`\n${passes.length}/${passes.length} verification reviews completed successfully.`);
