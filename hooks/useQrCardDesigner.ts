'use client';

import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import type { QrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_ID, PLAIN_QR_CARD_STYLE, qrCardStyleOf } from '@/lib/qrCard';

export type QrCardText = { title: string; line: string; giver: string };
type QrCardDefaults = { title: string; line: string; giver?: string };

// The picked design and the card's text. Nothing is saved: every visit starts on Plain with the
// defaults. A field the host hasn't touched follows its default, so it fills in when the data lands.
export function useQrCardDesigner({ templates, defaults }: { templates: QrCardTemplateDto[]; defaults: QrCardDefaults }) {
    const [pickedId, setPickedId] = useState(PLAIN_QR_CARD_ID);
    const [edits, setEdits] = useState<Partial<QrCardText>>({});

    // A template that left the list (archived meanwhile, say) falls back to Plain.
    const picked = templates.find((template) => template.id === pickedId) ?? null;
    const style = useMemo(() => (picked ? qrCardStyleOf(picked) : PLAIN_QR_CARD_STYLE), [picked]);

    const text: QrCardText = {
        title: edits.title ?? defaults.title,
        line: edits.line ?? defaults.line,
        giver: edits.giver ?? defaults.giver ?? '',
    };

    const selectTemplate = useCallback((id: string) => setPickedId(id), []);
    // Inputs are named after the field they edit: title, line, giver.
    const handleTextChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.currentTarget;
        setEdits((current) => ({ ...current, [name]: value }));
    }, []);

    return {
        templates,
        selectedId: picked?.id ?? PLAIN_QR_CARD_ID,
        style,
        text,
        showGiver: defaults.giver !== undefined,
        selectTemplate,
        handleTextChange,
    };
}

export type QrCardDesignerState = ReturnType<typeof useQrCardDesigner>;
