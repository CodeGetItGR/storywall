import { ApiError } from '@/lib/api/client';

// Admin blocked words (member-roles-fe-integration.md §10).
export const BLOCKED_TERM_MAX = 60;

// The server also refuses a term with no letter or digit; that 400 shows its own message.
export function validateBlockedTerm(term: string): 'invalid' | null {
    const trimmed = term.trim();
    return trimmed === '' || trimmed.startsWith('#') ? 'invalid' : null;
}

export function blockedTermError(error: unknown): 'taken' | 'other' {
    return error instanceof ApiError && error.status === 409 ? 'taken' : 'other';
}
