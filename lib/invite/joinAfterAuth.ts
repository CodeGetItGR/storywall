import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode, getQuotaExceededDetails } from '@/lib/api/errors';

export type JoinResult =
    { status: 'joined' } | { status: 'alreadyMember' } | { status: 'memberLimitExceeded'; planCode?: string } | { status: 'expired' };

// Shared by /login and /register: after a successful login/register, accept
// the pending invitation. 409 means the caller is already a member — treat
// as success. 410 means the invite expired since the preview was loaded.
export async function joinEventAfterAuth(accept: (inviteToken: string) => Promise<unknown>, inviteToken: string): Promise<JoinResult> {
    try {
        await accept(inviteToken);
        return { status: 'joined' };
    } catch (err) {
        if (err instanceof ApiError && getErrorCode(err) === ERROR_CODES.DUPLICATE_MEMBERSHIP) return { status: 'alreadyMember' };
        if (err instanceof ApiError && getErrorCode(err) === ERROR_CODES.EVENT_MEMBER_LIMIT_EXCEEDED) {
            return { status: 'memberLimitExceeded', planCode: getQuotaExceededDetails(err)?.planCode };
        }
        if (err instanceof ApiError && err.status === 410) return { status: 'expired' };
        throw err;
    }
}
