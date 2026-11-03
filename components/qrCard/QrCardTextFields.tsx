'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { fieldControlClass } from '@/components/manage/invitations/shared';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import type { QrCardHostField, QrCardText } from '@/hooks/useQrCardDesigner';
import { QR_CARD_LINE_MAX, QR_CARD_TITLE_MAX } from '@/lib/qrCard';
import { QR_CARD_LAYOUT_LIMITS } from '@/lib/qrCardLayout';

// The card's own words. Inputs are named after the QrCardText field they edit; a design's own fields
// carry their id in data-field-id.
export function QrCardTextFields({
    text,
    showTitle,
    showGiver,
    hostFields,
    onChangeAction,
    onFieldChangeAction,
}: {
    text: QrCardText;
    showTitle: boolean;
    showGiver: boolean;
    hostFields: QrCardHostField[];
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onFieldChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('QrCardPage.fields');

    return (
        <div className="flex flex-col gap-4">
            {/* Title */}
            {showTitle && (
                <FormFieldLabel label={t('title')}>
                    <input
                        name="title"
                        value={text.title}
                        onChange={onChangeAction}
                        maxLength={QR_CARD_TITLE_MAX}
                        autoComplete="off"
                        className={fieldControlClass}
                    />
                </FormFieldLabel>
            )}
            {/* Design fields */}
            {hostFields.map((field) => (
                <FormFieldLabel key={field.id} label={field.label} optional>
                    <input
                        data-field-id={field.id}
                        value={field.value}
                        placeholder={field.placeholder || undefined}
                        onChange={onFieldChangeAction}
                        maxLength={QR_CARD_LAYOUT_LIMITS.fieldText}
                        autoComplete="off"
                        className={fieldControlClass}
                    />
                </FormFieldLabel>
            ))}
            {/* Line */}
            <FormFieldLabel label={t('line')}>
                <input
                    name="line"
                    value={text.line}
                    onChange={onChangeAction}
                    maxLength={QR_CARD_LINE_MAX}
                    autoComplete="off"
                    className={fieldControlClass}
                />
            </FormFieldLabel>
            {/* Giver */}
            {showGiver && (
                <FormFieldLabel label={t('giver')}>
                    <input
                        name="giver"
                        value={text.giver}
                        onChange={onChangeAction}
                        maxLength={QR_CARD_LINE_MAX}
                        autoComplete="off"
                        className={fieldControlClass}
                    />
                </FormFieldLabel>
            )}
        </div>
    );
}
