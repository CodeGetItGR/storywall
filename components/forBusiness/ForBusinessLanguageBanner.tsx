'use client';

import { X } from 'lucide-react';

import { useLanguageBanner } from '@/hooks/useLanguageBanner';
import type { Locale } from '@/i18n/config';

type Props = { pageLocale: Locale; target: Locale; href: string; text: string; link: string; dismiss: string };

// Fixed to the bottom so it never shifts the layout or covers the content.
export function ForBusinessLanguageBanner({ pageLocale, target, href, text, link, dismiss }: Props) {
    const banner = useLanguageBanner(pageLocale, target);
    if (!banner.visible) return null;

    return (
        <div
            lang={target}
            role="region"
            aria-label={text}
            className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-[#151313] px-4 py-3 text-sm text-white shadow-lg"
        >
            {/* Message */}
            <span className="flex-1">{text}</span>
            {/* Actions */}
            <a href={href} onClick={banner.rememberChoice} className="font-semibold text-white underline underline-offset-4">
                {link}
            </a>
            <button
                type="button"
                onClick={banner.dismiss}
                aria-label={dismiss}
                className="flex size-9 items-center justify-center rounded-full hover:bg-white/10"
            >
                <X className="size-4" aria-hidden="true" />
            </button>
        </div>
    );
}
