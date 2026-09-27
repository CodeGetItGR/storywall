import type { AppContentLimitsDto, AppEventDeletionConfigDto } from '@/lib/api/types';

// Fallbacks for GET /api/config values, used until the config loads and by
// the demo seed. They mirror the server's current values; the config wins.

export const DEFAULT_CONTENT_LIMITS: AppContentLimitsDto = {
    postContentMaxLength: 500,
    commentContentMaxLength: 300,
    storyCaptionMaxLength: 300,
    wishbookMessageMaxLength: 2000,
    playlistSuggestionCommentMaxLength: 300,
    rsvpNotesMaxLength: 500,
    eventDescriptionMaxLength: 2000,
    eventSessionDescriptionMaxLength: 1000,
    moderationReasonMaxLength: 500,
    reportDescriptionMaxLength: 1000,
    reportResolutionNotesMaxLength: 1000,
    catalogDescriptionMaxLength: 1000,
    eventTitleMaxLength: 255,
    eventSubtitleMaxLength: 255,
    eventSessionTitleMaxLength: 255,
    locationNameMaxLength: 255,
    locationAddressMaxLength: 500,
    urlMaxLength: 2048,
    memberDisplayNameMaxLength: 150,
    memberNicknameMaxLength: 100,
    memberRelationshipRoleMaxLength: 50,
    memberCustomRelationshipRoleMaxLength: 100,
    personNameMaxLength: 100,
    emailMaxLength: 255,
    passwordMinLength: 8,
    passwordMaxLength: 100,
    qrLabelMaxLength: 100,
    giftAccountHolderMaxLength: 140,
    giftBankNameMaxLength: 140,
    giftNoteMaxLength: 500,
    rsvpPhoneMaxLength: 50,
    wishbookGuestNameMaxLength: 120,
    playlistTitleMaxLength: 255,
    playlistArtistMaxLength: 255,
    withdrawalReasonMaxLength: 1000,
    businessLegalNameMaxLength: 200,
    businessVatNumberMaxLength: 20,
    businessAddressLineMaxLength: 200,
    businessCityMaxLength: 100,
    businessPostalCodeMaxLength: 20,
};

export const DEFAULT_ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'];

export const DEFAULT_PROFILE_PICTURE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const DEFAULT_EVENT_DELETION: AppEventDeletionConfigDto = { codeDigits: 6, codeValidMinutes: 10, maxCodeAttempts: 5 };
