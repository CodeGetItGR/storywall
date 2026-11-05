import { Download, Images, Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';

import { SneakPeekLabel } from '@/components/feed/post/SneakPeekLabel';
import { PostSkeleton } from '@/components/feed/PostSkeleton';
import { Button } from '@/components/ui/button';
import { RenderPost } from '@/components/vendorPages/renders/RenderPost';
import { VENDOR_RENDER_PHOTOS } from '@/components/vendorPages/renders/renderSample';
import { RenderSection } from '@/components/vendorPages/renders/RenderSection';
import type { VendorPageType } from '@/i18n/publicLocale';
import { formatMoney } from '@/lib/billing';
import { formatBytes } from '@/lib/format';

const GB = 1024 ** 3;
const PRO_USED = 3.2 * GB;
const PRO_TOTAL = 20 * GB;

// The Pro album section of the vendor page: the allowance, the upload and the vendor's photos.
export async function ProAlbumRender({ type }: { type: VendorPageType }) {
    const t = await getTranslations('Vendors');
    const tSamples = await getTranslations('VendorPages.renders.vendors');
    const tTile = await getTranslations('Vendors.sneakPeek');

    return (
        <div className="min-h-full bg-background p-4">
            <RenderSection title={t('me.proTitle')} hint={t('hints.proAlbum')}>
                {/* Meter */}
                <div className="flex flex-col gap-1.5">
                    <span className="text-sm text-ink-muted">{t('meter.value', { used: formatBytes(PRO_USED), total: formatBytes(PRO_TOTAL) })}</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                        <div className="h-full w-[16%] rounded-full bg-ink" />
                    </div>
                </div>

                {/* Upload */}
                <Button variant="outline" size="lg" className="self-start">
                    <Images />
                    {t('me.proChoose')}
                </Button>

                {/* Items */}
                <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
                    {VENDOR_RENDER_PHOTOS.slice(0, 6).map((src, index) => (
                        <li key={src} className="relative aspect-square overflow-hidden rounded-xl bg-surface-muted">
                            <Image src={src} alt={tTile('pickAlt', { index: index + 1 })} fill sizes="80px" className="object-cover" />
                        </li>
                    ))}
                </ul>

                {/* Credit */}
                <p className="m-0 text-sm text-ink-muted">{t(type === 'VIDEOGRAPHER' ? 'credit.video' : 'credit.photo', { name: tSamples(type) })}</p>
            </RenderSection>
        </div>
    );
}

// A sneak peek post in the guests' feed, with a post skeleton under it.
export async function SneakPeekRender({ type }: { type: VendorPageType }) {
    const tTypes = await getTranslations('Vendors.types');
    const tSamples = await getTranslations('VendorPages.renders.vendors');
    const tSneakPeek = await getTranslations('Vendors.sneakPeek');
    const tPreviews = await getTranslations('BusinessPage.previews');
    const photos = VENDOR_RENDER_PHOTOS.slice(0, 4).map((src, index) => ({ src, alt: tSneakPeek('thumbAlt', { index: index + 1 }) }));

    return (
        <div className="min-h-full bg-background">
            {/* Sneak peek */}
            <RenderPost label={<SneakPeekLabel />} author={tSamples(type)} role={tTypes(type)} body={tPreviews('sampleCaption')} photos={photos} />

            {/* Rest of the feed */}
            <div className="p-3">
                <PostSkeleton />
            </div>
        </div>
    );
}

const PRINT_PICKS = [
    { size: '20x30', copies: 2 },
    { size: '13x18', copies: 1 },
    { size: '13x18', copies: 3 },
    { size: '10x15', copies: 2 },
];

// The print order on the photographer's page: the host's picks, the total and the download.
export async function PrintsRender() {
    const t = await getTranslations('Vendors.prints');
    const tHints = await getTranslations('Vendors.hints');
    const tPrint = await getTranslations('GalleryPage.print');

    return (
        <div className="min-h-full bg-background p-4">
            <RenderSection title={t('title')} hint={tHints('prints')}>
                {/* Host picks */}
                <ul className="m-0 list-none divide-y divide-border p-0">
                    {PRINT_PICKS.map(({ size, copies }, index) => (
                        <li key={index} className="flex items-center gap-3 py-2">
                            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                                <Image src={VENDOR_RENDER_PHOTOS[index]} alt={tPrint('picked')} fill sizes="48px" className="object-cover" />
                            </div>
                            <p className="m-0 min-w-0 truncate text-sm text-ink">{`${size} · ${t('copies', { count: copies })}`}</p>
                        </li>
                    ))}
                </ul>

                {/* Total and download */}
                <p className="m-0 text-sm font-semibold text-ink">{tPrint('included', { used: 8, included: 40 })}</p>
                <Button size="lg" className="self-start">
                    <Download />
                    {t('download')}
                </Button>
            </RenderSection>
        </div>
    );
}

// The prints sheet as the host sees it: their picks and how many the package still covers.
export async function IncludedRender({ type }: { type: VendorPageType }) {
    const locale = await getLocale();
    const t = await getTranslations('GalleryPage.print');
    const tSamples = await getTranslations('VendorPages.renders.vendors');
    const price = formatMoney(locale, 250, 'EUR');

    return (
        <div className="flex min-h-full flex-col bg-card">
            <div className="flex-1 px-5 pt-5 pb-3">
                {/* Header */}
                <p className="m-0 text-base font-bold text-ink">{t('sheetTitle')}</p>
                <p className="m-0 mt-3 text-sm text-ink-muted">{t('seenBy', { name: tSamples(type) })}</p>

                {/* Picks */}
                <ul className="m-0 mt-3 list-none divide-y divide-border p-0">
                    {[2, 1, 3].map((copies, index) => (
                        <li key={index} className="flex items-center gap-3 py-2">
                            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                                <Image src={VENDOR_RENDER_PHOTOS[index]} alt={t('picked')} fill sizes="56px" className="object-cover" />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                <span className="inline-flex min-h-10 items-center rounded-lg border border-border bg-background px-2 text-sm">
                                    {t('sizeOption', { label: '13x18', price })}
                                </span>
                                <div className="flex items-center gap-1">
                                    <Button size="icon" variant="outline">
                                        <Minus />
                                    </Button>
                                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{copies}</span>
                                    <Button size="icon" variant="outline">
                                        <Plus />
                                    </Button>
                                </div>
                            </div>
                            <Button size="icon" variant="ghost">
                                <Trash2 />
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Total */}
            <div className="flex flex-col gap-1 border-t border-border px-5 pt-3 pb-5 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="text-ink-muted">{t('includedLabel')}</span>
                    <span className="font-semibold text-ink tabular-nums">{t('includedValue', { used: 4, included: 4 })}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                    <span className="text-ink-muted">{t('beyond', { count: 2 })}</span>
                    <span className="font-semibold text-ink tabular-nums">{formatMoney(locale, 500, 'EUR')}</span>
                </div>
            </div>
        </div>
    );
}
