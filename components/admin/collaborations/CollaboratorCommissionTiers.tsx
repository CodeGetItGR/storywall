'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { commissionTierEnd, currentCommissionTierIndex } from '@/lib/adminCollaborations';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function CollaboratorCommissionTiers({ collaborator, onEditAction }: { collaborator: CollaboratorResponseDto; onEditAction: () => void }) {
    const t = useTranslations('AdminPage.collaborations.tiers');
    const tiers = collaborator.commissionTiers;
    const currentIndex = currentCommissionTierIndex(tiers, collaborator.activationsThisYear);

    return (
        <section className="space-y-3">
            {/* Heading */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
                    <p className="mt-0.5 text-sm text-ink-muted">{t('activationsThisYear', { count: collaborator.activationsThisYear })}</p>
                </div>
                <button
                    type="button"
                    onClick={onEditAction}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-4 w-4" />
                    {t('edit')}
                </button>
            </div>

            {/* Schedule */}
            <div className="rounded-xl border border-border bg-card">
                {tiers.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-ink-muted">{t('none')}</p>
                ) : (
                    <table className="w-full border-collapse text-[13px]">
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="px-4 py-2 font-bold">{t('columns.activations')}</th>
                                <th className="px-4 py-2 font-bold">{t('columns.percent')}</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {tiers.map((tier, index) => {
                                const end = commissionTierEnd(tiers, index);
                                return (
                                    <tr key={tier.minActivations} className="border-b border-border last:border-b-0">
                                        <td className="px-4 py-2.5 font-mono text-ink">
                                            {end === null
                                                ? t('rangeOpen', { from: tier.minActivations })
                                                : t('range', { from: tier.minActivations, to: end })}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono font-semibold text-ink">{tier.commissionPercent}%</td>
                                        <td className="px-4 py-2.5 text-right">
                                            {index === currentIndex && (
                                                <span className="inline-flex rounded-full bg-status-good-wash px-2 py-0.5 text-[10px] font-bold text-status-good">
                                                    {t('current')}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
}
