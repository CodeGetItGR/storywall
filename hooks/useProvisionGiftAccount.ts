'use client';

import { useState } from 'react';

import type { EventGiftAccountRequestDto } from '@/lib/api/types';
import { isValidIban } from '@/lib/giftAccount';

type GiftAccountField = keyof EventGiftAccountRequestDto;

const EMPTY: Record<GiftAccountField, string> = { iban: '', accountHolder: '', bankName: '', note: '' };

// The gift account a provisioned event starts with. Optional: left blank, none is sent; once any
// field is filled, the IBAN, holder and bank are all required.
export function useProvisionGiftAccount() {
    const [fields, setFields] = useState(EMPTY);

    const isStarted = Object.values(fields).some((value) => value.trim());
    const ibanError = Boolean(fields.iban.trim()) && !isValidIban(fields.iban);
    const isComplete = Boolean(fields.iban.trim() && fields.accountHolder.trim() && fields.bankName.trim());

    function setField(field: GiftAccountField, value: string) {
        setFields((current) => ({ ...current, [field]: value }));
    }

    return {
        fields,
        setField,
        isStarted,
        ibanError,
        // Blank is fine; started must be complete with a valid IBAN.
        isValid: !isStarted || (isComplete && !ibanError),
        reset: () => setFields(EMPTY),
        toRequest: (): EventGiftAccountRequestDto | undefined =>
            isStarted
                ? {
                      iban: fields.iban.replace(/\s/g, '').toUpperCase(),
                      accountHolder: fields.accountHolder.trim(),
                      bankName: fields.bankName.trim(),
                      note: fields.note.trim() || undefined,
                  }
                : undefined,
    };
}

export type ProvisionGiftAccountState = ReturnType<typeof useProvisionGiftAccount>;
