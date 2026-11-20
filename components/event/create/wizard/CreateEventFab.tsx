'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';

import { useCreateEventFab } from '@/hooks/useCreateEventFab';
import { SALE_BUTTON_CLASS } from '@/lib/landingSaleButton';
import { landingClickAttributes } from '@/lib/landingTracking';
import { cn } from '@/lib/utils';

// Hidden while the mobile menu is open (the menu's own panel has the class `flex` only while open).
const HIDE_WITH_MENU = '[body:has(#landing-mobile-menu.flex)_&]:hidden';

const PLAIN =
    'fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-40 flex h-14 items-center justify-center gap-2 rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[17px] font-bold text-ink shadow-[0_12px_30px_rgba(255,122,89,0.35)] min-[761px]:hidden';

// During a sale: the sale button's pill, the offer on the left and the action on the right.
function SaleFab({ href, percent }: { href: string; percent: string }) {
    const t = useTranslations('SiteNotice');

    return (
        <a
            className={cn(SALE_BUTTON_CLASS, HIDE_WITH_MENU)}
            href={href}
            {...landingClickAttributes({ event: 'create', placement: 'phone_create_sale' })}
        >
            {/* Offer */}
            <span className="min-w-0 font-medium">{t('campaignButton', { percent })}</span>

            {/* Action */}
            <span className="flex shrink-0 items-center gap-2 font-bold">
                {t('getStarted')}
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-white text-[18px] leading-none">
                    →
                </span>
            </span>
        </a>
    );
}

// The phone create button on public pages: pinned to the bottom, above the safe area.
function Fab() {
    const { visible, href, label, salePercent } = useCreateEventFab();

    if (!visible) return null;
    if (salePercent !== null) return <SaleFab href={href} percent={salePercent} />;
    return (
        <a className={cn(PLAIN, HIDE_WITH_MENU)} href={href} {...landingClickAttributes({ event: 'create', placement: 'phone_create' })}>
            <Plus aria-hidden="true" className="size-5" />
            {label}
        </a>
    );
}

// useSearchParams needs the Suspense boundary on statically rendered pages.
export function CreateEventFab() {
    return (
        <Suspense fallback={null}>
            <Fab />
        </Suspense>
    );
}
