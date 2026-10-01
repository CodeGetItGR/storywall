import { describe, expect, it } from 'vitest';

import { adminModerationCasesPath, decisionSummary, emptyDecision, toDecisionRequest } from '@/lib/adminModeration';

describe('adminModerationCasesPath', () => {
    it('carries status, page and size', () => {
        expect(adminModerationCasesPath('OPEN', 2)).toBe('/api/admin/moderation/cases?status=OPEN&page=2&size=50');
    });
});

describe('toDecisionRequest', () => {
    it('sends no actions with a dismissal even if some were ticked', () => {
        const draft = { ...emptyDecision, outcome: 'DISMISSED' as const, removeContent: true, note: '  ' };
        expect(toDecisionRequest(draft)).toEqual({
            outcome: 'DISMISSED',
            removeContent: false,
            removeMember: false,
            banFromEvent: false,
            suspendAccount: false,
            note: null,
        });
    });

    it('drops a ban when the member is not removed', () => {
        const draft = { ...emptyDecision, outcome: 'ACTION_TAKEN' as const, banFromEvent: true, note: 'x' };
        expect(toDecisionRequest(draft).banFromEvent).toBe(false);
    });

    it('trims the note', () => {
        expect(toDecisionRequest({ ...emptyDecision, outcome: 'ACTION_TAKEN', removeContent: true, note: ' spam ' }).note).toBe('spam');
    });
});

describe('decisionSummary', () => {
    it('lists exactly the chosen actions in order', () => {
        expect(
            decisionSummary(
                {
                    outcome: 'ACTION_TAKEN',
                    removeContent: true,
                    removeMember: true,
                    banFromEvent: true,
                    suspendAccount: false,
                    note: null,
                },
                true,
            ),
        ).toEqual(['removeContent', 'removeMember', 'banFromEvent']);
    });

    it('is a single dismissal line', () => {
        expect(
            decisionSummary(
                {
                    outcome: 'DISMISSED',
                    removeContent: false,
                    removeMember: false,
                    banFromEvent: false,
                    suspendAccount: false,
                    note: null,
                },
                true,
            ),
        ).toEqual(['dismiss']);
    });

    it('says the item is already gone when an action has no actions', () => {
        expect(
            decisionSummary(
                {
                    outcome: 'ACTION_TAKEN',
                    removeContent: false,
                    removeMember: false,
                    banFromEvent: false,
                    suspendAccount: false,
                    note: null,
                },
                false,
            ),
        ).toEqual(['alreadyRemoved']);
    });

    it('never says the item is gone while it still exists', () => {
        expect(
            decisionSummary(
                {
                    outcome: 'ACTION_TAKEN',
                    removeContent: false,
                    removeMember: false,
                    banFromEvent: false,
                    suspendAccount: false,
                    note: null,
                },
                true,
            ),
        ).toEqual([]);
    });

    it('lists the actions, not the gone line, when the item is gone and an action is chosen', () => {
        expect(
            decisionSummary(
                {
                    outcome: 'ACTION_TAKEN',
                    removeContent: false,
                    removeMember: true,
                    banFromEvent: false,
                    suspendAccount: false,
                    note: null,
                },
                false,
            ),
        ).toEqual(['removeMember']);
    });
});
