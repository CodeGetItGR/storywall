'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Banner } from '@/components/feed/Banner';
import { EventSessionActionButtons } from '@/components/feed/EventSessionActionButtons';
import { AppLink } from '@/components/ui/AppLink';
import { useFeedCoverBlock } from '@/hooks/useFeedCoverBlock';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { coverPhotoSettingsHref } from '@/lib/manageSectionTargets';

type FeedCoverBlockProps = {
    event: EventDetailResponseDto;
    isHost: boolean;
    wishlist: boolean;
    // The top corner: the Edit pill for hosts.
    corner?: ReactNode;
};

// The feed's cover + title block (feedCover): the banner with the session and gift buttons.
export function FeedCoverBlock({ event, isHost, wishlist, corner }: FeedCoverBlockProps) {
    const t = useTranslations('FeedPage');
    const cover = useFeedCoverBlock(event, wishlist);

    return (
        <section className="relative mt-3">
            <Banner
                image={event.coverMedia?.mediaUrl ?? null}
                illustrationUrl={event.theme?.illustrationUrl ?? null}
                onIllustrationError={cover.onIllustrationError}
                title={event.title}
                glowVisible={cover.pageLoaded}
                fallbackActionHref={isHost ? coverPhotoSettingsHref(event.id) : undefined}
                fallbackActionLabel={isHost ? t('addCoverPhoto') : undefined}
                actions={
                    <>
                        <EventSessionActionButtons event={event} />
                        {/* Gift account */}
                        {cover.giftHref && (
                            <AppLink
                                href={cover.giftHref}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/92 text-ink shadow-[0_8px_22px_rgba(36,31,26,0.18)] transition-transform hover:-translate-y-0.5"
                            >
                                <Image src="/icons/present.svg" alt={cover.giftName} width={22} height={22} className="h-5 w-5" unoptimized />
                            </AppLink>
                        )}
                    </>
                }
            />

            {/* Edit */}
            {corner && <div className="absolute top-3 right-3 z-20">{corner}</div>}
        </section>
    );
}
