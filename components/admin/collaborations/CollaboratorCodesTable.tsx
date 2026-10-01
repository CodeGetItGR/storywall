'use client';

import { Link2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { CollaboratorCodeRow } from '@/components/admin/collaborations/CollaboratorCodeRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaborationCodeResponseDto } from '@/lib/api/types';

export function CollaboratorCodesTable({
    codes,
    isLoading,
    error,
    onCreateAction,
    onLinkAction,
    onEditAction,
}: {
    codes: CollaborationCodeResponseDto[];
    isLoading: boolean;
    error: unknown;
    onCreateAction: () => void;
    onLinkAction: () => void;
    onEditAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');

    return (
        <section className="space-y-3">
            {/* Heading */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-ink">{t('codes.title')}</h3>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={onLinkAction}
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                    >
                        <Link2 className="h-4 w-4" />
                        {t('linkCode.open')}
                    </button>
                    <button
                        type="button"
                        onClick={onCreateAction}
                        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                        <Plus className="h-4 w-4" />
                        {t('codes.create')}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card">
                {isLoading && <LoadingState label={t('codes.loading')} className="justify-start px-4 py-6" />}
                {Boolean(error) && <p className="px-4 py-6 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(error)}`)}</p>}
                {!isLoading && !error && codes.length === 0 && <p className="px-4 py-6 text-sm text-ink-muted">{t('codes.empty')}</p>}
                {codes.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-[13px]">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                    <th className="px-3 py-2 font-bold">{t('codes.columns.code')}</th>
                                    <th className="px-2.5 py-2 font-bold">{t('codes.columns.rates')}</th>
                                    <th className="px-2.5 py-2 font-bold">{t('codes.columns.redemptions')}</th>
                                    <th className="px-2.5 py-2 font-bold">{t('codes.columns.appliesTo')}</th>
                                    <th className="px-2.5 py-2 font-bold">{t('codes.columns.status')}</th>
                                    <th className="px-2.5 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {codes.map((code) => (
                                    <CollaboratorCodeRow key={code.id} code={code} onEditAction={onEditAction} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
