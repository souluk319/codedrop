import { spawnSync } from 'child_process';

const checks = [
    ['git', ['diff', '--check']],
    ['node', ['--check', 'js/game.js']],
    ['node', ['--check', 'js/scenario_mode.js']],
    ['node', ['--check', 'js/lab_mode.js']],
    ['node', ['--check', 'js/dashboard.js']],
    ['node', ['scripts/test_study_content.mjs']],
    ['node', ['scripts/verify_ui_ux.mjs']]
];

for (const [cmd, args] of checks) {
    const label = [cmd, ...args].join(' ');
    console.log(`\n$ ${label}`);
    const result = spawnSync(cmd, args, { stdio: 'inherit' });
    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

console.log('\nAll CodeDrop OCP verification checks passed.');
