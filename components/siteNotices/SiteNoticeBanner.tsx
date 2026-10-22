'use client';

import { CircleAlert, Info, type LucideIcon, Tag, TriangleAlert, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { SiteNoticeTone } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Dark bar with amber text for problems (the outage look), calmer brand tones for the rest.
// No design token pairs dark with amber, so those two hexes are literal (9.9:1 contrast).
// OFFER uses ink text: text-primary-dark on primary-light is only 3.1:1.
const TONE_STYLE: Record<SiteNoticeTone, { className: string; iconClassName: string; icon: LucideIcon }> = {
    CRITICAL: { className: 'bg-[#1d1813] text-[#f5b84a]', iconClassName: '', icon: CircleAlert },
    WARNING: { className: 'bg-[#1d1813] text-[#f5b84a]', iconClassName: '', icon: TriangleAlert },
    OFFER: { className: 'bg-primary-light text-ink', iconClassName: 'text-primary-dark', icon: Tag },
    INFO: { className: 'bg-surface-muted text-ink', iconClassName: 'text-ink-muted', icon: Info },
};

function isExternal(href: string) {
    return /^https:\/\//i.test(href);
}

// Spring already checks links; this keeps any other scheme out of the href if one slips through.
function isSitePath(href: string) {
    return href.startsWith('/') && !href.startsWith('//') && !href.includes('\\');
}

// One notice line. Presentational: the admin drawer's preview renders it too.
// It never sets a z-index, so story and slideshow overlays cover it.
export function SiteNoticeBanner({
    tone,
    message,
    link,
    onDismiss,
}: {
    tone: SiteNoticeTone;
    message: string;
    link: { href: string; label: string } | null;
    onDismiss: (() => void) | null;
}) {
    const t = useTranslations('SiteNotice');
    const { className, iconClassName, icon: Icon } = TONE_STYLE[tone];
    const urgent = tone === 'WARNING' || tone === 'CRITICAL';

    return (
        <div role={urgent ? 'alert' : 'status'} className={cn('flex items-center gap-2 px-4 py-2 text-[13px] leading-5', className)}>
            {/* Message */}
            <p className="flex min-w-0 flex-1 items-start justify-center gap-2 text-center sm:items-center">
                <Icon aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0 sm:mt-0', iconClassName)} />
                <span className="min-w-0">
                    {message}
                    {link && (
                        <>
                            {' '}
                            {isExternal(link.href) ? (
                                <a href={link.href} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
                                    {link.label}
                                </a>
                            ) : isSitePath(link.href) ? (
                                <AppLink href={link.href} className="font-semibold underline underline-offset-2">
                                    {link.label}
                                </AppLink>
                            ) : null}
                        </>
                    )}
                </span>
            </p>
            {/* Close */}
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label={t('close')}
                    className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md opacity-80 transition-opacity hover:opacity-100"
                >
                    <X aria-hidden="true" className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
