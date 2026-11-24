'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AddCoverPhotoLink } from '@/components/feed/AddCoverPhotoLink';
import { Banner } from '@/components/feed/Banner';
import { EventSessionActionButtons } from '@/components/feed/EventSessionActionButtons';
import { AppLink } from '@/components/ui/AppLink';
import { useFeedCoverBlock } from '@/hooks/useFeedCoverBlock';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { coverPhotoSettingsHref } from '@/lib/manageSectionTargets';
import { cn } from '@/lib/utils';

type FeedCoverBlockProps = {
    event: EventDetailResponseDto;
    isHost: boolean;
    wishlist: boolean;
    // The top corner: the Edit pill for hosts.
    corner?: ReactNode;
    // Drawn as a small picture (the Overview's feed banner): the banner image isn't preloaded.
    thumbnail?: boolean;
    // The Invitation | Social Feed pill sits on the cover's bottom edge: the title keeps clear of it.
    clearPill?: boolean;
    // In edit mode the cover takes no taps and its settings button sits in the top right corner.
    editing?: boolean;
};

// The feed's cover + title block (feedCover): the banner with the session and gift buttons.
export function FeedCoverBlock({ event, isHost, wishlist, corner, thumbnail, clearPill, editing = false }: FeedCoverBlockProps) {
    const t = useTranslations('FeedPage');
    const cover = useFeedCoverBlock(event, wishlist);
    const addPhotoHref = isHost && !editing ? coverPhotoSettingsHref(event.id) : undefined;
    const isBare = !event.coverMedia?.mediaUrl && !event.theme?.illustrationUrl;
    const hasSessionButtons = event.sessions?.some((session) => session.isMain || session.isSecondary);

    return (
        <section className="relative isolate mt-3">
            <Banner
                image={event.coverMedia?.mediaUrl ?? null}
                illustrationUrl={event.theme?.illustrationUrl ?? null}
                onIllustrationError={cover.onIllustrationError}
                title={event.title}
                glowVisible={cover.pageLoaded}
                fallbackActionHref={corner ? undefined : addPhotoHref}
                fallbackActionLabel={t('addCoverPhoto')}
                thumbnail={thumbnail}
                clearPill={clearPill}
                actions={
                    <>
                        <EventSessionActionButtons event={event} topTaken={editing} />
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

            {/* Edit, then Add cover photo: top-left, clear of the banner's session buttons on the right */}
            {corner && (
                <div
                    className={cn(
                        'pointer-events-none absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 *:pointer-events-auto',
                        hasSessionButtons ? 'right-16' : 'right-5',
                    )}
                >
                    {corner}
                    {addPhotoHref && isBare && <AddCoverPhotoLink href={addPhotoHref} label={t('addCoverPhoto')} />}
                </div>
            )}
        </section>
    );
}
