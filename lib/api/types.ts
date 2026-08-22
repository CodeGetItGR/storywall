// Domain DTOs transcribed from event_social_media/docs/frontend-integration-guide.md.
// Route casing/paths live in lib/api/endpoints.ts, not here.

export type EventRole = 'HOST' | 'ATTENDEE';
export type EventVisibility = 'PUBLIC' | 'PRIVATE';
export type AttendanceStatus = 'ATTENDING' | 'DECLINED' | 'MAYBE';
export type AuthProvider = 'LOCAL' | 'OAUTH' | 'INVITE';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type PlatformRole = 'USER' | 'ADMIN' | 'GUEST';

// eventType is now a closed set on the backend (EventTypeKey), validated on
// POST /api/events against this exact union — an unknown value 400s with
// INVALID_EVENT_TYPE. Not every key is necessarily offered right now: which
// ones are currently enabled comes from GET /api/config's eventTypeKeys, not
// this type — build pickers from that, not from this union directly.
export type EventTypeConvention = 'WEDDING' | 'BAPTISM' | 'SOCIAL_EVENT' | 'BIRTHDAY' | 'CORPORATE' | 'FESTIVAL' | 'PRIVATE_PARTY' | 'CONFERENCE';
// Post.type / Reaction.reactionType are free strings server-side.
// moduleKey is now a closed set on the backend and should match the config payload.
export const EVENT_MODULE_KEYS = ['posts', 'rsvp', 'playlist', 'stories', 'gallery', 'wishlist', 'wishbook'] as const;
export type ModuleKeyConvention = (typeof EVENT_MODULE_KEYS)[number];
// Post.type is enforced server-side against this exact set (DB CHECK constraint
// + matching DTO validation) — not a free-string convention like the others.
export type PostType = 'TEXT' | 'MEDIA' | 'ANNOUNCEMENT' | 'PLAYLIST';
export type MediaTypeConvention = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
export type PlanScope = 'ACCOUNT' | 'EVENT';
export type BillingPeriod = 'MONTHLY' | 'YEARLY' | 'ONE_TIME';
export type EventStatus = 'DRAFT' | 'ACTIVE' | 'FROZEN' | 'PURGED';
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
    maxBatchUploadFiles: number;
    maxMediaPerPost: number;
    presignedUrlTtlMinutes: number;
    publicHost: string | null;
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
    maxActiveEvents: number | null;
    priceAmountMinor: number | null;
    priceCurrency: string | null;
    billingPeriod: BillingPeriod | null;
    recurringPriceAmountMinor: number | null;
    includedMonths: number | null;
    discountPercent: number | null;
    discountLabel: string | null;
    discountStartsAt: string | null;
    discountEndsAt: string | null;
    moduleKeys: ModuleKey[];
    // MODULE_UNLOCK upsells for this plan, server-cross-referenced. Only null
    // from the admin catalog endpoints (GET /api/admin/plan-tiers, .../{id}),
    // which don't compute it — never null from /api/config or /api/plan-tiers.
    paidModules: PaidServiceResponseDto[] | null;
    eventTypeKeys: EventTypeConvention[];
}

export interface PlatformModuleResponseDto {
    id: string;
    moduleKey: ModuleKey;
    name: string;
    description: string | null;
    isEnabled: boolean;
    sortOrder: number;
}

// Every localized field from the backend is a locale map, not a fixed
// {en, el}-only shape — read whichever key matches the active locale rather
// than destructuring exactly two keys. See event-type-voice-pack-fe-integration.md.
export type LocalizedText = Record<string, string>;

export type EventTypeAccentToken = 'rose' | 'sky' | 'amber';

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

export interface AppConfigResponseDto {
    featureFlags: PlatformFeatureFlagResponseDto[];
    media: AppMediaConfigDto;
    pagination: { defaultPageSize: number; maxPageSize: number };
    planTiers: PlanTierResponseDto[];
    paidServices: PaidServiceResponseDto[];
    eventModuleKeys: ModuleKey[];
    modules: PlatformModuleResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    eventTypeKeys: EventTypeConvention[];
    rsvp: AppRsvpConfigDto;
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
    displayName: string;
}

export interface RegisterRequestDto {
    email: string;
    password: string;
}

export interface LoginRequestDto {
    email: string;
    password: string;
}

export interface RefreshRequestDto {
    refreshToken: string;
}

export interface LogoutRequestDto {
    refreshToken: string;
}

export interface GuestLoginRequestDto {
    inviteToken: string;
    displayName: string;
    guestKey?: string;
}

// --- §4 Users, Me, Sessions, Notifications ---

// Notifications are produced by backend sweeps/actions; clients can only read,
// mark read, mark all read, and dismiss them.
export type BillingNotificationType = 'BILLING_EXPIRING' | 'BILLING_PAST_DUE' | 'BILLING_PURGE_WARNING' | 'REFUND_APPROVED' | 'REFUND_REJECTED';

export type NotificationCategory = 'LIMIT' | 'OFFER' | 'TIP' | 'SYSTEM' | 'BILLING' | (string & {});
export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

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
    ctaRoute?: string | null;
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
}

export interface UserResponseDto {
    id: string;
    email: string;
    authProvider: AuthProvider;
    isGuestAccount: boolean;
    status: AccountStatus;
    platformRole: PlatformRole;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

// --- §5 Event domain ---

export interface EventRequestDto {
    title: string;
    planTierCode?: PlanTierCode;
    subtitle?: string;
    description?: string;
    eventType: EventTypeConvention;
    visibility: EventVisibility; // required on this DTO despite the entity's DB default of PRIVATE
    startAt: string;
    endAt?: string;
    timezone: string;
    locationName?: string;
    locationAddress?: string;
    mapsUrl?: string;
    coverMediaId?: string;
    brandingSettings: Record<string, unknown>; // required — send {} if none
    rsvpDeadline?: string;
    isArchived: boolean; // required — send false explicitly
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
    timezone: string;
    locationName: string | null;
    locationAddress: string | null;
    mapsUrl: string | null;
    coverMediaId: string | null;
    brandingSettings: Record<string, unknown>;
    rsvpDeadline: string | null;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface EventScheduleDto {
    startAt: string;
    endAt: string | null;
    timezone: string;
    rsvpDeadline: string | null;
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
    maybe: number;
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
    isArchived: boolean;
    hosts: EventHostResponseDto[];
    modules: EventModuleResponseDto[];
    sessions: EventSessionResponseDto[];
    rsvpSummary: EventRsvpSummaryDto;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    status: EventStatus;
}

export interface CheckoutResponseDto {
    orderId: string;
    redirectUrl: string;
}
export interface UpgradeCheckoutRequestDto {
    planTierCode: PlanTierCode;
}
export interface CoverageSummaryDto {
    unlimited: boolean;
    paidThrough: string | null;
    covered: boolean;
    freezesAt: string | null;
    purgesAt: string | null;
}
// `cancelAtPeriodEnd` splits ACTIVE in two: renewing, or cancelled-but-still-paid-up.
// Rendering on `status` alone tells a host their event will renew when it will not.
export interface SubscriptionSummaryDto {
    id: string;
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    cancelledAt: string | null;
}
export interface OrderSummaryDto {
    id: string;
    kind: 'ACTIVATION' | 'RENEWAL' | 'UPGRADE' | 'STORAGE_PACK';
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    amountMinor: number;
    addonAmountMinor: number | null;
    currency: string;
    coversFrom: string | null;
    coversUntil: string | null;
    paidAt: string | null;
    createdAt: string;
}
export interface EventAddonDto {
    code: string;
    name: string;
    // What this costs at billingPeriod's cadence — not necessarily a monthly figure.
    priceAmountMinor: number;
    // 'MONTHLY' (on every renewal) or 'ONE_TIME' (paid once, at activation). Only a
    // MODULE_UNLOCK is ever 'ONE_TIME'.
    billingPeriod: BillingPeriod;
    activatedAt: string;
}

export interface EventAddonRequestDto {
    paidServiceCode: string;
}
export interface EventBillingResponseDto {
    eventStatus: EventStatus;
    planTierCode: string;
    planTierName: string;
    coverage: CoverageSummaryDto;
    subscription: SubscriptionSummaryDto | null;
    orders: OrderSummaryDto[];
    addons: EventAddonDto[];
}
export type RefundRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export interface RefundEligibilityResponseDto {
    eligible: boolean;
    reasons: string[];
    hasPendingRequest: boolean;
}
export interface RefundRequestResponseDto {
    id: string;
    eventId: string;
    orderId: string;
    status: RefundRequestStatus;
    reason: string;
    amountMinor: number | null;
    currency: string | null;
    requestedById: string;
    requestedAt: string;
    decidedById: string | null;
    decidedAt: string | null;
    decisionNote: string | null;
    providerRefunded: boolean;
}

// --- Admin billing operations (billing-fe-guide §13) ---

// The refund queue row: the request plus the usage evidence an admin needs to
// decide it. Counts include soft-deleted rows, matching the eligibility gates.
export interface RefundRequestAdminDto {
    request: RefundRequestResponseDto;
    eventTitle: string;
    eventStatus: EventStatus;
    eventStartAt: string | null;
    eventEndAt: string | null;
    paidAt: string | null;
    hostDisplayName: string | null;
    hostEmail: string | null;
    currentlyEligible: boolean;
    ineligibilityReasons: string[];
    guestCount: number;
    hostCount: number;
    postCount: number;
    mediaCount: number;
    storageBytes: number;
}

export interface RefundDecisionRequestDto {
    note?: string | null;
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
    metadata: Record<string, unknown>;
    expiresAt: string | null;
    revokedAt: string | null;
    createdByUserId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface QrLinkStatsDto {
    qrLinkId: string;
    label: string | null;
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
    eventStatus?: 'ACTIVE' | 'FROZEN';
    inviteToken?: string;
    requiresAuth?: boolean;
    requiresGuestKey?: boolean;
}

export interface UnprocessedWebhookDto {
    id: string;
    provider: string | null;
    providerEventId: string | null;
    eventType: string | null;
    payloadSummary?: string | null;
    receivedAt: string;
    processedAt: string | null;
    orderId: string | null;
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
    isArchived?: boolean;
    keepOriginals?: true;
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
    inviteToken?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    maxGuests: number;
    expiresAt?: string;
    usedAt?: string | null; // system-managed; set on accept
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
    avatarMediaId?: string;
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
    avatarMediaId: string | null;
    joinedAt: string;
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
    avatarMediaId?: string;
}

export interface EventModuleRequestDto {
    eventId: string;
    moduleKey: ModuleKey;
    isEnabled: boolean;
    configuration: Record<string, unknown>;
}

export interface EventModuleResponseDto {
    id: string;
    eventId: string;
    moduleKey: ModuleKey;
    isEnabled: boolean;
    configuration: Record<string, unknown> | null;
    createdAt: string;
    isAvailable: boolean;
}

export interface EventModulePatchDto {
    isEnabled?: boolean;
    configuration?: Record<string, unknown>;
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
    createdAt: string;
    deletedAt: string | null;
}

export interface EventSessionPatchDto {
    title?: string;
    description?: string;
    startAt?: string;
    endAt?: string;
    locationName?: string;
    mapsUrl?: string;
    displayOrder?: number;
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

export interface RsvpSessionResponsPatchDto {
    isAttending?: boolean;
}

// --- §6 Media domain ---

export interface MediaResponseDto {
    id: string;
    eventId: string;
    uploaderMemberId: string | null;
    storageKey: string;
    mediaUrl: string;
    originalFilename: string;
    mimeType: string;
    mediaType: MediaTypeConvention;
    fileSize: number;
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
    metadata: Record<string, unknown>;
    createdAt: string;
    deletedAt: string | null;
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

export interface StorageCheckoutRequestDto {
    paidServiceCode: string;
}

export interface OriginalMediaUrlDto {
    url: string;
}

export interface AccountUsageResponseDto {
    userId: string;
    planTier: PlanTierCode;
    activeEvents: number;
    activeEventLimit: number | null;
    activeEventPercent: number;
}

export interface PostRequestDto {
    eventId: string;
    authorMemberId?: string;
    type: PostType;
    content?: string;
    isPinned: boolean; // required — no server-side default
    mediaIds?: string[];
}

// Embedded on PostResponseDto — null when the post has no author (rare,
// media-only import) or the authoring member has since left the event
// (Post.authorMember uses ON DELETE SET NULL, so the post survives but
// authorship is dropped).
export interface PostAuthorDto {
    memberId: string;
    displayName: string;
    nickname: string | null;
    role: EventRole;
    avatarMediaId: string | null;
    // Can be null even when avatarMediaId is set — the avatar reference has
    // no DB foreign-key constraint, so a dangling id resolves to null rather
    // than erroring. Fall back to a placeholder avatar.
    avatarUrl: string | null;
}

export interface PostResponseDto {
    id: string;
    eventId: string;
    authorMemberId: string | null;
    author: PostAuthorDto | null;
    type: PostType;
    content: string | null;
    isPinned: boolean;
    // Already ordered by displayOrder and URL-resolved — render as-is.
    media: MediaResponseDto[];
    commentCount: number;
    reactionCount: number;
    // True if the requesting member has any reaction on the post. Always
    // false immediately after POST /api/posts (a fresh post can't have
    // reactions yet) and false for a caller who isn't a member of the
    // post's event — both resolved server-side.
    likedByCurrentUser: boolean;
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
    mediaId: string;
    caption: string | null;
    songUrl: string | null;
    expiresAt: string;
    createdAt: string;
    deletedAt: string | null;
    // Whether the requesting member has already POSTed a view for this story.
    viewedByCurrentUser: boolean;
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
    targetType: string;
    targetId: string;
    reason: string;
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
    maxActiveEvents?: number | null;
    priceAmountMinor?: number | null;
    priceCurrency?: string | null;
    billingPeriod?: BillingPeriod | null;
    recurringPriceAmountMinor?: number | null;
    includedMonths?: number | null;
    discountPercent?: number | null;
    discountLabel?: string | null;
    discountStartsAt?: string | null;
    discountEndsAt?: string | null;
}

export type PlanTierPatchDto = Partial<Omit<PlanTierRequestDto, 'code' | 'scope'>>;

export interface PlanModulesRequestDto {
    moduleKeys: ModuleKey[];
}

export interface PlanEventTypesRequestDto {
    eventTypeKeys: EventTypeConvention[];
}

export interface PlanAssignmentRequestDto {
    planTierCode: PlanTierCode;
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
