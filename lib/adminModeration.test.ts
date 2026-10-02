import { describe, expect, it } from 'vitest';

import {
    adminModerationCasesPath,
    decisionSummary,
    emptyDecision,
    hasAction,
    isStatementComplete,
    statementRecipients,
    toDecisionRequest,
} from '@/lib/adminModeration';
import type { ModerationDecisionRequestDto } from '@/lib/api/types';

const base: Required<ModerationDecisionRequestDto> = {
    outcome: 'ACTION_TAKEN',
    removeContent: false,
    removeMember: false,
    banFromEvent: false,
    suspendAccount: false,
    suspendEvent: false,
    ground: null,
    rule: null,
    explanation: null,
    note: null,
};
const statement = { ground: 'GUIDELINES_BREACH', rule: 'HARASSMENT', explanation: 'Insults aimed at one guest, twice.' } as const;

describe('adminModerationCasesPath', () => {
    it('carries status, page and size', () => {
        expect(adminModerationCasesPath('OPEN', 2)).toBe('/api/admin/moderation/cases?status=OPEN&page=2&size=50');
    });
});

describe('toDecisionRequest', () => {
    it('sends no actions and no statement with a dismissal even if some were filled in', () => {
        const draft = { ...emptyDecision, ...statement, outcome: 'DISMISSED' as const, removeContent: true, suspendEvent: true, note: '  ' };
        expect(toDecisionRequest(draft)).toEqual({ ...base, outcome: 'DISMISSED' });
    });

    it('drops a ban when the member is not removed', () => {
        const draft = { ...emptyDecision, outcome: 'ACTION_TAKEN' as const, banFromEvent: true, note: 'x' };
        expect(toDecisionRequest(draft).banFromEvent).toBe(false);
    });

    it('trims the note', () => {
        expect(toDecisionRequest({ ...emptyDecision, outcome: 'ACTION_TAKEN', removeContent: true, note: ' spam ' }).note).toBe('spam');
    });

    it('sends the trimmed statement with an action', () => {
        const draft = {
            ...emptyDecision,
            ...statement,
            explanation: `  ${statement.explanation}  `,
            outcome: 'ACTION_TAKEN' as const,
            suspendEvent: true,
        };
        expect(toDecisionRequest(draft)).toEqual({ ...base, ...statement, suspendEvent: true });
    });

    it('sends no statement when no action is chosen', () => {
        const draft = { ...emptyDecision, ...statement, outcome: 'ACTION_TAKEN' as const };
        expect(toDecisionRequest(draft)).toEqual(base);
    });

    it('sends a blank explanation as null', () => {
        const draft = { ...emptyDecision, ...statement, explanation: '   ', outcome: 'ACTION_TAKEN' as const, removeContent: true };
        expect(toDecisionRequest(draft).explanation).toBeNull();
    });
});

describe('hasAction and isStatementComplete', () => {
    it('counts the StoryWall suspension as an action', () => {
        expect(hasAction(base)).toBe(false);
        expect(hasAction({ ...base, suspendEvent: true })).toBe(true);
    });

    it('needs a ground, a rule and a 20–2000 character explanation', () => {
        expect(isStatementComplete({ ...base, ...statement })).toBe(true);
        expect(isStatementComplete({ ...base, ...statement, ground: null })).toBe(false);
        expect(isStatementComplete({ ...base, ...statement, rule: null })).toBe(false);
        expect(isStatementComplete({ ...base, ...statement, explanation: 'too short' })).toBe(false);
    });
});

describe('decisionSummary', () => {
    it('lists exactly the chosen actions in order', () => {
        expect(decisionSummary({ ...base, removeContent: true, removeMember: true, banFromEvent: true }, true)).toEqual([
            'removeContent',
            'removeMember',
            'banFromEvent',
        ]);
    });

    it('puts the StoryWall suspension first, as the backend does', () => {
        expect(decisionSummary({ ...base, removeContent: true, suspendEvent: true }, true)).toEqual(['suspendEvent', 'removeContent']);
    });

    it('is a single dismissal line', () => {
        expect(decisionSummary({ ...base, outcome: 'DISMISSED' }, true)).toEqual(['dismiss']);
    });

    it('says the item is already gone when an action has no actions', () => {
        expect(decisionSummary(base, false)).toEqual(['alreadyRemoved']);
    });

    it('never says the item is gone while it still exists', () => {
        expect(decisionSummary(base, true)).toEqual([]);
    });

    it('lists the actions, not the gone line, when the item is gone and an action is chosen', () => {
        expect(decisionSummary({ ...base, removeMember: true }, false)).toEqual(['removeMember']);
        expect(decisionSummary({ ...base, suspendEvent: true }, false)).toEqual(['suspendEvent']);
    });
});

describe('statementRecipients', () => {
    it('emails the author for actions against them and the hosts for a suspension', () => {
        expect(statementRecipients(base)).toEqual([]);
        expect(statementRecipients({ ...base, removeContent: true })).toEqual(['author']);
        expect(statementRecipients({ ...base, suspendAccount: true, suspendEvent: true })).toEqual(['author', 'hosts']);
        expect(statementRecipients({ ...base, suspendEvent: true })).toEqual(['hosts']);
        expect(statementRecipients({ ...base, outcome: 'DISMISSED' })).toEqual([]);
    });
});
