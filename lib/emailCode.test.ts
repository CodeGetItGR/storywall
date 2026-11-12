import { afterEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { emailCodeError, formatCountdown, onlyDigits, readCodeSentAt, rememberCodeSentAt, resendSecondsLeft } from '@/lib/emailCode';

afterEach(() => window.sessionStorage.clear());

describe('emailCodeError', () => {
    it('maps the code errors to the three messages', () => {
        expect(emailCodeError(new ApiError(400, { errorCode: 3127 }))).toBe('wrong');
        expect(emailCodeError(new ApiError(400, { errorCode: 3125 }))).toBe('expired');
        expect(emailCodeError(new ApiError(400, { errorCode: 3124 }))).toBe('expired');
        expect(emailCodeError(new ApiError(400, { errorCode: 3126 }))).toBe('tooMany');
    });

    it('leaves other errors to the usual message', () => {
        expect(emailCodeError(new ApiError(429, { errorCode: 1003 }))).toBeNull();
        expect(emailCodeError(new Error('offline'))).toBeNull();
    });
});

describe('onlyDigits', () => {
    it('keeps up to six digits', () => {
        expect(onlyDigits(' 12-34 567')).toBe('123456');
        expect(onlyDigits('ab')).toBe('');
    });
});

describe('resendSecondsLeft', () => {
    it('counts down 60 seconds from the send', () => {
        expect(resendSecondsLeft(null, 1000)).toBe(0);
        expect(resendSecondsLeft(0, 15_000)).toBe(45);
        expect(resendSecondsLeft(0, 59_001)).toBe(1);
        expect(resendSecondsLeft(0, 61_000)).toBe(0);
    });
});

describe('formatCountdown', () => {
    it('shows minutes and seconds', () => {
        expect(formatCountdown(45)).toBe('0:45');
        expect(formatCountdown(60)).toBe('1:00');
        expect(formatCountdown(5)).toBe('0:05');
    });
});

describe('code sent-at storage', () => {
    it('remembers when a code went to an account', () => {
        expect(readCodeSentAt('u1')).toBeNull();
        rememberCodeSentAt('u1', 1234);
        expect(readCodeSentAt('u1')).toBe(1234);
        expect(readCodeSentAt('u2')).toBeNull();
    });
});
