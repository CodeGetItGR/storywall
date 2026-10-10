'use client';

import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { usePromoteCoHost } from '@/hooks/usePromoteCoHost';

type PromoteCoHostModalProps = {
    flow: ReturnType<typeof usePromoteCoHost>;
};

export function PromoteCoHostModal({ flow }: PromoteCoHostModalProps) {
    const t = useTranslations('ManagePage.members');

    return (
        <ConfirmActionModal
            open={flow.target !== null}
            onCloseAction={flow.close}
            onConfirmAction={flow.confirm}
            tone="default"
            title={t('promoteConfirmTitle', { name: flow.target?.displayName ?? '' })}
            body={
                <>
                    {t('promoteConfirmBody')}
                    {flow.error && <span className="mt-1 block text-destructive">{flow.error}</span>}
                </>
            }
            confirmLabel={t('promote')}
            cancelLabel={t('cancel')}
            isConfirming={flow.isPromoting}
        />
    );
}
