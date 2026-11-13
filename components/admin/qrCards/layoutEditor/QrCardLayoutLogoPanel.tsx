'use client';

import { useTranslations } from 'next-intl';

import { QrCardLayoutSegmented } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutSegmented';
import type { QrCardLayoutEditorState } from '@/hooks/useQrCardLayoutEditor';
import type { QrCardLogo } from '@/lib/qrCardLayout';

type LogoColorMode = 'original' | 'one';
const MODES: LogoColorMode[] = ['original', 'one'];

// The logo's colour: its brand colours, or all of it in one colour for dark artwork.
export function QrCardLayoutLogoPanel({ editor, logo }: { editor: QrCardLayoutEditorState; logo: QrCardLogo }) {
    const t = useTranslations('AdminPage.qrCards.layout');

    return (
        <div className="flex items-end justify-between gap-2">
            {/* Mode */}
            <QrCardLayoutSegmented
                name="logo-color"
                legend={t('color')}
                value={logo.color ? 'one' : 'original'}
                options={MODES.map((value) => ({ value, label: t(`logoColorOptions.${value}`) }))}
                onChangeAction={editor.handleLogoColorModeChange}
            />
            {/* Colour */}
            {logo.color && (
                <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ink-muted">{logo.color}</span>
                    <input
                        type="color"
                        aria-label={t('color')}
                        value={logo.color.toLowerCase()}
                        onChange={editor.handleLogoColorChange}
                        className="h-8 w-10 cursor-pointer rounded-md border border-border bg-white p-1"
                    />
                </span>
            )}
        </div>
    );
}
