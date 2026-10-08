import { ApiError } from '@/lib/api/client';
import type { QuotaExceededDetails, SignupAcceptanceRequiredDetails } from '@/lib/api/types';

// Numeric errorCode registry from the integration guide §2. Switch on
// errorCode, never on `detail` (detail is human copy and may change).
export const ERROR_CODES = {
    INVALID_CREDENTIALS: 1001,
    INVALID_REFRESH_TOKEN: 1002,
    ACCOUNT_NOT_ACTIVE: 1003,
    OAUTH_TOKEN_INVALID: 1004,
    RESOURCE_NOT_FOUND: 2001,
    INVITATION_NOT_FOUND: 2002,
    INVITATION_EXPIRED: 2003,
    VALIDATION_FAILED: 3001,
    MALFORMED_REQUEST_BODY: 3002,
    TOO_MANY_FILES: 3003,
    DUPLICATE_MEDIA_ID_IN_REQUEST: 3004,
    REQUEST_TOO_LARGE: 3005,
    INVALID_PLAN_TIER_SCOPE: 3007,
    OAUTH_EMAIL_REQUIRED: 3027,
    OAUTH_EMAIL_UNVERIFIED: 3033,
    FORBIDDEN: 4001,
    CONFLICT: 5001,
    EMAIL_ALREADY_EXISTS: 5002,
    DUPLICATE_MEMBERSHIP: 5003,
    STORAGE_UPLOAD_FAILED: 5004,
    DUPLICATE_REACTION: 5005,
    ALREADY_LINKED: 5006,
    POST_MEDIA_LIMIT_EXCEEDED: 5007,
    EVENT_STORAGE_LIMIT_EXCEEDED: 5008,
    EVENT_MEMBER_LIMIT_EXCEEDED: 5009,
    PLAN_TIER_IN_USE: 5011,
    MODULE_NOT_AVAILABLE: 5012,
    PLAN_TIER_IS_ONLY_DEFAULT: 5013,
    INTERNAL_ERROR: 9001,
    RATE_LIMITED: 3010,
    WEBHOOK_PAYLOAD_TOO_LARGE: 3011,
    METHOD_NOT_ALLOWED: 3020,
    EVENT_DELETE_OTP_NOT_REQUESTED: 3028,
    EVENT_DELETE_OTP_EXPIRED: 3029,
    EVENT_DELETE_OTP_TOO_MANY_ATTEMPTS: 3030,
    EVENT_DELETE_OTP_INVALID: 3031,
    EVENT_DATES_INCOMPLETE: 3008,
    EVENT_START_TOO_FAR_AHEAD: 3032,
    STORY_EXPIRY_OUT_OF_RANGE: 3034,
    EVENT_START_PASSED: 3035,
    GIFT_CLAIM_PIN_INVALID: 3036,
    GUIDELINES_VERSION_MISMATCH: 3037,
    REPORT_OWN_CONTENT: 3038,
    MODERATION_DECISION_INVALID: 3039,
    TERMS_VERSION_MISMATCH: 3043,
    SIGNUP_ACCEPTANCE_REQUIRED: 3044,
    POST_PIN_NOT_HOST: 4007,
    ANNOUNCEMENT_NOT_HOST: 4008,
    GIFT_CLAIM_NOT_ALLOWED: 4009,
    GIFT_ORDER_NOT_YOURS: 4010,
    GIFT_NOT_PRIMARY_HOST: 4011,
    GIFT_ACCOUNT_NOT_PRIMARY_HOST: 4019,
    GIFT_RECIPIENT_PROTECTED: 4012,
    GUIDELINES_ACCEPTANCE_REQUIRED: 4013,
    EVENT_BANNED: 4014,
    EVENT_SUSPENDED: 4015,
    TERMS_ACCEPTANCE_REQUIRED: 4020,
    EVENT_NOT_ACTIVE: 5014,
    EVENT_NOT_DRAFT: 5017,
    ORDER_NOT_PENDING: 5018,
    ORDER_NOT_MANUAL: 5105,
    MODERATION_CASE_CLOSED: 5106,
    MODERATION_MEMBER_IS_HOST: 5107,
    MODERATION_TARGET_PROTECTED: 5108,
    NOTICE_ALREADY_HANDLED: 5109,
    EVENT_ALREADY_SUSPENDED: 5110,
    EVENT_NOT_SUSPENDED: 5111,
    EVENT_ALREADY_CLOSED: 5112,
    PLAN_TIER_NOT_PURCHASABLE: 5015,
    PLAN_TIER_NOT_PRICED: 5019,
    PLAN_TIER_CURRENCY_UNSUPPORTED: 5021,
    PLAN_TIER_NOT_AN_UPGRADE: 5029,
    PLAN_TIER_CURRENCY_MISMATCH: 5030,
    CHECKOUT_SESSION_UNRESOLVED: 5031,
    WEBHOOK_ALREADY_PROCESSED: 5032,
    WEBHOOK_NOT_REPLAYABLE: 5033,
    ACCOUNT_PLANS_DISABLED: 5034,
    QR_LINK_NOT_FOUND: 2004,
    QR_LINK_NOT_AVAILABLE: 2005,
    INVITATION_EXHAUSTED: 5035,
    MEDIA_ARCHIVE_PART_NOT_FOUND: 3019,
    MEDIA_ARCHIVE_SELECTION_EMPTY: 3021,
    MEDIA_ARCHIVE_SELECTION_TOO_LARGE: 3022,
    MEDIA_ARCHIVE_SELECTION_INVALID: 3023,
    MEDIA_ARCHIVE_DOWNLOADS_IN_PROGRESS: 3045,
    MEDIA_ARCHIVE_DAILY_LIMIT_REACHED: 3046,
    INVALID_MODULE_KEY: 3006,
    UNSUPPORTED_MEDIA_FORMAT: 3012,
    MEDIA_FILE_TOO_LARGE: 3013,
    MEDIA_FILE_CORRUPT: 3014,
    INVALID_PAID_SERVICE_KIND: 3015,
    MEDIA_IMAGE_TOO_MANY_PIXELS: 3016,
    MEDIA_PROCESSING_BUSY: 3017,
    PAID_SERVICE_NOT_PURCHASABLE: 5036,
    PAID_SERVICE_IN_USE: 5037,
    ADDON_ALREADY_ACTIVE: 5038,
    PAID_SERVICE_CURRENCY_MISMATCH: 5039,
    PAID_SERVICE_NOT_ON_PLAN: 5040,
    ADDON_NOT_ACTIVE: 5041,
    ADDON_LOCKED_WHILE_ACTIVE: 5042,
    CO_HOST_INVITE_NOT_YOURS: 5044,
    INVALID_IBAN: 5045,
    CHECKOUT_AMOUNT_BELOW_MINIMUM: 5046,
    EVENT_SCHEDULE_LOCKED: 5048,
    EVENT_MODULE_COMPOSITION_LOCKED: 5049,
    EVENT_VISIBILITY_NOT_SUPPORTED: 5050,
    EVENT_TYPE_NOT_AVAILABLE: 5051,
    EVENT_SESSION_SCHEDULE_LOCKED: 5052,
    INVALID_EVENT_TYPE: 3018,
    PLAN_TIER_NOT_AVAILABLE_FOR_EVENT_TYPE: 5053,
    EVENT_SESSION_MAIN_DATES_READ_ONLY: 5055,
    EVENT_SESSION_MAIN_LOCATION_READ_ONLY: 5065,
    EVENT_SESSION_SECONDARY_ALREADY_ASSIGNED: 5056,
    REACTION_TYPE_NOT_USABLE: 5057,
    REACTION_TYPE_IN_USE: 5058,
    REACTION_TYPE_LIMIT_EXCEEDED: 5059,
    COLLABORATION_CODE_NOT_VALID: 5060,
    COLLABORATION_ALREADY_REDEEMED: 5061,
    COLLABORATION_EARNING_NOT_PAYABLE: 5062,
    EVENT_DELETE_NOT_PRIMARY_HOST: 4003,
    EVENT_DELETE_ALREADY_PENDING: 5064,
    QR_MEDIA_UPLOAD_DISABLED: 5066,
    EVENT_SESSION_LIMIT_REACHED: 5067,
    EVENT_CO_HOST_LIMIT_EXCEEDED: 5088,
    QR_SHARED_LINK_HOST_MANAGED: 5068,
    EVENT_HOST_PRIMARY_CANNOT_BE_REMOVED: 5069,
    EVENT_HOST_DISPLAY_ORDER_RESERVED: 5070,
    EVENT_HOST_TRANSFER_NOT_PRIMARY_HOST: 4004,
    WITHDRAWAL_NOT_PRIMARY_HOST: 4005,
    EVENT_WITHDRAWN: 5071,
    WITHDRAWAL_TERMS_VERSION_STALE: 5072,
    WITHDRAWAL_REFUSED: 5073,
    WITHDRAWAL_NOT_HELD: 5074,
    EVENT_CREATION_LOCKED: 5075,
    EVENT_DRAFT_LIMIT_REACHED: 5116,
    EVENT_SESSION_MAIN_NOT_DELETABLE: 5122,
    EVENT_SESSION_MAIN_ALREADY_EXISTS: 5123,
    ACCOUNT_DELETE_OTP_NOT_REQUESTED: 3047,
    ACCOUNT_DELETE_OTP_EXPIRED: 3048,
    ACCOUNT_DELETE_OTP_TOO_MANY_ATTEMPTS: 3049,
    ACCOUNT_DELETE_OTP_INVALID: 3050,
    ACCOUNT_DELETE_ADMIN: 4021,
    ACCOUNT_DELETE_HAS_HOSTED_EVENTS: 5124,
    QR_UPLOAD_ACCEPTANCE_REQUIRED: 3051,
    THEME_FONT_INVALID_FILE: 3052,
    THEME_FONT_TOO_LARGE: 3053,
    THEME_FONT_MISSING_CHARACTERS: 3054,
    THEME_TITLE_COLOR_LOW_CONTRAST: 3055,
    POST_EDIT_NOT_AUTHOR: 4022,
    MEMBER_ARCHIVE_NOT_ENABLED: 4023,
    DISCOUNT_NOT_APPLICABLE_TO_UPGRADE: 5076,
    PURCHASE_NOT_PRIMARY_HOST: 4006,
    COVERAGE_OPTION_INVALID: 5077,
    COVERAGE_OPTION_UNAVAILABLE: 5078,
    COVERAGE_OPTION_LAST_INITIAL: 5079,
    COVERAGE_OPTION_DUPLICATE: 5080,
    DEMO_EVENT_LOCKED: 5101,
    DEMO_ACT_AS_REFUSED: 5102,
    DEMO_DESIGNATION_INVALID: 5103,
    DEMO_PERSONA_AVATAR_REFUSED: 5104,
    HOST_TRANSFER_WITHDRAWAL_OPEN: 5081,
    WITHDRAWAL_ORDER_KIND_NOT_SUPPORTED: 5082,
    WITHDRAWAL_KEEP_EVENT_DAY_NOT_DUE: 5083,
    PURCHASE_WITHDRAWAL_OPEN: 5084,
    COVERAGE_ENDED: 5085,
    SESSION_RSVP_NOT_ENABLED: 5086,
    RSVP_NOT_ATTENDING: 5087,
    GIFT_NOT_AVAILABLE_ON_PLAN: 5089,
    GIFT_ALREADY_CLAIMED: 5090,
    GIFT_CARD_LOCKED: 5091,
    GIFT_EVENT_NOT_ACTIVE: 5092,
    GIFT_HANDOVER_PENDING: 5093,
    WITHDRAWAL_CONFIRMATION_INVALID: 5094,
    WITHDRAWAL_PREVIEW_STALE: 5095,
    COLLABORATOR_PAYOUT_DETAILS_INCOMPLETE: 5096,
    BETA_FEEDBACK_DISABLED: 5100,
    MEMBER_ROLE_INVALID_REQUEST: 3040,
    MEMBER_ROLE_UNKNOWN: 3041,
    MEMBER_ROLE_CUSTOM_BLOCKED: 3042,
    MEMBER_ROLE_CUSTOM_NOT_ALLOWED: 4016,
    MEMBER_ROLE_CUSTOM_LOCKED: 4017,
    MEMBER_ROLE_HOST_ONLY: 4018,
    MEMBER_ROLE_FEATURED_MEMBER: 5113,
    MEMBER_ROLE_CAP_REACHED: 5114,
    MEMBER_ROLE_TEXT_CHANGED: 5115,
    CO_HOST_INVITATION_ALREADY_PENDING: 5117,
    CO_HOST_INVITATIONS_PENDING_LIMIT: 5118,
    RESOURCE_BUSY: 5119,
    WITHDRAWAL_ORDER_DISPUTED: 5120,
    CONCURRENT_MODIFICATION: 5128,
    STORY_LIVE_LIMIT_REACHED: 5141,
    STORY_MEDIA_ALREADY_LIVE: 5142,
    THEME_PRESET_NOT_SELECTABLE: 5143,
    EVENT_ENDED: 5144,
    THEME_FONT_NOT_ASSIGNABLE: 5145,
    THEME_FONT_KEY_TAKEN: 5146,
    THEME_FONT_CONVERSION_UNAVAILABLE: 5147,
    WISHBOOK_EMPTY: 5148,
    WISHBOOK_BOOK_RENDERER_UNAVAILABLE: 5149,
    LANDING_CATEGORY_TYPE_ASSIGNED: 5150,
    COVERAGE_OPTION_PROMO_PRICE_INVALID: 5151,
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

// The backend's ErrorCode name for an error's numeric code (the keys above are
// those names), as batch responses carry it in `failed[].errorCode`.
export function getErrorCodeName(error: unknown): string | undefined {
    const code = getErrorCode(error);
    if (typeof code !== 'number') return undefined;
    return (Object.keys(ERROR_CODES) as (keyof typeof ERROR_CODES)[]).find((name) => ERROR_CODES[name] === code);
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

// 5081 carries the moment the last withdrawal window closes.
export function getHostTransferUnlocksAt(error: unknown): string | undefined {
    if (!(error instanceof ApiError)) return undefined;
    const details = error.problem?.details;
    if (typeof details !== 'object' || details === null || !('unlocksAt' in details)) return undefined;
    const { unlocksAt } = details as { unlocksAt: unknown };
    return typeof unlocksAt === 'string' ? unlocksAt : undefined;
}

export type LandingCategoryConflict = { eventTypeKey: string; categoryId: string; categoryName: string };

// 409 5150: the type sits in another landing category; resend with moveFromOtherCategory to take it.
export function getLandingCategoryConflict(error: unknown): LandingCategoryConflict | undefined {
    if (!(error instanceof ApiError) || error.problem?.errorCode !== ERROR_CODES.LANDING_CATEGORY_TYPE_ASSIGNED) return undefined;
    const details = error.problem?.details;
    if (typeof details !== 'object' || details === null) return undefined;
    const { eventTypeKey, categoryId, categoryName } = details as Record<string, unknown>;
    if (typeof eventTypeKey !== 'string' || typeof categoryId !== 'string' || typeof categoryName !== 'string') return undefined;
    return { eventTypeKey, categoryId, categoryName };
}

// The 12-hex-char reference a 500 carries, so a tester can quote it.
export function getErrorRef(error: unknown): string | undefined {
    if (!(error instanceof ApiError) || error.status !== 500) return undefined;
    const ref = error.problem?.errorRef;
    return typeof ref === 'string' && /^[0-9a-f]{12}$/.test(ref) ? ref : undefined;
}

// Beta feedback was switched off after the config was read.
export function isBetaFeedbackDisabledError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.BETA_FEEDBACK_DISABLED;
}

export function isModuleNotAvailableError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.MODULE_NOT_AVAILABLE;
}

// The session isn't open to RSVPs (rsvpEnabled is false) — refetch the
// sessions. See plan-owned-modules-fe-integration.md §7.
export function isSessionRsvpNotEnabledError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.SESSION_RSVP_NOT_ENABLED;
}

// A session answer on an RSVP that isn't attending (declining clears the answers).
// The cached RSVP is stale: someone declined it elsewhere.
export function isRsvpNotAttendingError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.RSVP_NOT_ATTENDING;
}

// The target of the request no longer exists — e.g. a session answer posted
// after the host deleted that session. An expected race, not a real failure.
export function isNotFoundError(error: unknown): boolean {
    return error instanceof ApiError && error.status === 404;
}

// Gallery's QR upload-link toggle is a `configuration` flag, not a module, so
// it 409s with its own code instead of MODULE_NOT_AVAILABLE — see
// event-type-feature-toggles-quotas-fe-integration.md §4.
export function isQrUploadDisabledError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.QR_MEDIA_UPLOAD_DISABLED;
}

// The event plan's schedule-section cap was reached (`moduleConfigs.schedule.maxSections`
// on GET /api/config's planTiers) — distinct from the module being unavailable
// at all. See event-type-feature-toggles-quotas-fe-integration.md §3.
export function isScheduleLimitReachedError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.EVENT_SESSION_LIMIT_REACHED;
}

// Seconds the caller must wait after a 429, or undefined when this isn't one.
// Mirrors the `Retry-After` header; the client parses it off the ProblemDetail.
export function getRetryAfterSeconds(error: unknown): number | undefined {
    if (error instanceof ApiError && error.status === 429) {
        return error.retryAfterSeconds ?? undefined;
    }
    return undefined;
}

// Another request changed or removed the same row at the same moment (5128),
// e.g. the second tap of a double-tapped delete.
export function isConcurrentModificationError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.CONCURRENT_MODIFICATION;
}

// For a delete: another request removed (or changed) the same row at the same
// moment, so there is nothing left for this one to do. Callers refetch after.
export async function ignoreConcurrentModification(request: Promise<void>): Promise<void> {
    try {
        await request;
    } catch (error) {
        if (!isConcurrentModificationError(error)) throw error;
    }
}

// The server was too busy to take the request (503) and said when to try again.
// Seconds, or undefined when this isn't one.
export function getBusyRetryAfterSeconds(error: unknown): number | undefined {
    if (error instanceof ApiError && error.status === 503) return error.retryAfterSeconds;
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

// The caller hasn't accepted the Community Guidelines in force; every write is
// refused until they do. The query client reopens the acceptance gate on it.
export function isGuidelinesAcceptanceRequiredError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.GUIDELINES_ACCEPTANCE_REQUIRED;
}

// The version the user accepted is no longer the current one.
export function isGuidelinesVersionMismatchError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.GUIDELINES_VERSION_MISMATCH;
}

// The caller hasn't accepted the Terms of Use in force (or confirmed being 18+);
// every write is refused until they do. Reopens the acceptance gate, like 4013.
export function isTermsAcceptanceRequiredError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.TERMS_ACCEPTANCE_REQUIRED;
}

// The Terms version the user accepted is no longer the current one.
export function isTermsVersionMismatchError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.TERMS_VERSION_MISMATCH;
}

// A first Google/Apple sign-in would create an account, but the request carried no
// acceptance. Nothing was created: ask, then resend the same ID token with the fields.
export function isSignupAcceptanceRequiredError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.SIGNUP_ACCEPTANCE_REQUIRED;
}

// The versions in force, carried by a 3044.
export function getSignupAcceptanceRequiredDetails(error: unknown): SignupAcceptanceRequiredDetails | null {
    if (!isSignupAcceptanceRequiredError(error) || !(error instanceof ApiError)) return null;
    const details = error.problem?.details;
    if (typeof details !== 'object' || details === null) return null;
    const { currentTermsVersion, currentGuidelinesVersion } = details as Record<string, unknown>;
    if (typeof currentTermsVersion !== 'string' || typeof currentGuidelinesVersion !== 'string') return null;
    return { currentTermsVersion, currentGuidelinesVersion };
}

// A host's StoryWall was suspended under them: refetch the event and let the suspended view take
// over (lib/eventSuspension.ts). Never shown as a toast.
export function isEventSuspendedError(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.EVENT_SUSPENDED;
}
