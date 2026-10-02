import { endpoints } from '@/lib/api/endpoints';
import type { GuidelinesRule, ModerationCaseStatus, ModerationDecisionRequestDto, ModerationOutcome, StatementGround } from '@/lib/api/types';
import { isExplanationValid } from '@/lib/guidelinesRules';

// Admin report center (moderation-admin-fe-integration.md, storywall-suspension-fe-integration.md).

export const ADMIN_MODERATION_PAGE_SIZE = 50;
export const MODERATION_TABS: readonly ModerationCaseStatus[] = ['OPEN', 'UNDER_REVIEW', 'CLOSED'];

export function adminModerationCasesPath(status: ModerationCaseStatus, page: number, size = ADMIN_MODERATION_PAGE_SIZE): string {
    const params = new URLSearchParams({ status, page: String(page), size: String(size) });
    return `${endpoints.adminModeration.cases}?${params.toString()}`;
}

export type DecisionDraft = {
    outcome: ModerationOutcome | null;
    removeContent: boolean;
    removeMember: boolean;
    banFromEvent: boolean;
    suspendAccount: boolean;
    suspendEvent: boolean;
    ground: StatementGround | null;
    rule: GuidelinesRule | null;
    explanation: string;
    note: string;
};

export const emptyDecision: DecisionDraft = {
    outcome: null,
    removeContent: false,
    removeMember: false,
    banFromEvent: false,
    suspendAccount: false,
    suspendEvent: false,
    ground: null,
    rule: null,
    explanation: '',
    note: '',
};

type DecisionRequest = Required<ModerationDecisionRequestDto>;

export function hasAction(request: DecisionRequest): boolean {
    return request.removeContent || request.removeMember || request.suspendAccount || request.suspendEvent;
}

// What is sent: a dismissal never carries actions, a ban never outlives the removal it depends on,
// and the statement of reasons goes with an action and only with one (3039 otherwise).
export function toDecisionRequest(draft: DecisionDraft & { outcome: ModerationOutcome }): DecisionRequest {
    const acting = draft.outcome === 'ACTION_TAKEN';
    const removeMember = acting && draft.removeMember;
    const note = draft.note.trim();
    const request: DecisionRequest = {
        outcome: draft.outcome,
        removeContent: acting && draft.removeContent,
        removeMember,
        banFromEvent: removeMember && draft.banFromEvent,
        suspendAccount: acting && draft.suspendAccount,
        suspendEvent: acting && draft.suspendEvent,
        ground: null,
        rule: null,
        explanation: null,
        note: note === '' ? null : note,
    };
    if (!hasAction(request)) return request;
    const explanation = draft.explanation.trim();
    return { ...request, ground: draft.ground, rule: draft.rule, explanation: explanation === '' ? null : explanation };
}

// The backend's rule: ground, rule and a 20–2000 character explanation, all three.
export function isStatementComplete(request: DecisionRequest): boolean {
    return request.ground !== null && request.rule !== null && request.explanation !== null && isExplanationValid(request.explanation);
}

export type DecisionSummaryLine =
    'dismiss' | 'alreadyRemoved' | 'suspendEvent' | 'removeContent' | 'removeMember' | 'banFromEvent' | 'suspendAccount';

// The confirm step lists exactly what the backend will do, in the order it does it.
// "Already removed" is said only when the item really is gone: with the item present, an action
// with nothing chosen is a 3039 the form never offers, so it has no line.
export function decisionSummary(request: DecisionRequest, contentPresent: boolean): DecisionSummaryLine[] {
    if (request.outcome === 'DISMISSED') return ['dismiss'];
    const lines: DecisionSummaryLine[] = [];
    if (request.suspendEvent) lines.push('suspendEvent');
    if (request.removeContent) lines.push('removeContent');
    if (request.removeMember) lines.push('removeMember');
    if (request.banFromEvent) lines.push('banFromEvent');
    if (request.suspendAccount) lines.push('suspendAccount');
    return lines.length > 0 || contentPresent ? lines : ['alreadyRemoved'];
}

export type StatementRecipient = 'author' | 'hosts';

// Who the backend emails a statement of reasons to. The author only if they have an account,
// which the summary says.
export function statementRecipients(request: DecisionRequest): StatementRecipient[] {
    if (request.outcome !== 'ACTION_TAKEN') return [];
    const recipients: StatementRecipient[] = [];
    if (request.removeContent || request.removeMember || request.suspendAccount) recipients.push('author');
    if (request.suspendEvent) recipients.push('hosts');
    return recipients;
}
