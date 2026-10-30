'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import { useUpdateOutreachProspect } from '@/hooks/useAdminOutreach';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { type EmailDraft, isEmailDraftChanged, type OutreachEmailLanguage, toEmailDraft } from '@/lib/adminOutreach';
import type { OutreachProspectDto, OutreachProspectUpdateRequestDto } from '@/lib/api/types';

export type EmailCopyTarget = 'subject' | 'body' | 'address';

// The drafted email in both languages, editable, with copy buttons. Greek is shown first.
export function useOutreachColdEmail(prospect: OutreachProspectDto) {
    const update = useUpdateOutreachProspect();
    const [language, setLanguage] = useState<OutreachEmailLanguage>('el');
    const [drafts, setDrafts] = useState<Record<OutreachEmailLanguage, EmailDraft>>(() => ({
        el: toEmailDraft(prospect.emailEl),
        en: toEmailDraft(prospect.emailEn),
    }));
    const { copiedKey, copy: copyText } = useCopyFeedback();

    const draft = drafts[language];
    const elChanged = isEmailDraftChanged(prospect.emailEl, drafts.el);
    const enChanged = isEmailDraftChanged(prospect.emailEn, drafts.en);
    const isDirty = elChanged || enChanged;

    const handleLanguageChange = useCallback((value: OutreachEmailLanguage) => setLanguage(value), []);

    const handleFieldChange = useCallback(
        (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const field = event.currentTarget.name as keyof EmailDraft;
            const value = event.currentTarget.value;
            setDrafts((current) => ({ ...current, [language]: { ...current[language], [field]: value } }));
        },
        [language],
    );

    const handleSave = useCallback(() => {
        const patch: OutreachProspectUpdateRequestDto = {};
        if (elChanged) patch.emailEl = drafts.el;
        if (enChanged) patch.emailEn = drafts.en;
        if (Object.keys(patch).length > 0) update.mutate({ id: prospect.id, patch });
    }, [drafts, elChanged, enChanged, prospect.id, update]);

    const handleDiscard = useCallback(
        () => setDrafts({ el: toEmailDraft(prospect.emailEl), en: toEmailDraft(prospect.emailEn) }),
        [prospect.emailEl, prospect.emailEn],
    );

    const copy = useCallback(
        async (target: EmailCopyTarget) => {
            const text = target === 'subject' ? draft.subject : target === 'body' ? draft.body : (prospect.email ?? '');
            await copyText(target, text);
        },
        [copyText, draft.body, draft.subject, prospect.email],
    );

    const handleCopySubject = useCallback(() => void copy('subject'), [copy]);
    const handleCopyBody = useCallback(() => void copy('body'), [copy]);
    const handleCopyAddress = useCallback(() => void copy('address'), [copy]);

    return {
        language,
        draft,
        isDirty,
        hasAddress: Boolean(prospect.email),
        copied: copiedKey as EmailCopyTarget | null,
        isSaving: update.isPending,
        error: update.error,
        handleLanguageChange,
        handleFieldChange,
        handleSave,
        handleDiscard,
        handleCopySubject,
        handleCopyBody,
        handleCopyAddress,
    };
}

export type OutreachColdEmailState = ReturnType<typeof useOutreachColdEmail>;
