'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import type { AccountEmailForm } from '@/hooks/useAccountEmailForm';
import type { Locale } from '@/i18n/config';
import { CUSTOM_BODY_MAX_LENGTH, CUSTOM_SUBJECT_MAX_LENGTH } from '@/lib/adminEmails';
import { formatAdminDate } from '@/lib/adminOrders';

export function AccountEmailFields({ form }: { form: AccountEmailForm }) {
    const t = useTranslations('AdminPage.accounts.emails');
    const uiLocale = useLocale();
    const languageOptions = [
        { value: 'en' as Locale, label: t('languages.en') },
        { value: 'el' as Locale, label: t('languages.el') },
    ];

    function handleEventChange(event: ChangeEvent<HTMLSelectElement>) {
        form.setEventId(event.target.value);
    }

    function handleSubjectChange(event: ChangeEvent<HTMLInputElement>) {
        form.setSubject(event.target.value);
    }

    function handleBodyChange(event: ChangeEvent<HTMLTextAreaElement>) {
        form.setBody(event.target.value);
    }

    return (
        <div className="space-y-4">
            {/* Event */}
            {form.template === 'PROVISIONED_HOST_WELCOME' ? (
                <AdminField label={t('event')}>
                    <select value={form.eventId} onChange={handleEventChange} className={adminInputClass()}>
                        {form.events.map((event) => (
                            <option key={event.id} value={event.id}>
                                {(event.title ?? t('untitledEvent')) + (event.startAt ? ` · ${formatAdminDate(uiLocale, event.startAt)}` : '')}
                            </option>
                        ))}
                    </select>
                </AdminField>
            ) : null}

            {/* Message */}
            {form.template === 'CUSTOM' ? (
                <>
                    <AdminField label={t('subject')} required>
                        <input
                            value={form.subject}
                            onChange={handleSubjectChange}
                            maxLength={CUSTOM_SUBJECT_MAX_LENGTH}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('message')} required>
                        <textarea
                            value={form.body}
                            onChange={handleBodyChange}
                            maxLength={CUSTOM_BODY_MAX_LENGTH}
                            rows={8}
                            className={adminInputClass('resize-y')}
                        />
                    </AdminField>
                </>
            ) : null}

            {/* Language */}
            <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('language')}</span>
                <FunnelSegmented label={t('language')} options={languageOptions} value={form.locale} onChangeAction={form.setLocale} />
            </div>
        </div>
    );
}
