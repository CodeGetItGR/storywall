import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PUSH_ATTEMPTS = 5;
const BOT_NAME = 'storywall-visual-check';
const BOT_EMAIL = 'storywall-visual-check@users.noreply.github.com';

export const PAGES_SIZE_LIMIT = 800 * 1024 * 1024;
export const SITE_DIR = 'site';

function folderSize(dir) {
    let total = 0;
    for (const item of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, item.name);
        total += item.isDirectory() ? folderSize(path) : statSync(path).size;
    }
    return total;
}

function reportCreatedAt(prDir) {
    for (const report of readdirSync(prDir)) {
        const manifest = join(prDir, report, 'manifest.json');
        if (existsSync(manifest)) return JSON.parse(readFileSync(manifest, 'utf8')).createdAt ?? '';
    }
    return '';
}

// GitHub Pages sites are limited to 1 GB. Deletes the oldest reports first, never the one being published.
export function pruneReports(site, keepPr, limit = PAGES_SIZE_LIMIT) {
    let size = folderSize(site);
    if (size <= limit) return;
    const others = readdirSync(site, { withFileTypes: true })
        .filter((item) => item.isDirectory() && item.name.startsWith('pr-') && item.name !== `pr-${keepPr}`)
        .map((item) => ({ path: join(site, item.name), createdAt: reportCreatedAt(join(site, item.name)) }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const report of others) {
        if (size <= limit) return;
        size -= folderSize(report.path);
        rmSync(report.path, { recursive: true, force: true });
    }
}

// Clones the reports repo, applies `change` to its site folder and pushes. On a conflict it starts
// again from a fresh clone. With `squash`, history is replaced by one commit so the repo stops growing.
export async function updateReports({ repo, deployKey, message, squash = false }, change) {
    const workspace = mkdtempSync(join(tmpdir(), 'visual-reports-'));
    const keyFile = join(workspace, 'deploy-key');
    writeFileSync(keyFile, deployKey.endsWith('\n') ? deployKey : `${deployKey}\n`);
    chmodSync(keyFile, 0o600);
    const env = { ...process.env, GIT_SSH_COMMAND: `ssh -i "${keyFile}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new` };
    const clone = join(workspace, 'repo');
    const git = (...args) => execFileSync('git', args, { cwd: clone, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();

    try {
        for (let attempt = 1; attempt <= PUSH_ATTEMPTS; attempt += 1) {
            rmSync(clone, { recursive: true, force: true });
            execFileSync('git', ['clone', '--depth', '1', '--branch', 'main', `git@github.com:${repo}.git`, clone], { env, stdio: 'inherit' });
            await change(join(clone, SITE_DIR));
            git('add', '-A');
            if (git('status', '--porcelain') === '') return;
            const tip = git('rev-parse', 'HEAD');
            if (squash) git('checkout', '--orphan', 'squashed');
            git('-c', `user.name=${BOT_NAME}`, '-c', `user.email=${BOT_EMAIL}`, 'commit', '-m', message);
            try {
                if (squash) {
                    git('branch', '-M', 'main');
                    git('push', `--force-with-lease=main:${tip}`, 'origin', 'main');
                } else {
                    git('push', 'origin', 'main');
                }
                return;
            } catch (error) {
                if (attempt === PUSH_ATTEMPTS) throw error;
                await new Promise((done) => setTimeout(done, attempt * 2000));
            }
        }
    } finally {
        rmSync(workspace, { recursive: true, force: true });
    }
}

export async function waitUntilLive(url, timeoutMs = 300_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const response = await fetch(url, { cache: 'no-store' }).catch(() => null);
        if (response?.ok) return true;
        await new Promise((done) => setTimeout(done, 10_000));
    }
    return false;
}
