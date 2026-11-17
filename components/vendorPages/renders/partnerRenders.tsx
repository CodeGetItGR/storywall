import { ChevronRight, Plus } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ComponentType } from 'react';

import { PartnerFeatureCard } from '@/components/feed/partner/PartnerFeatureCard';
import { PostSkeleton } from '@/components/feed/PostSkeleton';
import { Button } from '@/components/ui/button';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { VENDOR_RENDER_DATE, VENDOR_RENDER_REACH } from '@/components/vendorPages/renders/renderSample';
import { RenderReachTiles, RenderSection } from '@/components/vendorPages/renders/RenderSection';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { VendorPageType } from '@/i18n/publicLocale';
import { formatMoney } from '@/lib/billing';
import { formatDate } from '@/lib/datetime';
import { VENDOR_PAGES, type VendorPartnerPerk } from '@/lib/vendorPages';
import { formatReachCount } from '@/lib/vendorReach';
import { SAMPLE_PRINT_SIZES } from '@/lib/vendors';

type RenderProps = { type: VendorPageType };

const DISCOUNT_CODE = 'STORY10';
const PRICE = 20000;
const DISCOUNT = 2000;

// The customer's checkout with the partner's code applied. Same look as EventOverviewStep and EventOverviewDiscountCode.
async function DiscountRender() {
    const locale = await getLocale();
    const t = await getTranslations('CreateEventPage');
    const tOccasion = await getTranslations('OccasionPages.WEDDING');

    return (
        <div className="min-h-full bg-background p-4">
            {/* Price */}
            <div className={`${VENDOR_SECTION_SURFACE} p-4 text-sm`}>
                <div className="flex items-center justify-between gap-3 pb-3">
                    <span className="font-semibold text-ink">{tOccasion('name')}</span>
                    <span className="font-semibold text-ink tabular-nums">{formatMoney(locale, PRICE, 'EUR')}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/70 py-3">
                    <div className="min-w-0">
                        <p className="m-0 font-semibold text-ink">{t('overview.discount')}</p>
                        <p className="m-0 mt-0.5 text-xs text-ink-muted">{t('overview.discountDetail', { label: DISCOUNT_CODE, percent: 10 })}</p>
                    </div>
                    <span className="shrink-0 font-semibold text-emerald-700 tabular-nums">{`-${formatMoney(locale, DISCOUNT, 'EUR')}`}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                    <span className="font-semibold text-ink">{t('overview.dueNow')}</span>
                    <span className="shrink-0 text-lg font-bold text-primary-dark tabular-nums">{formatMoney(locale, PRICE - DISCOUNT, 'EUR')}</span>
                </div>
            </div>

            {/* Code */}
            <p className="m-0 mt-6 text-[11px] font-semibold tracking-wide text-ink-faint uppercase">{t('collaboration.title')}</p>
            <div className="mt-3 flex flex-col gap-2">
                <span className="flex min-h-11 items-center rounded-full border border-border bg-surface-muted px-4 text-sm font-semibold text-ink-muted">{DISCOUNT_CODE}</span>
                <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-card px-5 text-sm font-semibold text-ink opacity-40 shadow-sm ring-1 ring-border">
                    {t('collaboration.apply')}
                </span>
            </div>
            <p className="m-0 mt-3 text-sm font-semibold text-emerald-700">{t('collaboration.applied', { discount: 10 })}</p>
        </div>
    );
}

// The partner's card in the guests' feed, between post skeletons. This is the real feed card.
async function FeedCardRender({ type }: RenderProps) {
    const tCard = await getTranslations('PartnerCard');
    const tSamples = await getTranslations('VendorPages.renders');

    return (
        <div className="flex min-h-full flex-col gap-3 bg-background">
            {/* Feed above */}
            <div className="px-3 pt-3">
                <PostSkeleton />
            </div>

            {/* Card */}
            <PartnerFeatureCard
                coverSizes="240px"
                content={{
                    href: null,
                    name: tSamples(`vendors.${type}`),
                    roleLabel: tCard(`roles.${type}`),
                    partnerLabel: tCard('partner'),
                    tagline: tSamples('feedCard.tagline'),
                    services: '',
                    logoUrl: null,
                    coverUrl: VENDOR_PAGES[type].heroImage,
                    newTabLabel: tCard('newTab'),
                    visitLabel: tCard('visit'),
                }}
            />

            {/* Feed below */}
            <div className="px-3 pb-3">
                <PostSkeleton />
            </div>
        </div>
    );
}

const FULL_REACH_TILES = ['guests', 'proViewers', 'proViews', 'postViewers', 'reactions', 'comments', 'listTaps', 'partnerCardTaps'] as const;

// The reach section as a partner sees it: every number. Same look as ReachSection.
async function FullReachRender() {
    const locale = await getLocale();
    const t = await getTranslations('Vendors');

    return (
        <div className="min-h-full bg-background p-4">
            <RenderSection title={t('reach.title')} hint={t('hints.reach')}>
                <RenderReachTiles
                    tiles={FULL_REACH_TILES.map((key) => ({
                        key,
                        label: t(`reach.tiles.${key}`),
                        value: formatReachCount(locale, VENDOR_RENDER_REACH[key]),
                    }))}
                />
            </RenderSection>
        </div>
    );
}

// The photographer's print prices. Same look as ServicesSection.
async function PrintPricesRender() {
    const locale = await getLocale();
    const t = await getTranslations('Vendors.services');
    const tHints = await getTranslations('Vendors.hints');

    return (
        <div className="min-h-full bg-background p-4">
            <RenderSection
                title={t('title')}
                hint={tHints('printPrices')}
                action={
                    <Button variant="outline" size="lg">
                        <Plus />
                        {t('add')}
                    </Button>
                }
            >
                {/* Sizes */}
                <ul className="m-0 list-none divide-y divide-border p-0">
                    {SAMPLE_PRINT_SIZES.map(({ label, priceCents }) => (
                        <li key={label} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
                            <span className="truncate text-ink">{label}</span>
                            <span className="flex shrink-0 items-center gap-2 text-ink-muted tabular-nums">
                                {formatMoney(locale, priceCents, 'EUR')}
                                <ChevronRight className="size-4" />
                            </span>
                        </li>
                    ))}
                </ul>
            </RenderSection>
        </div>
    );
}

const PORTAL_EVENTS = [
    { guests: 148, views: 1240 },
    { guests: 96, views: 610 },
    { guests: 64, views: 275 },
];

// "My business" as a partner sees it: earnings, commission, numbers and events. Same look as BusinessScreen.
async function PortalRender({ type }: RenderProps) {
    const locale = await getLocale();
    const tBusiness = await getTranslations('BusinessPage');
    const tVendors = await getTranslations('Vendors');
    const tPortal = await getTranslations('PartnerPortalPage');
    const tRsvp = await getTranslations('VendorPages.renders.rsvp');
    const tSamples = await getTranslations('VendorPages.renders');
    const name = tSamples(`vendors.${type}`);
    const titles = [tRsvp('couple'), ...(tSamples.raw('portal.events') as string[])];
    const date = formatDate(locale, `${VENDOR_RENDER_DATE}T00:00:00`, { dateStyle: 'medium' });
    const money = (minor: number) => formatMoney(locale, minor, 'EUR');

    return (
        <div className="flex min-h-full flex-col gap-4 bg-background p-4">
            {/* Top card */}
            <div className={`${VENDOR_SECTION_SURFACE} relative overflow-hidden p-5`}>
                <div className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-primary/10 blur-3xl" />

                {/* Identity */}
                <div className="relative flex items-center gap-3.5">
                    <VendorLogo logoUrl={null} name={name} className="size-12" />
                    <div className="min-w-0 flex-1">
                        <p className="m-0 line-clamp-2 text-xl leading-tight font-bold tracking-tight break-words text-ink">{name}</p>
                        <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                            <span>{tVendors(`types.${type}`)}</span>
                            <span className="rounded-full bg-status-good-wash px-2 py-0.5 text-xs font-semibold text-status-good">{tBusiness('partnerPill')}</span>
                        </p>
                    </div>
                </div>

                {/* Earnings */}
                <div className="relative mt-5 border-t border-border pt-5">
                    <p className="m-0 text-xs font-semibold tracking-wide text-ink-muted uppercase">{tPortal('totals.title')}</p>
                    <p className="m-0 mt-1 text-4xl font-extrabold tracking-tight text-ink tabular-nums">{money(18000)}</p>
                    <p className="m-0 mt-1 text-sm text-ink-muted tabular-nums">{tPortal('totals.earnedPaid', { earned: money(42000), paid: money(24000) })}</p>
                </div>
            </div>

            {/* Numbers */}
            <RenderSection title={tBusiness('insights.title')}>
                <MetricStrip
                    className="sm:grid-cols-2"
                    wrapLabels
                    items={[
                        { key: 'events', label: tBusiness('insights.events'), value: formatReachCount(locale, 3) },
                        { key: 'guests', label: tBusiness('insights.guests'), value: formatReachCount(locale, 308) },
                        { key: 'proViews', label: tBusiness('insights.proViews'), value: formatReachCount(locale, 2125) },
                        { key: 'cardTaps', label: tBusiness('insights.cardTaps'), value: formatReachCount(locale, 57) },
                    ]}
                />
            </RenderSection>

            {/* Events */}
            <RenderSection title={tBusiness('events.title')}>
                <ul className="-my-3 m-0 list-none divide-y divide-border p-0">
                    {PORTAL_EVENTS.map(({ guests, views }, index) => (
                        <li key={titles[index]} className="flex min-h-14 items-center gap-3 py-3">
                            <div className="min-w-0 flex-1">
                                <p className="m-0 truncate text-sm font-semibold text-ink">{titles[index]}</p>
                                <p className="m-0 text-xs leading-snug text-ink-muted">{`${date} · ${tBusiness('events.rowGuests', { count: guests })}`}</p>
                            </div>
                            <p className="m-0 shrink-0 text-sm font-semibold text-ink tabular-nums">{tBusiness('events.rowViews', { count: views })}</p>
                        </li>
                    ))}
                </ul>
            </RenderSection>
        </div>
    );
}

// The render in each partner item's frame.
export const PARTNER_RENDERS: Record<VendorPartnerPerk, ComponentType<RenderProps>> = {
    discount: DiscountRender,
    feedCard: FeedCardRender,
    fullReach: FullReachRender,
    printPrices: PrintPricesRender,
    portal: PortalRender,
};
