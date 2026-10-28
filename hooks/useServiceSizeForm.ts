'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent, SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import type { VendorServiceItemDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { centsToEuroInput, euroInputError, euroInputToCents, PRICE_MAX_CENTS, PRINT_SIZE_LABEL_MAX } from '@/lib/printPicks';

// The add / edit form of one print size: a label and a price in euros. Errors show once the form was submitted.
export function useServiceSizeForm({ item, onSave }: { item: VendorServiceItemDto | 'new'; onSave: (label: string, priceCents: number) => void }) {
    const t = useTranslations('Vendors.services');
    const locale = useLocale();
    const editing = item === 'new' ? null : item;
    const [label, setLabel] = useState(editing?.label ?? '');
    const [price, setPrice] = useState(editing ? centsToEuroInput(editing.priceCents) : '');
    const [submitted, setSubmitted] = useState(false);
    const trimmedLabel = label.trim();
    const labelValid = trimmedLabel.length > 0 && trimmedLabel.length <= PRINT_SIZE_LABEL_MAX;
    const priceProblem = euroInputError(price);
    const canSubmit = labelValid && priceProblem === null;

    const handleLabel = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setLabel(event.currentTarget.value);
    }, []);

    const handlePrice = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setPrice(event.currentTarget.value);
    }, []);

    const handleSubmit = useCallback(
        (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
            const cents = euroInputToCents(price);
            if (canSubmit && cents !== null) onSave(trimmedLabel, cents);
        },
        [canSubmit, onSave, price, trimmedLabel],
    );

    let priceError: string | null = null;
    if (submitted && priceProblem === 'tooHigh') priceError = t('priceTooHigh', { max: formatMoney(locale, PRICE_MAX_CENTS, 'EUR') });
    else if (submitted && priceProblem === 'invalid') priceError = t('priceInvalid');

    return {
        isEditing: editing !== null,
        label,
        price,
        handleLabel,
        handlePrice,
        labelError: submitted && !labelValid ? t('labelRequired') : null,
        priceError,
        canSubmit,
        handleSubmit,
    };
}
