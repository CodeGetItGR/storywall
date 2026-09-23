'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';

import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';
import type { EventTypeConvention, RsvpPlusOnes } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type AttendingStatus = 'attending' | 'not-attending';

interface RsvpFormProps {
    eventType: EventTypeConvention | null;
    attending: AttendingStatus | null;
    onAttend: () => void;
    onDecline: () => void;
    plusOnes: RsvpPlusOnes;
    onIncrementPlusOnes: (type: 'adult' | 'child') => () => void;
    onDecrementPlusOnes: (type: 'adult' | 'child') => () => void;
    message: string;
    maxMessageLength: number;
    onMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
    isSubmitting: boolean;
    submitDisabled: boolean;
    submitError: string | null;
    submitLabel: string;
}

export function RsvpForm({
    eventType,
    attending,
    onAttend,
    onDecline,
    plusOnes,
    onIncrementPlusOnes,
    onDecrementPlusOnes,
    message,
    maxMessageLength,
    onMessageChange,
    onSubmit,
    isSubmitting,
    submitDisabled,
    submitError,
    submitLabel,
}: RsvpFormProps) {
    const t = useTranslations('RSVPPage');
    const tCommon = useTranslations('Common');
    const voice = useEventTypeVoice(eventType);

    return (
        <div className="mb-6 p-3">
            <h2 className="mb-4 text-base font-bold text-ink">{t('yourRsvp')}</h2>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                        {t('willYouAttend')} <span className="text-ink-faint">({tCommon('required')})</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={onAttend}
                            className={cn(
                                'flex items-center justify-center gap-2 rounded-xl border-2 px-1 py-3 text-sm font-semibold transition-all',
                                attending === 'attending'
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                                    : 'border-border text-ink-muted hover:border-emerald-200',
                            )}
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            {t('joyfullyAccept')}
                        </button>
                        <button
                            type="button"
                            onClick={onDecline}
                            className={cn(
                                'flex items-center justify-center gap-2 rounded-xl border-2 px-1 py-3 text-sm font-semibold transition-all',
                                attending === 'not-attending'
                                    ? 'border-rose-300 bg-rose-50 text-rose-500'
                                    : 'border-border text-ink-muted hover:border-rose-200',
                            )}
                        >
                            <XCircle className="h-4 w-4" />
                            {t('regretfullyDecline')}
                        </button>
                    </div>
                </div>

                {attending === 'attending' && (
                    <>
                        <div className="flex flex-col items-center gap-2">
                            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('plusOnes')}</p>
                            <div className={'flex w-full flex-col justify-around gap-2 sm:flex-row'}>
                                <div className="flex flex-1 items-center gap-3 rounded-xl bg-surface-muted px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={onDecrementPlusOnes('adult')}
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card font-bold text-ink-muted transition-colors hover:text-ink"
                                    >
                                        −
                                    </button>
                                    <span className="flex-1 text-center text-sm font-semibold text-ink tabular-nums">
                                        {t('adultsCount', { count: plusOnes.adultCount })}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={onIncrementPlusOnes('adult')}
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card font-bold text-ink-muted transition-colors hover:text-ink"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="flex flex-1 items-center gap-3 rounded-xl bg-surface-muted px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={onDecrementPlusOnes('child')}
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card font-bold text-ink-muted transition-colors hover:text-ink"
                                    >
                                        −
                                    </button>
                                    <span className="flex-1 text-center text-sm font-semibold text-ink tabular-nums">
                                        {t('childrenCount', { count: plusOnes.childCount })}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={onIncrementPlusOnes('child')}
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card font-bold text-ink-muted transition-colors hover:text-ink"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                        {voice.rsvpMessageLabel} <span className="text-ink-faint">({tCommon('optional')})</span>
                    </p>
                    <textarea
                        value={message}
                        onChange={onMessageChange}
                        rows={3}
                        placeholder={t('messagePlaceholder')}
                        maxLength={maxMessageLength}
                        className="w-full resize-none rounded-xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30"
                        aria-label={voice.rsvpMessageLabel}
                    />
                    <p className="mt-1 text-right text-xs text-ink-faint">
                        {message.length}/{maxMessageLength}
                    </p>
                </div>

                {submitError && <p className="text-center text-xs text-rose-500">{submitError}</p>}

                <button
                    type="submit"
                    disabled={submitDisabled}
                    className="flex w-full items-center justify-center rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
                </button>
            </form>
        </div>
    );
}
