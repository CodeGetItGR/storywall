'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { QrCardLayoutEditorState } from '@/hooks/useQrCardLayoutEditor';

const BUTTON_CLASS =
    'inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-50';

// Adding text or the logo to the card, and putting a removed title back.
export function QrCardLayoutAddBar({ editor }: { editor: QrCardLayoutEditorState }) {
    const t = useTranslations('AdminPage.qrCards.layout');

    return (
        <div className="space-y-1.5">
            {/* Add */}
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={editor.addFixedField} disabled={!editor.canAddField} className={BUTTON_CLASS}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('addFixed')}
                </button>
                <button type="button" onClick={editor.addHostField} disabled={!editor.canAddField} className={BUTTON_CLASS}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('addHost')}
                </button>
                {editor.layout.logo === null && (
                    <button type="button" onClick={editor.addLogo} className={BUTTON_CLASS}>
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('addLogo')}
                    </button>
                )}
                {editor.layout.title === null && (
                    <button type="button" onClick={editor.restoreTitle} className={BUTTON_CLASS}>
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('restoreTitle')}
                    </button>
                )}
            </div>
            {/* Limit */}
            {!editor.canAddField && <p className="text-[11px] leading-4 text-ink-muted">{t('addLimit')}</p>}
        </div>
    );
}
