/**
 * TypeScript type schema for the event_social_media API.
 *
 * Generated directly from the current backend DTOs/entities (not from prose docs) as of
 * 2026-07-30, last extended 2026-08-26 (EventMemberResponseDto gained rsvpId — see
 * docs/fe-guides/rsvp-status-fe-integration.md). Companion reference to
 * docs/fe-guides/frontend-integration-guide.md, which covers
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

// Spring Data's Page<T> JSON shape — trimmed to the fields worth relying on.
interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page, 0-indexed
  size: number;
}

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

type AuthProvider = "LOCAL" | "OAUTH" | "INVITE";
type AccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
type PlatformRole = "USER" | "ADMIN" | "GUEST";

type EventRole = "HOST" | "ATTENDEE";
type EventVisibility = "PUBLIC" | "PRIVATE"; // default PRIVATE server-side, but required on EventRequestDto
type AttendanceStatus = "ATTENDING" | "DECLINED" | "MAYBE";

type PostType = "TEXT" | "MEDIA" | "ANNOUNCEMENT" | "PLAYLIST"; // server-enforced via @Pattern + DB CHECK

// ---------------------------------------------------------------------------
// Auth (/api/auth/*) — all public, no token required
// ---------------------------------------------------------------------------

interface RegisterRequestDto { email: string; password: string; } // password 8-100 chars
interface LoginRequestDto { email: string; password: string; }
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
  role: PlatformRole;
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
} // no password field — passwords only ever set via /api/auth/register

interface UserResponseDto {
  id: string; email: string; authProvider: AuthProvider; isGuestAccount: boolean;
  status: AccountStatus; platformRole: PlatformRole;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
// GET /api/users now returns Page<UserResponseDto>, not UserResponseDto[].
// Default 50/page, max 100 (?page=&size=), sorted createdAt desc then id desc (newest first).

/** Read-only — no request DTO. POST /api/sessions was removed entirely. */
interface SessionResponseDto {
  id: string; userId: string; ipAddress: string; userAgent: string;
  refreshTokenHash: string; expiresAt: string; createdAt: string; revokedAt: string | null;
}

/**
 * Notifications are host-facing and produced solely by the backend quota sweep.
 * There is no request DTO — POST /api/notifications was removed entirely.
 */
// NOTE: also missing EVENT_REMINDER, EVENT_SUMMARY, BILLING_EXPIRING, BILLING_PAST_DUE,
// BILLING_PURGE_WARNING, REFUND_APPROVED, REFUND_REJECTED — see billing-fe-guide.md §10, which
// already asked for these to be added. Pre-existing gap, not part of the 2026-08-24 change below.
type NotificationType =
  | 'STORAGE_LIMIT_WARNING'
  | 'MEMBER_LIMIT_WARNING'
  | 'UPGRADE_OFFER'
  | 'HOST_TIP';

/** OFFER is marketing (gated on consent for email); the rest are transactional. */
type NotificationCategory = 'LIMIT' | 'OFFER' | 'TIP' | 'SYSTEM';

type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

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
  /** App-relative route, e.g. "/events/{id}/settings/plan". Never absolute. */
  ctaRoute: string | null;
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
  storageLimitBytes: number;
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
  eventType: string;              // required, max 50 — free text (WEDDING | BAPTISM | BIRTHDAY | CONFERENCE | <custom>)
  visibility: EventVisibility;    // required on this DTO despite the entity's DB default
  startAt: string;                // required
  endAt?: string;
  timezone: string;               // required, max 100
  locationName?: string;          // max 255
  locationAddress?: string;
  mapsUrl?: string;
  coverMediaId?: string;
  brandingSettings: Record<string, unknown>; // required — send {} if none
  rsvpDeadline?: string;
  initialSessionTitle?: string;   // max 255 — when set, seeds an EventSession anchored to
                                   // startAt/endAt (displayOrder 0) in the same transaction; see
                                   // fe-guides/event-creation-initial-session-fe-integration.md
}

/** Returned by GET /api/events (list) and POST /api/events — flat summary shape. */
interface EventResponseDto {
  id: string; title: string; subtitle: string | null; description: string | null;
  eventType: string; visibility: EventVisibility;
  startAt: string; endAt: string | null; timezone: string;
  locationName: string | null; locationAddress: string | null; mapsUrl: string | null;
  coverMediaId: string | null;
  brandingSettings: Record<string, unknown>;
  rsvpDeadline: string | null;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}

interface CoHostInviteRequestDto { userId: string; } // required

/** PATCH /api/events/{id} body — every field optional, no Bean Validation, {} is a valid no-op. */
interface EventPatchDto {
  title?: string; subtitle?: string; description?: string;
  visibility?: EventVisibility;
  startAt?: string; endAt?: string; timezone?: string;
  locationName?: string; locationAddress?: string; mapsUrl?: string;
  coverMediaId?: string; brandingSettings?: Record<string, unknown>;
  rsvpDeadline?: string;
} // no eventType — not editable via PATCH

// --- GET /api/events/{id} detail response (grouped/enriched — added 2026-07-30) ---

interface EventScheduleDto {
  startAt: string; endAt: string | null; timezone: string; rsvpDeadline: string | null;
}
interface EventLocationDto {
  name: string | null; address: string | null; mapsUrl: string | null;
}
interface EventRsvpSummaryDto {
  totalMembers: number; attending: number; declined: number; maybe: number; noResponse: number;
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
  schedule: EventScheduleDto;
  location: EventLocationDto;
  coverMedia: MediaResponseDto | null; // resolved, with a fresh presigned mediaUrl — not just an id
  brandingSettings: Record<string, unknown>;
  hosts: EventHostResponseDto[];       // small, bounded — co-hosts
  modules: EventModuleResponseDto[];   // fixed-size — one per module key
  sessions: EventSessionResponseDto[]; // bounded agenda items
  rsvpSummary: EventRsvpSummaryDto;    // aggregate counts only, not the individual RSVPs
  createdAt: string; updatedAt: string; deletedAt: string | null;
}

// --- Event Hosts ---

interface EventHostRequestDto { eventId: string; memberId: string; displayOrder: number; } // all required
interface EventHostResponseDto { id: string; eventId: string; memberId: string; displayOrder: number; createdAt: string; }
interface EventHostPatchDto { displayOrder?: number; } // the only editable field

// --- Event Invitations ---

interface EventInvitationRequestDto {
  eventId: string;
  inviteCode: string;    // required, max 100 chars
  inviteToken?: string;  // server generates a UUID if omitted
  email?: string;        // must be a well-formed email, max 255
  firstName?: string;    // max 100
  lastName?: string;     // max 100
  maxGuests: number;     // required
  expiresAt?: string;
  usedAt?: string;       // system-managed; set on accept
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

// --- Event Members ---

interface EventMemberRequestDto {
  eventId: string; userId?: string; invitationId?: string;
  role: EventRole;
  displayName: string;    // required, max 150
  nickname?: string;      // max 100
  relationshipRole?: string;       // max 50
  customRelationshipRole?: string; // max 100
  isFeatured?: boolean;   // optional on the wire — defaults to false server-side
  avatarMediaId?: string;
  joinedAt: string;       // required
}
interface EventMemberResponseDto {
  id: string; eventId: string; userId: string | null; invitationId: string | null;
  role: EventRole; displayName: string; nickname: string | null;
  relationshipRole: string | null; customRelationshipRole: string | null;
  isFeatured: boolean; avatarMediaId: string | null; joinedAt: string;
  rsvpId: string | null; // NEW 2026-08-26 — this member's own RSVP id, null if not submitted yet; see rsvp-status-fe-integration.md
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
interface EventMemberPatchDto { // every field optional — isFeatured is HOST-only even on your own membership
  displayName?: string; nickname?: string;
  relationshipRole?: string; customRelationshipRole?: string;
  isFeatured?: boolean; avatarMediaId?: string;
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

/** No request DTO — created only via the multipart upload endpoint (§ Media upload). */
interface MediaResponseDto {
  id: string; eventId: string; uploaderMemberId: string | null;
  storageKey: string;
  mediaUrl: string; // presigned, time-limited R2 GET URL — re-fetch on expiry, don't cache long-term
  originalFilename: string; mimeType: string; mediaType: string; // mediaType free text: IMAGE | VIDEO | AUDIO | DOCUMENT by convention
  fileSize: number; width: number | null; height: number | null; durationSeconds: number | null;
  metadata: Record<string, unknown>;
  createdAt: string; deletedAt: string | null;
}
// GET /api/events/{eventId}/media now returns Page<MediaResponseDto>, not MediaResponseDto[].
// Default 30/page, max 100 (?page=&size=), sorted createdAt desc then id desc (newest first).

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
 * size, and the host should see which number they are committing to. Requesting ORIGINAL without
 * the add-on returns 403/errorCode 5054 ORIGINALS_ADDON_NOT_ACTIVE.
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
  originalsAvailable: boolean;       // whether the event holds the "keep originals" add-on
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
interface PostAuthorDto {
  memberId: string; displayName: string; nickname: string | null;
  role: EventRole; avatarMediaId: string | null;
  avatarUrl: string | null; // presigned, resolved from avatarMediaId — null if no avatar set
}
interface PostResponseDto {
  id: string; eventId: string; authorMemberId: string | null;
  author: PostAuthorDto | null; // null if the post has no author, or the author left the event
  type: string; content: string | null; isPinned: boolean;
  media: MediaResponseDto[]; // ordered by displayOrder, presigned URLs already resolved
  commentCount: number; reactionCount: number;
  likedByCurrentUser: boolean; // true if the requesting user has any reaction on this post
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
// GET /api/events/{eventId}/posts now returns Page<PostResponseDto>, not PostResponseDto[].
// Default 20/page, max 100 (?page=&size=), sorted isPinned desc then createdAt desc;
// soft-deleted posts are excluded.
// likedByCurrentUser is resolved from the JWT — both GET /api/events/{eventId}/posts and
// GET /api/posts/{id} populate it in a single batched query, so it's free at feed scale.

interface CommentRequestDto {
  postId: string; authorMemberId?: string; parentCommentId?: string; content: string; // content required
}
interface CommentResponseDto {
  id: string; postId: string; authorMemberId: string | null; parentCommentId: string | null;
  content: string; createdAt: string; updatedAt: string; deletedAt: string | null;
}
// GET /api/posts/{postId}/comments now returns Page<CommentResponseDto>, not CommentResponseDto[].
// Default 30/page, max 100 (?page=&size=), sorted createdAt ASC then id ASC (oldest first — unlike
// every other paginated endpoint, which sorts newest first) so a reply's parent is guaranteed to
// appear on the same page or an earlier one, never a later one.

interface ReactionRequestDto { postId: string; memberId: string; reactionType: string; } // all required, reactionType max 20
interface ReactionResponseDto { id: string; postId: string; memberId: string; reactionType: string; createdAt: string; }
// DB unique constraint on (postId, memberId, reactionType) — duplicate returns 409 DUPLICATE_REACTION

interface StoryRequestDto {
  eventId: string; authorMemberId?: string; mediaId: string; // mediaId required, must already exist
  caption?: string; songUrl?: string;
  expiresAt?: string; // optional — defaults to createdAt + 24h server-side
}
interface StoryResponseDto {
  id: string; eventId: string; authorMemberId: string | null; mediaId: string;
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

interface ReportRequestDto {
  reporterMemberId?: string; // sent but IGNORED server-side — bound to the caller automatically
  eventId: string;    // required
  targetType: string; // required
  targetId: string;   // required
  reason: string;     // required
  description?: string;
  status?: string;             // set by moderators only, defaults to "OPEN" server-side
  reviewedByMemberId?: string;
  reviewedAt?: string;
  resolutionNotes?: string;
}
interface ReportResponseDto {
  id: string; reporterMemberId: string | null; eventId: string; targetType: string; targetId: string;
  reason: string; description: string | null; status: string | null; reviewedByMemberId: string | null;
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

// ---------------------------------------------------------------------------
// App config — GET /api/config (public, no auth) — added 2026-08-05
// ---------------------------------------------------------------------------

/** Canonical event module keys — see EventModuleRequestDto.moduleKey, now server-validated against
 *  this set. `wishlist` and `wishbook` were added 2026-08-16; prefer sourcing this union from
 *  `eventModuleKeys` at runtime rather than maintaining the literal list by hand. */
type ModuleKey = 'posts' | 'rsvp' | 'playlist' | 'stories' | 'gallery' | 'wishlist' | 'wishbook';

interface AppMediaConfigDto {
  maxFileSizeBytes: number;
  maxRequestSizeBytes: number;
  maxBatchUploadFiles: number;
  maxBatchStoryItems: number; // added 2026-08-29 — item cap on POST /api/stories/batch (default 5)
  maxMediaPerPost: number;
  maxArchiveSelectedItems: number; // added 2026-08-25 — item cap on GET .../media/archive/selected
  maxArchivePartBytes: number;     // added 2026-08-25 — combined-size cap for that request AND one gallery-archive part
  presignedUrlTtlMinutes: number;
  publicHost: string | null; // hostname media URLs are served from — feed into next/image's images.remotePatterns
}
interface AppPaginationConfigDto { defaultPageSize: number; maxPageSize: number; }
interface AppRsvpConfigDto { minAdults: number; maxAdults: number; minChildren: number; maxChildren: number; }

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
  priceAmountMinor: number | null;  // minor units (cents)
  priceCurrency: string | null;     // ISO 4217
  billingPeriod: BillingPeriod | null;
  discountPercent: number | null;
  discountLabel: string | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;

  /** Module keys this plan includes. Always empty for ACCOUNT-scope plans. */
  moduleKeys: string[];

  /** The `MODULE_UNLOCK` paid services offered on this plan for a module not already in
   *  `moduleKeys` — full price/billing detail included, not just the key. Always empty for
   *  ACCOUNT-scope plans. Only populated on `GET /api/config`. */
  paidModules: PaidServiceResponseDto[];
}

export interface PlatformModuleResponseDto {
  id: string;
  moduleKey: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  sortOrder: number;
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
  rsvp: AppRsvpConfigDto;
  /** Added 2026-08-23. */
  contentLimits: AppContentLimitsDto;
  /** Every distinct `@RateLimit` bucket currently in effect. Added 2026-08-23. */
  rateLimits: AppRateLimitConfigDto[];
  /** Budget for any endpoint not listed in `rateLimits`. Added 2026-08-23. */
  defaultRateLimit: number;
  defaultRateLimitWindowSeconds: number;
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
  metadata: Record<string, unknown>;
  expiresAt: string | null;   // null = never expires
  revokedAt: string | null;   // non-null = dead; revocation is one-way
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
