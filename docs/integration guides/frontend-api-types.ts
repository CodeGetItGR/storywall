/**
 * TypeScript type schema for the event_social_media API.
 *
 * Generated directly from the current backend DTOs/entities (not from prose docs) as of
 * 2026-07-30. Swept field-by-field against every DTO under src/main/java/event_social_media/dto
 * on 2026-09-23: first to close the drift that had accumulated since (see the per-field notes for
 * what changed and when), then to add the ~65 DTOs that had never been documented here at all --
 * the admin catalog, checkout and withdrawal bodies, the collaboration and discount-code
 * endpoints, and the admin metrics dashboard. Every DTO in that package now has an interface of
 * the same name, so a type missing from this file means a type missing from the backend.
 * Companion reference to docs/fe-guides/frontend-integration-guide.md, which covers
 * endpoints, auth rules, and error codes — this file is just the shapes.
 *
 * Conventions:
 *   - A field with no `?` and no `| null` is required on write / always present on read.
 *   - `?` means the field may be omitted entirely (request) or is always present but may be
 *     omitted historically only on request DTOs — response DTOs use `| null` instead of `?`
 *     for fields the server may legitimately return as null.
 *   - UUIDs, and OffsetDateTime, are both `string` on the wire (ISO-8601 for dates).
 */

// ---------------------------------------------------------------------------
// Error handling (RFC 7807 ProblemDetail — every error response has this shape)
// ---------------------------------------------------------------------------

interface ApiError {
  type: string;      // always "about:blank"
  title: string;     // HTTP reason phrase
  status: number;
  detail: string;
  instance: string;  // request path that failed
  errorCode: number | string; // number for GlobalExceptionHandler errors; string ("AUTHENTICATION_REQUIRED" | "ACCESS_DENIED") for the two auth-entrypoint special cases
  errorKey: string;
  errors?: Record<string, string>; // only present on 400 validation failures, first message per field
}

// Cross-cutting cases GlobalExceptionHandler now maps to a specific status/errorCode instead of a
// generic 500/9001 INTERNAL_ERROR (2026-08-23). None of these are endpoint-specific, so they apply
// wherever the trigger condition can occur:
//   - Malformed path/query param (bad UUID, unknown enum value) -> 400, errorCode 3001 VALIDATION_FAILED,
//     `detail` names the offending parameter.
//   - Wrong HTTP method for a mapped path (e.g. POST /api/sessions, which is GET-only) -> 405,
//     errorCode 3020 METHOD_NOT_ALLOWED, `Allow` response header lists the supported methods.
//   - Wrong Content-Type (e.g. JSON body to a multipart endpoint) -> 415, errorCode 3002
//     MALFORMED_REQUEST_BODY.
//   - A write that loses a DB-level unique-constraint race (e.g. two concurrent registrations for
//     the same email) -> 409, errorCode 5001 CONFLICT, generic "conflicts with existing data" detail
//     that does not leak the constraint name.

// Spring Data's Page<T> JSON shape, as of the PagedModel/VIA_DTO migration (see
// docs/fe-pagination-migration.md). Every endpoint documented below as returning
// `Page<T>` now returns this shape instead of the old flat PageImpl JSON.
interface Page<T> {
  content: T[];
  page: {
    size: number;
    number: number; // current page, 0-indexed
    totalElements: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

type AuthProvider = "LOCAL" | "OAUTH" | "INVITE";
type AccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
type PlatformRole = "USER" | "ADMIN" | "GUEST";

type EventRole = "HOST" | "ATTENDEE";
type EventVisibility = "PUBLIC" | "PRIVATE"; // default PRIVATE server-side, but required on EventRequestDto
type EventStatus = "DRAFT" | "ACTIVE"; // DRAFT until the chosen plan is paid for. DB CHECK enforces the pair
type AttendanceStatus = "ATTENDING" | "DECLINED" | "MAYBE";

type PostType = "TEXT" | "MEDIA" | "ANNOUNCEMENT" | "PLAYLIST"; // server-enforced via @Pattern + DB CHECK

// ---------------------------------------------------------------------------
// Auth (/api/auth/*) — all public, no token required
// ---------------------------------------------------------------------------

interface RegisterRequestDto {
  email: string; password: string; // password 8-100 chars
  firstName: string; lastName: string; // both required, max 100
  /**
   * UUID from an event invite link. When present and valid, the new account is also joined to that
   * invitation's event, with the invitation's own role (ATTENDEE unless it says otherwise).
   * Redemption is best-effort: an invalid, expired or exhausted token is ignored rather than
   * failing registration, and nothing in the response says whether it took. Check the user's
   * memberships afterwards rather than assuming they are in the event.
   */
  inviteToken?: string;
  /**
   * Join the mailing list. Added 2026-09-23. The account's own verification email doubles as the
   * newsletter confirmation, so there is no second email and no extra step in this flow.
   * Ignored (never rejected) while the newsletter is off — see AppNewsletterConfigDto.enabled.
   */
  subscribeToNewsletter?: boolean;
}
interface LoginRequestDto {
  email: string; password: string;
  /** Same contract as on RegisterRequestDto, for someone who followed an invite link but already
   *  has an account: best-effort join, never a reason for the login itself to fail. */
  inviteToken?: string;
}
interface RefreshRequestDto { refreshToken: string; } // also the body for /logout
interface GuestLoginRequestDto {
  inviteToken: string;   // UUID
  displayName: string;
  /**
   * Opaque per-device key. Generate once (crypto.randomUUID()), persist in localStorage, send it
   * on every guest-login thereafter. REQUIRED whenever the invite is shared by more than one
   * guest — which is every QR link. Omitting it there is a 400. Max 64 chars.
   * See `QrLinkResolutionDto.requiresGuestKey`.
   */
  guestKey?: string;
}

interface AuthResponseDto {
  accessToken: string;
  refreshToken: string | null; // null for guest-login
  userId: string;
  email: string | null;        // null for anonymous guests
  firstName: string | null;    // null for anonymous guests
  lastName: string | null;     // null for anonymous guests
  profilePictureUrl: string | null; // presigned, time-limited — re-fetch on expiry, don't cache long-term
  authProvider: AuthProvider;
  isGuestAccount: boolean;
  status: AccountStatus;
  createdAt: string;
  role: PlatformRole;
  /** Identifies this guest's membership under a *shared* invite link. Null on every other auth
   *  response, including guest logins to a single-use invitation. Persist it (local storage) and
   *  send it back unchanged as `guestKey` on every later POST /api/auth/guest-login from the same
   *  device, or that device is issued a brand-new membership instead of being recognised. */
  guestKey: string | null;
}

/** POST /api/auth/oauth/{provider} — provider is 'google' or 'apple'. Answers AuthResponseDto,
 *  the same shape a password login does. */
interface OAuthLoginRequestDto {
  /** The raw ID token from the provider's own client-side SDK. Never a code or an access token. */
  idToken: string;
  /** Same best-effort invite redemption as on RegisterRequestDto. */
  inviteToken?: string;
}

/** POST /api/auth/verify-email — 204. */
interface VerifyEmailRequestDto {
  /** The raw token from the emailed link; 43 chars in practice, rejected above 200. The bound is
   *  deliberately loose so a mangled link fails the lookup rather than validation — the caller
   *  cannot tell the two apart, which is the point. */
  token: string;
}

/** POST /api/auth/resend-verification — 204 whether or not the address has an account.
 *  Takes an address rather than the authenticated principal, because the person who most needs
 *  this is the one who mistyped theirs and cannot receive anything at it. */
interface ResendVerificationRequestDto {
  email: string;   // required, max 255
}

/** POST /api/auth/forgot-password — always 204. Whether the address has an account is never
 *  reported back, so there is nothing to branch on: show "if that address is registered, check
 *  your inbox" and stop. */
interface ForgotPasswordRequestDto {
  email: string;   // required, max 255
}

/** POST /api/auth/reset-password — 204. */
interface ResetPasswordRequestDto {
  token: string;       // raw token from the emailed link, max 200
  newPassword: string; // 8-100, the same bounds registration applies
}

// ---------------------------------------------------------------------------
// Users, Sessions, Notifications
// ---------------------------------------------------------------------------

/** Admin-only PATCH /api/users/{id} body — every field optional, partial update. */
interface UserRequestDto {
  email?: string;
  authProvider?: AuthProvider;
  isGuestAccount?: boolean;
  status?: AccountStatus;
  platformRole?: PlatformRole;
  /** Admin-only. True bars the account from creating events of its own — used for
   *  promoter-provisioned accounts whose events are created for them. See
   *  fe-guides/promoter-account-provisioning-fe-integration.md. */
  eventCreationLocked?: boolean;
} // no password field — passwords only ever set via /api/auth/register

interface UserResponseDto {
  id: string; email: string; firstName: string; lastName: string;
  profilePictureUrl: string | null; // presigned, time-limited — re-fetch on expiry, don't cache long-term
  authProvider: AuthProvider; isGuestAccount: boolean;
  emailVerified: boolean;
  status: AccountStatus; platformRole: PlatformRole;
  locale: string | null;        // BCP-47; the account's chosen UI/mail language, null = none set
  eventCreationLocked: boolean; // true = this account may not create events; see UserRequestDto
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
// GET /api/users now returns Page<UserResponseDto>, not UserResponseDto[].
// Default 50/page, max 100 (?page=&size=), sorted createdAt desc then id desc (newest first).

/**
 * POST /api/users/provisioned — admin only. Creates an account with no self-registration step,
 * for a promoter running events on somebody's behalf. Deliberately has no password field: the
 * account is created with a random one, marked email-verified, and sent a password-reset mail
 * immediately, so the admin never handles a credential.
 * See fe-guides/promoter-account-provisioning-fe-integration.md.
 */
interface AdminUserProvisionRequestDto {
  email: string;      // required, max 255
  firstName: string;  // required, max 100
  lastName: string;   // required, max 100
}

/** PATCH /api/me — the fields a user may change about themselves. Anything account-level (email,
 *  role, status) goes through the admin UserRequestDto instead. Omitted fields are left alone. */
interface MeUpdateRequestDto {
  firstName?: string;  // max 100
  lastName?: string;   // max 100
  /** 'en' or 'el' — anything else is a 400. Drives server-rendered content: notification mail and
   *  the notification feed. See fe-guides/backend-localization-fe-integration.md. */
  locale?: string;
}

/** POST /api/me/change-password — 204. */
interface ChangePasswordRequestDto {
  currentPassword: string; // required — proves the caller holds the account
  newPassword: string;     // 8-100, the same bounds registration applies
}

/** Read-only — no request DTO. POST /api/sessions was removed entirely. */
interface SessionResponseDto {
  id: string; userId: string; ipAddress: string; userAgent: string;
  refreshTokenHash: string; expiresAt: string; createdAt: string; revokedAt: string | null;
}

/**
 * Notifications are host-facing and produced solely by the backend quota sweep.
 * There is no request DTO — POST /api/notifications was removed entirely.
 */
// NOTE: also missing EVENT_REMINDER, EVENT_SUMMARY, EVENT_AUTO_DELETE_WARNING, BILLING_EXPIRING,
// BILLING_PAST_DUE, BILLING_PURGE_WARNING, WITHDRAWAL_REFUNDED, WITHDRAWAL_HELD,
// WITHDRAWAL_WITHHELD — see billing-fe-guide.md §10, which already asked for these to be added.
// Pre-existing gap, not part of the 2026-08-24 change below. (REFUND_APPROVED/REFUND_REJECTED,
// formerly listed here, are dead as of 2026-09-18 — nothing emits them any more.)
type NotificationType =
  | 'STORAGE_LIMIT_WARNING'
  | 'MEMBER_LIMIT_WARNING'
  | 'UPGRADE_OFFER'
  | 'HOST_TIP';

/** OFFER is marketing (gated on consent for email); the rest are transactional. */
type NotificationCategory = 'LIMIT' | 'OFFER' | 'TIP' | 'SYSTEM';

type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

// 2026-09-04: ctaRoute (a literal, backend-built path) is gone, replaced by ctaTarget + ctaParams.
// The backend no longer guesses this app's route structure — YOU resolve ctaTarget into a URL using
// your own router. Keep this map in sync with NotificationCtaTarget on the backend:
//
//   EVENT_PLAN_SETTINGS -> your event plan/upgrade settings screen, needs params.eventId
//   EVENT_GALLERY        -> your event gallery screen, needs params.eventId
//   EVENT_GUESTS          -> your event guest list screen, needs params.eventId
//
// ctaTarget is a closed, growable set — treat an unrecognized value defensively (hide the CTA
// rather than crash) so a future backend addition degrades gracefully instead of breaking the feed.
// See notification-cta-target-fe-integration.md for the full migration guide.
type NotificationCtaTarget = 'EVENT_PLAN_SETTINGS' | 'EVENT_GALLERY' | 'EVENT_GUESTS';

interface NotificationResponseDto {
  id: string;
  /**
   * All three are null for an account-level notification. As of 2026-08-24 (EVENT_CAP_WARNING
   * removed) no current type is account-level — every notification is per-event — but the fields
   * stay nullable in case that changes again.
   */
  recipientMemberId: string | null;
  eventId: string | null;
  eventTitle: string | null;
  type: NotificationType;
  category: NotificationCategory;
  severity: NotificationSeverity;
  /** Pre-rendered by the backend with the figures as measured; display verbatim. */
  title: string;
  body: string;
  ctaLabel: string | null;
  /** Null together with ctaLabel when the notification offers no action. */
  ctaTarget: NotificationCtaTarget | null;
  /** Substitution values for ctaTarget's route, e.g. `{ eventId: "…" }`. Empty when ctaTarget is null. */
  ctaParams: Record<string, string>;
  /** Offers and tips lapse. Expired ones are already filtered out of the feed. */
  expiresAt: string | null;
  referenceType: string | null;
  referenceId: string | null;
  /** Raw measurement for progress bars — shape varies by `type`. See the guide. */
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  deletedAt: string | null;
}
// GET /api/notifications now returns Page<NotificationResponseDto>, not NotificationResponseDto[].
// Default 30/page, max 100 (?page=&size=), sorted createdAt desc then id desc (newest first).
// unreadOnly is unaffected — still ?unreadOnly=true, now combined with &page=&size=.

// ---------------------------------------------------------------------------
// Plans and usage
// ---------------------------------------------------------------------------

/** GET /api/events/{eventId}/usage — HOST only. Percentages are uncapped (>100 = over). */
interface EventUsageResponseDto {
  eventId: string;
  /**
   * An event's tier grants its storage + member quotas — the only quotas left; a user's own
   * (`ACCOUNT`-scope) plan grants none. Plan codes are no longer a fixed union — admins can create
   * new plans at runtime via the plan-tier admin endpoints, so this is `string`, not
   * `'FREE' | 'PLUS' | 'PRO'`. The wire value is unchanged (existing checks like
   * `planTier === 'FREE'` still work); only the declared type widened. See
   * fe-guides/billing-fe-guide.md.
   */
  planTier: string;
  storageBytes: number;
  planStorageBytes: number | null;  // the plan's own ceiling, before anything purchased. null = unlimited
  extraStorageBytes: number;        // bytes added by settled storage-pack purchases
  storageLimitBytes: number | null; // the effective ceiling: planStorageBytes + extraStorageBytes
  storagePercent: number;
  memberCount: number;
  memberLimit: number;
  memberPercent: number;
}

// GET /api/me/usage and its AccountUsageResponseDto were removed 2026-08-24, along with the
// account-level active-event cap they reported — see
// fe-guides/account-event-quota-removed-fe-integration.md.

// ---------------------------------------------------------------------------
// Event domain
// ---------------------------------------------------------------------------

interface EventRequestDto {
  title: string;                 // required, max 255
  subtitle?: string;              // max 255
  description?: string;
  eventType: string;              // required, max 50 — free text (WEDDING | BAPTISM | BIRTHDAY | SOCIAL_EVENT | PRIVATE_PARTY | GENDER_REVEAL | BABY_SHOWER | <custom>)
  visibility: EventVisibility;    // required on this DTO despite the entity's DB default
  startAt: string;                // required
  endAt: string;                  // required, must be after startAt
  timezone: string;               // required, max 100
  locationName?: string;          // max 255
  locationAddress?: string;
  mapsUrl?: string;
  coverMediaId?: string;
  brandingSettings: Record<string, unknown>; // required — send {} if none
  rsvpDeadline?: string;
  planTierCode: string;           // required, max 30 — the EVENT-scope plan being bought for
                                   // this event. There is no free plan, so there is no default to
                                   // fall back to; resolved server-side against the public catalog,
                                   // so the client's word on price or availability is never taken.
  coverageOptionId: string;       // required — added 2026-09-23. The id of one of the plan's
                                   // initialOptions: the duration being bought. 400
                                   // COVERAGE_OPTION_INVALID (5077) when missing, retired, or
                                   // another plan's. Optional only on admin provisioning.
  initialSessionTitle?: string;   // max 255 — when set, seeds an EventSession anchored to
                                   // startAt/endAt (displayOrder 0) in the same transaction; see
                                   // fe-guides/event-creation-initial-session-fe-integration.md
}

/** Returned by GET /api/events (list) and POST /api/events — flat summary shape. */
interface EventResponseDto {
  id: string; title: string; subtitle: string | null; description: string | null;
  eventType: string; visibility: EventVisibility;
  startAt: string; endAt: string; timezone: string;
  locationName: string | null; locationAddress: string | null; mapsUrl: string | null;
  coverMediaId: string | null;
  brandingSettings: Record<string, unknown>;
  rsvpDeadline: string | null;
  coverageEndsAt: string | null;    // null while DRAFT — added 2026-09-21; galleryOpensAt removed 2026-09-23
  projectedCoverage: ProjectedCoverageDto | null;                   // DRAFT only — added 2026-09-21
  status: EventStatus;
  createdAt: string; updatedAt: string; deletedAt: string | null;
  // Computed, not stored: deletedAt + app.billing.event-retention-days. Null unless the event is
  // pending deletion. See fe-guides/event-deletion-fe-integration.md.
  deletionScheduledFor: string | null;
}

/** The window a DRAFT would be pinned to if paid for right now. See fe-guides/event-coverage-window-fe-integration.md. */
interface ProjectedCoverageDto { coverageEndsAt: string; hostingMonths: number; } // hostingMonths = the draft's coverage option's months; galleryOpensAt removed 2026-09-23

interface CoHostInviteRequestDto { userId: string; } // required

/** PATCH /api/events/{id} body — every field optional, no Bean Validation, {} is a valid no-op. */
interface EventPatchDto {
  title?: string; subtitle?: string; description?: string;
  visibility?: EventVisibility;
  startAt?: string; endAt?: string; timezone?: string;
  locationName?: string; locationAddress?: string; mapsUrl?: string;
  coverMediaId?: string; brandingSettings?: Record<string, unknown>;
  rsvpDeadline?: string;
  // keepOriginals was removed 2026-09-23: every plan keeps originals. Sending it is a 400 (3002).
  /** Switches a DRAFT to another of its plan's initialOptions (added 2026-09-23). 409
   *  EVENT_NOT_DRAFT once paid for; sending the current option back is always a no-op. */
  coverageOptionId?: string;
} // no eventType — not editable via PATCH

/**
 * POST /api/admin/events — admin only. Creates a fully scaffolded, already-live event owned by
 * `hostUserId` rather than by the caller, skipping checkout. The nested body is the ordinary
 * EventRequestDto, validated the same way, except that `event.coverageOptionId` is optional here
 * (added 2026-09-23): omitted, the event gets the plan's shortest live duration, and a plan with
 * none is a 409 COVERAGE_OPTION_UNAVAILABLE (5078).
 */
interface AdminEventProvisionRequestDto {
  hostUserId: string;
  event: EventRequestDto;
}

/**
 * POST /api/events/{eventId}/deletion-requests — the second step of deleting an event. The first
 * step (POST .../deletion-requests/otp) emails a code; this submits it. A password is deliberately not
 * accepted here. See fe-guides/event-deletion-fe-integration.md.
 */
interface EventDeletionRequestDto {
  otpCode: string;   // exactly 6 digits — anything else is a 400 before the code is even checked
}

// --- GET /api/events/{id} detail response (grouped/enriched — added 2026-07-30) ---

interface EventScheduleDto {
  startAt: string; endAt: string; timezone: string; rsvpDeadline: string | null;
  coverageEndsAt: string | null;    // null while DRAFT — added 2026-09-21; galleryOpensAt removed 2026-09-23
  projectedCoverage: ProjectedCoverageDto | null;                   // DRAFT only — added 2026-09-21
}
interface EventLocationDto {
  name: string | null; address: string | null; mapsUrl: string | null;
}
interface EventRsvpSummaryDto {
  totalMembers: number; attending: number; declined: number; noResponse: number;
}
/**
 * Returned by GET /api/events/{id} only (not the list endpoint). Everything that scales
 * with event activity — posts, comments, reactions, stories, individual media, individual
 * RSVPs, playlist suggestions/votes — is intentionally excluded; fetch those from their own
 * paginatable endpoints.
 */
interface EventDetailResponseDto {
  id: string; title: string; subtitle: string | null; description: string | null;
  eventType: string; visibility: EventVisibility;
  status: EventStatus;
  schedule: EventScheduleDto;
  location: EventLocationDto;
  coverMedia: MediaResponseDto | null; // resolved, with a fresh presigned mediaUrl — not just an id
  brandingSettings: Record<string, unknown>;
  hosts: EventHostResponseDto[];       // small, bounded — co-hosts
  modules: EventModuleResponseDto[];   // fixed-size — one per module key
  sessions: EventSessionResponseDto[]; // bounded agenda items
  rsvpSummary: EventRsvpSummaryDto;    // aggregate counts only, not the individual RSVPs
  createdAt: string; updatedAt: string; deletedAt: string | null;
  deletionScheduledFor: string | null; // same contract as on EventResponseDto
}

// --- Event Hosts ---

interface EventHostRequestDto { eventId: string; memberId: string; displayOrder: number; } // all required
interface EventHostResponseDto { id: string; eventId: string; memberId: string; displayOrder: number; createdAt: string; }
interface EventHostPatchDto { displayOrder?: number; } // the only editable field

// --- Event Invitations ---

interface EventInvitationRequestDto {
  eventId: string;
  inviteCode: string;    // required, max 100 chars
  email?: string;        // must be a well-formed email, max 255
  firstName?: string;    // max 100
  lastName?: string;     // max 100
  maxGuests: number;     // required
  expiresAt?: string;
  // inviteToken and usedAt were removed 2026-09-21: the token is always server-minted and usedAt
  // is stamped on accept. Sending either now fails the request with 400 (unknown property).
}
interface EventInvitationResponseDto {
  id: string; eventId: string; inviteCode: string; inviteToken: string;
  email: string | null; firstName: string | null; lastName: string | null;
  maxGuests: number; expiresAt: string | null; usedAt: string | null; createdAt: string;
  /** Added 2026-08-16. 'HOST' = co-host invitation, 'ATTENDEE' = ordinary guest one.
   *  `GET /api/events/{eventId}/invitations` returns both kinds — filter on this to keep
   *  co-host invitations out of the guest list. */
  role: EventRole;
}

/**
 * POST /api/events/{eventId}/host-invitations — host only. Invites somebody to co-host who may
 * not have an account yet, as opposed to CoHostInviteRequestDto above, which promotes an account
 * you already hold the id for.
 *
 * `email` is required here, unlike on a guest invitation where it is a prefill hint: acceptance is
 * bound to this exact address on a verified account (403 / 5044 otherwise). No maxGuests — the
 * server pins it to 1 and marks the invitation non-shared.
 */
interface CoHostInvitationRequestDto {
  email: string;        // required, max 255
  firstName?: string;   // max 100
  lastName?: string;    // max 100
  expiresAt?: string;   // omit for an invitation that never expires
}
interface EventInvitationPatchDto { // every field optional
  firstName?: string; lastName?: string; email?: string;
  maxGuests?: number; expiresAt?: string;
} // no inviteCode/inviteToken (immutable), no usedAt (system-managed)

/**
 * GET /api/event-invitations/{inviteToken}/preview — public, no auth. Renders the invite landing
 * page before the visitor has decided to join as a guest, log in, or register.
 *
 * `expired` and `alreadyUsed` are the two states worth rendering differently; a token that never
 * existed is a 404. Carries no member list and no host contact details.
 */
interface EventInvitationPreviewDto {
  inviteToken: string;
  eventId: string;
  eventTitle: string;
  eventSubtitle: string | null;
  eventDescription: string | null;
  coverMediaId: string | null;
  /** Prefill hints from the invitation, when it named somebody. Null on a shared/QR invitation. */
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  expired: boolean;
  alreadyUsed: boolean;
}

// --- Event Members ---

interface EventMemberRequestDto {
  eventId: string; userId?: string; invitationId?: string;
  role: EventRole;
  displayName: string;    // required, max 150
  nickname?: string;      // max 100
  relationshipRole?: string;       // max 50
  customRelationshipRole?: string; // max 100
  isFeatured?: boolean;   // optional on the wire — defaults to false server-side
  joinedAt: string;       // required
}
interface EventMemberResponseDto {
  id: string; eventId: string; userId: string | null; invitationId: string | null;
  role: EventRole; displayName: string; nickname: string | null;
  relationshipRole: string | null; customRelationshipRole: string | null;
  isFeatured: boolean; joinedAt: string;
  avatarUrl: string | null; // short-lived presigned URL resolved from the account's profilePictureKey; null for an account-less member or one who never uploaded a profile picture. Do not cache.
  rsvpId: string | null; // NEW 2026-08-26 — this member's own RSVP id, null if not submitted yet; see rsvp-status-fe-integration.md
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
interface EventMemberPatchDto { // every field optional — isFeatured is HOST-only even on your own membership
  displayName?: string; nickname?: string;
  relationshipRole?: string; customRelationshipRole?: string;
  isFeatured?: boolean;
} // no userId — see POST /api/event-members/{id}/claim for the narrow self-link path instead

// --- Event Modules ---

interface EventModuleRequestDto {
  eventId: string; moduleKey: ModuleKey; // required — server now rejects any value outside the 7 canonical keys (400, INVALID_MODULE_KEY/3006); `ModuleKey` defined below under "App config"
  isEnabled: boolean; configuration: Record<string, unknown>; // both required
}
interface EventModuleResponseDto {
  id: string; eventId: string; moduleKey: string; isEnabled: boolean;
  configuration: Record<string, unknown>; createdAt: string;
  /**
   * Whether this module is actually usable: the AND of the platform kill switch, the event being
   * paid for the module, and `isEnabled` above. Gate UI on this, not on `isEnabled` — a module
   * can be enabled for the event and still unavailable because the plan excludes it.
   *
   * As of 2026-08-16 "paid for" is an OR of two routes: the event's plan lists the key, *or* the
   * event holds a MODULE_UNLOCK entitlement for it. Either satisfies the commercial gate; the
   * kill switch and the host's toggle still apply on top of both.
   */
  isAvailable: boolean;
}
interface EventModulePatchDto { isEnabled?: boolean; configuration?: Record<string, unknown>; }
// no moduleKey/eventId on the patch DTO — can't rename a module or move it between events

// --- Event Sessions ---

interface EventSessionRequestDto {
  eventId: string; title: string; // required, max 255
  description?: string;
  startAt?: string; endAt?: string;
  locationName?: string;  // max 255
  mapsUrl?: string;
  displayOrder: number;   // required
  isSecondary?: boolean;  // NEW — see event-session-secondary-flag-fe-integration.md. Defaults to false; at most one per event.
}
interface EventSessionResponseDto {
  id: string; eventId: string; title: string; description: string | null;
  startAt: string | null; endAt: string | null; locationName: string | null; mapsUrl: string | null;
  displayOrder: number;
  isMain: boolean; // NEW — see event-session-main-flag-fe-integration.md. startAt/endAt are read-only when true.
  isSecondary: boolean; // NEW — see event-session-secondary-flag-fe-integration.md. Purely conventional, freely editable.
  createdAt: string; deletedAt: string | null;
}
interface EventSessionPatchDto { // every field optional
  title?: string; description?: string; startAt?: string; endAt?: string;
  locationName?: string; mapsUrl?: string; displayOrder?: number;
  isSecondary?: boolean; // NEW — see event-session-secondary-flag-fe-integration.md
}

// --- RSVPs ---

interface RsvpRequestDto {
  eventMemberId: string; attendanceStatus: AttendanceStatus;
  phone?: string;          // max 50
  adultCount: number; childCount: number; // both required, server-validated: adults 1-5, children 0-4 (400 on violation) — see §"App config"
   notes?: string;
  submittedAt: string;     // required
}
interface RsvpResponseDto {
  id: string; eventMemberId: string; attendanceStatus: AttendanceStatus;
  phone: string | null; adultCount: number; childCount: number;
  notes: string | null; submittedAt: string; updatedAt: string;
}
interface RsvpPatchDto { // every field optional
  attendanceStatus?: AttendanceStatus; phone?: string;
  adultCount?: number; childCount?: number;  notes?: string; // same 1-5 / 0-4 bounds as RsvpRequestDto when present, null/omitted is still fine
} // no eventMemberId/submittedAt — immutable/system-managed.

// --- RSVP Session Responses (per-session attendance) ---

interface RsvpSessionResponsRequestDto { rsvpId: string; eventSessionId: string; isAttending: boolean; } // all required
interface RsvpSessionResponsResponseDto {
  id: string; rsvpId: string; eventSessionId: string; isAttending: boolean; createdAt: string;
}

// ---------------------------------------------------------------------------
// Media domain
// ---------------------------------------------------------------------------

/**
 * No request DTO — created only via the multipart upload endpoint (§ Media upload).
 *
 * `POST /api/events/{eventId}/media` and `.../media/batch` both take an additional
 * `context` form field — `'GALLERY' | 'STORY'` (default `'GALLERY'` if omitted). A video
 * uploaded with `context: 'STORY'` is checked against the tighter `maxStoryVideoBytes` /
 * `maxStoryVideoDurationSeconds` caps (see `AppMediaConfigDto`) instead of `maxVideoBytes` —
 * pass it whenever the upload is destined for a story, even from a generic "add media" picker.
 *
 * `uploaderMemberId` is no longer accepted as a form field (2026-09-21): the uploader is the
 * caller's own membership. The response field of the same name still reports who uploaded it.
 */
interface MediaResponseDto {
  id: string; eventId: string; uploaderMemberId: string | null;
  anonymousUploaderName: string | null; // free-text attribution an anonymous scanner typed in, max 100; null for every member upload
  storageKey: string;
  mediaUrl: string; // presigned, time-limited R2 GET URL — re-fetch on expiry, don't cache long-term
  status: 'PROCESSING' | 'READY' | 'FAILED'; // added 2026-08-30 — see § Async video processing
  thumbnailUrl: string | null; // added 2026-08-30 — presigned poster-frame URL; null for images and non-READY videos
  originalFilename: string; mimeType: string; mediaType: string; // mediaType free text: IMAGE | VIDEO | AUDIO | DOCUMENT by convention
  fileSize: number; width: number | null; height: number | null; durationSeconds: number | null;
  metadata: Record<string, unknown>;
  createdAt: string; deletedAt: string | null;
}
// GET /api/events/{eventId}/media now returns Page<MediaResponseDto>, not MediaResponseDto[].
// Default 30/page, max 100 (?page=&size=), sorted createdAt desc then id desc (newest first).
//
// `status` (added 2026-08-30): images are always 'READY' immediately. A video is 'PROCESSING'
// on the very first response after upload — thumbnail extraction and re-encoding happen
// asynchronously — then flips to 'READY' (both mediaUrl and thumbnailUrl now playable/viewable)
// or 'FAILED' (permanently, if terminal — e.g. a story video over the duration cap; transient
// failures are retried automatically server-side, invisible to the FE). Poll
// GET /api/medias/{id} (or re-fetch the gallery page) until status leaves 'PROCESSING'. See
// [`video-processing-fe-integration.md`](fe-guides/video-processing-fe-integration.md).

/** Response of POST /api/events/{eventId}/media/batch — always 200, even if every file failed. */
interface MediaBatchUploadResponseDto {
  created: MediaResponseDto[];
  failed: MediaBatchFailureDto[];
}
interface MediaBatchFailureDto {
  filename: string;
  errorCode: string; // ErrorCode enum name, e.g. "STORAGE_UPLOAD_FAILED"
  message: string;   // clean, user-facing text — safe to show directly in the UI
}
// Batch upload: 1..10 files per request (media.batch-upload.max-files, default 10; exceeding
// returns 400/errorCode 3003 TOO_MANY_FILES), 20MB/file, 220MB/request (exceeding returns
// 413/errorCode 3005 REQUEST_TOO_LARGE).

/**
 * Host-only bulk download of an event's gallery, as zip parts.
 *
 * GET /api/events/{eventId}/media/archive/manifest?variant=DISPLAY|ORIGINAL  -> MediaArchiveManifestDto
 * GET /api/events/{eventId}/media/archive?variant=…&part=N                   -> application/octet-stream (zip)
 *
 * Flow: fetch the manifest, show the host the size/count comparison, then hit the archive endpoint
 * once per entry in `parts`. The archive response is chunked with no Content-Length — take the
 * expected size from the manifest's part, not from the response headers.
 *
 * `variant` defaults to DISPLAY. Offer the ORIGINAL toggle only when `originalsAvailable` is true,
 * and pre-select it when it is — but do not send it silently: originals can be several times the
 * size, and the host should see which number they are committing to. Every plan keeps originals, so
 * `originalsAvailable` is always true and 403/errorCode 5054 ORIGINALS_ADDON_NOT_ACTIVE is no longer
 * returned.
 *
 * A `part` outside the current plan returns 400/errorCode 3019 MEDIA_ARCHIVE_PART_NOT_FOUND — the
 * plan is recomputed per request, so an upload or delete since the manifest can shift it. Re-fetch
 * the manifest and restart.
 *
 * Rate limits: 30/min on the manifest, 10/hour on the archive itself.
 */
type MediaArchiveVariant = "DISPLAY" | "ORIGINAL";
interface MediaArchiveManifestDto {
  variant: MediaArchiveVariant;      // the variant `parts` was planned for
  originalsAvailable: boolean;       // always true: every plan keeps originals
  photoCount: number; videoCount: number;
  displayTotalBytes: number;         // both totals returned on every call, so one request renders
  originalTotalBytes: number;        // the whole choice — ORIGINAL counts the display copy for
                                     // any item that has no original on file
  itemsWithoutOriginal: number;      // items that would fall back to their display copy in an
                                     // ORIGINAL archive: videos, un-normalized images, and anything
                                     // uploaded before the add-on was switched on. Worth telling
                                     // the host about rather than letting them find out
  parts: MediaArchivePartDto[];      // empty when the gallery is empty
}
interface MediaArchivePartDto {
  part: number;      // 1-based; pass back as the `part` query parameter
  itemCount: number;
  sizeBytes: number; // zips are written uncompressed, so this is within a few KB of the download
}

interface PostRequestDto {
  eventId: string;
  authorMemberId?: string;
  type: PostType;         // required, server-validated against the exact 4-value set
  content?: string;
  isPinned: boolean;       // required — no server-side default, omitting it is a 400
  // ordered — becomes displayOrder on the created PostMedia rows. Max 10 items
  // (400/errorCode 3001 if exceeded), no duplicates (400/errorCode 3004 DUPLICATE_MEDIA_ID_IN_REQUEST),
  // every id must belong to this same eventId (404 otherwise).
  mediaIds?: string[];
}
/** PATCH /api/posts/{id} — author or host. Omitted fields are left unchanged; there is no way to
 *  change a post's media or type after creation. */
interface PostPatchDto {
  content?: string;   // max TextLimits.POST_CONTENT_MAX — read the real bound off /api/config
  isPinned?: boolean;
}

/**
 * POST /api/events/{eventId}/stream-token — authenticated. A short-lived token for opening one SSE
 * connection to GET /api/events/{eventId}/stream.
 *
 * It exists because EventSource cannot set an Authorization header and this API sends no cookies,
 * so the token travels as a query parameter instead. Fetch one per connection, not once per
 * session. See fe-guides/posts-feed-push-and-etag-fe-integration.md.
 */
interface StreamTokenResponseDto {
  token: string;
  expiresInMs: number;
}

// Renamed from PostAuthorDto on 2026-09-15: posts, comments and stories all carry this same
// shape now. The wire fields are unchanged; only the type name is.
interface AuthorDto {
  memberId: string; displayName: string; nickname: string | null;
  role: EventRole;
  avatarUrl: string | null; // presigned, resolved from the account's profilePictureKey — null for an account-less author or one with no profile picture
}
interface PostResponseDto {
  id: string; eventId: string; authorMemberId: string | null;
  author: AuthorDto | null; // null if the post has no author, or the author left the event
  type: string; content: string | null; isPinned: boolean;
  media: MediaResponseDto[]; // ordered by displayOrder, presigned URLs already resolved
  commentCount: number;
  recentComments: CommentResponseDto[]; // NEW 2026-09-04 — the post's 2 most recent comments, oldest-first
  reactionCount: number;          // total across all types
  reactionCounts: Record<string, number>; // NEW 2026-08-30, replaces likedByCurrentUser — per-type breakdown, zero-count codes omitted
  myReactionType: string | null;  // NEW 2026-08-30, replaces likedByCurrentUser — caller's own reaction code, or null
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
// GET /api/events/{eventId}/posts now returns Page<PostResponseDto>, not PostResponseDto[].
// Default 20/page, max 100 (?page=&size=), sorted isPinned desc then createdAt desc;
// soft-deleted posts are excluded.
// reactionCounts/myReactionType are resolved from the JWT — both GET /api/events/{eventId}/posts
// and GET /api/posts/{id} populate them in the same 2 batched queries used before this change, so
// it's still free at feed scale.
// recentComments is resolved in one extra batched query for the whole page (not per post) — see
// post-recent-comments-preview-fe-integration.md.

interface CommentRequestDto {
  postId: string; authorMemberId?: string; parentCommentId?: string; content: string; // content required
}
interface CommentResponseDto {
  id: string; postId: string; authorMemberId: string | null;
  // Replaced authorAvatarUrl on 2026-09-15 — the same AuthorDto posts already carried, so a
  // comment can be rendered with a name, nickname and role without a second lookup. Null when the
  // comment has no author. avatarUrl inside it is presigned and short-lived; do not cache it.
  // See fe-guides/comment-story-author-fe-integration.md.
  author: AuthorDto | null;
  parentCommentId: string | null;
  content: string; createdAt: string; updatedAt: string; deletedAt: string | null;
}
// GET /api/posts/{postId}/comments now returns Page<CommentResponseDto>, not CommentResponseDto[].
// Default 30/page, max 100 (?page=&size=), sorted createdAt ASC then id ASC (oldest first — unlike
// every other paginated endpoint, which sorts newest first) so a reply's parent is guaranteed to
// appear on the same page or an earlier one, never a later one.

interface ReactionRequestDto { postId: string; memberId: string; reactionType: string; } // all required, reactionType max 20
interface ReactionResponseDto { id: string; postId: string; memberId: string; reactionType: string; createdAt: string; }
// POST /api/reactions is an upsert as of 2026-08-30: DB unique constraint on (postId, memberId) —
// a member has exactly one reaction per post. Reacting again with the same type is a no-op
// (returns the existing reaction, same id); a different type switches it in place (same id,
// reactionType updated, createdAt unchanged). DUPLICATE_REACTION (5005) is no longer returned.
// reactionType is validated against the post's event's reaction-type catalog (added 2026-08-30) —
// see ReactionTypeResponseDto below and reaction-types-catalog-fe-integration.md. Wire shape above
// is unchanged: reactionType is still the catalog row's `code` string, not its `id`.

// Reaction-type catalog — admin-managed, scoped per EventTypeKey, capped at 5 active rows each.
// Every event type seeds 4 defaults: LIKE, LOVE, LAUGH, CELEBRATE. Added 2026-08-30.
interface ReactionTypeRequestDto {
  eventTypeKey: string; code: string; // code: max 20, ^[A-Z0-9_]+$, immutable after creation
  name: string; emoji: string; sortOrder: number; isAssignable: boolean;
}
interface ReactionTypePatchDto {
  name?: string; emoji?: string; sortOrder?: number; isAssignable?: boolean;
  // eventTypeKey and code are immutable — not present here
}
interface ReactionTypeResponseDto {
  id: string; eventTypeKey: string; code: string; name: string; emoji: string;
  sortOrder: number; isAssignable: boolean;
}
// Admin CRUD: GET/POST/PATCH/DELETE /api/admin/reaction-types (hasRole('ADMIN') on every route).
// GET requires ?eventTypeKey=, optional &includeArchived=. See reaction-types-catalog-fe-integration.md.

interface StoryRequestDto {
  eventId: string; authorMemberId?: string; mediaId: string; // mediaId required, must already exist
  caption?: string; songUrl?: string;
  expiresAt?: string; // optional — defaults to createdAt + 24h server-side
}
// mediaId must resolve to Media with status: 'READY' — added 2026-08-30, see § Async video
// processing. A video mediaId still 'PROCESSING' or permanently 'FAILED' is rejected with
// 400/errorCode 3026 MEDIA_NOT_READY (single-create POST /api/stories: whole-request 400; batch
// POST /api/stories/batch: isolated per item into failed[], same as an unresolvable mediaId).
// Don't offer a just-uploaded video in the "post as story" picker until its MediaResponseDto
// status flips to 'READY' — poll GET /api/medias/{id} rather than letting the user hit this.
interface StoryResponseDto {
  id: string; eventId: string; authorMemberId: string | null;
  author: AuthorDto | null; // replaced authorAvatarUrl on 2026-09-15 — see CommentResponseDto
  mediaId: string;
  caption: string | null; songUrl: string | null; expiresAt: string;
  createdAt: string; deletedAt: string | null;
  viewedByCurrentUser: boolean; // has the caller viewed this story (any of their memberships)
}

interface StoryViewResponseDto {
  id: string; storyId: string; memberId: string; createdAt: string;
}
// POST /api/stories/{id}/views marks viewed by caller (idempotent, returns existing on repeat)
// GET  /api/stories/{id}/views lists viewers — story author or event HOST only

/**
 * POST /api/stories/batch — body is StoryRequestDto[] (NOT wrapped in an object), one story
 * per item. Every item must share the same eventId (400/errorCode 3025
 * MULTIPLE_EVENT_IDS_IN_REQUEST otherwise). 1..story.batch.max-items per request (default 5;
 * see media.maxBatchStoryItems in GET /api/config; exceeding returns 400/errorCode 3024
 * TOO_MANY_STORY_ITEMS). Any field-validation failure on ANY item (missing mediaId, caption
 * too long, etc.) rejects the WHOLE batch with 400/errorCode 3001 VALIDATION_FAILED — nothing
 * is created. Only a mediaId that fails to resolve to a live Media row is isolated per item
 * into `failed`; everything else is all-or-nothing, unlike the media batch upload endpoint.
 */
interface StoryBatchCreateResponseDto {
  created: StoryResponseDto[];
  failed: StoryBatchFailureDto[];
}
interface StoryBatchFailureDto {
  mediaId: string;
  errorCode: string; // ErrorCode enum name — currently always "RESOURCE_NOT_FOUND" or "INTERNAL_ERROR"
  message: string;   // clean, user-facing text — safe to show directly in the UI
}

type VoteType = 'UPVOTE' | 'DOWNVOTE'; // DOWNVOTE is display-only, never affects ranking

// authorMemberId removed 2026-08-05 — author is always the caller now, anonymous
// suggestions are no longer possible.
interface PlaylistSuggestionRequestDto {
  eventId: string; title: string; // title required, max 255
  artist?: string; // max 255
  youtubeUrl?: string; spotifyUrl?: string; comment?: string;
}
interface PlaylistSuggestionResponseDto {
  id: string; eventId: string; authorMemberId: string | null; title: string; artist: string | null;
  youtubeUrl: string | null; spotifyUrl: string | null; comment: string | null;
  createdAt: string; deletedAt: string | null;
  upvoteCount: number; downvoteCount: number; // always present; 0 for an unvoted song, not absent
  myVote: VoteType | null; // null means the caller hasn't voted, not "failed to load"
}

// memberId removed 2026-08-05 — voter is always the caller now.
interface PlaylistVoteRequestDto { playlistSuggestionId: string; voteType: VoteType; } // both required
interface PlaylistVoteResponseDto {
  id: string; playlistSuggestionId: string; memberId: string; voteType: VoteType; createdAt: string;
}
// POST is an upsert keyed on (suggestion, caller's own member): no existing vote -> insert;
// opposite voteType -> switches the vote in place; same voteType re-posted -> no-op, returns
// the existing vote. There is no duplicate-vote 409 on this endpoint.

// GET /api/events/{eventId}/playlist-suggestions/leaderboard -- HOST only, new 2026-08-05
interface PlaylistSuggestionLeaderboardDto {
  rank: number; // 1-based; ties share a rank and the next rank skips (1, 1, 1, 4)
  id: string; authorMemberId: string | null; title: string; artist: string | null;
  youtubeUrl: string | null; spotifyUrl: string | null; comment: string | null;
  createdAt: string;
  upvoteCount: number; downvoteCount: number; // downvoteCount breaks ties, never subtracts from rank
}

interface PostMediaRequestDto { postId: string; mediaId: string; displayOrder: number; } // all required
interface PostMediaResponseDto { id: string; postId: string; mediaId: string; displayOrder: number; createdAt: string; }
// Capped at 10 media items per post (shared with PostRequestDto.mediaIds) — attaching an 11th
// returns 409/errorCode 5007 POST_MEDIA_LIMIT_EXCEEDED. mediaId must belong to the post's event (404 otherwise).

// ---------------------------------------------------------------------------
// Audit / Moderation / Reports / Feature Flags (admin-facing)
// ---------------------------------------------------------------------------

interface AuditLogRequestDto {
  eventId?: string; actorMemberId?: string;
  action: string;      // required, max 100
  entityType: string;  // required, max 50
  entityId?: string;
  changes: Record<string, unknown>; // required
  ipAddress?: string;  // max 100
}
interface AuditLogResponseDto {
  id: string; eventId: string | null; actorMemberId: string | null; action: string; entityType: string;
  entityId: string | null; changes: Record<string, unknown>; ipAddress: string | null; createdAt: string;
}
// GET /api/audit-logs now returns Page<AuditLogResponseDto>, not AuditLogResponseDto[].
// Default 50/page, max 100 (?page=&size=), sorted createdAt desc then id desc (newest first).

interface ModerationActionRequestDto {
  eventId: string; // required
  moderatorMemberId?: string;
  targetType: string; // required, max 50
  targetId: string;   // required
  actionType: string; // required, max 30
  reason?: string;
}
interface ModerationActionResponseDto {
  id: string; eventId: string; moderatorMemberId: string | null; targetType: string; targetId: string;
  actionType: string; reason: string | null; createdAt: string;
}
// GET /api/moderation-actions now returns Page<ModerationActionResponseDto>, not ModerationActionResponseDto[].
// Default 50/page, max 100 (?page=&size=), sorted createdAt desc then id desc (newest first).

// targetType and reason are now enum-backed server-side (previously unrestricted strings) —
// an unrecognized value 400s. The valid sets are also published at GET /api/config as
// reportTargetTypes / reportReasons (see app-config-fe-integration.md) so the FE doesn't
// have to hardcode them.
type ReportTargetType = "POST" | "COMMENT" | "MEMBER";
type ReportReason = "SPAM" | "HARASSMENT" | "INAPPROPRIATE_CONTENT" | "IMPERSONATION" | "OTHER";

interface ReportRequestDto {
  reporterMemberId?: string; // sent but IGNORED server-side — bound to the caller automatically
  eventId: string;    // required
  targetType: ReportTargetType; // required
  targetId: string;   // required
  reason: ReportReason;     // required
  description?: string;
  status?: string;             // set by moderators only, defaults to "OPEN" server-side
  reviewedByMemberId?: string;
  reviewedAt?: string;
  resolutionNotes?: string;
}
interface ReportResponseDto {
  id: string; reporterMemberId: string | null; eventId: string; targetType: ReportTargetType; targetId: string;
  reason: ReportReason; description: string | null; status: string | null; reviewedByMemberId: string | null;
  reviewedAt: string | null; resolutionNotes: string | null; createdAt: string; updatedAt: string;
}
// GET /api/reports now returns Page<ReportResponseDto>, not ReportResponseDto[].
// Default 50/page, max 100 (?page=&size=), sorted createdAt desc then id desc (newest first).

interface TelemetryEventRequestDto {
  eventName: string; // required, max 100
  userId?: string; eventId?: string; memberId?: string; sessionId?: string;
  platform?: string;   // max 30
  ipAddress?: string;  // max 100
  userAgent?: string;
  payload: Record<string, unknown>; // required
}
interface TelemetryEventResponseDto {
  id: string; eventName: string; userId: string | null; eventId: string | null; memberId: string | null;
  sessionId: string | null; platform: string | null; ipAddress: string | null; userAgent: string | null;
  payload: Record<string, unknown>; createdAt: string;
}
// GET /api/telemetry-events now returns Page<TelemetryEventResponseDto>, not TelemetryEventResponseDto[].
// Default 50/page, max 100 (?page=&size=), sorted createdAt desc then id desc (newest first).

interface PlatformFeatureFlagRequestDto {
  featureKey: string;  // required, max 100
  description?: string;
  isEnabled: boolean;  // required
  configuration: Record<string, unknown>; // required
}
interface PlatformFeatureFlagResponseDto {
  id: string; featureKey: string; description: string | null; isEnabled: boolean;
  configuration: Record<string, unknown>; createdAt: string; updatedAt: string;
}
/** PATCH /api/platform-feature-flags/{id} — admin only. Omitted fields unchanged. `featureKey`
 *  is absent because it is the identifier application code checks against. */
interface PlatformFeatureFlagPatchDto {
  description?: string;   // max 100
  isEnabled?: boolean;
  configuration?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// App config — GET /api/config (public, no auth) — added 2026-08-05
// ---------------------------------------------------------------------------

/** Canonical event module keys — see EventModuleRequestDto.moduleKey, now server-validated against
 *  this set. `wishlist` and `wishbook` were added 2026-08-16; prefer sourcing this union from
 *  `eventModuleKeys` at runtime rather than maintaining the literal list by hand. */
// All ten canonical keys as of V82. `eventModuleKeys` on /api/config carries only the ones
// currently enabled platform-wide, which is a subset: `named_invites` was switched off in V87 and
// does not appear there today. Gate on what the config returns, not on this union.
type ModuleKey = 'posts' | 'rsvp' | 'playlist' | 'stories' | 'gallery' | 'wishlist' | 'wishbook'
  | 'co_hosts' | 'named_invites' | 'schedule';

interface AppMediaConfigDto {
  maxFileSizeBytes: number;
  maxRequestSizeBytes: number;
  maxImageBytes: number;         // per-kind cap, enforced after server-side format detection
  maxVideoBytes: number;         // per-kind cap, enforced after server-side format detection
  maxStoryVideoBytes: number;    // added 2026-08-30 — tighter cap applied when upload context is 'STORY'
  maxStoryVideoDurationSeconds: number; // added 2026-08-30 — a longer story video FAILS terminally instead of processing
  maxBatchUploadFiles: number;
  maxBatchStoryItems: number; // added 2026-08-29 — item cap on POST /api/stories/batch (default 5)
  maxMediaPerPost: number;
  maxArchiveSelectedItems: number; // added 2026-08-25 — item cap on GET .../media/archive/selected
  maxArchivePartBytes: number;     // added 2026-08-25 — combined-size cap for that request AND one gallery-archive part
  presignedUrlTtlMinutes: number;
  publicHost: string | null; // hostname media URLs are served from — feed into next/image's images.remotePatterns
  estimateAvgImageBytes: number;  // added 2026-09-18 — NOT a validation limit, see maxImageBytes for that
  estimateAvgVideoBytes: number;  // added 2026-09-18 — NOT a validation limit, see maxVideoBytes for that
  estimateImageRatio: number;     // added 2026-09-18 — fraction (0-1) of a quota assumed spent on photos vs video
}
interface AppPaginationConfigDto { defaultPageSize: number; maxPageSize: number; }
interface AppRsvpConfigDto { minAdults: number; maxAdults: number; minChildren: number; maxChildren: number; }

interface AppEventTypeDto {
  id: string;
  eventTypeKey: string;
  icon: string;                 // a single emoji
  accentToken: string;          // a design-token name (rose | sky | amber), not a colour value
  isEnabled: boolean;           // always true in this list — disabled rows are not published
  sortOrder: number;
}

interface AppEventTypeTranslationDto {
  name: Record<string, string>;                      // keyed by locale: { en: '...', el: '...' }
  tagline: Record<string, string>;
  voice: Record<string, Record<string, string>>;     // locale — the ten-key UI voice pack
}

interface AppTranslationsDto {
  /** Keyed by eventTypeKey, covering every entry in `eventTypes`. */
  eventTypes: Record<string, AppEventTypeTranslationDto>;
}

/** Automated right-of-withdrawal settings — see fe-guides/billing-fe-guide.md §9. Added 2026-09-18. */
interface AppWithdrawalConfigDto {
  /** Pass back verbatim as the checkout request's `termsVersion`; a stale value is a 400. */
  termsVersion: string;
  /** Statutory withdrawal window, days after payment. */
  windowDays: number;
  /** How long a HELD withdrawal waits for an admin before it is released automatically. */
  holdDays: number;
}

/** Event coverage-window constants — see fe-guides/event-coverage-window-fe-integration.md. Added 2026-09-21. */
interface AppCoverageConfigDto {
  maxLeadDays: number;               // 548 — picker max is today + this
  defaultEventDurationHours: number; // 24  — endAt defaults to startAt + this when omitted
} // defaultHostingMonths removed 2026-09-23 — the term is the event's coverage option's months; maxPreEventDays removed 2026-09-23

/** The newsletter's public terms — see fe-guides/newsletter-fe-integration.md. Added 2026-09-23. */
interface AppNewsletterConfigDto {
  /** False means every /api/newsletter/** route 404s. Hide the form, the signup checkbox and the
   *  account-settings toggle rather than rendering something that fails. */
  enabled: boolean;
  /** Percentage off the next event's ACTIVATION. Describes the offer made to whoever subscribes
   *  next — a code somebody already holds keeps its own terms, so use
   *  NewsletterStatusResponseDto.rewardExpiresAt to describe an existing one, never this. */
  discountPercent: number;
  /** How long a reward stays redeemable, counted from confirmation. */
  rewardValidityMonths: number;
}

/** Server-enforced `@Size(max=...)` on free-text fields — added 2026-08-23. Mirror these in form
 *  maxLength/counters instead of hardcoding; a request over the limit is a 400 VALIDATION_FAILED. */
interface AppContentLimitsDto {
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

/** One `@RateLimit`-annotated endpoint's budget — added 2026-08-23. See `RATE_LIMITED` (3010) / 429
 *  handling in frontend-integration-guide.md §0; this is just the reference data for those buckets. */
interface AppRateLimitConfigDto {
  name: string;         // bucket name; endpoints sharing a name share a budget
  limit: number;         // requests allowed per window, per caller
  windowSeconds: number;
}

// ---- Plan tiers ----

export type PlanScope = 'ACCOUNT' | 'EVENT';
export type BillingPeriod = 'MONTHLY' | 'YEARLY' | 'ONE_TIME';

export interface PlanTierResponseDto {
  id: string;
  code: string;              // stable business key, e.g. 'FREE'. Unique per scope, not globally.
  scope: PlanScope;
  name: string;
  description: string | null;
  sortOrder: number;
  isDefault: boolean;
  isAssignable: boolean;     // false = archived
  isPublic: boolean;
  storageBytes: number | null;      // null = no limit enforced
  maxMembers: number | null;        // null = no limit enforced
  setupPercent: number | null;      // share of the price kept as the non-refundable setup line on
                                     // withdrawal; null = the platform default published under
                                     // /api/config `withdrawal`. See billing-fe-guide.md §9.
  eventDayPercent: number | null;   // share kept as the event-day line once the event has taken
                                     // place; null = the same platform default.
  priceAmountMinor: number | null;  // minor units (cents). ACCOUNT scope only — always null on an
                                     // EVENT plan, whose prices are its initialOptions (2026-09-23).
  priceCurrency: string | null;     // ISO 4217; also the currency of every coverage option
  billingPeriod: BillingPeriod | null;
  discountPercent: number | null;
  discountLabel: string | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;

  /** Module keys this plan includes. Always empty for ACCOUNT-scope plans. */
  moduleKeys: string[];

  /** The one event type this plan may be bought for — required for EVENT scope, null for
   *  ACCOUNT scope. A plan belongs to exactly one type; there is no restriction-set field.
   *  See `plan-tiers-by-event-type-fe-integration.md`. */
  eventTypeKey: string | null;

  /** Set only by the admin "duplicate" action (`POST /api/admin/plan-tiers/{id}/duplicate`) —
   *  null for a plan never duplicated or duplicated from. Plans sharing this UUID were created
   *  together and represent "the same offer" across event types; group by it on a landing page
   *  that shows several types' plans together. */
  sharedGroupKey: string | null;

  /** The `MODULE_UNLOCK` paid services offered on this plan for a module not already in
   *  `moduleKeys` — full price/billing detail included, not just the key. Always empty for
   *  ACCOUNT-scope plans. Only populated on `GET /api/config`. */
  paidModules: PaidServiceResponseDto[];

  /** The durations this EVENT plan is sold at, in display order — added 2026-09-23. The host picks
   *  one on the draft (`EventRequestDto.coverageOptionId`). Public responses list live ones only;
   *  admin responses include retired ones (`active: false`). Empty = the plan is not on sale.
   *  Always empty for ACCOUNT-scope plans. */
  initialOptions: CoverageOptionResponseDto[];

  /** Coverage bought after activation — added 2026-09-23; nothing sells these yet. */
  extensionOptions: CoverageOptionResponseDto[];
}

/** One duration an EVENT plan is sold at — added 2026-09-23. See
 *  fe-guides/coverage-options-and-extensions-fe-integration.md. */
export interface CoverageOptionResponseDto {
  id: string;                // what every coverageOptionId field takes
  kind: 'INITIAL' | 'EXTENSION';
  months: number;            // 1–120
  priceAmountMinor: number;  // in the plan's priceCurrency, before any promotion or code
  sortOrder: number;
  active: boolean;           // always true outside the admin endpoints
}

/**
 * POST /api/admin/plan-tiers — admin only. `code` is upper-case letters, digits and underscores,
 * unique per scope, and immutable after creation. `eventTypeKey` is required for EVENT scope and
 * must be omitted for ACCOUNT scope; it is also immutable, which is why the duplicate action below
 * exists instead of an edit.
 */
export interface PlanTierRequestDto {
  code: string;                    // required, max 30, ^[A-Z0-9_]+$
  scope: PlanScope;                // required
  eventTypeKey?: string;           // max 50 — required for EVENT, rejected for ACCOUNT
  name: string;                    // required, max 100
  description?: string;
  sortOrder: number;               // required, >= 0
  isDefault: boolean;              // required
  isAssignable: boolean;           // required
  isPublic: boolean;               // required
  storageBytes?: number;           // omit for "no limit enforced"
  maxMembers?: number;             // omit for "no limit enforced"
  priceAmountMinor?: number;       // ACCOUNT scope only. An EVENT plan is priced by its coverage
                                   // options (2026-09-23), so sending one for EVENT is a 400
                                   // INVALID_PLAN_TIER_SCOPE. A new EVENT plan has no options and is
                                   // not on sale until one is added. autoDeleteMonths went the same
                                   // day; sending it is a 400 like any unknown field.
  priceCurrency?: string;          // exactly 3 chars, ISO 4217
  billingPeriod?: BillingPeriod;
  discountPercent?: number;        // 0-100
  discountLabel?: string;          // max 100
  discountStartsAt?: string;
  discountEndsAt?: string;
}

/** PATCH /api/admin/plan-tiers/{id} — omitted fields are left unchanged. `code`, `scope` and
 *  `eventTypeKey` are absent because they are immutable, not because they are optional. */
export interface PlanTierPatchDto {
  name?: string;
  description?: string;
  sortOrder?: number;
  isDefault?: boolean;
  isAssignable?: boolean;          // false archives the plan
  isPublic?: boolean;
  storageBytes?: number;
  maxMembers?: number;
  /** The withdrawal split. Both 0-100; omit to fall back to the platform defaults published on
   *  /api/config under `withdrawal`. Editable here but not settable at create. */
  setupPercent?: number;
  eventDayPercent?: number;
  priceAmountMinor?: number;       // ACCOUNT scope only — 400 INVALID_PLAN_TIER_SCOPE on an EVENT
                                   // plan (2026-09-23). autoDeleteMonths is gone: a 400 too.
  priceCurrency?: string;
  billingPeriod?: BillingPeriod;
  discountPercent?: number;
  discountLabel?: string;
  discountStartsAt?: string;
  discountEndsAt?: string;
}

/**
 * POST /api/admin/plan-tiers/{id}/duplicate — copies one plan into other event types in a single
 * call, since a plan belongs to exactly one type and `eventTypeKey` cannot be edited afterwards.
 * Every plan created by one call shares a `sharedGroupKey`, which is how a landing page groups
 * "the same offer" across types. Each copy also gets the source plan's coverage options, retired
 * ones included (2026-09-23).
 */
export interface PlanTierDuplicateRequestDto {
  clones: PlanTierDuplicateTarget[];   // required, non-empty
}
export interface PlanTierDuplicateTarget {
  eventTypeKey: string;
  code: string;          // required, max 30, ^[A-Z0-9_]+$
  name?: string;         // defaults to the source plan's
  description?: string;  // defaults to the source plan's
}

/** PUT /api/admin/plan-tiers/{id}/modules — replace semantics: whatever is absent is removed. */
export interface PlanModulesRequestDto {
  moduleKeys: ModuleKey[];   // required; send [] to strip every module
}

/** PATCH /api/admin/users/{id}/plan-tier and PATCH /api/admin/events/{id}/plan-tier. The scope is
 *  implied by the target, so the code alone is unambiguous even though it is unique only per
 *  scope. */
export interface PlanAssignmentRequestDto {
  planTierCode: string;   // required, max 30
  /** Events only (added 2026-09-23): one of the new plan's initialOptions. Omit to keep the event's
   *  term — the option of the same length, else the plan's shortest. Either way the event's
   *  coverageEndsAt does not move. */
  coverageOptionId?: string;
}

/** POST /api/admin/plan-tiers/{id}/coverage-options — adds a duration to an EVENT plan (added
 *  2026-09-23) and answers 200 with it as a CoverageOptionResponseDto. `GET` on the same path lists
 *  them all, retired ones included. `kind` and `months` are fixed from then on: to sell a different
 *  length, add an option and retire the old one. 409 COVERAGE_OPTION_DUPLICATE (5080) when the plan
 *  already sells a live option of that kind and length; 400 INVALID_PLAN_TIER_SCOPE on an ACCOUNT
 *  plan. */
export interface CoverageOptionRequestDto {
  kind: 'INITIAL' | 'EXTENSION';   // required
  months: number;                  // required, 1-120
  priceAmountMinor: number;        // required, >= 0, in the plan's priceCurrency
  sortOrder?: number;              // >= 0
}

/** PATCH /api/admin/plan-tiers/{id}/coverage-options/{optionId} — omitted fields are left
 *  unchanged. There is no `kind` or `months`, and sending either is a 400. Nothing is ever deleted:
 *  retire with `active: false`. 409 COVERAGE_OPTION_LAST_INITIAL (5079) when that would retire the
 *  last live INITIAL option of a public, assignable plan; 409 COVERAGE_OPTION_DUPLICATE (5080) when
 *  reactivating would make a second live option of the same kind and length. */
export interface CoverageOptionPatchDto {
  priceAmountMinor?: number;       // >= 0; open orders keep the amount they pinned
  sortOrder?: number;              // >= 0
  active?: boolean;
}

/** GET /api/admin/plan-tiers/{planTierId}/modules — one row per module configured for the plan. */
export interface PlanTierModuleConfigResponseDto {
  moduleKey: string;
  defaultConfig: Record<string, unknown>;
}

/** PATCH /api/admin/plan-tiers/{planTierId}/modules/{moduleKey}. Only `defaultConfig` is editable
 *  here — whether a module applies at all stays governed by the event-type matrix and the plan's
 *  own `moduleKeys`. */
export interface PlanTierModuleConfigPatchDto {
  defaultConfig?: Record<string, unknown>;
}

export interface PlatformModuleResponseDto {
  id: string;
  moduleKey: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  sortOrder: number;
}

/** PATCH /api/admin/platform-modules/{moduleKey} — admin only. Omitted fields are left unchanged.
 *  `moduleKey` is absent because it is the identifier application code branches on and cannot be
 *  renamed. Disabling a row here removes the key from /api/config's `eventModuleKeys`
 *  platform-wide. */
export interface PlatformModulePatchDto {
  name?: string;          // max 100
  description?: string;
  isEnabled?: boolean;
  sortOrder?: number;
}

// ---- Event-type registry (admin) ----

/** GET /api/admin/platform-event-types — the full registry row, including disabled ones and the
 *  locale copy that /api/config splits into `translations`. */
export interface PlatformEventTypeResponseDto {
  id: string;
  eventTypeKey: string;
  name: Record<string, string>;                    // keyed by locale
  tagline: Record<string, string>;
  icon: string;
  accentToken: string;
  voice: Record<string, Record<string, string>>;   // field name -> locale -> copy
  isEnabled: boolean;
  sortOrder: number;
}

/** PATCH /api/admin/platform-event-types/{eventTypeKey}. Only these two are editable: the copy
 *  (name/tagline/icon/accentToken/voice) is synced from code, and the key itself cannot be
 *  renamed. */
export interface PlatformEventTypePatchDto {
  isEnabled?: boolean;
  sortOrder?: number;
}

export type ModuleApplicability = 'UNSUPPORTED' | 'DEFAULT_OFF' | 'DEFAULT_ON';

/**
 * One row of the event-type/module applicability matrix.
 * GET /api/event-types/{eventTypeKey}/modules (public) and
 * GET /api/admin/event-types/{eventTypeKey}/modules (admin).
 *
 * UNSUPPORTED rows are omitted rather than returned, so a row you receive is one this type can
 * have. See fe-guides/event-type-feature-toggles-quotas-fe-integration.md.
 */
export interface PlatformEventTypeModuleResponseDto {
  eventTypeKey: string;
  moduleKey: string;
  applicability: ModuleApplicability;
  defaultConfig: Record<string, unknown>;
  sortOrder: number;
  /** Whether an event bought on the plan named by the request's `planTierCode` would start with
   *  this module switched on. Null when the request named no plan — which is the difference
   *  between "what can this type have" and "what do I get if I buy this". */
  includedInPlan: boolean | null;
}

/** PATCH /api/admin/event-types/{eventTypeKey}/modules/{moduleKey} — omitted fields unchanged. */
export interface PlatformEventTypeModulePatchDto {
  applicability?: ModuleApplicability;
  defaultConfig?: Record<string, unknown>;
  sortOrder?: number;
}

// ---- Paid services ----

/**
 * What a catalog entry does when bought. `MODULE_UNLOCK` was added 2026-08-16.
 *
 * The kind decides which endpoint will accept the code, so filter on it rather than on price or
 * name: STORAGE_PACK goes through `POST /api/events/{id}/storage-checkout` (live events, charged
 * now), the other two through `POST /api/events/{id}/addons` (draft events, price folded into the
 * activation order). Sending a code to the wrong one is a 400.
 */
export type PaidServiceKind = 'STORAGE_PACK' | 'RECURRING_ADDON' | 'MODULE_UNLOCK';

export interface PaidServiceResponseDto {
  id: string;
  code: string;              // the value you send as paidServiceCode
  kind: PaidServiceKind;
  name: string;
  description: string | null;
  sortOrder: number;
  isAssignable: boolean;
  isPublic: boolean;
  priceAmountMinor: number | null;
  priceCurrency: string | null;
  billingPeriod: BillingPeriod | null;
  /** Bytes added to the event's ceiling. Null unless kind is STORAGE_PACK. */
  grantsStorageBytes: number | null;
  /** The module this opens. Null unless kind is MODULE_UNLOCK. Added 2026-08-16. */
  grantsModuleKey: ModuleKey | null;
  /** Plan tiers this service is offered on. **Empty means every plan**, not none. */
  planTierIds: string[];
}

/** POST /api/admin/paid-services — admin only. `code` and `kind` are immutable after creation. */
export interface PaidServiceRequestDto {
  code: string;                 // required, max 30, ^[A-Z0-9_]+$
  kind: PaidServiceKind;        // required
  name: string;                 // required, max 100
  description?: string;
  sortOrder: number;            // required, >= 0
  isAssignable: boolean;        // required
  isPublic: boolean;            // required
  priceAmountMinor: number;     // required, >= 0
  priceCurrency: string;        // required, exactly 3 chars
  billingPeriod: BillingPeriod; // required
  /** Required for STORAGE_PACK, rejected for every other kind. */
  grantsStorageBytes?: number;
  /** Required for MODULE_UNLOCK, rejected for every other kind. Must name a registered module. */
  grantsModuleKey?: ModuleKey;
  /** Plan tiers to restrict this service to. **Omit or send [] for every plan**, which is what
   *  every entry in the catalog wants today. */
  planTierIds?: string[];
}

/** PATCH /api/admin/paid-services/{id}. `code` and `kind` are absent because they are immutable. */
export interface PaidServicePatchDto {
  name?: string;
  description?: string;
  sortOrder?: number;
  isAssignable?: boolean;
  isPublic?: boolean;
  priceAmountMinor?: number;
  priceCurrency?: string;
  billingPeriod?: BillingPeriod;
  grantsStorageBytes?: number;
  grantsModuleKey?: ModuleKey;
  /** Replaces the offered-on set wholesale when present. `[]` lifts every restriction (back to
   *  "every plan"); omit to leave it alone. The two are not the same thing. */
  planTierIds?: string[];
}

/** POST /api/events/{eventId}/addons — host only, DRAFT events only. */
export interface EventAddonRequestDto {
  /** A RECURRING_ADDON or MODULE_UNLOCK code. A STORAGE_PACK code is a 400 here. */
  paidServiceCode: string;
}

/** The response to the above, and the shape of `addons[]` on GET /api/events/{id}/billing. */
export interface AddonSummary {
  code: string;
  name: string;
  /** What this costs, charged once at activation. */
  priceAmountMinor: number;
  /**
   * Always `'ONE_TIME'` — every add-on is folded into the one-time activation charge and never
   * bills again. Kept as a field rather than dropped so a row from an older catalog entry still
   * has somewhere to report its cadence. Added 2026-08-17.
   */
  billingPeriod: BillingPeriod;
  activatedAt: string;
}

/** Aggregate config snapshot. Fetch once at app boot and cache — not per-request data. */
interface AppConfigResponseDto {
  featureFlags: PlatformFeatureFlagResponseDto[];
  media: AppMediaConfigDto;
  pagination: AppPaginationConfigDto;
  planTiers: PlanTierResponseDto[];
  /** Public, assignable paid services, ordered by kind then sortOrder. Filter by `kind` — the
   *  three kinds are bought through three different endpoints. */
  paidServices: PaidServiceResponseDto[];
  /** Registry rows currently enabled platform-wide, ordered by sortOrder. */
  modules: PlatformModuleResponseDto[];
  /** Module keys of the entries in `modules` — a globally disabled module disappears from this. */
  eventModuleKeys: ModuleKey[];
  /** Enabled rows of the event-type registry, ordered by sortOrder. Carries no copy: the name and
   *  tagline live in `translations.eventTypes`, keyed by the same eventTypeKey. */
  eventTypes: AppEventTypeDto[];
  /** The keys of `eventTypes`, same order. This is exactly what `EventRequestDto.eventType` may
   *  be set to right now — build the picker from this, not from a hard-coded list. */
  eventTypeKeys: string[];
  /** Locale copy, namespaced by kind. Currently only event types. */
  translations: AppTranslationsDto;
  rsvp: AppRsvpConfigDto;
  /** Added 2026-08-23. */
  contentLimits: AppContentLimitsDto;
  /** Active reaction types, keyed by eventTypeKey, each pre-sorted by sortOrder. Build the
   *  reaction picker from `reactionTypesByEventType[post.eventType]`. Added 2026-08-30. */
  reactionTypesByEventType: Record<string, ReactionTypeResponseDto[]>;
  /** Every distinct `@RateLimit` bucket currently in effect. Added 2026-08-23. */
  rateLimits: AppRateLimitConfigDto[];
  /** What `ReportRequestDto.targetType` may be set to. Enum names, not free text — see
   *  fe-guides/rsvp-report-types-fe-integration.md. */
  reportTargetTypes: string[];
  /** What `ReportRequestDto.reason` may be set to. Same contract as reportTargetTypes. */
  reportReasons: string[];
  /** Budget for any endpoint not listed in `rateLimits`. Added 2026-08-23. */
  defaultRateLimit: number;
  defaultRateLimitWindowSeconds: number;
  /** Added 2026-09-18. See fe-guides/billing-fe-guide.md §9 (withdrawal). */
  withdrawal: AppWithdrawalConfigDto;
  /** Added 2026-09-21. See fe-guides/event-coverage-window-fe-integration.md. */
  coverage: AppCoverageConfigDto;
  /** Added 2026-09-23. See fe-guides/newsletter-fe-integration.md §6. */
  newsletter: AppNewsletterConfigDto;
}

/**
 * The `details` object on a 409 quota rejection (errorCode 5008/5009). Carries the numbers
 * an upgrade prompt needs without a second round-trip to a usage endpoint.
 */
export interface QuotaExceededDetails {
  planCode: string;
  used: number;
  limit: number;
  incomingBytes?: number;   // storage rejections only
}

// ---- Admin platform metrics ----

/** GET /api/admin/metrics response. Live-computed dashboard counts, no pagination. */
export interface PlatformMetricsResponseDto {
  totalUsers: number;
  activeUsers: number;
  /** Keyed by ACCOUNT-scope plan code, e.g. 'FREE'. Missing key = 0. */
  usersByAccountPlan: Record<string, number>;

  totalEvents: number;
  activeEvents: number;
  /** Keyed by EventStatus name (DRAFT | ACTIVE). Missing key = 0. */
  eventsByStatus: Record<string, number>;
  /** Keyed by EVENT-scope plan code, e.g. 'BASIC'. Missing key = 0. */
  eventsByPlanTier: Record<string, number>;

  /** What R2 actually holds, versus what quota has promised. The two must not be conflated:
   *  read each field's note before putting a number on a dashboard. */
  storage: {
    /** Bytes of non-deleted media (derivatives + originals) — what the quota counts. */
    usedBytes: number;
    /** Bytes of soft-deleted media still in R2 awaiting the retention purge. Cloudflare bills for
     *  these; the quota does not. This is the gap between `usedBytes` and an R2 invoice. */
    pendingPurgeBytes: number;
    /** Sum of the storage ceilings sold across every event: headroom promised, not spend. It sits
     *  far above `usedBytes` by design — never label it as cost. */
    committedBytes: number;
    /** `usedBytes` held by events with at least one settled activation. */
    paidUsedBytes: number;
    /** `usedBytes` held by events that have never been activated. */
    freeUsedBytes: number;
    /** Total bytes ever granted platform-wide by settled storage-pack purchases. */
    purchasedExtraBytes: number;
    /** Approximate monthly storage spend, modelling `usedBytes` only. R2 charges no egress, which
     *  is why this is close to the whole bill, but Class A/B operations are billed and are not
     *  modelled — label it an approximation wherever it is shown. */
    estimatedMonthlyCostMinor: number;
    costCurrency: string;
  };

  /** Added 2026-09-23. Counts only — no endpoint lists subscribers. */
  newsletter: {
    /** Subscribed, not yet confirmed: on no list and holding no reward. */
    pending: number;
    /** The mailing list itself; should match Brevo's own count. */
    confirmed: number;
    unsubscribed: number;
    /** Codes ever minted. Can exceed `confirmed` — a reward outlives its owner's subscription. */
    rewardsIssued: number;
  };
}

/**
 * GET /api/admin/metrics/events and GET /api/admin/metrics/calendar/{date}/events — both
 * `Page<EventDashboardRowDto>`, newest first.
 *
 * Deliberately carries no title and no host. This is the privacy-safe "how much traffic is on
 * which day" view, not an event lookup: an operator sizing capacity does not need to know whose
 * wedding it is.
 */
export interface EventDashboardRowDto {
  eventId: string;
  planTierCode: string;
  eventType: string;
  startAt: string;
  /** Bytes of non-deleted media this event's plan allows. Null = unenforced, not zero. */
  storageQuotaBytes: number | null;
  /** Non-deleted members this event's plan allows. Null = unenforced, not zero. */
  guestQuotaMax: number | null;
}

/** GET /api/admin/metrics/timeline?weeks=12 — one row per (plan, week). */
export interface PlanTimelineRowDto {
  planTierCode: string;
  weekStart: string;
  eventCount: number;
}

/** GET /api/admin/metrics/calendar — the daily summaries plus the thresholds that colour them,
 *  so the legend always matches the deployed configuration instead of a frontend env var. */
export interface CalendarSummaryResponseDto {
  days: CalendarDaySummaryDto[];
  thresholds: CalendarLoadThresholdsDto;
}

export interface CalendarDaySummaryDto {
  date: string;
  eventCount: number;
  /** Event count on that day, keyed by plan tier code. A missing key is 0. */
  planMix: Record<string, number>;
  /**
   * Sum of that day's events' plan quotas. Events on an unenforced (null-limit) plan contribute
   * nothing rather than being counted as zero or as infinite, so when the matching
   * `hasUnlimited*` flag is true these are **floors**: render "50 GiB+", never an exact total.
   */
  storageBytesTotal: number;
  guestCapTotal: number;
  hasUnlimitedStorageQuota: boolean;
  hasUnlimitedGuestCap: boolean;
}

/** The event-count bands behind the calendar's low/medium/high colouring. */
export interface CalendarLoadThresholdsDto {
  lowMax: number;
  mediumMax: number;
  highMax: number;
}

/** GET /api/admin/metrics/cost-summary — the latest reconciled reading per provider. A provider
 *  that has never been reconciled is **absent from the list**, not present with zeros. See
 *  fe-guides/cost-tracking-fe-integration.md. */
export interface CostSummaryResponseDto {
  providerActuals: CostProviderActualDto[];
}
export interface CostProviderActualDto {
  provider: string;
  periodStart: string;
  periodEnd: string;
  /** Null when the provider's API exposes no monetary figure — read `detail` instead. */
  amountMinor: number | null;
  currency: string | null;
  detail: Record<string, unknown>;
  fetchedAt: string;
}

// ---- Dynamic QR links ----

export type QrTargetType = 'EVENT_JOIN' | 'MEDIA_UPLOAD' | 'INVITATION';

export type QrLinkStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'TARGET_UNAVAILABLE';

/** POST /api/events/{eventId}/qr-links */
export interface QrLinkRequestDto {
  targetType: QrTargetType;
  /** Required for INVITATION (must belong to the same event); must be omitted otherwise. */
  targetId?: string;
  /** EVENT_JOIN / MEDIA_UPLOAD only. 1..1000, default 50. */
  maxGuests?: number;
  label?: string;                        // max 100, host-facing only
  metadata?: Record<string, unknown>;    // host-facing only, never returned publicly
  expiresAt?: string;
}

/** PATCH /api/qr-links/{id}. Every field optional; omitted fields are left unchanged. */
export interface QrLinkPatchDto {
  targetType?: QrTargetType;
  targetId?: string;
  /** 1..1000. Raises/lowers the shared code's guest limit — the fix for a 5035.
   *  EVENT_JOIN / MEDIA_UPLOAD only; a 400 on an INVITATION-targeted link. */
  maxGuests?: number;
  label?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
}

/** Host-facing view. Returned by every /api/qr-links and /api/events/{id}/qr-links endpoint. */
export interface QrLinkResponseDto {
  id: string;
  eventId: string;
  token: string;
  /** Absolute, stable, printable. Render THIS as the QR code — do not build the URL yourself. */
  publicUrl: string;
  targetType: QrTargetType;
  /** The same derived state a scanner sees — computed by the backend, not stored. Use this for
   *  the host's badge instead of inferring it from revokedAt/expiresAt, which cannot tell you
   *  about TARGET_UNAVAILABLE. */
  status: QrLinkStatus;
  targetId: string | null;
  /** Read through from the backing invitation. Null only if that invitation has gone missing,
   *  which also makes the code resolve as TARGET_UNAVAILABLE. */
  maxGuests: number | null;
  label: string | null;
  /** Null for host-created links. When present, look it up in your own translation catalog and
   *  render that instead of `label`, so a platform-minted link shows in the viewer's language
   *  rather than whichever one it happened to be minted in. */
  labelKey: string | null;
  metadata: Record<string, unknown>;
  expiresAt: string | null;   // null = never expires
  revokedAt: string | null;   // non-null = dead; revocation is one-way
  /** True for the links the platform minted itself when the event went live. Lets the host UI say
   *  "we set this up for you" instead of implying the host configured it. */
  autoGenerated: boolean;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/events/{eventId}/qr-links/stats — host only. One row per link, revoked ones included.
 *
 * Attribution is by backing invitation, not by scan: nothing is written when a code is scanned,
 * so there is no scan count and no conversion rate here. Do not derive one.
 */
export interface QrLinkStatsDto {
  qrLinkId: string;
  label: string | null;
  /** Same contract as QrLinkResponseDto.labelKey. */
  labelKey: string | null;
  targetType: QrTargetType;
  status: QrLinkStatus;
  /** Guests who joined through this code and have not been removed since. */
  joinCount: number;
  /** Null when the backing invitation has gone missing (status is TARGET_UNAVAILABLE). */
  maxGuests: number | null;
  /** Joins remaining before the code starts refusing guests with 5035. Floors at 0, never
   *  negative. Null whenever maxGuests is. Surface this — it is the only figure that lets a
   *  host act before a guest gets turned away. */
  remainingSlots: number | null;
  /** Null until somebody joins. */
  lastJoinedAt: string | null;
  /** Media contributed by the guests this code brought in — everything they ever uploaded, not
   *  only what they uploaded in the visit that began with the scan. Label it accordingly. */
  uploadCount: number;
}

/**
 * GET /api/qr/{token} — PUBLIC, no Authorization header.
 * Only `status` and `targetType` are always present; everything else is ACTIVE-only.
 * An unknown token is the sole error case (404, errorCode 2004).
 */
export interface QrLinkResolutionDto {
  status: QrLinkStatus;
  targetType: QrTargetType;
  eventId?: string;
  eventTitle?: string;
  eventSubtitle?: string | null;
  coverMediaId?: string | null;
  /** Only ever 'ACTIVE' when present — any other event status resolves as TARGET_UNAVAILABLE
   *  instead, so a draft event's codes simply stop working until it goes live. */
  eventStatus?: 'ACTIVE';
  /** Feed this to POST /api/auth/guest-login. */
  inviteToken?: string;
  requiresAuth?: boolean;
  /** When true, guest-login MUST carry a guestKey. True for every shared code. */
  requiresGuestKey?: boolean;
}

// ---------------------------------------------------------------------------
// Wishlist — the `wishlist` module's one resource, added 2026-08-16
// /api/events/{eventId}/gift-account: GET any member, PUT/DELETE host only
// ---------------------------------------------------------------------------

/** PUT body. Upsert — there is at most one per event, so no create-vs-update distinction. */
export interface EventGiftAccountRequestDto {
  /** Accepted with or without spaces. Max 42 as typed (a 400 with errors.iban beyond that), and
   *  max 34 once normalised — over that, or bad mod-97 check digits, is 400 / 5045 INVALID_IBAN. */
  iban: string;
  accountHolder: string;  // required, max 140
  bankName: string;       // required, max 140
  note?: string;          // max 500
}

/**
 * Served only to members of the event, and deliberately absent from EventDetailResponseDto —
 * that endpoint is reachable by anonymous QR scanners. Stored encrypted at rest; don't put the
 * value in localStorage, a URL, or an analytics event.
 *
 * GET returns 404 when the host has not set one up. That is the normal empty state, not an error.
 */
export interface EventGiftAccountResponseDto {
  id: string;
  eventId: string;
  iban: string;           // normalised: uppercase, no spaces — group it in fours for display
  accountHolder: string;
  bankName: string;
  note: string | null;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Wishbook — written wishes, added 2026-08-16
// GET/POST /api/events/{eventId}/wishbook, GET .../wishbook/count (plain number),
// DELETE /api/wishbook/{entryId} (note: not nested under the event)
// ---------------------------------------------------------------------------

export interface WishbookEntryRequestDto {
  message: string;      // required, max 2000
  /** How the wish is signed. Defaults to the member's display name. Max 120. */
  guestName?: string;
}

/** GET /api/events/{eventId}/wishbook returns `Page<WishbookEntryResponseDto>`, newest first. */
export interface WishbookEntryResponseDto {
  id: string;
  eventId: string;
  /** Null once the author's membership is removed — the wish itself survives. */
  authorMemberId: string | null;
  guestName: string;
  message: string;       // free text from a guest; escape it on render
  createdAt: string;
  /** Server-computed: the caller's own wish, or anything if they host. Read this rather than
   *  deriving it from authorMemberId, which cannot tell you about the host case. */
  canDelete: boolean;
}

// ---- Newsletter ----
// Full contract: fe-guides/newsletter-fe-integration.md. Added 2026-09-23.

/** POST /api/newsletter/subscribe — unauthenticated. Always 202 with an empty body, for a new
 *  address, one already pending, one that confirmed months ago and one that unsubscribed alike.
 *  There is nothing in the response to branch on: show "check your inbox" and nothing else. */
export interface NewsletterSubscribeRequestDto {
  email: string;    // required, max 255, must be an address
  /** BCP-47. An unrecognised tag falls back to English rather than failing the signup. */
  locale?: string;  // max 10
}

/** Body for POST /api/newsletter/confirm and POST /api/newsletter/unsubscribe — both
 *  unauthenticated, both 204 whatever happened, including for a token that never existed. POST
 *  rather than GET so inbox and antivirus link-prefetchers cannot fire them: the emailed links
 *  point at your /newsletter/confirm and /newsletter/unsubscribe pages, which issue the POST. */
export interface NewsletterTokenRequestDto {
  token: string;    // required, max 64 (real tokens are 43)
}

/** GET /api/me/newsletter — USER or ADMIN; guests get 403. Someone who never subscribed gets
 *  `{subscribed: false}` with nulls, not a 404. */
export interface NewsletterStatusResponseDto {
  /** True only while CONFIRMED. */
  subscribed: boolean;
  confirmedAt: string | null;
  /**
   * The code to type at checkout, e.g. "NL-7QK2MX9WVB" — non-null ONLY while checkout would still
   * accept it. Spent, lapsed or disabled codes come back null, so render the code block from this
   * field rather than from a copy held in local state.
   */
  rewardCode: string | null;
  rewardExpiresAt: string | null;
}

/** PUT /api/me/newsletter — 204. A verified address is confirmed and rewarded immediately; an
 *  unverified one goes through the ordinary double opt-in, so re-fetch rather than assuming the
 *  toggle stuck. */
export interface NewsletterToggleRequestDto {
  /** Required. An absent field is a 400, not "unsubscribe". */
  subscribed: boolean;
}

// ---------------------------------------------------------------------------
// Billing — checkout, orders, upgrades, withdrawals
// Full contract: fe-guides/billing-fe-guide.md.
// ---------------------------------------------------------------------------

export type OrderKind = 'ACTIVATION' | 'UPGRADE' | 'STORAGE_PACK';

/**
 * PENDING is chased by the reconciliation sweep, so it is not a dead end. REFUNDED is
 * deliberately distinct from FAILED: that order *was* paid, and the row records that it stopped
 * being so.
 */
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

/**
 * POST /api/events/{eventId}/checkout — opens the one activation charge that makes a DRAFT event
 * live.
 *
 * The two booleans are the express request and acknowledgement Directive 2011/83/EU art. 14(3)
 * and 14(4)(a) require before a service may begin inside the withdrawal period. **Both must be
 * literally `true`**; a checkout without them is refused with 400 rather than opened without
 * consent, so they cannot be defaulted or hidden — the host has to see the terms and agree.
 * `termsVersion` ties that agreement to the wording they actually saw: read it from
 * /api/config's `withdrawal.termsVersion`, never hardcode it.
 */
export interface ActivationCheckoutRequestDto {
  /** A partner or house code the host typed. Max 40. Omit when there is none. */
  collaborationCode?: string;
  requestsImmediateStart: true;
  acknowledgesWithdrawalTerms: true;
  termsVersion: string;   // required, max 40
}

/** POST /api/events/{eventId}/upgrade-checkout — charges the gap between the event's duration and
 *  one of a more expensive plan's (since 2026-09-23; it used to be plan to plan). Same consent
 *  fields as above: an upgrade is a new paid service. Note there is no code field — since
 *  2026-09-22 a discount code prices an activation and nothing else, so neither a new code nor the
 *  one already on the event reaches an upgrade. Only the target plan's own promotion comes off;
 *  quote the price from UpgradeOptionResponseDto rather than computing it. */
export interface UpgradeCheckoutRequestDto {
  planTierCode: string;   // required, max 50
  /** Required (added 2026-09-23): one of that plan's `options[].coverageOptionId` from
   *  upgrade-options. 400 COVERAGE_OPTION_INVALID (5077) when it is not a live duration of that
   *  plan; 409 PLAN_TIER_NOT_AN_UPGRADE (5029) when it is shorter than the event's duration or does
   *  not cost more. */
  coverageOptionId: string;
  requestsImmediateStart: true;
  acknowledgesWithdrawalTerms: true;
  termsVersion: string;   // required, max 40
}

/** POST /api/events/{eventId}/storage-checkout — buys one storage pack for a live event. A code,
 *  not a price and not a byte count: both are looked up from the catalog row it names, which is
 *  re-checked as purchasable and as a STORAGE_PACK. */
export interface StorageCheckoutRequestDto {
  paidServiceCode: string;   // required, max 30
}

/**
 * The answer to all three checkout endpoints.
 *
 * `redirectUrl` is where to send the browser. `orderId` is what to watch afterwards: the
 * provider's success URL means "the payment page finished", not "the money arrived" — the webhook
 * decides that, and it can land either side of the redirect. So poll
 * GET /api/events/{eventId}/billing and watch that order's status rather than trusting the URL
 * you were returned to.
 */
export interface CheckoutResponseDto {
  orderId: string;
  redirectUrl: string;
}

/** GET /api/events/{eventId}/billing — everything a host needs to understand what they paid for,
 *  and the frontend's polling target after a checkout redirect. */
export interface EventBillingResponseDto {
  eventStatus: EventStatus;
  planTierCode: string;
  planTierName: string;
  /** The INITIAL coverage option the event is on — which of the plan's durations it was sold
   *  (added 2026-09-23). A settled upgrade or an admin plan assignment replaces it. */
  coverageOptionId: string;
  coverageMonths: number;   // that option's months
  orders: OrderSummary[];   // newest first
  addons: AddonSummary[];
  /** The code the event's activation was priced with, or null. A record of that one purchase, not
   *  a standing rate: since 2026-09-22 it reaches no upgrade and no storage pack. Shown here so a
   *  host doesn't have to remember a code they redeemed once. See billing-fe-guide.md §8. */
  discount: DiscountSummary | null;
}

/** Deliberately carries no provider session or payment id: they are the provider's identifiers,
 *  not ours to hand out, and the host has no use for them. */
export interface OrderSummary {
  id: string;
  kind: OrderKind;
  status: OrderStatus;
  amountMinor: number | null;
  /** The part of `amountMinor` that was active add-ons, or null when the order carried none. */
  addonAmountMinor: number | null;
  currency: string | null;
  paidAt: string | null;
  createdAt: string;
  /** The withdrawal split this order would refund against. Null on orders predating it. */
  setupAmountMinor: number | null;
  eventDayAmountMinor: number | null;
  hostingAmountMinor: number | null;
  /** The months of coverage the order bought (added 2026-09-23): the option's months on an
   *  ACTIVATION, the target option's on an UPGRADE. Null on an order that buys no coverage. */
  coverageMonths: number | null;
  /** UPGRADE only: how many months it added to the event's coverageEndsAt — 0 for a same-length
   *  upgrade. Null on every other kind. */
  coverageMonthsAdded: number | null;
}

/** Carries no raw code, no partner identity and no redemption id — the host is shown the label the
 *  code's owner chose to display, never who they are or what we pay them. */
export interface DiscountSummary {
  label: string;
  /** The snapshot taken at redemption, not the code's current rate: a rate changed since must not
   *  silently reprice an event that already redeemed the old one. */
  discountPercent: number | null;
  appliedAt: string;
}

/**
 * GET /api/events/{eventId}/upgrade-options — every upgrade this event can buy, one entry per
 * target plan with the durations of it the event may buy, each fully priced (reshaped 2026-09-23).
 * Nothing here is for the frontend to recompute: each option's `payableAmountMinor` already folds
 * in the target plan's own promotion exactly as checkout will charge it, so a screen built from
 * this list cannot quote a figure checkout then disagrees with. That promotion is the only
 * discount an upgrade gets: since 2026-09-22 a code bound to the event does not reach it.
 *
 * The two discount fields are sent as `null`, never left out, when the target has no promotion.
 */
export interface UpgradeOptionResponseDto {
  planTierCode: string;
  planTierName: string;
  currency: string;
  /** The target plan's own promotion percent, behind every `payableAmountMinor` below, or null when
   *  it has no live promotion. */
  discountPercent: number | null;
  /** The target plan's promotion label. Null whenever `discountPercent` is, and also when the
   *  promotion was set up without a label — never a code's label. */
  discountLabel: string | null;
  /** The plan's durations at least as long as the event's own and dearer than it, in display
   *  order. Never empty: a plan with none is left out of the list. */
  options: UpgradeOptionEntry[];
}

/** One duration of an upgrade target (`UpgradeOptionResponseDto.Option` on the server). */
export interface UpgradeOptionEntry {
  coverageOptionId: string;   // what upgrade-checkout takes as coverageOptionId
  months: number;
  monthsAdded: number;        // what buying it adds to coverageEndsAt; 0 for a same-length upgrade
  /** The undiscounted difference between the event's duration and this one. Good for a "was"
   *  strike-through, but not what checkout will charge. */
  gapAmountMinor: number;
  payableAmountMinor: number;
}

// ---- Withdrawals (the automated right of withdrawal) ----

/** PENDING/APPROVED/REJECTED are legacy states kept for rows that predate the automated flow;
 *  nothing produces them now. A live request lands on REFUSED (refused at the gate, nothing
 *  changed), HELD (computed, but a fraud signal fired or the platform is in manual mode),
 *  REFUNDED, or WITHHELD (an admin refused a held request; the host's account is suspended). */
export type RefundRequestStatus =
  | 'PENDING' | 'APPROVED' | 'REJECTED'
  | 'REFUSED' | 'HELD' | 'REFUNDED' | 'WITHHELD';

/** Which article the refund is computed under. CONSENTED_PRO_RATA: the host asked for an
 *  immediate start, so setup is retained and the rest is pro-rated. NO_CONSENT_FULL_REFUND: no
 *  express request to begin, so no cost may be charged at all. */
export type RefundBasis = 'CONSENTED_PRO_RATA' | 'NO_CONSENT_FULL_REFUND';

/** POST /api/events/{eventId}/withdrawals — the body is optional. Nothing in `reason` is parsed;
 *  an admin reads it if the request is held. */
export interface WithdrawalRequestCreateDto {
  reason?: string;   // max 1000
}

/** GET /api/events/{eventId}/withdrawal-preview — what a withdrawal would do right now, without
 *  doing it. Nothing is persisted by a preview, so call it freely to render the confirmation
 *  screen. */
export interface WithdrawalPreviewDto {
  eligible: boolean;
  /** Why not, when `eligible` is false. Show these; they are the whole explanation. */
  refusals: WithdrawalRefusalDto[];
  /** Null, like `currency`, on an ineligible preview with no settled (PAID) activation. */
  windowClosesAt: string | null;
  totalRefundMinor: number;
  currency: string | null;
  lines: WithdrawalLineDto[];
  /** True when the event's startAt has moved off the date that was paid for. A withdrawal is then
   *  always HELD for a person to review, never refunded on the spot — say so in the confirmation
   *  dialog. False promises nothing: other reasons can hold a request, and those are not
   *  disclosed. Added 2026-09-23. */
  scheduleMovedAfterPayment: boolean;
}

/** One withdrawal attempt as the host sees it. Fraud signals and the reviewer's recommendation are
 *  deliberately absent — those live on WithdrawalAdminDto. */
export interface WithdrawalResponseDto {
  id: string;
  eventId: string;
  status: RefundRequestStatus;
  reason: string | null;
  createdAt: string;
  decidedAt: string | null;
  /** The admin's words on a WITHHELD request. The host is shown exactly this text. */
  decisionNote: string | null;
  /** When a HELD request releases itself if no admin acts. */
  holdUntil: string | null;
  totalRefundMinor: number | null;
  currency: string | null;
  refusals: WithdrawalRefusalDto[];
  lines: WithdrawalLineDto[];
}

export interface WithdrawalRefusalDto {
  code: string;
  message: string;
  detail: string | null;
}

/** One order's contribution to the refund. `components` is the arithmetic, kept open-ended so the
 *  breakdown can be shown without the frontend recomputing it. */
export interface WithdrawalLineDto {
  orderId: string;
  orderKind: OrderKind;
  basis: RefundBasis;
  hostingStart: string | null;
  hostingEnd: string | null;
  usedSeconds: number | null;
  totalSeconds: number | null;
  eventPerformed: boolean;
  refundMinor: number;
  /** Whether the money actually left the provider, as opposed to the line merely being computed. */
  providerRefunded: boolean;
  components: Record<string, unknown>;
}

/** GET /api/admin/withdrawals — the facts sheet for each held request. Everything here was
 *  computed and stored at request time, so what the reviewer reads is exactly what the automated
 *  decision was based on; nothing is recalculated live. */
export interface WithdrawalAdminDto {
  request: WithdrawalResponseDto;
  usageFacts: Record<string, unknown>;
  fraudSignals: WithdrawalSignalDto[];
  recommendation: string;
}
export interface WithdrawalSignalDto {
  code: string;
  fired: boolean;
  observed: string | null;
  threshold: string | null;
}

/** POST /api/admin/withdrawals/{requestId}/withhold. The note is mandatory: withholding is only
 *  lawful with a stated reason, and the host is shown this text verbatim.
 *  (POST .../release takes no body and answers the same WithdrawalResponseDto.) */
export interface WithdrawalWithholdDto {
  note: string;   // required, max 1000
}

/**
 * GET /api/admin/webhooks/unprocessed — deliveries that were received and never finished
 * processing. Each one is a moment where money moved and the platform did not react.
 *
 * The webhook endpoint answers 200 and swallows the failure on purpose (a deterministic failure
 * retried forever helps nobody), so this list is the only trace. Sort an operator's attention by
 * `eventType`: an unhandled `invoice.*` is noise, a lost `checkout.session.completed` is a charged
 * customer with nothing to show for it.
 */
export interface UnprocessedWebhookDto {
  provider: string;
  providerEventId: string;
  eventType: string;
  receivedAt: string;
  /** Whether the delivery's body was kept, and so whether the replay endpoint can run it again.
   *  False only for deliveries received before the ledger stored one — those need a human. */
  replayable: boolean;
}

// ---------------------------------------------------------------------------
// Collaborations, partner codes and house discount codes
// Full contract: fe-guides/collaborations-fe-integration.md.
// ---------------------------------------------------------------------------

export type CollaboratorStatus = 'ACTIVE' | 'SUSPENDED';
export type DiscountCodeStatus = 'ACTIVE' | 'DISABLED';
export type EarningEntryType = 'ACCRUAL' | 'CLAWBACK';
export type EarningStatus = 'ACCRUED' | 'PAID' | 'REVERSED';

// ---- Previewing a code before checkout ----

/**
 * POST /api/events/{eventId}/checkout/preview-code — try a code against an event that already
 * exists.
 *
 * Send a blank `collaborationCode` to preview the event's own already-applied code instead; that
 * is refused with 5063 NO_DISCOUNT_TO_PREVIEW when the event carries none.
 *
 * With `targetPlanTierCode` both halves change, because since 2026-09-22 no code reaches an
 * upgrade: a typed code is refused with 5076 DISCOUNT_NOT_APPLICABLE_TO_UPGRADE, and a blank one
 * returns the gap with the target plan's own promotion — whether or not the event carries a code.
 */
export interface CodePreviewRequestDto {
  collaborationCode?: string;   // max 40
  /** Omit for an activation preview (priced against the event's own duration). Naming an
   *  EVENT-scope plan prices the gap to one of its durations instead, less that plan's own
   *  promotion and nothing else. */
  targetPlanTierCode?: string;  // max 50
  /** Required with `targetPlanTierCode` (added 2026-09-23): the duration of that plan being
   *  considered. 400 COVERAGE_OPTION_INVALID (5077) when missing or not a live one of that plan.
   *  Ignored without a target plan. */
  targetCoverageOptionId?: string;
}

/** POST /api/checkout/preview-code — try a code while the host is still filling in the creation
 *  form, before the event exists. Priced against the type, plan and duration picked on that form,
 *  which is why all three travel with the code instead of an event id. */
export interface NewEventCodePreviewRequestDto {
  eventType: string;          // required, max 50
  planTierCode: string;       // required, max 50
  coverageOptionId: string;   // required (added 2026-09-23) — one of the plan's initialOptions;
                              // 400 COVERAGE_OPTION_INVALID (5077) otherwise
  collaborationCode: string;  // required, max 40
}

/**
 * What a valid code would do to this checkout. Carries no commission rate and no partner identity
 * beyond the label they chose to show: what we pay a venue is between us and the venue, and a host
 * who can read it can negotiate against it.
 */
export interface CodePreviewResponseDto {
  /** The code's display label. Null on an upgrade preview (`targetPlanTierCode` sent), where no
   *  code is priced. */
  label: string | null;
  /** The code's headline figure. Always 0 on an upgrade preview, even when the plan's own
   *  promotion took something off — read `combinedDiscountPercent` there. */
  discountPercent: number;
  /** What will actually come off, after the plan's own promotion is added in and the total
   *  clamped. May be **lower** than `discountPercent` during a plan promotion — show this one. */
  combinedDiscountPercent: number;
  /** The chosen duration's price (or, on an upgrade preview, the gap) after that discount,
   *  excluding any add-ons. */
  payableAmountMinor: number;
  currency: string;
}

// ---- Partners (admin) ----

/** POST /api/admin/collaborators and PATCH /api/admin/collaborators/{id}. */
export interface CollaboratorRequestDto {
  name: string;          // required, max 200
  contactEmail: string;  // required, max 320
  notes?: string;        // max 2000
  /** Null on create means ACTIVE; null on update means "leave it alone". Suspending a partner is
   *  the only reason this field exists. */
  status?: CollaboratorStatus;
}

/** Never carries the portal token — only whether one has been issued, and when. */
export interface CollaboratorResponseDto {
  id: string;
  name: string;
  contactEmail: string;
  status: CollaboratorStatus;
  portalTokenIssued: boolean;
  portalTokenIssuedAt: string | null;
  notes: string | null;
}

/** POST /api/admin/collaborators/{collaboratorId}/portal-token — rotates and returns the token.
 *  Returned once at issue and never again: show it, and tell the admin to send it now. */
export interface PortalTokenResponseDto {
  token: string;
  portalUrl: string;
}

/** POST /api/admin/collaborators/{collaboratorId}/codes. */
export interface CollaborationCodeRequestDto {
  /** Alphanumeric and dashes only, stored uppercase: anything a host has to read off a printed
   *  card, and nothing that needs URL-escaping. Max 40. */
  code: string;
  label: string;              // required, max 200 — what the host sees at checkout
  discountPercent: number;    // required, 0-99
  commissionPercent: number;  // required, 0-100 — admin-only, never shown to a host
  startsAt?: string;
  endsAt?: string;
  maxRedemptions?: number;    // >= 1; omit for unlimited
  /** Event types this code may be redeemed against. Omit or send [] for every type. */
  eventTypeKeys?: string[];
  /** EVENT-scope plan codes this code may be redeemed against. Omit or send [] for every plan. */
  planTierCodes?: string[];
}

/**
 * PATCH /api/admin/collaboration-codes/{codeId}.
 *
 * There is no `code` field, deliberately rather than by oversight: the string is already printed
 * on the partner's brochures and changing it would orphan every card in circulation. Retiring a
 * string means setting `status` to DISABLED and issuing a new code.
 *
 * Rate changes take effect on future redemptions only — existing redemptions snapshot their
 * percentages, so nothing already earned moves.
 */
export interface CollaborationCodePatchDto {
  label: string;              // required
  discountPercent: number;    // required, 0-99
  commissionPercent: number;  // required, 0-100
  status: DiscountCodeStatus; // required
  startsAt?: string;
  endsAt?: string;
  maxRedemptions?: number;
  /** Both replace the restriction wholesale. Null or [] means "every". */
  eventTypeKeys?: string[];
  planTierCodes?: string[];
}

/** Admin-only, so it holds back nothing — the commission rate included. */
export interface CollaborationCodeResponseDto {
  id: string;
  collaboratorId: string;
  code: string;
  label: string;
  discountPercent: number;
  commissionPercent: number;
  status: DiscountCodeStatus;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;   // null = unlimited
  /** Redemptions that still count against `maxRedemptions` — voided ones are excluded, which is
   *  why this is served rather than left to be counted client-side. */
  liveRedemptions: number;
  /** Empty means every event type / every plan, not none. */
  eventTypeKeys: string[];
  planTierCodes: string[];
}

/** POST /api/admin/collaborators/{collaboratorId}/codes/link — attaches an existing house code to
 *  a partner, promoting it to a partner code. */
export interface LinkDiscountCodeRequestDto {
  discountCodeId: string;
  commissionPercent: number;   // required, 0-100
}

/** POST /api/admin/events/{eventId}/collaboration-redemption/void and
 *  POST /api/admin/discount-codes/events/{eventId}/redemption/void. A reason is mandatory:
 *  voiding an attribution takes money off a partner, so it needs a record. */
export interface VoidRedemptionRequestDto {
  reason: string;   // required, max 1000
}

// ---- The partner's own ledger ----

/** GET /api/admin/collaborators/{collaboratorId}/earnings — amounts are **signed**: a clawback is
 *  negative. Sum them, don't take absolute values. */
export interface EarningResponseDto {
  id: string;
  eventId: string;
  orderId: string;
  codeId: string;
  entryType: EarningEntryType;
  amountMinor: number;
  currency: string;
  /** The rate snapshotted at accrual, not the code's rate today. */
  commissionPercent: number;
  basisAmountMinor: number;
  status: EarningStatus;
  accruedAt: string;
  paidAt: string | null;
  payoutReference: string | null;
}

/** GET /api/admin/collaborators/{collaboratorId}/earnings/totals — one row per currency. Never
 *  sum across rows: adding EUR to SEK is a correctness bug, not a display one. */
export interface EarningTotalDto {
  currency: string;
  accruedMinor: number;
  paidMinor: number;
}

/** POST /api/admin/collaboration-earnings/mark-paid — settles a batch and stamps them all with the
 *  same reference. */
export interface MarkPaidRequestDto {
  earningIds: string[];      // required, non-empty
  payoutReference: string;   // required, max 200
}

/**
 * GET /api/partners/{token} — the partner's own page, reachable by anyone holding the link.
 *
 * Deliberately aggregate-only for that reason: a forwarded email, a screenshot or a bookmark on a
 * shared machine all reach it, so it carries no host names, no host emails, no event titles and no
 * event ids. A partner learns how much they have earned, not who our customers are.
 *
 * It reports commission accrued rather than "discount delivered", because the combined-discount
 * ceiling can swallow part of a code's headline percentage during a plan promotion — the second
 * number would be a promise we cannot keep.
 */
export interface PartnerPageDto {
  name: string;
  eventsReferred: number;
  totals: EarningTotalDto[];
}

// ---- House discount codes (admin, no partner attached) ----

/** POST /api/admin/discount-codes. Same code rules as a partner code, minus the commission. */
export interface DiscountCodeRequestDto {
  code: string;              // required, max 40, alphanumeric and dashes, stored uppercase
  label: string;             // required, max 200
  discountPercent: number;   // required, 0-99
  startsAt?: string;
  endsAt?: string;
  maxRedemptions?: number;   // >= 1; omit for unlimited
  eventTypeKeys?: string[];  // omit or [] for every type
  planTierCodes?: string[];  // omit or [] for every plan
}

/** PATCH /api/admin/discount-codes/{codeId}. No `code` field, for the same reason as
 *  CollaborationCodePatchDto. Both restriction sets replace wholesale. */
export interface DiscountCodePatchDto {
  label: string;               // required
  discountPercent: number;     // required, 0-99
  status: DiscountCodeStatus;  // required
  startsAt?: string;
  endsAt?: string;
  maxRedemptions?: number;
  eventTypeKeys?: string[];
  planTierCodes?: string[];
}

/** GET /api/admin/discount-codes. `planTierCodes` carries codes, never plan-tier ids, so an admin
 *  screen never has to resolve a UUID. Empty means "every". */
export interface DiscountCodeResponseDto {
  id: string;
  code: string;
  label: string;
  discountPercent: number;
  status: DiscountCodeStatus;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  liveRedemptions: number;
  eventTypeKeys: string[];
  planTierCodes: string[];
}

/**
 * The newsletter's slice of the GDPR data export.
 *
 * **Nothing serves this today** — the export endpoint it belongs to was specified and never built.
 * It is here because the shape is defined and tested, not because there is a response to type
 * against; do not build a screen on it without checking that an endpoint exists.
 *
 * Consent IP and User-Agent are included on purpose: they are facts held about the subscriber, and
 * an export that omitted them would be incomplete in exactly the way the right of access exists to
 * prevent. The confirmation and unsubscribe tokens are not — those are credentials, not facts.
 */
export interface NewsletterSubscriptionExportDto {
  email: string | null;
  status: string;
  source: string;
  locale: string | null;
  subscribedAt: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  consentIp: string | null;
  consentUserAgent: string | null;
  rewardCode: string | null;
  rewardExpiresAt: string | null;
}
