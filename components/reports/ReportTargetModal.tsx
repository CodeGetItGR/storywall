'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';
import { useCallback } from 'react';

import { Modal } from '@/components/ui/modal';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import type { ReportReason, ReportTargetType } from '@/lib/api/types';

type ReportTargetModalProps = {
    eventId: string;
    onCloseAction: () => void;
    open: boolean;
    targetId: string;
    targetName: string;
    targetType: ReportTargetType;
};

export function ReportTargetModal({ eventId, onCloseAction, open, targetId, targetName, targetType }: ReportTargetModalProps) {
    const t = useTranslations('Report');
    const { data: appConfig } = useAppConfig();
    const { description, error, isSubmitting, reason, setDescription, setReason, submit } = useReportSubmission({
        eventId,
        targetId,
        targetType,
        onSuccessAction: onCloseAction,
        failedMessage: t('failed'),
    });
    const supportedReasons = appConfig?.reportTargetTypes?.includes(targetType) ? (appConfig.reportReasons ?? []) : [];
    const maxDescriptionLength = appConfig?.contentLimits.reportDescriptionMaxLength ?? 1000;

    const handleSubmit = useCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            void submit();
        },
        [submit]
    );
    const handleReasonChange = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => setReason(event.target.value as ReportReason | ''),
        [setReason]
    );
    const handleDescriptionChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value),
        [setDescription]
    );

    function reasonLabel(value: ReportReason) {
        return t(`reasons.${value}`);
    }

    return (
        <Modal open={open} onClose={onCloseAction} size="sm" closeLabel={t('cancel')} ariaLabel={t('title')}>
            <Modal.Body className="px-4 pb-5 pt-12 sm:px-5">
                {/* Report form */}
                <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                    <div>
                        <h2 className="text-base font-semibold text-ink">{t('title')}</h2>
                        <p className="mt-1 text-sm text-ink-muted">{t('body', { name: targetName })}</p>
                    </div>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                        {t('reason')}
                        <select
                            value={reason}
                            onChange={handleReasonChange}
                            required
                            disabled={supportedReasons.length === 0 || isSubmitting}
                            className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <option value="">{t('chooseReason')}</option>
                            {supportedReasons.map((value) => (
                                <option key={value} value={value}>
                                    {reasonLabel(value)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                        {t('details')}
                        <textarea
                            value={description}
                            onChange={handleDescriptionChange}
                            maxLength={maxDescriptionLength}
                            disabled={isSubmitting}
                            rows={4}
                            className="resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                            placeholder={t('detailsPlaceholder')}
                        />
                    </label>

                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    {/* Form actions */}
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCloseAction}
                            disabled={isSubmitting}
                            className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-60"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!reason || supportedReasons.length === 0 || isSubmitting}
                            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? t('submitting') : t('submit')}
                        </button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
