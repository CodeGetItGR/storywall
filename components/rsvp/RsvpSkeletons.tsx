import { ManageRsvpSkeleton } from '@/components/manage/ManageSkeletons';
import { ModulePageShellSkeleton } from '@/components/tools/ModulePageShellSkeleton';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function RsvpPageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="3xl">
            <ManageRsvpSkeleton />
        </ModulePageShellSkeleton>
    );
}

export function RsvpSubmitPageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="2xl">
            <SkeletonStatus className="mb-6 p-3">
                {/* Heading */}
                <Skeleton className="mb-4 h-4 w-24 rounded-full" />

                <div className="flex flex-col gap-4">
                    {/* Attendance */}
                    <div>
                        <Skeleton className="mb-2 h-3 w-40 rounded-full" />
                        <div className="grid grid-cols-2 gap-2">
                            <Skeleton className="h-12 rounded-xl" />
                            <Skeleton className="h-12 rounded-xl" />
                        </div>
                    </div>

                    {/* Message */}
                    <Skeleton className="h-28 w-full rounded-xl" />

                    {/* Submit */}
                    <Skeleton className="h-12 w-full rounded-full" />
                </div>
            </SkeletonStatus>
        </ModulePageShellSkeleton>
    );
}
