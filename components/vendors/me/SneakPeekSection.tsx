'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { MediaThumbnail } from '@/components/common/MediaThumbnail';
import { AppLink } from '@/components/ui/AppLink';
import { Button, buttonVariants } from '@/components/ui/button';
import type { MediaResponseDto } from '@/lib/api/types';
import type { SneakPeekState } from '@/lib/sneakPeek';

// Never rendered for 'hidden'; the screen checks `visible` first.
export function SneakPeekSection({
    state,
    thumbnails,
    feedHref,
    onChooseAction,
    onEditAction,
    onDeleteAction,
}: {
    state: Exclude<SneakPeekState, 'hidden'>;
    thumbnails: MediaResponseDto[];
    feedHref: string | null;
    onChooseAction: () => void;
    onEditAction: () => void;
    onDeleteAction: () => void;
}) {
    const t = useTranslations('Vendors.sneakPeek');
    const posted = state === 'posted' || state === 'postedClosed';

    return (
        <section aria-labelledby="vendor-sneak-peek-title" className="flex flex-col gap-3">
            {/* Title */}
            <h3 id="vendor-sneak-peek-title" className="text-sm font-semibold text-ink">
                {t('title')}
            </h3>

            {/* Status */}
            {state === 'notOpen' && <p className="text-sm text-ink-muted">{t('notOpen')}</p>}
            {state === 'noItems' && <p className="text-sm text-ink-muted">{t('noItems')}</p>}
            {state === 'used' && <p className="text-sm text-ink-muted">{t('used')}</p>}
            {state === 'ready' && (
                <div className="flex flex-col items-start gap-3">
                    <p className="text-sm text-ink-muted">{t('ready')}</p>
                    <Button type="button" size="lg" onClick={onChooseAction}>
                        {t('choose')}
                    </Button>
                </div>
            )}

            {/* Posted */}
            {posted && (
                <>
                    {thumbnails.length > 0 && (
                        <ul className="grid grid-cols-4 gap-2">
                            {thumbnails.map((item, i) => (
                                <li key={item.id} className="relative aspect-square overflow-hidden rounded-lg">
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
        </section>
    );
}
