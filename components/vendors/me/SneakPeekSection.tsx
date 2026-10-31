'use client';

import { CircleCheck, Clock, ImageIcon, Images, type LucideIcon, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { MediaThumbnail } from '@/components/common/MediaThumbnail';
import { AppLink } from '@/components/ui/AppLink';
import { Button, buttonVariants } from '@/components/ui/button';
import { VendorMeNote } from '@/components/vendors/me/VendorMeNote';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import type { MediaResponseDto } from '@/lib/api/types';
import type { SneakPeekState } from '@/lib/sneakPeek';
import { cn } from '@/lib/utils';

// The states where the sneak peek can't be shared, each with the icon its note carries.
type BlockedState = Extract<SneakPeekState, 'notOpen' | 'noItems' | 'used'>;
const BLOCKED_ICONS: Record<BlockedState, LucideIcon> = { notOpen: Clock, noItems: Images, used: CircleCheck };

function isBlocked(state: SneakPeekState): state is BlockedState {
    return state in BLOCKED_ICONS;
}

// Never rendered for 'hidden'; the screen checks `visible` first. While ready, a small fan of the vendor's own photos
// shows what guests are about to get; before that, an empty fan and a disabled button show what will come.
export function SneakPeekSection({
    state,
    thumbnails,
    fanItems,
    feedHref,
    onChooseAction,
    onEditAction,
    onDeleteAction,
}: {
    state: Exclude<SneakPeekState, 'hidden'>;
    thumbnails: MediaResponseDto[];
    fanItems: MediaResponseDto[];
    feedHref: string | null;
    onChooseAction: () => void;
    onEditAction: () => void;
    onDeleteAction: () => void;
}) {
    const t = useTranslations('Vendors.sneakPeek');
    const tHints = useTranslations('Vendors.hints');
    const posted = state === 'posted' || state === 'postedClosed';

    return (
        <VendorMeSection id="vendor-sneak-peek-title" title={t('title')} hint={tHints('sneakPeek')}>
            {/* Not yet */}
            {isBlocked(state) && (
                <>
                    <div className="flex items-center gap-5">
                        <EmptyFan />
                        <Button type="button" size="lg" disabled>
                            {t('choose')}
                        </Button>
                    </div>
                    <VendorMeNote icon={BLOCKED_ICONS[state]}>{t(state)}</VendorMeNote>
                </>
            )}

            {/* Ready */}
            {state === 'ready' && (
                <div className="flex items-center gap-5">
                    {fanItems.length > 0 && <PhotoFan items={fanItems} />}
                    <Button type="button" size="lg" onClick={onChooseAction}>
                        {t('choose')}
                    </Button>
                </div>
            )}

            {/* Posted */}
            {posted && (
                <>
                    {thumbnails.length > 0 && (
                        <ul className="grid grid-cols-4 gap-1.5">
                            {thumbnails.map((item, i) => (
                                <li key={item.id} className="relative aspect-square overflow-hidden rounded-xl">
                                    <MediaThumbnail
                                        src={item.mediaUrl}
                                        mediaType={item.mediaType}
                                        status={item.status}
                                        thumbnailUrl={item.thumbnailUrl}
                                        alt={t('thumbAlt', { index: i + 1 })}
                                        fill
                                        className="object-cover"
                                        sizes="25vw"
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        {feedHref && (
                            <AppLink href={feedHref} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                                {t('seeInFeed')}
                            </AppLink>
                        )}
                        {state === 'posted' && (
                            <>
                                <Button type="button" variant="ghost" size="lg" onClick={onEditAction}>
                                    <Pencil aria-hidden="true" />
                                    {t('edit')}
                                </Button>
                                <Button type="button" variant="ghost" size="lg" onClick={onDeleteAction}>
                                    <Trash2 aria-hidden="true" />
                                    {t('delete')}
                                </Button>
                            </>
                        )}
                    </div>
                </>
            )}
        </VendorMeSection>
    );
}

// Up to three photos fanned out like prints on a table.
const FAN_TILTS = ['-rotate-8 -translate-x-5', 'rotate-0 z-10', 'rotate-8 translate-x-5'];

// The fan's frames with nothing in them yet.
function EmptyFan() {
    return (
        <div aria-hidden="true" className="relative flex h-24 w-28 shrink-0 items-center justify-center">
            {FAN_TILTS.map((tilt) => (
                <span
                    key={tilt}
                    className={cn('absolute flex size-18 items-center justify-center rounded-md bg-surface-muted shadow-sm ring-2 ring-card', tilt)}
                >
                    <ImageIcon className="size-5 text-ink/25" />
                </span>
            ))}
        </div>
    );
}

function PhotoFan({ items }: { items: MediaResponseDto[] }) {
    const t = useTranslations('Vendors.sneakPeek');

    return (
        <ul className="relative flex h-24 w-28 shrink-0 items-center justify-center">
            {items.slice(0, FAN_TILTS.length).map((item, i) => (
                <li
                    key={item.id}
                    className={cn('absolute size-18 overflow-hidden rounded-md bg-surface-muted shadow-md ring-2 ring-card', FAN_TILTS[i])}
                >
                    <MediaThumbnail
                        src={item.mediaUrl}
                        mediaType={item.mediaType}
                        status={item.status}
                        thumbnailUrl={item.thumbnailUrl}
                        alt={t('fanAlt', { index: i + 1 })}
                        fill
                        className="object-cover"
                        sizes="72px"
                    />
                </li>
            ))}
        </ul>
    );
}
