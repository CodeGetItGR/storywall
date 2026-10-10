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
export type EventTypeConvention = 'WEDDING' | 'BAPTISM' | 'SOCIAL_EVENT' | 'BIRTHDAY' | 'PRIVATE_PARTY' | 'GENDER_REVEAL' | 'BABY_SHOWER' | 'REUNION';
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
    'schedule',
    'member_roles',
    'theme',
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
    // Added 2026-09-27. For file inputs' `accept`; the server checks the bytes.
    acceptedMimeTypes: string[];
    acceptedProfilePictureMimeTypes: string[];
    maxImagePixels: number; // width x height; 3016 past it
    defaultStoryLifetimeHours: number;
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
    // Added 2026-09-27: whether the plan can be bought as a gift. Also needs co_hosts in moduleKeys.
    isGiftable: boolean;
    storageBytes: number | null;
    maxMembers: number | null;
    // ACCOUNT scope only. Always null on an EVENT plan, whose prices are its
    // initialOptions (coverage-options-and-extensions-fe-integration.md §1).
    priceAmountMinor: number | null;
    // Also the currency of every coverage option.
    priceCurrency: string | null;
    billingPeriod: BillingPeriod | null;
    // Up to two decimals since V156 (e.g. 12.5). A duration's promoPriceAmountMinor replaces it for that duration.
    discountPercent: number | null;
    discountLabel: string | null;
    // The promotion window, for the percent and every duration's promo price alike. null = open bound.
    discountStartsAt: string | null;
    discountEndsAt: string | null;
    moduleKeys: ModuleKey[];
    // MODULE_UNLOCK upsells for this plan, server-cross-referenced. Only null
    // from the admin catalog endpoints (GET /api/admin/plan-tiers, .../{id}),
    // which don't compute it — never null from /api/config or /api/plan-tiers.
    paidModules: PaidServiceResponseDto[] | null;
    // The plan's config per module, keyed by module key: schedule.maxSections,
    // co_hosts.maxCoHosts, gallery.qrUploadEnabled. An absent count key means
    // unlimited. `{}` for ACCOUNT plans, null from the admin endpoints. See
    // app-config-fe-integration.md §"Per-plan module config and the co-host cap".
    moduleConfigs: Record<string, Record<string, unknown>> | null;
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
    // What it costs while the plan's promotion window is open, in place of the plan's percent. INITIAL only; null if none.
    promoPriceAmountMinor: number | null;
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

// GET /api/config → landingCategories. Visible only, display order; eventTypeKeys are enabled types in event-type order.
export interface AppLandingCategoryDto {
    id: string;
    name: LocalizedText;
    description: LocalizedText;
    isDefault: boolean;
    eventTypeKeys: EventTypeConvention[];
}

// /api/admin/landing-categories (ADMIN). Hidden categories and disabled types included.
export interface AdminLandingCategoryDto {
    id: string;
    name: LocalizedText;
    description: LocalizedText;
    sortOrder: number;
    isVisible: boolean;
    isDefault: boolean;
    eventTypeKeys: EventTypeConvention[];
}

export interface AdminLandingCategoryCreateDto {
    name: LocalizedText;
    description?: LocalizedText;
    sortOrder?: number;
    isVisible?: boolean;
    isDefault?: boolean;
}

export type AdminLandingCategoryPatchDto = Partial<AdminLandingCategoryCreateDto>;

export interface AdminLandingCategoryEventTypesDto {
    eventTypeKeys: EventTypeConvention[];
    moveFromOtherCategory?: boolean;
}

export type EventTypeAccentToken = 'rose' | 'sky' | 'amber';

export interface AppEventTypeResponseDto {
    id: string;
    eventTypeKey: EventTypeConvention;
    icon: string;
    accentToken: EventTypeAccentToken;
    isEnabled: boolean;
    sortOrder: number;
    // Admin-uploaded card image for the create-event picker; null → no uploaded image.
    imageUrl: string | null;
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
}

// An admin's per-event-type wording for one module. Each field null = use the
// default. Both locales are always present when set.
// See module-names-per-event-type-fe-integration.md.
export interface AppModuleCopyDto {
    name: LocalizedText | null;
    description: LocalizedText | null;
    cardLabel: LocalizedText | null; // the module's line on plan cards; null = the resolved name
}

export interface AppEventTypeTranslationDto {
    name: LocalizedText;
    tagline: LocalizedText;
    voice: EventTypeVoicePack;
    // Keyed by moduleKey; only modules with at least one override. Always present.
    modules: Record<string, AppModuleCopyDto>;
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
    imageUrl: string | null;
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
    // Added 2026-09-27: short-field bounds. See app-config-fe-integration.md.
    eventTitleMaxLength: number;
    eventSubtitleMaxLength: number;
    eventSessionTitleMaxLength: number;
    locationNameMaxLength: number;
    locationAddressMaxLength: number;
    urlMaxLength: number;
    memberDisplayNameMaxLength: number;
    memberNicknameMaxLength: number;
    memberRelationshipRoleMaxLength: number;
    memberCustomRelationshipRoleMaxLength: number;
    personNameMaxLength: number;
    emailMaxLength: number;
    passwordMinLength: number;
    passwordMaxLength: number;
    qrLabelMaxLength: number;
    giftAccountHolderMaxLength: number;
    giftBankNameMaxLength: number;
    giftNoteMaxLength: number;
    rsvpPhoneMaxLength: number;
    wishbookGuestNameMaxLength: number;
    playlistTitleMaxLength: number;
    playlistArtistMaxLength: number;
    withdrawalReasonMaxLength: number;
    businessLegalNameMaxLength: number;
    businessVatNumberMaxLength: number;
    businessAddressLineMaxLength: number;
    businessCityMaxLength: number;
    businessPostalCodeMaxLength: number;
}

export interface AppRateLimitConfigDto {
    name: string;
    limit: number;
    windowSeconds: number;
}

// EVENT is never reported: it is the target of a decision an admin takes on a whole event directly.
export type ReportTargetType = 'POST' | 'COMMENT' | 'MEMBER' | 'STORY' | 'MEDIA' | 'WISHBOOK_ENTRY' | 'PLAYLIST_SUGGESTION' | 'EVENT';
export type ReportReason = 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE_CONTENT' | 'IMPERSONATION' | 'ILLEGAL_CONTENT' | 'COPYRIGHT' | 'OTHER';

// member-roles-fe-integration.md §5.1 and §9. One role in an event type's
// admin-managed catalog. Retired roles stay listed because members may hold them.
export interface MemberRoleCatalogDto {
    id: string;
    eventTypeKey: string;
    roleKey: string;
    label: { en: string; el: string };
    emoji: string | null;
    maxHolders: number | null;
    sortOrder: number;
    // Only a host or co-host may give it; guests don't get it in their options (§1.1).
    hostOnly: boolean;
    retired: boolean;
    // Heading of this role's section in the wishbook book (2026-10-06); null = the book uses `label`.
    sectionLabel: { en: string; el: string } | null;
}

// POST /api/admin/member-roles. roleKey and eventTypeKey can't change later.
export interface MemberRoleCatalogRequestDto {
    eventTypeKey: string;
    roleKey: string;
    label: { en: string; el: string };
    sectionLabel?: { en: string; el: string };
    emoji?: string | null;
    maxHolders?: number | null;
    sortOrder: number;
    hostOnly?: boolean;
}

// /api/admin/blocked-terms (member-roles-fe-integration.md §10). Extra terms on
// top of the built-in English and Greek lists; every term applies to every language.
export interface BlockedTermDto {
    id: string;
    term: string;
    createdAt: string;
}

export interface BlockedTermRequestDto {
    term: string; // max 60
}

// PATCH /api/admin/member-roles/{id}. Omitted fields stay as they are;
// emoji "" clears it; clearMaxHolders wins over maxHolders.
export interface MemberRoleCatalogPatchDto {
    label?: { en: string; el: string };
    sectionLabel?: { en: string; el: string };
    clearSectionLabel?: boolean;
    emoji?: string;
    maxHolders?: number;
    clearMaxHolders?: boolean;
    sortOrder?: number;
    hostOnly?: boolean;
}

// GET /api/events/{eventId}/member-roles (member-roles-fe-integration.md §2.1).
export interface MemberRoleOptionDto {
    roleKey: string;
    label: { en: string; el: string };
    emoji: string | null;
    maxHolders: number | null;
    holders: number;
    available: boolean;
}

export interface MemberRoleOptionsDto {
    allowCustom: boolean;
    // The caller's own custom text is locked.
    customLocked: boolean;
    roles: MemberRoleOptionDto[];
}

// PUT /api/event-members/{id}/role: exactly one field.
export type MemberRoleRequestDto = { roleKey: string; customRole?: never } | { customRole: string; roleKey?: never };

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
    memberRolesByEventType: Record<string, MemberRoleCatalogDto[]>;
    landingCategories: AppLandingCategoryDto[];
    rateLimits: AppRateLimitConfigDto[];
    reportTargetTypes: ReportTargetType[];
    reportReasons: ReportReason[];
    newsletter: AppNewsletterConfigDto;
    eventDeletion: AppEventDeletionConfigDto;
    betaFeedback: AppBetaFeedbackConfigDto;
}

// Bug reports and crash capture (beta-feedback-fe-integration.md). While
// `enabled` is false both POST routes answer 409 / 5100.
export interface AppBetaFeedbackConfigDto {
    enabled: boolean;
    screenshotMaxBytes: number;
    screenshotMimeTypes: string[];
}

// GET /api/config → newsletter (newsletter-fe-integration §6). Describes the
// offer made to whoever subscribes next — an existing reward keeps its own terms.
// The emailed code that confirms deleting an event. Added 2026-09-27.
export interface AppEventDeletionConfigDto {
    codeDigits: number;
    codeValidMinutes: number;
    maxCodeAttempts: number;
}

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
    // Only on 500 / 9001: 12 lowercase hex chars naming the recorded error.
    // Sent as null when the server couldn't compute it.
    errorRef?: string | null;
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
    // The Community Guidelines version the user ticked (GET /api/legal/community-guidelines).
    // Not the current one → 400 3037 GUIDELINES_VERSION_MISMATCH, nothing created.
    acceptedGuidelinesVersion: string;
    // The Terms of Use version the user ticked (GET /api/legal/documents/terms).
    // Not the current one → 400 3043 TERMS_VERSION_MISMATCH, nothing created.
    acceptedTermsVersion: string;
    // The 18+ confirmation (Terms §3). Must be true.
    adultConfirmed: true;
    inviteToken?: string;
    subscribeToNewsletter?: boolean;
    // All-or-nothing: an invalid profile is a 400 and no account is created.
    // VIES may leave it PENDING, so read GET /api/me/business-profile afterwards.
    businessProfile?: BusinessProfileRequestDto | null;
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
    // Read only when the token would create a new account. Missing any of them
    // then → 400 3044 SIGNUP_ACCEPTANCE_REQUIRED (details: SignupAcceptanceRequiredDetails),
    // nothing created: resend the same idToken with them. Stale → 3043 / 3037.
    acceptedTermsVersion?: string;
    acceptedGuidelinesVersion?: string;
    adultConfirmed?: boolean;
}

// `details` of a 3044 response.
export interface SignupAcceptanceRequiredDetails {
    currentTermsVersion: string;
    currentGuidelinesVersion: string;
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
// STORAGE_TRIM_* (2026-09-23): media above a lowered storage limit will be deleted.
export type BillingNotificationType =
    'WITHDRAWAL_REFUNDED' | 'WITHDRAWAL_HELD' | 'WITHDRAWAL_WITHHELD' | 'STORAGE_TRIM_SCHEDULED' | 'STORAGE_TRIM_WARNING';

export type NotificationCategory = 'LIMIT' | 'OFFER' | 'TIP' | 'SYSTEM' | 'BILLING' | (string & {});
export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

// 2026-09-04: ctaRoute (a literal path) is gone, replaced by ctaTarget + ctaParams — the app
// resolves the route itself. Closed but growable set; treat an unrecognized value defensively.
// See docs/integration guides/notification-cta-target-fe-integration.md.
export type NotificationCtaTarget = 'EVENT_PLAN_SETTINGS' | 'EVENT_GALLERY' | 'EVENT_GUESTS' | 'EVENT_COVERAGE_EXTEND' | 'EVENT_WISHBOOK';

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
    // True until the user accepts currentGuidelinesVersion; until then every
    // write is 403 4013. Null only on admin user endpoints, never on /api/me.
    guidelinesAcceptanceRequired: boolean | null;
    currentGuidelinesVersion: string | null;
    // True until the user accepts currentTermsVersion (or a later one) and has
    // confirmed being 18+; until then every write is 403 4020. Same nulls as above.
    termsAcceptanceRequired: boolean | null;
    currentTermsVersion: string | null;
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

// --- Business profile (business-buyers-fe-integration.md §2, 2026-09-24) ---
// Only VALID makes the account a business buyer. PENDING and INVALID buy as a consumer.
export type ViesStatus = 'PENDING' | 'VALID' | 'INVALID';

// PUT /api/me/business-profile — create or replace; every PUT starts a new VIES check.
export interface BusinessProfileRequestDto {
    legalName: string;
    // VIES code: EL for Greece (not GR), XI for Northern Ireland.
    countryCode: string;
    vatNumber: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    postalCode: string;
}

// GET/PUT /api/me/business-profile. GET is 404 when there is none.
export interface BusinessProfileResponseDto {
    legalName: string;
    countryCode: string;
    vatNumber: string; // without the prefix
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    postalCode: string;
    viesStatus: ViesStatus;
    viesSubmittedAt: string;
    viesCheckedAt: string | null;
    business: boolean;
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
    // Added 2026-10-05: a preset from GET /api/theme-presets?eventType=. Applied in the create
    // transaction; 409 5012 (plan lacks theme) or 5143 (not selectable) and no event is created.
    themePresetId?: string | null;
}

export interface AdminProvisionEventRequestDto {
    hostUserId: string;
    event: EventRequestDto;
}

export interface EventThemeFontDto {
    key: string; // CSS family is "theme-" + key
    fallback: 'serif' | 'sans-serif';
    url: string; // FE-origin path, /api/theme-fonts/<key>/<version>.woff2
}

// The event's look (event-theme-customization, 2026-10-05). Null when the event has
// no preset, or when the theme module isn't readable for it (kill switch, plan,
// event type) — then the app shows the default look. illustrationUrl is presigned.
export interface EventThemeDto {
    presetKey: string;
    backgroundColor: string; // #RRGGBB, upper-case
    illustrationUrl: string;
    titleColor: string | null; // #RRGGBB; null = ink
    headingFont: EventThemeFontDto | null; // null = the app's fonts
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
    theme: EventThemeDto | null;
    rsvpDeadline: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    deletionScheduledFor: string | null; // ISO-8601; non-null while a deletion request is pending
    status: EventStatus;
    // Only a host ever receives a suspended event (storywall-suspension-fe-integration.md §2).
    suspended: boolean;
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
    // Resolved, with a fresh presigned mediaUrl.
    // Only for drawing it: uploaderMemberId, anonymousUploaderName, originalFilename and storageKey come back null, metadata {}.
    coverMedia: MediaResponseDto | null;
    brandingSettings: Record<string, unknown>;
    // Replaces the cover banner on the event home; the cover still feeds share previews and cards.
    theme: EventThemeDto | null;
    hosts: EventHostResponseDto[]; // only the primary host when co_hosts is off
    modules: EventModuleResponseDto[];
    sessions: EventSessionResponseDto[] | null; // null when schedule is off
    rsvpSummary: EventRsvpSummaryDto | null; // null when rsvp is off
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    deletionScheduledFor: string | null; // ISO-8601; non-null while a deletion request is pending
    status: EventStatus;
    // A host's suspended event: show SuspendedEventView and nothing else. modules, sessions,
    // rsvpSummary and hosts are degraded while suspended and must not be read.
    suspended: boolean;
    suspension: EventSuspensionDto | null;
    // The partner card the feed shows (2026-10-08); null when none should show.
    partnerBranding: PartnerBrandingDto | null;
    // Hosts only: an admin linked a partner and no host has answered yet.
    partnerBrandingPrompt: PartnerBrandingNoticeDto | null;
}

// --- Partner feed branding (collaborator-feed-branding-design.md, 2026-10-08) ---
export type BrandingVariant = 'FEATURE_CARD' | 'COMPACT_ROW' | 'CREDIT';
export type PartnerRole = 'PLANNER' | 'VENUE' | 'PHOTOGRAPHER' | 'VIDEOGRAPHER' | 'DECORATION' | 'CATERING' | 'MUSIC' | 'OTHER';
export type BrandingSource = 'CODE' | 'ADMIN';

export interface PartnerBrandingTextDto {
    el: string;
    en: string;
}

// Insert a card after post firstAfter, then every `every` posts, counting from 1 across the feed.
export interface PartnerBrandingPlacementDto {
    firstAfter: number;
    every: number;
}

export interface PartnerBrandingDto {
    variant: BrandingVariant;
    displayName: string;
    role: PartnerRole;
    logoUrl: string; // presigned
    coverUrl: string; // presigned
    tagline: PartnerBrandingTextDto;
    services: PartnerBrandingTextDto;
    // Relative to the API origin: a public 302 redirect that counts the tap.
    linkUrl: string;
    placement: PartnerBrandingPlacementDto;
}

// The notice a couple accepts: at checkout for a branded partner's code, or as the host prompt.
export interface PartnerBrandingNoticeDto {
    displayName: string;
    noticeVersion: string;
}

// POST /api/events/{eventId}/partner-branding/acceptance — host only; 409 5153 when the version is outdated.
export interface PartnerBrandingAcceptanceRequestDto {
    noticeVersion: string;
}

// PUT /api/admin/collaborators/{id}/branding — a full replacement; blank clears a field (409 5152 while enabled).
export interface CollaboratorBrandingRequestDto {
    displayName: string | null; // max 80
    role: PartnerRole | null;
    taglineEl: string | null; // max 120
    taglineEn: string | null;
    servicesEl: string | null;
    servicesEn: string | null;
}

// PUT /api/admin/events/{eventId}/partner-branding
export interface EventPartnerBrandingRequestDto {
    collaboratorId: string;
}

// GET /api/admin/events/{eventId}/partner-branding — 404 when the event has no link.
export interface EventPartnerBrandingResponseDto {
    eventId: string;
    collaboratorId: string;
    displayName: string;
    source: BrandingSource;
    variant: BrandingVariant;
    acceptedAt: string | null;
    noticeVersion: string | null;
    assignedBy: string | null;
    // Guests see the card right now.
    showing: boolean;
}

// GET /api/admin/partner-branding/report?from&to — clicks per card design. No impressions.
export interface PartnerBrandingReportDto {
    from: string;
    to: string;
    firstAfter: number;
    every: number;
    variants: PartnerBrandingVariantRowDto[];
}

export interface PartnerBrandingVariantRowDto {
    variant: BrandingVariant;
    events: number;
    cardSlots: number;
    clicks: number;
    clicksPerEvent: number; // 0 when events is 0
    clicksPerCardSlot: number; // 0 when cardSlots is 0
}

// Why a StoryWall is suspended. ground, rule and explanation are null if the decision row was deleted.
export interface EventSuspensionDto {
    suspendedAt: string;
    ground: StatementGround | null;
    rule: GuidelinesRule | null;
    explanation: string | null; // the admin's words, verbatim; render as plain text
    reference: string; // the #REF the statement email quoted
    closedAt: string | null; // set once an admin closed it: it can't come back
    deletesOn: string | null; // set with closedAt
    contactEmail: string | null; // where to write to disagree; null = leave the address out
    primaryHost: boolean; // the caller is the primary host: show the billing-and-withdrawal link
    // Added 2026-10-09: set only when an admin closed it for a non-policy reason; ground and rule are then null.
    operationalReason: OperationalCloseReason | null;
}

export interface CheckoutResponseDto {
    orderId: string;
    redirectUrl: string;
    // Added 2026-09-24 (business-buyers-fe-integration.md §1).
    buyerType: BuyerType;
    // The order's pinned breakdown: exactly what the payment page charges (2026-09-24).
    breakdown: PriceBreakdown;
}

// Shared by activation and upgrade checkout — the consent Directive 2011/83/EU
// art. 14(3)/(4)(a) requires before a paid service may begin inside the
// withdrawal window. Both booleans MUST be sent true; termsVersion comes from
// AppConfigResponseDto.withdrawal.termsVersion. Added 2026-09-18 — a body is now
// required on both checkout endpoints, where none was required before.
// Since 2026-09-24 a VIES-confirmed business buyer may omit both booleans
// (business-buyers-fe-integration.md §1); a consumer must still send both true.
export interface WithdrawalConsentDto {
    requestsImmediateStart?: boolean;
    acknowledgesWithdrawalTerms?: boolean;
    termsVersion: string;
}

// POST /api/events/{eventId}/checkout — host, DRAFT only (billing-fe-guide §6).
export interface CheckoutRequestDto extends WithdrawalConsentDto {
    collaborationCode?: string;
    // Required when the code's preview carried partnerBranding (else 400); ignored otherwise.
    acceptsPartnerBranding?: boolean;
    // Echo the preview's partnerBranding.noticeVersion.
    partnerBrandingNoticeVersion?: string;
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
    // 2026-09-24: the activation with the code applied (add-ons included on an
    // existing event), or the upgrade on an upgrade preview.
    breakdown: PriceBreakdown;
    // Set only when the code's partner has feed branding: the notice the couple must accept to use it.
    partnerBranding: PartnerBrandingNoticeDto | null;
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
    // Null when the partner has no tiered schedule (2026-10-08).
    tierProgress: PartnerTierProgressDto | null;
    // Every tap on the partner's feed cards, across all events (2026-10-08).
    brandingClicks: number;
}
// Counts only, nothing per event.
export interface PartnerTierProgressDto {
    activationsThisYear: number;
    // The rate the partner's next activation would earn.
    currentPercent: number;
    // Both null at the top tier.
    nextTierMinActivations: number | null;
    nextTierPercent: number | null;
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
    // Same rows as GET …/earnings/totals, on list and detail. [] when never earned.
    earningsTotals: CollaborationEarningsTotalDto[];
    // Business details (2026-10-08), set via PUT …/business-details. All nullable.
    websiteUrl: string | null;
    contactPersonName: string | null;
    contactPhone: string | null; // E.164
    billingEmail: string | null; // null = invoices go to contactEmail
    legalName: string | null;
    countryCode: string | null; // VIES code: EL for Greece
    vatNumber: string | null; // without the country prefix
    taxOffice: string | null; // ΔΟΥ
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    postalCode: string | null;
    viesStatus: ViesStatus | null; // null while no VAT number is set
    viesCheckedAt: string | null;
    viesName: string | null;
    viesAddress: string | null;
    payoutIban: string | null; // full IBAN, admin only
    payoutAccountHolder: string | null;
    // Column names still blocking a payout (5096); [] when the partner can be paid.
    missingPayoutFields: string[];
    // Tiered commission (2026-10-08), ascending; [] when each code's own rate applies.
    commissionTiers: CommissionTierDto[];
    // Activations counting toward a tier this calendar year (Athens time).
    activationsThisYear: number;
    // Feed branding (2026-10-08). Enabling needs every field below plus websiteUrl (5152).
    brandingEnabled: boolean;
    brandingEnabledAt: string | null;
    brandingDisplayName: string | null;
    brandingRole: PartnerRole | null;
    brandingTaglineEl: string | null;
    brandingTaglineEn: string | null;
    brandingServicesEl: string | null;
    brandingServicesEn: string | null;
    brandingLogoUrl: string | null; // presigned
    brandingCoverUrl: string | null; // presigned
    // What still blocks enabling, e.g. "tagline_en", "logo", "website_url"; [] when complete.
    missingBrandingFields: string[];
}
// PUT /api/admin/collaborators/{id}/business-details — a full replacement of these
// fields only; null or "" clears one. Never part of the PATCH name/email body.
export interface CollaboratorBusinessDetailsRequestDto {
    websiteUrl: string | null; // https only, max 500
    contactPersonName: string | null; // max 200
    contactPhone: string | null; // international format; spaces/dashes are stripped
    billingEmail: string | null;
    legalName: string | null; // max 200
    countryCode: string | null; // VIES code, EU only; set together with vatNumber
    vatNumber: string | null;
    taxOffice: string | null; // required when countryCode is EL
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    postalCode: string | null;
    payoutIban: string | null; // checksum-validated, stored encrypted
    payoutAccountHolder: string | null; // max 140
}
// From the minActivations-th activation of the year, earn commissionPercent.
export interface CommissionTierDto {
    minActivations: number; // >= 1; the first tier must be 1
    commissionPercent: number; // 1-100; never lower than the tier below
}
// PUT /api/admin/collaborators/{id}/commission-tiers — replaces the whole schedule;
// tiers: [] removes it. Only later activations are affected.
export interface CommissionTiersRequestDto {
    tiers: CommissionTierDto[];
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
    // Null once the event is purged; eventId survives it.
    eventTitle: string | null;
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
    // Which activation of the year chose a tiered partner's rate; null when untiered and on clawbacks.
    activationNumber: number | null;
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
    // Percentage discounts only (may carry decimals); a promo price is not counted here.
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
    // null for a duration's promo price, which is an amount (amountMinor) rather than a percentage.
    percent: number | null;
    // What a promo price took off the plan line; null (or absent, before V156) for a percentage.
    amountMinor?: number | null;
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
    // What upgrade-checkout would pin for this duration (2026-09-24).
    breakdown: PriceBreakdown;
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
    // left out, when the target has no live percent. An option with a promo price
    // ignores it; read each option's breakdown for what it actually takes off.
    discountPercent: number | null;
    // Set whenever the promotion takes something off a listed option (percent or
    // promo price); null otherwise, and for a promotion set up without a label.
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
    // Added 2026-09-24: hide "Withdraw" on BUSINESS orders.
    buyerType: BuyerType;
    // 2026-09-24: pinned when the checkout opened; null on orders from before it.
    // While PAID, withdrawal.windowClosesAt is filled for a consumer order.
    breakdown: PriceBreakdown | null;
    // Added 2026-09-27: whether the host reading this paid for the order. On a gift
    // event, false means the amounts, splits and breakdown are null: show "Gift"
    // and no Withdraw. Only null on internal views.
    paidByCaller: boolean | null;
    // Added 2026-10-10: whether this is the first order the reading host ever
    // paid, on any event. Null unless they paid this order and it is paid.
    firstPurchase: boolean | null;
}
export interface EventAddonDto {
    code: string;
    name: string;
    // What this cost when bought. Null on a gift event unless the caller paid
    // the order that bought it (2026-09-27).
    priceAmountMinor: number | null;
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
    // When the media above the storage limit will be deleted after a withdrawal
    // or lost chargeback lowered the limit. Null when nothing is scheduled.
    storageTrimDueAt: string | null;
}

// --- Withdrawal (billing-fe-guide.md §9) — replaces the old admin-approved refund flow ---

export type WithdrawalStatus = 'REFUSED' | 'HELD' | 'REFUNDED' | 'WITHHELD';
// 'PENDING' | 'APPROVED' | 'REJECTED' also exist on legacy rows migrated before this
// flow shipped; treat any status outside the four above as read-only history, never
// producible by a new request.

// PRO_RATA_BY_TIME (2026-09-23): a consented storage pack or coverage extension,
// kept pro rata by time only.
export type RefundBasis = 'CONSENTED_PRO_RATA' | 'NO_CONSENT_FULL_REFUND' | 'PRO_RATA_BY_TIME';

// EVENT withdraws the whole event and deletes it; ORDER withdraws one order and the event stays.
export type WithdrawalScope = 'EVENT' | 'ORDER';

export interface WithdrawalRefusal {
    code: string;
    message: string; // show verbatim
    detail: string | null;
}

export interface WithdrawalLine {
    orderId: string;
    orderKind: OrderKind;
    // This order's own window (2026-09-23).
    windowClosesAt: string | null;
    basis: RefundBasis;
    hostingStart: string | null;
    hostingEnd: string | null;
    usedSeconds: number | null;
    totalSeconds: number | null;
    eventPerformed: boolean;
    // A reviewer, or the evidence rule, kept the event-day share. Always false on a preview.
    keepEventDay: boolean;
    // 0 on a released line whose order had already been refunded another way (a chargeback).
    refundMinor: number;
    providerRefunded: boolean;
    components: Record<string, unknown>; // display-only breakdown; shape not enumerated by the guide
    // Added 2026-09-24: BUSINESS on a newer business upgrade taken along by a consumer upgrade.
    buyerType: BuyerType;
}

// An order an EVENT withdrawal leaves unrefunded because it was bought as a business (2026-09-24).
export interface WithdrawalExcludedOrderDto {
    orderId: string;
    orderKind: OrderKind;
    amountMinor: number;
    currency: string;
    reason: 'BUSINESS_PURCHASE';
}

// Where an ORDER withdrawal leaves the event's storage (2026-09-23).
export interface WithdrawalStorageAfterDto {
    newLimitBytes: number | null; // null = unlimited
    usageBytes: number;
    overLimitBytes: number; // 0 when it fits
    // When the newest media above the new limit would be deleted. Null when nothing is over.
    trimDueAt: string | null;
}

// POST /api/events/{eventId}/quote (2026-09-24) — prices an activation or a
// storage pack before checkout; answers a PriceBreakdown. Read-only.
export interface QuoteRequestDto {
    kind: 'ACTIVATION' | 'STORAGE_PACK';
    // Required for STORAGE_PACK, refused for ACTIVATION.
    paidServiceCode?: string;
}

// GET /api/legal/withdrawal-terms(/{version})?locale=en|el — public (2026-09-24).
export interface WithdrawalTermsDto {
    version: string;
    locale: string; // the locale actually served
    withdrawalInformation: string; // Markdown
    modelForm: string; // Markdown
}

// GET /api/legal/community-guidelines[/{version}] — public.
export interface CommunityGuidelinesDto {
    version: string;
    locale: string; // the locale actually served
    markdown: string;
}

// GET /api/legal/documents/{document}[/{version}]: the Terms of Use, Privacy Policy, Cookie Policy or Contact page.
export type LegalDocumentSlug = 'terms' | 'privacy' | 'cookies' | 'contact';

export interface LegalDocumentDto {
    document: LegalDocumentSlug;
    version: string;
    locale: string; // the locale actually served
    markdown: string;
}

// POST /api/me/guidelines-acceptance → 204.
export interface GuidelinesAcceptanceRequestDto {
    version: string;
}

// POST /api/me/terms-acceptance → 204. Stale version → 3043.
export interface TermsAcceptanceRequestDto {
    version: string;
    adultConfirmed: true;
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
    // Added 2026-09-23. EVENT from /withdrawal-preview, ORDER from /orders/{orderId}/withdrawal-preview.
    scope: WithdrawalScope;
    // The order the request would name: the activation (null when none is PAID), or the order in the path.
    orderId: string | null;
    // True only for a storage pack or extension in automatic mode: refunded straight away.
    // False promises nothing, so say nothing about timing.
    instant: boolean;
    // ORDER only: where the withdrawal leaves the event's storage. Null otherwise and on a refusal.
    storageAfter: WithdrawalStorageAfterDto | null;
    // EVENT only (2026-09-24): business-bought orders this withdrawal leaves unrefunded.
    excludedOrders: WithdrawalExcludedOrderDto[];
    // Opaque proof the host saw this preview (2026-09-28). Always present, refusals
    // included. Send it back on the withdrawal POST; valid for 10 minutes.
    confirmationToken: string;
}

// POST /api/events/{eventId}/withdrawals — host. 201 with this shape when the
// outcome is REFUNDED or HELD; a REFUSED outcome is instead a 409
// WITHDRAWAL_REFUSED with the standard error envelope, NOT this shape — read
// structured refusal reasons from WithdrawalPreviewResponseDto instead.
export interface WithdrawalResponseDto {
    id: string;
    eventId: string;
    scope: WithdrawalScope;
    // The activation for EVENT, the target for ORDER. Null on an EVENT request
    // refused for having no PAID activation.
    orderId: string | null;
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
    // As they stood when the request was filed (2026-09-24). Empty otherwise.
    excludedOrders: WithdrawalExcludedOrderDto[];
}

export interface WithdrawalRequestDto {
    reason?: string; // max 1000 chars, optional
    // The confirmationToken of the exact preview the host confirmed (required, 2026-09-28).
    // 400 5094 when missing or not from this preview; 409 5095 when expired or the refund changed.
    confirmationToken: string;
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
    usageFacts: Record<string, unknown> | null; // display-only; null on a storage-pack request (never screened)
    fraudSignals: WithdrawalFraudSignalDto[]; // every signal evaluated, fired or not — show them all
    recommendation: string; // generated plain text: blank-line-separated sections, each opened by an upper-case heading
}

// POST /api/admin/withdrawals/{id}/release — admin. The body is optional; without it
// the request is refunded as computed. keepEventDay: true keeps the event-day share
// (409 WITHDRAWAL_KEEP_EVENT_DAY_NOT_DUE unless the date paid for had passed when the
// host withdrew) and then needs a note. The note is shown to the host.
export interface WithdrawalReleaseDto {
    keepEventDay: boolean;
    note?: string; // max 1000 chars
}

// --- Admin orders (docs/fe-guides/admin-orders-fe-integration.md, 2026-10-02) ---

export type RefundSource = 'WITHDRAWAL' | 'UNAPPLIED' | 'PROVIDER';
export type PaymentProviderKey = 'STRIPE' | 'MANUAL';
// Legacy rows migrated before the withdrawal flow can still carry these.
export type AdminOrderWithdrawalStatus = WithdrawalStatus | 'PENDING' | 'APPROVED' | 'REJECTED';

// GET /api/admin/orders — admin. Page<AdminOrderSummaryDto>, newest first.
export interface AdminOrderSummaryDto {
    id: string;
    createdAt: string;
    paidAt: string | null;
    status: OrderStatus;
    kind: OrderKind;
    planCode: string | null;
    eventId: string; // whether or not the event still exists
    eventTitle: string | null;
    eventPurged: boolean;
    // Null when the account was deleted; a business keeps its legal name.
    buyerId: string | null;
    buyerName: string | null;
    buyerEmail: string | null;
    buyerType: BuyerType;
    amountMinor: number;
    currency: string;
    provider: PaymentProviderKey;
    comp: boolean; // settled by an admin, no money taken
    disputeOpen: boolean;
    refundedAt: string | null;
    // Null when not refunded or refunded before 2026-10-02. 0 = reversed, nothing sent back.
    refundedAmountMinor: number | null;
    refundSource: RefundSource | null;
}

export interface CheckoutLine {
    name: string;
    description: string | null;
    amountMinor: number;
}

export interface AdminOrderWithdrawalDto {
    id: string;
    scope: WithdrawalScope;
    status: AdminOrderWithdrawalStatus;
    createdAt: string;
    decidedAt: string | null;
    reason: string | null;
    decisionNote: string | null;
    totalRefundMinor: number | null;
    // This order's line of the request; null when the request never priced it.
    line: { basis: RefundBasis; refundMinor: number; providerRefunded: boolean; eventPerformed: boolean } | null;
}

export interface AdminOrderCommissionDto {
    id: string;
    collaboratorName: string;
    entryType: CollaborationEarningEntryType;
    amountMinor: number;
    currency: string;
    commissionPercent: number | null;
    status: CollaborationEarningStatus;
    createdAt: string;
    paidAt: string | null;
}

// GET /api/admin/orders/{orderId} — admin, read-only. 404 RESOURCE_NOT_FOUND.
// One rate Stripe Tax applied to an order. Only amountMinor is always set.
export interface AdminOrderTaxLine {
    amountMinor: number;
    taxableAmountMinor: number | null;
    ratePercent: number | null; // e.g. 24 for 24%
    country: string | null; // ISO alpha-2, upper case
    jurisdiction: string | null;
    taxType: string | null; // vat, sales_tax, …
    taxabilityReason: string | null; // Stripe's code (standard_rated, reverse_charge, …); not a closed set
    inclusive: boolean | null;
}

export interface AdminOrderDetailDto {
    summary: AdminOrderSummaryDto;
    buyer: {
        userId: string | null;
        name: string | null;
        email: string | null;
        buyerType: BuyerType;
        // Frozen at checkout (legalName, countryCode, vatNumber, addressLine1/2, city, postalCode,
        // viesStatus, …). Null for a consumer.
        businessSnapshot: Record<string, string> | null;
        providerCustomerId: string | null;
    };
    pricing: {
        amountMinor: number;
        currency: string;
        addonAmountMinor: number | null;
        setupAmountMinor: number | null;
        eventDayAmountMinor: number | null;
        hostingAmountMinor: number | null;
        taxAmountMinor: number | null; // null when the provider computed no tax
        // Stripe Tax's per-rate breakdown of taxAmountMinor, in order. Empty when no tax was added,
        // or briefly after payment while it is fetched.
        taxLines: AdminOrderTaxLine[];
        discountLabel: string | null;
        checkoutDescription: string | null;
        checkoutFooterMessage: string | null;
        // Both null on orders older than the breakdown.
        priceBreakdown: PriceBreakdown | null;
        checkoutLines: CheckoutLine[] | null;
    };
    coverage: {
        planCode: string | null;
        paidServiceCode: string | null; // the storage pack bought
        coverageOptionId: string | null;
        upgradeFromOptionId: string | null;
        coverageMonths: number | null;
        coverageMonthsAdded: number | null;
        coverageStartsAt: string | null;
        coverageEndsAt: string | null;
    };
    payment: {
        provider: PaymentProviderKey;
        providerSessionId: string | null;
        providerPaymentId: string | null;
        billingCountry: string | null;
        cardCountry: string | null;
        cardFingerprint: string | null;
        riskLevel: string | null;
        disputedAt: string | null;
        disputeClosedAt: string | null;
        receiptNumber: string | null; // null until Stripe has emailed the receipt
        receiptUrl: string | null; // Stripe's hosted receipt: proof of payment, not an invoice
    };
    refund: { refundedAt: string; amountMinor: number | null; source: RefundSource | null; providerRefundId: string | null } | null;
    consent: { termsVersion: string | null; immediateStartAt: string | null; acknowledgedAt: string | null };
    settledBy: { userId: string; name: string | null; email: string } | null;
    withdrawals: AdminOrderWithdrawalDto[]; // oldest first
    commissions: AdminOrderCommissionDto[]; // oldest first
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

/**
 * GET /api/admin/metrics/funnel?since=&until= — the account conversion funnel. Added 2026-09-29.
 * Counts only; nothing identifies an account. Both params optional ISO-8601; omit both for all time.
 * `until` is exclusive.
 *
 * Two windows: account sections (funnel, stuck, activity, timeToConvert, guestToHost, accounts)
 * cover accounts that SIGNED UP in the range, followed to today; paidEvents and revenue cover
 * orders PAID / refunds DECIDED in the range. An "account" excludes admins and guest users.
 * See admin-funnel-metrics-fe-integration.md (next to this file in both repos) for each definition.
 */
export interface FunnelMetricsResponseDto {
    since: string | null;
    until: string | null;
    generatedAt: string;
    funnel: {
        signedUp: number;
        emailVerified: number;
        /** Primary host of ≥1 event (drafts and soft-deleted events count). */
        createdEvent: number;
        /** THE HEADLINE. Paid via the provider, amount > 0, not refunded, for ≥1 event activation. */
        paidHost: number;
        repeatPaidHost: number;
        /** Hosts an event with ≥1 guest AND ≥1 upload. Shown beside paidHost, not a subset of it. */
        engagedHost: number;
        /** Went live only via admin settlement / €0 order (bank transfer and comp look the same). */
        adminSettledHost: number;
    };
    /** ACTIVE accounts only. abandonedCheckout ⊂ eventNeverPaid. */
    stuck: {
        unverifiedOver7Days: number;
        verifiedNoEvent: number;
        eventNeverPaid: number;
        abandonedCheckout: number;
        paidNotEngaged: number;
    };
    /** From last_active_at (sign-in / token refresh, 1-day resolution, recorded from 2026-09-29). */
    activity: {
        activeLast7Days: number;
        activeLast30Days: number;
        inactiveOver30Days: number;
        /** No sign-in since tracking began — not the same as inactive. */
        neverRecorded: number;
    };
    /** Medians in hours; null when nobody reached the step. firstEventToPaid can be negative. */
    timeToConvert: {
        medianHoursToVerify: number | null;
        medianHoursToFirstEvent: number | null;
        medianHoursFirstEventToPaid: number | null;
    };
    /** Accounts that joined someone else's event as a linked guest before hosting their own. */
    guestToHost: {
        attendedFirst: number;
        thenHosted: number;
        thenPaid: number;
    };
    accounts: {
        /** Keyed by AuthProvider: LOCAL | OAUTH | INVITE. Missing key = 0. */
        signedUpByProvider: Record<string, number>;
        /** Keyed by locale, e.g. 'en', 'el'. */
        byLocale: Record<string, number>;
        suspended: number;
        deleted: number;
    };
    /** Events whose provider-paid activation settled in the range. */
    paidEvents: {
        count: number;
        /** endAt has passed — only then is "no uploads" meaningful. */
        ended: number;
        endedWithoutUploads: number;
        endedWithoutGuests: number;
        /** Over ENDED paid events only (changed 2026-09-29); null when `ended` is 0. */
        medianGuests: number | null;
        /** Over ENDED paid events only (changed 2026-09-29); null when `ended` is 0. */
        medianUploads: number | null;
        withUpgrade: number;
        withStoragePack: number;
        withExtension: number;
    };
    revenue: {
        /** One entry per currency with sales or refunds in the range. */
        totals: {
            currency: string;
            /** Paid orders, later-refunded ones included. */
            grossMinor: number;
            /** Refunds decided in the range, partial ones included. */
            refundedMinor: number;
            netMinor: number;
            payingAccounts: number;
            netPerPayingAccountMinor: number;
        }[];
        byKind: {
            currency: string;
            /** OrderKind: ACTIVATION | UPGRADE | STORAGE_PACK | EXTENSION */
            kind: string;
            orders: number;
            amountMinor: number;
        }[];
        refunds: number;
        adminSettledOrders: number;
        /** Keyed by BuyerType: CONSUMER | BUSINESS. */
        ordersByBuyerType: Record<string, number>;
        discountRedemptions: number;
        partnerRedemptions: number;
    };
}

/** GET /api/admin/metrics/funnel/cohorts?weeks=12 (1..104). Oldest first, every week present. */
export interface FunnelCohortDto {
    /** Monday 00:00 UTC. */
    weekStart: string;
    signedUp: number;
    emailVerified: number;
    createdEvent: number;
    paidHost: number;
    engagedHost: number;
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
    // Only for drawing it: uploaderMemberId, anonymousUploaderName, originalFilename and storageKey come back null, metadata {}.
    coverMedia?: MediaResponseDto | null;
    // The event's theme, null for the default look. Its illustration takes the cover's place, as on the feed banner.
    theme?: EventThemeDto | null;
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

// gdpr-self-service-fe-integration.md — POST /api/me/deletion-requests.
export interface AccountDeletionConfirmRequestDto {
    otpCode: string;
}

// One entry of details.events on 409 ACCOUNT_DELETE_HAS_HOSTED_EVENTS (5124).
export interface AccountDeletionBlockingEvent {
    eventId: string;
    title: string;
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
    // Starred for the book (2026-10-06). Hosts get true/false; everyone else gets null.
    highlighted: boolean | null;
}

// GET|POST /api/events/{eventId}/wishbook/book (wishbook-book-fe-integration.md).
// downloadUrl only when READY; it's presigned and expires, so fetch GET again right before downloading.
export type WishbookBookStatus = 'QUEUED' | 'RUNNING' | 'READY' | 'FAILED';

export interface WishbookBookDto {
    status: WishbookBookStatus;
    requestedAt: string;
    finishedAt: string | null;
    // pageCount, entryCount, byteSize and downloadUrl are non-null only when READY; a rebuild hides the old figures.
    pageCount: number | null;
    entryCount: number | null;
    byteSize: number | null;
    // Non-null only when FAILED. An open set: never branch on a closed union. Everything means "try again"
    // (RENDERER_* | STORAGE_FAILED | DB_UNAVAILABLE | PROCESSING_STALLED | BUILD_ERROR | RENDERER_NOT_CONFIGURED |
    // MODULE_UNAVAILABLE | EVENT_SUSPENDED): show one generic line, never one per code.
    // The one exception is CONTENT_CHANGED: a wish (or its author's account, or the event cover) was removed since
    // the book was made, so the old book is gone. It gets its own message, "A wish was removed since the book was
    // made - create it again", with the same build button. Never retried automatically.
    failureCode: string | null;
    downloadUrl: string | null;
}

// GET|PUT /api/events/{eventId}/wishbook/book-texts. null = the default (shown as placeholder).
// PUT is a replace, not a patch: send all four.
export interface WishbookBookTextsRequestDto {
    subtitle: string | null;
    dedication: string | null;
    closingTitle: string | null;
    closingBody: string | null;
}

export interface WishbookBookTextsDto extends WishbookBookTextsRequestDto {
    defaults: { subtitle: string; dedication: string; closingTitle: string; closingBody: string };
}

export const WISHBOOK_BOOK_TEXT_LIMITS = { subtitle: 80, dedication: 400, closingTitle: 80, closingBody: 300 } as const;
// dedication and closingBody keep line breaks (BE caps them at 6 lines, blank separator lines included); the others are single-line.
export const WISHBOOK_BOOK_TEXT_MAX_LINES = 6;

// GET /api/event-invitations/{inviteToken}/preview — public, unauthenticated.
// Powers the per-event invite onboarding page; expired/alreadyUsed are not
// errors, they're states to render. alreadyUsed means the link has no guest
// places left (a shared join link stays false until it is full), and doesn't
// imply the current visitor is one of those who used it.
export interface EventInvitationPreviewDto {
    inviteToken: string;
    eventId: string;
    eventTitle: string;
    eventSubtitle: string | null;
    eventDescription: string | null;
    // When the event runs, with its UTC offset. Show the times in eventTimezone (e.g. "Europe/Athens").
    eventStartAt: string;
    eventEndAt: string | null;
    eventTimezone: string;
    // The venue name only.
    eventLocationName: string | null;
    coverMediaId: string | null;
    // Read the cover from here: the visitor isn't a member, so GET /api/medias/{id} refuses them.
    // Only for drawing it: uploaderMemberId, anonymousUploaderName, originalFilename and storageKey come back null, metadata {}.
    coverMedia: MediaResponseDto | null;
    // The event's theme, null for the default look. Its illustration takes the cover's place, as on the feed banner.
    theme: EventThemeDto | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    expired: boolean;
    alreadyUsed: boolean;
    // Added 2026-09-27: null on a normal event. While claimed is false the
    // honorees may not know yet, so guest-facing copy must not spoil it.
    gift: GiftFramingDto | null;
}

export interface EventMemberRequestDto {
    eventId: string;
    userId?: string;
    invitationId?: string;
    role: EventRole;
    displayName: string;
    nickname?: string;
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
    // A catalog roleKey (resolve with lib/memberRoles.ts) and free text. Both
    // null when the member_roles module is off. Set only with PUT …/role.
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
    // Every member can download the prebuilt archive after the event (REUNION). Absent means off.
    memberArchiveAfterEnd?: boolean;
}

// GET /api/events/{eventId}/media/member-archive. availableFrom is null unless NOT_YET; parts is
// empty unless READY. Part urls are presigned and expire: fetch again for each download.
export type MemberArchiveAvailability = 'NOT_YET' | 'PREPARING' | 'READY' | 'UNAVAILABLE';

export interface MemberArchivePartDto {
    part: number;
    totalParts: number;
    bytes: number;
    url: string;
}

export interface MemberArchiveResponseDto {
    status: MemberArchiveAvailability;
    availableFrom: string | null;
    parts: MemberArchivePartDto[];
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
    // Admin endpoints only: per-event-type wording overrides, null = default.
    name?: LocalizedText | null;
    description?: LocalizedText | null;
    cardLabel?: LocalizedText | null;
}

// PATCH /api/admin/event-types/{eventTypeKey}/modules/{moduleKey} — every field
// optional. `defaultConfig` here is only the seed template for new per-plan
// rows; a plan's live value is PlanTierModuleConfigDto below. See
// event-lifecycle-locks-and-event-types-fe-integration.md "Admin: editing the matrix".
export interface EventTypeModulePatchDto {
    applicability?: EventTypeModuleApplicability;
    defaultConfig?: Record<string, unknown>;
    sortOrder?: number;
    // Omit = unchanged, null = back to the default. Both en and el required when set.
    name?: LocalizedText | null;
    description?: LocalizedText | null;
    cardLabel?: LocalizedText | null;
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
    isMain?: boolean; // restores a missing main session; its dates and location come from the event (5123 if one exists)
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
    // null/omitted = unchanged; clearEndAt: true removes the end time (wins over endAt).
    endAt?: string | null;
    clearEndAt?: boolean;
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

// GET /api/events/{eventId}/rsvps/report?reportType=… — host-only. Labels arrive in the request
// language. Sections that don't apply to reportType are null; [] means "applies, nothing to show".
export interface RsvpReportDto {
    reportType: RsvpReportType;
    header: RsvpReportHeaderDto;
    totals: RsvpReportTotalsDto;
    categories: RsvpReportCategoryDto[] | null;
    sessions: RsvpReportSessionDto[] | null;
    groups: RsvpReportGroupDto[] | null;
}

export interface RsvpReportHeaderDto {
    eventTitle: string;
    eventTypeName: string | null;
    eventDate: string; // yyyy-MM-dd, already in the event's timezone
    generatedAt: string;
}

export interface RsvpReportTotalsDto {
    responses: number;
    people: number;
    adults: number;
    children: number;
}

export interface RsvpReportCategoryDto {
    label: string;
    attending: boolean;
    comingSessionIds: string[];
    noAnswerSessionIds: string[];
    responses: number;
    people: number;
    percentOfPeople: number | null;
}

export interface RsvpReportSessionDto {
    sessionId: string;
    title: string;
    people: number;
    noAnswerPeople: number;
}

export interface RsvpReportGroupDto {
    label: string;
    attending: boolean;
    comingSessionIds: string[];
    noAnswerSessionIds: string[];
    responses: number;
    people: number;
    rows: RsvpReportRowDto[];
}

export interface RsvpReportRowDto {
    rsvpId: string;
    name: string;
    phone: string | null;
    adults: number;
    children: number;
    notes: string | null;
}

// --- §6 Media domain ---

export interface MediaResponseDto {
    id: string;
    eventId: string;
    uploaderMemberId: string | null;
    anonymousUploaderName: string | null;
    storageKey: string;
    // null while a video is PROCESSING or FAILED: there is no playable file yet.
    mediaUrl: string | null;
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
    // On a FAILED video: why. See lib/videoFailure.ts for the reasons with their own copy.
    processingError?: string;
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

// GET /api/events/{eventId}/media/summary — hosts only. The manifest's two counts, without
// planning an archive.
export interface MediaSummaryDto {
    photoCount: number;
    videoCount: number;
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
    // member-roles-fe-integration.md §3.1. At most one is set; both null when
    // the member_roles module is off for the event.
    roleKey: string | null;
    customRole: string | null;
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

// GET /api/posts/{postId}/reactions. Counts only: who reacted is never sent, except the
// caller's own reaction (or the demo guest's, when acting as one), which the unreact needs.
export interface PostReactionsResponseDto {
    reactionCount: number;
    reactionCounts: Record<string, number>;
    myReaction: ReactionResponseDto | null;
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
    // As GET /api/medias/{mediaId} returns it; null where that endpoint would refuse it.
    media: MediaResponseDto | null;
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
    // Omit for true (added 2026-09-27).
    isGiftable?: boolean;
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
    promoPriceAmountMinor?: number | null; // INITIAL only, 0 < promo < price (else 400 5151)
    sortOrder?: number;
}

// PATCH /api/admin/plan-tiers/{id}/coverage-options/{optionId} — omitted
// fields are left unchanged. Nothing is ever deleted: retire with active: false.
export interface CoverageOptionPatchDto {
    priceAmountMinor?: number;
    promoPriceAmountMinor?: number; // sets it; clearPromoPrice removes it. Both together are 400 5151.
    clearPromoPrice?: boolean;
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

// --- Beta feedback (beta-feedback-fe-integration.md) ---

export type BugReportDisplayMode = 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' | 'window-controls-overlay';

// POST /api/bug-reports, sent as the multipart `report` part (a Blob, never a
// string field). Unknown fields are a 400 / 3002.
export interface BugReportRequestDto {
    description: string;
    pageUrl?: string | null;
    eventId?: string | null;
    appVersion?: string | null;
    locale?: string | null;
    // An IANA id, or omitted. "" is rejected.
    timeZone?: string | null;
    viewportWidth?: number | null;
    viewportHeight?: number | null;
    displayMode?: BugReportDisplayMode | null;
    recentErrors?: RecentErrorDto[] | null;
}

// One failed API call. `path` is a route template for token routes.
export interface RecentErrorDto {
    method?: string | null;
    path?: string | null;
    status?: number | null;
    errorCode?: number | null;
    errorRef?: string | null;
    at?: string | null;
}

export interface BugReportCreatedDto {
    id: string;
    createdAt: string;
}

// POST /api/error-events/client — 204, fire and forget.
export interface ClientErrorRequestDto {
    name: string;
    message?: string | null;
    stack?: string | null;
    pageUrl?: string | null;
    appVersion?: string | null;
}

// GET /api/bug-reports(/{id}) — admin only, newest first. `recentErrors`
// holds the stored RecentErrorDto entries with every key present.
export interface BugReportResponseDto {
    id: string;
    description: string;
    pageUrl: string | null;
    eventId: string | null;
    appVersion: string | null;
    locale: string | null;
    timeZone: string | null;
    viewportWidth: number | null;
    viewportHeight: number | null;
    displayMode: string | null;
    recentErrors: Record<string, unknown>[] | null;
    // null once the reporter's account is deleted.
    reporterUserId: string | null;
    reporterRole: PlatformRole;
    userAgent: string | null;
    // Presigned GET URL; null when the report has no screenshot.
    screenshotUrl: string | null;
    createdAt: string;
}

export type ErrorEventSource = 'BACKEND' | 'BACKGROUND' | 'CLIENT';

// GET /api/error-events(/{id}) — admin only, newest lastSeenAt first. One row
// groups every occurrence of the same error; `ref` is what a 500's errorRef holds.
export interface ErrorEventResponseDto {
    id: string;
    ref: string;
    source: ErrorEventSource;
    errorType: string;
    message: string | null;
    stackTrace: string | null;
    occurrenceCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
    lastRequestMethod: string | null;
    lastRequestPath: string | null;
    lastUserId: string | null;
    lastAppVersion: string | null;
    lastPageUrl: string | null;
}

// Demo events — see docs/integration guides/demo-event-fe-integration.md.
// GET /api/demo/{eventTypeKey} — public; 404 when the type has no demo; 429 past 30/min per IP.
export interface DemoSnapshotDto {
    snapshotAt: string;
    // Re-fetch before this to refresh media URLs.
    presignedUrlsValidUntil: string | null;
    viewerUserId: string;
    viewerMemberId: string;
    event: EventDetailResponseDto;
    members: EventMemberResponseDto[];
    posts: PostResponseDto[];
    comments: CommentResponseDto[];
    reactions: ReactionResponseDto[];
    // Includes expired stories.
    stories: StoryResponseDto[];
    // phone is always null.
    rsvps: RsvpResponseDto[];
    media: MediaResponseDto[];
    playlistSuggestions: PlaylistSuggestionResponseDto[];
    wishbookEntries: WishbookEntryResponseDto[];
    // A fixed fake; null when the wishlist module is off.
    giftAccount: EventGiftAccountResponseDto | null;
    // token is a "demo-qr-…" placeholder.
    qrLinks: QrLinkResponseDto[];
    usage: EventUsageResponseDto;
}

// GET/PUT /api/admin/demo-events — admin only.
export interface DemoEventResponseDto {
    eventTypeKey: string;
    eventId: string;
    eventTitle: string;
    designatedByUserId: string | null;
    designatedAt: string;
}

export interface DemoEventDesignationRequestDto {
    eventId: string;
}

// Gift mode (2026-09-27): gift-mode-fe-integration.md.
export type GiftHandoverStatus = 'NOT_ISSUED' | 'ISSUED' | 'LOCKED' | 'CLAIMED' | 'COMPLETED' | 'VOID';

// CLAIMABLE doesn't check the event: the claim can still answer 5092. Treat an
// unknown state as not claimable.
export type GiftClaimState = 'CLAIMABLE' | 'LOCKED' | 'ALREADY_CLAIMED' | 'VOID';

// PUT /api/events/{eventId}/gift — primary host only (4011). A full replace:
// omitting recipientEmail clears it.
export interface GiftHandoverRequestDto {
    recipientLabel: string; // required, max 120
    giverDisplayName: string; // required, max 80
    recipientEmail?: string; // max 255; this verified address claims without the PIN
}

// PUT and GET /api/events/{eventId}/gift. Never carries the PIN.
export interface GiftHandoverResponseDto {
    status: GiftHandoverStatus;
    recipientLabel: string;
    giverDisplayName: string;
    recipientEmail: string | null;
    // The live card's claim token; null until a card is issued.
    token: string | null;
    cardIssuedAt: string | null;
    claimedByDisplayName: string | null;
    claimedAt: string | null;
    // Only while CLAIMED: when the last withdrawal window closes. Also null while
    // CLAIMED when the handover is paused (a withdrawal under review, the event
    // deleted or not ACTIVE).
    ownershipTransfersAt: string | null;
    ownershipTransferredAt: string | null;
}

// POST /api/events/{eventId}/gift/card — the only response with the PIN.
// Reissuing kills the previous token and PIN.
export interface GiftCardResponseDto {
    token: string;
    pin: string; // 6 digits; show once
}

export interface GiftClaimRequestDto {
    pin?: string; // exactly 6 digits
}

// GET /api/gift-claims/{token} — public. 404 for unknown or superseded tokens and deleted events.
export interface GiftClaimPreviewDto {
    eventTitle: string;
    eventSubtitle: string | null;
    // Only for drawing it: uploaderMemberId, anonymousUploaderName, originalFilename and storageKey come back null, metadata {}.
    coverMedia: MediaResponseDto | null;
    giverDisplayName: string;
    recipientLabel: string;
    emailBound: boolean;
    state: GiftClaimState;
}

// POST /api/gift-claims/{token}/claim. COMPLETED: the caller owns the event now.
// CLAIMED: co-host now, owner at ownershipTransfersAt (null while a withdrawal is under review).
export interface GiftClaimResponseDto {
    status: 'COMPLETED' | 'CLAIMED';
    ownershipTransfersAt: string | null;
}

// EventInvitationPreviewDto.gift.
export interface GiftFramingDto {
    giverDisplayName: string;
    recipientLabel: string;
    claimed: boolean;
}

// `details` on a 400/3036. 0 means this wrong PIN locked the card.
export interface GiftPinInvalidDetails {
    attemptsLeft: number;
}

// --- Admin moderation center (Community Guidelines §18) ---
// Mirrors dto/moderation/*. JSON nulls are sent, so nullable means `T | null`.

export type ModerationCaseStatus = 'OPEN' | 'UNDER_REVIEW' | 'CLOSED';
export type ModerationOutcome = 'DISMISSED' | 'ACTION_TAKEN';

export type AdminAuditAction =
    | 'CONTENT_VIEWED'
    | 'CASE_REVIEW_STARTED'
    | 'CASE_DISMISSED'
    | 'CASE_RESOLVED'
    | 'CONTENT_REMOVED'
    | 'MEMBER_REMOVED'
    | 'MEMBER_BANNED'
    | 'BAN_LIFTED'
    | 'ACCOUNT_SUSPENDED'
    | 'ACCOUNT_CREATED'
    | 'ACCOUNT_STATUS_CHANGED'
    | 'ACCOUNT_ROLE_CHANGED'
    | 'ACCOUNT_EMAIL_CHANGED'
    | 'ACCOUNT_DELETED'
    | 'NOTICE_VIEWED'
    | 'NOTICE_ATTACHED'
    | 'NOTICE_CLOSED'
    | 'EVENT_BROWSED'
    | 'EVENT_SUSPENDED'
    | 'EVENT_SUSPENSION_LIFTED'
    | 'EVENT_CLOSED'
    | 'STATEMENT_OF_REASONS_SENT'
    | 'EVENT_STORAGE_GRANTED'
    | 'EVENT_MEMBERS_GRANTED'
    | 'EVENT_MODULE_GRANTED'
    | 'EVENT_MODULE_REVOKED';

// The statement of reasons sent with every moderation action (Guidelines §22).
export type StatementGround = 'ILLEGAL_CONTENT' | 'GUIDELINES_BREACH';
// One per Guidelines section 3–15, in order; see lib/guidelinesRules.ts.
export type GuidelinesRule =
    | 'ILLEGAL_CONTENT'
    | 'SEXUAL_CONTENT'
    | 'MINORS'
    | 'HARASSMENT'
    | 'HATE_AND_VIOLENCE'
    | 'IMPERSONATION'
    | 'PRIVACY'
    | 'INTELLECTUAL_PROPERTY'
    | 'SPAM'
    | 'COMMERCIAL_USE'
    | 'GIFT_LIST_MISUSE'
    | 'QR_UPLOAD_MISUSE'
    | 'MALICIOUS_TECHNICAL_USE';

// GET /api/admin/moderation/cases?status=&page=&size= (Page<ModerationCaseSummaryDto>).
// decisionId/outcome/decidedAt are set only on CLOSED cases; topReason, firstReportedAt and
// lastReportedAt are null on CLOSED rows.
export interface ModerationCaseSummaryDto {
    targetType: ReportTargetType;
    targetId: string;
    eventId: string;
    eventTitle: string | null;
    reportCount: number;
    topReason: ReportReason | null;
    firstReportedAt: string | null;
    lastReportedAt: string | null;
    status: ModerationCaseStatus;
    decisionId: string | null;
    outcome: ModerationOutcome | null;
    decidedAt: string | null;
}

export interface ModerationReportDto {
    id: string;
    reason: ReportReason;
    description: string | null;
    status: string;
    createdAt: string;
    reporterMemberId: string | null;
    reporterDisplayName: string | null;
    noticeReference: string | null; // set when the report came from a public notice
}

export interface ModerationContentDto {
    text: string | null;
    authorMemberId: string | null;
    authorUserId: string | null;
    authorDisplayName: string | null;
    authorIsHost: boolean;
    media: MediaResponseDto[];
    createdAt: string;
}

export interface AllowedActionsDto {
    removeContent: boolean;
    removeMember: boolean;
    banFromEvent: boolean;
    suspendAccount: boolean;
    suspendEvent: boolean; // true while the event exists and isn't suspended, even when the item is gone
}

export interface ModerationDecisionDto {
    id: string;
    targetType: ReportTargetType;
    targetId: string;
    eventId: string;
    outcome: ModerationOutcome;
    contentRemoved: boolean;
    memberRemoved: boolean;
    banned: boolean;
    accountSuspended: boolean;
    eventSuspended: boolean;
    ground: StatementGround | null; // null on dismissals and on decisions before 2026-10-02
    rule: GuidelinesRule | null;
    operationalReason: OperationalCloseReason | null; // set instead of ground and rule on an operational close
    explanation: string | null;
    reportCount: number;
    adminUserId: string;
    note: string | null;
    createdAt: string;
}

export interface EventBanDto {
    id: string;
    eventId: string;
    userId: string;
    decisionId: string | null;
    createdAt: string;
    liftedAt: string | null;
}

// GET /api/admin/moderation/cases/{targetType}/{targetId}. Audit-logs the read.
export interface ModerationCaseDetailDto {
    targetType: ReportTargetType;
    targetId: string;
    eventId: string;
    eventTitle: string | null;
    status: ModerationCaseStatus;
    reports: ModerationReportDto[];
    content: ModerationContentDto | null;
    allowedActions: AllowedActionsDto;
    decisions: ModerationDecisionDto[];
    priorDecisionsAgainstAuthor: ModerationDecisionDto[];
    bans: EventBanDto[];
    eventSuspension: ModerationEventSuspensionDto | null; // set while the case's event is suspended
}

export interface ModerationEventSuspensionDto {
    decisionId: string;
    suspendedAt: string;
    closedAt: string | null; // set once closed: neither lift nor close is offered then
    deletesOn: string; // closed: the purge date. Not closed: the date a close now would set
}

// POST .../decision. 400/3039 when an action does not apply to the target type or the statement
// is missing/partial/out of bounds, 409/5106 when already decided, 5107 host removal, 5108 admin
// suspension, 5110 StoryWall already suspended.
export interface ModerationDecisionRequestDto {
    outcome: ModerationOutcome;
    removeContent: boolean;
    removeMember: boolean;
    banFromEvent: boolean;
    suspendAccount: boolean;
    suspendEvent: boolean;
    // The statement of reasons: all three with any action, all null otherwise (a dismissal sends null).
    ground: StatementGround | null;
    rule: GuidelinesRule | null;
    explanation: string | null; // 20–2000 characters after trimming
    note?: string | null; // max 2000
    // MEMBER cases with removeContent: the content.text the admin saw (member-roles guide §6.2).
    // A mismatch with the stored text is 409 5115. Ignored for other targets.
    expectedContentText?: string | null;
}

// Public content notices (DSA Art. 16). See fe-guides/content-notices-fe-integration.md.
export type NoticeCategory =
    'PERSONAL_DATA_OR_IMAGE' | 'COPYRIGHT' | 'HARASSMENT_OR_HATE' | 'CHILD_SEXUAL_ABUSE' | 'OTHER_ILLEGAL' | 'GUIDELINES_BREACH';
export const NOTICE_CATEGORIES: readonly NoticeCategory[] = [
    'PERSONAL_DATA_OR_IMAGE',
    'COPYRIGHT',
    'HARASSMENT_OR_HATE',
    'CHILD_SEXUAL_ABUSE',
    'OTHER_ILLEGAL',
    'GUIDELINES_BREACH',
];
export type NoticeStatus = 'NEW' | 'ATTACHED' | 'CLOSED';
export type NoticeCloseReason = 'NOT_FOUND' | 'NO_BREACH' | 'ALREADY_HANDLED' | 'SPAM';
export const NOTICE_CLOSE_REASONS: readonly NoticeCloseReason[] = ['NOT_FOUND', 'NO_BREACH', 'ALREADY_HANDLED', 'SPAM'];
// ?status= on the admin list. CLOSED covers ATTACHED and CLOSED notices.
export type NoticeListView = 'NEW' | 'CLOSED';

// POST /api/content-notices (public, no auth). notifierName and notifierEmail are required unless
// category is CHILD_SEXUAL_ABUSE. website is the honeypot: always send ''.
export interface ContentNoticeRequestDto {
    category: NoticeCategory;
    locationText: string; // 10-2000 after trimming
    link?: string | null; // http(s), max 2000
    explanation: string; // 10-5000 after trimming
    notifierName?: string | null; // max 200
    notifierEmail?: string | null; // max 320
    goodFaith: true;
    website?: string; // honeypot
    locale?: string; // max 10; "el..." -> el, anything else -> en
}
export interface ContentNoticeReceiptDto {
    reference: string;
}
export interface ContentNoticeSummaryDto {
    id: string;
    reference: string;
    category: NoticeCategory;
    locationExcerpt: string;
    status: NoticeStatus;
    closeReason: NoticeCloseReason | null;
    outcome: ModerationOutcome | null;
    createdAt: string;
    handledAt: string | null;
}
export interface ContentNoticeDetailDto {
    id: string;
    reference: string;
    category: NoticeCategory;
    locationText: string;
    link: string | null;
    explanation: string;
    notifierName: string | null;
    notifierEmail: string | null;
    locale: string;
    status: NoticeStatus;
    closeReason: NoticeCloseReason | null;
    closeNote: string | null;
    outcome: ModerationOutcome | null;
    handledByUserId: string | null;
    handledAt: string | null;
    createdAt: string;
    // null unless ATTACHED, and null when the attached event was purged.
    attachment: { reportId: string; eventId: string; targetType: ReportTargetType; targetId: string } | null;
}
export interface NoticeEventCandidateDto {
    eventId: string;
    title: string;
    startAt: string;
    primaryHostName: string | null;
    status: EventStatus;
    deleted: boolean;
}
export interface NoticeItemCandidateDto {
    targetType: ReportTargetType;
    targetId: string;
    text: string | null;
    thumbnailUrl: string | null;
    authorDisplayName: string | null;
    createdAt: string;
}
export interface NoticeAttachRequestDto {
    eventId: string;
    targetType: ReportTargetType;
    targetId: string;
}
export interface NoticeCloseRequestDto {
    reason: NoticeCloseReason;
    note?: string | null;
} // note max 2000

// GET /api/admin/audit-log?targetId=&adminUserId=&page=&size= (Page, newest first).
export interface AdminAuditLogResponseDto {
    id: string;
    adminUserId: string;
    action: AdminAuditAction;
    targetType: string;
    targetId: string | null;
    eventId: string | null;
    details: Record<string, unknown>;
    ipAddress: string | null;
    createdAt: string;
}

// GET /api/events/{eventId}/theme-presets — what a host may pick for this event:
// not archived, illustrated, offered for its event type. Already in display order
// (the server sorts; there is no sortOrder on this shape).
export interface ThemePresetDto {
    id: string;
    key: string;
    name: LocalizedText; // { el, en }
    backgroundColor: string; // #RRGGBB
    illustrationUrl: string;
    titleColor: string | null; // #RRGGBB; null = ink
    headingFont: EventThemeFontDto | null; // null = the app's fonts
}

// PUT /api/events/{eventId}/theme — null (or omitted) clears the theme.
export interface EventThemeRequestDto {
    presetId: string | null;
}

// PUT /api/events/{eventId}/theme reply — NOT the event detail.
export interface EventThemeResponseDto {
    theme: EventThemeDto | null;
}

// The heading font as an admin preset row carries it.
export interface AdminThemeFontSummaryDto {
    id: string;
    key: string;
    familyName: string;
    fallback: 'serif' | 'sans-serif';
    archived: boolean;
    url: string | null;
}

// /api/admin/theme-presets — the whole catalog, archived and unillustrated included.
export interface AdminThemePresetDto {
    id: string;
    key: string; // immutable after create
    name: LocalizedText;
    backgroundColor: string;
    illustrationUrl: string | null; // null until uploaded; such a preset isn't offered to hosts
    eventTypes: EventTypeConvention[];
    sortOrder: number;
    archived: boolean;
    headingFont: AdminThemeFontSummaryDto | null;
    titleColor: string | null;
}

// POST /api/admin/theme-presets
export interface AdminThemePresetRequestDto {
    key: string;
    name: LocalizedText;
    backgroundColor: string;
    eventTypes: EventTypeConvention[];
    sortOrder: number;
    headingFontId?: string | null;
    titleColor?: string | null;
}

// PATCH /api/admin/theme-presets/{id}. Omitted fields stay as they are; sending `key` is rejected (3002).
export interface AdminThemePresetPatchDto {
    name?: LocalizedText;
    backgroundColor?: string;
    eventTypes?: EventTypeConvention[];
    sortOrder?: number;
    archived?: boolean;
    headingFontId?: string;
    titleColor?: string;
    clearHeadingFont?: boolean;
    clearTitleColor?: boolean;
}

// /api/admin/theme-fonts
export interface AdminThemeFontDto {
    id: string;
    key: string;
    familyName: string;
    fallback: 'serif' | 'sans-serif';
    archived: boolean;
    url: string | null; // null until a file is uploaded; such a font can't be put on a preset
    presetCount: number;
}

export interface AdminThemeFontRequestDto {
    key: string;
    familyName: string;
    fallback: 'serif' | 'sans-serif';
}

export interface AdminThemeFontPatchDto {
    familyName?: string;
    fallback?: 'serif' | 'sans-serif';
    archived?: boolean;
}

// Why an admin closed an event when no rule was broken (admin-event-management-fe-integration.md §7).
export type OperationalCloseReason = 'HOST_REQUEST' | 'DUPLICATE' | 'PAYMENT_ISSUE' | 'OTHER';

// admin-event-management-fe-integration.md. userId and email are null for a host with no account.
export interface AdminEventHostDto {
    userId: string | null;
    email: string | null;
    displayName: string | null;
    primary: boolean;
}

// GET /api/admin/events (Page<AdminEventSummaryDto>), newest first.
export interface AdminEventSummaryDto {
    id: string;
    title: string | null;
    eventType: string;
    status: EventStatus;
    planCode: string | null;
    startAt: string | null;
    endAt: string | null;
    createdAt: string;
    primaryHost: AdminEventHostDto | null;
    suspendedAt: string | null;
    closedAt: string | null;
    deletedAt: string | null;
}

export type AdminEventModuleSource = 'PLAN' | 'ADDON' | 'ADMIN_GRANT' | 'NONE';

// GET /api/admin/events/{id}; every grant and revoke answers with it, already updated.
export interface AdminEventDetailDto {
    id: string;
    title: string | null;
    eventType: string;
    status: EventStatus;
    visibility: EventVisibility | null;
    timezone: string | null;
    startAt: string | null;
    endAt: string | null;
    coverageEndsAt: string | null;
    createdAt: string;
    deletedAt: string | null;
    // storageBytes and maxMembers null = unlimited.
    plan: { id: string; code: string; name: string; storageBytes: number | null; maxMembers: number | null; moduleKeys: ModuleKey[] } | null;
    usage: {
        storageBytes: number;
        planStorageBytes: number | null;
        purchasedExtraStorageBytes: number;
        grantedStorageBytes: number;
        storageLimitBytes: number | null; // plan + purchased + granted; null = unlimited
        memberCount: number;
        planMaxMembers: number | null;
        extraMemberSlots: number;
        memberLimit: number | null; // planMaxMembers + extraMemberSlots; null = unlimited
    };
    hosts: AdminEventHostDto[]; // primary host first
    addons: {
        code: string;
        name: string;
        kind: PaidServiceKind;
        grantsModuleKey: string | null;
        grantsStorageBytes: number | null;
        activatedAt: string | null;
    }[];
    // One row per module the event's type supports.
    modules: { moduleKey: ModuleKey; enabled: boolean; source: AdminEventModuleSource }[];
    moduleGrants: { moduleKey: ModuleKey; reason: string; grantedByUserId: string | null; grantedAt: string }[];
    // Every setting an admin may override, for the modules the event's type supports.
    moduleConfigs: AdminEventModuleConfig[];
    // Null unless suspended or closed.
    suspension: { suspendedAt: string; closedAt: string | null; decision: ModerationDecisionDto | null } | null;
}

// A cap (COUNT: a number, null = unlimited) or a flag (FLAG: absent counts as off).
export type ModuleConfigKind = 'COUNT' | 'FLAG';

// One module setting of an event: the plan's value, the admin override if any, and what the event gets.
// A cap's override is an extra on top of the plan's; a flag's replaces it.
export interface AdminEventModuleConfig {
    moduleKey: ModuleKey;
    configKey: string;
    kind: ModuleConfigKind;
    planValue: number | boolean | null;
    effectiveValue: number | boolean | null;
    override: { extra: number | null; enabled: boolean | null; reason: string; setByUserId: string; setAt: string } | null;
}

// PUT /api/admin/events/{id}/modules/{moduleKey}/config/{configKey}. extra for a cap, enabled for a flag, never both.
export interface AdminModuleConfigOverrideRequestDto {
    extra: number | null;
    enabled: boolean | null;
    reason: string;
}

// PUT /api/admin/events/{id}/grants/storage. A total, not an increment; 0 removes the grant.
export interface AdminStorageGrantRequestDto {
    grantedStorageBytes: number;
    reason: string;
}

// PUT /api/admin/events/{id}/grants/members. A total, on top of the plan's maxMembers.
export interface AdminMemberGrantRequestDto {
    extraMemberSlots: number;
    reason: string;
}

// POST /api/admin/events/{id}/suspend.
export interface AdminEventSuspendRequestDto {
    ground: StatementGround;
    rule: GuidelinesRule;
    explanation: string;
    note: string | null;
}

// POST /api/admin/events/{id}/close: ground + rule, or operationalReason, never both.
export interface AdminEventCloseRequestDto {
    ground: StatementGround | null;
    rule: GuidelinesRule | null;
    operationalReason: OperationalCloseReason | null;
    explanation: string;
    note: string | null;
}
