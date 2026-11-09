import type { ApiError } from '@/lib/api/client';
import { getErrorCode, getErrorMessage, getFieldErrors, getRetryAfterSeconds, isModuleNotAvailableError, isRateLimitedError } from '@/lib/api/errors';
import type { RsvpOutcome } from '@/lib/invitation/rsvp';

// 409s from the guests' page RSVP whose backend message is approved copy, sent
// in the invitation's language: the RSVP deadline has passed, or the event holds
// its cap of invitation replies (twice its guest limit, or 2,000 without one).
export const RSVP_DEADLINE_PASSED = 5222;
export const RSVP_REPLIES_FULL = 5223;
const BACKEND_MESSAGE_CODES: readonly number[] = [RSVP_DEADLINE_PASSED, RSVP_REPLIES_FULL];

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
    const code = getErrorCode(error);
    if (typeof code === 'number' && BACKEND_MESSAGE_CODES.includes(code)) return { ok: false, message: getErrorMessage(error, '').trim() || copy.closed };
    if (isModuleNotAvailableError(error)) return { ok: false, message: copy.closed };
    if (error.status === 400 && getFieldErrors(error)?.phone) return { ok: false, message: copy.phoneInvalid };
    return { ok: false, message: copy.failed };
}
