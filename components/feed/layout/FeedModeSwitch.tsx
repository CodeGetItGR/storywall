'use client';

import { Images, type LucideIcon, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type Ref, useCallback } from 'react';

import { FeedEditPencil } from '@/components/feed/edit/FeedEditPencil';
import type { FeedMode } from '@/lib/feedMode';
import { cn } from '@/lib/utils';

type FeedModeSwitchProps = {
    mode: FeedMode;
    onSelect: (mode: FeedMode) => void;
    // Hosts and co-hosts: the Edit pencil between the halves.
    onEdit?: () => void;
    editRef?: Ref<HTMLButtonElement>;
    className?: string;
};

// The Invitation | Social Feed pill (look A1): two halves with an icon each, coral under the chosen one.
// 36 px tall; each half is 30 px to look at and 40 px to tap. Hosts get the 40 px Edit circle in a column of its own:
// the coral fades between the halves there instead of sliding, so it never passes behind the circle.
export function FeedModeSwitch({ mode, onSelect, onEdit, editRef, className }: FeedModeSwitchProps) {
    const half = { mode, onSelect, fills: Boolean(onEdit) };

    return (
        <div
            className={cn(
                'relative inline-grid h-9 content-center items-center rounded-full bg-white p-[3px] font-sans shadow-[0_6px_20px_rgba(0,0,0,0.14)]',
                onEdit ? 'grid-cols-[1fr_46px_1fr]' : 'grid-cols-2',
                className,
            )}
        >
            {/* Thumb */}
            {!onEdit && (
                <span
                    aria-hidden="true"
                    data-feed-mode-thumb
                    className={cn(
                        'absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-primary transition-transform duration-200 motion-reduce:transition-none',
                        mode === 'feed' && 'translate-x-full',
                    )}
                />
            )}

            {/* Invitation */}
            <FeedModeHalf {...half} half="invitation" label="invitation" Icon={Mail} />

            {/* Edit */}
            {onEdit && <FeedEditPencil ref={editRef} onClick={onEdit} className="justify-self-center" />}

            {/* Feed mode's half reads Social Feed; the mode stays 'feed' */}
            <FeedModeHalf {...half} half="feed" label="socialFeed" Icon={Images} />
        </div>
    );
}

type FeedModeHalfProps = {
    half: FeedMode;
    label: 'invitation' | 'socialFeed';
    Icon: LucideIcon;
    mode: FeedMode;
    onSelect: (mode: FeedMode) => void;
    // Draws its own coral, with no sliding thumb.
    fills: boolean;
};

function FeedModeHalf({ half, label, Icon, mode, onSelect, fills }: FeedModeHalfProps) {
    const t = useTranslations('FeedLayout');
    const select = useCallback(() => onSelect(half), [half, onSelect]);
    const pressed = mode === half;

    return (
        <button
            type="button"
            aria-pressed={pressed}
            onClick={select}
            className={cn(
                'relative z-10 flex h-[30px] items-center justify-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors duration-200 before:absolute before:inset-x-0 before:-inset-y-[5px] motion-reduce:transition-none',
                pressed ? 'text-primary-foreground' : 'text-ink-muted hover:text-ink',
                fills && pressed && 'bg-primary',
            )}
        >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t(label)}
        </button>
    );
}
