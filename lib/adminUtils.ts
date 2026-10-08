import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';

export type AdminErrorMessageKey =
    | 'planInUse'
    | 'invalidModuleKey'
    | 'onlyDefault'
    | 'orderNotPending'
    | 'orderNotManual'
    | 'notFound'
    | 'withdrawalNotHeld'
    | 'keepEventDayNotDue'
    | 'withdrawalOrderDisputed'
    | 'eventNotActive'
    | 'webhookAlreadyProcessed'
    | 'webhookNotReplayable'
    | 'accountPlansDisabled'
    | 'paidServiceInUse'
    | 'addonLockedWhileActive'
    | 'addonNotActive'
    | 'invalidPlanTierScope'
    | 'reactionTypeInUse'
    | 'reactionTypeLimitExceeded'
    | 'reactionTypeNotUsable'
    | 'collaborationEarningNotPayable'
    | 'collaboratorPayoutDetailsIncomplete'
    | 'methodNotAllowed'
    | 'coverageOptionInvalid'
    | 'coverageOptionUnavailable'
    | 'coverageOptionLastInitial'
    | 'coverageOptionDuplicate'
    | 'demoDesignationInvalid'
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
    // Settle-by-hand is for manual-provider orders on dev/staging; a Stripe order is refused.
    if (code === ERROR_CODES.ORDER_NOT_MANUAL) return 'orderNotManual';
    if (code === ERROR_CODES.RESOURCE_NOT_FOUND) return 'notFound';
    // The common concurrent case: two admins open the withdrawal queue and the
    // second one's decision lands on a request that is no longer HELD.
    // "Something went wrong" hides exactly that.
    if (code === ERROR_CODES.WITHDRAWAL_NOT_HELD) return 'withdrawalNotHeld';
    if (code === ERROR_CODES.WITHDRAWAL_KEEP_EVENT_DAY_NOT_DUE) return 'keepEventDayNotDue';
    if (code === ERROR_CODES.WITHDRAWAL_ORDER_DISPUTED) return 'withdrawalOrderDisputed';
    if (code === ERROR_CODES.EVENT_NOT_ACTIVE) return 'eventNotActive';
    if (code === ERROR_CODES.WEBHOOK_ALREADY_PROCESSED) return 'webhookAlreadyProcessed';
    if (code === ERROR_CODES.WEBHOOK_NOT_REPLAYABLE) return 'webhookNotReplayable';
    if (code === ERROR_CODES.ACCOUNT_PLANS_DISABLED) return 'accountPlansDisabled';
    if (code === ERROR_CODES.PAID_SERVICE_IN_USE) return 'paidServiceInUse';
    if (code === ERROR_CODES.ADDON_LOCKED_WHILE_ACTIVE) return 'addonLockedWhileActive';
    if (code === ERROR_CODES.ADDON_NOT_ACTIVE) return 'addonNotActive';
    if (code === ERROR_CODES.INVALID_PLAN_TIER_SCOPE) return 'invalidPlanTierScope';
    // A module the plan's event type doesn't support, or one that no longer exists.
    if (code === ERROR_CODES.INVALID_MODULE_KEY) return 'invalidModuleKey';
    if (code === ERROR_CODES.REACTION_TYPE_IN_USE) return 'reactionTypeInUse';
    if (code === ERROR_CODES.REACTION_TYPE_LIMIT_EXCEEDED) return 'reactionTypeLimitExceeded';
    if (code === ERROR_CODES.REACTION_TYPE_NOT_USABLE) return 'reactionTypeNotUsable';
    if (code === ERROR_CODES.COLLABORATION_EARNING_NOT_PAYABLE) return 'collaborationEarningNotPayable';
    // Mark-paid refused: a partner in the batch lacks business/payout details or a VIES-valid VAT number.
    if (code === ERROR_CODES.COLLABORATOR_PAYOUT_DETAILS_INCOMPLETE) return 'collaboratorPayoutDetailsIncomplete';
    if (code === ERROR_CODES.METHOD_NOT_ALLOWED) return 'methodNotAllowed';
    if (code === ERROR_CODES.COVERAGE_OPTION_INVALID) return 'coverageOptionInvalid';
    if (code === ERROR_CODES.COVERAGE_OPTION_UNAVAILABLE) return 'coverageOptionUnavailable';
    if (code === ERROR_CODES.COVERAGE_OPTION_LAST_INITIAL) return 'coverageOptionLastInitial';
    if (code === ERROR_CODES.COVERAGE_OPTION_DUPLICATE) return 'coverageOptionDuplicate';
    if (code === ERROR_CODES.DEMO_DESIGNATION_INVALID) return 'demoDesignationInvalid';
    return 'generic';
}

export type MetricShare = { key: string; value: number; ratio: number };

/** A metrics group map as rows sorted largest first, each with its share of the group total. */
export function toMetricShares(values: Record<string, number>): MetricShare[] {
    const total = Object.values(values).reduce((sum, value) => sum + value, 0);
    return Object.entries(values)
        .sort(([leftKey, left], [rightKey, right]) => right - left || leftKey.localeCompare(rightKey))
        .map(([key, value]) => ({ key, value, ratio: total > 0 ? value / total : 0 }));
}

export function ratioOf(part: number, whole: number): number {
    return whole > 0 ? part / whole : 0;
}
