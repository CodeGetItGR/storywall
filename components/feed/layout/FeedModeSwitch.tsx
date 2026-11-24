'use client';

import { Images, type LucideIcon, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { FeedMode } from '@/lib/feedMode';
import { cn } from '@/lib/utils';

type FeedModeSwitchProps = { mode: FeedMode; onSelect: (mode: FeedMode) => void; className?: string };

// label: the half's FeedLayout key. Feed mode's half reads Social Feed; the mode stays 'feed'.
const HALVES: readonly { mode: FeedMode; label: 'invitation' | 'socialFeed'; Icon: LucideIcon }[] = [
    { mode: 'invitation', label: 'invitation', Icon: Mail },
    { mode: 'feed', label: 'socialFeed', Icon: Images },
];

// The Invitation | Social Feed pill (look A1): two halves with an icon each, a coral thumb under the chosen one.
// 40 px tall; each half is 32 px to look at and 40 px to tap.
export function FeedModeSwitch({ mode, onSelect, className }: FeedModeSwitchProps) {
    return (
        <div className={cn('relative inline-grid h-10 grid-cols-2 rounded-full bg-white p-1 font-sans shadow-[0_6px_20px_rgba(0,0,0,0.14)]', className)}>
            {/* Thumb */}
            <span
                aria-hidden="true"
                data-feed-mode-thumb
                className={cn(
                    'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary transition-transform duration-200 motion-reduce:transition-none',
                    mode === 'feed' && 'translate-x-full',
                )}
            />

            {/* Halves */}
            {HALVES.map((half) => (
                <FeedModeHalf key={half.mode} mode={half.mode} label={half.label} Icon={half.Icon} pressed={mode === half.mode} onSelect={onSelect} />
            ))}
        </div>
    );
}

type FeedModeHalfProps = { mode: FeedMode; label: 'invitation' | 'socialFeed'; Icon: LucideIcon; pressed: boolean; onSelect: (mode: FeedMode) => void };

function FeedModeHalf({ mode, label, Icon, pressed, onSelect }: FeedModeHalfProps) {
    const t = useTranslations('FeedLayout');
    const select = useCallback(() => onSelect(mode), [mode, onSelect]);

    return (
        <button
            type="button"
            aria-pressed={pressed}
            onClick={select}
            className={cn(
                'relative z-10 flex h-8 items-center justify-center gap-1 rounded-full px-3 text-[13px] font-medium transition-colors before:absolute before:inset-x-0 before:-inset-y-1',
                pressed ? 'text-primary-foreground' : 'text-ink-muted hover:text-ink',
            )}
        >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t(label)}
        </button>
    );
}
