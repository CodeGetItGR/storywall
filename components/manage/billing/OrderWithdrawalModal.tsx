import { useTranslations } from 'next-intl';

import { OrderWithdrawalDetails } from '@/components/manage/billing/OrderWithdrawalDetails';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { OrderWithdrawalFlow } from '@/hooks/useOrderWithdrawalFlow';

// The confirm step: the preview's answer, then "Confirm withdrawal" files it.
export function OrderWithdrawalModal({ flow }: { flow: OrderWithdrawalFlow }) {
    const t = useTranslations('EventPlanSettingsPage.orderWithdrawal');

    return (
        <ConfirmActionModal
            open={flow.isOpen}
            size="md"
            title={t('action')}
            body={<OrderWithdrawalDetails flow={flow} />}
            confirmLabel={flow.retryIn > 0 ? t('retryIn', { seconds: flow.retryIn }) : t('confirm')}
            cancelLabel={t('cancel')}
            onCloseAction={flow.close}
            onConfirmAction={flow.confirm}
            isConfirming={flow.isSubmitting}
            confirmDisabled={!flow.preview?.eligible || flow.retryIn > 0}
        />
    );
}
