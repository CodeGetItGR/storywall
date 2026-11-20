'use client';

import './editor.css';

import { useTranslations } from 'next-intl';

import { LoadingState } from '@/components/ui/LoadingState';

// While a draft loads or starts.
export function InvitationEditorLoading() {
    const t = useTranslations('Common');

    return (
        <div className="smd-editor flex h-full items-center justify-center bg-(--smd-editor-panel)">
            <LoadingState size="md" className="text-(--smd-editor-muted)" label={<span className="sr-only">{t('loading')}</span>} />
        </div>
    );
}

type InvitationEditorErrorProps = { onRetry: () => void; subject?: 'invitation' | 'theme' };

// The draft (or an admin's theme) couldn't be loaded or started.
export function InvitationEditorError({ onRetry, subject = 'invitation' }: InvitationEditorErrorProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <div
            role="alert"
            className="smd-editor flex h-full flex-col items-center justify-center gap-4 bg-(--smd-editor-panel) px-6 text-center text-(--smd-editor-text)"
        >
            <p className="text-sm font-medium">{subject === 'theme' ? t('themeLoadFailed') : t('loadFailed')}</p>
            <button
                type="button"
                onClick={onRetry}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
            >
                {t('retry')}
            </button>
        </div>
    );
}
