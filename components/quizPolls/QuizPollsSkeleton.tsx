import { ModulePageShellSkeleton } from '@/components/tools/ModulePageShellSkeleton';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function QuizPollsSkeleton() {
    return (
        <SkeletonStatus className="space-y-6">
            {/* Header */}
            <Skeleton className="h-5 w-32 rounded-full" />

            {/* Question */}
            <div className="space-y-3">
                <Skeleton className="h-5 w-3/4 rounded-full" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
            </div>
        </SkeletonStatus>
    );
}

export function QuizPollsPageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="xl">
            <QuizPollsSkeleton />
        </ModulePageShellSkeleton>
    );
}
