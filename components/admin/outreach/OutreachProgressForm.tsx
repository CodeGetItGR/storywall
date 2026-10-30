'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { OutreachProgressFormState } from '@/hooks/useOutreachProgressForm';
import { OUTREACH_OUTCOME_MAX, OUTREACH_STATUSES, OUTREACH_TEXT_MAX } from '@/lib/adminOutreach';

export function OutreachProgressForm({ form }: { form: OutreachProgressFormState }) {
    const t = useTranslations('AdminPage.outreach.progress');
    const status = useTranslations('AdminPage.outreach.status');
    const toErrorMessage = useApiErrorMessage();

    return (
        <form onSubmit={form.handleSubmit} className="space-y-4" noValidate>
            {/* Title */}
            <h3 className="text-sm font-bold text-ink">{t('title')}</h3>

            <div className="grid gap-4 sm:grid-cols-2">
                {/* Status */}
                <AdminField label={t('status')}>
                    <select name="status" value={form.draft.status} onChange={form.handleChange} className={adminInputClass()}>
                        {OUTREACH_STATUSES.map((value) => (
                            <option key={value} value={value}>
                                {status(value)}
                            </option>
                        ))}
                    </select>
                </AdminField>

                {/* Next follow-up */}
                <AdminField label={t('nextFollowup')} hint={t('nextFollowupHint')}>
                    <input
                        type="date"
                        name="nextFollowupOn"
                        value={form.draft.nextFollowupOn}
                        onChange={form.handleChange}
                        className={adminInputClass()}
                    />
                </AdminField>

                {/* Last contact */}
                <AdminField label={t('lastContact')}>
                    <input
                        type="date"
                        name="lastContactOn"
                        value={form.draft.lastContactOn}
                        onChange={form.handleChange}
                        className={adminInputClass()}
                    />
                </AdminField>

                {/* Contact person */}
                <AdminField label={t('contactPerson')} optional>
                    <input
                        name="contactPerson"
                        value={form.draft.contactPerson}
                        onChange={form.handleChange}
                        maxLength={OUTREACH_TEXT_MAX}
                        autoComplete="off"
                        className={adminInputClass()}
                    />
                </AdminField>
            </div>

            {/* Outcome */}
            <AdminField label={t('outcome')} optional hint={t('outcomeHint')}>
                <textarea
                    name="outcome"
                    value={form.draft.outcome}
                    onChange={form.handleChange}
                    rows={2}
                    maxLength={OUTREACH_OUTCOME_MAX}
                    className={adminInputClass('resize-y')}
                />
            </AdminField>

            {/* Error */}
            {Boolean(form.error) && (
                <p role="alert" className="text-sm text-status-danger">
                    {toErrorMessage(form.error)}
                </p>
            )}

            {/* Actions */}
            {form.isDirty && (
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={form.handleReset}
                        className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink"
                    >
                        {t('discard')}
                    </button>
                    <button
                        type="submit"
                        disabled={form.isSaving}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                        {form.isSaving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                        {t('save')}
                    </button>
                </div>
            )}
        </form>
    );
}
