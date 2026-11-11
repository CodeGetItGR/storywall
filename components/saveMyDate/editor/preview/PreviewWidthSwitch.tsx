'use client';

import { Monitor, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback } from 'react';

import type { PreviewWidth } from '@/hooks/usePreviewWidth';
import { cn } from '@/lib/utils';

type PreviewWidthSwitchProps = {
    value: PreviewWidth;
    onChange: (width: PreviewWidth) => void;
};

// Phone or computer width for the preview, as the old editor's view toggle.
export function PreviewWidthSwitch({ value, onChange }: PreviewWidthSwitchProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <div role="group" aria-label={t('previewWidth')} className="flex gap-0.5 rounded-[11px] bg-(--smd-editor-control) p-0.5">
            <WidthButton width="mobile" value={value} label={t('previewMobile')} onSelect={onChange}>
                <Smartphone aria-hidden="true" />
            </WidthButton>
            <WidthButton width="desktop" value={value} label={t('previewDesktop')} onSelect={onChange}>
                <Monitor aria-hidden="true" />
            </WidthButton>
        </div>
    );
}

type WidthButtonProps = { width: PreviewWidth; value: PreviewWidth; label: string; onSelect: (width: PreviewWidth) => void; children: ReactNode };

function WidthButton({ width, value, label, onSelect, children }: WidthButtonProps) {
    const isActive = width === value;
    const select = useCallback(() => onSelect(width), [onSelect, width]);

    return (
        <button
            type="button"
            aria-pressed={isActive}
            onClick={select}
            className={cn(
                'flex h-9 items-center gap-2 rounded-[9px] px-3 text-[13px] font-semibold text-(--smd-editor-text) transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none [&_svg]:h-4 [&_svg]:w-4',
                isActive ? 'bg-[#50535a] shadow-[0_1px_6px_rgba(0,0,0,0.35)]' : 'hover:bg-white/10',
            )}
        >
            {children}
            {label}
        </button>
    );
}
