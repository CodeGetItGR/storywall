'use client';

import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { type InvitationThemeCardDto, themeCardBackground } from '@/lib/invitation/themeCatalogue';
import { cn } from '@/lib/utils';

type ThemeSwitchOptionProps = {
    theme: InvitationThemeCardDto;
    isCurrent: boolean;
    // This design is loading after the host picked it.
    isBusy: boolean;
    disabled: boolean;
    onChoose: (slug: string) => void;
};

// One design in the picker: its card image and name. The current one is marked and can't be picked.
export function ThemeSwitchOption({ theme, isCurrent, isBusy, disabled, onChoose }: ThemeSwitchOptionProps) {
    const t = useTranslations('InvitationEditor.themeSwitch');
    const choose = useCallback(() => onChoose(theme.slug), [onChoose, theme.slug]);

    return (
        <button
            type="button"
            onClick={choose}
            disabled={disabled || isCurrent}
            aria-current={isCurrent ? 'true' : undefined}
            aria-busy={isBusy || undefined}
            className={cn(
                'flex w-full flex-col gap-2 rounded-xl p-1 text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                isCurrent ? 'ring-2 ring-(--smd-editor-accent)' : 'hover:bg-surface-muted disabled:opacity-60',
            )}
        >
            {/* Card image */}
            <span className="relative block aspect-[9/15.6] overflow-hidden rounded-lg" style={{ background: themeCardBackground(theme.cardColor) }}>
                {theme.cardThumbUrl ? (
                    <Image
                        fill
                        alt={t('thumbAlt', { name: theme.name })}
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 200px"
                        src={theme.cardThumbUrl}
                    />
                ) : null}
                {isBusy && (
                    <span className="absolute inset-0 flex items-center justify-center bg-white/60">
                        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                    </span>
                )}
            </span>

            {/* Name */}
            <span className="flex items-center justify-between gap-2 px-1 pb-1">
                <span className="truncate font-medium">{theme.name}</span>
                {isCurrent && <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">{t('currentBadge')}</span>}
            </span>
        </button>
    );
}
