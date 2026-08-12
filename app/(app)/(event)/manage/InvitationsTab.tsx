'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import {
    CreateInvitationForm,
    CreateQrLinkForm,
    type InvitationPanel,
    InvitationPanelButton,
    InvitationRow,
    QrLinkRow,
} from '@/components/manage/invitations';
import type { EventInvitationResponseDto, QrLinkResponseDto, QrLinkStatsDto } from '@/lib/api/types';

export default function InvitationsTab({
    eventId,
    invitations,
    qrLinks,
    qrLinkStats,
    canWrite,
}: {
    eventId: string;
    invitations: EventInvitationResponseDto[];
    qrLinks: QrLinkResponseDto[];
    qrLinkStats: QrLinkStatsDto[];
    canWrite: boolean;
}) {
    const t = useTranslations('ManagePage');
    const [showCreate, setShowCreate] = useState(false);
    const [panel, setPanel] = useState<InvitationPanel>('invites');

    const handleShowCreate = useCallback(() => {
        if (!canWrite) return;
        setShowCreate(true);
    }, [canWrite]);

    const handleHideCreate = useCallback(() => {
        setShowCreate(false);
    }, []);

    const handlePanelSelect = useCallback((item: InvitationPanel) => {
        setPanel(item);
        setShowCreate(false);
    }, []);

    const showInvites = panel === 'invites';

    return (
        <div className="flex flex-col px-4">
            <div className="mb-4 flex gap-1 rounded-full bg-surface-muted p-1">
                {(['invites', 'qr'] as const).map((item) => (
                    <InvitationPanelButton
                        key={item}
                        item={item}
                        active={panel === item}
                        label={t(`invitations.panels.${item}`)}
                        onSelect={handlePanelSelect}
                    />
                ))}
            </div>

            <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-ink-muted">
                    {showInvites ? t('invitationsCard.summary', { count: invitations.length }) : t('qr.summary', { count: qrLinks.length })}
                </p>
                {!showCreate && canWrite && (
                    <button
                        type="button"
                        onClick={handleShowCreate}
                        className="flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {showInvites ? t('invitations.create.cta') : t('qr.create.cta')}
                    </button>
                )}
            </div>

            {!canWrite && (
                <p className="mb-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">
                    {showInvites ? t('invitations.readOnly') : t('qr.readOnly')}
                </p>
            )}

            {showCreate && canWrite && showInvites && <CreateInvitationForm eventId={eventId} onDone={handleHideCreate} />}
            {showCreate && canWrite && !showInvites && (
                <CreateQrLinkForm eventId={eventId} invitations={invitations} onDone={handleHideCreate} />
            )}

            {showInvites ? (
                <div className="flex flex-col divide-y divide-border">
                    {invitations.map((invitation) => (
                        <InvitationRow key={invitation.id} eventId={eventId} invitation={invitation} canWrite={canWrite} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col divide-y divide-border">
                    {qrLinks.map((qrLink) => {
                        const stats = qrLinkStats.find((row) => row.qrLinkId === qrLink.id);
                        return <QrLinkRow key={qrLink.id} eventId={eventId} qrLink={qrLink} stats={stats} canWrite={canWrite} />;
                    })}
                </div>
            )}

            {showInvites && invitations.length === 0 && !showCreate && (
                <p className="py-10 text-center text-sm text-ink-muted">{t('invitations.empty')}</p>
            )}
            {!showInvites && qrLinks.length === 0 && !showCreate && <p className="py-10 text-center text-sm text-ink-muted">{t('qr.empty')}</p>}
        </div>
    );
}
