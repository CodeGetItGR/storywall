'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, type FocusEvent, type KeyboardEvent, useCallback, useMemo, useState } from 'react';

import { usePatchQrCardTemplate } from '@/hooks/useAdminQrCardTemplates';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { isQrCardDetailError } from '@/lib/adminQrCards';
import { ApiError } from '@/lib/api/client';
import type { AdminQrCardTemplateDto, QrCardFieldFont, QrCardFieldKind, QrCardTextAlign } from '@/lib/api/types';
import { resolveLocalizedText } from '@/lib/localizedText';
import { giftQrCardLines, type QrCardLine, qrCardSampleFieldTexts } from '@/lib/qrCard';
import {
    addField,
    DEFAULT_QR_CARD_LAYOUT,
    elementRect,
    fieldElement,
    fieldIdOf,
    findField,
    isFieldComplete,
    moveElementTo,
    QR_CARD_LAYOUT_LIMITS,
    type QrCardElement,
    qrCardElements,
    type QrCardFieldChange,
    type QrCardLayout,
    qrCardLayoutOf,
    removeField,
    sameQrCardLayout,
    setCodeOptions,
    setLinesOptions,
    setTitleOptions,
    setTitleShown,
    updateField,
} from '@/lib/qrCardLayout';

export type QrCardLayoutSample = 'short' | 'gift';

const NUDGE = 0.5;
const NUDGE_LARGE = 5;
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

// The text fields' localized inputs are named <part>.<locale>, e.g. label.el.
type FieldTextPart = 'text' | 'label' | 'placeholder';

// The layout editor's draft, selection and sample card, its keyboard, adding and removing text, and the
// save. Only Save sends anything; closing with changes asks first. `textColor` is the drawer's live text
// colour, which new fields start with.
export function useQrCardLayoutEditor({
    template,
    textColor,
    onSavedAction,
    onCloseAction,
}: {
    template: AdminQrCardTemplateDto;
    textColor: string;
    onSavedAction: (template: AdminQrCardTemplateDto) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.qrCards');
    const tGift = useTranslations('GiftMode.card');
    const locale = useLocale();
    const apiErrorMessage = useApiErrorMessage();
    const patch = usePatchQrCardTemplate();

    const saved = useMemo(() => qrCardLayoutOf(template.layout), [template.layout]);
    const [layout, setLayout] = useState<QrCardLayout>(saved);
    const [picked, setSelected] = useState<QrCardElement | null>(null);
    const [incomplete, setIncomplete] = useState(false);
    // A removed element can't stay selected.
    const selected = picked && qrCardElements(layout).includes(picked) ? picked : null;
    const selectedField = selected ? findField(layout, selected) : null;
    const [sample, setSample] = useState<QrCardLayoutSample>('short');
    const [confirmingDiscard, setConfirmingDiscard] = useState(false);
    const [failure, setFailure] = useState<unknown>(null);
    const dirty = !sameQrCardLayout(layout, saved);

    const sampleFields = useMemo(() => qrCardSampleFieldTexts(layout, locale), [layout, locale]);

    const sampleLines = useMemo<QrCardLine[]>(
        () =>
            sample === 'short'
                ? [{ text: t('preview.sampleLine'), tone: 'body' }]
                : giftQrCardLines({
                      line: tGift('scan'),
                      pin: tGift('pin', { pin: '4821 9934' }),
                      email: tGift('email', { email: 'maria@example.com' }),
                      giver: t('layout.sampleGiver'),
                  }),
        [sample, t, tGift],
    );

    const select = useCallback((element: QrCardElement | null) => setSelected(element), []);
    // Each element on the canvas names itself in data-element; focusing it selects it.
    const handleElementFocus = useCallback((event: FocusEvent<SVGElement>) => {
        const element = event.currentTarget.dataset.element as QrCardElement | undefined;
        if (element) setSelected(element);
    }, []);

    const requestClose = useCallback(() => {
        if (dirty) setConfirmingDiscard(true);
        else onCloseAction();
    }, [dirty, onCloseAction]);
    const keepEditing = useCallback(() => setConfirmingDiscard(false), []);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>) => {
            // The discard modal's own keys bubble here through its portal; it handles them.
            if (confirmingDiscard) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                if (selected) setSelected(null);
                else requestClose();
                return;
            }
            const arrow = ARROWS[event.key];
            // Sliders and radios use the arrows themselves; a toolbar button shouldn't move the card.
            if (!arrow || !selected || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
            event.preventDefault();
            const step = event.shiftKey ? NUDGE_LARGE : NUDGE;
            setLayout((current) => {
                const rect = elementRect(current, selected);
                return moveElementTo(current, selected, { x: rect.x + arrow[0] * step, y: rect.y + arrow[1] * step });
            });
        },
        [confirmingDiscard, requestClose, selected],
    );

    const handleTitleAlignChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const align = event.currentTarget.value as QrCardTextAlign;
        setLayout((current) => setTitleOptions(current, { align }));
    }, []);
    const handleLinesAlignChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const align = event.currentTarget.value as QrCardTextAlign;
        setLayout((current) => setLinesOptions(current, { align }));
    }, []);
    const handleTitleSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const maxSize = Number(event.currentTarget.value);
        setLayout((current) => setTitleOptions(current, { maxSize }));
    }, []);
    const handleLinesSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const textSize = Number(event.currentTarget.value);
        setLayout((current) => setLinesOptions(current, { textSize }));
    }, []);
    const handlePanelChange = useCallback((panel: boolean) => setLayout((current) => setCodeOptions(current, { panel })), []);
    const handleRadiusChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const radius = Number(event.currentTarget.value);
        setLayout((current) => setCodeOptions(current, { radius }));
    }, []);
    // The selected field's own settings.
    const changeField = useCallback(
        (change: QrCardFieldChange) => {
            const id = selected ? fieldIdOf(selected) : null;
            if (id) setLayout((current) => updateField(current, id, change));
        },
        [selected],
    );
    const handleFieldAlignChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => changeField({ align: event.currentTarget.value as QrCardTextAlign }),
        [changeField],
    );
    const handleFieldSizeChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => changeField({ textSize: Number(event.currentTarget.value) }),
        [changeField],
    );
    const handleFieldFontChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => changeField({ font: event.currentTarget.value as QrCardFieldFont }),
        [changeField],
    );
    const handleFieldBoldChange = useCallback((bold: boolean) => changeField({ bold }), [changeField]);
    const handleFieldColorChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => changeField({ color: event.currentTarget.value.toUpperCase() }),
        [changeField],
    );
    const handleFieldTextChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const [part, textLocale] = event.currentTarget.name.split('.') as [FieldTextPart, string];
            const value = event.currentTarget.value;
            if (!selectedField) return;
            setIncomplete(false);
            changeField({ [part]: { ...(selectedField[part] ?? { en: '', el: '' }), [textLocale]: value } });
        },
        [changeField, selectedField],
    );

    // A new field is selected at once, so its words can be typed in the side panel.
    const add = useCallback(
        (kind: QrCardFieldKind) => {
            const id = crypto.randomUUID();
            setLayout((current) => addField(current, { id, kind, color: textColor }));
            setSelected(fieldElement(id));
        },
        [textColor],
    );
    const addFixedField = useCallback(() => add('fixed'), [add]);
    const addHostField = useCallback(() => add('host'), [add]);
    const canAddField = layout.fields.length < QR_CARD_LAYOUT_LIMITS.fields;

    const removeSelected = useCallback(() => {
        if (selected === 'title') setLayout((current) => setTitleShown(current, false));
        const id = selected ? fieldIdOf(selected) : null;
        if (id) setLayout((current) => removeField(current, id));
        setSelected(null);
    }, [selected]);
    const restoreTitle = useCallback(() => {
        setLayout((current) => setTitleShown(current, true));
        setSelected('title');
    }, []);

    const handleSampleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setSample(event.currentTarget.value as QrCardLayoutSample);
    }, []);

    const reset = useCallback(() => setLayout(DEFAULT_QR_CARD_LAYOUT), []);

    const save = useCallback(async () => {
        setFailure(null);
        // A field without its words would be refused: point at the first one instead of sending.
        const unfinished = layout.fields.find((field) => !isFieldComplete(field));
        setIncomplete(Boolean(unfinished));
        if (unfinished) {
            setSelected(fieldElement(unfinished.id));
            return;
        }
        try {
            const updated = await patch.mutateAsync({ id: template.id, input: { layout } });
            onSavedAction(updated);
            onCloseAction();
        } catch (error) {
            setFailure(error);
        }
    }, [layout, onCloseAction, onSavedAction, patch, template.id]);

    // A non-ApiError is fetch failing before any response; a layout rejection's detail names the rule.
    let saveError: string | null = incomplete ? t('layout.fieldIncomplete') : null;
    if (failure !== null) {
        if (!(failure instanceof ApiError)) saveError = t('layout.network');
        else if (isQrCardDetailError(failure)) saveError = failure.problem?.detail?.trim() || apiErrorMessage(failure);
        else saveError = apiErrorMessage(failure);
    }

    return {
        name: resolveLocalizedText(template.name, locale),
        layout,
        setLayout,
        selected,
        selectedField,
        select,
        sample,
        sampleTitle: t('preview.sampleTitle'),
        sampleLines,
        sampleFields,
        dirty,
        confirmingDiscard,
        isSaving: patch.isPending,
        saveError,
        handleElementFocus,
        handleKeyDown,
        handleTitleAlignChange,
        handleLinesAlignChange,
        handleTitleSizeChange,
        handleLinesSizeChange,
        handlePanelChange,
        handleRadiusChange,
        handleFieldAlignChange,
        handleFieldSizeChange,
        handleFieldFontChange,
        handleFieldBoldChange,
        handleFieldColorChange,
        handleFieldTextChange,
        canAddField,
        addFixedField,
        addHostField,
        removeSelected,
        restoreTitle,
        handleSampleChange,
        requestClose,
        keepEditing,
        reset,
        save,
    };
}

export type QrCardLayoutEditorState = ReturnType<typeof useQrCardLayoutEditor>;
