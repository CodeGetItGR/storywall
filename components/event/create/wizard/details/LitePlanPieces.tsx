'use client';

import { Play, Star } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Banner } from '@/components/feed/Banner';
import { LiteActionIcon } from '@/components/liteHome/LiteActionIcon';
import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { SubTabs } from '@/components/ui/SubTabs';
import type { LiteWish, useLitePlanArt } from '@/hooks/useLitePlanArt';
import { dateTimeFormat } from '@/lib/format';
import { cn } from '@/lib/utils';
import { formatClipDuration } from '@/lib/wishbook/voice';

type Art = ReturnType<typeof useLitePlanArt>;

const NOOP = () => undefined;

const QUICK_ACTIONS = ['qr', 'share', 'download'] as const;

// The printed QR card guests scan, as the host prints it from the QR page.
export function LiteQrCard({ art, className }: { art: Art; className?: string }) {
    return (
        <div className={cn('drop-shadow-[0_18px_22px_rgba(40,20,10,0.25)]', className)}>
            <QrCardSvg {...art.card} className="block h-auto w-full rounded-md" />
        </div>
    );
}

type LitePhoneProps = { art: Art; title: string; width: number; tabs?: boolean; actions?: boolean; className?: string };

// A phone showing the lite event's gallery at 360px, scaled down.
export function LitePhone({ art, title, width, tabs = false, actions = false, className }: LitePhoneProps) {
    const scale = (width - 10) / 360;

    return (
        <div
            className={cn('overflow-hidden rounded-[26px] border-[5px] border-ink bg-background shadow-[0_22px_34px_-16px_rgba(40,20,10,0.6)]', className)}
            style={{ width, height: width * 2 }}
        >
            <div className="origin-top-left" style={{ width: 360, transform: `scale(${scale})` }}>
                {/* Notch */}
                <div className="flex justify-center pt-3">
                    <span className="h-5 w-24 rounded-full bg-ink" />
                </div>
                <LiteHomeScreen art={art} title={title} tabs={tabs} actions={actions} />
            </div>
        </div>
    );
}

// The lite event's home on its gallery: its banner, the Bundle's tabs and quick actions, then the photos.
function LiteHomeScreen({ art, title, tabs, actions }: { art: Art; title: string; tabs: boolean; actions: boolean }) {
    const t = useTranslations('LiteHome');

    return (
        <div className="px-2 pt-3">
            {/* Banner */}
            <Banner image={art.cover} title={title} glowVisible={false} />

            {/* Tabs */}
            {tabs && <SubTabs tabs={art.tabs} active="gallery" onSelectAction={NOOP} className="mt-4" />}

            {/* Quick actions, as the host sees them: Download all is the gallery's download */}
            {actions && (
                <div className="mt-5">
                    <p className="px-4 text-sm font-semibold text-ink">{t('actionsTitle')}</p>
                    <ul className="mt-2 flex gap-1 px-2.5">
                        {QUICK_ACTIONS.map((action) => (
                            <li key={action} className="flex w-20 flex-col items-center gap-1.5 px-1 py-1.5">
                                <LiteActionIcon action={action} />
                                <span className="text-center text-xs leading-tight font-medium text-ink">{t(`actions.${action}`)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Gallery */}
            <div className="mt-5 px-2">
                <LiteGalleryGrid art={art} />
            </div>
        </div>
    );
}

// The gallery's photo grid.
function LiteGalleryGrid({ art, className }: { art: Art; className?: string }) {
    const t = useTranslations('QrCodePage');

    return (
        <div className={cn('grid grid-cols-2 gap-3', className)}>
            {art.photos.map((src) => (
                <div key={src} className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
                    <div className="relative aspect-square bg-surface-muted">
                        <Image src={src} alt={t('preview.photo')} fill sizes="120px" className="object-cover" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// One wishbook entry: the guest, when, and their written or recorded wish.
function LiteWishEntry({ wish, date, className }: { wish: LiteWish; date: string; className?: string }) {
    return (
        <article className={cn('rounded-[1.5rem] bg-surface-muted/70 px-4 py-4', className)}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{wish.author}</p>
                    <time className="text-xs text-ink-faint">{dateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))}</time>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center text-ink-faint">
                    <Star className="h-4 w-4" aria-hidden="true" />
                </span>
            </div>

            {/* Message */}
            {wish.voiceMs ? (
                <div className="mt-2 flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white bg-gradient-brand">
                        <Play className="h-4 w-4 translate-x-px" aria-hidden="true" />
                    </span>
                    <span className="text-sm text-ink-muted tabular-nums">{formatClipDuration(wish.voiceMs)}</span>
                </div>
            ) : (
                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-ink">{wish.message}</p>
            )}
        </article>
    );
}

// One wishbook entry floating on its own, scaled down from 300px.
export function LiteFloatingWish({ art, index, scale, className }: { art: Art; index: number; scale: number; className?: string }) {
    return (
        <div className={cn('absolute w-[300px] origin-top-left', className)} style={{ transform: `scale(${scale})` }}>
            <LiteWishEntry wish={art.wishes[index]} date={art.wishDate} className="bg-[#fbf6f1] shadow-[0_24px_40px_-18px_rgba(40,20,10,0.45)]" />
        </div>
    );
}

// A guest's photo, framed like the join preview's floating photos.
export function LitePhoto({ art, index, className }: { art: Art; index: 0 | 1; className?: string }) {
    const t = useTranslations('QrCodePage');

    return (
        <span className={cn('absolute overflow-hidden rounded-xl border-[3px] border-background shadow-[0_10px_20px_-12px_rgba(40,20,10,0.55)]', className)}>
            <Image src={art.floating[index]} alt={t('preview.photo')} fill sizes="96px" className="object-cover" />
        </span>
    );
}
