import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useCoHostManagement } from '@/hooks/useCoHostManagement';
import type { EventHostResponseDto, EventMemberResponseDto } from '@/lib/api/types';

import { CoHostManagementRow } from './CoHostManagementRow';

type CoHostManagementListProps = {
    canManage: boolean;
    eventId: string;
    hosts: EventHostResponseDto[];
    members: EventMemberResponseDto[];
};

export function CoHostManagementList({ canManage, eventId, hosts, members }: CoHostManagementListProps) {
    const t = useTranslations('ManagePage.invitations.coHosts');
    const management = useCoHostManagement(eventId);
    const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
    const sortedHosts = useMemo(() => [...hosts].sort((first, second) => first.displayOrder - second.displayOrder), [hosts]);

    return (
        <>
            {/* Current hosts */}
            <section className="mb-5">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-semibold text-ink">{t('currentTitle')}</h3>
                    <span className="text-xs text-ink-muted">{t('currentSummary', { count: sortedHosts.length })}</span>
                </div>
                <div className="flex flex-col divide-y divide-border">
                    {sortedHosts.map((host) => (
                        <CoHostManagementRow
                            key={host.id}
                            canManage={canManage}
                            host={host}
                            member={membersById.get(host.memberId)}
                            onRemoveAction={management.requestRemove}
                            onTransferAction={management.requestTransfer}
                        />
                    ))}
                </div>
            </section>

            {/* Ownership transfer confirmation */}
            <ConfirmActionModal
                open={management.transferTarget !== null}
                onCloseAction={management.closeTransfer}
                onConfirmAction={management.confirmTransfer}
                title={t('transferConfirmTitle', { name: membersById.get(management.transferTarget?.memberId ?? '')?.displayName ?? '' })}
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
                title={t('removeConfirmTitle', { name: membersById.get(management.removeTarget?.memberId ?? '')?.displayName ?? '' })}
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
