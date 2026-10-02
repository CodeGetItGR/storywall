import { describe, expect, it } from 'vitest';

import {
    GUIDELINES_RULES,
    guidelinesRuleHref,
    isExplanationValid,
    STATEMENT_EXPLANATION_MAX,
    STATEMENT_EXPLANATION_MIN,
    STATEMENT_GROUNDS,
    trimLikeBackend,
} from '@/lib/guidelinesRules';

describe('guidelinesRules', () => {
    it('has the 13 rules in Guidelines order', () => {
        expect(GUIDELINES_RULES).toHaveLength(13);
        expect(GUIDELINES_RULES[0]).toBe('ILLEGAL_CONTENT');
        expect(GUIDELINES_RULES[12]).toBe('MALICIOUS_TECHNICAL_USE');
    });

    it('links each rule to its Guidelines section', () => {
        expect(guidelinesRuleHref('ILLEGAL_CONTENT')).toBe('/legal/community-guidelines#section-3');
        expect(guidelinesRuleHref('HARASSMENT')).toBe('/legal/community-guidelines#section-6');
        expect(guidelinesRuleHref('MALICIOUS_TECHNICAL_USE')).toBe('/legal/community-guidelines#section-15');
    });

    it('offers both grounds', () => {
        expect([...STATEMENT_GROUNDS].sort()).toEqual(['GUIDELINES_BREACH', 'ILLEGAL_CONTENT']);
    });

    it('measures the explanation after trimming, like the backend', () => {
        expect(STATEMENT_EXPLANATION_MIN).toBe(20);
        expect(STATEMENT_EXPLANATION_MAX).toBe(2000);
        expect(isExplanationValid(`   ${'x'.repeat(19)}   `)).toBe(false);
        expect(isExplanationValid(`  ${'x'.repeat(20)}  `)).toBe(true);
        expect(isExplanationValid('x'.repeat(2000))).toBe(true);
        expect(isExplanationValid('x'.repeat(2001))).toBe(false);
    });

    it('trims like Java String.trim: everything up to U+0020, nothing above', () => {
        expect(trimLikeBackend('\u0000\t\n x \r\u001f')).toBe('x');
        expect(trimLikeBackend('\u00a0x\u00a0')).toBe('\u00a0x\u00a0');
        expect(trimLikeBackend('a b')).toBe('a b');
    });
});
