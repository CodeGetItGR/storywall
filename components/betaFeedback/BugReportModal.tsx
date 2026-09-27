'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { BugReportForm } from '@/components/betaFeedback/BugReportForm';
import { BugReportSent } from '@/components/betaFeedback/BugReportSent';
import { Modal } from '@/components/ui/modal';
import { useBugReportForm } from '@/hooks/useBugReportForm';
import type { AppBetaFeedbackConfigDto } from '@/lib/api/types';

type BugReportModalProps = {
    open: boolean;
    onCloseAction: () => void;
    config: AppBetaFeedbackConfigDto;
    eventId: string | null;
};

export function BugReportModal({ open, onCloseAction, config, eventId }: BugReportModalProps) {
    const t = useTranslations('BugReport');
    const form = useBugReportForm({ config, eventId });
    const { reset } = form;

    const handleClose = useCallback(() => {
        onCloseAction();
        reset();
    }, [onCloseAction, reset]);

    return (
        <Modal open={open} onClose={handleClose} size="sm" closeLabel={t('close')} ariaLabel={t('title')}>
            <Modal.Body className="px-4 pt-12 pb-5 sm:px-5">
                {form.isSent ? <BugReportSent onCloseAction={handleClose} /> : <BugReportForm form={form} onCancelAction={handleClose} />}
            </Modal.Body>
        </Modal>
    );
}
