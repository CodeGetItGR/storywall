import { ArrowLeft, Bed, Car, CheckCircle2, Globe, MapPin, Phone, Utensils, Wifi } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { routes } from '@/lib/routes';

const amenities = [
    { icon: Car, key: 'parking' },
    { icon: Bed, key: 'accommodation' },
    { icon: Utensils, key: 'catering' },
    { icon: Wifi, key: 'wifi' },
    { icon: CheckCircle2, key: 'accessible' },
    { icon: MapPin, key: 'shuttle' },
] as const;

const galleryImages = [
    { src: '/images/venue.png', key: 'mainLawn' },
    { src: '/images/couple-hero.png', key: 'vineyard' },
    { src: '/images/post-florals.png', key: 'roseGarden' },
    { src: '/images/post-cake.png', key: 'pavilion' },
] as const;

export default function VenuePage() {
    const t = useTranslations('VenuePage');

    return (
        <div className="max-w-2xl mx-auto pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4">
                <Link
                    href={routes.tools.root}
                    aria-label={t('backToTools')}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-sky-500" />
                    <h1 className="text-base font-bold text-ink">{t('title')}</h1>
                </div>
            </div>

            {/* Hero image */}
            <div className="relative w-full aspect-video bg-surface-muted overflow-hidden">
                <Image
                    src="/images/venue.png"
                    alt={t('heroImageAlt')}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 672px"
                    priority
                    loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 text-white">
                    <h2 className="text-2xl font-bold leading-tight">{t('venueName')}</h2>
                    <p className="text-sm opacity-80 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        {t('venueRegion')}
                    </p>
                </div>
            </div>

            <div className="px-4 pt-5 flex flex-col gap-6">
                {/* About */}
                <div>
                    <h3 className="text-sm font-bold text-ink mb-2">{t('aboutTheVenue')}</h3>
                    <p className="text-sm text-ink-muted leading-relaxed">{t('aboutText')}</p>
                </div>

                {/* Contact info */}
                <div className="bg-surface-muted rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center flex-shrink-0 shadow-sm">
                            <MapPin className="w-4 h-4 text-sky-500" />
                        </div>
                        <div>
                            <p className="text-xs text-ink-muted">{t('address')}</p>
                            <p className="text-sm font-medium text-ink">{t('addressValue')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Phone className="w-4 h-4 text-sky-500" />
                        </div>
                        <div>
                            <p className="text-xs text-ink-muted">{t('phone')}</p>
                            <p className="text-sm font-medium text-ink">(707) 555-0192</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Globe className="w-4 h-4 text-sky-500" />
                        </div>
                        <div>
                            <p className="text-xs text-ink-muted">{t('website')}</p>
                            <a href="#" className="text-sm font-medium text-primary hover:underline">
                                www.rosewood-estate.com
                            </a>
                        </div>
                    </div>
                </div>

                {/* Map placeholder */}
                <div>
                    <h3 className="text-sm font-bold text-ink mb-2">{t('gettingThere')}</h3>
                    <div className="w-full rounded-2xl overflow-hidden bg-surface-muted aspect-[16/9] relative flex items-center justify-center border border-border">
                        <div className="text-center">
                            <MapPin className="w-8 h-8 text-ink-faint mx-auto mb-2" />
                            <p className="text-sm text-ink-muted font-medium">{t('venueName')}</p>
                            <p className="text-xs text-ink-faint">{t('venueRegion')}</p>
                        </div>
                        <div className="absolute bottom-3 right-3">
                            <a
                                href="https://maps.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-full bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition-colors"
                            >
                                {t('openInMaps')}
                            </a>
                        </div>
                    </div>
                    <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                        <strong>{t('byCarLabel')}</strong> {t('byCarText')}
                        <br />
                        <strong>{t('shuttleLabel')}</strong> {t('shuttleText')}
                    </p>
                </div>

                {/* Amenities */}
                <div>
                    <h3 className="text-sm font-bold text-ink mb-3">{t('amenities')}</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {amenities.map(({ icon: Icon, key }) => (
                            <div key={key} className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-sky-500" />
                                </div>
                                <p className="text-sm text-ink-muted">{t(`amenityLabels.${key}`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Photo gallery */}
                <div>
                    <h3 className="text-sm font-bold text-ink mb-3">{t('gallery')}</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {galleryImages.map((img) => (
                            <div key={img.src} className="relative aspect-square rounded-2xl overflow-hidden bg-surface-muted">
                                <Image
                                    src={img.src}
                                    alt={t(`galleryAlts.${img.key}`)}
                                    fill
                                    className="object-cover hover:scale-105 transition-transform duration-300"
                                    sizes="(max-width: 640px) 50vw, 300px"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
