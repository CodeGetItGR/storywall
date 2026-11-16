'use client';

import { Mic, RotateCcw, Square, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { VoiceWishPlayer } from '@/components/wishbook/VoiceWishPlayer';
import type { VoiceRecorder as VoiceRecorderState } from '@/hooks/useVoiceRecorder';
import type { WishAudioDto } from '@/lib/api/types';
import { formatClipDuration, MAX_RECORDING_MS } from '@/lib/wishbook/voice';

// White pills, like the guest pages' other secondary buttons; 44 px tall for a thumb.
const PILL = 'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-40';
const SECONDARY = `${PILL} border border-border bg-background text-ink hover:bg-primary-light/40`;
const DANGER = `${PILL} text-rose-600 hover:bg-rose-50`;

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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
                {/* Playback */}
                <VoiceWishPlayer src={playback.url} durationMs={playback.durationMs} />

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={start} disabled={disabled} className={SECONDARY}>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        {t('recordAgain')}
                    </button>
                    <button type="button" onClick={finished ? recorder.discard : onRemoveExisting} disabled={disabled} className={DANGER}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        {t('removeRecording')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-start gap-1.5">
            {/* Record */}
            <button type="button" onClick={start} disabled={disabled} className={SECONDARY}>
                <Mic className="h-4 w-4 text-primary" aria-hidden="true" />
                {t('record')}
            </button>

            {/* Blocked */}
            {recorder.status === 'denied' ? <p className="text-xs text-ink-muted">{t('micBlocked')}</p> : null}
        </div>
    );
}
