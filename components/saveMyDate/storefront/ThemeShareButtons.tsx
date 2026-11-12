'use client';

import { Check, Link2, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { useThemeShare } from '@/hooks/useThemeShare';

type ThemeShareButtonsProps = { url: string; text: string };

const BUTTON = 'grid size-11 place-items-center rounded-full text-white focus-ring transition-transform hover:-translate-y-0.5 motion-reduce:transition-none';

// Share the theme page in an app, by email, or by copying its link.
export function ThemeShareButtons({ url, text }: ThemeShareButtonsProps) {
    const t = useTranslations('SaveMyDateStorefront.theme');
    const { links, copied, copyLink } = useThemeShare(url, text);

    return (
        <div aria-label={t('share')} className="flex flex-wrap gap-2" role="group">
            <ShareLink className="bg-[linear-gradient(135deg,#00b2ff,#a033ff_60%,#ff5c87)]" href={links.messenger} label={t('shareMessenger')}>
                <MessengerIcon />
            </ShareLink>
            <ShareLink className="bg-[#25d366]" href={links.whatsapp} label={t('shareWhatsApp')}>
                <WhatsAppIcon />
            </ShareLink>
            <ShareLink className="bg-[#7360f2]" href={links.viber} label={t('shareViber')}>
                <ViberIcon />
            </ShareLink>
            <ShareLink className="bg-[#4b4646]" href={links.email} label={t('shareEmail')}>
                <Mail aria-hidden className="size-4.5" />
            </ShareLink>
            <button aria-label={t('copyLink')} className={`${BUTTON} bg-[#151313]`} title={t('copyLink')} type="button" onClick={copyLink}>
                {copied ? <Check aria-hidden className="size-4.5" /> : <Link2 aria-hidden className="size-4.5" />}
            </button>
            <span aria-live="polite" className="sr-only">
                {copied ? t('linkCopied') : ''}
            </span>
        </div>
    );
}

type ShareLinkProps = { className: string; href: string; label: string; children: ReactNode };

function ShareLink({ className, href, label, children }: ShareLinkProps) {
    return (
        <a aria-label={label} className={`${BUTTON} ${className}`} href={href} rel="noopener noreferrer" target="_blank" title={label}>
            {children}
        </a>
    );
}

// The apps' marks, drawn inline: lucide has none of them.
function MessengerIcon() {
    return (
        <svg aria-hidden className="size-4.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.5 2 2 6.15 2 11.5c0 2.9 1.34 5.49 3.5 7.26V22l3.2-1.76c.85.24 1.76.36 2.7.36 5.5 0 10-4.15 10-9.5S17.5 2 12 2Zm1.06 12.8-2.55-2.72-4.98 2.72 5.48-5.8 2.61 2.72 4.92-2.72-5.48 5.8Z" />
        </svg>
    );
}

function WhatsAppIcon() {
    return (
        <svg aria-hidden className="size-4.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.08-1.33A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm0 18a8 8 0 0 1-4.07-1.11l-.29-.17-3.02.79.81-2.94-.19-.3A8 8 0 1 1 12 20Zm4.38-5.98c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.17-.7-.63-1.18-1.4-1.31-1.64-.14-.24-.01-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.15-.06-.1-.22-.16-.46-.28Z" />
        </svg>
    );
}

function ViberIcon() {
    return (
        <svg aria-hidden className="size-4.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.1 2C7 2 3 5.6 3 10.2c0 2.65 1.35 5 3.48 6.55-.12.98-.42 2.5-.98 3.85 0 0 1.94-.55 3.68-1.7.94.28 1.94.43 2.92.43 5.1 0 9.1-3.6 9.1-8.2 0-4.6-4-8.13-9.1-8.13Zm3.94 11.3c-.16.32-.9.9-1.24.94-.32.05-.6.17-2.02-.42-1.7-.7-2.8-2.4-2.9-2.5-.08-.1-.7-.94-.7-1.8s.46-1.28.63-1.45c.16-.17.36-.2.48-.2h.35c.1 0 .27-.02.4.32.16.4.55 1.4.6 1.5.05.1.08.22.02.35-.06.13-.1.2-.2.32-.1.12-.2.27-.3.36-.1.1-.2.2-.08.4.12.2.53.9 1.14 1.46.78.72 1.44.94 1.65 1.05.2.1.32.08.44-.04.13-.13.5-.58.63-.78.13-.2.26-.16.44-.1.18.07 1.12.53 1.32.63.2.1.33.15.38.24.05.1.05.5-.11.82Z" />
        </svg>
    );
}
