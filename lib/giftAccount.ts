import type { EventGiftAccountRequestDto } from '@/lib/api/types';

export function formatIban(value: string) {
    return value
        .replace(/\s/g, '')
        .replace(/(.{4})/g, '$1 ')
        .trim();
}

export function giftAccountInputFromForm(form: HTMLFormElement): EventGiftAccountRequestDto {
    const data = new FormData(form);
    return {
        iban: String(data.get('iban') ?? ''),
        accountHolder: String(data.get('accountHolder') ?? '').trim(),
        bankName: String(data.get('bankName') ?? '').trim(),
        note: String(data.get('note') ?? '').trim() || undefined,
    };
}
