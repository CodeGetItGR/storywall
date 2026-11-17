import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';

export const EMAIL_CODE_LENGTH = 6;
// The backend allows one send a minute; the screen waits as long before offering another.
export const EMAIL_CODE_RESEND_MS = 60_000;

export type EmailCodeError = 'wrong' | 'expired' | 'tooMany';

// The code screen's own messages (copy rows 63–65); null leaves the error to useApiErrorMessage.
// "None sent" (3124) reads as expired: either way the fix is to send a new one.
export function emailCodeError(error: unknown): EmailCodeError | null {
    const code = getErrorCode(error);
    if (code === ERROR_CODES.EMAIL_CODE_INVALID) return 'wrong';
    if (code === ERROR_CODES.EMAIL_CODE_EXPIRED || code === ERROR_CODES.EMAIL_CODE_NOT_REQUESTED) return 'expired';
    if (code === ERROR_CODES.EMAIL_CODE_TOO_MANY_ATTEMPTS) return 'tooMany';
    return null;
}

// The digits of a typed or pasted code, cut to its length.
export function onlyDigits(value: string, length: number = EMAIL_CODE_LENGTH): string {
    return value.replace(/\D/g, '').slice(0, length);
}

export function resendSecondsLeft(sentAt: number | null, now: number): number {
    if (sentAt === null) return 0;
    return Math.max(0, Math.ceil((sentAt + EMAIL_CODE_RESEND_MS - now) / 1000));
}

export function formatCountdown(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// When a code last went to this account, in this tab: a reload neither sends another nor resets the wait.
const sentAtKey = (userId: string) => `storywall.emailCodeSentAt.${userId}`;

export function readCodeSentAt(userId: string): number | null {
    try {
        const value = Number(window.sessionStorage.getItem(sentAtKey(userId)));
        return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
}

export function rememberCodeSentAt(userId: string, at: number): void {
    try {
        window.sessionStorage.setItem(sentAtKey(userId), String(at));
    } catch {
        // Storage blocked: a reload may send one more code.
    }
}
