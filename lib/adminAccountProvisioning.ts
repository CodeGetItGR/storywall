import { ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventTypeConvention, PlanTierResponseDto, UserResponseDto } from '@/lib/api/types';
import { liveInitialOptions } from '@/lib/planTiers';

// Who a provisioned event is for: an account from the Accounts list, or the signed-in admin.
export type ProvisionHost = Pick<UserResponseDto, 'id' | 'email' | 'firstName' | 'lastName'>;

export function adminAccountsPath({ page, size, query, email }: { page: number; size: number; query?: string; email?: string }): string {
    const searchParams = new URLSearchParams({ page: String(page), size: String(size) });
    if (query?.trim()) searchParams.set('query', query.trim());
    if (email?.trim()) searchParams.set('email', email.trim());
    return `${endpoints.users.list}?${searchParams.toString()}`;
}

// A plan with no duration on sale can't be provisioned (409 COVERAGE_OPTION_UNAVAILABLE).
export function eligibleProvisioningPlans(plans: PlanTierResponseDto[], eventType: EventTypeConvention | ''): PlanTierResponseDto[] {
    return plans
        .filter((plan) => plan.scope === 'EVENT' && plan.isAssignable && plan.eventTypeKey === eventType && liveInitialOptions(plan).length > 0)
        .toSorted((left, right) => left.sortOrder - right.sortOrder);
}

// Why an admin email change was refused: 409 when another account has the address, 400 when it
// is malformed. Anything else uses the shared API message.
export function accountEmailChangeErrorKey(error: unknown): 'emailTaken' | 'emailInvalid' | null {
    if (!(error instanceof ApiError)) return null;
    if (error.status === 409) return 'emailTaken';
    if (error.status === 400) return 'emailInvalid';
    return null;
}

// The PATCH body, or null when there is nothing to send. Emails are stored in lower case.
export function accountEmailChange(current: string | null, next: string): { email: string } | null {
    const email = next.trim().toLowerCase();
    if (!email || email === current?.toLowerCase()) return null;
    return { email };
}
