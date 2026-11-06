import { hasBox, isTicked, parseState } from './comment.mjs';

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

// A new push with identical visual changes keeps its approval.
export function carryApproval(previousState, fingerprint) {
    return previousState?.approvedBy && previousState.fingerprint === fingerprint ? previousState.approvedBy : null;
}

export function decideTick({ body, sender, approvers, headSha }) {
    const state = parseState(body);
    if (!state || !hasBox(body) || state.headSha !== headSha) return { action: 'ignore', state };
    const ticked = isTicked(body);
    if (ticked === Boolean(state.approvedBy)) return { action: 'ignore', state };
    if (!approvers.includes(sender)) return { action: 'reject', state };
    return { action: ticked ? 'approve' : 'revoke', state };
}
