'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import { OutreachAddTextField } from '@/components/admin/outreach/OutreachAddTextField';
import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useOutreachAddForm } from '@/hooks/useOutreachAddForm';
import { OUTREACH_CITY_SUGGESTIONS, OUTREACH_KINDS, OUTREACH_NAME_MAX, OUTREACH_PRIORITIES } from '@/lib/adminOutreach';

const CITY_LIST_ID = 'outreach-city-suggestions';

// The owner keys this on each opening, so the form always starts empty.
export function OutreachAddModal({
    open,
    onCloseAction,
    onCreatedAction,
    onOpenExistingAction,
}: {
    open: boolean;
    onCloseAction: () => void;
    onCreatedAction: (id: string) => void;
    onOpenExistingAction: (id: string) => void;
}) {
    const t = useTranslations('AdminPage.outreach');
    const form = useOutreachAddForm(onCreatedAction, onOpenExistingAction);
    const roles = useTranslations('AdminPage.collaborations.feedCard.roles');
    const toErrorMessage = useApiErrorMessage();
    const priorities = OUTREACH_PRIORITIES.map((value) => ({ value, label: t(`priority.${value}`) }));
    const errorText = (field: keyof typeof form.errors) => {
        const error = form.errors[field];
        return error ? t(`add.errors.${error}`) : undefined;
    };

    return (
        <Modal open={open} onClose={onCloseAction} size="md" closeLabel={t('add.close')} ariaLabel={t('add.title')}>
            <form onSubmit={form.handleSubmit} className="space-y-5 p-5" noValidate>
                {/* Header */}
                <h3 className="text-lg font-semibold text-ink">{t('add.title')}</h3>

                {/* Business */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <OutreachAddTextField
                        form={form}
                        field="name"
                        label={t('add.name')}
                        required
                        maxLength={OUTREACH_NAME_MAX}
                        hint={errorText('name')}
                        className="sm:col-span-2"
                    />
                    <AdminField label={t('add.kind')} required hint={errorText('kind')}>
                        <select name="kind" value={form.draft.kind} onChange={form.handleChange} className={adminInputClass()}>
                            <option value="">{t('add.kindPlaceholder')}</option>
                            {OUTREACH_KINDS.map((kind) => (
                                <option key={kind} value={kind}>
                                    {roles(kind)}
                                </option>
                            ))}
                        </select>
                    </AdminField>
                    <OutreachAddTextField form={form} field="subcategory" label={t('add.subcategory')} hint={t('add.subcategoryHint')} />
                    <OutreachAddTextField form={form} field="city" label={t('add.city')} required hint={errorText('city')} list={CITY_LIST_ID} />
                    <OutreachAddTextField form={form} field="area" label={t('add.area')} />
                    <datalist id={CITY_LIST_ID}>
                        {OUTREACH_CITY_SUGGESTIONS.map((city) => (
                            <option key={city} value={city} />
                        ))}
                    </datalist>
                </div>

                {/* Priority */}
                <AdminField label={t('add.priority')}>
                    <FunnelSegmented
                        label={t('add.priority')}
                        options={priorities}
                        value={form.draft.priority}
                        onChangeAction={form.handlePriorityChange}
                    />
                </AdminField>

                {/* How to reach them */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <OutreachAddTextField form={form} field="email" label={t('reach.email')} type="email" hint={errorText('email')} />
                    <OutreachAddTextField form={form} field="phone" label={t('reach.phone')} type="tel" />
                    <OutreachAddTextField form={form} field="website" label={t('reach.website')} hint={errorText('website')} />
                    <OutreachAddTextField form={form} field="instagram" label={t('reach.instagram')} />
                    <OutreachAddTextField form={form} field="contactForm" label={t('reach.contactForm')} hint={errorText('contactForm')} />
                    <OutreachAddTextField form={form} field="contactPerson" label={t('progress.contactPerson')} />
                </div>

                {/* Why this business */}
                <div className="grid gap-4">
                    <OutreachAddTextField form={form} field="credibility" label={t('why.credibility')} multiline />
                    <OutreachAddTextField form={form} field="fit" label={t('why.fit')} multiline />
                </div>

                {/* Duplicate */}
                {form.duplicateId !== undefined && (
                    <div
                        role="alert"
                        className="flex flex-wrap items-center gap-3 rounded-lg bg-status-warn-wash px-3 py-2.5 text-sm text-status-warn"
                    >
                        <span className="mr-auto">{t('add.duplicate')}</span>
                        {form.duplicateId && (
                            <button type="button" onClick={form.handleOpenExistingClick} className="font-bold underline underline-offset-2">
                                {t('add.openExisting')}
                            </button>
                        )}
                    </div>
                )}
                {Boolean(form.error) && (
                    <p role="alert" className="text-sm text-status-danger">
                        {toErrorMessage(form.error)}
                    </p>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onCloseAction} className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink">
                        {t('add.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={form.isSaving}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                        {form.isSaving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                        {t('add.submit')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
