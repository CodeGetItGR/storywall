import type { UpgradeCoverageOptionDto, UpgradeOptionResponseDto } from '@/lib/api/types';

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
