'use client';

import { createContext, useContext } from 'react';

import type { TextRenderer } from '@/lib/invitation/textEditing';

// How the canvas draws each text while inline editing is on. The canvas hands it to the
// renderer, which stays free of the editor so guests' pages render on the server.
export const EditableTextContext = createContext<TextRenderer | undefined>(undefined);

export function useEditableTextRenderer(): TextRenderer | undefined {
    return useContext(EditableTextContext);
}
