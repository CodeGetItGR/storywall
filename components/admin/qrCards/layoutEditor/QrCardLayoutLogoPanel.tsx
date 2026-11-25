'use client';

import { useTranslations } from 'next-intl';

import { QrCardLayoutSegmented } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutSegmented';
import { ColorSwatch } from '@/components/ui/color/ColorSwatch';
import type { QrCardLayoutEditorState } from '@/hooks/useQrCardLayoutEditor';
import type { QrCardLogo } from '@/lib/qrCardLayout';

type LogoColorMode = 'original' | 'one';
const MODES: LogoColorMode[] = ['original', 'one'];

// The logo's colour: its brand colours, or all of it in one colour for dark artwork.
export function QrCardLayoutLogoPanel({ editor, logo }: { editor: QrCardLayoutEditorState; logo: QrCardLogo }) {
    const t = useTranslations('AdminPage.qrCards.layout');

    return (
        <div className="space-y-2">
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
                    <ColorSwatch value={logo.color} label={t('color')} surface="light" onChange={editor.handleLogoColorChange} />
                </span>
            )}
        </div>
    );
}
