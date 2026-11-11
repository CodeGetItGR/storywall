'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { useThemePhotoCarousel } from '@/hooks/useThemePhotoCarousel';
import type { Locale } from '@/i18n/config';
import { type InvitationThemePage, themeCardBackground, themePhotoAlt } from '@/lib/invitation/themeCatalogue';
import { cn } from '@/lib/utils';

type ThemePhotoCarouselProps = { theme: InvitationThemePage };

// The theme's own photos, one at a time, with arrows and dots under the photo and a swipe on phones.
// Without photos, the theme's colour stands in.
export function ThemePhotoCarousel({ theme }: ThemePhotoCarouselProps) {
    const t = useTranslations('SaveMyDateStorefront');
    const locale = useLocale() as Locale;
    const { photos } = theme;
    const { index, select, previous, next, onTouchStart, onTouchEnd } = useThemePhotoCarousel(photos.length);

    return (
        <div className="mx-auto w-full max-w-90">
            {/* Photo */}
            <div
                className="relative aspect-[9/15.6] overflow-hidden rounded-[28px] shadow-[0_24px_60px_rgba(21,19,19,.16)]"
                role={photos.length === 0 ? 'img' : undefined}
                aria-label={photos.length === 0 ? t('catalogue.cardAlt', { name: theme.name }) : undefined}
                style={{ background: themeCardBackground(theme.cardColor) }}
                onTouchEnd={onTouchEnd}
                onTouchStart={onTouchStart}
            >
                {photos.map((photo, photoIndex) => (
                    <Image
                        key={photo.url}
                        fill
                        alt={themePhotoAlt(photo, locale, t('theme.photoAlt', { name: theme.name, number: photoIndex + 1 }))}
                        className={cn('object-cover', photoIndex !== index && 'hidden')}
                        preload={photoIndex === 0}
                        sizes="(max-width: 420px) calc(100vw - 32px), 360px"
                        src={photo.url}
                    />
                ))}
            </div>

            {/* Arrows and dots, under the photo so they never cover it */}
            {photos.length > 1 ? (
                <div className="mt-4 flex items-center justify-center gap-3">
                    <CarouselArrow label={t('theme.previousPhoto')} onClick={previous}>
                        <ArrowLeft aria-hidden className="size-4" />
                    </CarouselArrow>
                    <div className="flex items-center gap-1">
                        {photos.map((photo, photoIndex) => (
                            <CarouselDot
                                key={photo.url}
                                active={photoIndex === index}
                                index={photoIndex}
                                label={t('theme.photo', { number: photoIndex + 1 })}
                                onSelect={select}
                            />
                        ))}
                    </div>
                    <CarouselArrow label={t('theme.nextPhoto')} onClick={next}>
                        <ArrowRight aria-hidden className="size-4" />
                    </CarouselArrow>
                </div>
            ) : null}
        </div>
    );
}

type CarouselArrowProps = { label: string; onClick: () => void; children: React.ReactNode };

function CarouselArrow({ label, onClick, children }: CarouselArrowProps) {
    return (
        <button
            aria-label={label}
            className="grid size-11 place-items-center rounded-full border border-[#151313]/15 bg-white text-[#151313] focus-ring hover:border-[#151313]/40"
            title={label}
            type="button"
            onClick={onClick}
        >
            {children}
        </button>
    );
}

type CarouselDotProps = { active: boolean; index: number; label: string; onSelect: (index: number) => void };

// A 44px target around a small dot.
function CarouselDot({ active, index, label, onSelect }: CarouselDotProps) {
    function handleClick() {
        onSelect(index);
    }

    return (
        <button aria-current={active} aria-label={label} className="grid size-8 place-items-center rounded-full focus-ring" type="button" onClick={handleClick}>
            <span aria-hidden className={cn('block size-2 rounded-full transition-colors', active ? 'bg-[#151313]' : 'bg-[#151313]/25')} />
        </button>
    );
}
