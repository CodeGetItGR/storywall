// Domain DTOs transcribed from event_social_media/docs/frontend-integration-guide.md.
// Route casing/paths live in lib/api/endpoints.ts, not here.

import type { Locale } from '@/i18n/config';

export type EventRole = 'HOST' | 'ATTENDEE';
export type EventVisibility = 'PUBLIC' | 'PRIVATE';
export type AttendanceStatus = 'ATTENDING' | 'DECLINED';
export type RsvpReportType = 'STATISTICS' | 'FULL_LIST' | 'ATTENDING_ONLY' | 'WITH_CHILDREN';
export type AuthProvider = 'LOCAL' | 'OAUTH' | 'INVITE';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type PlatformRole = 'USER' | 'ADMIN' | 'GUEST';

// eventType is now a closed set on the backend (EventTypeKey), validated on
// POST /api/events against this exact union — an unknown value 400s with
// INVALID_EVENT_TYPE. Not every key is necessarily offered right now: which
// ones are currently enabled comes from GET /api/config's eventTypeKeys, not
// this type — build pickers from that, not from this union directly.
export type EventTypeConvention = 'WEDDING' | 'BAPTISM' | 'SOCIAL_EVENT' | 'BIRTHDAY' | 'PRIVATE_PARTY' | 'GENDER_REVEAL' | 'BABY_SHOWER';
// Post.type / Reaction.reactionType are free strings server-side.
// moduleKey is now a closed set on the backend and should match the config payload.
export const EVENT_MODULE_KEYS = [
    'posts',
    'rsvp',
    'playlist',
    'stories',
    'gallery',
    'wishlist',
    'wishbook',
    'co_hosts',
    'named_invites',
    'schedule',
] as const;
// Use this (not the raw `ModuleKey` wire type below) whenever code branches on
// a specific module — it's a closed set and catches typos at compile time.
// `ModuleKey` stays a plain string because the admin module/plan-tier registry
// endpoints (PlatformModuleResponseDto, PlanTierResponseDto.moduleKeys, etc.)
// deal in an open, admin-defined registry rather than this known guest-facing set.
export type ModuleKeyConvention = (typeof EVENT_MODULE_KEYS)[number];
// Post.type is enforced server-side against this exact set (DB CHECK constraint
// + matching DTO validation) — not a free-string convention like the others.
export type PostType = 'TEXT' | 'MEDIA' | 'ANNOUNCEMENT' | 'PLAYLIST';
export type MediaTypeConvention = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
// Each context needs its own module: GALLERY → gallery, STORY → stories,
// POST → posts (plan-owned-modules-fe-integration.md §4).
// COVER needs no module and works on a DRAFT, but only a host may send it.
export type MediaUploadContext = 'GALLERY' | 'STORY' | 'POST' | 'COVER';
export type MediaStatus = 'PROCESSING' | 'READY' | 'FAILED';
export type MediaArchiveVariant = 'DISPLAY' | 'ORIGINAL';
export type PlanScope = 'ACCOUNT' | 'EVENT';
export type BillingPeriod = 'MONTHLY' | 'YEARLY' | 'ONE_TIME';
export type EventStatus = 'DRAFT' | 'ACTIVE';
// Plan codes are admin-configurable at runtime. Known codes such as FREE,
// PLUS, and PRO are conventions, not an exhaustive client-side union.
export type PlanTierCode = string;
export type ModuleKey = string;

// --- §2 Errors ---

// --- Β§1 App config ---

export interface AppMediaConfigDto {
    maxFileSizeBytes: number;
    maxRequestSizeBytes: number;
    maxImageBytes: number;
    maxVideoBytes: number;
    maxStoryVideoBytes: number;
    maxStoryVideoDurationSeconds: number;
    maxBatchUploadFiles: number;
    maxBatchStoryItems: number;
    maxMediaPerPost: number;
    maxArchiveSelectedItems: number;
    maxArchivePartBytes: number;
    presignedUrlTtlMinutes: number;
    publicHost: string | null;
    // Estimation assumptions for "how many photos/videos does this storage
    // quota hold" — NOT upload-time validation limits. Admin-tunable. See
    // app-config-fe-integration.md "media.estimateAvgImageBytes...".
    estimateAvgImageBytes: number;
    estimateAvgVideoBytes: number;
    estimateImageRatio: number; // fraction 0-1
}

export type PaidServiceKind = 'STORAGE_PACK' | 'RECURRING_ADDON' | 'MODULE_UNLOCK';

export interface PaidServiceResponseDto {
    id: string;
    code: string;
    kind: PaidServiceKind;
    name: string;
    description: string | null;
    sortOrder: number;
    isAssignable: boolean;
    isPublic: boolean;
    priceAmountMinor: number;
    priceCurrency: string;
    billingPeriod: BillingPeriod;
    grantsStorageBytes: number | null;
    grantsModuleKey: string | null;
    planTierIds: string[];
}

export interface PaidServiceRequestDto {
    code: string;
    kind: PaidServiceKind;
    name: string;
    description?: string | null;
    sortOrder: number;
    isAssignable: boolean;
    isPublic: boolean;
    priceAmountMinor: number;
    priceCurrency: string;
    billingPeriod: BillingPeriod;
    grantsStorageBytes?: number | null;
    grantsModuleKey?: string | null;
    planTierIds?: string[];
}

export type PaidServicePatchDto = Partial<Omit<PaidServiceRequestDto, 'code' | 'kind'>>;

export interface PlanTierResponseDto {
    id: string;
    code: PlanTierCode;
    scope: PlanScope;
    name: string;
    description: string | null;
    sortOrder: number;
    isDefault: boolean;
    isAssignable: boolean;
    isPublic: boolean;
    storageBytes: number | null;
    maxMembers: number | null;
    // ACCOUNT scope only. Always null on an EVENT plan, whose prices are its
    // initialOptions (coverage-options-and-extensions-fe-integration.md §1).
    priceAmountMinor: number | null;
    // Also the currency of every coverage option.
    priceCurrency: string | null;
    billingPeriod: BillingPeriod | null;
    discountPercent: number | null;
    discountLabel: string | null;
    discountStartsAt: string | null;
    discountEndsAt: string | null;
    moduleKeys: ModuleKey[];
    // MODULE_UNLOCK upsells for this plan, server-cross-referenced. Only null
    // from the admin catalog endpoints (GET /api/admin/plan-tiers, .../{id}),
    // which don't compute it — never null from /api/config or /api/plan-tiers.
    paidModules: PaidServiceResponseDto[] | null;
    // The one event type this EVENT-scope plan may be bought for; always null
    // for ACCOUNT-scope plans. Immutable after creation — replaces the old
    // many-to-many `eventTypeKeys` restriction set. See
    // plan-tiers-by-event-type-fe-integration.md §2.
    eventTypeKey: EventTypeConvention | null;
    // Set only by the admin "duplicate" action — plans sharing a key were
    // created together from the same source plan ("the same offer" across
    // event types). Null for a plan never duplicated or duplicated from. See
    // plan-tiers-by-event-type-fe-integration.md §3.
    sharedGroupKey: string | null;
    // The durations this EVENT plan is sold at, in display order. Public
    // responses list live ones only; admin responses include retired ones
    // (active: false). Empty = not on sale. Always empty on ACCOUNT scope.
    initialOptions: CoverageOptionResponseDto[];
    // Coverage bought after activation. Nothing sells these yet (phase 2).
    extensionOptions: CoverageOptionResponseDto[];
}

export type CoverageOptionKind = 'INITIAL' | 'EXTENSION';

// One duration an EVENT plan is sold at. See
// coverage-options-and-extensions-fe-integration.md.
export interface CoverageOptionResponseDto {
    id: string; // what every coverageOptionId field takes
    kind: CoverageOptionKind;
    months: number; // 1–120
    priceAmountMinor: number; // in the plan's priceCurrency, before any promotion or code
    sortOrder: number;
    active: boolean; // always true outside the admin endpoints
}

export interface PlatformModuleResponseDto {
    id: string;
    moduleKey: ModuleKey;
    name: string;
    description: string | null;
    isEnabled: boolean;
    sortOrder: number;
}

export interface ReactionTypeResponseDto {
    id: string;
    eventTypeKey: EventTypeConvention;
    code: string;
    name: string;
    emoji: string;
    sortOrder: number;
    isAssignable: boolean;
}

export interface ReactionTypeRequestDto {
    eventTypeKey: EventTypeConvention;
    code: string;
    name: string;
    emoji: string;
    sortOrder: number;
    isAssignable: boolean;
}

export type ReactionTypePatchDto = Partial<Omit<ReactionTypeRequestDto, 'eventTypeKey' | 'code'>>;

// Every localized field from the backend is a locale map, not a fixed
// {en, el}-only shape — read whichever key matches the active locale rather
// than destructuring exactly two keys. See event-type-voice-pack-fe-integration.md.
export type LocalizedText = Record<string, string>;

export type EventTypeAccentToken = 'rose' | 'sky' | 'amber';

export interface AppEventTypeResponseDto {
    id: string;
    eventTypeKey: EventTypeConvention;
    icon: string;
    accentToken: EventTypeAccentToken;
    isEnabled: boolean;
    sortOrder: number;
}

export interface EventTypeVoicePack {
    titlePlaceholder: LocalizedText;
    locationPlaceholder: LocalizedText;
    joinSubtitle: LocalizedText;
    joinDisclaimer: LocalizedText;
    inviteHeadline: LocalizedText;
    rsvpMessageLabel: LocalizedText;
    rsvpAttendingConfirmation: LocalizedText;
    toolsSubtitle: LocalizedText;
    toolsScheduleDescription: LocalizedText;
    toolsPlaylistDescription: LocalizedText;
}

export interface AppEventTypeTranslationDto {
    name: LocalizedText;
    tagline: LocalizedText;
    voice: EventTypeVoicePack;
}

export interface AppTranslationsDto {
    eventTypes: Record<string, AppEventTypeTranslationDto>;
}

export interface PlatformEventTypeResponseDto {
    id: string;
    eventTypeKey: EventTypeConvention;
    name: LocalizedText;
    tagline: LocalizedText;
    icon: string;
    accentToken: EventTypeAccentToken;
    voice: EventTypeVoicePack;
    isEnabled: boolean;
    sortOrder: number;
}

export interface AppRsvpConfigDto {
    minAdults: number;
    maxAdults: number;
    minChildren: number;
    maxChildren: number;
}

// Coverage-window constants — event-coverage-window-fe-integration.md. Added 2026-09-21.
// Constants only; a given event's dates come from the event itself.
export interface AppCoverageConfigDto {
    // Furthest ahead startAt may be scheduled, in days from now (3032 past it).
    maxLeadDays: number;
    // endAt the server fills when a request omits it.
    defaultEventDurationHours: number;
}

// Automated right-of-withdrawal settings — billing-fe-guide.md §9. Added 2026-09-18.
export interface AppWithdrawalConfigDto {
    // Pass back verbatim as ActivationCheckoutRequestDto/UpgradeCheckoutRequestDto's
    // termsVersion; a stale value is a 400 WITHDRAWAL_TERMS_VERSION_STALE.
    termsVersion: string;
    // Statutory withdrawal window, days after payment.
    windowDays: number;
    // How long a HELD withdrawal waits for an admin before it is released automatically.
    holdDays: number;
}

export interface AppContentLimitsDto {
    postContentMaxLength: number;
    commentContentMaxLength: number;
    storyCaptionMaxLength: number;
    wishbookMessageMaxLength: number;
    playlistSuggestionCommentMaxLength: number;
    rsvpNotesMaxLength: number;
    eventDescriptionMaxLength: number;
    eventSessionDescriptionMaxLength: number;
    moderationReasonMaxLength: number;
    reportDescriptionMaxLength: number;
    reportResolutionNotesMaxLength: number;
    catalogDescriptionMaxLength: number;
}

export interface AppRateLimitConfigDto {
    name: string;
    limit: number;
    windowSeconds: number;
}

export type ReportTargetType = 'POST' | 'COMMENT' | 'MEMBER';
export type ReportReason = 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE_CONTENT' | 'IMPERSONATION' | 'OTHER';

export interface AppConfigResponseDto {
    featureFlags: PlatformFeatureFlagResponseDto[];
    media: AppMediaConfigDto;
    pagination: { defaultPageSize: number; maxPageSize: number };
    planTiers: PlanTierResponseDto[];
    paidServices: PaidServiceResponseDto[];
    eventModuleKeys: ModuleKey[];
    modules: PlatformModuleResponseDto[];
    eventTypes: AppEventTypeResponseDto[];
    eventTypeKeys: EventTypeConvention[];
    translations: AppTranslationsDto;
    rsvp: AppRsvpConfigDto;
    withdrawal: AppWithdrawalConfigDto;
    coverage: AppCoverageConfigDto;
    contentLimits: AppContentLimitsDto;
    reactionTypesByEventType: Record<string, ReactionTypeResponseDto[]>;
    rateLimits: AppRateLimitConfigDto[];
    reportTargetTypes: ReportTargetType[];
    reportReasons: ReportReason[];
    newsletter: AppNewsletterConfigDto;
}

// GET /api/config → newsletter (newsletter-fe-integration §6). Describes the
// offer made to whoever subscribes next — an existing reward keeps its own terms.
export interface AppNewsletterConfigDto {
    enabled: boolean;
    discountPercent: number;
    rewardValidityMonths: number;
}

// --- Β§2 Errors ---

export interface ProblemDetail {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance: string;
    // number for GlobalExceptionHandler errors; string ("AUTHENTICATION_REQUIRED" |
    // "ACCESS_DENIED") for the two auth-entrypoint special cases.
    errorCode: number | string;
    errorKey: string;
    errors?: Record<string, string>;
    details?: unknown;
    retryAfterSeconds?: number;
}

// --- §3 Auth ---

export interface AuthResponseDto {
    accessToken: string;
    refreshToken: string | null;
    userId: string;
    email: string | null;
    role: PlatformRole;
    firstName: string | null;
    lastName: string | null;
    profilePictureUrl: string | null;
    authProvider: AuthProvider;
    isGuestAccount: boolean;
    status: AccountStatus;
    createdAt: string;
    // Only set for a guest joining through a shared invite link; null otherwise.
    guestKey: string | null;
}

// What the browser actually gets back from our own /api/auth/* BFF routes —
// same as AuthResponseDto minus refreshToken/guestKey, which never leave the
// server (they live only in the httpOnly cookies those routes set).
export interface AuthSessionDto {
    accessToken: string;
    userId: string;
    email: string | null;
    role: PlatformRole;
    firstName: string | null;
    lastName: string | null;
    profilePictureUrl: string | null;
    authProvider: AuthProvider;
    isGuestAccount: boolean;
    status: AccountStatus;
    createdAt: string;
}

export interface RegisterRequestDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    inviteToken?: string;
    subscribeToNewsletter?: boolean;
}

export interface LoginRequestDto {
    email: string;
    password: string;
    inviteToken?: string;
}

export type OAuthProviderName = 'GOOGLE' | 'APPLE';

export interface OAuthLoginRequestDto {
    idToken: string;
    inviteToken?: string;
}

export interface RefreshRequestDto {
    refreshToken: string;
}

export interface LogoutRequestDto {
    refreshToken: string;
}

// --- §4 Users, Me, Sessions, Notifications ---

// Notifications are produced by backend sweeps/actions; clients can only read,
// mark read, mark all read, and dismiss them.
// BREAKING 2026-09-18: REFUND_APPROVED/REFUND_REJECTED replaced by the three
// WITHDRAWAL_* types — nothing emits the old pair any more (billing-fe-guide §10).
export type BillingNotificationType = 'WITHDRAWAL_REFUNDED' | 'WITHDRAWAL_HELD' | 'WITHDRAWAL_WITHHELD';

export type NotificationCategory = 'LIMIT' | 'OFFER' | 'TIP' | 'SYSTEM' | 'BILLING' | (string & {});
export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

// 2026-09-04: ctaRoute (a literal path) is gone, replaced by ctaTarget + ctaParams — the app
// resolves the route itself. Closed but growable set; treat an unrecognized value defensively.
// See docs/integration guides/notification-cta-target-fe-integration.md.
export type NotificationCtaTarget = 'EVENT_PLAN_SETTINGS' | 'EVENT_GALLERY' | 'EVENT_GUESTS' | 'EVENT_COVERAGE_EXTEND';

export interface NotificationResponseDto {
    id: string;
    recipientMemberId: string | null;
    eventId?: string | null;
    eventTitle?: string | null;
    type: string;
    category?: NotificationCategory | null;
    severity?: NotificationSeverity | null;
    title?: string | null;
    body?: string | null;
    ctaLabel?: string | null;
    ctaTarget?: NotificationCtaTarget | null;
    ctaParams?: Record<string, string>;
    expiresAt?: string | null;
    referenceType: string | null;
    referenceId: string | null;
    payload: Record<string, unknown>;
    readAt: string | null;
    createdAt: string;
    deletedAt: string | null;
}

export interface NotificationUnreadCountDto {
    unreadCount?: number;
    count?: number;
}

export interface SessionResponseDto {
    id: string;
    userId: string;
    ipAddress: string;
    userAgent: string;
    refreshTokenHash: string;
    expiresAt: string;
    createdAt: string;
    revokedAt: string | null;
}

export interface UserRequestDto {
    email?: string;
    authProvider?: AuthProvider;
    isGuestAccount?: boolean;
    status?: AccountStatus;
    platformRole?: PlatformRole;
    eventCreationLocked?: boolean;
}

export interface ProvisionedUserRequestDto {
    email: string;
    firstName: string;
    lastName: string;
}

export interface UserResponseDto {
    id: string;
    email: string | null;
    emailVerified: boolean;
    firstName: string | null;
    lastName: string | null;
    profilePictureUrl: string | null;
    authProvider: AuthProvider;
    isGuestAccount: boolean;
    status: AccountStatus;
    platformRole: PlatformRole;
    eventCreationLocked: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    // Stored preference for anything localized outside a request (notification
    // emails, invitation emails) — independent of Accept-Language. See
    // docs/integration guides/backend-localization-fe-integration.md §5. null = none set.
    locale: Locale | null;
}

export interface MeUpdateRequestDto {
    firstName?: string;
    lastName?: string;
    locale?: Locale;
}

export interface ChangePasswordRequestDto {
    currentPassword: string;
    newPassword: string;
}

// --- §5 Event domain ---

export interface EventRequestDto {
    title: string;
    // Required — there is no free plan to fall back to.
    planTierCode: PlanTierCode;
    // One of the plan's live initialOptions. Required when a host creates an
    // event (400 COVERAGE_OPTION_INVALID without it); optional when an admin
    // provisions one, which then gets the plan's shortest duration.
    coverageOptionId?: string;
    subtitle?: string;
    description?: string;
    eventType: EventTypeConvention;
    visibility: EventVisibility; // required on this DTO despite the entity's DB default of PRIVATE
    startAt: string;
    endAt?: string; // optional — omitted, the server fills startAt + 24h
    timezone: string;
    locationName?: string;
    locationAddress?: string;
    mapsUrl?: string;
    coverMediaId?: string;
    brandingSettings: Record<string, unknown>; // required — send {} if none
    rsvpDeadline?: string;
    initialSessionTitle?: string;
}

export interface AdminProvisionEventRequestDto {
    hostUserId: string;
    event: EventRequestDto;
}

// Returned by GET /api/events (list) and POST /api/events — flat summary shape.
// GET /api/events/{id} returns EventDetailResponseDto instead (see below).
export interface EventResponseDto {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    eventType: EventTypeConvention;
    visibility: EventVisibility;
    startAt: string;
    endAt: string | null;
    coverageEndsAt: string | null; // null while DRAFT; pinned at activation
    projectedCoverage: ProjectedCoverageDto | null; // set while DRAFT, null once ACTIVE
    timezone: string;
    locationName: string | null;
    locationAddress: string | null;
    mapsUrl: string | null;
    coverMediaId: string | null;
    brandingSettings: Record<string, unknown>;
    rsvpDeadline: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    deletionScheduledFor: string | null; // ISO-8601; non-null while a deletion request is pending
    status: EventStatus;
}

export interface EventScheduleDto {
    startAt: string;
    endAt: string | null;
    // Null while DRAFT. Computed once at activation and never moved by later
    // startAt/endAt edits; only a paid upgrade to a longer duration moves it later.
    // Render the coverage window from this, never from startAt/endAt arithmetic.
    coverageEndsAt: string | null;
    // The mirror image: set while DRAFT, null once ACTIVE. Recomputed on every
    // read, so it follows startAt as the host edits the draft. Exactly one of
    // projectedCoverage / coverageEndsAt is non-null on any event.
    projectedCoverage: ProjectedCoverageDto | null;
    timezone: string;
    rsvpDeadline: string | null;
}

// The window a DRAFT event would get if activated at the moment of the request.
export interface ProjectedCoverageDto {
    coverageEndsAt: string;
    hostingMonths: number; // the months of the duration the draft is on
}

export interface EventLocationDto {
    name: string | null;
    address: string | null;
    mapsUrl: string | null;
}

export interface EventRsvpSummaryDto {
    totalMembers: number;
    attending: number;
    declined: number;
    noResponse: number;
}

// Returned by GET /api/events/{id} only (not the list endpoint), added
// 2026-07-30. Everything that scales with event activity — posts, comments,
// reactions, stories, individual media, individual RSVPs, playlist
// suggestions/votes — is intentionally excluded; fetch those from their own
// paginatable endpoints.
export interface EventDetailResponseDto {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    eventType: EventTypeConvention;
    visibility: EventVisibility;
    schedule: EventScheduleDto;
    location: EventLocationDto;
    coverMedia: MediaResponseDto | null; // resolved, with a fresh presigned mediaUrl
    brandingSettings: Record<string, unknown>;
    hosts: EventHostResponseDto[]; // only the primary host when co_hosts is off
    modules: EventModuleResponseDto[];
    sessions: EventSessionResponseDto[] | null; // null when schedule is off
    rsvpSummary: EventRsvpSummaryDto | null; // null when rsvp is off
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    deletionScheduledFor: string | null; // ISO-8601; non-null while a deletion request is pending
    status: EventStatus;
}

export interface CheckoutResponseDto {
    orderId: string;
    redirectUrl: string;
}

// Shared by activation and upgrade checkout — the consent Directive 2011/83/EU
// art. 14(3)/(4)(a) requires before a paid service may begin inside the
// withdrawal window. Both booleans MUST be sent true; termsVersion comes from
// AppConfigResponseDto.withdrawal.termsVersion. Added 2026-09-18 — a body is now
// required on both checkout endpoints, where none was required before.
export interface WithdrawalConsentDto {
    requestsImmediateStart: boolean;
    acknowledgesWithdrawalTerms: boolean;
    termsVersion: string;
}

// POST /api/events/{eventId}/checkout — host, DRAFT only (billing-fe-guide §6).
export interface CheckoutRequestDto extends WithdrawalConsentDto {
    collaborationCode?: string;
}
export interface CollaborationCodePreviewRequestDto {
    collaborationCode: string;
    targetPlanTierCode?: string;
    // Required with targetPlanTierCode since 2026-09-23: the upgrade duration being priced.
    targetCoverageOptionId?: string;
}
export interface CreateEventCodePreviewRequestDto {
    eventType: EventTypeConvention;
    planTierCode: PlanTierCode;
    // Required since 2026-09-23: the code discounts that duration's price.
    coverageOptionId: string;
    collaborationCode: string;
}
export interface CollaborationCodePreviewResponseDto {
    label: string;
    discountPercent: number;
    combinedDiscountPercent: number;
    payableAmountMinor: number;
    currency: string;
}
export interface PartnerPortalTotalDto {
    currency: string;
    accruedMinor: number;
    paidMinor: number;
}
export interface PartnerPortalResponseDto {
    name: string;
    eventsReferred: number;
    totals: PartnerPortalTotalDto[];
}
export type CollaboratorStatus = 'ACTIVE' | 'SUSPENDED';
export type CollaborationCodeStatus = 'ACTIVE' | 'DISABLED';
export type CollaborationEarningEntryType = 'ACCRUAL' | 'CLAWBACK';
export type CollaborationEarningStatus = 'ACCRUED' | 'PAID' | 'REVERSED';
export interface CollaboratorRequestDto {
    name: string;
    contactEmail: string;
    notes: string | null;
    status: CollaboratorStatus | null;
}
export interface CollaboratorResponseDto {
    id: string;
    name: string;
    contactEmail: string;
    status: CollaboratorStatus;
    portalTokenIssued: boolean;
    portalTokenIssuedAt: string | null;
    notes: string | null;
}
export interface CollaboratorPortalTokenResponseDto {
    token: string;
    portalUrl: string;
}
// Which events a code may be redeemed against. Keys and plan codes, never ids.
// An empty array means every event type / every plan, not none. On PATCH both
// replace the stored sets wholesale, so an edit must send the current values back.
export interface CodeRestrictionsDto {
    eventTypeKeys: string[];
    planTierCodes: string[];
}
export interface CollaborationCodeRequestDto extends CodeRestrictionsDto {
    code: string;
    label: string;
    discountPercent: number;
    commissionPercent: number;
    startsAt: string | null;
    endsAt: string | null;
    maxRedemptions: number | null;
}
export interface CollaborationCodePatchDto extends Omit<CollaborationCodeRequestDto, 'code'> {
    status: CollaborationCodeStatus;
}
export interface CollaborationCodeResponseDto extends CollaborationCodeRequestDto {
    id: string;
    collaboratorId: string;
    status: CollaborationCodeStatus;
    liveRedemptions: number;
}
export interface DiscountCodeRequestDto extends CodeRestrictionsDto {
    code: string;
    label: string;
    discountPercent: number;
    startsAt: string | null;
    endsAt: string | null;
    maxRedemptions: number | null;
}
export interface DiscountCodePatchDto extends Omit<DiscountCodeRequestDto, 'code'> {
    status: CollaborationCodeStatus;
}
export interface DiscountCodeResponseDto extends DiscountCodeRequestDto {
    id: string;
    status: CollaborationCodeStatus;
    liveRedemptions: number;
}
export interface LinkDiscountCodeRequestDto {
    discountCodeId: string;
    commissionPercent: number;
}
export interface CollaborationEarningResponseDto {
    id: string;
    eventId: string;
    orderId: string;
    codeId: string;
    entryType: CollaborationEarningEntryType;
    amountMinor: number;
    currency: string;
    commissionPercent: number;
    basisAmountMinor: number;
    status: CollaborationEarningStatus;
    accruedAt: string;
    paidAt: string | null;
    payoutReference: string | null;
}
export interface CollaborationEarningsTotalDto {
    currency: string;
    accruedMinor: number;
    paidMinor: number;
}
export interface MarkCollaborationEarningsPaidRequestDto {
    earningIds: string[];
    payoutReference: string;
}
export interface VoidCollaborationRedemptionRequestDto {
    reason: string;
}
// POST /api/events/{eventId}/upgrade-checkout — host, ACTIVE only (billing-fe-guide §7d).
export interface UpgradeCheckoutRequestDto extends WithdrawalConsentDto {
    planTierCode: PlanTierCode;
    // Required since 2026-09-23: one of that plan's options[].coverageOptionId.
    coverageOptionId: string;
}
// POST /api/events/{eventId}/extension-checkout — primary host, ACTIVE only
// (coverage-options-and-extensions-fe-integration.md §11). Never discounted.
// The consent fields may be omitted only by a VIES-confirmed business buyer.
export interface ExtensionCheckoutRequestDto {
    // One of GET extension-options' coverageOptionId.
    coverageOptionId: string;
    requestsImmediateStart?: boolean;
    acknowledgesWithdrawalTerms?: boolean;
    termsVersion: string;
}
// GET /api/events/{eventId}/extension-options — every extension the event's plan
// sells, priced as the checkout would charge it now. Empty: the plan sells none.
export interface ExtensionOptionResponseDto {
    coverageOptionId: string;
    months: number;
    // The option's list price: never discounted.
    amountMinor: number;
    currency: string;
    // Where coverage would end if this settled now. An estimate: the real span is
    // fixed when the payment settles.
    resultingCoverageEndsAt: string;
    // Exactly what the checkout will pin: one COVERAGE_EXTENSION item.
    breakdown: PriceBreakdown;
}

// --- Price breakdown (withdrawal compliance phase 4, 2026-09-24) ---
// Every field is always sent; nullable ones are sent as null, never left out.
export type BuyerType = 'CONSUMER' | 'BUSINESS';
export type PriceItemCode = 'ACTIVATION' | 'EVENT_DAY' | 'COVERAGE' | 'ADDON' | 'STORAGE_PACK' | 'COVERAGE_EXTENSION';
export type WithdrawalRule = 'RETAINED_ONCE_STARTED' | 'RETAINED_ONCE_PERFORMED' | 'PRO_RATA_BY_TIME' | 'BUSINESS_NO_RIGHT';
export type DiscountSource = 'PLAN_PROMOTION' | 'CODE';

export interface PriceBreakdown {
    kind: OrderKind;
    currency: string;
    buyerType: BuyerType;
    coverage: PriceBreakdownCoverage;
    items: PriceBreakdownItem[];
    discounts: PriceBreakdownDiscount[];
    combinedDiscountPercent: number;
    discountCapPercent: number;
    capApplied: boolean;
    listTotalMinor: number;
    discountTotalMinor: number;
    totalMinor: number;
    vat: PriceBreakdownVat;
    termsVersion: string;
    withdrawal: PriceBreakdownWithdrawal;
}
export interface PriceBreakdownCoverage {
    optionId: string;
    months: number | null;
    monthsAdded: number | null;
    endsAt: string | null;
    endsAtProjected: boolean;
}
export interface PriceBreakdownItem {
    code: PriceItemCode;
    labelKey: string;
    name: string;
    listMinor: number;
    discountMinor: number;
    priceMinor: number;
    withdrawal: WithdrawalRule;
    performedAt: string | null;
    months: number | null;
    monthsAdded: number | null;
    paidServiceCode: string | null;
    planTierCode: string | null;
    storageBytes: number | null;
}
export interface PriceBreakdownDiscount {
    source: DiscountSource;
    label: string | null;
    percent: number;
}
export interface PriceBreakdownVat {
    included: boolean;
    note: string;
}
export interface PriceBreakdownWithdrawal {
    available: boolean;
    windowDays: number;
    windowClosesAt: string | null;
}

// One duration a paid event can move to on the target plan: at least as long as
// the event's own, and dearer than it.
export interface UpgradeCoverageOptionDto {
    coverageOptionId: string;
    months: number;
    // How far the upgrade moves coverageEndsAt; 0 for a same-length upgrade.
    monthsAdded: number;
    // Undiscounted gap between the two durations' prices. Strike-through display only.
    gapAmountMinor: number;
    // What upgrade-checkout will actually charge for this duration.
    payableAmountMinor: number;
}
// GET /api/events/{eventId}/upgrade-options — one entry per target plan since
// 2026-09-23. options is never empty; a plan with no eligible duration is left out.
export interface UpgradeOptionResponseDto {
    planTierCode: PlanTierCode;
    planTierName: string;
    currency: string;
    options: UpgradeCoverageOptionDto[];
    // The target plan's own promotion — the only discount an upgrade gets since
    // 2026-09-22 (a discount code prices the activation only). Sent as null, not
    // left out, when the target has no live promotion.
    discountPercent: number | null;
    // null whenever discountPercent is, and also for a promotion set up without a label.
    discountLabel: string | null;
}
export type OrderKind = 'ACTIVATION' | 'UPGRADE' | 'STORAGE_PACK' | 'EXTENSION';
// REFUNDED: the order was paid and the money went back (a withdrawal or a lost dispute).
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export interface OrderSummaryDto {
    id: string;
    kind: OrderKind;
    status: OrderStatus;
    amountMinor: number | null;
    addonAmountMinor: number | null;
    currency: string | null;
    paidAt: string | null;
    createdAt: string;
    // Added 2026-09-18 — the three-line withdrawal split (billing-fe-guide.md §8/§9),
    // summing to amountMinor. Present on every order kind but only meaningful on
    // ACTIVATION/UPGRADE.
    setupAmountMinor: number | null;
    eventDayAmountMinor: number | null;
    hostingAmountMinor: number | null;
    // Added 2026-09-23: the months of coverage this order bought (null when it
    // bought none), and on an UPGRADE how far it moved coverageEndsAt.
    coverageMonths: number | null;
    coverageMonthsAdded: number | null;
    // Added 2026-09-24: the span this order's coverage covers. On an EXTENSION,
    // the months it bought. Null on a storage pack, an unpaid order, or one that
    // applied nothing. The event's live end is its own coverageEndsAt, not these.
    coverageStartsAt: string | null;
    coverageEndsAt: string | null;
}
export interface EventAddonDto {
    code: string;
    name: string;
    // What this cost when bought.
    priceAmountMinor: number;
    billingPeriod: BillingPeriod;
    activatedAt: string;
}

export interface EventAddonRequestDto {
    paidServiceCode: string;
}
// The code the event's activation was priced with. A record of that purchase,
// not a standing rate — no upgrade or storage pack reads it. Carries the label
// the code's owner chose, never the raw code or who the partner is.
export interface DiscountSummaryDto {
    label: string;
    // Snapshot at redemption, not the code's current rate.
    discountPercent: number | null;
    appliedAt: string;
}
export interface EventBillingResponseDto {
    eventStatus: EventStatus;
    planTierCode: string;
    planTierName: string;
    // The duration the event is on (added 2026-09-23). The event response
    // doesn't carry it, so this is where a draft's picker reads it from.
    coverageOptionId: string;
    coverageMonths: number;
    orders: OrderSummaryDto[];
    addons: EventAddonDto[];
    discount: DiscountSummaryDto | null;
}

// --- Withdrawal (billing-fe-guide.md §9) — replaces the old admin-approved refund flow ---

export type WithdrawalStatus = 'REFUSED' | 'HELD' | 'REFUNDED' | 'WITHHELD';
// 'PENDING' | 'APPROVED' | 'REJECTED' also exist on legacy rows migrated before this
// flow shipped; treat any status outside the four above as read-only history, never
// producible by a new request.

export type RefundBasis = 'CONSENTED_PRO_RATA' | 'NO_CONSENT_FULL_REFUND';

export interface WithdrawalRefusal {
    code: string;
    message: string; // show verbatim
    detail: string | null;
}

export interface WithdrawalLine {
    orderId: string;
    orderKind: OrderKind;
    basis: RefundBasis;
    hostingStart: string | null;
    hostingEnd: string | null;
    usedSeconds: number | null;
    totalSeconds: number | null;
    eventPerformed: boolean;
    refundMinor: number;
    providerRefunded: boolean;
    components: Record<string, unknown>; // display-only breakdown; shape not enumerated by the guide
}

// GET /api/events/{eventId}/withdrawal-preview — host. Nothing persisted; safe to
// call/poll any time the withdrawal screen is open.
export interface WithdrawalPreviewResponseDto {
    eligible: boolean;
    refusals: WithdrawalRefusal[];
    // The first instant withdrawal is no longer possible: the end of the 14th day
    // after payment, Athens time (end of Monday when that day is a weekend).
    // Null, like currency, when there is no settled activation.
    windowClosesAt: string | null;
    totalRefundMinor: number;
    currency: string | null;
    lines: WithdrawalLine[];
    // True when the event's startAt was moved after payment, which forces a HELD
    // outcome. False promises nothing: other, undisclosed reasons can hold a request.
    scheduleMovedAfterPayment: boolean;
}

// POST /api/events/{eventId}/withdrawals — host. 201 with this shape when the
// outcome is REFUNDED or HELD; a REFUSED outcome is instead a 409
// WITHDRAWAL_REFUSED with the standard error envelope, NOT this shape — read
// structured refusal reasons from WithdrawalPreviewResponseDto instead.
export interface WithdrawalResponseDto {
    id: string;
    eventId: string;
    status: WithdrawalStatus;
    reason: string | null;
    createdAt: string;
    decidedAt: string | null;
    decisionNote: string | null;
    holdUntil: string | null;
    totalRefundMinor: number | null;
    currency: string | null;
    refusals: WithdrawalRefusal[];
    lines: WithdrawalLine[];
}

export interface WithdrawalRequestDto {
    reason?: string; // max 1000 chars, optional
}

// --- Admin withdrawal operations (billing-fe-guide §9/§13) ---

export interface WithdrawalFraudSignalDto {
    code: string;
    fired: boolean;
    observed: string | null;
    threshold: string | null;
}

// GET /api/admin/withdrawals — admin. The facts sheet behind each HELD request.
export interface WithdrawalAdminDto {
    request: WithdrawalResponseDto;
    usageFacts: Record<string, unknown>; // display-only; shape not enumerated by the guide
    fraudSignals: WithdrawalFraudSignalDto[]; // every signal evaluated, fired or not — show them all
    recommendation: string; // generated plain text, render as-is
}

// POST /api/admin/withdrawals/{id}/withhold — admin. note is required.
export interface WithdrawalWithholdRequestDto {
    note: string; // max 1000 chars
}

export interface PlatformMetricsResponseDto {
    totalUsers: number;
    activeUsers: number;
    usersByAccountPlan: Record<string, number>;
    totalEvents: number;
    activeEvents: number;
    eventsByStatus: Record<string, number>;
    eventsByPlanTier: Record<string, number>;
    storage: PlatformStorageMetricsDto;
    newsletter: PlatformNewsletterMetricsDto;
}

export interface PlatformNewsletterMetricsDto {
    pending: number;
    confirmed: number;
    unsubscribed: number;
    rewardsIssued: number;
}

export interface PlatformStorageMetricsDto {
    usedBytes: number;
    pendingPurgeBytes: number;
    committedBytes: number;
    paidUsedBytes: number;
    freeUsedBytes: number;
    purchasedExtraBytes: number;
    estimatedMonthlyCostMinor: number;
    costCurrency: string;
}

export interface EventDashboardRowDto {
    eventId: string;
    planTierCode: string;
    eventType: string;
    startAt: string;
    storageQuotaBytes: number | null;
    guestQuotaMax: number | null;
}

export interface CalendarDaySummaryDto {
    date: string;
    eventCount: number;
    planMix: Record<string, number>;
    storageBytesTotal: number;
    guestCapTotal: number;
    hasUnlimitedStorageQuota: boolean;
    hasUnlimitedGuestCap: boolean;
}

export interface CalendarLoadThresholdsDto {
    lowMax: number;
    mediumMax: number;
    highMax: number;
}

export interface CalendarSummaryResponseDto {
    days: CalendarDaySummaryDto[];
    thresholds: CalendarLoadThresholdsDto;
}

// Volume only — the backend dropped the estimated cost fields (cost-tracking-fe-integration.md §4).
export interface PlanTimelineRowDto {
    planTierCode: string;
    weekStart: string;
    eventCount: number;
}

export interface ProviderActualDto {
    provider: string;
    periodStart: string;
    periodEnd: string;
    amountMinor: number | null;
    currency: string | null;
    detail: Record<string, unknown>;
    fetchedAt: string;
}

// Only reconciled providers — one that never reconciled is absent, not zero.
export interface CostSummaryResponseDto {
    providerActuals: ProviderActualDto[];
}

export type QrTargetType = 'EVENT_JOIN' | 'MEDIA_UPLOAD' | 'INVITATION';
export type QrLinkStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'TARGET_UNAVAILABLE';

export interface QrLinkRequestDto {
    targetType: QrTargetType;
    targetId?: string;
    maxGuests?: number;
    label?: string;
    metadata?: Record<string, unknown>;
    expiresAt?: string;
}

export interface QrLinkPatchDto {
    targetType?: QrTargetType;
    targetId?: string;
    maxGuests?: number;
    label?: string;
    metadata?: Record<string, unknown>;
    expiresAt?: string;
}

export interface QrLinkResponseDto {
    id: string;
    eventId: string;
    token: string;
    publicUrl: string;
    targetType: QrTargetType;
    targetId: string | null;
    status: QrLinkStatus;
    maxGuests: number | null;
    label: string | null;
    labelKey: string | null;
    metadata: Record<string, unknown>;
    autoGenerated: boolean;
    expiresAt: string | null;
    revokedAt: string | null;
    createdByUserId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface EventStreamTokenDto {
    token: string;
    expiresInMs: number;
}

export interface QrLinkStatsDto {
    qrLinkId: string;
    label: string | null;
    labelKey: string | null; // same contract as QrLinkResponseDto.labelKey
    targetType: QrTargetType;
    status: QrLinkStatus;
    joinCount: number;
    maxGuests: number | null;
    remainingSlots: number | null;
    lastJoinedAt: string | null;
    uploadCount: number;
}

export interface QrLinkResolutionDto {
    status: QrLinkStatus;
    targetType: QrTargetType;
    eventId?: string;
    eventTitle?: string;
    eventSubtitle?: string | null;
    coverMediaId?: string | null;
    // Read the cover from here: the scanner isn't a member, so GET /api/medias/{id} refuses them.
    coverMedia?: MediaResponseDto | null;
    eventStatus?: EventStatus;
    inviteToken?: string;
    requiresAuth?: boolean;
    requiresGuestKey?: boolean;
}

// provider + providerEventId identify a delivery; there is no separate id.
export interface UnprocessedWebhookDto {
    provider: string;
    providerEventId: string;
    eventType: string;
    receivedAt: string;
    // False only for deliveries stored before bodies were kept — those need a human.
    replayable: boolean;
}

export type NotificationSweepResponseDto = Record<string, number>;

export interface EventPatchDto {
    title?: string;
    subtitle?: string;
    description?: string;
    visibility?: EventVisibility;
    startAt?: string;
    endAt?: string;
    timezone?: string;
    locationName?: string;
    locationAddress?: string;
    mapsUrl?: string;
    coverMediaId?: string;
    brandingSettings?: Record<string, unknown>;
    rsvpDeadline?: string;
    // DRAFT only: switches the draft to another of its plan's durations.
    // Sending the current one back is a no-op. (keepOriginals was removed
    // 2026-09-23; sending it is a 400.)
    coverageOptionId?: string;
}

export interface EventDeletionRequestDto {
    otpCode: string;
}

export interface CoHostInviteRequestDto {
    userId: string;
}

export interface EventHostRequestDto {
    eventId: string;
    memberId: string;
    displayOrder: number;
}

export interface EventHostResponseDto {
    id: string;
    eventId: string;
    memberId: string;
    displayOrder: number;
    createdAt: string;
}

export interface EventHostPatchDto {
    displayOrder?: number;
}

export interface EventInvitationRequestDto {
    eventId: string;
    inviteCode: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    maxGuests: number;
    expiresAt?: string;
    // inviteToken and usedAt are server-managed; sending either is a 400.
}

export interface EventInvitationResponseDto {
    id: string;
    eventId: string;
    inviteCode: string;
    inviteToken: string; // server generates a UUID if omitted on write — always present on read
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    maxGuests: number;
    expiresAt: string | null;
    usedAt: string | null;
    createdAt: string;
    role: EventRole;
}

export interface CoHostInvitationRequestDto {
    email: string;
    firstName?: string;
    lastName?: string;
    expiresAt?: string;
}

export interface EventGiftAccountRequestDto {
    iban: string;
    accountHolder: string;
    bankName: string;
    note?: string;
}

export interface EventGiftAccountResponseDto {
    id: string;
    eventId: string;
    iban: string;
    accountHolder: string;
    bankName: string;
    note: string | null;
    updatedAt: string;
}

export interface WishbookEntryRequestDto {
    message: string;
    guestName?: string;
}

export interface WishbookEntryResponseDto {
    id: string;
    eventId: string;
    authorMemberId: string | null;
    guestName: string;
    message: string;
    createdAt: string;
    canDelete: boolean;
}

// GET /api/event-invitations/{inviteToken}/preview — public, unauthenticated.
// Powers the per-event invite onboarding page; expired/alreadyUsed are not
// errors, they're states to render (a used single-use slot doesn't imply the
// current visitor is the one who used it).
export interface EventInvitationPreviewDto {
    inviteToken: string;
    eventId: string;
    eventTitle: string;
    eventSubtitle: string | null;
    eventDescription: string | null;
    coverMediaId: string | null;
    // Read the cover from here: the visitor isn't a member, so GET /api/medias/{id} refuses them.
    coverMedia: MediaResponseDto | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    expired: boolean;
    alreadyUsed: boolean;
}

export interface EventInvitationPatchDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    maxGuests?: number;
    expiresAt?: string;
}

export interface EventMemberRequestDto {
    eventId: string;
    userId?: string;
    invitationId?: string;
    role: EventRole;
    displayName: string;
    nickname?: string;
    relationshipRole?: string;
    customRelationshipRole?: string;
    isFeatured?: boolean; // optional on the wire — defaults to false server-side
    joinedAt: string;
}

export interface EventMemberResponseDto {
    id: string;
    eventId: string;
    userId: string | null;
    invitationId: string | null;
    role: EventRole;
    displayName: string;
    nickname: string | null;
    relationshipRole: string | null;
    customRelationshipRole: string | null;
    isFeatured: boolean;
    avatarUrl: string | null;
    joinedAt: string;
    rsvpId: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface EventMemberPatchDto {
    displayName?: string;
    nickname?: string;
    relationshipRole?: string;
    customRelationshipRole?: string;
    isFeatured?: boolean;
}

// isEnabled and configuration follow the event's plan and MODULE_UNLOCKs;
// hosts can't change them. See plan-owned-modules-fe-integration.md.
export interface EventModuleResponseDto {
    id: string;
    eventId: string;
    moduleKey: ModuleKey;
    isEnabled: boolean;
    configuration: Record<string, unknown> | null;
    createdAt: string;
    isAvailable: boolean;
}

// `EventModuleResponseDto.configuration` is untyped on the wire (it's a free-form
// JSON blob per module). Known per-moduleKey shapes go here so callers can cast
// to something typed instead of reaching into `Record<string, unknown>` by hand.
// See event-type-feature-toggles-quotas-fe-integration.md §2.
export interface GalleryModuleConfiguration {
    qrUploadEnabled: boolean;
}

// GET /api/event-types/{eventTypeKey}/modules — the event type's own module
// defaults, fetched live (not copied onto the event, not cached across it).
// See event-type-feature-toggles-quotas-fe-integration.md §3: `defaultConfig`
// is where a module's quota/cap for that event type lives (e.g. `maxSections`
// for `schedule`) when the cap isn't a per-event `EventModule.configuration`
// value. `applicability` mirrors the admin event-type/module registry
// (event-lifecycle-locks-and-event-types-fe-integration.md).
// DEFAULT_ON only means "this event type supports the module"; whether it is
// on for an event is the plan's call.
export type EventTypeModuleApplicability = 'UNSUPPORTED' | 'DEFAULT_ON';

export interface EventTypeModuleResponseDto {
    eventTypeKey: EventTypeConvention;
    moduleKey: ModuleKey;
    applicability: EventTypeModuleApplicability;
    defaultConfig: Record<string, unknown>;
    sortOrder: number;
    // Only non-null when the call passed `planTierCode`: true if that plan
    // covers the module, false if it would need a MODULE_UNLOCK/upgrade, null
    // ("unknown yet") when no planTierCode was given. See
    // event-lifecycle-locks-and-event-types-fe-integration.md §3.
    includedInPlan: boolean | null;
}

// PATCH /api/admin/event-types/{eventTypeKey}/modules/{moduleKey} — every field
// optional. `defaultConfig` here is only the seed template for new per-plan
// rows; a plan's live value is PlanTierModuleConfigDto below. See
// event-lifecycle-locks-and-event-types-fe-integration.md "Admin: editing the matrix".
export interface EventTypeModulePatchDto {
    applicability?: EventTypeModuleApplicability;
    defaultConfig?: Record<string, unknown>;
    sortOrder?: number;
}

// GET /api/admin/plan-tiers/{planTierId}/modules — one row per module the
// plan's event type supports. Runtime source of truth for per-plan module
// config (plan-tiers-by-event-type-fe-integration.md §6).
export interface PlanTierModuleConfigDto {
    moduleKey: ModuleKey;
    defaultConfig: Record<string, unknown>;
}

// PATCH /api/admin/plan-tiers/{planTierId}/modules/{moduleKey}
export interface PlanTierModuleConfigPatchDto {
    defaultConfig: Record<string, unknown>;
}

export interface EventSessionRequestDto {
    eventId: string;
    title: string;
    description?: string;
    startAt?: string;
    endAt?: string;
    locationName?: string;
    mapsUrl?: string;
    displayOrder: number;
    isSecondary?: boolean; // defaults to false; at most one non-deleted session per event
    rsvpEnabled?: boolean; // defaults to false; guests may answer for this session only when true
}

export interface EventSessionResponseDto {
    id: string;
    eventId: string;
    title: string;
    description: string | null;
    startAt: string | null;
    endAt: string | null;
    locationName: string | null;
    mapsUrl: string | null;
    displayOrder: number;
    isMain: boolean; // system-managed, read-only — set only via initialSessionTitle at event creation
    isSecondary: boolean;
    rsvpEnabled: boolean;
    createdAt: string;
    deletedAt: string | null;
}

export interface EventSessionPatchDto {
    title?: string;
    description?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    locationName?: string;
    mapsUrl?: string | null;
    displayOrder?: number;
    isSecondary?: boolean;
    rsvpEnabled?: boolean;
}

export interface RsvpRequestDto {
    eventMemberId: string;
    attendanceStatus: AttendanceStatus;
    phone?: string;
    adultCount: number;
    childCount: number;
    notes?: string;
    submittedAt: string;
}

export interface RsvpPlusOnes {
    adultCount: number;
    childCount: number;
}

export interface RsvpResponseDto {
    id: string;
    eventMemberId: string;
    attendanceStatus: AttendanceStatus;
    phone: string | null;
    adultCount: number;
    childCount: number;
    notes: string | null;
    submittedAt: string;
    updatedAt: string;
}

export interface RsvpPatchDto {
    attendanceStatus?: AttendanceStatus;
    phone?: string;
    adultCount?: number;
    childCount?: number;
    notes?: string;
}

export interface RsvpSessionResponsRequestDto {
    rsvpId: string;
    eventSessionId: string;
    isAttending: boolean;
}

export interface RsvpSessionResponsResponseDto extends RsvpSessionResponsRequestDto {
    id: string;
    createdAt: string;
}

// PATCH /api/rsvp-session-responses/{id} — same checks as create.
export interface RsvpSessionResponsPatchDto {
    isAttending: boolean;
}

// --- §6 Media domain ---

export interface MediaResponseDto {
    id: string;
    eventId: string;
    uploaderMemberId: string | null;
    anonymousUploaderName: string | null;
    storageKey: string;
    mediaUrl: string;
    status: MediaStatus;
    thumbnailUrl: string | null;
    originalFilename: string;
    mimeType: string;
    mediaType: MediaTypeConvention;
    fileSize: number;
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
    metadata: MediaMetadata;
    createdAt: string;
    deletedAt: string | null;
}

// Rows uploaded before 2026-09-24 may lack uploadContext; the backend treats
// those as GALLERY.
export interface MediaMetadata {
    uploadContext?: MediaUploadContext;
    [key: string]: unknown;
}

export interface MediaBatchFailedItemDto {
    filename: string;
    errorCode: string;
    message: string;
}

export interface MediaBatchUploadResponseDto {
    created: MediaResponseDto[];
    failed: MediaBatchFailedItemDto[];
}

export interface MediaArchivePartDto {
    part: number;
    itemCount: number;
    sizeBytes: number;
}

export interface MediaArchiveManifestDto {
    variant: MediaArchiveVariant;
    originalsAvailable: boolean;
    photoCount: number;
    videoCount: number;
    displayTotalBytes: number;
    originalTotalBytes: number;
    itemsWithoutOriginal: number;
    parts: MediaArchivePartDto[];
}

export interface QuotaExceededDetails {
    planCode: PlanTierCode;
    used: number;
    limit: number;
    incomingBytes?: number;
}

export interface EventUsageResponseDto {
    eventId: string;
    planTier: PlanTierCode;
    storageBytes: number;
    planStorageBytes: number | null;
    extraStorageBytes: number;
    storageLimitBytes: number | null;
    storagePercent: number;
    memberCount: number;
    memberLimit: number | null;
    memberPercent: number;
}

// POST /api/events/{eventId}/storage-checkout — host, ACTIVE only (billing-fe-guide §7b).
// Consent required since 2026-09-23, when storage packs became withdrawable.
export interface StorageCheckoutRequestDto extends WithdrawalConsentDto {
    paidServiceCode: string;
}

export interface OriginalMediaUrlDto {
    url: string;
}

export interface PostRequestDto {
    eventId: string;
    authorMemberId?: string;
    type: PostType;
    content?: string;
    isPinned: boolean; // required — no server-side default
    mediaIds?: string[];
}

// PATCH /api/posts/{id} — only content and isPinned are editable post-creation.
// PATCH semantics: an omitted (or null) field is left unchanged, not cleared.
export interface PostPatchRequestDto {
    content?: string | null;
    isPinned?: boolean | null;
}

// Embedded on PostResponseDto — null when the post has no author (rare,
// media-only import) or the authoring member has since left the event
// (Post.authorMember uses ON DELETE SET NULL, so the post survives but
// authorship is dropped).
export interface AuthorDto {
    memberId: string;
    displayName: string;
    nickname: string | null;
    role: EventRole;
    avatarUrl: string | null;
}

export interface PostResponseDto {
    id: string;
    eventId: string;
    authorMemberId: string | null;
    author: AuthorDto | null;
    type: PostType;
    content: string | null;
    isPinned: boolean;
    // Already ordered by displayOrder and URL-resolved — render as-is.
    media: MediaResponseDto[];
    commentCount: number;
    // The post's 2 most recent comments (across the whole thread, not just
    // top-level), oldest-first, for a lightweight feed-row preview — see
    // docs/integration guides/post-recent-comments-preview-fe-integration.md.
    // Never null; stale until the feed page is refetched; not meant for
    // thread reconstruction (use GET /api/posts/{postId}/comments for that).
    recentComments: CommentResponseDto[];
    reactionCount: number;
    reactionCounts: Record<string, number>;
    myReactionType: string | null;
    // Optional compatibility field for backends that include the lookup key
    // directly on single-post responses. Event-scoped screens can derive it
    // from the active event instead.
    eventType?: EventTypeConvention;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface CommentRequestDto {
    postId: string;
    authorMemberId?: string;
    parentCommentId?: string;
    content: string;
}

export interface CommentResponseDto {
    id: string;
    postId: string;
    authorMemberId: string | null;
    author: AuthorDto | null;
    parentCommentId: string | null;
    content: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface ReactionRequestDto {
    postId: string;
    memberId: string;
    reactionType: string;
}

export interface ReactionResponseDto extends ReactionRequestDto {
    id: string;
    createdAt: string;
}

export interface StoryRequestDto {
    eventId: string;
    authorMemberId?: string;
    mediaId: string;
    caption?: string;
    songUrl?: string;
    // Optional — omit to let the server default to createdAt + 24h.
    expiresAt?: string;
}

export interface StoryResponseDto {
    id: string;
    eventId: string;
    authorMemberId: string | null;
    author: AuthorDto | null;
    mediaId: string;
    caption: string | null;
    songUrl: string | null;
    expiresAt: string;
    createdAt: string;
    deletedAt: string | null;
    // Whether the requesting member has already POSTed a view for this story.
    viewedByCurrentUser: boolean;
}

export interface StoryBatchFailureDto {
    mediaId: string;
    errorCode: string;
    message: string;
}

export interface StoryBatchCreateResponseDto {
    created: StoryResponseDto[];
    failed: StoryBatchFailureDto[];
}

export interface StoryViewResponseDto {
    id: string;
    storyId: string;
    memberId: string;
    createdAt: string;
}

export interface PlaylistSuggestionRequestDto {
    eventId: string;
    title: string;
    artist?: string;
    youtubeUrl?: string;
    spotifyUrl?: string;
    comment?: string;
}

export type PlaylistVoteType = 'UPVOTE' | 'DOWNVOTE';

export interface PlaylistSuggestionResponseDto {
    id: string;
    eventId: string;
    authorMemberId: string | null;
    title: string;
    artist: string | null;
    youtubeUrl: string | null;
    spotifyUrl: string | null;
    comment: string | null;
    upvoteCount: number;
    downvoteCount: number;
    myVote: PlaylistVoteType | null;
    createdAt: string;
    deletedAt: string | null;
}

export interface PlaylistVoteRequestDto {
    playlistSuggestionId: string;
    voteType: PlaylistVoteType;
}

export interface PlaylistVoteResponseDto extends PlaylistVoteRequestDto {
    id: string;
    memberId: string;
    createdAt: string;
}

export interface PlaylistSuggestionLeaderboardDto extends Omit<PlaylistSuggestionResponseDto, 'myVote'> {
    rank: number;
}

export interface PostMediaRequestDto {
    postId: string;
    mediaId: string;
    displayOrder: number;
}

export interface PostMediaResponseDto extends PostMediaRequestDto {
    id: string;
    createdAt: string;
}

// --- §7 Admin / moderation ---

export interface AuditLogRequestDto {
    eventId?: string;
    actorMemberId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    changes: Record<string, unknown>;
    ipAddress?: string;
}

export interface AuditLogResponseDto {
    id: string;
    eventId: string | null;
    actorMemberId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    changes: Record<string, unknown>;
    ipAddress: string | null;
    createdAt: string;
}

export interface ModerationActionRequestDto {
    eventId: string;
    moderatorMemberId?: string;
    targetType: string;
    targetId: string;
    actionType: string;
    reason?: string;
}

export interface ModerationActionResponseDto {
    id: string;
    eventId: string;
    moderatorMemberId: string | null;
    targetType: string;
    targetId: string;
    actionType: string;
    reason: string | null;
    createdAt: string;
}

export interface ReportRequestDto {
    reporterMemberId?: string;
    eventId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    description?: string;
    status?: string;
    reviewedByMemberId?: string;
    reviewedAt?: string;
    resolutionNotes?: string;
}

export interface ReportResponseDto {
    id: string;
    reporterMemberId: string | null;
    eventId: string;
    targetType: string;
    targetId: string;
    reason: string;
    description: string | null;
    status: string | null; // set by moderators only, defaults to "OPEN" server-side
    reviewedByMemberId: string | null;
    reviewedAt: string | null;
    resolutionNotes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TelemetryEventRequestDto {
    eventName: string;
    userId?: string;
    eventId?: string;
    memberId?: string;
    sessionId?: string;
    platform?: string;
    ipAddress?: string;
    userAgent?: string;
    payload: Record<string, unknown>;
}

export interface TelemetryEventResponseDto {
    id: string;
    eventName: string;
    userId: string | null;
    eventId: string | null;
    memberId: string | null;
    sessionId: string | null;
    platform: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    payload: Record<string, unknown>;
    createdAt: string;
}

export interface PlatformFeatureFlagRequestDto {
    featureKey: string;
    description?: string;
    isEnabled: boolean;
    configuration: Record<string, unknown>;
}

export interface PlatformFeatureFlagResponseDto {
    id: string;
    featureKey: string;
    description: string | null;
    isEnabled: boolean;
    configuration: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface PlanTierRequestDto {
    code: PlanTierCode;
    scope: PlanScope;
    name: string;
    description?: string | null;
    sortOrder: number;
    isDefault: boolean;
    isAssignable: boolean;
    isPublic: boolean;
    storageBytes?: number | null;
    maxMembers?: number | null;
    // ACCOUNT scope only: an EVENT plan is priced by its coverage options, and
    // sending a price for one is a 400 INVALID_PLAN_TIER_SCOPE.
    priceAmountMinor?: number | null;
    priceCurrency?: string | null;
    billingPeriod?: BillingPeriod | null;
    discountPercent?: number | null;
    discountLabel?: string | null;
    discountStartsAt?: string | null;
    discountEndsAt?: string | null;
    // Required (must match a registered, enabled event type) when scope is
    // EVENT; must be omitted entirely when scope is ACCOUNT. Confirmed against
    // PlanTierService#requireEventTypeCoherentWithScope.
    eventTypeKey?: EventTypeConvention;
}

export type PlanTierPatchDto = Partial<Omit<PlanTierRequestDto, 'code' | 'scope' | 'eventTypeKey'>>;

// POST /api/admin/plan-tiers/{id}/duplicate — clones storage/quotas/moduleKeys
// and every coverage option (retired ones included) from the source plan into
// one or more new plans for other event types in a single call. See
// plan-tiers-by-event-type-fe-integration.md §5.
export interface PlanTierDuplicateRequestDto {
    clones: Array<{
        eventTypeKey: EventTypeConvention;
        code: PlanTierCode;
        name?: string;
        description?: string | null;
    }>;
}

export interface PlanModulesRequestDto {
    moduleKeys: ModuleKey[];
}

export interface PlanAssignmentRequestDto {
    planTierCode: PlanTierCode;
    // Events only: one of the new plan's initialOptions. Omit to keep the
    // event's term (the option of the same length, else the plan's shortest).
    // Either way the event's coverageEndsAt does not move.
    coverageOptionId?: string;
}

// POST /api/admin/plan-tiers/{id}/coverage-options — kind and months are fixed
// once created: to sell a different length, add one and retire the old one.
export interface CoverageOptionRequestDto {
    kind: CoverageOptionKind;
    months: number; // 1–120
    priceAmountMinor: number; // >= 0, in the plan's priceCurrency
    sortOrder?: number;
}

// PATCH /api/admin/plan-tiers/{id}/coverage-options/{optionId} — omitted
// fields are left unchanged. Nothing is ever deleted: retire with active: false.
export interface CoverageOptionPatchDto {
    priceAmountMinor?: number;
    sortOrder?: number;
    active?: boolean;
}

export interface PlatformModulePatchDto {
    name?: string;
    description?: string | null;
    isEnabled?: boolean;
    sortOrder?: number;
}

// The EventTypeKey set itself is fixed in code, and as of the voice-pack
// change, display copy (name/tagline/voice) is deploy-managed, not
// admin-editable — only isEnabled + sortOrder remain writable here. Sending
// name/description now 400s server-side (event-type-voice-pack-fe-integration.md).
export interface PlatformEventTypePatchDto {
    isEnabled?: boolean;
    sortOrder?: number;
}

// --- Newsletter (newsletter-fe-integration.md) ---

// POST /api/newsletter/subscribe — always 202 with no body.
export interface NewsletterSubscribeRequestDto {
    email: string;
    locale?: string;
}

// POST /api/newsletter/confirm and /unsubscribe — always 204.
export interface NewsletterTokenRequestDto {
    token: string;
}

// GET /api/me/newsletter. rewardCode is non-null only while checkout would accept it.
export interface NewsletterStatusResponseDto {
    subscribed: boolean;
    confirmedAt: string | null;
    rewardCode: string | null;
    rewardExpiresAt: string | null;
}

// PUT /api/me/newsletter — `subscribed` is required.
export interface NewsletterUpdateRequestDto {
    subscribed: boolean;
}
