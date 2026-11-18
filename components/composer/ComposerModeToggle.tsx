'use client';

import { Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PiMusicNotesPlusDuotone } from 'react-icons/pi';

import type { ComposerMode } from '@/hooks/useComposerController';
import { cn } from '@/lib/utils';

const ACTIVE_CLASS: Record<ComposerMode, string> = {
    post: 'bg-ink text-white',
    song: 'bg-primary-light text-primary-dark',
    announcement: 'bg-status-warn-wash text-status-warn',
};

export function ComposerModeToggle({
    mode,
    currentMode,
    onSelectAction,
    disabled,
}: {
    mode: ComposerMode;
    currentMode: ComposerMode;
    onSelectAction: () => void;
    disabled?: boolean;
}) {
    const t = useTranslations('ComposerCard');
    const tPost = useTranslations('PostCard');
    const active = currentMode === mode;
    const label = mode === 'post' ? t('post') : mode === 'song' ? t('music') : tPost('announcement');

    return (
        <button
            type="button"
            onClick={onSelectAction}
            aria-pressed={active}
            disabled={disabled}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                active ? ACTIVE_CLASS[mode] : 'bg-surface-muted text-ink-muted hover:bg-surface-muted/80',
            )}
        >
            {mode === 'song' && <PiMusicNotesPlusDuotone className="h-3.5 w-3.5" />}
            {mode === 'announcement' && <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />}
            {label}
        </button>
    );
}
