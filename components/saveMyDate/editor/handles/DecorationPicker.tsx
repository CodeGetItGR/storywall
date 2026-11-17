'use client';

import { useTranslations } from 'next-intl';

import { useDecorationPicker } from '@/hooks/useDecorationPicker';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { SectionDecoration } from '@/lib/invitation/sections';

type DecorationPickerProps = { store: InvitationEditorStore; sectionId: string; decoration: SectionDecoration | undefined };

// Which of the theme's elements a family section shows between its blocks (admin's theme editor).
export function DecorationPicker({ store, sectionId, decoration }: DecorationPickerProps) {
    const t = useTranslations('InvitationEditor.assets');
    const picker = useDecorationPicker(store, sectionId, decoration);

    return (
        <div className="smd-decoration-picker">
            <select aria-label={t('pickElement')} value={picker.value} onChange={picker.change}>
                <option value="">{t('noElement')}</option>
                {picker.elements.map((element) => (
                    <option key={element.id} value={element.id}>
                        {element.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
