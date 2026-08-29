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
        >
            {!account.isLoading && !account.error && account.data && (
                <div className="flex h-[calc(100dvh-7.5rem)] min-h-120 flex-col">
                    {/* Hero */}
                    <section className="flex shrink-0 flex-col items-center px-2 pt-12 text-center">
                        <Image src="/icons/present.svg" alt="" width={100} height={100} priority className="h-24 w-24" unoptimized />
                        <div className="mt-8 w-full max-h-[28vh] overflow-y-auto pr-1 text-center">
                            <p className="text-[1.08rem] leading-8 whitespace-pre-line text-ink-muted">{note}</p>
                        </div>
                    </section>

                    {/* Bank details */}
                    <section
                        className={cn('shrink-0 border-t border-border/70 pt-6 text-center', {
                            'mt-5': !!note,
                        })}
                    >
                        <div className="space-y-5">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-faint">{t('fields.bankName')}</p>
                                <p className="mt-2 min-h-6 text-2xl font-semibold tracking-tight text-ink">{account.data.bankName}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-faint">{t('fields.accountHolder')}</p>
                                <p className="mt-2 text-lg font-semibold text-ink">{account.data.accountHolder}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">{t('fields.iban')}</p>
                                <p className="mt-3 break-all font-mono text-2xl font-semibold tracking-[0.12em] text-ink">{formattedIban}</p>
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
