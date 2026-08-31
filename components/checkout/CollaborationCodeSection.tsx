'use client';

import { BadgePercent, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';
import { type ChangeEvent, useEffect, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { usePreviewCollaborationCode } from '@/hooks/useBilling';
import type { CollaborationCodePreviewResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

const MAX_COLLABORATION_CODE_LENGTH = 40;

export function CollaborationCodeSection({
    eventId,
    onPreviewChangeAction,
}: {
    eventId: string;
    onPreviewChangeAction: (code: string | null, preview: CollaborationCodePreviewResponseDto | null) => void;
}) {
    const t = useTranslations('CheckoutReviewPage.collaboration');
    const locale = useLocale();
    const previewCode = usePreviewCollaborationCode(eventId);
    const toErrorMessage = useApiErrorMessage();
    const [code, setCode] = useState('');
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const trimmedCode = code.trim();
    const preview = appliedCode === trimmedCode ? (previewCode.data ?? null) : null;

    useEffect(() => {
        onPreviewChangeAction(appliedCode, preview);
    }, [appliedCode, onPreviewChangeAction, preview]);

    function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
        setCode(event.target.value);
        setAppliedCode(null);
        setError(null);
        previewCode.reset();
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

    return (
        <section className="mt-6" aria-labelledby="partner-code-title">
            {/* Partner code */}
            <div className="rounded-lg bg-surface-muted/55 p-4">
                <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <BadgePercent className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 id="partner-code-title" className="text-base font-bold text-ink">
                            {t('title')}
                        </h2>
                        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <label className="sr-only" htmlFor="collaboration-code">
                                {t('field')}
                            </label>
                            <input
                                id="collaboration-code"
                                value={code}
                                onChange={handleCodeChange}
                                maxLength={MAX_COLLABORATION_CODE_LENGTH}
                                autoComplete="off"
                                placeholder={t('placeholder')}
                                className="min-h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                            />
                            <button
                                type="submit"
                                disabled={!trimmedCode || previewCode.isPending}
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
