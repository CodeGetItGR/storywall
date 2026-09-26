import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function UsagePanelSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn('space-y-3', className)} aria-hidden="true">
            {/* Header */}
            <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24 rounded-full" />
                <Skeleton className="h-3 w-32 rounded-full" />
            </div>

            {/* Usage bar */}
            <div className="space-y-2">
                <div className="flex justify-between">
                    <Skeleton className="h-3 w-16 rounded-full" />
                    <Skeleton className="h-3 w-20 rounded-full" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
        </div>
    );
}
