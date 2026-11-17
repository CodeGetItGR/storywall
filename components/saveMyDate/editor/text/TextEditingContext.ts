'use client';

import { createContext, useContext } from 'react';

import type { InlineTextEdit } from '@/hooks/useInlineTextEdit';

// The text being edited, shared with every text of the invitation on the canvas.
// They sit deep inside each section's renderer, so props can't reach them.
export const TextEditingContext = createContext<InlineTextEdit | null>(null);

export function useTextEditing(): InlineTextEdit {
    const edit = useContext(TextEditingContext);
    if (!edit) throw new Error('useTextEditing needs InlineTextEditing around it');
    return edit;
}
