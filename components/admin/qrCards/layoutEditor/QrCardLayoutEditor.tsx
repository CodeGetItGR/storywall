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
import { useQrCardLook } from '@/hooks/useQrCardLook';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';

// The full-screen editor for one design's look and layout: artwork, colours, title font, logo, wording and
// where everything sits, all drawn live on the card. × and Esc are the editor's
// (closeDisabled hands them over): Esc deselects, then asks before discarding changes. The browser's
// Back still closes it, as it does every drawer.
export function QrCardLayoutEditor({
    template,
    onSavedAction,
    onCloseAction,
}: {
    template: AdminQrCardTemplateDto;
    onSavedAction: (template: AdminQrCardTemplateDto) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.qrCards.layout');
    const look = useQrCardLook(template);
    const editor = useQrCardLayoutEditor({ template, look, onSavedAction, onCloseAction });
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
            onKeyDown={editor.handleKeyDown}
        >
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem]">
                {/* Canvas */}
                <QrCardLayoutCanvas
                    style={{ ...look.style, layout: editor.layout }}
                    title={editor.sampleTitle}
                    lines={editor.sampleLines}
                    fields={editor.sampleFields}
                    selected={editor.selected}
                    pointer={pointer}
                    onElementFocusAction={editor.handleElementFocus}
                />
                {/* Inspector */}
                <aside className="md:border-l md:border-border md:pl-6">
                    <QrCardLayoutInspector editor={editor} look={look} />
                </aside>
            </div>
            <ThemeFontFace font={look.style.headingFont} />
            <QrCardLayoutDiscardModal open={editor.confirmingDiscard} onDiscardAction={onCloseAction} onKeepAction={editor.keepEditing} />
        </AdminDrawer>
    );
}
