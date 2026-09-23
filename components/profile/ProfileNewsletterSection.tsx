'use client';

import { Check, Copy, Loader2, Mail } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/LoadingState';
import { useNewsletterSettings } from '@/hooks/useNewsletter';
import { formatDate } from '@/lib/datetime';

export function ProfileNewsletterSection() {
    const t = useTranslations('ProfilePage.newsletter');
    const locale = useLocale();
    const newsletter = useNewsletterSettings();
    if (!newsletter.canManage || !newsletter.config) return null;

    const { config, isSubscribed, status } = newsletter;

    return (
        <section className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5">
            {/* Newsletter header */}
            <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="text-base font-semibold text-ink">{t('title')}</h2>
            </div>

            {newsletter.isLoading && <LoadingState label={t('loading')} className="mt-4 justify-start" />}
            {newsletter.loadError && (
                <p role="alert" className="mt-4 text-sm text-red-600">
                    {newsletter.loadError}
                </p>
            )}

            {status && (
                <>
                    {/* Subscription */}
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p role="status" className="text-sm text-ink-muted">
                            {t(newsletter.statusKind, { percent: config.discountPercent })}
                        </p>
                        <Button
                            type="button"
                            variant={isSubscribed ? 'outline' : 'default'}
                            disabled={newsletter.isSaving}
                            onClick={isSubscribed ? newsletter.unsubscribe : newsletter.subscribe}
                            className="gap-2 self-start rounded-full px-4 sm:self-auto"
                        >
                            {newsletter.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {isSubscribed ? t('unsubscribe') : t('subscribe')}
                        </Button>
                    </div>

                    {newsletter.error && (
                        <p role="alert" className="mt-3 text-sm text-red-600">
                            {newsletter.error}
                        </p>
                    )}

                    {/* Reward */}
                    {status.rewardCode && (
                        <div className="mt-5 rounded-2xl bg-surface-muted/70 p-4">
                            <p className="text-xs font-semibold text-ink-muted">{t('rewardLabel')}</p>
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <code className="font-mono text-lg font-bold tracking-wider text-ink">{status.rewardCode}</code>
                                <Button type="button" variant="outline" onClick={newsletter.copyRewardCode} className="gap-2 rounded-full px-3">
                                    {newsletter.isCopied ? (
                                        <Check className="h-4 w-4" aria-hidden="true" />
                                    ) : (
                                        <Copy className="h-4 w-4" aria-hidden="true" />
                                    )}
                                    {newsletter.isCopied ? t('copied') : t('copy')}
                                </Button>
                            </div>
                            {status.rewardExpiresAt && (
                                <p className="mt-2 text-xs text-ink-muted">
                                    {t('rewardExpires', { date: formatDate(locale, status.rewardExpiresAt, { dateStyle: 'medium' }) })}
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
