'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useDisclosure } from '@/hooks/useDisclosure';
import { cn } from '@/lib/utils';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

/** Discount code entry, collapsed behind a link until the host asks for it or already has a code. */
export function EventOverviewDiscountCode() {
    const t = useTranslations('CreateEventPage');
    const {
        checkoutCode,
        appliedCheckoutCode,
        checkoutCodePreview,
        checkoutCodeError,
        isCheckingCheckoutCode,
        onCheckoutCodeChange,
        applyCheckoutCode,
    } = useCreateEventForm();
    const { open, toggle } = useDisclosure(Boolean(checkoutCode));

    const trimmedCheckoutCode = checkoutCode.trim();
    const codeApplied = Boolean(appliedCheckoutCode && checkoutCodePreview);

    // Collapsed link
    if (!open) {
        return (
            <div className="py-3">
                <button
                    type="button"
                    onClick={toggle}
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-dark underline underline-offset-2"
                >
                    {t('collaboration.reveal')}
                </button>
            </div>
        );
    }

    return (
        <section aria-labelledby="checkout-code-heading" className="py-5">
            {/* Heading */}
            <h3 id="checkout-code-heading" className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                {t('collaboration.title')}
            </h3>

            {/* Field */}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor="event-checkout-code">
                    {t('collaboration.field')}
                </label>
                <input
                    id="event-checkout-code"
                    value={checkoutCode}
                    onChange={onCheckoutCodeChange}
                    maxLength={40}
                    autoComplete="off"
                    autoFocus={!checkoutCode}
                    disabled={codeApplied}
                    aria-invalid={Boolean(checkoutCodeError)}
                    aria-describedby={checkoutCodeError ? 'event-checkout-code-error' : undefined}
                    placeholder={t('collaboration.placeholder')}
                    className={cn(
                        'min-h-11 flex-1 rounded-full border bg-card px-4 text-sm font-semibold text-ink transition outline-none focus:ring-2 disabled:bg-surface-muted disabled:text-ink-muted',
                        checkoutCodeError
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/15'
                            : 'border-border focus:border-primary focus:ring-primary/15',
                    )}
                />
                <button
                    type="button"
                    disabled={!trimmedCheckoutCode || codeApplied || isCheckingCheckoutCode}
                    onClick={applyCheckoutCode}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-card px-5 text-sm font-semibold text-ink shadow-sm ring-1 ring-border transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isCheckingCheckoutCode && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {isCheckingCheckoutCode ? t('collaboration.checking') : t('collaboration.apply')}
                </button>
            </div>

            {/* Error */}
            {checkoutCodeError && (
                <p id="event-checkout-code-error" className="mt-2 text-sm font-semibold text-rose-600">
                    {checkoutCodeError}
                </p>
            )}
        </section>
    );
}
