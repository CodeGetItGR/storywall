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
    MODULE_NOT_AVAILABLE: 5012,
    INTERNAL_ERROR: 9001,
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

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (error instanceof ApiError) {
        return error.problem?.detail ?? fallback;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return fallback;
}
