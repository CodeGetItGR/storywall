import { execFileSync } from 'node:child_process';

try {
    execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
} catch {
    // Git may be unavailable in some install environments.
}
