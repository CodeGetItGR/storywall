// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { renderComment, setBox } from './comment.mjs';
import { carryApproval, changesStatus, decideTick, statusFor } from './decisions.mjs';

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
    it('keeps an approval when the fingerprint matches', () => {
        expect(carryApproval({ approvedBy: 'owner', fingerprint: 'f' }, 'f')).toBe('owner');
    });

    it('drops it when the fingerprint differs', () => {
        expect(carryApproval({ approvedBy: 'owner', fingerprint: 'f' }, 'g')).toBeNull();
    });

    it('returns null with nothing to carry', () => {
        expect(carryApproval(null, 'f')).toBeNull();
        expect(carryApproval({ approvedBy: null, fingerprint: 'f' }, 'f')).toBeNull();
    });
});

describe('decideTick', () => {
    const manifest = {
        totalCaptures: 1,
        counts: { changed: 1, new: 0, removed: 0, failed: 0 },
        entries: [{ id: 'a', storyId: 'a', title: 'T', name: 'N', locale: 'en', width: 'mobile', state: 'changed', percent: 1, images: {} }],
        missingStories: [],
    };
    const state = { headSha: 'abc', fingerprint: 'f', approvedBy: null, reportUrl: 'https://r.test/', changes: 1 };
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
