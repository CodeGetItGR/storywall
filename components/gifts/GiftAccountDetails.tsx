'use client';

import { Check, Copy, Pencil } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { useCopyText } from '@/hooks/useCopyText';
import type { EventGiftAccountResponseDto } from '@/lib/api/types';
import { formatIban } from '@/lib/giftAccount';

interface GiftAccountDetailsProps {
    account: EventGiftAccountResponseDto;
    onEditAction?: () => void;
}

export function GiftAccountDetails({ account, onEditAction }: GiftAccountDetailsProps) {
    const t = useTranslations('GiftsPage');
    const formattedIban = formatIban(account.iban);
    const { copied, copy } = useCopyText(formattedIban);
    const note = account.note?.trim() || t('accountSubtitle');

    return (
        <div className="flex min-h-[calc(100dvh-9.25rem)] flex-col lg:min-h-[calc(100dvh-4.25rem)]">
            {/* Hero */}
            <section className="flex flex-col items-center px-2 pt-4 text-center">
                <Image src="/icons/present.svg" alt="" width={80} height={80} preload className="h-20 w-20" unoptimized />
                <p className="mt-3 w-full text-base leading-6 whitespace-pre-line text-ink-muted">{note}</p>
            </section>

            {/* Bank details */}
            <section className="relative mt-3 border-t border-border/70 pt-4 pb-2 text-center">
                {onEditAction && (
                    <button
                        type="button"
                        onClick={onEditAction}
                        aria-label={t('edit')}
                        title={t('edit')}
                        className="absolute top-2 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                    >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
                <div className="space-y-3">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.16em] text-ink-faint uppercase">{t('fields.bankName')}</p>
                        <p className="mt-1 text-xl leading-6 font-semibold text-ink">{account.bankName}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold tracking-[0.16em] text-ink-faint uppercase">{t('fields.accountHolder')}</p>
                        <p className="mt-1 text-base leading-6 font-semibold text-ink">{account.accountHolder}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold tracking-[0.12em] text-ink-faint uppercase">{t('fields.iban')}</p>
                        <p className="text-md mt-1.5 font-mono leading-7 font-semibold tracking-widest break-all text-ink">{formattedIban}</p>
                    </div>
                    <button
                        type="button"
                        onClick={copy}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-muted px-4 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-muted/80"
                    >
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        {copied ? t('copied') : t('copyIban')}
                    </button>
                </div>
            </section>
        </div>
    );
}
