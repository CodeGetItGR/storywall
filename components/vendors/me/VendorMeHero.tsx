'use client';

import { Clock, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { Button } from '@/components/ui/button';
import { VendorBanner } from '@/components/vendors/VendorBanner';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { MediaResponseDto, PartnerRole, VendorProfileDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// The top of the vendor page: the vendor's banner, else their own photos as a mosaic, then who they are, the edit action for their
// details, and their access in this event (the date the tools stop, or why they are off). Without photos (no Pro
// album, or nothing uploaded yet) the mosaic is a plain backdrop.
export function VendorMeHero({
    profile,
    vendorType,
    photos,
    accessLine,
    toolsOffLine,
    onEditAction,
}: {
    profile: VendorProfileDto | null;
    vendorType: PartnerRole;
    photos: MediaResponseDto[];
    accessLine: string | null;
    toolsOffLine: string | null;
    onEditAction: () => void;
}) {
    const t = useTranslations('Vendors');

    return (
        <section aria-labelledby="vendor-details-title">
            {/* Cover: their banner, else their photos */}
            {profile?.bannerUrl ? (
                <div className="relative">
                    <VendorBanner
                        bannerUrl={profile.bannerUrl}
                        alt={t('bannerAlt', { name: profile.businessName })}
                        sizes="(min-width: 672px) 672px, 100vw"
                        className="h-44 rounded-[1.75rem] sm:h-56"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-[1.75rem] bg-linear-to-t from-event/80 to-transparent" />
                </div>
            ) : (
                <PhotoMosaic photos={photos} />
            )}

            {/* Identity */}
            <div className="relative -mt-9 flex items-end gap-3 px-3">
                <VendorLogo
                    logoUrl={profile?.logoUrl ?? null}
                    name={profile?.businessName ?? t('me.profileMissing')}
                    className="size-18 rounded-[1.25rem] bg-surface-muted shadow-md ring-4 ring-event"
                />
                <div className="ml-auto pb-1">
                    <Button type="button" variant="outline" size="lg" className="bg-card" onClick={onEditAction}>
                        <Pencil aria-hidden="true" />
                        {profile ? t('me.profileEdit') : t('me.profileAdd')}
                    </Button>
                </div>
            </div>
            <div className="mt-3 px-3">
                <h2 id="vendor-details-title" className="text-2xl leading-tight font-bold tracking-tight text-ink">
                    {profile?.businessName ?? t('me.profileMissing')}
                </h2>
                <p className="mt-0.5 text-sm text-ink-muted">{t(`types.${vendorType}`)}</p>
                {profile?.link && <p className="truncate text-sm text-ink-muted">{profile.link}</p>}
            </div>

            {/* Access */}
            <div className="mt-4 px-3">
                {toolsOffLine ? (
                    <p className="rounded-lg bg-surface-muted px-4 py-3 text-sm text-ink">{toolsOffLine}</p>
                ) : (
                    accessLine && (
                        <p className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-sm text-ink">
                            <Clock className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                            {accessLine}
                        </p>
                    )
                )}
            </div>
        </section>
    );
}

// Up to five photos: one large on the left, the rest stacked on the right. The bottom fades into the page.
function PhotoMosaic({ photos }: { photos: MediaResponseDto[] }) {
    const t = useTranslations('Vendors.me');
    const [first, ...rest] = photos;
    const side = rest.slice(0, 4);

    return (
        <div className={cn('relative overflow-hidden rounded-[1.75rem] bg-surface-muted', first ? 'h-44 sm:h-56' : 'h-28')}>
            {/* Backdrop without photos */}
            {!first && <div className="absolute inset-0 bg-(image:--logo) opacity-30" />}

            {/* Photos */}
            {first && (
                <div className={cn('grid h-full gap-1', side.length > 0 ? 'grid-cols-[3fr_2fr]' : 'grid-cols-1')}>
                    <MosaicTile photo={first} alt={t('heroPhotoAlt', { index: 1 })} sizes="(min-width: 640px) 380px, 60vw" />
                    {side.length > 0 && (
                        <div className={cn('grid gap-1', side.length > 2 ? 'grid-cols-2' : 'grid-cols-1', side.length > 1 && 'grid-rows-2')}>
                            {side.map((photo, index) => (
                                <MosaicTile
                                    key={photo.id}
                                    photo={photo}
                                    alt={t('heroPhotoAlt', { index: index + 2 })}
                                    sizes="(min-width: 640px) 130px, 20vw"
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Fade */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-event/80 to-transparent" />
        </div>
    );
}

function MosaicTile({ photo, alt, sizes }: { photo: MediaResponseDto; alt: string; sizes: string }) {
    const src = photo.thumbnailUrl ?? photo.mediaUrl;

    return (
        <div className="relative min-h-0 overflow-hidden">
            {src && <ProtectedImage src={src} alt={alt} fill sizes={sizes} className="object-cover" />}
        </div>
    );
}
