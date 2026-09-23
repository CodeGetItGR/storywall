'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useNewsletterSubscribe } from '@/hooks/useNewsletterSubscribe';
import type { AppNewsletterConfigDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TONE_STYLES = {
    dark: {
        offer: 'text-white/68',
        input: 'border-white/20 bg-white/8 text-white placeholder:text-white/40 focus:border-white/50',
        button: 'bg-white text-[#262626] hover:opacity-85',
        sent: 'text-white',
        error: 'text-red-300',
    },
    light: {
        offer: 'text-ink-muted',
        input: 'border-border/70 bg-background text-ink placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10',
        button: 'bg-gradient-brand text-white hover:opacity-90',
        sent: 'text-ink',
        error: 'text-red-600',
    },
} as const;

// The subscribe endpoint answers the same way for every address, so there is
// one success state and no "already subscribed" branch.
export function NewsletterSubscribeForm({ config, tone }: { config: AppNewsletterConfigDto; tone: keyof typeof TONE_STYLES }) {
    const t = useTranslations('NewsletterForm');
    const form = useNewsletterSubscribe();
    const styles = TONE_STYLES[tone];

    if (form.isSent) {
        return (
            <p role="status" className={cn('text-sm', styles.sent)}>
                {t('sent')}
            </p>
        );
    }

    return (
        <form onSubmit={form.handleSubmit} className="flex flex-col gap-3">
            {/* Offer */}
            <p className={cn('text-[13px] leading-[1.55]', styles.offer)}>
                {t('offer', { percent: config.discountPercent, months: config.rewardValidityMonths })}
            </p>

            {/* Email */}
            <div className="flex gap-2">
                <input
                    type="email"
                    required
                    maxLength={255}
                    autoComplete="email"
                    aria-label={t('emailLabel')}
                    aria-invalid={form.error === 'invalid'}
                    placeholder={t('placeholder')}
                    value={form.email}
                    onChange={form.handleEmailChange}
                    className={cn('min-h-11 min-w-0 flex-1 rounded-full border px-4 text-sm outline-none transition', styles.input)}
                />
                <button
                    type="submit"
                    disabled={form.isSubmitting}
                    className={cn(
                        'inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60',
                        styles.button
                    )}
                >
                    {form.isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : t('submit')}
                </button>
            </div>

            {/* Error */}
            {form.error && (
                <p role="alert" className={cn('text-xs', styles.error)}>
                    {t(`errors.${form.error}`)}
                </p>
            )}
        </form>
    );
}
