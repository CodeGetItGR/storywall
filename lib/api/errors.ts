import { ApiError } from '@/lib/api/client';
import type { QuotaExceededDetails } from '@/lib/api/types';

// Numeric errorCode registry from the integration guide §2. Switch on
// errorCode, never on `detail` (detail is human copy and may change).
export const ERROR_CODES = {
    INVALID_CREDENTIALS: 1001,
    INVALID_REFRESH_TOKEN: 1002,
    ACCOUNT_NOT_ACTIVE: 1003,
    RESOURCE_NOT_FOUND: 2001,
    INVITATION_NOT_FOUND: 2002,
    INVITATION_EXPIRED: 2003,
    VALIDATION_FAILED: 3001,
    MALFORMED_REQUEST_BODY: 3002,
    FORBIDDEN: 4001,
    CONFLICT: 5001,
    EMAIL_ALREADY_EXISTS: 5002,
    DUPLICATE_MEMBERSHIP: 5003,
    STORAGE_UPLOAD_FAILED: 5004,
    DUPLICATE_REACTION: 5005,
    ALREADY_LINKED: 5006,
    EVENT_STORAGE_LIMIT_EXCEEDED: 5008,
    EVENT_MEMBER_LIMIT_EXCEEDED: 5009,
    ACTIVE_EVENT_LIMIT_EXCEEDED: 5010,
    PLAN_TIER_IN_USE: 5011,
    MODULE_NOT_AVAILABLE: 5012,
    PLAN_TIER_IS_ONLY_DEFAULT: 5013,
    INTERNAL_ERROR: 9001,
    RATE_LIMITED: 3010,
    WEBHOOK_PAYLOAD_TOO_LARGE: 3011,
    EVENT_DATES_INCOMPLETE: 3008,
    EVENT_NOT_ACTIVE: 5014,
    EVENT_FROZEN: 5016,
    EVENT_NOT_DRAFT: 5017,
    ORDER_NOT_PENDING: 5018,
    PLAN_TIER_NOT_PURCHASABLE: 5015,
    PLAN_TIER_NOT_PRICED: 5019,
    PLAN_TIER_CURRENCY_UNSUPPORTED: 5021,
    SUBSCRIPTION_ALREADY_ACTIVE: 5020,
    REFUND_NOT_ELIGIBLE: 5022,
    REFUND_ALREADY_REQUESTED: 5023,
    REFUND_REQUEST_NOT_PENDING: 5024,
    ORDER_NOT_REFUNDABLE: 5025,
    SUBSCRIPTION_NOT_LIVE: 5026,
    SUBSCRIPTION_CANCEL_FAILED: 5027,
    PLAN_TIER_NOT_AN_UPGRADE: 5029,
    PLAN_TIER_CURRENCY_MISMATCH: 5030,
    CHECKOUT_SESSION_UNRESOLVED: 5031,
    WEBHOOK_ALREADY_PROCESSED: 5032,
    WEBHOOK_NOT_REPLAYABLE: 5033,
    ACCOUNT_PLANS_DISABLED: 5034,
    QR_LINK_NOT_FOUND: 2004,
    INVITATION_EXHAUSTED: 5035,
} as const;

// The auth-layer 401/403 short-circuits use string codes instead of the
// numeric registry above — handle them separately.
export const AUTH_ERROR_CODES = {
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    ACCESS_DENIED: 'ACCESS_DENIED',
} as const;

export function getErrorCode(error: unknown): number | string | undefined {
    if (error instanceof ApiError) {
        return error.problem?.errorCode;
    }
    return undefined;
}

export function getFieldErrors(error: unknown): Record<string, string> | undefined {
    if (error instanceof ApiError) {
        return error.problem?.errors;
    }
    return undefined;
}

function isQuotaExceededDetails(details: unknown): details is QuotaExceededDetails {
    return (
        typeof details === 'object' &&
        details !== null &&
        'planCode' in details &&
        'used' in details &&
        'limit' in details &&
        typeof (details as QuotaExceededDetails).planCode === 'string' &&
        typeof (details as QuotaExceededDetails).used === 'number' &&
        typeof (details as QuotaExceededDetails).limit === 'number'
    );
}

export function getQuotaExceededDetails(error: unknown): QuotaExceededDetails | undefined {
    if (error instanceof ApiError && isQuotaExceededDetails(error.problem?.details)) {
        return error.problem.details;
    }
    return undefined;
}

export function isModuleNotAvailableError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.MODULE_NOT_AVAILABLE;
}

// A frozen event still reads fine — only writes close (guide §5). Callers use
// this to swap a generic failure for "renew to keep editing".
export function isEventFrozenError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.EVENT_FROZEN;
}

// Seconds the caller must wait after a 429, or undefined when this isn't one.
// Mirrors the `Retry-After` header; the client parses it off the ProblemDetail.
export function getRetryAfterSeconds(error: unknown): number | undefined {
    if (error instanceof ApiError && error.status === 429) {
        return error.retryAfterSeconds ?? undefined;
    }
    return undefined;
}

export function isRateLimitedError(error: unknown): boolean {
    return error instanceof ApiError && (error.status === 429 || getErrorCode(error) === ERROR_CODES.RATE_LIMITED);
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (error instanceof ApiError) {
        return error.problem?.detail ?? fallback;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return fallback;
}
