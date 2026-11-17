import type { OrderKind } from '@/lib/api/types';

// The celebration replaces the success page only for a draft's first payment (its activation
// order); the event itself is already ACTIVE by then, so its status can't tell.
export function showsCheckoutCelebration(wizardEnabled: boolean, paidOrder: { kind: OrderKind } | null): boolean {
    return wizardEnabled && paidOrder?.kind === 'ACTIVATION';
}
