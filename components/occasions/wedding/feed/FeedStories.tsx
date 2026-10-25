import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import { cn } from '@/lib/utils';

const RING = 'block rounded-full bg-[linear-gradient(135deg,#ff6f93,#ff936a_52%,#ffd05b)] p-[0.7cqw]';
const CIRCLE = 'block size-[15.2cqw] rounded-full border-[0.7cqw] border-white';

type FeedStoriesProps = {
    badge: WeddingMockCopy['scheduleBadge'];
    labels: WeddingMockCopy['stories'];
    loading?: 'eager' | 'lazy';
    // Guests, moments, venue.
    stories: readonly [OccasionPhoto, OccasionPhoto, OccasionPhoto];
    // The person holding the phone.
    viewer: OccasionPhoto;
};

function Story({ children, label }: { children: ReactNode; label: string }) {
    return (
        <span className="flex w-[17cqw] shrink-0 flex-col items-center gap-[1.4cqw]">
            {children}
            <span className="max-w-full truncate text-[2.9cqw] leading-tight">{label}</span>
        </span>
    );
}

// The stories row: your own story, the schedule's date, then three stories from the day.
export function FeedStories({ badge, labels, loading, stories, viewer }: FeedStoriesProps) {
    const items = [
        { label: labels.guests, photo: stories[0] },
        { label: labels.moments, photo: stories[1] },
        { label: labels.venue, photo: stories[2] },
    ];

    return (
        <div className="flex items-start gap-[1.6cqw] px-[2.5cqw] pt-[4cqw]">
            {/* Your story */}
            <Story label={labels.own}>
                <span className="relative block rounded-full bg-[#f3e3d8] p-[0.7cqw]">
                    <MockPhoto className={CIRCLE} loading={loading} photo={viewer} sizes="72px" />
                    <span className="absolute right-0 bottom-0 grid size-[5.4cqw] place-items-center rounded-full border-[0.6cqw] border-white bg-[#ff765f] text-white">
                        <Plus className="size-[3.4cqw]" strokeWidth={3} />
                    </span>
                </span>
            </Story>
            <span className="mt-[3.5cqw] h-[11cqw] w-px shrink-0 bg-[#151313]/12" />
            {/* Schedule */}
            <Story label={labels.schedule}>
                <span className={RING}>
                    <span className={cn(CIRCLE, 'flex flex-col items-center justify-center bg-[#fff4e6] leading-none')}>
                        <span className="text-[2.9cqw] font-bold text-[#ff765f]">{badge[0]}</span>
                        <span className="mt-[0.6cqw] text-[5.3cqw] font-bold text-[#c2672f]">{badge[1]}</span>
                    </span>
                </span>
            </Story>
            {/* Guests, moments, venue */}
            {items.map((item) => (
                <Story key={item.label} label={item.label}>
                    <span className={RING}>
                        <MockPhoto className={CIRCLE} loading={loading} photo={item.photo} sizes="72px" />
                    </span>
                </Story>
            ))}
        </div>
    );
}
