// Handles a tick on the visual check's approve box. Always runs from main, because
// GitHub runs issue_comment workflows from the default branch.
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH, VISUAL_APPROVERS

import { readFileSync } from 'node:fs';

import { setBox, setState } from './publish/comment.mjs';
import { changesStatus, decideEdit, parseApprovers } from './publish/decisions.mjs';
import { createGitHub } from './publish/github.mjs';

// The workflow only runs this for comments written by github-actions[bot], so a comment
// someone else posts with the same marker can't change the check.
const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH, VISUAL_APPROVERS } = process.env;

const event = JSON.parse(readFileSync(GITHUB_EVENT_PATH, 'utf8'));
const github = createGitHub({ token: GITHUB_TOKEN, repo: GITHUB_REPOSITORY });
const pull = await github.getPull(event.issue.number);
const sender = event.sender.login;
// An earlier run may have changed the comment since this edit, so the event only says what the edit wanted.
const current = await github.getComment(event.comment.id);

const { action, state, body } = decideEdit({
    edited: event.comment.body,
    before: event.changes?.body?.from,
    current: current.body,
    sender,
    approvers: parseApprovers(VISUAL_APPROVERS),
    headSha: pull.head.sha,
});
process.stdout.write(`${sender}: ${action}\n`);

if (action === 'restore') {
    await github.updateComment(event.comment.id, body);
} else if (action === 'approve') {
    await github.setStatus(state.headSha, { state: 'success', description: `Approved by ${sender}` }, state.reportUrl);
    await github.updateComment(event.comment.id, `${setState(body, { ...state, approvedBy: sender })}\n\nApproved by ${sender}.`);
} else if (action === 'revoke') {
    await github.setStatus(state.headSha, changesStatus(state.changes), state.reportUrl);
    await github.updateComment(event.comment.id, setState(body, { ...state, approvedBy: null }).replace(/\n\nApproved by .*\.$/m, ''));
} else if (action === 'reject') {
    await github.updateComment(event.comment.id, setBox(body, Boolean(state.approvedBy)));
}
