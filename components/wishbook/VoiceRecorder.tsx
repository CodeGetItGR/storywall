'use client';

import { Mic, RotateCcw, Square, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { VoiceWishPlayer } from '@/components/wishbook/VoiceWishPlayer';
import type { VoiceRecorder as VoiceRecorderState } from '@/hooks/useVoiceRecorder';
import type { WishAudioDto } from '@/lib/api/types';
import { formatClipDuration, MAX_RECORDING_MS } from '@/lib/wishbook/voice';

// White pills, like the guest pages' other secondary buttons; 44 px tall for a thumb.
const PILL =
    'inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-40';
const SECONDARY = `${PILL} border border-border bg-background text-ink hover:bg-primary-light/40`;
// Icon-only round buttons beside the player, so they all fit on one row on a phone.
const ICON = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40';
const RECORD_AGAIN = `${ICON} border border-border bg-background text-ink hover:bg-primary-light/40`;
const REMOVE = `${ICON} text-rose-600 hover:bg-rose-50`;
// Record: a large gradient mic beside a plain label, no pill around it, so it is easy to spot.
const RECORD =
    'group inline-flex min-h-14 items-center gap-3 rounded-full pr-2 text-[15px] font-semibold text-ink transition-opacity disabled:opacity-40';
const RECORD_MIC =
    'flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform bg-gradient-brand group-hover:scale-105 group-disabled:scale-100';

type Props = {
    recorder: VoiceRecorderState;
    disabled?: boolean;
    // The edit sheet: the wish's stored recording, shown until it is replaced or removed.
    existing?: WishAudioDto | null;
    onRemoveExisting?: () => void;
};

// Record a spoken wish, then play it back, record it again or remove it before sending.
export function VoiceRecorder({ recorder, disabled = false, existing = null, onRemoveExisting }: Props) {
    const t = useTranslations('VoiceWish');

    if (recorder.status === 'unsupported') return null;

    // A new recording wins; the stored one shows only while nothing new is under way.
    const finished = recorder.status === 'recorded' ? recorder.recording : null;
    const kept = recorder.status === 'idle' ? existing : null;
    const playback = finished ?? kept;

    function start() {
        void recorder.start();
    }

    if (recorder.status === 'recording') {
        return (
            /* Recording */
            <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={recorder.stop} className={SECONDARY}>
                    <Square className="h-3.5 w-3.5 fill-current text-rose-500" aria-hidden="true" />
                    {t('stop')}
                </button>
                <span className="flex items-center gap-2 text-sm text-ink-muted tabular-nums">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden="true" />
                    {`${formatClipDuration(recorder.elapsedMs)} / ${formatClipDuration(MAX_RECORDING_MS)}`}
                </span>
            </div>
        );
    }

    if (playback) {
        return (
            <div className="flex items-center justify-between gap-4">
                {/* Playback */}
                <VoiceWishPlayer src={playback.url} durationMs={playback.durationMs} />

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={start}
                        disabled={disabled}
                        aria-label={t('recordAgain')}
                        title={t('recordAgain')}
                        className={RECORD_AGAIN}
                    >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={finished ? recorder.discard : onRemoveExisting}
                        disabled={disabled}
                        aria-label={t('removeRecording')}
                        title={t('removeRecording')}
                        className={REMOVE}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-start gap-1.5">
            {/* Record */}
            <button type="button" onClick={start} disabled={disabled} className={RECORD}>
                <span className={RECORD_MIC}>
                    <Mic className="h-6 w-6" aria-hidden="true" />
                </span>
                {t('record')}
            </button>

            {/* Blocked */}
            {recorder.status === 'denied' ? <p className="text-xs text-ink-muted">{t('micBlocked')}</p> : null}
        </div>
    );
}
