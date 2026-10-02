import type { GuidelinesRule, StatementGround } from '@/lib/api/types';
import { routes } from '@/lib/routes';

// Mirrors the backend's GuidelinesRule: one rule per Community Guidelines section 3–15, in order.
// Labels are in the ModerationStatement message namespace (rules.*, grounds.*).
const RULE_SECTIONS: Readonly<Record<GuidelinesRule, number>> = {
    ILLEGAL_CONTENT: 3,
    SEXUAL_CONTENT: 4,
    MINORS: 5,
    HARASSMENT: 6,
    HATE_AND_VIOLENCE: 7,
    IMPERSONATION: 8,
    PRIVACY: 9,
    INTELLECTUAL_PROPERTY: 10,
    SPAM: 11,
    COMMERCIAL_USE: 12,
    GIFT_LIST_MISUSE: 13,
    QR_UPLOAD_MISUSE: 14,
    MALICIOUS_TECHNICAL_USE: 15,
};

export const GUIDELINES_RULES: readonly GuidelinesRule[] = [
    'ILLEGAL_CONTENT',
    'SEXUAL_CONTENT',
    'MINORS',
    'HARASSMENT',
    'HATE_AND_VIOLENCE',
    'IMPERSONATION',
    'PRIVACY',
    'INTELLECTUAL_PROPERTY',
    'SPAM',
    'COMMERCIAL_USE',
    'GIFT_LIST_MISUSE',
    'QR_UPLOAD_MISUSE',
    'MALICIOUS_TECHNICAL_USE',
];

// Most decisions are Guidelines breaches, so that ground comes first.
export const STATEMENT_GROUNDS: readonly StatementGround[] = ['GUIDELINES_BREACH', 'ILLEGAL_CONTENT'];

// The backend refuses anything outside these after trimming (3039).
export const STATEMENT_EXPLANATION_MIN = 20;
export const STATEMENT_EXPLANATION_MAX = 2000;

export function isExplanationValid(explanation: string): boolean {
    const length = explanation.trim().length;
    return length >= STATEMENT_EXPLANATION_MIN && length <= STATEMENT_EXPLANATION_MAX;
}

// The statement emails link to the same anchors (MarkdownDocument gives each numbered section its id).
export function guidelinesRuleHref(rule: GuidelinesRule): string {
    return `${routes.legal.communityGuidelines()}#section-${RULE_SECTIONS[rule]}`;
}
