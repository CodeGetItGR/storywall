'use client';

import { Droplet, ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type FormEvent, useCallback, useId } from 'react';

import { cn } from '@/lib/utils';

type FeedBlockButtonsProps = {
    // The block's text colour now, for the droplet's input.
    color: string;
    uploading: boolean;
    onPhoto: (file: File) => void;
    onColor: (color: string) => void;
};

const ROUND = 'pointer-events-auto relative grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white text-ink shadow-[0_4px_14px_rgba(0,0,0,0.16)] focus-within:ring-2 focus-within:ring-primary';

// A Save my date block's picture and droplet, at its bottom left in edit mode: add a photo into the block, and one
// colour for all its text. Native inputs under round buttons, so the phone's own picker and colour wheel open.
export function FeedBlockButtons({ color, uploading, onPhoto, onColor }: FeedBlockButtonsProps) {
    const t = useTranslations('FeedEditor');
    const tEditor = useTranslations('InvitationEditor');
    const photoId = useId();
    const colorId = useId();
    const pick = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onPhoto(file);
        },
        [onPhoto],
    );
    const paint = useCallback((event: FormEvent<HTMLInputElement>) => onColor(event.currentTarget.value), [onColor]);

    return (
        <div data-feed-block-buttons className="pointer-events-none absolute bottom-3 left-2.5 z-40 flex gap-2">
            {/* Add photo */}
            <label htmlFor={photoId} title={t('addPhoto')} className={cn(ROUND, uploading && 'opacity-60')}>
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                <input
                    id={photoId}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label={t('addPhoto')}
                    disabled={uploading}
                    onChange={pick}
                    className="sr-only"
                />
            </label>

            {/* Text colour */}
            <label htmlFor={colorId} title={tEditor('textColor')} className={ROUND}>
                <Droplet className="h-4 w-4 fill-current" aria-hidden="true" style={{ color }} />
                <input id={colorId} type="color" aria-label={tEditor('textColor')} value={color} onInput={paint} className="sr-only" />
            </label>
        </div>
    );
}
