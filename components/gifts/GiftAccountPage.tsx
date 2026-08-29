'use client';

import { Check, Copy } from 'lucide-react';
import { Gift } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useGiftAccount } from '@/hooks/useGiftAccount';
import { giftAccountSetupHref } from '@/lib/manageSectionTargets';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

function formatIban(value: string) {
    return value
        .replace(/\s/g, '')
        .replace(/(.{4})/g, '$1 ')
        .trim();
}

export function GiftAccountPage() {
    const t = useTranslations('GiftsPage');
    const event = useActiveEvent();
    const isHost = useIsHost();
    const account = useGiftAccount(event?.id ?? null);
    const [copied, setCopied] = useState(false);

    const title = t('accountTitle');
    const note = account.data?.note?.trim() || t('accountSubtitle');
    const formattedIban = account.data ? formatIban(account.data.iban) : '';

    async function copyIban() {
        if (!account.data) return;
        await navigator.clipboard.writeText(formattedIban);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }

    // Header
    return (
        <ModulePageShell
            maxWidth="xl"
            title={title}
            icon={Gift}
            iconClassName="text-rose-500"
            showTitleIcon={false}
            backLabel={t('goBack')}
            backHref={routes.events.feed(event?.id ?? '')}
            className="pb-0 lg:pb-0"
        >
            {!account.isLoading && !account.error && account.data && (
                <div className="flex min-h-[calc(100dvh-9.25rem)] flex-col justify-between lg:min-h-[calc(100dvh-4.25rem)]">
                    {/* Hero */}
                    <section className="flex flex-col items-center px-2 pt-4 text-center">
                        <Image src="/icons/present.svg" alt="" width={80} height={80} priority className="h-20 w-20" unoptimized />
                        <div className="mt-3 w-full text-center">
                            <p className="text-base leading-6 whitespace-pre-line text-ink-muted">{note}</p>
                        </div>
                    </section>

                    {/* Bank details */}
                    <section
                        className={cn('border-t border-border/70 pt-4 pb-2 text-center', {
                            'mt-3': !!note,
                        })}
                    >
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">{t('fields.bankName')}</p>
                                <p className="mt-1 text-xl leading-6 font-semibold text-ink">{account.data.bankName}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">{t('fields.accountHolder')}</p>
                                <p className="mt-1 text-base leading-6 font-semibold text-ink">{account.data.accountHolder}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{t('fields.iban')}</p>
                                <p className="mt-1.5 break-all font-mono text-xl leading-7 font-semibold tracking-[0.1em] text-ink">
                                    {formattedIban}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={copyIban}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-muted px-4 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-muted/80"
                            >
                                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                {copied ? t('copied') : t('copyIban')}
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {!account.isLoading && !account.error && !account.data && (
                <ToolEmptyState
                    title={t('emptyTitle')}
                    body={t(isHost ? 'emptyHost' : 'emptyMember')}
                    iconSrc="/icons/present.svg"
                    iconFrame="plain"
                    iconAreaClassName="h-28 w-28"
                    className="flex min-h-[calc(100dvh-7.5rem)] flex-col justify-center pt-16"
                    action={
                        isHost && event?.id ? (
                            <Link
                                href={giftAccountSetupHref(event.id)}
                                className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-brand px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(255,122,89,0.28)]"
                            >
                                {t('setupCta')}
                            </Link>
                        ) : null
                    }
                />
            )}

            {account.isLoading && <LoadingState label={t('loading')} className="py-16" />}
            {account.error && <p className="py-16 text-center text-sm text-rose-600">{t('loadError')}</p>}
        </ModulePageShell>
    );
}
