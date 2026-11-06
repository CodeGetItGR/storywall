// Handles a tick on the visual check's approve box. Always runs from main, because
// GitHub runs issue_comment workflows from the default branch.
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH, VISUAL_APPROVERS

import { readFileSync } from 'node:fs';

import { setBox, setState } from './publish/comment.mjs';
import { changesStatus, decideTick } from './publish/decisions.mjs';
import { createGitHub } from './publish/github.mjs';

// The workflow only runs this for comments written by github-actions[bot], so a comment
// someone else posts with the same marker can't change the check.
const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH, VISUAL_APPROVERS } = process.env;

const event = JSON.parse(readFileSync(GITHUB_EVENT_PATH, 'utf8'));
const github = createGitHub({ token: GITHUB_TOKEN, repo: GITHUB_REPOSITORY });
const pull = await github.getPull(event.issue.number);
const approvers = (VISUAL_APPROVERS ?? '').split(',').map((login) => login.trim()).filter(Boolean);
const sender = event.sender.login;
const body = event.comment.body;

const { action, state } = decideTick({ body, sender, approvers, headSha: pull.head.sha });
process.stdout.write(`${sender}: ${action}\n`);

if (action === 'approve') {
    await github.setStatus(state.headSha, { state: 'success', description: `Approved by ${sender}` }, state.reportUrl);
    await github.updateComment(event.comment.id, `${setState(body, { ...state, approvedBy: sender })}\n\nApproved by ${sender}.`);
} else if (action === 'revoke') {
    await github.setStatus(state.headSha, changesStatus(state.changes), state.reportUrl);
    await github.updateComment(event.comment.id, setState(body, { ...state, approvedBy: null }).replace(/\n\nApproved by .*\.$/m, ''));
} else if (action === 'reject') {
    await github.updateComment(event.comment.id, setBox(body, Boolean(state.approvedBy)));
}
