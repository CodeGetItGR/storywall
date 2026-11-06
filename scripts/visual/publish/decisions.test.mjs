// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { isTicked, renderComment, setBox, setState } from './comment.mjs';
import { carryApproval, changesStatus, decideEdit, decideTick, parseApprovers, statusFor } from './decisions.mjs';

const counts = (changes, failed = 0) => ({ counts: { changed: changes, new: 0, removed: 0, failed } });

describe('statusFor', () => {
    it('is green with no changes', () => {
        expect(statusFor(counts(0), null)).toEqual({ state: 'success', description: 'No visual changes' });
    });

    it('is red until approved', () => {
        expect(statusFor(counts(3), null)).toEqual({ state: 'failure', description: '3 visual changes need approval' });
    });

    it('is green once approved', () => {
        expect(statusFor(counts(3), 'owner')).toEqual({ state: 'success', description: 'Approved by owner' });
    });

    it('stays red with a failed story, even if approved', () => {
        expect(statusFor(counts(3, 1), 'owner')).toEqual({ state: 'failure', description: '1 capture failed to render' });
    });

    it('counts new and removed as changes', () => {
        expect(statusFor({ counts: { changed: 1, new: 2, removed: 3, failed: 0 } }, null).description).toBe('6 visual changes need approval');
    });
});

describe('changesStatus', () => {
    it('describes pending changes', () => {
        expect(changesStatus(2)).toEqual({ state: 'failure', description: '2 visual changes need approval' });
        expect(changesStatus(1)).toEqual({ state: 'failure', description: '1 visual change needs approval' });
    });
});

describe('carryApproval', () => {
    const botStatus = { context: 'visual-regression', state: 'success', description: 'Approved by owner', creator: { login: 'github-actions[bot]' } };
    const input = (overrides = {}) => ({
        previous: { approvedBy: 'owner', fingerprint: 'f', headSha: 'abc' },
        fingerprint: 'f',
        ticked: true,
        approvers: ['owner'],
        statuses: [botStatus],
        ...overrides,
    });

    it('keeps the approval for the baseline', () => {
        expect(carryApproval(input())).toBe('owner');
    });

    it('drops it when the fingerprint differs', () => {
        expect(carryApproval(input({ fingerprint: 'g' }))).toBeNull();
    });

    it('drops it when the box is no longer ticked', () => {
        expect(carryApproval(input({ ticked: false }))).toBeNull();
    });

    it("drops it when the approver isn't listed", () => {
        expect(carryApproval(input({ approvers: ['someone'] }))).toBeNull();
    });

    it("drops it when the newest status isn't success", () => {
        expect(carryApproval(input({ statuses: [{ ...botStatus, state: 'failure' }] }))).toBeNull();
    });

    it("drops it when the status wasn't written by the bot", () => {
        expect(carryApproval(input({ statuses: [{ ...botStatus, creator: { login: 'someone' } }] }))).toBeNull();
    });

    it('drops it when the status names someone else', () => {
        expect(carryApproval(input({ statuses: [{ ...botStatus, description: 'Approved by other' }] }))).toBeNull();
    });

    it('looks past a pending status', () => {
        expect(carryApproval(input({ statuses: [{ ...botStatus, state: 'pending' }, botStatus] }))).toBe('owner');
    });

    it('drops it when an error status is newest', () => {
        expect(carryApproval(input({ statuses: [{ ...botStatus, state: 'error' }, botStatus] }))).toBeNull();
    });

    it('ignores other contexts', () => {
        expect(carryApproval(input({ statuses: [{ ...botStatus, context: 'other', state: 'failure' }, botStatus] }))).toBe('owner');
    });

    it('returns null with nothing to carry', () => {
        expect(carryApproval(input({ previous: null }))).toBeNull();
        expect(carryApproval(input({ previous: { approvedBy: null, fingerprint: 'f', headSha: 'abc' } }))).toBeNull();
    });
});

describe('parseApprovers', () => {
    it('splits, trims and drops empty entries', () => {
        expect(parseApprovers(' a, b ,,c ')).toEqual(['a', 'b', 'c']);
        expect(parseApprovers(undefined)).toEqual([]);
    });
});

const manifest = {
    totalCaptures: 1,
    counts: { changed: 1, new: 0, removed: 0, failed: 0 },
    entries: [{ id: 'a', storyId: 'a', title: 'T', name: 'N', locale: 'en', width: 'mobile', state: 'changed', percent: 1, images: {} }],
    missingStories: [],
};
const state = { headSha: 'abc', fingerprint: 'f', approvedBy: null, reportUrl: 'https://r.test/', changes: 1 };

describe('decideTick', () => {
    const unticked = renderComment({ manifest, state });
    const ticked = setBox(unticked, true);
    const approvedAndUnticked = renderComment({ manifest, state: { ...state, approvedBy: 'owner' } }).replace('[x]', '[ ]');
    const base = { sender: 'owner', approvers: ['owner'], headSha: 'abc' };

    it('approves a tick from an approver', () => {
        expect(decideTick({ ...base, body: ticked }).action).toBe('approve');
    });

    it('rejects a tick from anyone else', () => {
        expect(decideTick({ ...base, body: ticked, sender: 'stranger' }).action).toBe('reject');
    });

    it("rejects a stranger's tick on an old commit", () => {
        expect(decideTick({ ...base, body: ticked, sender: 'stranger', headSha: 'newer' }).action).toBe('reject');
    });

    it('ignores a tick for an old commit', () => {
        expect(decideTick({ ...base, body: ticked, headSha: 'newer' }).action).toBe('ignore');
    });

    it('revokes when an approver unticks an approved box', () => {
        expect(decideTick({ ...base, body: approvedAndUnticked }).action).toBe('revoke');
    });

    it('rejects an untick from anyone else', () => {
        expect(decideTick({ ...base, body: approvedAndUnticked, sender: 'stranger' }).action).toBe('reject');
    });

    it('ignores an unrelated edit', () => {
        expect(decideTick({ ...base, body: unticked }).action).toBe('ignore');
        expect(decideTick({ ...base, body: 'no marker' }).action).toBe('ignore');
    });

    it('ignores a comment with no box', () => {
        const noChanges = renderComment({ manifest: { ...manifest, entries: [] }, state });
        expect(decideTick({ ...base, body: noChanges }).action).toBe('ignore');
    });
});

describe('decideEdit', () => {
    const original = renderComment({ manifest, state });
    const common = { sender: 'owner', approvers: ['owner'], headSha: 'abc' };

    it('approves a tick from an approver', () => {
        const edited = setBox(original, true);
        const result = decideEdit({ ...common, edited, before: original, current: edited });
        expect(result.action).toBe('approve');
        expect(isTicked(result.body)).toBe(true);
    });

    it('restores a forged approval ticked by a stranger', () => {
        const edited = setBox(setState(original, { ...state, approvedBy: 'owner' }), true);
        const result = decideEdit({ ...common, sender: 'mallory', edited, before: original, current: edited });
        expect(result.action).toBe('restore');
        expect(result.body).toBe(original);
    });

    it('restores a forged approval with the box left unticked', () => {
        const edited = setState(original, { ...state, approvedBy: 'owner' });
        expect(decideEdit({ ...common, edited, before: original, current: edited }).action).toBe('restore');
    });

    it('restores a changed fingerprint, even with a tick by the owner', () => {
        const edited = setBox(setState(original, { ...state, fingerprint: 'g' }), true);
        expect(decideEdit({ ...common, edited, before: original, current: edited }).action).toBe('restore');
    });

    it('restores a changed report link', () => {
        const edited = setState(original, { ...state, reportUrl: 'https://evil.test/' });
        expect(decideEdit({ ...common, edited, before: original, current: edited }).action).toBe('restore');
    });

    it('restores other edited text', () => {
        const edited = original + '\n\nhello';
        expect(decideEdit({ ...common, edited, before: original, current: edited }).action).toBe('restore');
    });

    it('ignores an edit that is not only the box when the comment has moved on', () => {
        const edited = original + '\n\nhello';
        expect(decideEdit({ ...common, edited, before: original, current: original }).action).toBe('ignore');
    });

    it('ignores an edit with no previous body', () => {
        const edited = setBox(original, true);
        expect(decideEdit({ ...common, edited, before: undefined, current: edited }).action).toBe('ignore');
    });

    it('accepts a tick with Windows line endings', () => {
        const edited = setBox(original, true).replaceAll('\n', '\r\n');
        expect(decideEdit({ ...common, edited, before: original, current: edited }).action).toBe('approve');
    });

    it('ignores a tick when the report has been replaced', () => {
        const edited = setBox(original, true);
        const current = renderComment({ manifest, state: { ...state, fingerprint: 'g' } });
        expect(decideEdit({ ...common, edited, before: original, current }).action).toBe('ignore');
    });

    it('ignores a tick when the commit has moved on', () => {
        const edited = setBox(original, true);
        const current = renderComment({ manifest, state: { ...state, headSha: 'newer' } });
        expect(decideEdit({ ...common, edited, before: original, current }).action).toBe('ignore');
    });

    it('handles a tick followed quickly by an untick, in order', () => {
        const ticked = setBox(original, true);
        const tick = decideEdit({ ...common, edited: ticked, before: original, current: original });
        expect(tick.action).toBe('approve');
        expect(isTicked(tick.body)).toBe(true);

        const approved = setBox(renderComment({ manifest, state: { ...state, approvedBy: 'owner' } }), true);
        const untick = decideEdit({ ...common, edited: original, before: ticked, current: approved });
        expect(untick.action).toBe('revoke');
        expect(isTicked(untick.body)).toBe(false);
    });
});
