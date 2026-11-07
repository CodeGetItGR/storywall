import { hasBox, isTicked, normalizeBody, onlyBoxChanged, parseState, setBox } from './comment.mjs';
import { BOT_LOGIN, STATUS_CONTEXT } from './github.mjs';

export const parseApprovers = (value) =>
    (value ?? '')
        .split(',')
        .map((login) => login.trim())
        .filter(Boolean);

export const changeCount = ({ counts }) => counts.changed + counts.new + counts.removed;

export const changesStatus = (count) => ({
    state: 'failure',
    description: count === 1 ? '1 visual change needs approval' : `${count} visual changes need approval`,
});

export function statusFor(manifest, approvedBy) {
    const { failed } = manifest.counts;
    if (failed > 0) return { state: 'failure', description: failed === 1 ? '1 capture failed to render' : `${failed} captures failed to render` };
    const count = changeCount(manifest);
    if (count === 0) return { state: 'success', description: 'No visual changes' };
    return approvedBy ? { state: 'success', description: `Approved by ${approvedBy}` } : changesStatus(count);
}

// Anyone with write access can edit the comment, so an approval only carries to a new push if
// the box is still ticked and the check itself recorded that approval on the commit it was for.
export function carryApproval({ previous, fingerprint, ticked, approvers, statuses }) {
    const approvedBy = previous?.approvedBy;
    if (!approvedBy || !ticked || previous.fingerprint !== fingerprint || !approvers.includes(approvedBy)) return null;
    // A re-run on the same commit sets it to pending first, so look past that.
    const latest = statuses.find((status) => status.context === STATUS_CONTEXT && status.state !== 'pending');
    const recorded = latest?.state === 'success' && latest.creator?.login === BOT_LOGIN && latest.description === `Approved by ${approvedBy}`;
    return recorded ? approvedBy : null;
}

export function decideTick({ body, sender, approvers, headSha }) {
    const state = parseState(body);
    if (!state || !hasBox(body)) return { action: 'ignore', state };
    const ticked = isTicked(body);
    if (ticked === Boolean(state.approvedBy)) return { action: 'ignore', state };
    if (!approvers.includes(sender)) return { action: 'reject', state };
    if (state.headSha !== headSha) return { action: 'ignore', state };
    return { action: ticked ? 'approve' : 'revoke', state };
}

// Decides what an edit to the comment means. `edited` is what this edit produced, `before` what it
// replaced, and `current` what the comment says now, which may be newer than this edit.
export function decideEdit({ edited, before, current, sender, approvers, headSha }) {
    if (before === undefined) return { action: 'ignore' };
    const editedBody = normalizeBody(edited);
    const currentBody = normalizeBody(current);
    // Only the box may change, so any other edit is undone, unless the comment has moved on since.
    if (!onlyBoxChanged(before, editedBody)) {
        return currentBody === editedBody ? { action: 'restore', body: normalizeBody(before) } : { action: 'ignore' };
    }
    const seen = parseState(editedBody);
    const now = parseState(currentBody);
    // The check ran again after this tick, so the tick is about a report that has been replaced.
    if (!seen || !now || seen.headSha !== now.headSha || seen.fingerprint !== now.fingerprint) return { action: 'ignore' };
    const body = setBox(currentBody, isTicked(editedBody));
    return { ...decideTick({ body, sender, approvers, headSha }), body };
}
