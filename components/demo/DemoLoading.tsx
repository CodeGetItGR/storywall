'use client';

import { useSelectedLayoutSegment } from 'next/navigation';

import { DemoBanner } from '@/components/demo/DemoBanner';
import { FeedPageSkeleton } from '@/components/feed/FeedPageSkeleton';
import { LoadingState } from '@/components/ui/LoadingState';

// The demo's frame while its snapshot loads. Most visitors land on the feed, so they see its skeleton.
export function DemoLoading() {
    const segment = useSelectedLayoutSegment();

    return (
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
            {/* Demo notice */}
            <DemoBanner />
            {/* Content */}
            <div className="min-h-0 flex-1 overflow-hidden">
                {segment === 'feed' ? <FeedPageSkeleton /> : <LoadingState size="md" className="h-full" />}
            </div>
        </div>
    );
}
