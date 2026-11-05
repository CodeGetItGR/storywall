'use client';

import { useLocale } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import type { QrCardSize, QrCardTemplateDto, QrCardWordingKey } from '@/lib/api/types';
import { resolveLocalizedText } from '@/lib/localizedText';
import { PLAIN_QR_CARD_ID, PLAIN_QR_CARD_STYLE, qrCardFieldTexts, qrCardStyleOf } from '@/lib/qrCard';
import { qrCardLineWording } from '@/lib/qrCardLayout';

export type QrCardText = { title: string; line: string; giver: string };
type QrCardDefaults = { title: string; line: string; giver?: string };
// A design's field the host fills in, worded in the host's language.
export type QrCardHostField = { id: string; label: string; placeholder: string; value: string };

// The picked design, paper size and the card's text. Nothing is saved: every visit starts on Plain with the
// defaults. A field the host hasn't touched follows its default, so it fills in when the data lands. The line's
// default is the picked design's wording for `lineKey` in the host's language, else `defaults.line`.
export function useQrCardDesigner({
    templates,
    defaults,
    lineKey,
}: {
    templates: QrCardTemplateDto[];
    defaults: QrCardDefaults;
    lineKey: QrCardWordingKey | null;
}) {
    const [pickedId, setPickedId] = useState(PLAIN_QR_CARD_ID);
    const [pickedSize, setPickedSize] = useState<QrCardSize>('A6');
    const [edits, setEdits] = useState<Partial<QrCardText>>({});
    // What the host typed into a design's own fields, by field id. Kept across design changes.
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const locale = useLocale();

    // A template that left the list (archived meanwhile, say) falls back to Plain.
    const picked = templates.find((template) => template.id === pickedId) ?? null;
    const style = useMemo(() => (picked ? qrCardStyleOf(picked) : PLAIN_QR_CARD_STYLE), [picked]);

    // A design without A5 prints at A6; going back to one with A5 restores the host's pick.
    const size: QrCardSize = style.sizes.includes(pickedSize) ? pickedSize : 'A6';

    const text: QrCardText = {
        title: edits.title ?? defaults.title,
        line: edits.line ?? (lineKey ? qrCardLineWording(style.layout, lineKey, locale) : null) ?? defaults.line,
        giver: edits.giver ?? defaults.giver ?? '',
    };

    const hostFields: QrCardHostField[] = style.layout.fields
        .filter((field) => field.kind === 'host')
        .map((field) => ({
            id: field.id,
            label: resolveLocalizedText(field.label, locale),
            placeholder: resolveLocalizedText(field.placeholder, locale),
            value: fieldValues[field.id] ?? '',
        }));
    const fieldTexts = useMemo(() => qrCardFieldTexts(style.layout, locale, fieldValues), [style.layout, locale, fieldValues]);

    const selectTemplate = useCallback((id: string) => setPickedId(id), []);
    // Inputs are named after the field they edit: title, line, giver.
    const handleTextChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.currentTarget;
        setEdits((current) => ({ ...current, [name]: value }));
    }, []);

    // A design field's input names itself in data-field-id.
    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const id = event.currentTarget.dataset.fieldId;
        const { value } = event.currentTarget;
        if (id) setFieldValues((current) => ({ ...current, [id]: value }));
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
        showTitle: style.layout.title !== null,
        hostFields,
        fieldTexts,
        selectTemplate,
        handleTextChange,
        handleFieldChange,
        handleSizeChange,
    };
}

export type QrCardDesignerState = ReturnType<typeof useQrCardDesigner>;
