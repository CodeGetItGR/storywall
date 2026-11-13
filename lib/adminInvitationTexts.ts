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
export type InvitationTextDraft = { eventType: string; language: InvitationTextLanguage; label: string; body: string };
export type InvitationTextDraftErrors = Partial<Record<'eventType' | 'label' | 'body', true>>;

export function draftFromText(text: AdminInvitationTextDto | null): InvitationTextDraft {
    return {
        eventType: text?.eventType ?? '',
        language: text?.language ?? 'el',
        label: text?.label ?? '',
        body: text?.body ?? '',
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

// Texts are ordered within one event type and language: a group.
export type InvitationTextGroup = { key: string; eventType: string; language: InvitationTextLanguage; texts: AdminInvitationTextDto[] };

function groupKey(eventType: string, language: string): string {
    return `${eventType}:${language}`;
}

// The list's groups, in the list's order (it comes sorted by event type, language, then sort order).
export function groupInvitationTexts(texts: AdminInvitationTextDto[]): InvitationTextGroup[] {
    const groups = new Map<string, InvitationTextGroup>();
    for (const text of texts) {
        const key = groupKey(text.eventType, text.language);
        const group = groups.get(key) ?? { key, eventType: text.eventType, language: text.language, texts: [] };
        group.texts.push(text);
        groups.set(key, group);
    }
    return [...groups.values()];
}

// One past the highest sort order in a group, so a text added to it lands last.
export function nextInvitationTextSortOrder(texts: AdminInvitationTextDto[], eventType: string, language: InvitationTextLanguage): number {
    const orders = texts.filter((text) => text.eventType === eventType && text.language === language).map((text) => text.sortOrder);
    return orders.length > 0 ? Math.max(...orders) + 1 : 0;
}

// `texts` is the whole list, to put the new text last in its group.
export function buildInvitationTextCreate(draft: InvitationTextDraft, eventType: string, texts: AdminInvitationTextDto[]): AdminInvitationTextRequestDto {
    return {
        eventType,
        language: draft.language,
        label: draft.label.trim(),
        body: cleanBody(draft.body),
        sortOrder: nextInvitationTextSortOrder(texts, eventType, draft.language),
    };
}

// Only what changed. A text moved to another event type or language goes last in its new group.
export function buildInvitationTextPatch(
    text: AdminInvitationTextDto,
    draft: InvitationTextDraft,
    eventType: string,
    texts: AdminInvitationTextDto[],
): AdminInvitationTextRequestDto {
    const patch: AdminInvitationTextRequestDto = {};
    if (eventType !== text.eventType) patch.eventType = eventType;
    if (draft.language !== text.language) patch.language = draft.language;
    if (draft.label.trim() !== text.label) patch.label = draft.label.trim();
    if (cleanBody(draft.body) !== text.body) patch.body = cleanBody(draft.body);
    if (patch.eventType !== undefined || patch.language !== undefined) patch.sortOrder = nextInvitationTextSortOrder(texts, eventType, draft.language);
    return patch;
}
