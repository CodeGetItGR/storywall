'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type { LiteWish, useLitePlanArt } from '@/hooks/useLitePlanArt';
import { cn } from '@/lib/utils';

type Art = ReturnType<typeof useLitePlanArt>;

// The printed wishbook hosts download (guestwall-be wishbook-book/book.css), drawn at 2px per mm: an A5 page is 296 x 420.
const PAGE = 'relative h-[420px] w-[296px] shrink-0 overflow-hidden bg-[#F8F4EE] font-editorial text-[#2A2521]';
const ACCENT = 'bg-[#D08C45]';
const SHADOW = 'shadow-[0_26px_40px_-16px_rgba(40,20,10,0.5)]';

// The book's initials avatar, for a guest without a photo.
function initials(name: string) {
    return name
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .replace(/[^\p{L}]/gu, '')
        .slice(0, 2)
        .toUpperCase();
}

function BookWish({ wish, featured = false }: { wish: LiteWish; featured?: boolean }) {
    return (
        <div className={cn('grid grid-cols-[22px_1fr] gap-x-1.5', featured ? 'py-0' : 'border-b border-[#E6DED3] py-2.5')}>
            {/* Author */}
            <div className="col-span-2 mb-1.5 flex items-center gap-1.5">
                <span
                    className={cn(
                        'flex shrink-0 items-center justify-center rounded-full bg-[#F1E2CF] font-semibold tracking-wide text-[#9A6430]',
                        featured ? 'size-9 text-[8px]' : 'size-8 text-[7.5px]',
                    )}
                >
                    {initials(wish.author)}
                </span>
                <span className="text-[9px] font-semibold">{wish.author}</span>
            </div>
            {/* Message */}
            <span className={cn('leading-[0.9] text-[#D08C45]', featured ? 'text-[36px]' : 'text-[28px]')}>“</span>
            <p className={cn('m-0 italic', featured ? 'text-[17px] leading-[1.35]' : 'text-[12px] leading-[1.45]')}>{wish.message}</p>
        </div>
    );
}

function PageNumber({ children, side }: { children: ReactNode; side: 'left' | 'right' }) {
    return <span className={cn('absolute bottom-4 text-[5.6px] text-[#8B8178]', side === 'left' ? 'left-8' : 'right-8')}>{children}</span>;
}

// The book open on a spread: a wish on the left page, a starred wish on its own page on the right.
export function LiteBookSpread({ art, scale, className }: { art: Art; scale: number; className?: string }) {
    const [first, second] = art.wishes;

    return (
        <div className={cn('absolute origin-top-left', className)} style={{ transform: `scale(${scale})` }}>
            <div className={cn('flex rounded-[3px]', SHADOW)}>
                {/* Left page */}
                <div className={cn(PAGE, 'rounded-l-[3px] px-8 pt-10')}>
                    <span className={cn('mb-4 block h-px w-6', ACCENT)} />
                    <BookWish wish={second} />
                    <span className="pointer-events-none absolute -bottom-6 -left-8 size-[200px] bg-[radial-gradient(circle_100px_at_0%_50%,rgba(232,160,90,0.4),rgba(232,160,90,0))]" />
                    <PageNumber side="left">4</PageNumber>
                    {/* Gutter */}
                    <span className="absolute inset-y-0 right-0 w-8 bg-linear-to-l from-[rgba(40,20,10,0.14)] to-transparent" />
                </div>
                {/* Right page */}
                <div className={cn(PAGE, 'rounded-r-[3px] px-8 pt-24')}>
                    <BookWish wish={first} featured />
                    <PageNumber side="right">5</PageNumber>
                    <span className="absolute inset-y-0 left-0 w-6 bg-linear-to-r from-[rgba(40,20,10,0.12)] to-transparent" />
                </div>
            </div>
        </div>
    );
}

// The book's cover, as it prints with a cover photo, with a page of wishes fanning out behind it.
export function LiteBookCover({ art, title, scale, className }: { art: Art; title: string; scale: number; className?: string }) {
    const tAlt = useTranslations('ImageAlt');

    return (
        <div className={cn('absolute origin-top-left', className)} style={{ transform: `scale(${scale})` }}>
            {/* A page fanning out */}
            <div className={cn(PAGE, SHADOW, 'absolute top-3 left-24 flex rotate-9 items-center rounded-[3px] px-8')}>
                <BookWish wish={art.wishes[0]} featured />
            </div>
            {/* Cover */}
            <div className={cn(PAGE, SHADOW, 'relative -rotate-3 rounded-[3px]')}>
                <Image src={art.cover} alt={tAlt('eventCover')} fill sizes="160px" className="object-cover" />
                <span className="absolute inset-x-0 top-0 h-[40%] bg-[linear-gradient(rgba(248,244,238,0.75)_0%,rgba(248,244,238,0.5)_50%,rgba(248,244,238,0)_100%)]" />
                <span className="absolute inset-x-0 bottom-0 h-[20%] bg-[linear-gradient(rgba(248,244,238,0)_0%,rgba(248,244,238,0.5)_50%,rgba(248,244,238,0.7)_100%)]" />
                <div className="absolute top-11 right-7 left-7 [text-shadow:0_0_5px_rgba(248,244,238,0.95)]">
                    <p className="m-0 text-[18px] leading-[1.15]">{title}</p>
                    <span className={cn('mt-1.5 block h-px w-6', ACCENT)} />
                </div>
                <Image src="/assets/LogoText.svg" alt={tAlt('storywallLogo')} width={68} height={20} className="absolute bottom-5 left-1/2 h-auto w-[68px] -translate-x-1/2" />
            </div>
        </div>
    );
}
