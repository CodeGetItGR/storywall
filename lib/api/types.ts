// Domain DTOs transcribed from event_social_media/docs/frontend-integration-guide.md.
// Route casing/paths live in lib/api/endpoints.ts, not here.

export type EventRole = "HOST" | "ATTENDEE";
export type EventVisibility = "PUBLIC" | "PRIVATE";
export type AttendanceStatus = "ATTENDING" | "DECLINED" | "MAYBE";
export type AuthProvider = "LOCAL" | "OAUTH" | "INVITE";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type PlatformRole = "USER" | "ADMIN" | "GUEST";

// eventType / moduleKey / Post.type / Reaction.reactionType are free strings server-side.
// These are FE-side conventions only, not enforced by the backend.
export type EventTypeConvention = "WEDDING" | "BAPTISM" | "BIRTHDAY" | "CONFERENCE" | (string & {});
export type ModuleKeyConvention = "posts" | "rsvp" | "playlist" | "stories" | "gallery" | (string & {});
export type PostTypeConvention = "TEXT" | "PHOTO" | "VIDEO" | "ANNOUNCEMENT" | "POLL" | (string & {});
export type MediaTypeConvention = "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | (string & {});

// --- §2 Errors ---

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errorCode: number;
  errorKey: string;
  errors?: Record<string, string>;
}

// --- §3 Auth ---

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string | null;
  userId: string;
  email: string | null;
  role: PlatformRole;
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
}

// --- §4 Users, Me, Sessions, Notifications ---

export interface NotificationRequestDto {
  recipientMemberId?: string;
  type: string;
  referenceType: string;
  referenceId: string;
  payload: Record<string, unknown>;
  readAt: string | null;
}

export interface NotificationResponseDto extends NotificationRequestDto {
  id: string;
  createdAt: string;
  deletedAt: string | null;
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
  subtitle?: string;
  description?: string;
  eventType: EventTypeConvention;
  visibility?: EventVisibility;
  startAt: string;
  endAt: string;
  timezone: string;
  locationName?: string;
  locationAddress?: string;
  mapsUrl?: string;
  coverMediaId?: string;
  brandingSettings?: Record<string, unknown>;
  rsvpDeadline?: string;
  isArchived?: boolean;
}

export interface EventResponseDto extends EventRequestDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

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
}

export interface CoHostInviteRequestDto {
  userId: string;
}

export interface EventHostRequestDto {
  eventId: string;
  memberId: string;
  displayOrder?: number;
}

export interface EventHostResponseDto extends EventHostRequestDto {
  id: string;
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
  maxGuests?: number;
  expiresAt?: string;
  usedAt?: string | null;
}

export interface EventInvitationResponseDto extends EventInvitationRequestDto {
  id: string;
  createdAt: string;
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
  isFeatured?: boolean;
  avatarMediaId?: string;
  joinedAt?: string;
}

export interface EventMemberResponseDto extends EventMemberRequestDto {
  id: string;
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
  moduleKey: ModuleKeyConvention;
  isEnabled?: boolean;
  configuration?: Record<string, unknown>;
}

export interface EventModuleResponseDto extends EventModuleRequestDto {
  id: string;
  createdAt: string;
}

export interface EventModulePatchDto {
  isEnabled?: boolean;
  configuration?: Record<string, unknown>;
}

export interface EventSessionRequestDto {
  eventId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  locationName?: string;
  mapsUrl?: string;
  displayOrder?: number;
}

export interface EventSessionResponseDto extends EventSessionRequestDto {
  id: string;
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
  adultCount?: number;
  childCount?: number;
  dietaryNotes?: string;
  notes?: string;
  submittedAt?: string;
}

export interface RsvpResponseDto extends RsvpRequestDto {
  id: string;
  updatedAt: string;
}

export interface RsvpPatchDto {
  attendanceStatus?: AttendanceStatus;
  phone?: string;
  adultCount?: number;
  childCount?: number;
  dietaryNotes?: string;
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

export interface PostRequestDto {
  eventId: string;
  authorMemberId: string;
  type: PostTypeConvention;
  content?: string;
  isPinned?: boolean;
  mediaIds?: string[];
}

export interface PostResponseDto {
  id: string;
  eventId: string;
  authorMemberId: string;
  type: PostTypeConvention;
  content: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CommentRequestDto {
  postId: string;
  authorMemberId: string;
  parentCommentId?: string;
  content: string;
}

export interface CommentResponseDto extends CommentRequestDto {
  id: string;
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
  authorMemberId: string;
  mediaId: string;
  caption?: string;
  songUrl?: string;
  expiresAt?: string;
}

export interface StoryResponseDto extends StoryRequestDto {
  id: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface PlaylistSuggestionRequestDto {
  eventId: string;
  authorMemberId: string;
  title: string;
  artist?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  comment?: string;
}

export interface PlaylistSuggestionResponseDto extends PlaylistSuggestionRequestDto {
  id: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface PlaylistVoteRequestDto {
  playlistSuggestionId: string;
  memberId: string;
}

export interface PlaylistVoteResponseDto extends PlaylistVoteRequestDto {
  id: string;
  createdAt: string;
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
  changes?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditLogResponseDto extends AuditLogRequestDto {
  id: string;
  createdAt: string;
}

export interface ModerationActionRequestDto {
  eventId: string;
  moderatorMemberId: string;
  targetType: string;
  targetId: string;
  actionType: string;
  reason?: string;
}

export interface ModerationActionResponseDto extends ModerationActionRequestDto {
  id: string;
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

export interface ReportResponseDto extends ReportRequestDto {
  id: string;
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
  payload?: Record<string, unknown>;
}

export interface TelemetryEventResponseDto extends TelemetryEventRequestDto {
  id: string;
  createdAt: string;
}

export interface PlatformFeatureFlagRequestDto {
  featureKey: string;
  description?: string;
  isEnabled?: boolean;
  configuration?: Record<string, unknown>;
}

export interface PlatformFeatureFlagResponseDto extends PlatformFeatureFlagRequestDto {
  id: string;
  createdAt: string;
  updatedAt: string;
}
