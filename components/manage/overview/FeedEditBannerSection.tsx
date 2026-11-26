'use client';

import { FeedEditBanner } from '@/components/manage/overview/FeedEditBanner';
import { useFeedEditBanner } from '@/hooks/useFeedEditBanner';
import type { EventDetailResponseDto, EventStatus, PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

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

    return <FeedEditBanner state={banner.state} href={banner.href} />;
}
