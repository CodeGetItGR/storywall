import { endpoints } from '@/lib/api/endpoints';
import type { ModerationCaseStatus, ModerationDecisionRequestDto, ModerationOutcome } from '@/lib/api/types';

// Admin report center (moderation-admin-fe-integration.md).

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
    note: string;
};

export const emptyDecision: DecisionDraft = {
    outcome: null,
    removeContent: false,
    removeMember: false,
    banFromEvent: false,
    suspendAccount: false,
    note: '',
};

// What is sent: a dismissal never carries actions, a ban never outlives the removal it depends on (3039).
export function toDecisionRequest(draft: DecisionDraft & { outcome: ModerationOutcome }): Required<ModerationDecisionRequestDto> {
    const acting = draft.outcome === 'ACTION_TAKEN';
    const removeMember = acting && draft.removeMember;
    const note = draft.note.trim();
    return {
        outcome: draft.outcome,
        removeContent: acting && draft.removeContent,
        removeMember,
        banFromEvent: removeMember && draft.banFromEvent,
        suspendAccount: acting && draft.suspendAccount,
        note: note === '' ? null : note,
    };
}

export type DecisionSummaryLine = 'dismiss' | 'alreadyRemoved' | 'removeContent' | 'removeMember' | 'banFromEvent' | 'suspendAccount';

// The confirm step lists exactly what the backend will do, in the order it does it.
export function decisionSummary(request: Required<ModerationDecisionRequestDto>): DecisionSummaryLine[] {
    if (request.outcome === 'DISMISSED') return ['dismiss'];
    const lines: DecisionSummaryLine[] = [];
    if (request.removeContent) lines.push('removeContent');
    if (request.removeMember) lines.push('removeMember');
    if (request.banFromEvent) lines.push('banFromEvent');
    if (request.suspendAccount) lines.push('suspendAccount');
    return lines.length > 0 ? lines : ['alreadyRemoved'];
}
