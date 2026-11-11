'use client';

import './handles.css';

import { type ReactNode, useContext, useMemo } from 'react';

import { CanvasHandlesContext, type CanvasHandlesValue } from '@/components/saveMyDate/editor/handles/CanvasHandlesContext';
import { canvasToolRenderers } from '@/components/saveMyDate/editor/handles/canvasToolRenderers';
import { TextSpacingHandles } from '@/components/saveMyDate/editor/handles/TextSpacingHandles';
import { TextEditingContext } from '@/components/saveMyDate/editor/text/TextEditingContext';
import { useEditorMode } from '@/hooks/useEditorMode';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';

type CanvasHandlesProps = {
    store: InvitationEditorStore;
    // The canvas: its sections, spacers, images and frames get their handles.
    children: ReactNode;
};

// The resize and spacing handles of the canvas. Every drag is an edit of the
// editor store, so it is undone and saved like any other change.
export function CanvasHandles({ store, children }: CanvasHandlesProps) {
    const mode = useEditorMode();
    const value = useMemo<CanvasHandlesValue>(() => {
        const { edit } = store.getState();
        return { mode, edit, tools: canvasToolRenderers(mode, edit) };
    }, [mode, store]);
    const text = useContext(TextEditingContext);

    return (
        <CanvasHandlesContext.Provider value={value}>
            {children}

            {/* Space above and below the text being edited (admins) */}
            {mode === 'admin' && text?.active && text.element && (
                <TextSpacingHandles element={text.element} target={text.active} style={text.snapshot?.style} edit={value.edit} />
            )}
        </CanvasHandlesContext.Provider>
    );
}
