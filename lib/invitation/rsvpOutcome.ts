import type { ApiError } from '@/lib/api/client';
import { getErrorCode, getErrorMessage, getFieldErrors, getRetryAfterSeconds, isModuleNotAvailableError, isRateLimitedError } from '@/lib/api/errors';
import type { RsvpOutcome } from '@/lib/invitation/rsvp';

// 409 from the guests' page RSVP: the event's RSVP deadline has passed. The
// backend's message for it is approved copy, sent in the invitation's language.
export const RSVP_DEADLINE_PASSED = 5222;

export type RsvpOutcomeCopy = {
    phoneInvalid: string;
    closed: string;
    failed: string;
    rateLimited: (retryAfterSeconds: number | undefined) => string;
};

// What the guest sees for the backend's answer to a reply: null when it was saved.
export function rsvpOutcome(error: ApiError | null, copy: RsvpOutcomeCopy): RsvpOutcome {
    if (!error) return { ok: true };
    // Unknown, suspended or deleted (404), or offline (410): the page says which.
    if (error.status === 404 || error.status === 410) return { ok: false, reload: true };
    if (isRateLimitedError(error)) return { ok: false, message: copy.rateLimited(getRetryAfterSeconds(error)) };
    if (getErrorCode(error) === RSVP_DEADLINE_PASSED) return { ok: false, message: getErrorMessage(error, '').trim() || copy.closed };
    if (isModuleNotAvailableError(error)) return { ok: false, message: copy.closed };
    if (error.status === 400 && getFieldErrors(error)?.phone) return { ok: false, message: copy.phoneInvalid };
    return { ok: false, message: copy.failed };
}
