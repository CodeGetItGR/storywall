import type { EventCapabilitiesDto, OrderSummaryDto, UpgradeCoverageOptionDto, UpgradeOptionResponseDto } from '@/lib/api/types';
import { eventCapabilities } from '@/lib/eventCapabilities';

// A target plan's upgrade durations, shortest first.
export function upgradeDurations(entry: UpgradeOptionResponseDto): UpgradeCoverageOptionDto[] {
    return entry.options.toSorted((left, right) => left.months - right.months);
}

// The duration a row shows: the one picked, else the shortest (also when the
// pick is no longer offered).
export function pickedUpgradeDuration(entry: UpgradeOptionResponseDto, optionId: string | null | undefined): UpgradeCoverageOptionDto | null {
    const durations = upgradeDurations(entry);
    return durations.find((duration) => duration.coverageOptionId === optionId) ?? durations[0] ?? null;
}

// The duration a checkout link names. Unlike a row, a link to a duration that is
// no longer offered resolves to nothing, so the host never pays for a length or
// price they didn't pick. A link without one starts on the shortest.
export function linkedUpgradeDuration(entry: UpgradeOptionResponseDto, optionId: string | null | undefined): UpgradeCoverageOptionDto | null {
    if (!optionId) return upgradeDurations(entry)[0] ?? null;
    return entry.options.find((duration) => duration.coverageOptionId === optionId) ?? null;
}

// Whether the upgrade has to ask for a date and place first: the new plan needs them and the event has no date.
export function upgradeNeedsEventDetails(
    entry: Pick<UpgradeOptionResponseDto, 'requirements'> | null,
    event: Parameters<typeof eventCapabilities>[0],
): boolean {
    const capabilities: EventCapabilitiesDto | null = eventCapabilities(event);
    return Boolean(entry?.requirements.needsSchedule && capabilities && !capabilities.hasSchedule);
}

// How far back an upgrade's date can go: the day the event was paid for, else (provisioned by an admin) created.
export function upgradeEarliestStartAt(orders: readonly OrderSummaryDto[], createdAt: string): string {
    const activation = orders
        .filter((order) => order.kind === 'ACTIVATION' && order.status === 'PAID')
        .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    return activation?.paidAt ?? createdAt;
}
