'use client';

import { createContext, useContext } from 'react';

import type { CanvasTools } from '@/lib/invitation/canvasTools';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import type { EditorMode } from '@/lib/invitation/sectionRules';

export type CanvasHandlesValue = {
    mode: EditorMode;
    edit: InvitationEditorState['edit'];
    // What the renderer draws inside the invitation for the editor.
    tools: CanvasTools;
};

// The drag handles on the canvas. They sit deep inside each section's renderer
// and inside the section frames, so props can't reach them. Without it (stories of
// the bare canvas, guests) there are no handles.
export const CanvasHandlesContext = createContext<CanvasHandlesValue | null>(null);

export function useCanvasHandles(): CanvasHandlesValue | null {
    return useContext(CanvasHandlesContext);
}
