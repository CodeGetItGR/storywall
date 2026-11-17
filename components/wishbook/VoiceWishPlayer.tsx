'use client';

import { Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { formatClipDuration } from '@/lib/wishbook/voice';

// A wish's recording: one round play/pause button and its time. Thumb-sized, no chrome.
export function VoiceWishPlayer({ src, durationMs }: { src: string; durationMs: number }) {
    const t = useTranslations('VoiceWish');
    // The ref callback apart, so the rest reads as plain render values.
    const { audioRef, ...player } = useAudioPlayer(src, durationMs);
    const shownMs = player.isPlaying || player.positionMs > 0 ? player.positionMs : player.durationMs;

    function toggle() {
        void player.toggle();
    }

    return (
        <div className="flex flex-col gap-1">
            {/* Controls */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={toggle}
                    aria-label={player.isPlaying ? t('pause') : t('play')}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-opacity bg-gradient-brand hover:opacity-90"
                >
                    {player.isPlaying ? (
                        <Pause className="h-4 w-4" aria-hidden="true" />
                    ) : (
                        <Play className="h-4 w-4 translate-x-px" aria-hidden="true" />
                    )}
                </button>
                <span className="text-sm text-ink-muted tabular-nums">{formatClipDuration(shownMs)}</span>
                <audio
                    ref={audioRef}
                    src={src}
                    preload="metadata"
                    onPlay={player.onPlay}
                    onPause={player.onPause}
                    onEnded={player.onEnded}
                    onTimeUpdate={player.onTimeUpdate}
                    onLoadedMetadata={player.onLoadedMetadata}
                    onError={player.onError}
                    className="hidden"
                />
            </div>

            {/* Error */}
            {player.failed ? <p className="text-xs text-rose-600">{t('cantPlay')}</p> : null}
        </div>
    );
}
