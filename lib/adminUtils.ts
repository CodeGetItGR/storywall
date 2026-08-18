import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';

export type AdminErrorMessageKey =
    | 'planInUse'
    | 'onlyDefault'
    | 'orderNotPending'
    | 'notFound'
    | 'refundNotPending'
    | 'refundNotEligible'
    | 'orderNotRefundable'
    | 'eventNotActive'
    | 'webhookAlreadyProcessed'
    | 'webhookNotReplayable'
    | 'accountPlansDisabled'
    | 'paidServiceInUse'
    | 'addonLockedWhileActive'
    | 'addonNotActive'
    | 'subscriptionAlreadyActive'
    | 'generic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Every id an admin types by hand is a UUID the backend answers with a 404 for.
// Checking the shape before the call turns "we could not find that record" into
// "that is not an id", which is the difference between a typo and a real miss.
export function isUuid(value: string): boolean {
    return UUID_PATTERN.test(value.trim());
}

export function emptyToNull(value: FormDataEntryValue | null): string | null {
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? text : null;
}

export function numberOrNull(value: FormDataEntryValue | null): number | null {
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? Number(text) : null;
}

export function checked(formData: FormData, key: string): boolean {
    return formData.has(key);
}

export function adminErrorMessageKey(error: unknown): AdminErrorMessageKey {
    const code = getErrorCode(error);
    if (code === ERROR_CODES.PLAN_TIER_IN_USE) return 'planInUse';
    if (code === ERROR_CODES.PLAN_TIER_IS_ONLY_DEFAULT) return 'onlyDefault';
    if (code === ERROR_CODES.ORDER_NOT_PENDING) return 'orderNotPending';
    if (code === ERROR_CODES.RESOURCE_NOT_FOUND) return 'notFound';
    // Refund-queue outcomes. The first one is the common concurrent case: two
    // admins open the queue and the second one's decision lands on a request
    // that is no longer PENDING. "Something went wrong" hides exactly that.
    if (code === ERROR_CODES.REFUND_REQUEST_NOT_PENDING) return 'refundNotPending';
    if (code === ERROR_CODES.REFUND_NOT_ELIGIBLE) return 'refundNotEligible';
    if (code === ERROR_CODES.ORDER_NOT_REFUNDABLE) return 'orderNotRefundable';
    if (code === ERROR_CODES.EVENT_NOT_ACTIVE) return 'eventNotActive';
    if (code === ERROR_CODES.WEBHOOK_ALREADY_PROCESSED) return 'webhookAlreadyProcessed';
    if (code === ERROR_CODES.WEBHOOK_NOT_REPLAYABLE) return 'webhookNotReplayable';
    if (code === ERROR_CODES.ACCOUNT_PLANS_DISABLED) return 'accountPlansDisabled';
    if (code === ERROR_CODES.PAID_SERVICE_IN_USE) return 'paidServiceInUse';
    if (code === ERROR_CODES.ADDON_LOCKED_WHILE_ACTIVE) return 'addonLockedWhileActive';
    if (code === ERROR_CODES.ADDON_NOT_ACTIVE) return 'addonNotActive';
    if (code === ERROR_CODES.SUBSCRIPTION_ALREADY_ACTIVE) return 'subscriptionAlreadyActive';
    return 'generic';
}
