'use client';

import { Images, Lock, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { QrCodeCard } from '@/components/manage/invitations/QrCodeCard';
import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { useGalleryQrScreen } from '@/hooks/useGalleryQrScreen';
import { routes } from '@/lib/routes';

export function GalleryQrScreen() {
    const t = useTranslations('GalleryQrPage');
    const router = useRouter();
    const { eventId, featureEnabled, isLoading, qrLink } = useGalleryQrScreen();

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
                <LoadingState size="md" className="min-h-[40vh]" />
            ) : qrLink ? (
                <div className="flex flex-col items-center">
                    {qrLink.status !== 'ACTIVE' && (
                        <ModuleNotice tone="warning">
                            {t(qrLink.status === 'TARGET_UNAVAILABLE' ? 'temporarilyOff' : 'linkUnavailable')}
                        </ModuleNotice>
                    )}
                    <div className="w-full max-w-xs">
                        <QrCodeCard qrLink={qrLink} size={280} />
                    </div>
                    <p className="mt-5 flex items-center gap-1.5 text-center text-xs leading-relaxed text-ink-faint">
                        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
