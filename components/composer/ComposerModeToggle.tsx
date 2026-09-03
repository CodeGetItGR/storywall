'use client';

import { PiMusicNotesPlusDuotone } from 'react-icons/pi';
import { useTranslations } from 'next-intl';

export function ComposerModeToggle({
    mode,
    currentMode,
    onSelectAction,
    disabled,
}: {
    mode: 'post' | 'song';
    currentMode: 'post' | 'song';
    onSelectAction: () => void;
    disabled?: boolean;
}) {
    const t = useTranslations('ComposerCard');
    const active = currentMode === mode;
    const label = mode === 'post' ? t('post') : t('music');

    return (
        <button
            type="button"
            onClick={onSelectAction}
            aria-pressed={active}
            disabled={disabled}
            className={
                `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ` +
                (active
                    ? mode === 'post'
                        ? 'bg-ink text-white'
                        : 'bg-primary-light text-primary-dark'
                    : 'bg-surface-muted text-ink-muted hover:bg-surface-muted/80')
            }
        >
            {mode === 'song' && <PiMusicNotesPlusDuotone className="h-3.5 w-3.5" />}
            {label}
        </button>
    );
}
