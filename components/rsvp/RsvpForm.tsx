'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';

import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';
import type { EventTypeConvention, RsvpPlusOnes } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type AttendingStatus = 'attending' | 'not-attending';

interface RsvpFormProps {
    eventType: EventTypeConvention | null;
    attending: AttendingStatus | null;
    formDisabled: boolean;
    onAttend: () => void;
    onDecline: () => void;
    plusOnes: RsvpPlusOnes;
    onIncrementPlusOnes: (type: 'adult' | 'child') => () => void;
    onDecrementPlusOnes: (type: 'adult' | 'child') => () => void;
    message: string;
    maxMessageLength: number;
    onMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
    submitDisabled: boolean;
    submitError: string | null;
    submitLabel: string;
}

export function RsvpForm({
    eventType,
    attending,
    formDisabled,
    onAttend,
    onDecline,
    plusOnes,
    onIncrementPlusOnes,
    onDecrementPlusOnes,
    message,
    maxMessageLength,
    onMessageChange,
    onSubmit,
    submitDisabled,
    submitError,
    submitLabel,
}: RsvpFormProps) {
    const t = useTranslations('RSVPPage');
    const tCommon = useTranslations('Common');
    const voice = useEventTypeVoice(eventType);

    return (
        <div className="p-3 mb-6">
            <h2 className="text-base font-bold text-ink mb-4">{t('yourRsvp')}</h2>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <div>
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                        {t('willYouAttend')} <span className="text-ink-faint">({tCommon('required')})</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={onAttend}
                            disabled={formDisabled}
                            className={cn(
                                'flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all px-1',
                                formDisabled && 'cursor-not-allowed opacity-60',
                                attending === 'attending'
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                                    : 'border-border text-ink-muted hover:border-emerald-200'
                            )}
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {t('joyfullyAccept')}
                        </button>
                        <button
                            type="button"
                            onClick={onDecline}
                            disabled={formDisabled}
                            className={cn(
                                'flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all px-1',
                                formDisabled && 'cursor-not-allowed opacity-60',
                                attending === 'not-attending'
                                    ? 'border-rose-300 bg-rose-50 text-rose-500'
                                    : 'border-border text-ink-muted hover:border-rose-200'
                            )}
                        >
                            <XCircle className="w-4 h-4" />
                            {t('regretfullyDecline')}
                        </button>
                    </div>
                </div>

                {attending === 'attending' && (
                    <>
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{t('plusOnes')}</p>
                            <div className={'flex flex-col sm:flex-row justify-around gap-2 w-full'}>
                                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 flex-1">
                                    <button
                                        type="button"
                                        onClick={onDecrementPlusOnes('adult')}
                                        disabled={formDisabled}
                                        className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors font-bold"
                                    >
                                        −
                                    </button>
                                    <span className="flex-1 text-center text-sm font-semibold text-ink tabular-nums">
                                        {t('adultsCount', { count: plusOnes.adultCount })}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={onIncrementPlusOnes('adult')}
                                        disabled={formDisabled}
                                        className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 flex-1">
                                    <button
                                        type="button"
                                        onClick={onDecrementPlusOnes('child')}
                                        disabled={formDisabled}
                                        className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors font-bold"
                                    >
                                        −
                                    </button>
                                    <span className="flex-1 text-center text-sm font-semibold text-ink tabular-nums">
                                        {t('childrenCount', { count: plusOnes.childCount })}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={onIncrementPlusOnes('child')}
                                        disabled={formDisabled}
                                        className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div>
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                        {voice.rsvpMessageLabel} <span className="text-ink-faint">({tCommon('optional')})</span>
                    </p>
                    <textarea
                        value={message}
                        onChange={onMessageChange}
                        disabled={formDisabled}
                        rows={3}
                        placeholder={t('messagePlaceholder')}
                        maxLength={maxMessageLength}
                        className="w-full bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 resize-none transition leading-relaxed"
                        aria-label={voice.rsvpMessageLabel}
                    />
                    <p className="mt-1 text-right text-xs text-ink-faint">
                        {message.length}/{maxMessageLength}
                    </p>
                </div>

                {submitError && <p className="text-xs text-rose-500 text-center">{submitError}</p>}

                <button
                    type="submit"
                    disabled={submitDisabled}
                    className="w-full py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                    {submitLabel}
                </button>
            </form>
        </div>
    );
}
