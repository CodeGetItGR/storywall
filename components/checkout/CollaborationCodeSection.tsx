'use client';

import { BadgePercent, Loader2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';
import { type ChangeEvent, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { usePreviewCollaborationCode } from '@/hooks/useBilling';
import { useDisclosure } from '@/hooks/useDisclosure';
import type { CollaborationCodePreviewResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { clearPartnerCode, readPartnerCode, subscribePartnerCode } from '@/lib/partnerCodeLink';

const MAX_COLLABORATION_CODE_LENGTH = 40;

// The device's storage doesn't exist on the server render.
const serverPartnerCode = () => null;

export function CollaborationCodeSection({
    eventId,
    onPreviewChangeAction,
    copyNamespace = 'CheckoutReviewPage.collaboration',
    disabled = false,
    collapsible = false,
}: {
    eventId: string;
    disabled?: boolean;
    // Starts as a single link that opens the field.
    collapsible?: boolean;
    copyNamespace?: 'CheckoutReviewPage.collaboration' | 'CreateEventPage.collaboration';
    onPreviewChangeAction: (code: string | null, preview: CollaborationCodePreviewResponseDto | null) => void;
}) {
    const t = useTranslations(copyNamespace);
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const previewCode = usePreviewCollaborationCode(eventId);
    const toErrorMessage = useApiErrorMessage();
    // A code saved from a partner's link fills the field and opens it until the host types.
    const linkCode = useSyncExternalStore(subscribePartnerCode, readPartnerCode, serverPartnerCode);
    const [typedCode, setTypedCode] = useState<string | null>(null);
    const code = typedCode ?? linkCode ?? '';
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { open: openedByHost, toggle, close, show } = useDisclosure(!collapsible);
    const open = openedByHost || (typedCode === null && linkCode !== null);
    const linkCodeTried = useRef(false);
    const trimmedCode = code.trim();
    const preview = appliedCode === trimmedCode ? (previewCode.data ?? null) : null;

    useEffect(() => {
        onPreviewChangeAction(appliedCode, preview);
    }, [appliedCode, onPreviewChangeAction, preview]);

    // Applied once, as soon as checkout is enabled. A refused code stays on screen with its error,
    // but is forgotten so it doesn't fill the field again.
    const applyLinkCode = useEffectEvent(() => {
        if (!linkCode || linkCodeTried.current) return;
        linkCodeTried.current = true;
        previewCode.mutateAsync({ collaborationCode: linkCode }).then(
            () => setAppliedCode(linkCode),
            (previewError) => {
                setTypedCode(linkCode);
                show();
                setError(toErrorMessage(previewError));
                clearPartnerCode();
            },
        );
    });

    useEffect(() => {
        if (!disabled) applyLinkCode();
    }, [disabled, linkCode]);

    function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
        setTypedCode(event.target.value);
        setAppliedCode(null);
        setError(null);
        previewCode.reset();
    }

    // Hiding the field drops the code with it, so no unseen discount stays applied. A code from a
    // partner's link goes too: the host turned it down.
    function handleCollapse() {
        setTypedCode('');
        setAppliedCode(null);
        setError(null);
        previewCode.reset();
        clearPartnerCode();
        close();
    }

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setAppliedCode(null);
        if (!trimmedCode) return;

        try {
            await previewCode.mutateAsync({ collaborationCode: trimmedCode });
            setAppliedCode(trimmedCode);
        } catch (previewError) {
            setError(toErrorMessage(previewError));
        }
    }

    // Collapsed link
    if (!open) {
        return (
            <button
                type="button"
                onClick={toggle}
                disabled={disabled}
                className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-primary-dark underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <BadgePercent className="h-4 w-4" aria-hidden="true" />
                {t('reveal')}
            </button>
        );
    }

    return (
        <section className="mt-6" aria-labelledby="checkout-code-title">
            {/* Checkout code */}
            <div className="rounded-lg bg-surface-muted/55 p-4">
                <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <BadgePercent className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                        {/* Heading */}
                        <div className="flex items-center justify-between gap-2">
                            <h2 id="checkout-code-title" className="text-base font-bold text-ink">
                                {t('title')}
                            </h2>
                            {collapsible && (
                                <button
                                    type="button"
                                    onClick={handleCollapse}
                                    aria-label={tCommon('close')}
                                    className="-my-2 -mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                                >
                                    <X className="h-4 w-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <label className="sr-only" htmlFor="checkout-code">
                                {t('field')}
                            </label>
                            <input
                                id="checkout-code"
                                value={code}
                                onChange={handleCodeChange}
                                maxLength={MAX_COLLABORATION_CODE_LENGTH}
                                autoComplete="off"
                                placeholder={t('placeholder')}
                                autoFocus={collapsible}
                                disabled={disabled}
                                className="min-h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm font-semibold text-ink transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={disabled || !trimmedCode || previewCode.isPending}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-card px-5 text-sm font-semibold text-ink shadow-sm ring-1 ring-border transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {previewCode.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {previewCode.isPending ? t('checking') : t('apply')}
                            </button>
                        </form>
                        {preview && (
                            <p className="mt-3 text-sm font-semibold text-emerald-700">
                                {t('applied', {
                                    label: preview.label,
                                    discount: preview.combinedDiscountPercent,
                                    amount: formatMoney(locale, preview.payableAmountMinor, preview.currency),
                                })}
                            </p>
                        )}
                        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
                    </div>
                </div>
            </div>
        </section>
    );
}
