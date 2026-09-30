'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { GIFT_GIVER_NAME_MAX_LENGTH, GIFT_RECIPIENT_EMAIL_MAX_LENGTH, GIFT_RECIPIENT_LABEL_MAX_LENGTH, type GiftDetailsInput } from '@/lib/gift';

const inputClass =
    'rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60';

// Who the gift is for, how the giver signs it, and the recipient's email.
// Used by the create wizard and the gift section's edit form.
export function GiftDetailsFields({
    value,
    onChangeAction,
    disabled = false,
}: {
    value: GiftDetailsInput;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
}) {
    const t = useTranslations('GiftMode.form');

    return (
        <div className="space-y-4">
            {/* Recipient */}
            <FormFieldLabel label={t('recipientLabel')} required>
                <input
                    type="text"
                    name="recipientLabel"
                    required
                    maxLength={GIFT_RECIPIENT_LABEL_MAX_LENGTH}
                    value={value.recipientLabel}
                    onChange={onChangeAction}
                    disabled={disabled}
                    placeholder={t('recipientLabelPlaceholder')}
                    className={inputClass}
                />
            </FormFieldLabel>

            {/* Giver */}
            <FormFieldLabel label={t('giverDisplayName')} required>
                <input
                    type="text"
                    name="giverDisplayName"
                    required
                    maxLength={GIFT_GIVER_NAME_MAX_LENGTH}
                    value={value.giverDisplayName}
                    onChange={onChangeAction}
                    disabled={disabled}
                    placeholder={t('giverDisplayNamePlaceholder')}
                    className={inputClass}
                />
            </FormFieldLabel>

            {/* Recipient email */}
            <FormFieldLabel label={t('recipientEmail')} optional>
                <input
                    type="email"
                    name="recipientEmail"
                    maxLength={GIFT_RECIPIENT_EMAIL_MAX_LENGTH}
                    value={value.recipientEmail}
                    onChange={onChangeAction}
                    disabled={disabled}
                    className={inputClass}
                />
                <span className="text-xs text-ink-muted">{t('recipientEmailHint')}</span>
            </FormFieldLabel>
        </div>
    );
}
