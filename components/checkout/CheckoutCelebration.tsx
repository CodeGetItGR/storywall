import { QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { AppLink } from '@/components/ui/AppLink';

export type CelebrationCard = { photoSrc: string; alt: string; title: string; date: string };

type CheckoutCelebrationProps = { card: CelebrationCard | null; feedHref: string; inviteHref: string };

// After a draft's first payment: the event card, "Your event is live", and where to go next.
export function CheckoutCelebration({ card, feedHref, inviteHref }: CheckoutCelebrationProps) {
    const t = useTranslations('CheckoutSuccessPage.celebration');

    return (
        <div className="flex min-h-[calc(100svh-4rem)] flex-col bg-white px-5 pt-12 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-center">
            {/* Event card */}
            {card && (
                <div className="mx-auto w-67.5 -rotate-3 rounded-[28px] bg-white p-2.5 pb-4 shadow-[0_18px_40px_rgba(36,31,26,0.22)] motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:fade-in">
                    <span className="relative block h-60 overflow-hidden rounded-[20px]">
                        <ProtectedImage src={card.photoSrc} alt={card.alt} fill sizes="250px" className="object-cover" />
                    </span>
                    <span className="mt-3.5 block truncate px-1.5 font-editorial text-xl text-ink">{card.title}</span>
                    <span className="mt-1 block text-[13px] text-[#6f6257]">{card.date}</span>
                </div>
            )}

            {/* Heading */}
            <h1 className="mt-9 font-editorial text-[30px] leading-[1.15] tracking-[-0.02em] text-ink">{t('heading')}</h1>
            <p className="mt-2.5 text-[15px] leading-[1.45] text-[#5a4e44]">{t('line')}</p>

            <div className="min-h-8 flex-1" />

            {/* Actions */}
            <div className="mx-auto flex w-full max-w-sm flex-col gap-2.5">
                <AppLink
                    href={feedHref}
                    className="flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[15px] font-bold text-ink focus-ring"
                >
                    {t('openEvent')}
                </AppLink>
                <AppLink
                    href={inviteHref}
                    className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border-[1.5px] border-[#e4d3c0] bg-white text-[15px] font-semibold text-ink focus-ring"
                >
                    <QrCode aria-hidden="true" className="size-5" />
                    {t('inviteGuests')}
                </AppLink>
            </div>
        </div>
    );
}
