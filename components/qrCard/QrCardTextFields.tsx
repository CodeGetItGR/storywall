'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { fieldControlClass } from '@/components/manage/invitations/shared';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import type { QrCardText } from '@/hooks/useQrCardDesigner';
import { QR_CARD_LINE_MAX, QR_CARD_TITLE_MAX } from '@/lib/qrCard';

// The card's own words. Inputs are named after the QrCardText field they edit.
export function QrCardTextFields({
    text,
    showGiver,
    onChangeAction,
}: {
    text: QrCardText;
    showGiver: boolean;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('QrCardPage.fields');

    return (
        <div className="flex flex-col gap-4">
            {/* Title */}
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
