import type { EventGiftAccountRequestDto } from '@/lib/api/types';

export function formatIban(value: string) {
    return value
        .replace(/\s/g, '')
        .replace(/(.{4})/g, '$1 ')
        .trim();
}

// The IBAN check the server runs: the country's length is left to it, the check digits are not.
export function isValidIban(value: string): boolean {
    const iban = value.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
    const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
    let remainder = 0;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
    return remainder === 1;
}

// "DE89 •••• 3000": enough to recognise the account on a review screen.
export function maskIban(value: string): string {
    const iban = value.replace(/\s/g, '').toUpperCase();
    return iban.length > 8 ? `${iban.slice(0, 4)} •••• ${iban.slice(-4)}` : iban;
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
