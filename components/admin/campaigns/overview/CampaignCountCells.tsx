'use client';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { CampaignCounts } from '@/lib/adminCampaignOverview';
import { EMPTY_VALUE } from '@/lib/adminFunnel';

const cell = 'px-3 py-3 text-right font-mono tabular-nums';

// The number cells of a By source row, in the table's column order. No revenue cell for marketing.
export function CampaignCountCells({ counts }: { counts: CampaignCounts }) {
    const format = useFunnelFormat();
    const revenue = counts.revenueMinorByCurrency && Object.entries(counts.revenueMinorByCurrency);

    return (
        <>
            {/* Visits */}
            <td className={cell}>{format.count(counts.visits)}</td>
            <td className={cell}>{format.count(counts.visitors)}</td>
            <td className={cell}>{format.count(counts.createClicks)}</td>
            <td className={cell}>{format.count(counts.plansClicks)}</td>
            <td className={cell}>{format.count(counts.planPicks)}</td>
            {/* Sign-ups */}
            <td className={cell}>{format.count(counts.signedUp)}</td>
            <td className={cell}>{format.count(counts.paidHost)}</td>
            {/* Revenue */}
            {revenue && (
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {revenue.length ? revenue.map(([currency, minor]) => format.money(minor, currency)).join(' · ') : EMPTY_VALUE}
                </td>
            )}
        </>
    );
}
