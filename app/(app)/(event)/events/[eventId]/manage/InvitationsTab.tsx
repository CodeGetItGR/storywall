'use client';

import { Plus, QrCode, UserCog, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import {
    CreateCoHostInvitationForm,
    CreateInvitationForm,
    CreateQrLinkForm,
    type InvitationPanel,
    InvitationRow,
    QrLinkRow,
} from '@/components/manage/invitations';
import { type SubTabItem,SubTabs } from '@/components/ui/SubTabs';
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
    const [limitNotice, setLimitNotice] = useState<string | null>(null);
    const tabs = useMemo<SubTabItem<InvitationPanel>[]>(
        () => [
            { key: 'invites', icon: UserPlus, label: t('invitations.panels.invites') },
            { key: 'coHosts', icon: UserCog, label: t('invitations.panels.coHosts') },
            { key: 'qr', icon: QrCode, label: t('invitations.panels.qr') },
        ],
        [t]
    );

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
        setLimitNotice(null);
    }, []);

    const handleClampNotice = useCallback((message: string) => {
        setLimitNotice(message);
    }, []);

    const showInvites = panel === 'invites';
    const showCoHosts = panel === 'coHosts';
    const visibleInvitations = invitations.filter((invitation) => invitation.role === (showCoHosts ? 'HOST' : 'ATTENDEE'));

    return (
        <div className="flex flex-col">
            {/* Panels */}
            <SubTabs tabs={tabs} active={panel} onSelectAction={handlePanelSelect} className="mb-4" />

            {/* Summary */}
            <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-ink-muted">
                    {showCoHosts
                        ? t('invitations.coHosts.summary', { count: visibleInvitations.length })
                        : showInvites
                          ? t('invitationsCard.summary', { count: visibleInvitations.length })
                          : t('qr.summary', { count: qrLinks.length })}
                </p>
                {!showCreate && canWrite && (
                    <button
                        type="button"
                        onClick={handleShowCreate}
                        className="flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {showCoHosts ? t('invitations.coHosts.cta') : showInvites ? t('invitations.create.cta') : t('qr.create.cta')}
                    </button>
                )}
            </div>

            {!canWrite && (
                <p className="mb-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">
                    {showInvites || showCoHosts ? t('invitations.readOnly') : t('qr.readOnly')}
                </p>
            )}

            {limitNotice && (
                <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">{limitNotice}</p>
            )}

            {/* Guidance */}
            {canWrite && !showCreate && (
                <div className="mb-4 rounded-2xl bg-surface-muted px-4 py-3">
                    <p className="text-sm font-semibold text-ink">
                        {showCoHosts
                            ? t('invitations.coHosts.guideTitle')
                            : showInvites
                              ? t('invitations.guide.personalTitle')
                              : t('invitations.guide.shareTitle')}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                        {showCoHosts
                            ? t('invitations.coHosts.guideBody')
                            : showInvites
                              ? t('invitations.guide.personalBody')
                              : t('invitations.guide.shareBody')}
                    </p>
                </div>
            )}

            {/* Create */}
            {showCreate && canWrite && showInvites && (
                <CreateInvitationForm eventId={eventId} onDoneAction={handleHideCreate} onClampNoticeAction={handleClampNotice} />
            )}
            {showCreate && canWrite && showCoHosts && <CreateCoHostInvitationForm eventId={eventId} onDoneAction={handleHideCreate} />}
            {showCreate && canWrite && !showInvites && !showCoHosts && (
                <CreateQrLinkForm eventId={eventId} onDoneAction={handleHideCreate} onClampNoticeAction={handleClampNotice} />
            )}

            {/* List */}
            {showInvites || showCoHosts ? (
                <div className="flex flex-col divide-y divide-border">
                    {visibleInvitations.map((invitation) => (
                        <InvitationRow
                            key={invitation.id}
                            eventId={eventId}
                            invitation={invitation}
                            canWrite={canWrite}
                            onClampNoticeAction={handleClampNotice}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col divide-y divide-border">
                    {qrLinks.map((qrLink) => {
                        const stats = qrLinkStats.find((row) => row.qrLinkId === qrLink.id);
                        return (
                            <QrLinkRow
                                key={qrLink.id}
                                eventId={eventId}
                                qrLink={qrLink}
                                stats={stats}
                                canWrite={canWrite}
                                onClampNoticeAction={handleClampNotice}
                            />
                        );
                    })}
                </div>
            )}

            {(showInvites || showCoHosts) && visibleInvitations.length === 0 && !showCreate && (
                <p className="py-10 text-center text-sm text-ink-muted">{t(showCoHosts ? 'invitations.coHosts.empty' : 'invitations.empty')}</p>
            )}
            {!showInvites && !showCoHosts && qrLinks.length === 0 && !showCreate && (
                <p className="py-10 text-center text-sm text-ink-muted">{t('qr.empty')}</p>
            )}
        </div>
    );
}
