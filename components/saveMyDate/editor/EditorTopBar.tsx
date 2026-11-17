'use client';

import { ArrowLeft, CircleHelp, Eye, Redo2, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EditorIconButton } from '@/components/saveMyDate/editor/EditorIconButton';
import { EditorSaveStatus } from '@/components/saveMyDate/editor/EditorSaveStatus';
import type { SaveStatus } from '@/lib/invitation/draftAutosave';

type EditorTopBarProps = {
    status: SaveStatus;
    canUndo: boolean;
    canRedo: boolean;
    // A save the next step waits for is on its way.
    isBusy?: boolean;
    onBack: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onPreview: () => void;
    // The button at the end: Publish for a host, Save for an admin's live theme. None when absent.
    primary?: { action: 'publish' | 'save'; onClick: () => void; disabled?: boolean };
    // Starts the editor tour again. No tour button when absent.
    onTour?: () => void;
};

// Back and the save status on the left; undo, redo, the tour, preview and publish (or save) on the right.
export function EditorTopBar({ status, canUndo, canRedo, isBusy = false, onBack, onUndo, onRedo, onPreview, primary, onTour }: EditorTopBarProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <header className="relative z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-(--smd-editor-line) bg-(--smd-editor-bar) px-2 shadow-[0_5px_18px_rgba(0,0,0,0.28)] backdrop-blur-md sm:px-3.5">
            {/* Back and save status */}
            <div className="flex min-w-0 items-center gap-1">
                <EditorIconButton label={t('back')} onClick={onBack} disabled={isBusy}>
                    <ArrowLeft aria-hidden="true" />
                </EditorIconButton>
                <EditorSaveStatus status={status} />
            </div>

            {/* History, tour, preview and publish */}
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
                <EditorIconButton label={t('undo')} onClick={onUndo} disabled={!canUndo}>
                    <Undo2 aria-hidden="true" />
                </EditorIconButton>
                <EditorIconButton label={t('redo')} onClick={onRedo} disabled={!canRedo}>
                    <Redo2 aria-hidden="true" />
                </EditorIconButton>
                {onTour && (
                    <EditorIconButton label={t('tour.help')} onClick={onTour}>
                        <CircleHelp aria-hidden="true" />
                    </EditorIconButton>
                )}
                <EditorIconButton label={t('preview')} onClick={onPreview} disabled={isBusy} tourTarget="preview">
                    <Eye aria-hidden="true" />
                </EditorIconButton>
                {primary && (
                    <button
                        type="button"
                        onClick={primary.onClick}
                        disabled={isBusy || primary.disabled}
                        data-editor-tour="publish"
                        className="ml-1 h-10 rounded-[10px] bg-primary px-3.5 text-[13px] font-extrabold tracking-[0.02em] text-primary-foreground transition-colors hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-60"
                    >
                        {t(primary.action)}
                    </button>
                )}
            </div>
        </header>
    );
}
