'use client';

import { CheckCircle2, ChevronDown, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';

import { cn } from '@/lib/utils';

type AttendingStatus = 'attending' | 'not-attending';

interface RsvpFormProps {
    attending: AttendingStatus | null;
    onAttend: () => void;
    onDecline: () => void;
    plusOnes: number;
    onIncrementPlusOnes: () => void;
    onDecrementPlusOnes: () => void;
    dietary: string;
    onDietaryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    message: string;
    onMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
    submitDisabled: boolean;
    submitError: boolean;
}

export function RsvpForm({
    attending,
    onAttend,
    onDecline,
    plusOnes,
    onIncrementPlusOnes,
    onDecrementPlusOnes,
    dietary,
    onDietaryChange,
    message,
    onMessageChange,
    onSubmit,
    submitDisabled,
    submitError,
}: RsvpFormProps) {
    const t = useTranslations('RSVPPage');

    return (
        <div className="p-5 mb-6">
            <h2 className="text-base font-bold text-ink mb-4">{t('yourRsvp')}</h2>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <div>
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{t('willYouAttend')}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={onAttend}
                            className={cn(
                                'flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
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
                            className={cn(
                                'flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
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
                        <div>
                            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{t('plusOnes')}</p>
                            <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3">
                                <button
                                    type="button"
                                    onClick={onDecrementPlusOnes}
                                    className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors font-bold"
                                >
                                    −
                                </button>
                                <span className="flex-1 text-center text-sm font-semibold text-ink tabular-nums">{t('guestsCount', { count: plusOnes })}</span>
                                <button
                                    type="button"
                                    onClick={onIncrementPlusOnes}
                                    className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors font-bold"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{t('dietaryRequirements')}</p>
                            <div className="relative">
                                <select
                                    value={dietary}
                                    onChange={onDietaryChange}
                                    className="w-full appearance-none bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition pr-10"
                                    aria-label={t('dietaryRequirements')}
                                >
                                    <option value="">{t('dietaryOptions.none')}</option>
                                    <option value="vegetarian">{t('dietaryOptions.vegetarian')}</option>
                                    <option value="vegan">{t('dietaryOptions.vegan')}</option>
                                    <option value="gluten-free">{t('dietaryOptions.glutenFree')}</option>
                                    <option value="halal">{t('dietaryOptions.halal')}</option>
                                    <option value="kosher">{t('dietaryOptions.kosher')}</option>
                                    <option value="other">{t('dietaryOptions.other')}</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                            </div>
                        </div>
                    </>
                )}

                <div>
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{t('messageForCouple')}</p>
                    <textarea
                        value={message}
                        onChange={onMessageChange}
                        rows={3}
                        placeholder={t('messagePlaceholder')}
                        className="w-full bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 resize-none transition leading-relaxed"
                        aria-label={t('messageAriaLabel')}
                    />
                </div>

                {submitError && <p className="text-xs text-rose-500 text-center">{t('submitError')}</p>}

                <button
                    type="submit"
                    disabled={submitDisabled}
                    className="w-full py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                    {t('submitRsvp')}
                </button>
            </form>
        </div>
    );
}
