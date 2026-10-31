'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import { OutreachCopyButton } from '@/components/admin/outreach/OutreachCopyButton';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { OutreachColdEmailState } from '@/hooks/useOutreachColdEmail';
import { OUTREACH_EMAIL_BODY_MAX, OUTREACH_EMAIL_SUBJECT_MAX, OUTREACH_SENDER_PLACEHOLDER, type OutreachEmailLanguage } from '@/lib/adminOutreach';

export function OutreachColdEmail({ email }: { email: OutreachColdEmailState }) {
    const t = useTranslations('AdminPage.outreach.email');
    const toErrorMessage = useApiErrorMessage();
    const languages: { value: OutreachEmailLanguage; label: string }[] = [
        { value: 'el', label: t('greek') },
        { value: 'en', label: t('english') },
    ];

    return (
        <section className="space-y-3">
            {/* Title and language */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">{t('title')}</h3>
                <FunnelSegmented label={t('language')} options={languages} value={email.language} onChangeAction={email.handleLanguageChange} />
            </div>

            {/* Subject */}
            <AdminField label={t('subject')}>
                <input
                    name="subject"
                    value={email.draft.subject}
                    onChange={email.handleFieldChange}
                    maxLength={OUTREACH_EMAIL_SUBJECT_MAX}
                    className={adminInputClass()}
                />
            </AdminField>

            {/* Body */}
            <AdminField label={t('body')} hint={t('placeholderHint', { placeholder: OUTREACH_SENDER_PLACEHOLDER })}>
                <textarea
                    name="body"
                    value={email.draft.body}
                    onChange={email.handleFieldChange}
                    rows={10}
                    maxLength={OUTREACH_EMAIL_BODY_MAX}
                    className={adminInputClass('resize-y leading-6')}
                />
            </AdminField>

            {/* Copy */}
            <div className="flex flex-wrap gap-2">
                <OutreachCopyButton
                    label={t('copySubject')}
                    copied={email.copied === 'subject'}
                    onCopyAction={email.handleCopySubject}
                    disabled={!email.draft.subject}
                />
                <OutreachCopyButton
                    label={t('copyBody')}
                    copied={email.copied === 'body'}
                    onCopyAction={email.handleCopyBody}
                    disabled={!email.draft.body}
                    tone="strong"
                />
                <OutreachCopyButton
                    label={t('copyAddress')}
                    copied={email.copied === 'address'}
                    onCopyAction={email.handleCopyAddress}
                    disabled={!email.hasAddress}
                />
            </div>

            {/* Error */}
            {Boolean(email.error) && (
                <p role="alert" className="text-sm text-status-danger">
                    {toErrorMessage(email.error)}
                </p>
            )}

            {/* Save */}
            {email.isDirty && (
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={email.handleDiscard}
                        className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink"
                    >
                        {t('discard')}
                    </button>
                    <button
                        type="button"
                        onClick={email.handleSave}
                        disabled={email.isSaving}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                        {email.isSaving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                        {t('save')}
                    </button>
                </div>
            )}
        </section>
    );
}
