import { ChevronRight } from 'lucide-react';

import { AppLink } from '@/components/ui/AppLink';
import { ProStorageMeter } from '@/components/vendors/ProStorageMeter';
import type { OverviewPlanLine } from '@/hooks/useOverviewPlanLine';

/** The plan and its storage, linking to Billing. */
export function PlanLine({ line }: { line: OverviewPlanLine }) {
    return (
        <div className="flex flex-col gap-3">
            {/* Plan and storage */}
            <AppLink href={line.href} className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_0_rgba(36,31,26,0.04)]">
                <span className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-ink">{line.planName}</span>
                    <span className="flex-1 text-ink-muted">· {line.usage}</span>
                    <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                </span>
                {/* Storage bar */}
                {line.percent !== null && (
                    <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[#f0e2d2]">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, line.percent)}%` }} />
                    </span>
                )}
            </AppLink>

            {/* Pro storage */}
            {line.showPro && <ProStorageMeter usedBytes={line.proUsedBytes} allowanceBytes={line.proAllowanceBytes} className="px-1" />}
        </div>
    );
}
