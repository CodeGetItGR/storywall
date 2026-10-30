import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { PartnerApplicationStatus } from '@/lib/api/types';

export const PARTNER_APPLICATIONS_PAGE_SIZE = 25;

// The filter's options, in order. null is "All".
export const APPLICATION_STATUS_FILTERS: readonly (PartnerApplicationStatus | null)[] = ['PENDING', 'APPROVED', 'DECLINED', null];

// The public form only accepts an https URL or an @handle.
export function applicationLinkHref(link: string): string {
    return link.startsWith('@') ? `https://instagram.com/${link.slice(1)}` : link;
}

// Ticked by default while a spot is left; unknown counts as none, so nobody claims a spot blind.
export function foundingCheckbox(spotsLeft: number | null): { defaultChecked: boolean; disabled: boolean } {
    const room = spotsLeft !== null && spotsLeft > 0;
    return { defaultChecked: room, disabled: !room };
}

export type ApproveErrorKind =
    { kind: 'notPending' } | { kind: 'foundingFull' } | { kind: 'emailExists'; collaboratorId: string | null } | { kind: 'other' };

export function approveErrorKind(error: unknown): ApproveErrorKind | null {
    if (!error) return null;
    const code = getErrorCode(error);
    if (code === ERROR_CODES.PARTNER_APPLICATION_NOT_PENDING) return { kind: 'notPending' };
    if (code === ERROR_CODES.FOUNDING_SPOTS_FULL) return { kind: 'foundingFull' };
    if (code === ERROR_CODES.COLLABORATOR_EMAIL_EXISTS) {
        const details = error instanceof ApiError ? (error.problem?.details as { collaboratorId?: unknown } | undefined) : undefined;
        return { kind: 'emailExists', collaboratorId: typeof details?.collaboratorId === 'string' ? details.collaboratorId : null };
    }
    return { kind: 'other' };
}
