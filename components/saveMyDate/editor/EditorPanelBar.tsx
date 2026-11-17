'use client';

import { Palette, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback } from 'react';

import type { EditorPanel } from '@/hooks/useEditorWorkspace';

type EditorPanelBarProps = { onOpen: (panel: EditorPanel) => void };

// Phones and tablets: opens the side panels, within reach of a thumb. Wide screens dock them instead.
export function EditorPanelBar({ onOpen }: EditorPanelBarProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <nav className="grid shrink-0 grid-cols-2 gap-2 border-t border-(--smd-editor-line) bg-(--smd-editor-bar) px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] min-[1101px]:hidden">
            <PanelButton panel="assets" label={t('themeAssets')} icon={<Palette className="h-4 w-4 shrink-0" aria-hidden="true" />} onOpen={onOpen} />
            <PanelButton
                panel="settings"
                label={t('settings')}
                icon={<SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />}
                onOpen={onOpen}
            />
        </nav>
    );
}

type PanelButtonProps = { panel: EditorPanel; label: string; icon: ReactNode; onOpen: (panel: EditorPanel) => void };

function PanelButton({ panel, label, icon, onOpen }: PanelButtonProps) {
    const open = useCallback(() => onOpen(panel), [onOpen, panel]);

    return (
        <button
            type="button"
            onClick={open}
            className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-[10px] bg-(--smd-editor-control) px-3 text-xs font-semibold text-(--smd-editor-text) hover:bg-white/10"
        >
            {icon}
            <span className="truncate">{label}</span>
        </button>
    );
}
