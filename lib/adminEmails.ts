import type { Locale } from '@/i18n/config';
import type { AdminEmailRequestDto, AdminEmailTemplateKey } from '@/lib/api/types';

export const ADMIN_EMAIL_TEMPLATE_ORDER: readonly AdminEmailTemplateKey[] = [
    'PROVISIONED_HOST_WELCOME',
    'PASSWORD_RESET',
    'EMAIL_VERIFICATION',
    'CUSTOM',
];

export const CUSTOM_SUBJECT_MAX_LENGTH = 150;
export const CUSTOM_BODY_MAX_LENGTH = 5000;

export type AdminEmailDraft = {
    template: AdminEmailTemplateKey | null;
    locale: Locale;
    eventId: string;
    subject: string;
    body: string;
};

// The preview shows a placeholder for these links; the real one is made on send.
export function hasTokenLink(template: AdminEmailTemplateKey): boolean {
    return template === 'PASSWORD_RESET' || template === 'EMAIL_VERIFICATION';
}

// The request body for preview and send, or null while the draft is incomplete.
export function adminEmailRequest(draft: AdminEmailDraft): AdminEmailRequestDto | null {
    if (!draft.template) return null;
    const base = { template: draft.template, locale: draft.locale };
    if (draft.template === 'PROVISIONED_HOST_WELCOME') return draft.eventId ? { ...base, eventId: draft.eventId } : null;
    if (draft.template === 'CUSTOM') {
        const subject = draft.subject.trim();
        const body = draft.body.trim();
        return subject && body ? { ...base, subject, body } : null;
    }
    return base;
}
