'use client';

import { useMemo } from 'react';

import { useEditableTextRenderer } from '@/components/saveMyDate/editor/text/EditableTextContext';
import type { RenderContext } from '@/lib/invitation/render';

// The render context with the editor's drawing of each text, so Save my date text is typed in place.
// Read inside InlineTextEditing; outside it the context comes back as it was.
export function useEditableRenderContext(ctx: RenderContext): RenderContext {
    const renderText = useEditableTextRenderer();
    return useMemo(() => (renderText ? { ...ctx, renderText } : ctx), [ctx, renderText]);
}
