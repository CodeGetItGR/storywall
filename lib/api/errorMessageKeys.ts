import { AUTH_ERROR_CODES, ERROR_CODES } from '@/lib/api/errors';

type ValueOf<T> = T[keyof T];

export type KnownApiErrorCode = ValueOf<typeof ERROR_CODES> | ValueOf<typeof AUTH_ERROR_CODES>;

export type ApiErrorMessageKey =
    | 'accessDenied'
    | 'accountNotActive'
    | 'accountPlansDisabled'
    | 'activeEventLimit'
    | 'alreadyLinked'
    | 'authenticationRequired'
    | 'checkoutSessionUnresolved'
    | 'conflict'
    | 'duplicateMembership'
    | 'duplicateReaction'
    | 'emailAlreadyExists'
    | 'eventDatesIncomplete'
    | 'eventFrozen'
    | 'eventNotActive'
    | 'eventNotDraft'
    | 'forbidden'
    | 'internalError'
    | 'invalidCredentials'
    | 'invalidRefreshToken'
    | 'invitationExhausted'
    | 'invitationExpired'
    | 'invitationNotFound'
    | 'malformedRequestBody'
    | 'memberLimit'
    | 'moduleUnavailable'
    | 'orderNotPending'
    | 'orderNotRefundable'
    | 'planCurrencyMismatch'
    | 'planCurrencyUnsupported'
    | 'planInUse'
    | 'planIsOnlyDefault'
    | 'planNotAnUpgrade'
    | 'planNotPriced'
    | 'planNotPurchasable'
    | 'qrLinkNotFound'
    | 'rateLimited'
    | 'refundAlreadyRequested'
    | 'refundNotEligible'
    | 'refundNotPending'
    | 'resourceNotFound'
    | 'storageLimit'
    | 'storageUploadFailed'
    | 'subscriptionAlreadyActive'
    | 'subscriptionCancelFailed'
    | 'subscriptionNotLive'
    | 'validationFailed'
    | 'webhookAlreadyProcessed'
    | 'webhookNotReplayable'
    | 'webhookPayloadTooLarge';

export const API_ERROR_MESSAGE_KEYS = {
    [AUTH_ERROR_CODES.ACCESS_DENIED]: 'accessDenied',
    [AUTH_ERROR_CODES.AUTHENTICATION_REQUIRED]: 'authenticationRequired',
    [ERROR_CODES.ACCOUNT_NOT_ACTIVE]: 'accountNotActive',
    [ERROR_CODES.ACCOUNT_PLANS_DISABLED]: 'accountPlansDisabled',
    [ERROR_CODES.ACTIVE_EVENT_LIMIT_EXCEEDED]: 'activeEventLimit',
    [ERROR_CODES.ALREADY_LINKED]: 'alreadyLinked',
    [ERROR_CODES.CHECKOUT_SESSION_UNRESOLVED]: 'checkoutSessionUnresolved',
    [ERROR_CODES.CONFLICT]: 'conflict',
    [ERROR_CODES.DUPLICATE_MEMBERSHIP]: 'duplicateMembership',
    [ERROR_CODES.DUPLICATE_REACTION]: 'duplicateReaction',
    [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'emailAlreadyExists',
    [ERROR_CODES.EVENT_DATES_INCOMPLETE]: 'eventDatesIncomplete',
    [ERROR_CODES.EVENT_FROZEN]: 'eventFrozen',
    [ERROR_CODES.EVENT_MEMBER_LIMIT_EXCEEDED]: 'memberLimit',
    [ERROR_CODES.EVENT_NOT_ACTIVE]: 'eventNotActive',
    [ERROR_CODES.EVENT_NOT_DRAFT]: 'eventNotDraft',
    [ERROR_CODES.EVENT_STORAGE_LIMIT_EXCEEDED]: 'storageLimit',
    [ERROR_CODES.FORBIDDEN]: 'forbidden',
    [ERROR_CODES.INTERNAL_ERROR]: 'internalError',
    [ERROR_CODES.INVALID_CREDENTIALS]: 'invalidCredentials',
    [ERROR_CODES.INVALID_REFRESH_TOKEN]: 'invalidRefreshToken',
    [ERROR_CODES.INVITATION_EXHAUSTED]: 'invitationExhausted',
    [ERROR_CODES.INVITATION_EXPIRED]: 'invitationExpired',
    [ERROR_CODES.INVITATION_NOT_FOUND]: 'invitationNotFound',
    [ERROR_CODES.MALFORMED_REQUEST_BODY]: 'malformedRequestBody',
    [ERROR_CODES.MODULE_NOT_AVAILABLE]: 'moduleUnavailable',
    [ERROR_CODES.ORDER_NOT_PENDING]: 'orderNotPending',
    [ERROR_CODES.ORDER_NOT_REFUNDABLE]: 'orderNotRefundable',
    [ERROR_CODES.PLAN_TIER_CURRENCY_MISMATCH]: 'planCurrencyMismatch',
    [ERROR_CODES.PLAN_TIER_CURRENCY_UNSUPPORTED]: 'planCurrencyUnsupported',
    [ERROR_CODES.PLAN_TIER_IN_USE]: 'planInUse',
    [ERROR_CODES.PLAN_TIER_IS_ONLY_DEFAULT]: 'planIsOnlyDefault',
    [ERROR_CODES.PLAN_TIER_NOT_AN_UPGRADE]: 'planNotAnUpgrade',
    [ERROR_CODES.PLAN_TIER_NOT_PRICED]: 'planNotPriced',
    [ERROR_CODES.PLAN_TIER_NOT_PURCHASABLE]: 'planNotPurchasable',
    [ERROR_CODES.QR_LINK_NOT_FOUND]: 'qrLinkNotFound',
    [ERROR_CODES.RATE_LIMITED]: 'rateLimited',
    [ERROR_CODES.REFUND_ALREADY_REQUESTED]: 'refundAlreadyRequested',
    [ERROR_CODES.REFUND_NOT_ELIGIBLE]: 'refundNotEligible',
    [ERROR_CODES.REFUND_REQUEST_NOT_PENDING]: 'refundNotPending',
    [ERROR_CODES.RESOURCE_NOT_FOUND]: 'resourceNotFound',
    [ERROR_CODES.STORAGE_UPLOAD_FAILED]: 'storageUploadFailed',
    [ERROR_CODES.SUBSCRIPTION_ALREADY_ACTIVE]: 'subscriptionAlreadyActive',
    [ERROR_CODES.SUBSCRIPTION_CANCEL_FAILED]: 'subscriptionCancelFailed',
    [ERROR_CODES.SUBSCRIPTION_NOT_LIVE]: 'subscriptionNotLive',
    [ERROR_CODES.VALIDATION_FAILED]: 'validationFailed',
    [ERROR_CODES.WEBHOOK_ALREADY_PROCESSED]: 'webhookAlreadyProcessed',
    [ERROR_CODES.WEBHOOK_NOT_REPLAYABLE]: 'webhookNotReplayable',
    [ERROR_CODES.WEBHOOK_PAYLOAD_TOO_LARGE]: 'webhookPayloadTooLarge',
} satisfies Record<KnownApiErrorCode, ApiErrorMessageKey>;

export function getApiErrorMessageKey(code: number | string | undefined): ApiErrorMessageKey | undefined {
    return API_ERROR_MESSAGE_KEYS[code as KnownApiErrorCode];
}
