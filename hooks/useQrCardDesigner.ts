'use client';

import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import type { QrCardSize, QrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_ID, PLAIN_QR_CARD_STYLE, qrCardStyleOf } from '@/lib/qrCard';

export type QrCardText = { title: string; line: string; giver: string };
type QrCardDefaults = { title: string; line: string; giver?: string };

// The picked design, paper size and the card's text. Nothing is saved: every visit starts on Plain with the
// defaults. A field the host hasn't touched follows its default, so it fills in when the data lands.
export function useQrCardDesigner({ templates, defaults }: { templates: QrCardTemplateDto[]; defaults: QrCardDefaults }) {
    const [pickedId, setPickedId] = useState(PLAIN_QR_CARD_ID);
    const [pickedSize, setPickedSize] = useState<QrCardSize>('A6');
    const [edits, setEdits] = useState<Partial<QrCardText>>({});

    // A template that left the list (archived meanwhile, say) falls back to Plain.
    const picked = templates.find((template) => template.id === pickedId) ?? null;
    const style = useMemo(() => (picked ? qrCardStyleOf(picked) : PLAIN_QR_CARD_STYLE), [picked]);

    // A design without A5 prints at A6; going back to one with A5 restores the host's pick.
    const size: QrCardSize = style.sizes.includes(pickedSize) ? pickedSize : 'A6';

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

    const handleSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setPickedSize(event.currentTarget.value as QrCardSize);
    }, []);

    return {
        templates,
        selectedId: picked?.id ?? PLAIN_QR_CARD_ID,
        style,
        sizes: style.sizes,
        size,
        text,
        showGiver: defaults.giver !== undefined,
        selectTemplate,
        handleTextChange,
        handleSizeChange,
    };
}

export type QrCardDesignerState = ReturnType<typeof useQrCardDesigner>;
