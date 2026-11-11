// Save my date ready-made texts (/api/admin/invitation-texts): wording the invitation editor offers
// for one event type, in one language.

export const INVITATION_TEXT_LANGUAGES = ['el', 'en'] as const;
export type InvitationTextLanguage = (typeof INVITATION_TEXT_LANGUAGES)[number];

// The backend's limits (InvitationTextRequestDto, InvitationTextAdminService).
export const INVITATION_TEXT_LABEL_MAX = 100;
export const INVITATION_TEXT_BODY_MAX = 2000;

// InvitationTextAdminDto. The list comes sorted by event type, language, sort order and label.
export type AdminInvitationTextDto = {
    id: string;
    eventType: string;
    language: InvitationTextLanguage;
    label: string;
    body: string;
    sortOrder: number;
};

// InvitationTextRequestDto. On create every field but sortOrder is required; on a change, a field
// left out stays as it is.
export type AdminInvitationTextRequestDto = {
    eventType?: string;
    language?: InvitationTextLanguage;
    label?: string;
    body?: string;
    sortOrder?: number;
};

// eventType '' means the first event type on offer (the select shows it until the admin picks one).
export type InvitationTextDraft = { eventType: string; language: InvitationTextLanguage; label: string; body: string; sortOrder: string };
export type InvitationTextDraftErrors = Partial<Record<'eventType' | 'label' | 'body', true>>;

export function draftFromText(text: AdminInvitationTextDto | null): InvitationTextDraft {
    return {
        eventType: text?.eventType ?? '',
        language: text?.language ?? 'el',
        label: text?.label ?? '',
        body: text?.body ?? '',
        sortOrder: String(text?.sortOrder ?? 0),
    };
}

// The body keeps its line breaks; only blank space at either end is dropped.
function cleanBody(body: string): string {
    return body.trim();
}

export function validateInvitationTextDraft(draft: InvitationTextDraft, eventType: string): InvitationTextDraftErrors {
    const errors: InvitationTextDraftErrors = {};
    if (!eventType) errors.eventType = true;
    const label = draft.label.trim();
    if (label.length === 0 || label.length > INVITATION_TEXT_LABEL_MAX) errors.label = true;
    const body = cleanBody(draft.body);
    if (body.length === 0 || body.length > INVITATION_TEXT_BODY_MAX) errors.body = true;
    return errors;
}

function sortOrderOf(draft: InvitationTextDraft): number {
    const value = Number.parseInt(draft.sortOrder, 10);
    return Number.isFinite(value) ? value : 0;
}

export function buildInvitationTextCreate(draft: InvitationTextDraft, eventType: string): AdminInvitationTextRequestDto {
    return { eventType, language: draft.language, label: draft.label.trim(), body: cleanBody(draft.body), sortOrder: sortOrderOf(draft) };
}

export function buildInvitationTextPatch(text: AdminInvitationTextDto, draft: InvitationTextDraft, eventType: string): AdminInvitationTextRequestDto {
    const patch: AdminInvitationTextRequestDto = {};
    if (eventType !== text.eventType) patch.eventType = eventType;
    if (draft.language !== text.language) patch.language = draft.language;
    if (draft.label.trim() !== text.label) patch.label = draft.label.trim();
    if (cleanBody(draft.body) !== text.body) patch.body = cleanBody(draft.body);
    if (sortOrderOf(draft) !== text.sortOrder) patch.sortOrder = sortOrderOf(draft);
    return patch;
}
