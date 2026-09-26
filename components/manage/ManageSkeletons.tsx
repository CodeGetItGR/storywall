import { UsagePanelSkeleton } from '@/components/plan/UsagePanelSkeleton';
import { ModulePageShellSkeleton } from '@/components/tools/ModulePageShellSkeleton';
import { MetricStripSkeleton } from '@/components/ui/MetricStrip';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

function SubTabsSkeleton({ count }: { count: number }) {
    return (
        <div className="flex w-full items-center justify-center gap-4">
            {Array.from({ length: count }).map((_, index) => (
                <Skeleton key={index} className="h-4 w-16 rounded-full" />
            ))}
        </div>
    );
}

function LinkRowsSkeleton({ count }: { count: number }) {
    return (
        <div className="space-y-1">
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-3 py-2">
                    <Skeleton className="h-4 w-4 rounded-md" />
                    <Skeleton className="h-3 w-36 rounded-full" />
                </div>
            ))}
        </div>
    );
}

function MemberRowSkeleton() {
    return (
        <div className="flex items-center gap-3 border-b border-border/70 py-3 last:border-b-0">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36 rounded-full" />
                <Skeleton className="h-2.5 w-24 rounded-full" />
            </div>
        </div>
    );
}

export function ManageOverviewSkeleton() {
    return (
        <SkeletonStatus className="flex flex-col gap-5">
            {/* Coverage status */}
            <Skeleton className="h-10 w-full rounded-md" />

            {/* Headline numbers */}
            <MetricStripSkeleton count={4} />

            {/* Host context */}
            <div className="flex flex-col gap-3 border-t border-border pt-4">
                <Skeleton className="h-3.5 w-28 rounded-full" />
                <LinkRowsSkeleton count={4} />
                <UsagePanelSkeleton />
            </div>
        </SkeletonStatus>
    );
}

export function ManageDraftOverviewSkeleton() {
    return (
        <SkeletonStatus className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
            {/* Event and pricing */}
            <div className="flex flex-col gap-5">
                <div className="flex items-start gap-3">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-40 rounded-full" />
                        <Skeleton className="h-3 w-3/4 rounded-full" />
                    </div>
                </div>
                <div className="space-y-2 border-t border-border/70 pt-5">
                    <Skeleton className="h-3 w-24 rounded-full" />
                    <Skeleton className="h-4 w-48 rounded-full" />
                </div>
                <div className="space-y-3 border-t border-border/70 pt-5">
                    <Skeleton className="h-3 w-20 rounded-full" />
                    <Skeleton className="h-11 w-full rounded-2xl" />
                    <Skeleton className="h-11 w-full rounded-2xl" />
                </div>
            </div>

            {/* Payment */}
            <div className="space-y-3 rounded-2xl border border-border bg-surface-muted/40 p-5">
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-md" />
                <Skeleton className="h-11 w-full rounded-full" />
            </div>
        </SkeletonStatus>
    );
}

export function RsvpReportSkeleton() {
    return (
        <SkeletonStatus className="flex flex-col gap-8">
            {/* Headline numbers */}
            <MetricStripSkeleton count={4} />

            {/* Categories */}
            <div className="space-y-3">
                <Skeleton className="h-3 w-28 rounded-full" />
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between gap-3">
                        <Skeleton className="h-3.5 w-32 rounded-full" />
                        <Skeleton className="h-3.5 w-10 rounded-full" />
                    </div>
                ))}
            </div>
        </SkeletonStatus>
    );
}

export function ManageRsvpSkeleton() {
    return (
        <div className="flex flex-col gap-7">
            {/* Sub-tabs */}
            <SubTabsSkeleton count={3} />

            {/* Countdown */}
            <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-3 w-24 rounded-full" />
                    <Skeleton className="h-3.5 w-40 rounded-full" />
                </div>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
                <Skeleton className="h-3 w-28 rounded-full" />
                <Skeleton className="h-11 w-full max-w-sm rounded-2xl" />
            </div>

            {/* Report */}
            <RsvpReportSkeleton />
        </div>
    );
}

export function ManageMembersSkeleton() {
    return (
        <SkeletonStatus className="flex flex-col">
            {/* Sub-tabs */}
            <SubTabsSkeleton count={2} />

            {/* Members list */}
            <div className="mt-4">
                {Array.from({ length: 6 }).map((_, index) => (
                    <MemberRowSkeleton key={index} />
                ))}
            </div>
        </SkeletonStatus>
    );
}

export function BillingTabSkeleton() {
    return (
        <SkeletonStatus className="flex flex-col gap-6">
            {/* Your plan */}
            <div>
                <Skeleton className="mb-3 h-3 w-20 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-md" />
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="space-y-1.5">
                            <Skeleton className="h-2.5 w-16 rounded-full" />
                            <Skeleton className="h-3.5 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Upgrade */}
            <div className="border-t border-ink/10 pt-5">
                <Skeleton className="mb-3 h-3 w-24 rounded-full" />
                <Skeleton className="h-20 w-full rounded-lg" />
            </div>

            {/* Payments */}
            <div className="space-y-3 border-t border-ink/10 pt-5">
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
            </div>
        </SkeletonStatus>
    );
}

export function ManagePageSkeleton() {
    return (
        <div className="mx-auto w-full max-w-6xl pb-10">
            {/* Header */}
            <div className="border-b border-border/60" aria-hidden="true">
                <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 lg:px-6 lg:pt-6 lg:pb-5">
                    <div className="min-w-0 space-y-2">
                        <Skeleton className="h-3 w-20 rounded-full" />
                        <Skeleton className="h-6 w-48 rounded-full lg:h-7 lg:w-64" />
                    </div>
                    <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                </div>

                {/* Section switcher (small screens) */}
                <div className="px-4 pb-3 lg:hidden">
                    <Skeleton className="h-12 w-full rounded-2xl" />
                </div>
            </div>

            {/* Body */}
            <div className="px-4 pt-4 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:pt-5">
                {/* Sections (desktop) */}
                <div className="hidden flex-col gap-1 lg:flex" aria-hidden="true">
                    {Array.from({ length: 7 }).map((_, index) => (
                        <div key={index} className="flex min-h-11 items-center gap-2.5 px-3">
                            <Skeleton className="h-4 w-4 rounded-md" />
                            <Skeleton className="h-3 w-24 rounded-full" />
                        </div>
                    ))}
                </div>

                <div className="min-w-0">
                    {/* Section heading (desktop) */}
                    <Skeleton className="mb-4 hidden h-3.5 w-24 rounded-full lg:block" />
                    <ManageOverviewSkeleton />
                </div>
            </div>
        </div>
    );
}

export function QrLinksListSkeleton() {
    return (
        <SkeletonStatus>
            {/* Capacity */}
            <UsagePanelSkeleton className="mb-4" />

            {/* Summary */}
            <Skeleton className="mb-3 h-3 w-32 rounded-full" />

            {/* Links */}
            <div className="flex flex-col divide-y divide-border">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-2 py-3 first:pt-0">
                        <Skeleton className="h-3.5 w-36 rounded-full" />
                        <Skeleton className="h-4 w-12 rounded-full" />
                        <Skeleton className="h-3 w-16 rounded-full" />
                    </div>
                ))}
            </div>
        </SkeletonStatus>
    );
}

export function InvitationsQrPageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="2xl" withSubtitle>
            <QrLinksListSkeleton />
        </ModulePageShellSkeleton>
    );
}

export function RsvpReportScreenSkeleton() {
    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
            {/* Actions */}
            <div className="flex items-center justify-end gap-2" aria-hidden="true">
                <Skeleton className="h-9 w-20 rounded-full" />
                <Skeleton className="h-9 w-32 rounded-full" />
                <Skeleton className="h-9 w-20 rounded-full" />
            </div>

            {/* Report */}
            <RsvpReportBodySkeleton />
        </div>
    );
}

export function RsvpReportBodySkeleton() {
    return (
        <SkeletonStatus className="flex flex-col gap-8">
            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-7 w-56 rounded-full" />
                <Skeleton className="h-3.5 w-40 rounded-full" />
                <Skeleton className="h-3 w-24 rounded-full" />
            </div>

            {/* Headline numbers */}
            <MetricStripSkeleton count={4} />

            {/* Rows */}
            <div className="divide-y divide-border/70">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 py-3">
                        <Skeleton className="h-3.5 w-40 rounded-full" />
                        <Skeleton className="h-3.5 w-12 rounded-full" />
                    </div>
                ))}
            </div>
        </SkeletonStatus>
    );
}
