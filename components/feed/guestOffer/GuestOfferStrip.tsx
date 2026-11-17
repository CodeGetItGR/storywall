'use client';

import { Check, ChevronDown, Copy, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { GuestOfferTicket } from '@/components/feed/guestOffer/GuestOfferTicket';

interface GuestOfferStripProps {
    line: ReactNode;
    ticketLabel: string | null;
    code: string | null;
    isCopied: boolean;
    onCopy: () => void;
    onOpen: () => void;
    onClose: () => void;
}

const ICON_BUTTON =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-white/50 hover:text-ink';

// The offer folded into one row: the ticket, the title and its line (or the guest's code), opened with a tap.
export function GuestOfferStrip({ line, ticketLabel, code, isCopied, onCopy, onOpen, onClose }: GuestOfferStripProps) {
    const t = useTranslations('GuestOffer');

    return (
        <div className="flex items-center gap-1">
            {/* Open */}
            <button type="button" onClick={onOpen} aria-expanded={false} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                <GuestOfferTicket compact label={ticketLabel} />
                <span className="min-w-0 flex-1">
                    {/* Once claimed, the code is what the guest needs, so it gets the code's own label */}
                    <span className="block truncate text-sm leading-snug font-semibold text-ink">{code ? t('codeLabel') : t('title')}</span>
                    {code ? (
                        <code className="block truncate font-mono text-sm font-medium tracking-wider text-ink">{code}</code>
                    ) : (
                        <span className="line-clamp-2 text-[0.8125rem] leading-snug text-ink-muted">{line}</span>
                    )}
                </span>
                <ChevronDown className="h-[18px] w-[18px] shrink-0 text-ink-faint" strokeWidth={1.8} aria-hidden="true" />
            </button>

            {/* Copy */}
            {code && (
                <button type="button" onClick={onCopy} aria-label={isCopied ? t('copied') : t('copy')} className={ICON_BUTTON}>
                    {isCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                </button>
            )}

            {/* Close */}
            <button type="button" onClick={onClose} aria-label={t('close')} className={`${ICON_BUTTON} -mr-1.5`}>
                <X className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            </button>
        </div>
    );
}
