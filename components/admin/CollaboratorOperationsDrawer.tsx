'use client';

import { Copy, KeyRound, Loader2, Pencil, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { AdminCodeStatusPill } from '@/components/admin/AdminCodeStatusPill';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { CollaborationCodeDrawer } from '@/components/admin/CollaborationCodeDrawer';
import { CollaborationEarningsPanel } from '@/components/admin/CollaborationEarningsPanel';
import { LinkPartnerDiscountCodeDrawer } from '@/components/admin/LinkPartnerDiscountCodeDrawer';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCollaboratorCodes, useIssueCollaboratorPortalToken } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaborationCodeResponseDto, CollaboratorResponseDto } from '@/lib/api/types';

export function CollaboratorOperationsDrawer({
    open,
    collaborator,
    onCloseAction,
    onEditAction,
}: {
    open: boolean;
    collaborator: CollaboratorResponseDto | null;
    onCloseAction: () => void;
    onEditAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');
    const codesQuery = useCollaboratorCodes(collaborator?.id ?? null);
    const activeCodes = (codesQuery.data ?? []).filter((code) => code.status === 'ACTIVE');
    const issueToken = useIssueCollaboratorPortalToken();
    const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
    const [linkCodeDrawerOpen, setLinkCodeDrawerOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<CollaborationCodeResponseDto | null>(null);
    const [tokenConfirmOpen, setTokenConfirmOpen] = useState(false);
    const [issuedPortalUrl, setIssuedPortalUrl] = useState<string | null>(null);

    const openCreateCode = useCallback(() => {
        setEditingCode(null);
        setCodeDrawerOpen(true);
    }, []);
    const closeCodeDrawer = useCallback(() => setCodeDrawerOpen(false), []);
    const openLinkCode = useCallback(() => setLinkCodeDrawerOpen(true), []);
    const closeLinkCodeDrawer = useCallback(() => setLinkCodeDrawerOpen(false), []);
    const openTokenConfirm = useCallback(() => setTokenConfirmOpen(true), []);
    const closeTokenConfirm = useCallback(() => setTokenConfirmOpen(false), []);

    const handleEditCode = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            const codeId = event.currentTarget.dataset.codeId;
            const code = (codesQuery.data ?? []).find((item) => item.id === codeId);
            if (!code) return;
            setEditingCode(code);
            setCodeDrawerOpen(true);
        },
        [codesQuery.data]
    );

    const confirmIssueToken = useCallback(async () => {
        if (!collaborator) return;
        const result = await issueToken.mutateAsync(collaborator.id);
        setIssuedPortalUrl(result.portalUrl);
        setTokenConfirmOpen(false);
    }, [collaborator, issueToken]);

    const copyPortalUrl = useCallback(async () => {
        if (!issuedPortalUrl) return;
        await navigator.clipboard.writeText(issuedPortalUrl);
    }, [issuedPortalUrl]);

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onCloseAction}
                closeLabel={tAdmin('cancel')}
                title={collaborator?.name ?? t('manage')}
                subtitle={collaborator?.contactEmail}
                footer={
                    collaborator ? (
                        <button
                            type="button"
                            onClick={onEditAction}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted"
                        >
                            <Pencil className="h-4 w-4" />
                            {t('edit')}
                        </button>
                    ) : null
                }
            >
                {collaborator && (
                    <div className="space-y-5">
                        {/* Portal */}
                        <AdminSection title={t('portal.title')} description={t('portal.description')} className="py-0">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm text-ink-muted">
                                    {collaborator.portalTokenIssuedAt
                                        ? t('portal.issuedAt', { date: new Date(collaborator.portalTokenIssuedAt).toLocaleString() })
                                        : t('portal.notIssued')}
                                </p>
                                <button
                                    type="button"
                                    onClick={openTokenConfirm}
                                    disabled={issueToken.isPending}
                                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {issueToken.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                                    {t('portal.issue')}
                                </button>
                            </div>
                            {issuedPortalUrl && (
                                <div className="mt-3 rounded-lg bg-status-warn-wash p-3 text-sm text-status-warn">
                                    <p className="font-semibold">{t('portal.once')}</p>
                                    <div className="mt-2 flex gap-2">
                                        <input readOnly value={issuedPortalUrl} className={adminInputClass('font-mono text-xs')} />
                                        <button
                                            type="button"
                                            onClick={copyPortalUrl}
                                            aria-label={t('portal.copy')}
                                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-card text-ink"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                            {issueToken.error && (
                                <p className="mt-2 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(issueToken.error)}`)}</p>
                            )}
                        </AdminSection>

                        {/* Partner codes */}
                        <AdminSection title={t('codes.title')} description={t('codes.subtitle')}>
                            <div className="mb-3 flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={openCreateCode}
                                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink"
                                >
                                    <Plus className="h-4 w-4" />
                                    {t('codes.create')}
                                </button>
                                <button
                                    type="button"
                                    onClick={openLinkCode}
                                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white"
                                >
                                    <KeyRound className="h-4 w-4" />
                                    {t('linkCode.open')}
                                </button>
                            </div>
                            {codesQuery.isLoading && <LoadingState label={t('codes.loading')} className="justify-start py-3" />}
                            {codesQuery.error && (
                                <p className="py-3 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(codesQuery.error)}`)}</p>
                            )}
                            {!codesQuery.isLoading && !codesQuery.error && activeCodes.length === 0 && <p className="py-3 text-sm text-ink-muted">{t('codes.empty')}</p>}
                            {activeCodes.length > 0 && (
                                <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-border">
                                    <table className="w-full min-w-[680px] text-left text-sm">
                                        <thead className="bg-surface-muted/70 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                            <tr>
                                                <th className="px-3 py-2">{t('codes.columns.code')}</th>
                                                <th className="px-3 py-2">{t('codes.columns.rates')}</th>
                                                <th className="px-3 py-2">{t('codes.columns.redemptions')}</th>
                                                <th className="px-3 py-2">{t('codes.columns.status')}</th>
                                                <th className="px-3 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {activeCodes.map((code) => (
                                                <tr key={code.id}>
                                                    <td className="px-3 py-2">
                                                        <p className="font-mono text-xs font-bold text-ink">{code.code}</p>
                                                        <p className="mt-1 truncate text-xs text-ink-muted">{code.label}</p>
                                                    </td>
                                                    <td className="px-3 py-2 text-ink-muted">
                                                        {t('codes.ratePair', { discount: code.discountPercent, commission: code.commissionPercent })}
                                                    </td>
                                                    <td className="px-3 py-2 font-mono text-ink">
                                                        {code.liveRedemptions}
                                                        {code.maxRedemptions !== null ? ` / ${code.maxRedemptions}` : ''}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <AdminCodeStatusPill status={code.status} />
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <button
                                                            type="button"
                                                            data-code-id={code.id}
                                                            onClick={handleEditCode}
                                                            aria-label={t('codes.edit')}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-canvas hover:text-ink"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </AdminSection>

                        {/* Earnings */}
                        <CollaborationEarningsPanel collaborator={collaborator} />
                    </div>
                )}
            </AdminDrawer>
            <CollaborationCodeDrawer
                key={editingCode?.id ?? 'new-code'}
                open={codeDrawerOpen}
                collaborator={collaborator}
                code={editingCode}
                onCloseAction={closeCodeDrawer}
            />
            <LinkPartnerDiscountCodeDrawer open={linkCodeDrawerOpen} collaborator={collaborator} onCloseAction={closeLinkCodeDrawer} />
            <ConfirmActionModal
                open={tokenConfirmOpen}
                onCloseAction={closeTokenConfirm}
                title={t('portal.confirmTitle')}
                body={t('portal.confirmBody')}
                cancelLabel={tAdmin('cancel')}
                confirmLabel={t('portal.issue')}
                isConfirming={issueToken.isPending}
                onConfirmAction={confirmIssueToken}
                tone="default"
            />
        </>
    );
}
