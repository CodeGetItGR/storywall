'use client';

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback } from 'react';

import { TextToolbarButton } from '@/components/saveMyDate/editor/text/TextToolbarButton';

type Align = 'left' | 'center' | 'right';

type TextAlignButtonsProps = { value: Align; onChange: (align: Align) => void };

// Left, centre and right, the one in use pressed.
export function TextAlignButtons({ value, onChange }: TextAlignButtonsProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <div className="flex shrink-0 items-center">
            <AlignButton align="left" label={t('alignLeft')} value={value} onChange={onChange} icon={<AlignLeft aria-hidden="true" />} />
            <AlignButton align="center" label={t('alignCenter')} value={value} onChange={onChange} icon={<AlignCenter aria-hidden="true" />} />
            <AlignButton align="right" label={t('alignRight')} value={value} onChange={onChange} icon={<AlignRight aria-hidden="true" />} />
        </div>
    );
}

type AlignButtonProps = { align: Align; label: string; value: Align; onChange: (align: Align) => void; icon: ReactNode };

function AlignButton({ align, label, value, onChange, icon }: AlignButtonProps) {
    const choose = useCallback(() => onChange(align), [align, onChange]);

    return (
        <TextToolbarButton label={label} pressed={value === align} onClick={choose}>
            {icon}
        </TextToolbarButton>
    );
}
