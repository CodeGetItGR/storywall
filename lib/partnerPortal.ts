import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';

export type PartnerPortalBlock = 'notVerified' | 'notLinked';

// Why the partner page refused this account, or null when it failed for another reason.
export function partnerPortalBlock(error: unknown): PartnerPortalBlock | null {
    const code = getErrorCode(error);
    if (code === ERROR_CODES.PARTNER_EMAIL_NOT_VERIFIED) return 'notVerified';
    if (code === ERROR_CODES.PARTNER_NOT_LINKED) return 'notLinked';
    return null;
}
