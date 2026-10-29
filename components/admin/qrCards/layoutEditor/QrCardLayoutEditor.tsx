'use client';

import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { QrCardLayoutCanvas } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutCanvas';
import { QrCardLayoutDiscardModal } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutDiscardModal';
import { QrCardLayoutInspector } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutInspector';
import { QrCardLayoutToolbar } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutToolbar';
import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { useQrCardLayoutEditor } from '@/hooks/useQrCardLayoutEditor';
import { useQrCardLayoutPointer } from '@/hooks/useQrCardLayoutPointer';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import type { QrCardStyle } from '@/lib/qrCard';

// The full-screen layout editor for one template. `style` is the drawer's live look (colours, font,
// a picked but unsaved artwork); the layout is the editor's own draft. × and Esc are the editor's
// (closeDisabled hands them over): Esc deselects, then asks before discarding changes. The browser's
// Back still closes it, as it does every drawer.
export function QrCardLayoutEditor({
    template,
    style,
    onSavedAction,
    onCloseAction,
}: {
    template: AdminQrCardTemplateDto;
    style: QrCardStyle;
    onSavedAction: (template: AdminQrCardTemplateDto) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.qrCards.layout');
    const editor = useQrCardLayoutEditor({ template, onSavedAction, onCloseAction });
    const pointer = useQrCardLayoutPointer({ layout: editor.layout, setLayout: editor.setLayout, select: editor.select });

    return (
        <AdminDrawer
            open
            size="modal"
            closeDisabled
            onClose={onCloseAction}
            title={t('title', { name: editor.name })}
            closeLabel={t('cancel')}
            footer={<QrCardLayoutToolbar editor={editor} />}
        >
            <div onKeyDown={editor.handleKeyDown} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem]">
                {/* Canvas */}
                <QrCardLayoutCanvas
                    style={{ ...style, layout: editor.layout }}
                    title={editor.sampleTitle}
                    lines={editor.sampleLines}
                    selected={editor.selected}
                    pointer={pointer}
                    onElementFocusAction={editor.handleElementFocus}
                />
                {/* Inspector */}
                <aside className="md:border-l md:border-border md:pl-6">
                    <QrCardLayoutInspector editor={editor} />
                </aside>
            </div>
            <ThemeFontFace font={style.headingFont} />
            <QrCardLayoutDiscardModal open={editor.confirmingDiscard} onDiscardAction={onCloseAction} onKeepAction={editor.keepEditing} />
        </AdminDrawer>
    );
}
