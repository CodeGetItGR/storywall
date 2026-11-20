import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { QR_INTRO_FADE_MS, QR_INTRO_MS } from '@/hooks/useQrIntro';
import { cn } from '@/lib/utils';

interface QrIntroOverlayProps {
    isLeaving: boolean;
    progressStarted: boolean;
    onDismiss: () => void;
}

// What a scanned code's page offers, shown over it for a few seconds. A tap anywhere closes it.
export function QrIntroOverlay({ isLeaving, progressStarted, onDismiss }: QrIntroOverlayProps) {
    const t = useTranslations('QrCodePage');
    const icons = [
        { src: '/icons/balloon.svg', alt: t('choices.join') },
        { src: '/icons/camera.svg', alt: t('guestCode.uploadButton') },
        { src: '/icons/wishbook.svg', alt: t('guestCode.wishButton') },
    ];

    return (
        <button
            type="button"
            onClick={onDismiss}
            style={{ transitionDuration: `${QR_INTRO_FADE_MS}ms` }}
            className={cn(
                'fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-8 transition-opacity motion-reduce:transition-none',
                isLeaving ? 'pointer-events-none opacity-0' : 'opacity-100',
            )}
        >
            {/* Card */}
            <span className="flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl bg-background px-6 pt-7 pb-6 text-center shadow-xl">
                {/* Icons */}
                <span className="flex items-center gap-5">
                    {icons.map((icon) => (
                        <Image key={icon.src} src={icon.src} alt={icon.alt} width={32} height={32} className="h-8 w-8 object-contain" unoptimized />
                    ))}
                </span>

                {/* Text */}
                <span className="flex flex-col gap-1">
                    <span className="text-[17px] leading-snug font-semibold text-balance text-ink">{t('intro.title')}</span>
                    <span className="text-sm text-ink-muted">{t('intro.line')}</span>
                </span>

                {/* Time left */}
                <span aria-hidden="true" className="h-1 w-24 overflow-hidden rounded-full bg-surface-muted motion-reduce:hidden">
                    <span
                        className="block h-full rounded-full bg-gradient-brand transition-[width] ease-linear"
                        style={{ width: progressStarted ? '100%' : '0%', transitionDuration: `${QR_INTRO_MS}ms` }}
                    />
                </span>
            </span>
        </button>
    );
}
