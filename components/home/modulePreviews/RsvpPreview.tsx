'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ModulePreviewFrame, type ModulePreviewProps } from '@/components/home/modulePreviews/previewFrame';
import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';

/** Replica of components/rsvp/RsvpForm.tsx with "attending" chosen, so the plus-one steppers show. */
export function RsvpPreview({ variant }: ModulePreviewProps) {
    const t = useTranslations('RSVPPage');
    const tCommon = useTranslations('Common');
    const voice = useEventTypeVoice(null);

    return (
        <ModulePreviewFrame variant={variant}>
            <div className="p-3">
                <h2 className="mb-4 text-base font-bold text-ink">{t('yourRsvp')}</h2>
                <div className="flex flex-col gap-4">
                    {/* Attendance */}
                    <div>
                        <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                            {t('willYouAttend')} <span className="text-ink-faint">({tCommon('required')})</span>
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <span className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-400 bg-emerald-50 px-1 py-3 text-sm font-semibold text-emerald-600">
                                <CheckCircle2 className="h-4 w-4" />
                                {t('joyfullyAccept')}
                            </span>
                            <span className="flex items-center justify-center gap-2 rounded-xl border-2 border-border px-1 py-3 text-sm font-semibold text-ink-muted">
                                <XCircle className="h-4 w-4" />
                                {t('regretfullyDecline')}
                            </span>
                        </div>
                    </div>

                    {/* Plus ones */}
                    <div className="flex flex-col items-center gap-2">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('plusOnes')}</p>
                        <div className="flex w-full flex-col justify-around gap-2">
                            <div className="flex flex-1 items-center gap-3 rounded-xl bg-surface-muted px-4 py-3">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card font-bold text-ink-muted">
                                    −
                                </span>
                                <span className="flex-1 text-center text-sm font-semibold text-ink tabular-nums">
                                    {t('adultsCount', { count: 2 })}
                                </span>
                                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card font-bold text-ink-muted">
                                    +
                                </span>
                            </div>
                            <div className="flex flex-1 items-center gap-3 rounded-xl bg-surface-muted px-4 py-3">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card font-bold text-ink-muted">
                                    −
                                </span>
                                <span className="flex-1 text-center text-sm font-semibold text-ink tabular-nums">
                                    {t('childrenCount', { count: 1 })}
                                </span>
                                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card font-bold text-ink-muted">
                                    +
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                            {voice.rsvpMessageLabel} <span className="text-ink-faint">({tCommon('optional')})</span>
                        </p>
                        <div className="min-h-20 w-full rounded-xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-faint">
                            {t('messagePlaceholder')}
                        </div>
                    </div>
                </div>
            </div>
        </ModulePreviewFrame>
    );
}
