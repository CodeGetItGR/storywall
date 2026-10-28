'use client';

import { ArrowRight, Images, Lock, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { GalleryQrCodeSkeleton } from '@/components/gallery/GallerySkeletons';
import { QrCodeCard } from '@/components/manage/invitations/QrCodeCard';
import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { AppLink } from '@/components/ui/AppLink';
import { useGalleryQrScreen } from '@/hooks/useGalleryQrScreen';
import { routes } from '@/lib/routes';

export function GalleryQrScreen() {
    const t = useTranslations('GalleryQrPage');
    const router = useRouter();
    const tDemo = useTranslations('Demo');
    const { demoUploadHref, eventId, featureEnabled, isLoading, qrLink } = useGalleryQrScreen();

    // The gallery QR feature is a plan/event-type setting, not something a host
    // can turn back on — treat a disabled feature the same as a page that
    // doesn't exist, same as FeedPageBoundary does for a missing event.
    useEffect(() => {
        if (!featureEnabled) router.replace(routes.eventNotFound);
    }, [featureEnabled, router]);

    if (!featureEnabled) return null;

    return (
        <ModulePageShell
            maxWidth="xl"
            title={t('title')}
            icon={QrCode}
            backLabel={t('back')}
            backHref={routes.events.feed(eventId)}
            subtitle={t('subtitle')}
        >
            {isLoading ? (
                <GalleryQrCodeSkeleton />
            ) : qrLink ? (
                <div className="flex flex-col items-center">
                    {qrLink.status !== 'ACTIVE' && (
                        <ModuleNotice tone="warning">{t(qrLink.status === 'TARGET_UNAVAILABLE' ? 'temporarilyOff' : 'linkUnavailable')}</ModuleNotice>
                    )}
                    <div className="w-full max-w-xs">
                        <QrCodeCard qrLink={qrLink} size={280} />

                        {/* Demo upload */}
                        {demoUploadHref && qrLink.status === 'ACTIVE' && (
                            <AppLink
                                href={demoUploadHref}
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                            >
                                {tDemo('tryUpload')}
                                <ArrowRight className="h-4 w-4" />
                            </AppLink>
                        )}
                    </div>
                    <p className="mt-5 text-center text-xs leading-relaxed text-ink-faint">
                        <Lock className="mr-1.5 inline-block h-3.5 w-3.5 align-[-0.2em]" aria-hidden="true" />
                        {t('permanentNote')}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-muted/60 px-6 py-10 text-center">
                    <Images className="h-8 w-8 text-ink-faint" aria-hidden="true" />
                    <p className="text-sm leading-relaxed text-ink-muted">{t('missing.body')}</p>
                </div>
            )}
        </ModulePageShell>
    );
}
