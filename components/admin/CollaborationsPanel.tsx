'use client';

import { Copy, KeyRound, Loader2, Pencil, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { AdminStatTile } from '@/components/admin/AdminStatTile';
import { CollaborationCodeDrawer } from '@/components/admin/CollaborationCodeDrawer';
import { CollaborationEarningsPanel } from '@/components/admin/CollaborationEarningsPanel';
import { CollaborationVoidRedemptionForm } from '@/components/admin/CollaborationVoidRedemptionForm';
import { CollaboratorDrawer } from '@/components/admin/CollaboratorDrawer';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminCollaborators, useCollaboratorCodes, useIssueCollaboratorPortalToken } from '@/hooks/useAdmin';
import { collaboratorStats } from '@/lib/adminCollaborations';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaborationCodeResponseDto, CollaboratorResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const COLLABORATOR_STATUS_PILL: Record<CollaboratorResponseDto['status'], string> = {
    ACTIVE: 'bg-status-good-wash text-status-good',
    SUSPENDED: 'bg-status-neutral-wash text-status-neutral',
};

const CODE_STATUS_PILL: Record<CollaborationCodeResponseDto['status'], string> = {
    ACTIVE: 'bg-status-good-wash text-status-good',
    DISABLED: 'bg-status-neutral-wash text-status-neutral',
};
const EMPTY_COLLABORATORS: CollaboratorResponseDto[] = [];

export function CollaborationsPanel() {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');
    const collaboratorsQuery = useAdminCollaborators();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [collaboratorDrawerOpen, setCollaboratorDrawerOpen] = useState(false);
    const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
    const [editingCollaborator, setEditingCollaborator] = useState<CollaboratorResponseDto | null>(null);
    const [editingCode, setEditingCode] = useState<CollaborationCodeResponseDto | null>(null);
    const [tokenConfirmOpen, setTokenConfirmOpen] = useState(false);
    const [issuedPortalUrl, setIssuedPortalUrl] = useState<string | null>(null);
    const issueToken = useIssueCollaboratorPortalToken();

    const collaborators = collaboratorsQuery.data ?? EMPTY_COLLABORATORS;
    const selectedCollaborator = collaborators.find((collaborator) => collaborator.id === selectedId) ?? collaborators[0] ?? null;
    const codesQuery = useCollaboratorCodes(selectedCollaborator?.id ?? null);
    const stats = useMemo(() => collaboratorStats(collaborators), [collaborators]);

    const visibleCollaborators = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return collaborators;
        return collaborators.filter(
            (collaborator) =>
                collaborator.name.toLowerCase().includes(needle) ||
                collaborator.contactEmail.toLowerCase().includes(needle) ||
                collaborator.id.toLowerCase().includes(needle)
        );
    }, [collaborators, search]);

    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value), []);
    const closeCollaboratorDrawer = useCallback(() => setCollaboratorDrawerOpen(false), []);
    const closeCodeDrawer = useCallback(() => setCodeDrawerOpen(false), []);
    const closeTokenConfirm = useCallback(() => setTokenConfirmOpen(false), []);

    const handleSelectCollaborator = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setSelectedId(event.currentTarget.dataset.collaboratorId ?? null);
        setIssuedPortalUrl(null);
    }, []);

    const openCreateCollaborator = useCallback(() => {
        setEditingCollaborator(null);
        setCollaboratorDrawerOpen(true);
    }, []);

    const openEditCollaborator = useCallback(() => {
        setEditingCollaborator(selectedCollaborator);
        setCollaboratorDrawerOpen(true);
    }, [selectedCollaborator]);

    const openCreateCode = useCallback(() => {
        setEditingCode(null);
        setCodeDrawerOpen(true);
    }, []);

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

    const openTokenConfirm = useCallback(() => {
        if (selectedCollaborator) setTokenConfirmOpen(true);
    }, [selectedCollaborator]);

    const confirmIssueToken = useCallback(async () => {
        if (!selectedCollaborator) return;
        const result = await issueToken.mutateAsync(selectedCollaborator.id);
        setIssuedPortalUrl(result.portalUrl);
        setTokenConfirmOpen(false);
    }, [issueToken, selectedCollaborator]);

    const copyPortalUrl = useCallback(async () => {
        if (!issuedPortalUrl) return;
        await navigator.clipboard.writeText(issuedPortalUrl);
    }, [issuedPortalUrl]);

    return (
        <section className="mx-auto max-w-7xl space-y-5 px-4 pb-16 pt-5 text-[15px] sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
            {/* Header */}
            <header>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-dark">{tAdmin('eyebrow')}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <AdminStatTile label={t('stats.total')} value={stats.total} />
                <AdminStatTile label={t('stats.active')} value={stats.active} accent="text-status-good" />
                <AdminStatTile label={t('stats.suspended')} value={stats.suspended} accent="text-status-neutral" />
                <AdminStatTile label={t('stats.portalLinks')} value={stats.portalLinks} accent="text-primary-dark" />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
                <section className="rounded-xl border border-border bg-card">
                    {/* Collaborators */}
                    <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                            <input value={search} onChange={handleSearchChange} placeholder={t('search')} className={adminInputClass('pl-8')} />
                        </div>
                        <button
                            type="button"
                            onClick={openCreateCollaborator}
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-3.5 text-sm font-semibold text-white"
                        >
                            <Plus className="h-4 w-4" />
                            {t('create')}
                        </button>
                    </div>
                    {collaboratorsQuery.isLoading && <LoadingState label={t('loading')} className="justify-start px-4 py-6" />}
                    {collaboratorsQuery.error && <p className="px-4 py-6 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(collaboratorsQuery.error)}`)}</p>}
                    {!collaboratorsQuery.isLoading && !collaboratorsQuery.error && visibleCollaborators.length === 0 && (
                        <p className="px-4 py-6 text-sm text-ink-muted">{t('empty')}</p>
                    )}
                    <div className="divide-y divide-border">
                        {visibleCollaborators.map((collaborator) => {
                            const active = selectedCollaborator?.id === collaborator.id;
                            return (
                                <button
                                    key={collaborator.id}
                                    type="button"
                                    data-collaborator-id={collaborator.id}
                                    onClick={handleSelectCollaborator}
                                    className={cn('flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-canvas/70', active && 'bg-primary-light/70')}
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-ink">{collaborator.name}</span>
                                        <span className="block truncate text-xs text-ink-faint">{collaborator.contactEmail}</span>
                                    </span>
                                    <span className={cn('shrink-0 rounded-full px-2 py-1 text-[11px] font-bold', COLLABORATOR_STATUS_PILL[collaborator.status])}>
                                        {t(`status.${collaborator.status}`)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-xl border border-border bg-card p-4">
                    {/* Partner details */}
                    {!selectedCollaborator ? (
                        <p className="text-sm text-ink-muted">{t('selectPrompt')}</p>
                    ) : (
                        <div className="space-y-5">
                            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                                <div className="min-w-0">
                                    <h2 className="truncate text-xl font-bold text-ink">{selectedCollaborator.name}</h2>
                                    <p className="mt-1 text-sm text-ink-muted">{selectedCollaborator.contactEmail}</p>
                                    {selectedCollaborator.portalTokenIssuedAt && (
                                        <p className="mt-1 text-xs text-ink-faint">
                                            {t('portal.issuedAt', { date: new Date(selectedCollaborator.portalTokenIssuedAt).toLocaleString() })}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={openEditCollaborator}
                                        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        {t('edit')}
                                    </button>
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
                            </div>

                            {issuedPortalUrl && (
                                <div className="rounded-lg bg-status-warn-wash p-3 text-sm text-status-warn">
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
                            {issueToken.error && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(issueToken.error)}`)}</p>}

                            <AdminSection title={t('codes.title')} description={t('codes.subtitle')}>
                                <div className="mb-3 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={openCreateCode}
                                        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink"
                                    >
                                        <Plus className="h-4 w-4" />
                                        {t('codes.create')}
                                    </button>
                                </div>
                                {codesQuery.isLoading && <LoadingState label={t('codes.loading')} className="justify-start py-3" />}
                                {codesQuery.error && <p className="py-3 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(codesQuery.error)}`)}</p>}
                                {codesQuery.data?.length === 0 && <p className="py-3 text-sm text-ink-muted">{t('codes.empty')}</p>}
                                {(codesQuery.data?.length ?? 0) > 0 && (
                                    <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-border">
                                        <table className="w-full min-w-[760px] text-left text-sm">
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
                                                {codesQuery.data?.map((code) => (
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
                                                            <span className={cn('inline-flex rounded-full px-2 py-1 text-[11px] font-bold', CODE_STATUS_PILL[code.status])}>
                                                                {t(`codes.status.${code.status}`)}
                                                            </span>
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

                            <CollaborationEarningsPanel collaborator={selectedCollaborator} />
                        </div>
                    )}
                </section>
            </div>

            <CollaborationVoidRedemptionForm />

            <CollaboratorDrawer
                key={editingCollaborator?.id ?? 'new-collaborator'}
                open={collaboratorDrawerOpen}
                collaborator={editingCollaborator}
                onCloseAction={closeCollaboratorDrawer}
            />
            <CollaborationCodeDrawer
                key={editingCode?.id ?? 'new-code'}
                open={codeDrawerOpen}
                collaborator={selectedCollaborator}
                code={editingCode}
                onCloseAction={closeCodeDrawer}
            />
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
        </section>
    );
}
