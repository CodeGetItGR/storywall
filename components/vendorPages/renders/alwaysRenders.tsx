import { Globe, Lock, Pencil, Phone } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ComponentType } from 'react';

import { PostSkeleton } from '@/components/feed/PostSkeleton';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RenderPost } from '@/components/vendorPages/renders/RenderPost';
import { VENDOR_RENDER_PHOTOS, VENDOR_RENDER_REACH, VENDOR_RENDER_TAGS } from '@/components/vendorPages/renders/renderSample';
import { RenderReachTiles, RenderSection } from '@/components/vendorPages/renders/RenderSection';
import { InstagramIcon } from '@/components/vendors/InstagramIcon';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import { VendorBanner } from '@/components/vendors/VendorBanner';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import { VendorToolIcon } from '@/components/vendors/VendorToolIcon';
import type { VendorPageType } from '@/i18n/publicLocale';
import { VENDOR_ALWAYS, VENDOR_PAGES, type VendorTool } from '@/lib/vendorPages';
import { formatReachCount } from '@/lib/vendorReach';
import type { VendorActionKey } from '@/lib/vendors';

type RenderProps = { type: VendorPageType };

const LINK_PILL = 'inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink [&_svg]:size-4';

// The guests' list of vendors: the vendor's card, with skeleton cards under it. Same look as VendorListRow, which needs a signed-in event.
async function ListingRender({ type }: RenderProps) {
    const t = await getTranslations('Vendors');
    const tSamples = await getTranslations('VendorPages.renders.vendors');
    const name = tSamples(type);

    return (
        <div className="flex min-h-full flex-col gap-4 bg-background p-4">
            {/* Card */}
            <div className="flex flex-col overflow-hidden rounded-[1.75rem] bg-card shadow-xs ring-1 ring-ink/5">
                <VendorBanner bannerUrl={VENDOR_PAGES[type].heroImage} alt={t('bannerAlt', { name })} sizes="240px" className="aspect-3/1 w-full" />
                <div className="flex flex-col px-4 pb-4">
                    <VendorLogo logoUrl={null} name={name} className="-mt-8 size-16 rounded-[1.1rem] shadow-md ring-4 ring-card" />

                    {/* Name and type */}
                    <p className="m-0 mt-2.5 truncate text-base font-bold text-ink">{name}</p>
                    <p className="m-0 text-sm text-ink-muted">{t(`types.${type}`)}</p>

                    {/* Services */}
                    <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
                        {VENDOR_RENDER_TAGS[type].map((tag) => (
                            <li key={tag} className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-ink">
                                {t(`serviceTags.${tag}`)}
                            </li>
                        ))}
                    </ul>

                    {/* Links */}
                    <div className="flex flex-wrap gap-2 pt-4">
                        <span className={LINK_PILL}>
                            <InstagramIcon className="size-4" />
                            {t('list.instagram')}
                        </span>
                        <span className={LINK_PILL}>
                            <Globe />
                            {t('list.website')}
                        </span>
                        <span className={LINK_PILL}>
                            <Phone />
                            {t('list.call')}
                        </span>
                    </div>
                </div>
            </div>

            {/* More vendors */}
            {[0, 1].map((card) => (
                <div key={card} className="overflow-hidden rounded-[1.75rem] ring-1 ring-ink/5">
                    <Skeleton className="aspect-3/1 w-full rounded-none" />
                    <div className="flex flex-col gap-1.5 px-4 pb-4">
                        <Skeleton className="-mt-8 size-16 rounded-[1.1rem] ring-4 ring-card" />
                        <Skeleton className="mt-1 h-4 w-1/2 rounded-full" />
                        <Skeleton className="h-3 w-1/4 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// The vendor's own post in the feed, with their role next to their name.
async function PostsRender({ type }: RenderProps) {
    const tTypes = await getTranslations('Vendors.types');
    const tSamples = await getTranslations('VendorPages.renders');
    const tSneakPeek = await getTranslations('Vendors.sneakPeek');

    return (
        <div className="min-h-full bg-background">
            {/* Post */}
            <RenderPost
                author={tSamples(`vendors.${type}`)}
                role={tTypes(type)}
                body={tSamples('posts.body')}
                photos={[{ src: VENDOR_RENDER_PHOTOS[1], alt: tSneakPeek('pickAlt', { index: 1 }) }]}
            />

            {/* Rest of the feed */}
            <div className="p-3">
                <PostSkeleton />
            </div>
        </div>
    );
}

// The reach section as every vendor sees it: their two numbers, then the partner numbers locked. Same look as ReachSection.
async function ReachRender() {
    const locale = await getLocale();
    const t = await getTranslations('Vendors');
    const tile = (key: 'guests' | 'listTaps' | 'proViews' | 'reactions' | 'comments' | 'postViewers') => ({
        key,
        label: t(`reach.tiles.${key}`),
        value: formatReachCount(locale, VENDOR_RENDER_REACH[key]),
    });

    return (
        <div className="min-h-full bg-background p-4">
            <RenderSection title={t('reach.title')} hint={t('hints.reach')}>
                {/* Tiles */}
                <RenderReachTiles tiles={[tile('guests'), tile('listTaps')]} />

                {/* Partner numbers */}
                <div className="relative overflow-hidden rounded-lg">
                    <div className="blur-[3px] select-none">
                        <RenderReachTiles tiles={[tile('proViews'), tile('postViewers'), tile('reactions'), tile('comments')]} />
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-radial from-card/90 via-card/55 to-card/10 px-4 text-center">
                        <span className="flex size-9 items-center justify-center rounded-full bg-(image:--logo) shadow-sm">
                            <Lock className="size-4 text-white" />
                        </span>
                        <p className="m-0 text-sm font-semibold text-ink">{t('reach.lockedLabel')}</p>
                        <Button size="lg">{t('partner.become')}</Button>
                    </div>
                </div>
            </RenderSection>
        </div>
    );
}

// A vendor page's tool, by the key its icon and label use. Prints included have no row of their own.
const TOOL_ACTIONS: Partial<Record<VendorTool, VendorActionKey>> = {
    schedule: 'schedule',
    announce: 'announcement',
    rsvpReport: 'rsvpReport',
    shareLinks: 'qr',
    liveRequests: 'liveRequests',
    proAlbum: 'proAlbum',
    sneakPeek: 'sneakPeek',
    prints: 'prints',
};

// The top of "My page": the vendor's cover and details, their tools, then their reach. Same look as VendorMeHero and VendorToolLinks.
async function MyPageRender({ type }: RenderProps) {
    const locale = await getLocale();
    const t = await getTranslations('Vendors');
    const tSamples = await getTranslations('VendorPages.renders.vendors');
    const name = tSamples(type);
    const actions = VENDOR_PAGES[type].tools.flatMap((tool) => TOOL_ACTIONS[tool] ?? []);

    return (
        <div className="min-h-full bg-background p-4">
            {/* Cover */}
            <VendorBanner bannerUrl={VENDOR_PAGES[type].heroImage} alt={t('bannerAlt', { name })} sizes="240px" className="h-36 rounded-[1.75rem]" />

            {/* Identity */}
            <div className="relative -mt-9 flex items-end gap-3 px-3">
                <VendorLogo logoUrl={null} name={name} className="size-18 rounded-[1.25rem] bg-surface-muted shadow-md ring-4 ring-background" />
                <div className="ml-auto pb-1">
                    <Button variant="outline" size="lg" className="bg-card">
                        <Pencil />
                        {t('me.profileEdit')}
                    </Button>
                </div>
            </div>
            <div className="mt-3 px-3">
                <p className="m-0 text-2xl leading-tight font-bold tracking-tight text-ink">{name}</p>
                <p className="m-0 mt-0.5 text-sm text-ink-muted">{t(`types.${type}`)}</p>
            </div>

            {/* Tools */}
            {actions.length > 0 && (
                <div className={`${VENDOR_SECTION_SURFACE} mt-4 p-4`}>
                    <p className="m-0 mb-3 text-base font-semibold text-ink">{t('me.toolsTitle')}</p>
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        {actions.map((action) => (
                            <li key={action} className="flex items-center gap-3">
                                <VendorToolIcon tool={action} />
                                <span className="text-sm font-semibold text-ink">{t(`quickActions.${action}`)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Reach */}
            <div className="mt-4">
                <RenderSection title={t('reach.title')}>
                    <RenderReachTiles
                        tiles={(['guests', 'listTaps'] as const).map((key) => ({
                            key,
                            label: t(`reach.tiles.${key}`),
                            value: formatReachCount(locale, VENDOR_RENDER_REACH[key]),
                        }))}
                    />
                </RenderSection>
            </div>
        </div>
    );
}

// The render in each "every vendor" item's frame.
export const ALWAYS_RENDERS: Record<(typeof VENDOR_ALWAYS)[number], ComponentType<RenderProps>> = {
    listing: ListingRender,
    posts: PostsRender,
    reach: ReachRender,
    myPage: MyPageRender,
};
