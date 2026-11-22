'use client';

import dynamic from 'next/dynamic';

import { FeedEditBanner } from '@/components/manage/overview/FeedEditBanner';
import { FeedEditBannerPlaceholder } from '@/components/manage/overview/FeedEditBannerPreview';
import { useFeedEditBanner } from '@/hooks/useFeedEditBanner';
import type { EventDetailResponseDto, EventStatus, PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

// Loaded only with a banner: the invitation look's styles and the cover's render stay off every other Overview.
const LazyFeedEditBannerPreview = dynamic(
    () => import('@/components/manage/overview/FeedEditBannerPreview').then((module) => module.FeedEditBannerPreview),
    { ssr: false, loading: FeedEditBannerPlaceholder },
);

type FeedEditBannerSectionProps = {
    event: EventDetailResponseDto;
    eventStatus: EventStatus;
    paidServices: PaidServiceResponseDto[];
    modules: PlatformModuleResponseDto[];
    currentPlan: PlanTierResponseDto | null | undefined;
};

export function FeedEditBannerSection({ event, eventStatus, paidServices, modules, currentPlan }: FeedEditBannerSectionProps) {
    const banner = useFeedEditBanner({ event, eventStatus, paidServices, modules, currentPlan });
    if (!banner.state || !banner.href) return null;

    return <FeedEditBanner state={banner.state} href={banner.href} illustration={<LazyFeedEditBannerPreview event={event} />} />;
}
