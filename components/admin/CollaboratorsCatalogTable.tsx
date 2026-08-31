'use client';

import { Pencil, Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CollaboratorStatusPill } from '@/components/admin/CollaboratorStatusPill';
import { LoadingState } from '@/components/ui/LoadingState';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function CollaboratorsCatalogTable({
    collaborators,
    isLoading,
    error,
    onEditAction,
    onManageAction,
}: {
    collaborators: CollaboratorResponseDto[];
    isLoading: boolean;
    error: unknown;
    onEditAction: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onManageAction: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');

    if (isLoading) return <LoadingState label={t('loading')} className="justify-start px-4 py-6" />;
    if (error) return <p className="px-4 py-6 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(error)}`)}</p>;
    if (collaborators.length === 0) return <p className="px-4 py-6 text-sm text-ink-muted">{t('empty')}</p>;

    return (
        <div className="overflow-x-auto">
            {/* Partners table */}
            <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                        <th className="px-4 py-2.5 font-bold">{t('columns.partner')}</th>
                        <th className="px-3 py-2.5 font-bold">{t('columns.contact')}</th>
                        <th className="px-3 py-2.5 font-bold">{t('columns.portal')}</th>
                        <th className="px-3 py-2.5 font-bold">{t('columns.status')}</th>
                        <th className="px-3 py-2.5" />
                    </tr>
                </thead>
                <tbody>
                    {collaborators.map((collaborator) => (
                        <tr key={collaborator.id} className="border-b border-border last:border-b-0 hover:bg-canvas/60">
                            <td className="max-w-64 px-4 py-2.5">
                                <p className="truncate font-semibold text-ink">{collaborator.name}</p>
                            </td>
                            <td className="max-w-64 truncate px-3 py-2.5 text-ink-muted">{collaborator.contactEmail}</td>
                            <td className="px-3 py-2.5 text-ink-muted">
                                {collaborator.portalTokenIssued ? t('portal.issued') : t('portal.notIssued')}
                            </td>
                            <td className="px-3 py-2.5">
                                <CollaboratorStatusPill status={collaborator.status} />
                            </td>
                            <td className="px-3 py-2.5 text-right">
                                <div className="flex justify-end gap-1.5">
                                    <button
                                        type="button"
                                        data-collaborator-id={collaborator.id}
                                        onClick={onManageAction}
                                        aria-label={t('manage')}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                    >
                                        <Settings2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        data-collaborator-id={collaborator.id}
                                        onClick={onEditAction}
                                        aria-label={t('edit')}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
