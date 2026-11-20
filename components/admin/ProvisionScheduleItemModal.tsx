'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { Modal } from '@/components/ui/modal';
import { useContentLimits } from '@/hooks/useContentLimits';
import type { ProvisionScheduleState } from '@/hooks/useProvisionSchedule';
import type { ProvisionScheduleDraft } from '@/lib/provisionSchedule';

type TextField = Exclude<keyof ProvisionScheduleDraft, 'isSecondary'>;

export function ProvisionScheduleItemModal({ schedule }: { schedule: ProvisionScheduleState }) {
    const t = useTranslations('AdminPage.accounts.provision');
    const tFields = useTranslations('SchedulePage.host.fields');
    const tValidation = useTranslations('CreateEventPage.validation');
    const limits = useContentLimits();
    const title = schedule.isNew ? t('addSession') : t('editSession');
    const { draft } = schedule;

    function handleTextChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        schedule.updateDraft(event.currentTarget.name as TextField, event.currentTarget.value);
    }

    function handleVenueChange(event: ChangeEvent<HTMLInputElement>) {
        schedule.updateDraft('isSecondary', event.currentTarget.checked);
    }

    // The dialog sits inside the provisioning form's React tree, so its submit must not reach that form.
    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        event.stopPropagation();
        schedule.save();
    }

    return (
        <Modal open={schedule.isOpen} onClose={schedule.close} size="sm" closeLabel={t('sessionCancel')} ariaLabel={title}>
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
                {/* Header */}
                <h3 className="text-lg font-semibold text-ink">{title}</h3>

                {/* Details */}
                <AdminField label={tFields('title')} required>
                    <input
                        name="title"
                        required
                        maxLength={limits.eventSessionTitleMaxLength}
                        value={draft.title}
                        onChange={handleTextChange}
                        className={adminInputClass()}
                    />
                </AdminField>
                <div className="grid gap-4 sm:grid-cols-2">
                    <AdminField label={tFields('startAt')} optional>
                        <input name="startAt" type="datetime-local" value={draft.startAt} onChange={handleTextChange} className={adminInputClass()} />
                    </AdminField>
                    <AdminField label={tFields('endAt')} optional>
                        <input
                            name="endAt"
                            type="datetime-local"
                            min={draft.startAt || undefined}
                            value={draft.endAt}
                            onChange={handleTextChange}
                            className={adminInputClass()}
                            aria-invalid={schedule.endBeforeStart}
                        />
                    </AdminField>
                </div>
                {schedule.endBeforeStart ? <p className="text-xs text-status-danger">{tValidation('endBeforeStart')}</p> : null}
                <AdminField label={tFields('locationName')} optional>
                    <input name="locationName" value={draft.locationName} onChange={handleTextChange} className={adminInputClass()} />
                </AdminField>
                <AdminField label={tFields('mapsUrl')} optional>
                    <input name="mapsUrl" type="url" value={draft.mapsUrl} onChange={handleTextChange} className={adminInputClass()} />
                </AdminField>
                <AdminField label={tFields('description')} optional>
                    <textarea
                        name="description"
                        rows={3}
                        maxLength={limits.eventSessionDescriptionMaxLength}
                        value={draft.description}
                        onChange={handleTextChange}
                        className={adminInputClass()}
                    />
                </AdminField>

                {/* Venue */}
                {schedule.allowsVenue ? (
                    <label className="flex items-center gap-3 text-sm font-semibold text-ink">
                        <input type="checkbox" checked={draft.isSecondary} onChange={handleVenueChange} className="h-4 w-4 accent-primary" />
                        {t('receptionVenue')}
                    </label>
                ) : null}

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-1">
                    {schedule.isNew ? (
                        <span />
                    ) : (
                        <button
                            type="button"
                            onClick={schedule.remove}
                            className="h-9 rounded-md px-3 text-sm font-semibold text-status-danger hover:bg-status-danger-wash"
                        >
                            {t('sessionRemove')}
                        </button>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={schedule.close}
                            className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink"
                        >
                            {t('sessionCancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!schedule.canSave}
                            className="inline-flex h-9 items-center rounded-md bg-ink px-4 text-sm font-bold text-white disabled:opacity-45"
                        >
                            {t('sessionSave')}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
