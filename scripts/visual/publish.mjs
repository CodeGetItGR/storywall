// Publishes a report and updates the PR. Runs with no dependencies installed, and
// treats REPORT_DIR as data, because the job that wrote it ran the PR's dependencies.
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA, REPORT_DIR, RUN_URL,
//      REPORTS_REPO, PAGES_BASE_URL, VISUAL_REPORTS_DEPLOY_KEY

import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { parseState, renderComment } from './publish/comment.mjs';
import { carryApproval, changeCount, statusFor } from './publish/decisions.mjs';
import { createGitHub } from './publish/github.mjs';
import { validateManifest } from './publish/manifest.mjs';
import { pruneReports, updateReports, waitUntilLive } from './publish/reportsRepo.mjs';

const { GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA, REPORT_DIR, RUN_URL, REPORTS_REPO, PAGES_BASE_URL, VISUAL_REPORTS_DEPLOY_KEY } =
    process.env;

const shortSha = HEAD_SHA.slice(0, 7);
const github = createGitHub({ token: GITHUB_TOKEN, repo: GITHUB_REPOSITORY });
const manifest = validateManifest(JSON.parse(readFileSync(join(REPORT_DIR, 'manifest.json'), 'utf8')));
const reportsOptions = { repo: REPORTS_REPO, deployKey: VISUAL_REPORTS_DEPLOY_KEY };

const existing = await github.findComment(PR_NUMBER);
const previous = existing ? parseState(existing.body) : null;

async function publishReport() {
    const imagePaths = manifest.entries.flatMap((entry) => Object.values(entry.images));
    await updateReports({ ...reportsOptions, message: `PR ${PR_NUMBER} at ${shortSha}` }, (site) => {
        const prDir = join(site, `pr-${PR_NUMBER}`);
        const reportDir = join(prDir, shortSha);
        rmSync(prDir, { recursive: true, force: true });
        mkdirSync(join(reportDir, 'img'), { recursive: true });
        for (const path of imagePaths) copyFileSync(join(REPORT_DIR, path), join(reportDir, 'img', basename(path)));
        writeFileSync(join(reportDir, 'manifest.json'), JSON.stringify({ ...manifest, createdAt: new Date().toISOString() }));
        // The page comes from this checkout, not from the artifact.
        copyFileSync(new URL('./report/index.html', import.meta.url), join(reportDir, 'index.html'));
        pruneReports(site, PR_NUMBER);
    });
    const reportUrl = `${PAGES_BASE_URL}/pr-${PR_NUMBER}/${shortSha}/`;
    const live = await waitUntilLive(`${reportUrl}manifest.json`);
    return { reportUrl, deploying: !live };
}

let reportUrl = null;
let deploying = false;
if (manifest.entries.length > 0) {
    ({ reportUrl, deploying } = await publishReport());
} else if (previous?.reportUrl) {
    await updateReports({ ...reportsOptions, message: `Remove report for PR ${PR_NUMBER}` }, (site) => {
        rmSync(join(site, `pr-${PR_NUMBER}`), { recursive: true, force: true });
    });
}

const approvedBy = manifest.counts.failed === 0 ? carryApproval(previous, manifest.fingerprint) : null;
const state = { headSha: HEAD_SHA, fingerprint: manifest.fingerprint, approvedBy, reportUrl, changes: changeCount(manifest) };
const body = renderComment({ manifest, state, deploying });

if (existing) {
    await github.updateComment(existing.id, body);
} else if (manifest.entries.length > 0 || manifest.missingStories.length > 0) {
    await github.createComment(PR_NUMBER, body);
}

await github.setStatus(HEAD_SHA, statusFor(manifest, approvedBy), reportUrl ?? RUN_URL);
