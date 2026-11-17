import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { useCoHostManagement } from '@/hooks/useCoHostManagement';
import type { HostRowData } from '@/hooks/useMembersPage';

type HostConfirmModalsProps = {
    management: ReturnType<typeof useCoHostManagement>;
    hostRows: HostRowData[];
};

// Confirmations for handing over ownership and removing a co-host.
export function HostConfirmModals({ management, hostRows }: HostConfirmModalsProps) {
    const t = useTranslations('ManagePage.invitations.coHosts');
    const namesByHostId = useMemo(() => new Map(hostRows.map(({ host, member }) => [host.id, member?.displayName ?? ''])), [hostRows]);
    const transferName = namesByHostId.get(management.transferTarget?.id ?? '') ?? '';
    const removeName = namesByHostId.get(management.removeTarget?.id ?? '') ?? '';

    return (
        <>
            {/* Ownership transfer confirmation */}
            <ConfirmActionModal
                open={management.transferTarget !== null}
                onCloseAction={management.closeTransfer}
                onConfirmAction={management.confirmTransfer}
                title={t('transferConfirmTitle', { name: transferName })}
                body={
                    <>
                        {t('transferConfirmBody')}
                        {management.error && <span className="mt-1 block text-destructive">{management.error}</span>}
                    </>
                }
                confirmLabel={t('transfer')}
                cancelLabel={t('cancel')}
                isConfirming={management.isTransferring}
                tone="default"
            />

            {/* Co-host removal confirmation */}
            <ConfirmActionModal
                open={management.removeTarget !== null}
                onCloseAction={management.closeRemove}
                onConfirmAction={management.confirmRemove}
                title={t('removeConfirmTitle', { name: removeName })}
                body={
                    <>
                        {t('removeConfirmBody')}
                        {management.error && <span className="mt-1 block text-destructive">{management.error}</span>}
                    </>
                }
                confirmLabel={t('remove')}
                cancelLabel={t('cancel')}
                isConfirming={management.isRemoving}
            />
        </>
    );
}
